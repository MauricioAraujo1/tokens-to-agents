import type { GraphSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Uma rede de brinquedo 3-4-2 para contar parâmetros, o colapso de duas camadas lineares numa só
// (x · W1 · W2 = x · (W1 · W2)) e o tamanho de redes densas para o MNIST. Tudo calculado aqui.

type Matrix = number[][];

const fixed = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).replace("-", "−");
const thousands = (value: number) => value.toLocaleString("pt-BR");

/** Vetor linha × matriz. */
const project = (x: number[], weights: Matrix) =>
  weights[0].map((_, col) => x.reduce((total, value, row) => total + value * weights[row][col], 0));
/** Matriz × matriz. */
const multiply = (a: Matrix, b: Matrix) => a.map((row) => project(row, b));
const relu = (values: number[]) => values.map((value) => Math.max(0, value));

/** Pesos (entrada × saída) mais um viés por neurônio, camada a camada. */
const mlpParams = (sizes: number[]) =>
  sizes.slice(1).reduce((total, size, index) => total + sizes[index] * size + size, 0);

// Rede de brinquedo: 3 entradas, 4 neurônios escondidos, 2 saídas.
const TOY = [3, 4, 2];
const toyWeights = TOY.slice(1).reduce((total, size, index) => total + TOY[index] * size, 0);
const toyBiases = TOY.slice(1).reduce((total, size) => total + size, 0);
const toyTotal = mlpParams(TOY);

// Duas camadas lineares sem ativação colapsam numa só.
const W1: Matrix = [
  [1, -1, 0.5],
  [0.5, 2, -1],
];
const W2: Matrix = [
  [1, 0],
  [0.5, -1],
  [-1, 1],
];
const X = [1, 2];
const hidden = project(X, W1);
const twoLayers = project(hidden, W2);
const combined = multiply(W1, W2);
const oneLayer = project(X, combined);
const withRelu = project(relu(hidden), W2);

// Redes densas para o MNIST: imagem de 28 × 28 = 784 pixels e 10 dígitos na saída.
const PIXELS = 28 * 28;
const DIGITS = 10;
const mnistNets = [
  { label: "linear", hidden: [] as number[] },
  { label: "32", hidden: [32] },
  { label: "128", hidden: [128] },
  { label: "512", hidden: [512] },
  { label: "128+128", hidden: [128, 128] },
].map((net) => ({ ...net, params: mlpParams([PIXELS, ...net.hidden, DIGITS]) }));
const net128 = mnistNets[2];
const net512 = mnistNets[3];
const netDeep = mnistNets[4];

const inputs = ["x1", "x2", "x3"];
const hiddenIds = ["h1", "h2", "h3", "h4"];
const outputs = ["y1", "y2"];
const column = (count: number, index: number) => (count === 1 ? 0.5 : index / (count - 1));

const network = (highlight: string[]): GraphSpec => ({
  id: "network",
  piece: "graph",
  nodes: [
    ...inputs.map((id, index) => ({ id, label: id, x: 0, y: 0.15 + 0.35 * index })),
    ...hiddenIds.map((id, index) => ({ id, label: id, x: 0.5, y: column(hiddenIds.length, index), color: "module-02" as const })),
    ...outputs.map((id, index) => ({ id, label: id, x: 1, y: 0.3 + 0.4 * index })),
  ],
  edges: [
    ...inputs.flatMap((from) => hiddenIds.map((to) => ({ from, to, weight: 0.2 }))),
    ...hiddenIds.flatMap((from) => outputs.map((to) => ({ from, to, weight: 0.2 }))),
  ],
  highlight,
});

const lesson: LessonContent = {
  id: "02-02",
  subtitle: "Camadas de neurônios ligadas por pesos: como a rede é montada, quantos números ela guarda e por que precisa de não linearidade.",
  objectives: [
    "Descrever uma rede em camadas de entrada, escondidas e de saída",
    "Contar os parâmetros de uma rede densa",
    "Mostrar por que camadas sem ativação colapsam numa camada só",
    "Comparar redes mais largas e mais profundas",
  ],
  steps: [
    {
      id: "digit",
      shortTitle: "Para que serve",
      title: "Uma função que lê uma imagem",
      tag: "context",
      body: [
        "Uma foto de um dígito escrito à mão, com 28 por 28 pixels, vira uma lista de 784 números de brilho. A [[rede neural|neural-network]] recebe essa lista e devolve 10 números, um por dígito: o maior é o palpite. Por dentro, ela é só uma sequência de contas com números ajustáveis.",
        "Essas contas ficam organizadas em camadas. A camada de entrada é a lista de pixels, as [[camadas escondidas|hidden-layer]] transformam os números, e a camada de saída dá a resposta. Quando cada neurônio de uma camada liga com todos da seguinte, a rede se chama [[multilayer perceptron (MLP)|multilayer-perceptron]], ou rede densa.",
      ],
      keyIdea: "Uma rede neural é uma função com milhares de botões ajustáveis, organizada em camadas.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "image", kind: "documents", label: "imagem 28×28", col: 0, row: 0 },
              { id: "pixels", kind: "embedding", label: "784 números", col: 1, row: 0 },
              { id: "net", kind: "llm", label: "rede", col: 2, row: 0 },
              { id: "answer", kind: "answer", label: "é um 7", col: 3, row: 0 },
            ],
            edges: [
              { from: "image", to: "pixels", label: "achatar" },
              { from: "pixels", to: "net" },
              { from: "net", to: "answer", label: "10 notas" },
            ],
            active: "net",
          },
        ],
      },
      alt: "Uma imagem de 28 por 28 pixels vira 784 números, que entram na rede, em destaque; a rede devolve 10 notas e responde que é um 7.",
    },
    {
      id: "layers",
      shortTitle: "Camadas",
      title: "Entrada, escondida e saída",
      tag: "mechanism",
      body: [
        `Na rede de brinquedo da cena, 3 entradas ligam em 4 neurônios escondidos, que ligam em 2 saídas. Cada linha é um peso: são ${TOY[0]} × ${TOY[1]} + ${TOY[1]} × ${TOY[2]} = ${toyWeights} pesos. Cada neurônio escondido e de saída tem ainda um viés, mais ${toyBiases} números.`,
        `Ao todo, ${toyTotal} [[parâmetros|parameter]]. A regra vale para qualquer camada densa: entradas × saídas + saídas. Em código, uma camada é uma multiplicação de matriz, h = x · W + b, e a rede inteira é uma sequência delas com uma [[função de ativação|activation-function]] entre uma e outra.`,
      ],
      keyIdea: "Camada densa com n entradas e m saídas tem n · m pesos e m vieses.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          network(hiddenIds),
          {
            id: "count",
            piece: "metrics-panel",
            metrics: [
              { id: "weights", label: "pesos", value: String(toyWeights) },
              { id: "biases", label: "vieses", value: String(toyBiases) },
              { id: "total", label: "parâmetros", value: String(toyTotal), color: "module-02" },
            ],
            highlight: "total",
          },
        ],
      },
      alt: `Grafo de uma rede com 3 entradas, 4 neurônios escondidos em destaque e 2 saídas, todos ligados; o painel soma ${toyWeights} pesos e ${toyBiases} vieses, ${toyTotal} parâmetros.`,
    },
    {
      id: "collapse",
      shortTitle: "Não linear",
      title: "Sem ativação, duas camadas viram uma",
      tag: "mechanism",
      body: [
        "Se cada camada só multiplica por uma matriz, empilhar camadas não adianta nada: multiplicar por W₁ e depois por W₂ é o mesmo que multiplicar uma vez pela matriz W₁ · W₂. Dez camadas lineares têm o mesmo poder de uma.",
        `Na cena, a entrada x = [${X.join("; ")}] passa por duas camadas e sai [${twoLayers.map((value) => fixed(value)).join("; ")}]. A matriz combinada W₁ · W₂ = [[${combined[0].map((value) => fixed(value)).join("; ")}], [${combined[1].map((value) => fixed(value)).join("; ")}]] dá o mesmo resultado numa conta só. Com uma [[ReLU|relu]] no meio, a saída muda para [${withRelu.map((value) => fixed(value)).join("; ")}]: é a não linearidade que dá sentido à profundidade.`,
      ],
      keyIdea: "A função de ativação entre as camadas é o que impede a rede de virar uma multiplicação de matriz só.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "collapse",
            piece: "matrix",
            rows: ["2 camadas", "W1·W2", "com ReLU"],
            cols: ["y1", "y2"],
            values: [twoLayers, oneLayer, withRelu],
            highlight: { row: 1, col: 0 },
            showValues: true,
            color: "module-02",
          },
        ],
      },
      alt: `Saídas da mesma entrada: duas camadas lineares e a matriz combinada dão o mesmo resultado, ${fixed(twoLayers[0])} e ${fixed(twoLayers[1])}; com ReLU no meio, a saída muda.`,
    },
    {
      id: "mnist",
      shortTitle: "Tamanho",
      title: "Quanto pesa uma rede para dígitos",
      tag: "example",
      body: [
        `Aplique a regra ao MNIST, com 784 pixels e 10 dígitos. Sem camada escondida, são ${thousands(mnistNets[0].params)} parâmetros. Uma camada escondida de 128 neurônios leva a ${thousands(net128.params)}, e uma de 512, a ${thousands(net512.params)}.`,
        `Repare que quase tudo está na primeira camada, porque 784 entradas multiplicam cada neurônio. Duas camadas de 128 somam ${thousands(netDeep.params)}: bem menos que uma camada de 512, com uma etapa de representação a mais. O gráfico mostra os parâmetros em milhares.`,
      ],
      keyIdea: "O custo de uma camada densa cresce com entradas × saídas, por isso a primeira camada sobre dados brutos costuma ser a mais cara.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "sizes",
            piece: "chart",
            kind: "bar",
            series: mnistNets.map((net) => ({ label: net.label, value: Number((net.params / 1000).toFixed(1)) })),
            highlight: mnistNets.indexOf(netDeep),
            color: "module-02",
          },
        ],
      },
      alt: `Barras com os parâmetros, em milhares, de redes densas para o MNIST: de ${thousands(mnistNets[0].params)} sem camada escondida a ${thousands(net512.params)} com 512 neurônios; duas camadas de 128 somam ${thousands(netDeep.params)}.`,
    },
    {
      id: "wide-deep",
      shortTitle: "Largo ou fundo",
      title: "Mais largura ou mais profundidade",
      tag: "tradeoff",
      body: [
        "Uma rede larga tem muitos neurônios por camada; uma profunda tem muitas camadas. Largura aumenta a capacidade de uma etapa só, e o número de parâmetros cresce rápido. Profundidade deixa a rede compor ideias, mas cada camada a mais é um degrau a mais para o sinal de treino descer.",
        "Por muito tempo, redes com mais de poucas camadas não treinavam bem. Truques como ReLU, inicialização cuidadosa, normalização e conexões residuais destravaram redes com dezenas ou centenas de camadas, e é desse lado que estão os modelos atuais.",
      ],
      keyIdea: "Profundidade é mais eficiente em parâmetros, mas exige técnicas para que o treino funcione.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "shapes",
            piece: "block-diagram",
            blocks: [
              { id: "input", kind: "embedding", label: "entrada", col: 0, row: 0.5 },
              { id: "wide", kind: "llm", label: "1 camada larga", col: 1, row: 0 },
              { id: "deep-1", kind: "llm", label: "camada 1", col: 1, row: 1 },
              { id: "deep-2", kind: "llm", label: "camada 2", col: 2, row: 1 },
              { id: "out", kind: "answer", label: "saída", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "input", to: "wide" },
              { from: "wide", to: "out", label: "mais pesos" },
              { from: "input", to: "deep-1" },
              { from: "deep-1", to: "deep-2" },
              { from: "deep-2", to: "out", label: "mais etapas" },
            ],
            active: "deep-2",
          },
        ],
      },
      alt: "A mesma entrada vai para uma rede com uma camada larga ou para uma rede com duas camadas em sequência, em destaque; as duas chegam à saída.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "A rede em uma frase",
      tag: "summary",
      body: [
        "Uma rede neural é uma sequência de camadas, cada uma fazendo x · W + b seguido de uma ativação. O número de parâmetros sai de uma conta simples, e a ativação é o que dá sentido a empilhar camadas.",
        "Na próxima aula você desce ao nível de um neurônio só: o que significa cada peso, para que serve o viés e como uma soma ponderada vira uma decisão.",
      ],
      keyIdea: "Rede = camadas de (x · W + b) com ativações entre elas; o treino ajusta W e b.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "image", kind: "documents", label: "imagem 28×28", col: 0, row: 0 },
              { id: "pixels", kind: "embedding", label: "784 números", col: 1, row: 0 },
              { id: "net", kind: "llm", label: "camadas", col: 2, row: 0 },
              { id: "answer", kind: "answer", label: "é um 7", col: 3, row: 0 },
            ],
            edges: [
              { from: "image", to: "pixels" },
              { from: "pixels", to: "net" },
              { from: "net", to: "answer", label: "10 notas" },
            ],
            active: "answer",
            done: ["image", "pixels", "net"],
          },
        ],
      },
      alt: "A imagem vira 784 números, atravessa as camadas e chega à resposta, em destaque.",
    },
  ],
  realWorldExample:
    "O MNIST, de Yann LeCun e colegas, tem 70 mil imagens de dígitos escritos à mão, de 28 por 28 pixels, 60 mil para treino e 10 mil para teste. Por décadas foi o primeiro teste de quase toda rede nova, e ainda é o “olá, mundo” dos tutoriais de PyTorch e TensorFlow.",
  code: {
    language: "python",
    source: `from torch import nn

model = nn.Sequential(
    nn.Flatten(),          # 28 x 28 -> 784
    nn.Linear(784, 128),   # 784 * 128 + 128 parâmetros
    nn.ReLU(),
    nn.Linear(128, 10),    # 128 * 10 + 10 parâmetros
)

print(sum(p.numel() for p in model.parameters()))  # 101770`,
    caption: `A rede de 128 neurônios da aula em PyTorch: a contagem bate com a conta, ${thousands(net128.params)} parâmetros.`,
  },
  tradeOffs: {
    pros: [
      "Estrutura simples e genérica: a mesma receita serve para muitos problemas",
      "O tamanho é previsível: dá para calcular parâmetros e memória antes de treinar",
      "Camadas densas são multiplicações de matriz, que o hardware faz muito rápido",
    ],
    cons: [
      "Camadas densas sobre dados brutos ficam enormes: cada pixel liga em cada neurônio",
      "Não aproveitam estrutura, como vizinhança de pixels ou ordem de palavras",
      "Redes profundas sem os truques certos não treinam bem",
    ],
    alternatives: ["CNNs para imagens, que reaproveitam pesos entre posições", "RNNs e Transformers para sequências"],
  },
  knowledgeCheck: [
    {
      id: "count-params",
      prompt: "Uma camada densa recebe 100 números e tem 20 neurônios. Quantos parâmetros ela tem?",
      options: ["120", "2.000", "2.020", "2.100"],
      correct: 2,
      explanation: "São 100 × 20 = 2.000 pesos mais 20 vieses, um por neurônio: 2.020.",
      lesson: "02-02",
    },
    {
      id: "no-activation",
      prompt: "Alguém tira todas as funções de ativação de uma rede de 8 camadas. O que acontece com o que ela consegue aprender?",
      options: [
        "Nada muda, só fica mais rápida",
        "Ela passa a equivaler a uma única camada linear, porque o produto das matrizes é outra matriz",
        "Ela aprende funções mais complexas",
        "Ela para de ter parâmetros",
      ],
      correct: 1,
      explanation: "Sem não linearidade, x · W₁ · W₂ · … · W₈ é igual a x · W para W = W₁ · … · W₈. A profundidade some.",
      lesson: "02-02",
    },
  ],
  related: ["02-01", "02-03", "03-11"],
  references: [
    { title: "Deep Learning, cap. 6: Deep Feedforward Networks", url: "https://www.deeplearningbook.org/contents/mlp.html", kind: "article" },
    { title: "PyTorch: torch.nn", url: "https://pytorch.org/docs/stable/nn.html", kind: "docs" },
    { title: "3Blue1Brown: But what is a neural network?", url: "https://www.3blue1brown.com/lessons/neural-networks", kind: "article" },
  ],
};

export default lesson;
