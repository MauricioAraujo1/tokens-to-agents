import { seededRandom } from "../../../lab/sampling";
import type { LessonContent } from "../../../types/content";

// Prever o consumo de energia de um prédio (kWh) pela temperatura do dia com k-NN de regressão.
// Os 40 dias são gerados com semente fixa, embaralhados e divididos em treino, validação e teste.
// Erros por k, a escolha pela validação, o vazamento e a validação cruzada saem das contas abaixo.

interface Day {
  temperature: number;
  kwh: number;
}

const random = seededRandom(2);
const DAYS = 40;
const noise = () => (random() + random() + random() - 1.5) * 2;
const days: Day[] = Array.from({ length: DAYS }, () => {
  const temperature = 14 + random() * 22;
  return { temperature, kwh: 8 + 0.08 * (temperature - 22) ** 2 + noise() };
});

// Embaralhar antes de dividir (Fisher-Yates com a mesma semente).
const shuffled = [...days];
for (let index = shuffled.length - 1; index > 0; index -= 1) {
  const other = Math.floor(random() * (index + 1));
  [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
}
const TRAIN_SHARE = 0.6;
const VALIDATION_SHARE = 0.2;
const trainEnd = Math.round(DAYS * TRAIN_SHARE);
const validationEnd = trainEnd + Math.round(DAYS * VALIDATION_SHARE);
const train = shuffled.slice(0, trainEnd);
const validation = shuffled.slice(trainEnd, validationEnd);
const test = shuffled.slice(validationEnd);

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

/** k-NN de regressão: a previsão é a média do consumo dos k dias com temperatura mais próxima. */
const predict = (pool: Day[], temperature: number, k: number) =>
  mean(
    [...pool]
      .sort((a, b) => Math.abs(a.temperature - temperature) - Math.abs(b.temperature - temperature))
      .slice(0, k)
      .map((day) => day.kwh),
  );
const errorOn = (pool: Day[], target: Day[], k: number) =>
  mean(target.map((day) => Math.abs(predict(pool, day.temperature, k) - day.kwh)));

const K_VALUES = [1, 2, 3, 5, 8, 13];
const table = K_VALUES.map((k) => ({ k, train: errorOn(train, train, k), validation: errorOn(train, validation, k), test: errorOn(train, test, k) }));
const best = table.reduce((winner, row) => (row.validation < winner.validation ? row : winner));
const bestIndex = table.indexOf(best);
const worstValidation = table.reduce((loser, row) => (row.validation > loser.validation ? row : loser));
const kOne = table[0];

// Vazamento: escolher k olhando o teste dá o menor erro de teste, um número otimista.
const peeked = table.reduce((winner, row) => (row.test < winner.test ? row : winner));

// Validação cruzada em 5 partes sobre treino + validação, para o k escolhido.
const FOLDS = 5;
const development = [...train, ...validation];
const foldSize = development.length / FOLDS;
const foldErrors = Array.from({ length: FOLDS }, (_, fold) => {
  const held = development.slice(fold * foldSize, (fold + 1) * foldSize);
  const rest = [...development.slice(0, fold * foldSize), ...development.slice((fold + 1) * foldSize)];
  return errorOn(rest, held, best.k);
});
const cvMean = mean(foldErrors);
const cvSpread = Math.max(...foldErrors) - Math.min(...foldErrors);

const lesson: LessonContent = {
  id: "01-08",
  subtitle: "Exercícios, simulado e prova: por que os dados se dividem em três e cada parte só serve para uma coisa.",
  objectives: [
    "Separar treino, validação e teste e dizer para que serve cada um",
    "Escolher um hiperparâmetro pelo erro de validação",
    "Reconhecer vazamento de dados e o número otimista que ele produz",
    "Usar validação cruzada quando há poucos dados",
  ],
  steps: [
    {
      id: "split",
      shortTitle: "Dividir",
      title: "Exercícios, simulado e prova",
      tag: "context",
      body: [
        "Um aluno estuda com a lista de exercícios, faz um simulado para ver se está pronto e só então faz a prova. Se ele visse a prova antes, a nota não diria nada. Com modelos é igual: os dados se dividem em três partes, e cada uma só pode ser usada para uma coisa.",
        `Temos ${DAYS} dias de consumo de energia de um prédio. Depois de embaralhar, ${train.length} vão para o [[conjunto de treino|training-set]] (ajustar o modelo), ${validation.length} para o [[de validação|validation-set]] (comparar opções) e ${test.length} para o [[de teste|test-set]] (a nota final, medida uma vez). Embaralhar importa: se os dias estivessem em ordem, o teste teria só dias de um mesmo mês.`,
      ],
      keyIdea: "Treino ajusta, validação escolhe, teste mede. Uma parte nunca faz o trabalho da outra.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "split",
            piece: "block-diagram",
            blocks: [
              { id: "data", kind: "documents", label: `${DAYS} dias`, col: 0, row: 0.5 },
              { id: "shuffle", kind: "queue", label: "embaralhar", col: 1, row: 0.5 },
              { id: "train", kind: "sql-db", label: `treino: ${train.length}`, col: 2, row: 0 },
              { id: "validation", kind: "eval", label: `validação: ${validation.length}`, col: 3, row: 0 },
              { id: "test", kind: "guardrail", label: `teste: ${test.length}`, col: 2.5, row: 1 },
            ],
            edges: [
              { from: "data", to: "shuffle" },
              { from: "shuffle", to: "train", label: `${Math.round(TRAIN_SHARE * 100)}%` },
              { from: "shuffle", to: "validation", label: `${Math.round(VALIDATION_SHARE * 100)}%` },
              { from: "shuffle", to: "test", label: "trancado" },
            ],
            active: "shuffle",
          },
        ],
      },
      alt: `${DAYS} dias são embaralhados e divididos em ${train.length} de treino, ${validation.length} de validação e ${test.length} de teste, que fica trancado.`,
    },
    {
      id: "workflow",
      shortTitle: "Fluxo",
      title: "A ordem do trabalho",
      tag: "mechanism",
      body: [
        "O modelo é um [[k-NN|knn]] de regressão: prevê o consumo de um dia pela média dos k dias de treino com temperatura mais próxima. O treino não decide k; k é um [[hiperparâmetro|hyperparameter]], uma escolha de quem treina, assim como a taxa de aprendizado ou o tamanho de uma rede.",
        `O fluxo é sempre o mesmo: para cada candidato (k = ${K_VALUES.join(", ")}), ajuste no treino e meça na validação. Fique com o melhor. Só no fim, uma única vez, meça no teste. Se o número do teste decepcionar, a tentação é voltar e ajustar; quem faz isso transforma o teste em mais uma validação.`,
      ],
      keyIdea: "Hiperparâmetros se escolhem na validação; o teste só é aberto no fim, uma vez.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "pipeline",
            stages: [
              { id: "fit", label: "ajustar no treino" },
              { id: "compare", label: "medir na validação", color: "module-01" },
              { id: "pick", label: "escolher k" },
              { id: "test", label: "testar uma vez" },
            ],
            active: "compare",
            done: ["fit"],
            repeat: { from: "fit", to: "compare", label: `× ${K_VALUES.length} valores de k` },
          },
        ],
      },
      alt: `Etapas: ajustar no treino e medir na validação, repetido para ${K_VALUES.length} valores de k, depois escolher k e testar uma vez.`,
    },
    {
      id: "choose",
      shortTitle: "Escolher k",
      title: "A validação escolhe o k",
      tag: "mechanism",
      body: [
        `A matriz mostra o erro médio absoluto, em kWh, para cada k. No treino, k = 1 erra ${fixed(kOne.train)}: cada dia é o vizinho mais próximo de si mesmo. Por isso o erro de treino não serve para escolher: ele premia decorar.`,
        `Na validação, que o modelo não viu, k = 1 erra ${fixed(kOne.validation)} e o pior é k = ${worstValidation.k}, com ${fixed(worstValidation.validation)}: vizinhança grande demais mistura dias frios com dias quentes. O melhor é k = ${best.k}, com ${fixed(best.validation)}. Esse é o k escolhido, e a escolha foi feita sem tocar no teste.`,
      ],
      keyIdea: "Erro de treino mede memória; erro de validação mede generalização.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "errors",
            piece: "matrix",
            rows: table.map((row) => `k = ${row.k}`),
            cols: ["treino", "validação"],
            values: table.map((row) => [Number(row.train.toFixed(2)), Number(row.validation.toFixed(2))]),
            showValues: true,
            highlight: { row: bestIndex, col: 1 },
            color: "module-01",
          },
        ],
      },
      alt: `Erro de treino e de validação para cada k; o erro de treino é ${fixed(kOne.train)} com k = 1, e o menor erro de validação é ${fixed(best.validation)}, com k = ${best.k}.`,
    },
    {
      id: "final",
      shortTitle: "Teste",
      title: "Abrir o teste uma vez",
      tag: "example",
      body: [
        `Com k = ${best.k} decidido, medimos no teste: ${fixed(best.test)} kWh de erro médio. Esse é o número que vai para o relatório, porque nenhuma decisão foi tomada olhando para ele.`,
        `Com tão poucos dias, uma divisão diferente daria outro número. A [[validação cruzada|cross-validation]] reduz essa sorte: junta treino e validação (${development.length} dias), divide em ${FOLDS} partes e treina ${FOLDS} vezes, validando a cada vez numa parte diferente. Para k = ${best.k}, o erro médio é ${fixed(cvMean)}, e entre a melhor e a pior parte há ${fixed(cvSpread)} kWh de diferença: com ${validation.length} dias, o erro de validação de ${fixed(best.validation)} tinha sido sorte.`,
      ],
      keyIdea: "O teste é a estimativa honesta; a validação cruzada mostra o quanto ela varia.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "report",
            piece: "metrics-panel",
            metrics: [
              { id: "k", label: "k escolhido", value: `${best.k}` },
              { id: "validation", label: "erro na validação", value: `${fixed(best.validation)} kWh` },
              { id: "test", label: "erro no teste", value: `${fixed(best.test)} kWh`, color: "success" },
              { id: "cv", label: `validação cruzada (${FOLDS})`, value: `${fixed(cvMean)} kWh` },
            ],
            highlight: "test",
          },
          {
            id: "folds",
            piece: "chart",
            kind: "bar",
            series: foldErrors.map((value, fold) => ({ label: `parte ${fold + 1}`, value: Number(value.toFixed(2)) })),
            color: "module-01",
          },
        ],
      },
      alt: `Painel com k = ${best.k}, erro de ${fixed(best.test)} kWh no teste e ${fixed(cvMean)} kWh na validação cruzada, e barras com o erro de cada uma das ${FOLDS} partes.`,
    },
    {
      id: "leakage",
      shortTitle: "Vazamento",
      title: "Espiar o teste estraga a nota",
      tag: "tradeoff",
      body: [
        `Se tivéssemos escolhido k olhando o teste, ficaríamos com k = ${peeked.k} e um erro de ${fixed(peeked.test)}. O número parece melhor que os ${fixed(best.test)} honestos, mas é uma ilusão: o teste virou parte do ajuste e deixou de representar dados novos. Isso é [[vazamento de dados|data-leakage]].`,
        "O vazamento costuma ser mais sutil: normalizar os dados com a média calculada no dataset inteiro antes de dividir, usar o mesmo paciente no treino e no teste, ou prever vendas de ontem com dados de amanhã. Em séries temporais, a regra é dividir por data: treine no passado e teste no futuro, nunca embaralhe.",
      ],
      keyIdea: "Qualquer informação do teste que chega às decisões do modelo deixa a nota otimista.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "split",
            piece: "block-diagram",
            blocks: [
              { id: "train", kind: "sql-db", label: "treino", col: 0, row: 0 },
              { id: "validation", kind: "eval", label: "validação", col: 1, row: 0 },
              { id: "model", kind: "llm", label: `modelo (k = ${best.k})`, col: 2, row: 0.5 },
              { id: "test", kind: "guardrail", label: "teste", col: 3, row: 0.5 },
              { id: "leak", kind: "no-result", label: "espiar o teste", col: 1, row: 1 },
            ],
            edges: [
              { from: "train", to: "validation", label: "ajusta" },
              { from: "validation", to: "model", label: "escolhe k" },
              { from: "model", to: "test", label: "mede 1 vez" },
              { from: "test", to: "leak", variant: "alternative" },
              { from: "leak", to: "model", label: "vazamento", variant: "alternative" },
            ],
            active: "test",
          },
        ],
      },
      alt: "O treino ajusta, a validação escolhe k e o modelo é medido uma vez no teste, em destaque; um caminho tracejado em vermelho mostra o teste vazando de volta para as escolhas do modelo.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Três partes, três papéis",
      tag: "summary",
      body: [
        "Juntando: embaralhe (ou divida por data), ajuste no treino, escolha hiperparâmetros na validação ou com validação cruzada, e meça no teste uma vez. Proporções como 60/20/20 ou 80/10/10 são comuns; com milhões de exemplos, um teste de 1% já basta.",
        "A mesma disciplina vale para LLMs: benchmarks que vazaram para os dados de pré-treino dão notas infladas, e por isso avaliações sérias usam conjuntos guardados. Na próxima aula, a diferença entre erro de treino e de teste ganha nome: overfitting.",
      ],
      keyIdea: "A nota de um modelo só vale se o teste nunca participou de nenhuma decisão.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "roles",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "shuffle", label: "embaralhar ou dividir por data" },
              { id: "train", label: "treino: ajustar pesos" },
              { id: "validation", label: "validação: escolher hiperparâmetros", color: "module-01" },
              { id: "test", label: "teste: medir uma vez", color: "brand" },
            ],
          },
        ],
      },
      alt: "Resumo em etapas: embaralhar ou dividir por data, treino para ajustar pesos, validação para escolher hiperparâmetros e teste para medir uma vez.",
    },
  ],
  realWorldExample:
    "Nas competições do Kaggle, o placar público usa só uma parte dos dados de teste, e o resultado final vem de uma parte privada revelada no fim. Times que ajustam o modelo ao placar público com frequência caem várias posições quando o privado aparece.",
  code: {
    language: "python",
    source: `from sklearn.model_selection import GridSearchCV, train_test_split
from sklearn.neighbors import KNeighborsRegressor

# X: temperatura de cada dia (uma coluna); y: consumo em kWh
X_dev, X_test, y_dev, y_test = train_test_split(X, y, test_size=0.2, shuffle=True, random_state=0)

search = GridSearchCV(
    KNeighborsRegressor(),
    {"n_neighbors": [1, 2, 3, 5, 8, 13]},
    cv=5,
    scoring="neg_mean_absolute_error",
).fit(X_dev, y_dev)

print(search.best_params_)
print(search.score(X_test, y_test))  # medido uma única vez`,
    caption: "Separa o teste primeiro, escolhe k com validação cruzada em 5 partes nos dados restantes e só então mede no teste.",
  },
  tradeOffs: {
    pros: [
      "Dá uma estimativa honesta do desempenho em dados novos",
      "Permite comparar modelos e hiperparâmetros sem enganar a si mesmo",
      "Validação cruzada aproveita melhor datasets pequenos",
    ],
    cons: [
      "Menos dados para treinar, já que parte fica guardada",
      "Com poucos dados, o número do teste depende da sorte da divisão",
      "Validação cruzada multiplica o custo de treino por k",
    ],
    alternatives: [
      "Divisão por data (walk-forward) para séries temporais",
      "Divisão por grupo, quando o mesmo cliente ou paciente aparece em vários exemplos",
    ],
  },
  knowledgeCheck: [
    {
      id: "normalize-leak",
      prompt: "Você calcula a média e o desvio de todas as linhas, normaliza o dataset e só depois separa o teste. Qual é o problema?",
      options: [
        "Nenhum, a normalização não depende dos rótulos",
        "A média e o desvio carregam informação do teste para o treino: é vazamento",
        "A normalização deixa o modelo mais lento",
        "O teste fica maior do que deveria",
      ],
      correct: 1,
      explanation: "As estatísticas devem ser calculadas só no treino e aplicadas à validação e ao teste. Caso contrário, o treino “vê” um pouco do teste.",
      lesson: "01-08",
    },
    {
      id: "tune-on-test",
      prompt: "Depois de 30 tentativas ajustando hiperparâmetros pelo erro de teste, um modelo chega a 95%. Quanto se pode confiar nesse número?",
      options: [
        "Totalmente: é o erro de teste",
        "Pouco: o teste virou validação e a estimativa ficou otimista; é preciso outro conjunto guardado",
        "Mais do que no treino, então está bom",
        "É confiável se o modelo for grande",
      ],
      correct: 1,
      explanation: "Cada decisão tomada olhando o teste o adapta ao modelo. Depois de 30 escolhas, o número já não representa dados novos.",
      lesson: "01-08",
    },
  ],
  related: ["01-07", "01-09", "01-10"],
  references: [
    { title: "scikit-learn: Cross-validation", url: "https://scikit-learn.org/stable/modules/cross_validation.html", kind: "docs" },
    { title: "scikit-learn: Common pitfalls (data leakage)", url: "https://scikit-learn.org/stable/common_pitfalls.html", kind: "docs" },
    { title: "Google ML Crash Course", url: "https://developers.google.com/machine-learning/crash-course", kind: "article" },
  ],
};

export default lesson;
