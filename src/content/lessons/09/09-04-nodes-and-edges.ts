import type { GraphSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Um metrô de brinquedo com 8 estações e 10 trechos, calculado aqui: matriz e lista de adjacência, grau de
// cada estação, a busca em largura (BFS) de Porto até Estádio, que acha o caminho com menos trechos, e o
// algoritmo de Dijkstra, que acha o de menos minutos. Os dois caminhos são diferentes de propósito.

const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");

const stations = ["Porto", "Praça", "Centro", "Museu", "Parque", "Feira", "Ponte", "Estádio"];
const links: Array<[string, string, number]> = [
  ["Porto", "Praça", 3],
  ["Praça", "Centro", 2],
  ["Praça", "Parque", 5],
  ["Centro", "Museu", 3],
  ["Centro", "Feira", 4],
  ["Centro", "Ponte", 5],
  ["Museu", "Parque", 2],
  ["Feira", "Ponte", 3],
  ["Ponte", "Estádio", 4],
  ["Parque", "Estádio", 8],
];

// Lista de adjacência: o metrô anda nos dois sentidos, então cada trecho entra nas duas listas.
const adjacency = new Map<string, Array<{ to: string; minutes: number }>>(stations.map((station) => [station, []]));
for (const [a, b, minutes] of links) {
  adjacency.get(a)?.push({ to: b, minutes });
  adjacency.get(b)?.push({ to: a, minutes });
}
const neighbors = (station: string) => adjacency.get(station) ?? [];
const matrix = stations.map((row) => stations.map((col) => (neighbors(row).some((edge) => edge.to === col) ? 1 : 0)));
const listEntries = [...adjacency.values()].reduce((total, list) => total + list.length, 0);
const matrixCells = stations.length ** 2;

const degrees = stations.map((station) => ({ label: station, value: neighbors(station).length }));
const hub = [...degrees].sort((a, b) => b.value - a.value)[0];
const degreeSum = degrees.reduce((total, item) => total + item.value, 0);

// Mesma densidade numa rede de 1 milhão de nós: grau médio igual ao do brinquedo.
const BIG = 1_000_000;
const averageDegree = degreeSum / stations.length;
const bigMatrix = BIG ** 2;
const bigList = BIG * averageDegree;
const superscript = (value: number) => [...String(value)].map((digit) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(digit)]).join("");
const bigMatrixText = `10${superscript(Math.log10(bigMatrix))}`;

const FROM = "Porto";
const TO = "Estádio";

function bfs(start: string) {
  const layer = new Map<string, number>([[start, 0]]);
  const parent = new Map<string, string>();
  const order = [start];
  for (let index = 0; index < order.length; index++) {
    const current = order[index];
    for (const { to } of neighbors(current)) {
      if (layer.has(to)) continue;
      layer.set(to, (layer.get(current) ?? 0) + 1);
      parent.set(to, current);
      order.push(to);
    }
  }
  return { layer, parent, order };
}

function dijkstra(start: string) {
  const distance = new Map<string, number>(stations.map((station) => [station, Number.POSITIVE_INFINITY]));
  const parent = new Map<string, string>();
  const done = new Set<string>();
  distance.set(start, 0);
  while (done.size < stations.length) {
    const current = stations
      .filter((station) => !done.has(station))
      .sort((a, b) => (distance.get(a) ?? 0) - (distance.get(b) ?? 0))[0];
    done.add(current);
    for (const { to, minutes } of neighbors(current)) {
      const candidate = (distance.get(current) ?? 0) + minutes;
      if (candidate < (distance.get(to) ?? 0)) {
        distance.set(to, candidate);
        parent.set(to, current);
      }
    }
  }
  return { distance, parent };
}

const pathTo = (parent: Map<string, string>, target: string): string[] => {
  const previous = parent.get(target);
  return previous === undefined ? [target] : [...pathTo(parent, previous), target];
};
const minutesOf = (path: string[]) =>
  path.slice(1).reduce((total, station, index) => total + (neighbors(path[index]).find((edge) => edge.to === station)?.minutes ?? 0), 0);

const search = bfs(FROM);
const hopPath = pathTo(search.parent, TO);
const hopCount = hopPath.length - 1;
const layers = [...new Set(search.layer.values())].sort((a, b) => a - b);
const atLayer = (value: number) => stations.filter((station) => search.layer.get(station) === value);
const visitedUntilTarget = search.order.slice(0, search.order.indexOf(TO) + 1);
const fastest = dijkstra(FROM);
const minutePath = pathTo(fastest.parent, TO);

const layout: Record<string, { x: number; y: number }> = {
  Porto: { x: 0, y: 0 },
  Praça: { x: 0.25, y: 0.35 },
  Parque: { x: 0.55, y: 0 },
  Centro: { x: 0.25, y: 1 },
  Museu: { x: 0.5, y: 0.55 },
  Feira: { x: 0.55, y: 1 },
  Ponte: { x: 0.8, y: 0.7 },
  Estádio: { x: 1, y: 0.2 },
};
const metro = (extra: Partial<GraphSpec> = {}, withMinutes = false): GraphSpec => ({
  id: "metro",
  piece: "graph",
  nodes: stations.map((station) => ({ id: station, label: station, ...layout[station] })),
  edges: links.map(([from, to, minutes]) =>
    withMinutes ? { from, to, label: `${minutes} min`, weight: minutes / 8 } : { from, to },
  ),
  ...extra,
});

const lesson: LessonContent = {
  id: "09-04",
  subtitle: "O vocabulário de todo grafo: nós, arestas, direção, peso e grau, como guardar tudo isso na memória e como a busca em largura conta saltos.",
  objectives: [
    "Identificar nós e arestas num problema real e decidir se as arestas têm direção e peso",
    "Comparar matriz e lista de adjacência em memória",
    "Calcular o grau de um nó e reconhecer hubs",
    "Usar a busca em largura para achar o caminho com menos saltos",
  ],
  steps: [
    {
      id: "map",
      shortTitle: "O mapa",
      title: "Um mapa de metrô já é um grafo",
      tag: "context",
      body: [
        "Olhe o mapa do metrô: bolinhas são estações e traços são trechos entre elas. O mapa não mostra ruas, distâncias reais nem prédios, só quem se liga a quem. E isso basta para planejar a viagem.",
        `Essa é a abstração de um grafo. Cada estação é um [[nó|graph-node]] e cada trecho é uma [[aresta|graph-edge]]. O metrô da cena tem ${stations.length} nós e ${links.length} arestas. Pessoas e amizades, páginas e links, entidades e relações: tudo o que o módulo faz com conhecimento usa essas duas peças.`,
      ],
      keyIdea: "Um grafo guarda só o que importa para a pergunta: as coisas e as ligações entre elas.",
      scene: { kind: "pieces", layout: "single", pieces: [metro()] },
      alt: `Mapa de metrô de brinquedo com ${stations.length} estações e ${links.length} trechos, de Porto, no canto, até Estádio.`,
    },
    {
      id: "weights",
      shortTitle: "Peso",
      title: "Direção e peso",
      tag: "mechanism",
      body: [
        "Um trecho de metrô anda nos dois sentidos; uma rua de mão única, não. Um trecho rápido e um lento são diferentes, mesmo ligando estações vizinhas. Direção e peso são as duas informações extras que uma aresta pode levar.",
        `Num [[grafo dirigido|directed-graph]], A → B não implica B → A: “Ana segue Bia” não diz que Bia segue Ana. O metrô é não dirigido, e cada trecho vale para os dois lados (a cena desenha uma seta só por trecho). O peso aqui é o tempo em minutos, de ${Math.min(...links.map(([, , minutes]) => minutes))} a ${Math.max(...links.map(([, , minutes]) => minutes))}, e aparece como espessura da aresta. Num grafo de conhecimento, o “peso” costuma ser o tipo da relação, que é um rótulo.`,
      ],
      keyIdea: "Antes de modelar, decida: a ligação tem sentido? Tem custo? A resposta muda os algoritmos que servem.",
      scene: { kind: "pieces", layout: "single", pieces: [metro({}, true)] },
      alt: `O mesmo metrô com o tempo de cada trecho em minutos, de ${Math.min(...links.map(([, , minutes]) => minutes))} a ${Math.max(...links.map(([, , minutes]) => minutes))}, desenhado como espessura da aresta.`,
    },
    {
      id: "matrix",
      shortTitle: "Matriz",
      title: "O grafo como uma tabela de zeros e uns",
      tag: "mechanism",
      body: [
        `Um jeito de guardar o grafo é uma tabela com uma linha e uma coluna por estação, e 1 onde há trecho. É a [[matriz de adjacência|adjacency-matrix]]: ${stations.length} × ${stations.length} = ${matrixCells} células. Como o metrô é não dirigido, ela é simétrica: (Praça, Centro) e (Centro, Praça) valem 1.`,
        `A outra é a [[lista de adjacência|adjacency-list]]: cada estação guarda a lista dos vizinhos. Aqui são ${listEntries} entradas, 2 por trecho. A matriz responde “A e B são vizinhos?” num acesso só; a lista responde “quem são os vizinhos de A?” sem ler as colunas vazias. Travessias fazem a segunda pergunta o tempo todo.`,
      ],
      keyIdea: "Matriz: pergunta de vizinhança em tempo constante, espaço n². Lista: espaço proporcional às arestas.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "adjacency",
            piece: "matrix",
            rows: stations,
            cols: stations,
            values: matrix,
            scale: { min: 0, max: 1 },
            highlight: { row: stations.indexOf("Praça"), col: stations.indexOf("Centro") },
            color: "module-09",
          },
        ],
      },
      alt: `Matriz de adjacência ${stations.length} por ${stations.length}, simétrica, com ${listEntries} células iguais a 1; a célula Praça e Centro em destaque.`,
    },
    {
      id: "scale",
      shortTitle: "Escala",
      title: "Por que grafos reais usam listas",
      tag: "tradeoff",
      body: [
        `No brinquedo, a diferença é pequena: ${matrixCells} células contra ${listEntries} entradas. Agora pense num grafo de ${integer(BIG)} de nós com a mesma densidade, grau médio ${averageDegree.toLocaleString("pt-BR")}.`,
        `A matriz teria ${integer(BIG)}² = ${bigMatrixText} células, quase todas zero. A lista teria ${integer(bigList)} entradas. Grafos reais são esparsos: cada nó se liga a poucos outros. Por isso bancos de grafos e bibliotecas como o NetworkX guardam listas de adjacência, e matrizes só aparecem densas em grafos pequenos ou em formatos esparsos.`,
      ],
      keyIdea: "Grafos reais são esparsos: a matriz explode em n², a lista cresce com as arestas.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "memory",
            piece: "block-diagram",
            blocks: [
              { id: "graph", kind: "documents", label: `${integer(BIG)} de nós`, col: 0, row: 0.5 },
              { id: "matrix", kind: "memory", label: `matriz: ${bigMatrixText}`, col: 1.5, row: 0 },
              { id: "list", kind: "memory", label: `lista: ${integer(bigList)}`, col: 1.5, row: 1 },
              { id: "app", kind: "app", label: "travessia", col: 3, row: 1 },
            ],
            edges: [
              { from: "graph", to: "matrix", label: "n²", variant: "alternative" },
              { from: "graph", to: "list", label: "2 por aresta" },
              { from: "list", to: "app", label: "vizinhos" },
            ],
            active: "list",
          },
        ],
      },
      alt: `Um grafo de ${integer(BIG)} de nós guardado como matriz exigiria ${bigMatrixText} células, num caminho tracejado; como lista, ${integer(bigList)} entradas, em destaque, que alimentam a travessia.`,
    },
    {
      id: "degree",
      shortTitle: "Grau",
      title: "Grau: quem é o hub",
      tag: "example",
      body: [
        `Conte as arestas de cada estação: é o [[grau|node-degree]]. ${hub.label} tem grau ${hub.value}, o maior da rede: é a baldeação, por onde passa boa parte das viagens. A soma dos graus é ${degreeSum}, o dobro das ${links.length} arestas, porque cada aresta toca dois nós.`,
        "Em grafos de conhecimento, hubs são entidades citadas por todo lado, como o nome da empresa. Eles importam para a recuperação: partir de um hub expande a vizinhança muito rápido, e uma travessia de 2 saltos a partir dele pode trazer metade do grafo. Algoritmos de recuperação por grafo costumam limitar ou rebaixar hubs por isso.",
      ],
      keyIdea: "Soma dos graus = 2 × arestas. Hubs aceleram a travessia e também inundam o resultado.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "degrees",
            piece: "chart",
            kind: "bar",
            series: degrees,
            highlight: degrees.indexOf(hub),
            color: "module-09",
          },
        ],
      },
      alt: `Grau de cada estação: ${degrees.map((item) => `${item.label} ${item.value}`).join(", ")}. ${hub.label}, com ${hub.value}, é o hub.`,
    },
    {
      id: "bfs",
      shortTitle: "Saltos",
      title: "Busca em largura: camada por camada",
      tag: "example",
      body: [
        `De ${FROM} a ${TO} com o menor número de trechos? A [[busca em largura|breadth-first-search]] visita primeiro tudo a 1 salto, depois tudo a 2, e assim por diante, como uma onda. As camadas a partir de ${FROM}: ${layers.map((layer) => `${layer}: ${atLayer(layer).join(", ")}`).join("; ")}.`,
        `${TO} aparece na camada ${hopCount}, pelo caminho ${hopPath.join(" → ")}, com ${minutesOf(hopPath)} minutos. Mas menos saltos não é menos tempo: o algoritmo de Dijkstra, que soma os pesos, acha ${minutePath.join(" → ")}, com ${minutePath.length - 1} saltos e ${minutesOf(minutePath)} minutos. Em grafos de conhecimento, o número de saltos é o que importa: cada salto é um fato a mais na cadeia.`,
      ],
      keyIdea: "BFS acha o caminho com menos arestas; com pesos, quem acha o mais barato é o Dijkstra.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [metro({ visited: visitedUntilTarget, path: hopPath, highlight: [TO] })],
      },
      alt: `Busca em largura de ${FROM} a ${TO}: o caminho ${hopPath.join(", ")}, com ${hopCount} saltos, em destaque, e as estações visitadas até lá.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Do mapa à rota",
      tag: "summary",
      body: [
        "Nós e arestas, com direção e peso quando fizer sentido. Lista de adjacência na memória, porque grafos reais são esparsos. Grau para achar hubs, busca em largura para contar saltos, Dijkstra quando há pesos.",
        "Com esse vocabulário, a próxima aula junta grafo e RAG: o GraphRAG extrai um grafo dos documentos, agrupa os nós em comunidades e usa o grafo para responder.",
      ],
      keyIdea: "Modelar, guardar como lista, andar em largura: é a base de toda recuperação por grafo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "memory",
            piece: "block-diagram",
            blocks: [
              { id: "graph", kind: "documents", label: "trechos", col: 0, row: 0 },
              { id: "list", kind: "memory", label: "lista de adjacência", col: 1, row: 0 },
              { id: "bfs", kind: "retrieval", label: "bfs", col: 2, row: 0 },
              { id: "app", kind: "answer", label: `${hopCount} saltos`, col: 3, row: 0 },
              { id: "dijkstra", kind: "retrieval", label: "dijkstra", col: 2, row: 1 },
              { id: "fast", kind: "answer", label: `${minutesOf(minutePath)} min`, col: 3, row: 1 },
            ],
            edges: [
              { from: "graph", to: "list" },
              { from: "list", to: "bfs", label: "vizinhos" },
              { from: "bfs", to: "app" },
              { from: "list", to: "dijkstra", label: "pesos" },
              { from: "dijkstra", to: "fast" },
            ],
            active: "bfs",
            done: ["graph", "list"],
          },
        ],
      },
      alt: `Os trechos viram uma lista de adjacência, que alimenta a busca em largura, em destaque, com a rota de ${hopCount} saltos, e o Dijkstra, com a rota de ${minutesOf(minutePath)} minutos.`,
    },
  ],
  realWorldExample:
    "No Wikidata, cada item é um nó com identificador próprio (Q42 é Douglas Adams) e cada afirmação é uma aresta dirigida e rotulada por uma propriedade, como P31, “instância de”. A afirmação “Douglas Adams é instância de ser humano” é a aresta Q42 → Q5 com o rótulo P31.",
  code: {
    language: "python",
    source: `import networkx as nx

metro = nx.Graph()
metro.add_weighted_edges_from([
    ("Porto", "Praça", 3), ("Praça", "Centro", 2), ("Praça", "Parque", 5),
    ("Centro", "Museu", 3), ("Centro", "Feira", 4), ("Centro", "Ponte", 5),
    ("Museu", "Parque", 2), ("Feira", "Ponte", 3), ("Ponte", "Estádio", 4),
    ("Parque", "Estádio", 8),
])

print(dict(metro.degree()))                                       # grau de cada estação
print(nx.shortest_path(metro, "Porto", "Estádio"))                # menos saltos (BFS)
print(nx.shortest_path(metro, "Porto", "Estádio", weight="weight"))  # menos minutos (Dijkstra)`,
    caption: "O metrô da aula no NetworkX: sem peso, o caminho mais curto conta saltos; com weight, soma os minutos.",
  },
  tradeOffs: {
    pros: [
      "Uma abstração só serve para metrô, redes sociais, links e fatos",
      "Lista de adjacência ocupa espaço proporcional às arestas",
      "Busca em largura acha o caminho com menos saltos visitando cada nó uma vez",
    ],
    cons: [
      "A matriz de adjacência cresce em n² e desperdiça memória em grafos esparsos",
      "Hubs fazem a vizinhança explodir em poucos saltos",
      "Menos saltos não é o mesmo que menor custo: com pesos, é preciso outro algoritmo",
    ],
    alternatives: ["Matriz esparsa (CSR) para cálculos em lote sobre o grafo inteiro", "Dijkstra ou A* quando as arestas têm custo"],
  },
  knowledgeCheck: [
    {
      id: "directed-follow",
      prompt: "Numa rede em que “Ana segue Bia” não implica “Bia segue Ana”, como modelar?",
      options: [
        "Grafo não dirigido com peso",
        "Grafo dirigido: a aresta Ana → Bia existe sem a aresta Bia → Ana",
        "Matriz de adjacência simétrica",
        "Uma lista só com os nós",
      ],
      correct: 1,
      explanation: "Seguir tem sentido. No grafo dirigido, cada aresta vale só de quem segue para quem é seguido, e a matriz deixa de ser simétrica.",
      lesson: "09-04",
    },
    {
      id: "degree-sum",
      prompt: "Um grafo não dirigido tem 50 arestas. Quanto vale a soma dos graus de todos os nós?",
      options: ["50", "100", "2.500", "Depende do número de nós"],
      correct: 1,
      explanation: "Cada aresta toca dois nós e soma 1 ao grau de cada um: a soma dos graus é sempre 2 × arestas.",
      lesson: "09-04",
    },
  ],
  related: ["09-03", "09-05", "06-12"],
  references: [
    { title: "NetworkX documentation", url: "https://networkx.org/documentation/stable/", kind: "docs" },
    { title: "Wikidata: Introduction", url: "https://www.wikidata.org/wiki/Wikidata:Introduction", kind: "docs" },
    { title: "Hogan et al. (2020), Knowledge Graphs", url: "https://arxiv.org/abs/2003.02320", kind: "paper" },
  ],
};

export default lesson;
