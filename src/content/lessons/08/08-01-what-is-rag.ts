import type { BlockDiagramSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// O que é RAG, com contas no arquivo. Um assistente de RH responde perguntas sobre a empresa.
// Passo 3: sete perguntas marcadas à mão com "está nos dados de treino?" e "está no manual de RH?",
// e a contagem de quantas cada abordagem responde com base. Passo 4: tokens por pergunta mandando o
// manual inteiro ou só os trechos recuperados, com tamanhos de brinquedo declarados abaixo.

const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const listing = (items: string[]) =>
  items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;

// Passo 1: a política real do manual e o chute de um modelo sem acesso a ela.
const POLICY_DAYS = 3;
const GUESSED_DAYS = 2;

// Passo 3: cobertura de cada pergunta.
interface Question {
  label: string;
  inTraining: boolean;
  inDocuments: boolean;
}
const questions: Question[] = [
  { label: "o que é home office", inTraining: true, inDocuments: false },
  { label: "férias em 3 períodos (CLT)", inTraining: true, inDocuments: true },
  { label: "dias de home office aqui", inTraining: false, inDocuments: true },
  { label: "prazo do reembolso", inTraining: false, inDocuments: true },
  { label: "regra nova deste mês", inTraining: false, inDocuments: true },
  { label: "limite do táxi", inTraining: false, inDocuments: true },
  { label: "salário do diretor", inTraining: false, inDocuments: false },
];
const COLUMNS = ["no treino", "no manual"];
const coverage = questions.map((question) => [Number(question.inTraining), Number(question.inDocuments)]);
const modelAlone = questions.filter((question) => question.inTraining).length;
const withRag = questions.filter((question) => question.inTraining || question.inDocuments).length;
const uncovered = questions.filter((question) => !question.inTraining && !question.inDocuments);
const onlyInDocuments = questions.filter((question) => !question.inTraining && question.inDocuments);
const NEW_RULE = questions.findIndex((question) => question.label === "regra nova deste mês");

// Passo 4: tamanhos de brinquedo, declarados como hipótese.
const MANUAL_PAGES = 120;
const TOKENS_PER_PAGE = 500;
const manualTokens = MANUAL_PAGES * TOKENS_PER_PAGE;
const K = 4;
const CHUNK_TOKENS = 300;
const QUESTION_TOKENS = 50;
const ragTokens = K * CHUNK_TOKENS + QUESTION_TOKENS;
const fullTokens = manualTokens + QUESTION_TOKENS;
const ratio = fullTokens / ragTokens;
const QUESTIONS_PER_DAY = 1000;

const flowBlocks: BlockDiagramSpec["blocks"] = [
  { id: "user", kind: "user", label: "funcionário", col: 0, row: 0 },
  { id: "retrieval", kind: "retrieval", label: "busca", col: 1, row: 0 },
  { id: "docs", kind: "vector-db", label: "manual de rh", col: 1, row: 1 },
  { id: "context", kind: "context", label: `${K} trechos`, col: 2, row: 0 },
  { id: "llm", kind: "llm", label: "llm", col: 3, row: 0 },
  { id: "answer", kind: "answer", label: "resposta + fonte", col: 3, row: 1 },
];
const flowEdges: NonNullable<BlockDiagramSpec["edges"]> = [
  { from: "user", to: "retrieval", label: "pergunta" },
  { from: "retrieval", to: "docs", label: "busca" },
  { from: "docs", to: "context", label: "trechos" },
  { from: "context", to: "llm", label: "prompt" },
  { from: "llm", to: "answer" },
];

const lesson: LessonContent = {
  id: "08-01",
  subtitle: "Por que um LLM sozinho não sabe as regras da sua empresa, e como buscar os trechos certos antes de responder resolve isso.",
  objectives: [
    "Explicar RAG com a ideia de uma prova com consulta",
    "Diferenciar o que o modelo sabe pelos pesos do que ele lê na hora",
    "Calcular quantos tokens o RAG economiza em relação a mandar o documento inteiro",
    "Reconhecer quando RAG é a ferramenta certa e quando não é",
  ],
  steps: [
    {
      id: "closed-book",
      shortTitle: "Sem consulta",
      title: "Uma prova sem consulta",
      tag: "context",
      body: [
        `Um funcionário pergunta ao assistente: “quantos dias de home office eu posso fazer?”. O manual da empresa diz ${POLICY_DAYS}. O [[LLM|llm]], que nunca leu esse manual, responde “${GUESSED_DAYS} dias por semana” com toda a calma. É como uma prova sem consulta: quem não estudou a matéria chuta, e chuta com boa letra.`,
        "O modelo só sabe o que aprendeu no treino, e o treino tem uma data de corte, o [[knowledge cutoff|knowledge-cutoff]]. Documentos internos, regras deste mês e dados privados nunca estiveram lá. Sem essa informação, a resposta mais provável ainda sai fluente, e isso é uma [[alucinação|hallucination]].",
      ],
      keyIdea: "Um LLM sozinho responde pelo que viu no treino. O que é da sua empresa, ele inventa.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "funcionário", col: 0, row: 0 },
              { id: "llm", kind: "llm", label: "llm", col: 3, row: 0 },
              { id: "answer", kind: "no-result", label: `"${GUESSED_DAYS} dias"`, col: 3, row: 1 },
            ],
            edges: [
              { from: "user", to: "llm", label: "pergunta" },
              { from: "llm", to: "answer", label: "chute", variant: "alternative" },
            ],
            active: "answer",
          },
        ],
      },
      alt: `O funcionário pergunta direto ao LLM, que devolve pelo caminho tracejado um chute de ${GUESSED_DAYS} dias, enquanto o manual diz ${POLICY_DAYS}.`,
    },
    {
      id: "open-book",
      shortTitle: "Com consulta",
      title: "Agora a prova é com consulta",
      tag: "mechanism",
      body: [
        `Numa prova com consulta, você não decora o livro: procura a página certa, lê o parágrafo e responde com ele. [[RAG|rag]] faz o mesmo. Antes de chamar o modelo, a aplicação busca no manual os ${K} trechos mais parecidos com a pergunta e cola esses trechos no [[prompt|prompt]]. Agora o modelo lê “até ${POLICY_DAYS} dias por semana” e responde citando a fonte.`,
        "Lewis et al. (2020), que deram o nome à técnica, descrevem duas memórias. A [[memória paramétrica|parametric-memory]] são os pesos do modelo, que só mudam com treino. A [[memória não paramétrica|non-parametric-memory]] é um índice de documentos consultado na hora. Atualizar o que o assistente sabe passa a ser trocar um documento no índice, não treinar de novo.",
      ],
      keyIdea: "RAG = buscar primeiro, gerar depois: o modelo responde lendo os trechos que a busca trouxe.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [{ id: "flow", piece: "block-diagram", blocks: flowBlocks, edges: flowEdges, active: "context" }],
      },
      alt: `A pergunta do funcionário vai para a busca, que consulta o manual de RH; os ${K} trechos encontrados formam o contexto, em destaque, que vai no prompt do LLM, e a resposta sai com a fonte.`,
    },
    {
      id: "coverage",
      shortTitle: "Quem sabe o quê",
      title: "O que está nos pesos e o que está nos documentos",
      tag: "mechanism",
      body: [
        `Pense em ${questions.length} perguntas que chegam ao assistente. Para cada uma, a cena marca se a resposta estava nos dados de treino e se está no manual. “O que é home office” é conhecimento geral: o modelo já sabe. “${questions[NEW_RULE].label}” saiu depois do treino: só o manual tem.`,
        `Sozinho, o modelo só responde com base ${modelAlone} das ${questions.length}. Com RAG, ${withRag}: as ${onlyInDocuments.length} que só o manual cobre (${listing(onlyInDocuments.map((question) => question.label))}) passam a ter fonte. Sobra ${uncovered.length}, “${uncovered.map((question) => question.label).join("")}”, que não está em lugar nenhum. Ali o certo é dizer “não sei”, e é isso que um bom RAG ensina o modelo a fazer.`,
      ],
      keyIdea: "RAG não deixa o modelo mais inteligente: dá a ele o texto que faltava. O que não está no índice continua desconhecido.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "coverage",
            piece: "matrix",
            rows: questions.map((question) => question.label),
            cols: COLUMNS,
            values: coverage,
            scale: { min: 0, max: 1 },
            highlight: { row: NEW_RULE, col: 1 },
            showValues: true,
            color: "module-08",
          },
        ],
      },
      alt: `Tabela com ${questions.length} perguntas e duas colunas, no treino e no manual, com 1 onde a resposta está. O modelo sozinho cobre ${modelAlone}, com RAG são ${withRag}, e ${uncovered.length} não está em nenhum dos dois.`,
    },
    {
      id: "tokens",
      shortTitle: "Tokens",
      title: "Por que não mandar o manual inteiro?",
      tag: "example",
      body: [
        `Se o modelo precisa do manual, por que não colar o manual todo no prompt? Suponha um manual de ${MANUAL_PAGES} páginas com cerca de ${integer(TOKENS_PER_PAGE)} tokens cada: ${integer(manualTokens)} tokens. Com RAG, vão ${K} trechos de ${integer(CHUNK_TOKENS)} tokens mais a pergunta, ${integer(ragTokens)} tokens.`,
        `São ${integer(ratio)} vezes menos tokens por pergunta. Com ${integer(QUESTIONS_PER_DAY)} perguntas por dia, a diferença é de ${integer(fullTokens * QUESTIONS_PER_DAY)} para ${integer(ragTokens * QUESTIONS_PER_DAY)} tokens processados. E não é só custo: muitos modelos nem têm uma [[janela de contexto|context-window]] desse tamanho, e trechos no meio de contextos longos tendem a ser menos usados ([[lost in the middle|lost-in-the-middle]]).`,
      ],
      keyIdea: "Mandar só o que importa sai mais barato, mais rápido e costuma funcionar melhor do que mandar tudo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "tokens",
            piece: "metrics-panel",
            metrics: [
              { id: "full", label: "manual inteiro", value: `${integer(fullTokens)} tokens`, color: "danger" },
              { id: "rag", label: `rag com k = ${K}`, value: `${integer(ragTokens)} tokens`, color: "success" },
              { id: "ratio", label: "economia", value: `${integer(ratio)}×` },
              { id: "day", label: `${integer(QUESTIONS_PER_DAY)} perguntas/dia`, value: `${integer(ragTokens * QUESTIONS_PER_DAY)} tokens` },
            ],
            highlight: "ratio",
          },
        ],
      },
      alt: `Painel: o manual inteiro custa ${integer(fullTokens)} tokens por pergunta, o RAG com ${K} trechos custa ${integer(ragTokens)}, ${integer(ratio)} vezes menos.`,
    },
    {
      id: "limits",
      shortTitle: "Limites",
      title: "Quando a busca não acha nada",
      tag: "tradeoff",
      body: [
        "Uma consulta só ajuda se o livro tem a resposta e você acha a página. Se a busca traz trechos errados, o modelo responde com convicção a partir deles. Se não traz nada bom, o fluxo precisa de uma saída honesta: “não encontrei isso no manual”.",
        "RAG serve para trazer fatos: privados, recentes, que mudam. Para mudar o estilo ou o formato das respostas, o caminho é [[fine-tuning|fine-tuning]]. Para uma base pequena, colar os documentos inteiros numa janela longa pode bastar. Na prática, a qualidade do RAG é a qualidade da busca: cada aula deste módulo melhora uma etapa dela.",
      ],
      keyIdea: "RAG troca o problema “o modelo não sabe” pelo problema “a busca precisa achar”. Projete o caminho do “não sei”.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              ...flowBlocks.slice(0, 4),
              { id: "none", kind: "no-result", label: "nada relevante", col: 2, row: 1 },
              flowBlocks[4],
            ],
            edges: [
              ...flowEdges.slice(0, 2),
              { from: "docs", to: "none", label: "score baixo", variant: "alternative" },
              { from: "docs", to: "context", label: "trechos" },
              { from: "context", to: "llm", label: "prompt" },
            ],
            active: "none",
          },
        ],
      },
      alt: "O mesmo fluxo de RAG com um desvio tracejado: quando os trechos do manual têm score baixo, a busca cai em nada relevante, em destaque, e o assistente deve dizer que não sabe.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "As cinco etapas de um RAG",
      tag: "summary",
      body: [
        "Antes de qualquer pergunta, os documentos são preparados e indexados. Na hora da pergunta, a aplicação busca os trechos, monta o contexto, o modelo gera a resposta e a resposta volta com as fontes, que deixam qualquer pessoa conferir.",
        "A próxima aula percorre essa arquitetura de ponta a ponta. Depois, o módulo abre cada etapa: ingestão, parsing, chunking, embeddings, busca, contexto, geração, filtros, variações avançadas, avaliação e otimização.",
      ],
      keyIdea: "Indexar uma vez, buscar a cada pergunta, gerar com os trechos e citar as fontes.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "steps",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "index", label: "indexar documentos" },
              { id: "search", label: "buscar trechos", color: "module-08" },
              { id: "context", label: "montar contexto" },
              { id: "generate", label: "gerar" },
              { id: "cite", label: "citar fontes", color: "brand" },
            ],
          },
        ],
      },
      alt: "Fluxo em chips: indexar documentos, buscar trechos, montar contexto, gerar e citar fontes.",
    },
  ],
  realWorldExample:
    "Buscadores com IA, como o Perplexity e a busca do ChatGPT, fazem RAG na web: pesquisam páginas antes de responder, colocam os trechos no contexto do modelo e mostram os links usados ao lado da resposta, para o leitor conferir.",
  tradeOffs: {
    pros: [
      "Responde com dados privados e recentes sem treinar o modelo",
      "Atualizar o conhecimento é trocar documentos no índice",
      "As fontes ficam visíveis e a resposta pode ser conferida",
      "Manda poucos tokens por pergunta em vez do documento inteiro",
    ],
    cons: [
      "Se a busca erra, o modelo responde bem a partir do trecho errado",
      "Exige manter um pipeline de ingestão e um índice atualizados",
      "Cada pergunta ganha uma busca a mais e alguns milissegundos de latência",
    ],
    alternatives: [
      "Fine-tuning, para mudar estilo, formato ou comportamento",
      "Janela de contexto longa com os documentos inteiros, quando a base é pequena",
      "Ferramentas que consultam um sistema na hora, como uma API ou um banco SQL, para dados estruturados",
    ],
  },
  knowledgeCheck: [
    {
      id: "policy-changed",
      prompt: "A política de reembolso mudou ontem. Qual é o jeito mais barato de o assistente com RAG passar a responder com a regra nova?",
      options: [
        "Treinar o modelo de novo com a política nova",
        "Trocar o documento no índice para que a busca traga o texto atualizado",
        "Aumentar a temperatura do modelo",
        "Escrever a regra nova no nome do arquivo",
      ],
      correct: 1,
      explanation: "O conhecimento do RAG fica na memória não paramétrica, o índice. Reindexar o documento basta; os pesos do modelo não mudam.",
      lesson: "08-01",
    },
    {
      id: "not-in-index",
      prompt: "Um funcionário pergunta algo que não está em nenhum documento indexado. O que um bom sistema RAG faz?",
      options: [
        "Responde com o que o modelo achar mais provável",
        "Repete a busca até achar alguma coisa",
        "Diz que não encontrou a informação nas fontes disponíveis",
        "Responde com o trecho de maior score, mesmo que seja de outro assunto",
      ],
      correct: 2,
      explanation: "Sem trecho relevante, qualquer resposta seria chute. O caminho do “não sei” evita alucinação e mostra o limite da base.",
      lesson: "08-01",
    },
  ],
  related: ["08-02", "04-10", "08-03"],
  references: [
    {
      title: "Lewis et al. (2020), Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
      url: "https://arxiv.org/abs/2005.11401",
      kind: "paper",
    },
    {
      title: "Gao et al. (2023), Retrieval-Augmented Generation for Large Language Models: A Survey",
      url: "https://arxiv.org/abs/2312.10997",
      kind: "paper",
    },
    { title: "LlamaIndex: documentação", url: "https://docs.llamaindex.ai/", kind: "docs" },
  ],
};

export default lesson;
