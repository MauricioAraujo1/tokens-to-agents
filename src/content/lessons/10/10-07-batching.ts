import type { BlockDiagramSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Batching no decode, com o teto teórico de uma H100 (página da NVIDIA): 80 GB, 3,35 TB/s de banda e cerca
// de 989 TFLOPS densos em BF16. Um passo de decode com B sequências lê os pesos uma vez e o KV cache de cada
// sequência: tempo = max((pesos + B · KV) / banda, 2 · N · B / pico). O modelo é um 7B em fp16 com o KV cache
// do Llama 2 7B (524.288 bytes por token) e contexto de 1.024 tokens por sequência. Depois, o desperdício do
// lote estático com 8 respostas de tamanhos diferentes.

const fixed = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const percent = (value: number) => `${Math.round(value * 100)}%`;

const GB = 1e9;
const BANDWIDTH = 3.35e12;
const PEAK_FLOPS = 989e12;
const RIDGE = PEAK_FLOPS / BANDWIDTH;
const H100_BYTES = 80 * GB;
const PARAMS = 7e9;
const WEIGHT_BYTES = PARAMS * 2;
const KV_PER_TOKEN = 2 * 32 * 32 * 128 * 2;
const CONTEXT = 1024;
const kvPerSequence = KV_PER_TOKEN * CONTEXT;
const maxBatch = Math.floor((H100_BYTES - WEIGHT_BYTES) / kvPerSequence);

const memoryMs = (batch: number) => ((WEIGHT_BYTES + batch * kvPerSequence) / BANDWIDTH) * 1000;
const computeMs = (batch: number) => ((2 * PARAMS * batch) / PEAK_FLOPS) * 1000;
const stepMs = (batch: number) => Math.max(memoryMs(batch), computeMs(batch));
const aggregate = (batch: number) => (batch / stepMs(batch)) * 1000;
const perUser = (batch: number) => 1000 / stepMs(batch);

const BATCHES = [1, 8, 16, 32, 64, 96];
const BIG = 32;
const throughputSeries = BATCHES.map((batch) => ({ label: `B = ${batch}`, value: Math.round(aggregate(batch)) }));
const perUserSeries = BATCHES.map((batch) => ({ label: `B = ${batch}`, value: Math.round(perUser(batch)) }));
const USER_TARGET = 100;
const largestWithinTarget = BATCHES.filter((batch) => perUser(batch) >= USER_TARGET).at(-1) ?? 1;
const gain = aggregate(BIG) / aggregate(1);
const slowdown = perUser(1) / perUser(BIG);

// Passo 5: lote estático com 8 respostas; o lote só termina com a mais longa.
const lengths = [20, 50, 200, 35, 80, 400, 60, 100];
const longest = Math.max(...lengths);
const usefulSlotSteps = lengths.reduce((total, length) => total + length, 0);
const reservedSlotSteps = lengths.length * longest;
const useful = usefulSlotSteps / reservedSlotSteps;
const finishedEarly = lengths.filter((length) => length <= longest / 4).length;

const serving = (active: string, done?: string[]): BlockDiagramSpec => ({
  id: "serving",
  piece: "block-diagram",
  blocks: [
    { id: "phones", kind: "phone", label: "pedidos", col: 0, row: 0.5 },
    { id: "queue", kind: "queue", label: "fila", col: 1, row: 0.5 },
    { id: "gpu", kind: "server", label: `lote de ${BIG}`, col: 2, row: 0.5 },
    { id: "weights", kind: "memory", label: "pesos: 1 leitura", col: 2, row: 1 },
    { id: "answers", kind: "answer", label: `${BIG} tokens`, col: 3, row: 0.5 },
  ],
  edges: [
    { from: "phones", to: "queue" },
    { from: "queue", to: "gpu", label: "junta" },
    { from: "weights", to: "gpu" },
    { from: "gpu", to: "answers", label: "por passo" },
  ],
  active,
  ...(done ? { done } : {}),
});

const lesson: LessonContent = {
  id: "10-07",
  subtitle: "Por que juntar pedidos na mesma passada do modelo multiplica os tokens por segundo do servidor, quanto cada usuário perde e onde o lote fechado desperdiça.",
  objectives: [
    "Explicar por que o decode aceita lotes quase de graça",
    "Calcular o tempo de um passo e os tokens por segundo em função do tamanho do lote",
    "Diferenciar a vazão do servidor da velocidade de cada usuário",
    "Medir o desperdício do lote estático com respostas de tamanhos diferentes",
  ],
  steps: [
    {
      id: "bus",
      shortTitle: "Ônibus",
      title: "A viagem custa o mesmo com 1 ou com 30",
      tag: "context",
      body: [
        "Um ônibus gasta quase o mesmo combustível levando uma pessoa ou trinta. O custo da viagem é mover o ônibus, não os passageiros. No [[decode|decode]], o “ônibus” são os pesos: cada passo lê os bilhões de pesos da memória para gerar um token, e essa leitura é a maior parte do tempo.",
        "[[Batching|batching]] é encher o ônibus: juntar vários pedidos na mesma passada do modelo. Os pesos são lidos uma vez e multiplicados pelos vetores de todas as sequências do lote. O servidor gera um token para cada uma no mesmo passo.",
      ],
      keyIdea: "No decode, ler os pesos é o custo fixo; cada pedido a mais no lote divide esse custo.",
      scene: { kind: "pieces", layout: "single", pieces: [serving("gpu")] },
      alt: `Pedidos entram numa fila e são juntados num lote de ${BIG} no servidor, em destaque; os pesos são lidos uma vez da memória e o servidor devolve ${BIG} tokens por passo.`,
    },
    {
      id: "step",
      shortTitle: "Um passo",
      title: "O tempo de um passo, em contas",
      tag: "mechanism",
      body: [
        `Num 7B em fp16, os pesos têm ${integer(WEIGHT_BYTES / GB)} GB. Cada sequência ainda lê o próprio [[KV cache|kv-cache]]: com ${integer(CONTEXT)} tokens de contexto, ${fixed(kvPerSequence / GB, 2)} GB. A conta de um passo é o maior entre ler tudo pela [[banda de memória|memory-bandwidth]] de 3,35 TB/s e fazer 2 · N · B FLOPs a 989 TFLOPS. Com B = 1, ler leva ${fixed(memoryMs(1), 2)} ms e calcular, ${fixed(computeMs(1), 3)} ms: o passo é [[memory-bound|memory-bound]].`,
        `Com B = ${BIG}, ler leva ${fixed(memoryMs(BIG), 2)} ms e calcular ${fixed(computeMs(BIG), 2)} ms. O passo ficou ${fixed(stepMs(BIG) / stepMs(1), 1)} vezes mais lento, mas gera ${BIG} tokens em vez de 1. Contando só os pesos, a [[intensidade aritmética|arithmetic-intensity]] do decode é de B FLOPs por byte; a H100 só vira [[compute-bound|compute-bound]] perto de ${integer(RIDGE)} FLOPs por byte. Na prática, a memória do KV cache acaba antes: aqui, cabem ${maxBatch} sequências.`,
      ],
      keyIdea: "Enquanto o passo é limitado pela memória, cada sequência a mais no lote sai quase de graça.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "step-metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "b1", label: "passo com B = 1", value: `${fixed(stepMs(1), 2)} ms` },
              { id: "big", label: `passo com B = ${BIG}`, value: `${fixed(stepMs(BIG), 2)} ms` },
              { id: "compute", label: `contas com B = ${BIG}`, value: `${fixed(computeMs(BIG), 2)} ms`, color: "success" },
              { id: "max", label: "lote máximo (memória)", value: String(maxBatch), color: "danger" },
            ],
            highlight: "big",
          },
        ],
      },
      alt: `Um passo de decode leva ${fixed(stepMs(1), 2)} ms com uma sequência e ${fixed(stepMs(BIG), 2)} ms com ${BIG}; as contas do lote de ${BIG} levam só ${fixed(computeMs(BIG), 2)} ms. A memória comporta no máximo ${maxBatch} sequências de ${integer(CONTEXT)} tokens.`,
    },
    {
      id: "curve",
      shortTitle: "Vazão",
      title: "O servidor gera muito mais tokens por segundo",
      tag: "example",
      body: [
        `Somando todos os usuários, os [[tokens por segundo|tokens-per-second]] do servidor são B divididos pelo tempo do passo. Com B = 1, o teto é de ${integer(aggregate(1))} tokens por segundo. Com B = ${BIG}, ${integer(aggregate(BIG))}: ${fixed(gain, 1)} vezes mais, com a mesma GPU.`,
        `A curva achata porque o KV cache de cada sequência também precisa ser lido: com B = ${BATCHES.at(-1)}, o cache pesa mais que os pesos, e o ganho de cada sequência extra cai. São tetos teóricos; motores reais ficam abaixo, mas a forma da curva é a mesma. Essa vazão, a [[throughput|throughput]], é o que paga a GPU.`,
      ],
      keyIdea: "A vazão do servidor cresce com o lote até a leitura do KV cache e a memória pararem a festa.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [{ id: "throughput", piece: "chart", kind: "line", series: throughputSeries, highlight: BATCHES.indexOf(BIG), color: "module-10" }],
      },
      alt: `Teto de tokens por segundo do servidor por tamanho de lote: ${throughputSeries.map((item) => `${item.label}, ${integer(item.value)}`).join("; ")}.`,
    },
    {
      id: "per-user",
      shortTitle: "Cada usuário",
      title: "Mas cada usuário fica mais lento",
      tag: "tradeoff",
      body: [
        `Para quem está lendo a resposta, a velocidade é um token por passo. Com B = 1, ${integer(perUser(1))} tokens por segundo; com B = ${BIG}, ${integer(perUser(BIG))}, ${fixed(slowdown, 1)} vezes mais devagar. É o ônibus que para em mais pontos: leva mais gente, mas cada um chega um pouco depois.`,
        `Escolher o lote é escolher esse ponto. Se o produto exige pelo menos ${USER_TARGET} tokens por segundo por usuário, o maior lote da cena que cumpre é B = ${largestWithinTarget}. Acima disso, a vazão sobe e a experiência de cada um piora. A [[latência|latency]] por token e a vazão puxam em direções opostas.`,
      ],
      keyIdea: "Lote maior: mais tokens por segundo no servidor, menos tokens por segundo para cada pessoa.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "per-user",
            piece: "chart",
            kind: "bar",
            series: perUserSeries,
            cutoff: { mode: "threshold", value: USER_TARGET, label: `${USER_TARGET} tokens/s` },
            highlight: BATCHES.indexOf(largestWithinTarget),
            color: "module-10",
          },
        ],
      },
      alt: `Tokens por segundo de cada usuário por tamanho de lote: ${perUserSeries.map((item) => `${item.label}, ${integer(item.value)}`).join("; ")}. Com a meta de ${USER_TARGET} por usuário, o maior lote que cumpre é B = ${largestWithinTarget}.`,
    },
    {
      id: "static",
      shortTitle: "Lote fechado",
      title: "O lote fechado espera a resposta mais longa",
      tag: "tradeoff",
      body: [
        `No [[static batching|static-batching]], o lote entra junto e só sai junto. Com ${lengths.length} respostas de ${lengths.join(", ")} tokens, o lote roda ${longest} passos, os da mais longa. Quem terminou cedo deixa a vaga ociosa: ${finishedEarly} respostas acabam em até um quarto do caminho, e as vagas ficam paradas o resto do tempo.`,
        `As ${lengths.length} vagas × ${longest} passos reservam ${integer(reservedSlotSteps)} vagas-passo, e só ${integer(usefulSlotSteps)} geram token: ${percent(useful)} de uso. E quem chega enquanto o lote roda espera na fila até ele acabar, o que soma ao [[time to first token|time-to-first-token]]. Esperar o lote encher para começar piora ainda mais a latência.`,
      ],
      keyIdea: "No lote fechado, a resposta mais longa dita o ritmo e as vagas livres ficam vazias.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "static-metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "steps", label: "passos do lote", value: String(longest) },
              { id: "useful", label: "vagas-passo úteis", value: `${integer(usefulSlotSteps)} de ${integer(reservedSlotSteps)}` },
              { id: "usage", label: "uso", value: percent(useful), color: "danger" },
            ],
            highlight: "usage",
          },
          {
            id: "queue",
            piece: "client-server",
            nodes: [
              { id: "clients", label: "novos pedidos", role: "client" },
              { id: "queue", label: "fila", role: "queue", size: lengths.length },
              { id: "gpu", label: "lote fechado", role: "model", utilization: useful },
            ],
            messages: [
              { from: "clients", to: "queue", label: "esperam o lote acabar" },
              { from: "queue", to: "gpu", label: `após ${longest} passos` },
            ],
            active: 0,
          },
        ],
      },
      alt: `Lote estático com respostas de ${lengths.join(", ")} tokens: ${longest} passos, ${integer(usefulSlotSteps)} de ${integer(reservedSlotSteps)} vagas-passo úteis, ${percent(useful)} de uso. Novos pedidos esperam na fila até o lote terminar.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Encher o ônibus, sem deixar lugar vazio",
      tag: "summary",
      body: [
        "O decode é limitado pela leitura dos pesos, e o batching divide essa leitura entre muitas sequências: a vazão do servidor multiplica, cada usuário perde um pouco de velocidade e a memória do KV cache define o lote máximo.",
        "O lote fechado desperdiça as vagas de quem termina cedo e faz os novos pedidos esperarem. A próxima aula resolve isso trocando quem está no lote a cada passo: o continuous batching.",
      ],
      keyIdea: "Batching troca um pouco de velocidade por usuário por muito mais vazão por GPU.",
      scene: { kind: "pieces", layout: "single", pieces: [serving("answers", ["phones", "queue", "gpu", "weights"])] },
      alt: `Fluxo completo: pedidos na fila, um lote de ${BIG} no servidor com os pesos lidos uma vez, e ${BIG} tokens por passo, em destaque.`,
    },
  ],
  realWorldExample:
    "No vLLM, dois parâmetros controlam o lote: max_num_seqs limita quantas sequências entram num mesmo passo e max_num_batched_tokens limita os tokens processados por passo. Subir os dois aumenta a vazão até a memória do KV cache acabar; o servidor então segura pedidos na fila ou tira alguns da GPU. Os benchmarks de motores de inferência sempre informam o tamanho do lote, porque tokens por segundo sem esse número não dizem nada.",
  code: {
    language: "python",
    source: `WEIGHTS = 7e9 * 2            # 7B em fp16, bytes
KV_SEQ = 524_288 * 1024       # KV cache de 1.024 tokens (Llama 2 7B)
BANDWIDTH, PEAK = 3.35e12, 989e12

def step_ms(batch):
    memory = (WEIGHTS + batch * KV_SEQ) / BANDWIDTH
    compute = 2 * 7e9 * batch / PEAK
    return max(memory, compute) * 1000

for b in [1, 8, 16, 32, 64, 96]:
    ms = step_ms(b)
    print(b, round(ms, 2), "ms", round(b / ms * 1000), "tok/s total", round(1000 / ms), "por usuário")`,
    caption: "O teto do decode por tamanho de lote: tempo do passo, tokens por segundo do servidor e de cada usuário.",
  },
  tradeOffs: {
    pros: [
      "Multiplica os tokens por segundo da GPU com quase nenhum custo extra de conta",
      "Baixa o custo por token, porque a mesma hora de GPU atende mais gente",
      "Aproveita o hardware que, com um pedido só, fica esperando a memória",
    ],
    cons: [
      "Cada usuário recebe tokens mais devagar quando o lote cresce",
      "O KV cache de cada sequência limita o tamanho do lote",
      "No lote estático, as vagas de quem termina cedo ficam ociosas e a fila espera",
    ],
    alternatives: [
      "Continuous batching, que troca as sequências a cada passo",
      "Batch API dos provedores, para tarefas sem pressa com desconto",
      "Modelos menores ou quantizados, que leem menos bytes por passo",
    ],
  },
  knowledgeCheck: [
    {
      id: "almost-free",
      prompt: "Passar o lote de 1 para 8 sequências quase multiplica por 6 os tokens por segundo da GPU, e cada usuário perde pouco. Por quê?",
      options: [
        "Porque o modelo fica mais inteligente com mais pedidos",
        "Porque o decode é limitado pela leitura dos pesos, e uma leitura serve às 8 sequências",
        "Porque o lote reduz o tamanho do KV cache",
        "Porque a GPU desliga núcleos com lote pequeno",
      ],
      correct: 1,
      explanation: "Com uma sequência, a GPU passa quase todo o passo lendo pesos. Com 8, lê os mesmos pesos uma vez e faz 8 vezes mais contas, que cabiam na folga.",
      lesson: "10-07",
    },
    {
      id: "long-answer",
      prompt: "Num lote estático, sete respostas têm cerca de 50 tokens e uma tem 400. O que acontece?",
      options: [
        "As sete curtas saem antes e novos pedidos ocupam as vagas",
        "O lote roda os 400 passos; as sete vagas ficam ociosas a maior parte do tempo e a fila espera",
        "A resposta longa é cortada em 50 tokens",
        "O lote fica mais rápido porque a maioria é curta",
      ],
      correct: 1,
      explanation: "No lote fechado, quem termina não libera a vaga para ninguém. O uso despenca e os pedidos novos esperam o mais longo acabar; é o problema que o continuous batching resolve.",
      lesson: "10-07",
    },
  ],
  related: ["10-06", "10-08", "02-10"],
  references: [
    { title: "NVIDIA H100 Tensor Core GPU", url: "https://www.nvidia.com/en-us/data-center/h100/", kind: "docs" },
    { title: "Databricks (2023), LLM Inference Performance Engineering: Best Practices", url: "https://www.databricks.com/blog/llm-inference-performance-engineering-best-practices", kind: "article" },
    { title: "vLLM: documentação", url: "https://docs.vllm.ai/", kind: "docs" },
  ],
};

export default lesson;
