import type { LessonContent } from "../../../types/content";

// Prever quanto tempo uma pizza demora a chegar, pela distância. A reta é ajustada por mínimos quadrados
// com os primeiros n pedidos, e o erro médio nos pedidos de teste mostra o modelo melhorando com a experiência.

interface Order {
  km: number;
  minutes: number;
}

interface Line {
  slope: number;
  intercept: number;
}

const training: Order[] = [
  { km: 2, minutes: 20 },
  { km: 3, minutes: 18 },
  { km: 4, minutes: 21 },
  { km: 1, minutes: 15 },
  { km: 5, minutes: 26 },
  { km: 8, minutes: 36 },
  { km: 7, minutes: 33 },
  { km: 6, minutes: 28 },
];

const test: Order[] = [
  { km: 1.5, minutes: 15 },
  { km: 3.5, minutes: 22 },
  { km: 5.5, minutes: 27 },
  { km: 7.5, minutes: 35 },
];

const fixed = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

/** Mínimos quadrados: inclinação = covariância / variância de km. */
const fitLine = (orders: Order[]): Line => {
  const meanKm = mean(orders.map((order) => order.km));
  const meanMinutes = mean(orders.map((order) => order.minutes));
  const covariance = orders.reduce((sum, order) => sum + (order.km - meanKm) * (order.minutes - meanMinutes), 0);
  const variance = orders.reduce((sum, order) => sum + (order.km - meanKm) ** 2, 0);
  const slope = covariance / variance;
  return { slope, intercept: meanMinutes - slope * meanKm };
};
const predict = (line: Line, km: number) => line.intercept + line.slope * km;
const testError = (line: Line) => mean(test.map((order) => Math.abs(predict(line, order.km) - order.minutes)));

const MIN_ORDERS = 2;
const learningCurve = training
  .map((_, index) => index + 1)
  .filter((count) => count >= MIN_ORDERS)
  .map((count) => ({ count, error: testError(fitLine(training.slice(0, count))) }));
const firstPoint = learningCurve[0];
const lastPoint = learningCurve[learningCurve.length - 1];
const firstLine = fitLine(training.slice(0, MIN_ORDERS));
const finalLine = fitLine(training);

const NEW_KM = 4.5;
const newPrediction = predict(finalLine, NEW_KM);

const lesson: LessonContent = {
  id: "01-01",
  subtitle: "Em vez de escrever as regras, você mostra exemplos com as respostas e o computador descobre a regra sozinho.",
  objectives: [
    "Explicar a diferença entre programar regras e aprender com dados",
    "Reconhecer features, rótulos e dataset numa tabela de exemplos",
    "Ver o erro de um modelo cair conforme ele vê mais exemplos",
    "Distinguir as três famílias: supervisionado, não supervisionado e por reforço",
  ],
  steps: [
    {
      id: "flip",
      shortTitle: "Inverter",
      title: "A programação ao contrário",
      tag: "context",
      body: [
        "Na programação de sempre, alguém escreve as regras, o programa recebe os dados e devolve as respostas. Para estimar o tempo de entrega de uma pizza, seria algo como “10 minutos de forno mais 3 por quilômetro”. Funciona até o trânsito, a chuva e o bairro novo bagunçarem a conta.",
        "[[Machine learning|machine-learning]] inverte a ordem: você entrega os dados junto com as respostas certas, e um algoritmo de treino produz a regra. A regra aprendida é o [[modelo|model]]. Tom Mitchell definiu assim em 1997: um programa aprende quando o seu desempenho numa tarefa melhora com a experiência.",
      ],
      keyIdea: "Programar: regras + dados → respostas. Machine learning: dados + respostas → regras.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flip",
            piece: "block-diagram",
            blocks: [
              { id: "rules", kind: "laptop", label: "regras à mão", col: 0, row: 0 },
              { id: "program", kind: "app", label: "programa", col: 1, row: 0 },
              { id: "answers", kind: "answer", label: "respostas", col: 2, row: 0 },
              { id: "examples", kind: "documents", label: "dados + respostas", col: 0, row: 1 },
              { id: "train", kind: "eval", label: "treino", col: 1, row: 1 },
              { id: "model", kind: "llm", label: "modelo (regra)", col: 2, row: 1 },
            ],
            edges: [
              { from: "rules", to: "program" },
              { from: "program", to: "answers" },
              { from: "examples", to: "train" },
              { from: "train", to: "model", label: "aprende" },
            ],
            active: "train",
          },
        ],
      },
      alt: "Em cima, regras escritas à mão entram num programa que devolve respostas. Embaixo, dados com respostas entram no treino, em destaque, que produz o modelo.",
    },
    {
      id: "table",
      shortTitle: "Exemplos",
      title: "Os exemplos viram uma tabela",
      tag: "mechanism",
      body: [
        `A pizzaria anotou ${training.length} entregas. Cada linha é um exemplo; a coluna “km” é a [[feature|feature]], aquilo que o modelo recebe, e a coluna “minutos” é o [[rótulo|label]], a resposta certa que ele deve aprender a prever. A tabela inteira é o [[dataset|dataset]].`,
        "Num problema real haveria mais features: horário, número de pizzas, chuva. Mas a ideia é a mesma: tudo vira número, porque o algoritmo só sabe fazer contas. Escolher e preparar boas features costuma pesar mais no resultado do que escolher o algoritmo.",
      ],
      keyIdea: "Feature é o que entra, rótulo é o que se quer prever, e o dataset é a coleção de exemplos com os dois.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "orders",
            piece: "matrix",
            rows: training.map((_, index) => `pedido ${index + 1}`),
            cols: ["km", "minutos"],
            values: training.map((order) => [order.km, order.minutes]),
            showValues: true,
            highlight: { row: 0, col: 1 },
            color: "module-01",
          },
        ],
      },
      alt: `Tabela com ${training.length} pedidos: a distância em km de cada entrega e os minutos que ela levou, que são o rótulo.`,
    },
    {
      id: "experience",
      shortTitle: "Experiência",
      title: "Mais exemplos, menos erro",
      tag: "mechanism",
      body: [
        `O algoritmo procura a reta “minutos = a + b · km” que passa mais perto dos pedidos vistos. Com só ${MIN_ORDERS} pedidos, ele tira uma conclusão errada: a reta sai com inclinação de ${fixed(firstLine.slope)} minutos por km, como se a entrega ficasse mais rápida com a distância.`,
        `Para medir, usamos ${test.length} pedidos que o modelo nunca viu. O erro médio cai de ${fixed(firstPoint.error)} minutos, com ${firstPoint.count} pedidos, para ${fixed(lastPoint.error)} minutos, com ${lastPoint.count}. É exatamente a definição de Mitchell: tarefa (prever o tempo), experiência (os pedidos) e desempenho (o erro no teste).`,
      ],
      keyIdea: "Aprender é ajustar números para errar menos, e o erro só vale quando medido em exemplos que o modelo não viu.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "curve",
            piece: "chart",
            kind: "line",
            series: learningCurve.map((point) => ({ label: `${point.count}`, value: Number(point.error.toFixed(1)) })),
            highlight: learningCurve.length - 1,
            color: "module-01",
          },
        ],
      },
      alt: `Curva do erro médio no teste pelo número de pedidos vistos: começa em ${fixed(firstPoint.error)} minutos com ${firstPoint.count} pedidos e termina em ${fixed(lastPoint.error)} com ${lastPoint.count}.`,
    },
    {
      id: "predict",
      shortTitle: "Prever",
      title: "O modelo é a regra aprendida",
      tag: "example",
      body: [
        `Com os ${training.length} pedidos, a regra aprendida é: ${fixed(finalLine.intercept)} minutos fixos mais ${fixed(finalLine.slope)} por km. Ninguém digitou esses números: eles saíram dos dados. Um pedido novo a ${fixed(NEW_KM)} km recebe a previsão de ${fixed(newPrediction)} minutos.`,
        "Usar o modelo para prever se chama [[inferência|inference]]. O treino acontece de vez em quando e custa caro; a inferência acontece a cada pedido e precisa ser rápida. Os dois números da regra são os [[parâmetros|parameter]] do modelo. Um LLM é a mesma ideia com bilhões deles.",
      ],
      keyIdea: "Treinar produz os parâmetros; inferir é aplicar esses parâmetros a uma entrada nova.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "rule",
            piece: "metrics-panel",
            metrics: [
              { id: "fixed", label: "minutos fixos", value: fixed(finalLine.intercept) },
              { id: "slope", label: "minutos por km", value: fixed(finalLine.slope) },
              { id: "prediction", label: `previsão para ${fixed(NEW_KM)} km`, value: `${fixed(newPrediction)} min`, color: "success" },
              { id: "error", label: "erro médio no teste", value: `${fixed(lastPoint.error)} min` },
            ],
            highlight: "prediction",
          },
        ],
      },
      alt: `Painel com a regra aprendida: ${fixed(finalLine.intercept)} minutos fixos, ${fixed(finalLine.slope)} por km, e a previsão de ${fixed(newPrediction)} minutos para ${fixed(NEW_KM)} km.`,
    },
    {
      id: "cost",
      shortTitle: "Custo",
      title: "Machine learning não é de graça",
      tag: "tradeoff",
      body: [
        "Se a regra é conhecida e estável, como calcular um imposto, escreva a regra. Machine learning vale a pena quando a regra é difícil de escrever, muda com o tempo ou depende de muitos fatores ao mesmo tempo, como reconhecer um rosto ou prever um atraso.",
        "O modelo também traz trabalho que a regra não tem: coletar e rotular dados, treinar, avaliar, publicar e monitorar. Quando o mundo muda (um bairro novo, um entregador a mais), os dados antigos deixam de representar o presente e o modelo precisa de treino novo.",
      ],
      keyIdea: "Use machine learning quando os exemplos são mais fáceis de conseguir do que a regra.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "lifecycle",
            piece: "pipeline",
            stages: [
              { id: "collect", label: "coletar" },
              { id: "label", label: "rotular" },
              { id: "train", label: "treinar" },
              { id: "evaluate", label: "avaliar" },
              { id: "deploy", label: "publicar" },
              { id: "monitor", label: "monitorar", color: "module-01" },
            ],
            active: "monitor",
            done: ["collect", "label", "train", "evaluate", "deploy"],
          },
        ],
      },
      alt: "O ciclo de vida de um modelo em etapas: coletar, rotular, treinar, avaliar, publicar e monitorar, a etapa em destaque.",
    },
    {
      id: "families",
      shortTitle: "Famílias",
      title: "Três jeitos de aprender",
      tag: "summary",
      body: [
        "O exemplo da pizza é [[aprendizado supervisionado|supervised-learning]]: cada exemplo vem com a resposta. Quando não há respostas e o objetivo é achar estrutura (grupos, padrões, anomalias), é [[não supervisionado|unsupervised-learning]]. Quando um agente aprende agindo e recebendo recompensas, é [[por reforço|reinforcement-learning]].",
        "As próximas três aulas mostram uma família cada. Um LLM usa as três: aprende a prever o próximo token com o próprio texto como gabarito, é ajustado com exemplos de respostas e depois com recompensas vindas de preferências humanas.",
      ],
      keyIdea: "Com respostas: supervisionado. Sem respostas: não supervisionado. Com recompensas: reforço.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "families",
            piece: "block-diagram",
            blocks: [
              { id: "labeled", kind: "documents", label: "com respostas", col: 0, row: 0 },
              { id: "supervised", kind: "llm", label: "supervisionado", col: 1, row: 0 },
              { id: "raw", kind: "documents", label: "sem respostas", col: 0, row: 1 },
              { id: "unsupervised", kind: "retrieval", label: "acha padrões", col: 1, row: 1 },
              { id: "world", kind: "app", label: "ambiente", col: 2, row: 0.5 },
              { id: "rl", kind: "agent", label: "por reforço", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "labeled", to: "supervised" },
              { from: "raw", to: "unsupervised" },
              { from: "world", to: "rl", label: "recompensa" },
            ],
            active: "supervised",
          },
        ],
      },
      alt: "Três famílias: dados com respostas alimentam o aprendizado supervisionado, em destaque; dados sem respostas alimentam um algoritmo que acha padrões; um ambiente devolve recompensas a um agente que aprende por reforço.",
    },
  ],
  realWorldExample:
    "O Google Maps estima o tempo de chegada com modelos treinados em históricos de trânsito. Em 2020, a DeepMind publicou como redes neurais em grafos melhoraram essas previsões em cidades como Sydney e Taichung.",
  code: {
    language: "python",
    source: `from sklearn.linear_model import LinearRegression

km = [[2], [3], [4], [1], [5], [8], [7], [6]]
minutes = [20, 18, 21, 15, 26, 36, 33, 28]

model = LinearRegression().fit(km, minutes)
print(model.intercept_, model.coef_)  # minutos fixos e minutos por km
print(model.predict([[4.5]]))`,
    caption: "Os mesmos 8 pedidos da aula: o treino encontra os dois parâmetros da reta e a inferência prevê um pedido novo.",
  },
  tradeOffs: {
    pros: [
      "Resolve problemas cuja regra ninguém sabe escrever",
      "Melhora com mais dados, sem reescrever o código",
      "Se adapta a mudanças com um novo treino",
    ],
    cons: [
      "Depende de dados em quantidade e com qualidade",
      "Erra de formas difíceis de prever fora do que viu",
      "Exige avaliar, publicar e monitorar, além de treinar",
    ],
    alternatives: ["Regras escritas à mão, quando o problema é estável e conhecido", "Fórmulas da física ou do negócio, quando existem"],
  },
  knowledgeCheck: [
    {
      id: "when-ml",
      prompt: "Qual destes problemas pede machine learning, e não uma regra escrita à mão?",
      options: [
        "Calcular o frete por uma tabela fixa de faixas de CEP",
        "Detectar se uma foto tem um gato",
        "Converter graus Celsius em Fahrenheit",
        "Somar os itens de um carrinho de compras",
      ],
      correct: 1,
      explanation:
        "Ninguém consegue escrever a regra de “o que é um gato” em pixels, mas é fácil juntar milhares de fotos rotuladas. Os outros problemas têm regra conhecida e estável.",
      lesson: "01-01",
    },
    {
      id: "measure-unseen",
      prompt: "Um modelo de entregas erra 0,5 minuto nos pedidos de treino e 6 minutos em pedidos novos. Qual número indica o desempenho real?",
      options: [
        "0,5 minuto, porque foi medido com mais exemplos",
        "6 minutos, porque foi medido em pedidos que o modelo não viu",
        "A média dos dois",
        "Nenhum: só a acurácia importa",
      ],
      correct: 1,
      explanation: "O modelo existe para prever pedidos futuros. O erro no treino é otimista, porque o modelo ajustou os parâmetros justamente para esses exemplos.",
      lesson: "01-01",
    },
  ],
  related: ["00-02", "01-02", "01-06"],
  references: [
    { title: "Google: Machine Learning Crash Course", url: "https://developers.google.com/machine-learning/crash-course", kind: "article" },
    { title: "scikit-learn: Getting Started", url: "https://scikit-learn.org/stable/getting_started.html", kind: "docs" },
    { title: "An Introduction to Statistical Learning (livro aberto)", url: "https://www.statlearning.com/", kind: "article" },
  ],
};

export default lesson;
