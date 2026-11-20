import { cosineSimilarity } from "../../../lab/embeddings";
import type { GraphNode } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Indexação e recuperação com contas no arquivo. Os 8 chunks do assistente de RH têm vetores de brinquedo com
// 4 traços [home office, dinheiro, folga, refeitório], normalizados na indexação. A busca calcula o cosseno com a
// pergunta, ordena, corta no top-k e aplica o limiar. Uma pergunta fora da base mostra o caminho sem resultado.
// No fim, uma busca gulosa num grafo de proximidade de 10 nós, calculada aqui, mostra a ideia dos índices ANN.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");

const normalize = (vector: readonly number[]) => {
  const length = Math.hypot(...vector);
  return vector.map((value) => value / length);
};

interface IndexedChunk {
  id: string;
  label: string;
  vector: number[];
}

const raw = [
  { id: "c1", label: "home office 3 dias", vector: [1, 0, 0.1, 0] },
  { id: "c2", label: "ajuda de custo", vector: [0.8, 0.5, 0, 0] },
  { id: "c3", label: "equipamento", vector: [0.6, 0.6, 0, 0] },
  { id: "c4", label: "reembolso", vector: [0, 1, 0, 0] },
  { id: "c5", label: "viagens", vector: [0.1, 0.9, 0.2, 0] },
  { id: "c6", label: "férias", vector: [0, 0, 1, 0] },
  { id: "c7", label: "vender férias", vector: [0, 0.5, 0.9, 0] },
  { id: "c8", label: "feriados", vector: [0.2, 0, 0.8, 0] },
];
/** Indexar: normalizar uma vez e guardar. A partir daí, o cosseno é só o produto escalar. */
const index: IndexedChunk[] = raw.map((chunk) => ({ ...chunk, vector: normalize(chunk.vector) }));

const QUESTION = "Posso trabalhar de casa quantos dias?";
const questionVector = normalize([0.9, 0.1, 0.2, 0]);
const OUT_OF_SCOPE = "Qual é o cardápio do refeitório?";
const outOfScopeVector = normalize([0.1, 0.1, 0.1, 1]);

const TOP_K = 4;
const THRESHOLD = 0.5;

/** O retriever: pontua todos os chunks, ordena, corta no top-k e descarta o que fica abaixo do limiar. */
function retrieve(query: readonly number[], k: number, threshold: number) {
  const ranked = index
    .map((chunk) => ({ chunk, score: cosineSimilarity(chunk.vector, query) }))
    .sort((a, b) => b.score - a.score);
  const topK = ranked.slice(0, k);
  return { ranked, topK, kept: topK.filter((entry) => entry.score >= threshold) };
}

const inScope = retrieve(questionVector, TOP_K, THRESHOLD);
const rejected = inScope.topK.filter((entry) => entry.score < THRESHOLD);
const outScope = retrieve(outOfScopeVector, TOP_K, THRESHOLD);
const outBest = outScope.ranked[0];

// Passo 5: força bruta compara a pergunta com todos os vetores.
const PRODUCTION_CHUNKS = 1_000_000;
const PRODUCTION_DIMS = 768;
const bruteForceOps = PRODUCTION_CHUNKS * PRODUCTION_DIMS;

// Busca gulosa num grafo de proximidade: anda para o vizinho mais perto da pergunta até não melhorar.
const graphNodes: GraphNode[] = [
  { id: "n0", label: "entrada", x: 0.1, y: 0.15 },
  { id: "n1", label: "n1", x: 0.3, y: 0.1 },
  { id: "n2", label: "n2", x: 0.25, y: 0.4 },
  { id: "n3", label: "n3", x: 0.5, y: 0.25 },
  { id: "n4", label: "n4", x: 0.45, y: 0.6 },
  { id: "n5", label: "n5", x: 0.7, y: 0.15 },
  { id: "n6", label: "n6", x: 0.7, y: 0.5 },
  { id: "n7", label: "n7", x: 0.6, y: 0.9 },
  { id: "n8", label: "n8", x: 0.9, y: 0.35 },
  { id: "n9", label: "n9", x: 0.9, y: 0.75 },
];
const graphEdges: Array<[string, string]> = [
  ["n0", "n1"],
  ["n0", "n2"],
  ["n1", "n3"],
  ["n2", "n3"],
  ["n2", "n4"],
  ["n3", "n5"],
  ["n3", "n6"],
  ["n4", "n6"],
  ["n4", "n7"],
  ["n5", "n8"],
  ["n6", "n8"],
  ["n6", "n9"],
  ["n7", "n9"],
  ["n8", "n9"],
];
const target = { x: 0.85, y: 0.7 };
const byId = new Map(graphNodes.map((node) => [node.id, node]));
const distanceTo = (id: string) => {
  const node = byId.get(id) as GraphNode;
  return Math.hypot(node.x - target.x, node.y - target.y);
};
const neighborsOf = (id: string) => graphEdges.flatMap(([a, b]) => (a === id ? [b] : b === id ? [a] : []));

function greedySearch(entry: string) {
  const path = [entry];
  const evaluated = new Set([entry]);
  let current = entry;
  for (;;) {
    const candidates = neighborsOf(current);
    candidates.forEach((id) => evaluated.add(id));
    const best = candidates.reduce((winner, id) => (distanceTo(id) < distanceTo(winner) ? id : winner), current);
    if (best === current) return { path, evaluated: evaluated.size };
    path.push(best);
    current = best;
  }
}
const walk = greedySearch("n0");
const found = walk.path[walk.path.length - 1];
const exact = graphNodes.reduce((winner, node) => (distanceTo(node.id) < distanceTo(winner.id) ? node : winner)).id;
const sameAsExact = found === exact;

const scoreSeries = inScope.ranked.map((entry) => ({ label: entry.chunk.label, value: Number(entry.score.toFixed(2)) }));
const keptLabels = inScope.kept.map((entry) => entry.chunk.label);
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const pathLabels = walk.path.map((id) => (byId.get(id) as GraphNode).label);
const listing = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`);

const lesson: LessonContent = {
  id: "08-08",
  subtitle: "Como o índice guarda os vetores, como o retriever acha os vizinhos da pergunta e quando é melhor devolver nada.",
  objectives: [
    "Separar a indexação, feita antes, da recuperação, feita a cada pergunta",
    "Calcular o top-k pelo cosseno e aplicar um limiar de similaridade",
    "Tratar a pergunta fora da base com o caminho sem resultado",
    "Explicar por que bases grandes usam índices aproximados em vez de força bruta",
  ],
  steps: [
    {
      id: "catalog",
      shortTitle: "Catálogo",
      title: "O catálogo é montado antes da primeira pergunta",
      tag: "context",
      body: [
        "Numa biblioteca antiga, ninguém procura um livro andando por todas as estantes: o catálogo de fichas foi organizado antes, e a consulta começa por ele. No RAG, a indexação é esse trabalho prévio. Os chunks já têm embeddings, e o índice os guarda de um jeito que a busca seja rápida.",
        `A cada pergunta acontece a outra metade: a recuperação. O [[retriever|retriever]] gera o vetor da pergunta com o mesmo modelo, pede ao [[banco vetorial|vector-database]] os vizinhos mais próximos e devolve os chunks com os seus scores. No exemplo da aula, o índice tem ${index.length} chunks do manual de RH, com vetores normalizados na indexação: assim o cosseno vira um produto escalar.`,
      ],
      keyIdea: "Indexar é preparar o catálogo uma vez; recuperar é consultá-lo a cada pergunta.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "chunks", kind: "documents", label: `${index.length} chunks`, col: 0, row: 0 },
              { id: "user", kind: "user", label: "pergunta", col: 0, row: 1 },
              { id: "model", kind: "embedding", label: "embedding", col: 1, row: 1 },
              { id: "index", kind: "vector-db", label: "índice", col: 2, row: 0.5 },
              { id: "search", kind: "retrieval", label: `top-${TOP_K}`, col: 3, row: 0.5 },
            ],
            edges: [
              { from: "chunks", to: "index", label: "indexar antes" },
              { from: "user", to: "model" },
              { from: "model", to: "index", label: "consulta" },
              { from: "index", to: "search", label: "vizinhos" },
            ],
            active: "index",
          },
        ],
      },
      alt: `Os ${index.length} chunks são indexados antes. Na hora da pergunta, ela vira embedding e consulta o índice, em destaque, que devolve os vizinhos para o top-${TOP_K}.`,
    },
    {
      id: "neighbors",
      shortTitle: "Vizinhos",
      title: "A pergunta cai num ponto e o retriever olha em volta",
      tag: "mechanism",
      body: [
        `A pergunta “${QUESTION}” vira um ponto no mesmo espaço dos chunks. Os chunks de home office estão perto dela; os de férias e reembolso, longe. A cena mostra três dos quatro traços dos vetores, e os vizinhos acesos são os mais próximos da pergunta.`,
        `O retriever calcula a [[similaridade de cosseno|cosine-similarity]] entre a pergunta e cada chunk. Como todos os vetores têm norma 1, ordenar pelo cosseno é o mesmo que ordenar pela distância: d² = 2 − 2 · cos. Os três mais parecidos são ${listing(inScope.ranked.slice(0, 3).map((entry) => `${entry.chunk.label} (${fixed(entry.score)})`))}.`,
      ],
      keyIdea: "Com vetores normalizados, maior cosseno e menor distância escolhem os mesmos vizinhos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "space",
            piece: "vector-space",
            points: [
              ...index.map((chunk) => ({
                id: chunk.id,
                label: chunk.label,
                coords: [chunk.vector[0], chunk.vector[1], chunk.vector[2]] as [number, number, number],
                color: "module-08" as const,
              })),
              { id: "q", label: "pergunta", coords: [questionVector[0], questionVector[1], questionVector[2]], color: "brand" },
            ],
            query: "q",
            neighbors: 3,
          },
        ],
      },
      alt: `Espaço com os ${index.length} chunks e a pergunta. Os três vizinhos mais próximos estão em destaque: ${listing(inScope.ranked.slice(0, 3).map((entry) => entry.chunk.label))}.`,
    },
    {
      id: "cut",
      shortTitle: "Top-k e limiar",
      title: "Dois cortes: quantos e quão bons",
      tag: "mechanism",
      body: [
        `Pedir “os ${TOP_K} melhores” sempre devolve ${TOP_K}, mesmo quando o quarto colocado não tem nada a ver. O [[top-k|top-k]] limita a quantidade; o [[limiar de similaridade|similarity-threshold]] limita a qualidade. São dois cortes diferentes, e o retriever aplica os dois.`,
        `Com k = ${TOP_K} e limiar ${fixed(THRESHOLD)}, o top-${TOP_K} traz ${listing(inScope.topK.map((entry) => entry.chunk.label))}. ${rejected.length > 0 ? `${capitalize(listing(rejected.map((entry) => `${entry.chunk.label} (${fixed(entry.score)})`)))} fica abaixo do limiar e sai` : "Todos passam do limiar"}: sobram ${inScope.kept.length} chunks. O valor do limiar só vale para um modelo de embedding: cada modelo espalha os scores de um jeito, então ele é calibrado com perguntas de teste.`,
      ],
      keyIdea: "Top-k diz quantos chunks no máximo; o limiar diz quais merecem entrar.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "scores",
            piece: "chart",
            kind: "bar",
            series: scoreSeries,
            max: 1,
            cutoff: { mode: "threshold", value: THRESHOLD, label: `limiar ${fixed(THRESHOLD)}` },
            highlight: inScope.kept.length - 1,
            color: "module-08",
          },
        ],
      },
      alt: `Scores dos ${index.length} chunks em ordem: ${scoreSeries.map((entry) => `${entry.label} ${fixed(entry.value)}`).join(", ")}. Passam do limiar de ${fixed(THRESHOLD)}: ${listing(keptLabels)}.`,
    },
    {
      id: "nothing",
      shortTitle: "Sem resultado",
      title: "Quando a base não sabe, o retriever devolve nada",
      tag: "example",
      body: [
        `Alguém pergunta “${OUT_OF_SCOPE}”. O manual de RH não fala disso. Sem limiar, o retriever entregaria os ${TOP_K} “menos piores” e o modelo tentaria responder com trechos que não falam do assunto.`,
        `Com o limiar, a conta decide: o melhor score é ${fixed(outBest.score)}, de ${outBest.chunk.label}, abaixo de ${fixed(THRESHOLD)}. O retriever devolve uma lista vazia, e a aplicação segue o caminho alternativo: diz que não encontrou a informação e indica onde procurar. Lista vazia é uma resposta válida do retriever, e é ela que evita a alucinação com fonte falsa.`,
      ],
      keyIdea: "Nenhum chunk acima do limiar é um resultado: trate-o como “não sei”, não como erro.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "best",
            piece: "metrics-panel",
            metrics: [
              { id: "best", label: "melhor score", value: fixed(outBest.score), color: "danger" },
              { id: "threshold", label: "limiar", value: fixed(THRESHOLD) },
              { id: "kept", label: "chunks devolvidos", value: String(outScope.kept.length) },
            ],
            highlight: "best",
          },
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "cardápio?", col: 0, row: 0 },
              { id: "index", kind: "vector-db", label: "índice", col: 1, row: 0 },
              { id: "search", kind: "retrieval", label: `limiar ${fixed(THRESHOLD)}`, col: 2, row: 0 },
              { id: "context", kind: "context", label: "contexto", col: 3, row: 0 },
              { id: "empty", kind: "no-result", label: "não encontrei", col: 3, row: 1 },
            ],
            edges: [
              { from: "user", to: "index" },
              { from: "index", to: "search", label: `${TOP_K} fracos` },
              { from: "search", to: "context" },
              { from: "search", to: "empty", label: "lista vazia", variant: "alternative" },
            ],
            active: "empty",
          },
        ],
      },
      alt: `A pergunta sobre o cardápio consulta o índice; o melhor score, ${fixed(outBest.score)}, fica abaixo do limiar de ${fixed(THRESHOLD)}, e o fluxo segue pelo caminho tracejado até “não encontrei”, em destaque.`,
    },
    {
      id: "graph",
      shortTitle: "Força bruta",
      title: "Comparar com todos não escala",
      tag: "tradeoff",
      body: [
        `Com ${index.length} chunks, comparar a pergunta com todos é instantâneo. Com ${integer(PRODUCTION_CHUNKS)} chunks de ${PRODUCTION_DIMS} dimensões, a força bruta faz ${integer(bruteForceOps)} multiplicações por pergunta. Funciona, e dá o resultado exato, mas o custo cresce em linha reta com a base.`,
        `Os índices [[ANN|ann]] trocam um pouco de exatidão por velocidade. A cena mostra a ideia do HNSW num grafo de proximidade: a busca começa num nó de entrada e sempre pula para o vizinho mais perto da pergunta, até não melhorar. Aqui ela percorre ${listing(pathLabels)}, calcula ${walk.evaluated} distâncias em vez de ${graphNodes.length} e ${sameAsExact ? "chega ao mesmo vizinho que a força bruta" : "para num vizinho diferente do exato"}. Num grafo pequeno a economia é pouca; com milhões de nós, o HNSW usa camadas de grafos e o número de passos cresce devagar, perto do logaritmo do tamanho da base.`,
      ],
      keyIdea: "Força bruta é exata e linear; ANN é aproximado e muito mais rápido em bases grandes.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "cost",
            piece: "metrics-panel",
            metrics: [
              { id: "brute", label: `força bruta, ${integer(PRODUCTION_CHUNKS)} chunks`, value: `${integer(bruteForceOps)} mult.` },
              { id: "walk", label: "distâncias no grafo", value: `${walk.evaluated} de ${graphNodes.length}`, color: "success" },
              { id: "hops", label: "saltos", value: String(walk.path.length - 1) },
            ],
            highlight: "walk",
          },
          {
            id: "hnsw",
            piece: "graph",
            nodes: [...graphNodes, { id: "q", label: "pergunta", x: target.x, y: target.y, color: "brand" }],
            edges: graphEdges.map(([from, to]) => ({ from, to })),
            path: walk.path,
            visited: walk.path,
            highlight: [found],
          },
        ],
      },
      alt: `Grafo de proximidade com 10 nós e a pergunta. A busca gulosa sai da entrada e percorre ${listing(pathLabels)}, calculando ${walk.evaluated} distâncias. Força bruta com ${integer(PRODUCTION_CHUNKS)} chunks faria ${integer(bruteForceOps)} multiplicações.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Do índice aos chunks escolhidos",
      tag: "summary",
      body: [
        "Indexar é normalizar e guardar os vetores numa estrutura de busca. Recuperar é gerar o vetor da pergunta, achar os vizinhos, cortar no top-k e aplicar o limiar. Quando nada passa, a lista vazia vira “não encontrei”.",
        "O que o retriever devolve ainda é uma pilha de trechos soltos. A próxima aula transforma essa pilha no contexto do prompt: o que entra, em que ordem e dentro de quantos tokens.",
      ],
      keyIdea: "Retriever bom devolve poucos chunks bons, ou nenhum, e nunca chunks ruins só para completar o k.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "steps",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "index", label: "indexar vetores" },
              { id: "embed", label: "vetor da pergunta" },
              { id: "search", label: "vizinhos (ANN)" },
              { id: "topk", label: `top-${TOP_K}`, color: "module-08" },
              { id: "threshold", label: `limiar ${fixed(THRESHOLD)}`, color: "module-08" },
              { id: "context", label: "contexto", color: "brand" },
            ],
          },
        ],
      },
      alt: `Fluxo em chips: indexar vetores, vetor da pergunta, vizinhos por ANN, top-${TOP_K}, limiar de ${fixed(THRESHOLD)} e contexto.`,
    },
  ],
  realWorldExample:
    "O pgvector, extensão do PostgreSQL, faz busca exata por padrão e oferece os índices aproximados HNSW e IVFFlat. Com um índice aproximado, a mesma consulta pode devolver vizinhos diferentes da busca exata, e parâmetros como hnsw.ef_search trocam recall por velocidade. Times que guardam os chunks no próprio Postgres filtram, ordenam pela distância e cortam com LIMIT na mesma consulta SQL.",
  code: {
    language: "python",
    source: `import faiss
import numpy as np

def build_index(chunk_vectors: np.ndarray) -> faiss.Index:
    vectors = chunk_vectors.astype("float32")
    faiss.normalize_L2(vectors)                  # norma 1: produto interno = cosseno
    index = faiss.IndexFlatIP(vectors.shape[1])  # busca exata, compara com todos
    index.add(vectors)
    return index

def retrieve(index, query_vector, k=4, min_score=0.5):
    query = query_vector.astype("float32").reshape(1, -1)
    faiss.normalize_L2(query)
    scores, ids = index.search(query, k)
    return [(int(i), float(s)) for i, s in zip(ids[0], scores[0]) if s >= min_score]`,
    caption: "Um retriever com FAISS: índice exato por produto interno sobre vetores normalizados, top-k e limiar. Para bases grandes, troca-se o IndexFlatIP por um índice aproximado.",
  },
  tradeOffs: {
    pros: [
      "A indexação acontece uma vez; cada pergunta custa só um embedding e uma busca",
      "O limiar deixa o sistema dizer “não encontrei” em vez de responder com trechos ruins",
      "Índices ANN mantêm a busca rápida com milhões de chunks",
    ],
    cons: [
      "O limiar depende do modelo de embedding e precisa ser calibrado com perguntas de teste",
      "Índices aproximados podem perder um vizinho que a força bruta acharia",
      "O índice ocupa memória e precisa ser atualizado quando os documentos mudam",
    ],
    alternatives: [
      "Busca exata (força bruta), para bases pequenas ou para medir o recall do índice aproximado",
      "Busca lexical, quando a pergunta traz códigos e nomes exatos",
      "Busca híbrida, somando os dois rankings",
    ],
  },
  knowledgeCheck: [
    {
      id: "k-and-threshold",
      prompt: "Com k = 5 e limiar 0,60, a busca devolve os scores 0,82; 0,71; 0,58; 0,55 e 0,31. Quantos chunks vão para o contexto?",
      options: ["5", "3", "2", "1"],
      correct: 2,
      explanation: "O top-5 traz os cinco, mas só 0,82 e 0,71 passam do limiar de 0,60. O limiar corta a qualidade depois que o k cortou a quantidade.",
      lesson: "08-08",
    },
    {
      id: "ann-miss",
      prompt: "A equipe trocou a busca exata por um índice HNSW, e um teste mostra que, em 100 perguntas, uma deixou de trazer o vizinho mais próximo. O que isso indica?",
      options: [
        "Um bug no banco vetorial, que precisa ser trocado",
        "O comportamento esperado de um índice aproximado; dá para ajustar os parâmetros de busca para subir o recall, pagando em velocidade",
        "Que os embeddings foram gerados com o modelo errado",
        "Que o limiar está alto demais",
      ],
      correct: 1,
      explanation: "ANN troca exatidão por velocidade. Medir o recall contra a força bruta e ajustar parâmetros como ef_search é a forma de escolher o ponto dessa troca.",
      lesson: "08-08",
    },
  ],
  related: ["08-07", "08-09", "06-12"],
  references: [
    { title: "Malkov e Yashunin, Efficient and robust approximate nearest neighbor search using HNSW graphs", url: "https://arxiv.org/abs/1603.09320", kind: "paper" },
    { title: "FAISS: biblioteca de busca por similaridade", url: "https://github.com/facebookresearch/faiss", kind: "repo" },
    { title: "pgvector: busca vetorial no PostgreSQL", url: "https://github.com/pgvector/pgvector", kind: "repo" },
  ],
};

export default lesson;
