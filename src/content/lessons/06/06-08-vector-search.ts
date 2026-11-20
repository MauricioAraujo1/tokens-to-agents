import type { VectorPoint } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Busca vetorial exata (força bruta), calculada aqui: 10 artigos com vetores de 3 dimensões normalizados,
// o cosseno da consulta com todos, o top-3 e o custo de comparar com tudo numa base de 1 milhão de vetores.
// Com vetores unitários, a ordem pelo cosseno é a mesma da distância euclidiana usada pela cena.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");

type Coords3 = [number, number, number];
const dot = (a: number[], b: number[]) => a.reduce((sum, value, index) => sum + value * b[index], 0);
const unit = (a: Coords3): Coords3 => {
  const length = Math.hypot(...a);
  return [a[0] / length, a[1] / length, a[2] / length];
};

// Eixos ilustrativos: energia, cozinha, finanças.
const articles: Array<{ id: string; label: string; raw: Coords3 }> = [
  { id: "led", label: "LED", raw: [0.9, 0.1, 0.3] },
  { id: "janelas", label: "janelas", raw: [0.85, 0.05, 0.2] },
  { id: "solar", label: "solar", raw: [0.8, 0.2, 0.35] },
  { id: "conta", label: "conta de luz", raw: [0.7, 0.05, 0.7] },
  { id: "pao", label: "pão", raw: [0.05, 0.95, 0.1] },
  { id: "panela", label: "panela", raw: [0.25, 0.9, 0.1] },
  { id: "airfryer", label: "air fryer", raw: [0.6, 0.7, 0.3] },
  { id: "cdb", label: "CDB", raw: [0.05, 0.05, 0.95] },
  { id: "planilha", label: "planilha", raw: [0.2, 0.1, 0.9] },
  { id: "cartao", label: "cartão", raw: [0.1, 0.15, 0.85] },
];
const QUERY_TEXT = "como economizar energia em casa";
const query = unit([0.85, 0.1, 0.4]);
const K = 3;

const scored = articles.map((article) => ({ ...article, vector: unit(article.raw), score: dot(query, unit(article.raw)) }));
const ranked = [...scored].sort((a, b) => b.score - a.score);
const topK = ranked.slice(0, K);
const kth = topK[K - 1];
const firstOut = ranked[K];

const points: VectorPoint[] = [
  ...scored.map((article) => ({ id: article.id, label: article.label, coords: article.vector })),
  { id: "query", label: "consulta", coords: query, color: "brand" },
];

// Passo 5: custo de uma consulta de força bruta.
const D = 768;
const FLOAT32 = 4;
const GB = 1e9;
const sizes = [10_000, 1_000_000, 100_000_000];
const QPS = 100;
const costFor = (count: number) => ({
  count,
  multiplies: count * D,
  gbRead: (count * D * FLOAT32) / GB,
});
const costs = sizes.map(costFor);
const million = costs[1];

const lesson: LessonContent = {
  id: "06-08",
  subtitle:
    "Como achar os k vetores mais parecidos com a consulta: comparar com todos, guardar os melhores num heap e entender por que essa conta exata fica cara quando a base cresce.",
  objectives: [
    "Descrever a busca vetorial como o problema dos k vizinhos mais próximos",
    "Executar à mão uma busca exata: um score por documento e o top-k",
    "Selecionar o top-k com um heap de tamanho k, sem ordenar tudo",
    "Calcular o custo de uma busca de força bruta e saber quando ela basta",
  ],
  steps: [
    {
      id: "librarian",
      shortTitle: "Bibliotecário",
      title: "Um bibliotecário que lê todas as fichas",
      tag: "context",
      body: [
        "Peça a um bibliotecário os três livros mais parecidos com o seu. O jeito mais honesto é ele pegar cada ficha do catálogo, comparar com o seu pedido e guardar as três melhores. É lento, mas nunca erra. Essa é a [[busca vetorial|vector-search]] exata: dado o vetor da consulta, devolver os k vetores mais próximos da base.",
        "O nome técnico é busca dos k vizinhos mais próximos (k-NN), a mesma ideia do classificador [[k-NN|knn]], usada aqui para recuperar e não para votar. O resultado é o [[top-k|top-k]]: os ids dos k documentos com os seus scores, que a aplicação usa para mostrar resultados ou montar um prompt.",
      ],
      keyIdea: "Busca vetorial = achar os k vetores mais próximos da consulta. A versão exata compara com todos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "consulta", col: 0, row: 0 },
              { id: "vector", kind: "embedding", label: "vetor", col: 1, row: 0 },
              { id: "db", kind: "vector-db", label: `${articles.length} artigos`, col: 2, row: 0 },
              { id: "search", kind: "retrieval", label: `top-${K}`, col: 3, row: 0 },
              { id: "answer", kind: "answer", label: "ids + scores", col: 3, row: 1 },
            ],
            edges: [
              { from: "user", to: "vector", label: "texto" },
              { from: "vector", to: "db", label: "comparar" },
              { from: "db", to: "search", label: "scores" },
              { from: "search", to: "answer" },
            ],
            active: "search",
          },
        ],
      },
      alt: `A consulta vira vetor, é comparada com os ${articles.length} artigos do banco, e a busca guarda o top-${K}, em destaque, devolvendo ids e scores.`,
    },
    {
      id: "score-all",
      shortTitle: "Comparar tudo",
      title: "Um score para cada documento",
      tag: "mechanism",
      body: [
        `A consulta “${QUERY_TEXT}” é comparada com os ${articles.length} artigos. Como todos os vetores estão normalizados, o score é um produto escalar, que é o cosseno. A cena mostra os ${articles.length} scores e a linha do top-${K}: ${topK.map((article) => `${article.label} (${fixed(article.score)})`).join(", ")}.`,
        `O primeiro de fora é “${firstOut.label}”, com ${fixed(firstOut.score)}, perto do terceiro colocado, ${fixed(kth.score)}. Essa é a [[busca por força bruta|brute-force-search]]: nenhum atalho, todos os documentos pontuados. Por isso ela é exata, e também por isso o custo cresce em linha reta com o tamanho da base.`,
      ],
      keyIdea: "Força bruta: N produtos escalares, um por documento. Exato por definição, custo proporcional a N.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "scores",
            piece: "chart",
            kind: "bar",
            series: scored.map((article) => ({ label: article.label, value: Number(article.score.toFixed(2)) })),
            max: 1,
            cutoff: { mode: "threshold", value: Number(kth.score.toFixed(2)), label: `top-${K}` },
            color: "module-06",
          },
        ],
      },
      alt: `Barras com o cosseno da consulta com os ${articles.length} artigos. Acima da linha do top-${K}: ${topK.map((article) => `${article.label} ${fixed(article.score)}`).join(", ")}.`,
    },
    {
      id: "neighbors",
      shortTitle: "Vizinhos",
      title: "Os k vizinhos mais próximos no espaço",
      tag: "mechanism",
      body: [
        `No espaço, os mesmos ${K} artigos são os pontos mais próximos da consulta. A cena desenha os vetores de 3 dimensões normalizados, que ficam todos sobre uma esfera: os de energia de um lado, os de cozinha e os de finanças em outras regiões.`,
        `A “${firstOut.label}”, que mistura energia e finanças, fica entre os dois grupos e quase entra no top-${K}. É assim em bases reais: entre o k-ésimo e o (k + 1)-ésimo resultado a diferença costuma ser pequena, e a escolha de k decide o que a aplicação vê.`,
      ],
      keyIdea: "O top-k é a vizinhança da consulta. Perto da fronteira, pequenas diferenças decidem quem entra.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [{ id: "space", piece: "vector-space", points, query: "query", neighbors: K }],
      },
      alt: `Os artigos como pontos numa esfera, agrupados por assunto. Os ${K} vizinhos da consulta são ${topK.map((article) => article.label).join(", ")}.`,
    },
    {
      id: "heap",
      shortTitle: "Heap",
      title: "Guardar só os k melhores enquanto compara",
      tag: "mechanism",
      body: [
        `Não é preciso ordenar os N scores para achar os ${K} melhores. Basta um heap de tamanho k: cada score novo é comparado com o pior dos guardados e só entra se for melhor. Assim a seleção custa O(N log k) em vez de O(N log N), e a memória fica em k itens.`,
        "Somando tudo, a busca exata custa O(N · d) para pontuar, mais a seleção. Na prática, bibliotecas como FAISS e NumPy fazem a pontuação como uma multiplicação de matrizes, que a CPU e a GPU executam muito bem, e a seleção com seleção parcial (argpartition) ou um heap por consulta.",
      ],
      keyIdea: "Pontuar custa N · d; selecionar com heap custa N log k. Ninguém ordena a base inteira.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "pipeline",
            piece: "pipeline",
            stages: [
              { id: "query", label: "vetor da consulta" },
              { id: "score", label: "N produtos escalares" },
              { id: "heap", label: `heap de tamanho ${K}`, color: "module-06" },
              { id: "sort", label: `ordenar os ${K}` },
              { id: "out", label: "ids + scores" },
            ],
            active: "heap",
            done: ["query", "score"],
          },
        ],
      },
      alt: `Pipeline da busca exata: vetor da consulta, N produtos escalares, heap de tamanho ${K} em destaque, ordenação dos ${K} e saída com ids e scores.`,
    },
    {
      id: "cost",
      shortTitle: "Custo",
      title: "Quanto custa comparar com tudo",
      tag: "example",
      body: [
        `Com d = ${integer(D)} em float32, uma consulta numa base de ${integer(million.count)} vetores faz ${integer(million.multiplies / 1e6)} milhões de multiplicações e lê ${fixed(million.gbRead)} GB da memória. A ${QPS} consultas por segundo, são ${integer(million.gbRead * QPS)} GB lidos por segundo: o gargalo é a banda de memória, não a conta.`,
        `Com ${integer(costs[0].count)} vetores, a mesma consulta lê ${fixed(costs[0].gbRead * 1000, 1)} MB e termina rápido em qualquer máquina. Com ${integer(costs[2].count / 1e6)} milhões, lê ${integer(costs[2].gbRead)} GB por consulta. A força bruta é a escolha certa para bases pequenas e para medir a qualidade de outros métodos; para bases grandes, é preciso não comparar com todo mundo.`,
      ],
      keyIdea: "Força bruta lê N × d × 4 bytes por consulta. Em bases pequenas é ótima; em grandes, a memória não acompanha.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "cost",
            piece: "metrics-panel",
            metrics: [
              { id: "small", label: `${integer(costs[0].count)} vetores, lidos por consulta`, value: `${fixed(costs[0].gbRead * 1000, 1)} MB`, color: "success" },
              { id: "million", label: `${integer(million.count)} vetores, lidos por consulta`, value: `${fixed(million.gbRead)} GB` },
              { id: "qps", label: `1 milhão a ${QPS} consultas/s`, value: `${integer(million.gbRead * QPS)} GB/s`, color: "danger" },
              { id: "huge", label: `${integer(costs[2].count / 1e6)} milhões, lidos por consulta`, value: `${integer(costs[2].gbRead)} GB`, color: "danger" },
            ],
            highlight: "qps",
          },
        ],
      },
      alt: `Custo da força bruta com d = ${D}: ${fixed(costs[0].gbRead * 1000, 1)} MB por consulta com ${integer(costs[0].count)} vetores, ${fixed(million.gbRead)} GB com 1 milhão e ${integer(million.gbRead * QPS)} GB/s a ${QPS} consultas por segundo.`,
    },
    {
      id: "ground-truth",
      shortTitle: "Gabarito",
      title: "A busca exata é o gabarito",
      tag: "tradeoff",
      body: [
        "Mesmo quando a base é grande demais para a força bruta em produção, ela continua útil: é o gabarito. Para saber se um índice rápido está achando os vizinhos certos, você roda a busca exata numa amostra de consultas e compara as duas listas. Benchmarks públicos como o ANN-Benchmarks fazem exatamente isso.",
        "A próxima aula abre a outra alternativa: organizar os vetores com antecedência, num índice, para que cada consulta olhe só uma fração da base. O preço é que a resposta pode deixar de ser exata, e o gabarito da força bruta é o que mede quanto.",
      ],
      keyIdea: "Use força bruta para bases pequenas e como gabarito. Para bases grandes, índices aproximados, medidos contra ela.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "queries", kind: "user", label: "consultas teste", col: 0, row: 0.5 },
              { id: "flat", kind: "vector-db", label: "força bruta", col: 1, row: 0 },
              { id: "index", kind: "retrieval", label: "índice rápido", col: 1, row: 1 },
              { id: "eval", kind: "eval", label: "comparar listas", col: 2, row: 0.5 },
              { id: "decide", kind: "server", label: "produção", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "queries", to: "flat" },
              { from: "queries", to: "index" },
              { from: "flat", to: "eval", label: "gabarito" },
              { from: "index", to: "eval", label: "resultado" },
              { from: "eval", to: "decide", label: "aprovado" },
            ],
            active: "eval",
          },
        ],
      },
      alt: "Uma amostra de consultas passa pela força bruta, que dá o gabarito, e por um índice rápido; a comparação das listas, em destaque, decide se o índice vai para produção.",
    },
  ],
  realWorldExample:
    "No FAISS, a biblioteca de busca vetorial da Meta, o índice IndexFlatL2 (ou IndexFlatIP, para produto escalar) é exatamente a força bruta desta aula: guarda os vetores sem compressão e compara a consulta com todos. A documentação o apresenta como o índice exato, de referência, e os outros índices da biblioteca são medidos contra ele. O ANN-Benchmarks segue a mesma lógica: cada conjunto de dados vem com os vizinhos exatos já calculados, e cada algoritmo é avaliado pelo quanto acerta deles.",
  code: {
    language: "python",
    source: `import faiss
import numpy as np

d = 384
docs = np.random.default_rng(0).normal(size=(10_000, d)).astype("float32")
faiss.normalize_L2(docs)                 # vetores unitários: produto escalar = cosseno

index = faiss.IndexFlatIP(d)             # força bruta, exata
index.add(docs)

query = docs[:1].copy()
scores, ids = index.search(query, 3)     # top-3
print(ids, scores)

# A mesma busca em NumPy, com seleção parcial em vez de ordenar tudo.
all_scores = docs @ query[0]
top = np.argpartition(-all_scores, 3)[:3]
print(top[np.argsort(-all_scores[top])])`,
    caption: "Busca exata com o IndexFlatIP do FAISS e a mesma conta em NumPy com argpartition, que seleciona o top-k sem ordenar a base.",
  },
  tradeOffs: {
    pros: [
      "Exata: sempre devolve os verdadeiros k vizinhos mais próximos",
      "Sem índice para construir ou manter: inserir e apagar é imediato",
      "Serve de gabarito para medir índices aproximados",
    ],
    cons: [
      "Custo linear: cada consulta lê todos os N × d números",
      "Em bases grandes, a banda de memória limita as consultas por segundo",
      "Não escala bem para muitas consultas simultâneas sem muito hardware",
    ],
    alternatives: ["Índices aproximados, como IVF e HNSW (aulas 06-09 e 06-12)", "Força bruta em GPU para bases médias com muitas consultas"],
  },
  knowledgeCheck: [
    {
      id: "heap-size",
      prompt: "Uma busca exata precisa do top-10 entre 2 milhões de scores. Qual é o jeito eficiente de selecionar?",
      options: [
        "Ordenar os 2 milhões de scores e pegar os 10 primeiros",
        "Manter um heap com os 10 melhores e trocar o pior sempre que chega um score maior",
        "Sortear 10 documentos",
        "Calcular os scores duas vezes",
      ],
      correct: 1,
      explanation: "O heap de tamanho k seleciona em O(N log k), guardando só 10 itens, em vez de O(N log N) para ordenar tudo.",
      lesson: "06-08",
    },
    {
      id: "when-brute-force",
      prompt: "Um app interno tem 20 mil trechos com vetores de 768 dimensões e poucas consultas por minuto. O que faz sentido?",
      options: [
        "Montar um cluster com índice aproximado e réplicas",
        "Força bruta: a consulta lê cerca de 61 MB e é exata, sem índice para manter",
        "Reduzir os vetores para 2 dimensões",
        "Não usar busca vetorial",
      ],
      correct: 1,
      explanation: "20.000 × 768 × 4 bytes ≈ 61 MB por consulta, pouco para qualquer máquina. A força bruta é exata e simples; um índice aproximado só se paga em bases bem maiores.",
      lesson: "06-08",
    },
  ],
  related: ["06-07", "06-09", "01-02"],
  references: [
    { title: "FAISS: documentação", url: "https://faiss.ai/", kind: "docs" },
    { title: "Aumüller, Bernhardsson e Faithfull (2018), ANN-Benchmarks", url: "https://arxiv.org/abs/1807.05614", kind: "paper" },
    { title: "scikit-learn: Nearest Neighbors", url: "https://scikit-learn.org/stable/modules/neighbors.html", kind: "docs" },
  ],
};

export default lesson;
