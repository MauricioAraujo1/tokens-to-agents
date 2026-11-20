import type { LessonContent } from "../../../types/content";

// RAG avançado com contas no arquivo. A seção "Home office" do manual de RH tem 3 trechos pais e 9 filhos
// (3 por pai), com tamanhos em tokens e scores de brinquedo para a pergunta sobre estagiários no primeiro
// mês. A busca escolhe os 4 filhos melhores, sobe para os pais e deduplica. A janela de frases usa ±1 frase.
// As chamadas de modelo por pergunta saem da lista de etapas de cada variante do pipeline.

const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

const QUESTION = "Estagiário pode fazer home office no primeiro mês?";

interface Parent {
  id: string;
  label: string;
  tokens: number;
}
interface Child {
  id: string;
  parent: string;
  label: string;
  tokens: number;
  score: number;
}

const parents: Parent[] = [
  { id: "p1", label: "regras gerais", tokens: 410 },
  { id: "p2", label: "estagiários", tokens: 380 },
  { id: "p3", label: "exceções", tokens: 430 },
];
const children: Child[] = [
  { id: "c1a", parent: "p1", label: "quem pode", tokens: 140, score: 0.52 },
  { id: "c1b", parent: "p1", label: "dias/semana", tokens: 130, score: 0.61 },
  { id: "c1c", parent: "p1", label: "como pedir", tokens: 140, score: 0.38 },
  { id: "c2a", parent: "p2", label: "até 2 dias", tokens: 120, score: 0.82 },
  { id: "c2b", parent: "p2", label: "aprovação", tokens: 130, score: 0.71 },
  { id: "c2c", parent: "p2", label: "1º mês", tokens: 130, score: 0.79 },
  { id: "c3a", parent: "p3", label: "saúde", tokens: 150, score: 0.33 },
  { id: "c3b", parent: "p3", label: "mudança", tokens: 140, score: 0.74 },
  { id: "c3c", parent: "p3", label: "prazo", tokens: 140, score: 0.41 },
];

const K = 4;
const topChildren = [...children].sort((a, b) => b.score - a.score).slice(0, K);
const childTokens = sum(topChildren.map((child) => child.tokens));
const parentOf = (child: Child) => parents.find((parent) => parent.id === child.parent) as Parent;
const parentsWithRepeats = topChildren.map(parentOf);
const tokensWithoutDedup = sum(parentsWithRepeats.map((parent) => parent.tokens));
const uniqueParents = [...new Map(parentsWithRepeats.map((parent) => [parent.id, parent])).values()];
const parentTokens = sum(uniqueParents.map((parent) => parent.tokens));
const best = topChildren[0];

// Grafo: documento no topo, pais no meio, filhos embaixo.
const parentX = [0.17, 0.5, 0.83];
const graphNodes = [
  { id: "doc", label: "home office", x: 0.5, y: 0.08 },
  ...parents.map((parent, index) => ({ id: parent.id, label: parent.label, x: parentX[index], y: 0.45 })),
  ...children.map((child) => {
    const parentIndex = parents.findIndex((parent) => parent.id === child.parent);
    const position = children.filter((other) => other.parent === child.parent).indexOf(child);
    return { id: child.id, label: child.label, x: parentX[parentIndex] + (position - 1) * 0.11, y: 0.88 };
  }),
];
const graphEdges = [
  ...parents.map((parent) => ({ from: "doc", to: parent.id })),
  ...children.map((child) => ({ from: child.parent, to: child.id, weight: child.score })),
];

// Janela de frases: a frase encontrada e uma vizinha de cada lado.
const sentences = ["home office", "até 3 dias", "pedir ao gestor", "estagiário: 2 dias", "exceto no 1º mês", "equipamento", "internet"];
const MATCH = sentences.indexOf("estagiário: 2 dias");
const WINDOW = 1;
const windowKeys = sentences
  .map((_, index) => index)
  .filter((index) => index !== MATCH && Math.abs(index - MATCH) <= WINDOW);

// Chamadas de modelo por pergunta em cada variante. Embedding e reranker contam como chamadas de modelo.
interface Stage {
  label: string;
  calls: number;
}
const MULTI_QUERIES = 3;
const KEPT_CHUNKS = 3;
const embedQuery: Stage = { label: "embedding da pergunta", calls: 1 };
const generate: Stage = { label: "geração", calls: 1 };
const rewrite: Stage = { label: "reescrita", calls: 1 };
const multiQuery: Stage[] = [
  { label: `gerar ${MULTI_QUERIES} versões`, calls: 1 },
  { label: "embedding das versões", calls: MULTI_QUERIES },
];
const rerank: Stage = { label: "rerank em lote", calls: 1 };
const compress: Stage = { label: "compressão por chunk", calls: KEPT_CHUNKS };

const variants: Array<{ label: string; stages: Stage[] }> = [
  { label: "naive", stages: [embedQuery, generate] },
  { label: "+ reescrita", stages: [rewrite, embedQuery, generate] },
  { label: "+ multi-query", stages: [rewrite, ...multiQuery, generate] },
  { label: "+ rerank", stages: [rewrite, ...multiQuery, rerank, generate] },
  { label: "+ compressão", stages: [rewrite, ...multiQuery, rerank, compress, generate] },
];
const callsOf = (stages: Stage[]) => sum(stages.map((stage) => stage.calls));
const callSeries = variants.map((variant) => ({ label: variant.label, value: callsOf(variant.stages) }));
const naiveCalls = callSeries[0].value;
const fullCalls = callSeries[callSeries.length - 1].value;

const lesson: LessonContent = {
  id: "08-13",
  subtitle: "As técnicas que entram antes, durante e depois da busca quando o RAG simples não basta, e quanto cada uma custa.",
  objectives: [
    "Separar o RAG ingênuo do avançado pelas etapas antes e depois da busca",
    "Calcular o contexto de uma busca pai-filho com deduplicação dos pais",
    "Explicar a janela de frases e quando ela ajuda",
    "Contar as chamadas de modelo que cada técnica acrescenta a uma pergunta",
  ],
  steps: [
    {
      id: "naive",
      shortTitle: "Ingênuo",
      title: "O RAG ingênuo: buscar e colar",
      tag: "context",
      body: [
        "A primeira versão de todo assistente é parecida com procurar no índice do livro a palavra exata da sua dúvida e ler só aquela página. Funciona para perguntas diretas. Quebra quando a pergunta é vaga, quando a resposta está espalhada em páginas vizinhas ou quando a página traz muito texto que não interessa.",
        "Gao et al. (2023) chamam esse fluxo de [[RAG ingênuo|naive-rag]]: indexar, buscar o top-k com a pergunta como veio e gerar. O RAG avançado mantém o mesmo esqueleto e acrescenta etapas em três pontos: antes da busca (reescrever a pergunta), na busca (chunks em vários tamanhos, busca híbrida) e depois dela (reordenar e comprimir). O RAG modular vai além e troca a sequência fixa por módulos que se combinam.",
      ],
      keyIdea: "RAG avançado não é outra arquitetura: são etapas extras antes, durante e depois da mesma busca.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "pergunta", col: 0, row: 0.5 },
              { id: "retrieval", kind: "retrieval", label: "top-k", col: 1, row: 0.5 },
              { id: "context", kind: "context", label: "colar chunks", col: 2, row: 0.5 },
              { id: "llm", kind: "llm", label: "llm", col: 3, row: 0 },
              { id: "answer", kind: "answer", label: "resposta", col: 3, row: 1 },
            ],
            edges: [
              { from: "user", to: "retrieval", label: "como veio" },
              { from: "retrieval", to: "context" },
              { from: "context", to: "llm" },
              { from: "llm", to: "answer" },
            ],
            active: "retrieval",
          },
        ],
      },
      alt: "RAG ingênuo: a pergunta vai como veio para a busca top-k, em destaque, os chunks são colados no contexto e o LLM gera a resposta.",
    },
    {
      id: "parent-child",
      shortTitle: "Pai e filho",
      title: "Buscar pelo pequeno, entregar o grande",
      tag: "mechanism",
      body: [
        `Num livro de receitas, você acha a receita pela linha “2 ovos” no índice, mas cozinha lendo a receita inteira. Na [[busca pai-filho|parent-child-retrieval]], os chunks pequenos (filhos) servem para achar, porque um trecho curto tem um embedding focado; o que vai para o LLM é o trecho maior (pai) de onde eles saíram. Para “${QUESTION}”, o filho mais parecido é “${best.label}”, dentro de “${parentOf(best).label}”.`,
        `O top-${K} dos filhos (${topChildren.map((child) => child.label).join(", ")}) soma ${integer(childTokens)} tokens. Subindo para os pais sem deduplicar, seriam ${integer(tokensWithoutDedup)} tokens, porque ${parentsWithRepeats.filter((parent) => parent.id === parentOf(best).id).length} filhos vêm do mesmo pai. Deduplicando, ficam ${uniqueParents.length} pais e ${integer(parentTokens)} tokens: o contexto completo da regra e da exceção, sem repetir texto.`,
      ],
      keyIdea: "Filhos dão precisão na busca; pais dão contexto na resposta. Deduplique os pais antes de montar o prompt.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "tokens",
            piece: "metrics-panel",
            metrics: [
              { id: "children", label: `top-${K} filhos`, value: `${integer(childTokens)} tokens` },
              { id: "repeats", label: "pais sem deduplicar", value: `${integer(tokensWithoutDedup)} tokens`, color: "danger" },
              { id: "parents", label: `${uniqueParents.length} pais únicos`, value: `${integer(parentTokens)} tokens`, color: "success" },
            ],
            highlight: "parents",
          },
          {
            id: "tree",
            piece: "graph",
            nodes: graphNodes,
            edges: graphEdges,
            highlight: [...topChildren.map((child) => child.id), ...uniqueParents.map((parent) => parent.id)],
            path: [best.id, best.parent],
          },
        ],
      },
      alt: `Árvore da seção home office com ${parents.length} pais e ${children.length} filhos. Os ${K} filhos recuperados (${topChildren.map((child) => child.label).join(", ")}) e os pais ${uniqueParents.map((parent) => parent.label).join(" e ")} estão em destaque. O painel compara ${integer(childTokens)} tokens dos filhos, ${integer(tokensWithoutDedup)} dos pais com repetição e ${integer(parentTokens)} dos pais únicos.`,
    },
    {
      id: "window",
      shortTitle: "Janela",
      title: "A frase certa e as vizinhas",
      tag: "mechanism",
      body: [
        `Ler só a frase sublinhada de um contrato é perigoso: a frase seguinte pode começar com “exceto”. Na [[janela de frases|sentence-window-retrieval]], cada frase vira o seu próprio embedding, e a busca acha “${sentences[MATCH]}”. Sozinha, ela responderia “sim, 2 dias”, e erraria.`,
        `Ao recuperar, o sistema devolve a frase encontrada mais ${WINDOW} vizinha de cada lado: “${windowKeys.map((index) => sentences[index]).join("” e “")}”. A vizinha da direita muda a resposta. É uma variação do pai-filho em que o “pai” é uma janela móvel, guardada nos metadados de cada frase, e o tamanho da janela é o hiperparâmetro.`,
      ],
      keyIdea: "Busque na unidade menor, responda com a unidade que tem sentido completo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "sentences",
            piece: "token-stream",
            tokens: sentences,
            query: MATCH,
            keys: windowKeys,
            arcs: windowKeys.map((index) => ({ from: MATCH, to: index, weight: 0.7 })),
            color: "module-08",
          },
        ],
      },
      alt: `As ${sentences.length} frases da política de home office em fila. A frase encontrada, ${sentences[MATCH]}, está em destaque, ligada às vizinhas ${windowKeys.map((index) => sentences[index]).join(" e ")}, que entram junto no contexto.`,
    },
    {
      id: "advanced",
      shortTitle: "Avançado",
      title: "O pipeline avançado completo",
      tag: "example",
      body: [
        "Juntando as peças, a pergunta passa por um revisor antes da busca, a busca combina dois motores, um juiz reordena o que veio e um editor corta o que sobra. Cada etapa conserta um defeito do RAG ingênuo: pergunta vaga, termo exato perdido, ruído no topo e contexto longo demais.",
        "Na ordem: [[reescrita da pergunta|query-rewriting]]; busca híbrida (vetorial e lexical, do módulo 07) sobre os filhos; reranking dos candidatos com um modelo que lê pergunta e trecho juntos; subida para os pais; [[compressão contextual|contextual-compression]], que tira dos trechos as frases que não respondem; e geração. Cada uma é opcional e deve entrar só quando uma avaliação mostra o defeito que ela corrige.",
      ],
      keyIdea: "Antes: reescrever. Durante: buscar em dois motores. Depois: reordenar e comprimir.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "rewrite", kind: "llm", label: "reescrita", col: 0, row: 0 },
              { id: "retrieval", kind: "retrieval", label: "busca híbrida", col: 1, row: 0 },
              { id: "rerank", kind: "eval", label: "rerank", col: 2, row: 0 },
              { id: "context", kind: "context", label: "compressão", col: 3, row: 0 },
              { id: "llm", kind: "llm", label: "geração", col: 3, row: 1 },
              { id: "answer", kind: "answer", label: "resposta", col: 2, row: 1 },
            ],
            edges: [
              { from: "rewrite", to: "retrieval", label: "pergunta" },
              { from: "retrieval", to: "rerank", label: "candidatos" },
              { from: "rerank", to: "context", label: "pais" },
              { from: "context", to: "llm" },
              { from: "llm", to: "answer" },
            ],
            active: "rerank",
            done: ["rewrite", "retrieval"],
          },
        ],
      },
      alt: "Pipeline avançado: reescrita da pergunta, busca híbrida e rerank, em destaque, seguidos de compressão do contexto, geração e resposta.",
    },
    {
      id: "cost",
      shortTitle: "Custo",
      title: "Cada etapa é mais uma chamada de modelo",
      tag: "tradeoff",
      body: [
        "Cada revisor a mais na linha de montagem deixa o produto melhor e a fila mais lenta. No RAG, cada técnica é pelo menos uma chamada a um modelo, e elas acontecem em sequência, antes de o usuário ver a primeira palavra.",
        `Contando as etapas de cada variante: o ingênuo faz ${naiveCalls} chamadas por pergunta (embedding e geração). Com reescrita, multi-query de ${MULTI_QUERIES} versões, rerank em lote e compressão dos ${KEPT_CHUNKS} chunks finais, são ${fullCalls}. A compressão por chunk é a mais cara da lista, porque chama um LLM por trecho. Por isso o caminho é medir: só fica a etapa que melhora uma métrica de avaliação mais do que piora a latência.`,
      ],
      keyIdea: `Do ingênuo ao pipeline completo, as chamadas por pergunta vão de ${naiveCalls} para ${fullCalls}: cada técnica precisa pagar a sua entrada.`,
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "calls",
            piece: "chart",
            kind: "bar",
            series: callSeries,
            highlight: callSeries.length - 1,
            color: "module-08",
          },
        ],
      },
      alt: `Chamadas de modelo por pergunta em cada variante: ${callSeries.map((item) => `${item.label} ${item.value}`).join(", ")}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Do ingênuo ao modular",
      tag: "summary",
      body: [
        "O RAG avançado conserta os defeitos do ingênuo com etapas em volta da busca: reescrever a pergunta, buscar trechos pequenos e entregar os grandes, reordenar os candidatos e comprimir o contexto. Cada etapa custa uma ou mais chamadas de modelo.",
        "Até aqui, o pipeline é fixo: toda pergunta passa pelas mesmas etapas. Na próxima aula, um agente decide sozinho se busca, onde busca e se o que achou basta.",
      ],
      keyIdea: "Acrescente uma técnica por vez, só quando a avaliação mostrar o defeito que ela corrige.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "stages",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "pre", label: "antes: reescrita" },
              { id: "retrieval", label: "durante: filhos + híbrida", color: "module-08" },
              { id: "post", label: "depois: rerank + pais" },
              { id: "compress", label: "compressão" },
              { id: "generate", label: "geração", color: "brand" },
            ],
          },
        ],
      },
      alt: "Fluxo em chips: antes da busca, reescrita; durante, filhos e busca híbrida; depois, rerank e pais; compressão e geração.",
    },
  ],
  realWorldExample:
    "O LlamaIndex e o LangChain trazem essas técnicas prontas: o LangChain tem o ParentDocumentRetriever, que indexa chunks pequenos e devolve os documentos pais, e o LlamaIndex tem o pós-processador de janela de frases e retrievers que sobem de nós filhos para nós pais. A Anthropic publicou que juntar contextual retrieval com reranking reduziu em 67% as falhas de recuperação nos testes dela.",
  code: {
    language: "python",
    source: `def parent_child(children, parents, k=4):
    """Busca nos filhos, sobe para os pais e remove pais repetidos, na ordem do melhor filho."""
    top = sorted(children, key=lambda c: c["score"], reverse=True)[:k]
    seen, context = set(), []
    for child in top:
        if child["parent"] not in seen:
            seen.add(child["parent"])
            context.append(parents[child["parent"]])
    return context`,
    caption: "A subida de filhos para pais da cena: os 4 melhores filhos viram 2 pais únicos, na ordem em que apareceram.",
  },
  tradeOffs: {
    pros: [
      "Cada técnica ataca um defeito conhecido: pergunta vaga, ruído no topo, contexto cortado",
      "Pai-filho e janela de frases separam o tamanho bom para buscar do tamanho bom para ler",
      "As etapas são módulos: dá para ligar e desligar cada uma e medir o efeito",
    ],
    cons: [
      "Cada etapa soma latência e custo, e elas rodam em sequência",
      "Mais peças quer dizer mais pontos de falha e mais parâmetros para ajustar",
      "Sem avaliação, é fácil acrescentar uma técnica que não melhora nada",
    ],
    alternatives: [
      "Melhorar o chunking e os metadados antes de acrescentar etapas",
      "Agentic RAG, quando as perguntas pedem buscas diferentes umas das outras",
    ],
  },
  knowledgeCheck: [
    {
      id: "parent-dedup",
      prompt: "A busca devolve 5 chunks filhos, 4 deles do mesmo pai de 600 tokens e 1 de outro pai de 500. Quantos tokens entram com pai-filho e deduplicação?",
      options: ["3.000", "2.900", "1.100", "600"],
      correct: 2,
      explanation: "Os 4 filhos apontam para o mesmo pai, que entra uma vez: 600 + 500 = 1.100 tokens. Sem deduplicar, seriam 4 × 600 + 500 = 2.900.",
      lesson: "08-13",
    },
    {
      id: "where-to-fix",
      prompt: "As respostas citam o trecho certo, mas erram porque a frase seguinte dizia “exceto”. Que técnica ataca esse defeito?",
      options: [
        "Aumentar a temperatura",
        "Janela de frases ou pai-filho, para o trecho recuperado vir com as frases vizinhas",
        "Trocar o banco vetorial",
        "Diminuir o k",
      ],
      correct: 1,
      explanation: "A busca acertou o lugar, mas o trecho entregue era curto demais. Devolver as vizinhas ou o pai dá ao modelo a regra com a exceção.",
      lesson: "08-13",
    },
  ],
  related: ["08-10", "08-14", "07-10"],
  references: [
    { title: "Gao et al. (2023), Retrieval-Augmented Generation for Large Language Models: A Survey", url: "https://arxiv.org/abs/2312.10997", kind: "paper" },
    { title: "LlamaIndex: documentação", url: "https://docs.llamaindex.ai/", kind: "docs" },
    { title: "Anthropic (2024), Introducing Contextual Retrieval", url: "https://www.anthropic.com/news/contextual-retrieval", kind: "article" },
  ],
};

export default lesson;
