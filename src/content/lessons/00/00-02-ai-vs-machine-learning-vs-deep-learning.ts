import type { LessonContent } from "../../../types/content";

// Três jeitos de resolver um problema, calculados aqui. O machine learning aprende um corte de peso
// para separar limões de laranjas, testando cada candidato nos exemplos; o deep learning recebe a grade
// de pixels crua de um dígito. Toda contagem de parâmetros da aula sai das contas abaixo.

interface Fruit {
  grams: number;
  orange: boolean;
}

const fruits: Fruit[] = [
  { grams: 70, orange: false },
  { grams: 85, orange: false },
  { grams: 95, orange: false },
  { grams: 110, orange: false },
  { grams: 120, orange: false },
  { grams: 115, orange: true },
  { grams: 140, orange: true },
  { grams: 160, orange: true },
  { grams: 180, orange: true },
  { grams: 200, orange: true },
];

const candidates = [60, 80, 100, 120, 140, 160, 180, 200];
const hitsFor = (cut: number) => fruits.filter((fruit) => fruit.grams >= cut === fruit.orange).length;
const accuracyByCut = candidates.map((cut) => ({ label: `${cut} g`, value: hitsFor(cut) / fruits.length }));
const bestIndex = accuracyByCut.reduce((best, item, index) => (item.value > accuracyByCut[best].value ? index : best), 0);
const bestCut = candidates[bestIndex];
const bestHits = hitsFor(bestCut);
const worstHits = Math.min(...candidates.map(hitsFor));

const percent = (value: number) => `${Math.round(value * 100)}%`;
const thousands = (value: number) => value.toLocaleString("pt-BR");

const DIGIT = ["11111", "00001", "00010", "00100", "01000", "01000", "01000"];
const pixels = DIGIT.map((row) => [...row].map(Number));
const gridPixels = pixels.length * pixels[0].length;
const litPixels = pixels.flat().filter((value) => value === 1).length;

const MNIST_SIDE = 28;
const MNIST_PIXELS = MNIST_SIDE * MNIST_SIDE;
const HIDDEN = 128;
const CLASSES = 10;
const denseParameters = (inputs: number, outputs: number) => inputs * outputs + outputs;
const networkParameters = denseParameters(MNIST_PIXELS, HIDDEN) + denseParameters(HIDDEN, CLASSES);
const linearParameters = denseParameters(MNIST_PIXELS, CLASSES);
const GPT3_PARAMETERS_BILLIONS = 175;

const lesson: LessonContent = {
  id: "00-02",
  subtitle: "Três círculos, um dentro do outro: o que muda entre IA, machine learning e deep learning, e quem escolhe as features.",
  objectives: [
    "Situar IA, machine learning e deep learning como conjuntos, um dentro do outro",
    "Reconhecer um sistema de IA que não aprende nada com dados",
    "Explicar o que é uma feature e quem a escolhe em cada abordagem",
    "Comparar o tamanho dos modelos pelo número de parâmetros",
  ],
  steps: [
    {
      id: "circles",
      shortTitle: "Três círculos",
      title: "Um conjunto dentro do outro",
      tag: "context",
      body: [
        "Pense em bonecas russas. A maior é a [[inteligência artificial|artificial-intelligence]]: qualquer programa que faz uma tarefa que pede inteligência. Dentro dela está o [[machine learning|machine-learning]], que aprende a tarefa com exemplos. Dentro do machine learning está o [[deep learning|deep-learning]], que aprende com redes de muitas camadas.",
        "Todo deep learning é machine learning, e todo machine learning é IA. O contrário não vale: um GPS que calcula rotas com o algoritmo A* é IA e não aprende nada. A IA generativa, tema da próxima aula, é um pedaço do deep learning.",
      ],
      keyIdea: "IA é o objetivo; machine learning é um jeito de chegar lá; deep learning é um tipo de machine learning.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "nesting",
            piece: "graph",
            nodes: [
              { id: "ai", label: "IA", x: 0.5, y: 0.05, color: "module-00" },
              { id: "search", label: "busca e regras", x: 0.15, y: 0.4 },
              { id: "ml", label: "machine learning", x: 0.7, y: 0.35, color: "module-00" },
              { id: "classic", label: "árvores, Naive Bayes", x: 0.4, y: 0.7 },
              { id: "dl", label: "deep learning", x: 0.85, y: 0.65, color: "module-00" },
              { id: "genai", label: "IA generativa", x: 0.7, y: 0.95 },
            ],
            edges: [
              { from: "ai", to: "search" },
              { from: "ai", to: "ml" },
              { from: "ml", to: "classic" },
              { from: "ml", to: "dl" },
              { from: "dl", to: "genai" },
            ],
            path: ["ai", "ml", "dl"],
            highlight: ["dl"],
          },
        ],
      },
      alt: "Árvore que parte da IA e se divide em busca e regras e em machine learning; o machine learning se divide em métodos clássicos e deep learning, que contém a IA generativa.",
    },
    {
      id: "no-learning",
      shortTitle: "IA sem dados",
      title: "IA que não aprende: busca e regras",
      tag: "mechanism",
      body: [
        "Um especialista escreve as regras, e o programa as aplica com muita velocidade. O GPS testa caminhos no mapa até achar o mais curto. O Deep Blue, que venceu o campeão mundial de xadrez Garry Kasparov em 1997, avaliava milhões de jogadas com regras de pontuação escritas por pessoas.",
        "Esses sistemas são IA porque resolvem um problema difícil, mas nenhum número deles veio de exemplos. Se o mundo muda, uma pessoa reescreve as regras. Foi o limite que você viu no filtro de spam da aula anterior.",
      ],
      keyIdea: "Busca e regras são IA sem aprendizado: o conhecimento vem de quem escreveu o código.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "expert", kind: "user", label: "especialista", col: 0, row: 0 },
              { id: "rules", kind: "documents", label: "regras", col: 1, row: 0 },
              { id: "engine", kind: "server", label: "busca", col: 2, row: 0 },
              { id: "move", kind: "answer", label: "rota ou jogada", col: 3, row: 0 },
            ],
            edges: [
              { from: "expert", to: "rules", label: "escreve" },
              { from: "rules", to: "engine" },
              { from: "engine", to: "move" },
            ],
            active: "engine",
          },
        ],
      },
      alt: "Um especialista escreve as regras, um motor de busca as aplica e devolve uma rota ou uma jogada.",
    },
    {
      id: "machine-learning",
      shortTitle: "ML",
      title: "Machine learning: aprender um corte",
      tag: "mechanism",
      body: [
        `Você quer separar limões de laranjas pela balança. Em vez de chutar, você pesa ${fruits.length} frutas já identificadas e testa cada corte: “acima de X gramas, é laranja”. O gráfico mostra quantas frutas cada corte acerta. O melhor é ${bestCut} g, com ${bestHits} de ${fruits.length} acertos; o pior acerta só ${worstHits}.`,
        `Isso é [[machine learning|machine-learning]]: o corte de ${bestCut} g é um [[parâmetro|parameter]], escolhido pelos dados. Mas alguém decidiu que o peso importava. O peso é uma [[feature|feature]], e no machine learning clássico quem escolhe as features é uma pessoa.`,
      ],
      keyIdea: "No machine learning clássico, a pessoa escolhe as features e o algoritmo escolhe os parâmetros.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "cuts",
            piece: "chart",
            kind: "line",
            series: accuracyByCut,
            max: 1,
            highlight: bestIndex,
            color: "module-00",
          },
        ],
      },
      alt: `Curva da taxa de acerto de cada corte de peso; o pico fica em ${bestCut} g, com ${percent(bestHits / fruits.length)} de acerto.`,
    },
    {
      id: "deep-learning",
      shortTitle: "DL",
      title: "Deep learning: entrada crua",
      tag: "mechanism",
      body: [
        `Agora a tarefa é ler um dígito escrito à mão. Qual feature usar? “Tem uma linha reta em cima”? Ninguém consegue listar todas. O [[deep learning|deep-learning]] desiste de escolher: a entrada é a grade de pixels crua. Na cena, um 7 numa grade de ${gridPixels} pixels, ${litPixels} acesos.`,
        `Uma [[rede neural|neural-network]] recebe esses números e, camada a camada, monta as próprias features: as primeiras camadas reagem a bordas, as seguintes a traços e cantos, as últimas ao dígito. As imagens do conjunto MNIST têm ${MNIST_SIDE} × ${MNIST_SIDE} = ${MNIST_PIXELS} pixels por dígito.`,
      ],
      keyIdea: "Deep learning aprende as features junto com a decisão, direto dos dados brutos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "digit",
            piece: "matrix",
            rows: DIGIT.map((_, index) => String(index + 1)),
            cols: [...DIGIT[0]].map((_, index) => String(index + 1)),
            values: pixels,
            scale: { min: 0, max: 1 },
            highlight: { row: 0, col: 4 },
            color: "module-00",
          },
        ],
      },
      alt: `Grade de ${DIGIT.length} por ${DIGIT[0].length} pixels com o dígito 7 aceso: uma linha em cima e uma diagonal descendo.`,
    },
    {
      id: "size",
      shortTitle: "Tamanho",
      title: "O preço de aprender as features",
      tag: "tradeoff",
      body: [
        `O corte de peso tem 1 parâmetro. Uma rede pequena para o MNIST, com ${MNIST_PIXELS} entradas, ${HIDDEN} neurônios escondidos e ${CLASSES} saídas, tem ${MNIST_PIXELS} × ${HIDDEN} + ${HIDDEN} + ${HIDDEN} × ${CLASSES} + ${CLASSES} = ${thousands(networkParameters)} parâmetros. O GPT-3 tem ${GPT3_PARAMETERS_BILLIONS} bilhões.`,
        `Mais parâmetros pedem mais exemplos e mais computação, em geral em GPU. Por isso, para dados de tabela com features claras, como peso ou idade, o machine learning clássico ainda costuma ganhar: é menor, mais barato e mais fácil de explicar. Deep learning vence em imagem, áudio e texto.`,
      ],
      keyIdea: "Aprender as features custa parâmetros, dados e computação. Vale a pena quando ninguém sabe escrever as features.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "pixels", kind: "documents", label: `${MNIST_PIXELS} pixels`, col: 0, row: 0 },
              { id: "edges", kind: "embedding", label: "bordas", col: 1, row: 0 },
              { id: "shapes", kind: "embedding", label: "traços", col: 2, row: 0 },
              { id: "net", kind: "llm", label: "rede", col: 3, row: 0 },
            ],
            edges: [
              { from: "pixels", to: "edges" },
              { from: "edges", to: "shapes" },
              { from: "shapes", to: "net", label: "dígito 7" },
            ],
            active: "net",
          },
          {
            id: "params",
            piece: "metrics-panel",
            metrics: [
              { id: "cut", label: "corte de peso", value: "1" },
              { id: "linear", label: `linear, ${MNIST_PIXELS} → ${CLASSES}`, value: thousands(linearParameters) },
              { id: "mlp", label: `rede ${MNIST_PIXELS} → ${HIDDEN} → ${CLASSES}`, value: thousands(networkParameters), color: "module-00" },
              { id: "gpt3", label: "GPT-3", value: `${GPT3_PARAMETERS_BILLIONS} bi` },
            ],
            highlight: "mlp",
          },
        ],
      },
      alt: `Os pixels passam por camadas que detectam bordas e traços até a rede reconhecer o dígito; o painel compara 1 parâmetro do corte com ${thousands(networkParameters)} da rede pequena e ${GPT3_PARAMETERS_BILLIONS} bilhões do GPT-3.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Quem escreve o quê",
      tag: "summary",
      body: [
        "Na IA por regras, a pessoa escreve a decisão. No machine learning, a pessoa escreve as features e o algoritmo aprende a decisão. No deep learning, o algoritmo aprende as features e a decisão, a partir dos dados crus.",
        "Cada passo para dentro dos círculos troca trabalho humano por dados e computação. A próxima aula entra no círculo mais recente: a IA generativa, que usa deep learning para criar texto, imagem e código.",
      ],
      keyIdea: "Quanto mais para dentro do círculo, menos regras escritas e mais coisas aprendidas dos dados.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "summary",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "rules", label: "IA: regras e busca" },
              { id: "ml", label: "ML: features escolhidas" },
              { id: "dl", label: "DL: features aprendidas", color: "module-00" },
              { id: "genai", label: "IA generativa", color: "brand" },
            ],
          },
        ],
      },
      alt: "Sequência de chips: IA com regras e busca, machine learning com features escolhidas, deep learning com features aprendidas e IA generativa.",
    },
  ],
  realWorldExample:
    "Em 2012, a rede AlexNet venceu a competição ImageNet de classificação de imagens com uma margem grande sobre os métodos com features escritas à mão. Foi o marco que fez a visão computacional trocar features manuais por deep learning.",
  tradeOffs: {
    pros: [
      "Regras: previsíveis, fáceis de auditar e sem necessidade de dados",
      "Machine learning clássico: modelos pequenos, rápidos e explicáveis em dados de tabela",
      "Deep learning: aprende features que ninguém saberia escrever, em imagem, áudio e texto",
    ],
    cons: [
      "Regras: quebram quando o mundo muda e exigem manutenção manual",
      "Machine learning clássico: depende de boas features escolhidas por pessoas",
      "Deep learning: pede muitos dados, GPU e é difícil de explicar",
    ],
    alternatives: ["Comece pelo método mais simples que resolve e só suba de círculo quando ele falhar"],
  },
  knowledgeCheck: [
    {
      id: "is-it-ml",
      prompt: "Um app de mapas calcula a rota mais rápida testando caminhos com o algoritmo A*. Como classificar esse sistema?",
      options: [
        "Deep learning, porque é complexo",
        "IA sem machine learning: resolve um problema difícil por busca, sem aprender com exemplos",
        "Machine learning, porque usa dados de mapa",
        "Não é IA, porque não tem rede neural",
      ],
      correct: 1,
      explanation: "Busca é um método clássico de IA. Usar dados não basta para ser machine learning: é preciso ajustar parâmetros a partir de exemplos.",
      lesson: "00-02",
    },
    {
      id: "tabular-data",
      prompt: "Você tem uma planilha com idade, renda e histórico de pagamento de clientes e quer prever inadimplência. Qual é o ponto de partida mais sensato?",
      options: [
        "Uma rede neural profunda com bilhões de parâmetros",
        "Um modelo de machine learning clássico sobre essas features, como uma árvore de decisão",
        "Um conjunto de regras sem olhar os dados",
        "Um modelo de imagem",
      ],
      correct: 1,
      explanation: "Os dados já vêm com features claras. O machine learning clássico costuma ser forte em dados de tabela, com menos dados e menos custo que o deep learning.",
      lesson: "00-02",
    },
  ],
  related: ["00-01", "00-03", "02-01"],
  references: [
    { title: "Artificial Intelligence: A Modern Approach (Russell & Norvig)", url: "https://aima.cs.berkeley.edu/", kind: "article" },
    { title: "Deep Learning (Goodfellow, Bengio & Courville), livro aberto", url: "https://www.deeplearningbook.org/", kind: "article" },
    { title: "TensorFlow Datasets: MNIST", url: "https://www.tensorflow.org/datasets/catalog/mnist", kind: "docs" },
  ],
};

export default lesson;
