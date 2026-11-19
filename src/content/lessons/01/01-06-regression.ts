import type { VectorPoint } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Prever o aluguel de um apartamento pela área com regressão linear por mínimos quadrados. Área em
// dezenas de m² e aluguel em milhares de reais. Reta, resíduos, MSE, R² e o efeito de um outlier saem das contas.

interface Flat {
  id: string;
  area: number;
  rent: number;
}

interface Fit {
  slope: number;
  intercept: number;
}

const flats: Flat[] = [
  { id: "a1", area: 4, rent: 1.5 },
  { id: "a2", area: 5, rent: 2.3 },
  { id: "a3", area: 6, rent: 2.1 },
  { id: "a4", area: 7, rent: 3 },
  { id: "a5", area: 8, rent: 2.6 },
  { id: "a6", area: 9, rent: 3.6 },
  { id: "a7", area: 10, rent: 3.4 },
  { id: "a8", area: 12, rent: 4.7 },
];
const OUTLIER: Flat = { id: "a9", area: 11, rent: 9 };

const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const reais = (thousands: number) => `R$ ${Math.round(thousands * 1000).toLocaleString("pt-BR")}`;

/** Mínimos quadrados com uma feature: inclinação = cov(x, y) / var(x), e a reta passa pelas médias. */
const fitLine = (data: Flat[]): Fit => {
  const meanArea = mean(data.map((flat) => flat.area));
  const meanRent = mean(data.map((flat) => flat.rent));
  const slope =
    data.reduce((sum, flat) => sum + (flat.area - meanArea) * (flat.rent - meanRent), 0) /
    data.reduce((sum, flat) => sum + (flat.area - meanArea) ** 2, 0);
  return { slope, intercept: meanRent - slope * meanArea };
};
const predict = (fit: Fit, area: number) => fit.intercept + fit.slope * area;

const fit = fitLine(flats);
const residuals = flats.map((flat) => ({ id: flat.id, value: flat.rent - predict(fit, flat.area) }));
const squared = residuals.map((residual) => ({ id: residual.id, value: residual.value ** 2 }));
const mse = mean(squared.map((item) => item.value));
const rmse = Math.sqrt(mse);
const meanRent = mean(flats.map((flat) => flat.rent));
const totalVariance = mean(flats.map((flat) => (flat.rent - meanRent) ** 2));
const rSquared = 1 - mse / totalVariance;
const worst = [...squared].sort((a, b) => b.value - a.value)[0];
const worstResidual = residuals.find((residual) => residual.id === worst.id)?.value ?? 0;

const NEW_AREA = 7;
const newRent = predict(fit, NEW_AREA);
/** Área em dezenas de m², preço em milhares: 1 de inclinação = R$ 1.000 por 10 m² = R$ 100 por m². */
const perSquareMeter = fit.slope * 100;

const withOutlier = fitLine([...flats, OUTLIER]);
const outlierPerSquareMeter = withOutlier.slope * 100;
const outlierNewRent = predict(withOutlier, NEW_AREA);

const LINE_FROM = 4;
const LINE_TO = 12;
const flatPoints = (data: Flat[]): VectorPoint[] =>
  data.map((flat) => ({ id: flat.id, label: flat.id, coords: [flat.area, flat.rent], color: flat.id === OUTLIER.id ? "danger" : "module-01" }));
const linePoints = (line: Fit): VectorPoint[] => [
  { id: "from", label: "", coords: [LINE_FROM, predict(line, LINE_FROM)], color: "ink" },
  { id: "to", label: "reta", coords: [LINE_TO, predict(line, LINE_TO)], color: "ink" },
];

const lesson: LessonContent = {
  id: "01-06",
  subtitle: "Prever um número: a reta que passa mais perto dos pontos, o erro que sobra e como medi-lo.",
  objectives: [
    "Ajustar uma regressão linear por mínimos quadrados e ler os parâmetros",
    "Calcular resíduos, MSE, RMSE e R²",
    "Ver por que o erro ao quadrado é sensível a outliers",
    "Reconhecer onde a regressão aparece em sistemas de IA",
  ],
  steps: [
    {
      id: "number",
      shortTitle: "Um número",
      title: "Quando a resposta é um número",
      tag: "context",
      body: [
        "Quanto vale o aluguel deste apartamento? Quantos minutos até a entrega? Quantas unidades vamos vender em dezembro? Quando a resposta é um número numa escala contínua, a tarefa supervisionada é [[regressão|regression]].",
        `Os exemplos são ${flats.length} apartamentos com área e aluguel conhecidos. O modelo aprende com eles e responde para um apartamento novo de ${NEW_AREA * 10} m²: ${reais(newRent)}. Diferente da classificação, não existe “acertar”: existe errar por pouco ou por muito, e é isso que vamos medir.`,
      ],
      keyIdea: "Regressão prevê um número, e a qualidade dela é o tamanho do erro, não a taxa de acerto.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "regression",
            piece: "block-diagram",
            blocks: [
              { id: "ads", kind: "documents", label: "anúncios", col: 0, row: 0.5 },
              { id: "features", kind: "embedding", label: "área", col: 1, row: 0.5 },
              { id: "model", kind: "llm", label: "regressão", col: 2, row: 0.5 },
              { id: "answer", kind: "answer", label: reais(newRent), col: 3, row: 0.5 },
            ],
            edges: [
              { from: "ads", to: "features" },
              { from: "features", to: "model", label: `${NEW_AREA * 10} m²` },
              { from: "model", to: "answer", label: "aluguel" },
            ],
            active: "model",
          },
        ],
      },
      alt: `Anúncios viram a feature área, que entra no modelo de regressão, em destaque; para ${NEW_AREA * 10} m² ele devolve ${reais(newRent)}.`,
    },
    {
      id: "line",
      shortTitle: "A reta",
      title: "A reta que passa mais perto de todos",
      tag: "mechanism",
      body: [
        "Coloque cada apartamento num gráfico (área no eixo x, aluguel no eixo y) e estique um elástico entre os pontos. A [[regressão linear|linear-regression]] procura a reta aluguel = a + b · área que deixa a soma dos erros ao quadrado a menor possível.",
        `Com uma feature, a conta tem solução fechada: b = cov(área, aluguel) / var(área) e a reta passa pelo ponto médio. Aqui, b = ${fixed(fit.slope)} (mil reais a cada 10 m², ou ${reais(perSquareMeter / 1000)} por m²) e a = ${fixed(fit.intercept)}. Com várias features, a mesma ideia vira a equação normal, w = (XᵀX)⁻¹ Xᵀy.`,
      ],
      keyIdea: "Mínimos quadrados: escolha a e b que minimizam Σ (real − previsto)².",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "fit",
            piece: "vector-space",
            points: [...flatPoints(flats), ...linePoints(fit)],
            vectors: [{ from: "from", to: "to" }],
          },
        ],
      },
      alt: `Os ${flats.length} apartamentos no plano de área e aluguel, com a reta de mínimos quadrados passando entre eles.`,
    },
    {
      id: "residuals",
      shortTitle: "Resíduos",
      title: "O que sobra é o erro",
      tag: "mechanism",
      body: [
        `Para cada apartamento, o [[resíduo|residual]] é o real menos o previsto. O ${worst.id} tem o maior: ${reais(Math.abs(worstResidual))} ${worstResidual < 0 ? "abaixo" : "acima"} da reta. As barras mostram os resíduos ao quadrado, que é o que a reta minimizou.`,
        `A média dessas barras é o [[MSE|mse]]: ${fixed(mse, 3)}. Como ele está em “mil reais ao quadrado”, se usa a raiz, o RMSE, para voltar à unidade do aluguel: ${reais(rmse)}. Elevar ao quadrado faz um erro de 2 pesar 4 vezes mais que um erro de 1: a reta prefere errar um pouco em todos a errar muito em um.`,
      ],
      keyIdea: "Resíduo = real − previsto; MSE = média dos resíduos ao quadrado; RMSE volta à unidade original.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "squared",
            piece: "chart",
            kind: "bar",
            series: squared.map((item) => ({ label: item.id, value: Number(item.value.toFixed(4)) })),
            highlight: squared.indexOf(worst),
            color: "module-01",
          },
        ],
      },
      alt: `Barras com o resíduo ao quadrado de cada apartamento; ${worst.id} tem o maior, e a média das barras é o MSE de ${fixed(mse, 3)}.`,
    },
    {
      id: "score",
      shortTitle: "Medir",
      title: "Quanto da variação o modelo explica",
      tag: "example",
      body: [
        `O RMSE diz o tamanho típico do erro: ${reais(rmse)}. Mas isso é muito ou pouco? O [[R²|r-squared]] compara com o modelo mais burro possível, que prevê sempre a média (${reais(meanRent)}). R² = 1 − MSE / variância = ${fixed(rSquared)}.`,
        `Ou seja, a área explica ${Math.round(rSquared * 100)}% da variação dos aluguéis destes apartamentos. O resto vem do que o modelo não vê: bairro, andar, vaga. R² perto de 1 no treino não garante nada em dados novos; a medida que vale é sempre a de exemplos que ficaram de fora.`,
      ],
      keyIdea: "R² = 1 − MSE / variância: 0 é o mesmo que chutar a média, 1 é perfeito.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "slope", label: "por m²", value: reais(perSquareMeter / 1000) },
              { id: "rmse", label: "RMSE", value: reais(rmse) },
              { id: "r2", label: "R²", value: fixed(rSquared), color: "success" },
              { id: "prediction", label: `${NEW_AREA * 10} m²`, value: reais(newRent) },
            ],
            highlight: "r2",
          },
        ],
      },
      alt: `Painel: ${reais(perSquareMeter / 1000)} por m², RMSE de ${reais(rmse)}, R² de ${fixed(rSquared)} e a previsão de ${reais(newRent)} para ${NEW_AREA * 10} m².`,
    },
    {
      id: "outlier",
      shortTitle: "Outlier",
      title: "Uma cobertura entorta a reta",
      tag: "tradeoff",
      body: [
        `Entra no dataset uma cobertura de ${OUTLIER.area * 10} m² com aluguel de ${reais(OUTLIER.rent)}. Como o erro dela é enorme e vai ao quadrado, a reta se inclina para perto dela: o preço por m² sobe de ${reais(perSquareMeter / 1000)} para ${reais(outlierPerSquareMeter / 1000)}, e o apartamento de ${NEW_AREA * 10} m² passa de ${reais(newRent)} para ${reais(outlierNewRent)}.`,
        "Um único ponto mudou a previsão de todos. As saídas são olhar os dados antes de treinar, usar uma perda menos sensível, como o erro absoluto (aula 01-12), ou modelar o que faz aquele ponto ser diferente (cobertura é outro mercado). E nem toda relação é uma reta: quando a curva dobra, entram features novas ou modelos mais flexíveis.",
      ],
      keyIdea: "Erro ao quadrado dá um megafone aos outliers: um ponto estranho pode mover a reta inteira.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "fit",
            piece: "vector-space",
            points: [...flatPoints([...flats, OUTLIER]), ...linePoints(withOutlier)],
            vectors: [{ from: "from", to: "to" }],
          },
        ],
      },
      alt: `O mesmo gráfico com a cobertura ${OUTLIER.id}, em vermelho, bem acima dos outros; a reta nova fica mais inclinada, puxada por ela.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Regressão em todo canto",
      tag: "summary",
      body: [
        "Juntando: a regressão linear prevê um número como soma ponderada das features, ajustada para minimizar o erro ao quadrado. Resíduos mostram onde ela erra, RMSE diz quanto e R² compara com chutar a média.",
        "Previsão de demanda, tempo de entrega e preço são regressão. Nos sistemas com LLM, o modelo de recompensa do RLHF também é: recebe uma resposta e devolve uma nota. Na próxima aula, voltamos ao não supervisionado para agrupar dados com o k-means.",
      ],
      keyIdea: "Sempre que a pergunta é “quanto?”, a resposta é uma regressão.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "uses",
            piece: "block-diagram",
            blocks: [
              { id: "history", kind: "sql-db", label: "histórico", col: 0, row: 0.5 },
              { id: "model", kind: "llm", label: "regressão", col: 1, row: 0.5 },
              { id: "demand", kind: "queue", label: "demanda", col: 2, row: 0 },
              { id: "eta", kind: "phone", label: "tempo de entrega", col: 2, row: 1 },
              { id: "reward", kind: "eval", label: "nota de resposta", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "history", to: "model" },
              { from: "model", to: "demand", label: "unidades" },
              { from: "model", to: "eta", label: "minutos" },
              { from: "model", to: "reward", label: "nota" },
            ],
            active: "model",
          },
        ],
      },
      alt: "Um histórico alimenta o modelo de regressão, em destaque, que devolve números diferentes: unidades de demanda, minutos de entrega e a nota de uma resposta.",
    },
  ],
  realWorldExample:
    "O Zestimate, da Zillow, estima o valor de casas nos Estados Unidos a partir das características do imóvel e de vendas parecidas, e a empresa publica o erro mediano dessas estimativas.",
  code: {
    language: "python",
    source: `import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score

area = np.array([[4], [5], [6], [7], [8], [9], [10], [12]])  # dezenas de m²
rent = np.array([1.5, 2.3, 2.1, 3.0, 2.6, 3.6, 3.4, 4.7])     # mil reais

model = LinearRegression().fit(area, rent)
pred = model.predict(area)
print(model.coef_, model.intercept_)
print(mean_squared_error(rent, pred) ** 0.5, r2_score(rent, pred))`,
    caption: "Os 8 apartamentos da aula: a reta de mínimos quadrados, o RMSE e o R².",
  },
  tradeOffs: {
    pros: [
      "Solução exata e rápida, mesmo com milhões de linhas",
      "Cada peso diz quanto a saída muda por unidade da feature",
      "Ótimo ponto de partida para comparar modelos mais complexos",
    ],
    cons: [
      "Só captura relações lineares nas features que recebe",
      "O erro ao quadrado deixa a reta refém de outliers",
      "Features muito correlacionadas deixam os pesos instáveis",
    ],
    alternatives: [
      "Regressão com perda absoluta ou Huber, para dados com outliers",
      "Árvores e gradient boosting, para relações não lineares em dados tabulares",
    ],
  },
  knowledgeCheck: [
    {
      id: "r2-zero",
      prompt: "Um modelo de previsão de vendas tem R² = 0 nos dados de teste. O que isso quer dizer?",
      options: [
        "Que ele acerta todas as vendas",
        "Que ele não é melhor do que prever sempre a média das vendas",
        "Que o RMSE é zero",
        "Que as vendas são negativas",
      ],
      correct: 1,
      explanation: "R² = 1 − MSE / variância. Com R² = 0, o MSE do modelo é igual ao de prever a média para todos.",
      lesson: "01-06",
    },
    {
      id: "rmse-unit",
      prompt: "O MSE de um modelo de tempo de entrega é 16 (minutos²). Qual é o erro típico em minutos?",
      options: ["16 minutos", "4 minutos, a raiz do MSE (RMSE)", "8 minutos, metade do MSE", "256 minutos"],
      correct: 1,
      explanation: "O MSE está na unidade ao quadrado. O RMSE, √16 = 4, volta para minutos e é o tamanho típico do erro.",
      lesson: "01-06",
    },
  ],
  related: ["01-05", "01-07", "01-12"],
  references: [
    { title: "scikit-learn: Linear Models", url: "https://scikit-learn.org/stable/modules/linear_model.html", kind: "docs" },
    { title: "scikit-learn: Regression metrics", url: "https://scikit-learn.org/stable/modules/model_evaluation.html#regression-metrics", kind: "docs" },
    { title: "An Introduction to Statistical Learning (livro aberto)", url: "https://www.statlearning.com/", kind: "article" },
  ],
};

export default lesson;
