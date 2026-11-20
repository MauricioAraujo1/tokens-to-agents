import { bm25Scores, embed, rankByScore, tokenize, vectorScores } from "../../../lab/retrieval";
import type { LessonContent } from "../../../types/content";
import { bm25VsVectorContent } from "../../playgrounds/bm25-vs-vector";

// Busca semântica com os embeddings de brinquedo do playground BM25 vs. vetorial: cada palavra conhecida
// soma um vetor de conceito de 5 dimensões [veículo, manutenção, pneu, comida, economia]. O cosseno e o BM25
// saem das funções de src/lab/retrieval.ts, as mesmas do Laboratório.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const { documents, stopwords, concepts, dims } = bm25VsVectorContent;
const stop = new Set(stopwords);
const corpus = documents.map((document) => tokenize(document, stop));
const labels = ["pneu do carro", "manual e óleo", "bolo de cenoura", "carro elétrico", "combustível"];
const documentVectors = corpus.map((words) => embed(words, concepts, dims));
const VEHICLE = 0;
const MAINTENANCE = 1;
const BOLO = 2;

const search = (query: string) => {
  const terms = tokenize(query, stop);
  const lexical = bm25Scores(corpus, terms);
  const semantic = vectorScores(documentVectors, embed(terms, concepts, dims));
  return { terms, lexical, semantic, lexicalHits: rankByScore(lexical), semanticHits: rankByScore(semantic) };
};

const QUERY = "automóvel";
const result = search(QUERY);
const lexicalOnly = result.lexicalHits[0];
const semanticTop = result.semanticHits[0];
const queryVector = embed(result.terms, concepts, dims);

const plotted = documents.map((_, index) => index).filter((index) => index !== BOLO);
const plane = (vector: number[]): [number, number] => [vector[VEHICLE], vector[MAINTENANCE]];

const comparisonQueries = ["automóvel", "trocar óleo do carro", "elétrico"];
const comparison = comparisonQueries.map((query) => search(query).semantic);
const ELECTRIC_QUERY = comparisonQueries.length - 1;
const ELECTRIC_CAR = 3;
const FUEL = 4;
const electric = comparison[ELECTRIC_QUERY];

const lesson: LessonContent = {
  id: "07-06",
  subtitle: "Buscar pelo significado: consulta e documentos viram vetores, e o mais perto da consulta aparece primeiro, mesmo sem palavras em comum.",
  objectives: [
    "Explicar como a busca semântica resolve o descasamento de vocabulário",
    "Descrever o bi-encoder: documentos codificados antes, consulta codificada na hora",
    "Ranquear documentos pelo cosseno entre o vetor da consulta e os vetores dos documentos",
    "Reconhecer onde a busca semântica erra: parecido não é o mesmo que relevante",
  ],
  steps: [
    {
      id: "synonyms",
      shortTitle: "Sinônimos",
      title: "Quem pergunta “automóvel” também quer “carro”",
      tag: "context",
      body: [
        `Um amigo pergunta onde tem “conserto de automóvel”, e você indica a oficina que tem “carro” na placa. Você entendeu o assunto, não as letras. A busca lexical não faz isso: para a consulta “${QUERY}”, o BM25 do Laboratório acha ${result.lexicalHits.length} documento, “${documents[lexicalOnly]}”, e ignora os que falam de carro e de veículo.`,
        "É o [[descasamento de vocabulário|vocabulary-mismatch]] da aula de busca lexical. A [[busca semântica|semantic-search]] troca a pergunta “tem a mesma palavra?” por “fala da mesma coisa?”. Para isso, o texto vira um [[embedding|embedding]], e a comparação passa a ser entre vetores.",
      ],
      keyIdea: "A busca lexical compara letras; a semântica compara assuntos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: QUERY, col: 0, row: 0.5 },
              { id: "lexical", kind: "kv-cache", label: "índice lexical", col: 1, row: 0.5 },
              { id: "found", kind: "answer", label: labels[lexicalOnly], col: 2, row: 0 },
              { id: "missed", kind: "no-result", label: "carro, veículo", col: 2, row: 1 },
            ],
            edges: [
              { from: "user", to: "lexical", label: "termo exato" },
              { from: "lexical", to: "found", label: "1 doc" },
              { from: "lexical", to: "missed", label: "ficam de fora", variant: "alternative" },
            ],
            active: "missed",
          },
        ],
      },
      alt: `A consulta ${QUERY} vai ao índice lexical, que acha só ${labels[lexicalOnly]}; os documentos que dizem carro e veículo ficam de fora, em destaque.`,
    },
    {
      id: "meaning",
      shortTitle: "Significado",
      title: "Sentidos parecidos apontam para o mesmo lado",
      tag: "mechanism",
      body: [
        `Um [[modelo de embedding|embedding-model]] transforma um texto num vetor, de modo que textos de assunto parecido fiquem com vetores parecidos. No brinquedo do Laboratório, há ${dims} dimensões, e “carro”, “automóvel” e “veículo” recebem o mesmo vetor de conceito. A cena mostra 2 delas: veículo na horizontal e manutenção na vertical.`,
        `A consulta “${QUERY}” aponta reto para veículo. Documentos de carro apontam para perto, porque somam o mesmo conceito; o bolo nem aparece, porque não tem nada de veículo nem de manutenção. A medida de proximidade é a [[similaridade de cosseno|cosine-similarity]]: o cosseno do ângulo entre os vetores, de 0 a 1 aqui, sem olhar o tamanho deles.`,
      ],
      keyIdea: "No espaço de embeddings, “parecido” vira “perto”: o ângulo entre os vetores mede o assunto em comum.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "space",
            piece: "vector-space",
            points: [
              { id: "query", label: QUERY, coords: plane(queryVector), color: "module-07" },
              ...plotted.map((index) => ({ id: `d${index}`, label: labels[index], coords: plane(documentVectors[index]) })),
            ],
            vectors: [{ to: "query" }, ...plotted.map((index) => ({ to: `d${index}` }))],
            query: "query",
          },
        ],
      },
      alt: `Plano com o eixo veículo na horizontal e manutenção na vertical: a consulta ${QUERY} aponta para veículo, e os vetores de ${plotted.map((index) => labels[index]).join(", ")} saem da origem em ângulos diferentes. O bolo não aparece porque fica na origem.`,
    },
    {
      id: "bi-encoder",
      shortTitle: "Bi-encoder",
      title: "Codificar os documentos antes, a consulta na hora",
      tag: "mechanism",
      body: [
        "Uma biblioteca que fotografa a capa de cada livro no dia em que ele chega, e não no dia em que alguém pergunta. A busca semântica funciona assim: os documentos passam pelo modelo uma vez, numa fila de indexação, e os vetores vão para um [[banco vetorial|vector-database]]. Na hora da busca, só a consulta passa pelo modelo.",
        "Esse arranjo é o [[bi-encoder|bi-encoder]]: consulta e documento são codificados separados, cada um no seu vetor, e só se encontram no cosseno. É o que torna a [[recuperação densa|dense-retrieval]] rápida: uma passada do modelo por consulta, e uma busca de vizinhos, aproximada com [[ANN|ann]] quando a coleção tem milhões de vetores.",
      ],
      keyIdea: "Bi-encoder: o custo pesado (codificar documentos) acontece antes; na consulta, uma passada e uma busca de vizinhos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "docs", kind: "documents", label: "documentos", col: 0, row: 0 },
              { id: "queue", kind: "queue", label: "lote", col: 1, row: 0 },
              { id: "query", kind: "laptop", label: "consulta", col: 1, row: 1 },
              { id: "model", kind: "embedding", label: "modelo de embedding", col: 2, row: 0.5 },
              { id: "vdb", kind: "vector-db", label: "banco vetorial", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "docs", to: "queue" },
              { from: "queue", to: "model", label: "antes" },
              { from: "query", to: "model", label: "na hora" },
              { from: "model", to: "vdb", label: "vetores" },
            ],
            active: "model",
          },
        ],
      },
      alt: "Documentos passam por uma fila em lote até o modelo de embedding, em destaque, antes de qualquer busca; a consulta passa pelo mesmo modelo na hora; os vetores vão para o banco vetorial.",
    },
    {
      id: "cosine",
      shortTitle: "Cosseno",
      title: "O ranking pelo cosseno",
      tag: "example",
      body: [
        `Com as ${dims} dimensões completas, o cosseno entre “${QUERY}” e cada documento põe “${documents[semanticTop]}” em 1º, com ${fixed(result.semantic[semanticTop])}. A busca semântica devolve ${result.semanticHits.length} documentos com similaridade acima de zero, contra ${result.lexicalHits.length} da lexical: carro e veículo agora contam.`,
        `Repare no manual, o único com a palavra exata: no cosseno ele cai para ${fixed(result.semantic[lexicalOnly])}, porque o vetor dele é dominado por manutenção e óleo. A busca semântica mede o assunto do documento inteiro, não a presença de um termo, e isso tem consequências que o próximo passo mostra.`,
      ],
      keyIdea: "A busca semântica acha os sinônimos, mas ordena pelo assunto geral do documento.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "found",
            piece: "metrics-panel",
            metrics: [
              { id: "lexical", label: "achados pelo BM25", value: String(result.lexicalHits.length), color: "danger" },
              { id: "semantic", label: "achados pelo cosseno", value: String(result.semanticHits.length), color: "success" },
              { id: "top", label: "1º semântico", value: labels[semanticTop] },
            ],
            highlight: "semantic",
          },
          {
            id: "scores",
            piece: "chart",
            kind: "bar",
            series: labels.map((label, index) => ({ label, value: Number(result.semantic[index].toFixed(3)) })),
            max: 1,
            highlight: semanticTop,
            color: "module-07",
          },
        ],
      },
      alt: `Cosseno entre ${QUERY} e cada documento: ${labels.map((label, index) => `${label} ${fixed(result.semantic[index])}`).join(", ")}. A busca semântica acha ${result.semanticHits.length} documentos; a lexical, ${result.lexicalHits.length}.`,
    },
    {
      id: "close-not-same",
      shortTitle: "Perto ≠ certo",
      title: "Parecido não é o mesmo que relevante",
      tag: "tradeoff",
      body: [
        `A tabela mostra o cosseno de três consultas com cada documento. Na consulta “elétrico”, o documento “${documents[FUEL]}” marca ${fixed(electric[FUEL])}, acima de “${documents[ELECTRIC_CAR]}”, com ${fixed(electric[ELECTRIC_CAR])}: os dois falam de veículo e de economia, e o vetor não sabe que só um deles responde. A busca lexical teria achado o carro elétrico na hora.`,
        "A busca semântica também nunca devolve “nada encontrado”: o top-k sempre tem k itens, mesmo quando nenhum é bom. E ela é fraca em códigos, siglas, nomes próprios e termos que o modelo viu pouco no treino. Por isso ela raramente trabalha sozinha: as próximas aulas comparam as duas buscas e mostram como juntá-las.",
      ],
      keyIdea: "Vetores trazem o assunto, não a precisão: falham em termos exatos e sempre devolvem alguma coisa.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "cosines",
            piece: "matrix",
            rows: comparisonQueries,
            cols: labels,
            values: comparison,
            scale: { min: 0, max: 1 },
            showValues: true,
            highlight: { row: ELECTRIC_QUERY, col: FUEL },
            color: "module-07",
          },
        ],
      },
      alt: `Cosseno de ${comparisonQueries.join(", ")} com cada documento. Em destaque, elétrico com combustível, ${fixed(electric[FUEL])}, acima de carro elétrico, ${fixed(electric[ELECTRIC_CAR])}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Da consulta ao top-k por significado",
      tag: "summary",
      body: [
        "A consulta passa pelo mesmo modelo de embedding que codificou os documentos. O vetor dela vai ao banco vetorial, que devolve os vizinhos mais próximos pelo cosseno, e esse é o top-k da busca semântica. Os documentos já estavam codificados: o custo da consulta é uma passada do modelo e uma busca de vizinhos.",
        "Embeddings, espaço vetorial e indexação de vetores são o assunto do módulo 06. A próxima aula põe a busca por palavras e a busca por vetores lado a lado, consulta por consulta.",
      ],
      keyIdea: "Busca semântica = mesmo modelo nos dois lados + vizinhos mais próximos pelo cosseno.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "query", kind: "laptop", label: QUERY, col: 0, row: 0 },
              { id: "model", kind: "embedding", label: "embedding", col: 1, row: 0 },
              { id: "vdb", kind: "vector-db", label: "banco vetorial", col: 2, row: 0 },
              { id: "topk", kind: "retrieval", label: "top-k por cosseno", col: 2, row: 1 },
              { id: "answer", kind: "answer", label: labels[semanticTop], col: 3, row: 1 },
            ],
            edges: [
              { from: "query", to: "model" },
              { from: "model", to: "vdb", label: "vetor" },
              { from: "vdb", to: "topk", label: "vizinhos" },
              { from: "topk", to: "answer", label: "1º" },
            ],
            active: "topk",
            done: ["query", "model", "vdb"],
          },
        ],
      },
      alt: `A consulta ${QUERY} vira um vetor no modelo de embedding, o banco vetorial devolve os vizinhos, e o top-k por cosseno, em destaque, põe ${labels[semanticTop]} em 1º.`,
    },
  ],
  realWorldExample:
    "O Dense Passage Retrieval (DPR), de 2020, treinou dois encoders BERT, um para perguntas e outro para passagens da Wikipédia, e superou o BM25 na recuperação de passagens em vários conjuntos de perguntas abertas. É o desenho de bi-encoder que a maioria dos sistemas de busca semântica segue.",
  code: {
    language: "python",
    source: `from sentence_transformers import SentenceTransformer, util

model = SentenceTransformer("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")

docs = ["Como trocar o pneu do carro", "Manual de manutenção do automóvel e troca de óleo", "Receita de bolo de cenoura"]
doc_vectors = model.encode(docs)

query_vector = model.encode("automóvel")
print(util.cos_sim(query_vector, doc_vectors))`,
    caption: "Busca semântica com sentence-transformers: os documentos são codificados uma vez, a consulta na hora, e o cosseno ordena.",
  },
  tradeOffs: {
    pros: [
      "Acha sinônimos e paráfrases sem lista mantida à mão",
      "Funciona com perguntas em linguagem natural e, com modelos multilíngues, entre idiomas",
      "Documentos codificados uma vez: a consulta custa uma passada do modelo",
    ],
    cons: [
      "Fraca em códigos, siglas, nomes e termos raros",
      "Sempre devolve k resultados, mesmo quando nenhum é bom",
      "Trocar o modelo de embedding obriga a recodificar a coleção inteira",
    ],
    alternatives: ["BM25, para termos exatos", "Busca híbrida, que roda as duas e funde os rankings"],
  },
  knowledgeCheck: [
    {
      id: "model-change",
      prompt: "A equipe troca o modelo de embedding das consultas por um mais novo, mas mantém os vetores antigos dos documentos. O que acontece?",
      options: [
        "A busca melhora, porque o modelo novo é melhor",
        "A busca quebra: vetores de modelos diferentes vivem em espaços diferentes, e o cosseno entre eles não significa nada",
        "Nada muda, porque o cosseno ignora o tamanho dos vetores",
        "Só as consultas longas são afetadas",
      ],
      correct: 1,
      explanation: "No bi-encoder, consulta e documento precisam passar pelo mesmo modelo. Trocar o modelo exige recodificar toda a coleção.",
      lesson: "07-06",
    },
    {
      id: "sku",
      prompt: "Um cliente busca o código de peça “KX-4471” e a busca semântica devolve peças parecidas, mas não a certa. Por quê?",
      options: [
        "O banco vetorial está cheio",
        "Códigos não têm significado que o modelo aprendeu; o vetor deles é pouco distintivo, e o casamento exato do BM25 resolveria",
        "O cosseno não funciona com números",
        "Faltou aumentar o k",
      ],
      correct: 1,
      explanation: "Embeddings capturam assunto. Para identificadores, o que importa são as letras exatas, e é aí que a busca lexical ganha.",
      lesson: "07-06",
    },
  ],
  related: ["07-05", "07-07", "06-08"],
  references: [
    { title: "Karpukhin et al. (2020), Dense Passage Retrieval for Open-Domain Question Answering", url: "https://arxiv.org/abs/2004.04906", kind: "paper" },
    { title: "Reimers & Gurevych (2019), Sentence-BERT", url: "https://arxiv.org/abs/1908.10084", kind: "paper" },
    { title: "Sentence Transformers: documentação", url: "https://www.sbert.net/", kind: "docs" },
  ],
};

export default lesson;
