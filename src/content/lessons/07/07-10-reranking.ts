import { bm25Scores, embed, rankByScore, reciprocalRankFusion, tokenize, vectorScores } from "../../../lab/retrieval";
import { cosineSimilarity } from "../../../lab/embeddings";
import { normalizeText } from "../../../lib/utils";
import type { LessonContent } from "../../../types/content";
import { bm25VsVectorContent } from "../../playgrounds/bm25-vs-vector";

// Reranking em duas etapas. A 1ª etapa é a busca híbrida do playground BM25 vs. vetorial, fundida com RRF
// pelas funções de src/lab/retrieval.ts. A 2ª etapa é um reranker de brinquedo escrito à mão, que faz o
// papel de um cross-encoder: lê a consulta e o texto inteiro do candidato juntos, palavra contra palavra,
// e percebe a negação que a 1ª etapa jogou fora junto com as stopwords.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const thousands = (value: number) => value.toLocaleString("pt-BR");

const { documents, stopwords, concepts, dims, initial } = bm25VsVectorContent;
const stop = new Set(stopwords);
const corpus = documents.map((document) => tokenize(document, stop));
const labels = ["pneu do carro", "manual e óleo", "bolo de cenoura", "carro elétrico", "combustível"];
const MANUAL = 1;
const ELECTRIC_CAR = 3;
const QUERY = initial.query;
const terms = tokenize(QUERY, stop);

const lexicalRanking = rankByScore(bm25Scores(corpus, terms));
const semanticRanking = rankByScore(
  vectorScores(
    corpus.map((words) => embed(words, concepts, dims)),
    embed(terms, concepts, dims),
  ),
);
const candidates = reciprocalRankFusion([lexicalRanking, semanticRanking], initial.k).map((entry) => entry.document);

/** Vetores de palavra do reranker, em 4 traços: [troca, óleo, pneu, veículo]. */
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

/** Para cada termo da consulta, a palavra mais parecida do candidato; a média é a cobertura, e negação desconta. */
function rerankScore(query: string[], text: string): number {
  const words = tokenize(text);
  const coverage =
    query.reduce((sum, term) => {
      const vector = wordVectors[term];
      const best = Math.max(0, ...words.map((word) => (vector && wordVectors[word] ? cosineSimilarity(vector, wordVectors[word]) : 0)));
      return sum + best;
    }, 0) / query.length;
  return words.includes(NEGATION) ? coverage * NEGATION_FACTOR : coverage;
}

const rerankScores = candidates.map((document) => rerankScore(terms, documents[document]));
const reranked = candidates
  .map((document, index) => ({ document, score: rerankScores[index] }))
  .sort((a, b) => b.score - a.score)
  .map((entry) => entry.document);
const before = (document: number) => candidates.indexOf(document) + 1;
const after = (document: number) => reranked.indexOf(document) + 1;

const electricWords = documents[ELECTRIC_CAR].split(" ");
const keptByFirstStage = electricWords.map((word) => !stop.has(normalizeText(word)));
const negationIndex = electricWords.findIndex((word) => normalizeText(word) === NEGATION);

const COLLECTION = 1_000_000;
const FIRST_STAGE = 100;
const SHOWN = 3;

const SHALLOW = 2;
const shallowCandidates = lexicalRanking.slice(0, SHALLOW);
const shallowBest = [...shallowCandidates].sort(
  (a, b) => rerankScore(terms, documents[b]) - rerankScore(terms, documents[a]),
)[0];

const lesson: LessonContent = {
  id: "07-10",
  subtitle: "Buscar rápido muitos candidatos e deixar um modelo mais caro e mais preciso reordenar só os primeiros.",
  objectives: [
    "Descrever a arquitetura de duas etapas: recuperação barata e reranking caro",
    "Calcular quantas passadas do modelo o reranking custa por consulta",
    "Explicar o que um reranker vê que a 1ª etapa não vê",
    "Reconhecer que o reranker não recupera o que a 1ª etapa perdeu",
  ],
  steps: [
    {
      id: "funnel",
      shortTitle: "Funil",
      title: "Triagem de currículos, depois entrevista",
      tag: "context",
      body: [
        "Uma vaga recebe mil currículos. Ninguém entrevista mil pessoas: uma triagem rápida separa vinte, e só essas vinte fazem a entrevista, que é lenta, cara e muito mais precisa. A busca de produção faz o mesmo. É a [[recuperação em duas etapas|two-stage-retrieval]].",
        `Na 1ª etapa, BM25, busca vetorial e RRF trazem uns ${FIRST_STAGE} candidatos em milissegundos, priorizando não perder nada. Na 2ª, o [[reranking|reranking]] reordena só esses candidatos com um modelo que lê a consulta e cada candidato com atenção, e o topo dessa nova ordem é o que a pessoa, ou o LLM, recebe.`,
      ],
      keyIdea: "1ª etapa: rápida e generosa, para não perder. 2ª etapa: lenta e precisa, só no topo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "docs", kind: "documents", label: `${thousands(COLLECTION)} docs`, col: 0, row: 0 },
              { id: "first", kind: "retrieval", label: "bm25 + vetorial", col: 1, row: 0 },
              { id: "reranker", kind: "llm", label: "reranker", col: 2, row: 0 },
              { id: "answer", kind: "answer", label: `top-${SHOWN}`, col: 3, row: 0 },
            ],
            edges: [
              { from: "docs", to: "first" },
              { from: "first", to: "reranker", label: `${FIRST_STAGE} candidatos` },
              { from: "reranker", to: "answer", label: "nova ordem" },
            ],
            active: "reranker",
          },
        ],
      },
      alt: `Um milhão de documentos passam pela 1ª etapa, BM25 mais vetorial, que entrega ${FIRST_STAGE} candidatos ao reranker, em destaque, que devolve o top-${SHOWN} numa nova ordem.`,
    },
    {
      id: "cost",
      shortTitle: "Custo",
      title: "Por que só o topo",
      tag: "mechanism",
      body: [
        `Um reranker roda o modelo uma vez para cada par (consulta, candidato). Reordenar ${FIRST_STAGE} candidatos custa ${FIRST_STAGE} passadas por consulta. Aplicar o mesmo modelo à coleção inteira custaria ${thousands(COLLECTION)} passadas, ${thousands(COLLECTION / FIRST_STAGE)} vezes mais, a cada pergunta, e nenhum orçamento de latência aguenta isso.`,
        `Daí o funil: a coleção inteira passa pelos índices, que são baratos; o modelo caro vê ${FIRST_STAGE}; a resposta usa ${SHOWN}. O tamanho da 1ª etapa é um botão de custo e qualidade: mais candidatos aumentam a chance de o certo estar lá e aumentam a latência do reranker na mesma proporção.`,
      ],
      keyIdea: "O reranker custa uma passada do modelo por candidato. Por isso ele só vê o topo.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "passes",
            piece: "metrics-panel",
            metrics: [
              { id: "top", label: `reranker no top-${FIRST_STAGE}`, value: `${FIRST_STAGE} passadas`, color: "success" },
              { id: "all", label: "reranker na coleção", value: `${thousands(COLLECTION)} passadas`, color: "danger" },
              { id: "ratio", label: "diferença", value: `${thousands(COLLECTION / FIRST_STAGE)}×` },
            ],
            highlight: "top",
          },
          {
            id: "funnel",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "collection", label: `${thousands(COLLECTION)} documentos` },
              { id: "candidates", label: `${FIRST_STAGE} candidatos` },
              { id: "reranked", label: `${FIRST_STAGE} reordenados`, color: "module-07" },
              { id: "shown", label: `top-${SHOWN}` },
            ],
            active: "reranked",
            done: ["collection", "candidates"],
          },
        ],
      },
      alt: `Painel: reordenar ${FIRST_STAGE} candidatos custa ${FIRST_STAGE} passadas do modelo; a coleção inteira custaria ${thousands(COLLECTION)}. O funil vai de ${thousands(COLLECTION)} documentos a ${FIRST_STAGE} candidatos e ao top-${SHOWN}.`,
    },
    {
      id: "read-together",
      shortTitle: "Ler junto",
      title: "O reranker lê o texto inteiro",
      tag: "mechanism",
      body: [
        `Para chegar rápido, a 1ª etapa simplifica: o BM25 e os vetores de brinquedo do Laboratório jogam fora as stopwords, e “não” está na lista. Para eles, “${documents[ELECTRIC_CAR]}” vira ${corpus[ELECTRIC_CAR].map((word) => `“${word}”`).join(", ")}: um texto perfeito sobre troca de óleo de carro. Por isso ele aparece em ${before(ELECTRIC_CAR)}º na lista de candidatos.`,
        "O reranker recebe a consulta e o texto completo do candidato juntos, e pode perceber que a frase nega exatamente o que foi pedido. Nesta aula, ele é um brinquedo escrito à mão: compara cada termo da consulta com cada palavra do candidato e desconta a negação. Um reranker de verdade é um cross-encoder treinado, que aprende esses padrões com milhares de exemplos julgados, como os do MS MARCO.",
      ],
      keyIdea: "A 1ª etapa resume o texto para ser rápida; o reranker lê o par inteiro e acha o que o resumo perdeu.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "candidate",
            piece: "token-stream",
            tokens: electricWords,
            bars: keptByFirstStage.map((kept) => (kept ? 1 : 0)),
            query: negationIndex,
            color: "module-07",
          },
        ],
      },
      alt: `As palavras de “${documents[ELECTRIC_CAR]}” com barra cheia nas que a 1ª etapa mantém; “não”, em destaque, fica sem barra porque é stopword.`,
    },
    {
      id: "new-order",
      shortTitle: "Nova ordem",
      title: "Os mesmos candidatos, outra ordem",
      tag: "example",
      body: [
        `Os candidatos da 1ª etapa, na ordem do RRF, são ${candidates.map((document) => labels[document]).join(", ")}. O reranker dá ${candidates.map((document, index) => `${fixed(rerankScores[index])} a “${labels[document]}”`).join(", ")}.`,
        `A nova ordem é ${reranked.map((document) => labels[document]).join(", ")}. O manual, que ensina a trocar o óleo, sobe de ${before(MANUAL)}º para ${after(MANUAL)}º; o carro elétrico, que diz que não precisa, cai de ${before(ELECTRIC_CAR)}º para ${after(ELECTRIC_CAR)}º. Nenhum documento novo entrou: o reranker só reordena o que recebeu.`,
      ],
      keyIdea: "Reranking não busca nada novo: ele troca a ordem dos candidatos que a 1ª etapa trouxe.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "moves",
            piece: "metrics-panel",
            metrics: [
              { id: "manual", label: "manual e óleo", value: `${before(MANUAL)}º → ${after(MANUAL)}º`, color: "success" },
              { id: "electric", label: "carro elétrico", value: `${before(ELECTRIC_CAR)}º → ${after(ELECTRIC_CAR)}º`, color: "danger" },
            ],
            highlight: "manual",
          },
          {
            id: "scores",
            piece: "chart",
            kind: "bar",
            series: candidates.map((document, index) => ({ label: labels[document], value: Number(rerankScores[index].toFixed(3)) })),
            max: 1,
            highlight: candidates.indexOf(MANUAL),
            color: "module-07",
          },
        ],
      },
      alt: `Pontuação do reranker para os candidatos na ordem do RRF: ${candidates.map((document, index) => `${labels[document]} ${fixed(rerankScores[index])}`).join(", ")}. O manual sobe de ${before(MANUAL)}º para ${after(MANUAL)}º e o carro elétrico cai de ${before(ELECTRIC_CAR)}º para ${after(ELECTRIC_CAR)}º.`,
    },
    {
      id: "ceiling",
      shortTitle: "Teto",
      title: "O reranker não acha o que não recebeu",
      tag: "tradeoff",
      body: [
        `Troque a 1ª etapa por só o BM25 com top-${SHALLOW}: os candidatos viram ${shallowCandidates.map((document) => labels[document]).join(" e ")}. O manual ficou em ${lexicalRanking.indexOf(MANUAL) + 1}º no BM25 e não entra. O reranker, por melhor que seja, escolhe “${labels[shallowBest]}” como o melhor do que recebeu.`,
        "Essa é a regra mais importante do reranking: o [[recall|recall]] da 1ª etapa é o teto da 2ª. Por isso a 1ª etapa é generosa, híbrida e com dezenas ou centenas de candidatos, e a avaliação mede as duas separadas: o recall@100 dos candidatos e a qualidade do topo depois do reranker.",
      ],
      keyIdea: "O que a 1ª etapa perde, o reranker nunca vê. Recall primeiro, precisão depois.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "first", kind: "kv-cache", label: `bm25 top-${SHALLOW}`, col: 0, row: 0.5 },
              { id: "reranker", kind: "llm", label: "reranker", col: 1, row: 0 },
              { id: "answer", kind: "answer", label: labels[shallowBest], col: 2, row: 0 },
              { id: "lost", kind: "no-result", label: "manual ficou fora", col: 1, row: 1 },
            ],
            edges: [
              { from: "first", to: "reranker", label: `${SHALLOW} candidatos` },
              { from: "reranker", to: "answer" },
              { from: "first", to: "lost", label: "corte do top-k", variant: "alternative" },
            ],
            active: "lost",
          },
        ],
      },
      alt: `A 1ª etapa só com BM25 e top-${SHALLOW} entrega ${shallowCandidates.map((document) => labels[document]).join(" e ")} ao reranker, que escolhe ${labels[shallowBest]}; o manual, cortado pelo top-k, fica de fora, em destaque.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Recuperar muito, reordenar pouco",
      tag: "summary",
      body: [
        "A busca de produção é um funil: índices baratos sobre a coleção inteira, fusão das listas, um reranker caro sobre o topo e só os melhores para a resposta. Cada etapa tem a sua métrica: recall para a 1ª, precisão no topo para a 2ª.",
        "A próxima aula abre o reranker de verdade: o cross-encoder, que lê consulta e documento na mesma entrada do Transformer.",
      ],
      keyIdea: "Duas etapas: recall com índices baratos, precisão com um reranker caro no topo.",
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
              { id: "fusion", kind: "retrieval", label: "rrf", col: 2, row: 0.5 },
              { id: "reranker", kind: "llm", label: "reranker", col: 3, row: 0 },
              { id: "answer", kind: "answer", label: labels[reranked[0]], col: 3, row: 1 },
            ],
            edges: [
              { from: "query", to: "lexical" },
              { from: "query", to: "semantic" },
              { from: "lexical", to: "fusion" },
              { from: "semantic", to: "fusion" },
              { from: "fusion", to: "reranker", label: "candidatos" },
              { from: "reranker", to: "answer", label: "1º" },
            ],
            active: "reranker",
            done: ["query", "lexical", "semantic", "fusion"],
          },
        ],
      },
      alt: `A consulta passa pelo BM25 e pela busca vetorial, o RRF funde as listas, o reranker, em destaque, reordena os candidatos e ${labels[reranked[0]]} sai em 1º.`,
    },
  ],
  realWorldExample:
    "Nogueira e Cho (2019) usaram o BERT como reranker dos 1.000 primeiros resultados do BM25 no MS MARCO, um conjunto de perguntas reais do Bing com passagens julgadas, e chegaram ao topo do ranking de passagens com folga sobre o BM25 sozinho. O desenho de duas etapas virou padrão desde então.",
  code: {
    language: "python",
    source: `from sentence_transformers import CrossEncoder

reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L6-v2")

query = "how to change the car oil"
candidates = ["How to change a car tire", "Car maintenance manual: changing the oil", "Electric cars do not need oil changes"]

scores = reranker.predict([(query, doc) for doc in candidates])
for score, doc in sorted(zip(scores, candidates), reverse=True):
    print(round(float(score), 2), doc)`,
    caption: "Reranking com um cross-encoder treinado no MS MARCO: uma passada do modelo por par (consulta, candidato), e a lista é reordenada pela pontuação.",
  },
  tradeOffs: {
    pros: [
      "Melhora muito a ordem do topo, que é o que a pessoa ou o LLM lê",
      "Lê consulta e candidato juntos: percebe negação, ordem e contexto",
      "Encaixa depois de qualquer 1ª etapa, sem reindexar a coleção",
    ],
    cons: [
      "Uma passada do modelo por candidato: a latência cresce com o top-k",
      "Não recupera nada: o que a 1ª etapa perdeu continua perdido",
      "Mais uma peça para hospedar, versionar e avaliar",
    ],
    alternatives: ["Usar só a 1ª etapa, quando a latência é crítica", "Modelos de interação tardia, como o ColBERT, mais baratos que um cross-encoder"],
  },
  knowledgeCheck: [
    {
      id: "recall-ceiling",
      prompt: "Depois de trocar o reranker por um modelo muito melhor, as respostas continuam ruins. A avaliação mostra que o documento certo só está entre os 20 candidatos em metade das consultas. O que atacar primeiro?",
      options: [
        "Um reranker ainda maior",
        "O recall da 1ª etapa: busca híbrida, mais candidatos ou melhores embeddings",
        "A temperatura do LLM",
        "Diminuir para 5 candidatos",
      ],
      correct: 1,
      explanation: "O reranker só reordena o que recebe. Se o documento certo não está entre os candidatos, nenhum reranker resolve: o teto é o recall da 1ª etapa.",
      lesson: "07-10",
    },
    {
      id: "rerank-latency",
      prompt: "Um reranker leva em média 4 ms por par (consulta, candidato) em lote. Quanto tempo de reranking cabe por consulta com 200 candidatos, sem paralelismo?",
      options: ["4 ms", "Cerca de 0,8 s", "200 ms", "Cerca de 8 s"],
      correct: 1,
      explanation: "200 pares × 4 ms = 800 ms. É por isso que o número de candidatos é um botão de latência, e que rerankers rodam em lote na GPU.",
      lesson: "07-10",
    },
  ],
  related: ["07-09", "07-11", "08-13"],
  references: [
    { title: "Nogueira & Cho (2019), Passage Re-ranking with BERT", url: "https://arxiv.org/abs/1901.04085", kind: "paper" },
    { title: "Nguyen et al. (2016), MS MARCO: A Human Generated MAchine Reading COmprehension Dataset", url: "https://arxiv.org/abs/1611.09268", kind: "paper" },
    { title: "Sentence Transformers: documentação", url: "https://www.sbert.net/", kind: "docs" },
  ],
};

export default lesson;
