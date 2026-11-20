import { softmax } from "../../../lab/attention";
import type { VectorPoint } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Prever se um cliente vai cancelar a assinatura com regressão logística em duas features: semanas sem
// usar o app e chamados abertos no suporte. Os pesos são treinados aqui por descida do gradiente na
// cross-entropy; probabilidades, fronteira e contagens por limiar saem dessas contas.

interface Customer {
  id: string;
  weeks: number;
  tickets: number;
  churned: boolean;
}

const customers: Customer[] = [
  { id: "c1", weeks: 0, tickets: 0, churned: false },
  { id: "c2", weeks: 0.5, tickets: 1, churned: false },
  { id: "c3", weeks: 1, tickets: 0, churned: false },
  { id: "c4", weeks: 1, tickets: 2, churned: false },
  { id: "c5", weeks: 2, tickets: 0.5, churned: false },
  { id: "c6", weeks: 3, tickets: 2.5, churned: false },
  { id: "c7", weeks: 1, tickets: 1, churned: true },
  { id: "c8", weeks: 3, tickets: 1, churned: true },
  { id: "c9", weeks: 3.5, tickets: 3, churned: true },
  { id: "c10", weeks: 4, tickets: 2, churned: true },
  { id: "c11", weeks: 2.5, tickets: 3.5, churned: true },
];

const sigmoid = (value: number) => 1 / (1 + Math.exp(-value));
const percent = (value: number) => `${Math.round(value * 100)}%`;
const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

// Descida do gradiente na cross-entropy média: o gradiente de cada exemplo é (p − y) · x.
const LEARNING_RATE = 0.5;
const ITERATIONS = 3000;
let wWeeks = 0;
let wTickets = 0;
let bias = 0;
const scoreOf = (weeks: number, tickets: number) => wWeeks * weeks + wTickets * tickets + bias;
for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
  let gradWeeks = 0;
  let gradTickets = 0;
  let gradBias = 0;
  for (const customer of customers) {
    const error = sigmoid(scoreOf(customer.weeks, customer.tickets)) - (customer.churned ? 1 : 0);
    gradWeeks += error * customer.weeks;
    gradTickets += error * customer.tickets;
    gradBias += error;
  }
  wWeeks -= (LEARNING_RATE * gradWeeks) / customers.length;
  wTickets -= (LEARNING_RATE * gradTickets) / customers.length;
  bias -= (LEARNING_RATE * gradBias) / customers.length;
}

const probabilityOf = (customer: Customer) => sigmoid(scoreOf(customer.weeks, customer.tickets));
const ranked = [...customers]
  .map((customer) => ({ customer, probability: probabilityOf(customer) }))
  .sort((a, b) => a.probability - b.probability);
const THRESHOLD = 0.5;
const predictedChurn = (probability: number, threshold: number) => probability >= threshold;
const hits = ranked.filter((item) => predictedChurn(item.probability, THRESHOLD) === item.customer.churned).length;
const churners = customers.filter((customer) => customer.churned).length;

const thresholds = [0.3, 0.5, 0.7].map((threshold) => {
  const flagged = ranked.filter((item) => predictedChurn(item.probability, threshold));
  return { threshold, flagged: flagged.length, caught: flagged.filter((item) => item.customer.churned).length };
});
const lowThreshold = thresholds[0];
const highThreshold = thresholds[thresholds.length - 1];

const NEW_CUSTOMER = { weeks: 3, tickets: 2 };
const newProbability = sigmoid(scoreOf(NEW_CUSTOMER.weeks, NEW_CUSTOMER.tickets));

// Fronteira de decisão: os pontos em que w₁ · semanas + w₂ · chamados + b = 0, isto é, p = 50%.
const boundaryWeeks = (tickets: number) => -(bias + wTickets * tickets) / wWeeks;
const BOUNDARY_FROM = 0;
const BOUNDARY_TO = 4;
const classPoints: VectorPoint[] = customers.map((customer) => ({
  id: customer.id,
  label: customer.churned ? "cancela" : "fica",
  coords: [customer.weeks, customer.tickets],
  color: customer.churned ? "danger" : "success",
}));
const boundaryPoints: VectorPoint[] = [
  { id: "b0", label: "", coords: [boundaryWeeks(BOUNDARY_FROM), BOUNDARY_FROM], color: "ink" },
  { id: "b1", label: "p = 50%", coords: [boundaryWeeks(BOUNDARY_TO), BOUNDARY_TO], color: "ink" },
];

// Três classes de ticket: logits escritos à mão, probabilidades pelo softmax.
const ticketClasses = ["bug", "cobrança", "dúvida"];
const tickets = [
  { text: "app fecha sozinho", logits: [2.4, 0.1, 0.6] },
  { text: "cobrado duas vezes", logits: [0.2, 3, 0.4] },
  { text: "como exporto?", logits: [0.8, 0.3, 1.1] },
];
const ticketProbabilities = tickets.map((ticket) => softmax(ticket.logits));
const UNSURE = 2;
const unsureTop = Math.max(...ticketProbabilities[UNSURE]);

const lesson: LessonContent = {
  id: "01-05",
  subtitle: "Escolher uma entre algumas categorias: a pontuação vira probabilidade, e um limiar vira decisão.",
  objectives: [
    "Treinar uma regressão logística e ler a probabilidade que ela devolve",
    "Desenhar a fronteira de decisão de um classificador linear",
    "Ver como o limiar troca falsos alarmes por casos perdidos",
    "Estender para várias classes com softmax",
  ],
  steps: [
    {
      id: "boxes",
      shortTitle: "Categorias",
      title: "Pôr cada caso numa caixa",
      tag: "context",
      body: [
        "O carteiro olha o endereço e põe a carta numa das caixas do bairro. [[Classificação|classification]] é a tarefa supervisionada em que a resposta é uma categoria: spam ou não, gato ou cachorro, cancela ou fica. Com duas categorias é binária; com mais, multiclasse.",
        `Um serviço de assinatura quer saber quem vai cancelar, para oferecer ajuda antes. O modelo recebe duas [[features|feature]] por cliente (semanas sem usar o app e chamados abertos) e devolve uma probabilidade. Um cliente com ${NEW_CUSTOMER.weeks} semanas sem uso e ${NEW_CUSTOMER.tickets} chamados recebe ${percent(newProbability)} de chance de cancelar.`,
      ],
      keyIdea: "Classificar é escolher uma categoria; um bom classificador diz também o quanto tem certeza.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "classifier",
            piece: "block-diagram",
            blocks: [
              { id: "customer", kind: "user", label: "cliente", col: 0, row: 0.5 },
              { id: "features", kind: "embedding", label: "features", col: 1, row: 0.5 },
              { id: "model", kind: "llm", label: "classificador", col: 2, row: 0.5 },
              { id: "churn", kind: "answer", label: `cancela: ${percent(newProbability)}`, col: 3, row: 0 },
              { id: "stay", kind: "app", label: "fica", col: 3, row: 1 },
            ],
            edges: [
              { from: "customer", to: "features", label: "uso, chamados" },
              { from: "features", to: "model" },
              { from: "model", to: "churn", label: "p ≥ 50%" },
              { from: "model", to: "stay", label: "p < 50%", variant: "alternative" },
            ],
            active: "model",
          },
        ],
      },
      alt: `Um cliente vira features, que entram no classificador, em destaque; ele devolve ${percent(newProbability)} de chance de cancelar e decide por cancela acima de 50% ou fica abaixo.`,
    },
    {
      id: "boundary",
      shortTitle: "Fronteira",
      title: "Uma reta separa as classes",
      tag: "mechanism",
      body: [
        "A [[regressão logística|logistic-regression]] dá um peso a cada feature, soma tudo com uma constante e passa o resultado pela sigmoide, que espreme qualquer número entre 0 e 1. Pontuação 0 vira exatamente 50%.",
        `Depois de ${ITERATIONS.toLocaleString("pt-BR")} passos de descida do gradiente, os pesos ficaram em ${fixed(wWeeks)} por semana sem uso e ${fixed(wTickets)} por chamado, com constante ${fixed(bias)}. Os pontos em que a pontuação é zero formam uma reta: a [[fronteira de decisão|decision-boundary]] da cena. Do lado direito dela, o modelo diz “cancela”. ${hits} dos ${customers.length} clientes de treino ficam do lado certo: com uma reta, nem sempre dá para separar tudo.`,
      ],
      keyIdea: "Regressão logística: p = sigmoide(w · x + b). A fronteira é onde w · x + b = 0.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "plane",
            piece: "vector-space",
            points: [...classPoints, ...boundaryPoints],
            vectors: [{ from: "b0", to: "b1" }],
          },
        ],
      },
      alt: `Clientes no plano de semanas sem uso e chamados, verdes os que ficaram e vermelhos os que cancelaram, com a reta da fronteira de decisão; ${hits} de ${customers.length} ficam do lado certo.`,
    },
    {
      id: "probabilities",
      shortTitle: "Probabilidade",
      title: "Cada cliente recebe uma chance",
      tag: "mechanism",
      body: [
        "Ordenando os clientes pela probabilidade, a fronteira vira uma linha horizontal em 50%. A distância até a fronteira vira confiança: quem está longe dela recebe uma chance perto de 0% ou de 100%; quem está perto fica em torno de 50%.",
        "Os pesos foram treinados minimizando a [[cross-entropy|cross-entropy]]: −log da probabilidade dada à classe certa. O gradiente dela para cada cliente é simplesmente (p − y) vezes as features, o que torna o treino barato e estável. A aula 01-12 detalha essa perda.",
      ],
      keyIdea: "A probabilidade carrega mais informação que a classe: ela diz o quanto confiar na decisão.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "scores",
            piece: "chart",
            kind: "bar",
            series: ranked.map((item) => ({ label: item.customer.id, value: Number(item.probability.toFixed(2)) })),
            max: 1,
            cutoff: { mode: "threshold", value: THRESHOLD, label: "50%" },
            color: "module-01",
          },
        ],
      },
      alt: `Barras com a probabilidade de cancelar de cada cliente, em ordem crescente, e a linha do limiar em 50%.`,
    },
    {
      id: "threshold",
      shortTitle: "Limiar",
      title: "O limiar é uma decisão de negócio",
      tag: "example",
      body: [
        `50% não é obrigatório. Com limiar de ${percent(lowThreshold.threshold)}, o modelo marca ${lowThreshold.flagged} clientes e pega ${lowThreshold.caught} dos ${churners} que cancelaram. Com ${percent(highThreshold.threshold)}, marca só ${highThreshold.flagged} e pega ${highThreshold.caught}.`,
        "Limiar baixo pega mais casos, ao custo de mais alarmes falsos; limiar alto erra menos quando marca, mas deixa casos passarem. Se ligar para um cliente é barato e perder um cliente é caro, vale baixar o limiar. Esse dilema tem nome e métricas próprias na aula 01-10.",
      ],
      keyIdea: "O modelo dá a probabilidade; quem escolhe o limiar é o custo de cada tipo de erro.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "thresholds",
            piece: "metrics-panel",
            metrics: thresholds.map((item) => ({
              id: `t${Math.round(item.threshold * 100)}`,
              label: `limiar ${percent(item.threshold)}`,
              value: `${item.caught} de ${churners} pegos, ${item.flagged} marcados`,
              color: item.threshold === THRESHOLD ? "success" : undefined,
            })),
            highlight: `t${Math.round(lowThreshold.threshold * 100)}`,
          },
        ],
      },
      alt: `Painel com três limiares: ${thresholds.map((item) => `${percent(item.threshold)} marca ${item.flagged} e pega ${item.caught} de ${churners}`).join("; ")}.`,
    },
    {
      id: "multiclass",
      shortTitle: "Multiclasse",
      title: "Mais de duas caixas",
      tag: "tradeoff",
      body: [
        `Para triar tickets em ${ticketClasses.join(", ")}, o modelo dá uma pontuação ([[logit|logit]]) para cada classe e o [[softmax|softmax]] transforma as pontuações em probabilidades que somam 1. Cada linha da matriz é um ticket.`,
        `O último ticket mostra um limite: a classe mais provável tem só ${percent(unsureTop)}. Um classificador sempre escolhe uma das caixas que conhece, mesmo quando nenhuma serve. Em produção, uma regra comum é mandar para uma pessoa os casos com confiança baixa e criar uma classe “outros”.`,
      ],
      keyIdea: "Multiclasse: um logit por classe e softmax; confiança baixa merece revisão.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "tickets",
            piece: "matrix",
            rows: tickets.map((ticket) => ticket.text),
            cols: ticketClasses,
            values: ticketProbabilities.map((row) => row.map((value) => Number(value.toFixed(2)))),
            scale: { min: 0, max: 1 },
            showValues: true,
            highlight: { row: UNSURE, col: ticketProbabilities[UNSURE].indexOf(unsureTop) },
            color: "module-01",
          },
        ],
      },
      alt: `Matriz de probabilidades de três tickets nas classes ${ticketClasses.join(", ")}; os dois primeiros têm uma classe clara e o último fica dividido, com no máximo ${percent(unsureTop)}.`,
    },
    {
      id: "router",
      shortTitle: "Resumo",
      title: "Classificadores na frente dos LLMs",
      tag: "summary",
      body: [
        "Juntando: features entram, uma pontuação sai, a sigmoide (duas classes) ou o softmax (várias) vira probabilidade, e um limiar vira decisão. A fronteira de um modelo linear é uma reta; redes neurais desenham fronteiras curvas.",
        "Em sistemas com LLM, um classificador barato costuma decidir o caminho: que tipo de pedido é, se é seguro, qual ferramenta chamar. E o próprio LLM é um classificador gigante: a cada passo, escolhe um entre dezenas de milhares de tokens com softmax. Na próxima aula, a saída deixa de ser categoria e vira número: regressão.",
      ],
      keyIdea: "Pontuação, probabilidade, limiar: a mesma receita do filtro de spam ao próximo token.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "routing",
            piece: "block-diagram",
            blocks: [
              { id: "phone", kind: "phone", label: "mensagem", col: 0, row: 0.5 },
              { id: "router", kind: "guardrail", label: "classificador", col: 1, row: 0.5 },
              { id: "billing", kind: "tool", label: "cobrança", col: 2, row: 0 },
              { id: "support", kind: "agent", label: "suporte técnico", col: 2, row: 1 },
              { id: "human", kind: "user", label: "pessoa (incerto)", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "phone", to: "router" },
              { from: "router", to: "billing", label: "cobrança" },
              { from: "router", to: "support", label: "bug" },
              { from: "router", to: "human", label: "confiança baixa", variant: "alternative" },
            ],
            active: "router",
          },
        ],
      },
      alt: "Uma mensagem passa por um classificador, em destaque, que manda cobranças para uma ferramenta, bugs para o suporte técnico e casos de confiança baixa para uma pessoa.",
    },
  ],
  realWorldExample:
    "O ImageNet Large Scale Visual Recognition Challenge pedia para classificar fotos em 1.000 categorias. Em 2012, a rede AlexNet reduziu o erro top-5 para cerca de 15%, contra uns 26% do segundo colocado, e marcou a virada para o deep learning.",
  code: {
    language: "python",
    source: `from sklearn.linear_model import LogisticRegression

X = [[0, 0], [0.5, 1], [1, 0], [1, 2], [2, 0.5], [3, 2.5],
     [1, 1], [3, 1], [3.5, 3], [4, 2], [2.5, 3.5]]
y = [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1]  # 1 = cancelou

model = LogisticRegression().fit(X, y)
p = model.predict_proba([[3, 2]])[0, 1]
print(p, p >= 0.3)  # probabilidade e decisão com limiar de 30%`,
    caption: "Os 11 clientes da aula. O scikit-learn aplica regularização L2 por padrão, então os pesos saem um pouco diferentes dos da cena.",
  },
  tradeOffs: {
    pros: [
      "Devolve probabilidade, não só a classe",
      "Regressão logística é rápida, estável e fácil de explicar pelos pesos",
      "O limiar ajusta o modelo ao custo de cada erro sem treinar de novo",
    ],
    cons: [
      "Um modelo linear só desenha fronteiras retas",
      "Sempre escolhe uma das classes conhecidas, mesmo quando nenhuma serve",
      "Probabilidades podem estar mal calibradas e precisar de ajuste",
    ],
    alternatives: [
      "Árvores de decisão e gradient boosting, para fronteiras não lineares em dados tabulares",
      "Redes neurais, para imagens, áudio e texto",
    ],
  },
  knowledgeCheck: [
    {
      id: "score-zero",
      prompt: "Numa regressão logística, a pontuação w · x + b de um cliente é exatamente 0. O que o modelo diz?",
      options: ["0% de chance", "50% de chance: o cliente está sobre a fronteira", "100% de chance", "Nada: o modelo dá erro"],
      correct: 1,
      explanation: "A sigmoide de 0 é 0,5. A fronteira de decisão é justamente o conjunto de pontos com pontuação zero.",
      lesson: "01-05",
    },
    {
      id: "lower-threshold",
      prompt: "Um banco baixa o limiar do classificador de fraude de 50% para 20%. O que esperar?",
      options: [
        "Menos fraudes detectadas",
        "Mais fraudes detectadas e mais transações legítimas bloqueadas por engano",
        "Nenhuma mudança, porque o modelo é o mesmo",
        "O modelo precisa ser treinado de novo",
      ],
      correct: 1,
      explanation: "Com limiar menor, mais transações passam a ser marcadas: pega mais fraudes, mas também mais falsos alarmes. Os pesos não mudam.",
      lesson: "01-05",
    },
  ],
  related: ["01-02", "01-06", "01-10"],
  references: [
    { title: "scikit-learn: Logistic regression", url: "https://scikit-learn.org/stable/modules/linear_model.html#logistic-regression", kind: "docs" },
    { title: "Google ML Crash Course", url: "https://developers.google.com/machine-learning/crash-course", kind: "article" },
    { title: "Dive into Deep Learning (livro aberto)", url: "https://d2l.ai/", kind: "article" },
  ],
};

export default lesson;
