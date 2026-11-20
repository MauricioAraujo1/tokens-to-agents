import { bm25Scores, embed, rankByScore, reciprocalRankFusion, tokenize, vectorScores } from "../../../lab/retrieval";
import type { LessonContent } from "../../../types/content";
import { bm25VsVectorContent } from "../../playgrounds/bm25-vs-vector";

// Avaliação de verdade, em escala de brinquedo: 4 consultas sobre o corpus do playground BM25 vs. vetorial,
// com notas de relevância 0, 1 ou 2 dadas à mão (o gabarito), e três sistemas calculados pelas funções de
// src/lab/retrieval.ts: BM25, vetorial e RRF com k = 60. Precision@3, recall@3, MRR e nDCG@3 saem das
// contas abaixo, com ganho igual à nota e desconto log2(posição + 1).

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const { documents, stopwords, concepts, dims, initial } = bm25VsVectorContent;
const stop = new Set(stopwords);
const corpus = documents.map((document) => tokenize(document, stop));
const labels = ["pneu do carro", "manual e óleo", "bolo de cenoura", "carro elétrico", "combustível"];
const documentVectors = corpus.map((words) => embed(words, concepts, dims));
const K = 3;

interface Judged {
  query: string;
  /** Nota por documento: 2 responde, 1 ajuda em parte; quem não aparece vale 0. */
  grades: Record<number, number>;
}

const judgments: Judged[] = [
  { query: "trocar óleo do carro", grades: { 1: 2, 3: 1 } },
  { query: "carro econômico", grades: { 4: 2, 3: 1 } },
  { query: "elétrico", grades: { 3: 2 } },
  { query: "pneu do carro", grades: { 0: 2 } },
];
const gradeOf = (judged: Judged, document: number) => judged.grades[document] ?? 0;

const lexicalRun = (terms: string[]) => rankByScore(bm25Scores(corpus, terms));
const semanticRun = (terms: string[]) => rankByScore(vectorScores(documentVectors, embed(terms, concepts, dims)));
const systems = [
  { name: "BM25", run: lexicalRun },
  { name: "vetorial", run: semanticRun },
  {
    name: "RRF",
    run: (terms: string[]) => reciprocalRankFusion([lexicalRun(terms), semanticRun(terms)], initial.k).map((entry) => entry.document),
  },
];

const precisionAt = (ranking: number[], judged: Judged) =>
  ranking.slice(0, K).filter((document) => gradeOf(judged, document) > 0).length / K;
const recallAt = (ranking: number[], judged: Judged) =>
  ranking.slice(0, K).filter((document) => gradeOf(judged, document) > 0).length / Object.keys(judged.grades).length;
const reciprocalRank = (ranking: number[], judged: Judged) => {
  const position = ranking.findIndex((document) => gradeOf(judged, document) > 0);
  return position === -1 ? 0 : 1 / (position + 1);
};
const discount = (position: number) => Math.log2(position + 1);
const dcgTerms = (grades: number[]) => grades.slice(0, K).map((grade, index) => grade / discount(index + 1));
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const ndcgAt = (ranking: number[], judged: Judged) => {
  const ideal = Object.values(judged.grades).sort((a, b) => b - a);
  return sum(dcgTerms(ranking.map((document) => gradeOf(judged, document)))) / sum(dcgTerms(ideal));
};
const mean = (values: number[]) => sum(values) / values.length;

const results = systems.map((system) => {
  const rankings = judgments.map((judged) => system.run(tokenize(judged.query, stop)));
  const perQuery = (metric: (ranking: number[], judged: Judged) => number) =>
    rankings.map((ranking, index) => metric(ranking, judgments[index]));
  return {
    name: system.name,
    rankings,
    precision: perQuery(precisionAt),
    recall: perQuery(recallAt),
    reciprocal: perQuery(reciprocalRank),
    ndcg: perQuery(ndcgAt),
  };
});
const [lexical, semantic, fused] = results;
const metricNames = ["P@3", "R@3", "MRR", "nDCG@3"];
const summaryTable = results.map((result) => [mean(result.precision), mean(result.recall), mean(result.reciprocal), mean(result.ndcg)]);
const NDCG = metricNames.indexOf("nDCG@3");
const best = summaryTable.reduce((winner, row, index) => (row[NDCG] > summaryTable[winner][NDCG] ? index : winner), 0);

const ECONOMIC = 1;
const economicRanking = lexical.rankings[ECONOMIC];
const ELECTRIC = 2;
const electricRanking = semantic.rankings[ELECTRIC];
const OIL = 0;
const oilRanking = lexical.rankings[OIL];
const oilGrades = oilRanking.slice(0, K).map((document) => gradeOf(judgments[OIL], document));
const oilTerms = dcgTerms(oilGrades);
const oilIdeal = dcgTerms(Object.values(judgments[OIL].grades).sort((a, b) => b - a));
const neverWorst = judgments.every((_, query) => fused.ndcg[query] >= Math.min(lexical.ndcg[query], semantic.ndcg[query]));

const lesson: LessonContent = {
  id: "07-12",
  subtitle: "Como saber se a busca melhorou: um gabarito de julgamentos de relevância e as métricas que comparam rankings com ele.",
  objectives: [
    "Montar um gabarito com consultas e julgamentos de relevância",
    "Calcular precision@k e recall@k e explicar o que cada uma mede",
    "Calcular MRR e nDCG e dizer quando cada uma importa",
    "Comparar sistemas de busca com o mesmo gabarito, olhando média e casos ruins",
  ],
  steps: [
    {
      id: "answer-key",
      shortTitle: "Gabarito",
      title: "Sem gabarito, não há nota",
      tag: "context",
      body: [
        "Um professor só corrige uma prova se tiver o gabarito. Em busca, o gabarito é uma lista de consultas e, para cada uma, quais documentos são relevantes. Cada par consulta e documento recebe um [[julgamento de relevância|relevance-judgment]] dado por uma pessoa: 2 se responde, 1 se ajuda em parte, 0 se não serve.",
        `Aqui, o gabarito tem ${judgments.length} consultas sobre os ${documents.length} documentos do Laboratório. Com ele, qualquer sistema vira número: roda cada consulta, compara os primeiros ${K} resultados com as notas e calcula as métricas. O mesmo gabarito mede o BM25, a busca vetorial e o RRF das aulas anteriores.`,
      ],
      keyIdea: "Avaliar busca = consultas + julgamentos humanos + métricas que comparam o ranking com eles.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "queries", kind: "user", label: `${judgments.length} consultas`, col: 0, row: 0 },
              { id: "system", kind: "retrieval", label: "sistema de busca", col: 1, row: 0 },
              { id: "judgments", kind: "documents", label: "julgamentos", col: 1, row: 1 },
              { id: "eval", kind: "eval", label: "métricas", col: 2, row: 0.5 },
              { id: "decision", kind: "answer", label: "melhorou?", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "queries", to: "system" },
              { from: "system", to: "eval", label: `top-${K}` },
              { from: "judgments", to: "eval", label: "notas 0 a 2" },
              { from: "eval", to: "decision" },
            ],
            active: "eval",
          },
        ],
      },
      alt: `As ${judgments.length} consultas passam pelo sistema de busca; o top-${K} e os julgamentos com notas de 0 a 2 chegam à avaliação, em destaque, que responde se o sistema melhorou.`,
    },
    {
      id: "precision-recall",
      shortTitle: "P@k e R@k",
      title: "Quanto do topo presta, e quanto do que presta está no topo",
      tag: "mechanism",
      body: [
        `[[Precision@k|precision-at-k]] é a fração dos k primeiros resultados que é relevante. [[Recall@k|recall-at-k]] é a fração dos relevantes que aparece nos k primeiros. Em “${judgments[ECONOMIC].query}”, o BM25 devolve ${economicRanking.map((document) => labels[document]).join(" e ")}; só “${labels[3]}” é relevante. P@${K} = 1/${K} = ${fixed(lexical.precision[ECONOMIC])} e R@${K} = 1/2 = ${fixed(lexical.recall[ECONOMIC])}, porque o texto sobre combustível, o melhor, ficou de fora.`,
        `A tabela mostra a nota de cada posição do top-${K} do BM25, consulta por consulta. Repare num limite: em “${judgments[ELECTRIC].query}” só existe 1 documento relevante, então P@${K} nunca passa de ${fixed(1 / K)}, por melhor que o sistema seja. Na média do BM25, P@${K} = ${fixed(mean(lexical.precision))} e R@${K} = ${fixed(mean(lexical.recall))}. Recall@k é a métrica da 1ª etapa, a que alimenta o reranker.`,
      ],
      keyIdea: "Precision@k: o topo está limpo? Recall@k: o que importa chegou ao topo?",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "lexical-metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "p", label: `BM25 · P@${K}`, value: fixed(mean(lexical.precision)) },
              { id: "r", label: `BM25 · R@${K}`, value: fixed(mean(lexical.recall)), color: "module-07" },
            ],
            highlight: "r",
          },
          {
            id: "grades",
            piece: "matrix",
            rows: judgments.map((judged) => judged.query),
            cols: Array.from({ length: K }, (_, index) => `${index + 1}º`),
            values: judgments.map((judged, query) =>
              Array.from({ length: K }, (_, index) => {
                const document = lexical.rankings[query][index];
                return document === undefined ? 0 : gradeOf(judged, document);
              }),
            ),
            scale: { min: 0, max: 2 },
            showValues: true,
            highlight: { row: ECONOMIC, col: 1 },
            color: "module-07",
          },
        ],
      },
      alt: `Nota de relevância de cada posição do top-${K} do BM25 nas ${judgments.length} consultas. Na média, P@${K} = ${fixed(mean(lexical.precision))} e R@${K} = ${fixed(mean(lexical.recall))}.`,
    },
    {
      id: "mrr",
      shortTitle: "MRR",
      title: "Em que posição aparece a primeira resposta boa",
      tag: "mechanism",
      body: [
        `Muitas vezes a pessoa só quer uma resposta, e o que importa é quão cedo ela aparece. O reciprocal rank é 1 / posição do primeiro relevante: 1 se ele está em 1º, 0,5 em 2º, 0,33 em 3º, 0 se não aparece. Em “${judgments[ELECTRIC].query}”, o vetorial devolve ${electricRanking.slice(0, K).map((document) => labels[document]).join(", ")}: o primeiro relevante está em 2º, e o RR é ${fixed(semantic.reciprocal[ELECTRIC])}.`,
        `O [[MRR|mrr]] é a média do RR sobre as consultas: ${semantic.reciprocal.map((value) => fixed(value)).join(", ")} dão ${fixed(mean(semantic.reciprocal))} para o vetorial. É a métrica oficial do ranking de passagens do MS MARCO, calculada no top-10 (MRR@10). Ela ignora tudo depois do primeiro acerto, então diz pouco quando a resposta precisa de vários documentos, como no contexto de um RAG.`,
      ],
      keyIdea: "MRR = média de 1 / posição do primeiro relevante. Mede o quão cedo aparece a primeira resposta boa.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "ranking",
            piece: "token-stream",
            tokens: electricRanking.slice(0, K).map((document) => labels[document]),
            bars: electricRanking.slice(0, K).map((document) => gradeOf(judgments[ELECTRIC], document) / 2),
            query: electricRanking.findIndex((document) => gradeOf(judgments[ELECTRIC], document) > 0),
            color: "module-07",
          },
          {
            id: "rr",
            piece: "chart",
            kind: "bar",
            series: judgments.map((judged, index) => ({ label: judged.query, value: semantic.reciprocal[index] })),
            max: 1,
            highlight: ELECTRIC,
            color: "module-07",
          },
        ],
      },
      alt: `O top-${K} do vetorial para ${judgments[ELECTRIC].query}, com o primeiro relevante em 2º; abaixo, o reciprocal rank do vetorial em cada consulta: ${semantic.reciprocal.map((value) => fixed(value)).join(", ")}, média ${fixed(mean(semantic.reciprocal))}.`,
    },
    {
      id: "ndcg",
      shortTitle: "nDCG",
      title: "Notas que valem menos quanto mais embaixo",
      tag: "mechanism",
      body: [
        `O [[nDCG|ndcg]] usa as notas, não só “relevante ou não”, e desconta pela posição: cada resultado vale nota / log2(posição + 1). Em “${judgments[OIL].query}”, o BM25 devolve ${oilRanking.slice(0, K).map((document) => labels[document]).join(", ")}, com notas ${oilGrades.join(", ")}. O DCG é ${oilTerms.map((value) => fixed(value)).join(" + ")} = ${fixed(sum(oilTerms))}.`,
        `O ranking ideal poria o manual (nota 2) em 1º e o carro elétrico (nota 1) em 2º: DCG ideal = ${oilIdeal.map((value) => fixed(value)).join(" + ")} = ${fixed(sum(oilIdeal))}. O nDCG divide um pelo outro: ${fixed(sum(oilTerms))} / ${fixed(sum(oilIdeal))} = ${fixed(lexical.ndcg[OIL])}. Vai de 0 a 1 e premia pôr o melhor no topo. O BEIR reporta nDCG@10 em todos os seus conjuntos.`,
      ],
      keyIdea: "nDCG: notas graduadas, descontadas pela posição, divididas pelo melhor ranking possível.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "dcg",
            piece: "metrics-panel",
            metrics: [
              { id: "dcg", label: "DCG", value: fixed(sum(oilTerms)) },
              { id: "ideal", label: "DCG ideal", value: fixed(sum(oilIdeal)) },
              { id: "ndcg", label: `nDCG@${K}`, value: fixed(lexical.ndcg[OIL]), color: "module-07" },
            ],
            highlight: "ndcg",
          },
          {
            id: "gains",
            piece: "chart",
            kind: "bar",
            series: oilRanking.slice(0, K).map((document, index) => ({
              label: `${index + 1}º ${labels[document]}`,
              value: Number(oilTerms[index].toFixed(3)),
            })),
            max: 2,
            color: "module-07",
          },
        ],
      },
      alt: `Ganho descontado de cada posição do BM25 em ${judgments[OIL].query}: ${oilRanking.slice(0, K).map((document, index) => `${labels[document]} ${fixed(oilTerms[index])}`).join(", ")}. DCG ${fixed(sum(oilTerms))}, ideal ${fixed(sum(oilIdeal))}, nDCG ${fixed(lexical.ndcg[OIL])}.`,
    },
    {
      id: "compare",
      shortTitle: "Comparar",
      title: "Os três sistemas, o mesmo gabarito",
      tag: "example",
      body: [
        `A tabela junta as quatro métricas, na média das ${judgments.length} consultas. Neste gabarito, o ${results[best].name} tem o maior nDCG@${K}, ${fixed(summaryTable[best][NDCG])}, contra ${results.flatMap((result, index) => (index === best ? [] : [`${fixed(summaryTable[index][NDCG])} do ${result.name}`])).join(" e ")}.${results[best] === semantic ? " Faz sentido: em “trocar óleo do carro” e “carro econômico”, a consulta usa palavras diferentes das dos documentos, o terreno dos vetores." : ""}`,
        `Mas a média não conta tudo. Consulta por consulta, o RRF ${neverWorst ? "nunca fica atrás dos outros dois ao mesmo tempo" : "às vezes fica atrás dos outros dois"}: em “${judgments[ECONOMIC].query}”, o BM25 marca ${fixed(lexical.ndcg[ECONOMIC])} de nDCG e o RRF ${fixed(fused.ndcg[ECONOMIC])}; em “${judgments[ELECTRIC].query}”, o vetorial marca ${fixed(semantic.ndcg[ELECTRIC])} e o RRF ${fixed(fused.ndcg[ELECTRIC])}. Com consultas de códigos e nomes, a média mudaria de lado; o RRF é a aposta que não afunda em nenhum tipo.`,
      ],
      keyIdea: "Compare sistemas com o mesmo gabarito, e olhe a média e os piores casos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "table",
            piece: "matrix",
            rows: results.map((result) => result.name),
            cols: metricNames,
            values: summaryTable,
            scale: { min: 0, max: 1 },
            showValues: true,
            highlight: { row: best, col: NDCG },
            color: "module-07",
          },
        ],
      },
      alt: `Tabela com P@${K}, R@${K}, MRR e nDCG@${K} médios de ${results.map((result) => result.name).join(", ")}. O maior nDCG é o do ${results[best].name}, ${fixed(summaryTable[best][NDCG])}.`,
    },
    {
      id: "pitfalls",
      shortTitle: "Cuidados",
      title: "Quatro consultas não decidem nada",
      tag: "tradeoff",
      body: [
        `Com ${judgments.length} consultas, mudar uma única nota pode trocar o vencedor. Gabaritos de verdade têm centenas ou milhares de consultas, tiradas do tráfego real e não inventadas pela equipe, e a diferença entre dois sistemas precisa ser maior que o ruído. Julgar dá trabalho: cada consulta pede uma pessoa lendo vários documentos.`,
        "O outro risco é medir só o que foi julgado. Um documento bom que ninguém julgou conta como irrelevante, e um sistema novo que o encontra parece pior. Os conjuntos públicos, como os do TREC, julgam a união do topo de vários sistemas para reduzir esse viés. E a avaliação offline não substitui a online: cliques, reformulações e testes A/B dizem se as pessoas acharam o que queriam.",
      ],
      keyIdea: "Gabarito pequeno é ruído. Use consultas reais, muitas, e confirme com sinais online.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "per-query",
            piece: "matrix",
            rows: results.map((result) => result.name),
            cols: judgments.map((judged) => judged.query),
            values: results.map((result) => result.ndcg),
            scale: { min: 0, max: 1 },
            showValues: true,
            highlight: { row: 0, col: ECONOMIC },
            color: "module-07",
          },
        ],
      },
      alt: `nDCG@${K} de cada sistema em cada consulta. Os valores mudam bastante de uma consulta para outra; em destaque, o BM25 em ${judgments[ECONOMIC].query}, com ${fixed(lexical.ndcg[ECONOMIC])}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Toda mudança passa pelo gabarito",
      tag: "summary",
      body: [
        "Trocou o modelo de embedding, o k do RRF, o α, o tamanho do top-k, o reranker? Roda o gabarito antes e depois. Recall@k diz se a 1ª etapa traz o que importa; nDCG e MRR dizem se o topo está na ordem certa. Uma mudança só entra se a métrica certa melhorar, sem derrubar os piores casos.",
        "Este módulo foi de casar palavras a medir rankings. O próximo usa tudo isso como peça de um sistema maior: o RAG, em que a busca escolhe os trechos que o LLM lê antes de responder.",
      ],
      keyIdea: "Mudou a busca? Mede no gabarito: recall@k para a 1ª etapa, nDCG e MRR para o topo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "change", kind: "laptop", label: "mudança", col: 0, row: 0.5 },
              { id: "queue", kind: "queue", label: "roda o gabarito", col: 1, row: 0.5 },
              { id: "eval", kind: "eval", label: "p@k · r@k · ndcg", col: 2, row: 0.5 },
              { id: "ship", kind: "answer", label: "entra", col: 3, row: 0 },
              { id: "revert", kind: "no-result", label: "volta", col: 3, row: 1 },
            ],
            edges: [
              { from: "change", to: "queue" },
              { from: "queue", to: "eval", label: "rankings" },
              { from: "eval", to: "ship", label: "melhorou" },
              { from: "eval", to: "revert", label: "piorou", variant: "alternative" },
            ],
            active: "eval",
            done: ["change", "queue"],
          },
        ],
      },
      alt: "Uma mudança no sistema entra na fila que roda o gabarito; a avaliação, em destaque, calcula precision@k, recall@k e nDCG e decide se a mudança entra ou volta.",
    },
  ],
  realWorldExample:
    "O MS MARCO, criado com perguntas reais do Bing, usa MRR@10 como métrica oficial do ranking de passagens; o BEIR reporta nDCG@10 em 18 conjuntos de domínios diferentes. Os dois são a régua mais usada para comparar BM25, modelos densos, busca híbrida e rerankers.",
  code: {
    language: "python",
    source: `import math

def precision_at(ranking, grades, k):
    return sum(1 for doc in ranking[:k] if grades.get(doc, 0) > 0) / k

def recall_at(ranking, grades, k):
    return sum(1 for doc in ranking[:k] if grades.get(doc, 0) > 0) / len(grades)

def reciprocal_rank(ranking, grades):
    return next((1 / (i + 1) for i, doc in enumerate(ranking) if grades.get(doc, 0) > 0), 0.0)

def ndcg_at(ranking, grades, k):
    dcg = sum(grades.get(doc, 0) / math.log2(i + 2) for i, doc in enumerate(ranking[:k]))
    ideal = sum(g / math.log2(i + 2) for i, g in enumerate(sorted(grades.values(), reverse=True)[:k]))
    return dcg / ideal

grades = {"manual": 2, "carro elétrico": 1}
ranking = ["pneu", "carro elétrico", "manual"]
print(precision_at(ranking, grades, 3), recall_at(ranking, grades, 3), reciprocal_rank(ranking, grades), ndcg_at(ranking, grades, 3))`,
    caption: "As quatro métricas da aula, com a consulta “trocar óleo do carro” e o ranking do BM25. O resultado bate com a cena.",
  },
  tradeOffs: {
    pros: [
      "Transforma “a busca ficou melhor?” num número comparável",
      "Roda offline, em minutos, a cada mudança",
      "Separa os problemas: recall da 1ª etapa, ordem do topo",
    ],
    cons: [
      "Julgamentos humanos são caros e lentos",
      "Documentos não julgados contam como irrelevantes e enviesam a comparação",
      "Gabarito pequeno ou fora do tráfego real mede a coisa errada",
    ],
    alternatives: ["Sinais online: cliques, reformulações, testes A/B", "LLM como juiz de relevância, conferido por amostragem humana"],
  },
  knowledgeCheck: [
    {
      id: "pick-metric",
      prompt: "Um RAG coloca os 5 primeiros trechos no prompt, e a resposta costuma precisar de 2 ou 3 deles. Qual métrica acompanhar na busca?",
      options: [
        "MRR, porque só importa o primeiro acerto",
        "Recall@5, e nDCG@5 para a ordem: o que importa é os trechos necessários estarem entre os 5",
        "Precision@1",
        "O tempo de resposta do LLM",
      ],
      correct: 1,
      explanation: "Se a resposta precisa de vários trechos, todos têm de chegar ao contexto. Recall@5 mede isso; o MRR pararia no primeiro acerto.",
      lesson: "07-12",
    },
    {
      id: "ndcg-compute",
      prompt: "Uma consulta tem um único documento relevante, com nota 2. O sistema o coloca em 3º. Qual é o nDCG@3, com ganho igual à nota e desconto log2(posição + 1)?",
      options: ["1", "0,5", "0,33", "0"],
      correct: 1,
      explanation: "DCG = 2 / log2(4) = 1. O ideal o poria em 1º: 2 / log2(2) = 2. nDCG = 1 / 2 = 0,5.",
      lesson: "07-12",
    },
  ],
  related: ["07-11", "08-15", "01-10"],
  references: [
    { title: "Introduction to Information Retrieval, cap. 8: Evaluation in information retrieval", url: "https://nlp.stanford.edu/IR-book/html/htmledition/evaluation-in-information-retrieval-1.html", kind: "article" },
    { title: "Discounted cumulative gain (Wikipedia), com a definição de Järvelin & Kekäläinen (2002)", url: "https://en.wikipedia.org/wiki/Discounted_cumulative_gain", kind: "article" },
    { title: "Thakur et al. (2021), BEIR: A Heterogeneous Benchmark for Zero-shot Evaluation of Information Retrieval Models", url: "https://arxiv.org/abs/2104.08663", kind: "paper" },
  ],
};

export default lesson;
