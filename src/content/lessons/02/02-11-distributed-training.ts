import type { BlockDiagramSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Paralelismo de dados em escala de brinquedo: um modelo y = w · x treinado em 4 GPUs, cada uma com 2
// dos 8 exemplos. Os gradientes locais, a média do all-reduce (igual ao gradiente do lote inteiro), o
// tráfego do ring all-reduce e a memória de treino com Adam em precisão mista são calculados aqui.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).replace("-", "−");

const XS = [1, 2, 3, 4, 0.5, 1.5, 2.5, 3.5];
const YS = [2.1, 3.9, 6.2, 7.8, 1, 3.1, 4.9, 7.1];
const W = 1;
const LEARNING_RATE = 0.05;
const GPUS = 4;
const PER_GPU = XS.length / GPUS;

/** Gradiente de (w · x − y)² em relação a w. */
const exampleGradient = (index: number) => 2 * (W * XS[index] - YS[index]) * XS[index];
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

const shards = Array.from({ length: GPUS }, (_, gpu) =>
  Array.from({ length: PER_GPU }, (__, offset) => gpu * PER_GPU + offset),
);
const shardGradients = shards.map((shard) => shard.map(exampleGradient));
const localGradients = shardGradients.map(mean);
const allReduced = mean(localGradients);
const fullBatch = mean(XS.map((_, index) => exampleGradient(index)));
const sameGradient = Math.abs(allReduced - fullBatch) < 1e-12;
const newW = W - LEARNING_RATE * allReduced;

// Ring all-reduce: cada GPU envia (e recebe) 2 · (N − 1) / N vezes o tamanho dos gradientes.
const ringFactor = (gpus: number) => (2 * (gpus - 1)) / gpus;
const RING_SIZES = [2, 4, 8, 16, 32, 64];
const PARAMS = 7e9;
const GRADIENT_GB = (PARAMS * 2) / 1e9;
const ringTraffic = (gpus: number) => ringFactor(gpus) * GRADIENT_GB;

// Treino com Adam em precisão mista, como no paper do ZeRO: 2 bytes de peso + 2 de gradiente
// + 12 do otimizador (cópia fp32 dos pesos, momentum e variância) = 16 bytes por parâmetro.
const BYTES_PER_PARAM = 2 + 2 + 12;
const trainingGB = (PARAMS * BYTES_PER_PARAM) / 1e9;
const SHARDS = 8;
const shardedGB = trainingGB / SHARDS;

const ring = ["g0", "g1", "g2", "g3"];

const cluster = (active: string, done?: string[]): BlockDiagramSpec => ({
  id: "cluster",
  piece: "block-diagram",
  blocks: [
    { id: "data", kind: "documents", label: "lote inteiro", col: 0, row: 0.5 },
    { id: "gpu-0", kind: "server", label: "gpu 0: fatia 1", col: 1, row: 0 },
    { id: "gpu-1", kind: "server", label: "gpu 1: fatia 2", col: 1, row: 1 },
    { id: "reduce", kind: "queue", label: "all-reduce", col: 2, row: 0.5 },
    { id: "model", kind: "llm", label: "mesmo modelo", col: 3, row: 0.5 },
  ],
  edges: [
    { from: "data", to: "gpu-0" },
    { from: "data", to: "gpu-1" },
    { from: "gpu-0", to: "reduce", label: "gradiente" },
    { from: "gpu-1", to: "reduce", label: "gradiente" },
    { from: "reduce", to: "model", label: "média" },
  ],
  active,
  ...(done ? { done } : {}),
});

const lesson: LessonContent = {
  id: "02-11",
  subtitle: "Como dividir o treino entre muitas GPUs e chegar ao mesmo resultado: paralelismo de dados, all-reduce e as técnicas para modelos que não cabem numa GPU.",
  objectives: [
    "Mostrar que a média dos gradientes locais é o gradiente do lote inteiro",
    "Explicar o all-reduce e o custo de comunicação do ring all-reduce",
    "Calcular a memória de treino de um modelo com Adam",
    "Escolher entre paralelismo de dados, tensor, pipeline e sharding",
  ],
  steps: [
    {
      id: "split",
      shortTitle: "Dividir",
      title: "Quatro pessoas corrigindo a mesma prova",
      tag: "context",
      body: [
        "Um professor tem 800 provas para corrigir e chama três colegas. Cada um corrige 200, com o mesmo gabarito, e no fim eles juntam as notas. Treinar com [[paralelismo de dados|data-parallelism]] é isso: cada GPU tem uma cópia inteira do modelo e processa uma fatia diferente do lote.",
        "Depois do backward, cada GPU tem o gradiente da sua fatia. Uma operação coletiva, o [[all-reduce|all-reduce]], soma esses gradientes e entrega a média para todas. Como todas partem dos mesmos pesos e aplicam o mesmo gradiente, as cópias continuam idênticas depois do passo.",
      ],
      keyIdea: "Paralelismo de dados: cópias do modelo, fatias do lote, gradientes somados antes do passo.",
      scene: { kind: "pieces", layout: "single", pieces: [cluster("reduce")] },
      alt: "O lote é dividido entre a GPU 0 e a GPU 1; cada uma manda o seu gradiente para o all-reduce, em destaque, que devolve a média ao mesmo modelo.",
    },
    {
      id: "average",
      shortTitle: "Média",
      title: "A média das fatias é o lote inteiro",
      tag: "mechanism",
      body: [
        `O modelo é y = w · x, com w = ${fixed(W, 1)}, e a perda de cada exemplo é (w · x − y)². Os ${XS.length} exemplos vão para ${GPUS} GPUs, ${PER_GPU} em cada. A tabela mostra o gradiente de cada exemplo e a média local de cada GPU.`,
        `A média das ${GPUS} médias locais é ${fixed(allReduced, 4)}. O gradiente calculado com os ${XS.length} exemplos numa GPU só também é ${fixed(fullBatch, 4)}: ${sameGradient ? "o mesmo número" : "quase o mesmo número"}, porque as fatias têm o mesmo tamanho. Com taxa ${fixed(LEARNING_RATE)}, todas as GPUs atualizam w para ${fixed(newW, 3)}. Matematicamente, é o mesmo treino com um lote ${GPUS} vezes maior.`,
      ],
      keyIdea: "Com fatias de mesmo tamanho, média dos gradientes locais = gradiente do lote inteiro.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "gradients",
            piece: "matrix",
            rows: shards.map((_, gpu) => `gpu ${gpu}`),
            cols: ["exemplo 1", "exemplo 2", "média"],
            values: shardGradients.map((values, gpu) => [...values, localGradients[gpu]]),
            highlight: { row: GPUS - 1, col: PER_GPU },
            showValues: true,
            color: "module-02",
          },
          {
            id: "check",
            piece: "metrics-panel",
            metrics: [
              { id: "reduced", label: "média do all-reduce", value: fixed(allReduced, 4), color: "module-02" },
              { id: "full", label: "lote inteiro, 1 GPU", value: fixed(fullBatch, 4) },
              { id: "w", label: "novo w", value: fixed(newW, 3) },
            ],
            highlight: "reduced",
          },
        ],
      },
      alt: `Tabela com os gradientes dos exemplos de cada uma das ${GPUS} GPUs e as médias locais; o painel mostra que a média do all-reduce, ${fixed(allReduced, 4)}, é igual ao gradiente do lote inteiro.`,
    },
    {
      id: "ring",
      shortTitle: "All-reduce",
      title: "Somar sem um servidor central",
      tag: "mechanism",
      body: [
        "Mandar todos os gradientes para uma GPU central e devolver a média criaria um gargalo: ela receberia N cópias do modelo inteiro. O ring all-reduce liga as GPUs num anel. Cada gradiente é cortado em N pedaços, e cada GPU passa um pedaço ao vizinho enquanto recebe outro do vizinho do outro lado.",
        "Em N − 1 rodadas, cada pedaço acumula a soma de todas as GPUs (fase de reduce-scatter); em mais N − 1, os pedaços somados circulam até todas terem tudo (fase de all-gather). Todas as ligações trabalham ao mesmo tempo, e nenhuma GPU vira gargalo. É o que a biblioteca NCCL faz por baixo do PyTorch.",
      ],
      keyIdea: "No ring all-reduce, cada GPU só fala com os vizinhos, e todas as ligações trabalham juntas.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "ring",
            piece: "graph",
            nodes: [
              { id: "g0", label: "g0", x: 0.5, y: 0, color: "module-02" },
              { id: "g1", label: "g1", x: 1, y: 0.5, color: "module-02" },
              { id: "g2", label: "g2", x: 0.5, y: 1, color: "module-02" },
              { id: "g3", label: "g3", x: 0, y: 0.5, color: "module-02" },
            ],
            edges: ring.map((from, index) => ({ from, to: ring[(index + 1) % ring.length], label: `1/${ring.length} do gradiente`, weight: 0.6 })),
            path: [...ring, ring[0]],
            highlight: ["g0"],
          },
        ],
      },
      alt: "Quatro GPUs ligadas em anel; cada uma passa um quarto do gradiente para a vizinha, e todas as ligações trabalham ao mesmo tempo.",
    },
    {
      id: "traffic",
      shortTitle: "Escala",
      title: "Quanto cada GPU envia",
      tag: "example",
      body: [
        `No ring all-reduce, cada GPU envia 2 · (N − 1) / N vezes o tamanho dos gradientes. Com 2 GPUs, o fator é ${fixed(ringFactor(2), 1)}; com 8, ${fixed(ringFactor(8), 2)}; com 64, ${fixed(ringFactor(64), 2)}. O gráfico mostra que ele quase não cresce: tende a 2, por mais GPUs que você acrescente.`,
        `Para um modelo de 7 bilhões de parâmetros com gradientes em bf16, são ${fixed(GRADIENT_GB, 0)} GB de gradiente, e cada GPU envia uns ${fixed(ringTraffic(8), 1)} GB por passo num anel de 8. Por isso a rede entre as GPUs importa tanto quanto as GPUs. Duas técnicas aliviam: sobrepor a comunicação com o backward e fazer [[gradient accumulation|gradient-accumulation]], somando vários mini-lotes antes de cada all-reduce.`,
      ],
      keyIdea: "O tráfego por GPU do ring all-reduce fica perto de 2× os gradientes, com qualquer número de GPUs.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "ring-factor",
            piece: "chart",
            kind: "bar",
            series: RING_SIZES.map((gpus) => ({ label: String(gpus), value: Number(ringFactor(gpus).toFixed(3)) })),
            max: 2,
            highlight: RING_SIZES.indexOf(8),
            color: "module-02",
          },
        ],
      },
      alt: `Barras do fator de tráfego do ring all-reduce para 2 a 64 GPUs: sobe de ${fixed(ringFactor(2), 1)} e se aproxima de 2.`,
    },
    {
      id: "too-big",
      shortTitle: "Modelo grande",
      title: "Quando o modelo não cabe numa GPU",
      tag: "tradeoff",
      body: [
        `Paralelismo de dados exige uma cópia inteira em cada GPU, e treinar com Adam em precisão mista custa ${BYTES_PER_PARAM} bytes por parâmetro: pesos, gradientes, cópia fp32, momentum e variância. Um modelo de 7 bilhões precisa de ${fixed(trainingGB, 0)} GB antes de contar as ativações, mais do que a memória de uma GPU.`,
        `O [[sharding com ZeRO|zero-sharding]] (ou FSDP no PyTorch) divide esse estado entre as GPUs: com ${SHARDS}, cada uma guarda ${fixed(shardedGB, 0)} GB e busca o resto quando precisa, trocando memória por comunicação. Para modelos ainda maiores, o [[tensor parallelism|tensor-parallelism]] divide cada multiplicação de matriz entre GPUs, e o [[pipeline parallelism|pipeline-parallelism]] põe grupos de camadas em GPUs diferentes.`,
      ],
      keyIdea: "Dados divide o lote, ZeRO divide o estado, tensor divide as matrizes, pipeline divide as camadas.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "sharding",
            piece: "block-diagram",
            blocks: [
              { id: "state", kind: "memory", label: `${fixed(trainingGB, 0)} gb de estado`, col: 0, row: 0.5 },
              { id: "shard-0", kind: "server", label: `gpu 0: ${fixed(shardedGB, 0)} gb`, col: 1, row: 0 },
              { id: "shard-7", kind: "server", label: `gpu 7: ${fixed(shardedGB, 0)} gb`, col: 1, row: 1 },
              { id: "gather", kind: "queue", label: "all-gather", col: 2, row: 0.5 },
            ],
            edges: [
              { from: "state", to: "shard-0", label: "1/8" },
              { from: "state", to: "shard-7", label: "1/8" },
              { from: "shard-0", to: "gather", label: "pesos sob demanda" },
              { from: "shard-7", to: "gather" },
            ],
            active: "shard-0",
          },
          {
            id: "memory",
            piece: "metrics-panel",
            metrics: [
              { id: "bytes", label: "bytes por parâmetro", value: String(BYTES_PER_PARAM) },
              { id: "total", label: "7B com Adam", value: `${fixed(trainingGB, 0)} GB`, color: "danger" },
              { id: "sharded", label: `por GPU, em ${SHARDS}`, value: `${fixed(shardedGB, 0)} GB`, color: "success" },
            ],
            highlight: "sharded",
          },
        ],
      },
      alt: `Os ${fixed(trainingGB, 0)} GB de estado de treino de um modelo de 7 bilhões são divididos entre ${SHARDS} GPUs, ${fixed(shardedGB, 0)} GB em cada, e reunidos por all-gather quando preciso.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Muitas GPUs, um só modelo",
      tag: "summary",
      body: [
        "Treino distribuído começa pelo paralelismo de dados: fatias do lote, gradientes somados por all-reduce, pesos idênticos em todas as GPUs. Quando o modelo não cabe, entram ZeRO ou FSDP para dividir o estado, e tensor e pipeline parallelism para dividir o próprio modelo.",
        "Com isso termina o módulo de deep learning: neurônios, camadas, forward, backprop, otimização, CNNs, RNNs e o hardware que treina tudo. O próximo passo é a arquitetura que juntou essas peças e criou os LLMs: o Transformer.",
      ],
      keyIdea: "Escalar o treino é dividir trabalho e memória entre GPUs sem mudar a matemática do gradiente.",
      scene: { kind: "pieces", layout: "single", pieces: [cluster("model", ["data", "gpu-0", "gpu-1", "reduce"])] },
      alt: "O lote foi dividido entre as GPUs, os gradientes passaram pelo all-reduce, e o mesmo modelo atualizado está em destaque.",
    },
  ],
  realWorldExample:
    "O Llama 3 de 405 bilhões de parâmetros foi treinado em até 16 mil GPUs H100, combinando paralelismo de dados (com sharding), tensor, pipeline e de contexto, segundo o paper da Meta. Nenhuma técnica sozinha bastaria naquela escala.",
  code: {
    language: "python",
    source: `# torchrun --nproc_per_node=4 train.py
import os
import torch
import torch.distributed as dist
from torch.nn.parallel import DistributedDataParallel as DDP

dist.init_process_group("nccl")
local_rank = int(os.environ["LOCAL_RANK"])
torch.cuda.set_device(local_rank)

model = DDP(torch.nn.Linear(1, 1, bias=False).cuda(), device_ids=[local_rank])
x = torch.randn(2, 1, device="cuda")     # a fatia do lote desta GPU
y = 2 * x
loss = ((model(x) - y) ** 2).mean()
loss.backward()                          # o DDP faz o all-reduce: todas ficam com o gradiente médio`,
    caption: "Paralelismo de dados com DistributedDataParallel: um processo por GPU, e o all-reduce dos gradientes acontece dentro do backward.",
  },
  tradeOffs: {
    pros: [
      "Paralelismo de dados é simples e não muda a matemática do treino",
      "O ring all-reduce mantém o tráfego por GPU quase constante com mais GPUs",
      "ZeRO, tensor e pipeline parallelism permitem treinar modelos maiores que uma GPU",
    ],
    cons: [
      "A comunicação entre GPUs vira gargalo sem uma rede rápida",
      "Lotes muito grandes podem exigir ajuste da taxa de aprendizado",
      "Tensor e pipeline parallelism acrescentam complexidade e tempo ocioso entre etapas",
    ],
    alternatives: ["Gradient accumulation numa GPU só, quando o problema é só o tamanho do lote", "Fine-tuning com LoRA, que treina poucos parâmetros e cabe em menos GPUs"],
  },
  knowledgeCheck: [
    {
      id: "same-weights",
      prompt: "Num treino com paralelismo de dados em 8 GPUs, por que os pesos continuam idênticos em todas as cópias depois de cada passo?",
      options: [
        "Porque cada GPU treina por menos tempo",
        "Porque todas partem dos mesmos pesos e aplicam o mesmo gradiente médio do all-reduce",
        "Porque os dados são iguais em todas as GPUs",
        "Porque uma GPU copia os pesos para as outras a cada hora",
      ],
      correct: 1,
      explanation: "O all-reduce entrega a todas a mesma média. Mesmos pesos mais mesma atualização dá os mesmos pesos novos.",
      lesson: "02-11",
    },
    {
      id: "memory-plan",
      prompt: "Um modelo de 3 bilhões de parâmetros será treinado com Adam em precisão mista. Sem contar ativações, quanta memória o estado de treino ocupa, e quanto por GPU com ZeRO em 4 GPUs?",
      options: ["6 GB e 1,5 GB", "48 GB e 12 GB", "12 GB e 3 GB", "48 GB e 48 GB"],
      correct: 1,
      explanation: "São 16 bytes por parâmetro: 3 bilhões × 16 = 48 GB. Com o estado dividido em 4, cada GPU guarda 12 GB.",
      lesson: "02-11",
    },
  ],
  related: ["02-10", "03-14", "11-08"],
  references: [
    { title: "ZeRO: Memory Optimizations Toward Training Trillion Parameter Models", url: "https://arxiv.org/abs/1910.02054", kind: "paper" },
    { title: "Megatron-LM: Training Multi-Billion Parameter Language Models Using Model Parallelism", url: "https://arxiv.org/abs/1909.08053", kind: "paper" },
    { title: "PyTorch: Distributed Data Parallel", url: "https://pytorch.org/docs/stable/notes/ddp.html", kind: "docs" },
  ],
};

export default lesson;
