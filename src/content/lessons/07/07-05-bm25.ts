import { BM25_DEFAULTS, bm25Scores, rankByScore, tokenize } from "../../../lab/retrieval";
import type { LessonContent } from "../../../types/content";
import { bm25VsVectorContent } from "../../playgrounds/bm25-vs-vector";

// BM25 com o corpus, as stopwords e a consulta inicial do playground BM25 vs. vetorial, e com a mesma função
// bm25Scores de src/lab/retrieval.ts: as pontuações da aula são as que o Laboratório mostra. A contribuição
// de cada termo sai de bm25Scores chamada com um termo só, porque a pontuação é a soma sobre os termos.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const { k1: K1, b: B } = BM25_DEFAULTS;
const { documents, stopwords, initial } = bm25VsVectorContent;
const stop = new Set(stopwords);
const corpus = documents.map((document) => tokenize(document, stop));
const labels = ["pneu do carro", "manual e óleo", "bolo de cenoura", "carro elétrico", "combustível"];
const N = corpus.length;
const avgdl = corpus.reduce((sum, words) => sum + words.length, 0) / N;
/** O documento que de fato ensina a trocar o óleo. */
const MANUAL = 1;

/** IDF do BM25, a variante do Lucene usada em bm25Scores: ln((N − n + 0,5) / (n + 0,5) + 1). */
const idf = (term: string) => {
  const containing = corpus.filter((words) => words.includes(term)).length;
  return Math.log((N - containing + 0.5) / (containing + 0.5) + 1);
};
/** Parte de frequência do BM25: f · (k1 + 1) / (f + k1 · (1 − b + b · |D| / avgdl)). */
const tfPart = (frequency: number, length: number, k1 = K1, b = B) =>
  (frequency * (k1 + 1)) / (frequency + k1 * (1 - b + (b * length) / avgdl));

const frequencies = [1, 2, 3, 4, 5, 6, 7, 8];
const saturation = frequencies.map((frequency) => tfPart(frequency, avgdl));
const ceiling = K1 + 1;

const lengths = [2, 4, 8, 16];
const byLength = lengths.map((length) => tfPart(1, length));

const QUERY = initial.query;
const terms = tokenize(QUERY, stop);
const contributions = corpus.map((_, document) => terms.map((term) => bm25Scores(corpus, [term])[document]));
const totals = bm25Scores(corpus, terms);
const ranking = rankByScore(totals);
const top = ranking[0];
const manualPosition = ranking.indexOf(MANUAL) + 1;

const variants = [
  { label: "k1 = 0,5", params: { k1: 0.5, b: B } },
  { label: "k1 = 2", params: { k1: 2, b: B } },
  { label: "b = 0", params: { k1: K1, b: 0 } },
  { label: "b = 1", params: { k1: K1, b: 1 } },
];
const variantPositions = variants.map(({ label, params }) => ({
  label,
  position: rankByScore(bm25Scores(corpus, terms, params)).indexOf(MANUAL) + 1,
}));
const alwaysSame = variantPositions.every((variant) => variant.position === manualPosition);

const lesson: LessonContent = {
  id: "07-05",
  subtitle: "A função de ranking lexical padrão dos buscadores: IDF vezes uma frequência que satura e que desconta documentos longos.",
  objectives: [
    "Escrever a fórmula do BM25 e dizer o papel de k1 e de b",
    "Explicar por que a frequência do termo satura no BM25 e não no TF-IDF",
    "Calcular a contribuição de cada termo da consulta num documento",
    "Reconhecer o que ajustar k1 e b não resolve",
  ],
  steps: [
    {
      id: "standard",
      shortTitle: "O padrão",
      title: "O ranking que roda por trás das caixas de busca",
      tag: "context",
      body: [
        "Sal na comida: a primeira pitada muda tudo, a segunda ajuda, a décima não melhora nada. O [[BM25|bm25]] trata as repetições de um termo assim. Ele nasceu no sistema Okapi, nos anos 1990, e desde o Lucene 6 e o Elasticsearch 5 é a pontuação padrão desses motores.",
        `A fórmula soma, para cada termo q da consulta: IDF(q) · f · (k1 + 1) / (f + k1 · (1 − b + b · |D| / avgdl)). f é quantas vezes q aparece no documento D, |D| é o tamanho de D e avgdl é o tamanho médio na coleção. Os padrões são k1 = ${fixed(K1, 1)} e b = ${fixed(B)}, os mesmos do Laboratório.`,
      ],
      keyIdea: "BM25 = Σ IDF · frequência saturada (k1) e ajustada ao tamanho (b).",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "query", kind: "laptop", label: "consulta", col: 0, row: 0 },
              { id: "index", kind: "kv-cache", label: "índice invertido", col: 1, row: 0 },
              { id: "docs", kind: "documents", label: `${N} documentos`, col: 1, row: 1 },
              { id: "bm25", kind: "retrieval", label: "bm25", col: 2, row: 0 },
              { id: "answer", kind: "answer", label: "ranking", col: 3, row: 0 },
            ],
            edges: [
              { from: "query", to: "index", label: "termos" },
              { from: "docs", to: "index", label: "tf, df, |D|" },
              { from: "index", to: "bm25" },
              { from: "bm25", to: "answer" },
            ],
            active: "bm25",
          },
        ],
      },
      alt: `A consulta busca os termos no índice invertido, que guarda tf, df e o tamanho de cada um dos ${N} documentos; a etapa BM25, em destaque, transforma isso em ranking.`,
    },
    {
      id: "saturation",
      shortTitle: "Saturação",
      title: "k1: cada repetição vale menos que a anterior",
      tag: "mechanism",
      body: [
        `No TF-IDF, o termo que aparece 8 vezes vale 8 vezes o que aparece 1. No BM25, com k1 = ${fixed(K1, 1)} num documento de tamanho médio, a parte de frequência vai de ${fixed(saturation[0])} com 1 ocorrência para ${fixed(saturation[1])} com 2 e ${fixed(saturation[saturation.length - 1])} com 8. É a [[saturação da frequência|term-saturation]]: a curva sobe rápido e encosta num teto.`,
        `O teto é k1 + 1 = ${fixed(ceiling, 1)}. k1 controla a velocidade: perto de 0, só importa se o termo aparece ou não; grande, a curva demora a saturar e o comportamento volta a parecer o do TF-IDF. Repetir “chocolate” seis vezes, como na aula anterior, deixa de ser um atalho para o topo.`,
      ],
      keyIdea: "No BM25, a frequência tem teto de k1 + 1. Repetir a palavra deixa de comprar o ranking.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "curve",
            piece: "chart",
            kind: "line",
            series: frequencies.map((frequency, index) => ({ label: `f=${frequency}`, value: Number(saturation[index].toFixed(3)) })),
            max: ceiling,
            color: "module-07",
          },
        ],
      },
      alt: `Curva da parte de frequência do BM25 para f de 1 a 8, com k1 = ${fixed(K1, 1)}: começa em ${fixed(saturation[0])} e se aproxima do teto ${fixed(ceiling, 1)}, chegando a ${fixed(saturation[saturation.length - 1])}.`,
    },
    {
      id: "length",
      shortTitle: "Tamanho",
      title: "b: documento longo tem palavra por acaso",
      tag: "mechanism",
      body: [
        `Um livro inteiro tem a palavra “óleo” em algum lugar; um parágrafo que tem “óleo” provavelmente fala de óleo. A [[normalização por tamanho|length-normalization]] desconta isso dividindo pelo tamanho relativo |D| / avgdl. Na cena, avgdl = ${fixed(avgdl, 0)} palavras, e o termo aparece 1 vez: num documento de ${lengths[0]} palavras ele vale ${fixed(byLength[0])}; num de ${lengths[lengths.length - 1]}, ${fixed(byLength[byLength.length - 1])}.`,
        `b vai de 0 a 1. Com b = 0, o tamanho é ignorado e todo documento vale ${fixed(tfPart(1, lengths[lengths.length - 1], K1, 0))}. Com b = 1, a normalização é total. O padrão ${fixed(B)} é um meio-termo que funciona bem em textos de tamanho variado; em títulos curtos e parecidos, um b menor costuma ir melhor.`,
      ],
      keyIdea: "b decide o quanto o tamanho do documento desconta a pontuação: 0 ignora, 1 normaliza tudo.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "params",
            piece: "metrics-panel",
            metrics: [
              { id: "b", label: "b", value: fixed(B) },
              { id: "avgdl", label: "avgdl", value: `${fixed(avgdl, 0)} palavras` },
              { id: "short", label: `${lengths[0]} palavras`, value: fixed(byLength[0]), color: "success" },
              { id: "long", label: `${lengths[lengths.length - 1]} palavras`, value: fixed(byLength[byLength.length - 1]), color: "danger" },
            ],
            highlight: "long",
          },
          {
            id: "lengths",
            piece: "chart",
            kind: "bar",
            series: lengths.map((length, index) => ({ label: `|D|=${length}`, value: Number(byLength[index].toFixed(3)) })),
            max: ceiling,
            highlight: lengths.length - 1,
            color: "module-07",
          },
        ],
      },
      alt: `Barras com o valor de uma ocorrência do termo em documentos de ${lengths.join(", ")} palavras, com b = ${fixed(B)} e avgdl ${fixed(avgdl, 0)}: de ${fixed(byLength[0])} a ${fixed(byLength[byLength.length - 1])}.`,
    },
    {
      id: "worked",
      shortTitle: "Contas",
      title: "A consulta do Laboratório, termo a termo",
      tag: "example",
      body: [
        `A consulta inicial do playground é “${QUERY}”, que vira ${terms.map((term) => `“${term}”`).join(", ")}. “trocar” aparece em 1 dos ${N} documentos: IDF = ln((${N} − 1 + 0,5) / (1 + 0,5) + 1) = ${fixed(idf("trocar"))}. “oleo” e “carro” aparecem em 2: IDF = ${fixed(idf("oleo"))}. O termo raro vale mais, como no TF-IDF.`,
        `A tabela mostra a contribuição de cada termo em cada documento. “${documents[top]}” soma ${fixed(totals[top])} e lidera, porque tem o raro “trocar” escrito igual e é curto. O manual soma ${fixed(totals[MANUAL])}: só “oleo” casa, porque ele escreve “troca” e “automóvel”.`,
      ],
      keyIdea: "Cada termo contribui IDF × frequência saturada; o documento soma as contribuições.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "contributions",
            piece: "matrix",
            rows: labels,
            cols: terms,
            values: contributions,
            showValues: true,
            highlight: { row: top, col: terms.indexOf("trocar") },
            color: "module-07",
          },
        ],
      },
      alt: `Contribuição BM25 de trocar, oleo e carro em cada documento. ${labels[top]} soma ${fixed(totals[top])}, com a maior parte vinda de trocar; o manual soma ${fixed(totals[MANUAL])}.`,
    },
    {
      id: "limits",
      shortTitle: "Limites",
      title: "Ajustar k1 e b não ensina sinônimos",
      tag: "tradeoff",
      body: [
        `No ranking final, o manual que ensina a trocar o óleo fica em ${manualPosition}º. ${alwaysSame ? `Testando ${variants.map((variant) => variant.label).join(", ")}, ele continua em ${manualPosition}º.` : `Mexer nos parâmetros muda pouco: ${variantPositions.map((variant) => `com ${variant.label}, ${variant.position}º`).join("; ")}.`} k1 e b corrigem repetição e tamanho, mas o BM25 continua casando termos escritos iguais.`,
        "Mesmo assim, o BM25 é difícil de bater. Não precisa de treino, roda em milissegundos sobre o índice invertido e acerta em cheio códigos, nomes e termos raros. No benchmark BEIR, de 2021, ele superou vários modelos densos avaliados fora do domínio em que foram treinados. A próxima aula ataca o que ele não alcança: o significado.",
      ],
      keyIdea: "BM25 é a melhor versão de casar palavras. Para sinônimos, precisa de outra ideia.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "variants",
            piece: "metrics-panel",
            metrics: [
              { id: "default", label: `k1 = ${fixed(K1, 1)}, b = ${fixed(B)}`, value: `manual em ${manualPosition}º`, color: "danger" },
              ...variantPositions.map((variant) => ({ id: variant.label, label: variant.label, value: `${variant.position}º` })),
            ],
            highlight: "default",
          },
          {
            id: "totals",
            piece: "chart",
            kind: "bar",
            series: labels.map((label, index) => ({ label, value: Number(totals[index].toFixed(2)) })),
            highlight: MANUAL,
            color: "module-07",
          },
        ],
      },
      alt: `Pontuação BM25 total de cada documento para ${QUERY}: ${labels[top]} lidera com ${fixed(totals[top])} e o manual, em destaque, fica em ${manualPosition}º; com outros valores de k1 e b, ele fica em ${variantPositions.map((variant) => `${variant.position}º`).join(", ")}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "O que o índice guarda, o BM25 usa",
      tag: "summary",
      body: [
        "Na indexação, o buscador guarda a frequência de cada termo em cada documento, o tamanho de cada documento e o DF de cada termo. Na consulta, o BM25 calcula o IDF de cada termo, satura a frequência com k1, desconta o tamanho com b e soma. Tudo com dados que já estão no índice invertido.",
        "Para experimentar, abra o playground BM25 vs. busca vetorial no Laboratório: as pontuações BM25 de lá são exatamente as desta aula. A próxima aula troca palavras por vetores.",
      ],
      keyIdea: "BM25(q, D) = Σ IDF(t) · f · (k1 + 1) / (f + k1 · (1 − b + b · |D| / avgdl)).",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "docs", kind: "documents", label: "documentos", col: 0, row: 0 },
              { id: "queue", kind: "queue", label: "indexação", col: 1, row: 0 },
              { id: "index", kind: "kv-cache", label: "tf, df, |D|", col: 2, row: 0 },
              { id: "query", kind: "laptop", label: QUERY, col: 1, row: 1 },
              { id: "bm25", kind: "retrieval", label: `k1 ${fixed(K1, 1)} · b ${fixed(B)}`, col: 2, row: 1 },
              { id: "answer", kind: "answer", label: labels[top], col: 3, row: 1 },
            ],
            edges: [
              { from: "docs", to: "queue" },
              { from: "queue", to: "index" },
              { from: "query", to: "bm25" },
              { from: "index", to: "bm25" },
              { from: "bm25", to: "answer", label: "1º" },
            ],
            active: "bm25",
            done: ["docs", "queue", "index", "query"],
          },
        ],
      },
      alt: `Documentos passam pela indexação, que guarda tf, df e tamanho; a consulta ${QUERY} chega ao BM25 com k1 ${fixed(K1, 1)} e b ${fixed(B)}, em destaque, que põe ${labels[top]} em 1º.`,
    },
  ],
  realWorldExample:
    "O Elasticsearch e o OpenSearch usam BM25 como similaridade padrão de todo campo de texto, com k1 = 1,2 e b = 0,75. Os dois parâmetros podem ser trocados por campo, nas configurações do índice.",
  code: {
    language: "json",
    source: `PUT /produtos
{
  "settings": {
    "index": {
      "similarity": {
        "default": { "type": "BM25", "k1": 1.2, "b": 0.75 }
      }
    }
  }
}`,
    caption: "Criando um índice no Elasticsearch com o BM25 configurado explicitamente. Para títulos curtos, teste um b menor e meça o resultado.",
  },
  tradeOffs: {
    pros: [
      "Sem treino e sem GPU: só contagens do índice invertido",
      "Satura repetições e desconta documentos longos com dois parâmetros",
      "Forte em termos raros, códigos e nomes; linha de base difícil de bater",
    ],
    cons: [
      "Continua lexical: sinônimos e paráfrases não pontuam",
      "Pontuação sem escala fixa: não dá para comparar com um cosseno",
      "k1 e b dependem da coleção, e ajustar exige avaliação",
    ],
    alternatives: ["BM25F, que pesa campos diferentes (título, corpo)", "Busca semântica com embeddings", "Busca híbrida, que junta os dois"],
  },
  knowledgeCheck: [
    {
      id: "k1-zero",
      prompt: "O que acontece com o BM25 quando k1 se aproxima de 0?",
      options: [
        "A frequência passa a valer sem limite, como no TF-IDF",
        "Só importa se o termo aparece ou não: a parte de frequência vira 1 para qualquer f > 0",
        "O IDF deixa de contar",
        "Documentos longos passam a ganhar",
      ],
      correct: 1,
      explanation: "Com k1 → 0, f · (k1 + 1) / (f + k1 · …) → f / f = 1. O BM25 vira uma soma de IDFs dos termos presentes, uma busca binária ponderada.",
      lesson: "07-05",
    },
    {
      id: "short-titles",
      prompt: "Um catálogo de produtos tem títulos curtos de tamanhos parecidos, e a busca favorece estranhamente os títulos mais curtos. Qual ajuste testar primeiro?",
      options: [
        "Aumentar b para 1",
        "Diminuir b, para o tamanho pesar menos, e medir com o conjunto de avaliação",
        "Remover o IDF",
        "Aumentar k1 para 100",
      ],
      correct: 1,
      explanation: "b controla o desconto pelo tamanho. Em textos curtos e parecidos, a diferença de tamanho diz pouco sobre relevância, e um b menor reduz o efeito. Qualquer ajuste precisa ser medido.",
      lesson: "07-05",
    },
  ],
  related: ["07-04", "07-06", "07-08"],
  references: [
    { title: "Introduction to Information Retrieval, 11.4.3: Okapi BM25", url: "https://nlp.stanford.edu/IR-book/html/htmledition/okapi-bm25-a-non-binary-model-1.html", kind: "article" },
    { title: "Robertson & Zaragoza (2009), The Probabilistic Relevance Framework: BM25 and Beyond", url: "https://www.staff.city.ac.uk/~sbrp622/papers/foundations_bm25_review.pdf", kind: "paper" },
    { title: "Elasticsearch: Similarity module", url: "https://www.elastic.co/docs/reference/elasticsearch/index-settings/similarity", kind: "docs" },
  ],
};

export default lesson;
