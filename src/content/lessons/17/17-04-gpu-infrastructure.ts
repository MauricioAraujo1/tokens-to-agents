import type { BlockDiagramSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Infraestrutura de GPU com as contas no arquivo. Especificações da NVIDIA (páginas do H100, A100 e L4):
// H100 SXM com 80 GB de HBM3 a 3,35 TB/s, NVLink de 900 GB/s e PCIe Gen5 de 128 GB/s; A100 80 GB SXM a
// 2.039 GB/s; L4 com 24 GB a 300 GB/s; InfiniBand NDR a 400 Gb/s por porta (50 GB/s). O tráfego do tensor
// parallelism segue o Megatron-LM (2 all-reduces por camada); a conta é de ordem de grandeza, sem o fator
// do ring e sem a latência de cada mensagem. A vazão por réplica é uma hipótese rotulada.

const fixed = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const percent = (value: number) => `${Math.round(value * 100)}%`;
const GB = 1e9;
const MB = 1e6;

// Passo 2: largura de banda de cada caminho, em GB/s.
const H100_HBM = 3350;
const NVLINK = 900;
const PCIE_GEN5 = 128;
const INFINIBAND_NDR = 400 / 8;
const links = [
  { label: "hbm (h100)", value: H100_HBM },
  { label: "nvlink", value: NVLINK },
  { label: "pcie gen5", value: PCIE_GEN5 },
  { label: "infiniband ndr", value: INFINIBAND_NDR },
];
const nvlinkOverIb = NVLINK / INFINIBAND_NDR;

// Teto do decode de uma sequência: banda da memória ÷ bytes dos pesos (8B em bf16).
const SMALL_WEIGHTS_GB = 16;
const gpus = [
  { name: "H100", memoryGB: 80, bandwidth: H100_HBM },
  { name: "A100", memoryGB: 80, bandwidth: 2039 },
  { name: "L4", memoryGB: 24, bandwidth: 300 },
];
const decodeCeiling = gpus.map((gpu) => ({ ...gpu, tokensPerS: gpu.bandwidth / SMALL_WEIGHTS_GB }));

// Passo 3: tensor parallelism de um 70B (hidden 8.192, 80 camadas) em 8 GPUs, num passo de decode com 64 sequências.
const HIDDEN = 8192;
const LAYERS = 80;
const BATCH = 64;
const BYTES = 2;
const TP = 8;
const LARGE_WEIGHTS_GB = 140;
const trafficMB = (BATCH * HIDDEN * BYTES * 2 * LAYERS) / MB;
const commMs = (bandwidth: number) => (trafficMB * MB) / (bandwidth * GB) * 1000;
const stepMs = ((LARGE_WEIGHTS_GB / TP) * GB) / (H100_HBM * GB) * 1000;
const nvlinkShare = commMs(NVLINK) / stepMs;
const ibShare = commMs(INFINIBAND_NDR) / stepMs;

// Passo 4: quantas GPUs para uma meta de pedidos por segundo. Vazão por réplica de TP = 4 é hipótese medida.
const TARGET_QPS = 30;
const OUTPUT_TOKENS = 400;
const REPLICA_TP = 4;
const REPLICA_TOKENS_PER_S = 3000;
const TARGET_UTILIZATION = 0.7;
const GPUS_PER_NODE = 8;
const demand = TARGET_QPS * OUTPUT_TOKENS;
const replicas = Math.ceil(demand / (REPLICA_TOKENS_PER_S * TARGET_UTILIZATION));
const replicasWithSpare = replicas + 1;
const gpusNeeded = replicasWithSpare * REPLICA_TP;
const replicasPerNode = GPUS_PER_NODE / REPLICA_TP;
const nodes = Math.ceil(replicasWithSpare / replicasPerNode);
const idleGpus = nodes * GPUS_PER_NODE - gpusNeeded;

const node = (active: string, done?: string[]): BlockDiagramSpec => ({
  id: "node",
  piece: "block-diagram",
  blocks: [
    { id: "cpu", kind: "server", label: "cpu + disco", col: 0, row: 0.5 },
    { id: "gpu-a", kind: "memory", label: "gpus 0-3", col: 1, row: 0 },
    { id: "gpu-b", kind: "memory", label: "gpus 4-7", col: 1, row: 1 },
    { id: "nvswitch", kind: "queue", label: "nvlink", col: 2, row: 0.5 },
    { id: "other", kind: "server", label: "outro nó", col: 3, row: 0.5 },
  ],
  edges: [
    { from: "cpu", to: "gpu-a", label: "pcie" },
    { from: "cpu", to: "gpu-b", label: "pcie" },
    { from: "gpu-a", to: "nvswitch" },
    { from: "gpu-b", to: "nvswitch" },
    { from: "nvswitch", to: "other", label: "infiniband" },
  ],
  active,
  ...(done ? { done } : {}),
});

const lesson: LessonContent = {
  id: "17-04",
  subtitle: "O que há dentro de uma instância de GPU, por que memória e interconexão decidem o desempenho e como chegar ao número de GPUs para uma meta de tráfego.",
  objectives: [
    "Descrever uma instância de GPU: memória HBM, NVLink, PCIe e rede entre nós",
    "Comparar GPUs pela memória e pela banda, não só pelos FLOPS",
    "Explicar por que o tensor parallelism fica dentro de um nó",
    "Calcular GPUs e nós para uma meta de pedidos por segundo",
  ],
  steps: [
    {
      id: "instance",
      shortTitle: "A máquina",
      title: "Uma instância de GPU é uma cidade com estradas",
      tag: "context",
      body: [
        "Pense numa cidade: cada bairro tem ruas internas rápidas, avenidas ligam os bairros e uma estrada liga a cidade às outras. Numa [[instância de GPU|gpu-instance]] grande, cada GPU tem a sua memória [[HBM|hbm]], muito rápida; as GPUs do mesmo servidor conversam por [[NVLink|nvlink]]; a CPU e o disco falam com elas por [[PCIe|pcie]]; e servidores diferentes se ligam por rede, como [[InfiniBand|infiniband]].",
        `Os servidores de topo para IA, como o DGX H100 da NVIDIA, têm 8 [[GPUs|gpu]] ligadas por NVLink e NVSwitch. Cada H100 SXM tem 80 GB de HBM3. Quem roda o modelo é a GPU, mas o tempo de carregar pesos e de trocar dados entre GPUs depende das estradas, e cada uma é bem mais lenta que a anterior.`,
      ],
      keyIdea: "Uma instância de GPU é memória rápida dentro de cada GPU, NVLink entre GPUs do nó e rede mais lenta entre nós.",
      scene: { kind: "pieces", layout: "single", pieces: [node("nvswitch")] },
      alt: "Um nó com CPU e disco ligados por PCIe a dois grupos de quatro GPUs, que conversam pelo NVLink, em destaque; o NVLink sai por InfiniBand para outro nó.",
    },
    {
      id: "bandwidth",
      shortTitle: "Banda",
      title: "Cada estrada é muito mais estreita que a anterior",
      tag: "mechanism",
      body: [
        `Pelas especificações da NVIDIA, a HBM3 da H100 SXM entrega ${fixed(H100_HBM / 1000, 2)} TB/s, o NVLink ${integer(NVLINK)} GB/s e o PCIe Gen5 ${PCIE_GEN5} GB/s. Uma porta InfiniBand NDR faz 400 Gb/s, ou ${integer(INFINIBAND_NDR)} GB/s: o NVLink é ${integer(nvlinkOverIb)} vezes mais largo que a rede entre nós.`,
        `A banda da memória também decide qual GPU serve qual modelo. No decode, cada token relê todos os pesos ([[memory-bound|memory-bound]]), então o teto de uma sequência é banda ÷ bytes dos pesos. Para um modelo de 8B em bf16 (${SMALL_WEIGHTS_GB} GB): ${decodeCeiling.map((gpu) => `${gpu.name} ${integer(gpu.tokensPerS)} tokens/s`).join(", ")}. A L4, com ${decodeCeiling[2].memoryGB} GB, é barata e serve modelos pequenos; a H100 vale pelos modelos grandes e pelo lote.`,
      ],
      keyIdea: "Escolha GPU por memória e banda: são elas que limitam o decode, não os FLOPS do catálogo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "links",
            piece: "chart",
            kind: "bar",
            series: links,
            highlight: 1,
            color: "module-17",
          },
        ],
      },
      alt: `Banda de cada caminho, em GB/s: ${links.map((link) => `${link.label} ${integer(link.value)}`).join(", ")}. O NVLink, em destaque, é ${integer(nvlinkOverIb)} vezes mais largo que a InfiniBand NDR.`,
    },
    {
      id: "tensor-parallel",
      shortTitle: "TP no nó",
      title: "Por que o tensor parallelism mora dentro de um nó",
      tag: "mechanism",
      body: [
        `Um modelo de 70B em bf16 (${LARGE_WEIGHTS_GB} GB) dividido por [[tensor parallelism|tensor-parallelism]] em ${TP} GPUs troca resultados parciais duas vezes por camada (o esquema do Megatron-LM). Num passo de decode com ${BATCH} sequências, hidden de ${integer(HIDDEN)} e ${LAYERS} camadas, são cerca de ${integer(trafficMB)} MB trocados. Ler a fatia de pesos de cada GPU leva ${fixed(stepMs)} ms.`,
        `Pelo NVLink, a troca leva ${fixed(commMs(NVLINK), 2)} ms, ${percent(nvlinkShare)} do passo. Pela InfiniBand, ${fixed(commMs(INFINIBAND_NDR))} ms, ${percent(ibShare)} do passo, antes ainda de somar a latência de cada mensagem. Por isso a regra prática: tensor parallelism dentro do nó, pelo NVLink; entre nós, só [[pipeline parallelism|pipeline-parallelism]], que troca bem menos dados, ou réplicas independentes.`,
      ],
      keyIdea: "O tensor parallelism conversa a cada camada: só compensa onde a estrada é larga, dentro do nó.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "tp",
            piece: "metrics-panel",
            metrics: [
              { id: "traffic", label: "trocado por passo", value: `${integer(trafficMB)} MB` },
              { id: "step", label: "ler os pesos", value: `${fixed(stepMs)} ms` },
              { id: "nvlink", label: "troca no nvlink", value: `${fixed(commMs(NVLINK), 2)} ms`, color: "success" },
              { id: "ib", label: "troca na infiniband", value: `${fixed(commMs(INFINIBAND_NDR))} ms`, color: "danger" },
            ],
            highlight: "ib",
          },
        ],
      },
      alt: `Tensor parallelism de um 70B em ${TP} GPUs: cerca de ${integer(trafficMB)} MB trocados por passo, ${fixed(stepMs)} ms para ler os pesos, ${fixed(commMs(NVLINK), 2)} ms de troca pelo NVLink e ${fixed(commMs(INFINIBAND_NDR))} ms pela InfiniBand.`,
    },
    {
      id: "sizing",
      shortTitle: "Quantas GPUs",
      title: "Da meta de tráfego ao número de nós",
      tag: "example",
      body: [
        `Meta: ${TARGET_QPS} pedidos por segundo com ${OUTPUT_TOKENS} tokens de saída, ou ${integer(demand)} tokens por segundo. Cada réplica do 70B usa ${REPLICA_TP} H100 com tensor parallelism e, num teste de carga dentro da meta de latência, entregou ${integer(REPLICA_TOKENS_PER_S)} tokens por segundo (hipótese do exemplo). A ${percent(TARGET_UTILIZATION)} de utilização, são ${replicas} réplicas; com uma de reserva para falhas e deploys, ${replicasWithSpare}.`,
        `São ${gpusNeeded} GPUs. Como cada nó tem ${GPUS_PER_NODE} GPUs e cabe ${replicasPerNode} réplicas, a conta fecha em ${nodes} nós e sobram ${idleGpus} GPUs. Uma réplica nunca deve atravessar dois nós, então o empacotamento importa: às vezes outro tamanho de TP ou um modelo quantizado aproveita melhor o nó inteiro.`,
      ],
      keyIdea: "GPUs = réplicas × GPUs por réplica, e o empacotamento em nós de 8 decide o que você paga de fato.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "sizing",
            piece: "metrics-panel",
            metrics: [
              { id: "demand", label: "demanda", value: `${integer(demand)} tokens/s` },
              { id: "replicas", label: `réplicas (+1 reserva)`, value: `${replicas} + 1` },
              { id: "gpus", label: `gpus (tp = ${REPLICA_TP})`, value: String(gpusNeeded) },
              { id: "nodes", label: `nós de ${GPUS_PER_NODE}`, value: String(nodes), color: "module-17" },
              { id: "idle", label: "gpus sobrando", value: String(idleGpus), color: "danger" },
            ],
            highlight: "nodes",
          },
        ],
      },
      alt: `Dimensionamento: ${integer(demand)} tokens por segundo de demanda pedem ${replicas} réplicas mais 1 de reserva, ${gpusNeeded} GPUs com TP ${REPLICA_TP}, ${nodes} nós de ${GPUS_PER_NODE} GPUs e ${idleGpus} GPUs sobrando.`,
    },
    {
      id: "choice",
      shortTitle: "Escolha",
      title: "GPU grande, GPU pequena e a fila da nuvem",
      tag: "tradeoff",
      body: [
        "GPUs grandes servem modelos grandes com lotes grandes e custo por token baixo, mas a hora é cara e, nas nuvens, elas costumam vir em nós inteiros de 8 e com cota limitada por região. GPUs menores, como a L4, são baratas e fáceis de achar, e bastam para modelos pequenos, embeddings e reranking.",
        "Um desenho comum separa os dois mundos: um pool de nós grandes para o LLM principal e um pool de GPUs pequenas para os modelos auxiliares. Cada pool escala sozinho, e ninguém paga uma H100 para gerar embeddings.",
      ],
      keyIdea: "Cada modelo no menor hardware que atende a meta: GPUs grandes para o LLM, pequenas para os auxiliares.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "pools",
            piece: "block-diagram",
            blocks: [
              { id: "backend", kind: "app", label: "backend", col: 0, row: 0.5 },
              { id: "big", kind: "server", label: "nós h100", col: 1.5, row: 0 },
              { id: "small", kind: "server", label: "gpus l4", col: 1.5, row: 1 },
              { id: "llm", kind: "llm", label: "llm 70b", col: 3, row: 0 },
              { id: "embed", kind: "embedding", label: "embeddings", col: 3, row: 1 },
            ],
            edges: [
              { from: "backend", to: "big", label: "geração" },
              { from: "backend", to: "small", label: "auxiliares" },
              { from: "big", to: "llm" },
              { from: "small", to: "embed" },
            ],
            active: "small",
          },
        ],
      },
      alt: "O backend manda a geração para nós com H100, que rodam o LLM de 70B, e as tarefas auxiliares para GPUs L4, em destaque, que rodam os embeddings.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Memória, estradas e empacotamento",
      tag: "summary",
      body: [
        "A memória decide o que cabe, a banda da memória decide a velocidade do decode, e a interconexão decide como dividir o modelo: tensor parallelism no NVLink, pipeline ou réplicas entre nós. O número de GPUs sai da vazão medida por réplica, com folga e reserva, empacotado em nós inteiros.",
        "Com o hardware escolhido, falta um jeito reproduzível de levar o mesmo motor, drivers e código para cada máquina. A próxima aula trata disso: containers.",
      ],
      keyIdea: "GPU certa = memória para caber, banda para o decode, interconexão para dividir.",
      scene: { kind: "pieces", layout: "single", pieces: [node("other", ["cpu", "gpu-a", "gpu-b", "nvswitch"])] },
      alt: "O nó completo, com CPU, os dois grupos de GPUs e o NVLink já vistos, e a ligação por InfiniBand ao outro nó em destaque.",
    },
  ],
  realWorldExample:
    "Na AWS, a instância p5.48xlarge traz 8 GPUs H100 ligadas por NVSwitch e rede EFA entre instâncias; no Google Cloud, as máquinas A3 também trazem 8 H100. Os dois provedores vendem esses nós inteiros, com cota de GPU por região, o que torna o empacotamento de réplicas em nós de 8 uma decisão de custo real.",
  tradeOffs: {
    pros: [
      "NVLink permite dividir modelos grandes entre GPUs do nó com pouca perda",
      "GPUs com mais banda de memória geram mais tokens por segundo no decode",
      "Pools separados por tamanho de GPU barateiam os modelos auxiliares",
    ],
    cons: [
      "Nós grandes vêm em blocos de 8 GPUs e com cota limitada",
      "Réplicas mal empacotadas deixam GPUs pagas ociosas",
      "Dividir um modelo entre nós pela rede custa caro em latência",
    ],
    alternatives: [
      "Quantizar o modelo para caber em menos GPUs",
      "Usar uma API ou endpoint gerenciado e deixar o hardware para o provedor",
    ],
  },
  knowledgeCheck: [
    {
      id: "tp-across-nodes",
      prompt: "Um time divide um modelo com tensor parallelism em 16 GPUs de dois nós, ligados por InfiniBand, e a latência fica ruim. O que a aula sugere?",
      options: [
        "Aumentar o tensor parallelism para 32",
        "Manter o tensor parallelism dentro de um nó (NVLink) e usar pipeline parallelism ou réplicas entre nós",
        "Trocar NVLink por PCIe",
        "Desligar o KV cache",
      ],
      correct: 1,
      explanation: "O tensor parallelism troca dados duas vezes por camada. Na rede entre nós, que é dezenas de vezes mais estreita que o NVLink, essa troca come boa parte de cada passo.",
      lesson: "17-04",
    },
    {
      id: "packing",
      prompt: "Você precisa de 5 réplicas, cada uma com 2 GPUs, em nós de 8 GPUs. Quantos nós e quantas GPUs sobram?",
      options: ["1 nó, nenhuma sobra", "2 nós, 6 GPUs sobrando", "5 nós, 30 sobrando", "2 nós, nenhuma sobra"],
      correct: 1,
      explanation: "São 10 GPUs. Cada nó cabe 4 réplicas, então 5 réplicas pedem 2 nós, ou 16 GPUs, e sobram 6. Um tamanho de réplica diferente pode aproveitar melhor os nós.",
      lesson: "17-04",
    },
  ],
  related: ["02-10", "10-16", "17-05"],
  references: [
    { title: "NVIDIA H100 Tensor Core GPU", url: "https://www.nvidia.com/en-us/data-center/h100/", kind: "docs" },
    { title: "NVIDIA NVLink e NVSwitch", url: "https://www.nvidia.com/en-us/data-center/nvlink/", kind: "docs" },
    { title: "Shoeybi et al. (2019), Megatron-LM", url: "https://arxiv.org/abs/1909.08053", kind: "paper" },
  ],
};

export default lesson;
