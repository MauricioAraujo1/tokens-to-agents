import type { VectorPoint } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Descida do gradiente calculada aqui. Em 1D, na perda L(w) = (w − 3)² + 1, com vários tamanhos de passo.
// Em 2D, ajustando a reta minutos = a + b · km de entregas de pizza pelo MSE, partindo de a = b = 0.

const TARGET = 3;
const FLOOR = 1;
const loss = (w: number) => (w - TARGET) ** 2 + FLOOR;
const gradient = (w: number) => 2 * (w - TARGET);
const START = -1;
const ETA = 0.1;
const STEPS_SHOWN = 6;

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const rateText = (value: number) => value.toLocaleString("pt-BR");
const descend = (eta: number, steps: number) => {
  const path = [START];
  for (let step = 0; step < steps; step += 1) path.push(path[step] - eta * gradient(path[step]));
  return path;
};
const path = descend(ETA, STEPS_SHOWN);
const firstStep = { w: path[0], grad: gradient(path[0]), next: path[1] };
const shrink = 1 - 2 * ETA;

const bowl = [-1, 0, 1, 2, 3, 4, 5, 6, 7];

const RATE_STEPS = 10;
const rates = [0.01, 0.1, 0.5, 0.9, 1.05].map((eta) => {
  const final = descend(eta, RATE_STEPS)[RATE_STEPS];
  return { eta, final, loss: loss(final), factor: 1 - 2 * eta };
});
const tiny = rates[0];
const exact = rates[2];
const bouncy = rates[3];
const exploding = rates[4];

// 2D: regressão linear ajustada pelo gradiente do MSE.
const km = [1, 2, 3, 4, 5, 6, 7, 8];
const minutes = [15, 20, 18, 21, 26, 28, 33, 36];
const mse = (a: number, b: number) => km.reduce((sum, x, i) => sum + (a + b * x - minutes[i]) ** 2, 0) / km.length;
const ETA_2D = 0.02;
const ITERATIONS_2D = 2000;
const CHECKPOINTS = [0, 1, 2, 5, 20, 100, 500, ITERATIONS_2D];
const trail: Array<{ step: number; a: number; b: number }> = [];
let a = 0;
let b = 0;
for (let step = 0; step <= ITERATIONS_2D; step += 1) {
  if (CHECKPOINTS.includes(step)) trail.push({ step, a, b });
  const residuals = km.map((x, i) => a + b * x - minutes[i]);
  const gradA = (2 / km.length) * residuals.reduce((sum, r) => sum + r, 0);
  const gradB = (2 / km.length) * residuals.reduce((sum, r, i) => sum + r * km[i], 0);
  a -= ETA_2D * gradA;
  b -= ETA_2D * gradB;
}
const meanKm = km.reduce((sum, x) => sum + x, 0) / km.length;
const meanMinutes = minutes.reduce((sum, y) => sum + y, 0) / minutes.length;
const bestB =
  km.reduce((sum, x, i) => sum + (x - meanKm) * (minutes[i] - meanMinutes), 0) / km.reduce((sum, x) => sum + (x - meanKm) ** 2, 0);
const bestA = meanMinutes - bestB * meanKm;
const final2D = trail[trail.length - 1];
const early = trail.find((point) => point.step === 20) ?? trail[0];
const trailPoints: VectorPoint[] = [
  ...trail.map<VectorPoint>((point) => ({
    id: `s${point.step}`,
    label: `${point.step}`,
    coords: [point.b, point.a],
    color: point.step === ITERATIONS_2D ? "module-01" : "info",
  })),
  { id: "best", label: "mínimo", coords: [bestB, bestA], color: "success" },
];

const lesson: LessonContent = {
  id: "01-11",
  subtitle: "Descer a montanha no escuro, sentindo a inclinação: o algoritmo que ajusta os pesos de quase todo modelo moderno.",
  objectives: [
    "Calcular passos de descida do gradiente à mão numa perda simples",
    "Ver o efeito da taxa de aprendizado: lenta, ideal, oscilante e divergente",
    "Acompanhar a descida em dois parâmetros de uma regressão",
    "Entender mini-batches, épocas e por que o SGD escala",
  ],
  steps: [
    {
      id: "loop",
      shortTitle: "O ciclo",
      title: "Descer a montanha no escuro",
      tag: "context",
      body: [
        "Imagine descer uma montanha com neblina, sem ver o vale. Você sente com o pé para onde o chão desce e dá um passo nessa direção. Repete até o chão ficar plano. Ninguém precisa do mapa: basta a inclinação de onde você está.",
        "Treinar um modelo é isso. A perda L(w) diz o quanto o modelo erra com os pesos w; o [[gradiente|gradient]] ∇L(w) aponta para onde a perda sobe mais rápido. A [[descida do gradiente|gradient-descent]] dá um passo para o lado oposto: w ← w − η · ∇L(w). O η é a [[taxa de aprendizado|learning-rate]], o tamanho do passo.",
      ],
      keyIdea: "Descida do gradiente: calcule a inclinação da perda e dê um passo morro abaixo. Repita.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "training-loop",
            piece: "block-diagram",
            blocks: [
              { id: "data", kind: "documents", label: "exemplos", col: 0, row: 0.5 },
              { id: "model", kind: "llm", label: "modelo (w)", col: 1, row: 0 },
              { id: "loss", kind: "eval", label: "perda L(w)", col: 2, row: 0 },
              { id: "grad", kind: "tool", label: "gradiente ∇L", col: 2, row: 1 },
              { id: "update", kind: "memory", label: "w − η · ∇L", col: 1, row: 1 },
            ],
            edges: [
              { from: "data", to: "model" },
              { from: "model", to: "loss", label: "previsões" },
              { from: "loss", to: "grad", label: "derivar" },
              { from: "grad", to: "update" },
              { from: "update", to: "model", label: "pesos novos" },
            ],
            active: "grad",
          },
        ],
      },
      alt: "Ciclo de treino: exemplos entram no modelo, as previsões viram uma perda, a perda é derivada no gradiente, em destaque, e o gradiente atualiza os pesos, que voltam ao modelo.",
    },
    {
      id: "bowl",
      shortTitle: "A tigela",
      title: "Uma perda em forma de tigela",
      tag: "mechanism",
      body: [
        `Para ver os números, use uma perda de um peso só: L(w) = (w − ${TARGET})² + ${FLOOR}. Ela tem forma de tigela, com o fundo em w = ${TARGET}, onde L = ${FLOOR}. Nós sabemos onde fica o fundo; o algoritmo não sabe, e começa em w = ${START}.`,
        `A derivada é dL/dw = 2 · (w − ${TARGET}). Em w = ${START} ela vale ${fixed(firstStep.grad, 0)}: negativa, então a perda desce para a direita. O sinal do gradiente diz a direção, e o tamanho diz o quanto a encosta é íngreme.`,
      ],
      keyIdea: "O gradiente é a inclinação: o sinal dá a direção de subida, e o passo vai para o lado contrário.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "bowl",
            piece: "chart",
            kind: "line",
            series: bowl.map((w) => ({ label: `${w}`, value: loss(w) })),
            highlight: bowl.indexOf(START),
            color: "module-01",
          },
        ],
      },
      alt: `Curva da perda em forma de tigela para w de ${bowl[0]} a ${bowl[bowl.length - 1]}, com o fundo em w = ${TARGET} e o ponto de partida em w = ${START} em destaque.`,
    },
    {
      id: "steps",
      shortTitle: "Passos",
      title: "Passo a passo até o fundo",
      tag: "mechanism",
      body: [
        `Com η = ${fixed(ETA, 1)}, o primeiro passo é w = ${START} − ${fixed(ETA, 1)} · (${fixed(firstStep.grad, 0)}) = ${fixed(firstStep.next, 1)}. A matriz mostra os ${STEPS_SHOWN} primeiros passos: w anda para ${TARGET}, a perda cai e o gradiente encolhe.`,
        `Como o gradiente encolhe perto do fundo, os passos também encolhem sozinhos: a cada passo a distância até ${TARGET} é multiplicada por 1 − 2η = ${fixed(shrink, 1)}. Depois de ${STEPS_SHOWN} passos, w = ${fixed(path[STEPS_SHOWN])}. O algoritmo para quando o gradiente fica perto de zero ou quando acaba o número de passos combinado.`,
      ],
      keyIdea: "Perto do mínimo o gradiente fica pequeno, e os passos encolhem sem ninguém mandar.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "table",
            piece: "matrix",
            rows: path.map((_, step) => `passo ${step}`),
            cols: ["w", "L(w)", "dL/dw"],
            values: path.map((w) => [Number(w.toFixed(2)), Number(loss(w).toFixed(2)), Number(gradient(w).toFixed(2))]),
            showValues: true,
            highlight: { row: 1, col: 0 },
            color: "module-01",
          },
        ],
      },
      alt: `Tabela dos passos 0 a ${STEPS_SHOWN} com w, a perda e o gradiente: w vai de ${START} a ${fixed(path[STEPS_SHOWN])}, a perda cai e o gradiente se aproxima de zero.`,
    },
    {
      id: "rates",
      shortTitle: "Taxa",
      title: "O tamanho do passo decide tudo",
      tag: "example",
      body: [
        `Mesma tigela, ${RATE_STEPS} passos, taxas diferentes. Com η = ${rateText(tiny.eta)}, w só chega a ${fixed(tiny.final)}: devagar demais. Com η = ${rateText(exact.eta)}, chega a ${fixed(exact.final)} em um passo, porque 1 − 2η = 0 nesta tigela. Com η = ${rateText(bouncy.eta)}, passa do fundo a cada passo e oscila de um lado para o outro, ainda em ${fixed(bouncy.final)}.`,
        `Com η = ${rateText(exploding.eta)}, cada passo cai mais longe do que o anterior: depois de ${RATE_STEPS} passos, w = ${fixed(exploding.final)} e a perda é ${fixed(exploding.loss)}, maior do que no começo. Isso é divergência. Na prática, η é o hiperparâmetro mais importante do treino, e se usa um cronograma: aquecimento no início e decaimento no fim.`,
      ],
      keyIdea: "η pequeno demais é lento, grande demais oscila ou explode; o bom fica no meio.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "rates",
            piece: "metrics-panel",
            metrics: rates.map((rate) => ({
              id: `eta-${rate.eta}`,
              label: `η = ${rateText(rate.eta)}`,
              value: `w = ${fixed(rate.final)}`,
              color: rate.eta === exact.eta ? "success" : rate.eta === exploding.eta ? "danger" : undefined,
            })),
            highlight: `eta-${exploding.eta}`,
          },
        ],
      },
      alt: `Painel com o valor de w depois de ${RATE_STEPS} passos para cada taxa: ${rates.map((rate) => `η = ${rateText(rate.eta)} chega a ${fixed(rate.final)}`).join(", ")}.`,
    },
    {
      id: "two-weights",
      shortTitle: "Dois pesos",
      title: "Descendo com dois pesos de uma vez",
      tag: "tradeoff",
      body: [
        `Agora o modelo é a reta minutos = a + b · km da aula 01-01, e a perda é o MSE dos ${km.length} pedidos. O gradiente tem duas coordenadas, uma por peso, e cada passo move a e b juntos. Na cena, b está no eixo x, a no eixo y, e cada ponto é a posição depois daquele número de passos.`,
        `No primeiro passo, b dispara para ${fixed(trail[1].b, 1)}, além do valor final, porque é o peso mais sensível: as distâncias chegam a ${Math.max(...km)} km. O intercepto a mal se move, e o resto da descida é b voltando devagar enquanto a sobe. Depois de 20 passos, a = ${fixed(early.a, 1)} e b = ${fixed(early.b, 1)}; só depois de ${ITERATIONS_2D.toLocaleString("pt-BR")} passos chega a a = ${fixed(final2D.a, 1)} e b = ${fixed(final2D.b, 1)}, perto do mínimo exato (${fixed(bestA, 1)} e ${fixed(bestB, 1)}), e o MSE cai de ${fixed(mse(0, 0), 0)} para ${fixed(mse(final2D.a, final2D.b))}. Features em escalas diferentes deixam o vale alongado e a descida lenta: por isso se padronizam as features e se usam otimizadores como o Adam.`,
      ],
      keyIdea: "Com vários pesos, o gradiente é um vetor; vales alongados deixam a descida lenta.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [{ id: "trail", piece: "vector-space", points: trailPoints }],
      },
      alt: `Trajetória dos pesos b e a da reta durante a descida: parte de zero, b dispara no primeiro passo e depois a sobe devagar até o mínimo em a = ${fixed(bestA, 1)} e b = ${fixed(bestB, 1)}.`,
    },
    {
      id: "sgd",
      shortTitle: "Resumo",
      title: "Mini-batches: o gradiente por amostra",
      tag: "summary",
      body: [
        "Com milhões de exemplos, calcular o gradiente exato a cada passo seria caro demais. O [[SGD|sgd]] estima o gradiente com um mini-batch, por exemplo 32 ou 256 exemplos sorteados: cada passo fica barato e um pouco ruidoso, e o ruído até ajuda a escapar de regiões ruins. Uma passada por todos os exemplos é uma [[época|epoch]].",
        "É assim que se treinam redes neurais e LLMs: perda, gradiente (calculado pela retropropagação, na aula 02-06) e um passo de um otimizador como o AdamW, bilhões de vezes. Na próxima aula, a pergunta é qual perda descer: MSE, erro absoluto ou cross-entropy.",
      ],
      keyIdea: "SGD: um passo por mini-batch, muitas épocas; a base do treino de todo LLM.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "training-loop",
            piece: "block-diagram",
            blocks: [
              { id: "data", kind: "documents", label: "dataset", col: 0, row: 0.5 },
              { id: "batch", kind: "queue", label: "mini-batch (32)", col: 1, row: 0.5 },
              { id: "model", kind: "llm", label: "modelo (w)", col: 2, row: 0 },
              { id: "loss", kind: "eval", label: "perda do lote", col: 3, row: 0.5 },
              { id: "update", kind: "memory", label: "w − η · ∇L", col: 2, row: 1 },
            ],
            edges: [
              { from: "data", to: "batch", label: "sorteia" },
              { from: "batch", to: "model" },
              { from: "model", to: "loss" },
              { from: "loss", to: "update", label: "gradiente" },
              { from: "update", to: "model", label: "próximo lote" },
            ],
            active: "batch",
          },
        ],
      },
      alt: "O dataset é sorteado em mini-batches de 32 exemplos, em destaque, que passam pelo modelo; a perda do lote gera o gradiente, que atualiza os pesos antes do próximo lote.",
    },
  ],
  realWorldExample:
    "O otimizador Adam (Kingma e Ba, 2014) é uma descida do gradiente que ajusta o passo de cada peso com médias móveis do gradiente e do seu quadrado. Ele e a variante AdamW, com weight decay separado, são o padrão no treino de Transformers e LLMs.",
  code: {
    language: "python",
    source: `def loss(w):
    return (w - 3) ** 2 + 1

def grad(w):
    return 2 * (w - 3)

for eta in [0.01, 0.1, 0.5, 0.9, 1.05]:
    w = -1.0
    for _ in range(10):
        w -= eta * grad(w)
    print(eta, round(w, 2), round(loss(w), 2))`,
    caption: "A tigela da aula com as cinco taxas de aprendizado: lenta, boa, exata, oscilante e divergente.",
  },
  tradeOffs: {
    pros: [
      "Precisa só do gradiente, não de uma fórmula fechada para o mínimo",
      "Escala para bilhões de parâmetros com mini-batches",
      "Funciona para qualquer perda diferenciável",
    ],
    cons: [
      "Sensível à taxa de aprendizado e à escala das features",
      "Em perdas não convexas, pode parar num mínimo local ou num platô",
      "Exige muitas iterações quando o vale é alongado",
    ],
    alternatives: [
      "Solução fechada (equação normal) para regressão linear pequena",
      "Otimizadores adaptativos como Adam e AdamW, e métodos de segunda ordem como L-BFGS",
    ],
  },
  knowledgeCheck: [
    {
      id: "loss-rising",
      prompt: "Durante o treino, a perda aumenta a cada passo e vira NaN depois de poucas centenas de passos. Qual é o primeiro suspeito?",
      options: [
        "Poucos dados de treino",
        "Taxa de aprendizado alta demais, que faz a descida divergir",
        "O modelo é pequeno demais",
        "Faltou embaralhar o teste",
      ],
      correct: 1,
      explanation: "Com η grande, cada passo passa do mínimo e cai mais longe do que estava. A perda cresce até estourar; reduzir η é a primeira coisa a tentar.",
      lesson: "01-11",
    },
    {
      id: "gradient-sign",
      prompt: "Num peso w, o gradiente da perda vale +4. Para onde a descida do gradiente move w?",
      options: [
        "Para cima, porque o gradiente é positivo",
        "Para baixo: w ← w − η · 4, porque a perda sobe quando w aumenta",
        "w não muda",
        "Depende do número de épocas",
      ],
      correct: 1,
      explanation: "Gradiente positivo significa que aumentar w aumenta a perda. O passo vai no sentido contrário, diminuindo w.",
      lesson: "01-11",
    },
  ],
  related: ["01-10", "01-12", "02-07"],
  references: [
    { title: "An overview of gradient descent optimization algorithms (Ruder)", url: "https://arxiv.org/abs/1609.04747", kind: "paper" },
    { title: "Adam: A Method for Stochastic Optimization", url: "https://arxiv.org/abs/1412.6980", kind: "paper" },
    { title: "scikit-learn: Stochastic Gradient Descent", url: "https://scikit-learn.org/stable/modules/sgd.html", kind: "docs" },
  ],
};

export default lesson;
