import { bm25Scores, embed, rankByScore, tokenize, vectorScores } from "../../../lab/retrieval";
import type { LessonContent } from "../../../types/content";
import { bm25VsVectorContent } from "../../playgrounds/bm25-vs-vector";

// Busca por palavras e busca por vetores lado a lado, consulta por consulta, com o corpus e as funções do
// playground BM25 vs. vetorial. Para cada consulta há um documento certo, escolhido pela intenção dela; a
// pontuação de cada método é 1 / posição desse documento no ranking (0 quando ele não aparece).

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const thousands = (value: number) => value.toLocaleString("pt-BR");

const { documents, stopwords, concepts, dims } = bm25VsVectorContent;
const stop = new Set(stopwords);
const corpus = documents.map((document) => tokenize(document, stop));
const labels = ["pneu do carro", "manual e óleo", "bolo de cenoura", "carro elétrico", "combustível"];
const documentVectors = corpus.map((words) => embed(words, concepts, dims));
const vocabulary = [...new Set(corpus.flat())];
const conceptNames = ["veículo", "manutenção", "pneu", "comida", "economia"];

const cases = [
  { query: "trocar óleo do carro", target: 1 },
  { query: "elétrico", target: 3 },
  { query: "pneu", target: 0 },
  { query: "economizar combustível", target: 4 },
];
const runs = cases.map(({ query, target }) => {
  const terms = tokenize(query, stop);
  const lexical = bm25Scores(corpus, terms);
  const semantic = vectorScores(documentVectors, embed(terms, concepts, dims));
  const reciprocal = (scores: number[]) => {
    const position = rankByScore(scores).indexOf(target) + 1;
    return position === 0 ? 0 : 1 / position;
  };
  return { query, target, terms, lexical, semantic, lexicalRR: reciprocal(lexical), semanticRR: reciprocal(semantic) };
});
const [oil, electric] = runs;
const lexicalWins = runs.filter((run) => run.lexicalRR > run.semanticRR).map((run) => run.query);
const semanticWins = runs.filter((run) => run.semanticRR > run.lexicalRR).map((run) => run.query);
const ties = runs.filter((run) => run.semanticRR === run.lexicalRR).map((run) => run.query);
const position = (rr: number) => (rr === 0 ? "fora" : `${Math.round(1 / rr)}º`);
const quoted = (queries: string[]) => queries.map((query) => `“${query}”`).join(" e ");

const oilQueryVector = embed(oil.terms, concepts, dims);
const sparseNonZero = new Set(oil.terms.filter((term) => vocabulary.includes(term))).size;
const denseNonZero = oilQueryVector.filter((value) => value !== 0).length;
const maxLexical = Math.max(...runs.flatMap((run) => run.lexical));

const PRODUCTION_DOCS = 1_000_000;
const PRODUCTION_DIMS = 384;
const FLOAT32_BYTES = 4;
const productionGigabytes = (PRODUCTION_DOCS * PRODUCTION_DIMS * FLOAT32_BYTES) / 1e9;

const lesson: LessonContent = {
  id: "07-07",
  subtitle: "Busca por palavras e busca por vetores lado a lado: como cada uma representa o texto, onde cada uma acerta e quanto cada uma custa.",
  objectives: [
    "Comparar a representação esparsa do BM25 com a representação densa dos embeddings",
    "Prever, para uma consulta, se a busca lexical ou a vetorial tende a acertar",
    "Explicar por que as pontuações das duas não podem ser comparadas diretamente",
    "Estimar o custo de memória de um índice vetorial",
  ],
  steps: [
    {
      id: "two-experts",
      shortTitle: "Dois peritos",
      title: "Um revisor e um bibliotecário",
      tag: "context",
      body: [
        "Peça a um revisor de texto que ache “carro elétrico” num arquivo: ele marca cada ocorrência exata e não erra uma. Peça a um bibliotecário: ele traz também o livro sobre veículos econômicos, porque o assunto é parecido. O revisor é a busca por palavras; o bibliotecário, a busca por vetores.",
        "As duas recebem a mesma consulta e devolvem um ranking, mas por caminhos diferentes. Uma é [[recuperação esparsa|sparse-retrieval]]: BM25 sobre um índice invertido. A outra é [[recuperação densa|dense-retrieval]]: cosseno entre embeddings num banco vetorial. Esta aula põe as duas para responder as mesmas perguntas.",
      ],
      keyIdea: "Palavras e vetores são dois peritos diferentes: um exato, outro temático.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "query", kind: "laptop", label: "consulta", col: 0, row: 0.5 },
              { id: "lexical", kind: "kv-cache", label: "bm25", col: 1, row: 0 },
              { id: "semantic", kind: "vector-db", label: "vetorial", col: 1, row: 1 },
              { id: "lexical-out", kind: "answer", label: "ranking lexical", col: 2, row: 0 },
              { id: "semantic-out", kind: "answer", label: "ranking vetorial", col: 2, row: 1 },
            ],
            edges: [
              { from: "query", to: "lexical", label: "termos" },
              { from: "query", to: "semantic", label: "vetor" },
              { from: "lexical", to: "lexical-out" },
              { from: "semantic", to: "semantic-out" },
            ],
            active: "query",
          },
        ],
      },
      alt: "A consulta, em destaque, vai em paralelo para o BM25, que devolve um ranking lexical, e para a busca vetorial, que devolve um ranking vetorial.",
    },
    {
      id: "sparse-dense",
      shortTitle: "Esparso × denso",
      title: "Um vetor do tamanho do vocabulário, ou um vetor curto e cheio",
      tag: "mechanism",
      body: [
        `Para o BM25, a consulta “${oil.query}” é um vetor com uma posição por termo do vocabulário: ${vocabulary.length} posições no corpus do Laboratório, e só ${sparseNonZero} diferentes de zero. Em produção, o vocabulário tem centenas de milhares de termos e o vetor continua quase todo zero. Cada posição é uma palavra que dá para ler.`,
        `Para a busca vetorial, a mesma consulta é um vetor curto e cheio: aqui, ${dims} números (${conceptNames.join(", ")}), ${denseNonZero} deles diferentes de zero. Num modelo real, como o all-MiniLM-L6-v2, são ${PRODUCTION_DIMS} números, todos preenchidos, e nenhum tem nome: o sentido está espalhado entre eles.`,
      ],
      keyIdea: "Esparso: uma dimensão por palavra, quase tudo zero. Denso: poucas dimensões, todas usadas, sem nome.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "sizes",
            piece: "metrics-panel",
            metrics: [
              { id: "sparse", label: "esparso: posições", value: `${vocabulary.length} (${sparseNonZero} ≠ 0)` },
              { id: "dense", label: "denso: posições", value: `${dims} (${denseNonZero} ≠ 0)`, color: "module-07" },
              { id: "real", label: "modelo real", value: `${PRODUCTION_DIMS} dimensões` },
            ],
            highlight: "dense",
          },
          {
            id: "dense-vector",
            piece: "chart",
            kind: "bar",
            series: conceptNames.map((label, index) => ({ label, value: oilQueryVector[index] })),
            color: "module-07",
          },
        ],
      },
      alt: `Painel comparando o vetor esparso, com ${vocabulary.length} posições e ${sparseNonZero} preenchidas, e o vetor denso, com ${dims}; as barras mostram o vetor denso da consulta ${oil.query}: ${conceptNames.map((label, index) => `${label} ${oilQueryVector[index]}`).join(", ")}.`,
    },
    {
      id: "side-by-side",
      shortTitle: "Lado a lado",
      title: "As mesmas consultas, duas tabelas",
      tag: "mechanism",
      body: [
        `À esquerda, o BM25 de ${runs.length} consultas contra os ${documents.length} documentos; à direita, o cosseno. O BM25 deixa muita célula em zero: sem termo em comum, não há pontuação. O cosseno quase não deixa: todo documento de carro fica um pouco parecido com toda consulta de carro.`,
        `Repare nas escalas. O BM25 não tem teto, e aqui chega a ${fixed(maxLexical)}; o cosseno fica entre 0 e 1. Um 0,9 de cosseno e um 0,9 de BM25 não significam a mesma coisa, e somar os dois direto deixaria o BM25 mandar sozinho. Esse é o problema que a busca híbrida precisa resolver.`,
      ],
      keyIdea: "As duas buscas pontuam em escalas diferentes: comparar os números direto não faz sentido.",
      scene: {
        kind: "pieces",
        layout: "row",
        pieces: [
          {
            id: "lexical-table",
            piece: "matrix",
            rows: runs.map((run) => run.query),
            cols: labels,
            values: runs.map((run) => run.lexical),
            showValues: true,
            color: "info",
          },
          {
            id: "semantic-table",
            piece: "matrix",
            rows: runs.map((run) => run.query),
            cols: labels,
            values: runs.map((run) => run.semantic),
            scale: { min: 0, max: 1 },
            showValues: true,
            color: "module-07",
          },
        ],
      },
      alt: `Duas tabelas com as consultas ${runs.map((run) => run.query).join(", ")} nas linhas e os documentos nas colunas: à esquerda o BM25, com muitos zeros e valor máximo ${fixed(maxLexical)}; à direita o cosseno, entre 0 e 1, com poucos zeros.`,
    },
    {
      id: "who-wins",
      shortTitle: "Quem acerta",
      title: "Cada busca ganha numa consulta diferente",
      tag: "example",
      body: [
        `Para cada consulta há um documento certo. A tabela mostra 1 / posição dele em cada ranking: 1 é 1º lugar, 0,5 é 2º. Em “${oil.query}”, o manual fica em ${position(oil.lexicalRR)} no BM25 e em ${position(oil.semanticRR)} no vetorial: o vetor entende que “troca” e “trocar” são a mesma ação. Em “${electric.query}”, o carro elétrico fica em ${position(electric.lexicalRR)} no BM25 e em ${position(electric.semanticRR)} no vetorial, atrás do texto sobre combustível.`,
        `Resumindo: o vetorial ganha em ${quoted(semanticWins)}, o BM25 ganha em ${quoted(lexicalWins)}, e os dois empatam em ${quoted(ties)}. Na prática a regra é parecida: termos exatos e raros favorecem o BM25; perguntas em linguagem natural, com outras palavras, favorecem os vetores.`,
      ],
      keyIdea: "Consulta com termo exato: BM25. Consulta com outras palavras: vetores. Ninguém ganha sempre.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "wins",
            piece: "matrix",
            rows: runs.map((run) => run.query),
            cols: ["BM25", "vetorial"],
            values: runs.map((run) => [run.lexicalRR, run.semanticRR]),
            scale: { min: 0, max: 1 },
            showValues: true,
            highlight: { row: runs.indexOf(electric), col: 0 },
            color: "module-07",
          },
        ],
      },
      alt: `Tabela de 1 dividido pela posição do documento certo: ${runs.map((run) => `${run.query}, BM25 ${fixed(run.lexicalRR)} e vetorial ${fixed(run.semanticRR)}`).join("; ")}.`,
    },
    {
      id: "cost",
      shortTitle: "Custo",
      title: "O preço de cada uma",
      tag: "tradeoff",
      body: [
        `O índice invertido guarda inteiros comprimidos e não precisa de modelo na consulta. O índice vetorial guarda, por documento, um vetor de floats: com ${thousands(PRODUCTION_DOCS)} documentos e ${PRODUCTION_DIMS} dimensões em float32, são ${thousands(PRODUCTION_DOCS)} × ${PRODUCTION_DIMS} × ${FLOAT32_BYTES} bytes ≈ ${fixed(productionGigabytes, 1)} GB, antes do índice ANN, e de preferência em memória.`,
        "Na consulta, a busca vetorial ainda paga uma passada do modelo de embedding. Na indexação, cada documento novo também passa pelo modelo, e trocar de modelo significa recodificar tudo. Em troca, ela entende paráfrases que nenhuma lista de sinônimos cobriria. O custo é real, e por isso medir o ganho importa.",
      ],
      keyIdea: "Vetores custam memória, um modelo na consulta e recodificação a cada troca de modelo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "costs",
            piece: "metrics-panel",
            metrics: [
              { id: "docs", label: "documentos", value: thousands(PRODUCTION_DOCS) },
              { id: "dims", label: "dimensões", value: String(PRODUCTION_DIMS) },
              { id: "memory", label: "vetores em float32", value: `≈ ${fixed(productionGigabytes, 1)} GB`, color: "danger" },
              { id: "model", label: "modelo por consulta", value: "1 passada" },
            ],
            highlight: "memory",
          },
        ],
      },
      alt: `Painel: ${thousands(PRODUCTION_DOCS)} documentos com ${PRODUCTION_DIMS} dimensões em float32 ocupam cerca de ${fixed(productionGigabytes, 1)} GB, e cada consulta pede uma passada do modelo.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Por que não as duas?",
      tag: "summary",
      body: [
        "BM25: exato, barato, explicável, cego para sinônimos. Vetores: temáticos, tolerantes a paráfrase, fracos em termos exatos, mais caros. Os erros de um ficam justamente onde o outro acerta, e isso é a melhor notícia possível: dá para combinar.",
        "A próxima aula roda as duas buscas para a mesma consulta e junta os dois rankings num só. O primeiro obstáculo já apareceu aqui: as pontuações estão em escalas diferentes.",
      ],
      keyIdea: "Erros que não se sobrepõem pedem combinação: é a ideia da busca híbrida.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "query", kind: "laptop", label: "consulta", col: 0, row: 0.5 },
              { id: "lexical", kind: "kv-cache", label: "bm25", col: 1, row: 0 },
              { id: "semantic", kind: "vector-db", label: "vetorial", col: 1, row: 1 },
              { id: "fusion", kind: "retrieval", label: "juntar", col: 2, row: 0.5 },
              { id: "answer", kind: "answer", label: "um ranking", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "query", to: "lexical" },
              { from: "query", to: "semantic" },
              { from: "lexical", to: "fusion", label: "escala livre" },
              { from: "semantic", to: "fusion", label: "0 a 1" },
              { from: "fusion", to: "answer" },
            ],
            active: "fusion",
            done: ["query", "lexical", "semantic"],
          },
        ],
      },
      alt: "A consulta vai ao BM25, com pontuação de escala livre, e à busca vetorial, com pontuação de 0 a 1; as duas chegam à etapa de juntar, em destaque, que entrega um só ranking.",
    },
  ],
  realWorldExample:
    "O benchmark BEIR reúne 18 conjuntos de busca de domínios diferentes, de artigos biomédicos a perguntas de fórum, justamente para testar métodos fora do domínio de treino. O resultado do artigo original é o desta aula em escala: nenhum método venceu em todos, e o BM25 se mostrou uma linha de base robusta.",
  code: {
    language: "python",
    source: `from rank_bm25 import BM25Okapi
from sentence_transformers import SentenceTransformer, util

docs = ["como trocar o pneu do carro", "manual de manutenção do automóvel e troca de óleo"]
query = "trocar óleo do carro"

bm25 = BM25Okapi([doc.split() for doc in docs])
print(bm25.get_scores(query.split()))

model = SentenceTransformer("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
print(util.cos_sim(model.encode(query), model.encode(docs)))`,
    caption: "As duas buscas na mesma consulta: o BM25 devolve pontuações sem teto; o cosseno, valores entre −1 e 1. Os rankings podem discordar.",
  },
  tradeOffs: {
    pros: [
      "BM25: termos exatos, sem modelo, índice pequeno e explicável",
      "Vetores: sinônimos, paráfrases e perguntas em linguagem natural",
      "Os erros de um caem onde o outro acerta, o que favorece combinar",
    ],
    cons: [
      "BM25: cego para sinônimos e para o sentido da frase",
      "Vetores: memória, modelo na consulta e recodificação a cada troca de modelo",
      "Pontuações em escalas diferentes não podem ser somadas direto",
    ],
    alternatives: ["Busca híbrida com fusão de rankings", "Modelos esparsos aprendidos, que expandem a consulta com termos relacionados"],
  },
  knowledgeCheck: [
    {
      id: "route-query",
      prompt: "Qual consulta tende a funcionar melhor na busca lexical do que na vetorial?",
      options: [
        "“como faço para meu notebook parar de esquentar”",
        "“erro ORA-01017”",
        "“dicas para dormir melhor”",
        "“filmes parecidos com Interestelar”",
      ],
      correct: 1,
      explanation: "Um código de erro é um termo exato e raro: o BM25 acha os documentos que o contêm. Embeddings capturam assunto e tendem a trazer erros parecidos, não o mesmo.",
      lesson: "07-07",
    },
    {
      id: "memory",
      prompt: "Um índice tem 10 milhões de documentos com embeddings de 768 dimensões em float32. Quanto ocupam só os vetores?",
      options: ["Cerca de 3 MB", "Cerca de 30,7 GB", "Cerca de 307 GB", "Cerca de 7,7 GB"],
      correct: 1,
      explanation: "10.000.000 × 768 × 4 bytes = 30.720.000.000 bytes ≈ 30,7 GB, sem contar o índice ANN. É por isso que quantização de vetores é comum.",
      lesson: "07-07",
    },
  ],
  related: ["07-06", "07-08", "06-08"],
  references: [
    { title: "Thakur et al. (2021), BEIR: A Heterogeneous Benchmark for Zero-shot Evaluation of Information Retrieval Models", url: "https://arxiv.org/abs/2104.08663", kind: "paper" },
    { title: "Introduction to Information Retrieval, 11.4.3: Okapi BM25", url: "https://nlp.stanford.edu/IR-book/html/htmledition/okapi-bm25-a-non-binary-model-1.html", kind: "article" },
    { title: "Sentence Transformers: documentação", url: "https://www.sbert.net/", kind: "docs" },
  ],
};

export default lesson;
