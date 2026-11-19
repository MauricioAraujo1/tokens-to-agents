import { softmax } from "../../../lab/attention";
import type { LessonContent } from "../../../types/content";

// Quatro perdas calculadas aqui: MSE, MAE e Huber sobre erros de exemplo; a constante que cada uma escolhe
// para tempos de entrega com um outlier (busca em grade); e a cross-entropy de um próximo token,
// com o softmax de logits escritos à mão e o gradiente p − y.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const percent = (value: number) => `${Math.round(value * 100)}%`;

const DELTA = 1;
const squared = (error: number) => error ** 2;
const absolute = (error: number) => Math.abs(error);
/** Huber: quadrática até δ e linear depois, com as duas partes se encontrando sem degrau. */
const huber = (error: number, delta = DELTA) =>
  Math.abs(error) <= delta ? 0.5 * error ** 2 : delta * (Math.abs(error) - 0.5 * delta);

const ERRORS = [-3, -2, -1, -0.5, 0, 0.5, 1, 2, 3];
const lossTable = ERRORS.map((error) => [squared(error), absolute(error), huber(error)]);

// Que tempo de entrega prever para todo mundo? Cada perda escolhe uma constante diferente.
const deliveries = [30, 32, 31, 29, 33, 28, 90];
const mean = deliveries.reduce((sum, value) => sum + value, 0) / deliveries.length;
const sorted = [...deliveries].sort((a, b) => a - b);
const median = sorted[Math.floor(sorted.length / 2)];
const HUBER_DELTA_MINUTES = 5;
const GRID_STEP = 0.1;
const grid = Array.from({ length: Math.round((95 - 25) / GRID_STEP) + 1 }, (_, index) => 25 + index * GRID_STEP);
const bestConstant = (lossOf: (error: number) => number) =>
  grid.reduce((best, candidate) => {
    const total = (c: number) => deliveries.reduce((sum, value) => sum + lossOf(value - c), 0);
    return total(candidate) < total(best) ? candidate : best;
  });
const mseChoice = bestConstant(squared);
const maeChoice = bestConstant(absolute);
const huberChoice = bestConstant((error) => huber(error, HUBER_DELTA_MINUTES));
const outlierIndex = deliveries.indexOf(Math.max(...deliveries));

// Cross-entropy: −ln p da classe certa.
const PROBABILITIES = [0.99, 0.9, 0.7, 0.5, 0.3, 0.1, 0.01];
const crossEntropy = (p: number) => -Math.log(p);
const confidentWrong = PROBABILITIES[PROBABILITIES.length - 1];

// Próximo token de "o gato subiu no ...": logits à mão, softmax, perda e gradiente nos logits.
const candidates = ["muro", "telhado", "sofá", "carro", "céu"];
const logits = [2.1, 2.6, 0.9, 0.2, -1];
const CORRECT = 0;
const probabilities = softmax(logits);
const tokenLoss = crossEntropy(probabilities[CORRECT]);
const logitGradient = probabilities.map((p, index) => p - (index === CORRECT ? 1 : 0));
const favorite = probabilities.indexOf(Math.max(...probabilities));
const uniformLoss = Math.log(candidates.length);

const lesson: LessonContent = {
  id: "01-12",
  subtitle: "A perda é o placar que o modelo tenta baixar. Escolher o placar é escolher o que o modelo considera um erro grave.",
  objectives: [
    "Comparar MSE, MAE e Huber e o peso que cada uma dá a erros grandes",
    "Ver que a perda escolhe a resposta: média, mediana ou algo no meio",
    "Calcular a cross-entropy e entender por que ela pune a confiança errada",
    "Ligar a cross-entropy ao treino de próximo token dos LLMs",
  ],
  steps: [
    {
      id: "scoreboard",
      shortTitle: "Placar",
      title: "O placar que o modelo tenta baixar",
      tag: "context",
      body: [
        "Num jogo, o jogador aprende a fazer o que o placar premia. Se o gol vale 1 e o escanteio vale 10, ele vai viver de escanteios. Com modelos é igual: a [[função de perda|loss-function]] transforma cada erro num número, e o treino só enxerga esse número.",
        "A descida do gradiente da aula anterior desce qualquer perda diferenciável. A escolha da perda decide o que é “errar muito”: errar 10 minutos uma vez ou errar 1 minuto dez vezes? Dar 1% de chance à resposta certa ou 40%? Cada perda responde de um jeito.",
      ],
      keyIdea: "A perda é a definição de erro do modelo; o treino otimiza ela, não o que você tinha em mente.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "loss-flow",
            piece: "block-diagram",
            blocks: [
              { id: "model", kind: "llm", label: "modelo", col: 0, row: 0 },
              { id: "truth", kind: "documents", label: "resposta certa", col: 0, row: 1 },
              { id: "loss", kind: "eval", label: "perda", col: 1, row: 0.5 },
              { id: "number", kind: "answer", label: "um número", col: 2, row: 0.5 },
              { id: "gradient", kind: "tool", label: "gradiente", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "model", to: "loss", label: "previsão" },
              { from: "truth", to: "loss", label: "rótulo" },
              { from: "loss", to: "number" },
              { from: "number", to: "gradient", label: "derivar" },
            ],
            active: "loss",
          },
        ],
      },
      alt: "A previsão do modelo e a resposta certa entram na perda, em destaque, que devolve um número; derivado, ele vira o gradiente do treino.",
    },
    {
      id: "regression-losses",
      shortTitle: "MSE e MAE",
      title: "Quadrado, absoluto e o meio-termo",
      tag: "mechanism",
      body: [
        "Para prever números, as perdas comuns olham o erro e = real − previsto. O [[MSE|mse]] usa e²; o [[MAE|mae]] usa |e|. Na matriz, um erro de 3 custa 9 no MSE e 3 no MAE: o quadrado faz erros grandes dominarem.",
        `A [[perda de Huber|huber-loss]] junta as duas: quadrática até δ = ${DELTA} e linear depois. Ela é suave perto do zero, como o MSE (bom para o gradiente), e não explode com erros grandes, como o MAE. O gradiente do MSE é 2e, proporcional ao erro; o do MAE é só o sinal do erro, ±1.`,
      ],
      keyIdea: "MSE pune erros grandes ao quadrado; MAE pune em linha reta; Huber faz um e depois o outro.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "losses",
            piece: "matrix",
            rows: ERRORS.map((error) => `erro ${error.toLocaleString("pt-BR")}`),
            cols: ["MSE", "MAE", `Huber (δ = ${DELTA})`],
            values: lossTable.map((row) => row.map((value) => Number(value.toFixed(2)))),
            showValues: true,
            highlight: { row: ERRORS.length - 1, col: 0 },
            color: "module-01",
          },
        ],
      },
      alt: `Matriz com o custo de erros de ${ERRORS[0]} a ${ERRORS[ERRORS.length - 1]} em cada perda; um erro de 3 custa 9 no MSE, 3 no MAE e ${fixed(huber(3), 1)} na Huber.`,
    },
    {
      id: "mean-median",
      shortTitle: "Outlier",
      title: "Cada perda escolhe uma resposta diferente",
      tag: "tradeoff",
      body: [
        `As ${deliveries.length} entregas da semana levaram ${deliveries.join(", ")} minutos; a de ${deliveries[outlierIndex]} pegou um acidente. Se o modelo só pudesse prever uma constante, qual seria? Testando todas de 25 a 95, o MSE escolhe ${fixed(mseChoice, 1)}, a média. O MAE escolhe ${fixed(maeChoice, 1)}, a mediana. A Huber, com δ = ${HUBER_DELTA_MINUTES} minutos, fica em ${fixed(huberChoice, 1)}.`,
        `Não é coincidência: a média (${fixed(mean, 1)}) minimiza a soma dos quadrados, e a mediana (${fixed(median, 1)}) minimiza a soma dos absolutos. Com MSE, um outlier arrasta a previsão de todo mundo; com MAE, ele quase não conta. Qual é o certo depende da pergunta: o tempo médio para planejar a frota ou o tempo típico para prometer ao cliente.`,
      ],
      keyIdea: "MSE prevê a média, MAE prevê a mediana: escolher a perda é escolher a estatística.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "deliveries",
            piece: "chart",
            kind: "bar",
            series: deliveries.map((value, index) => ({ label: `entrega ${index + 1}`, value })),
            highlight: outlierIndex,
            color: "module-01",
          },
          {
            id: "choices",
            piece: "metrics-panel",
            metrics: [
              { id: "mse", label: "MSE escolhe", value: `${fixed(mseChoice, 1)} min`, color: "danger" },
              { id: "mae", label: "MAE escolhe", value: `${fixed(maeChoice, 1)} min`, color: "success" },
              { id: "huber", label: `Huber (δ = ${HUBER_DELTA_MINUTES})`, value: `${fixed(huberChoice, 1)} min` },
            ],
            highlight: "mse",
          },
        ],
      },
      alt: `Barras com ${deliveries.length} tempos de entrega, um deles de ${deliveries[outlierIndex]} minutos; o MSE escolhe ${fixed(mseChoice, 1)}, o MAE ${fixed(maeChoice, 1)} e a Huber ${fixed(huberChoice, 1)} minutos.`,
    },
    {
      id: "cross-entropy",
      shortTitle: "Cross-entropy",
      title: "Para classes: punir a confiança errada",
      tag: "mechanism",
      body: [
        `Para classificação, o modelo devolve probabilidades, e a perda olha só a probabilidade p que ele deu à classe certa: [[cross-entropy|cross-entropy]] = −ln p. Com p = 99%, a perda é ${fixed(crossEntropy(0.99))}; com 50%, ${fixed(crossEntropy(0.5))}; com 10%, ${fixed(crossEntropy(0.1))}.`,
        `A curva dispara quando p vai para zero: com ${percent(confidentWrong)}, a perda é ${fixed(crossEntropy(confidentWrong))}. Estar certo com pouca confiança custa pouco; estar errado com muita confiança custa caro. Por que não usar MSE nas probabilidades? Porque, junto com o softmax, o gradiente da cross-entropy nos logits é simplesmente p − y: grande quando o modelo erra feio, sem saturar.`,
      ],
      keyIdea: "Cross-entropy = −ln p(classe certa): quase zero quando o modelo acerta com confiança, enorme quando erra com confiança.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "ce-curve",
            piece: "chart",
            kind: "line",
            series: PROBABILITIES.map((p) => ({ label: `p = ${percent(p)}`, value: Number(crossEntropy(p).toFixed(2)) })),
            highlight: PROBABILITIES.length - 1,
            color: "module-01",
          },
        ],
      },
      alt: `Curva da cross-entropy pela probabilidade da classe certa: quase zero em 99% e ${fixed(crossEntropy(confidentWrong))} em ${percent(confidentWrong)}.`,
    },
    {
      id: "next-token",
      shortTitle: "Próximo token",
      title: "A perda que treina os LLMs",
      tag: "example",
      body: [
        `Um LLM lê “o gato subiu no” e dá probabilidades aos candidatos. O texto real continua com “${candidates[CORRECT]}”, mas o modelo preferiu “${candidates[favorite]}”: deu ${percent(probabilities[favorite])} a ele e ${percent(probabilities[CORRECT])} ao certo. A perda dessa posição é −ln ${fixed(probabilities[CORRECT])} = ${fixed(tokenLoss)}.`,
        `O gradiente nos logits é p − y: ${fixed(logitGradient[CORRECT])} para “${candidates[CORRECT]}” (o treino sobe esse logit) e +${fixed(logitGradient[favorite])} para “${candidates[favorite]}” (o treino desce esse). Um modelo que chutasse igual entre os ${candidates.length} perderia ln ${candidates.length} = ${fixed(uniformLoss)}. O pré-treino de um LLM é essa conta em cada posição de trilhões de tokens, e a [[perplexidade|perplexity]] é e elevado à perda média.`,
      ],
      keyIdea: "Treinar um LLM é baixar a cross-entropy do próximo token, posição por posição.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "candidates",
            piece: "token-stream",
            tokens: candidates,
            bars: probabilities.map((p) => Number(p.toFixed(2))),
            query: CORRECT,
            color: "module-01",
          },
          {
            id: "token-loss",
            piece: "metrics-panel",
            metrics: [
              { id: "p", label: `p(“${candidates[CORRECT]}”)`, value: percent(probabilities[CORRECT]) },
              { id: "loss", label: "perda", value: fixed(tokenLoss), color: "danger" },
              { id: "uniform", label: "perda do chute", value: fixed(uniformLoss) },
              { id: "grad", label: "gradiente no certo", value: fixed(logitGradient[CORRECT]) },
            ],
            highlight: "loss",
          },
        ],
      },
      alt: `Cinco candidatos ao próximo token com barras de probabilidade; o certo, ${candidates[CORRECT]}, tem ${percent(probabilities[CORRECT])} e a perda da posição é ${fixed(tokenLoss)}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Cada tarefa, a sua perda",
      tag: "summary",
      body: [
        "Juntando: regressão usa MSE (prevê a média), MAE (a mediana) ou Huber (robusta a outliers). Classificação usa cross-entropy, e os LLMs usam a mesma cross-entropy em cada token. Reforço troca a perda por uma recompensa a maximizar. A perda escolhida define o que o modelo aprende, e ela não precisa ser a métrica do relatório: treina-se com cross-entropy e se reporta F1.",
        "Com isso fecha o módulo de machine learning: dados, tipos de aprendizado, avaliação, overfitting, gradiente e perda. O próximo módulo empilha neurônios em camadas e mostra como a retropropagação calcula o gradiente de milhões de pesos: deep learning.",
      ],
      keyIdea: "Escolha a perda pela tarefa e pelo tipo de erro que mais dói; o resto é descida do gradiente.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "loss-map",
            piece: "block-diagram",
            blocks: [
              { id: "regression", kind: "sql-db", label: "regressão", col: 0, row: 0 },
              { id: "classification", kind: "guardrail", label: "classificação", col: 0, row: 1 },
              { id: "mse", kind: "eval", label: "MSE / MAE / Huber", col: 1, row: 0 },
              { id: "ce", kind: "eval", label: "cross-entropy", col: 1, row: 1 },
              { id: "llm", kind: "llm", label: "LLM: por token", col: 2, row: 1 },
              { id: "rl", kind: "agent", label: "RL: recompensa", col: 2, row: 0 },
            ],
            edges: [
              { from: "regression", to: "mse" },
              { from: "classification", to: "ce" },
              { from: "ce", to: "llm", label: "próximo token" },
            ],
            active: "ce",
          },
        ],
      },
      alt: "Mapa das perdas: regressão usa MSE, MAE ou Huber; classificação usa cross-entropy, em destaque, que nos LLMs é aplicada a cada token; o reforço usa uma recompensa.",
    },
  ],
  realWorldExample:
    "A focal loss (Lin e colegas, 2017) mudou a cross-entropy para dar menos peso aos exemplos fáceis e mais aos difíceis. Com ela, o detector RetinaNet passou a treinar bem mesmo com uma proporção enorme de regiões de fundo contra poucos objetos.",
  code: {
    language: "python",
    source: `import torch
import torch.nn.functional as F

logits = torch.tensor([[2.1, 2.6, 0.9, 0.2, -1.0]], requires_grad=True)
target = torch.tensor([0])  # o índice de "muro"

loss = F.cross_entropy(logits, target)  # softmax + (−log p) numa chamada
loss.backward()
print(loss.item(), logits.grad)  # gradiente = p − y

print(F.mse_loss(torch.tensor([33.0]), torch.tensor([30.0])),
      F.huber_loss(torch.tensor([33.0]), torch.tensor([30.0]), delta=1.0))`,
    caption: "O próximo token da aula no PyTorch: a cross-entropy recebe logits, aplica o softmax e devolve a perda e o gradiente p − y.",
  },
  tradeOffs: {
    pros: [
      "A perda certa alinha o treino com o erro que importa",
      "Cross-entropy dá gradientes fortes justamente quando o modelo erra com confiança",
      "Perdas robustas (MAE, Huber) evitam que poucos outliers dominem o treino",
    ],
    cons: [
      "A perda que dá para otimizar quase nunca é a métrica do negócio",
      "MSE é refém de outliers; MAE tem gradiente constante e não se acalma perto do mínimo",
      "Cross-entropy incentiva confiança extrema e pode precisar de label smoothing ou calibração",
    ],
    alternatives: [
      "Focal loss, para classes muito desbalanceadas",
      "Perdas por pares ou por ranking, para busca e recomendação",
    ],
  },
  knowledgeCheck: [
    {
      id: "pick-loss",
      prompt: "Um modelo prevê o tempo de resposta de um servidor, e 1% das medições são picos causados por falhas de rede. Qual perda faz sentido para prever o tempo típico?",
      options: [
        "MSE, porque pune erros grandes",
        "MAE ou Huber, porque os picos não devem arrastar a previsão de todos",
        "Cross-entropy, porque é a perda dos LLMs",
        "Nenhuma: basta a acurácia",
      ],
      correct: 1,
      explanation: "Com MSE, os picos puxam a previsão para cima (a média). MAE prevê a mediana, e Huber trata erros pequenos como o MSE e grandes como o MAE.",
      lesson: "01-12",
    },
    {
      id: "ce-value",
      prompt: "Um classificador deu 2% de probabilidade à classe certa. Comparado com dar 50%, o que acontece com a cross-entropy?",
      options: [
        "Fica parecida, porque os dois erraram",
        "Fica bem maior: −ln 0,02 ≈ 3,9 contra −ln 0,5 ≈ 0,69",
        "Fica menor, porque o modelo estava confiante",
        "Fica negativa",
      ],
      correct: 1,
      explanation: "A cross-entropy cresce sem limite quando p vai a zero. Estar confiante e errado custa muito mais que estar em dúvida.",
      lesson: "01-12",
    },
  ],
  related: ["01-11", "03-14", "02-01"],
  references: [
    { title: "PyTorch: Loss Functions", url: "https://pytorch.org/docs/stable/nn.html#loss-functions", kind: "docs" },
    { title: "Focal Loss for Dense Object Detection", url: "https://arxiv.org/abs/1708.02002", kind: "paper" },
    { title: "Deep Learning (Goodfellow, Bengio e Courville)", url: "https://www.deeplearningbook.org/", kind: "article" },
  ],
};

export default lesson;
