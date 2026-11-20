import { tokenize } from "../../../lab/retrieval";
import type { LessonContent } from "../../../types/content";

// TF-IDF calculado aqui sobre um caderno de 6 receitas, sem remover stopwords: é o IDF que descobre
// sozinho que “de” não ajuda. A conta é a do livro de Manning, Raghavan e Schütze: peso = tf · log10(N / df),
// e a pontuação de um documento é a soma dos pesos dos termos da consulta.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const recipes = [
  "bolo de chocolate com cobertura de chocolate",
  "bolo de cenoura",
  "mousse de chocolate",
  "pão de queijo",
  "torta de limão",
  "brigadeiro de chocolate",
];
const labels = ["bolo de chocolate", "bolo de cenoura", "mousse", "pão de queijo", "torta de limão", "brigadeiro"];

const tf = (words: string[], term: string) => words.filter((word) => word === term).length;
const idfIn = (documents: string[][]) => (term: string) => {
  const df = documents.filter((words) => words.includes(term)).length;
  return df === 0 ? 0 : Math.log10(documents.length / df);
};
const tfIdfScores = (documents: string[][], terms: string[]) => {
  const idf = idfIn(documents);
  return documents.map((words) => terms.reduce((sum, term) => sum + tf(words, term) * idf(term), 0));
};
const argmax = (values: number[]) => values.indexOf(Math.max(...values));

const corpus = recipes.map((recipe) => tokenize(recipe));
const N = corpus.length;
const idf = idfIn(corpus);
const df = (term: string) => corpus.filter((words) => words.includes(term)).length;

const QUERY = "bolo de chocolate";
const terms = tokenize(QUERY);
const tfTable = corpus.map((words) => terms.map((term) => tf(words, term)));
const tfOnly = corpus.map((words) => terms.reduce((sum, term) => sum + tf(words, term), 0));
const tfIdf = tfIdfScores(corpus, terms);
const tfOnlyMatches = tfOnly.filter((score) => score > 0).length;
const tfIdfMatches = tfIdf.filter((score) => score > 0).length;
const top = argmax(tfIdf);
const PAO = 3;

const shownTerms = ["de", "chocolate", "bolo", "cenoura", "queijo", "limão"];
const idfSeries = shownTerms.map((term) => ({ label: term, value: Number(idf(tokenize(term)[0]).toFixed(3)) }));
const maxIdf = Math.log10(N);
const toSeries = (scores: number[]) => labels.map((label, index) => ({ label, value: Number(scores[index].toFixed(2)) }));

const STUFFED = Array.from({ length: 6 }, () => "chocolate").join(" ");
const stuffedCorpus = [...corpus, tokenize(STUFFED)];
const stuffedScores = tfIdfScores(stuffedCorpus, terms);
const stuffedScore = stuffedScores[stuffedCorpus.length - 1];
const realScore = stuffedScores[top];
const stuffedWins = stuffedScore > realScore;

const lesson: LessonContent = {
  id: "07-04",
  subtitle: "Dar peso aos termos: quanto mais um termo aparece no documento e quanto mais raro ele é na coleção, mais ele conta.",
  objectives: [
    "Calcular a frequência do termo (TF) e a frequência de documento (DF)",
    "Explicar por que o IDF zera palavras que aparecem em todos os documentos",
    "Pontuar documentos somando tf · idf dos termos da consulta",
    "Reconhecer o ponto fraco do TF-IDF: ele premia repetição sem limite",
  ],
  steps: [
    {
      id: "clues",
      shortTitle: "Pistas",
      title: "Uma pista que todo mundo tem não é pista",
      tag: "context",
      body: [
        `Um detetive procura um suspeito “de óculos e tatuagem de âncora”. “De óculos” elimina pouca gente; “tatuagem de âncora” quase resolve o caso. Busca funciona igual. No caderno de ${N} receitas, “de” aparece em todas, e “cenoura” em uma só. Para a consulta “${QUERY}”, cada palavra deveria pesar conforme o quanto ela separa os documentos.`,
        "Contar quantas palavras da consulta o documento tem trata todas como iguais. O [[TF-IDF|tf-idf]] dá um peso a cada termo, em cada documento, usando duas contagens que o índice invertido já guarda: quantas vezes o termo aparece ali e em quantos documentos ele aparece no total.",
      ],
      keyIdea: "Um termo vale pelo quanto ele separa os documentos, não por estar na consulta.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "cozinheiro", col: 0, row: 0 },
              { id: "terms", kind: "tokens", label: terms.join(" · "), col: 1, row: 0 },
              { id: "recipes", kind: "documents", label: `receitas (${N})`, col: 2, row: 1 },
              { id: "weigh", kind: "retrieval", label: "pesa os termos", col: 2, row: 0 },
              { id: "answer", kind: "answer", label: "ranking", col: 3, row: 0 },
            ],
            edges: [
              { from: "user", to: "terms", label: "consulta" },
              { from: "terms", to: "weigh" },
              { from: "recipes", to: "weigh", label: "tf e df" },
              { from: "weigh", to: "answer" },
            ],
            active: "weigh",
          },
        ],
      },
      alt: `A consulta ${QUERY} vira os termos ${terms.join(", ")}; a etapa que pesa os termos, em destaque, usa as contagens das ${N} receitas e devolve um ranking.`,
    },
    {
      id: "tf",
      shortTitle: "TF",
      title: "TF: quantas vezes o termo aparece",
      tag: "mechanism",
      body: [
        `A [[frequência do termo|term-frequency]] é a contagem dentro do documento. “${recipes[0]}” tem “chocolate” ${tf(corpus[0], "chocolate")} vezes e “de” ${tf(corpus[0], "de")} vezes. A ideia é razoável: quem fala mais de chocolate provavelmente é mais sobre chocolate.`,
        `Somando só o TF dos termos da consulta, ${tfOnlyMatches === N ? `todas as ${N} receitas pontuam` : `${tfOnlyMatches} das ${N} receitas pontuam`}, inclusive “${recipes[PAO]}”, com ${tfOnly[PAO]} ponto, que vem inteiro do “de”. Só a frequência não distingue palavra de assunto de palavra de ligação.`,
      ],
      keyIdea: "TF mede o quanto o documento fala do termo, mas trata “de” e “chocolate” do mesmo jeito.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "weights",
            piece: "matrix",
            rows: labels,
            cols: terms,
            values: tfTable,
            scale: { min: 0, max: 2 },
            showValues: true,
            highlight: { row: PAO, col: terms.indexOf("de") },
            color: "module-07",
          },
        ],
      },
      alt: `Tabela com a contagem de bolo, de e chocolate em cada receita. A célula de pão de queijo com o termo de, em destaque, vale ${tfTable[PAO][terms.indexOf("de")]}.`,
    },
    {
      id: "idf",
      shortTitle: "IDF",
      title: "IDF: quanto mais raro, mais vale",
      tag: "mechanism",
      body: [
        `A [[frequência de documento|document-frequency]] conta em quantos documentos o termo aparece: “de” em ${df("de")}, “chocolate” em ${df("chocolate")}, “bolo” em ${df("bolo")}. O [[IDF|idf]] transforma isso em peso: idf = log10(N / df). Com N = ${N}, “de” vale log10(${N}/${df("de")}) = ${fixed(idf("de"))}, “chocolate” vale ${fixed(idf("chocolate"))} e “bolo”, ${fixed(idf("bolo"))}.`,
        `O logaritmo serve para que a raridade não exploda: um termo que aparece em um só documento vale ${fixed(maxIdf)}, o teto nessa coleção, e não ${N} vezes mais. Repare que o IDF eliminou “de” sem ninguém escrever uma lista de [[stopwords|stopword]]: ele é comum demais para separar qualquer coisa.`,
      ],
      keyIdea: "IDF = log(N / df). Termo em todos os documentos pesa zero; termo raro pesa muito.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "query",
            piece: "token-stream",
            tokens: terms,
            bars: terms.map((term) => idf(term) / maxIdf),
            color: "module-07",
          },
          {
            id: "idf",
            piece: "chart",
            kind: "bar",
            series: idfSeries,
            max: Number(maxIdf.toFixed(3)),
            highlight: 0,
            color: "module-07",
          },
        ],
      },
      alt: `Os termos da consulta com barras de IDF, e o IDF de ${shownTerms.join(", ")}: de vale ${fixed(idf("de"))}, chocolate ${fixed(idf("chocolate"))}, bolo ${fixed(idf("bolo"))} e os termos de uma receita só valem ${fixed(maxIdf)}.`,
    },
    {
      id: "tf-idf",
      shortTitle: "TF × IDF",
      title: "Juntando: tf · idf, somado sobre a consulta",
      tag: "example",
      body: [
        `O peso de um termo num documento é tf · idf, e a pontuação é a soma sobre os termos da consulta. “${recipes[top]}” fica com 1 · ${fixed(idf("bolo"))} (bolo) + ${tf(corpus[top], "de")} · ${fixed(idf("de"))} (de) + ${tf(corpus[top], "chocolate")} · ${fixed(idf("chocolate"))} (chocolate) = ${fixed(tfIdf[top])}, e lidera.`,
        `À esquerda, só TF: ${tfOnlyMatches} receitas pontuam. À direita, TF-IDF: ${tfIdfMatches} pontuam, e “${recipes[PAO]}” cai para ${fixed(tfIdf[PAO])}. Esse é o modelo de espaço vetorial clássico: cada documento é um vetor esparso de pesos tf-idf, um por termo do vocabulário.`,
      ],
      keyIdea: "TF-IDF = o termo aparece muito aqui e pouco no resto. É o produto das duas ideias.",
      scene: {
        kind: "pieces",
        layout: "row",
        pieces: [
          { id: "tf-only", piece: "chart", kind: "bar", series: toSeries(tfOnly), highlight: PAO, color: "danger" },
          { id: "tf-idf", piece: "chart", kind: "bar", series: toSeries(tfIdf), highlight: top, color: "module-07" },
        ],
      },
      alt: `À esquerda, a pontuação só por TF: ${tfOnlyMatches} receitas pontuam, até pão de queijo. À direita, TF-IDF: ${labels[top]} lidera com ${fixed(tfIdf[top])} e pão de queijo vai a ${fixed(tfIdf[PAO])}.`,
    },
    {
      id: "stuffing",
      shortTitle: "Repetição",
      title: "Repetir a palavra compra pontos",
      tag: "tradeoff",
      body: [
        `O TF cresce sem limite: cada repetição soma o mesmo peso que a primeira. Acrescente ao caderno uma “receita” que é só “chocolate” escrito ${tf(tokenize(STUFFED), "chocolate")} vezes. Ela marca ${fixed(stuffedScore)} para “${QUERY}”, ${stuffedWins ? "e passa à frente" : "e chega perto"} da receita de verdade, com ${fixed(realScore)}. Os IDFs mudam um pouco porque agora N = ${stuffedCorpus.length}.`,
        "O TF-IDF também não olha o tamanho do documento: um texto longo acumula ocorrências por acaso. As versões usadas na prática remendam isso com tf sublinear (1 + log tf) e normalização pelo tamanho do vetor. O BM25, da próxima aula, resolve os dois problemas com dois parâmetros, e virou o padrão dos buscadores.",
      ],
      keyIdea: "No TF-IDF, a 10ª repetição de um termo vale tanto quanto a 1ª. Isso é fácil de explorar.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "stuffing",
            piece: "metrics-panel",
            metrics: [
              { id: "stuffed", label: "“chocolate” × 6", value: fixed(stuffedScore), color: "danger" },
              { id: "real", label: labels[top], value: fixed(realScore), color: "success" },
              { id: "idf", label: "idf de chocolate", value: fixed(idfIn(stuffedCorpus)("chocolate")) },
            ],
            highlight: "stuffed",
          },
        ],
      },
      alt: `Painel: o documento que repete chocolate 6 vezes marca ${fixed(stuffedScore)}; a receita de bolo de chocolate marca ${fixed(realScore)}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Duas contagens do índice viram um peso",
      tag: "summary",
      body: [
        "Na indexação, o buscador guarda o TF de cada termo em cada documento e o DF de cada termo, o tamanho da posting list. Na consulta, cada termo ganha idf = log(N / df), cada documento soma tf · idf dos termos que tem, e o ranking sai dessa soma.",
        "A próxima aula, BM25, mantém o IDF e troca o TF por uma curva que satura e desconta documentos longos.",
      ],
      keyIdea: "TF-IDF = Σ tf(t, d) · log(N / df(t)) sobre os termos da consulta.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "recipes", kind: "documents", label: "receitas", col: 0, row: 0 },
              { id: "queue", kind: "queue", label: "conta tf e df", col: 1, row: 0 },
              { id: "index", kind: "kv-cache", label: "índice: tf, df", col: 2, row: 0 },
              { id: "weigh", kind: "retrieval", label: "Σ tf · idf", col: 2, row: 1 },
              { id: "answer", kind: "answer", label: labels[top], col: 3, row: 1 },
            ],
            edges: [
              { from: "recipes", to: "queue" },
              { from: "queue", to: "index" },
              { from: "index", to: "weigh", label: "consulta" },
              { from: "weigh", to: "answer", label: "1º" },
            ],
            active: "weigh",
            done: ["recipes", "queue", "index"],
          },
        ],
      },
      alt: `As receitas passam pela contagem de tf e df e viram o índice; na consulta, a soma de tf vezes idf, em destaque, põe ${labels[top]} em 1º.`,
    },
  ],
  realWorldExample:
    "O TfidfVectorizer do scikit-learn é o jeito mais comum de transformar textos em vetores TF-IDF para busca, agrupamento ou classificação. Ele usa por padrão um IDF suavizado, ln((1 + N) / (1 + df)) + 1, que nunca chega a zero, por isso “de” não some e muita gente passa uma lista de stopwords.",
  code: {
    language: "python",
    source: `from sklearn.feature_extraction.text import TfidfVectorizer

receitas = ["bolo de chocolate com cobertura de chocolate", "bolo de cenoura", "mousse de chocolate", "pão de queijo"]

vectorizer = TfidfVectorizer()
X = vectorizer.fit_transform(receitas)
q = vectorizer.transform(["bolo de chocolate"])

print((X @ q.T).toarray().ravel())`,
    caption: "TF-IDF com scikit-learn: os vetores saem normalizados, então o produto com a consulta é o cosseno entre os dois. O IDF suavizado muda os números, não a ideia.",
  },
  tradeOffs: {
    pros: [
      "Simples, rápido e sem treino: só contagens do índice",
      "Descobre sozinho que palavras muito comuns não ajudam",
      "Explicável: dá para mostrar o peso de cada termo na pontuação",
    ],
    cons: [
      "TF linear: repetir a palavra compra pontos sem limite",
      "Não desconta documentos longos, que acumulam termos por acaso",
      "Continua lexical: sinônimos não pontuam",
    ],
    alternatives: ["BM25, que satura o TF e normaliza pelo tamanho", "Embeddings, para comparar significado"],
  },
  knowledgeCheck: [
    {
      id: "idf-zero",
      prompt: "Numa base de chamados, todo texto começa com “Olá, equipe de suporte”. Que peso o IDF clássico, log(N / df), dá ao termo “suporte”?",
      options: [
        "O maior peso, porque ele aparece muito",
        "Zero, porque df = N e log(1) = 0",
        "Um peso negativo",
        "Depende do tamanho de cada chamado",
      ],
      correct: 1,
      explanation: "Um termo presente em todos os documentos não separa nenhum deles. Com df = N, idf = log(N / N) = 0, e o termo não pesa na pontuação.",
      lesson: "07-04",
    },
    {
      id: "rare-term",
      prompt: "A consulta é “erro E4021 impressora”. “impressora” aparece em 3.000 dos 10.000 chamados e “e4021” em 2. Qual termo decide o ranking?",
      options: [
        "“impressora”, porque aparece em mais documentos",
        "“e4021”: idf = log10(10.000 / 2) ≈ 3,7 contra log10(10.000 / 3.000) ≈ 0,52",
        "Os dois pesam igual",
        "“erro”, porque vem primeiro",
      ],
      correct: 1,
      explanation: "O termo raro tem IDF muito maior. Os 2 chamados com “e4021” ganham uma pontuação que os comuns não alcançam só com “impressora”.",
      lesson: "07-04",
    },
  ],
  related: ["07-03", "07-05", "06-06"],
  references: [
    { title: "Introduction to Information Retrieval, cap. 6: Scoring, term weighting and the vector space model", url: "https://nlp.stanford.edu/IR-book/html/htmledition/scoring-term-weighting-and-the-vector-space-model-1.html", kind: "article" },
    { title: "scikit-learn: TfidfVectorizer", url: "https://scikit-learn.org/stable/modules/generated/sklearn.feature_extraction.text.TfidfVectorizer.html", kind: "docs" },
  ],
};

export default lesson;
