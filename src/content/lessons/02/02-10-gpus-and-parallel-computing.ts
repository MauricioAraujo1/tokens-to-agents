import type { BlockDiagramSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Por que deep learning roda em GPU, em contas: uma multiplicação de matriz 4 × 4 com as 16 saídas
// independentes, os FLOPs e a intensidade aritmética de uma multiplicação n × n em bf16, a memória
// de um modelo de 7 bilhões de parâmetros em cada precisão e a utilização da GPU com um carregador lento.

type Matrix = number[][];

const fixed = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).replace("-", "−");
const percent = (value: number) => `${Math.round(value * 100)}%`;

const A: Matrix = [
  [1, 2, 0, 1],
  [0, 1, 3, 1],
  [2, 0, 1, 0],
  [1, 1, 0, 2],
];
const B: Matrix = [
  [1, 0, 2, 1],
  [0, 1, 1, 0],
  [2, 1, 0, 1],
  [1, 0, 1, 1],
];
const N = A.length;
const C: Matrix = A.map((row) => B[0].map((_, col) => row.reduce((sum, value, k) => sum + value * B[k][col], 0)));
const ROW = 1;
const COL = 2;
const cellTerms = A[ROW].map((value, k) => `${value}·${B[k][COL]}`);
const independentCells = N * N;
const macsPerCell = N;

// Multiplicação n × n em bf16 (2 bytes): 2n³ FLOPs e 3n² números lidos ou escritos.
const BYTES_BF16 = 2;
const matmulFlops = (n: number) => 2 * n ** 3;
const matmulBytes = (n: number) => 3 * n * n * BYTES_BF16;
const intensity = (n: number) => matmulFlops(n) / matmulBytes(n);
const SIZES = [128, 256, 512, 1024, 2048, 4096];
const BIG = SIZES[SIZES.length - 1];
const bigFlops = matmulFlops(BIG);
// Soma elemento a elemento de duas matrizes: 1 FLOP por elemento para os mesmos 3n² números.
const elementwiseIntensity = 1 / (3 * BYTES_BF16);

// Memória só dos pesos de um modelo de 7 bilhões de parâmetros.
const PARAMS = 7e9;
const precisions = [
  { id: "fp32", bytes: 4 },
  { id: "bf16", bytes: 2 },
  { id: "int8", bytes: 1 },
  { id: "int4", bytes: 0.5 },
];
const gigabytes = (bytes: number) => (PARAMS * bytes) / 1e9;

// Carregador de dados lento: preparar um lote leva 30 ms na CPU, e a GPU processa o lote em 20 ms.
const LOAD_MS = 30;
const COMPUTE_MS = 20;
const utilization = COMPUTE_MS / Math.max(LOAD_MS, COMPUTE_MS);
const WORKERS = 3;
const fixedUtilization = COMPUTE_MS / Math.max(LOAD_MS / WORKERS, COMPUTE_MS);

const hardware = (active: string, done?: string[]): BlockDiagramSpec => ({
  id: "hardware",
  piece: "block-diagram",
  blocks: [
    { id: "work", kind: "queue", label: "milhões de contas", col: 0, row: 0.5 },
    { id: "cpu", kind: "laptop", label: "cpu: poucos núcleos", col: 1, row: 0 },
    { id: "gpu", kind: "server", label: "gpu: milhares", col: 1, row: 1 },
    { id: "vram", kind: "memory", label: "vram", col: 2, row: 1 },
    { id: "result", kind: "answer", label: "resultado", col: 3, row: 0.5 },
  ],
  edges: [
    { from: "work", to: "cpu", label: "em sequência", variant: "alternative" },
    { from: "work", to: "gpu", label: "em paralelo" },
    { from: "vram", to: "gpu", label: "pesos" },
    { from: "gpu", to: "result" },
    { from: "cpu", to: "result" },
  ],
  active,
  ...(done ? { done } : {}),
});

const lesson: LessonContent = {
  id: "02-10",
  subtitle: "Por que a mesma conta, repetida bilhões de vezes, roda melhor em milhares de núcleos simples do que em poucos núcleos espertos, e onde a GPU trava.",
  objectives: [
    "Explicar por que redes neurais são um trabalho paralelo",
    "Contar os FLOPs de uma multiplicação de matriz",
    "Usar a intensidade aritmética para saber se uma conta é limitada por cálculo ou por memória",
    "Calcular a memória de um modelo em cada precisão numérica",
  ],
  steps: [
    {
      id: "many-cores",
      shortTitle: "CPU e GPU",
      title: "Poucos chefs ou mil cozinheiros",
      tag: "context",
      body: [
        "Uma CPU é como poucos chefs muito habilidosos: cada um resolve qualquer receita, com decisões e desvios. Uma [[GPU|gpu]] é como mil cozinheiros que só sabem cortar cebola, mas cortam todos ao mesmo tempo. Se a tarefa é cortar um milhão de cebolas iguais, os mil ganham fácil.",
        "Uma rede neural é exatamente esse caso: forward e backward são, quase inteiros, multiplicações de matriz, a mesma conta sobre dados diferentes. A GPU executa a mesma instrução em milhares de threads ao mesmo tempo, e a [[CUDA|cuda]] é a plataforma da NVIDIA para programar esse paralelismo.",
      ],
      keyIdea: "Deep learning é muita conta igual e independente, o tipo de trabalho para o qual a GPU foi feita.",
      scene: { kind: "pieces", layout: "single", pieces: [hardware("gpu")] },
      alt: "Milhões de contas podem ir para uma CPU com poucos núcleos, em sequência, por um caminho tracejado, ou para uma GPU com milhares de núcleos, em paralelo, em destaque, que lê os pesos da VRAM.",
    },
    {
      id: "matmul",
      shortTitle: "Matmul",
      title: "Cada célula do resultado é independente",
      tag: "mechanism",
      body: [
        `Multiplique duas matrizes de ${N} × ${N}. A célula da linha ${ROW} e coluna ${COL} do resultado é o produto escalar da linha ${ROW} de A pela coluna ${COL} de B: ${cellTerms.join(" + ")} = ${C[ROW][COL]}. Ela não depende de nenhuma outra célula.`,
        `As ${independentCells} células podem ser calculadas ao mesmo tempo, cada uma com ${macsPerCell} multiplicações e somas. Para matrizes de n × n são n² células e 2n³ [[FLOPs|flops]]: com n = ${BIG.toLocaleString("pt-BR")}, ${bigFlops.toExponential(2).replace(".", ",")} FLOPs numa chamada. GPUs modernas têm ainda os [[Tensor Cores|tensor-core]], unidades que multiplicam blocos pequenos de matriz numa instrução só.`,
      ],
      keyIdea: "Multiplicar matrizes é n² produtos escalares independentes: paralelismo puro.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "product",
            piece: "matrix",
            rows: C.map((_, index) => `linha ${index}`),
            cols: C[0].map((_, index) => `col ${index}`),
            values: C,
            highlight: { row: ROW, col: COL },
            showValues: true,
            color: "module-02",
          },
        ],
      },
      alt: `O resultado de A vezes B, com 4 por 4 células; a célula da linha ${ROW} e coluna ${COL}, em destaque, vale ${C[ROW][COL]} e é calculada sem depender das outras.`,
    },
    {
      id: "intensity",
      shortTitle: "Intensidade",
      title: "Conta ou memória: quem é o gargalo",
      tag: "mechanism",
      body: [
        "A GPU faz contas muito mais rápido do que traz dados da memória. Por isso importa a [[intensidade aritmética|arithmetic-intensity]]: quantos FLOPs a operação faz por byte lido ou escrito. Se for baixa, os núcleos ficam esperando dados; se for alta, a GPU trabalha perto do pico.",
        `Numa multiplicação n × n em bf16 são 2n³ FLOPs para 3n² números de 2 bytes: a intensidade é n / 3 e cresce com a matriz, como mostra o gráfico. Com n = ${BIG.toLocaleString("pt-BR")}, são ${Math.round(intensity(BIG)).toLocaleString("pt-BR")} FLOPs por byte. Já somar duas matrizes elemento a elemento faz ${fixed(elementwiseIntensity, 2)} FLOP por byte: é limitado pela memória, e por isso frameworks fundem operações pequenas.`,
      ],
      keyIdea: "Matrizes grandes são limitadas pela conta; operações elemento a elemento, pela memória.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "intensity",
            piece: "chart",
            kind: "bar",
            series: SIZES.map((n) => ({ label: String(n), value: Math.round(intensity(n)) })),
            highlight: SIZES.length - 1,
            color: "module-02",
          },
        ],
      },
      alt: `Barras com a intensidade aritmética de multiplicações de matriz de 128 a ${BIG}: cresce de ${Math.round(intensity(SIZES[0]))} para ${Math.round(intensity(BIG))} FLOPs por byte.`,
    },
    {
      id: "precision",
      shortTitle: "Precisão",
      title: "Menos bits, mais modelo na GPU",
      tag: "example",
      body: [
        `A memória da GPU é o outro limite. Só os pesos de um modelo de 7 bilhões de parâmetros ocupam ${fixed(gigabytes(4), 0)} GB em fp32 (4 bytes por número), ${fixed(gigabytes(2), 0)} GB em bf16, ${fixed(gigabytes(1), 0)} GB em int8 e ${fixed(gigabytes(0.5), 1)} GB em int4. Cada metade de bits é metade da memória e metade dos bytes que a GPU precisa mover.`,
        "No treino, o padrão é a [[precisão mista|mixed-precision]]: as contas pesadas rodam em bf16 ou fp16 nos Tensor Cores, e uma cópia dos pesos em fp32 recebe as atualizações, para que passos pequenos não se percam no arredondamento. Formatos de 8 e 4 bits aparecem sobretudo na inferência, com quantização.",
      ],
      keyIdea: "Memória do modelo = parâmetros × bytes por número; precisão menor cabe mais e anda mais rápido.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "memory",
            piece: "metrics-panel",
            metrics: precisions.map((precision) => ({
              id: precision.id,
              label: `7B em ${precision.id}`,
              value: `${fixed(gigabytes(precision.bytes), precision.bytes < 1 ? 1 : 0)} GB`,
              ...(precision.id === "bf16" ? { color: "module-02" as const } : {}),
            })),
            highlight: "bf16",
          },
        ],
      },
      alt: `Memória dos pesos de um modelo de 7 bilhões de parâmetros: ${fixed(gigabytes(4), 0)} GB em fp32, ${fixed(gigabytes(2), 0)} GB em bf16, em destaque, ${fixed(gigabytes(1), 0)} GB em int8 e ${fixed(gigabytes(0.5), 1)} GB em int4.`,
    },
    {
      id: "starved",
      shortTitle: "Gargalo",
      title: "Uma GPU rápida esperando dados",
      tag: "tradeoff",
      body: [
        `A GPU só é rápida se tiver o que fazer. Suponha que a CPU leve ${LOAD_MS} ms para ler e preparar um lote e a GPU processe esse lote em ${COMPUTE_MS} ms. A GPU passa ${LOAD_MS - COMPUTE_MS} ms de cada ${LOAD_MS} parada: a utilização fica em ${percent(utilization)}, e você paga por uma GPU inteira.`,
        `Com ${WORKERS} processos preparando lotes em paralelo, cada lote fica pronto a cada ${LOAD_MS / WORKERS} ms, e a utilização vai a ${percent(fixedUtilization)}. O outro lado do paralelismo é que só ajuda em trabalho divisível: código com muitos “se” e passos dependentes, como a fila de uma RNN, aproveita mal a GPU.`,
      ],
      keyIdea: "Paralelismo só rende quando o resto do sistema alimenta a GPU no mesmo ritmo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "pipeline",
            piece: "client-server",
            nodes: [
              { id: "loader", label: "cpu: carrega lotes", role: "client", utilization: 1 },
              { id: "queue", label: "fila de lotes", role: "queue", size: 0 },
              { id: "gpu", label: "gpu", role: "model", utilization },
            ],
            messages: [
              { from: "loader", to: "queue", label: `lote a cada ${LOAD_MS} ms` },
              { from: "queue", to: "gpu", label: `${COMPUTE_MS} ms de conta` },
            ],
            active: 0,
          },
        ],
      },
      alt: `A CPU, ocupada, prepara um lote a cada ${LOAD_MS} ms; a fila fica vazia e a GPU, que gasta ${COMPUTE_MS} ms por lote, fica em ${percent(utilization)} de utilização.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Paralelismo, memória e precisão",
      tag: "summary",
      body: [
        "Redes neurais rodam em GPU porque são feitas de multiplicações de matriz, que se dividem em milhões de contas independentes. O desempenho real depende de três coisas: matrizes grandes o bastante para a conta dominar, dados chegando no ritmo certo e precisão numérica que caiba na memória.",
        "Quando o modelo ou o dataset não cabem numa GPU só, a saída é usar várias. A próxima aula mostra como dividir o treino entre muitas GPUs sem mudar o resultado.",
      ],
      keyIdea: "GPU = paralelismo massivo, limitado pela memória e pela alimentação de dados.",
      scene: { kind: "pieces", layout: "single", pieces: [hardware("result", ["work", "gpu", "vram"])] },
      alt: "As contas foram para a GPU, que leu os pesos da VRAM; o resultado está em destaque.",
    },
  ],
  realWorldExample:
    "A AlexNet, em 2012, foi treinada em duas GPUs GTX 580 de 3 GB cada, por cinco a seis dias, segundo o paper. A rede não cabia numa GPU só, e os autores puseram metade dos kernels de cada camada em cada GPU: um dos primeiros casos de treino distribuído em deep learning.",
  code: {
    language: "python",
    source: `import torch

model = torch.nn.Linear(4096, 4096).cuda()
x = torch.randn(64, 4096, device="cuda")

with torch.autocast(device_type="cuda", dtype=torch.bfloat16):
    y = model(x)      # a multiplicação de matriz roda em bf16

print(y.dtype)        # torch.bfloat16
print(2 * 64 * 4096 * 4096)  # FLOPs desta camada: cerca de 2,1 bilhões`,
    caption: "Precisão mista com torch.autocast: a camada roda em bf16 na GPU, e a conta de FLOPs segue a regra 2 × entradas × saídas × lote.",
  },
  tradeOffs: {
    pros: [
      "Milhares de núcleos para a conta que domina o deep learning",
      "Tensor Cores e precisão reduzida multiplicam a vazão",
      "Ecossistema maduro: CUDA, cuDNN e frameworks que escondem os detalhes",
    ],
    cons: [
      "Memória limitada e cara: o modelo e as ativações precisam caber",
      "Operações pequenas ou elemento a elemento são limitadas pela memória, não pela conta",
      "Código com muitos desvios e dependências sequenciais aproveita mal o paralelismo",
    ],
    alternatives: ["TPUs e outros aceleradores dedicados a matrizes", "CPU para modelos pequenos e inferência de baixo volume"],
  },
  knowledgeCheck: [
    {
      id: "memory-bound",
      prompt: "Um modelo passa a maior parte do tempo em operações elemento a elemento (somas, normalizações) com matrizes pequenas. O que mais ajuda?",
      options: [
        "Uma GPU com mais FLOPs de pico",
        "Fundir operações para ler e escrever a memória menos vezes",
        "Usar fp32 em tudo",
        "Diminuir o número de núcleos",
      ],
      correct: 1,
      explanation: "Essas operações têm intensidade aritmética baixa: o gargalo é mover bytes, não calcular. Fundir operações corta as idas à memória.",
      lesson: "02-10",
    },
    {
      id: "model-memory",
      prompt: "Quanta memória ocupam só os pesos de um modelo de 13 bilhões de parâmetros em bf16?",
      options: ["13 GB", "26 GB", "52 GB", "6,5 GB"],
      correct: 1,
      explanation: "bf16 usa 2 bytes por número: 13 bilhões × 2 bytes = 26 GB, sem contar ativações, KV cache ou otimizador.",
      lesson: "02-10",
    },
  ],
  related: ["02-09", "02-11", "10-05"],
  references: [
    { title: "NVIDIA: CUDA C++ Programming Guide", url: "https://docs.nvidia.com/cuda/cuda-c-programming-guide/index.html", kind: "docs" },
    { title: "Mixed Precision Training (Micikevicius et al.)", url: "https://arxiv.org/abs/1710.03740", kind: "paper" },
    { title: "PyTorch: Automatic Mixed Precision (torch.amp)", url: "https://pytorch.org/docs/stable/amp.html", kind: "docs" },
  ],
};

export default lesson;
