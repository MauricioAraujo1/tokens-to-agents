import type { BlockDiagramSpec, GraphSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Um passo de backpropagation numa rede de um neurônio escondido: x → z1 = w1·x + b1 → h = ReLU(z1)
// → ŷ = w2·h + b2 → L = ½(ŷ − y)². Os gradientes saem da regra da cadeia, o passo de atualização
// usa taxa 0,3, e a derivada numérica confere o resultado. Tudo calculado aqui.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).replace("-", "−");

interface Params {
  w1: number;
  b1: number;
  w2: number;
  b2: number;
}

const X = 1.5;
const Y = 1;
const LEARNING_RATE = 0.3;
const start: Params = { w1: 0.8, b1: 0.1, w2: 0.5, b2: 0.2 };

const forward = ({ w1, b1, w2, b2 }: Params) => {
  const z1 = w1 * X + b1;
  const h = Math.max(0, z1);
  const yHat = w2 * h + b2;
  const loss = 0.5 * (yHat - Y) ** 2;
  return { z1, h, yHat, loss };
};

const before = forward(start);

// Regra da cadeia, de trás para a frente: cada gradiente é o de cima vezes uma derivada local.
const dYHat = before.yHat - Y;
const dW2 = dYHat * before.h;
const dB2 = dYHat;
const dH = dYHat * start.w2;
const reluSlope = before.z1 > 0 ? 1 : 0;
const dZ1 = dH * reluSlope;
const dW1 = dZ1 * X;
const dB1 = dZ1;

const gradients: Params = { w1: dW1, b1: dB1, w2: dW2, b2: dB2 };
const names = ["w1", "b1", "w2", "b2"] as const;
const updated: Params = {
  w1: start.w1 - LEARNING_RATE * dW1,
  b1: start.b1 - LEARNING_RATE * dB1,
  w2: start.w2 - LEARNING_RATE * dW2,
  b2: start.b2 - LEARNING_RATE * dB2,
};
const after = forward(updated);
const lossDrop = before.loss / after.loss;

// Conferência numérica: (L(w1 + ε) − L(w1 − ε)) / 2ε deve bater com o gradiente da regra da cadeia.
const EPSILON = 1e-4;
const numericW1 =
  (forward({ ...start, w1: start.w1 + EPSILON }).loss - forward({ ...start, w1: start.w1 - EPSILON }).loss) / (2 * EPSILON);
const checkError = Math.abs(numericW1 - dW1);

const nodes: GraphSpec["nodes"] = [
  { id: "x", label: "x", x: 0, y: 0.15 },
  { id: "w1", label: "w₁", x: 0, y: 0.85 },
  { id: "z1", label: "z₁", x: 0.25, y: 0.5 },
  { id: "h", label: "h", x: 0.48, y: 0.5 },
  { id: "w2", label: "w₂", x: 0.48, y: 1 },
  { id: "yhat", label: "ŷ", x: 0.72, y: 0.5 },
  { id: "y", label: "y", x: 0.72, y: 0 },
  { id: "loss", label: "L", x: 1, y: 0.5, color: "module-02" },
];

const forwardGraph: GraphSpec = {
  id: "graph",
  piece: "graph",
  nodes,
  edges: [
    { from: "x", to: "z1", label: fixed(X, 1) },
    { from: "w1", to: "z1", label: fixed(start.w1, 1) },
    { from: "z1", to: "h", label: fixed(before.z1) },
    { from: "h", to: "yhat", label: fixed(before.h) },
    { from: "w2", to: "yhat", label: fixed(start.w2, 1) },
    { from: "yhat", to: "loss", label: fixed(before.yHat) },
    { from: "y", to: "loss", label: fixed(Y, 1) },
  ],
  path: ["x", "z1", "h", "yhat", "loss"],
  highlight: ["loss"],
};

const backwardGraph: GraphSpec = {
  id: "graph",
  piece: "graph",
  nodes,
  edges: [
    { from: "x", to: "z1" },
    { from: "w1", to: "z1", label: `×${fixed(X, 1)}` },
    { from: "z1", to: "h", label: `×${reluSlope}` },
    { from: "h", to: "yhat", label: `×${fixed(start.w2, 1)}` },
    { from: "w2", to: "yhat" },
    { from: "yhat", to: "loss", label: fixed(dYHat) },
    { from: "y", to: "loss" },
  ],
  path: ["loss", "yhat", "h", "z1", "w1"],
  highlight: ["w1"],
};

const loop = (active: string, done?: string[]): BlockDiagramSpec => ({
  id: "loop",
  piece: "block-diagram",
  blocks: [
    { id: "input", kind: "embedding", label: "entrada x", col: 0, row: 0 },
    { id: "net", kind: "llm", label: "rede", col: 1, row: 0 },
    { id: "prediction", kind: "answer", label: "previsão ŷ", col: 2, row: 0 },
    { id: "loss", kind: "eval", label: "perda L", col: 3, row: 0 },
  ],
  edges: [
    { from: "input", to: "net" },
    { from: "net", to: "prediction", label: "forward" },
    { from: "prediction", to: "loss", label: "compara com y" },
    { from: "loss", to: "net", label: "gradientes", variant: "alternative" },
  ],
  active,
  ...(done ? { done } : {}),
});

const lesson: LessonContent = {
  id: "02-06",
  subtitle: "Como a rede descobre a culpa de cada peso pelo erro: a regra da cadeia aplicada de trás para a frente, com um passo inteiro calculado à mão.",
  objectives: [
    "Montar o grafo computacional de uma rede pequena",
    "Calcular gradientes com a regra da cadeia, da perda até cada peso",
    "Fazer um passo de atualização e ver a perda cair",
    "Conferir um gradiente com a derivada numérica",
  ],
  steps: [
    {
      id: "blame",
      shortTitle: "A ideia",
      title: "Distribuir a culpa pelo erro",
      tag: "context",
      body: [
        "Um time perde o jogo. Para melhorar, cada jogador precisa saber quanto do resultado foi culpa dele. Numa rede, a perda é o placar, e cada peso é um jogador. O [[backpropagation|backpropagation]] calcula, para cada peso, quanto a perda mudaria se o peso mudasse um pouquinho.",
        "Esse número é o [[gradiente|gradient]] da perda em relação ao peso, ∂L/∂w. O backprop calcula todos de uma vez, numa passada de volta que custa só cerca de 2 vezes a passada de ida, em vez de testar peso por peso.",
      ],
      keyIdea: "Backprop responde, para cada peso: se eu mexer nele, a perda sobe ou desce, e quanto?",
      scene: { kind: "pieces", layout: "single", pieces: [loop("loss")] },
      alt: "A entrada passa pela rede, que gera a previsão; a previsão é comparada com o valor certo na perda, em destaque, e os gradientes voltam para a rede por um caminho tracejado.",
    },
    {
      id: "graph",
      shortTitle: "Grafo",
      title: "A rede como um grafo de contas",
      tag: "mechanism",
      body: [
        `Escreva a rede como contas pequenas ligadas: z₁ = w₁·x + b₁, h = ReLU(z₁), ŷ = w₂·h + b₂ e L = ½(ŷ − y)². Esse desenho é o [[grafo computacional|computational-graph]]. Com x = ${fixed(X, 1)}, w₁ = ${fixed(start.w1, 1)}, b₁ = ${fixed(start.b1, 1)}, w₂ = ${fixed(start.w2, 1)} e b₂ = ${fixed(start.b2, 1)}, a passada de ida dá z₁ = ${fixed(before.z1)}, h = ${fixed(before.h)} e ŷ = ${fixed(before.yHat)}.`,
        `O alvo é y = ${fixed(Y, 1)}, então a perda é ½ · (${fixed(before.yHat)} − ${fixed(Y, 1)})² = ${fixed(before.loss, 5)}. Cada nó do grafo sabe a sua derivada local, por exemplo ∂ŷ/∂h = w₂. É só disso que a volta precisa.`,
      ],
      keyIdea: "Toda rede é um grafo de operações simples, e cada operação conhece a própria derivada.",
      scene: { kind: "pieces", layout: "single", pieces: [forwardGraph] },
      alt: `Grafo computacional: x e w1 formam z1, que passa pela ReLU até h; h e w2 formam a previsão ${fixed(before.yHat)}, comparada com y na perda L, em destaque.`,
    },
    {
      id: "chain",
      shortTitle: "Regra da cadeia",
      title: "De trás para a frente, multiplicando",
      tag: "mechanism",
      body: [
        "A [[regra da cadeia|chain-rule]] diz que, numa cadeia de funções, as derivadas se multiplicam: ∂L/∂w₁ = ∂L/∂ŷ · ∂ŷ/∂h · ∂h/∂z₁ · ∂z₁/∂w₁. O backprop percorre o grafo da perda para trás e, em cada aresta, multiplica o gradiente que chegou pela derivada local.",
        `Na cena: ∂L/∂ŷ = ŷ − y = ${fixed(dYHat)}. Vezes w₂ = ${fixed(start.w2, 1)} dá ∂L/∂h = ${fixed(dH, 3)}. A ReLU, com z₁ positivo, passa tudo (× ${reluSlope}). Vezes x = ${fixed(X, 1)} dá ∂L/∂w₁ = ${fixed(dW1, 4)}. O sinal negativo quer dizer: aumentar w₁ diminui a perda.`,
      ],
      keyIdea: "Gradiente de um peso = produto das derivadas locais no caminho entre ele e a perda.",
      scene: { kind: "pieces", layout: "single", pieces: [backwardGraph] },
      alt: `O mesmo grafo percorrido da perda até w1, em destaque: o gradiente ${fixed(dYHat)} é multiplicado por ${fixed(start.w2, 1)}, por ${reluSlope} e por ${fixed(X, 1)}, chegando a ${fixed(dW1, 4)}.`,
    },
    {
      id: "update",
      shortTitle: "Um passo",
      title: "Atualizar os pesos e medir de novo",
      tag: "example",
      body: [
        `Com todos os gradientes em mãos, cada parâmetro anda um pouco no sentido contrário ao seu gradiente: w ← w − η · ∂L/∂w, com taxa η = ${fixed(LEARNING_RATE, 1)}. Como os gradientes são negativos, todos os parâmetros sobem, e a previsão se aproxima de ${fixed(Y, 1)}.`,
        `Rodando o forward de novo, ŷ vai de ${fixed(before.yHat)} para ${fixed(after.yHat, 3)} e a perda cai de ${fixed(before.loss, 5)} para ${fixed(after.loss, 5)}, umas ${Math.round(lossDrop)} vezes menor. Treinar uma rede é repetir esse passo milhões de vezes, com lotes de exemplos.`,
      ],
      keyIdea: "Backprop calcula os gradientes; a atualização usa os gradientes para mexer nos pesos.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "update",
            piece: "matrix",
            rows: [...names],
            cols: ["antes", "∂L/∂", "depois"],
            values: names.map((name) => [start[name], gradients[name], updated[name]]),
            highlight: { row: 0, col: 2 },
            showValues: true,
            color: "module-02",
          },
          {
            id: "loss",
            piece: "metrics-panel",
            metrics: [
              { id: "before", label: "perda antes", value: fixed(before.loss, 5), color: "danger" },
              { id: "after", label: "perda depois", value: fixed(after.loss, 5), color: "success" },
              { id: "prediction", label: "ŷ depois", value: fixed(after.yHat, 3) },
            ],
            highlight: "after",
          },
        ],
      },
      alt: `Tabela com w1, b1, w2 e b2 antes, os seus gradientes e os valores depois do passo; o painel mostra a perda caindo de ${fixed(before.loss, 5)} para ${fixed(after.loss, 5)}.`,
    },
    {
      id: "autograd",
      shortTitle: "Na prática",
      title: "Ninguém faz isso à mão",
      tag: "tradeoff",
      body: [
        `Frameworks como PyTorch gravam o grafo durante o forward e aplicam a regra da cadeia sozinhos quando você chama loss.backward(). É o [[autograd|autograd]]. Para testar uma implementação, compara-se com a derivada numérica: (L(w + ε) − L(w − ε)) / 2ε dá ${fixed(numericW1, 4)} para w₁, contra ${fixed(dW1, 4)} da regra da cadeia.`,
        "O preço é memória: a volta usa os valores guardados na ida (z₁, h, ŷ), então o treino guarda as ativações de todas as camadas. E a conta de FLOPs: o backward custa cerca do dobro do forward, por isso treinar custa uns 6 FLOPs por parâmetro por exemplo, contra 2 da inferência.",
      ],
      keyIdea: "O autograd automatiza a regra da cadeia, ao custo de guardar as ativações e de cerca de 2× o forward em conta.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "autograd",
            piece: "block-diagram",
            blocks: [
              { id: "forward", kind: "llm", label: "forward", col: 0, row: 0 },
              { id: "memory", kind: "memory", label: "ativações", col: 1, row: 0 },
              { id: "backward", kind: "tool", label: "autograd", col: 2, row: 0 },
              { id: "grads", kind: "embedding", label: "gradientes", col: 3, row: 0 },
            ],
            edges: [
              { from: "forward", to: "memory", label: "grava" },
              { from: "memory", to: "backward", label: "lê" },
              { from: "backward", to: "grads", label: "loss.backward()" },
            ],
            active: "backward",
          },
          {
            id: "check",
            piece: "metrics-panel",
            metrics: [
              { id: "analytic", label: "regra da cadeia", value: fixed(dW1, 4) },
              { id: "numeric", label: "derivada numérica", value: fixed(numericW1, 4), color: "module-02" },
              { id: "error", label: "diferença", value: checkError.toExponential(0).replace(".", ",") },
            ],
            highlight: "numeric",
          },
        ],
      },
      alt: `O forward grava as ativações, o autograd, em destaque, lê essas ativações e produz os gradientes; o painel mostra que a regra da cadeia e a derivada numérica dão ${fixed(dW1, 4)}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Ida, volta e ajuste",
      tag: "summary",
      body: [
        "O backprop é a regra da cadeia aplicada ao grafo da rede, da perda para trás. Ele entrega o gradiente de cada parâmetro numa passada só, e o passo de atualização usa esses gradientes para reduzir a perda.",
        "Falta decidir o tamanho e o jeito do passo: taxa de aprendizado, lotes, momentum, Adam. É o assunto da próxima aula, gradient descent e otimização.",
      ],
      keyIdea: "Forward calcula a perda, backward calcula os gradientes, o otimizador mexe nos pesos.",
      scene: { kind: "pieces", layout: "single", pieces: [loop("net", ["input", "prediction", "loss"])] },
      alt: "O ciclo completo: entrada, rede, previsão e perda já percorridos; os gradientes voltam e a rede, em destaque, é atualizada.",
    },
  ],
  realWorldExample:
    "O paper de Rumelhart, Hinton e Williams, publicado na Nature em 1986, mostrou que o backpropagation treinava redes com camadas escondidas que aprendiam representações internas úteis. Décadas depois, todo LLM ainda é treinado com o mesmo algoritmo, só que sobre bilhões de parâmetros.",
  code: {
    language: "python",
    source: `import torch

x, y = torch.tensor(1.5), torch.tensor(1.0)
w1 = torch.tensor(0.8, requires_grad=True)
b1 = torch.tensor(0.1, requires_grad=True)
w2 = torch.tensor(0.5, requires_grad=True)
b2 = torch.tensor(0.2, requires_grad=True)

y_hat = w2 * torch.relu(w1 * x + b1) + b2   # 0.85
loss = 0.5 * (y_hat - y) ** 2                # 0.01125
loss.backward()

print(w1.grad, b1.grad, w2.grad, b2.grad)    # -0.1125 -0.075 -0.195 -0.15`,
    caption: "A rede da aula em PyTorch: loss.backward() aplica a regra da cadeia e devolve os mesmos gradientes da conta à mão.",
  },
  tradeOffs: {
    pros: [
      "Calcula o gradiente de todos os parâmetros numa passada, com custo de cerca de 2× o forward",
      "Funciona para qualquer grafo de operações diferenciáveis",
      "Automatizado pelos frameworks: você escreve só o forward",
    ],
    cons: [
      "Exige guardar as ativações de todas as camadas, o que limita lote e modelo",
      "Gradientes podem sumir ou explodir ao atravessar muitas camadas",
      "Só funciona com operações diferenciáveis, ou com aproximações delas",
    ],
    alternatives: ["Gradient checkpointing: recalcular ativações na volta para economizar memória", "Diferenças finitas: só para conferir, pois custam uma passada por parâmetro"],
  },
  knowledgeCheck: [
    {
      id: "chain-product",
      prompt: "No caminho entre um peso e a perda, as derivadas locais são 0,5, 2 e −0,1, e ∂L/∂ŷ = 3. Qual é o gradiente do peso?",
      options: ["5,4", "−0,3", "0,3", "−3"],
      correct: 1,
      explanation: "Pela regra da cadeia, multiplicam-se todos os fatores no caminho: 3 × 0,5 × 2 × (−0,1) = −0,3.",
      lesson: "02-06",
    },
    {
      id: "dead-path",
      prompt: "Num passo de treino, a soma z de um neurônio com ReLU é negativa. O que acontece com os gradientes dos pesos que chegam nele?",
      options: [
        "Ficam iguais aos da camada de saída",
        "São zero neste passo, porque a derivada da ReLU em z negativo é 0",
        "Dobram de tamanho",
        "Mudam de sinal",
      ],
      correct: 1,
      explanation: "A derivada local da ReLU é 0 para z negativo, e qualquer produto que passa por ela vira 0. Esses pesos não mudam neste passo.",
      lesson: "02-06",
    },
  ],
  related: ["02-05", "02-07", "01-12"],
  references: [
    { title: "Learning representations by back-propagating errors (Rumelhart, Hinton & Williams, 1986)", url: "https://www.nature.com/articles/323533a0", kind: "paper" },
    { title: "PyTorch: Automatic Differentiation with torch.autograd", url: "https://pytorch.org/tutorials/beginner/basics/autogradqs_tutorial.html", kind: "docs" },
    { title: "CS231n: Backpropagation, Intuitions", url: "https://cs231n.github.io/optimization-2/", kind: "article" },
  ],
};

export default lesson;
