import type { BlockDiagramSpec, MatrixSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Uma convolução 3 × 3 de verdade sobre uma imagem de 6 × 6 (um "1" desenhado à mão), com um filtro
// de borda vertical. O mapa de features, a ReLU, o max pooling 2 × 2 e a contagem de parâmetros saem daqui.

type Grid = number[][];

const thousands = (value: number) => value.toLocaleString("pt-BR");

const IMAGE: Grid = [
  [0, 0, 1, 1, 0, 0],
  [0, 0, 1, 1, 0, 0],
  [0, 0, 1, 1, 0, 0],
  [0, 0, 1, 1, 0, 0],
  [0, 1, 1, 1, 1, 0],
  [0, 0, 0, 0, 0, 0],
];
// Borda vertical: responde quando o lado direito da janela é mais claro que o esquerdo.
const KERNEL: Grid = [
  [-1, 0, 1],
  [-1, 0, 1],
  [-1, 0, 1],
];
const K = KERNEL.length;

/** Convolução "valid", sem padding e com passo 1 (a correlação cruzada que os frameworks chamam de conv). */
const convolve = (image: Grid, kernel: Grid): Grid =>
  Array.from({ length: image.length - K + 1 }, (_, row) =>
    Array.from({ length: image[0].length - K + 1 }, (__, col) =>
      kernel.reduce((sum, kernelRow, i) => sum + kernelRow.reduce((inner, weight, j) => inner + weight * image[row + i][col + j], 0), 0),
    ),
  );
const reluGrid = (grid: Grid) => grid.map((row) => row.map((value) => Math.max(0, value)));
const maxPool = (grid: Grid, size: number): Grid =>
  Array.from({ length: grid.length / size }, (_, row) =>
    Array.from({ length: grid[0].length / size }, (__, col) =>
      Math.max(...grid.slice(row * size, row * size + size).flatMap((line) => line.slice(col * size, col * size + size))),
    ),
  );

const featureMap = convolve(IMAGE, KERNEL);
const activated = reluGrid(featureMap);
const pooled = maxPool(activated, 2);

const flatMap = featureMap.flat();
const peak = Math.max(...flatMap);
const peakIndex = flatMap.indexOf(peak);
const peakRow = Math.floor(peakIndex / featureMap[0].length);
const peakCol = peakIndex % featureMap[0].length;
const trough = Math.min(...flatMap);
const troughLabel = String(trough).replace("-", "−");
const peakWindow = IMAGE.slice(peakRow, peakRow + K).map((line) => line.slice(peakCol, peakCol + K));
const leftColumn = peakWindow.reduce((sum, line) => sum + line[0], 0);
const rightColumn = peakWindow.reduce((sum, line) => sum + line[K - 1], 0);

// Parâmetros: camada densa de 28 × 28 para 28 × 28 contra filtros 3 × 3.
const SIDE = 28;
const denseParams = SIDE * SIDE * (SIDE * SIDE) + SIDE * SIDE;
const oneFilter = K * K + 1;
const RGB = 3;
const FILTERS = 32;
const rgbLayer = K * K * RGB * FILTERS + FILTERS;
const receptiveField = (layers: number) => 1 + layers * (K - 1);

const labels = (count: number) => Array.from({ length: count }, (_, index) => String(index));
const grid = (id: string, values: Grid, extra: Partial<MatrixSpec> = {}): MatrixSpec => ({
  id,
  piece: "matrix",
  rows: labels(values.length),
  cols: labels(values[0].length),
  values,
  showValues: true,
  color: "module-02",
  ...extra,
});

const cnn = (active: string, done?: string[]): BlockDiagramSpec => ({
  id: "cnn",
  piece: "block-diagram",
  blocks: [
    { id: "photo", kind: "documents", label: "imagem", col: 0, row: 0 },
    { id: "conv", kind: "embedding", label: "conv 3×3", col: 1, row: 0 },
    { id: "pool", kind: "retrieval", label: "pooling", col: 2, row: 0 },
    { id: "dense", kind: "llm", label: "camada densa", col: 3, row: 0 },
    { id: "answer", kind: "answer", label: "é um 1", col: 3, row: 1 },
  ],
  edges: [
    { from: "photo", to: "conv", label: "pixels" },
    { from: "conv", to: "pool", label: "mapas" },
    { from: "pool", to: "dense" },
    { from: "dense", to: "answer" },
  ],
  active,
  ...(done ? { done } : {}),
});

const lesson: LessonContent = {
  id: "02-08",
  subtitle: "Uma lupa que desliza pela imagem procurando o mesmo padrão em todo lugar: convolução, mapas de features e pooling, com a conta feita célula a célula.",
  objectives: [
    "Calcular uma convolução 3 × 3 sobre uma imagem pequena",
    "Ler um mapa de features e o efeito do pooling",
    "Explicar por que compartilhar pesos economiza parâmetros",
    "Comparar CNNs e Vision Transformers",
  ],
  steps: [
    {
      id: "magnifier",
      shortTitle: "A ideia",
      title: "Uma lupa que procura o mesmo padrão em todo lugar",
      tag: "context",
      body: [
        "Para achar o Wally, você passa os olhos pela página procurando o mesmo padrão, o gorro listrado, em cada pedaço. Não precisa de um detector diferente para o canto esquerdo e outro para o direito. Uma [[CNN|cnn]] faz igual: um filtro pequeno desliza pela imagem e responde forte onde o padrão aparece.",
        "Isso vem de duas apostas sobre imagens: o que importa é local (pixels vizinhos se relacionam) e o mesmo padrão pode aparecer em qualquer posição. Uma camada densa ignora as duas e liga cada pixel a cada neurônio. A [[convolução|convolution]] usa os mesmos poucos pesos em todas as posições.",
      ],
      keyIdea: "Convolução = o mesmo detector pequeno aplicado em todas as posições da imagem.",
      scene: { kind: "pieces", layout: "single", pieces: [cnn("conv")] },
      alt: "Uma imagem passa por uma camada de convolução 3 por 3, em destaque, que gera mapas; o pooling reduz os mapas e uma camada densa responde que é um 1.",
    },
    {
      id: "window",
      shortTitle: "Janela",
      title: "Um filtro de 3 × 3 sobre a imagem",
      tag: "mechanism",
      body: [
        "À esquerda está a imagem de 6 × 6, um “1” com base, em que 1 é tinta e 0 é fundo. À direita, o [[kernel|convolution-kernel]]: uma grade de 3 × 3 pesos com −1 na coluna esquerda e 1 na direita. Ele responde quando a direita da janela é mais clara que a esquerda, ou seja, uma borda vertical.",
        `Para cada posição, a janela de 3 × 3 da imagem é multiplicada célula a célula pelo kernel e tudo é somado. Na janela que começa na linha ${peakRow} e coluna ${peakCol}, a coluna esquerda soma ${leftColumn} e a direita soma ${rightColumn}: o resultado é ${rightColumn} − ${leftColumn} = ${peak}, a resposta mais forte da imagem.`,
      ],
      keyIdea: "Cada saída é um produto escalar entre o kernel e uma janela da imagem.",
      scene: {
        kind: "pieces",
        layout: "row",
        pieces: [
          grid("image", IMAGE, { highlight: { row: peakRow + 1, col: peakCol + 1 }, scale: { min: 0, max: 1 } }),
          grid("kernel", KERNEL, { highlight: { row: 1, col: 2 } }),
        ],
      },
      alt: `A imagem de 6 por 6 com o centro da janela mais forte em destaque, ao lado do kernel de borda vertical, com −1 na coluna esquerda e 1 na direita.`,
    },
    {
      id: "feature-map",
      shortTitle: "Mapa",
      title: "O mapa de onde o padrão aparece",
      tag: "mechanism",
      body: [
        `Deslizando o kernel por todas as ${featureMap.length} × ${featureMap[0].length} posições, sai o [[mapa de features|feature-map]]. Valores altos marcam onde a tinta começa vindo da esquerda: a borda esquerda do traço. O valor ${troughLabel} aparece na borda direita, onde a tinta termina.`,
        `Uma camada real aprende dezenas de kernels, cada um gerando o seu mapa: bordas em vários ângulos, cantos, texturas. A camada seguinte convoluciona esses mapas, e cada neurônio passa a enxergar uma área maior da imagem original, o [[campo receptivo|receptive-field]]: com kernels 3 × 3, são ${receptiveField(1)} × ${receptiveField(1)} pixels numa camada, ${receptiveField(2)} × ${receptiveField(2)} em duas e ${receptiveField(3)} × ${receptiveField(3)} em três.`,
      ],
      keyIdea: "O mapa de features é a imagem reescrita como “onde está este padrão”.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [grid("feature-map", featureMap, { highlight: { row: peakRow, col: peakCol } })],
      },
      alt: `Mapa de features de 4 por 4: os maiores valores, ${peak}, marcam a borda esquerda do traço, e os menores, ${troughLabel}, a borda direita.`,
    },
    {
      id: "pooling",
      shortTitle: "Pooling",
      title: "Resumir o mapa e contar os pesos",
      tag: "example",
      body: [
        `Depois de uma ReLU, que zera os negativos, o [[pooling|pooling]] reduz o mapa: o max pooling de 2 × 2 fica com o maior valor de cada bloco. O mapa de 4 × 4 vira 2 × 2, com [${pooled.map((line) => line.join("; ")).join("] e [")}]. A rede perde a posição exata e guarda “tem borda nesta região”.`,
        `Agora compare o custo. Uma camada densa de uma imagem de 28 × 28 para outra de 28 × 28 tem ${thousands(denseParams)} parâmetros. Um kernel 3 × 3 tem ${oneFilter}, contando o viés. Mesmo uma camada com ${FILTERS} kernels sobre uma imagem colorida (3 canais) tem só ${thousands(rgbLayer)}, e funciona em imagens de qualquer tamanho.`,
      ],
      keyIdea: "Pesos compartilhados tornam a convolução milhares de vezes mais barata que uma camada densa sobre pixels.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          grid("pooled", pooled, { highlight: { row: 0, col: 0 } }),
          {
            id: "params",
            piece: "metrics-panel",
            metrics: [
              { id: "dense", label: "densa 28×28 → 28×28", value: thousands(denseParams), color: "danger" },
              { id: "kernel", label: "um kernel 3×3", value: String(oneFilter), color: "success" },
              { id: "rgb", label: `${FILTERS} kernels, 3 canais`, value: thousands(rgbLayer) },
            ],
            highlight: "kernel",
          },
        ],
      },
      alt: `O mapa depois da ReLU e do max pooling, com 2 por 2 valores; o painel compara ${thousands(denseParams)} parâmetros de uma camada densa com ${oneFilter} de um kernel 3 por 3.`,
    },
    {
      id: "vit",
      shortTitle: "CNN ou ViT",
      title: "As apostas da CNN têm preço",
      tag: "tradeoff",
      body: [
        "As apostas de localidade e de pesos compartilhados são um viés indutivo: ajudam muito quando há poucos dados, porque a rede não precisa descobrir sozinha que pixels vizinhos importam. O outro lado é que relações distantes na imagem só aparecem depois de muitas camadas.",
        "O Vision Transformer (ViT) corta a imagem em pedaços de 16 × 16 pixels, trata cada pedaço como um token e usa attention, que relaciona qualquer par de pedaços desde a primeira camada. No paper original, o ViT só superou as melhores CNNs quando pré-treinado em datasets bem maiores que o ImageNet.",
      ],
      keyIdea: "CNN: viés forte, ótima com poucos dados. ViT: viés fraco, ganha com muitos dados.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "versus",
            piece: "block-diagram",
            blocks: [
              { id: "image", kind: "documents", label: "imagem", col: 0, row: 0.5 },
              { id: "cnn", kind: "embedding", label: "conv + pool", col: 1, row: 0 },
              { id: "patches", kind: "tokens", label: "patches 16×16", col: 1, row: 1 },
              { id: "vit", kind: "llm", label: "transformer", col: 2, row: 1 },
              { id: "class", kind: "answer", label: "classe", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "image", to: "cnn", label: "vizinhança" },
              { from: "cnn", to: "class" },
              { from: "image", to: "patches", variant: "alternative" },
              { from: "patches", to: "vit", label: "attention", variant: "alternative" },
              { from: "vit", to: "class" },
            ],
            active: "cnn",
          },
        ],
      },
      alt: "A mesma imagem pode passar por convolução e pooling, em destaque, ou ser cortada em patches de 16 por 16 que entram num Transformer; os dois caminhos chegam à classe.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Convolução, ativação, pooling",
      tag: "summary",
      body: [
        "Uma CNN empilha blocos de convolução, ReLU e pooling: kernels pequenos deslizam pela imagem, geram mapas de features, e o pooling resume os mapas. As primeiras camadas acham bordas; as últimas, partes e objetos.",
        "As imagens têm estrutura no espaço. Texto e áudio têm estrutura no tempo, numa ordem. A próxima aula mostra a rede feita para sequências: a RNN.",
      ],
      keyIdea: "CNN = pesos compartilhados no espaço; a próxima arquitetura compartilha pesos no tempo.",
      scene: { kind: "pieces", layout: "single", pieces: [cnn("answer", ["photo", "conv", "pool", "dense"])] },
      alt: "A imagem passou por convolução, pooling e camada densa; a resposta, é um 1, está em destaque.",
    },
  ],
  realWorldExample:
    "Nos anos 1990, Yann LeCun e colegas usaram redes convolucionais da família LeNet para ler dígitos escritos à mão, e o sistema foi usado para ler o valor de cheques em bancos americanos. Em 2012, a AlexNet levou a mesma ideia, com mais camadas e GPUs, a vencer o ImageNet.",
  code: {
    language: "python",
    source: `import torch
import torch.nn.functional as F

image = torch.tensor([
    [0, 0, 1, 1, 0, 0],
    [0, 0, 1, 1, 0, 0],
    [0, 0, 1, 1, 0, 0],
    [0, 0, 1, 1, 0, 0],
    [0, 1, 1, 1, 1, 0],
    [0, 0, 0, 0, 0, 0],
], dtype=torch.float32).view(1, 1, 6, 6)        # lote, canais, altura, largura
kernel = torch.tensor([[-1., 0., 1.]] * 3).view(1, 1, 3, 3)

feature_map = F.conv2d(image, kernel)           # 1 x 1 x 4 x 4
pooled = F.max_pool2d(F.relu(feature_map), 2)   # 1 x 1 x 2 x 2
print(feature_map.squeeze(), pooled.squeeze())`,
    caption: "A mesma convolução da aula com F.conv2d, seguida de ReLU e max pooling 2 × 2.",
  },
  tradeOffs: {
    pros: [
      "Poucos parâmetros: o mesmo kernel serve para a imagem inteira",
      "Acha o padrão em qualquer posição da imagem",
      "Funciona bem com menos dados do que um Transformer de visão",
    ],
    cons: [
      "Relações distantes na imagem só aparecem depois de muitas camadas",
      "O pooling joga fora a posição exata, ruim para tarefas que precisam dela",
      "O viés de localidade pode limitar quando há dados de sobra",
    ],
    alternatives: ["Vision Transformer (ViT) para dados em grande escala", "Modelos híbridos com convoluções nas primeiras camadas e attention depois"],
  },
  knowledgeCheck: [
    {
      id: "conv-output",
      prompt: "Uma convolução 3 × 3, sem padding e com passo 1, é aplicada a uma imagem de 10 × 10. Qual é o tamanho do mapa de features?",
      options: ["10 × 10", "8 × 8", "7 × 7", "3 × 3"],
      correct: 1,
      explanation: "A janela cabe em 10 − 3 + 1 = 8 posições por eixo, então o mapa tem 8 × 8.",
      lesson: "02-08",
    },
    {
      id: "shared-weights",
      prompt: "Por que uma camada convolucional com 16 kernels de 3 × 3 tem muito menos parâmetros que uma camada densa sobre a mesma imagem?",
      options: [
        "Porque ela ignora metade dos pixels",
        "Porque os mesmos 9 pesos de cada kernel são reusados em todas as posições da imagem",
        "Porque usa números de menor precisão",
        "Porque não tem viés",
      ],
      correct: 1,
      explanation: "O kernel desliza pela imagem com os mesmos pesos. O número de parâmetros depende do tamanho do kernel e do número de kernels, não do tamanho da imagem.",
      lesson: "02-08",
    },
  ],
  related: ["02-07", "02-09", "00-05"],
  references: [
    { title: "CS231n: Convolutional Neural Networks", url: "https://cs231n.github.io/convolutional-networks/", kind: "article" },
    { title: "An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale", url: "https://arxiv.org/abs/2010.11929", kind: "paper" },
    { title: "PyTorch: torch.nn.Conv2d", url: "https://pytorch.org/docs/stable/generated/torch.nn.Conv2d.html", kind: "docs" },
  ],
};

export default lesson;
