import { softmax } from "../../../lab/attention";
import type { LessonContent } from "../../../types/content";

// Prompt engineering com contas no arquivo: a distribuição do primeiro token para um prompt vago e um
// específico (logits escritos à mão) e um eval de brinquedo, com três versões de prompt corrigidas por
// uma checagem exata sobre respostas de exemplo escritas à mão para a aula.

const percent = (value: number) => `${Math.round(value * 100)}%`;

// Passo 2: o mesmo começo de resposta sob dois prompts.
const firstTokens = ["Olá", "Parece", "financeiro", "Sinto", "Claro"];
const vagueProbabilities = softmax([2.1, 2.0, 1.2, 1.9, 1.6]);
const specificProbabilities = softmax([0.2, 0.6, 4.5, 0.1, 0.3]);
const FINANCE = firstTokens.indexOf("financeiro");

// Passo 4: três versões de prompt para classificar mensagens de suporte.
const LABELS = ["financeiro", "técnico", "cancelamento"] as const;
type Label = (typeof LABELS)[number];

const expected: Label[] = [
  "financeiro",
  "técnico",
  "cancelamento",
  "financeiro",
  "técnico",
  "técnico",
  "cancelamento",
  "financeiro",
];

const versions = [
  {
    id: "v1",
    prompt: "O que você acha desta mensagem?",
    outputs: [
      "Parece um problema de cobrança.",
      "O cliente não consegue entrar.",
      "cancelamento",
      "Sinto muito pelo ocorrido!",
      "técnico",
      "Talvez seja um bug.",
      "O cliente quer sair.",
      "financeiro",
    ],
  },
  {
    id: "v2",
    prompt: "Classifique a mensagem em financeiro, técnico ou cancelamento.",
    outputs: [
      "financeiro",
      "Categoria: técnico",
      "cancelamento",
      "Financeiro.",
      "técnico",
      "técnico",
      "cancelamento",
      "financeiro",
    ],
  },
  {
    id: "v3",
    prompt: "Classifique a mensagem em financeiro, técnico ou cancelamento. Responda só com a categoria, em minúsculas.",
    outputs: [
      "financeiro",
      "técnico",
      "cancelamento",
      "financeiro",
      "técnico",
      "financeiro",
      "cancelamento",
      "financeiro",
    ],
  },
];

const isLabel = (output: string): output is Label => (LABELS as readonly string[]).includes(output);
const hits = versions.map((version) => version.outputs.filter((output, index) => output === expected[index]).length);
const parsable = versions.map((version) => version.outputs.filter(isLabel).length);
const best = hits.indexOf(Math.max(...hits));
const v3Miss = versions[2].outputs.findIndex((output, index) => output !== expected[index]);

const lesson: LessonContent = {
  id: "05-01",
  subtitle: "Por que o mesmo modelo dá respostas tão diferentes conforme o pedido, e como transformar escrever prompts num processo de engenharia.",
  objectives: [
    "Definir prompt engineering e o que ela muda (e o que não muda) num LLM",
    "Explicar por que o texto do prompt altera a distribuição do próximo token",
    "Medir versões de prompt com um conjunto de casos de teste",
    "Saber quando o prompt basta e quando é hora de RAG ou fine-tuning",
  ],
  steps: [
    {
      id: "same-model",
      shortTitle: "Mesmo modelo",
      title: "O mesmo modelo, dois pedidos",
      tag: "context",
      body: [
        "Peça a um colega “dá uma olhada nisso” e você recebe uma opinião solta. Peça “confira se o valor da fatura bate com o contrato e me responda sim ou não” e você recebe exatamente o que precisa. O colega é o mesmo; o pedido mudou. Com um [[LLM|llm]] acontece a mesma coisa.",
        "O modelo tem pesos fixos: o [[prompt|prompt]] é o único controle que você tem em tempo de uso. [[Prompt engineering|prompt-engineering]] é a prática de escrever esse texto de propósito, testá-lo contra casos reais e ajustá-lo até a saída ter a qualidade e o formato que o seu sistema exige.",
      ],
      keyIdea: "Sem mudar um peso do modelo, o prompt decide o que ele faz.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "pedido", col: 0, row: 0.5 },
              { id: "prompt", kind: "context", label: "prompt", col: 1, row: 0.5 },
              { id: "llm", kind: "llm", label: "llm: pesos fixos", col: 2, row: 0.5 },
              { id: "vague", kind: "no-result", label: "opinião solta", col: 3, row: 0 },
              { id: "precise", kind: "answer", label: "“financeiro”", col: 3, row: 1 },
            ],
            edges: [
              { from: "user", to: "prompt" },
              { from: "prompt", to: "llm" },
              { from: "llm", to: "vague", label: "pedido vago", variant: "alternative" },
              { from: "llm", to: "precise", label: "pedido claro" },
            ],
            active: "prompt",
          },
        ],
      },
      alt: "Um pedido vira o prompt, em destaque, que entra num LLM de pesos fixos; um pedido vago leva a uma opinião solta pelo caminho tracejado, e um pedido claro leva à resposta “financeiro”.",
    },
    {
      id: "distribution",
      shortTitle: "Distribuição",
      title: "O prompt move as probabilidades",
      tag: "mechanism",
      body: [
        `O modelo não “entende o pedido” e depois decide. Ele calcula uma probabilidade para cada token possível, condicionada a todo o texto anterior. Com o prompt vago “O que você acha desta mensagem?”, o primeiro token mais provável é “${firstTokens[vagueProbabilities.indexOf(Math.max(...vagueProbabilities))]}” e “financeiro” fica com ${percent(vagueProbabilities[FINANCE])}.`,
        `Com o prompt que lista as categorias e pede só a categoria, “financeiro” sobe para ${percent(specificProbabilities[FINANCE])}. Os logits da cena foram escritos à mão, mas o efeito é o mecanismo real: cada palavra do prompt muda o condicionamento de P(próximo token | prompt), e é isso que o prompt engineering explora.`,
      ],
      keyIdea: "Escrever um prompt é escolher o condicionamento: as palavras certas concentram a probabilidade na saída que você quer.",
      scene: {
        kind: "pieces",
        layout: "row",
        pieces: [
          {
            id: "vague",
            piece: "chart",
            kind: "bar",
            series: firstTokens.map((label, index) => ({ label, value: Number(vagueProbabilities[index].toFixed(3)) })),
            max: 1,
            highlight: FINANCE,
            color: "danger",
          },
          {
            id: "specific",
            piece: "chart",
            kind: "bar",
            series: firstTokens.map((label, index) => ({ label, value: Number(specificProbabilities[index].toFixed(3)) })),
            max: 1,
            highlight: FINANCE,
            color: "success",
          },
        ],
      },
      alt: `Dois gráficos do primeiro token. Com o prompt vago, a probabilidade se espalha e “financeiro” tem ${percent(vagueProbabilities[FINANCE])}. Com o prompt específico, “financeiro” concentra ${percent(specificProbabilities[FINANCE])}.`,
    },
    {
      id: "loop",
      shortTitle: "Ciclo",
      title: "Engenharia é um ciclo, não um truque",
      tag: "mechanism",
      body: [
        "Listas de “prompts mágicos” prometem atalhos, mas um prompt bom para um caso pode piorar outro. O trabalho real parece com o de qualquer código: escrever uma versão, rodar contra um conjunto de casos de teste com resposta esperada, medir e ajustar o que falhou.",
        "Esse conjunto de casos é um [[eval|eval]]. Sem ele, cada ajuste é uma impressão; com ele, você sabe se a versão nova corrigiu um erro sem quebrar outro. O guia da Anthropic pede para definir os critérios de sucesso e um jeito de testá-los antes de escrever a primeira linha do prompt; o da OpenAI recomenda testar cada mudança de forma sistemática, com evals.",
      ],
      keyIdea: "Defina o critério de acerto e os casos de teste antes de escrever o prompt; depois itere medindo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "cycle",
            piece: "pipeline",
            stages: [
              { id: "goal", label: "critério de acerto" },
              { id: "write", label: "escrever versão" },
              { id: "run", label: "rodar casos" },
              { id: "measure", label: "medir", color: "module-05" },
              { id: "adjust", label: "ajustar" },
            ],
            active: "measure",
            done: ["goal", "write", "run"],
            repeat: { from: "write", to: "adjust", label: "até passar" },
          },
        ],
      },
      alt: "Pipeline: critério de acerto, escrever versão, rodar casos, medir, em destaque, e ajustar; o trecho de escrever a ajustar se repete numa caixa tracejada até passar.",
    },
    {
      id: "eval",
      shortTitle: "Três versões",
      title: `Três versões, ${expected.length} casos`,
      tag: "example",
      body: [
        `A tarefa: classificar mensagens de suporte em ${LABELS.join(", ")}. A checagem é exata, porque o código do app compara a string. As respostas de exemplo foram escritas à mão para a aula. A v1 (“${versions[0].prompt}”) acerta ${hits[0]} de ${expected.length}: o modelo opina em vez de classificar.`,
        `A v2 lista as categorias e acerta ${hits[1]}: o conteúdo melhora, mas “Categoria: técnico” e “Financeiro.” quebram a comparação. A v3 pede só a categoria, em minúsculas, e chega a ${hits[2]}, com ${parsable[2]} de ${expected.length} respostas no formato. O erro que sobrou, no caso ${v3Miss + 1}, já é de conteúdo e pede outra mudança: definir cada categoria ou dar exemplos.`,
      ],
      keyIdea: "Medir separa os erros de formato dos erros de conteúdo, e cada um pede uma correção diferente.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "hits",
            piece: "chart",
            kind: "bar",
            series: versions.map((version, index) => ({ label: version.id, value: hits[index] })),
            max: expected.length,
            highlight: best,
            color: "module-05",
          },
          {
            id: "scores",
            piece: "metrics-panel",
            metrics: versions.map((version, index) => ({
              id: version.id,
              label: `${version.id}: no formato`,
              value: `${parsable[index]} de ${expected.length}`,
              color: index === best ? "success" : undefined,
            })),
            highlight: versions[best].id,
          },
        ],
      },
      alt: `Acertos de cada versão em ${expected.length} casos: ${versions.map((version, index) => `${version.id} ${hits[index]}`).join(", ")}. Respostas no formato: ${versions.map((version, index) => `${version.id} ${parsable[index]}`).join(", ")}.`,
    },
    {
      id: "limits",
      shortTitle: "Limites",
      title: "O que o prompt não resolve",
      tag: "tradeoff",
      body: [
        "O prompt muda o comportamento, mas não ensina fatos novos. Se a resposta depende de um documento interno ou de um dado de ontem, nenhum texto de instrução faz o modelo saber disso: o caminho é colocar a informação no contexto, com [[RAG|rag]]. Se você precisa de um estilo ou de uma tarefa que nem com exemplos o modelo pega, o caminho é [[fine-tuning|fine-tuning]].",
        "A ordem prática é: primeiro o prompt, que é barato e muda em minutos; depois RAG, quando falta conhecimento; por último fine-tuning, quando falta comportamento. Prompts também têm custo: cada token da instrução é pago em toda requisição, e um prompt longo demais fica caro e lento.",
      ],
      keyIdea: "Prompt resolve comportamento; falta de conhecimento pede contexto (RAG); comportamento que não sai com prompt pede fine-tuning.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "prompt", kind: "context", label: "prompt melhor", col: 0, row: 0 },
              { id: "docs", kind: "documents", label: "rag: fatos", col: 0, row: 1 },
              { id: "llm", kind: "llm", label: "llm", col: 1, row: 0.5 },
              { id: "train", kind: "eval", label: "fine-tuning", col: 2, row: 1 },
              { id: "answer", kind: "answer", label: "resposta", col: 2, row: 0 },
            ],
            edges: [
              { from: "prompt", to: "llm", label: "minutos" },
              { from: "docs", to: "llm", label: "contexto" },
              { from: "train", to: "llm", label: "novos pesos", variant: "alternative" },
              { from: "llm", to: "answer" },
            ],
            active: "prompt",
          },
        ],
      },
      alt: "Três jeitos de mudar a resposta do LLM: um prompt melhor, em destaque, que muda em minutos; fatos via RAG no contexto; e, pelo caminho tracejado, fine-tuning, que gera novos pesos.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "O prompt como interface",
      tag: "summary",
      body: [
        "Prompt engineering é desenhar a entrada de um sistema probabilístico: o texto condiciona a distribuição, o eval mede o efeito, e o ciclo de ajustes leva a uma versão que passa nos casos que importam.",
        "Nas próximas aulas você vai abrir o prompt em partes, ver como os papéis da conversa viram tokens e aprender as técnicas (zero-shot, few-shot, chain of thought, JSON, ferramentas) que formam o resto do módulo. A próxima é a anatomia de um prompt.",
      ],
      keyIdea: "Prompt engineering = escrever a entrada + medir com casos de teste + iterar.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "laptop", kind: "laptop", label: "você escreve", col: 0, row: 0 },
              { id: "prompt", kind: "context", label: "prompt v3", col: 1, row: 0 },
              { id: "llm", kind: "llm", label: "llm", col: 2, row: 0 },
              { id: "answer", kind: "answer", label: "saídas", col: 3, row: 0 },
              { id: "eval", kind: "eval", label: `eval: ${hits[2]} de ${expected.length}`, col: 2, row: 1 },
            ],
            edges: [
              { from: "laptop", to: "prompt" },
              { from: "prompt", to: "llm" },
              { from: "llm", to: "answer" },
              { from: "answer", to: "eval", label: "medir" },
              { from: "eval", to: "laptop", label: "ajustar", variant: "alternative" },
            ],
            active: "eval",
            done: ["laptop", "prompt", "llm", "answer"],
          },
        ],
      },
      alt: `Você escreve o prompt, que o LLM usa para gerar saídas; as saídas vão para o eval, em destaque, que mede ${hits[2]} de ${expected.length} acertos e volta para você ajustar.`,
    },
  ],
  realWorldExample:
    "Os três maiores provedores publicam guias oficiais de prompt engineering (OpenAI, Anthropic e Google Gemini) e eles convergem nas mesmas práticas: instruções claras e específicas, delimitadores entre as partes, exemplos, formato de saída explícito e testes com casos reais. A Anthropic também oferece no console um gerador de prompts que parte da descrição da tarefa e entrega um primeiro rascunho para iterar.",
  code: {
    language: "python",
    source: `cases = [("cobraram duas vezes no cartão", "financeiro"),
         ("o app fecha ao abrir o PDF", "técnico"),
         ("quero encerrar minha conta", "cancelamento")]

def score(prompt: str, call_model) -> float:
    hits = 0
    for message, expected in cases:
        output = call_model(f"{prompt}\\n\\nMensagem: {message}")
        hits += output.strip() == expected
    return hits / len(cases)`,
    caption: "Um eval mínimo: cada versão do prompt roda contra os mesmos casos, com checagem exata, e devolve a taxa de acerto para comparar versões.",
  },
  tradeOffs: {
    pros: [
      "Muda o comportamento em minutos, sem treinar nada",
      "Funciona com qualquer modelo acessível por API",
      "Versões de prompt podem ser comparadas com o mesmo eval",
    ],
    cons: [
      "Não adiciona conhecimento que o modelo não tem",
      "Um prompt ajustado para um modelo pode piorar em outro",
      "Instruções longas são pagas em tokens a cada requisição",
    ],
    alternatives: ["RAG, quando falta conhecimento", "Fine-tuning, quando falta comportamento que exemplos não ensinam"],
  },
  knowledgeCheck: [
    {
      id: "format-vs-content",
      prompt: "Um classificador devolve “Categoria: técnico” e o código do app espera “técnico”. Qual é a correção mais direta?",
      options: [
        "Trocar por um modelo maior",
        "Pedir no prompt só a categoria, sem texto extra, e medir de novo",
        "Aumentar a temperatura",
        "Fazer fine-tuning com milhares de exemplos",
      ],
      correct: 1,
      explanation: "O conteúdo está certo; o erro é de formato. Uma instrução explícita de formato costuma resolver, e o eval confirma se resolveu sem quebrar outros casos.",
      lesson: "05-01",
    },
    {
      id: "knowledge-gap",
      prompt: "O assistente precisa responder sobre a política de reembolso que a empresa mudou ontem. O que resolve?",
      options: [
        "Escrever “seja preciso e atualizado” no prompt",
        "Colocar o texto da política nova no contexto da requisição",
        "Baixar a temperatura para 0",
        "Repetir a pergunta três vezes",
      ],
      correct: 1,
      explanation: "Instrução não cria conhecimento. O modelo só sabe da política nova se ela estiver no contexto, que é o que o RAG automatiza.",
      lesson: "05-01",
    },
  ],
  related: ["04-03", "05-02", "16-01"],
  references: [
    { title: "OpenAI: Prompt engineering guide", url: "https://platform.openai.com/docs/guides/prompt-engineering", kind: "docs" },
    { title: "Anthropic: Prompt engineering overview", url: "https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/overview", kind: "docs" },
    { title: "Schulhoff et al. (2024), The Prompt Report: A Systematic Survey of Prompting Techniques", url: "https://arxiv.org/abs/2406.06608", kind: "paper" },
  ],
};

export default lesson;
