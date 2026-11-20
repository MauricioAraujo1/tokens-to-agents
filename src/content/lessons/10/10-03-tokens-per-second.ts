import type { LessonContent } from "../../../types/content";

// Métricas de velocidade da geração, com as contas no arquivo: TTFT = fila e rede + prefill; latência total =
// TTFT + (n − 1) · ITL; tokens por segundo de um usuário = 1 / ITL. O teto do decode é banda de memória / bytes
// dos pesos (fp16), numa H100 (3,35 TB/s, cerca de 989 TFLOPS densos em BF16, página da NVIDIA). No passo 5,
// a passada de decode com B usuários também lê o KV cache de cada um (Llama 2 7B: 524.288 bytes por token).

const fixed = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const percent = (value: number) => `${Math.round(value * 100)}%`;

const GB = 1e9;
const FP16_BYTES = 2;
const H100_FLOPS = 989e12;
const H100_BANDWIDTH = 3.35e12;
const PARAMS = 7e9;
const weightBytes = PARAMS * FP16_BYTES;

// Passo 2: uma requisição de um usuário sozinho, no teto teórico.
const NETWORK_AND_QUEUE_MS = 50;
const PROMPT_TOKENS = 1000;
const OUTPUT_TOKENS = 400;
const prefillMs = ((2 * PARAMS * PROMPT_TOKENS) / H100_FLOPS) * 1000;
const ttftMs = NETWORK_AND_QUEUE_MS + prefillMs;
const itlMs = (weightBytes / H100_BANDWIDTH) * 1000;
const userTokensPerSecond = 1000 / itlMs;
const endToEndMs = ttftMs + (OUTPUT_TOKENS - 1) * itlMs;

// Passo 3: teto de tokens por segundo por tamanho de modelo, numa H100 (o 70B, em 2 GPUs com tensor parallelism).
const sizes = [
  { label: "1B", params: 1e9, gpus: 1 },
  { label: "3B", params: 3e9, gpus: 1 },
  { label: "7B", params: 7e9, gpus: 1 },
  { label: "13B", params: 13e9, gpus: 1 },
  { label: "34B", params: 34e9, gpus: 1 },
  { label: "70B (2 GPUs)", params: 70e9, gpus: 2 },
];
const ceilingSeries = sizes.map((size) => ({
  label: size.label,
  value: Math.round((size.gpus * H100_BANDWIDTH) / (size.params * FP16_BYTES)),
}));
const ceilingOf = (label: string) => ceilingSeries.find((item) => item.label === label)?.value ?? 0;

// Passo 4: dois sistemas hipotéticos, um que começa rápido e outro que gera rápido.
const systems = [
  { id: "A", ttftS: 0.2, tokensPerSecond: 100 },
  { id: "B", ttftS: 1.5, tokensPerSecond: 200 },
];
const SHORT = 50;
const LONG = 1000;
const totalSeconds = (system: (typeof systems)[number], tokens: number) => system.ttftS + (tokens - 1) / system.tokensPerSecond;
const [systemA, systemB] = systems;
const comparison = [SHORT, LONG].flatMap((tokens) =>
  systems.map((system) => ({ label: `${system.id}, ${integer(tokens)} tokens`, value: Number(totalSeconds(system, tokens).toFixed(2)) })),
);

// Passo 5: B usuários na mesma passada de decode, cada um com 1.024 tokens de contexto no KV cache.
const KV_BYTES_PER_TOKEN = 2 * 32 * 32 * 128 * FP16_BYTES;
const CONTEXT = 1024;
const kvBytesPerUser = KV_BYTES_PER_TOKEN * CONTEXT;
const decodeStep = (batch: number) => {
  const memoryMs = ((weightBytes + batch * kvBytesPerUser) / H100_BANDWIDTH) * 1000;
  const computeMs = ((2 * PARAMS * batch) / H100_FLOPS) * 1000;
  const ms = Math.max(memoryMs, computeMs);
  return { ms, perUser: 1000 / ms, total: (1000 * batch) / ms, computeUse: computeMs / ms };
};
const BATCH = 32;
const alone = decodeStep(1);
const shared = decodeStep(BATCH);

const lesson: LessonContent = {
  id: "10-03",
  subtitle: "Como medir a velocidade de um LLM: o tempo até o primeiro token, o ritmo entre tokens e a diferença entre tokens por segundo de um usuário e do servidor.",
  objectives: [
    "Definir TTFT, tempo entre tokens e tokens por segundo",
    "Calcular a latência total de uma resposta a partir dessas métricas",
    "Estimar o teto de tokens por segundo pela banda de memória e pelo tamanho do modelo",
    "Diferenciar a velocidade de cada usuário da capacidade total do servidor",
  ],
  steps: [
    {
      id: "feel",
      shortTitle: "Percepção",
      title: "Começar a falar e falar rápido são coisas diferentes",
      tag: "context",
      body: [
        "Pense em dois atendentes. O primeiro responde “olha, é assim…” na hora e depois fala devagar. O segundo fica dois segundos calado e então despeja a resposta. Os dois podem terminar juntos, mas a sensação é outra. Com um LLM em streaming acontece o mesmo: o usuário sente o silêncio antes do primeiro token e o ritmo do texto depois dele.",
        "Por isso a velocidade de um LLM não é um número só. O [[time to first token|time-to-first-token]] (TTFT) mede o silêncio: fila, rede e o [[prefill|prefill]]. A [[inter-token latency|inter-token-latency]] (ITL, também chamada TPOT) mede o ritmo do [[decode|decode]]. E [[tokens por segundo|tokens-per-second]] é o inverso do ritmo, o número que aparece nos benchmarks.",
      ],
      keyIdea: "TTFT é quanto tempo o usuário espera para ver algo; ITL é o ritmo do texto depois disso.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "usuário", col: 0, row: 0 },
              { id: "phone", kind: "phone", label: "chat", col: 1, row: 0 },
              { id: "api", kind: "server", label: "servidor", col: 2, row: 0 },
              { id: "llm", kind: "llm", label: "modelo", col: 3, row: 0 },
              { id: "answer", kind: "answer", label: "1º token: ttft", col: 2, row: 1 },
            ],
            edges: [
              { from: "user", to: "phone" },
              { from: "phone", to: "api", label: "pedido" },
              { from: "api", to: "llm", label: "prefill" },
              { from: "llm", to: "answer", label: "decode" },
              { from: "answer", to: "phone", label: "streaming" },
            ],
            active: "answer",
          },
        ],
      },
      alt: "O usuário pergunta no chat, o servidor roda o prefill no modelo, e o primeiro token, em destaque, volta em streaming para o chat: o tempo até ele é o TTFT.",
    },
    {
      id: "formulas",
      shortTitle: "As contas",
      title: "Três números e uma soma",
      tag: "mechanism",
      body: [
        `Suponha ${NETWORK_AND_QUEUE_MS} ms de rede e fila, um prompt de ${integer(PROMPT_TOKENS)} tokens e um modelo de 7B numa H100. O prefill leva ${fixed(prefillMs)} ms, então o TTFT fica em ${fixed(ttftMs, 0)} ms. Cada token seguinte custa uma leitura dos ${integer(weightBytes / GB)} GB de pesos: ${fixed(itlMs, 2)} ms de ITL, ou ${integer(userTokensPerSecond)} tokens por segundo.`,
        `A latência total de uma resposta de n tokens é TTFT + (n − 1) × ITL. Para ${OUTPUT_TOKENS} tokens: ${fixed(ttftMs, 0)} + ${OUTPUT_TOKENS - 1} × ${fixed(itlMs, 2)} = ${integer(endToEndMs)} ms. Esses são tetos ideais; num servidor real, o ITL é maior, porque a passada também lê o [[KV cache|kv-cache]] e é dividida com outros usuários.`,
      ],
      keyIdea: "Latência total = TTFT + (n − 1) × ITL: o primeiro token paga o prefill, os outros pagam o decode.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "ttft", label: "TTFT", value: `${fixed(ttftMs, 0)} ms` },
              { id: "itl", label: "ITL", value: `${fixed(itlMs, 2)} ms` },
              { id: "tps", label: "tokens/s do usuário", value: integer(userTokensPerSecond), color: "module-10" },
              { id: "total", label: `total, ${OUTPUT_TOKENS} tokens`, value: `${fixed(endToEndMs / 1000, 2)} s` },
            ],
            highlight: "tps",
          },
        ],
      },
      alt: `Métricas ideais de um modelo de 7B numa H100: TTFT de ${fixed(ttftMs, 0)} ms, ITL de ${fixed(itlMs, 2)} ms, ${integer(userTokensPerSecond)} tokens por segundo e ${fixed(endToEndMs / 1000, 2)} s para ${OUTPUT_TOKENS} tokens.`,
    },
    {
      id: "ceiling",
      shortTitle: "Teto",
      title: "O teto de velocidade é banda de memória dividida por bytes",
      tag: "mechanism",
      body: [
        `Como o decode relê todos os pesos a cada token, dá para prever o teto de velocidade de qualquer modelo com uma divisão: banda de memória ÷ bytes dos pesos. Em fp16 numa H100, um modelo de 1B chega a ${integer(ceilingOf("1B"))} tokens por segundo; um de 7B, a ${integer(ceilingOf("7B"))}; um de 34B, a ${integer(ceilingOf("34B"))}.`,
        `Um modelo de 70B não cabe numa GPU de 80 GB em fp16. Com [[tensor parallelism|tensor-parallelism]] em 2 GPUs, cada uma lê metade dos pesos ao mesmo tempo, e o teto fica em ${integer(ceilingOf("70B (2 GPUs)"))}: as bandas se somam. É por isso que quantizar os pesos, como na aula 10-09, acelera o decode quase na mesma proporção em que diminui os bytes.`,
      ],
      keyIdea: "Tokens por segundo de um usuário ≈ banda de memória ÷ bytes dos pesos: modelo 2 vezes maior, metade da velocidade.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "ceiling",
            piece: "chart",
            kind: "bar",
            series: ceilingSeries,
            highlight: sizes.findIndex((size) => size.label === "7B"),
            color: "module-10",
          },
        ],
      },
      alt: `Teto de tokens por segundo em fp16 numa H100, por tamanho de modelo: ${ceilingSeries.map((item) => `${item.label} ${integer(item.value)}`).join(", ")}.`,
    },
    {
      id: "compare",
      shortTitle: "Comparar",
      title: "Qual sistema é mais rápido? Depende do tamanho da resposta",
      tag: "example",
      body: [
        `Dois sistemas hipotéticos: o A tem TTFT de ${fixed(systemA.ttftS, 1)} s e gera ${systemA.tokensPerSecond} tokens por segundo; o B tem TTFT de ${fixed(systemB.ttftS, 1)} s e gera ${systemB.tokensPerSecond}. Para uma resposta de ${SHORT} tokens, o A termina em ${fixed(totalSeconds(systemA, SHORT), 2)} s e o B em ${fixed(totalSeconds(systemB, SHORT), 2)} s.`,
        `Para ${integer(LONG)} tokens, a ordem inverte: A em ${fixed(totalSeconds(systemA, LONG), 1)} s, B em ${fixed(totalSeconds(systemB, LONG), 1)} s. Autocompletar código e classificar textos dão respostas curtas e pedem TTFT baixo; gerar um relatório longo pede tokens por segundo altos. Um benchmark que mostra só um dos números não diz qual sistema serve para o seu caso.`,
      ],
      keyIdea: "Resposta curta: ganha quem começa antes. Resposta longa: ganha quem gera mais rápido.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "compare",
            piece: "chart",
            kind: "bar",
            series: comparison,
            highlight: 3,
            color: "module-10",
          },
        ],
      },
      alt: `Latência total em segundos: ${comparison.map((item) => `${item.label}: ${fixed(item.value, 2)} s`).join("; ")}.`,
    },
    {
      id: "aggregate",
      shortTitle: "Do servidor",
      title: "Tokens por segundo de quem? Do usuário ou do servidor",
      tag: "tradeoff",
      body: [
        `Agora com ${BATCH} usuários, cada um com ${integer(CONTEXT)} tokens no KV cache, gerando juntos na mesma passada. A GPU lê os pesos uma vez para todos, mais o cache de cada um. A passada passa de ${fixed(alone.ms, 2)} ms para ${fixed(shared.ms, 2)} ms: cada usuário cai de ${integer(alone.perUser)} para ${integer(shared.perUser)} tokens por segundo, mas o servidor sobe de ${integer(alone.total)} para ${integer(shared.total)}.`,
        `Os dois números são verdade, e confundir um com o outro é o erro mais comum ao ler um benchmark. O total do servidor é [[throughput|throughput]]; o de cada usuário é a experiência. Mesmo com ${BATCH} usuários, as contas ocupam só ${percent(shared.computeUse)} do tempo da passada: ainda há espaço, e a aula de [[batching|batching]] mostra até onde dá para ir.`,
      ],
      keyIdea: "Juntar usuários baixa a velocidade de cada um e multiplica a do servidor: sempre pergunte de qual dos dois é o número.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "serving",
            piece: "client-server",
            nodes: [
              { id: "web", label: "usuários web", role: "client" },
              { id: "mobile", label: "usuários app", role: "client" },
              { id: "queue", label: `${BATCH} em decode`, role: "queue", size: BATCH },
              { id: "gpu", label: "gpu: cálculo usado", role: "model", utilization: Number(shared.computeUse.toFixed(2)) },
            ],
            messages: [
              { from: "web", to: "queue", label: "pedidos" },
              { from: "mobile", to: "queue", label: "pedidos" },
              { from: "queue", to: "gpu", label: "uma passada para todos" },
              { from: "gpu", to: "mobile", label: `${integer(shared.perUser)} tokens/s cada` },
            ],
            active: 2,
          },
        ],
      },
      alt: `${BATCH} usuários dividem a mesma passada de decode: cada um recebe ${integer(shared.perUser)} tokens por segundo, o servidor entrega ${integer(shared.total)}, e o cálculo da GPU fica em ${percent(shared.computeUse)} de uso.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Cada métrica tem a sua fase",
      tag: "summary",
      body: [
        "TTFT vem da fila, da rede e do prefill; o ITL vem do decode; tokens por segundo de um usuário é 1 / ITL; e o total do servidor é a soma de todos os usuários. A latência de uma resposta junta tudo: TTFT + (n − 1) × ITL.",
        "A próxima aula sai de um pedido e olha para milhares: latência e throughput no servidor inteiro, filas, percentis e o preço de deixar a GPU cheia demais.",
      ],
      keyIdea: "Meça sempre os três: TTFT, ITL e tokens por segundo do servidor, sob a carga real.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "queue", kind: "queue", label: "fila + rede", col: 0, row: 0 },
              { id: "prefill", kind: "llm", label: "prefill → ttft", col: 1, row: 0 },
              { id: "decode", kind: "llm", label: "decode → itl", col: 2, row: 0 },
              { id: "answer", kind: "answer", label: "tokens/s", col: 3, row: 0 },
              { id: "eval", kind: "eval", label: "painel de métricas", col: 3, row: 1 },
            ],
            edges: [
              { from: "queue", to: "prefill" },
              { from: "prefill", to: "decode", label: "1º token" },
              { from: "decode", to: "answer", label: "1 / itl" },
              { from: "answer", to: "eval" },
            ],
            active: "eval",
            done: ["queue", "prefill", "decode", "answer"],
          },
        ],
      },
      alt: "Fila e rede, prefill que define o TTFT, decode que define o ITL e os tokens por segundo, todos alimentando o painel de métricas, em destaque.",
    },
  ],
  realWorldExample:
    "O guia de boas práticas de inferência publicado pela Databricks em 2023 define as mesmas métricas: time to first token, time per output token, latência = TTFT + TPOT × (tokens gerados − 1) e throughput em tokens por segundo do servidor. O mesmo guia mostra que, no decode, a velocidade acompanha a banda de memória da GPU, não o pico de TFLOPS.",
  code: {
    language: "python",
    source: `import time

def measure(stream):
    """Recebe um iterador de tokens em streaming e devolve TTFT, ITL e tokens/s."""
    start = time.perf_counter()
    stamps = [time.perf_counter() for _ in stream]
    ttft = stamps[0] - start
    itl = (stamps[-1] - stamps[0]) / max(len(stamps) - 1, 1)
    return {"ttft_s": ttft, "itl_s": itl, "tokens_per_s": 1 / itl if itl else None}`,
    caption: "Medindo do lado do cliente: o carimbo de tempo de cada token que chega dá o TTFT, o ITL médio e os tokens por segundo do usuário.",
  },
  tradeOffs: {
    pros: [
      "TTFT e ITL separam o problema: prefill lento ou decode lento",
      "O teto banda ÷ bytes prevê a velocidade antes de testar",
      "Medir do lado do cliente captura rede e fila, que o servidor não vê",
    ],
    cons: [
      "Médias escondem os pedidos lentos: é preciso olhar percentis",
      "Benchmarks raramente dizem se o número é por usuário ou do servidor",
      "Os números mudam com o tamanho do prompt, da resposta e com a carga",
    ],
    alternatives: ["Medir no servidor com as métricas do motor de inferência", "Testes de carga com o perfil real de prompts e respostas"],
  },
  knowledgeCheck: [
    {
      id: "autocomplete",
      prompt: "Um autocompletar de código gera uns 15 tokens por sugestão. Qual métrica importa mais na escolha do modelo e do servidor?",
      options: [
        "Tokens por segundo do servidor",
        "O TTFT, porque com respostas curtas quase todo o tempo é a espera pelo primeiro token",
        "O tamanho da janela de contexto",
        "Nenhuma: respostas curtas são sempre rápidas",
      ],
      correct: 1,
      explanation: "Com 15 tokens, o total é TTFT + 14 × ITL. Se o TTFT for de centenas de milissegundos, ele domina; ganhar velocidade no decode muda pouco.",
      lesson: "10-03",
    },
    {
      id: "benchmark-number",
      prompt: "Um fornecedor anuncia “5.000 tokens por segundo” para um modelo. O que você precisa perguntar antes de comparar?",
      options: [
        "Se o número é por usuário ou somado no servidor, e com quantos pedidos simultâneos",
        "Qual a cor da GPU",
        "Se o modelo usa temperatura 0",
        "Nada: tokens por segundo é sempre por usuário",
      ],
      correct: 0,
      explanation: "Com muitos pedidos na mesma passada, o servidor soma milhares de tokens por segundo enquanto cada usuário recebe bem menos. Sem a concorrência e o tamanho dos prompts, o número não se compara.",
      lesson: "10-03",
    },
  ],
  related: ["10-02", "10-04", "04-04"],
  references: [
    { title: "Databricks (2023), LLM Inference Performance Engineering: Best Practices", url: "https://www.databricks.com/blog/llm-inference-performance-engineering-best-practices", kind: "article" },
    { title: "NVIDIA H100 Tensor Core GPU", url: "https://www.nvidia.com/en-us/data-center/h100/", kind: "docs" },
    { title: "Touvron et al. (2023), Llama 2: Open Foundation and Fine-Tuned Chat Models", url: "https://arxiv.org/abs/2307.09288", kind: "paper" },
  ],
};

export default lesson;
