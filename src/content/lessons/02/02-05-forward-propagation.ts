import type { BlockDiagramSpec, GraphSpec, PipelineSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Uma rede 2-3-2 que separa maçã de limão por doçura e acidez. Os pesos são escritos à mão; a passada
// inteira (x · W1 + b1, ReLU, h · W2 + b2, softmax), o lote de 4 frutas e a contagem de FLOPs saem daqui.

type Matrix = number[][];

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).replace("-", "−");
const percent = (value: number) => `${Math.round(value * 100)}%`;
const vector = (values: number[]) => `[${values.map((value) => fixed(value)).join("; ")}]`;

const project = (x: number[], weights: Matrix) =>
  weights[0].map((_, col) => x.reduce((total, value, row) => total + value * weights[row][col], 0));
const add = (a: number[], b: number[]) => a.map((value, index) => value + b[index]);
const relu = (values: number[]) => values.map((value) => Math.max(0, value));
const softmax = (values: number[]) => {
  const exps = values.map(Math.exp);
  const total = exps.reduce((sum, value) => sum + value, 0);
  return exps.map((value) => value / total);
};

const FEATURES = ["doçura", "acidez"];
const CLASSES = ["maçã", "limão"];
const W1: Matrix = [
  [1, -0.5, 0.8],
  [-1.2, 1.5, 0.3],
];
const b1 = [0.1, 0, -0.2];
const W2: Matrix = [
  [1.5, -1],
  [-0.7, 1.2],
  [0.6, -0.4],
];
const b2 = [0, 0.1];

const forward = (x: number[]) => {
  const z1 = add(project(x, W1), b1);
  const h = relu(z1);
  const z2 = add(project(h, W2), b2);
  return { z1, h, z2, p: softmax(z2) };
};

const X = [0.9, 0.2];
const pass = forward(X);
const DEAD = pass.h.indexOf(0);
const verdict = pass.p[0] >= pass.p[1] ? 0 : 1;

// O mesmo cálculo para um lote: cada linha é uma fruta, e a conta vira uma multiplicação de matriz.
const batch = [
  { name: "maçã", x: [0.9, 0.2] },
  { name: "limão", x: [0.1, 0.9] },
  { name: "laranja", x: [0.6, 0.6] },
  { name: "uva", x: [0.8, 0.3] },
].map((fruit) => ({ ...fruit, ...forward(fruit.x) }));
const lemon = batch[1];
const orange = batch[2];

// Custo: cada peso é uma multiplicação e uma soma por exemplo.
const weightCount = W1.length * W1[0].length + W2.length * W2[0].length;
const flopsPerExample = 2 * weightCount;
const storedPerExample = pass.z1.length + pass.h.length + pass.z2.length + pass.p.length;

const hiddenIds = ["h1", "h2", "h3"];
const maxWeight = Math.max(...W1.flat().map(Math.abs), ...W2.flat().map(Math.abs));

const flow = (active: string, done?: string[]): BlockDiagramSpec => ({
  id: "flow",
  piece: "block-diagram",
  blocks: [
    { id: "input", kind: "embedding", label: "doçura, acidez", col: 0, row: 0 },
    { id: "layer-1", kind: "llm", label: "camada 1", col: 1, row: 0 },
    { id: "layer-2", kind: "llm", label: "camada 2", col: 2, row: 0 },
    { id: "answer", kind: "answer", label: `${CLASSES[verdict]} ${percent(pass.p[verdict])}`, col: 3, row: 0 },
  ],
  edges: [
    { from: "input", to: "layer-1", label: "x" },
    { from: "layer-1", to: "layer-2", label: "h" },
    { from: "layer-2", to: "answer", label: "softmax" },
  ],
  active,
  ...(done ? { done } : {}),
});

const stages = (active: string, done: string[]): PipelineSpec => ({
  id: "stages",
  piece: "pipeline",
  stages: [
    { id: "input", label: "x" },
    { id: "linear-1", label: "x·W1 + b1" },
    { id: "relu", label: "ReLU", color: "module-02" },
    { id: "linear-2", label: "h·W2 + b2" },
    { id: "softmax", label: "softmax" },
  ],
  active,
  done,
});

const network: GraphSpec = {
  id: "network",
  piece: "graph",
  nodes: [
    ...FEATURES.map((_, index) => ({ id: `x${index + 1}`, label: `x${index + 1}`, x: 0, y: 0.25 + 0.5 * index })),
    ...hiddenIds.map((id, index) => ({ id, label: id, x: 0.5, y: index / 2, color: index === DEAD ? undefined : ("module-02" as const) })),
    ...CLASSES.map((_, index) => ({ id: `y${index + 1}`, label: `y${index + 1}`, x: 1, y: 0.25 + 0.5 * index })),
  ],
  edges: [
    ...W1.flatMap((row, input) => row.map((weight, unit) => ({ from: `x${input + 1}`, to: hiddenIds[unit], weight: Math.abs(weight) / maxWeight }))),
    ...W2.flatMap((row, unit) =>
      row.map((weight, output) => ({
        from: hiddenIds[unit],
        to: `y${output + 1}`,
        weight: Math.abs(weight) / maxWeight,
        ...(output === 0 && unit !== DEAD ? { label: fixed(pass.h[unit] * weight) } : {}),
      })),
    ),
  ],
  highlight: ["y1"],
  visited: ["x1", "x2", ...hiddenIds.filter((_, index) => index !== DEAD), "y1", "y2"],
};

const lesson: LessonContent = {
  id: "02-05",
  subtitle: "A passada de ida: como uma entrada atravessa a rede, camada por camada, até virar uma previsão, com todas as contas à vista.",
  objectives: [
    "Calcular à mão a passada de uma rede de duas camadas",
    "Ler cada camada como x · W + b seguido de uma ativação",
    "Entender por que um lote de exemplos vira uma multiplicação de matriz",
    "Estimar o custo da passada em FLOPs e em memória",
  ],
  steps: [
    {
      id: "assembly",
      shortTitle: "Linha de montagem",
      title: "A entrada atravessa a rede",
      tag: "context",
      body: [
        "Imagine uma linha de montagem: a fruta entra descrita por dois números, doçura e acidez, e cada estação transforma o que recebeu antes de passar adiante. No fim, sai uma etiqueta: maçã ou limão. Essa passada de ida é o [[forward propagation|forward-propagation]].",
        `Os números do exemplo: x = ${vector(X)}. A camada 1 tem 3 neurônios e a camada 2 tem 2, um por classe. O forward é tudo o que a rede faz na [[inferência|inference]], e também a primeira metade de cada passo de treino.`,
      ],
      keyIdea: "Forward propagation é calcular a saída a partir da entrada, uma camada de cada vez, sempre da esquerda para a direita.",
      scene: { kind: "pieces", layout: "single", pieces: [flow("layer-1")] },
      alt: `Doçura e acidez entram na camada 1, em destaque, seguem para a camada 2 e saem pelo softmax como ${CLASSES[verdict]} com ${percent(pass.p[verdict])}.`,
    },
    {
      id: "layer-1",
      shortTitle: "Camada 1",
      title: "Primeira camada: soma, viés e ReLU",
      tag: "mechanism",
      body: [
        `Cada neurônio escondido faz a sua soma ponderada. Para h₁: ${fixed(X[0], 1)} · ${fixed(W1[0][0], 1)} + ${fixed(X[1], 1)} · (${fixed(W1[1][0], 1)}) + ${fixed(b1[0], 1)} = ${fixed(pass.z1[0])}. Os três juntos dão z₁ = ${vector(pass.z1)}, numa conta só: x · W₁ + b₁.`,
        `Depois vem a ReLU, que zera o negativo: h = ${vector(pass.h)}. O neurônio h${DEAD + 1} ficou desligado para essa fruta, e nada do que ele faria chega à camada seguinte. A tabela mostra z e ReLU(z) para cada neurônio.`,
      ],
      keyIdea: "Camada = multiplicação de matriz + viés + ativação, nessa ordem.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          stages("relu", ["input", "linear-1"]),
          {
            id: "hidden",
            piece: "matrix",
            rows: hiddenIds,
            cols: ["z", "ReLU(z)"],
            values: pass.z1.map((value, index) => [value, pass.h[index]]),
            highlight: { row: DEAD, col: 1 },
            showValues: true,
            color: "module-02",
          },
        ],
      },
      alt: `Pipeline com a etapa ReLU em destaque e a tabela dos três neurônios escondidos: as somas z e os valores depois da ReLU; h${DEAD + 1} é zerado.`,
    },
    {
      id: "layer-2",
      shortTitle: "Camada 2",
      title: "Segunda camada e softmax",
      tag: "mechanism",
      body: [
        `A camada 2 recebe h e repete a receita, sem ReLU: z₂ = h · W₂ + b₂ = ${vector(pass.z2)}. Esses dois números são os [[logits|logit]] de ${CLASSES[0]} e ${CLASSES[1]}. No grafo, os rótulos das setas que chegam em y₁ são as parcelas hᵢ · wᵢ que formam o logit de ${CLASSES[0]}.`,
        `O softmax transforma os logits em probabilidades: ${percent(pass.p[0])} ${CLASSES[0]} e ${percent(pass.p[1])} ${CLASSES[1]}. Repare que h${DEAD + 1} aparece apagado: com valor 0, os pesos que saem dele não contribuem nada nesta passada.`,
      ],
      keyIdea: "A última camada produz logits, e a ativação de saída traduz os logits na resposta.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          network,
          {
            id: "logits",
            piece: "metrics-panel",
            metrics: [
              { id: "z-apple", label: `logit ${CLASSES[0]}`, value: fixed(pass.z2[0]) },
              { id: "z-lemon", label: `logit ${CLASSES[1]}`, value: fixed(pass.z2[1]) },
              { id: "p", label: `P(${CLASSES[verdict]})`, value: percent(pass.p[verdict]), color: "module-02" },
            ],
            highlight: "p",
          },
        ],
      },
      alt: `Grafo da rede com o neurônio h${DEAD + 1} apagado e as parcelas que chegam em y1; o painel mostra os logits ${fixed(pass.z2[0])} e ${fixed(pass.z2[1])} e ${percent(pass.p[verdict])} para ${CLASSES[verdict]}.`,
    },
    {
      id: "batch",
      shortTitle: "Lote",
      title: "Quatro frutas de uma vez",
      tag: "example",
      body: [
        `Na prática, a rede nunca recebe um exemplo só. Empilhe as 4 frutas numa matriz X de 4 × 2: a camada 1 vira X · W₁ + b₁, uma matriz de 4 × 3, e cada linha é a passada de uma fruta. A conta é a mesma, só que um [[tensor|tensor]] maior.`,
        `O limão dá ${percent(lemon.p[1])} para limão. A laranja, com doçura e acidez médias, fica em ${percent(orange.p[0])} para maçã: a rede só conhece duas classes e força uma escolha. É por isso que lotes grandes rodam bem em GPU: é uma multiplicação de matriz grande no lugar de muitas pequenas.`,
      ],
      keyIdea: "Um lote transforma muitas passadas numa única multiplicação de matriz.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "batch",
            piece: "matrix",
            rows: batch.map((fruit) => fruit.name),
            cols: [...hiddenIds, "P maçã"],
            values: batch.map((fruit) => [...fruit.h, fruit.p[0]]),
            scale: { min: 0, max: 1 },
            highlight: { row: 2, col: 3 },
            showValues: true,
            color: "module-02",
          },
        ],
      },
      alt: `Tabela do lote com 4 frutas: as ativações h1, h2, h3 de cada uma e a probabilidade de maçã; a laranja, em destaque, fica em ${percent(orange.p[0])}.`,
    },
    {
      id: "cost",
      shortTitle: "Custo",
      title: "Quanto custa uma passada",
      tag: "tradeoff",
      body: [
        `Cada peso entra numa multiplicação e numa soma por exemplo. Esta rede tem ${weightCount} pesos, então são cerca de ${flopsPerExample} [[FLOPs|flops]] por fruta: a regra 2 × parâmetros vale para qualquer rede densa. Um modelo de 7 bilhões de parâmetros gasta uns 14 bilhões de FLOPs por token.`,
        `No treino há um custo escondido: a passada guarda os resultados de cada camada (aqui, ${storedPerExample} números por fruta) porque a volta vai precisar deles. Em redes grandes, essa memória de ativações costuma pesar mais do que os próprios pesos e limita o tamanho do lote.`,
      ],
      keyIdea: "Forward ≈ 2 FLOPs por parâmetro por exemplo; no treino, as ativações ficam guardadas para a volta.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "training",
            piece: "block-diagram",
            blocks: [
              { id: "batch", kind: "queue", label: "lote", col: 0, row: 0 },
              { id: "forward", kind: "llm", label: "forward", col: 1, row: 0 },
              { id: "loss", kind: "eval", label: "perda", col: 2, row: 0 },
              { id: "memory", kind: "memory", label: "ativações", col: 1, row: 1 },
            ],
            edges: [
              { from: "batch", to: "forward" },
              { from: "forward", to: "loss", label: "previsões" },
              { from: "forward", to: "memory", label: "guarda z e h" },
            ],
            active: "memory",
          },
          {
            id: "cost",
            piece: "metrics-panel",
            metrics: [
              { id: "weights", label: "pesos", value: String(weightCount) },
              { id: "flops", label: "FLOPs por fruta", value: String(flopsPerExample), color: "module-02" },
              { id: "stored", label: "números guardados", value: String(storedPerExample) },
            ],
            highlight: "flops",
          },
        ],
      },
      alt: `O lote passa pelo forward, que entrega previsões à perda e guarda as ativações na memória, em destaque; o painel mostra ${weightCount} pesos, ${flopsPerExample} FLOPs por fruta e ${storedPerExample} números guardados.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Da entrada à previsão",
      tag: "summary",
      body: [
        "O forward propagation aplica, camada por camada, x · W + b e a ativação, e termina nos logits e no softmax. Com lotes, tudo vira multiplicação de matriz, e o custo é previsível: uns 2 FLOPs por parâmetro por exemplo.",
        "A rede da aula acertou a maçã, mas com pesos escritos à mão. Na próxima aula você vê como o treino descobre se cada peso deve subir ou descer: o backpropagation, que percorre essa mesma conta de trás para a frente.",
      ],
      keyIdea: "Forward calcula a previsão; o backward, a seguir, calcula como corrigir cada peso.",
      scene: { kind: "pieces", layout: "single", pieces: [flow("answer", ["input", "layer-1", "layer-2"])] },
      alt: `A entrada atravessou as duas camadas; a resposta, ${CLASSES[verdict]} com ${percent(pass.p[verdict])}, está em destaque.`,
    },
  ],
  realWorldExample:
    "Toda chamada a um LLM é uma sequência de forward passes: para gerar cada token, o modelo roda uma passada de ida por todas as camadas. Por isso o custo de inferência de um modelo denso é estimado em cerca de 2 FLOPs por parâmetro por token gerado.",
  code: {
    language: "python",
    source: `import torch

x = torch.tensor([0.9, 0.2])                      # doçura, acidez
W1 = torch.tensor([[1.0, -0.5, 0.8], [-1.2, 1.5, 0.3]])
b1 = torch.tensor([0.1, 0.0, -0.2])
W2 = torch.tensor([[1.5, -1.0], [-0.7, 1.2], [0.6, -0.4]])
b2 = torch.tensor([0.0, 0.1])

h = torch.relu(x @ W1 + b1)                       # [0.76, 0.00, 0.58]
logits = h @ W2 + b2                              # [1.49, -0.89]
print(torch.softmax(logits, dim=0))               # [0.92, 0.08]`,
    caption: "A passada da aula em PyTorch: duas multiplicações de matriz, uma ReLU e um softmax.",
  },
  tradeOffs: {
    pros: [
      "Conta determinística e previsível: dá para estimar FLOPs e memória antes de rodar",
      "Lotes transformam muitas passadas numa multiplicação de matriz, ideal para GPU",
      "A mesma passada serve para inferência e para a primeira metade do treino",
    ],
    cons: [
      "No treino, as ativações guardadas ocupam muita memória",
      "O custo cresce com o número de parâmetros em cada exemplo ou token",
      "Uma passada só não diz como corrigir a rede: isso exige o backward",
    ],
    alternatives: ["Gradient checkpointing: guardar menos ativações e recalcular na volta", "Quantização para baratear a inferência"],
  },
  knowledgeCheck: [
    {
      id: "dead-unit",
      prompt: "Numa passada, um neurônio escondido com ReLU recebe soma z = −0,4. O que ele manda para a camada seguinte?",
      options: ["−0,4", "0", "0,4", "1"],
      correct: 1,
      explanation: "A ReLU devolve max(0, z). Com z negativo, a saída é 0, e os pesos que saem desse neurônio não contribuem nesta passada.",
      lesson: "02-05",
    },
    {
      id: "flops-estimate",
      prompt: "Uma rede densa tem 1 milhão de pesos. Quantos FLOPs, aproximadamente, uma passada de ida gasta para um lote de 32 exemplos?",
      options: ["1 milhão", "32 milhões", "64 milhões", "2 milhões"],
      correct: 2,
      explanation: "Cerca de 2 FLOPs por peso por exemplo: 2 × 1 milhão × 32 = 64 milhões.",
      lesson: "02-05",
    },
  ],
  related: ["02-04", "02-06", "04-02"],
  references: [
    { title: "Deep Learning, cap. 6: Deep Feedforward Networks", url: "https://www.deeplearningbook.org/contents/mlp.html", kind: "article" },
    { title: "PyTorch: Build the Neural Network", url: "https://pytorch.org/tutorials/beginner/basics/buildmodel_tutorial.html", kind: "docs" },
    { title: "Scaling Laws for Neural Language Models (Kaplan et al.)", url: "https://arxiv.org/abs/2001.08361", kind: "paper" },
  ],
};

export default lesson;
