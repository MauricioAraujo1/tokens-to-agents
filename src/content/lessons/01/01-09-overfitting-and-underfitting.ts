import { seededRandom } from "../../../lab/sampling";
import type { VectorPoint } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Polinômios de grau 0 a 9 ajustados por mínimos quadrados a 10 pontos ruidosos de y = 2 + sen(πx).
// Erro de treino e de teste por grau, a curva de grau 9 que decora o ruído e o efeito da regularização
// ridge saem das contas abaixo (equações normais resolvidas por eliminação de Gauss com pivoteamento).

interface Sample {
  x: number;
  y: number;
}

const random = seededRandom(8);
const NOISE_SCALE = 0.5;
const noise = () => (random() + random() + random() - 1.5) * NOISE_SCALE;
/** Variância do ruído: soma de 3 uniformes (1/12 cada) vezes a escala ao quadrado. É o piso do erro de teste. */
const NOISE_VARIANCE = 3 * (1 / 12) * NOISE_SCALE ** 2;
const truth = (x: number) => 2 + Math.sin(Math.PI * x);

const TRAIN_SIZE = 10;
const TEST_SIZE = 40;
const train: Sample[] = Array.from({ length: TRAIN_SIZE }, (_, index) => {
  const x = -1 + (2 * index) / (TRAIN_SIZE - 1);
  return { x, y: truth(x) + noise() };
});
const test: Sample[] = Array.from({ length: TEST_SIZE }, (_, index) => {
  const x = -0.975 + (1.95 * index) / (TEST_SIZE - 1);
  return { x, y: truth(x) + noise() };
});

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const solve = (matrix: number[][], rhs: number[]) => {
  const size = rhs.length;
  const rows = matrix.map((row, index) => [...row, rhs[index]]);
  for (let col = 0; col < size; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < size; row += 1) if (Math.abs(rows[row][col]) > Math.abs(rows[pivot][col])) pivot = row;
    [rows[col], rows[pivot]] = [rows[pivot], rows[col]];
    for (let row = 0; row < size; row += 1) {
      if (row === col) continue;
      const factor = rows[row][col] / rows[col][col];
      for (let k = col; k <= size; k += 1) rows[row][k] -= factor * rows[col][k];
    }
  }
  return rows.map((row, index) => row[size] / row[index]);
};

/** Mínimos quadrados com penalidade ridge: (XᵀX + λI) w = Xᵀy, sem penalizar a constante. */
const fitPolynomial = (degree: number, lambda = 0) => {
  const features = train.map((sample) => Array.from({ length: degree + 1 }, (_, power) => sample.x ** power));
  const normal = Array.from({ length: degree + 1 }, (_, i) =>
    Array.from({ length: degree + 1 }, (__, j) => features.reduce((sum, row) => sum + row[i] * row[j], 0) + (i === j && i > 0 ? lambda : 0)),
  );
  const rhs = Array.from({ length: degree + 1 }, (_, i) => features.reduce((sum, row, index) => sum + row[i] * train[index].y, 0));
  return solve(normal, rhs);
};
const evaluate = (weights: number[], x: number) => weights.reduce((sum, weight, power) => sum + weight * x ** power, 0);
const mse = (weights: number[], samples: Sample[]) =>
  samples.reduce((sum, sample) => sum + (evaluate(weights, sample.x) - sample.y) ** 2, 0) / samples.length;

const DEGREES = Array.from({ length: TRAIN_SIZE }, (_, degree) => degree);
const byDegree = DEGREES.map((degree) => {
  const weights = fitPolynomial(degree);
  return { degree, weights, train: mse(weights, train), test: mse(weights, test) };
});
const best = byDegree.reduce((winner, row) => (row.test < winner.test ? row : winner));
const line = byDegree[1];
const wiggly = byDegree[byDegree.length - 1];

const LAMBDA = 0.01;
const ridgeWeights = fitPolynomial(wiggly.degree, LAMBDA);
const ridge = { train: mse(ridgeWeights, train), test: mse(ridgeWeights, test) };
const sumOfSquares = (weights: number[]) => weights.slice(1).reduce((sum, weight) => sum + weight ** 2, 0);
const largestWeight = (weights: number[]) => Math.max(...weights.map(Math.abs));

const CURVE_SAMPLES = 17;
const curveXs = Array.from({ length: CURVE_SAMPLES }, (_, index) => -1 + (2 * index) / (CURVE_SAMPLES - 1));
const wigglyLow = Math.min(...test.map((sample) => evaluate(wiggly.weights, sample.x)));
const curveScene = (weights: number[], color: VectorPoint["color"]): VectorPoint[] => [
  ...train.map<VectorPoint>((sample, index) => ({ id: `t${index}`, label: "", coords: [sample.x, sample.y], color: "ink" })),
  ...curveXs.map<VectorPoint>((x, index) => ({ id: `s${index}`, label: "", coords: [x, evaluate(weights, x)], color })),
];

const lesson: LessonContent = {
  id: "01-09",
  subtitle: "Decorar não é aprender: o modelo simples demais erra tudo, o flexível demais decora o ruído, e o bom fica no meio.",
  objectives: [
    "Reconhecer underfitting e overfitting pelos erros de treino e de teste",
    "Ver a curva em U do erro de teste conforme a complexidade cresce",
    "Entender o equilíbrio entre viés e variância",
    "Aplicar regularização e outras defesas contra o overfitting",
  ],
  steps: [
    {
      id: "memorize",
      shortTitle: "Decorar",
      title: "O aluno que decorou o gabarito",
      tag: "context",
      body: [
        "Um aluno decora as respostas da lista de exercícios: tira 10 na lista e trava na prova, porque as perguntas mudaram um pouco. Outro nem estudou: vai mal nas duas. O primeiro é [[overfitting|overfitting]]; o segundo, [[underfitting|underfitting]].",
        `O que se quer de um modelo é [[generalização|generalization]]: acertar exemplos que ele nunca viu. Para ver isso acontecer, temos ${TRAIN_SIZE} pontos de treino tirados de uma curva suave com ruído, e ${TEST_SIZE} pontos novos da mesma curva para medir. Vamos ajustar polinômios de grau 0 (uma constante) até grau ${wiggly.degree}.`,
      ],
      keyIdea: "Erro baixo no treino e alto no teste é overfitting; erro alto nos dois é underfitting.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "generalize",
            piece: "block-diagram",
            blocks: [
              { id: "train", kind: "documents", label: "lista (treino)", col: 0, row: 0.5 },
              { id: "model", kind: "llm", label: "modelo", col: 1, row: 0.5 },
              { id: "seen", kind: "eval", label: "treino: nota 10", col: 2, row: 0 },
              { id: "unseen", kind: "no-result", label: "prova: trava", col: 2, row: 1 },
              { id: "goal", kind: "answer", label: "generalizar", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "train", to: "model", label: "decora" },
              { from: "model", to: "seen" },
              { from: "model", to: "unseen", label: "dado novo", variant: "alternative" },
              { from: "seen", to: "goal" },
            ],
            active: "model",
          },
        ],
      },
      alt: "A lista de treino entra no modelo, em destaque, que tira nota 10 no treino mas trava na prova com um dado novo, pelo caminho tracejado; o objetivo é generalizar.",
    },
    {
      id: "good-fit",
      shortTitle: "Sob medida",
      title: "Flexível na medida certa",
      tag: "mechanism",
      body: [
        `Uma reta (grau 1) não consegue dobrar como a curva: erra ${fixed(line.train, 3)} no treino e ${fixed(line.test, 3)} no teste, em erro quadrático médio. Isso é underfitting, também chamado de viés alto: o modelo é simples demais para o padrão.`,
        `O polinômio de grau ${best.degree}, na cena, acompanha a curva sem perseguir cada ponto. Ele erra ${fixed(best.train, 3)} no treino e ${fixed(best.test, 3)} no teste, perto do piso de ${fixed(NOISE_VARIANCE, 3)}: a variância do próprio ruído, que nenhum modelo consegue prever.`,
      ],
      keyIdea: "O melhor modelo erra no teste perto do nível de ruído dos dados, e não menos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [{ id: "curve", piece: "vector-space", points: curveScene(best.weights, "module-01") }],
      },
      alt: `Os ${TRAIN_SIZE} pontos de treino e a curva do polinômio de grau ${best.degree}, que passa entre eles seguindo uma onda suave.`,
    },
    {
      id: "wiggly",
      shortTitle: "Decoreba",
      title: "O polinômio que passa por todos os pontos",
      tag: "mechanism",
      body: [
        `Com grau ${wiggly.degree} e ${TRAIN_SIZE} pontos, existe um polinômio que passa exatamente por todos: erro de treino ${fixed(wiggly.train, 3)}. Para isso ele usa o ruído como se fosse sinal, e entre os pontos a curva oscila sem motivo, descendo até ${fixed(wigglyLow)} onde a curva real nunca fica abaixo de 1.`,
        `No teste, o erro sobe para ${fixed(wiggly.test, 3)}, pior até que a reta. É a variância alta: mude alguns pontos de treino e a curva muda inteira. O sinal de alerta é sempre o mesmo, a distância entre o erro de treino e o de teste. O maior peso desse polinômio vale ${fixed(largestWeight(wiggly.weights), 0)}, contra ${fixed(largestWeight(best.weights), 1)} no de grau ${best.degree}.`,
      ],
      keyIdea: "Overfitting: o modelo tem liberdade para decorar o ruído, e ela aparece como pesos enormes e oscilação.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [{ id: "curve", piece: "vector-space", points: curveScene(wiggly.weights, "danger") }],
      },
      alt: `Os mesmos pontos e a curva de grau ${wiggly.degree}, que passa por todos eles e oscila entre os pontos, descendo até ${fixed(wigglyLow)}.`,
    },
    {
      id: "u-curve",
      shortTitle: "Curva em U",
      title: "Treino sempre cai, teste faz um U",
      tag: "example",
      body: [
        `À esquerda, o erro de treino por grau: só desce, porque cada grau a mais só acrescenta liberdade. À direita, o erro de teste: cai até o grau ${best.degree} e depois sobe. O fundo do U é o melhor equilíbrio entre viés e variância.`,
        "Esse é o [[equilíbrio entre viés e variância|bias-variance-tradeoff]]. O erro esperado em dados novos se decompõe em viés², variância e ruído. Mais complexidade reduz o viés e aumenta a variância. Na prática, não se olha o teste para achar o fundo do U: se usa a validação, como na aula anterior.",
      ],
      keyIdea: "Complexidade demais e de menos custam caro; o ponto ótimo se acha na validação.",
      scene: {
        kind: "pieces",
        layout: "row",
        pieces: [
          {
            id: "train-error",
            piece: "chart",
            kind: "line",
            series: byDegree.map((row) => ({ label: `${row.degree}`, value: Number(row.train.toFixed(3)) })),
            max: Number(Math.max(...byDegree.map((row) => row.test)).toFixed(3)),
            color: "info",
          },
          {
            id: "test-error",
            piece: "chart",
            kind: "line",
            series: byDegree.map((row) => ({ label: `${row.degree}`, value: Number(row.test.toFixed(3)) })),
            highlight: best.degree,
            color: "module-01",
          },
        ],
      },
      alt: `Dois gráficos por grau do polinômio: o erro de treino cai até ${fixed(wiggly.train, 3)} no grau ${wiggly.degree}; o erro de teste cai até ${fixed(best.test, 3)} no grau ${best.degree} e sobe até ${fixed(wiggly.test, 3)} no grau ${wiggly.degree}.`,
    },
    {
      id: "regularize",
      shortTitle: "Regularizar",
      title: "Segurar os pesos sem tirar a liberdade",
      tag: "tradeoff",
      body: [
        `Em vez de baixar o grau, dá para manter o grau ${wiggly.degree} e cobrar pelos pesos grandes. A [[regularização|regularization]] ridge (L2) soma λ · Σw² à perda. Com λ = ${fixed(LAMBDA)}, a soma dos pesos ao quadrado cai de ${fixed(sumOfSquares(wiggly.weights), 0)} para ${fixed(sumOfSquares(ridgeWeights))}.`,
        `O erro de treino sobe de ${fixed(wiggly.train, 3)} para ${fixed(ridge.train, 3)}, porque o modelo deixou de decorar, e o de teste cai de ${fixed(wiggly.test, 3)} para ${fixed(ridge.test, 3)}. Escolher λ é outra decisão de validação: grande demais e o modelo volta a ser simples demais.`,
      ],
      keyIdea: "Regularizar troca um pouco de erro de treino por muito menos erro em dados novos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "ridge",
            piece: "metrics-panel",
            metrics: [
              { id: "best", label: `grau ${best.degree}: teste`, value: fixed(best.test, 3), color: "success" },
              { id: "wiggly", label: `grau ${wiggly.degree}: teste`, value: fixed(wiggly.test, 3), color: "danger" },
              { id: "ridge", label: `grau ${wiggly.degree} + ridge: teste`, value: fixed(ridge.test, 3) },
              { id: "floor", label: "piso do ruído", value: fixed(NOISE_VARIANCE, 3) },
            ],
            highlight: "ridge",
          },
        ],
      },
      alt: `Painel com o erro de teste: ${fixed(best.test, 3)} no grau ${best.degree}, ${fixed(wiggly.test, 3)} no grau ${wiggly.degree} e ${fixed(ridge.test, 3)} no grau ${wiggly.degree} com ridge, para um piso de ruído de ${fixed(NOISE_VARIANCE, 3)}.`,
    },
    {
      id: "defenses",
      shortTitle: "Resumo",
      title: "As defesas contra o overfitting",
      tag: "summary",
      body: [
        "Juntando: compare sempre o erro de treino com o de validação. Os dois altos pedem um modelo mais flexível ou features melhores. Treino baixo e validação alta pedem mais dados, regularização, um modelo mais simples ou parar o treino mais cedo (early stopping), quando o erro de validação começa a subir.",
        "Redes neurais e LLMs têm parâmetros de sobra para decorar o dataset inteiro, e mesmo assim generalizam bem graças a muitos dados, dropout, weight decay e early stopping. Na próxima aula, você vai medir o erro de classificadores com métricas além da acurácia.",
      ],
      keyIdea: "Mais dados, menos liberdade ou parar mais cedo: as três saídas para quem decorou o treino.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "defenses",
            piece: "block-diagram",
            blocks: [
              { id: "data", kind: "documents", label: "mais dados", col: 0, row: 0 },
              { id: "penalty", kind: "guardrail", label: "regularização", col: 0, row: 1 },
              { id: "model", kind: "llm", label: "modelo", col: 1, row: 0.5 },
              { id: "validation", kind: "eval", label: "validação", col: 2, row: 0.5 },
              { id: "stop", kind: "answer", label: "parar cedo", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "data", to: "model" },
              { from: "penalty", to: "model", label: "λ · Σw²" },
              { from: "model", to: "validation", label: "erro a cada época" },
              { from: "validation", to: "stop", label: "subiu" },
            ],
            active: "validation",
          },
        ],
      },
      alt: "Mais dados e regularização entram no modelo; a validação, em destaque, mede o erro a cada época e manda parar o treino quando ele sobe.",
    },
  ],
  realWorldExample:
    "Zhang e colegas (2017) mostraram que redes convolucionais conseguem chegar a erro de treino zero no CIFAR-10 mesmo com rótulos trocados ao acaso: decoram tudo, e no teste acertam o mesmo que um chute. Capacidade para decorar não impede, por si só, a generalização com rótulos verdadeiros.",
  code: {
    language: "python",
    source: `import numpy as np
from sklearn.linear_model import Ridge
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import PolynomialFeatures

x = np.linspace(-1, 1, 10).reshape(-1, 1)
y = 2 + np.sin(np.pi * x).ravel() + np.random.default_rng(8).normal(0, 0.25, 10)

for alpha in [1e-10, 0.01]:
    model = make_pipeline(PolynomialFeatures(9), Ridge(alpha=alpha)).fit(x, y)
    print(alpha, np.abs(model[-1].coef_).max())  # pesos menores com regularização`,
    caption: "Um polinômio de grau 9 sem e com ridge: a regularização encolhe os pesos que fazem a curva oscilar.",
  },
  tradeOffs: {
    pros: [
      "Modelos flexíveis capturam padrões que modelos simples não veem",
      "Regularização e early stopping deixam usar modelos grandes com segurança",
      "Comparar treino e validação diagnostica o problema rápido",
    ],
    cons: [
      "Flexibilidade sem dados suficientes vira decoreba do ruído",
      "Cada defesa traz um hiperparâmetro novo para escolher na validação",
      "Modelos simples demais têm um teto de erro que nenhum dado a mais resolve",
    ],
    alternatives: [
      "Aumento de dados (data augmentation), que cria exemplos novos a partir dos existentes",
      "Ensembles, que tiram a média de vários modelos e reduzem a variância",
    ],
  },
  knowledgeCheck: [
    {
      id: "diagnose",
      prompt: "Um classificador tem 99% de acurácia no treino e 71% na validação. Qual é o diagnóstico e uma ação razoável?",
      options: [
        "Underfitting: aumentar o modelo",
        "Overfitting: regularizar, simplificar o modelo ou conseguir mais dados",
        "Está ótimo: 99% é excelente",
        "Vazamento de dados: apagar a validação",
      ],
      correct: 1,
      explanation: "A distância grande entre treino e validação é a marca do overfitting. As defesas reduzem a liberdade do modelo ou aumentam os dados.",
      lesson: "01-09",
    },
    {
      id: "both-high",
      prompt: "Uma regressão linear erra muito no treino e na validação, e os dois erros são parecidos. O que tentar primeiro?",
      options: [
        "Mais regularização",
        "Um modelo mais flexível ou features melhores, porque é underfitting",
        "Menos dados de treino",
        "Parar o treino mais cedo",
      ],
      correct: 1,
      explanation: "Erros altos e parecidos indicam viés alto: o modelo não consegue representar o padrão. Regularizar ou parar cedo só piora.",
      lesson: "01-09",
    },
  ],
  related: ["01-08", "01-10", "01-11"],
  references: [
    { title: "Understanding deep learning requires rethinking generalization", url: "https://arxiv.org/abs/1611.03530", kind: "paper" },
    { title: "scikit-learn: Underfitting vs. Overfitting", url: "https://scikit-learn.org/stable/auto_examples/model_selection/plot_underfitting_overfitting.html", kind: "docs" },
    { title: "Deep Learning (Goodfellow, Bengio e Courville)", url: "https://www.deeplearningbook.org/", kind: "article" },
  ],
};

export default lesson;
