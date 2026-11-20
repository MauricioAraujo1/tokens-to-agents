import { bm25Scores, embed, rankByScore, tokenize, vectorScores } from "../../../lab/retrieval";
import { normalizeText } from "../../../lib/utils";
import type { LessonContent } from "../../../types/content";
import { bm25VsVectorContent } from "../../playgrounds/bm25-vs-vector";

// O corpus, as stopwords e os vetores de conceito são os do playground BM25 vs. vetorial do Laboratório,
// e as pontuações saem das mesmas funções de src/lab/retrieval.ts: o que a aula mostra é o que o lab calcula.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const { documents, stopwords, concepts, dims } = bm25VsVectorContent;
const stop = new Set(stopwords);
const corpus = documents.map((document) => tokenize(document, stop));
/** Rótulos curtos dos 5 documentos, na ordem do corpus do playground. */
const labels = ["pneu do carro", "manual e óleo", "bolo de cenoura", "carro elétrico", "combustível"];
/** O documento que de fato ensina a trocar o óleo: “Manual de manutenção do automóvel e troca de óleo”. */
const MANUAL = 1;

const QUERY = "Como trocar o óleo do carro?";
const queryWords = QUERY.replace("?", "").split(" ");
const kept = queryWords.map((word) => !stop.has(normalizeText(word)));
const terms = tokenize(QUERY, stop);

const counts = corpus.map((words) => terms.map((term) => words.filter((word) => word === term).length));
const matching = counts.filter((row) => row.some((count) => count > 0)).length;

const lexical = bm25Scores(corpus, terms);
const lexicalRanking = rankByScore(lexical);
const lexicalTop = lexicalRanking[0];
const manualLexicalPosition = lexicalRanking.indexOf(MANUAL) + 1;

const vector = vectorScores(
  corpus.map((words) => embed(words, concepts, dims)),
  embed(terms, concepts, dims),
);
const vectorRanking = rankByScore(vector);
const vectorTop = vectorRanking[0];

const lesson: LessonContent = {
  id: "07-01",
  subtitle: "Encontrar, numa coleção grande de documentos, os poucos que respondem a uma pergunta, e colocá-los em ordem.",
  objectives: [
    "Definir recuperação de informação e separar a necessidade de informação da consulta digitada",
    "Explicar por que um buscador devolve um ranking, e não um sim ou não",
    "Distinguir casar palavras de ser relevante",
    "Reconhecer as duas famílias de busca do módulo: lexical e semântica",
  ],
  steps: [
    {
      id: "librarian",
      shortTitle: "Bibliotecário",
      title: "Um bibliotecário para milhões de páginas",
      tag: "context",
      body: [
        "Você chega à biblioteca e diz: “quero trocar o óleo do meu carro”. O bibliotecário não lê todos os livros na sua frente. Ele consulta um índice, separa uns poucos títulos e entrega primeiro o que parece mais útil. Um buscador faz o mesmo com páginas, chamados de suporte ou trechos de documentos.",
        "[[Recuperação de informação|information-retrieval]] é a área que estuda esse problema: achar, num [[corpus|corpus]] grande e sem estrutura fixa, os documentos que atendem a uma necessidade, e ordená-los. É a base de buscadores web, da busca do e-commerce e da etapa de busca de um sistema [[RAG|rag]].",
      ],
      keyIdea: "Recuperar informação é escolher poucos documentos entre muitos e colocá-los na ordem certa.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "pessoa", col: 0, row: 0 },
              { id: "app", kind: "laptop", label: "caixa de busca", col: 1, row: 0 },
              { id: "docs", kind: "documents", label: `${documents.length} documentos`, col: 2, row: 1 },
              { id: "search", kind: "retrieval", label: "busca", col: 2, row: 0 },
              { id: "answer", kind: "answer", label: "ranking", col: 3, row: 0 },
            ],
            edges: [
              { from: "user", to: "app", label: "consulta" },
              { from: "app", to: "search" },
              { from: "docs", to: "search", label: "coleção" },
              { from: "search", to: "answer", label: "top-k" },
            ],
            active: "search",
          },
        ],
      },
      alt: "Uma pessoa digita a consulta na caixa de busca; a busca, em destaque, olha a coleção de documentos e devolve um ranking.",
    },
    {
      id: "need",
      shortTitle: "Necessidade",
      title: "A consulta é só uma pista",
      tag: "mechanism",
      body: [
        `A pessoa tem uma [[necessidade de informação|information-need]]: aprender a trocar o óleo. O que ela digita é “${QUERY}”, ${queryWords.length} palavras. Algumas carregam o assunto; outras, como “o” e “do”, aparecem em quase todo texto e não ajudam a separar um documento do outro.`,
        `Por isso o buscador primeiro limpa a consulta: tira acentos, passa para minúsculas e descarta as [[stopwords|stopword]]. Sobram ${terms.length} termos: ${terms.map((term) => `“${term}”`).join(", ")}. Tudo o que vem depois trabalha com esses termos, e não com a intenção da pessoa, que o sistema nunca vê.`,
      ],
      keyIdea: "O sistema vê a consulta, não a necessidade. Boa parte da busca é tentar adivinhar uma a partir da outra.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "query",
            piece: "token-stream",
            tokens: queryWords,
            bars: kept.map((isKept) => (isKept ? 1 : 0)),
            color: "module-07",
          },
        ],
      },
      alt: `As palavras da consulta “${QUERY}” com barras: ${terms.join(", ")} ficam com barra cheia; as stopwords ficam sem barra.`,
    },
    {
      id: "score",
      shortTitle: "Pontuar",
      title: "Pontuar cada documento, não filtrar",
      tag: "mechanism",
      body: [
        `Um banco de dados responde “sim ou não”: a linha passa no filtro ou não passa. Um buscador faz outra pergunta: “quanto este documento combina com a consulta?”. A cena conta quantas vezes cada termo aparece em cada documento. ${matching} dos ${documents.length} documentos têm pelo menos um termo.`,
        "Essa tabela é a matéria-prima de uma função de pontuação: cada documento recebe um número, e o resultado é um [[ranking|ranking]] do maior para o menor. As próximas aulas mostram como transformar contagens em pontuação de jeito justo, com TF-IDF e BM25.",
      ],
      keyIdea: "Busca devolve uma ordem. Cada documento ganha uma pontuação, e a pontuação decide quem aparece primeiro.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "counts",
            piece: "matrix",
            rows: labels,
            cols: terms,
            values: counts,
            scale: { min: 0, max: 1 },
            showValues: true,
            color: "module-07",
          },
        ],
      },
      alt: `Tabela com os ${documents.length} documentos nas linhas e os termos ${terms.join(", ")} nas colunas; cada célula conta as ocorrências do termo. ${matching} documentos têm algum termo.`,
    },
    {
      id: "ranking",
      shortTitle: "Ranking",
      title: "Casar palavras não é ser relevante",
      tag: "example",
      body: [
        `Com essas contagens, o BM25 do Laboratório põe em 1º lugar “${documents[lexicalTop]}”, com ${fixed(lexical[lexicalTop])} pontos: ele tem “trocar” e “carro” escritos igualzinho. O manual que ensina a trocar o óleo fica em ${manualLexicalPosition}º, porque escreve “troca” e “automóvel”.`,
        "Aqui está o problema central da área. [[Relevância|relevance]] é se o documento resolve a necessidade da pessoa, e isso só uma pessoa julga. A pontuação é uma aposta do sistema sobre a relevância. Toda técnica do módulo é uma aposta melhor, e a última aula mostra como medir quem aposta melhor.",
      ],
      keyIdea: "A pontuação é um palpite sobre a relevância. O 1º lugar pode ter as palavras da consulta e não responder nada.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "tops",
            piece: "metrics-panel",
            metrics: [
              { id: "top", label: "1º lugar (BM25)", value: labels[lexicalTop], color: "danger" },
              { id: "manual", label: "posição do manual", value: `${manualLexicalPosition}º` },
              { id: "score", label: "pontos do 1º", value: fixed(lexical[lexicalTop]) },
            ],
            highlight: "manual",
          },
          {
            id: "scores",
            piece: "chart",
            kind: "bar",
            series: labels.map((label, index) => ({ label, value: Number(lexical[index].toFixed(2)) })),
            highlight: MANUAL,
            color: "module-07",
          },
        ],
      },
      alt: `Barras com a pontuação BM25 de cada documento: ${labels[lexicalTop]} lidera com ${fixed(lexical[lexicalTop])}; o manual, em destaque, fica em ${manualLexicalPosition}º lugar.`,
    },
    {
      id: "families",
      shortTitle: "Duas famílias",
      title: "Palavras ou significado",
      tag: "tradeoff",
      body: [
        `Há dois jeitos grandes de apostar. A [[busca lexical|lexical-search]] compara palavras, com um índice invertido: é rápida, explicável e ótima para nomes e códigos. A [[busca semântica|semantic-search]] compara significados com [[embeddings|embedding]]: na mesma consulta, ela põe “${documents[vectorTop]}” em 1º, porque “troca” e “trocar”, “carro” e “automóvel” ficam perto no espaço de vetores.`,
        "Nenhuma das duas ganha sempre. A semântica erra em códigos de produto e termos raros; a lexical erra em sinônimos. Por isso os sistemas de produção rodam as duas e juntam os resultados, e depois deixam um modelo mais caro reordenar o topo. É o caminho que o módulo percorre.",
      ],
      keyIdea: "Lexical acha as palavras; semântica acha o assunto. Os bons sistemas usam as duas.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "app", kind: "laptop", label: "consulta", col: 0, row: 0.5 },
              { id: "lexical", kind: "kv-cache", label: "lexical (bm25)", col: 1, row: 0 },
              { id: "semantic", kind: "vector-db", label: "semântica", col: 1, row: 1 },
              { id: "search", kind: "retrieval", label: "fusão", col: 2, row: 0.5 },
              { id: "answer", kind: "answer", label: "ranking final", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "app", to: "lexical", label: "termos" },
              { from: "app", to: "semantic", label: "vetor" },
              { from: "lexical", to: "search" },
              { from: "semantic", to: "search" },
              { from: "search", to: "answer" },
            ],
            active: "search",
          },
        ],
      },
      alt: "A consulta vai para a busca lexical, com BM25, e para a busca semântica, com vetores; as duas listas chegam à fusão, em destaque, que entrega o ranking final.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Indexar antes, buscar na hora, medir sempre",
      tag: "summary",
      body: [
        "Um sistema de busca tem duas metades. Antes de qualquer pergunta, os documentos passam por uma fila de indexação e viram um índice. Na hora da pergunta, a consulta é limpa, comparada com o índice e transformada num ranking. Em volta das duas, um conjunto de avaliação diz se a mudança de ontem melhorou ou piorou o resultado.",
        "A próxima aula começa pela metade mais antiga e mais usada: a busca lexical, que casa palavras.",
      ],
      keyIdea: "Busca = índice construído antes + ranking calculado na hora + avaliação contra um gabarito.",
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
              { id: "index", kind: "kv-cache", label: "índice", col: 2, row: 0 },
              { id: "app", kind: "laptop", label: "consulta", col: 1, row: 1 },
              { id: "search", kind: "retrieval", label: "ranking", col: 2, row: 1 },
              { id: "eval", kind: "eval", label: "avaliação", col: 3, row: 1 },
            ],
            edges: [
              { from: "docs", to: "queue" },
              { from: "queue", to: "index" },
              { from: "app", to: "search" },
              { from: "index", to: "search" },
              { from: "search", to: "eval", label: "medir" },
            ],
            active: "eval",
            done: ["docs", "queue", "index", "app", "search"],
          },
        ],
      },
      alt: "Documentos passam pela fila de indexação e viram um índice; a consulta usa o índice para montar o ranking, que segue para a avaliação, em destaque.",
    },
  ],
  realWorldExample:
    "O Elasticsearch, o OpenSearch e o Apache Solr, que rodam a busca de muitos sites e lojas, são construídos sobre a mesma biblioteca, o Apache Lucene: cada documento é indexado antes, e cada consulta vira um ranking calculado na hora.",
  tradeOffs: {
    pros: [
      "Devolve uma ordem, não só um filtro: o melhor palpite aparece primeiro",
      "Funciona sobre texto sem estrutura, sem precisar de esquema de tabela",
      "Escala para coleções enormes porque o trabalho pesado vai para a indexação",
    ],
    cons: [
      "A pontuação é um palpite: casar palavras não garante relevância",
      "A consulta é curta e ambígua; o sistema nunca vê a intenção completa",
      "Saber se o ranking é bom exige julgamentos humanos e avaliação",
    ],
    alternatives: [
      "Consulta estruturada (SQL) quando os dados têm campos e a pergunta é exata",
      "Navegação por categorias quando a coleção é pequena e bem organizada",
    ],
  },
  knowledgeCheck: [
    {
      id: "rank-vs-filter",
      prompt: "Uma loja troca a busca por um `WHERE descricao LIKE '%tênis%'` no banco de dados. O que se perde?",
      options: [
        "Nada: o filtro acha os mesmos produtos na mesma ordem",
        "A ordem por relevância: o filtro diz quem casa, mas não quem casa melhor",
        "A capacidade de buscar palavras",
        "O índice do banco, que deixa de existir",
      ],
      correct: 1,
      explanation: "Um filtro é sim ou não. A busca pontua cada documento e ordena, e é a ordem que decide o que a pessoa vê primeiro.",
      lesson: "07-01",
    },
    {
      id: "relevance-judge",
      prompt: "O 1º resultado tem todas as palavras da consulta, mas não responde à pergunta. Qual conceito explica isso?",
      options: [
        "O índice está corrompido",
        "A relevância depende da necessidade da pessoa; a pontuação só aposta nela a partir das palavras",
        "A consulta tinha stopwords demais",
        "O documento é longo demais para ser lido",
      ],
      correct: 1,
      explanation: "Casar termos é a evidência que o sistema tem. Relevância é se o documento resolve a necessidade, e só um julgamento humano confirma.",
      lesson: "07-01",
    },
  ],
  related: ["07-02", "06-01", "08-01"],
  references: [
    { title: "Manning, Raghavan & Schütze: Introduction to Information Retrieval", url: "https://nlp.stanford.edu/IR-book/", kind: "article" },
    { title: "Apache Lucene", url: "https://lucene.apache.org/", kind: "docs" },
  ],
};

export default lesson;
