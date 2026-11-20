import type { BlockDiagramSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// As ativações calculadas ponto a ponto, de −3 a 3; quanto do gradiente sobra depois de n sigmoids
// no melhor caso (derivada máxima 0,25); e o softmax de quatro logits. Tudo calculado aqui.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).replace("-", "−");
const percent = (value: number, digits = 0) => `${fixed(value * 100, digits)}%`;

const relu = (x: number) => Math.max(0, x);
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
const tanh = (x: number) => Math.tanh(x);
/** GELU na aproximação por tanh, a mesma do BERT e do GPT-2. */
const gelu = (x: number) => 0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x ** 3)));

const XS = [-3, -2, -1, 0, 1, 2, 3];
const functions = [
  { name: "ReLU", f: relu },
  { name: "sigmoid", f: sigmoid },
  { name: "tanh", f: tanh },
  { name: "GELU", f: gelu },
];
const table = functions.map(({ f }) => XS.map(f));
const MINUS_ONE = XS.indexOf(-1);
const geluAtMinusOne = gelu(-1);

// Derivada da sigmoid: σ(x)·(1 − σ(x)), no máximo 0,25 (em x = 0).
const sigmoidSlope = (x: number) => sigmoid(x) * (1 - sigmoid(x));
const MAX_SLOPE = sigmoidSlope(0);
const LAYERS = [1, 2, 3, 4, 5, 6, 7, 8];
const remaining = LAYERS.map((layers) => MAX_SLOPE ** layers);
const afterTen = MAX_SLOPE ** 10;

// Softmax na saída: logits viram probabilidades que somam 1.
const classes = ["gato", "cão", "ave", "peixe", "sapo"];
const logits = [2, 1, 0.1, -1, -0.5];
const exps = logits.map(Math.exp);
const total = exps.reduce((sum, value) => sum + value, 0);
const probs = exps.map((value) => value / total);
const best = probs.indexOf(Math.max(...probs));

const ffn = (active: string): BlockDiagramSpec => ({
  id: "where",
  piece: "block-diagram",
  blocks: [
    { id: "z", kind: "embedding", label: "soma z", col: 0, row: 0 },
    { id: "act", kind: "eval", label: "ativação", col: 1, row: 0 },
    { id: "next", kind: "llm", label: "próxima camada", col: 2, row: 0 },
    { id: "out", kind: "answer", label: "saída", col: 3, row: 0 },
  ],
  edges: [
    { from: "z", to: "act" },
    { from: "act", to: "next", label: "f(z)" },
    { from: "next", to: "out" },
  ],
  active,
});

const lesson: LessonContent = {
  id: "02-04",
  subtitle: "A curva que cada neurônio aplica à sua soma: por que ela existe, como ReLU, sigmoid, tanh e GELU se comportam e o que isso faz com o treino.",
  objectives: [
    "Explicar por que a rede precisa de uma não linearidade",
    "Comparar ReLU, sigmoid, tanh e GELU em valores concretos",
    "Entender como a derivada da ativação afeta o gradiente em redes profundas",
    "Escolher a ativação da camada de saída pelo tipo de tarefa",
  ],
  steps: [
    {
      id: "gate",
      shortTitle: "Para que serve",
      title: "Um dimmer depois de cada soma",
      tag: "context",
      body: [
        "Cada neurônio calcula uma soma z. A [[função de ativação|activation-function]] decide o que sai dali, como um dimmer de luz: pode cortar valores negativos, pode espremer tudo entre 0 e 1, pode suavizar. Sem ela, como você viu na aula de redes, todas as camadas colapsariam numa multiplicação de matriz só.",
        "Formalmente, a ativação é uma função f aplicada elemento a elemento: h = f(x · W + b). Ela precisa ser não linear e, para o treino funcionar, ter derivada fácil de calcular em quase todo ponto, porque é por ela que o gradiente passa na volta.",
      ],
      keyIdea: "A ativação é a dobra que faz a rede desenhar curvas em vez de retas.",
      scene: { kind: "pieces", layout: "single", pieces: [ffn("act")] },
      alt: "A soma z de um neurônio passa pela função de ativação, em destaque, antes de seguir para a próxima camada e para a saída.",
    },
    {
      id: "shapes",
      shortTitle: "Formas",
      title: "Quatro curvas, os mesmos sete pontos",
      tag: "mechanism",
      body: [
        "A tabela aplica cada função a z = −3, −2, …, 3. A [[ReLU|relu]] zera os negativos e copia os positivos. A [[sigmoid|sigmoid]] espreme tudo entre 0 e 1, e a [[tanh|tanh]] entre −1 e 1, com centro no zero. A [[GELU|gelu]] parece a ReLU, mas faz uma curva suave perto do zero.",
        `Repare na coluna de z = −1: a ReLU dá 0, mas a GELU dá ${fixed(geluAtMinusOne)}, deixando passar um pouco de sinal negativo. A GELU vale x · Φ(x), onde Φ é a função de distribuição da normal padrão: cada entrada é ponderada pela chance de ser maior que um ruído gaussiano.`,
      ],
      keyIdea: "ReLU corta, sigmoid e tanh espremem, GELU suaviza o corte.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "shapes",
            piece: "matrix",
            rows: functions.map(({ name }) => name),
            cols: XS.map(String),
            values: table,
            highlight: { row: 3, col: MINUS_ONE },
            showValues: true,
            color: "module-02",
          },
        ],
      },
      alt: `Tabela com ReLU, sigmoid, tanh e GELU aplicadas de −3 a 3; em destaque, a GELU em −1 vale ${fixed(geluAtMinusOne)}, enquanto a ReLU vale 0.`,
    },
    {
      id: "vanishing",
      shortTitle: "Gradiente",
      title: "Por que a sigmoid saiu das camadas escondidas",
      tag: "mechanism",
      body: [
        "No treino, o sinal de erro volta da saída para a entrada passando por cada camada, e em cada uma é multiplicado pela derivada da ativação. Se essa derivada é pequena, o sinal encolhe a cada camada, como um telefone sem fio em que cada pessoa fala mais baixo.",
        `A derivada da sigmoid é σ(z) · (1 − σ(z)), que no máximo vale ${fixed(MAX_SLOPE)}. No melhor caso, depois de 4 camadas sobra ${percent(remaining[3], 2)} do sinal, e depois de 10 sobra ${afterTen.toExponential(1).replace(".", ",")}. É o [[vanishing gradient|vanishing-gradient]]: as primeiras camadas quase não aprendem. A ReLU tem derivada 1 para todo z positivo e não encolhe o sinal ali.`,
      ],
      keyIdea: "Uma ativação com derivada pequena multiplica o gradiente por um número pequeno em cada camada.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "remaining",
            piece: "chart",
            kind: "line",
            series: LAYERS.map((layers, index) => ({ label: `${layers}`, value: Number((remaining[index] * 100).toFixed(3)) })),
            highlight: 3,
            color: "module-02",
          },
        ],
      },
      alt: `Curva do gradiente que sobra, em porcentagem, depois de 1 a 8 camadas de sigmoid no melhor caso: começa em ${percent(remaining[0])} e despenca para quase zero.`,
    },
    {
      id: "output",
      shortTitle: "Saída",
      title: "Na última camada, a ativação é a resposta",
      tag: "example",
      body: [
        `Na saída, a ativação depende da pergunta. Para escolher entre classes, o [[softmax|softmax]] transforma os logits em probabilidades que somam 1. Com os logits [${logits.map((value) => fixed(value, 1)).join("; ")}] para ${classes.join(", ")}, o softmax dá ${percent(probs[best])} para “${classes[best]}”.`,
        "Para sim ou não, uma sigmoid num neurônio só. Para prever um número, como um preço, nenhuma ativação: a saída fica livre. Escolher errado aqui quebra o modelo de um jeito silencioso, por exemplo uma sigmoid numa regressão de preços, que nunca passa de 1.",
      ],
      keyIdea: "Escondidas: ReLU ou GELU. Saída: softmax para classes, sigmoid para sim ou não, nada para números.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "softmax",
            piece: "chart",
            kind: "bar",
            series: classes.map((label, index) => ({ label, value: Number(probs[index].toFixed(3)) })),
            max: 1,
            highlight: best,
            color: "module-02",
          },
          {
            id: "softmax-total",
            piece: "metrics-panel",
            metrics: [
              { id: "top", label: `P(${classes[best]})`, value: percent(probs[best]), color: "module-02" },
              { id: "sum", label: "soma", value: percent(probs.reduce((sum, value) => sum + value, 0)) },
            ],
            highlight: "top",
          },
        ],
      },
      alt: `Barras com as probabilidades do softmax para ${classes.join(", ")}; ${classes[best]} lidera com ${percent(probs[best])} e a soma dá 100%.`,
    },
    {
      id: "modern",
      shortTitle: "Na prática",
      title: "O que os modelos atuais usam",
      tag: "tradeoff",
      body: [
        "A ReLU é barata e não encolhe o gradiente, mas tem um defeito: um neurônio cuja soma fica sempre negativa devolve 0 e derivada 0, e para de aprender. É a “ReLU morta”. Variantes como Leaky ReLU deixam passar um pouquinho dos negativos para evitar isso.",
        "Nos Transformers, a ativação mora na feed-forward de cada bloco. BERT e GPT-2 usam GELU; Llama usa SwiGLU, uma versão com portão que multiplica duas projeções. A troca custa um pouco mais de conta e costuma dar perda menor no mesmo orçamento de treino.",
      ],
      keyIdea: "ReLU é o padrão barato; GELU e SwiGLU são o padrão dos Transformers.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "transformer-ffn",
            piece: "block-diagram",
            blocks: [
              { id: "token", kind: "tokens", label: "token", col: 0, row: 0 },
              { id: "w1", kind: "llm", label: "W1: expande", col: 1, row: 0 },
              { id: "gelu", kind: "eval", label: "GELU", col: 2, row: 0 },
              { id: "w2", kind: "llm", label: "W2: comprime", col: 3, row: 0 },
              { id: "dead", kind: "no-result", label: "relu morta", col: 2, row: 1 },
            ],
            edges: [
              { from: "token", to: "w1" },
              { from: "w1", to: "gelu" },
              { from: "gelu", to: "w2" },
              { from: "gelu", to: "dead", label: "z sempre < 0", variant: "alternative" },
            ],
            active: "gelu",
          },
        ],
      },
      alt: "Na feed-forward de um Transformer, o token é expandido por W1, passa pela GELU, em destaque, e é comprimido por W2; um caminho tracejado mostra o risco da ReLU morta quando a soma fica sempre negativa.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Uma curva por camada",
      tag: "summary",
      body: [
        "A ativação dá à rede a capacidade de dobrar o espaço. Nas camadas escondidas, ReLU e GELU venceram porque deixam o gradiente passar; na saída, a ativação traduz a soma na resposta que a tarefa pede.",
        "Na próxima aula você junta tudo numa passada completa: entrada, pesos, vieses e ativações, camada por camada, até a previsão. É o forward propagation.",
      ],
      keyIdea: "Escolha a ativação pela posição na rede: escondida para o gradiente, saída para a tarefa.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "where",
            piece: "block-diagram",
            blocks: [
              { id: "z", kind: "embedding", label: "entrada", col: 0, row: 0 },
              { id: "act", kind: "eval", label: "relu / gelu", col: 1, row: 0 },
              { id: "next", kind: "llm", label: "camadas", col: 2, row: 0 },
              { id: "out", kind: "answer", label: "softmax", col: 3, row: 0 },
            ],
            edges: [
              { from: "z", to: "act" },
              { from: "act", to: "next" },
              { from: "next", to: "out", label: "probabilidades" },
            ],
            active: "out",
            done: ["z", "act", "next"],
          },
        ],
      },
      alt: "A entrada passa por ativações ReLU ou GELU nas camadas escondidas e termina num softmax, em destaque, que devolve probabilidades.",
    },
  ],
  realWorldExample:
    "No paper da AlexNet (2012), uma rede convolucional de 4 camadas com ReLU chegou a 25% de erro de treino no CIFAR-10 seis vezes mais rápido que a mesma rede com tanh. Foi um dos resultados que tornaram a ReLU o padrão das camadas escondidas.",
  code: {
    language: "python",
    source: `import torch
import torch.nn.functional as F

z = torch.linspace(-3, 3, 7)        # -3, -2, ..., 3
print(torch.relu(z))
print(torch.sigmoid(z))
print(torch.tanh(z))
print(F.gelu(z, approximate="tanh"))

logits = torch.tensor([2.0, 1.0, 0.1, -1.0, -0.5])
print(torch.softmax(logits, dim=0))  # soma 1`,
    caption: "As quatro ativações da tabela e o softmax da saída, nos mesmos valores da aula.",
  },
  tradeOffs: {
    pros: [
      "ReLU é barata e não encolhe o gradiente para valores positivos",
      "GELU e SwiGLU dão perdas menores nos Transformers",
      "Sigmoid e softmax dão saídas lidas direto como probabilidade",
    ],
    cons: [
      "Sigmoid e tanh saturam e causam vanishing gradient em redes profundas",
      "ReLU pode morrer: neurônio com soma sempre negativa para de aprender",
      "GELU e SwiGLU custam mais conta por elemento",
    ],
    alternatives: ["Leaky ReLU e ELU contra neurônios mortos", "SwiGLU nas feed-forward de LLMs"],
  },
  knowledgeCheck: [
    {
      id: "deep-sigmoid",
      prompt: "Uma rede de 30 camadas com sigmoid em todas as camadas escondidas mal sai do lugar no treino. Qual troca ataca a causa?",
      options: [
        "Usar ReLU ou GELU nas camadas escondidas",
        "Usar sigmoid também na saída",
        "Diminuir o número de exemplos",
        "Tirar o viés dos neurônios",
      ],
      correct: 0,
      explanation: "A derivada da sigmoid é no máximo 0,25, e o gradiente é multiplicado por ela em cada camada. ReLU e GELU têm derivada perto de 1 para valores positivos.",
      lesson: "02-04",
    },
    {
      id: "output-choice",
      prompt: "Uma rede prevê o preço de um apartamento em reais. Que ativação usar no neurônio de saída?",
      options: ["Softmax", "Sigmoid", "Nenhuma: saída linear", "ReLU com limite em 1"],
      correct: 2,
      explanation: "Softmax e sigmoid prendem a saída entre 0 e 1. Para prever um número livre, a saída fica linear.",
      lesson: "02-04",
    },
  ],
  related: ["02-03", "02-05", "03-11"],
  references: [
    { title: "Gaussian Error Linear Units (GELUs), Hendrycks & Gimpel", url: "https://arxiv.org/abs/1606.08415", kind: "paper" },
    { title: "PyTorch: torch.nn.GELU", url: "https://pytorch.org/docs/stable/generated/torch.nn.GELU.html", kind: "docs" },
    { title: "Deep Learning, cap. 6: Deep Feedforward Networks", url: "https://www.deeplearningbook.org/contents/mlp.html", kind: "article" },
  ],
};

export default lesson;
