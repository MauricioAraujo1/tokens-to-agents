import type { BlockDiagramSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Um neurônio decide se vale ir à praia. Entradas, pesos e viés escritos à mão; a soma ponderada,
// a sigmoid e a curva do viés são calculadas aqui.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).replace("-", "−");
const percent = (value: number) => `${Math.round(value * 100)}%`;
const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

const signals = [
  { name: "sol", x: 1, w: 2 },
  { name: "calor", x: 0.8, w: 1.5 },
  { name: "chuva", x: 0.6, w: -3 },
];
const BIAS = -1;

const contributions = signals.map((signal) => signal.x * signal.w);
const weightedSum = contributions.reduce((total, value) => total + value, 0);
const z = weightedSum + BIAS;
const output = sigmoid(z);
const rain = signals[2];
const rainContribution = contributions[2];

// O mesmo neurônio com vieses de −4 a 2: o viés desloca o ponto em que a decisão vira.
const biasGrid = [-4, -3, -2, -1, 0, 1, 2];
const biasCurve = biasGrid.map((bias) => ({ label: bias > 0 ? `+${bias}` : String(bias), value: Number(sigmoid(weightedSum + bias).toFixed(3)) }));
const strictest = biasCurve[0];
const loosest = biasCurve[biasCurve.length - 1];

const tokenLabels = [...signals.map((signal) => signal.name), "viés"];
const magnitudes = [...contributions, BIAS].map(Math.abs);
const largest = Math.max(...magnitudes);

const neuron = (active: string, done?: string[]): BlockDiagramSpec => ({
  id: "neuron",
  piece: "block-diagram",
  blocks: [
    { id: "inputs", kind: "embedding", label: "sol, calor, chuva", col: 0, row: 0 },
    { id: "sum", kind: "eval", label: "Σ w·x + b", col: 1, row: 0 },
    { id: "activation", kind: "llm", label: "sigmoid", col: 2, row: 0 },
    { id: "decision", kind: "answer", label: `${percent(output)} praia`, col: 3, row: 0 },
  ],
  edges: [
    { from: "inputs", to: "sum", label: "× pesos" },
    { from: "sum", to: "activation", label: `z = ${fixed(z, 1)}` },
    { from: "activation", to: "decision" },
  ],
  active,
  ...(done ? { done } : {}),
});

const lesson: LessonContent = {
  id: "02-03",
  subtitle: "A peça básica da rede: uma soma ponderada mais um viés, passada por uma ativação. O que cada número significa e como ele muda a decisão.",
  objectives: [
    "Calcular a saída de um neurônio a partir das entradas, dos pesos e do viés",
    "Interpretar o sinal e o tamanho de um peso",
    "Explicar o papel do viés como limiar ajustável",
    "Ver uma camada como vários neurônios lendo a mesma entrada",
  ],
  steps: [
    {
      id: "beach",
      shortTitle: "Neurônio",
      title: "Um neurônio decide se você vai à praia",
      tag: "context",
      body: [
        "Você olha três sinais antes de ir à praia: se tem sol, se está calor e se vai chover. Nem todos pesam igual: chuva estraga o passeio mais do que o calor ajuda. Um [[neurônio|neuron]] artificial faz exatamente isso: dá um peso a cada sinal, soma tudo e decide.",
        "A inspiração vem do neurônio biológico, que dispara quando os estímulos somados passam de um limiar, mas a versão artificial é bem mais simples: z = w₁·x₁ + w₂·x₂ + w₃·x₃ + b, e depois uma ativação transforma z na saída. É só isso, repetido milhões de vezes numa rede.",
      ],
      keyIdea: "Neurônio artificial = soma ponderada das entradas + viés, passada por uma função de ativação.",
      scene: { kind: "pieces", layout: "single", pieces: [neuron("sum")] },
      alt: "Os sinais sol, calor e chuva são multiplicados pelos pesos e somados com o viés, em destaque; a sigmoid transforma a soma numa decisão.",
    },
    {
      id: "weights",
      shortTitle: "Pesos",
      title: "Cada peso diz quanto um sinal importa",
      tag: "mechanism",
      body: [
        `Na tabela, cada linha é um sinal: o valor x, o [[peso|weight]] w e a contribuição x · w. Sol entra com peso ${fixed(signals[0].w, 1)} e calor com ${fixed(signals[1].w, 1)}: os dois empurram a favor. Chuva tem peso ${fixed(rain.w, 1)}: com x = ${fixed(rain.x, 1)}, contribui ${fixed(rainContribution, 1)}, contra o passeio.`,
        "O sinal do peso diz a direção (a favor ou contra) e o tamanho diz a força. Peso perto de zero quer dizer “esse sinal não importa”. Ninguém escreve esses números numa rede real: o treino os ajusta até as decisões baterem com os exemplos.",
      ],
      keyIdea: "Peso positivo puxa a favor, negativo puxa contra, e o tamanho diz o quanto.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "weights",
            piece: "matrix",
            rows: signals.map((signal) => signal.name),
            cols: ["x", "w", "x·w"],
            values: signals.map((signal, index) => [signal.x, signal.w, contributions[index]]),
            highlight: { row: 2, col: 2 },
            showValues: true,
            color: "module-02",
          },
        ],
      },
      alt: `Tabela com os três sinais, os seus pesos e as contribuições; a chuva, em destaque, contribui ${fixed(rainContribution, 1)} contra o passeio.`,
    },
    {
      id: "bias",
      shortTitle: "Viés",
      title: "O viés é a exigência do neurônio",
      tag: "mechanism",
      body: [
        `O [[viés|bias]] é um número somado no fim, que não depende das entradas. Pense nele como o seu humor: com viés muito negativo você só vai à praia num dia perfeito; com viés positivo, vai até nublado. Com as mesmas entradas, a soma dos sinais é ${fixed(weightedSum, 1)}, e o gráfico mostra a saída para vieses de −4 a +2.`,
        `Com viés −4, a chance cai para ${percent(strictest.value)}; com +2, sobe para ${percent(loosest.value)}. Geometricamente, os pesos definem a inclinação da fronteira de decisão e o viés a desloca. Sem viés, toda fronteira teria que passar pela origem, o que limita muito o que o neurônio aprende.`,
      ],
      keyIdea: "O viés é um limiar aprendido: desloca o ponto em que a saída passa de “não” para “sim”.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "bias-curve",
            piece: "chart",
            kind: "line",
            series: biasCurve,
            max: 1,
            cutoff: { mode: "threshold", value: 0.5, label: "50%" },
            highlight: biasGrid.indexOf(BIAS),
            color: "module-02",
          },
        ],
      },
      alt: `Curva da saída do neurônio para vieses de −4 a +2: sobe de ${percent(strictest.value)} a ${percent(loosest.value)}, cruzando 50% entre os vieses −2 e −1; o viés usado na aula, −1, está em destaque.`,
    },
    {
      id: "compute",
      shortTitle: "A conta",
      title: "A conta completa",
      tag: "example",
      body: [
        `Somando as contribuições, ${contributions.map((value, index) => (index === 0 ? fixed(value, 1) : value < 0 ? `− ${fixed(-value, 1)}` : `+ ${fixed(value, 1)}`)).join(" ")} = ${fixed(weightedSum, 1)}. Com o viés ${fixed(BIAS, 0)}, z = ${fixed(z, 1)}. A sigmoid, σ(z) = 1 / (1 + e^(−z)), espreme qualquer número entre 0 e 1: σ(${fixed(z, 1)}) = ${fixed(output, 3)}, ou ${percent(output)}.`,
        "As barras mostram o tamanho de cada parcela. A chuva quase anula o sol, e o viés ainda pesa contra. Se a previsão de chuva subir para 1, a contribuição dela vai a −3 e a decisão vira: é assim que um neurônio é sensível às entradas que têm peso grande.",
      ],
      keyIdea: "z = Σ wᵢ·xᵢ + b, saída = ativação(z). Todo neurônio da rede faz só isso.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "result",
            piece: "metrics-panel",
            metrics: [
              { id: "sum", label: "Σ w·x", value: fixed(weightedSum, 1) },
              { id: "z", label: "z = Σ + b", value: fixed(z, 1) },
              { id: "out", label: "σ(z)", value: percent(output), color: "module-02" },
            ],
            highlight: "out",
          },
          {
            id: "parts",
            piece: "token-stream",
            tokens: tokenLabels,
            bars: magnitudes.map((value) => value / largest),
            color: "module-02",
          },
        ],
      },
      alt: `Painel com a soma ponderada ${fixed(weightedSum, 1)}, z igual a ${fixed(z, 1)} e saída de ${percent(output)}; barras com o tamanho de cada parcela: sol, calor, chuva e viés.`,
    },
    {
      id: "layer",
      shortTitle: "Camada",
      title: "Um neurônio só é limitado",
      tag: "tradeoff",
      body: [
        "Um neurônio sozinho só traça uma fronteira reta: foi o argumento de Minsky e Papert, em 1969, contra o perceptron, que não aprendia o XOR. A saída é juntar vários neurônios lendo a mesma entrada, cada um com os seus pesos, e formar uma camada.",
        "Numa camada com m neurônios, os pesos viram uma matriz W de n × m, os vieses um vetor b, e a saída inteira sai de uma conta: h = ativação(x · W + b). Um cuidado prático: se as entradas têm escalas muito diferentes (metros e milímetros), os pesos ficam desequilibrados; por isso se normalizam as entradas antes.",
      ],
      keyIdea: "Uma camada é um monte de neurônios em paralelo, e isso cabe numa multiplicação de matriz.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "layer",
            piece: "block-diagram",
            blocks: [
              { id: "x", kind: "embedding", label: "entrada x", col: 0, row: 0.5 },
              { id: "n1", kind: "llm", label: "neurônio 1", col: 1, row: 0 },
              { id: "n2", kind: "llm", label: "neurônio 2", col: 1, row: 1 },
              { id: "h", kind: "embedding", label: "vetor h", col: 2, row: 0.5 },
              { id: "w", kind: "memory", label: "matriz W, b", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "x", to: "n1" },
              { from: "x", to: "n2" },
              { from: "n1", to: "h" },
              { from: "n2", to: "h" },
              { from: "w", to: "h", label: "x · W + b" },
            ],
            active: "h",
          },
        ],
      },
      alt: "A mesma entrada vai para dois neurônios em paralelo, que formam o vetor h, em destaque; os pesos de todos cabem numa matriz W com o vetor de vieses b.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Pesos, viés e ativação",
      tag: "summary",
      body: [
        "Um neurônio multiplica cada entrada por um peso, soma, acrescenta o viés e aplica uma ativação. Os pesos dizem o que importa e em que direção; o viés diz quanta evidência é preciso para dizer sim.",
        "A próxima aula olha para a última peça da conta: a função de ativação. Você vai ver por que a sigmoid daqui foi trocada pela ReLU na maioria das redes, e o que isso tem a ver com treinar redes profundas.",
      ],
      keyIdea: "Treinar uma rede é ajustar milhões de pesos e vieses como esses.",
      scene: { kind: "pieces", layout: "single", pieces: [neuron("decision", ["inputs", "sum", "activation"])] },
      alt: `Os sinais, a soma ponderada e a sigmoid já calculados; a decisão final, ${percent(output)} de ir à praia, em destaque.`,
    },
  ],
  realWorldExample:
    "O perceptron de Frank Rosenblatt, de 1958, era um neurônio desses feito em hardware: o Mark I Perceptron lia imagens numa grade de 400 fotocélulas (20 por 20) e ajustava os pesos com potenciômetros girados por motores elétricos.",
  code: {
    language: "python",
    source: `import numpy as np

x = np.array([1.0, 0.8, 0.6])    # sol, calor, chuva
w = np.array([2.0, 1.5, -3.0])   # pesos
b = -1.0                          # viés

z = x @ w + b                     # 0.4
print(1 / (1 + np.exp(-z)))       # 0.599`,
    caption: "O neurônio da aula: produto escalar entre entradas e pesos, mais o viés, e a sigmoid no fim.",
  },
  tradeOffs: {
    pros: [
      "Conta simples e barata, fácil de calcular em paralelo",
      "Pesos e viés têm leitura direta: direção, força e limiar",
      "Diferenciável, o que permite ajustar os números com gradientes",
    ],
    cons: [
      "Um neurônio só traça uma fronteira reta",
      "Sensível à escala das entradas: precisa de normalização",
      "Numa rede grande, os pesos individuais deixam de ter significado fácil de ler",
    ],
    alternatives: ["Regressão logística, que é exatamente um neurônio com sigmoid", "Camadas de vários neurônios para fronteiras curvas"],
  },
  knowledgeCheck: [
    {
      id: "negative-weight",
      prompt: "Num neurônio que detecta spam, a palavra “reunião” ficou com peso −2,5 depois do treino. O que isso indica?",
      options: [
        "Que a palavra não importa",
        "Que a presença da palavra puxa forte a decisão para “não é spam”",
        "Que o neurônio está com defeito",
        "Que a palavra puxa para spam",
      ],
      correct: 1,
      explanation: "O sinal do peso é a direção e o tamanho é a força. Um peso negativo grande empurra a soma para baixo quando a palavra aparece.",
      lesson: "02-03",
    },
    {
      id: "bias-shift",
      prompt: "Um neurônio com sigmoid dispara demais, mesmo com entradas fracas. Mudando só um número, qual ajuste faz ele ficar mais exigente?",
      options: ["Aumentar o viés", "Diminuir o viés", "Trocar a sigmoid por uma reta", "Dobrar todas as entradas"],
      correct: 1,
      explanation: "Diminuir o viés desloca z para baixo em qualquer entrada, então é preciso mais evidência para a saída passar de 50%.",
      lesson: "02-03",
    },
  ],
  related: ["02-02", "02-04", "01-05"],
  references: [
    { title: "Perceptron (Wikipedia)", url: "https://en.wikipedia.org/wiki/Perceptron", kind: "article" },
    { title: "PyTorch: torch.nn.Linear", url: "https://pytorch.org/docs/stable/generated/torch.nn.Linear.html", kind: "docs" },
    { title: "Deep Learning (Goodfellow, Bengio & Courville), livro aberto", url: "https://www.deeplearningbook.org/", kind: "article" },
  ],
};

export default lesson;
