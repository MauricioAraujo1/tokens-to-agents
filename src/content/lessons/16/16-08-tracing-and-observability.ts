import type { BlockDiagramSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Um trace de brinquedo de um assistente RAG com uma ferramenta, com as contas no arquivo: cada span tem pai,
// início e duração em milissegundos; o arquivo calcula o fim de cada span, a duração do trace, o tempo próprio
// da raiz, a fatia do LLM e os tokens somados dos atributos gen_ai.usage.*. Depois, o volume diário de traces
// guardados com amostragem na cabeça e na cauda (tamanho por trace e taxa de erro de brinquedo).

const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const percent = (value: number) => `${Math.round(value * 100)}%`;
const gb = (value: number) => `${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} GB`;

interface Span {
  id: string;
  label: string;
  parent?: string;
  start: number;
  duration: number;
  inputTokens?: number;
  outputTokens?: number;
}

const ROOT_OVERHEAD = 30;
const children: Span[] = [
  { id: "guard-in", label: "guardrail entrada", parent: "root", start: 0, duration: 80 },
  { id: "retrieval", label: "busca", parent: "root", start: 80, duration: 300 },
  { id: "embed", label: "embedding", parent: "retrieval", start: 80, duration: 40 },
  { id: "search", label: "busca vetorial", parent: "retrieval", start: 120, duration: 90 },
  { id: "rerank", label: "rerank", parent: "retrieval", start: 210, duration: 170 },
  { id: "llm-1", label: "chat 1", parent: "root", start: 380, duration: 1350, inputTokens: 2400, outputTokens: 60 },
  { id: "tool", label: "buscar_pedido", parent: "root", start: 1730, duration: 620 },
  { id: "llm-2", label: "chat 2", parent: "root", start: 2350, duration: 1100, inputTokens: 2600, outputTokens: 220 },
  { id: "guard-out", label: "guardrail saída", parent: "root", start: 3450, duration: 70 },
];
const end = (span: Span) => span.start + span.duration;
const total = Math.max(...children.map(end)) + ROOT_OVERHEAD;
const root: Span = { id: "root", label: "requisição", start: 0, duration: total };
const spans = [root, ...children];
const direct = children.filter((span) => span.parent === "root");
const rootSelf = total - direct.reduce((sum, span) => sum + span.duration, 0);
const llmSpans = children.filter((span) => span.inputTokens !== undefined);
const llmTime = llmSpans.reduce((sum, span) => sum + span.duration, 0);
const llmShare = llmTime / total;
const inputTokens = llmSpans.reduce((sum, span) => sum + (span.inputTokens ?? 0), 0);
const outputTokens = llmSpans.reduce((sum, span) => sum + (span.outputTokens ?? 0), 0);
const slowest = [...direct].sort((a, b) => b.duration - a.duration)[0];
const rerank = children.find((span) => span.id === "rerank") as Span;
const retrieval = children.find((span) => span.id === "retrieval") as Span;

// Passo 2: posições do grafo, com os filhos da raiz em ordem de início e os da busca embaixo dela.
const layout: Record<string, { x: number; y: number; short: string }> = {
  root: { x: 0.5, y: 0.1, short: "requisição" },
  "guard-in": { x: 0.06, y: 0.5, short: "entrada" },
  retrieval: { x: 0.24, y: 0.5, short: "busca" },
  embed: { x: 0.08, y: 0.9, short: "embedding" },
  search: { x: 0.3, y: 0.9, short: "vetorial" },
  rerank: { x: 0.52, y: 0.9, short: "rerank" },
  "llm-1": { x: 0.42, y: 0.5, short: "chat 1" },
  tool: { x: 0.6, y: 0.5, short: "ferramenta" },
  "llm-2": { x: 0.78, y: 0.5, short: "chat 2" },
  "guard-out": { x: 0.94, y: 0.5, short: "saída" },
};

// Passo 5: amostragem.
const REQUESTS_PER_DAY = 1_000_000;
const KB_PER_TRACE = 25;
const ERROR_RATE = 0.02;
const HEAD_RATE = 0.1;
const toGb = (traces: number) => (traces * KB_PER_TRACE) / 1_000_000;
const everything = toGb(REQUESTS_PER_DAY);
const headKept = REQUESTS_PER_DAY * HEAD_RATE;
const headErrorsKept = REQUESTS_PER_DAY * ERROR_RATE * HEAD_RATE;
const tailKept = REQUESTS_PER_DAY * (ERROR_RATE + (1 - ERROR_RATE) * HEAD_RATE);
const errorsPerDay = REQUESTS_PER_DAY * ERROR_RATE;

const attributes = [
  "gen_ai.operation.name",
  "gen_ai.request.model",
  "gen_ai.usage.input_tokens",
  "gen_ai.usage.output_tokens",
  "gen_ai.response.finish_reasons",
];

const request = (active: string, done?: string[]): BlockDiagramSpec => ({
  id: "request",
  piece: "block-diagram",
  blocks: [
    { id: "phone", kind: "phone", label: "usuário", col: 0, row: 0 },
    { id: "api", kind: "server", label: "api", col: 1, row: 0 },
    { id: "search", kind: "retrieval", label: "busca", col: 2, row: 0 },
    { id: "llm", kind: "llm", label: "llm", col: 3, row: 0 },
    { id: "tool", kind: "tool", label: "ferramenta", col: 3, row: 1 },
    { id: "trace", kind: "eval", label: "trace", col: 1, row: 1 },
  ],
  edges: [
    { from: "phone", to: "api", label: "pergunta" },
    { from: "api", to: "search" },
    { from: "search", to: "llm" },
    { from: "llm", to: "tool" },
    { from: "tool", to: "trace", label: "spans", variant: "alternative" },
  ],
  active,
  done,
});

const lesson: LessonContent = {
  id: "16-08",
  subtitle: "Como enxergar o que aconteceu dentro de uma requisição de IA: traces, spans, as convenções do OpenTelemetry para IA generativa e quanto guardar.",
  objectives: [
    "Explicar trace, span e a árvore de spans de uma requisição",
    "Ler uma decomposição de latência e achar o span que domina",
    "Instrumentar chamadas de LLM com os atributos gen_ai do OpenTelemetry",
    "Dimensionar o volume de traces com amostragem na cabeça e na cauda",
  ],
  steps: [
    {
      id: "tracking",
      shortTitle: "Rastreio",
      title: "O rastreio da encomenda",
      tag: "context",
      body: [
        "Quando uma encomenda atrasa, o código de rastreio mostra cada parada: saiu do centro de distribuição, chegou à cidade, saiu para entrega. Sem ele, você só sabe que o pacote não chegou. Uma resposta lenta ou errada de um assistente é igual: o log da API diz “200 em 3,5 s” e mais nada.",
        "[[Observabilidade|observability]] é conseguir responder perguntas sobre o que o sistema fez a partir do que ele registrou, sem precisar reproduzir o problema. Para apps com LLM, a peça central é o [[trace|trace]]: o registro de uma requisição inteira, com cada etapa por onde ela passou, quanto demorou e o que entrou e saiu de cada uma.",
      ],
      keyIdea: "Um trace é o código de rastreio de uma requisição: cada etapa carimbada com tempo e dados.",
      scene: { kind: "pieces", layout: "single", pieces: [request("api")] },
      alt: "A pergunta do usuário passa pela API, em destaque, pela busca, pelo LLM e por uma ferramenta; cada etapa deixa um registro que forma o trace.",
    },
    {
      id: "spans",
      shortTitle: "Spans",
      title: "Uma árvore de spans",
      tag: "mechanism",
      body: [
        `Cada etapa do trace é um [[span|span]]: um nome, um início, uma duração, o id do span pai e atributos. Os spans formam uma árvore. A raiz é a requisição inteira, ${integer(total)} ms; os filhos diretos são o guardrail de entrada, a busca, duas chamadas ao modelo, a ferramenta e o guardrail de saída. A busca tem os próprios filhos: embedding, busca vetorial e rerank.`,
        "Todos os spans carregam o mesmo trace id, e cada um aponta para o pai. Quando a requisição cruza serviços, o id viaja no cabeçalho HTTP traceparent, definido pelo padrão W3C Trace Context, e o serviço seguinte cria spans filhos do mesmo trace. É isso que permite ver a ferramenta, que roda em outro serviço, dentro da mesma árvore.",
      ],
      keyIdea: "Span = etapa com início, duração, pai e atributos; trace = a árvore inteira com o mesmo id.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "tree",
            piece: "graph",
            nodes: spans.map((span) => ({ id: span.id, label: layout[span.id].short, x: layout[span.id].x, y: layout[span.id].y })),
            edges: children.map((span) => ({ from: span.parent as string, to: span.id })),
            highlight: [retrieval.id],
            path: ["root", retrieval.id, rerank.id],
          },
        ],
      },
      alt: `Árvore de spans: a requisição de ${integer(total)} ms tem como filhos ${direct.map((span) => `${span.label} ${integer(span.duration)} ms`).join(", ")}; a busca tem embedding, busca vetorial e rerank.`,
    },
    {
      id: "otel",
      shortTitle: "OpenTelemetry",
      title: "Os mesmos nomes em todo lugar",
      tag: "mechanism",
      body: [
        "Se cada biblioteca chamasse os tokens de um jeito, nenhuma ferramenta conseguiria somar o custo. O [[OpenTelemetry|opentelemetry]] é o padrão aberto da CNCF para gerar e exportar traces, métricas e logs: o app usa um SDK, os spans vão para um coletor, e o coletor manda para o backend que você escolher, sem trocar a instrumentação.",
        "As [[convenções semânticas|semantic-conventions]] do OpenTelemetry para IA generativa fixam os nomes dos atributos de uma chamada de modelo, como os da cena: a operação, o modelo pedido, os tokens de entrada e de saída e o motivo da parada. Elas ainda estão marcadas como em desenvolvimento, e o texto dos prompts e respostas fica fora por padrão, porque pode ter dados pessoais: gravar o conteúdo é uma escolha explícita.",
      ],
      keyIdea: "Instrumente uma vez com OpenTelemetry e os nomes gen_ai; troque de backend sem reescrever nada.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "pipeline",
            piece: "block-diagram",
            blocks: [
              { id: "app", kind: "app", label: "app + sdk", col: 0, row: 0 },
              { id: "llm", kind: "cloud", label: "provedor do llm", col: 1, row: 0 },
              { id: "collector", kind: "queue", label: "coletor", col: 2, row: 0 },
              { id: "backend", kind: "server", label: "backend de traces", col: 3, row: 0 },
            ],
            edges: [
              { from: "app", to: "llm", label: "chamada" },
              { from: "llm", to: "collector", label: "spans", variant: "alternative" },
              { from: "collector", to: "backend", label: "otlp" },
            ],
            active: "collector",
          },
          { id: "attributes", piece: "token-stream", tokens: attributes, keys: [2, 3], color: "module-16" },
        ],
      },
      alt: `O app com o SDK chama o provedor do LLM; os spans vão para o coletor, em destaque, que exporta por OTLP para o backend de traces. Atributos de uma chamada de modelo: ${attributes.join(", ")}, com os de tokens em destaque.`,
    },
    {
      id: "breakdown",
      shortTitle: "Latência",
      title: "Para onde foi o tempo",
      tag: "example",
      body: [
        `Somando os filhos diretos, sobra ${integer(rootSelf)} ms de tempo próprio na raiz. O resto se explica: as duas chamadas ao modelo levam ${integer(llmTime)} ms, ${percent(llmShare)} do total, e a mais lenta das etapas é “${slowest.label}”, ${integer(slowest.duration)} ms. Os atributos somam ${integer(inputTokens)} tokens de entrada e ${integer(outputTokens)} de saída.`,
        `O trace também mostra o que o log não mostraria: dentro da busca, o rerank leva ${integer(rerank.duration)} dos ${integer(retrieval.duration)} ms. E a ferramenta força uma segunda chamada ao modelo, que relê quase todo o contexto da primeira. As opções ficam claras: cache do prompt (aula 10.06), um reranker menor, ou resolver a ferramenta antes da primeira chamada. Sem o trace, a equipe só saberia que “o LLM é lento”.`,
      ],
      keyIdea: "A decomposição por span mostra onde atacar a latência e o custo, inclusive fora do modelo.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "totals",
            piece: "metrics-panel",
            metrics: [
              { id: "total", label: "trace", value: `${integer(total)} ms` },
              { id: "llm", label: "fatia do llm", value: percent(llmShare), color: "danger" },
              { id: "tokens", label: "tokens entrada / saída", value: `${integer(inputTokens)} / ${integer(outputTokens)}` },
            ],
            highlight: "llm",
          },
          {
            id: "durations",
            piece: "chart",
            kind: "bar",
            series: direct.map((span) => ({ label: span.label, value: span.duration })),
            highlight: direct.indexOf(slowest),
            color: "module-16",
          },
        ],
      },
      alt: `Duração dos filhos diretos do trace: ${direct.map((span) => `${span.label} ${integer(span.duration)} ms`).join(", ")}. O LLM responde por ${percent(llmShare)} dos ${integer(total)} ms.`,
    },
    {
      id: "sampling",
      shortTitle: "Amostragem",
      title: "Guardar tudo custa caro",
      tag: "tradeoff",
      body: [
        `Com ${integer(REQUESTS_PER_DAY)} requisições por dia e ${KB_PER_TRACE} KB por trace com o conteúdo (valores de brinquedo), guardar tudo são ${gb(everything)} por dia. A amostragem na cabeça decide no início da requisição: guardando ${percent(HEAD_RATE)}, ficam ${gb(toGb(headKept))}, mas só ${integer(headErrorsKept)} dos ${integer(errorsPerDay)} traces com erro, justo os que alguém vai querer abrir.`,
        `A [[amostragem na cauda|tail-sampling]] decide no fim, quando já se sabe se a requisição falhou ou demorou: guarda todos os erros e ${percent(HEAD_RATE)} do resto, ${integer(tailKept)} traces ou ${gb(toGb(tailKept))} por dia. Custa mais memória no coletor, que precisa segurar os spans até o trace terminar. Retenção, acesso e mascaramento de dados pessoais nos traces são o tema da aula 16.12.`,
      ],
      keyIdea: "Amostre na cauda: todos os erros e lentos, uma fração do resto.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "volume",
            piece: "metrics-panel",
            metrics: [
              { id: "all", label: "tudo", value: `${gb(everything)}/dia` },
              { id: "head", label: `cabeça, ${percent(HEAD_RATE)}`, value: `${gb(toGb(headKept))}/dia`, color: "danger" },
              { id: "tail", label: `cauda: erros + ${percent(HEAD_RATE)}`, value: `${gb(toGb(tailKept))}/dia`, color: "success" },
              { id: "errors", label: "erros guardados na cabeça", value: `${integer(headErrorsKept)} de ${integer(errorsPerDay)}`, color: "danger" },
            ],
            highlight: "tail",
          },
        ],
      },
      alt: `Volume diário de traces: tudo ${gb(everything)}; amostragem na cabeça de ${percent(HEAD_RATE)}, ${gb(toGb(headKept))} e só ${integer(headErrorsKept)} dos ${integer(errorsPerDay)} erros; amostragem na cauda com todos os erros e ${percent(HEAD_RATE)} do resto, ${gb(toGb(tailKept))}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Traces viram casos de teste",
      tag: "summary",
      body: [
        "Um trace por requisição, uma árvore de spans com tempo, pai e atributos gen_ai padronizados, exportada por OpenTelemetry e amostrada na cauda. Com isso, latência e custo se explicam por etapa, e uma resposta ruim pode ser aberta e lida, do prompt montado à chamada da ferramenta.",
        "O trace também fecha o ciclo da avaliação: traces com nota baixa viram casos do eval offline, e avaliações automáticas rodam sobre traces amostrados. A próxima aula usa esse acesso às respostas para detectar alucinações.",
      ],
      keyIdea: "Observabilidade de LLM = traces bem nomeados + amostragem certa + o caminho de volta para o eval.",
      scene: { kind: "pieces", layout: "single", pieces: [request("trace", ["phone", "api", "search", "llm", "tool"])] },
      alt: "O fluxo completo com o trace em destaque: cada etapa, da API à ferramenta, deixou um span que pode ser lido e virar caso de teste.",
    },
  ],
  realWorldExample:
    "Bibliotecas como o OpenLLMetry e as instrumentações oficiais do OpenTelemetry para SDKs de provedores de LLM criam um span por chamada de modelo com os atributos gen_ai, e backends como Jaeger, Grafana Tempo, Langfuse ou Arize Phoenix recebem esses spans por OTLP. A mesma instrumentação serve para ver a árvore de uma requisição, somar tokens por usuário e alimentar avaliações automáticas sobre os traces.",
  code: {
    language: "json",
    source: `{
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "parent_span_id": "a3ce929d0e0e4736",
  "name": "chat gpt-4o-mini",
  "duration_ms": 1350,
  "attributes": {
    "gen_ai.operation.name": "chat",
    "gen_ai.request.model": "gpt-4o-mini",
    "gen_ai.usage.input_tokens": 2400,
    "gen_ai.usage.output_tokens": 60,
    "gen_ai.response.finish_reasons": ["tool_calls"]
  }
}`,
    caption: "Um span de chamada de modelo com os atributos das convenções gen_ai: nome “operação modelo”, pai, duração e tokens.",
  },
  tradeOffs: {
    pros: [
      "Explica latência e custo etapa por etapa, inclusive fora do modelo",
      "Uma instrumentação padrão serve para qualquer backend",
      "Traces com falha viram casos de teste com contexto completo",
    ],
    cons: [
      "Guardar o conteúdo dos prompts expõe dados pessoais e custa armazenamento",
      "Amostragem na cauda exige memória no coletor e configuração extra",
      "As convenções gen_ai ainda mudam, e nomes de atributos podem ser renomeados",
    ],
    alternatives: [
      "Logs estruturados por requisição, mais simples, mas sem a árvore entre serviços",
      "Plataformas de observabilidade de LLM com SDK próprio, mais rápidas de adotar e mais presas ao fornecedor",
    ],
  },
  knowledgeCheck: [
    {
      id: "slow-span",
      prompt: "Um trace de 4 s mostra: busca 2,6 s (rerank 2,3 s), chamada ao modelo 1,2 s, guardrails 0,2 s. A equipe quer trocar o modelo por um mais rápido. O que o trace sugere?",
      options: [
        "Trocar o modelo, que é sempre o gargalo",
        "Atacar o rerank primeiro: ele sozinho leva mais da metade do tempo",
        "Remover os guardrails",
        "Aumentar o timeout",
      ],
      correct: 1,
      explanation: "O rerank leva 2,3 dos 4 s. Mesmo um modelo duas vezes mais rápido economizaria só 0,6 s; o trace aponta o gargalo fora do LLM.",
      lesson: "16-08",
    },
    {
      id: "tail",
      prompt: "Com amostragem na cabeça de 5%, quantos de 10.000 traces com erro por dia ficam guardados, em média?",
      options: ["10.000", "5.000", "500", "50"],
      correct: 2,
      explanation: "A amostragem na cabeça decide antes de saber se vai dar erro, então guarda 5% de tudo, inclusive dos erros: 500. Na cauda, dá para guardar os 10.000.",
      lesson: "16-08",
    },
  ],
  related: ["10-04", "16-07", "16-13"],
  references: [
    { title: "OpenTelemetry: Semantic conventions for generative AI systems", url: "https://opentelemetry.io/docs/specs/semconv/gen-ai/", kind: "docs" },
    { title: "OpenTelemetry: Traces", url: "https://opentelemetry.io/docs/concepts/signals/traces/", kind: "docs" },
    { title: "W3C Trace Context", url: "https://www.w3.org/TR/trace-context/", kind: "docs" },
  ],
};

export default lesson;
