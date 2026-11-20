import type { LessonContent } from "../../../types/content";

// Gestão de contexto com uma execução de brinquedo, simulada aqui: um agente de código faz 30 iterações. Cada
// chamada ao LLM lê o prompt base (sistema + ferramentas), um pensamento com a chamada por iteração anterior e
// as observações (leituras de arquivo de 2 mil tokens). Três estratégias: não fazer nada, limpar resultados
// antigos (só as 3 últimas observações ficam inteiras) e compactar quando o contexto passa de 80% da janela.

const WINDOW = 64_000;
const COMPACT_AT = 0.8;
const BASE = 3_000;
const STEP = 150;
const OBSERVATION = 2_000;
const KEEP_RAW = 3;
const STUB = 20;
const SUMMARY = 2_000;
const ITERATIONS = 30;

const iterations = Array.from({ length: ITERATIONS }, (_, index) => index + 1);
const noManagement = iterations.map((iteration) => BASE + (iteration - 1) * (STEP + OBSERVATION));
const clearing = iterations.map((iteration) => {
  const previous = iteration - 1;
  return BASE + previous * STEP + Math.min(previous, KEEP_RAW) * OBSERVATION + Math.max(0, previous - KEEP_RAW) * STUB;
});

const compactionThreshold = WINDOW * COMPACT_AT;
function simulateCompaction() {
  const events: Array<{ iteration: number; before: number }> = [];
  const contexts: number[] = [];
  let summary = 0;
  let entries = 0;
  for (const iteration of iterations) {
    let context = BASE + summary + entries * (STEP + OBSERVATION);
    if (context >= compactionThreshold) {
      events.push({ iteration, before: context });
      summary = SUMMARY;
      entries = 0;
      context = BASE + summary;
    }
    contexts.push(context);
    entries += 1;
  }
  return { events, contexts };
}
const { events: compactionEvents, contexts: compaction } = simulateCompaction();

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const overflowIteration = iterations.find((iteration) => noManagement[iteration - 1] > WINDOW) ?? ITERATIONS + 1;
const lastFit = overflowIteration - 1;
const totalNone = sum(noManagement);
const totalClearing = sum(clearing);
// A compactação custa uma chamada extra ao resumidor, que lê o contexto inteiro antes de resumir.
const totalCompaction = sum(compaction) + sum(compactionEvents.map((event) => event.before));
const firstCompaction = compactionEvents[0];
const savingsClearing = 1 - totalClearing / totalNone;
const savingsCompaction = 1 - totalCompaction / totalNone;

// Passo 2: de onde vêm os tokens na última iteração que ainda cabe sem gestão.
const previousAtFit = lastFit - 1;
const composition = [
  { label: "sistema + tools", tokens: BASE },
  { label: "pensamentos", tokens: previousAtFit * STEP },
  { label: "observações antigas", tokens: (previousAtFit - KEEP_RAW) * OBSERVATION },
  { label: `${KEEP_RAW} últimas obs.`, tokens: KEEP_RAW * OBSERVATION },
];
const compositionTotal = sum(composition.map((part) => part.tokens));
const oldShare = composition[2].tokens / compositionTotal;
const largestPart = Math.max(...composition.map((part) => part.tokens));

const thousands = (value: number) => Number((value / 1000).toFixed(1));
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const percent = (value: number) => `${Math.round(value * 100)}%`;
const sampled = iterations.filter((iteration) => iteration % 3 === 0);

const lesson: LessonContent = {
  id: "12-08",
  subtitle: "Como o contexto de um agente enche a cada iteração, e as técnicas para mantê-lo pequeno e útil: limpar, compactar e anotar fora.",
  objectives: [
    "Calcular como o contexto de um agente cresce iteração a iteração",
    "Explicar context rot e por que mais contexto nem sempre ajuda",
    "Comparar limpeza de resultados de ferramentas com compactação por resumo",
    "Usar scratchpad e subagentes para tirar trabalho da janela principal",
  ],
  steps: [
    {
      id: "backpack",
      shortTitle: "A mochila",
      title: "Uma mochila numa trilha longa",
      tag: "context",
      body: [
        "Numa trilha de vários dias, quem coloca na mochila tudo o que encontra pelo caminho trava no terceiro dia. Pedras bonitas, mapas de trechos já percorridos, embalagens vazias: tudo pesa, e fica difícil achar a lanterna no fundo.",
        `O contexto de um [[agente|agent]] é essa mochila. A cada volta do loop entram um pensamento, uma chamada e uma observação. Num agente de código que lê arquivos de ${integer(OBSERVATION)} tokens, a chamada n lê ${integer(BASE)} + (n − 1) × ${integer(STEP + OBSERVATION)} tokens. Com uma [[janela de contexto|context-window]] de ${integer(WINDOW)} tokens, a iteração ${overflowIteration} já não cabe.`,
      ],
      keyIdea: "Cada iteração adiciona ao contexto; sem gestão, todo agente longo bate no limite da janela.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "agent", kind: "agent", label: "agente", col: 0, row: 0.5 },
              { id: "tool", kind: "tool", label: "ler_arquivo", col: 1, row: 0 },
              { id: "repo", kind: "documents", label: "repositório", col: 2, row: 0 },
              { id: "context", kind: "context", label: `janela ${integer(WINDOW / 1000)} mil`, col: 1, row: 1 },
              { id: "llm", kind: "llm", label: "llm", col: 2, row: 1 },
            ],
            edges: [
              { from: "agent", to: "tool", label: "chamada" },
              { from: "tool", to: "repo" },
              { from: "repo", to: "context", label: `+${integer(OBSERVATION)} tokens` },
              { from: "context", to: "llm", label: "tudo de novo" },
            ],
            active: "context",
          },
        ],
      },
      alt: `O agente chama ler_arquivo no repositório; cada leitura soma ${integer(OBSERVATION)} tokens ao contexto, em destaque, que é reenviado inteiro ao LLM a cada iteração, numa janela de ${integer(WINDOW)} tokens.`,
    },
    {
      id: "weight",
      shortTitle: "O que pesa",
      title: "A maior parte é lixo de trilha",
      tag: "mechanism",
      body: [
        `Na iteração ${lastFit}, a última que cabe, o contexto tem ${integer(compositionTotal)} tokens. As observações antigas, leituras de arquivos que o agente já usou, são ${percent(oldShare)} disso. O agente quase nunca precisa reler o resultado bruto da iteração 2 na iteração ${lastFit}.`,
        "Além de custo, há perda de qualidade. A Anthropic chama de [[context rot|context-rot]] a queda na capacidade do modelo de lembrar com precisão o que está no contexto à medida que a janela enche, e o efeito [[lost in the middle|lost-in-the-middle]] mostra que o que fica no meio de um contexto longo é o mais esquecido. Janela grande é limite, não meta.",
      ],
      keyIdea: "Contexto é orçamento de atenção: o que não ajuda a próxima decisão atrapalha.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "composition",
            piece: "token-stream",
            tokens: composition.map((part) => `${part.label} · ${integer(part.tokens)}`),
            bars: composition.map((part) => part.tokens / largestPart),
            keys: [2],
            color: "module-12",
          },
        ],
      },
      alt: `Composição do contexto na iteração ${lastFit}: ${composition.map((part) => `${part.label} com ${integer(part.tokens)} tokens`).join(", ")}. As observações antigas, em destaque, são ${percent(oldShare)} do total.`,
    },
    {
      id: "compact",
      shortTitle: "Compactar",
      title: "Limpar e resumir",
      tag: "mechanism",
      body: [
        "Na trilha, você joga fora as embalagens e troca os mapas usados por uma linha no caderno: “passei pelo rio, a ponte norte está fechada”. Os dois movimentos são as técnicas principais de gestão de contexto.",
        `O mais leve é limpar resultados antigos de ferramentas: as ${KEEP_RAW} últimas observações ficam inteiras e as anteriores viram um marcador de ${STUB} tokens, como “[leitura de auth.py removida]”. O mais forte é a [[compactação|context-compaction]]: quando o contexto passa de ${percent(COMPACT_AT)} da janela (${integer(compactionThreshold)} tokens), um LLM resume o histórico em uns ${integer(SUMMARY)} tokens, com decisões, pendências e arquivos tocados, e o agente continua numa janela nova a partir do resumo.`,
      ],
      keyIdea: "Primeiro limpe o que é bruto e velho; quando não bastar, troque o histórico por um resumo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "context", kind: "context", label: `histórico ${firstCompaction ? integer(firstCompaction.before / 1000) : "0"} mil`, col: 0, row: 0.5 },
              { id: "llm", kind: "llm", label: "resumidor", col: 1, row: 0.5 },
              { id: "summary", kind: "documents", label: `resumo ${integer(SUMMARY / 1000)} mil`, col: 2, row: 0.5 },
              { id: "agent", kind: "agent", label: "janela nova", col: 3, row: 0.5 },
              { id: "trash", kind: "no-result", label: "obs. antigas", col: 1, row: 1 },
            ],
            edges: [
              { from: "context", to: "llm", label: "80% cheio" },
              { from: "llm", to: "summary", label: "decisões + pendências" },
              { from: "summary", to: "agent" },
              { from: "context", to: "trash", label: "limpar", variant: "alternative" },
            ],
            active: "llm",
            done: ["context"],
          },
        ],
      },
      alt: `O histórico, com ${firstCompaction ? integer(firstCompaction.before) : 0} tokens, vai para um LLM resumidor, em destaque, que escreve um resumo de ${integer(SUMMARY)} tokens com decisões e pendências; o agente continua numa janela nova. Um caminho tracejado mostra as observações antigas sendo limpas.`,
    },
    {
      id: "numbers",
      shortTitle: "A conta",
      title: `${ITERATIONS} iterações, três estratégias`,
      tag: "example",
      body: [
        `Rodando as ${ITERATIONS} iterações: sem gestão, a soma dos tokens de entrada seria ${integer(totalNone)}, isso se a janela fosse infinita, porque a iteração ${overflowIteration} estoura. A compactação dispara na iteração ${firstCompaction ? firstCompaction.iteration : "nenhuma"}, derruba o contexto para ${integer(BASE + SUMMARY)} tokens e fecha em ${integer(totalCompaction)} tokens, já contando a chamada do resumidor: ${percent(savingsCompaction)} a menos.`,
        `Limpar resultados antigos fecha em ${integer(totalClearing)} tokens, ${percent(savingsClearing)} a menos, e nunca chega perto do limite. A Anthropic descreve essa limpeza como uma das formas mais seguras e leves de compactação. O risco das duas é o mesmo: apagar algo que o agente vai precisar. Por isso o resumo guarda caminhos de arquivo e ids, para o agente reler sob demanda.`,
      ],
      keyIdea: "Limpar resultados brutos rende muito com pouco risco; compactar segura execuções longas.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "curve",
            piece: "chart",
            kind: "line",
            series: sampled.map((iteration) => ({ label: `it. ${iteration}`, value: thousands(compaction[iteration - 1]) })),
            max: WINDOW / 1000,
            cutoff: { mode: "threshold", value: compactionThreshold / 1000, label: "80% da janela" },
            color: "module-12",
          },
          {
            id: "totals",
            piece: "metrics-panel",
            metrics: [
              { id: "none", label: "sem gestão", value: `${integer(totalNone)} tokens`, color: "danger" },
              { id: "compaction", label: "compactação", value: `−${percent(savingsCompaction)}` },
              { id: "clearing", label: "limpar resultados", value: `−${percent(savingsClearing)}`, color: "success" },
            ],
            highlight: "compaction",
          },
        ],
      },
      alt: `Linha do contexto, em milhares de tokens, com compactação: sobe até passar de 80% da janela na iteração ${firstCompaction ? firstCompaction.iteration : 0} e cai para ${integer(BASE + SUMMARY)} tokens. O painel mostra ${integer(totalNone)} tokens sem gestão, ${percent(savingsCompaction)} a menos com compactação e ${percent(savingsClearing)} a menos limpando resultados antigos.`,
    },
    {
      id: "offload",
      shortTitle: "Anotar fora",
      title: "Caderno de campo e batedores",
      tag: "tradeoff",
      body: [
        "Dois truques de trilheiro: anotar o caminho num caderno que fica fora da mochila e mandar um batedor explorar uma bifurcação e voltar só com “o caminho da esquerda dá no lago”.",
        "O [[scratchpad|scratchpad]] é o caderno: o agente grava um NOTES.md ou uma lista de tarefas fora do contexto e relê quando retoma o trabalho, mesmo depois de uma compactação. O batedor é um subagente: explora com uma janela limpa, gasta os tokens dele e devolve um resumo curto. O custo é latência e tokens extras, e um resumo ruim esconde do agente principal o detalhe que importava.",
      ],
      keyIdea: "Tire do contexto o que pode viver fora: notas em arquivo e exploração em janelas separadas.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "agent", kind: "agent", label: "agente principal", col: 1, row: 0.5 },
              { id: "notes", kind: "memory", label: "notes.md", col: 0, row: 0 },
              { id: "context", kind: "context", label: "contexto enxuto", col: 0, row: 1 },
              { id: "sub", kind: "agent", label: "subagente", col: 2, row: 0.5 },
              { id: "repo", kind: "documents", label: "repositório", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "agent", to: "notes", label: "anota" },
              { from: "notes", to: "context", label: "relê" },
              { from: "agent", to: "sub", label: "explore x" },
              { from: "sub", to: "repo", label: "muitas leituras" },
              { from: "sub", to: "agent", label: "resumo curto" },
            ],
            active: "sub",
          },
        ],
      },
      alt: "O agente principal anota num notes.md e relê as notas num contexto enxuto; ele também manda um subagente, em destaque, explorar o repositório com muitas leituras, e recebe de volta só um resumo curto.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "A ordem das ferramentas",
      tag: "summary",
      body: [
        "Gestão de contexto é decidir, a cada chamada, o que o modelo precisa ver. Comece trazendo dados sob demanda (caminhos e ids em vez do conteúdo inteiro), limpe resultados brutos que já foram usados, compacte quando o contexto chegar perto do limite, anote fora o que precisa sobreviver e delegue exploração pesada a subagentes.",
        "Com memória e contexto sob controle, dá para montar um agente completo e sozinho. A próxima aula junta as peças num sistema de agente único e mostra quando ele basta.",
      ],
      keyIdea: "Trazer sob demanda, limpar, compactar, anotar fora, delegar: nessa ordem de custo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "order",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "jit", label: "trazer sob demanda" },
              { id: "clear", label: "limpar resultados", color: "module-12" },
              { id: "compact", label: "compactar" },
              { id: "notes", label: "anotar fora" },
              { id: "sub", label: "delegar a subagentes", color: "brand" },
            ],
          },
        ],
      },
      alt: "Fluxo em chips: trazer dados sob demanda, limpar resultados, compactar, anotar fora e delegar a subagentes.",
    },
  ],
  realWorldExample:
    "No artigo “Effective context engineering for AI agents”, a Anthropic descreve as três técnicas para tarefas longas: compactação (resumir e recomeçar numa janela nova), anotações estruturadas fora do contexto, como um arquivo NOTES.md, e subagentes que exploram com janela limpa e devolvem um resumo condensado.",
  code: {
    language: "python",
    source: `WINDOW, COMPACT_AT, KEEP_RAW = 64_000, 0.8, 3

def prepare(messages, count_tokens, summarize):
    tool_results = [m for m in messages if m["role"] == "tool"]
    for old in tool_results[:-KEEP_RAW]:                 # limpar resultados antigos
        old["content"] = f"[resultado removido: {old['name']}]"
    if count_tokens(messages) >= WINDOW * COMPACT_AT:     # compactar
        summary = summarize(messages)                     # decisões, pendências, arquivos
        messages = [messages[0], {"role": "user", "content": summary}]
    return messages`,
    caption: "Antes de cada chamada: limpar resultados brutos antigos e, perto do limite, trocar o histórico pelo resumo, mantendo o system prompt.",
  },
  tradeOffs: {
    pros: [
      "Execuções longas cabem na janela e custam bem menos tokens",
      "Menos ruído no contexto, o que reduz context rot",
      "Notas em arquivo sobrevivem a compactações e reinícios",
    ],
    cons: [
      "Um resumo ruim apaga a informação que o agente ia precisar",
      "A compactação custa uma chamada extra e pode invalidar o cache de prefixo",
      "Subagentes somam latência e tokens no total",
    ],
    alternatives: [
      "Janela maior, quando a tarefa é curta e o custo não pesa",
      "Dividir a tarefa em execuções menores, cada uma com o seu contexto",
    ],
  },
  knowledgeCheck: [
    {
      id: "first-move",
      prompt: "Um agente de código passa de 70% da janela, e quase tudo são saídas de testes que ele já leu. Qual é a primeira medida?",
      options: [
        "Trocar por um modelo com janela maior",
        "Limpar os resultados antigos de ferramentas, mantendo os mais recentes inteiros",
        "Apagar o system prompt para liberar espaço",
        "Parar o agente e começar do zero",
      ],
      correct: 1,
      explanation: "Resultados brutos já usados são o que mais pesa e o que menos faz falta. Limpá-los é a forma mais leve de compactação, antes de resumir o histórico.",
      lesson: "12-08",
    },
    {
      id: "summary-content",
      prompt: "O que não pode faltar no resumo de uma compactação para o agente continuar bem?",
      options: [
        "A saída completa de todas as ferramentas",
        "Decisões tomadas, pendências e referências (caminhos, ids) para reler o que precisar",
        "Só a primeira mensagem do usuário",
        "Nada: o modelo lembra do que já leu",
      ],
      correct: 1,
      explanation: "O modelo não lembra do que saiu do contexto. O resumo precisa das decisões, do que falta fazer e de referências leves para trazer o detalhe sob demanda.",
      lesson: "12-08",
    },
  ],
  related: ["12-07", "12-09", "04-05"],
  references: [
    { title: "Anthropic: Effective context engineering for AI agents", url: "https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents", kind: "article" },
    { title: "Liu et al. (2023), Lost in the Middle: How Language Models Use Long Contexts", url: "https://arxiv.org/abs/2307.03172", kind: "paper" },
    { title: "Packer et al. (2023), MemGPT: Towards LLMs as Operating Systems", url: "https://arxiv.org/abs/2310.08560", kind: "paper" },
  ],
};

export default lesson;
