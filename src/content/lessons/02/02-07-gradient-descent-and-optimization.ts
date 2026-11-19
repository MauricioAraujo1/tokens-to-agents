import type { BlockDiagramSpec, VectorSpaceSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Otimização em duas superfícies de brinquedo, calculada aqui:
// 1. f(w) = (w − 3)², para ver o efeito da taxa de aprendizado;
// 2. f(x, y) = ½(x² + 9y²), um vale estreito, para comparar gradient descent, momentum e o primeiro passo do Adam.
// A agenda de taxa (aquecimento + cosseno) também sai das contas abaixo.

type Point = [number, number];

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).replace("-", "−");
const loose = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 2 }).replace("-", "−");

// 1. Uma dimensão: w ← w − η · 2(w − 3), saindo de w = 0.
const TARGET = 3;
const parabola = (w: number) => (w - TARGET) ** 2;
const descend1d = (rate: number, steps: number) => {
  const losses = [parabola(0)];
  let w = 0;
  for (let step = 0; step < steps; step += 1) {
    w -= rate * 2 * (w - TARGET);
    losses.push(parabola(w));
  }
  return losses;
};
const SLOW_RATE = 0.1;
const slowCurve = descend1d(SLOW_RATE, 7);
const RATES = [0.01, 0.1, 0.5, 1.1];
const STEPS = 10;
const finalLoss = RATES.map((rate) => ({ rate, loss: descend1d(rate, STEPS)[STEPS] }));
const [tooSmall, good, exact, tooBig] = finalLoss;

// 2. O vale: o gradiente de ½(x² + 9y²) é (x, 9y). A direção y é 9 vezes mais íngreme.
const valley = ([x, y]: Point) => 0.5 * (x * x + 9 * y * y);
const slope = ([x, y]: Point): Point => [x, 9 * y];
const START: Point = [-4, 1];
const RATE = 0.2;
const BETA = 0.3;
const TOLERANCE = 0.01;

const plainPath = (steps: number) => {
  const path: Point[] = [START];
  for (let step = 0; step < steps; step += 1) {
    const [x, y] = path[path.length - 1];
    const [gx, gy] = slope([x, y]);
    path.push([x - RATE * gx, y - RATE * gy]);
  }
  return path;
};
const momentumPath = (steps: number) => {
  const path: Point[] = [START];
  let velocity: Point = [0, 0];
  for (let step = 0; step < steps; step += 1) {
    const [x, y] = path[path.length - 1];
    const [gx, gy] = slope([x, y]);
    velocity = [BETA * velocity[0] + gx, BETA * velocity[1] + gy];
    path.push([x - RATE * velocity[0], y - RATE * velocity[1]]);
  }
  return path;
};
const stepsToConverge = (path: Point[]) => path.findIndex((point) => valley(point) < TOLERANCE);
const plainSteps = stepsToConverge(plainPath(200));
const momentumSteps = stepsToConverge(momentumPath(200));

// Primeiro passo do Adam: com as correções de viés, m̂ / √v̂ = sinal do gradiente, e cada coordenada anda η.
const ADAM_RATE = 0.5;
const firstGradient = slope(START);
const adamFirstStep = firstGradient.map((g) => {
  const m = (1 - 0.9) * g;
  const v = (1 - 0.999) * g * g;
  const mHat = m / (1 - 0.9);
  const vHat = v / (1 - 0.999);
  return ADAM_RATE * (mHat / (Math.sqrt(vHat) + 1e-8));
});
const plainFirstStep = firstGradient.map((g) => RATE * g);

const SHOWN = 6;
const trajectory = (id: string, path: Point[]): VectorSpaceSpec => ({
  id,
  piece: "vector-space",
  points: [
    ...path.slice(0, SHOWN).map((coords, index) => ({ id: `p${index}`, label: String(index), coords, color: "module-02" as const })),
    { id: "min", label: "mínimo", coords: [0, 0] as Point, color: "success" as const },
  ],
  vectors: path.slice(1, SHOWN).map((_, index) => ({ from: `p${index}`, to: `p${index + 1}` })),
});
const plainShown = plainPath(SHOWN - 1);
const momentumShown = momentumPath(SHOWN - 1);

// Agenda de taxa: aquecimento linear nos 2 primeiros passos e decaimento em cosseno até o passo 9.
const TOTAL = 10;
const WARMUP = 2;
const schedule = Array.from({ length: TOTAL }, (_, step) =>
  step < WARMUP ? (step + 1) / WARMUP : 0.5 * (1 + Math.cos((Math.PI * (step - WARMUP + 1)) / (TOTAL - WARMUP))),
);

const loop = (active: string, done?: string[]): BlockDiagramSpec => ({
  id: "loop",
  piece: "block-diagram",
  blocks: [
    { id: "batch", kind: "queue", label: "mini-lote", col: 0, row: 0 },
    { id: "model", kind: "llm", label: "modelo", col: 1, row: 0 },
    { id: "loss", kind: "eval", label: "perda", col: 2, row: 0 },
    { id: "optimizer", kind: "tool", label: "otimizador", col: 2, row: 1 },
  ],
  edges: [
    { from: "batch", to: "model" },
    { from: "model", to: "loss", label: "forward" },
    { from: "loss", to: "optimizer", label: "gradientes" },
    { from: "optimizer", to: "model", label: "w − η·g" },
  ],
  active,
  ...(done ? { done } : {}),
});

const lesson: LessonContent = {
  id: "02-07",
  subtitle: "Os gradientes dizem a direção; o otimizador decide o tamanho e o jeito do passo. Taxa de aprendizado, momentum, Adam e agendas, com as contas à vista.",
  objectives: [
    "Explicar a regra de atualização do gradient descent",
    "Prever o efeito de uma taxa de aprendizado pequena, boa ou grande demais",
    "Entender por que momentum e Adam andam melhor em vales estreitos",
    "Reconhecer a agenda de aquecimento e cosseno usada em LLMs",
  ],
  steps: [
    {
      id: "hill",
      shortTitle: "Descer o morro",
      title: "Descer a montanha no escuro",
      tag: "context",
      body: [
        "Você está numa montanha à noite e quer chegar ao vale. Não vê nada, mas sente a inclinação do chão sob os pés. A estratégia é dar um passo morro abaixo, sentir de novo e repetir. Esse é o [[gradient descent|gradient-descent]]: a altura é a perda, e o gradiente, calculado pelo backprop, é a inclinação.",
        "A regra é w ← w − η · ∇L(w), onde η é a [[taxa de aprendizado|learning-rate]]. Em deep learning, o gradiente é estimado num mini-lote de exemplos, não no dataset inteiro: cada passo é mais barato e um pouco ruidoso, o que se chama gradient descent estocástico, o [[SGD|sgd]].",
      ],
      keyIdea: "Gradient descent: calcule a inclinação, dê um passo contra ela, repita.",
      scene: { kind: "pieces", layout: "single", pieces: [loop("optimizer")] },
      alt: "Um mini-lote passa pelo modelo, a perda gera gradientes, e o otimizador, em destaque, devolve ao modelo os pesos atualizados por w menos eta vezes g.",
    },
    {
      id: "rate",
      shortTitle: "Taxa",
      title: "O tamanho do passo decide tudo",
      tag: "mechanism",
      body: [
        `Minimize f(w) = (w − 3)², começando em w = 0. O gradiente é 2(w − 3), então cada passo multiplica a distância até o mínimo por (1 − 2η). Com η = ${loose(SLOW_RATE)}, a perda cai de ${loose(slowCurve[0])} para ${fixed(slowCurve[slowCurve.length - 1])} em ${slowCurve.length - 1} passos: é a curva do gráfico.`,
        `Depois de ${STEPS} passos: com η = ${loose(tooSmall.rate)}, a perda ainda é ${fixed(tooSmall.loss)}; com ${loose(good.rate)}, ${fixed(good.loss)}; com ${loose(exact.rate)}, ${fixed(exact.loss)}, porque o fator vira 0. Com η = ${loose(tooBig.rate)}, o fator é −1,2: cada passo pula para o outro lado do vale, mais longe, e a perda explode para ${fixed(tooBig.loss, 0)}.`,
      ],
      keyIdea: "Taxa pequena demais anda devagar; grande demais diverge. A boa fica perto do limite de estabilidade.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "curve",
            piece: "chart",
            kind: "line",
            series: slowCurve.map((loss, step) => ({ label: String(step), value: Number(loss.toFixed(2)) })),
            highlight: slowCurve.length - 1,
            color: "module-02",
          },
          {
            id: "rates",
            piece: "metrics-panel",
            metrics: finalLoss.map(({ rate, loss }) => ({
              id: `rate-${rate}`,
              label: `η = ${loose(rate)}`,
              value: fixed(loss, loss > 100 ? 0 : 2),
              ...(rate === tooBig.rate ? { color: "danger" as const } : rate === exact.rate ? { color: "success" as const } : {}),
            })),
            highlight: `rate-${good.rate}`,
          },
        ],
      },
      alt: `Curva da perda caindo de ${loose(slowCurve[0])} a ${fixed(slowCurve[slowCurve.length - 1])} com taxa ${loose(SLOW_RATE)}; o painel mostra a perda depois de ${STEPS} passos para quatro taxas, e a maior delas explode.`,
    },
    {
      id: "zigzag",
      shortTitle: "Zigue-zague",
      title: "Num vale estreito, o passo ziguezagueia",
      tag: "mechanism",
      body: [
        `Agora a perda tem duas dimensões: f(x, y) = ½(x² + 9y²). É um vale comprido e estreito: na direção y a parede é 9 vezes mais íngreme. O gradiente aponta quase só para a parede, e o passo cruza o vale de um lado para o outro em vez de seguir pelo fundo.`,
        `Com η = ${loose(RATE)}, saindo de (${START.map(loose).join("; ")}), o y troca de sinal a cada passo enquanto o x avança devagar. São ${plainSteps} passos até a perda ficar abaixo de ${loose(TOLERANCE)}. Subir η para andar mais rápido em x faz y divergir: a direção mais íngreme limita a taxa de todas as outras.`,
      ],
      keyIdea: "A direção mais curva da perda limita a taxa, e as direções planas andam devagar.",
      scene: { kind: "pieces", layout: "single", pieces: [trajectory("path", plainShown)] },
      alt: `Trajetória do gradient descent num vale estreito: os pontos 0 a ${SHOWN - 1} ziguezagueiam de um lado para o outro enquanto avançam devagar até o mínimo.`,
    },
    {
      id: "momentum",
      shortTitle: "Momentum, Adam",
      title: "Momentum e Adam corrigem o passo",
      tag: "example",
      body: [
        `O [[momentum|momentum]] soma ao passo atual uma fração β do passo anterior, como uma bola que ganha embalo. No eixo x, os passos têm o mesmo sinal e se acumulam; no y, alternam e se cancelam. Com β = ${loose(BETA)} e a mesma taxa, a perda fica abaixo de ${loose(TOLERANCE)} em ${momentumSteps} passos, contra ${plainSteps}.`,
        `O [[Adam|adam]] vai além: divide o passo de cada parâmetro pela raiz da média dos gradientes ao quadrado. No primeiro passo, o gradiente é (${firstGradient.map(loose).join("; ")}), e o gradient descent anda (${plainFirstStep.map((value) => fixed(Math.abs(value), 1)).join("; ")}). O Adam, com η = ${loose(ADAM_RATE)}, anda (${adamFirstStep.map((value) => fixed(Math.abs(value), 1)).join("; ")}): o mesmo tamanho em cada eixo, porque o que importa para ele é o sinal, não a escala.`,
      ],
      keyIdea: "Momentum alisa a direção ao longo do tempo; Adam ajusta o tamanho do passo de cada parâmetro.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          trajectory("path", momentumShown),
          {
            id: "optimizers",
            piece: "metrics-panel",
            metrics: [
              { id: "plain", label: "passos sem momentum", value: String(plainSteps) },
              { id: "momentum", label: "passos com momentum", value: String(momentumSteps), color: "success" },
              { id: "adam", label: "1º passo do Adam", value: adamFirstStep.map((value) => fixed(Math.abs(value), 1)).join(" e ") },
            ],
            highlight: "momentum",
          },
        ],
      },
      alt: `Trajetória com momentum no mesmo vale: o zigue-zague diminui e os pontos chegam mais rápido ao mínimo; o painel compara ${plainSteps} passos sem momentum e ${momentumSteps} com momentum.`,
    },
    {
      id: "schedule",
      shortTitle: "Agenda",
      title: "A taxa também muda durante o treino",
      tag: "tradeoff",
      body: [
        "No começo do treino, os pesos são aleatórios e os gradientes são grandes e erráticos; um passo grande ali desestabiliza tudo. No fim, perto de um bom ponto, passos grandes só fazem a perda pular. Por isso se usa uma [[agenda de taxa|learning-rate-schedule]]: começa baixa, sobe e depois desce.",
        `O gráfico mostra a agenda mais comum em LLMs, em porcentagem da taxa máxima: aquecimento linear nos ${WARMUP} primeiros passos e decaimento em cosseno até zero. O custo da escolha é que a taxa máxima, o aquecimento e o decaimento viram hiperparâmetros a mais, e errar qualquer um deles desperdiça uma rodada de treino cara.`,
      ],
      keyIdea: "Aquecer evita explodir no começo; decair deixa a perda assentar no fim.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "schedule",
            piece: "chart",
            kind: "line",
            series: schedule.map((value, step) => ({ label: String(step), value: Math.round(value * 100) })),
            max: 100,
            highlight: WARMUP - 1,
            color: "module-02",
          },
        ],
      },
      alt: `Agenda da taxa de aprendizado: sobe linearmente até 100% no passo ${WARMUP - 1} e desce em curva de cosseno até 0% no passo ${TOTAL - 1}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "O laço do treino",
      tag: "summary",
      body: [
        "Treinar é um laço: mini-lote, forward, perda, backward, passo do otimizador. A taxa de aprendizado é o hiperparâmetro mais importante; momentum e Adam aceleram em vales estreitos; a agenda ajusta a taxa ao longo do treino.",
        "Até aqui as redes eram densas, e cada entrada ligava em todos os neurônios. A próxima aula mostra uma arquitetura que aproveita a estrutura das imagens: a rede convolucional.",
      ],
      keyIdea: "Na prática: AdamW, aquecimento, decaimento em cosseno e uma taxa escolhida com cuidado.",
      scene: { kind: "pieces", layout: "single", pieces: [loop("model", ["batch", "loss", "optimizer"])] },
      alt: "O laço completo do treino: mini-lote, perda e otimizador já percorridos, e o modelo atualizado em destaque.",
    },
  ],
  realWorldExample:
    "O GPT-3 foi treinado com Adam (β₁ = 0,9 e β₂ = 0,95), aquecimento linear da taxa nos primeiros 375 milhões de tokens e decaimento em cosseno até 10% da taxa máxima, segundo o próprio paper. Essa receita, com AdamW, virou o padrão do treino de LLMs.",
  code: {
    language: "python",
    source: `import torch

w = torch.tensor([-4.0, 1.0], requires_grad=True)
optimizer = torch.optim.SGD([w], lr=0.2, momentum=0.3)

for step in range(9):
    optimizer.zero_grad()
    loss = 0.5 * (w[0] ** 2 + 9 * w[1] ** 2)   # o vale estreito da aula
    loss.backward()
    optimizer.step()

print(0.5 * (w[0] ** 2 + 9 * w[1] ** 2))       # abaixo de 0.01`,
    caption: `O vale da aula com o SGD do PyTorch: com momentum ${loose(BETA)}, a perda passa abaixo de ${loose(TOLERANCE)} em ${momentumSteps} passos. Troque por torch.optim.AdamW para comparar.`,
  },
  tradeOffs: {
    pros: [
      "Gradient descent com mini-lotes escala para bilhões de parâmetros",
      "Momentum e Adam aceleram muito em perdas mal condicionadas",
      "Agendas de taxa estabilizam o começo e refinam o fim do treino",
    ],
    cons: [
      "Taxa de aprendizado errada desperdiça o treino: devagar demais ou divergente",
      "Adam guarda duas médias por parâmetro: pesos e estado do otimizador ocupam 3 vezes a memória dos pesos sozinhos",
      "Mais hiperparâmetros: β, aquecimento, decaimento, tamanho do lote",
    ],
    alternatives: ["SGD com momentum, ainda comum em visão computacional", "AdamW, que separa o weight decay do passo adaptativo"],
  },
  knowledgeCheck: [
    {
      id: "diverging",
      prompt: "No começo do treino, a perda de um modelo vira NaN depois de poucos passos. Qual ajuste testar primeiro?",
      options: [
        "Aumentar a taxa de aprendizado",
        "Diminuir a taxa de aprendizado ou acrescentar aquecimento",
        "Tirar o otimizador",
        "Treinar por mais épocas",
      ],
      correct: 1,
      explanation: "Perda que explode é o sinal clássico de passo grande demais: cada atualização joga os pesos para mais longe do mínimo. Taxa menor ou aquecimento resolvem.",
      lesson: "02-07",
    },
    {
      id: "adam-scale",
      prompt: "Um parâmetro tem gradientes sempre 100 vezes maiores que outro. Como o Adam trata os dois?",
      options: [
        "Dá passos 100 vezes maiores ao primeiro",
        "Ignora o segundo",
        "Divide cada gradiente pela sua própria escala, e os dois andam com passos de tamanho parecido",
        "Usa a mesma média para os dois",
      ],
      correct: 2,
      explanation: "O Adam divide a média dos gradientes de cada parâmetro pela raiz da média dos quadrados. A escala se cancela, e o passo fica perto de η para os dois.",
      lesson: "02-07",
    },
  ],
  related: ["02-06", "01-11", "03-14"],
  references: [
    { title: "Adam: A Method for Stochastic Optimization (Kingma & Ba)", url: "https://arxiv.org/abs/1412.6980", kind: "paper" },
    { title: "Why Momentum Really Works (Distill)", url: "https://distill.pub/2017/momentum/", kind: "article" },
    { title: "PyTorch: torch.optim", url: "https://pytorch.org/docs/stable/optim.html", kind: "docs" },
  ],
};

export default lesson;
