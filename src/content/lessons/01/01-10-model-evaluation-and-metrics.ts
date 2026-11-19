import { seededRandom } from "../../../lab/sampling";
import type { VectorPoint } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Um detector de fraude dá uma nota de 0 a 1 a 200 transações, 10 delas fraudes. As notas são geradas
// com semente fixa. Matriz de confusão, acurácia, precision, recall, F1, a varredura de limiares, a curva
// ROC e a AUC (pela comparação de todos os pares fraude × normal) saem das contas abaixo.

interface Transaction {
  fraud: boolean;
  score: number;
}

const random = seededRandom(12);
const TOTAL = 200;
const FRAUDS = 10;
const transactions: Transaction[] = Array.from({ length: TOTAL }, (_, index) =>
  index < FRAUDS ? { fraud: true, score: 0.3 + 0.7 * random() } : { fraud: false, score: random() ** 3 * 0.8 },
);

const percent = (value: number) => `${Math.round(value * 100)}%`;
const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const confusionAt = (threshold: number) => {
  const flagged = (transaction: Transaction) => transaction.score >= threshold;
  const tp = transactions.filter((t) => t.fraud && flagged(t)).length;
  const fn = transactions.filter((t) => t.fraud && !flagged(t)).length;
  const fp = transactions.filter((t) => !t.fraud && flagged(t)).length;
  const tn = transactions.filter((t) => !t.fraud && !flagged(t)).length;
  const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
  const recall = tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { threshold, tp, fn, fp, tn, accuracy: (tp + tn) / TOTAL, precision, recall, f1, fpr: fp / (fp + tn) };
};

const THRESHOLD = 0.5;
const main = confusionAt(THRESHOLD);
const alwaysNormalAccuracy = (TOTAL - FRAUDS) / TOTAL;

const SWEEP = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
const sweep = SWEEP.map(confusionAt);
const low = sweep[0];
const high = sweep[sweep.length - 1];
const bestF1 = sweep.reduce((winner, row) => (row.f1 > winner.f1 ? row : winner));
const FRAUD_COST = 2000;
const CALL_COST = 20;
const costOf = (row: (typeof sweep)[number]) => row.fn * FRAUD_COST + row.fp * CALL_COST;
const cheapest = sweep.reduce((winner, row) => (costOf(row) < costOf(winner) ? row : winner));
const reais = (value: number) => `R$ ${value.toLocaleString("pt-BR")}`;

// AUC = chance de uma fraude sorteada ter nota maior que uma transação normal sorteada (empate vale meio).
const frauds = transactions.filter((t) => t.fraud);
const normals = transactions.filter((t) => !t.fraud);
const auc =
  frauds.reduce(
    (sum, fraud) => sum + normals.reduce((inner, normal) => inner + (fraud.score > normal.score ? 1 : fraud.score === normal.score ? 0.5 : 0), 0),
    0,
  ) /
  (frauds.length * normals.length);

const rocPoints: VectorPoint[] = [
  { id: "start", label: "", coords: [0, 0], color: "muted" },
  ...sweep.map<VectorPoint>((row) => ({
    id: `t${Math.round(row.threshold * 100)}`,
    label: fixed(row.threshold, 1),
    coords: [Number(row.fpr.toFixed(3)), Number(row.recall.toFixed(3))],
    color: row.threshold === THRESHOLD ? "module-01" : "info",
  })),
  { id: "chance", label: "chute", coords: [1, 1], color: "muted" },
];

const lesson: LessonContent = {
  id: "01-10",
  subtitle: "Acurácia não basta: a matriz de confusão, precision, recall, F1 e a curva ROC dizem que tipo de erro o modelo comete.",
  objectives: [
    "Montar a matriz de confusão e tirar dela acurácia, precision, recall e F1",
    "Explicar por que a acurácia engana com classes raras",
    "Escolher um limiar pelo custo de cada tipo de erro",
    "Ler a curva ROC e a AUC",
  ],
  steps: [
    {
      id: "judge",
      shortTitle: "Avaliar",
      title: "Comparar a previsão com o que aconteceu",
      tag: "context",
      body: [
        `Um banco quer um detector de fraude. Num lote de ${TOTAL} transações, ${FRAUDS} eram fraude, confirmadas depois pelos clientes. O detector dá uma nota de 0 a 1 para cada uma, e acima de ${fixed(THRESHOLD, 1)} a transação é bloqueada.`,
        "Avaliar é cruzar cada previsão com a verdade. Mas “quantos acertou” esconde a pergunta que importa para o banco: quantas fraudes passaram e quantos clientes honestos foram bloqueados? Cada métrica desta aula responde a uma dessas perguntas.",
      ],
      keyIdea: "Uma métrica é uma pergunta sobre os erros; escolha a pergunta antes da métrica.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "evaluation",
            piece: "block-diagram",
            blocks: [
              { id: "transactions", kind: "server", label: `${TOTAL} transações`, col: 0, row: 0 },
              { id: "model", kind: "llm", label: "detector", col: 1, row: 0 },
              { id: "truth", kind: "sql-db", label: "fraudes reais", col: 1, row: 1 },
              { id: "eval", kind: "eval", label: "comparar", col: 2, row: 0.5 },
              { id: "metrics", kind: "answer", label: "métricas", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "transactions", to: "model" },
              { from: "model", to: "eval", label: "nota ≥ 0,5" },
              { from: "truth", to: "eval", label: "verdade" },
              { from: "eval", to: "metrics" },
            ],
            active: "eval",
          },
        ],
      },
      alt: `${TOTAL} transações passam pelo detector; as previsões e as fraudes reais se encontram na comparação, em destaque, que produz as métricas.`,
    },
    {
      id: "confusion",
      shortTitle: "Confusão",
      title: "A matriz de confusão",
      tag: "mechanism",
      body: [
        `A [[matriz de confusão|confusion-matrix]] cruza a verdade (linhas) com a previsão (colunas). Das ${FRAUDS} fraudes, o detector pegou ${main.tp}, os verdadeiros positivos (VP), e deixou passar ${main.fn}, os falsos negativos (FN). Das ${TOTAL - FRAUDS} normais, bloqueou ${main.fp} por engano, os falsos positivos (FP), e liberou ${main.tn}, os verdadeiros negativos (VN).`,
        "Toda métrica de classificação binária sai dessas quatro contagens. Em detecção, “positivo” é a classe que se procura (fraude, doença, spam), mesmo que seja uma má notícia. Inverter quem é o positivo troca precision por outra métrica, então combine isso antes.",
      ],
      keyIdea: "VP, FP, FN e VN: quatro números que contam tudo sobre os erros de um classificador binário.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "matrix",
            piece: "matrix",
            rows: ["fraude real", "normal real"],
            cols: ["previu fraude", "previu normal"],
            values: [
              [main.tp, main.fn],
              [main.fp, main.tn],
            ],
            scale: { min: 0, max: FRAUDS },
            showValues: true,
            highlight: { row: 0, col: 1 },
            color: "module-01",
          },
        ],
      },
      alt: `Matriz de confusão: ${main.tp} fraudes pegas, ${main.fn} fraudes que passaram, em destaque, ${main.fp} normais bloqueadas e ${main.tn} normais liberadas.`,
    },
    {
      id: "metrics",
      shortTitle: "Métricas",
      title: "A acurácia engana",
      tag: "mechanism",
      body: [
        `A [[acurácia|accuracy]] do detector é ${percent(main.accuracy)}. Parece ótimo, até ver que um “detector” que libera tudo, sem nenhuma conta, tem ${percent(alwaysNormalAccuracy)}: com classes raras, a acurácia mede quase só a classe comum.`,
        `[[Precision|precision]] = VP / (VP + FP) = ${main.tp} / ${main.tp + main.fp} = ${percent(main.precision)}: de cada bloqueio, quantos eram fraude. [[Recall|recall]] = VP / (VP + FN) = ${main.tp} / ${FRAUDS} = ${percent(main.recall)}: das fraudes, quantas foram pegas. O [[F1|f1-score]], média harmônica das duas, dá ${fixed(main.f1)} e só fica alto quando as duas ficam.`,
      ],
      keyIdea: "Precision pergunta “quando bloqueio, acerto?”; recall pergunta “das fraudes, quantas pego?”.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "scores",
            piece: "metrics-panel",
            metrics: [
              { id: "accuracy", label: "acurácia", value: percent(main.accuracy) },
              { id: "baseline", label: "acurácia de liberar tudo", value: percent(alwaysNormalAccuracy), color: "danger" },
              { id: "precision", label: "precision", value: percent(main.precision) },
              { id: "recall", label: "recall", value: percent(main.recall) },
              { id: "f1", label: "F1", value: fixed(main.f1), color: "success" },
            ],
            highlight: "baseline",
          },
        ],
      },
      alt: `Painel: acurácia de ${percent(main.accuracy)} contra ${percent(alwaysNormalAccuracy)} de liberar tudo, precision de ${percent(main.precision)}, recall de ${percent(main.recall)} e F1 de ${fixed(main.f1)}.`,
    },
    {
      id: "sweep",
      shortTitle: "Limiar",
      title: "Precision e recall puxam em sentidos opostos",
      tag: "example",
      body: [
        `Varrendo o limiar de ${fixed(low.threshold, 1)} a ${fixed(high.threshold, 1)}, o recall cai de ${percent(low.recall)} para ${percent(high.recall)} e a precision sobe de ${percent(low.precision)} para ${percent(high.precision)}. Com limiar baixo, o detector bloqueia muito e pega quase tudo; com limiar alto, bloqueia pouco e quase sempre com razão.`,
        `Nenhum limiar é o certo em geral. Entre os testados, o maior F1 (${fixed(bestF1.f1)}) aparece em ${fixed(bestF1.threshold, 1)}, mas o F1 supõe que FP e FN custam o mesmo. Se uma fraude que passa custa ${reais(FRAUD_COST)} e um bloqueio indevido custa um telefonema de ${reais(CALL_COST)}, o custo total é menor no limiar ${fixed(cheapest.threshold, 1)}: ${reais(costOf(cheapest))}, contra ${reais(costOf(bestF1))} no limiar do melhor F1.`,
      ],
      keyIdea: "O limiar troca precision por recall; o custo de cada erro decide onde parar.",
      scene: {
        kind: "pieces",
        layout: "row",
        pieces: [
          {
            id: "precision-curve",
            piece: "chart",
            kind: "line",
            series: sweep.map((row) => ({ label: fixed(row.threshold, 1), value: Number(row.precision.toFixed(2)) })),
            max: 1,
            highlight: SWEEP.indexOf(THRESHOLD),
            color: "info",
          },
          {
            id: "recall-curve",
            piece: "chart",
            kind: "line",
            series: sweep.map((row) => ({ label: fixed(row.threshold, 1), value: Number(row.recall.toFixed(2)) })),
            max: 1,
            highlight: SWEEP.indexOf(THRESHOLD),
            color: "module-01",
          },
        ],
      },
      alt: `Dois gráficos por limiar: a precision sobe de ${percent(low.precision)} para ${percent(high.precision)} e o recall cai de ${percent(low.recall)} para ${percent(high.recall)}.`,
    },
    {
      id: "costs",
      shortTitle: "Custos",
      title: "Cada erro tem um preço diferente",
      tag: "tradeoff",
      body: [
        "Falso negativo e falso positivo nunca custam o mesmo. Na triagem de câncer, perder um caso (FN) é muito pior que pedir um exame a mais (FP): se prioriza recall. Num filtro de spam, mandar um e-mail importante para o lixo (FP) irrita mais que deixar passar um spam: se prioriza precision.",
        "A métrica escolhida vira o objetivo de quem melhora o modelo, então ela precisa refletir o custo real. Para regressão valem as mesmas perguntas com MAE, RMSE e R². Para LLMs, as métricas viram evals: conjuntos de casos com critérios de acerto.",
      ],
      keyIdea: "Escolha a métrica pelo erro que mais dói no negócio, não pela que dá o número mais bonito.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "errors",
            piece: "block-diagram",
            blocks: [
              { id: "model", kind: "llm", label: "detector", col: 0, row: 0.5 },
              { id: "tp", kind: "guardrail", label: `fraude barrada: ${main.tp}`, col: 1, row: 0 },
              { id: "fn", kind: "no-result", label: `fraude passou: ${main.fn}`, col: 1, row: 1 },
              { id: "fp", kind: "user", label: `falso alarme: ${main.fp}`, col: 2, row: 0.5 },
              { id: "cost", kind: "eval", label: "custo total", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "model", to: "tp" },
              { from: "model", to: "fn", label: "FN", variant: "alternative" },
              { from: "model", to: "fp", label: "FP", variant: "alternative" },
              { from: "fn", to: "cost", label: "prejuízo" },
              { from: "fp", to: "cost", label: "atrito" },
            ],
            active: "cost",
          },
        ],
      },
      alt: `O detector barra ${main.tp} fraudes; pelos caminhos tracejados, ${main.fn} fraudes passam e ${main.fp} clientes honestos são travados, e os dois erros somam no custo total, em destaque.`,
    },
    {
      id: "roc",
      shortTitle: "ROC",
      title: "A curva ROC resume todos os limiares",
      tag: "summary",
      body: [
        `Cada limiar vira um ponto: a taxa de falsos positivos (FP / normais) no eixo x e o recall no y. Os pontos, do limiar mais alto (perto da origem) ao mais baixo, desenham a curva ROC. A diagonal até o ponto “chute” é um modelo que sorteia notas; quanto mais a curva sobe para o canto de cima à esquerda, melhor.`,
        `A área sob a curva, a [[ROC AUC|roc-auc]], vale ${fixed(auc)}: é a chance de uma fraude sorteada receber nota maior que uma transação normal sorteada, contando os ${(frauds.length * normals.length).toLocaleString("pt-BR")} pares. AUC não depende do limiar, mas com classes muito raras a curva precision-recall costuma ser mais informativa. Na próxima aula, você vê como o modelo aprende ajustando pesos: a descida do gradiente.`,
      ],
      keyIdea: "Matriz de confusão para um limiar, curva ROC e AUC para todos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "roc",
            piece: "vector-space",
            points: rocPoints,
            vectors: [{ to: "chance" }],
          },
        ],
      },
      alt: `Curva ROC com um ponto por limiar, de ${fixed(low.threshold, 1)} a ${fixed(high.threshold, 1)}, acima da diagonal do chute; a AUC é ${fixed(auc)}.`,
    },
  ],
  realWorldExample:
    "No dataset público de fraude em cartão de crédito da ULB, disponível no Kaggle, só 492 das 284.807 transações (0,172%) são fraude. Um modelo que nunca acusa fraude tem 99,8% de acurácia e não serve para nada, por isso a própria página do dataset recomenda medir pela área sob a curva precision-recall (AUPRC).",
  code: {
    language: "python",
    source: `from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score

# y_true: 1 = fraude; scores: notas do detector entre 0 e 1
y_pred = [int(s >= 0.5) for s in scores]

print(confusion_matrix(y_true, y_pred))       # [[VN, FP], [FN, VP]]
print(classification_report(y_true, y_pred))  # precision, recall, F1 por classe
print(roc_auc_score(y_true, scores))          # usa as notas, não o limiar`,
    caption: "As métricas da aula no scikit-learn. Repare que a matriz dele põe a classe 0 primeiro.",
  },
  tradeOffs: {
    pros: [
      "A matriz de confusão mostra exatamente que tipo de erro o modelo comete",
      "Precision e recall separam os dois custos que a acurácia mistura",
      "ROC e AUC comparam modelos sem escolher um limiar",
    ],
    cons: [
      "Acurácia engana em classes desbalanceadas",
      "F1 supõe que FP e FN custam o mesmo, o que quase nunca é verdade",
      "AUC pode parecer alta mesmo com precision baixa quando o positivo é muito raro",
    ],
    alternatives: [
      "Curva precision-recall e average precision, para classes raras",
      "Custo esperado com valores do negócio para cada tipo de erro",
    ],
  },
  knowledgeCheck: [
    {
      id: "screening",
      prompt: "Num teste de triagem de uma doença grave, que vai ser confirmado depois por um exame mais caro, qual métrica priorizar?",
      options: [
        "Precision, para não assustar ninguém",
        "Recall, para não deixar passar quem está doente",
        "Acurácia, porque resume tudo",
        "Nenhuma, basta a AUC",
      ],
      correct: 1,
      explanation: "Um caso perdido (FN) não volta para o segundo exame; um falso positivo só custa o exame de confirmação. Na triagem, recall alto vem primeiro.",
      lesson: "01-10",
    },
    {
      id: "compute-precision",
      prompt: "Um filtro marcou 50 e-mails como spam; 40 eram spam. Havia 80 spams no total. Quais são precision e recall?",
      options: ["Precision 80% e recall 50%", "Precision 50% e recall 80%", "Precision 40% e recall 80%", "Precision 80% e recall 40%"],
      correct: 0,
      explanation: "Precision = 40 / 50 = 80% (dos marcados, quantos eram spam). Recall = 40 / 80 = 50% (dos spams, quantos foram pegos).",
      lesson: "01-10",
    },
  ],
  related: ["01-08", "01-09", "01-05"],
  references: [
    { title: "scikit-learn: Metrics and scoring", url: "https://scikit-learn.org/stable/modules/model_evaluation.html", kind: "docs" },
    { title: "Google ML Crash Course", url: "https://developers.google.com/machine-learning/crash-course", kind: "article" },
    { title: "Credit Card Fraud Detection (OpenML 1597, dados da ULB)", url: "https://www.openml.org/d/1597", kind: "article" },
  ],
};

export default lesson;
