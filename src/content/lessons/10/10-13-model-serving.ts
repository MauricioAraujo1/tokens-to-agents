import type { BlockDiagramSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Servir um modelo, com as contas no arquivo: o ciclo de vida de um pedido, o streaming com TTFT e
// tempo entre tokens, o dimensionamento de réplicas a partir de uma vazão medida (hipótese rotulada)
// e da Little's Law, o KV cache por réplica do Llama 2 7B e o cold start = bytes dos pesos / velocidade
// de leitura (hipótese rotulada). A fila que cresce num pico sai de chegada − capacidade.

const fixed = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const percent = (value: number) => `${Math.round(value * 100)}%`;
const GB = 1e9;

// Passo 3: streaming. TTFT e tempo entre tokens são hipóteses de um servidor carregado.
const TTFT_S = 0.3;
const TPOT_S = 0.025;
const OUTPUT_TOKENS = 400;
const totalSeconds = TTFT_S + (OUTPUT_TOKENS - 1) * TPOT_S;
const answer = ["O", " KV", " cache", " guarda", " as", " keys", " e", " values"];
const arrivals = answer.map((_, index) => TTFT_S + index * TPOT_S);
const arrivalBars = arrivals.map((time) => time / arrivals[arrivals.length - 1]);

// Passo 4: capacidade. A vazão por réplica é uma hipótese: o que um teste de carga mediu dentro da meta de latência.
const ARRIVAL_RATE = 10;
const MEASURED_TOKENS_PER_S = 2000;
const TARGET_UTILIZATION = 0.7;
const demandTokensPerS = ARRIVAL_RATE * OUTPUT_TOKENS;
const replicas = Math.ceil(demandTokensPerS / (MEASURED_TOKENS_PER_S * TARGET_UTILIZATION));
const inFlight = ARRIVAL_RATE * totalSeconds;
const inFlightPerReplica = Math.ceil(inFlight / replicas);

// KV cache do Llama 2 7B em fp16: 2 × 32 camadas × 32 cabeças × 128 dimensões × 2 bytes por token.
const KV_BYTES_PER_TOKEN = 2 * 32 * 32 * 128 * 2;
const PROMPT_TOKENS = 1000;
const kvPerRequestGB = ((PROMPT_TOKENS + OUTPUT_TOKENS) * KV_BYTES_PER_TOKEN) / GB;
const kvPerReplicaGB = inFlightPerReplica * kvPerRequestGB;
const H100_GB = 80;
const WEIGHTS_GB = (7e9 * 2) / GB;
const freeForKvGB = H100_GB - WEIGHTS_GB;

// Passo 5: pico de tráfego e cold start. Velocidades de leitura e tempo de subida são hipóteses.
const SPIKE_RATE = 20;
const capacityPerReplica = MEASURED_TOKENS_PER_S / OUTPUT_TOKENS;
const totalCapacity = replicas * capacityPerReplica;
const queueGrowth = SPIKE_RATE - totalCapacity;
const LOCAL_DISK_GBPS = 2;
const OBJECT_STORAGE_GBPS = 0.5;
const ENGINE_BOOT_S = 30;
const loadLocal = WEIGHTS_GB / LOCAL_DISK_GBPS;
const loadRemote = WEIGHTS_GB / OBJECT_STORAGE_GBPS;
const coldStartLocal = ENGINE_BOOT_S + loadLocal;
const queuedDuringColdStart = queueGrowth * coldStartLocal;
const QUEUE_PER_REPLICA_TARGET = 20;

const stack = (active: string, done?: string[]): BlockDiagramSpec => ({
  id: "stack",
  piece: "block-diagram",
  blocks: [
    { id: "phone", kind: "phone", label: "app", col: 0, row: 0.5 },
    { id: "gateway", kind: "guardrail", label: "gateway", col: 1, row: 0.5 },
    { id: "queue", kind: "queue", label: "fila", col: 2, row: 0.5 },
    { id: "replica-a", kind: "server", label: "réplica 1", col: 3, row: 0 },
    { id: "replica-b", kind: "server", label: `réplica ${replicas}`, col: 3, row: 1 },
  ],
  edges: [
    { from: "phone", to: "gateway", label: "POST /chat" },
    { from: "gateway", to: "queue", label: "pedido válido" },
    { from: "queue", to: "replica-a" },
    { from: "queue", to: "replica-b" },
  ],
  active,
  ...(done ? { done } : {}),
});

const lesson: LessonContent = {
  id: "10-13",
  subtitle: "Tudo o que fica em volta do modelo para ele virar um serviço: gateway, fila, réplicas, streaming, dimensionamento e subida de máquinas.",
  objectives: [
    "Descrever o caminho de um pedido do app até a GPU e de volta",
    "Explicar por que o streaming muda a espera percebida sem mudar o tempo total",
    "Dimensionar réplicas com a vazão medida e a Little's Law",
    "Escalar pelo tamanho da fila e levar o cold start em conta",
  ],
  steps: [
    {
      id: "kitchen",
      shortTitle: "A cozinha",
      title: "O modelo é o chef, o serving é a cozinha",
      tag: "context",
      body: [
        "Um ótimo chef não faz um restaurante sozinho. Alguém recebe os pedidos, confere se a mesa pagou, organiza a fila da cozinha, divide o trabalho entre os fogões e leva os pratos à mesa. Com um LLM é igual: os pesos sabem gerar texto, mas alguém precisa receber milhares de pedidos por minuto e devolver cada resposta.",
        "[[Model serving|model-serving]] é essa cozinha. Um gateway autentica, aplica limites de uso e valida o pedido. Uma fila segura os pedidos quando as GPUs estão ocupadas. Várias réplicas, cada uma com um [[motor de inferência|inference-engine]] como o [[vLLM|vllm]] e o modelo carregado na GPU, executam e devolvem os tokens.",
      ],
      keyIdea: "Servir um modelo é um problema de sistema distribuído: fila, réplicas, limites e monitoração em volta da GPU.",
      scene: { kind: "pieces", layout: "single", pieces: [stack("gateway")] },
      alt: `O app manda POST /chat ao gateway, em destaque, que passa o pedido válido para uma fila; a fila distribui entre ${replicas} réplicas com GPU.`,
    },
    {
      id: "lifecycle",
      shortTitle: "Ciclo",
      title: "A vida de um pedido",
      tag: "mechanism",
      body: [
        "Pense numa encomenda pelo correio: postagem, triagem, transporte, entrega e o recibo. O pedido ao modelo passa por etapas parecidas, e cada uma pode atrasar ou falhar: sem autenticação, ele para no gateway; com um prompt maior que a janela, para na validação.",
        "Dentro da réplica, o motor tokeniza o texto, espera uma vaga no lote do escalonador, faz o prefill do prompt e entra no decode, um token por passo. Cada token sai em streaming assim que é gerado. No fim, o servidor registra tokens de entrada e saída, tempo até o primeiro token e tempo total: é com esses registros que você mede custo e latência.",
      ],
      keyIdea: "Cada etapa do caminho é um ponto de medida: sem saber onde o tempo foi, não dá para otimizar.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "lifecycle",
            piece: "pipeline",
            stages: [
              { id: "auth", label: "autenticar" },
              { id: "validate", label: "validar" },
              { id: "tokenize", label: "tokenizar" },
              { id: "schedule", label: "fila e lote", color: "module-10" },
              { id: "prefill", label: "prefill" },
              { id: "decode", label: "decode" },
              { id: "stream", label: "streaming" },
              { id: "log", label: "registrar" },
            ],
            active: "schedule",
            done: ["auth", "validate", "tokenize"],
            branch: { id: "reject", label: "429 / 400", from: "validate", edgeLabel: "limite ou erro", color: "danger" },
          },
        ],
      },
      alt: "Pipeline do pedido: autenticar, validar, tokenizar, fila e lote (em destaque), prefill, decode, streaming e registrar. Um ramo tracejado sai da validação para a resposta de erro 429 ou 400.",
    },
    {
      id: "streaming",
      shortTitle: "Streaming",
      title: "Streaming: a resposta começa antes de terminar",
      tag: "mechanism",
      body: [
        `Numa conversa, você não espera a pessoa pensar a frase inteira em silêncio: ela começa a falar e vai completando. Com [[token streaming|token-streaming]], o servidor manda cada token assim que o decode o produz. Com ${fixed(TTFT_S)} s de [[TTFT|time-to-first-token]] e ${integer(TPOT_S * 1000)} ms entre tokens, uma resposta de ${OUTPUT_TOKENS} tokens termina em ${fixed(totalSeconds)} s, mas a primeira palavra aparece em ${fixed(TTFT_S)} s.`,
        `Sem streaming, a tela fica parada os ${fixed(totalSeconds)} s inteiros. O tempo total é o mesmo: o streaming muda a espera percebida, não o trabalho. Na prática, as APIs no formato da OpenAI usam server-sent events numa conexão HTTP aberta, e o servidor precisa de timeouts longos e de parar a geração quando o cliente desconecta, senão a GPU continua gastando tokens para ninguém.`,
      ],
      keyIdea: "Streaming troca uma espera longa por uma resposta que começa logo; o custo e o tempo total não mudam.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "stream-metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "ttft", label: "primeiro token", value: `${fixed(TTFT_S)} s`, color: "success" },
              { id: "tpot", label: "entre tokens", value: `${integer(TPOT_S * 1000)} ms` },
              { id: "total", label: `${OUTPUT_TOKENS} tokens`, value: `${fixed(totalSeconds)} s` },
            ],
            highlight: "ttft",
          },
          {
            id: "tokens",
            piece: "token-stream",
            tokens: answer,
            bars: arrivalBars,
            color: "module-10",
          },
        ],
      },
      alt: `Os primeiros tokens da resposta chegam um a um, com barras crescendo pelo instante de chegada. Painel: primeiro token em ${fixed(TTFT_S)} s, ${integer(TPOT_S * 1000)} ms entre tokens e ${fixed(totalSeconds)} s para ${OUTPUT_TOKENS} tokens.`,
    },
    {
      id: "capacity",
      shortTitle: "Capacidade",
      title: "Quantas réplicas: vazão medida e Little's Law",
      tag: "example",
      body: [
        `O app recebe ${ARRIVAL_RATE} pedidos por segundo, cada um com ${OUTPUT_TOKENS} tokens de saída: são ${integer(demandTokensPerS)} tokens por segundo de demanda. Suponha que um teste de carga mediu ${integer(MEASURED_TOKENS_PER_S)} tokens por segundo por réplica dentro da meta de latência (hipótese do exemplo, meça no seu hardware). Para trabalhar a ${percent(TARGET_UTILIZATION)} de utilização, longe do ponto em que a fila explode, são ${replicas} réplicas.`,
        `A [[Little's Law|littles-law]] dá a concorrência: pedidos no sistema = ${ARRIVAL_RATE} por segundo × ${fixed(totalSeconds)} s = ${integer(inFlight)} pedidos ao mesmo tempo, cerca de ${inFlightPerReplica} por réplica. Com ${integer(PROMPT_TOKENS)} tokens de prompt, cada pedido ocupa ${fixed(kvPerRequestGB, 2)} GB de [[KV cache|kv-cache]] no Llama 2 7B, e ${inFlightPerReplica} pedidos ocupam ${fixed(kvPerReplicaGB)} GB: cabe nos ${integer(freeForKvGB)} GB que sobram numa H100 de ${H100_GB} GB depois dos pesos.`,
      ],
      keyIdea: "Dimensione pela vazão medida com folga e confira a concorrência da Little's Law contra a memória do KV cache.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "capacity",
            piece: "metrics-panel",
            metrics: [
              { id: "demand", label: "demanda", value: `${integer(demandTokensPerS)} tokens/s` },
              { id: "replica", label: "por réplica (medido)", value: `${integer(MEASURED_TOKENS_PER_S)} tokens/s` },
              { id: "replicas", label: `réplicas a ${percent(TARGET_UTILIZATION)}`, value: String(replicas), color: "module-10" },
              { id: "inflight", label: "em voo (L = λ · W)", value: integer(inFlight) },
              { id: "kv", label: "KV por réplica", value: `${fixed(kvPerReplicaGB)} GB`, color: "success" },
            ],
            highlight: "replicas",
          },
        ],
      },
      alt: `Painel de capacidade: demanda de ${integer(demandTokensPerS)} tokens por segundo, ${integer(MEASURED_TOKENS_PER_S)} medidos por réplica, ${replicas} réplicas a ${percent(TARGET_UTILIZATION)} de utilização, ${integer(inFlight)} pedidos em voo e ${fixed(kvPerReplicaGB)} GB de KV cache por réplica.`,
    },
    {
      id: "scaling",
      shortTitle: "Escalar",
      title: "Pico de tráfego e cold start",
      tag: "tradeoff",
      body: [
        `Às 9 h da segunda-feira a chegada dobra para ${SPIKE_RATE} pedidos por segundo. As ${replicas} réplicas aguentam ${integer(totalCapacity)} no máximo, e a fila cresce ${integer(queueGrowth)} pedidos por segundo. O [[autoscaling|autoscaling]] precisa reagir, e o sinal certo é a fila (pedidos esperando por réplica) ou o tempo até o primeiro token, não a CPU: a CPU da máquina fica quase parada enquanto a GPU está no limite.`,
        `Só que réplica nova não nasce pronta. O [[cold start|cold-start]] inclui subir o motor (${ENGINE_BOOT_S} s neste exemplo) e carregar ${integer(WEIGHTS_GB)} GB de pesos: ${integer(loadLocal)} s a ${LOCAL_DISK_GBPS} GB/s de um disco local, ${integer(loadRemote)} s a ${fixed(OBJECT_STORAGE_GBPS)} GB/s de um armazenamento de objetos (velocidades de exemplo). Nos ${integer(coldStartLocal)} s, a fila acumula ${integer(queuedDuringColdStart)} pedidos. Por isso se escala antes do limite, com um alvo como ${QUEUE_PER_REPLICA_TARGET} pedidos na fila por réplica, e se mantém uma réplica de folga aquecida.`,
      ],
      keyIdea: "Escale pela fila, não pela CPU, e comece cedo: uma réplica nova leva dezenas de segundos para servir.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "spike",
            piece: "client-server",
            nodes: [
              { id: "users", label: `${SPIKE_RATE} pedidos/s`, role: "client" },
              { id: "queue", label: "fila", role: "queue", size: Math.round(queuedDuringColdStart) },
              { id: "replicas", label: `${replicas} réplicas`, role: "model", utilization: 1 },
              { id: "new", label: "réplica nova", role: "server", utilization: 0 },
            ],
            messages: [
              { from: "users", to: "queue", label: `+${integer(queueGrowth)} por segundo` },
              { from: "queue", to: "replicas", label: `${integer(totalCapacity)} por segundo` },
              { from: "queue", to: "new", label: `pronta em ${integer(coldStartLocal)} s` },
            ],
            active: 0,
          },
        ],
      },
      alt: `No pico de ${SPIKE_RATE} pedidos por segundo, as ${replicas} réplicas ficam em 100% e atendem ${integer(totalCapacity)} por segundo; a fila chega a ${integer(queuedDuringColdStart)} pedidos enquanto a réplica nova, vazia, leva ${integer(coldStartLocal)} s para ficar pronta.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Uma cozinha que cresce com a demanda",
      tag: "summary",
      body: [
        "Servir um modelo é montar o caminho inteiro: gateway com autenticação e limites, fila, réplicas com um motor de inferência, streaming dos tokens e registros de cada pedido. O dimensionamento sai de uma vazão medida, com folga, e da Little's Law conferida contra a memória do KV cache.",
        "O autoscaler olha a fila e começa cedo, porque cada réplica nova paga o cold start. Com o serviço de pé, a próxima pergunta é quanto ele custa: a próxima aula transforma GPUs, tokens e preços em uma conta por pedido.",
      ],
      keyIdea: "Serving = caminho do pedido + capacidade medida + escala pela fila.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "stack",
            piece: "block-diagram",
            blocks: [
              { id: "phone", kind: "phone", label: "app", col: 0, row: 0.5 },
              { id: "gateway", kind: "guardrail", label: "gateway", col: 1, row: 0.5 },
              { id: "queue", kind: "queue", label: "fila", col: 2, row: 0 },
              { id: "scaler", kind: "eval", label: "autoscaler", col: 2, row: 1 },
              { id: "replica-a", kind: "server", label: "réplica 1", col: 3, row: 0 },
              { id: "replica-b", kind: "server", label: "réplica nova", col: 3, row: 1 },
            ],
            edges: [
              { from: "phone", to: "gateway" },
              { from: "gateway", to: "queue" },
              { from: "queue", to: "replica-a" },
              { from: "queue", to: "scaler", label: "tamanho" },
              { from: "scaler", to: "replica-b", label: "fila > alvo" },
            ],
            active: "replica-b",
            done: ["phone", "gateway", "queue", "scaler", "replica-a"],
          },
        ],
      },
      alt: "O app passa pelo gateway e pela fila até as réplicas; um autoscaler observa a fila e liga a réplica nova, em destaque, quando ela passa do alvo.",
    },
  ],
  realWorldExample:
    "O vLLM traz um servidor HTTP compatível com a API da OpenAI: um app escrito com o SDK da OpenAI passa a falar com o modelo próprio só trocando a base_url. O Text Generation Inference (TGI), da Hugging Face, e o Triton Inference Server, da NVIDIA, são outros servidores de código aberto que fazem o mesmo papel, com fila, lotes, streaming e métricas no formato do Prometheus para alimentar o autoscaler.",
  code: {
    language: "python",
    source: `from openai import OpenAI

client = OpenAI(base_url="http://localhost:8000/v1", api_key="EMPTY")
stream = client.chat.completions.create(
    model="meta-llama/Llama-2-7b-chat-hf",
    messages=[{"role": "user", "content": "O que é KV cache?"}],
    max_tokens=400,
    stream=True,
)
for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="", flush=True)`,
    caption: "Streaming de um servidor vLLM local pela API no formato da OpenAI: cada chunk traz o pedaço novo da resposta.",
  },
  tradeOffs: {
    pros: [
      "Fila e lotes deixam a GPU ocupada sem perder pedidos nos picos",
      "Streaming faz a resposta começar em décimos de segundo",
      "Réplicas independentes escalam com a demanda e isolam falhas",
    ],
    cons: [
      "Cold start de dezenas de segundos obriga a manter folga paga",
      "Conexões abertas de streaming exigem timeouts e cancelamento bem feitos",
      "Dimensionar exige teste de carga no seu hardware e no seu tráfego, não números de fabricante",
    ],
    alternatives: [
      "API gerenciada de um provedor, quando o volume não paga uma equipe de operação",
      "Serverless com GPU, para tráfego esporádico que tolera cold start",
    ],
  },
  knowledgeCheck: [
    {
      id: "scale-signal",
      prompt: "O autoscaler das réplicas de LLM usa a CPU da máquina como sinal, e os usuários reclamam de lentidão sem nenhuma réplica nova subir. Por quê?",
      options: [
        "A CPU sobe demais e o autoscaler trava",
        "O gargalo é a GPU; a CPU fica baixa mesmo com a fila crescendo. O sinal certo é a fila por réplica ou o TTFT",
        "Autoscaling não funciona com LLMs",
        "Falta streaming nas respostas",
      ],
      correct: 1,
      explanation: "Quem trabalha é a GPU. A CPU quase não muda com a carga, então o sinal nunca dispara. Fila por réplica e tempo até o primeiro token medem a saturação de verdade.",
      lesson: "10-13",
    },
    {
      id: "littles-law-sizing",
      prompt: "Chegam 5 pedidos por segundo e cada um leva, em média, 8 s do envio ao último token. Quantos pedidos ficam em andamento ao mesmo tempo?",
      options: ["5", "13", "40", "8"],
      correct: 2,
      explanation: "Pela Little's Law, L = λ · W = 5 × 8 = 40 pedidos simultâneos. É esse número que precisa caber nos lotes e no KV cache das réplicas.",
      lesson: "10-13",
    },
  ],
  related: ["10-12", "10-14", "17-06"],
  references: [
    { title: "vLLM: documentação", url: "https://docs.vllm.ai/", kind: "docs" },
    { title: "Hugging Face: Text Generation Inference", url: "https://huggingface.co/docs/text-generation-inference/index", kind: "docs" },
    {
      title: "NVIDIA Triton Inference Server: documentação",
      url: "https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/index.html",
      kind: "docs",
    },
  ],
};

export default lesson;
