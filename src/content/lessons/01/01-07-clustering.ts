import type { SceneColor, VectorPoint } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Onde abrir 3 depósitos para 12 endereços de entrega? k-means de verdade, em km, com centroides
// iniciais escolhidos à mão. Atribuições, centroides, inércia por iteração e o cotovelo saem das contas abaixo.

type Point = [number, number];

const addresses: Point[] = [
  [2, 2],
  [2.5, 3],
  [3, 2.2],
  [1.8, 2.8],
  [6, 8],
  [7, 8.5],
  [6.5, 7.2],
  [7.5, 7.8],
  [9, 2],
  [10, 3],
  [9.5, 1.5],
  [8.6, 2.8],
];
const K = 3;
const INITIAL: Point[] = [addresses[0], addresses[1], addresses[4]];
const BAD_INITIAL: Point[] = [addresses[0], addresses[3], addresses[5]];
const MAX_ITERATIONS = 20;

const fixed = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const squaredDistance = (a: Point, b: Point) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
const nearestCentroid = (point: Point, centroids: Point[]) =>
  centroids.reduce((best, centroid, index) => (squaredDistance(point, centroid) < squaredDistance(point, centroids[best]) ? index : best), 0);
const assign = (centroids: Point[]) => addresses.map((point) => nearestCentroid(point, centroids));
const inertiaOf = (centroids: Point[], labels: number[]) =>
  addresses.reduce((sum, point, index) => sum + squaredDistance(point, centroids[labels[index]]), 0);
const centroidsOf = (labels: number[], previous: Point[]): Point[] =>
  previous.map((old, cluster) => {
    const members = addresses.filter((_, index) => labels[index] === cluster);
    if (members.length === 0) return old;
    return [
      members.reduce((sum, point) => sum + point[0], 0) / members.length,
      members.reduce((sum, point) => sum + point[1], 0) / members.length,
    ];
  });

/** Lloyd: atribui cada ponto ao centroide mais perto, move cada centroide para a média, até nada mudar. */
const kMeans = (initial: Point[]) => {
  let centroids = initial;
  let labels = assign(centroids);
  const history = [inertiaOf(centroids, labels)];
  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration += 1) {
    centroids = centroidsOf(labels, centroids);
    const next = assign(centroids);
    history.push(inertiaOf(centroids, next));
    const changed = next.some((label, index) => label !== labels[index]);
    labels = next;
    if (!changed) break;
  }
  return { centroids, labels, history, inertia: history[history.length - 1] };
};

/** Inicialização determinística pelo ponto mais distante (a ideia do k-means++ sem sorteio). */
const farthestFirst = (k: number): Point[] => {
  const chosen: Point[] = [addresses[0]];
  while (chosen.length < k) {
    const distances = addresses.map((point) => Math.min(...chosen.map((centroid) => squaredDistance(point, centroid))));
    chosen.push(addresses[distances.indexOf(Math.max(...distances))]);
  }
  return chosen;
};

const initialLabels = assign(INITIAL);
const result = kMeans(INITIAL);
const badResult = kMeans(BAD_INITIAL);
const iterations = result.history.length - 1;
const elbow = [1, 2, 3, 4, 5].map((k) => ({ k, inertia: kMeans(farthestFirst(k)).inertia }));
const elbowAt = (k: number) => elbow.find((item) => item.k === k)?.inertia ?? 0;
const sizes = result.centroids.map((_, cluster) => result.labels.filter((label) => label === cluster).length);

const CLUSTER_COLORS: SceneColor[] = ["module-01", "info", "success"];
const scenePoints = (labels: number[], centroids: Point[]): VectorPoint[] => [
  ...addresses.map<VectorPoint>((point, index) => ({
    id: `p${index + 1}`,
    label: "",
    coords: point,
    color: CLUSTER_COLORS[labels[index]],
  })),
  ...centroids.map<VectorPoint>((centroid, cluster) => ({
    id: `c${cluster + 1}`,
    label: `C${cluster + 1}`,
    coords: centroid,
    color: "ink",
  })),
];
const coordsText = (point: Point) => `(${fixed(point[0])}; ${fixed(point[1])})`;

const lesson: LessonContent = {
  id: "01-07",
  subtitle: "Agrupar sem rótulos: o k-means alterna entre escolher o grupo de cada ponto e mover o centro de cada grupo.",
  objectives: [
    "Executar à mão as duas etapas do k-means",
    "Acompanhar a inércia caindo a cada iteração",
    "Escolher k pelo método do cotovelo e entender o risco de mínimos locais",
    "Ver onde o clustering aparece nos bancos vetoriais",
  ],
  steps: [
    {
      id: "warehouses",
      shortTitle: "Depósitos",
      title: "Onde abrir os depósitos?",
      tag: "context",
      body: [
        `Uma loja tem ${addresses.length} endereços de entrega frequentes e dinheiro para ${K} depósitos. Cada depósito deve ficar no meio de um grupo de endereços próximos. Ninguém disse quais são os grupos: é um problema de [[clustering|clustering]].`,
        "O algoritmo mais usado para isso é o [[k-means|k-means]]. Você escolhe k, o número de grupos, e ele devolve um centro para cada grupo, o [[centroide|centroid]], e o grupo de cada ponto. É simples, rápido e escala para milhões de pontos.",
      ],
      keyIdea: "Clustering responde “quais exemplos andam juntos?” sem nenhum rótulo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "clusters",
            piece: "block-diagram",
            blocks: [
              { id: "addresses", kind: "documents", label: "endereços", col: 0, row: 0.5 },
              { id: "kmeans", kind: "retrieval", label: `k-means (k = ${K})`, col: 1, row: 0.5 },
              { id: "north", kind: "server", label: "depósito norte", col: 2, row: 0 },
              { id: "center", kind: "server", label: "depósito oeste", col: 3, row: 0.5 },
              { id: "east", kind: "server", label: "depósito leste", col: 2, row: 1 },
            ],
            edges: [
              { from: "addresses", to: "kmeans", label: "coordenadas" },
              { from: "kmeans", to: "north" },
              { from: "kmeans", to: "center" },
              { from: "kmeans", to: "east" },
            ],
            active: "kmeans",
          },
        ],
      },
      alt: `Os ${addresses.length} endereços entram no k-means, em destaque, que devolve ${K} depósitos: norte, oeste e leste.`,
    },
    {
      id: "start",
      shortTitle: "Início",
      title: "Chute inicial e a primeira atribuição",
      tag: "mechanism",
      body: [
        `O k-means começa com ${K} centroides em lugares quaisquer. Aqui escolhemos três endereços, e dois deles caíram no mesmo bairro, a oeste. Primeira etapa: cada endereço vai para o centroide mais perto. As cores mostram o resultado: o oeste ficou com dois centros, e os endereços do leste, sem nenhum centro por perto, foram repartidos entre centros distantes.`,
        `A qualidade do agrupamento é medida pela [[inércia|inertia]]: a soma das distâncias ao quadrado de cada ponto até o centroide do seu grupo. Com esse chute, a inércia é ${fixed(result.history[0])} km².`,
      ],
      keyIdea: "Etapa 1 do k-means: cada ponto entra no grupo do centroide mais próximo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [{ id: "map", piece: "vector-space", points: scenePoints(initialLabels, INITIAL) }],
      },
      alt: `Mapa com os ${addresses.length} endereços coloridos pelo centroide mais próximo; dois centroides iniciais estão no mesmo bairro a oeste, e a inércia é ${fixed(result.history[0])}.`,
    },
    {
      id: "converge",
      shortTitle: "Iterar",
      title: "Mover os centros até parar",
      tag: "mechanism",
      body: [
        "Segunda etapa: cada centroide vai para a média dos pontos do seu grupo. Aí os pontos são reatribuídos, os centroides se movem de novo, e assim por diante. Cada uma das duas etapas só pode diminuir a inércia, então o processo sempre termina.",
        `Aqui ele parou em ${iterations} iterações, quando nenhum endereço trocou de grupo. Os centroides finais ficaram em ${result.centroids.map(coordsText).join(", ")}, com ${sizes.join(", ")} endereços em cada grupo. Esses são os lugares dos depósitos.`,
      ],
      keyIdea: "Etapa 2: cada centroide vira a média do seu grupo. Repita as duas etapas até nada mudar.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [{ id: "map", piece: "vector-space", points: scenePoints(result.labels, result.centroids) }],
      },
      alt: `O mesmo mapa depois de ${iterations} iterações: os três centroides estão no meio de três grupos de endereços, com ${sizes.join(", ")} pontos.`,
    },
    {
      id: "inertia",
      shortTitle: "Inércia",
      title: "A inércia cai a cada iteração",
      tag: "example",
      body: [
        `O gráfico mostra a inércia depois de cada atribuição: começa em ${fixed(result.history[0])} e termina em ${fixed(result.inertia)} km². A queda maior acontece logo no começo, quando um centroide sai do bairro errado.`,
        "Cada iteração custa n · k distâncias (pontos vezes centroides). Por isso o k-means escala bem: milhões de pontos e centenas de grupos rodam em segundos. Para dados maiores ainda, o mini-batch k-means atualiza os centroides com amostras.",
      ],
      keyIdea: "O k-means minimiza a inércia, e ela nunca sobe de uma iteração para a próxima.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "history",
            piece: "chart",
            kind: "line",
            series: result.history.map((value, index) => ({ label: `${index}`, value: Number(value.toFixed(1)) })),
            highlight: result.history.length - 1,
            color: "module-01",
          },
          {
            id: "result",
            piece: "metrics-panel",
            metrics: [
              { id: "start", label: "inércia inicial", value: `${fixed(result.history[0])} km²` },
              { id: "end", label: "inércia final", value: `${fixed(result.inertia)} km²`, color: "success" },
              { id: "iterations", label: "iterações", value: `${iterations}` },
            ],
            highlight: "end",
          },
        ],
      },
      alt: `Curva da inércia por iteração, de ${fixed(result.history[0])} até ${fixed(result.inertia)} km², em ${iterations} iterações.`,
    },
    {
      id: "choose-k",
      shortTitle: "Escolher k",
      title: "Quantos grupos? E o chute importa?",
      tag: "tradeoff",
      body: [
        `Mais grupos sempre diminuem a inércia: com k igual ao número de pontos, ela é zero. Por isso não dá para escolher k pela menor inércia. O método do cotovelo procura onde a queda perde força: de k = 2 para k = 3 a inércia cai de ${fixed(elbowAt(2))} para ${fixed(elbowAt(3))}; de 3 para 4, só até ${fixed(elbowAt(4))}.`,
        `O chute inicial também importa. Começando com dois centroides no oeste e um no norte, o k-means para em ${fixed(badResult.inertia)} km², contra ${fixed(result.inertia)}: um mínimo local, com o oeste dividido em dois e um único depósito para o norte e o leste juntos. Nenhum ponto quer trocar de grupo, e o algoritmo não sai dali. Por isso se usa o k-means++ (centroides iniciais espalhados) e várias execuções, ficando com a melhor. E o k-means supõe grupos redondos e de tamanho parecido; formas alongadas pedem outros métodos, como o DBSCAN.`,
      ],
      keyIdea: "k é escolha sua (cotovelo, negócio), e o resultado depende do chute inicial: rode várias vezes.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "elbow",
            piece: "chart",
            kind: "bar",
            series: elbow.map((item) => ({ label: `k = ${item.k}`, value: Number(item.inertia.toFixed(1)) })),
            highlight: elbow.findIndex((item) => item.k === K),
            color: "module-01",
          },
        ],
      },
      alt: `Barras com a inércia final para k de 1 a 5; a queda é grande até k = 3 e pequena depois, o cotovelo.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "k-means dentro do banco vetorial",
      tag: "summary",
      body: [
        "Juntando: escolha k, chute os centroides, atribua cada ponto ao mais perto, mova os centroides para a média e repita até nada mudar. A inércia mede a coesão dos grupos, o cotovelo ajuda a escolher k e várias execuções evitam mínimos locais.",
        "O k-means trabalha em qualquer número de dimensões, inclusive nos [[embeddings|embedding]] de texto. Índices IVF de bancos vetoriais, como os da biblioteca FAISS, usam k-means para dividir milhões de vetores em grupos; a busca só olha os grupos mais perto da pergunta. Na próxima aula, voltamos ao supervisionado para medir modelos do jeito certo.",
      ],
      keyIdea: "Agrupar embeddings com k-means é o que deixa a busca vetorial rápida.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "ivf",
            piece: "block-diagram",
            blocks: [
              { id: "docs", kind: "documents", label: "documentos", col: 0, row: 0.5 },
              { id: "vectors", kind: "embedding", label: "embeddings", col: 1, row: 0.5 },
              { id: "kmeans", kind: "retrieval", label: "k-means", col: 2, row: 0.5 },
              { id: "index", kind: "vector-db", label: "índice IVF", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "docs", to: "vectors" },
              { from: "vectors", to: "kmeans" },
              { from: "kmeans", to: "index", label: "grupos" },
            ],
            active: "kmeans",
          },
        ],
      },
      alt: "Documentos viram embeddings, o k-means, em destaque, divide os vetores em grupos, e os grupos formam o índice IVF do banco vetorial.",
    },
  ],
  realWorldExample:
    "A documentação do scikit-learn traz um exemplo clássico de quantização de cores: o k-means agrupa os pixels de uma foto em 64 cores, e cada pixel passa a usar a cor do seu centroide, com pouca perda visual.",
  code: {
    language: "python",
    source: `from sklearn.cluster import KMeans

X = [[2, 2], [2.5, 3], [3, 2.2], [1.8, 2.8], [6, 8], [7, 8.5],
     [6.5, 7.2], [7.5, 7.8], [9, 2], [10, 3], [9.5, 1.5], [8.6, 2.8]]

for k in range(1, 6):
    model = KMeans(n_clusters=k, init="k-means++", n_init=10, random_state=0).fit(X)
    print(k, round(model.inertia_, 1))

print(KMeans(n_clusters=3, n_init=10, random_state=0).fit(X).cluster_centers_)`,
    caption: "Os 12 endereços da aula: a inércia por k para o cotovelo e os centroides com k = 3, com k-means++ e 10 inicializações.",
  },
  tradeOffs: {
    pros: [
      "Simples, rápido e escala para milhões de pontos",
      "Resultado fácil de explicar: cada grupo tem um centro",
      "Funciona em qualquer dimensão, inclusive em embeddings",
    ],
    cons: [
      "É preciso escolher k antes",
      "Depende do chute inicial e pode parar num mínimo local",
      "Supõe grupos redondos e de tamanho parecido, e sofre com outliers",
    ],
    alternatives: [
      "DBSCAN, que acha grupos de qualquer forma e marca ruído",
      "Clustering hierárquico, que monta uma árvore de grupos sem fixar k",
    ],
  },
  knowledgeCheck: [
    {
      id: "inertia-k",
      prompt: "Um colega propõe escolher k como o valor com menor inércia entre 1 e 50. Qual é o problema?",
      options: [
        "Nenhum, é o método recomendado",
        "A inércia sempre cai com mais grupos, então ele vai escolher k = 50",
        "A inércia sempre sobe com mais grupos",
        "O k-means não funciona com k maior que 10",
      ],
      correct: 1,
      explanation: "Mais centroides deixam cada ponto mais perto de algum centro. O mínimo é sempre o maior k; procure o cotovelo ou um critério do negócio.",
      lesson: "01-07",
    },
    {
      id: "local-minimum",
      prompt: "Duas execuções do k-means nos mesmos dados dão grupos diferentes. O que explica e o que fazer?",
      options: [
        "Um erro no código; o k-means sempre dá o mesmo resultado",
        "Inicializações diferentes levam a mínimos locais diferentes; rode várias vezes e fique com a menor inércia",
        "Os dados mudaram entre as execuções",
        "k estava errado; troque por k = 2",
      ],
      correct: 1,
      explanation: "O k-means só garante parar num mínimo local, que depende dos centroides iniciais. k-means++ e várias inicializações (n_init) reduzem o problema.",
      lesson: "01-07",
    },
  ],
  related: ["01-03", "01-08", "06-12"],
  references: [
    { title: "scikit-learn: Clustering", url: "https://scikit-learn.org/stable/modules/clustering.html", kind: "docs" },
    { title: "Billion-scale similarity search with GPUs (FAISS)", url: "https://arxiv.org/abs/1702.08734", kind: "paper" },
    { title: "FAISS (repositório)", url: "https://github.com/facebookresearch/faiss", kind: "repo" },
  ],
};

export default lesson;
