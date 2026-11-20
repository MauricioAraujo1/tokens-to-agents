import type { LessonContent } from "../../../types/content";

// Métricas de texto calculadas aqui, para cinco respostas à mesma pergunta de suporte e uma referência:
// exact match e token F1 no estilo do SQuAD (minúsculas, sem pontuação e sem artigos), BLEU-2 (média
// geométrica das precisões de 1-grama e 2-grama com corte, vezes a penalidade de brevidade) e um BERTScore de
// brinquedo, com vetores de 4 traços [devolução, duração, quantidade, gramatical] escritos à mão e casamento
// guloso por cosseno. Quais respostas estão certas é um julgamento humano, declarado no texto.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const REFERENCE = "O prazo de devolução é de 30 dias.";
const answers = [
  { label: "frase completa", text: "O prazo de devolução é de 30 dias.", correct: 1 },
  { label: "só o número", text: "30 dias", correct: 1 },
  { label: "paráfrase", text: "Você tem um mês para devolver.", correct: 1 },
  { label: "negação", text: "O prazo de devolução não é de 30 dias.", correct: 0 },
  { label: "número errado", text: "O prazo de devolução é de 7 dias.", correct: 0 },
];
const SHORT = 1;
const PARAPHRASE = 2;
const NEGATION = 3;

const ARTICLES = new Set(["o", "a", "os", "as", "um", "uma"]);
const words = (text: string) => text.toLowerCase().replace(/[.,!?;:]/g, "").split(/\s+/).filter(Boolean);
const normalize = (text: string) => words(text).filter((word) => !ARTICLES.has(word));

const counts = (tokens: string[]) => {
  const map = new Map<string, number>();
  for (const token of tokens) map.set(token, (map.get(token) ?? 0) + 1);
  return map;
};
const overlap = (candidate: string[], reference: string[]) => {
  const available = counts(reference);
  let common = 0;
  for (const token of candidate) {
    const left = available.get(token) ?? 0;
    if (left > 0) {
      common += 1;
      available.set(token, left - 1);
    }
  }
  return common;
};

// Passo 2 e 3: exact match e token F1.
const exactMatch = (candidate: string) => (normalize(candidate).join(" ") === normalize(REFERENCE).join(" ") ? 1 : 0);
const tokenScores = (candidate: string) => {
  const predicted = normalize(candidate);
  const reference = normalize(REFERENCE);
  const common = overlap(predicted, reference);
  const precision = common / predicted.length;
  const recall = common / reference.length;
  const f1 = common === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { common, precision, recall, f1, predicted, reference };
};
const scored = answers.map((answer) => ({ ...answer, em: exactMatch(answer.text), ...tokenScores(answer.text) }));
const short = scored[SHORT];
const referenceTokens = normalize(REFERENCE);
const shortCovered = referenceTokens
  .map((token, index) => (short.predicted.includes(token) ? index : -1))
  .filter((index) => index >= 0);

// Passo 4: BLEU-2 sem normalização de artigos, como no BLEU original.
const ngrams = (tokens: string[], n: number) =>
  Array.from({ length: Math.max(0, tokens.length - n + 1) }, (_, index) => tokens.slice(index, index + n).join(" "));
const clippedPrecision = (candidate: string[], reference: string[], n: number) => {
  const grams = ngrams(candidate, n);
  return grams.length === 0 ? 0 : overlap(grams, ngrams(reference, n)) / grams.length;
};
const bleu2 = (text: string) => {
  const candidate = words(text);
  const reference = words(REFERENCE);
  const precisions = [1, 2].map((n) => clippedPrecision(candidate, reference, n));
  if (precisions.some((value) => value === 0)) return { score: 0, precisions, brevity: 1 };
  const brevity = candidate.length >= reference.length ? 1 : Math.exp(1 - reference.length / candidate.length);
  const score = brevity * Math.exp(precisions.reduce((total, value) => total + Math.log(value), 0) / precisions.length);
  return { score, precisions, brevity };
};
const bleus = answers.map((answer) => bleu2(answer.text));

// Passo 5: BERTScore de brinquedo entre a paráfrase e uma referência curta.
const vectors: Record<string, number[]> = {
  devolução: [1, 0, 0, 0],
  devolver: [0.9, 0, 0, 0.1],
  em: [0, 0.1, 0, 1],
  "30": [0, 0.3, 1, 0],
  dias: [0, 1, 0.2, 0],
  um: [0, 0, 0.6, 0.6],
  mês: [0, 1, 0.5, 0],
};
const cosine = (a: number[], b: number[]) => {
  const dot = a.reduce((total, value, index) => total + value * b[index], 0);
  const norm = (v: number[]) => Math.sqrt(v.reduce((total, value) => total + value * value, 0));
  return dot / (norm(a) * norm(b));
};
const BERT_REFERENCE = ["devolução", "em", "30", "dias"];
const BERT_CANDIDATE = ["devolver", "em", "um", "mês"];
const bestMatch = (token: string, others: string[]) => Math.max(...others.map((other) => cosine(vectors[token], vectors[other])));
const tokenMatches = BERT_CANDIDATE.map((token) => bestMatch(token, BERT_REFERENCE));
const mean = (values: number[]) => values.reduce((total, value) => total + value, 0) / values.length;
const bertPrecision = mean(tokenMatches);
const bertRecall = mean(BERT_REFERENCE.map((token) => bestMatch(token, BERT_CANDIDATE)));
const bertF = (2 * bertPrecision * bertRecall) / (bertPrecision + bertRecall);
const pairF1 = (() => {
  const common = overlap(BERT_CANDIDATE, BERT_REFERENCE);
  const precision = common / BERT_CANDIDATE.length;
  const recall = common / BERT_REFERENCE.length;
  return common === 0 ? 0 : (2 * precision * recall) / (precision + recall);
})();

const lesson: LessonContent = {
  id: "16-02",
  subtitle: "As réguas que comparam uma resposta com a referência, de exact match e F1 a BLEU e BERTScore, calculadas em cinco respostas, e o que cada uma deixa passar.",
  objectives: [
    "Diferenciar métricas com referência e sem referência",
    "Calcular exact match e token F1 numa resposta curta",
    "Explicar como BLEU e BERTScore comparam n-gramas e significados",
    "Escolher a métrica pela tarefa e reconhecer onde cada uma falha",
  ],
  steps: [
    {
      id: "rulers",
      shortTitle: "Réguas",
      title: "Com gabarito e sem gabarito",
      tag: "context",
      body: [
        "Corrigir uma prova de múltipla escolha é comparar com o gabarito. Corrigir uma redação não tem gabarito: o professor usa critérios, como coerência e argumentação. Avaliar um LLM usa os dois tipos de correção, conforme a tarefa.",
        "Uma [[métrica com referência|reference-based-metric]] compara a resposta com uma resposta esperada, escrita por uma pessoa: exact match, F1, BLEU, ROUGE, BERTScore. Uma [[métrica sem referência|reference-free-metric]] olha só a entrada, a saída e às vezes o contexto: o JSON é válido? o código passa nos testes? a resposta está fiel aos trechos? Esta aula calcula as principais com referência, todas para a mesma pergunta: “Qual o prazo para devolver um produto?”",
      ],
      keyIdea: "Com referência, a métrica compara com o gabarito; sem referência, ela aplica um critério à própria saída.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "rulers",
            piece: "block-diagram",
            blocks: [
              { id: "answer", kind: "answer", label: "resposta", col: 0, row: 0.5 },
              { id: "reference", kind: "documents", label: "referência", col: 1, row: 0 },
              { id: "with", kind: "eval", label: "com referência", col: 2, row: 0 },
              { id: "without", kind: "eval", label: "sem referência", col: 2, row: 1 },
              { id: "score", kind: "answer", label: "nota", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "answer", to: "with" },
              { from: "reference", to: "with", label: "gabarito" },
              { from: "answer", to: "without", label: "critério" },
              { from: "with", to: "score" },
              { from: "without", to: "score" },
            ],
            active: "with",
          },
        ],
      },
      alt: "A resposta vai para dois avaliadores: um com referência, em destaque, que a compara com o gabarito, e um sem referência, que aplica um critério; os dois produzem uma nota.",
    },
    {
      id: "em-f1",
      shortTitle: "EM e F1",
      title: "Exact match e token F1",
      tag: "mechanism",
      body: [
        `A referência é “${REFERENCE}” Antes de comparar, as duas frases são normalizadas como no SQuAD: minúsculas, sem pontuação e sem artigos. O [[exact match|exact-match]] vale 1 se as frases normalizadas são idênticas e 0 se não. A resposta “30 dias” está certa, mas o exact match dá 0.`,
        `O [[token F1|token-f1]] dá crédito parcial: conta as palavras em comum. “30 dias” tem ${short.common} palavras em comum com as ${referenceTokens.length} da referência: [[precision|precision]] ${short.common}/${short.predicted.length} = ${fixed(short.precision)}, [[recall|recall]] ${short.common}/${referenceTokens.length} = ${fixed(short.recall)} e F1 = ${fixed(short.f1)}, a média harmônica das duas. É o mesmo [[F1|f1-score]] da classificação, aplicado às palavras.`,
      ],
      keyIdea: "Exact match é tudo ou nada; token F1 conta palavras em comum, com precision e recall.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "scores",
            piece: "metrics-panel",
            metrics: [
              { id: "em", label: "exact match", value: String(short.em), color: "danger" },
              { id: "precision", label: "precision", value: fixed(short.precision) },
              { id: "recall", label: "recall", value: fixed(short.recall) },
              { id: "f1", label: "token F1", value: fixed(short.f1), color: "module-16" },
            ],
            highlight: "f1",
          },
          { id: "tokens", piece: "token-stream", tokens: referenceTokens, keys: shortCovered, color: "module-16" },
        ],
      },
      alt: `As palavras normalizadas da referência, ${referenceTokens.join(", ")}, com as cobertas pela resposta “30 dias” em destaque. Exact match ${short.em}, precision ${fixed(short.precision)}, recall ${fixed(short.recall)}, F1 ${fixed(short.f1)}.`,
    },
    {
      id: "five-answers",
      shortTitle: "Cinco respostas",
      title: "Notas altas para respostas erradas",
      tag: "example",
      body: [
        `A matriz mostra as cinco respostas. As três primeiras estão certas e as duas últimas, erradas. Mesmo assim, a “${scored[NEGATION].label}” (“${answers[NEGATION].text}”) tem F1 ${fixed(scored[NEGATION].f1)}, maior que a de “${scored[SHORT].label}”, ${fixed(scored[SHORT].f1)}, e a paráfrase correta tem ${fixed(scored[PARAPHRASE].f1)}.`,
        "O motivo: F1 conta palavras, não sentido. Uma palavra a mais, “não”, inverte a resposta e quase não mexe na nota; um sinônimo derruba a nota de uma resposta certa. Para respostas curtas e factuais, como nomes e datas, exact match e F1 funcionam bem. Para texto livre, servem no máximo como sinal fraco.",
      ],
      keyIdea: "Sobreposição de palavras premia quem copia a referência, não quem acerta.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "table",
            piece: "matrix",
            rows: answers.map((answer) => answer.label),
            cols: ["correta", "exact match", "token F1"],
            values: scored.map((item) => [item.correct, item.em, Number(item.f1.toFixed(2))]),
            scale: { min: 0, max: 1 },
            highlight: { row: NEGATION, col: 2 },
            showValues: true,
            color: "module-16",
          },
        ],
      },
      alt: `Cinco respostas com o julgamento humano, o exact match e o token F1: ${scored.map((item) => `${item.label}: correta ${item.correct}, EM ${item.em}, F1 ${fixed(item.f1)}`).join("; ")}.`,
    },
    {
      id: "bleu",
      shortTitle: "BLEU",
      title: "BLEU: pedaços de frase em comum",
      tag: "mechanism",
      body: [
        `O [[BLEU|bleu]] nasceu na tradução automática. Ele mede a fração de n-gramas da resposta (pedaços de 1, 2, 3 ou 4 palavras seguidas) que aparecem na referência, com corte para não premiar repetição, tira a média geométrica e multiplica por uma penalidade de brevidade para respostas mais curtas que a referência. A cena usa BLEU-2, com 1-gramas e 2-gramas.`,
        `A resposta “${scored[SHORT].label}” tem precisões perfeitas, ${fixed(bleus[SHORT].precisions[0])} e ${fixed(bleus[SHORT].precisions[1])}, mas a penalidade de brevidade é ${fixed(bleus[SHORT].brevity, 3)}, e o BLEU vai a ${fixed(bleus[SHORT].score)}. A “${scored[NEGATION].label}” fica com ${fixed(bleus[NEGATION].score)}. O [[ROUGE-L|rouge-l]], usado em resumos, tem a mesma cegueira: os dois foram feitos para comparar muitas frases contra várias referências, não para julgar uma resposta.`,
      ],
      keyIdea: "BLEU mede pedaços em comum e pune respostas curtas: bom para tradução em massa, ruim para julgar uma resposta.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "bleu",
            piece: "chart",
            kind: "bar",
            series: answers.map((answer, index) => ({ label: answer.label, value: Number(bleus[index].score.toFixed(2)) })),
            max: 1,
            highlight: NEGATION,
            color: "module-16",
          },
        ],
      },
      alt: `BLEU-2 de cada resposta: ${answers.map((answer, index) => `${answer.label} ${fixed(bleus[index].score)}`).join(", ")}. A negação, errada, fica perto do topo; a resposta curta e certa fica perto de zero.`,
    },
    {
      id: "bertscore",
      shortTitle: "BERTScore",
      title: "BERTScore: comparar significados, palavra a palavra",
      tag: "mechanism",
      body: [
        `O [[BERTScore|bertscore]] troca a igualdade de palavras pela proximidade de [[embeddings|embedding]]. Cada palavra da resposta procura a palavra mais parecida da referência pela [[similaridade de cosseno|cosine-similarity]]; a média desses melhores casamentos é a precision, e o caminho inverso dá o recall. Com vetores de brinquedo, “${BERT_CANDIDATE.join(" ")}” contra “${BERT_REFERENCE.join(" ")}” tem token F1 ${fixed(pairF1)}, mas BERTScore ${fixed(bertF)}.`,
        `As barras mostram o melhor casamento de cada palavra: “devolver” acha “devolução” (${fixed(tokenMatches[0])}) e “mês” acha “dias” (${fixed(tokenMatches[3])}). No BERTScore de verdade, os vetores vêm de um modelo como o BERT e dependem do contexto da frase. Ele resolve sinônimos e paráfrases, mas ainda dá nota alta para uma negação, porque a frase negada continua parecida com a original.`,
      ],
      keyIdea: "BERTScore aceita sinônimos ao comparar embeddings, mas parecido ainda não é correto.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "bert",
            piece: "metrics-panel",
            metrics: [
              { id: "p", label: "precision", value: fixed(bertPrecision) },
              { id: "r", label: "recall", value: fixed(bertRecall) },
              { id: "f", label: "BERTScore F", value: fixed(bertF), color: "success" },
              { id: "f1", label: "token F1", value: fixed(pairF1), color: "danger" },
            ],
            highlight: "f",
          },
          { id: "tokens", piece: "token-stream", tokens: BERT_CANDIDATE, bars: tokenMatches, color: "module-16" },
        ],
      },
      alt: `As palavras da paráfrase ${BERT_CANDIDATE.join(", ")}, com barras do melhor cosseno contra a referência: ${BERT_CANDIDATE.map((token, index) => `${token} ${fixed(tokenMatches[index])}`).join(", ")}. BERTScore ${fixed(bertF)} contra token F1 ${fixed(pairF1)}.`,
    },
    {
      id: "choose",
      shortTitle: "Escolher",
      title: "Cada tarefa pede uma régua",
      tag: "tradeoff",
      body: [
        "Não existe métrica universal. Resposta curta e fechada (um nome, uma data, uma classe): exact match ou acurácia. Extração com crédito parcial: token F1. Tradução e resumo em grande volume: BLEU, ROUGE ou BERTScore, sempre comparando sistemas e nunca julgando uma resposta isolada. Formato: um validador de schema, sem referência nenhuma.",
        "Texto livre, em que muitas respostas diferentes estão certas, quase sempre acaba num juiz: uma pessoa ou um LLM com uma rubrica, tema da aula 16.06. Código tem a régua mais honesta de todas: rodar os testes. Na prática, as checagens vão em cascata, da mais barata à mais cara: formato primeiro, depois a métrica da tarefa, e o juiz só no que sobrou. Antes de confiar numa métrica, faça o que esta aula fez: rode-a em respostas que você sabe que estão certas e erradas e veja se ela separa as duas.",
      ],
      keyIdea: "Valide a métrica antes de confiar nela: ela precisa separar respostas certas de erradas no seu caso.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "choose",
            piece: "block-diagram",
            blocks: [
              { id: "answer", kind: "answer", label: "resposta", col: 0, row: 0.5 },
              { id: "format", kind: "guardrail", label: "valida formato", col: 1, row: 0.5 },
              { id: "closed", kind: "eval", label: "exact match / f1", col: 2, row: 0 },
              { id: "open", kind: "llm", label: "juiz + rubrica", col: 2, row: 1 },
              { id: "score", kind: "answer", label: "nota", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "answer", to: "format" },
              { from: "format", to: "closed", label: "fechada" },
              { from: "format", to: "open", label: "texto livre" },
              { from: "closed", to: "score" },
              { from: "open", to: "score" },
            ],
            active: "open",
          },
        ],
      },
      alt: "A resposta passa primeiro por um validador de formato; respostas fechadas seguem para exact match ou F1, e texto livre para um juiz com rubrica, em destaque; os dois produzem a nota.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Quatro réguas e um teste da régua",
      tag: "summary",
      body: [
        "Exact match é tudo ou nada; token F1 dá crédito por palavras em comum; BLEU e ROUGE contam pedaços de frase e servem para comparar sistemas em volume; BERTScore compara significados com embeddings. Todas premiam parecer com a referência, e nenhuma entende uma negação sozinha.",
        "A métrica certa depende da tarefa, e a próxima aula mostra que depende também do que está sendo avaliado: o modelo isolado ou o sistema inteiro, com busca, ferramentas e guardrails.",
      ],
      keyIdea: "Uma métrica só vale o quanto ela concorda com o julgamento humano no seu caso.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "summary",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "em", label: "exact match" },
              { id: "f1", label: "token F1" },
              { id: "bleu", label: "BLEU / ROUGE" },
              { id: "bert", label: "BERTScore", color: "module-16" },
              { id: "free", label: "sem referência" },
              { id: "check", label: "valide a métrica", color: "brand" },
            ],
          },
        ],
      },
      alt: "Fluxo em chips: exact match, token F1, BLEU e ROUGE, BERTScore, métricas sem referência e validar a métrica.",
    },
  ],
  realWorldExample:
    "O SQuAD, conjunto de perguntas e respostas da Universidade Stanford, popularizou exact match e token F1 com normalização de artigos e pontuação, e o script oficial de avaliação ainda é a base de muitos leaderboards de leitura. Na tradução automática, o BLEU (Papineni et al., 2002) virou padrão por correlacionar com o julgamento humano no nível de um corpus inteiro, mas os próprios autores o propuseram para comparar sistemas, não para julgar frases isoladas.",
  code: {
    language: "python",
    source: `import re
from collections import Counter

ARTICLES = {"o", "a", "os", "as", "um", "uma"}

def normalize(text: str) -> list[str]:
    words = re.sub(r"[.,!?;:]", "", text.lower()).split()
    return [w for w in words if w not in ARTICLES]

def token_f1(prediction: str, reference: str) -> float:
    pred, ref = normalize(prediction), normalize(reference)
    common = sum((Counter(pred) & Counter(ref)).values())
    if common == 0:
        return 0.0
    precision, recall = common / len(pred), common / len(ref)
    return 2 * precision * recall / (precision + recall)

print(token_f1("30 dias", "O prazo de devolução é de 30 dias."))  # 0.44`,
    caption: "Token F1 no estilo do SQuAD, adaptado para artigos em português: normaliza, conta palavras em comum e combina precision e recall.",
  },
  tradeOffs: {
    pros: [
      "Métricas com referência são baratas, rápidas e determinísticas",
      "Exact match e F1 funcionam bem para respostas curtas e factuais",
      "BERTScore tolera sinônimos e paráfrases que derrubam as métricas de palavras",
    ],
    cons: [
      "Todas premiam parecer com a referência, não acertar",
      "Uma negação ou um número trocado quase não mexem na nota",
      "Exigem referências escritas por pessoas, que custam e envelhecem",
    ],
    alternatives: [
      "LLM-as-a-judge com rubrica para texto livre (aula 16.06)",
      "Checagens executáveis, como testes de código e validação de schema",
    ],
  },
  knowledgeCheck: [
    {
      id: "pick-metric",
      prompt: "Um extrator lê notas fiscais e devolve o CNPJ do emissor. Qual métrica faz mais sentido?",
      options: [
        "BLEU-4",
        "Exact match depois de normalizar a pontuação do CNPJ",
        "BERTScore",
        "ROUGE-L",
      ],
      correct: 1,
      explanation: "A resposta é curta e fechada: um dígito errado é um CNPJ errado. Crédito parcial ou similaridade de significado esconderiam esse erro.",
      lesson: "16-02",
    },
    {
      id: "negation",
      prompt: "A referência é “o voo foi cancelado” e a resposta é “o voo não foi cancelado”. O que acontece com o token F1?",
      options: [
        "Fica perto de zero, porque o sentido é oposto",
        "Fica alto, porque quase todas as palavras coincidem",
        "Fica exatamente 0,5",
        "Não dá para calcular",
      ],
      correct: 1,
      explanation: "Sem artigos, a referência tem 3 palavras e a resposta 4, com 3 em comum: precision 0,75, recall 1, F1 ≈ 0,86. A métrica conta palavras e não percebe que o “não” inverteu a resposta.",
      lesson: "16-02",
    },
  ],
  related: ["16-01", "16-03", "01-10"],
  references: [
    { title: "Rajpurkar et al. (2016), SQuAD: 100,000+ Questions for Machine Comprehension of Text", url: "https://arxiv.org/abs/1606.05250", kind: "paper" },
    { title: "Papineni et al. (2002), BLEU: a Method for Automatic Evaluation of Machine Translation", url: "https://aclanthology.org/P02-1040/", kind: "paper" },
    { title: "Zhang et al. (2019), BERTScore: Evaluating Text Generation with BERT", url: "https://arxiv.org/abs/1904.09675", kind: "paper" },
  ],
};

export default lesson;
