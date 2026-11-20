import type { LessonContent } from "../../../types/content";

// Otimização de custo com as contas no arquivo. Todos os preços são DE EXEMPLO, para mostrar a conta:
// consulte a tabela do seu provedor. Os multiplicadores do prompt caching (escrita 1,25×, leitura 0,1×)
// e o desconto de 50% da Batch API são os documentados pela Anthropic e pela OpenAI. A vazão do servidor
// próprio é a mesma hipótese de vazão medida da aula 10-13.

const money = (value: number, digits = 2) =>
  `US$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
const fixed = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const percent = (value: number) => `${Math.round(value * 100)}%`;
const MILLION = 1e6;

// Passo 2: preços de exemplo por milhão de tokens e o tráfego do mês.
const LARGE = { input: 3, output: 15 };
const SMALL = { input: 0.3, output: 1.5 };
const REQUESTS = 1_000_000;
const INPUT_TOKENS = 2000;
const OUTPUT_TOKENS = 300;
const requestCost = (input: number, output: number, price = LARGE) =>
  (input * price.input + output * price.output) / MILLION;
const inputShare = (INPUT_TOKENS * LARGE.input) / (INPUT_TOKENS * LARGE.input + OUTPUT_TOKENS * LARGE.output);
const baseline = REQUESTS * requestCost(INPUT_TOKENS, OUTPUT_TOKENS);

// Passo 4: alavancas em sequência, cada uma sobre o resultado da anterior.
const TRIMMED_INPUT = 1400;
const afterTrim = REQUESTS * requestCost(TRIMMED_INPUT, OUTPUT_TOKENS);
const CACHED_PREFIX = 1000;
const HIT_RATE = 0.9;
const CACHE_WRITE = 1.25;
const CACHE_READ = 0.1;
/** Tokens de entrada equivalentes: o prefixo custa 0,1× nos hits e 1,25× nos misses, que escrevem o cache. */
const effectiveInput = CACHED_PREFIX * (HIT_RATE * CACHE_READ + (1 - HIT_RATE) * CACHE_WRITE) + (TRIMMED_INPUT - CACHED_PREFIX);
const afterCache = REQUESTS * requestCost(effectiveInput, OUTPUT_TOKENS);
const OFFLINE_SHARE = 0.3;
const BATCH_DISCOUNT = 0.5;
const afterBatch = afterCache * (1 - OFFLINE_SHARE * BATCH_DISCOUNT);
const SMALL_SHARE = 0.6;
const priceRatio = requestCost(1, 0, SMALL) / requestCost(1, 0, LARGE);
const afterRouting = afterBatch * (1 - SMALL_SHARE + SMALL_SHARE * priceRatio);
const levers = [
  { label: "base", value: baseline },
  { label: "aparar prompt", value: afterTrim },
  { label: "prompt caching", value: afterCache },
  { label: "batch api", value: afterBatch },
  { label: "roteamento", value: afterRouting },
];
const totalSaving = 1 - afterRouting / baseline;

// Passo 3: servidor próprio. Preço por hora de exemplo e vazão medida de exemplo.
const GPU_HOURLY = 2.5;
const MEASURED_TOKENS_PER_S = 2000;
const tokensPerHour = MEASURED_TOKENS_PER_S * 3600;
const costPerMillion = (utilization: number) => GPU_HOURLY / ((tokensPerHour * utilization) / MILLION);
const utilizations = [0.05, 0.1, 0.25, 0.5, 0.75, 1];
const utilizationSeries = utilizations.map((utilization) => ({
  label: percent(utilization),
  value: Number(costPerMillion(utilization).toFixed(2)),
}));

// Passo 5: ponto de equilíbrio entre a API de um modelo pequeno e uma GPU ligada o mês inteiro.
const HOURS_PER_MONTH = 730;
const gpuMonthly = GPU_HOURLY * HOURS_PER_MONTH;
const smallRequestCost = requestCost(TRIMMED_INPUT, OUTPUT_TOKENS, SMALL);
const breakEvenRequests = gpuMonthly / smallRequestCost;
const gpuRequestsAtFull = (MEASURED_TOKENS_PER_S * 3600 * HOURS_PER_MONTH) / OUTPUT_TOKENS;
const breakEvenUtilization = breakEvenRequests / gpuRequestsAtFull;
const REDUNDANT_GPUS = 2;

const lesson: LessonContent = {
  id: "10-14",
  subtitle: "De onde vem a conta de um produto com LLM e quais alavancas cortam o custo por pedido sem piorar a resposta.",
  objectives: [
    "Calcular o custo por pedido a partir dos tokens de entrada e saída",
    "Explicar por que a utilização define o custo por token de um servidor próprio",
    "Somar alavancas: prompt menor, prompt caching, Batch API e roteamento",
    "Achar o ponto de equilíbrio entre API e GPU própria",
  ],
  steps: [
    {
      id: "bill",
      shortTitle: "A conta",
      title: "Duas formas de pagar pelo mesmo token",
      tag: "context",
      body: [
        "Pense em táxi e carro próprio. No táxi, você paga por quilômetro e não paga nada parado. No carro, paga a parcela todo mês, rodando ou não: só compensa se rodar bastante. Com LLMs é igual. A API cobra por token; a GPU própria cobra por hora, ocupada ou ociosa.",
        "Nas duas, a unidade que importa é o [[custo por token|cost-per-token]]. Na API, ele está na tabela de preços, quase sempre com entrada mais barata que saída. No servidor próprio, ele é o preço da hora dividido pelos tokens que a GPU de fato entregou naquela hora.",
      ],
      keyIdea: "API é custo variável por token; GPU própria é custo fixo por hora que vira custo por token conforme o uso.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "paths",
            piece: "block-diagram",
            blocks: [
              { id: "app", kind: "app", label: "seu app", col: 0, row: 0.5 },
              { id: "api", kind: "cloud", label: "api: por token", col: 1.5, row: 0 },
              { id: "gpu", kind: "server", label: "gpu: por hora", col: 1.5, row: 1 },
              { id: "answer", kind: "answer", label: "resposta", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "app", to: "api", label: "tokens" },
              { from: "app", to: "gpu", label: "tokens" },
              { from: "api", to: "answer" },
              { from: "gpu", to: "answer" },
            ],
            active: "app",
          },
        ],
      },
      alt: "O app pode mandar tokens para uma API, que cobra por token, ou para uma GPU própria, que cobra por hora; as duas devolvem a resposta.",
    },
    {
      id: "per-request",
      shortTitle: "Por pedido",
      title: "Custo por pedido = entrada × preço + saída × preço",
      tag: "mechanism",
      body: [
        `Com preços de exemplo de ${money(LARGE.input)} por milhão de tokens de entrada e ${money(LARGE.output)} por milhão de saída, um pedido com ${integer(INPUT_TOKENS)} tokens de prompt e ${OUTPUT_TOKENS} de resposta custa ${money(requestCost(INPUT_TOKENS, OUTPUT_TOKENS), 4)}. Parece nada, até multiplicar por ${integer(REQUESTS)} pedidos no mês: ${money(baseline, 0)}.`,
        `Repare na divisão: a entrada é ${percent(inputShare)} da conta, mesmo com o token de saída custando ${LARGE.output / LARGE.input} vezes mais, porque o prompt tem ${fixed(INPUT_TOKENS / OUTPUT_TOKENS)} vezes mais tokens. Em RAG e em agentes, com contexto longo, a entrada quase sempre domina. Por isso a primeira alavanca é olhar o que vai no prompt.`,
      ],
      keyIdea: "Antes de otimizar, separe a conta em tokens de entrada e de saída: cada lado tem alavancas diferentes.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "cost",
            piece: "metrics-panel",
            metrics: [
              { id: "input", label: `entrada (${integer(INPUT_TOKENS)} tokens)`, value: money((INPUT_TOKENS * LARGE.input) / MILLION, 4) },
              { id: "output", label: `saída (${OUTPUT_TOKENS} tokens)`, value: money((OUTPUT_TOKENS * LARGE.output) / MILLION, 4) },
              { id: "request", label: "por pedido", value: money(requestCost(INPUT_TOKENS, OUTPUT_TOKENS), 4) },
              { id: "month", label: `${integer(REQUESTS)} pedidos`, value: money(baseline, 0), color: "danger" },
            ],
            highlight: "month",
          },
        ],
      },
      alt: `Custo com preços de exemplo: entrada de ${integer(INPUT_TOKENS)} tokens e saída de ${OUTPUT_TOKENS} somam ${money(requestCost(INPUT_TOKENS, OUTPUT_TOKENS), 4)} por pedido e ${money(baseline, 0)} por mês.`,
    },
    {
      id: "utilization",
      shortTitle: "Utilização",
      title: "No servidor próprio, quem manda é a utilização",
      tag: "mechanism",
      body: [
        `Uma GPU alugada a ${money(GPU_HOURLY)} por hora (preço de exemplo) que entrega ${integer(MEASURED_TOKENS_PER_S)} tokens por segundo (vazão de exemplo, medida em teste de carga) produz ${fixed(tokensPerHour / MILLION)} milhões de tokens por hora se ficar sempre cheia. Aí o milhão sai por ${money(costPerMillion(1))}.`,
        `Mas a hora é paga mesmo com a GPU parada. A ${percent(0.25)} de utilização, o milhão custa ${money(costPerMillion(0.25))}; a ${percent(0.05)}, ${money(costPerMillion(0.05))}, vinte vezes mais. O custo por token é inversamente proporcional à utilização: batching, filas e desligar réplicas ociosas à noite valem mais que qualquer desconto no preço da hora.`,
      ],
      keyIdea: "GPU parada continua cobrando: custo por token = preço da hora / tokens entregues na hora.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "utilization",
            piece: "chart",
            kind: "line",
            series: utilizationSeries,
            highlight: utilizations.indexOf(0.25),
            color: "module-10",
          },
        ],
      },
      alt: `Curva do custo por milhão de tokens contra a utilização da GPU: ${utilizationSeries.map((point) => `${point.label}, ${money(point.value)}`).join("; ")}.`,
    },
    {
      id: "levers",
      shortTitle: "Alavancas",
      title: "Quatro alavancas, uma depois da outra",
      tag: "example",
      body: [
        `Partindo de ${money(baseline, 0)} por mês: aparar instruções repetidas e histórico velho leva o prompt de ${integer(INPUT_TOKENS)} para ${integer(TRIMMED_INPUT)} tokens (${money(afterTrim, 0)}). O [[prompt caching|prompt-caching]] dos ${integer(CACHED_PREFIX)} tokens estáveis, com ${percent(HIT_RATE)} de acerto, leitura a ${fixed(CACHE_READ)}× e escrita a ${fixed(CACHE_WRITE, 2)}× do preço (os multiplicadores documentados pela Anthropic), deixa a entrada em ${integer(effectiveInput)} tokens equivalentes (${money(afterCache, 0)}).`,
        `Os ${percent(OFFLINE_SHARE)} de pedidos que não têm pressa, como relatórios noturnos, vão para a [[Batch API|batch-api]], com ${percent(BATCH_DISCOUNT)} de desconto documentado pela OpenAI e pela Anthropic (${money(afterBatch, 0)}; confira se o seu provedor soma esse desconto ao do cache). Por fim, o [[roteamento|model-routing]] manda ${percent(SMALL_SHARE)} dos pedidos para um modelo ${integer(1 / priceRatio)} vezes mais barato: ${money(afterRouting, 0)}, ${percent(totalSaving)} a menos que a base, se a qualidade medida se mantiver.`,
      ],
      keyIdea: "As alavancas se multiplicam: cada uma corta uma fração do que sobrou da anterior.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "levers",
            piece: "chart",
            kind: "bar",
            series: levers.map((lever) => ({ label: lever.label, value: Number((lever.value / 1000).toFixed(1)) })),
            highlight: levers.length - 1,
            color: "module-10",
          },
        ],
      },
      alt: `Custo mensal em milhares de dólares, com preços de exemplo, depois de cada alavanca: ${levers.map((lever) => `${lever.label} ${money(lever.value, 0)}`).join(", ")}.`,
    },
    {
      id: "break-even",
      shortTitle: "Equilíbrio",
      title: "Quando a GPU própria compensa",
      tag: "tradeoff",
      body: [
        `Ligada o mês inteiro, a GPU de exemplo custa ${money(gpuMonthly, 0)}. Um pedido de ${integer(TRIMMED_INPUT)} tokens de entrada e ${OUTPUT_TOKENS} de saída num modelo pequeno por API custa ${money(smallRequestCost, 5)} nos preços de exemplo. O equilíbrio fica em ${integer(breakEvenRequests)} pedidos por mês, o que exige só ${percent(breakEvenUtilization)} da capacidade da GPU.`,
        `No papel, a GPU vence cedo. Na prática, produção pede pelo menos ${REDUNDANT_GPUS} réplicas para não cair numa falha, o que dobra o equilíbrio para ${integer(breakEvenRequests * REDUNDANT_GPUS)} pedidos, e soma o custo de quem opera: atualizações, monitoração, plantão. Tráfego alto e estável favorece a GPU própria; tráfego baixo, irregular ou que precisa de um modelo de fronteira favorece a API.`,
      ],
      keyIdea: "Compare o custo fixo da GPU com o custo por pedido da API, e coloque redundância e operação na conta.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "paths",
            piece: "block-diagram",
            blocks: [
              { id: "app", kind: "app", label: "seu app", col: 0, row: 0.5 },
              { id: "api", kind: "cloud", label: "api pequena", col: 1.5, row: 0 },
              { id: "gpu", kind: "server", label: `${REDUNDANT_GPUS} gpus próprias`, col: 1.5, row: 1 },
              { id: "eval", kind: "eval", label: "equilíbrio", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "app", to: "api", label: "por pedido" },
              { from: "app", to: "gpu", label: "por mês" },
              { from: "api", to: "eval" },
              { from: "gpu", to: "eval" },
            ],
            active: "eval",
          },
          {
            id: "break-even-metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "gpu", label: "gpu por mês", value: money(gpuMonthly, 0) },
              { id: "api", label: "api por pedido", value: money(smallRequestCost, 5) },
              { id: "even", label: "equilíbrio (1 gpu)", value: `${integer(breakEvenRequests)} pedidos`, color: "module-10" },
              { id: "use", label: "utilização no equilíbrio", value: percent(breakEvenUtilization) },
            ],
            highlight: "even",
          },
        ],
      },
      alt: `Comparação entre uma API de modelo pequeno, a ${money(smallRequestCost, 5)} por pedido, e GPUs próprias, a ${money(gpuMonthly, 0)} por mês cada: o equilíbrio de uma GPU fica em ${integer(breakEvenRequests)} pedidos por mês, com ${percent(breakEvenUtilization)} de utilização.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Medir os tokens, depois puxar as alavancas",
      tag: "summary",
      body: [
        "O custo de um produto com LLM é tokens × preço, e cada lado tem a sua alavanca: prompt menor e cache para a entrada, limite de tamanho e respostas diretas para a saída, Batch API para o que não tem pressa, roteamento para o que um modelo menor resolve. No servidor próprio, a utilização decide tudo.",
        "Toda alavanca que troca de modelo precisa de avaliação antes e depois, senão a economia vira resposta pior. A próxima aula detalha a mais poderosa delas: o roteamento de modelos.",
      ],
      keyIdea: "Custo por pedido medido, alavancas em ordem, qualidade conferida a cada passo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "order",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "measure", label: "medir tokens por pedido" },
              { id: "trim", label: "aparar o prompt" },
              { id: "cache", label: "prompt caching", color: "module-10" },
              { id: "batch", label: "batch api no que não tem pressa" },
              { id: "route", label: "rotear para modelos menores", color: "module-10" },
              { id: "host", label: "gpu própria se o volume pagar" },
            ],
          },
        ],
      },
      alt: "Fluxo em chips: medir tokens por pedido, aparar o prompt, prompt caching, batch API no que não tem pressa, rotear para modelos menores e GPU própria se o volume pagar.",
    },
  ],
  realWorldExample:
    "A Anthropic documenta que tokens lidos do prompt cache custam 10% do preço normal de entrada e que a escrita no cache custa 25% a mais, com validade padrão de 5 minutos. OpenAI e Anthropic documentam Batch APIs que processam os pedidos em até 24 horas com 50% de desconto. Juntas, essas duas linhas da tabela de preços costumam render mais economia que trocar de provedor.",
  code: {
    language: "python",
    source: `def request_cost(input_tokens, output_tokens, price_in, price_out):
    """Custo de um pedido com preços por milhão de tokens."""
    return (input_tokens * price_in + output_tokens * price_out) / 1_000_000

# preços de exemplo, não de um provedor real
base = request_cost(2000, 300, price_in=3.0, price_out=15.0)
cached_input = 1000 * (0.9 * 0.1 + 0.1 * 1.25) + 400  # prefixo em cache + resto
with_cache = request_cost(cached_input, 300, 3.0, 15.0)
print(f"{base:.4f} -> {with_cache:.4f} por pedido")`,
    caption: "A conta da aula: custo por pedido sem cache e com 90% de acerto no prefixo de 1.000 tokens, com os multiplicadores 0,1× e 1,25×.",
  },
  tradeOffs: {
    pros: [
      "Prompt menor e prompt caching cortam custo e tempo até o primeiro token ao mesmo tempo",
      "Batch API reduz o preço pela metade no tráfego que não tem pressa",
      "Roteamento e GPU própria derrubam o custo por token em volume alto",
    ],
    cons: [
      "Trocar de modelo para economizar pode piorar a resposta sem ninguém perceber",
      "Batch API devolve em horas, não em segundos",
      "GPU própria cobra parada e exige redundância e equipe de operação",
    ],
    alternatives: [
      "Modelos quantizados no servidor próprio, para caber mais tráfego por GPU",
      "Cache semântico de respostas inteiras, para perguntas repetidas",
    ],
  },
  knowledgeCheck: [
    {
      id: "input-dominates",
      prompt: "Um agente manda 12.000 tokens de contexto e recebe 200 de resposta por chamada, com saída 5 vezes mais cara que a entrada. Qual alavanca ataca a maior parte da conta?",
      options: [
        "Limitar max_tokens da resposta",
        "Reduzir e cachear o contexto de entrada, que custa 12.000 contra o equivalente a 1.000 da saída",
        "Aumentar a temperatura",
        "Usar streaming",
      ],
      correct: 1,
      explanation: "Entrada: 12.000 × 1 = 12.000 unidades; saída: 200 × 5 = 1.000. A entrada é mais de 90% da conta, então aparar e cachear o contexto rende muito mais que mexer na saída.",
      lesson: "10-14",
    },
    {
      id: "idle-gpu",
      prompt: "Uma GPU própria custa o mesmo por hora e passou de 50% para 10% de utilização depois que o tráfego migrou. O que acontece com o custo por token?",
      options: [
        "Cai pela metade",
        "Fica igual, porque o preço da hora não mudou",
        "Fica 5 vezes maior, porque a mesma hora paga 5 vezes menos tokens",
        "Depende da temperatura",
      ],
      correct: 2,
      explanation: "Custo por token = preço da hora / tokens entregues. Com um quinto dos tokens, cada token custa 5 vezes mais. É hora de desligar réplicas ou consolidar o tráfego.",
      lesson: "10-14",
    },
  ],
  related: ["10-13", "10-15", "17-13"],
  references: [
    { title: "OpenAI: Batch API", url: "https://platform.openai.com/docs/guides/batch", kind: "docs" },
    { title: "Anthropic: Prompt caching", url: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching", kind: "docs" },
    { title: "Chen, Zaharia e Zou (2023), FrugalGPT", url: "https://arxiv.org/abs/2305.05176", kind: "paper" },
  ],
};

export default lesson;
