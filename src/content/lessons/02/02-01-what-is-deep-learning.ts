import type { LessonContent } from "../../../types/content";

// O XOR é o exemplo clássico de que uma camada só não basta. Aqui a aula testa todas as retas de uma
// grade (uma camada, sem features intermediárias) e uma rede com uma camada escondida de 2 neurônios.
// Todo número da cena sai das contas abaixo.

type Input = [number, number];

const step = (z: number) => (z >= 0 ? 1 : 0);
const xor = ([a, b]: Input) => (a !== b ? 1 : 0);
const INPUTS: Input[] = [
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 1],
];

// Uma camada só: a saída é step(w1·x1 + w2·x2 + b). Grade de −2 a 2, de 0,5 em 0,5, para os 3 números.
const GRID = Array.from({ length: 9 }, (_, index) => -2 + index * 0.5);
const linearHits = GRID.flatMap((w1) =>
  GRID.flatMap((w2) =>
    GRID.map((b) => INPUTS.filter((x) => step(w1 * x[0] + w2 * x[1] + b) === xor(x)).length),
  ),
);
const totalLines = linearHits.length;
const bestLinear = Math.max(...linearHits);
const hitsHistogram = [0, 1, 2, 3, 4].map((hits) => ({
  label: `${hits} de 4`,
  value: linearHits.filter((value) => value === hits).length,
}));
const bestLinearCount = hitsHistogram[bestLinear].value;

// Rede com uma camada escondida: h1 aprende "OU", h2 aprende "E", e a saída combina as duas.
const orUnit = (x: Input) => step(x[0] + x[1] - 0.5);
const andUnit = (x: Input) => step(x[0] + x[1] - 1.5);
const deepOutput = (x: Input) => step(orUnit(x) - andUnit(x) - 0.5);
const deepHits = INPUTS.filter((x) => deepOutput(x) === xor(x)).length;
const xorTable = INPUTS.map((x) => [x[0], x[1], orUnit(x), andUnit(x), deepOutput(x)]);

const percent = (hits: number) => `${Math.round((hits / INPUTS.length) * 100)}%`;

const lesson: LessonContent = {
  id: "02-01",
  subtitle: "Por que empilhar camadas muda o jogo: a rede aprende as próprias features, das mais simples às mais abstratas.",
  objectives: [
    "Explicar o que o “profundo” de deep learning quer dizer",
    "Mostrar, com o XOR, por que uma camada só não resolve certos problemas",
    "Entender a ideia de representação aprendida em camadas",
    "Saber quando deep learning vale o custo e quando um modelo clássico basta",
  ],
  steps: [
    {
      id: "layers",
      shortTitle: "Camadas",
      title: "Uma linha de montagem de features",
      tag: "context",
      body: [
        "Pense em como você reconhece um gato numa foto. Ninguém pensa “pixel 3.512 está escuro”. Primeiro aparecem bordas, depois formas como orelhas e olhos, e só no fim a ideia de gato. [[Deep learning|deep-learning]] copia esse jeito em etapas: cada camada recebe o que a anterior achou e monta algo um pouco mais abstrato.",
        "Tecnicamente, uma [[rede neural|neural-network]] profunda é uma composição de funções f₃(f₂(f₁(x))). O que muda em relação ao machine learning clássico é que ninguém escreve as [[features|feature]] à mão: as camadas do meio aprendem as próprias, e isso se chama [[representation learning|representation-learning]].",
      ],
      keyIdea: "Profundo quer dizer muitas camadas, e cada camada transforma a saída da anterior numa representação mais útil.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "hierarchy",
            piece: "block-diagram",
            blocks: [
              { id: "pixels", kind: "documents", label: "pixels", col: 0, row: 0 },
              { id: "edges", kind: "embedding", label: "bordas", col: 1, row: 0 },
              { id: "parts", kind: "embedding", label: "orelhas, olhos", col: 2, row: 0 },
              { id: "answer", kind: "answer", label: "gato", col: 3, row: 0 },
            ],
            edges: [
              { from: "pixels", to: "edges", label: "camada 1" },
              { from: "edges", to: "parts", label: "camada 2" },
              { from: "parts", to: "answer", label: "camada 3" },
            ],
            active: "parts",
            done: ["pixels", "edges"],
          },
        ],
      },
      alt: "Pixels entram na camada 1, que acha bordas; a camada 2 combina bordas em orelhas e olhos, em destaque; a camada 3 responde gato.",
    },
    {
      id: "xor",
      shortTitle: "XOR",
      title: "O problema que uma camada não resolve",
      tag: "mechanism",
      body: [
        "O XOR, ou “ou exclusivo”, responde 1 quando exatamente uma das duas entradas é 1. Parece bobo, mas tente separar os pontos (0, 1) e (1, 0) dos pontos (0, 0) e (1, 1) com uma única reta: não dá. Um modelo de uma camada só consegue desenhar uma reta.",
        `A aula testou ${totalLines} retas diferentes, w₁·x₁ + w₂·x₂ + b com cada número de −2 a 2. O gráfico conta quantas acertam 0, 1, 2, 3 ou 4 dos 4 casos. A melhor acerta ${bestLinear} de 4 (${percent(bestLinear)}), e nenhuma chega a 4: o XOR não é linearmente separável.`,
      ],
      keyIdea: "Uma camada só traça uma fronteira reta; muitos problemas reais precisam de fronteiras curvas.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "linear-search",
            piece: "chart",
            kind: "bar",
            series: hitsHistogram,
            highlight: bestLinear,
            color: "module-02",
          },
        ],
      },
      alt: `Barras com quantas das ${totalLines} retas testadas acertam 0, 1, 2, 3 ou 4 casos do XOR; ${bestLinearCount} acertam 3 e nenhuma acerta os 4.`,
    },
    {
      id: "hidden",
      shortTitle: "Camada oculta",
      title: "Uma camada no meio cria as features certas",
      tag: "mechanism",
      body: [
        "Agora coloque dois neurônios entre a entrada e a saída. Um deles liga quando pelo menos uma entrada é 1 (o “OU”). O outro liga só quando as duas são 1 (o “E”). A saída faz a conta “OU, mas não E”, e isso é exatamente o XOR.",
        `Com pesos escritos à mão, h₁ = step(x₁ + x₂ − 0,5), h₂ = step(x₁ + x₂ − 1,5) e y = step(h₁ − h₂ − 0,5), a rede acerta ${deepHits} de 4. O ponto central: no espaço de (h₁, h₂) o problema virou separável por uma reta. Em deep learning, o treino encontra sozinho essas features intermediárias.`,
      ],
      keyIdea: "A camada escondida reescreve a entrada num espaço onde o problema fica fácil.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "xor-table",
            piece: "matrix",
            rows: INPUTS.map(([a, b]) => `(${a}, ${b})`),
            cols: ["x1", "x2", "OU", "E", "y"],
            values: xorTable,
            scale: { min: 0, max: 1 },
            highlight: { row: 3, col: 4 },
            showValues: true,
            color: "module-02",
          },
        ],
      },
      alt: "Tabela das 4 entradas do XOR com as colunas x1, x2, as features OU e E da camada escondida e a saída y, que acerta os 4 casos.",
    },
    {
      id: "compare",
      shortTitle: "Comparação",
      title: "Uma camada contra duas",
      tag: "example",
      body: [
        `No mesmo problema, a melhor reta acerta ${percent(bestLinear)} e a rede com uma camada escondida acerta ${percent(deepHits)}. A diferença não veio de mais dados nem de um computador maior: veio de uma etapa a mais de representação.`,
        "Esse resultado tem nome na teoria: o teorema da aproximação universal diz que uma rede com uma camada escondida e uma não linearidade aproxima qualquer função contínua, desde que tenha neurônios suficientes. Na prática, empilhar camadas costuma pedir bem menos neurônios do que alargar uma camada só.",
      ],
      keyIdea: "Profundidade troca neurônios por composição: funções simples empilhadas descrevem coisas complicadas.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "score",
            piece: "metrics-panel",
            metrics: [
              { id: "linear", label: "melhor reta", value: `${bestLinear} de 4`, color: "danger" },
              { id: "deep", label: "rede com camada oculta", value: `${deepHits} de 4`, color: "success" },
              { id: "tested", label: "retas testadas", value: String(totalLines) },
            ],
            highlight: "deep",
          },
          {
            id: "xor-table",
            piece: "matrix",
            rows: INPUTS.map(([a, b]) => `(${a}, ${b})`),
            cols: ["x1", "x2", "OU", "E", "y"],
            values: xorTable,
            scale: { min: 0, max: 1 },
            showValues: true,
            color: "module-02",
          },
        ],
      },
      alt: `Painel: a melhor das ${totalLines} retas acerta ${bestLinear} de 4 casos do XOR e a rede com camada oculta acerta ${deepHits} de 4, com a tabela de features embaixo.`,
    },
    {
      id: "when",
      shortTitle: "Quando usar",
      title: "Quando deep learning vale a pena",
      tag: "tradeoff",
      body: [
        "Para uma planilha com 20 colunas bem escolhidas, um modelo clássico como árvore de decisão costuma ganhar: treina em segundos e é fácil de explicar. Deep learning brilha quando a entrada é bruta e enorme, como pixels, áudio ou texto, onde escrever features à mão é inviável.",
        "O preço é alto: muitos exemplos rotulados, horas ou semanas de [[GPU|gpu]] e milhões de [[parâmetros|parameter]] difíceis de interpretar. Por isso o fluxo comum é reaproveitar uma rede já treinada e só ajustá-la, em vez de treinar do zero.",
      ],
      keyIdea: "Dados tabulares pequenos: modelo clássico. Dados brutos e muitos exemplos: deep learning.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "choice",
            piece: "block-diagram",
            blocks: [
              { id: "table", kind: "sql-db", label: "tabela pequena", col: 0, row: 0 },
              { id: "classic", kind: "eval", label: "ml clássico", col: 1, row: 0 },
              { id: "raw", kind: "documents", label: "imagem, texto", col: 0, row: 1 },
              { id: "deep", kind: "llm", label: "rede profunda", col: 1, row: 1 },
              { id: "gpu", kind: "server", label: "gpu", col: 2, row: 1 },
            ],
            edges: [
              { from: "table", to: "classic", label: "features prontas" },
              { from: "raw", to: "deep", label: "dados brutos" },
              { from: "gpu", to: "deep", label: "treino" },
            ],
            active: "deep",
          },
        ],
      },
      alt: "Uma tabela pequena vai para um modelo clássico; imagens e textos brutos vão para uma rede profunda, em destaque, treinada numa GPU.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "O que vem pela frente",
      tag: "summary",
      body: [
        "Deep learning é machine learning com redes de muitas camadas, que aprendem representações em vez de receber features prontas. O XOR mostrou o porquê: uma camada escondida transformou um problema impossível para uma reta num problema fácil.",
        "No resto do módulo você vai abrir essa caixa: o que é uma rede, o que faz cada neurônio, como os dados passam por ela, como ela aprende com backpropagation e gradient descent, e por que tudo isso roda em GPUs.",
      ],
      keyIdea: "Deep learning = camadas que aprendem representações + muitos dados + muita conta em paralelo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "hierarchy",
            piece: "block-diagram",
            blocks: [
              { id: "pixels", kind: "documents", label: "dados brutos", col: 0, row: 0 },
              { id: "edges", kind: "embedding", label: "features simples", col: 1, row: 0 },
              { id: "parts", kind: "embedding", label: "features ricas", col: 2, row: 0 },
              { id: "answer", kind: "answer", label: "previsão", col: 3, row: 0 },
            ],
            edges: [
              { from: "pixels", to: "edges" },
              { from: "edges", to: "parts" },
              { from: "parts", to: "answer" },
            ],
            active: "answer",
            done: ["pixels", "edges", "parts"],
          },
        ],
      },
      alt: "Dados brutos viram features simples, depois features ricas, e chegam à previsão, em destaque.",
    },
  ],
  realWorldExample:
    "Em 2012, a AlexNet, uma rede convolucional de 8 camadas treinada em 2 GPUs, venceu o desafio ImageNet com 15,3% de erro top-5, contra 26,2% do segundo colocado, que usava features feitas à mão. Foi o resultado que levou a visão computacional inteira para deep learning.",
  code: {
    language: "python",
    source: `import torch
from torch import nn

X = torch.tensor([[0., 0.], [0., 1.], [1., 0.], [1., 1.]])
y = torch.tensor([[0.], [1.], [1.], [0.]])

model = nn.Sequential(nn.Linear(2, 4), nn.ReLU(), nn.Linear(4, 1))
optimizer = torch.optim.Adam(model.parameters(), lr=0.05)
loss_fn = nn.BCEWithLogitsLoss()

for _ in range(500):
    optimizer.zero_grad()
    loss = loss_fn(model(X), y)
    loss.backward()
    optimizer.step()

print((model(X) > 0).int().flatten())`,
    caption: "O XOR aprendido por uma rede com uma camada escondida: em vez dos pesos escritos à mão da aula, o treino encontra as features intermediárias.",
  },
  tradeOffs: {
    pros: [
      "Aprende features direto de dados brutos, sem engenharia manual",
      "Melhora com mais dados e mais computação de um jeito que modelos clássicos não acompanham",
      "Uma rede pré-treinada pode ser reaproveitada em muitas tarefas",
    ],
    cons: [
      "Precisa de muitos exemplos e de GPU para treinar",
      "Milhões de parâmetros difíceis de interpretar",
      "Em dados tabulares pequenos, costuma perder para modelos clássicos mais simples",
    ],
    alternatives: ["Árvores de decisão e gradient boosting para dados tabulares", "Regressão logística quando o problema é quase linear"],
  },
  knowledgeCheck: [
    {
      id: "why-depth",
      prompt: "Um modelo de uma camada não consegue separar os casos do XOR. O que a camada escondida faz para resolver?",
      options: [
        "Decora as quatro respostas",
        "Transforma a entrada em novas features (como OU e E) onde uma reta separa as classes",
        "Aumenta a taxa de aprendizado",
        "Remove os casos difíceis do treino",
      ],
      correct: 1,
      explanation: "A camada escondida cria uma representação nova. No espaço de (OU, E), o XOR vira “OU e não E”, que uma reta separa.",
      lesson: "02-01",
    },
    {
      id: "tabular-choice",
      prompt: "Você tem 2 mil linhas de uma planilha com 15 colunas numéricas bem definidas. Qual é a escolha mais sensata para começar?",
      options: [
        "Uma rede profunda com 50 camadas",
        "Um modelo clássico, como gradient boosting, e só depois testar uma rede se ele não bastar",
        "Treinar um LLM do zero",
        "Uma CNN, porque toda planilha é uma imagem",
      ],
      correct: 1,
      explanation: "Com poucos dados tabulares e features prontas, modelos clássicos costumam ser mais precisos, mais baratos e mais fáceis de explicar.",
      lesson: "02-01",
    },
  ],
  related: ["00-02", "02-02", "02-08"],
  references: [
    { title: "Deep Learning (Goodfellow, Bengio & Courville), livro aberto", url: "https://www.deeplearningbook.org/", kind: "article" },
    { title: "Visualizing and Understanding Convolutional Networks (Zeiler & Fergus)", url: "https://arxiv.org/abs/1311.2901", kind: "paper" },
    { title: "PyTorch: documentação oficial", url: "https://pytorch.org/docs/stable/index.html", kind: "docs" },
  ],
};

export default lesson;
