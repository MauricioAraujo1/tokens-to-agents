import type { GraphSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Uma rede de brinquedo de 10 pessoas e 14 arestas CONHECE, calculada aqui. A consulta "quem a Ana pode
// conhecer por um amigo?" anda 2 saltos. Um modelo de custo de brinquedo conta o que cada banco lê:
// tabela de arestas sem índice (varre a tabela a cada salto), com índice B-tree (uma busca de ⌈log₂ E⌉
// comparações por nó da fronteira) e com adjacência direta (só as arestas seguidas). É um modelo de
// contagem, não um benchmark: os números mostram como cada custo cresce, não quanto tempo leva.

const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");

const people = ["Ana", "Bia", "Caio", "Duda", "Edu", "Fábio", "Gabi", "Hugo", "Íris", "João"];
const knows: Array<[string, string]> = [
  ["Ana", "Bia"],
  ["Ana", "Caio"],
  ["Ana", "Duda"],
  ["Bia", "Edu"],
  ["Bia", "Fábio"],
  ["Caio", "Bia"],
  ["Caio", "Fábio"],
  ["Caio", "Gabi"],
  ["Duda", "Gabi"],
  ["Edu", "Hugo"],
  ["Fábio", "Íris"],
  ["Gabi", "João"],
  ["Hugo", "Íris"],
  ["Íris", "João"],
];

const START = "Ana";
const HOPS = 2;
const outOf = (person: string) => knows.filter(([from]) => from === person).map(([, to]) => to);

// Travessia salto a salto: a fronteira de cada salto e as arestas seguidas.
const frontiers: string[][] = [[START]];
let edgesFollowed = 0;
for (let hop = 0; hop < HOPS; hop++) {
  const next = frontiers[hop].flatMap(outOf);
  edgesFollowed += next.length;
  frontiers.push([...new Set(next)]);
}
const direct = frontiers[1];
const suggestions = frontiers[2].filter((person) => person !== START && !direct.includes(person)).sort();
const lookups = frontiers.slice(0, HOPS).reduce((total, frontier) => total + frontier.length, 0);

const log2Ceil = (value: number) => Math.ceil(Math.log2(value));
const costs = (nodes: number, edges: number) => ({
  scan: HOPS * edges,
  index: lookups * log2Ceil(edges) + edgesFollowed,
  adjacency: log2Ceil(nodes) + edgesFollowed,
});
const toy = costs(people.length, knows.length);
const BIG_NODES = 100_000;
const BIG_EDGES = 1_000_000;
const big = costs(BIG_NODES, BIG_EDGES);

const layout: Record<string, { x: number; y: number }> = {
  Ana: { x: 0, y: 0.5 },
  Bia: { x: 0.33, y: 0 },
  Caio: { x: 0.33, y: 0.5 },
  Duda: { x: 0.33, y: 1 },
  Edu: { x: 0.66, y: 0 },
  Fábio: { x: 0.66, y: 0.5 },
  Gabi: { x: 0.66, y: 1 },
  Hugo: { x: 1, y: 0 },
  Íris: { x: 1, y: 0.5 },
  João: { x: 1, y: 1 },
};
const network = (extra: Partial<GraphSpec> = {}): GraphSpec => ({
  id: "network",
  piece: "graph",
  nodes: people.map((person) => ({ id: person, label: person, ...layout[person] })),
  edges: knows.map(([from, to]) => ({ from, to })),
  ...extra,
});
const visited = [...new Set(frontiers.flat())];

const lesson: LessonContent = {
  id: "09-03",
  subtitle: "Onde o grafo mora: bancos que guardam ligações como dados, o modelo de grafo de propriedades, Cypher e SPARQL, e quanto custa andar uma aresta.",
  objectives: [
    "Diferenciar um banco de grafos de tabelas com chaves estrangeiras",
    "Descrever o grafo de propriedades e o modelo RDF",
    "Ler uma consulta Cypher de dois saltos",
    "Comparar o custo de seguir arestas com varredura, índice e adjacência direta",
  ],
  steps: [
    {
      id: "tables",
      shortTitle: "Tabelas",
      title: "Tabelas ligam por busca; grafos, por ponteiro",
      tag: "context",
      body: [
        "Numa agenda de papel, para achar os amigos dos amigos da Ana, você procura a Ana, lê os nomes dela, e para cada nome volta ao índice da agenda e procura de novo. Agora imagine que cada nome na página da Ana fosse um link que abre direto a página do amigo: é a diferença entre uma tabela e um grafo.",
        "Num banco relacional, a relação é uma tabela de arestas (de, para), e cada salto é um JOIN que procura as linhas certas. Num [[banco de grafos|graph-database]], como o Neo4j, cada nó guarda referências diretas às suas arestas: isso se chama [[adjacência sem índice|index-free-adjacency]]. Andar uma aresta é seguir um ponteiro, não fazer uma busca.",
      ],
      keyIdea: "No banco relacional, cada salto é uma busca; no banco de grafos, cada salto é seguir um ponteiro.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "app", kind: "app", label: "app", col: 0, row: 0.5 },
              { id: "sql", kind: "sql-db", label: "tabela de arestas", col: 1.5, row: 0 },
              { id: "graph", kind: "nosql-db", label: "banco de grafos", col: 1.5, row: 1 },
              { id: "answer", kind: "answer", label: "amigos de amigos", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "app", to: "sql", label: "join por salto" },
              { from: "app", to: "graph", label: "segue ponteiros" },
              { from: "sql", to: "answer" },
              { from: "graph", to: "answer" },
            ],
            active: "graph",
          },
        ],
      },
      alt: "O app pode consultar uma tabela de arestas, com um join por salto, ou um banco de grafos, em destaque, que segue ponteiros; os dois chegam aos amigos de amigos.",
    },
    {
      id: "property-graph",
      shortTitle: "Propriedades",
      title: "Nós e arestas com rótulos e propriedades",
      tag: "mechanism",
      body: [
        `A rede da cena tem ${people.length} pessoas e ${knows.length} arestas CONHECE. No [[grafo de propriedades|property-graph]], cada nó tem rótulos e propriedades: (:Pessoa {nome: "Ana", cargo: "analista"}). Cada aresta tem um tipo, uma direção e também propriedades: [:CONHECE {desde: 2021}].`,
        "O outro modelo é o [[RDF|rdf]]: só triplas, com identificadores globais, guardadas num triplestore e consultadas com [[SPARQL|sparql]]. Propriedade numa aresta, em RDF, exige reificação ou a extensão RDF-star. O grafo de propriedades é consultado com [[Cypher|cypher]] (Neo4j e outros), Gremlin (Apache TinkerPop) ou GQL, a linguagem padrão que a ISO publicou em 2024, inspirada no Cypher.",
      ],
      keyIdea: "Grafo de propriedades: nós e arestas com atributos. RDF: tudo é tripla, com nomes globais.",
      scene: { kind: "pieces", layout: "single", pieces: [network()] },
      alt: `Rede de ${people.length} pessoas ligadas por ${knows.length} arestas CONHECE, da Ana à esquerda até o João à direita.`,
    },
    {
      id: "traversal",
      shortTitle: "2 saltos",
      title: "Dois saltos a partir da Ana",
      tag: "mechanism",
      body: [
        `A pergunta “quem a Ana pode conhecer por um amigo?” é um padrão: (Ana)-[:CONHECE]->()-[:CONHECE]->(b). O banco acha a Ana, segue as ${direct.length} arestas dela (${direct.join(", ")}) e, de cada amigo, segue as arestas de novo.`,
        `No total, a travessia segue ${edgesFollowed} arestas. Tirando quem a Ana já conhece, sobram ${suggestions.length} sugestões: ${suggestions.join(", ")}. O resto da rede (${people.length - visited.length} pessoas) nem é tocado. É o que faz o banco de grafos bom em consultas locais: o custo depende da vizinhança, não do tamanho do grafo.`,
      ],
      keyIdea: "Uma travessia só lê a vizinhança que percorre: o resto do grafo não custa nada.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [network({ visited, highlight: suggestions, path: [START, "Bia", "Edu"] })],
      },
      alt: `Travessia de 2 saltos a partir da Ana: visitados ${visited.join(", ")}; as sugestões ${suggestions.join(", ")} em destaque. ${people.length - visited.length} pessoas ficam de fora.`,
    },
    {
      id: "cost",
      shortTitle: "Contas",
      title: "Quantas leituras cada banco faz",
      tag: "example",
      body: [
        `Conte o trabalho com um modelo simples. Sem índice, cada salto varre a tabela inteira: ${HOPS} × ${knows.length} = ${toy.scan} linhas. Com um índice B-tree na coluna “de”, cada nó da fronteira custa uma busca de ⌈log₂ ${knows.length}⌉ = ${log2Ceil(knows.length)} comparações: ${lookups} buscas, ${toy.index} leituras. Com adjacência direta: achar a Ana (${log2Ceil(people.length)}) e seguir ${edgesFollowed} arestas, ${toy.adjacency} leituras.`,
        `Agora a mesma vizinhança num grafo com ${integer(BIG_NODES)} pessoas e ${integer(BIG_EDGES)} arestas. A varredura vai a ${integer(big.scan)} linhas. O índice salva o banco relacional: ${integer(big.index)} leituras, porque log₂ cresce devagar. A adjacência fica em ${integer(big.adjacency)}. Com índice, 2 saltos vão bem nos dois; a diferença cresce com a profundidade, porque cada nó da fronteira paga a busca no índice de novo.`,
      ],
      keyIdea: "O índice salva o JOIN; a adjacência direta tira até o log₂ de cada salto, e isso pesa em travessias profundas.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "reads",
            piece: "metrics-panel",
            metrics: [
              { id: "scan", label: `varredura (${integer(BIG_EDGES)} arestas)`, value: integer(big.scan), color: "danger" },
              { id: "index", label: "índice B-tree", value: integer(big.index), color: "info" },
              { id: "adjacency", label: "adjacência direta", value: integer(big.adjacency), color: "success" },
            ],
            highlight: "adjacency",
          },
        ],
      },
      alt: `Leituras para 2 saltos num grafo de ${integer(BIG_EDGES)} arestas: varredura ${integer(big.scan)}, índice B-tree ${integer(big.index)} e adjacência direta ${integer(big.adjacency)}, em destaque.`,
    },
    {
      id: "when",
      shortTitle: "Quando usar",
      title: "Bom para ligações, ruim para somatórios",
      tag: "tradeoff",
      body: [
        "Um banco de grafos brilha quando a pergunta é sobre ligações: quem conhece quem, que caminho liga duas contas, o que depende de quê. Ele perde quando a pergunta é varrer tudo e somar, como o total de vendas por mês: aí um banco relacional ou colunar faz melhor.",
        "Há também o custo de operar. Partir um grafo grande entre máquinas é difícil, porque as arestas cruzam as partições e cada salto pode virar uma chamada de rede. E a escolha do modelo pesa: grafo de propriedades com Cypher ou GQL para aplicações, RDF com SPARQL quando o dado precisa se ligar a vocabulários públicos, como o Wikidata.",
      ],
      keyIdea: "Use banco de grafos para perguntas de caminho e vizinhança, não para relatórios de agregação.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "dev", kind: "laptop", label: "consulta", col: 0, row: 0.5 },
              { id: "cypher", kind: "server", label: "cypher / gql", col: 1, row: 0 },
              { id: "sparql", kind: "server", label: "sparql", col: 1, row: 1 },
              { id: "pg", kind: "nosql-db", label: "grafo de propriedades", col: 2, row: 0 },
              { id: "rdf", kind: "nosql-db", label: "triplestore rdf", col: 2, row: 1 },
              { id: "olap", kind: "sql-db", label: "somatórios", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "dev", to: "cypher" },
              { from: "dev", to: "sparql" },
              { from: "cypher", to: "pg", label: "padrões" },
              { from: "sparql", to: "rdf", label: "triplas" },
              { from: "pg", to: "olap", label: "agregação", variant: "alternative" },
            ],
            active: "pg",
          },
        ],
      },
      alt: "Uma consulta vai por Cypher ou GQL ao grafo de propriedades, em destaque, ou por SPARQL ao triplestore RDF; um caminho tracejado leva as agregações para um banco relacional.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Ligações como dados de primeira classe",
      tag: "summary",
      body: [
        "Bancos de grafos guardam as arestas junto dos nós e respondem seguindo ponteiros. O grafo de propriedades põe atributos em nós e arestas; o RDF reduz tudo a triplas com nomes globais. Cypher e GQL desenham o padrão; SPARQL casa triplas com variáveis.",
        "A próxima aula desce um nível: o que é um nó, uma aresta, um grau e uma travessia em largura, e como guardar o grafo na memória.",
      ],
      keyIdea: "Escolha o banco pela pergunta: caminhos e vizinhanças pedem grafo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "steps",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "model", label: "modelar nós e arestas" },
              { id: "choose", label: "propriedades ou RDF" },
              { id: "load", label: "carregar com índice nos ids" },
              { id: "query", label: "padrão em Cypher ou SPARQL", color: "module-09" },
              { id: "traverse", label: "seguir só a vizinhança" },
              { id: "next", label: "nós e arestas", color: "brand" },
            ],
          },
        ],
      },
      alt: "Fluxo em chips: modelar nós e arestas, escolher propriedades ou RDF, carregar com índice nos ids, escrever o padrão em Cypher ou SPARQL, seguir só a vizinhança e, na próxima aula, nós e arestas.",
    },
  ],
  realWorldExample:
    "Na investigação dos Panama Papers, o ICIJ (Consórcio Internacional de Jornalistas Investigativos) carregou as empresas offshore, os intermediários e os beneficiários num banco de grafos Neo4j, e os jornalistas seguiam as ligações entre pessoas e empresas em consultas de caminho. O ICIJ mantém a base Offshore Leaks aberta para consulta.",
  code: {
    language: "python",
    source: `from neo4j import GraphDatabase

URI, AUTH = "neo4j://localhost:7687", ("neo4j", "senha")

consulta = """
MATCH (a:Pessoa {nome: $nome})-[:CONHECE]->(:Pessoa)-[:CONHECE]->(b:Pessoa)
WHERE b <> a AND NOT (a)-[:CONHECE]->(b)
RETURN DISTINCT b.nome AS nome
ORDER BY nome
"""

with GraphDatabase.driver(URI, auth=AUTH) as driver:
    records, _, _ = driver.execute_query(consulta, nome="Ana", database_="neo4j")
    print([r["nome"] for r in records])  # ['Edu', 'Fábio', 'Gabi']`,
    caption: "A consulta de dois saltos da aula em Cypher, pelo driver oficial em Python: o padrão desenha o caminho, e o WHERE tira a própria Ana e quem ela já conhece.",
  },
  tradeOffs: {
    pros: [
      "Travessias custam pela vizinhança percorrida, não pelo tamanho do grafo",
      "Consultas de caminho ficam curtas e legíveis em Cypher, GQL ou SPARQL",
      "Esquema flexível: novos tipos de relação entram sem migrar tabelas",
    ],
    cons: [
      "Agregações sobre o banco inteiro rendem menos que num banco relacional ou colunar",
      "Particionar um grafo grande entre máquinas é difícil",
      "Mais um banco para operar, sincronizar e proteger",
    ],
    alternatives: [
      "Tabela de arestas com índice num banco relacional, para poucos saltos",
      "Extensões de grafo sobre Postgres, como o Apache AGE",
    ],
  },
  knowledgeCheck: [
    {
      id: "graph-fit",
      prompt: "Qual destas consultas mais se beneficia de um banco de grafos?",
      options: [
        "Total de pedidos por mês nos últimos 5 anos",
        "Caminho mais curto de transferências entre duas contas suspeitas, em até 4 saltos",
        "Média de idade dos clientes por estado",
        "Listar os 10 produtos mais vendidos",
      ],
      correct: 1,
      explanation: "É uma pergunta de caminho em vários saltos: o banco de grafos segue só as arestas da vizinhança. As outras são agregações que varrem tudo, onde bancos relacionais ou colunares vão melhor.",
      lesson: "09-03",
    },
    {
      id: "index-cost",
      prompt: "Num banco relacional com índice na coluna “de”, por que o custo de uma travessia profunda cresce mais que no banco de grafos?",
      options: [
        "Porque o índice ocupa disco",
        "Porque cada nó da fronteira paga uma nova busca no índice, de cerca de log₂ E comparações, a cada salto",
        "Porque o SQL não aceita mais de dois JOINs",
        "Porque o banco relacional não guarda direção",
      ],
      correct: 1,
      explanation: "Com índice, cada salto é uma busca por nó da fronteira. A adjacência direta segue o ponteiro sem essa busca, e a diferença se multiplica pelo tamanho das fronteiras em cada salto.",
      lesson: "09-03",
    },
  ],
  related: ["09-02", "09-04", "06-10"],
  references: [
    { title: "Neo4j: Cypher Manual", url: "https://neo4j.com/docs/cypher-manual/current/", kind: "docs" },
    { title: "W3C: SPARQL 1.1 Query Language", url: "https://www.w3.org/TR/sparql11-query/", kind: "docs" },
    { title: "Apache TinkerPop (Gremlin)", url: "https://tinkerpop.apache.org/", kind: "docs" },
  ],
};

export default lesson;
