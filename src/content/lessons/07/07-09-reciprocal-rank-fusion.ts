import { bm25Scores, embed, rankByScore, reciprocalRankFusion, tokenize, vectorScores } from "../../../lab/retrieval";
import type { LessonContent } from "../../../types/content";
import { bm25VsVectorContent } from "../../playgrounds/bm25-vs-vector";

// Reciprocal Rank Fusion com a consulta e o k iniciais do playground BM25 vs. vetorial (k = 60, o valor do
// artigo de Cormack, Clarke e Büttcher). Os dois rankings e a fusão saem de src/lab/retrieval.ts, as mesmas
// funções do Laboratório; o empate é desfeito pela ordem do corpus, como lá.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const milli = (value: number) => fixed(value * 1000);

const { documents, stopwords, concepts, dims, initial } = bm25VsVectorContent;
const stop = new Set(stopwords);
const corpus = documents.map((document) => tokenize(document, stop));
const labels = ["pneu do carro", "manual e óleo", "bolo de cenoura", "carro elétrico", "combustível"];
const K = initial.k;
const QUERY = initial.query;
const terms = tokenize(QUERY, stop);

const lexical = bm25Scores(corpus, terms);
const semantic = vectorScores(
  corpus.map((words) => embed(words, concepts, dims)),
  embed(terms, concepts, dims),
);
const lexicalRanking = rankByScore(lexical);
const semanticRanking = rankByScore(semantic);
const fused = reciprocalRankFusion([lexicalRanking, semanticRanking], K);
const fusedScore = (document: number) => fused.find((entry) => entry.document === document)?.score ?? 0;

const positionIn = (ranking: number[], document: number) => ranking.indexOf(document) + 1;
const contribution = (ranking: number[], document: number) => {
  const position = positionIn(ranking, document);
  return position === 0 ? 0 : 1 / (K + position);
};
const contributions = documents.map((_, document) => [
  contribution(lexicalRanking, document) * 1000,
  contribution(semanticRanking, document) * 1000,
  fusedScore(document) * 1000,
]);

const rawSum = lexical.map((score, index) => score + semantic[index]);
const rawSumRanking = rankByScore(rawSum);
const rawSumEqualsLexical = lexicalRanking.every((document, index) => rawSumRanking[index] === document);

const [first, second, third] = fused;
const tied = Math.abs(first.score - second.score) < 1e-12;
const onlyVector = semanticRanking.filter((document) => !lexicalRanking.includes(document));
const positionsOf = (document: number) =>
  `${positionIn(lexicalRanking, document)}º no BM25 e ${positionIn(semanticRanking, document)}º no vetorial`;

const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const weights = RANKS.map((rank) => 1 / (K + rank));
const K_VALUES = [1, 10, 60, 100];
/** Quantas vezes o 1º lugar pesa mais que o 10º: (k + 10) / (k + 1). */
const topVsTenth = K_VALUES.map((k) => (k + 10) / (k + 1));

const lesson: LessonContent = {
  id: "07-09",
  subtitle: "Fundir rankings pela posição, sem olhar a pontuação: cada lista soma 1 / (k + posição), e quem aparece bem em várias listas sobe.",
  objectives: [
    "Calcular a pontuação RRF de um documento a partir das suas posições",
    "Explicar por que o RRF dispensa normalizar pontuações",
    "Prever o efeito do k no peso dos primeiros lugares",
    "Reconhecer o que o RRF perde ao ignorar as pontuações",
  ],
  steps: [
    {
      id: "vote",
      shortTitle: "Votação",
      title: "Juntar listas como quem junta votos",
      tag: "context",
      body: [
        "Dois críticos publicam o seu top de filmes do ano. Um dá notas de 0 a 10, o outro de 0 a 100, com critérios diferentes. Comparar as notas é difícil; comparar as posições é fácil: o filme que está no topo das duas listas é, com boa chance, o melhor. Quem aparece numa lista só ganha menos.",
        `O [[Reciprocal Rank Fusion|reciprocal-rank-fusion]] é essa ideia em uma linha: cada ranking dá a cada documento 1 / (k + posição), e a pontuação final é a soma. Ele foi proposto por Cormack, Clarke e Büttcher em 2009 com k = ${K}, e hoje é a fusão de busca híbrida oferecida por motores como o Elasticsearch e o Azure AI Search.`,
      ],
      keyIdea: "RRF funde rankings pelas posições: quem aparece bem em várias listas ganha.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "lexical", kind: "kv-cache", label: "ranking bm25", col: 0, row: 0 },
              { id: "semantic", kind: "vector-db", label: "ranking vetorial", col: 0, row: 1 },
              { id: "rrf", kind: "retrieval", label: `rrf (k = ${K})`, col: 1.5, row: 0.5 },
              { id: "answer", kind: "answer", label: "ranking fundido", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "lexical", to: "rrf", label: "posições" },
              { from: "semantic", to: "rrf", label: "posições" },
              { from: "rrf", to: "answer" },
            ],
            active: "rrf",
          },
        ],
      },
      alt: `O ranking do BM25 e o ranking vetorial entregam só as posições ao RRF com k = ${K}, em destaque, que devolve o ranking fundido.`,
    },
    {
      id: "formula",
      shortTitle: "Fórmula",
      title: "1 / (k + posição): uma curva quase plana",
      tag: "mechanism",
      body: [
        `Com k = ${K}, o 1º lugar vale 1 / ${K + 1} = ${fixed(weights[0], 4)}, o 2º vale 1 / ${K + 2} = ${fixed(weights[1], 4)} e o 10º, 1 / ${K + 10} = ${fixed(weights[9], 4)}. A curva cai devagar: o 1º lugar vale só ${fixed(topVsTenth[K_VALUES.indexOf(K)])} vezes o 10º. É de propósito.`,
        "Com uma curva plana, estar em 1º numa lista não basta para ganhar; o que pesa é aparecer em várias. Um documento que fica em 3º nas duas listas pode passar de um que é 1º numa e não aparece na outra. O RRF premia o consenso entre os buscadores, e não a confiança de um só.",
      ],
      keyIdea: "Com k = 60, a diferença entre 1º e 10º é pequena: o RRF premia aparecer em várias listas.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "weights-panel",
            piece: "metrics-panel",
            metrics: [
              { id: "first", label: "1º lugar", value: fixed(weights[0], 4), color: "module-07" },
              { id: "tenth", label: "10º lugar", value: fixed(weights[9], 4) },
              { id: "ratio", label: "1º ÷ 10º", value: fixed(topVsTenth[K_VALUES.indexOf(K)]) },
            ],
            highlight: "ratio",
          },
          {
            id: "curve",
            piece: "chart",
            kind: "line",
            series: RANKS.map((rank, index) => ({ label: `${rank}º`, value: Number(weights[index].toFixed(5)) })),
            max: Number(weights[0].toFixed(5)),
            color: "module-07",
          },
        ],
      },
      alt: `Curva de 1 / (${K} + posição) da 1ª à 10ª posição: começa em ${fixed(weights[0], 4)} e termina em ${fixed(weights[9], 4)}, quase plana.`,
    },
    {
      id: "sum",
      shortTitle: "Somar",
      title: "A conta, documento por documento",
      tag: "mechanism",
      body: [
        `Para “${QUERY}”, o BM25 devolve ${lexicalRanking.map((document) => labels[document]).join(", ")}; o vetorial devolve ${semanticRanking.map((document) => labels[document]).join(", ")}. A tabela mostra, em milésimos, quanto cada lista dá a cada documento e a soma. “${labels[third.document]}” é ${positionsOf(third.document)}: ${milli(contribution(lexicalRanking, third.document))} + ${milli(contribution(semanticRanking, third.document))} = ${milli(third.score)}.`,
        `${onlyVector.length > 0 ? `“${labels[onlyVector[0]]}” só aparece no vetorial, em ${positionIn(semanticRanking, onlyVector[0])}º, e fica com ${milli(fusedScore(onlyVector[0]))}, cerca de metade dos outros: sem uma segunda lista, falta metade dos votos.` : "Todo documento recuperado aparece nas duas listas."} O bolo, que nenhuma busca recupera, fica com zero. Nenhuma pontuação original entrou na conta, só as posições.`,
      ],
      keyIdea: "RRF(d) = Σ 1 / (k + posição de d em cada lista). Fora de uma lista, a contribuição dela é zero.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "table",
            piece: "matrix",
            rows: labels,
            cols: ["BM25 (‰)", "vetorial (‰)", "RRF (‰)"],
            values: contributions,
            scale: { min: 0, max: 35 },
            showValues: true,
            highlight: { row: third.document, col: 2 },
            color: "module-07",
          },
        ],
      },
      alt: `Tabela em milésimos com a contribuição de cada ranking e a soma RRF de cada documento. ${labels[third.document]}, em destaque, soma ${milli(third.score)}.`,
    },
    {
      id: "tie",
      shortTitle: "Consenso",
      title: "Posições trocadas, pontuação igual",
      tag: "example",
      body: [
        `“${labels[first.document]}” é ${positionsOf(first.document)}; “${labels[second.document]}” é ${positionsOf(second.document)}. As posições são as mesmas, trocadas, e as somas ficam ${tied ? "idênticas" : "quase idênticas"}: ${milli(first.score)} e ${milli(second.score)}. ${tied ? "O Laboratório desempata pela ordem do corpus." : ""} “${labels[third.document]}”, ${positionsOf(third.document)}, fica a ${fixed((first.score - third.score) * 1e6, 1)} milionésimos deles.`,
        `Compare com somar as pontuações brutas: ${rawSumEqualsLexical ? "o resultado repete a ordem do BM25" : "o BM25 domina a ordem"}, com “${labels[rawSumRanking[0]]}” em 1º e o manual em ${positionIn(rawSumRanking, 1)}º, porque a escala do BM25 é maior. O RRF dá às duas buscas o mesmo voto, sem normalizar nada. É por isso que ele é tão usado: não há α para ajustar nem escala para conhecer, e funciona com qualquer número de listas.`,
      ],
      keyIdea: "No RRF, as duas buscas votam com o mesmo peso, e o consenso aparece no topo.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "fused-panel",
            piece: "metrics-panel",
            metrics: fused.slice(0, 3).map((entry, index) => ({
              id: `top-${index}`,
              label: `${index + 1}º ${labels[entry.document]}`,
              value: `${milli(entry.score)} ‰`,
              color: index === 0 ? ("module-07" as const) : undefined,
            })),
            highlight: "top-0",
          },
          {
            id: "fused",
            piece: "token-stream",
            tokens: fused.map((entry) => labels[entry.document]),
            bars: fused.map((entry) => entry.score / first.score),
            color: "module-07",
          },
        ],
      },
      alt: `Ranking fundido: ${fused.map((entry) => `${labels[entry.document]} com ${milli(entry.score)} milésimos`).join(", ")}. Os dois primeiros ${tied ? "empatam" : "quase empatam"}.`,
    },
    {
      id: "k",
      shortTitle: "O k",
      title: "O que o k controla, e o que o RRF perde",
      tag: "tradeoff",
      body: [
        `O k decide o quanto o topo de cada lista manda. Com k = ${K_VALUES[0]}, o 1º lugar vale ${fixed(topVsTenth[0], 1)} vezes o 10º; com k = ${K_VALUES[1]}, ${fixed(topVsTenth[1], 1)} vezes; com k = ${K}, ${fixed(topVsTenth[K_VALUES.indexOf(K)])}. k pequeno se parece com “confie no 1º de cada lista”; k grande, com “conte em quantas listas o documento aparece”. No artigo original, k = 60 saiu de um experimento piloto, em que o valor se mostrou quase ótimo e pouco crítico, e não foi mais alterado.`,
        "O preço de olhar só posições é jogar fora a confiança. Se o BM25 acha um código de erro exato com pontuação altíssima, e o vetorial não acha nada parecido, o RRF trata esse 1º lugar como qualquer outro. Por isso existem variantes com peso por lista, e por isso o topo fundido costuma passar por um reranker, o assunto da próxima aula.",
      ],
      keyIdea: "k pequeno valoriza o 1º lugar; k grande valoriza o consenso. Em qualquer k, a pontuação original some.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "k-effect",
            piece: "chart",
            kind: "bar",
            series: K_VALUES.map((k, index) => ({ label: `k = ${k}`, value: Number(topVsTenth[index].toFixed(2)) })),
            highlight: K_VALUES.indexOf(K),
            color: "module-07",
          },
        ],
      },
      alt: `Quantas vezes o 1º lugar pesa mais que o 10º para k = ${K_VALUES.join(", ")}: ${topVsTenth.map((value) => fixed(value, 2)).join(", ")}. Em destaque, k = ${K}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Posições entram, um ranking sai",
      tag: "summary",
      body: [
        `Cada busca devolve o seu top-k. O RRF percorre as listas, soma 1 / (${K} + posição) para cada documento e ordena pela soma. Para “${QUERY}”, o resultado é ${fused.map((entry) => labels[entry.document]).join(", ")}. Mexa no k e na consulta no playground BM25 vs. busca vetorial do Laboratório: a coluna RRF de lá usa esta mesma função.`,
        "A fusão decide quem entra no topo, mas ainda com sinais baratos. A próxima aula mostra como um modelo mais caro reordena só esses primeiros candidatos: o reranking.",
      ],
      keyIdea: "RRF = Σ 1 / (k + posição), com k = 60. Sem normalizar, sem α, com qualquer número de listas.",
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
              { id: "rrf", kind: "retrieval", label: `rrf (k = ${K})`, col: 2, row: 0.5 },
              { id: "answer", kind: "answer", label: labels[first.document], col: 3, row: 0.5 },
            ],
            edges: [
              { from: "query", to: "lexical" },
              { from: "query", to: "semantic" },
              { from: "lexical", to: "rrf", label: "top-k" },
              { from: "semantic", to: "rrf", label: "top-k" },
              { from: "rrf", to: "answer", label: "1º" },
            ],
            active: "rrf",
            done: ["query", "lexical", "semantic"],
          },
        ],
      },
      alt: `A consulta vai ao BM25 e à busca vetorial, os dois top-k chegam ao RRF com k = ${K}, em destaque, e ${labels[first.document]} sai em 1º.`,
    },
  ],
  realWorldExample:
    "O Elasticsearch tem um retriever rrf que combina uma busca de texto e uma busca kNN com Reciprocal Rank Fusion, com rank_constant (o k) padrão de 60. O Azure AI Search também usa RRF para fundir os resultados da busca híbrida.",
  code: {
    language: "python",
    source: `def rrf(rankings, k=60):
    scores = {}
    for ranking in rankings:
        for position, doc_id in enumerate(ranking, start=1):
            scores[doc_id] = scores.get(doc_id, 0.0) + 1.0 / (k + position)
    return sorted(scores.items(), key=lambda item: item[1], reverse=True)

bm25 = ["pneu", "carro elétrico", "manual"]
vetorial = ["manual", "carro elétrico", "pneu", "combustível"]
print(rrf([bm25, vetorial]))`,
    caption: "RRF em poucas linhas, com os dois rankings da aula. A função não recebe nenhuma pontuação, só as listas em ordem.",
  },
  tradeOffs: {
    pros: [
      "Não precisa normalizar pontuações de escalas diferentes",
      "Sem α para ajustar; k = 60 funciona bem na maioria dos casos",
      "Funciona com qualquer número de listas: BM25, vetorial, por título, por data",
    ],
    cons: [
      "Ignora a confiança: um 1º lugar com folga vale o mesmo que um 1º lugar apertado",
      "Documento que só uma busca acha fica com metade dos votos, mesmo quando é o certo",
      "Depende de quantos itens cada lista devolve para a fusão",
    ],
    alternatives: ["Combinação ponderada de pontuações normalizadas", "RRF com peso por lista", "Reranking do topo fundido com um cross-encoder"],
  },
  knowledgeCheck: [
    {
      id: "rrf-compute",
      prompt: "Com k = 60, o documento A é 1º no BM25 e não aparece no vetorial; o B é 4º nas duas listas. Quem fica na frente no RRF?",
      options: [
        "A, porque foi 1º em uma lista",
        "B: 2 / 64 ≈ 0,0313 contra 1 / 61 ≈ 0,0164",
        "Empatam",
        "Depende das pontuações do BM25",
      ],
      correct: 1,
      explanation: "A soma só 1 / 61. B soma 1 / 64 duas vezes. Com a curva quase plana do k = 60, aparecer nas duas listas vale quase o dobro.",
      lesson: "07-09",
    },
    {
      id: "rrf-scale",
      prompt: "Um time adiciona uma terceira busca, por título, com pontuações de 0 a 1.000. O que muda para usar RRF?",
      options: [
        "É preciso normalizar as pontuações de 0 a 1.000 antes",
        "Nada além de incluir a terceira lista: o RRF usa só as posições",
        "É preciso trocar o k para 1.000",
        "O RRF só aceita duas listas",
      ],
      correct: 1,
      explanation: "O RRF não olha as pontuações, então a escala de cada busca não importa. Cada lista nova só acrescenta mais uma soma de 1 / (k + posição).",
      lesson: "07-09",
    },
  ],
  related: ["07-08", "07-10", "07-12"],
  references: [
    { title: "Cormack, Clarke & Büttcher (2009), Reciprocal Rank Fusion outperforms Condorcet and individual Rank Learning Methods", url: "https://cormack.uwaterloo.ca/cormacksigir09-rrf.pdf", kind: "paper" },
    { title: "Elasticsearch: Reciprocal rank fusion", url: "https://www.elastic.co/guide/en/elasticsearch/reference/current/rrf.html", kind: "docs" },
    { title: "Azure AI Search: Relevance scoring in hybrid search using RRF", url: "https://learn.microsoft.com/en-us/azure/search/hybrid-search-ranking", kind: "docs" },
  ],
};

export default lesson;
