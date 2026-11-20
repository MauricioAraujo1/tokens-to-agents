import type { GraphSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Busca aproximada num grafo de vizinhança, calculada aqui. Primeiro, 12 pontos em volta de um "lago"
// vazio, ligados aos 3 vizinhos mais próximos: a busca gulosa (ef = 1) para num mínimo local, a busca em
// feixe (ef = 2) atravessa, e uma camada de cima com ligações longas, como no HNSW, encurta o caminho.
// Depois, um experimento maior com 500 pontos aleatórios em 8 dimensões (semente fixa): recall@10 e
// fração da base visitada para cada ef, contra a força bruta.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const percent = (value: number) => `${Math.round(value * 100)}%`;
const recallText = (value: number) => `${fixed(value * 100, 1)}%`;

const euclidean = (a: number[], b: number[]) => {
  let sum = 0;
  for (let index = 0; index < a.length; index++) {
    const diff = a[index] - b[index];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
};

/**
 * Busca em feixe numa camada de grafo, como no HNSW: mantém os `ef` melhores encontrados e expande sempre
 * o candidato mais próximo, até ele ficar pior que o pior dos guardados. Com ef = 1, é a busca gulosa.
 */
function beamSearch(
  query: number[],
  entry: number,
  ef: number,
  points: number[][],
  neighbors: Array<Set<number>>,
) {
  const dist = (id: number) => euclidean(points[id], query);
  const visited = new Set([entry]);
  const parent = new Map<number, number>();
  let candidates = [entry];
  let results = [entry];
  while (candidates.length > 0) {
    candidates.sort((a, b) => dist(a) - dist(b));
    const current = candidates[0];
    candidates = candidates.slice(1);
    if (results.length >= ef && dist(current) > dist(results[results.length - 1])) break;
    for (const next of neighbors[current]) {
      if (visited.has(next)) continue;
      visited.add(next);
      if (results.length < ef || dist(next) < dist(results[results.length - 1])) {
        parent.set(next, current);
        candidates.push(next);
        results = [...results, next].sort((a, b) => dist(a) - dist(b)).slice(0, ef);
      }
    }
  }
  const pathTo = (id: number): number[] => (parent.has(id) ? [...pathTo(parent.get(id) ?? entry), id] : [id]);
  return { results, visited: [...visited], path: pathTo(results[0]) };
}

/** Grafo dos k vizinhos mais próximos, com as arestas nos dois sentidos. */
function knnGraph(points: number[][], k: number) {
  const neighbors = points.map(() => new Set<number>());
  points.forEach((point, i) => {
    const best: Array<{ id: number; d: number }> = [];
    points.forEach((other, j) => {
      if (i === j) return;
      const d = euclidean(point, other);
      if (best.length < k || d < best[best.length - 1].d) {
        best.push({ id: j, d });
        best.sort((a, b) => a.d - b.d);
        if (best.length > k) best.pop();
      }
    });
    for (const { id } of best) {
      neighbors[i].add(id);
      neighbors[id].add(i);
    }
  });
  return neighbors;
}

const exactTop = (points: number[][], query: number[], k: number) =>
  points
    .map((point, id) => ({ id, d: euclidean(point, query) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, k)
    .map((entry) => entry.id);

// Passos 2 a 5: 12 pontos em volta de um lago vazio. Coordenadas da cena, de 0 a 1, com y para baixo.
const lake: Array<[number, number]> = [
  [0.1, 0.15],
  [0.35, 0.08],
  [0.62, 0.08],
  [0.88, 0.15],
  [0.08, 0.45],
  [0.92, 0.45],
  [0.1, 0.78],
  [0.38, 0.9],
  [0.62, 0.9],
  [0.9, 0.78],
  [0.3, 0.45],
  [0.7, 0.45],
];
const name = (id: number) => `n${id + 1}`;
const LAKE_K = 3;
const lakeNeighbors = knnGraph(lake, LAKE_K);
const lakeEdges = lake.flatMap((_, i) => [...lakeNeighbors[i]].filter((j) => j > i).map((j) => ({ from: name(i), to: name(j) })));
const QUERY: [number, number] = [0.62, 0.5];
const ENTRY = 4;
const trueNearest = exactTop(lake, QUERY, 1)[0];

const greedy = beamSearch(QUERY, ENTRY, 1, lake, lakeNeighbors);
const greedyStop = greedy.results[0];
const beam = beamSearch(QUERY, ENTRY, 2, lake, lakeNeighbors);

// Camada de cima do HNSW: só os 4 cantos, todos ligados entre si (ligações longas).
const upperIds = [0, 3, 6, 9];
const upperNeighbors = lake.map((_, id) => new Set(upperIds.includes(id) ? upperIds.filter((other) => other !== id) : []));
const UPPER_ENTRY = 6;
const upper = beamSearch(QUERY, UPPER_ENTRY, 1, lake, upperNeighbors);
const descendFrom = upper.results[0];
const lower = beamSearch(QUERY, descendFrom, 1, lake, lakeNeighbors);
const layeredVisits = upper.visited.length + lower.visited.length - 1;

const queryNode = { id: "q", label: "q", x: QUERY[0], y: QUERY[1], color: "brand" as const };
const lakeNodes = lake.map(([x, y], id) => ({ id: name(id), label: name(id), x, y }));
const lakeGraph = (overrides: Partial<GraphSpec>): GraphSpec => ({
  id: "walk",
  piece: "graph",
  nodes: [...lakeNodes, queryNode],
  edges: lakeEdges,
  ...overrides,
});

// Passo 6: 500 pontos aleatórios em 8 dimensões, grafo dos 8 vizinhos, 50 consultas, recall@10 por ef.
function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = mulberry32(7);
const DIMS = 8;
const BASE = 500;
const GRAPH_K = 8;
const QUERIES = 50;
const RECALL_K = 10;
const base = Array.from({ length: BASE }, () => Array.from({ length: DIMS }, random));
const baseNeighbors = knnGraph(base, GRAPH_K);
const queries = Array.from({ length: QUERIES }, () => Array.from({ length: DIMS }, random));
const efValues = [10, 20, 40, 80];
const experiment = efValues.map((ef) => {
  let recall = 0;
  let visited = 0;
  for (const query of queries) {
    const truth = exactTop(base, query, RECALL_K);
    const found = beamSearch(query, 0, ef, base, baseNeighbors);
    recall += found.results.slice(0, RECALL_K).filter((id) => truth.includes(id)).length / RECALL_K;
    visited += found.visited.length;
  }
  return { ef, recall: recall / QUERIES, fraction: visited / QUERIES / BASE };
});
const first = experiment[0];
const second = experiment[1];
const third = experiment[2];
const last = experiment[experiment.length - 1];

const lesson: LessonContent = {
  id: "06-12",
  subtitle:
    "Como achar vizinhos quase certos sem olhar a base inteira: andar por um grafo de vizinhança, escapar de mínimos locais com uma busca em feixe e usar as camadas do HNSW, medindo o que se perde com o recall@k.",
  objectives: [
    "Explicar a troca da busca aproximada: velocidade em troca de recall",
    "Executar à mão uma busca gulosa num grafo e reconhecer um mínimo local",
    "Descrever o HNSW: camadas com ligações longas e busca em feixe com ef",
    "Medir o recall@k de um índice contra a força bruta e ajustar o ef",
  ],
  steps: [
    {
      id: "directions",
      shortTitle: "Pedir direção",
      title: "Achar a rua perguntando aos vizinhos",
      tag: "context",
      body: [
        "Para achar uma rua numa cidade desconhecida, você não visita todas as casas: pergunta a alguém, anda na direção que a pessoa apontou, pergunta de novo e vai chegando. Às vezes você chega numa rua muito parecida com a que procurava, mas não exatamente nela. É assim que funciona a [[busca aproximada de vizinhos|ann]]: poucos saltos, quase sempre o lugar certo.",
        "Formalmente, um índice ANN devolve k vetores que são, com alta probabilidade, os k mais próximos, visitando uma pequena fração da base. A qualidade se mede pelo [[recall@k|recall-at-k]]: quantos dos k vizinhos verdadeiros, achados pela força bruta, aparecem na resposta do índice, divididos por k.",
      ],
      keyIdea: "ANN troca a garantia de exatidão por velocidade. O recall@k mede quanto dessa exatidão sobrou.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "consulta", col: 0, row: 0.5 },
              { id: "ann", kind: "retrieval", label: "índice ANN", col: 1, row: 0.5 },
              { id: "db", kind: "vector-db", label: "milhões de docs", col: 2, row: 0 },
              { id: "flat", kind: "server", label: "força bruta", col: 2, row: 1 },
              { id: "eval", kind: "eval", label: "recall@k", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "user", to: "ann" },
              { from: "ann", to: "db", label: "poucos saltos" },
              { from: "user", to: "flat", label: "lenta", variant: "alternative" },
              { from: "db", to: "eval", label: "aproximado" },
              { from: "flat", to: "eval", label: "gabarito" },
            ],
            active: "ann",
          },
        ],
      },
      alt: "A consulta vai ao índice ANN, em destaque, que visita poucos vetores. A força bruta, tracejada por ser lenta, serve de gabarito, e o recall@k compara as duas respostas.",
    },
    {
      id: "graph",
      shortTitle: "Grafo",
      title: "Cada vetor conhece alguns vizinhos",
      tag: "mechanism",
      body: [
        `Um índice de grafo liga cada vetor a alguns vizinhos próximos. Na cena, ${lake.length} pontos em volta de um lago vazio estão ligados aos ${LAKE_K} vizinhos mais próximos de cada um, num total de ${lakeEdges.length} arestas. Nenhuma atravessa o lago: os pontos do meio, ${name(10)} e ${name(11)}, estão longe demais um do outro.`,
        `A consulta, o ponto q, cai à direita do lago. O vizinho mais próximo de verdade é ${name(trueNearest)}. A busca começa num ponto de entrada fixo, aqui ${name(ENTRY)}, do outro lado. O desafio é chegar até ${name(trueNearest)} calculando poucas distâncias.`,
      ],
      keyIdea: "Índice de grafo: cada vetor guarda ligações para alguns vizinhos. A busca anda por essas ligações.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [lakeGraph({ highlight: [name(ENTRY), name(trueNearest)] })],
      },
      alt: `Grafo de ${lake.length} pontos em volta de um lago vazio, com ${lakeEdges.length} arestas entre vizinhos. A entrada ${name(ENTRY)} fica à esquerda; a consulta e o vizinho mais próximo, ${name(trueNearest)}, à direita.`,
    },
    {
      id: "greedy",
      shortTitle: "Guloso",
      title: "Andar sempre para o vizinho mais perto da consulta",
      tag: "mechanism",
      body: [
        `A regra mais simples é a busca gulosa: no ponto atual, calcule a distância de cada vizinho até a consulta e vá para o mais perto; pare quando nenhum vizinho for melhor. Saindo de ${name(ENTRY)}, a busca vai para ${greedy.path.map(name).slice(1).join(", ")} e para ali, depois de calcular ${greedy.visited.length} distâncias.`,
        `${name(greedyStop)} é um mínimo local: todos os seus vizinhos estão mais longe da consulta do que ele, mas o vizinho verdadeiro, ${name(trueNearest)}, está do outro lado do lago. Para chegar lá, seria preciso aceitar se afastar primeiro, contornando a margem. A busca gulosa nunca faz isso.`,
      ],
      keyIdea: "A busca gulosa é rápida, mas para no primeiro ponto sem vizinho melhor: um mínimo local.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [lakeGraph({ path: greedy.path.map(name), visited: greedy.visited.map(name), highlight: [name(greedyStop)] })],
      },
      alt: `A busca gulosa sai de ${name(ENTRY)}, chega a ${name(greedyStop)} e para, presa num mínimo local; o vizinho verdadeiro ${name(trueNearest)} fica do outro lado do lago, sem ser visitado.`,
    },
    {
      id: "beam",
      shortTitle: "Feixe",
      title: "Guardar mais de um caminho: o parâmetro ef",
      tag: "mechanism",
      body: [
        `A correção é não apostar num caminho só. A busca em feixe guarda os ef melhores pontos encontrados até agora e continua expandindo enquanto algum candidato puder melhorar a lista. Com [[ef|ef-search]] = 2, a busca contorna o lago pelo caminho ${beam.path.map(name).join(" → ")} e acha ${name(beam.results[0])}, calculando ${beam.visited.length} distâncias.`,
        "Aqui o grafo é pequeno e a busca acaba visitando quase tudo; numa base de milhões, o mesmo mecanismo visita uma fração pequena. O ef é o botão principal do índice na hora da consulta: maior, mais pontos visitados, mais recall e mais latência. Ele precisa ser pelo menos k, porque a lista final sai dos ef guardados.",
      ],
      keyIdea: "ef = tamanho da lista de candidatos. Mais ef escapa de mínimos locais, ao custo de mais distâncias calculadas.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [lakeGraph({ path: beam.path.map(name), visited: beam.visited.map(name), highlight: [name(beam.results[0])] })],
      },
      alt: `Com ef = 2, a busca contorna o lago pelo caminho ${beam.path.map(name).join(", ")} e chega a ${name(beam.results[0])}, o vizinho verdadeiro, calculando ${beam.visited.length} distâncias.`,
    },
    {
      id: "layers",
      shortTitle: "Camadas",
      title: "HNSW: uma rodovia em cima das ruas",
      tag: "mechanism",
      body: [
        `Numa viagem longa, você pega a rodovia e só depois entra nas ruas do bairro. O [[HNSW|hnsw]] (Hierarchical Navigable Small World) faz isso: cada vetor recebe ao acaso um nível, com probabilidade que cai exponencialmente, e as camadas de cima têm poucos pontos ligados por arestas longas. Na cena, a camada de cima tem só os ${upperIds.length} cantos.`,
        `A busca começa no topo, em ${name(UPPER_ENTRY)}, e salta para ${name(descendFrom)}, o canto mais perto da consulta. Desce para a camada de baixo já do lado certo do lago e chega a ${name(lower.results[0])} em ${lower.path.length - 1} passo. No total, ${layeredVisits} distâncias, com ef = 1 e sem cair no mínimo local. No artigo de Malkov e Yashunin, essa estrutura dá um custo de busca que cresce de forma logarítmica com o tamanho da base.`,
      ],
      keyIdea: "HNSW: camadas de cima com saltos longos levam rápido à região certa; a de baixo refina a vizinhança.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "walk",
            piece: "graph",
            nodes: [...upperIds.map((id) => lakeNodes[id]), lakeNodes[trueNearest], queryNode],
            edges: [
              ...upperIds.flatMap((id, i) => upperIds.slice(i + 1).map((other) => ({ from: name(id), to: name(other), label: "camada 1" }))),
              { from: name(descendFrom), to: name(trueNearest), label: "camada 0" },
            ],
            path: [...upper.path.map(name), ...lower.path.slice(1).map(name)],
            visited: [...new Set([...upper.visited, ...lower.visited])].map(name).filter((id) => [...upperIds.map(name), name(trueNearest)].includes(id)),
            highlight: [name(lower.results[0])],
          },
        ],
      },
      alt: `Camada de cima do HNSW com os 4 cantos ligados entre si. A busca sai de ${name(UPPER_ENTRY)}, salta para ${name(descendFrom)} e desce para ${name(lower.results[0])}, calculando ${layeredVisits} distâncias.`,
    },
    {
      id: "recall",
      shortTitle: "Recall",
      title: "Medir o que se perde: recall@10 contra o ef",
      tag: "example",
      body: [
        `Um experimento maior, calculado na própria aula: ${BASE} pontos aleatórios em ${DIMS} dimensões, um grafo com os ${GRAPH_K} vizinhos de cada um e ${QUERIES} consultas. Para cada ef, a busca em feixe é comparada com a força bruta. Com ef = ${first.ef}, o recall@${RECALL_K} é ${recallText(first.recall)}, visitando ${percent(first.fraction)} da base; com ef = ${second.ef}, ${recallText(second.recall)} visitando ${percent(second.fraction)}.`,
        `Com ef = ${third.ef}, o recall chega a ${recallText(third.recall)} visitando ${percent(third.fraction)}; com ef = ${last.ef}, fica em ${recallText(last.recall)} e visita ${percent(last.fraction)} da base. É a curva de todo índice ANN: os primeiros pontos de recall são baratos e os últimos, caros. Em bases de milhões a fração visitada é muito menor, mas o formato da curva é o mesmo, e ele é o que você ajusta.`,
      ],
      keyIdea: "Recall sobe rápido com o ef e depois satura; o custo continua subindo. Escolha o ef no joelho da curva.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "recall-curve",
            piece: "chart",
            kind: "line",
            series: experiment.map((point) => ({ label: `ef ${point.ef}`, value: Number(point.recall.toFixed(3)) })),
            max: 1,
            highlight: 1,
            color: "module-06",
          },
          {
            id: "visited",
            piece: "metrics-panel",
            metrics: experiment.map((point) => ({
              id: `ef-${point.ef}`,
              label: `ef ${point.ef}: base visitada`,
              value: percent(point.fraction),
            })),
            highlight: `ef-${second.ef}`,
          },
        ],
      },
      alt: `Recall@${RECALL_K} por ef num grafo de ${BASE} pontos: ${experiment.map((point) => `ef ${point.ef}, ${recallText(point.recall)} visitando ${percent(point.fraction)} da base`).join("; ")}.`,
    },
    {
      id: "tuning",
      shortTitle: "Ajustar",
      title: "Os três botões do HNSW e o fim do módulo",
      tag: "summary",
      body: [
        "O HNSW tem três botões. M, o número de ligações por nó: mais ligações, mais recall e mais memória. ef_construction, o tamanho do feixe ao montar o grafo: maior, grafo melhor e construção mais lenta. ef_search, o ef da consulta, que você ajusta sem reconstruir nada. No pgvector, os padrões são m = 16, ef_construction = 64 e hnsw.ef_search = 40.",
        "O método de ajuste é sempre o mesmo: separe consultas reais, calcule o gabarito com força bruta, meça recall@k e latência para alguns valores e escolha o ponto que atende o produto. Com isso, o módulo fecha o caminho do texto ao vizinho mais próximo. O módulo 07 junta essa busca com a busca por palavras, e o módulo 08 a usa para dar contexto a um LLM.",
      ],
      keyIdea: "M e ef_construction moldam o grafo; ef_search ajusta cada consulta. Decida com recall medido nos seus dados.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "queries", kind: "user", label: "consultas reais", col: 0, row: 0.5 },
              { id: "flat", kind: "server", label: "gabarito exato", col: 1, row: 0 },
              { id: "hnsw", kind: "retrieval", label: "HNSW: M, ef", col: 1, row: 1 },
              { id: "eval", kind: "eval", label: "recall + latência", col: 2, row: 0.5 },
              { id: "db", kind: "vector-db", label: "produção", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "queries", to: "flat" },
              { from: "queries", to: "hnsw" },
              { from: "flat", to: "eval" },
              { from: "hnsw", to: "eval" },
              { from: "eval", to: "db", label: "ef escolhido" },
            ],
            active: "eval",
          },
        ],
      },
      alt: "Consultas reais passam pelo gabarito exato e pelo HNSW com os seus parâmetros; a medição de recall e latência, em destaque, escolhe o ef que vai para produção.",
    },
  ],
  realWorldExample:
    "O HNSW, publicado por Malkov e Yashunin, virou o índice padrão de boa parte dos bancos vetoriais: o pgvector, o Qdrant e o Weaviate o oferecem, e o FAISS tem o IndexHNSWFlat. O ANN-Benchmarks compara dezenas de implementações pela curva de recall contra consultas por segundo, a mesma troca medida nesta aula, e é o lugar público para ver como cada algoritmo se comporta em conjuntos de dados reais.",
  code: {
    language: "python",
    source: `import hnswlib
import numpy as np

d = 384
data = np.random.default_rng(0).random((100_000, d), dtype="float32")

index = hnswlib.Index(space="cosine", dim=d)
index.init_index(max_elements=len(data), M=16, ef_construction=200)
index.add_items(data)

queries = data[:100]
exact = np.argsort(-(queries @ data.T) / np.linalg.norm(data, axis=1), axis=1)[:, :10]

for ef in (10, 50, 200):
    index.set_ef(ef)                       # ef_search: maior = mais recall, consulta mais lenta
    labels, _ = index.knn_query(queries, k=10)
    recall = np.mean([len(set(a) & set(b)) / 10 for a, b in zip(labels, exact)])
    print(ef, round(recall, 3))`,
    caption: "Um índice HNSW com hnswlib e o recall@10 medido contra a busca exata para três valores de ef.",
  },
  tradeOffs: {
    pros: [
      "Consulta visita uma fração pequena da base, com recall alto",
      "O ef_search ajusta recall e latência sem reconstruir o índice",
      "HNSW aceita inserções sem treino prévio, ao contrário do IVF",
    ],
    cons: [
      "Resultados aproximados: algum vizinho verdadeiro pode ficar de fora",
      "O grafo ocupa memória extra e a construção é cara",
      "Apagar vetores e filtros muito seletivos podem deixar o grafo mal conectado",
    ],
    alternatives: ["IVF e IVF-PQ, com menos memória (aula 06-09)", "Força bruta, quando a base é pequena ou a exatidão é obrigatória"],
  },
  knowledgeCheck: [
    {
      id: "recall-at-k",
      prompt: "A força bruta devolve os ids {3, 8, 12, 20, 41} como top-5. O índice ANN devolve {3, 8, 15, 20, 77}. Qual é o recall@5?",
      options: ["40%", "60%", "80%", "100%"],
      correct: 1,
      explanation: "Três dos cinco vizinhos verdadeiros (3, 8 e 20) aparecem na resposta: 3 ÷ 5 = 60%.",
      lesson: "06-12",
    },
    {
      id: "ef-tradeoff",
      prompt: "A busca do seu RAG às vezes perde o trecho certo, e a latência está folgada. Qual ajuste no HNSW faz sentido primeiro?",
      options: [
        "Diminuir o ef_search",
        "Aumentar o ef_search e medir de novo o recall@k contra a força bruta",
        "Trocar a métrica para produto escalar",
        "Reduzir o número de dimensões",
      ],
      correct: 1,
      explanation: "O ef_search aumenta os candidatos explorados por consulta. Com latência sobrando, é o botão mais barato para subir o recall, e não exige reconstruir o índice.",
      lesson: "06-12",
    },
  ],
  related: ["06-09", "06-11", "07-07"],
  references: [
    {
      title: "Malkov e Yashunin (2016), Efficient and robust approximate nearest neighbor search using Hierarchical Navigable Small World graphs",
      url: "https://arxiv.org/abs/1603.09320",
      kind: "paper",
    },
    { title: "ANN-Benchmarks", url: "https://ann-benchmarks.com/", kind: "article" },
    { title: "hnswlib", url: "https://github.com/nmslib/hnswlib", kind: "repo" },
  ],
};

export default lesson;
