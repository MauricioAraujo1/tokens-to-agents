import type { LessonContent } from "../../../types/content";

// Janela de contexto com contas reais: o orçamento de tokens de uma conversa numa janela de 4.096 tokens
// (o contexto do Llama 2), o corte das mensagens mais antigas até caber, e a memória do KV cache por token
// a partir da configuração publicada do Llama 2 7B (32 camadas, d = 4.096, sem GQA).

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

const WINDOW = 4096;
const MAX_OUTPUT = 512;

// Passo 2: tudo o que disputa a janela, em tokens.
const SYSTEM = 300;
const history = [620, 540, 480, 410, 350];
const DOCUMENTS = 1200;
const QUESTION = 150;
const segments = [
  { label: "sistema", tokens: SYSTEM },
  { label: "histórico", tokens: sum(history) },
  { label: "documentos", tokens: DOCUMENTS },
  { label: "pergunta", tokens: QUESTION },
  { label: "resposta", tokens: MAX_OUTPUT },
];
const needed = sum(segments.map((segment) => segment.tokens));
const overflow = needed - WINDOW;
const largestSegment = Math.max(...segments.map((segment) => segment.tokens));

// Passo 3: corta as mensagens mais antigas do histórico até a conversa caber.
function truncate(messages: number[], budget: number) {
  const kept = [...messages];
  const dropped: number[] = [];
  while (sum(kept) > budget && kept.length > 0) dropped.push(kept.shift() as number);
  return { kept, dropped };
}
const historyBudget = WINDOW - SYSTEM - DOCUMENTS - QUESTION - MAX_OUTPUT;
const { kept, dropped } = truncate(history, historyBudget);
const usedAfter = SYSTEM + sum(kept) + DOCUMENTS + QUESTION + MAX_OUTPUT;

// Passo 4: KV cache do Llama 2 7B em bf16: keys e values, por camada, por dimensão.
const LAYERS = 32;
const D = 4096;
const BYTES = 2;
const kvBytesPerToken = 2 * LAYERS * D * BYTES;
const GB = 1e9;
const lengths = [4096, 8192, 16_384, 32_768, 65_536, 131_072];
const kvGB = (tokens: number) => (tokens * kvBytesPerToken) / GB;
/** Pesos do Llama 2 7B em bf16, arredondados: 7 bilhões × 2 bytes. */
const WEIGHTS_GB = (7e9 * BYTES) / GB;
const firstOverWeights = lengths.find((length) => kvGB(length) >= WEIGHTS_GB) ?? lengths[lengths.length - 1];

const documents = ["doc 1", "doc 2", "doc 3", "doc 4", "doc 5", "doc 6", "doc 7", "pergunta"];

const lesson: LessonContent = {
  id: "04-05",
  subtitle: "Quanto texto o modelo enxerga de uma vez, o que acontece quando passa do limite e por que janelas maiores custam caro.",
  objectives: [
    "Definir a janela de contexto e listar o que consome os seus tokens",
    "Calcular o orçamento de uma conversa e cortar o histórico para caber",
    "Estimar a memória do KV cache pelo tamanho do contexto",
    "Explicar por que uma janela grande não garante que o modelo use bem tudo o que está nela",
  ],
  steps: [
    {
      id: "desk",
      shortTitle: "A mesa",
      title: "O modelo só enxerga o que está na mesa",
      tag: "context",
      body: [
        "Imagine trabalhar numa mesa pequena: só os papéis que estão em cima dela contam. O que ficou na gaveta não existe para você naquele momento. A [[janela de contexto|context-window]] é essa mesa: o número máximo de tokens que o modelo lê numa passada.",
        `O LLM não lembra das conversas anteriores. A cada mensagem, o app monta de novo a mesa inteira: as instruções do sistema, o histórico, os documentos buscados e a pergunta. No Llama 2, a mesa tem ${integer(WINDOW)} tokens; modelos mais recentes chegam a centenas de milhares.`,
      ],
      keyIdea: "A janela de contexto é toda a memória de trabalho do modelo: o que não está nela, ele não vê.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "phone", kind: "phone", label: "conversa", col: 0, row: 0 },
              { id: "docs", kind: "documents", label: "documentos", col: 0, row: 1 },
              { id: "context", kind: "context", label: `janela ${integer(WINDOW)}`, col: 1, row: 0.5 },
              { id: "llm", kind: "llm", label: "llm", col: 2, row: 0.5 },
              { id: "answer", kind: "answer", label: "resposta", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "phone", to: "context", label: "histórico" },
              { from: "docs", to: "context", label: "trechos" },
              { from: "context", to: "llm" },
              { from: "llm", to: "answer" },
            ],
            active: "context",
          },
        ],
      },
      alt: `A conversa e os documentos são colocados numa janela de ${integer(WINDOW)} tokens, em destaque, que o LLM lê para gerar a resposta.`,
    },
    {
      id: "budget",
      shortTitle: "Orçamento",
      title: "Entrada e saída dividem a mesma janela",
      tag: "mechanism",
      body: [
        `Tudo conta: ${segments.map((segment) => `${segment.label} ${integer(segment.tokens)}`).join(", ")}. A resposta entra na conta porque cada token gerado é anexado ao contexto: com um limite de ${MAX_OUTPUT} tokens de saída, é preciso reservar esse espaço.`,
        `A soma dá ${integer(needed)} tokens, ${integer(overflow)} acima da janela de ${integer(WINDOW)}. A API recusaria o pedido, ou a resposta pararia antes da hora. Alguém precisa decidir o que sai da mesa, e essa decisão é da aplicação, não do modelo.`,
      ],
      keyIdea: "Janela = sistema + histórico + documentos + pergunta + resposta. Tudo em tokens.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "budget",
            piece: "metrics-panel",
            metrics: [
              { id: "window", label: "janela", value: integer(WINDOW) },
              { id: "needed", label: "pedido", value: integer(needed), color: "danger" },
              { id: "over", label: "excesso", value: `+${integer(overflow)}`, color: "danger" },
            ],
            highlight: "over",
          },
          {
            id: "segments",
            piece: "token-stream",
            tokens: segments.map((segment) => segment.label),
            bars: segments.map((segment) => segment.tokens / largestSegment),
            query: 1,
            color: "module-04",
          },
        ],
      },
      alt: `Partes da janela, com barras do tamanho de cada uma: ${segments.map((segment) => `${segment.label} ${integer(segment.tokens)} tokens`).join(", ")}. O total, ${integer(needed)}, passa ${integer(overflow)} da janela de ${integer(WINDOW)}.`,
    },
    {
      id: "truncate",
      shortTitle: "Cortar",
      title: "Quando não cabe: cortar o que é mais antigo",
      tag: "example",
      body: [
        `A estratégia mais comum é tirar as mensagens mais antigas do histórico até caber. O histórico tem ${history.length} mensagens (${history.map(integer).join(", ")} tokens) e pode ocupar no máximo ${integer(historyBudget)}. Sai a mais antiga, de ${dropped.map(integer).join(" e ")} tokens, e a conversa fica com ${integer(usedAfter)} de ${integer(WINDOW)}.`,
        "O custo é esquecer: se a mensagem cortada dizia “meu nome é Ana”, o modelo deixa de saber. Por isso apps de chat costumam combinar o corte com um resumo das mensagens antigas, ou guardar fatos importantes fora da janela e trazê-los de volta quando forem relevantes.",
      ],
      keyIdea: "Truncar é escolher o que o modelo esquece. Sempre preserve as instruções e a pergunta atual.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "budget",
            piece: "metrics-panel",
            metrics: [
              { id: "window", label: "janela", value: integer(WINDOW) },
              { id: "needed", label: "depois do corte", value: integer(usedAfter), color: "success" },
              { id: "over", label: "mensagens cortadas", value: String(dropped.length) },
            ],
            highlight: "needed",
          },
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "history", kind: "queue", label: `${history.length} mensagens`, col: 0, row: 0 },
              { id: "context", kind: "context", label: `janela ${integer(WINDOW)}`, col: 1, row: 0 },
              { id: "llm", kind: "llm", label: "llm", col: 2, row: 0 },
              { id: "dropped", kind: "no-result", label: "mais antiga", col: 1, row: 1 },
            ],
            edges: [
              { from: "history", to: "context", label: `${kept.length} recentes` },
              { from: "context", to: "llm" },
              { from: "history", to: "dropped", label: "sai", variant: "alternative" },
            ],
            active: "context",
          },
        ],
      },
      alt: `O histórico de ${history.length} mensagens entra na janela com as ${kept.length} mais recentes; a mais antiga, de ${dropped.map(integer).join(" e ")} tokens, sai pelo caminho tracejado. A conversa passa a usar ${integer(usedAfter)} de ${integer(WINDOW)} tokens.`,
    },
    {
      id: "kv-memory",
      shortTitle: "Por que limita",
      title: "Cada token na janela ocupa memória",
      tag: "mechanism",
      body: [
        `Durante a geração, o modelo guarda a key e o value de cada token, em cada camada: é o [[KV cache|kv-cache]]. No Llama 2 7B, são 2 × ${LAYERS} camadas × ${integer(D)} dimensões × ${BYTES} bytes = ${integer(kvBytesPerToken)} bytes por token, meio megabyte. Uma janela cheia de ${integer(WINDOW)} tokens ocupa ${fixed(kvGB(WINDOW), 1)} GB por conversa.`,
        `A memória cresce em linha reta com o contexto. Se a mesma arquitetura lesse ${integer(firstOverWeights)} tokens, o cache de uma única conversa (${fixed(kvGB(firstOverWeights), 1)} GB) passaria dos cerca de ${fixed(WEIGHTS_GB, 0)} GB dos próprios pesos: as barras acesas da cena. E o trabalho da attention cresce com n², como na aula 03.08. Por isso modelos de contexto longo usam GQA e outras técnicas para encolher o cache.`,
      ],
      keyIdea: "Contexto longo custa memória linear no KV cache e trabalho quadrático na attention.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "kv",
            piece: "chart",
            kind: "bar",
            series: lengths.map((length) => ({ label: `${length / 1024}k`, value: Number(kvGB(length).toFixed(1)) })),
            cutoff: { mode: "threshold", value: WEIGHTS_GB, label: `pesos ${fixed(WEIGHTS_GB, 0)} GB` },
            highlight: lengths.indexOf(firstOverWeights),
            color: "module-04",
          },
        ],
      },
      alt: `KV cache de uma conversa no Llama 2 7B por tamanho de contexto: ${lengths.map((length) => `${length / 1024}k tokens ${fixed(kvGB(length), 1)} GB`).join(", ")}. A partir de ${integer(firstOverWeights)} tokens, o cache passa dos ${fixed(WEIGHTS_GB, 0)} GB dos pesos.`,
    },
    {
      id: "middle",
      shortTitle: "No meio",
      title: "Caber na janela não é o mesmo que ser usado",
      tag: "tradeoff",
      body: [
        "Uma janela enorme convida a colocar tudo no prompt: o manual inteiro, todos os e-mails. Mas o modelo não presta a mesma atenção em todas as posições. Liu et al. (2023) mostraram o efeito [[lost in the middle|lost-in-the-middle]]: com a resposta escondida num de vários documentos, a acurácia é maior quando ela está no começo ou no fim do contexto e cai quando está no meio.",
        "Na prática, isso pede ordem e seleção. Coloque as instruções e os trechos mais relevantes no começo ou perto da pergunta, e mande menos texto, melhor escolhido, em vez de mais. Contexto maior também custa mais caro por chamada e deixa a resposta mais lenta.",
      ],
      keyIdea: "Mais contexto não é mais compreensão: selecione e ordene o que entra na janela.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "docs",
            piece: "token-stream",
            tokens: documents,
            query: documents.length - 1,
            keys: [0, documents.length - 2],
            arcs: [
              { from: documents.length - 1, to: 0, weight: 0.8 },
              { from: documents.length - 1, to: 3, weight: 0.2 },
              { from: documents.length - 1, to: documents.length - 2, weight: 0.8 },
            ],
            color: "module-04",
          },
        ],
      },
      alt: "Sete documentos seguidos da pergunta. Arcos fortes ligam a pergunta ao primeiro e ao último documento, e um arco fraco liga ao documento do meio: o que está no meio tende a ser menos usado.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Montar a janela é trabalho da aplicação",
      tag: "summary",
      body: [
        "A janela de contexto limita quanto o modelo lê de uma vez, e entrada e saída dividem o mesmo espaço. Quando não cabe, a aplicação decide o que cortar ou resumir; quando cabe, ainda vale escolher e ordenar bem o que entra.",
        "O limite existe porque cada token custa memória no KV cache e trabalho na attention. A próxima aula volta à geração: como a temperatura e o sorteio escolhem o próximo token.",
      ],
      keyIdea: "Conte tokens, reserve a saída, corte com critério e coloque o importante onde o modelo olha.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "steps",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "count", label: "contar tokens" },
              { id: "reserve", label: "reservar a saída" },
              { id: "cut", label: "cortar ou resumir", color: "module-04" },
              { id: "order", label: "ordenar o relevante" },
              { id: "generate", label: "gerar", color: "brand" },
            ],
          },
        ],
      },
      alt: "Fluxo em chips: contar tokens, reservar a saída, cortar ou resumir, ordenar o relevante e gerar.",
    },
  ],
  realWorldExample:
    "Assistentes de código como o GitHub Copilot não mandam o repositório inteiro para o modelo: escolhem o arquivo aberto, trechos de arquivos vizinhos e o texto perto do cursor, dentro do orçamento de tokens do modelo. Frameworks de chat, como o LangChain, oferecem utilitários para cortar ou resumir o histórico quando a conversa passa do limite.",
  code: {
    language: "python",
    source: `def fit_history(messages, count_tokens, budget):
    """Remove as mensagens mais antigas até o histórico caber no orçamento."""
    kept = list(messages)
    while kept and sum(count_tokens(m) for m in kept) > budget:
        kept.pop(0)
    return kept

window, max_output = 4096, 512
system, documents, question = 300, 1200, 150
history = [620, 540, 480, 410, 350]          # tokens de cada mensagem, da mais antiga à mais nova

budget = window - max_output - system - documents - question
print(fit_history(history, lambda m: m, budget))  # [540, 480, 410, 350]`,
    caption: "O corte da cena em Python. Numa aplicação real, count_tokens conta com o tokenizador do próprio modelo.",
  },
  tradeOffs: {
    pros: [
      "Janelas grandes permitem mandar documentos inteiros sem montar uma busca",
      "O modelo usa na hora tudo o que está na janela, sem treinar de novo",
      "Cortar pelas mensagens mais antigas é simples e previsível",
    ],
    cons: [
      "Cada token a mais custa memória (KV cache), tempo e dinheiro por chamada",
      "Informação no meio de contextos longos tende a ser menos usada",
      "O que sai da janela é esquecido, sem aviso",
    ],
    alternatives: [
      "Resumir o histórico antigo em poucas linhas",
      "Buscar só os trechos relevantes com RAG, em vez de mandar tudo",
      "Guardar fatos em uma memória externa e trazê-los de volta quando forem relevantes",
    ],
  },
  knowledgeCheck: [
    {
      id: "reserve-output",
      prompt: "A janela é de 8.000 tokens e o prompt montado tem 7.900. O pedido aceita até 1.000 tokens de resposta. O que tende a acontecer?",
      options: [
        "Nada: a resposta não conta na janela",
        "A resposta só tem espaço para uns 100 tokens, ou a API recusa o pedido",
        "O modelo resume o prompt sozinho",
        "A janela cresce automaticamente",
      ],
      correct: 1,
      explanation: "Os tokens gerados também ocupam a janela. Sobra espaço para cerca de 100; é preciso cortar o prompt ou reservar a saída antes.",
      lesson: "04-05",
    },
    {
      id: "kv-double",
      prompt: "O contexto de uma conversa passa de 16 mil para 32 mil tokens. O que acontece com a memória do KV cache dessa conversa?",
      options: ["Fica igual", "Dobra", "Quadruplica", "Cai pela metade"],
      correct: 1,
      explanation: "O cache guarda uma key e um value por token e por camada: a memória cresce linearmente com o número de tokens. O que cresce com n² é o trabalho da attention.",
      lesson: "04-05",
    },
  ],
  related: ["03-08", "04-06", "10-05", "12-08"],
  references: [
    { title: "Liu et al. (2023), Lost in the Middle: How Language Models Use Long Contexts", url: "https://arxiv.org/abs/2307.03172", kind: "paper" },
    { title: "Touvron et al. (2023), Llama 2: Open Foundation and Fine-Tuned Chat Models", url: "https://arxiv.org/abs/2307.09288", kind: "paper" },
    { title: "Kwon et al. (2023), Efficient Memory Management for Large Language Model Serving with PagedAttention", url: "https://arxiv.org/abs/2309.06180", kind: "paper" },
  ],
};

export default lesson;
