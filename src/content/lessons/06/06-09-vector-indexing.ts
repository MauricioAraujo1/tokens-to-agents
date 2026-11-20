import type { SceneColor, VectorPoint } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Índices vetoriais com contas reais: um IVF de brinquedo (k-means com 3 centros sobre 12 pontos em 2D),
// a busca com nprobe = 1 e 2 e o recall@3 contra a força bruta; uma quantização por produto (PQ) de um
// vetor de 4 dimensões com 2 sub-vetores e codebooks de 4 centros; e os bytes por vetor de cada índice
// para d = 768. Os pontos e os codebooks são escolhidos à mão; o resto sai das contas.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const percent = (value: number) => `${Math.round(value * 100)}%`;

type Coords2 = [number, number];
const distance = (a: number[], b: number[]) => Math.hypot(...a.map((value, index) => value - b[index]));

// Passos 2 e 3: 12 vetores, 3 listas (nlist = 3).
const base: Record<string, Coords2> = {
  a1: [-2, 1.8],
  a2: [-1.6, 2.2],
  a3: [-2.3, 1.2],
  a4: [-1.2, 1.5],
  b1: [1.8, 2],
  b2: [2.3, 1.5],
  b3: [1.5, 1.4],
  b4: [2, 2.4],
  c1: [0, -1.8],
  c2: [0.5, -1.4],
  c3: [-0.4, -1.2],
  c4: [0.3, -2.2],
};
const ids = Object.keys(base);
const NLIST = 3;
const K = 3;

/** k-means de Lloyd, começando por um ponto de cada região, até as listas pararem de mudar. */
function kmeans(seeds: string[]) {
  let centers = seeds.map((id) => base[id]);
  let assignment: number[] = [];
  for (let iteration = 0; iteration < 10; iteration++) {
    const next = ids.map((id) => {
      const dists = centers.map((center) => distance(base[id], center));
      return dists.indexOf(Math.min(...dists));
    });
    if (next.join() === assignment.join()) break;
    assignment = next;
    centers = centers.map((center, list) => {
      const members = ids.filter((_, index) => assignment[index] === list).map((id) => base[id]);
      if (members.length === 0) return center;
      return [0, 1].map((axis) => members.reduce((sum, point) => sum + point[axis], 0) / members.length) as Coords2;
    });
  }
  return { centers, assignment };
}
const { centers, assignment } = kmeans(["a1", "b1", "c1"]);
const listOf = (id: string) => assignment[ids.indexOf(id)];
const listSize = (list: number) => assignment.filter((value) => value === list).length;

const QUERY: Coords2 = [-0.9, 0.4];
const byDistance = (candidates: string[]) =>
  [...candidates].sort((a, b) => distance(QUERY, base[a]) - distance(QUERY, base[b]));
const exactTop = byDistance(ids).slice(0, K);
const centerOrder = centers
  .map((center, list) => ({ list, dist: distance(QUERY, center) }))
  .sort((a, b) => a.dist - b.dist);

const searchIvf = (nprobe: number) => {
  const lists = centerOrder.slice(0, nprobe).map((entry) => entry.list);
  const candidates = ids.filter((id) => lists.includes(listOf(id)));
  const found = byDistance(candidates).slice(0, K);
  return {
    nprobe,
    comparisons: NLIST + candidates.length,
    found,
    recall: found.filter((id) => exactTop.includes(id)).length / K,
  };
};
const probes = [1, 2, 3].map(searchIvf);
const missed = exactTop.filter((id) => !probes[0].found.includes(id));

const LIST_LETTERS = ["A", "B", "C"];
const LIST_COLORS: SceneColor[] = ["info", "success", "module-06"];
const ivfPoints: VectorPoint[] = [
  ...ids.map((id) => ({ id, label: id, coords: base[id], color: LIST_COLORS[listOf(id)] })),
  ...centers.map((center, list) => ({ id: `center-${list}`, label: `centro ${LIST_LETTERS[list]}`, coords: center, color: "brand" as const })),
  { id: "query", label: "consulta", coords: QUERY, color: "danger" },
];
const nearestCenter = centerOrder[0];

// Na escala real: 1 milhão de vetores em 1.000 listas, nprobe = 10.
const N = 1_000_000;
const REAL_NLIST = 1000;
const REAL_NPROBE = 10;
const realComparisons = REAL_NLIST + REAL_NPROBE * (N / REAL_NLIST);

// Passo 4: PQ de um vetor de 4 dimensões em 2 sub-vetores, cada um com um codebook de 4 centros (2 bits).
const original = [0.62, -0.35, 0.11, 0.8];
const codebooks: number[][][] = [
  [
    [0.6, -0.4],
    [0.1, 0.5],
    [-0.5, -0.2],
    [-0.3, 0.7],
  ],
  [
    [0, 0.9],
    [0.5, 0.1],
    [-0.4, -0.6],
    [0.2, -0.3],
  ],
];
const SUB = 2;
const codes = codebooks.map((codebook, part) => {
  const piece = original.slice(part * SUB, part * SUB + SUB);
  const dists = codebook.map((centroid) => distance(piece, centroid));
  return dists.indexOf(Math.min(...dists));
});
const reconstructed = codes.flatMap((code, part) => codebooks[part][code]);
const pqError = distance(original, reconstructed);

// Passos 4 e 5: bytes por vetor com d = 768.
const D = 768;
const FLOAT32 = 4;
const ID_BYTES = 8;
const PQ_M = 96;
const HNSW_M = 16;
const LINK_BYTES = 4;
const flatBytes = D * FLOAT32;
const memory = [
  { label: "Flat", bytes: flatBytes },
  { label: "IVF-Flat", bytes: flatBytes + ID_BYTES },
  { label: "IVF-PQ", bytes: PQ_M + ID_BYTES },
  { label: "HNSW", bytes: flatBytes + 2 * HNSW_M * LINK_BYTES },
];
const pqRatio = flatBytes / PQ_M;

const lesson: LessonContent = {
  id: "06-09",
  subtitle:
    "Como organizar milhões de vetores com antecedência para que cada consulta olhe só uma fração deles: listas invertidas (IVF), compressão por quantização de produto (PQ) e o custo de cada escolha.",
  objectives: [
    "Explicar o que um índice vetorial troca: tempo de construção e memória por consultas mais rápidas",
    "Executar uma busca IVF à mão e medir o recall contra a busca exata",
    "Calcular a compressão de uma quantização por produto",
    "Comparar Flat, IVF, IVF-PQ e HNSW em memória, velocidade e manutenção",
  ],
  steps: [
    {
      id: "build-first",
      shortTitle: "Construir",
      title: "Organizar antes, para procurar menos depois",
      tag: "context",
      body: [
        "Um supermercado não espalha os produtos ao acaso: ele organiza por corredor, e você vai direto ao de laticínios. Um [[índice vetorial|vector-index]] faz o mesmo com vetores: gasta tempo na indexação, uma vez, para que cada consulta visite só uma pequena parte da base.",
        "Quase todo índice rápido é aproximado: ele pode deixar de fora algum vizinho verdadeiro, porque não olha a base inteira. Por isso todo índice tem botões que trocam velocidade por qualidade, e a qualidade é medida contra a força bruta da aula anterior.",
      ],
      keyIdea: "Índice = trabalho feito antes da consulta. Em troca, cada busca olha uma fração da base, e pode errar um pouco.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "docs", kind: "documents", label: "documentos", col: 0, row: 0 },
              { id: "vectors", kind: "embedding", label: "vetores", col: 1, row: 0 },
              { id: "build", kind: "queue", label: "construir índice", col: 2, row: 0 },
              { id: "index", kind: "vector-db", label: "índice", col: 3, row: 0 },
              { id: "query", kind: "user", label: "consulta", col: 2, row: 1 },
              { id: "search", kind: "retrieval", label: "parte da base", col: 3, row: 1 },
            ],
            edges: [
              { from: "docs", to: "vectors" },
              { from: "vectors", to: "build", label: "offline" },
              { from: "build", to: "index" },
              { from: "query", to: "search" },
              { from: "index", to: "search", label: "só alguns" },
            ],
            active: "build",
          },
        ],
      },
      alt: "Documentos viram vetores, e a construção do índice, em destaque, acontece offline. Na consulta, a busca visita só uma parte do índice.",
    },
    {
      id: "ivf",
      shortTitle: "IVF",
      title: "IVF: um corredor por grupo de vetores",
      tag: "mechanism",
      body: [
        `O [[IVF|ivf]] (inverted file, ou listas invertidas) roda um [[k-means|k-means]] nos vetores e cria uma lista por [[centroide|centroid]]. Cada vetor vai para a lista do centro mais perto. Na cena, os ${ids.length} pontos formam ${NLIST} listas, com ${centers.map((_, list) => listSize(list)).join(", ")} vetores, e cada centro é a média do seu grupo.`,
        `Na consulta, o índice compara a pergunta só com os ${NLIST} centros, escolhe o mais perto (o centro ${LIST_LETTERS[nearestCenter.list]}, a ${fixed(nearestCenter.dist)}) e faz força bruta dentro daquela lista. Em vez de ${ids.length} comparações, ${probes[0].comparisons}: os ${NLIST} centros mais os ${listSize(nearestCenter.list)} vetores da lista.`,
      ],
      keyIdea: "IVF: k-means divide a base em listas; a consulta compara com os centros e procura só nas listas mais próximas.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "ivf-space",
            piece: "vector-space",
            points: ivfPoints,
            distance: { from: "query", to: `center-${nearestCenter.list}`, label: fixed(nearestCenter.dist) },
          },
        ],
      },
      alt: `Doze vetores em ${NLIST} listas coloridas, cada uma com o seu centro. A consulta fica a ${fixed(nearestCenter.dist)} do centro ${LIST_LETTERS[nearestCenter.list]}, o mais próximo.`,
    },
    {
      id: "nprobe",
      shortTitle: "nprobe",
      title: "A fronteira entre listas e o botão nprobe",
      tag: "mechanism",
      body: [
        `A consulta fica perto da fronteira. Os 3 vizinhos exatos são ${exactTop.join(", ")}, mas ${missed.join(", ")} mora na lista vizinha. Visitando só 1 lista, o IVF devolve ${probes[0].found.join(", ")}: acerta ${Math.round(probes[0].recall * K)} de ${K}, um [[recall@${K}|recall-at-k]] de ${percent(probes[0].recall)}. Com [[nprobe|nprobe]] = 2, visita as duas listas mais próximas, faz ${probes[1].comparisons} comparações e acerta ${percent(probes[1].recall)}.`,
        `nprobe é o botão de velocidade contra qualidade. Na escala real, com ${integer(N)} vetores em ${integer(REAL_NLIST)} listas e nprobe = ${REAL_NPROBE}, a consulta faz cerca de ${integer(realComparisons)} comparações, ${fixed((realComparisons / N) * 100, 1)}% da força bruta. O pgvector sugere começar com listas = linhas ÷ 1.000 (até 1 milhão de linhas) e probes = √listas; o padrão de probes é 1.`,
      ],
      keyIdea: "Vizinhos na fronteira caem em outra lista. Aumentar o nprobe recupera esses vizinhos, ao custo de mais comparações.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "probes",
            piece: "chart",
            kind: "bar",
            series: probes.map((probe) => ({ label: `nprobe ${probe.nprobe}`, value: probe.comparisons })),
            max: ids.length + NLIST,
            highlight: 1,
            color: "module-06",
          },
          {
            id: "recall",
            piece: "metrics-panel",
            metrics: probes.slice(0, 2).map((probe) => ({
              id: `p${probe.nprobe}`,
              label: `recall@${K} com nprobe ${probe.nprobe}`,
              value: percent(probe.recall),
              color: probe.recall === 1 ? ("success" as const) : ("danger" as const),
            })),
            highlight: "p2",
          },
        ],
      },
      alt: `Comparações por consulta com nprobe de 1 a 3: ${probes.map((probe) => `${probe.comparisons}`).join(", ")}. O recall@${K} sobe de ${percent(probes[0].recall)} com nprobe 1 para ${percent(probes[1].recall)} com nprobe 2.`,
    },
    {
      id: "pq",
      shortTitle: "PQ",
      title: "PQ: guardar um código em vez do vetor",
      tag: "mechanism",
      body: [
        `A [[quantização por produto|product-quantization]] comprime o vetor. Corte-o em pedaços e troque cada pedaço pelo número do centro mais parecido num pequeno dicionário (codebook). Na cena, [${original.map((value) => fixed(value)).join("; ")}] vira 2 pedaços, codificados como (${codes.join(", ")}). Reconstruído, ele é [${reconstructed.map((value) => fixed(value)).join("; ")}], com erro de ${fixed(pqError)}.`,
        `Num caso real, um vetor de ${integer(D)} dimensões em float32 (${integer(flatBytes)} bytes) cortado em ${PQ_M} pedaços, com 256 centros por pedaço, vira ${PQ_M} códigos de 1 byte: ${integer(pqRatio)} vezes menor. Na busca, o índice calcula uma vez a distância da consulta a cada centro de cada pedaço (uma tabela de ${PQ_M} × 256), e a distância a qualquer vetor vira uma soma de ${PQ_M} consultas a essa tabela.`,
      ],
      keyIdea: "PQ troca cada pedaço do vetor por um código de 1 byte. Muito menos memória, distâncias aproximadas.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "pq",
            piece: "matrix",
            rows: ["original", "reconstruído"],
            cols: ["d1", "d2", "d3", "d4"],
            values: [original, reconstructed],
            scale: { min: -1, max: 1 },
            highlight: { row: 1, col: 2 },
            showValues: true,
          },
        ],
      },
      alt: `Um vetor de 4 dimensões e a sua versão reconstruída pela quantização por produto, com códigos (${codes.join(", ")}) e erro de ${fixed(pqError)}.`,
    },
    {
      id: "menu",
      shortTitle: "Cardápio",
      title: "Flat, IVF, IVF-PQ e HNSW lado a lado",
      tag: "example",
      body: [
        `Com d = ${integer(D)}, a cena compara os bytes por vetor de cada índice (aproximados, só vetores, ids e ligações). Flat e IVF-Flat guardam o vetor inteiro, ${integer(flatBytes)} bytes; o IVF ainda guarda um id de ${ID_BYTES} bytes. O IVF-PQ cai para ${integer(memory[2].bytes)}. O [[HNSW|hnsw]] guarda o vetor inteiro mais as ligações de um grafo: com M = ${HNSW_M}, a camada de baixo tem ${2 * HNSW_M} vizinhos por nó, mais ${2 * HNSW_M * LINK_BYTES} bytes.`,
        "Memória não é tudo. Flat é exato e lento; IVF é rápido e depende de um bom treino dos centros; IVF-PQ cabe em pouca RAM e perde precisão, compensada reordenando os melhores com os vetores completos; HNSW costuma dar o melhor recall por velocidade e é o que mais gasta memória. A aula 06-12 abre o HNSW por dentro.",
      ],
      keyIdea: "Cada índice ocupa um ponto diferente entre memória, velocidade, recall e manutenção. Não existe o melhor em tudo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "memory",
            piece: "chart",
            kind: "bar",
            series: memory.map((entry) => ({ label: entry.label, value: entry.bytes })),
            highlight: 2,
            color: "module-06",
          },
        ],
      },
      alt: `Bytes por vetor com d = ${D}: ${memory.map((entry) => `${entry.label} ${integer(entry.bytes)}`).join(", ")}.`,
    },
    {
      id: "maintenance",
      shortTitle: "Manutenção",
      title: "Índices também envelhecem",
      tag: "tradeoff",
      body: [
        "O IVF e o PQ precisam de treino: os centros e os codebooks saem de uma amostra dos dados. Se os documentos novos forem diferentes dos antigos, por exemplo um produto novo que vira metade das buscas, as listas ficam desequilibradas e o recall cai até o índice ser treinado de novo.",
        "O HNSW aceita inserções sem treino, mas apagar é caro: muitos sistemas só marcam o vetor como removido e reconstroem depois. Planeje a reconstrução como parte da operação e meça o recall em produção, não só no dia da criação. A próxima aula mostra o que um banco vetorial acrescenta em volta do índice.",
      ],
      keyIdea: "Índices treinados envelhecem com os dados. Meça o recall com frequência e reconstrua quando cair.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "sample", kind: "documents", label: "amostra", col: 0, row: 0 },
              { id: "train", kind: "queue", label: "treinar centros", col: 1, row: 0 },
              { id: "index", kind: "vector-db", label: "índice IVF-PQ", col: 2, row: 0 },
              { id: "new", kind: "documents", label: "dados novos", col: 1, row: 1 },
              { id: "eval", kind: "eval", label: "recall caiu?", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "sample", to: "train", label: "k-means" },
              { from: "train", to: "index" },
              { from: "new", to: "index", label: "outra distribuição", variant: "alternative" },
              { from: "index", to: "eval", label: "medir" },
              { from: "eval", to: "train", label: "retreinar" },
            ],
            active: "eval",
          },
        ],
      },
      alt: "Uma amostra treina os centros do índice IVF-PQ. Dados novos com outra distribuição entram pelo caminho tracejado; a medição de recall, em destaque, manda retreinar quando cai.",
    },
  ],
  realWorldExample:
    "O FAISS nasceu desse problema: Johnson, Douze e Jégou (2017) descreveram como buscar em bilhões de vetores com GPUs combinando IVF e quantização por produto, e o índice IndexIVFPQ da biblioteca é essa combinação. O pgvector traz dois índices aproximados, IVFFlat e HNSW, e documenta os botões de cada um: lists e probes no IVFFlat; m, ef_construction e ef_search no HNSW.",
  code: {
    language: "python",
    source: `import faiss
import numpy as np

d, nlist, m = 768, 1000, 96
xb = np.random.default_rng(0).random((200_000, d), dtype="float32")

quantizer = faiss.IndexFlatL2(d)                     # compara a consulta com os centros
index = faiss.IndexIVFPQ(quantizer, d, nlist, m, 8)  # 96 códigos de 8 bits: 96 bytes por vetor
index.train(xb)                                      # k-means dos centros e dos codebooks
index.add(xb)

index.nprobe = 10                                    # listas visitadas por consulta
distances, ids = index.search(xb[:5], 10)`,
    caption: "Um índice IVF-PQ no FAISS: treinar os centros e os codebooks, adicionar os vetores e buscar visitando 10 listas.",
  },
  tradeOffs: {
    pros: [
      "Cada consulta visita uma pequena fração da base",
      "PQ cabe bases enormes em pouca memória",
      "Botões como nprobe ajustam velocidade e recall sem reconstruir o índice",
    ],
    cons: [
      "Resultados aproximados: vizinhos na fronteira podem ficar de fora",
      "IVF e PQ precisam de treino e envelhecem quando os dados mudam",
      "Construir o índice leva tempo e, no caso do HNSW, muita memória",
    ],
    alternatives: ["Força bruta, para bases pequenas ou como gabarito", "Índices em disco, como o DiskANN, para bases maiores que a RAM"],
  },
  knowledgeCheck: [
    {
      id: "nprobe-tuning",
      prompt: "Um IVF com 1.000 listas tem recall@10 de 80% com nprobe = 1. O que acontece ao subir para nprobe = 20?",
      options: [
        "O recall cai, porque há mais ruído",
        "O recall sobe, porque vizinhos em listas vizinhas passam a ser vistos, e cada consulta fica mais lenta",
        "Nada muda, o nprobe só afeta a construção",
        "O índice precisa ser treinado de novo",
      ],
      correct: 1,
      explanation: "nprobe é o número de listas visitadas na consulta. Mais listas, mais candidatos comparados: recall maior e latência maior, sem reconstruir nada.",
      lesson: "06-09",
    },
    {
      id: "pq-memory",
      prompt: "Vetores de 1.024 dimensões em float32 são comprimidos com PQ em 128 pedaços de 8 bits. Quantos bytes sobram por vetor, sem contar o id?",
      options: ["4.096", "1.024", "128", "8"],
      correct: 2,
      explanation: "Cada pedaço vira um código de 1 byte: 128 pedaços, 128 bytes, contra 1.024 × 4 = 4.096 bytes do vetor original, 32 vezes menos.",
      lesson: "06-09",
    },
  ],
  related: ["06-08", "06-10", "06-12"],
  references: [
    { title: "Douze et al. (2024), The Faiss library", url: "https://arxiv.org/abs/2401.08281", kind: "paper" },
    { title: "FAISS wiki: Faiss indexes", url: "https://github.com/facebookresearch/faiss/wiki/Faiss-indexes", kind: "docs" },
    { title: "pgvector: índices IVFFlat e HNSW", url: "https://github.com/pgvector/pgvector", kind: "repo" },
  ],
};

export default lesson;
