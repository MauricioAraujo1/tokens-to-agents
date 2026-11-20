import type { LessonContent } from "../../../types/content";

// Contexto antes ou na hora, calculado aqui. Um agente de suporte tem uma base de 40 documentos de 1.500
// tokens e a tarefa precisa de 3 deles. Pré-carregar põe os 40 no contexto; just-in-time põe um índice de
// caminhos (20 tokens por documento) e lê os 3 com uma ferramenta, pagando 100 tokens de chamada por leitura.
// A razão de sinal é a fração dos tokens da camada de dados que a tarefa usa.

const layers = [
  { id: "system", label: "system prompt", tokens: 3_000 },
  { id: "tools", label: "ferramentas", tokens: 8_000 },
  { id: "instructions", label: "instruções", tokens: 2_000 },
  { id: "skills", label: "skills (listagem)", tokens: 1_200 },
  { id: "memory", label: "índice de memória", tokens: 1_500 },
];
const fixedLayers = layers.reduce((sum, layer) => sum + layer.tokens, 0);

const DOCS = 40;
const DOC_TOKENS = 1_500;
const NEEDED = 3;
const PATH_TOKENS = 20;
const CALL_OVERHEAD = 100;
const LATER_CALLS = 15;

const useful = NEEDED * DOC_TOKENS;
const upfrontData = DOCS * DOC_TOKENS;
const jitData = DOCS * PATH_TOKENS + NEEDED * (DOC_TOKENS + CALL_OVERHEAD);
const upfrontSignal = useful / upfrontData;
const jitSignal = useful / jitData;
const upfrontCall = fixedLayers + upfrontData;
const jitCall = fixedLayers + jitData;
const laterSaving = LATER_CALLS * (upfrontData - jitData);
const extraRoundTrips = NEEDED;

const allLayers = [...layers, { id: "data", label: "dados da tarefa", tokens: jitData }];
const largestLayer = Math.max(...allLayers.map((layer) => layer.tokens));

const techniques = ["pré-carregar", "just-in-time", "subagente", "compactar", "memória em arquivo"];
const techniqueCols = ["poupa contexto", "poupa latência", "não perde detalhe"];
const techniqueValues = [
  [0, 1, 1],
  [1, 0, 1],
  [1, 0, 0.5],
  [1, 0.5, 0],
  [1, 0.5, 0.5],
];

const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const percent = (value: number) => `${(value * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

const lesson: LessonContent = {
  id: "14-10",
  subtitle: "A mesa do cirurgião: decidir, a cada chamada, quais tokens o modelo vê, de onde eles vêm e quando entram.",
  objectives: [
    "Definir context engineering e listar as camadas do contexto de um agente",
    "Tratar a janela como orçamento dividido entre camadas",
    "Calcular a razão de sinal de pré-carregar contra trazer sob demanda",
    "Escolher entre pré-carregar, buscar na hora, delegar, compactar e anotar fora",
  ],
  steps: [
    {
      id: "surgeon",
      shortTitle: "A mesa",
      title: "A mesa do cirurgião",
      tag: "context",
      body: [
        "Numa cirurgia, a instrumentadora não despeja o armário inteiro na mesa. Ela deixa à mão o que o procedimento usa e entrega cada instrumento no momento em que o cirurgião estende a mão. Mesa cheia não é mesa preparada: é mesa onde o bisturi se perde.",
        "[[Context engineering|context-engineering]] é o trabalho da instrumentadora. No artigo da Anthropic sobre o tema, o objetivo é achar o menor conjunto de tokens de alto sinal que maximiza a chance do resultado desejado. A aula 12-08 mostrou como o histórico cresce e como limpá-lo; aqui o foco é o harness inteiro: o que cada camada põe na mesa, e quando.",
      ],
      keyIdea: "Contexto bom não é o maior possível: é o menor que contém o que a próxima decisão precisa.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "table",
            piece: "block-diagram",
            blocks: [
              { id: "docs", kind: "documents", label: "instruções", col: 0, row: 0 },
              { id: "tools", kind: "tool", label: "ferramentas", col: 0, row: 1 },
              { id: "memory", kind: "memory", label: "memória", col: 1, row: 0 },
              { id: "data", kind: "vector-db", label: "dados", col: 1, row: 1 },
              { id: "context", kind: "context", label: "contexto", col: 2, row: 0.5 },
              { id: "llm", kind: "llm", label: "modelo", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "docs", to: "context" },
              { from: "tools", to: "context" },
              { from: "memory", to: "context" },
              { from: "data", to: "context", label: "só o que serve" },
              { from: "context", to: "llm" },
            ],
            active: "context",
          },
        ],
      },
      alt: "Instruções, ferramentas, memória e dados alimentam o contexto, em destaque, que vai ao modelo; dos dados entra só o que serve.",
    },
    {
      id: "layers",
      shortTitle: "Camadas",
      title: "Quem ocupa a janela",
      tag: "mechanism",
      body: [
        "Antes de o agente ler um único arquivo da tarefa, a janela já tem dono: o system prompt, as definições de cada ferramenta (com nome, descrição e schema), os arquivos de instrução, a listagem de skills e o índice de memória. Cada servidor de ferramentas conectado, como um servidor [[MCP|model-context-protocol]], acrescenta definições a toda chamada.",
        `Na cena, as camadas fixas somam ${integer(fixedLayers)} tokens, e a maior é a de ferramentas, com ${integer(layers[1].tokens)}. Pensar em [[orçamento de contexto|context-budget]] ajuda a decidir: o que entra numa camada sai da atenção das outras, e o efeito [[lost in the middle|lost-in-the-middle]] mostra que o meio de um contexto longo é o mais esquecido.`,
      ],
      keyIdea: "A janela é um orçamento dividido entre camadas; ferramentas e instruções são custo fixo de toda chamada.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "budget-stream",
            piece: "token-stream",
            tokens: allLayers.map((layer) => `${layer.label} · ${integer(layer.tokens)}`),
            bars: allLayers.map((layer) => layer.tokens / largestLayer),
            keys: [1],
            color: "module-14",
          },
        ],
      },
      alt: `Camadas do contexto com barras de tamanho: ${allLayers.map((layer) => `${layer.label} com ${integer(layer.tokens)} tokens`).join(", ")}; ferramentas, a maior camada fixa, está em destaque.`,
    },
    {
      id: "jit",
      shortTitle: "Na hora",
      title: "Antes ou na hora",
      tag: "mechanism",
      body: [
        "Há duas formas de dar dados ao agente. Pré-carregar: buscar tudo o que pode ser útil e pôr no contexto antes de começar, como no RAG clássico. Trazer na hora: deixar no contexto só referências leves (caminhos, ids, consultas) e deixar o agente ler o conteúdo com ferramentas quando precisar.",
        "A segunda é o [[contexto just-in-time|just-in-time-context]]. É como o Claude Code trabalha num repositório: o CLAUDE.md entra no início, e o resto ele descobre com glob, grep e leitura de arquivos. A estrutura também informa: nomes de pastas, tamanhos e datas de arquivos dizem ao agente o que vale abrir. O custo é latência: cada leitura é uma volta a mais no loop.",
      ],
      keyIdea: "Guarde no contexto o mapa, não o território; o agente busca o território quando precisa.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "table",
            piece: "block-diagram",
            blocks: [
              { id: "context", kind: "context", label: `${DOCS} caminhos`, col: 0, row: 0.5 },
              { id: "agent", kind: "agent", label: "agente", col: 1, row: 0.5 },
              { id: "tools", kind: "tool", label: "grep / ler", col: 2, row: 0 },
              { id: "data", kind: "documents", label: `${DOCS} documentos`, col: 3, row: 0 },
              { id: "picked", kind: "context", label: `${NEEDED} lidos`, col: 2, row: 1 },
            ],
            edges: [
              { from: "context", to: "agent", label: "mapa" },
              { from: "agent", to: "tools", label: "quando precisa" },
              { from: "tools", to: "data" },
              { from: "data", to: "picked" },
              { from: "picked", to: "agent" },
            ],
            active: "tools",
          },
        ],
      },
      alt: `O contexto guarda só ${DOCS} caminhos; o agente usa grep e leitura, em destaque, para abrir os documentos quando precisa, e só ${NEEDED} lidos voltam para ele.`,
    },
    {
      id: "signal",
      shortTitle: "A conta",
      title: "Sinal por token",
      tag: "example",
      body: [
        `A base tem ${DOCS} documentos de ${integer(DOC_TOKENS)} tokens e a tarefa precisa de ${NEEDED}. Pré-carregando, a camada de dados tem ${integer(upfrontData)} tokens e só ${integer(useful)} servem: razão de sinal de ${percent(upfrontSignal)}. Just-in-time, ela tem o índice (${integer(DOCS * PATH_TOKENS)}) mais as ${NEEDED} leituras com a chamada de cada uma: ${integer(jitData)} tokens, com sinal de ${percent(jitSignal)}.`,
        `A primeira chamada cai de ${integer(upfrontCall)} para ${integer(jitCall)} tokens, e nas ${LATER_CALLS} chamadas seguintes, que reenviam o contexto, o just-in-time deixa de ler ${integer(laterSaving)} tokens. O preço são ${extraRoundTrips} voltas a mais no loop, uma por leitura. Para tarefas em que quase todo documento importa, ou em que latência pesa mais que tokens, pré-carregar pode ganhar.`,
      ],
      keyIdea: "Meça a fração do contexto que a tarefa usa; sinal baixo é atenção e dinheiro jogados fora.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "signal-chart",
            piece: "chart",
            kind: "bar",
            series: [
              { label: "pré-carregar: dados", value: upfrontData },
              { label: "pré-carregar: útil", value: useful },
              { label: "just-in-time: dados", value: jitData },
              { label: "just-in-time: útil", value: useful },
            ],
            highlight: 2,
            color: "module-14",
          },
          {
            id: "signal-numbers",
            piece: "metrics-panel",
            metrics: [
              { id: "upfront", label: "sinal, pré-carregar", value: percent(upfrontSignal), color: "danger" },
              { id: "jit", label: "sinal, just-in-time", value: percent(jitSignal), color: "success" },
              { id: "trips", label: "voltas a mais", value: `${extraRoundTrips}` },
            ],
            highlight: "jit",
          },
        ],
      },
      alt: `Barras da camada de dados: pré-carregar põe ${integer(upfrontData)} tokens para ${integer(useful)} úteis, sinal de ${percent(upfrontSignal)}; just-in-time põe ${integer(jitData)} para os mesmos ${integer(useful)}, sinal de ${percent(jitSignal)}, ao custo de ${extraRoundTrips} voltas a mais.`,
    },
    {
      id: "toolbox",
      shortTitle: "As técnicas",
      title: "Cada técnica tem um preço",
      tag: "tradeoff",
      body: [
        "Juntando este módulo e o 12, o harness tem cinco alavancas: pré-carregar (rápido, caro em contexto), trazer na hora (enxuto, mais voltas), delegar a um subagente (protege o principal, resumo pode perder detalhe), compactar (segura sessões longas, resume o que pode fazer falta) e anotar fora num arquivo (sobrevive a tudo, mas alguém precisa reler).",
        "Não existe uma vencedora. A Anthropic descreve estratégias híbridas: o essencial entra no início e o agente explora o resto sob demanda. A pergunta que guia a escolha é a da instrumentadora: o que a próxima decisão precisa ver, e o que pode esperar na prateleira?",
      ],
      keyIdea: "Combine técnicas: o essencial sempre, o resto na hora, a exploração em janelas separadas e o que precisa durar em arquivo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "techniques",
            piece: "matrix",
            rows: techniques,
            cols: techniqueCols,
            values: techniqueValues,
            scale: { min: 0, max: 1 },
            highlight: { row: 1, col: 0 },
            color: "module-14",
          },
        ],
      },
      alt: "Matriz de técnicas de contexto: pré-carregar poupa latência mas não contexto; just-in-time, em destaque, poupa contexto sem perder detalhe mas custa latência; subagente, compactação e memória em arquivo poupam contexto com riscos diferentes de perder detalhe.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "O contexto como produto do harness",
      tag: "summary",
      body: [
        "O contexto de cada chamada é montado pelo harness, camada por camada. Context engineering é tratar essa montagem como projeto: orçamento para as camadas fixas, mapas leves em vez de conteúdo inteiro, leituras sob demanda, exploração em subagentes e poda do histórico.",
        "Uma camada merece atenção própria porque atravessa sessões: a memória. A próxima aula olha a memória do agente do ponto de vista do harness: arquivos, escopos e quem escreve o quê.",
      ],
      keyIdea: "Pergunte a cada camada: isto ajuda a próxima decisão? Se não, tire, adie ou resuma.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "recap",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "budget", label: "orçar as camadas fixas" },
              { id: "map", label: "mapa em vez de conteúdo", color: "module-14" },
              { id: "jit", label: "ler na hora" },
              { id: "isolate", label: "explorar em subagente" },
              { id: "prune", label: "podar e compactar" },
              { id: "persist", label: "anotar fora" },
            ],
          },
        ],
      },
      alt: "Chips de resumo: orçar as camadas fixas, mapa em vez de conteúdo, ler na hora, explorar em subagente, podar e compactar, anotar fora.",
    },
  ],
  realWorldExample:
    "No artigo “Effective context engineering for AI agents”, a Anthropic descreve o Claude Code como um modelo híbrido: arquivos CLAUDE.md entram no contexto logo no início, e primitivas como glob e grep permitem navegar o ambiente e buscar arquivos just-in-time, evitando índices desatualizados e árvores de sintaxe complexas. No guia de ferramentas, ela conta que o Claude Code limita as respostas de ferramentas a 25.000 tokens por padrão.",
  code: {
    language: "typescript",
    source: `const fixed = { system: 3_000, tools: 8_000, instructions: 2_000, skills: 1_200, memory: 1_500 };
const fixedTotal = Object.values(fixed).reduce((sum, tokens) => sum + tokens, 0);

function signalRatio(dataTokens: number, usefulTokens: number): number {
  return usefulTokens / dataTokens;
}

const upfront = signalRatio(40 * 1_500, 3 * 1_500);           // 0.075
const justInTime = signalRatio(40 * 20 + 3 * 1_600, 3 * 1_500); // ~0.80
console.log({ fixedTotal, upfront, justInTime });`,
    caption: "A conta da aula: o custo fixo das camadas e a razão de sinal de pré-carregar contra ler sob demanda.",
  },
  tradeOffs: {
    pros: [
      "Mais sinal por token: o modelo encontra o que importa",
      "Menos tokens reenviados em cada chamada da sessão",
      "Dados lidos na hora estão sempre atualizados",
    ],
    cons: [
      "Leituras sob demanda somam voltas no loop e latência",
      "O agente precisa saber que algo existe para buscá-lo",
      "Resumir e delegar podem esconder o detalhe que faltava",
    ],
    alternatives: ["Pré-carregar quando a base é pequena e quase toda relevante", "Janelas maiores, quando o custo não pesa e a tarefa é curta"],
  },
  knowledgeCheck: [
    {
      id: "jit-or-upfront",
      prompt: "Um agente responde dúvidas usando um manual de 8 páginas, e quase toda pergunta usa várias delas. O que faz mais sentido?",
      options: [
        "Just-in-time, sempre",
        "Pré-carregar o manual: ele é pequeno e quase todo relevante, e evita voltas no loop",
        "Delegar cada pergunta a um subagente",
        "Compactar o manual antes de cada chamada",
      ],
      correct: 1,
      explanation: "Just-in-time ganha quando a tarefa usa uma fração pequena dos dados. Com uma base pequena e quase toda útil, pré-carregar tem sinal alto e poupa as voltas de leitura.",
      lesson: "14-10",
    },
    {
      id: "signal-math",
      prompt: "Pré-carregar põe 50 documentos de 1.000 tokens no contexto, e a tarefa usa 2. Qual é a razão de sinal da camada de dados?",
      options: ["2%", "4%", "20%", "50%"],
      correct: 1,
      explanation: "Os 2 documentos úteis têm 2.000 tokens, de 50.000 carregados: 2.000 / 50.000 = 4%.",
      lesson: "14-10",
    },
  ],
  related: ["14-09", "14-11", "12-08"],
  references: [
    { title: "Anthropic: Effective context engineering for AI agents", url: "https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents", kind: "article" },
    { title: "Anthropic: Writing effective tools for agents, with agents", url: "https://www.anthropic.com/engineering/writing-tools-for-agents", kind: "article" },
    { title: "Liu et al. (2023), Lost in the Middle: How Language Models Use Long Contexts", url: "https://arxiv.org/abs/2307.03172", kind: "paper" },
  ],
};

export default lesson;
