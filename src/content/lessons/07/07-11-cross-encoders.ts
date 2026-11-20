import { cosineSimilarity } from "../../../lab/embeddings";
import { tokenize } from "../../../lab/retrieval";
import { normalizeText } from "../../../lib/utils";
import type { LessonContent } from "../../../types/content";
import { bm25VsVectorContent } from "../../playgrounds/bm25-vs-vector";

// Bi-encoder e cross-encoder em escala de brinquedo, com os vetores de palavra do reranker da aula 07.10
// (4 traços: troca, óleo, pneu, veículo). O bi-encoder tira a média dos vetores de cada texto, separado, e
// compara pelo cosseno. O cross-encoder de brinquedo compara cada palavra da consulta com cada palavra do
// documento, no par, e desconta a negação; os arcos da cena ilustram essas interações, não pesos treinados.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const { documents, stopwords, initial } = bm25VsVectorContent;
const stop = new Set(stopwords);
const traits = ["troca", "óleo", "pneu", "veículo"];
const wordVectors: Record<string, number[]> = {
  trocar: [1, 0, 0, 0],
  troca: [1, 0, 0, 0],
  oleo: [0, 1, 0, 0],
  pneu: [0, 0, 1, 0],
  carro: [0, 0, 0, 1],
  automovel: [0, 0, 0, 1],
  veiculo: [0, 0, 0, 1],
  manutencao: [0.6, 0.6, 0, 0],
  eletrico: [0, 0, 0, 0.6],
  combustivel: [0, 0.3, 0, 0.4],
};
const NEGATION = "nao";
const NEGATION_FACTOR = 0.4;
const MANUAL = 1;
const ELECTRIC_CAR = 3;

const QUERY = initial.query;
const queryTerms = tokenize(QUERY, stop);
const similarity = (a: string, b: string) =>
  wordVectors[a] && wordVectors[b] ? cosineSimilarity(wordVectors[a], wordVectors[b]) : 0;

/** Bi-encoder de brinquedo: média dos vetores das palavras conhecidas, cada texto sozinho. */
const encode = (words: string[]) => {
  const known = words.filter((word) => wordVectors[word]);
  return traits.map((_, trait) => known.reduce((sum, word) => sum + wordVectors[word][trait], 0) / Math.max(1, known.length));
};
const biScore = (document: number) => cosineSimilarity(encode(queryTerms), encode(tokenize(documents[document])));

/** Cross-encoder de brinquedo: cada termo da consulta contra cada palavra do documento, no par, e negação desconta. */
const crossScore = (document: number) => {
  const words = tokenize(documents[document]);
  const coverage =
    queryTerms.reduce((sum, term) => sum + Math.max(0, ...words.map((word) => similarity(term, word))), 0) / queryTerms.length;
  return words.includes(NEGATION) ? coverage * NEGATION_FACTOR : coverage;
};

const queryVector = encode(queryTerms);
const manualVector = encode(tokenize(documents[MANUAL]));
const electricVector = encode(tokenize(documents[ELECTRIC_CAR]));
const biManual = biScore(MANUAL);
const biElectric = biScore(ELECTRIC_CAR);
const crossManual = crossScore(MANUAL);
const crossElectric = crossScore(ELECTRIC_CAR);

const SEPARATOR = "[SEP]";
const queryWords = QUERY.split(" ").filter((word) => !stop.has(normalizeText(word)));
const documentWords = documents[ELECTRIC_CAR].split(" ").filter((word) => normalizeText(word) === NEGATION || !stop.has(normalizeText(word)));
const pairTokens = [...queryWords, SEPARATOR, ...documentWords];
const offset = queryWords.length + 1;
const negationAt = offset + documentWords.findIndex((word) => normalizeText(word) === NEGATION);
const pairArcs = [
  ...queryWords.flatMap((queryWord, from) =>
    documentWords.flatMap((documentWord, index) => {
      const weight = similarity(normalizeText(queryWord), normalizeText(documentWord));
      return weight > 0 ? [{ from, to: offset + index, weight }] : [];
    }),
  ),
  ...documentWords.flatMap((documentWord, index) =>
    offset + index > negationAt && wordVectors[normalizeText(documentWord)]
      ? [{ from: negationAt, to: offset + index, weight: 1, label: "nega" }]
      : [],
  ),
];

const CANDIDATES = [10, 100, 1000];

const lesson: LessonContent = {
  id: "07-11",
  subtitle: "O modelo que lê a consulta e o documento na mesma entrada: mais preciso que comparar dois vetores, e caro demais para a coleção inteira.",
  objectives: [
    "Comparar a arquitetura do bi-encoder com a do cross-encoder",
    "Explicar o que o cross-encoder enxerga e o bi-encoder perde",
    "Calcular o custo de cada um por consulta",
    "Posicionar a interação tardia (ColBERT) entre os dois",
  ],
  steps: [
    {
      id: "bi-encoder",
      shortTitle: "Bi-encoder",
      title: "Dois textos, dois resumos, uma comparação",
      tag: "context",
      body: [
        "Dois críticos leem um livro e um pedido de indicação em salas separadas, e cada um escreve uma ficha de cinco linhas. Depois alguém compara as fichas. É rápido, porque a ficha do livro serve para todos os pedidos, mas detalhe que não coube na ficha se perde. Esse é o [[bi-encoder|bi-encoder]] da busca semântica.",
        "Consulta e documento passam pelo encoder separados, cada um vira um vetor, e o cosseno compara os dois. O vetor do documento é calculado uma vez, na indexação. Tudo o que o modelo sabe sobre o par está nesses dois vetores: ele nunca vê a consulta e o documento ao mesmo tempo.",
      ],
      keyIdea: "Bi-encoder: cada texto vira um vetor sozinho, e o encontro é só um cosseno.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "query", kind: "laptop", label: "consulta", col: 0, row: 0 },
              { id: "doc", kind: "documents", label: "documento", col: 0, row: 1 },
              { id: "encode-query", kind: "embedding", label: "encoder", col: 1, row: 0 },
              { id: "encode-doc", kind: "embedding", label: "encoder", col: 1, row: 1 },
              { id: "cosine", kind: "retrieval", label: "cosseno", col: 2, row: 0.5 },
              { id: "score", kind: "answer", label: "similaridade", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "query", to: "encode-query" },
              { from: "doc", to: "encode-doc" },
              { from: "encode-query", to: "cosine", label: "vetor" },
              { from: "encode-doc", to: "cosine", label: "vetor" },
              { from: "cosine", to: "score" },
            ],
            active: "cosine",
          },
        ],
      },
      alt: "Consulta e documento passam cada um pelo seu encoder; os dois vetores só se encontram no cosseno, em destaque, que dá a similaridade.",
    },
    {
      id: "average",
      shortTitle: "A ficha",
      title: "O que cabe num vetor, e o que não cabe",
      tag: "mechanism",
      body: [
        `No brinquedo, o vetor de um texto é a média dos vetores das palavras, em ${traits.length} traços: ${traits.join(", ")}. “${documents[MANUAL]}” e “${documents[ELECTRIC_CAR]}” falam dos mesmos traços, troca, óleo e veículo, e os vetores ficam parecidos. A palavra “não” não tem vetor: na média, ela simplesmente some.`,
        `O resultado: para “${QUERY}”, o bi-encoder dá ${fixed(biManual)} ao manual e ${fixed(biElectric)} ao carro elétrico, quase um empate. Modelos reais têm centenas de dimensões e capturam muito mais que isso, mas o limite é o mesmo: negação, ordem e detalhes que só importam para uma pergunta específica disputam espaço num vetor fixo, calculado sem saber a pergunta.`,
      ],
      keyIdea: "O vetor do documento é feito antes da pergunta. O que só importa para uma pergunta tende a se perder.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "bi-scores",
            piece: "metrics-panel",
            metrics: [
              { id: "manual", label: "bi-encoder: manual", value: fixed(biManual) },
              { id: "electric", label: "bi-encoder: carro elétrico", value: fixed(biElectric), color: "danger" },
            ],
            highlight: "electric",
          },
          {
            id: "vectors",
            piece: "matrix",
            rows: ["consulta", "manual e óleo", "carro elétrico"],
            cols: traits,
            values: [queryVector, manualVector, electricVector],
            scale: { min: 0, max: 1 },
            showValues: true,
            color: "module-07",
          },
        ],
      },
      alt: `Os vetores médios da consulta, do manual e do carro elétrico nos traços ${traits.join(", ")}. O cosseno com a consulta dá ${fixed(biManual)} ao manual e ${fixed(biElectric)} ao carro elétrico.`,
    },
    {
      id: "cross",
      shortTitle: "Juntos",
      title: "Cross-encoder: consulta e documento na mesma entrada",
      tag: "mechanism",
      body: [
        "Agora um único avaliador lê o pedido e o livro lado a lado, e pode voltar ao pedido a cada parágrafo. O [[cross-encoder|cross-encoder]] faz isso: junta consulta e documento numa só sequência, “[CLS] consulta [SEP] documento [SEP]”, e passa tudo por um Transformer.",
        "Dentro dele, a [[self-attention|self-attention]] liga cada token da consulta a cada token do documento, em todas as camadas. No fim, uma camada pequena lê o vetor do [CLS] e devolve um número: a relevância do par. O modelo é treinado com pares julgados, relevante ou não, como os do MS MARCO, e não produz um vetor reaproveitável: só a nota daquele par.",
      ],
      keyIdea: "Cross-encoder: uma entrada com os dois textos, atenção entre eles, e uma nota de relevância como saída.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "query", kind: "laptop", label: "consulta", col: 0, row: 0 },
              { id: "doc", kind: "documents", label: "documento", col: 0, row: 1 },
              { id: "pair", kind: "tokens", label: "[CLS] q [SEP] d", col: 1, row: 0.5 },
              { id: "model", kind: "llm", label: "cross-encoder", col: 2, row: 0.5 },
              { id: "score", kind: "answer", label: "relevância", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "query", to: "pair" },
              { from: "doc", to: "pair" },
              { from: "pair", to: "model", label: "uma sequência" },
              { from: "model", to: "score", label: "nota" },
            ],
            active: "model",
          },
        ],
      },
      alt: "Consulta e documento são juntados numa só sequência, [CLS] consulta [SEP] documento, que entra no cross-encoder, em destaque, e sai como uma nota de relevância.",
    },
    {
      id: "interactions",
      shortTitle: "Interações",
      title: "Cada palavra da consulta encontra cada palavra do documento",
      tag: "example",
      body: [
        `A cena mostra o par “${QUERY}” e “${documents[ELECTRIC_CAR]}”, sem as stopwords, menos o “não”. Os arcos saem de cada termo da consulta para as palavras do documento que combinam com ele, e do “não” para o que ele nega. Num cross-encoder, essas ligações são a attention; aqui, são as contas do brinquedo.`,
        `O cross-encoder de brinquedo dá ${fixed(crossManual)} ao manual e ${fixed(crossElectric)} ao carro elétrico: com as duas frases juntas, a negação entra na conta. Onde o bi-encoder via quase um empate (${fixed(biManual)} contra ${fixed(biElectric)}), a leitura conjunta separa com folga quem responde de quem só fala do mesmo assunto.`,
      ],
      keyIdea: "Ler o par junto deixa o modelo usar a pergunta para interpretar o documento, negação incluída.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "cross-scores",
            piece: "metrics-panel",
            metrics: [
              { id: "manual", label: "cross: manual", value: fixed(crossManual), color: "success" },
              { id: "electric", label: "cross: carro elétrico", value: fixed(crossElectric), color: "danger" },
              { id: "bi-gap", label: "diferença no bi-encoder", value: fixed(biManual - biElectric) },
            ],
            highlight: "manual",
          },
          {
            id: "pair",
            piece: "token-stream",
            tokens: pairTokens,
            query: negationAt,
            arcs: pairArcs,
            color: "module-07",
          },
        ],
      },
      alt: `A sequência ${pairTokens.join(" ")} com arcos dos termos da consulta para as palavras parecidas do documento e do não, em destaque, para o que ele nega. O cross-encoder de brinquedo dá ${fixed(crossManual)} ao manual e ${fixed(crossElectric)} ao carro elétrico.`,
    },
    {
      id: "cost",
      shortTitle: "Custo",
      title: "Uma passada por par",
      tag: "tradeoff",
      body: [
        `O bi-encoder paga uma passada do modelo por consulta, porque os documentos foram codificados antes, e depois só faz contas de vetor. O cross-encoder paga uma passada por par: ${CANDIDATES.map((count) => `${count.toLocaleString("pt-BR")} candidatos, ${count.toLocaleString("pt-BR")} passadas`).join("; ")}. E nada pode ser pré-calculado, porque a entrada depende da consulta.`,
        "Por isso o cross-encoder nunca busca na coleção: ele reordena o topo que a busca barata trouxe. Entre os dois existe a [[interação tardia|late-interaction]], do ColBERT: guarda um vetor por token de cada documento, calculado antes, e na consulta compara token a token, pegando a melhor combinação para cada termo. É mais preciso que um vetor por documento e mais barato que um cross-encoder, com um índice bem maior.",
      ],
      keyIdea: "Bi-encoder: 1 passada por consulta. Cross-encoder: 1 passada por candidato. ColBERT fica no meio.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "passes",
            piece: "metrics-panel",
            metrics: [
              { id: "bi", label: "bi-encoder", value: "1 passada por consulta", color: "success" },
              ...CANDIDATES.map((count) => ({ id: `cross-${count}`, label: `cross-encoder, ${count.toLocaleString("pt-BR")} candidatos`, value: `${count.toLocaleString("pt-BR")} passadas` })),
              { id: "colbert", label: "interação tardia", value: "1 passada + vetor por token" },
            ],
            highlight: `cross-${CANDIDATES[CANDIDATES.length - 1]}`,
          },
        ],
      },
      alt: `Painel de custo por consulta: o bi-encoder faz 1 passada; o cross-encoder faz uma passada por candidato, ${CANDIDATES.join(", ")}; a interação tardia faz 1 passada e guarda um vetor por token.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Bi-encoder para buscar, cross-encoder para reordenar",
      tag: "summary",
      body: [
        "Os dois se completam. O bi-encoder, junto com o BM25, varre a coleção inteira e traz candidatos em milissegundos. O cross-encoder lê cada candidato junto com a consulta e decide a ordem final do topo. É a arquitetura de duas etapas da aula anterior, agora com nome e motivo.",
        "Falta uma pergunta: como saber se cada troca, de modelo, de k, de α, de reranker, melhorou a busca? A última aula do módulo mede: precision@k, recall@k, MRR e nDCG.",
      ],
      keyIdea: "Bi-encoder: rápido, para recall. Cross-encoder: preciso, para a ordem do topo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "query", kind: "laptop", label: "consulta", col: 0, row: 0.5 },
              { id: "bi", kind: "vector-db", label: "bi-encoder + bm25", col: 1, row: 0.5 },
              { id: "model", kind: "llm", label: "cross-encoder", col: 2, row: 0.5 },
              { id: "eval", kind: "eval", label: "avaliação", col: 3, row: 0 },
              { id: "answer", kind: "answer", label: "top-k final", col: 3, row: 1 },
            ],
            edges: [
              { from: "query", to: "bi" },
              { from: "bi", to: "model", label: "candidatos" },
              { from: "model", to: "answer" },
              { from: "model", to: "eval", label: "medir" },
            ],
            active: "model",
            done: ["query", "bi"],
          },
        ],
      },
      alt: "A consulta passa pelo bi-encoder com BM25, que entrega candidatos ao cross-encoder, em destaque; ele produz o top-k final e alimenta a avaliação.",
    },
  ],
  realWorldExample:
    "A biblioteca sentence-transformers tem as duas classes lado a lado: SentenceTransformer, o bi-encoder, para gerar embeddings e buscar, e CrossEncoder, para pontuar pares e reordenar. A documentação dela recomenda exatamente esse uso combinado: recuperar com um bi-encoder e reordenar os candidatos com um cross-encoder.",
  code: {
    language: "python",
    source: `from sentence_transformers import CrossEncoder, SentenceTransformer, util

bi = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
cross = CrossEncoder("cross-encoder/ms-marco-MiniLM-L6-v2")

query = "how to change the car oil"
docs = ["Car maintenance manual: changing the oil", "Electric cars do not need oil changes"]

print(util.cos_sim(bi.encode(query), bi.encode(docs)))
print(cross.predict([(query, doc) for doc in docs]))`,
    caption: "O mesmo par visto pelos dois: o bi-encoder compara vetores feitos em separado; o cross-encoder lê cada par junto e devolve uma nota.",
  },
  tradeOffs: {
    pros: [
      "Mais preciso: a consulta participa da leitura do documento",
      "Percebe negação, ordem das palavras e detalhes específicos da pergunta",
      "Fácil de encaixar como 2ª etapa, sem mudar o índice",
    ],
    cons: [
      "Uma passada do modelo por par: impossível na coleção inteira",
      "Nada é pré-calculado: o custo se repete a cada consulta",
      "Latência cresce com o número de candidatos",
    ],
    alternatives: ["Bi-encoder sozinho, quando a latência manda", "Interação tardia (ColBERT), entre os dois em custo e precisão", "LLM como reranker, mais caro ainda"],
  },
  knowledgeCheck: [
    {
      id: "precompute",
      prompt: "Por que os vetores de um bi-encoder podem ser calculados na indexação e as notas de um cross-encoder não?",
      options: [
        "Porque o cross-encoder é um modelo menor",
        "Porque a entrada do cross-encoder é o par (consulta, documento), e a consulta só existe na hora da busca",
        "Porque o cross-encoder não usa GPU",
        "Porque vetores ocupam menos espaço que notas",
      ],
      correct: 1,
      explanation: "O bi-encoder codifica o documento sozinho, sem saber a consulta. O cross-encoder precisa ver os dois juntos, então só pode rodar quando a consulta chega.",
      lesson: "07-11",
    },
    {
      id: "where-cross",
      prompt: "Uma base tem 5 milhões de trechos. Onde usar um cross-encoder?",
      options: [
        "Para codificar os 5 milhões de trechos na indexação",
        "Para reordenar os 50 a 100 candidatos que a busca híbrida trouxe para cada consulta",
        "No lugar do índice invertido",
        "Para gerar os embeddings da consulta",
      ],
      correct: 1,
      explanation: "O cross-encoder pontua pares e custa uma passada por par. Ele cabe no topo de uma lista curta, nunca na coleção inteira.",
      lesson: "07-11",
    },
  ],
  related: ["07-10", "07-12", "03-08"],
  references: [
    { title: "Reimers & Gurevych (2019), Sentence-BERT", url: "https://arxiv.org/abs/1908.10084", kind: "paper" },
    { title: "Khattab & Zaharia (2020), ColBERT: Efficient and Effective Passage Search via Contextualized Late Interaction over BERT", url: "https://arxiv.org/abs/2004.12832", kind: "paper" },
    { title: "Sentence Transformers: documentação", url: "https://www.sbert.net/", kind: "docs" },
  ],
};

export default lesson;
