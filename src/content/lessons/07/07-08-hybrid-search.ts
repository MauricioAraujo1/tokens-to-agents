import { bm25Scores, embed, rankByScore, tokenize, vectorScores } from "../../../lab/retrieval";
import type { LessonContent } from "../../../types/content";
import { bm25VsVectorContent } from "../../playgrounds/bm25-vs-vector";

// Busca híbrida por combinação de pontuações: BM25 e cosseno do playground BM25 vs. vetorial, cada um
// normalizado com min-max sobre os documentos, somados com peso α para o BM25 e 1 − α para o vetorial.
// Todos os números saem das funções de src/lab/retrieval.ts e das contas abaixo.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const { documents, stopwords, concepts, dims, initial } = bm25VsVectorContent;
const stop = new Set(stopwords);
const corpus = documents.map((document) => tokenize(document, stop));
const labels = ["pneu do carro", "manual e óleo", "bolo de cenoura", "carro elétrico", "combustível"];
const documentVectors = corpus.map((words) => embed(words, concepts, dims));

const minMax = (scores: number[]) => {
  const low = Math.min(...scores);
  const high = Math.max(...scores);
  return scores.map((score) => (high > low ? (score - low) / (high - low) : 0));
};
const hybrid = (lexical: number[], semantic: number[], alpha: number) =>
  lexical.map((score, index) => alpha * score + (1 - alpha) * semantic[index]);

const run = (query: string) => {
  const terms = tokenize(query, stop);
  const lexical = bm25Scores(corpus, terms);
  const semantic = vectorScores(documentVectors, embed(terms, concepts, dims));
  return { terms, lexical, semantic, lexicalNorm: minMax(lexical), semanticNorm: minMax(semantic) };
};

const QUERY = initial.query;
const main = run(QUERY);
const ALPHAS = [0, 0.25, 0.5, 0.75, 1];
const alphaTable = ALPHAS.map((alpha) => hybrid(main.lexicalNorm, main.semanticNorm, alpha));
const winners = alphaTable.map((scores) => rankByScore(scores)[0]);
const HALF = ALPHAS.indexOf(0.5);
const halfTop = winners[HALF];
const lexicalTop = rankByScore(main.lexical)[0];
const semanticTop = rankByScore(main.semantic)[0];

const cases = [
  { query: QUERY, target: 1 },
  { query: "elétrico", target: 3 },
];
const caseRuns = cases.map(({ query, target }) => ({ query, target, ...run(query) }));
const reciprocalAt = (scores: number[], target: number) => {
  const position = rankByScore(scores).indexOf(target) + 1;
  return position === 0 ? 0 : 1 / position;
};
const caseTable = ALPHAS.map((alpha) =>
  caseRuns.map((item) => reciprocalAt(hybrid(item.lexicalNorm, item.semanticNorm, alpha), item.target)),
);
const bestAlphas = caseRuns.map((_, column) => ALPHAS.filter((__, row) => caseTable[row][column] === 1));
const sharedAlphas = ALPHAS.filter((_, row) => caseTable[row].every((value) => value === 1));
const alphaList = (alphas: number[]) => {
  if (alphas.length === 0) return "nenhum α";
  if (alphas.length === 1) return `α = ${fixed(alphas[0])}`;
  const contiguous = alphas.every((alpha, index) => index === 0 || ALPHAS.indexOf(alpha) === ALPHAS.indexOf(alphas[index - 1]) + 1);
  return contiguous
    ? `α de ${fixed(alphas[0])} a ${fixed(alphas[alphas.length - 1])}`
    : alphas.map((alpha) => `α = ${fixed(alpha)}`).join(", ");
};

const lesson: LessonContent = {
  id: "07-08",
  subtitle: "Rodar a busca lexical e a semântica para a mesma consulta e juntar as duas listas num ranking só.",
  objectives: [
    "Descrever a arquitetura da busca híbrida: dois índices, duas buscas, uma fusão",
    "Normalizar pontuações de escalas diferentes com min-max",
    "Combinar as pontuações com um peso α e ver o ranking mudar",
    "Explicar por que um α fixo não serve para toda consulta",
  ],
  steps: [
    {
      id: "parallel",
      shortTitle: "Em paralelo",
      title: "Duas buscas, uma resposta",
      tag: "context",
      body: [
        "Um júri com duas testemunhas: uma lembra exatamente as palavras ditas, a outra lembra o que aconteceu. Ouvir as duas dá uma história melhor do que ouvir qualquer uma sozinha. A [[busca híbrida|hybrid-search]] faz isso com buscadores: a mesma consulta vai ao BM25 e à busca vetorial ao mesmo tempo, e as duas listas viram uma.",
        "O desenho tem três partes: um índice invertido, um índice vetorial e uma etapa de fusão. As duas buscas rodam em paralelo, então a latência é a da mais lenta, não a soma. A parte difícil é a fusão: como juntar uma pontuação BM25 sem teto com um cosseno entre 0 e 1?",
      ],
      keyIdea: "Busca híbrida = lexical e semântica em paralelo + uma regra para fundir os rankings.",
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
              { id: "fusion", kind: "retrieval", label: "fusão", col: 2, row: 0.5 },
              { id: "answer", kind: "answer", label: "ranking híbrido", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "query", to: "lexical", label: "termos" },
              { from: "query", to: "semantic", label: "vetor" },
              { from: "lexical", to: "fusion" },
              { from: "semantic", to: "fusion" },
              { from: "fusion", to: "answer" },
            ],
            active: "fusion",
          },
        ],
      },
      alt: "A consulta vai em paralelo ao BM25 e à busca vetorial; as duas listas chegam à fusão, em destaque, que entrega o ranking híbrido.",
    },
    {
      id: "normalize",
      shortTitle: "Normalizar",
      title: "Antes de somar, a mesma régua",
      tag: "mechanism",
      body: [
        `Somar notas de 0 a 10 com notas de 0 a 100 deixa a segunda mandar. Por isso a primeira opção de fusão é a [[normalização de pontuação|score-normalization]] min-max: (s − mín) / (máx − mín). O maior vira 1, o menor vira 0. Para “${QUERY}”, o BM25 vai de 0 a ${fixed(Math.max(...main.lexical))} e o cosseno de 0 a ${fixed(Math.max(...main.semantic))}; depois do min-max, os dois vão de 0 a 1.`,
        `Agora dá para comparar posições relativas: no BM25 normalizado, “${labels[lexicalTop]}” vale 1 e o manual vale ${fixed(main.lexicalNorm[1])}; no cosseno normalizado, o manual vale 1. Atenção ao detalhe: o min-max depende dos documentos que entram na conta. Normalizar sobre o top-10 ou sobre o top-100 dá números diferentes para o mesmo documento.`,
      ],
      keyIdea: "Min-max põe as duas pontuações entre 0 e 1, mas o resultado depende de quem entrou na lista.",
      scene: {
        kind: "pieces",
        layout: "row",
        pieces: [
          {
            id: "lexical-norm",
            piece: "chart",
            kind: "bar",
            series: labels.map((label, index) => ({ label, value: Number(main.lexicalNorm[index].toFixed(3)) })),
            max: 1,
            highlight: lexicalTop,
            color: "info",
          },
          {
            id: "semantic-norm",
            piece: "chart",
            kind: "bar",
            series: labels.map((label, index) => ({ label, value: Number(main.semanticNorm[index].toFixed(3)) })),
            max: 1,
            highlight: semanticTop,
            color: "module-07",
          },
        ],
      },
      alt: `À esquerda, o BM25 normalizado de ${QUERY}, com ${labels[lexicalTop]} em 1; à direita, o cosseno normalizado, com ${labels[semanticTop]} em 1.`,
    },
    {
      id: "alpha",
      shortTitle: "Peso α",
      title: "α decide quem manda",
      tag: "mechanism",
      body: [
        `A pontuação híbrida é α · BM25 + (1 − α) · cosseno, já normalizados. A tabela mostra cada documento para ${ALPHAS.length} valores de α. Com α = 0, só o vetor conta, e “${labels[winners[0]]}” lidera; com α = ${fixed(ALPHAS[1])}, quem lidera é “${labels[winners[1]]}”; com α = ${fixed(ALPHAS[HALF])}, “${labels[halfTop]}”.`,
        `O 1º lugar muda ${new Set(winners).size - 1} vezes enquanto α vai de 0 a 1. Isso é a força e o risco da combinação por peso: α é um botão poderoso, e o valor certo depende da coleção e do tipo de consulta. Escolher α sem um conjunto de avaliação é chutar.`,
      ],
      keyIdea: "Na combinação por peso, α escolhe o vencedor. Ele precisa ser ajustado com dados, não no olho.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "alpha-table",
            piece: "matrix",
            rows: ALPHAS.map((alpha) => `α = ${fixed(alpha)}`),
            cols: labels,
            values: alphaTable,
            scale: { min: 0, max: 1 },
            showValues: true,
            highlight: { row: HALF, col: halfTop },
            color: "module-07",
          },
        ],
      },
      alt: `Tabela da pontuação híbrida de cada documento para α de 0 a 1. O líder muda de ${labels[winners[0]]}, com α = 0, para ${labels[winners[winners.length - 1]]}, com α = 1.`,
    },
    {
      id: "no-single-alpha",
      shortTitle: "Outra consulta",
      title: "O α que acerta uma consulta erra a outra",
      tag: "example",
      body: [
        `Junte uma segunda consulta, “${caseRuns[1].query}”, cujo documento certo é o do carro elétrico. A tabela mostra 1 / posição do documento certo para cada α. Em “${caseRuns[0].query}”, o manual fica em 1º com ${alphaList(bestAlphas[0])}; em “${caseRuns[1].query}”, o carro elétrico fica em 1º com ${alphaList(bestAlphas[1])}.`,
        `Os dois em 1º ao mesmo tempo? ${sharedAlphas.length === 0 ? "Nenhum α consegue." : `Só com ${alphaList(sharedAlphas)}.`} Uma consulta com sinônimo pede peso no vetor; uma com termo exato pede peso no BM25. Daí duas saídas usadas na prática: fundir por posição em vez de pontuação, com o RRF da próxima aula, e reordenar o topo com um modelo mais caro, com o reranking.`,
      ],
      keyIdea: "Um α fixo é um meio-termo: bom em média, nem sempre bom em cada consulta.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "best",
            piece: "metrics-panel",
            metrics: [
              { id: "first", label: caseRuns[0].query, value: alphaList(bestAlphas[0]) },
              { id: "second", label: caseRuns[1].query, value: alphaList(bestAlphas[1]) },
              { id: "both", label: "os dois em 1º", value: alphaList(sharedAlphas), color: "danger" },
            ],
            highlight: "both",
          },
          {
            id: "case-table",
            piece: "matrix",
            rows: ALPHAS.map((alpha) => `α = ${fixed(alpha)}`),
            cols: caseRuns.map((item) => item.query),
            values: caseTable,
            scale: { min: 0, max: 1 },
            showValues: true,
            color: "module-07",
          },
        ],
      },
      alt: `Tabela de 1 dividido pela posição do documento certo, por α, para ${caseRuns.map((item) => item.query).join(" e ")}. ${caseRuns[0].query} acerta com ${alphaList(bestAlphas[0])}; ${caseRuns[1].query}, com ${alphaList(bestAlphas[1])}; os dois juntos, com ${alphaList(sharedAlphas)}.`,
    },
    {
      id: "cost",
      shortTitle: "Custo",
      title: "Dois índices para manter",
      tag: "tradeoff",
      body: [
        "A busca híbrida dobra a indexação: cada documento novo vai para o analisador do índice invertido e para o modelo de embedding do índice vetorial. Os dois precisam ficar sincronizados; um documento apagado num e esquecido no outro volta a aparecer na fusão.",
        "Na consulta, as duas buscas rodam em paralelo, e cada uma devolve o seu top-k para a fusão. Se uma delas cai, a outra sozinha ainda responde, o que é um bom modo degradado. Em troca de mais infraestrutura, a busca híbrida costuma ganhar das duas buscas isoladas, desde que a fusão seja bem escolhida e medida.",
      ],
      keyIdea: "Híbrida = mais infraestrutura e sincronização, em troca de cobrir os pontos cegos de cada busca.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "indexing",
            piece: "block-diagram",
            blocks: [
              { id: "docs", kind: "documents", label: "documentos", col: 0, row: 0.5 },
              { id: "queue", kind: "queue", label: "fila de indexação", col: 1, row: 0.5 },
              { id: "analyzer", kind: "tokens", label: "analisador", col: 2, row: 0 },
              { id: "model", kind: "embedding", label: "embedding", col: 2, row: 1 },
              { id: "lexical", kind: "kv-cache", label: "índice invertido", col: 3, row: 0 },
              { id: "semantic", kind: "vector-db", label: "índice vetorial", col: 3, row: 1 },
            ],
            edges: [
              { from: "docs", to: "queue" },
              { from: "queue", to: "analyzer" },
              { from: "queue", to: "model" },
              { from: "analyzer", to: "lexical", label: "termos" },
              { from: "model", to: "semantic", label: "vetores" },
            ],
            active: "queue",
          },
        ],
      },
      alt: "Documentos entram na fila de indexação, em destaque, que alimenta dois caminhos: o analisador, que grava termos no índice invertido, e o modelo de embedding, que grava vetores no índice vetorial.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Duas listas, uma regra de fusão",
      tag: "summary",
      body: [
        `Para “${QUERY}”, o BM25 sozinho põe “${labels[lexicalTop]}” em 1º; o vetor sozinho, “${labels[semanticTop]}”; a combinação com α = ${fixed(ALPHAS[HALF])}, “${labels[halfTop]}”. A busca híbrida é isso: duas opiniões e uma regra para decidir. A regra por pontuação normaliza e pesa; funciona, mas exige escolher α e depende da normalização.`,
        "A próxima aula apresenta uma regra muito usada na prática, que ignora as pontuações e olha só as posições: Reciprocal Rank Fusion.",
      ],
      keyIdea: "Fusão por pontuação: normalizar, pesar com α, somar. Simples, mas sensível a α e à normalização.",
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
              { id: "fusion", kind: "retrieval", label: `α = ${fixed(ALPHAS[HALF])}`, col: 2, row: 0.5 },
              { id: "answer", kind: "answer", label: labels[halfTop], col: 3, row: 0.5 },
            ],
            edges: [
              { from: "query", to: "lexical" },
              { from: "query", to: "semantic" },
              { from: "lexical", to: "fusion", label: "min-max" },
              { from: "semantic", to: "fusion", label: "min-max" },
              { from: "fusion", to: "answer", label: "1º" },
            ],
            active: "answer",
            done: ["query", "lexical", "semantic", "fusion"],
          },
        ],
      },
      alt: `A consulta passa pelo BM25 e pela busca vetorial, as pontuações são normalizadas com min-max e somadas com α = ${fixed(ALPHAS[HALF])}, e ${labels[halfTop]} sai em 1º, em destaque.`,
    },
  ],
  realWorldExample:
    "O OpenSearch tem uma consulta híbrida pronta: ela roda uma consulta de texto e uma consulta vetorial e combina os resultados num search pipeline, com normalização min-max ou L2 e média aritmética ponderada, exatamente a conta desta aula.",
  code: {
    language: "python",
    source: `def min_max(scores):
    low, high = min(scores), max(scores)
    return [(s - low) / (high - low) if high > low else 0.0 for s in scores]

def hybrid(bm25_scores, cosine_scores, alpha=0.5):
    lexical, semantic = min_max(bm25_scores), min_max(cosine_scores)
    return [alpha * l + (1 - alpha) * s for l, s in zip(lexical, semantic)]

print(hybrid([2.52, 0.79, 0.0, 1.59, 0.0], [0.77, 0.99, 0.0, 0.97, 0.20]))`,
    caption: "Fusão por combinação de pontuações: normaliza cada lista com min-max e soma com peso α. As pontuações de exemplo são as da aula, arredondadas.",
  },
  tradeOffs: {
    pros: [
      "Cobre os pontos cegos de cada busca: termos exatos e sinônimos",
      "As duas buscas rodam em paralelo: a latência é a da mais lenta",
      "Se uma busca falhar, a outra ainda responde",
    ],
    cons: [
      "Dois índices para manter sincronizados",
      "A combinação por pontuação depende de normalização e de um α ajustado",
      "Um α fixo pode piorar consultas que uma busca sozinha acertaria",
    ],
    alternatives: ["Reciprocal Rank Fusion, que usa só as posições", "Reranking do topo com um cross-encoder"],
  },
  knowledgeCheck: [
    {
      id: "raw-sum",
      prompt: "Um sistema soma direto a pontuação BM25 (de 0 a 25) com o cosseno (de 0 a 1). O que acontece com o ranking?",
      options: [
        "Fica equilibrado entre as duas buscas",
        "Fica quase igual ao do BM25: a escala maior domina a soma",
        "Fica igual ao do cosseno",
        "Fica aleatório",
      ],
      correct: 1,
      explanation: "Sem normalização, a pontuação com escala maior decide quase sozinha. É por isso que a fusão por pontuação normaliza antes, ou que se usa fusão por posição.",
      lesson: "07-08",
    },
    {
      id: "minmax-window",
      prompt: "A equipe normaliza com min-max sobre o top-10 de cada busca e depois muda para o top-100. O que pode acontecer?",
      options: [
        "Nada: min-max não depende de quantos documentos entram",
        "As pontuações normalizadas mudam, porque o mínimo muda, e a ordem da fusão pode mudar junto",
        "O BM25 deixa de funcionar",
        "A latência cai",
      ],
      correct: 1,
      explanation: "Min-max usa o menor e o maior valor da lista. Com mais documentos, o mínimo cai, os valores se reescalam e a soma ponderada pode trocar posições.",
      lesson: "07-08",
    },
  ],
  related: ["07-07", "07-09", "08-08"],
  references: [
    { title: "Bruch et al. (2022), An Analysis of Fusion Functions for Hybrid Retrieval", url: "https://arxiv.org/abs/2210.11934", kind: "paper" },
    { title: "OpenSearch: Hybrid search", url: "https://docs.opensearch.org/latest/vector-search/ai-search/hybrid-search/index/", kind: "docs" },
  ],
};

export default lesson;
