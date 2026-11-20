import type { GraphSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Uma pergunta de 2 saltos, calculada aqui de dois jeitos. Primeiro, a busca em chunks: o score é a fração
// das palavras da pergunta (sem stopwords) que aparecem no chunk, um ranking lexical de brinquedo. O chunk
// ponte não tem nenhuma palavra da pergunta e fica em último. Depois, o grafo extraído dos mesmos chunks:
// a travessia tipada (lidera → roda_em) acha a resposta, e o Personalized PageRank a partir da Ana
// (damping 0,85, iteração de potência) mostra a vizinhança relevante sem olhar o tipo da relação.

type Triple = [subject: string, predicate: string, object: string];

const QUESTION = "Em que datacenter roda o projeto que a Ana lidera?";
const STOPWORDS = new Set(["em", "que", "o", "a", "de", "do", "da", "no", "na", "um", "uma", "cada", "desde", "para"]);
const terms = (text: string) =>
  text
    .toLowerCase()
    .replace(/[.,?]/g, "")
    .split(" ")
    .filter((word) => !STOPWORDS.has(word));
const questionTerms = [...new Set(terms(QUESTION))];

const chunks: Array<{ id: string; text: string; triples: Triple[] }> = [
  { id: "c1", text: "Ana lidera o Atlas desde março.", triples: [["Ana", "lidera", "Atlas"]] },
  { id: "c2", text: "O Atlas fica hospedado no Fortaleza-2.", triples: [["Atlas", "roda_em", "Fortaleza-2"]] },
  { id: "c3", text: "Cada datacenter roda backups diários de cada projeto.", triples: [] },
  {
    id: "c4",
    text: "Ana revisou o projeto Boreal, que roda no Recife-1.",
    triples: [["Ana", "revisou", "Boreal"], ["Boreal", "roda_em", "Recife-1"]],
  },
  { id: "c5", text: "O datacenter Recife-1 recebeu discos novos.", triples: [] },
  {
    id: "c6",
    text: "Bruno lidera o Cometa, que roda no Recife-1.",
    triples: [["Bruno", "lidera", "Cometa"], ["Cometa", "roda_em", "Recife-1"]],
  },
];

const score = (text: string) => {
  const words = new Set(terms(text));
  return questionTerms.filter((term) => words.has(term)).length / questionTerms.length;
};
const scored = chunks.map((chunk, index) => ({ ...chunk, index, score: score(chunk.text) }));
const ranked = [...scored].sort((a, b) => b.score - a.score || a.index - b.index);
const TOP_K = 3;
const topK = ranked.slice(0, TOP_K);
const NEEDED = ["c1", "c2"];
const BRIDGE_CHUNK = "c2";
const bridgeRank = ranked.findIndex((chunk) => chunk.id === BRIDGE_CHUNK) + 1;
const neededFound = NEEDED.filter((id) => topK.some((chunk) => chunk.id === id)).length;
const wrongAnswer = "Recife-1";

// O grafo dos mesmos chunks. A extração normalizou "fica hospedado no" para a relação roda_em.
const triples = chunks.flatMap((chunk) => chunk.triples);
const nodes = [...new Set(triples.flatMap(([subject, , object]) => [subject, object]))];
const sourceOf = (triple: Triple) => chunks.find((chunk) => chunk.triples.includes(triple))?.id ?? "";

const START = "Ana";
const RELATIONS = ["lidera", "roda_em"];
let edgesExamined = 0;
const hops: Triple[] = [];
let frontier = [START];
for (const relation of RELATIONS) {
  const outgoing = triples.filter(([subject]) => frontier.includes(subject));
  edgesExamined += outgoing.length;
  const matched = outgoing.filter(([, predicate]) => predicate === relation);
  hops.push(...matched);
  frontier = matched.map(([, , object]) => object);
}
const answer = frontier[0];
const answerPath = [START, ...hops.map(([, , object]) => object)];
const evidence = [...new Set(hops.map(sourceOf))];

// Vizinhança a k saltos, sem direção: mostra como o subgrafo cresce.
const undirected = new Map<string, string[]>(nodes.map((node) => [node, []]));
for (const [subject, , object] of triples) {
  undirected.get(subject)?.push(object);
  undirected.get(object)?.push(subject);
}
const neighborhood = (hopsCount: number) => {
  let reached = new Set([START]);
  for (let hop = 0; hop < hopsCount; hop++) {
    reached = new Set([...reached, ...[...reached].flatMap((node) => undirected.get(node) ?? [])]);
  }
  return reached.size - 1;
};

// Personalized PageRank a partir da Ana.
const DAMPING = 0.85;
let rank = new Map<string, number>(nodes.map((node) => [node, node === START ? 1 : 0]));
for (let iteration = 0; iteration < 100; iteration++) {
  const next = new Map<string, number>(nodes.map((node) => [node, node === START ? 1 - DAMPING : 0]));
  for (const node of nodes) {
    const out = undirected.get(node) ?? [];
    for (const other of out) next.set(other, (next.get(other) ?? 0) + (DAMPING * (rank.get(node) ?? 0)) / out.length);
  }
  rank = next;
}
const pprSeries = nodes.map((node) => ({ label: node, value: Number((rank.get(node) ?? 0).toFixed(3)) }));
const pprOf = (node: string) => pprSeries.find((item) => item.label === node)?.value ?? 0;
const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const percent = (value: number) => `${Math.round(value * 100)}%`;

const layout: Record<string, { x: number; y: number }> = {
  Ana: { x: 0, y: 0.5 },
  Atlas: { x: 0.35, y: 0.15 },
  "Fortaleza-2": { x: 0.75, y: 0 },
  Boreal: { x: 0.35, y: 0.85 },
  "Recife-1": { x: 0.75, y: 0.7 },
  Bruno: { x: 1, y: 1 },
  Cometa: { x: 1, y: 0.35 },
};
const graph = (extra: Partial<GraphSpec> = {}): GraphSpec => ({
  id: "kg",
  piece: "graph",
  nodes: nodes.map((node) => ({ id: node, label: node, ...layout[node] })),
  edges: triples.map(([subject, predicate, object]) => ({ from: subject, to: object, label: predicate })),
  ...extra,
});

const lesson: LessonContent = {
  id: "09-06",
  subtitle: "Recuperar caminhos em vez de trechos: ligar a pergunta às entidades do grafo, andar os saltos certos e entregar o subgrafo como contexto.",
  objectives: [
    "Explicar por que a busca em chunks falha quando a entidade ponte não está na pergunta",
    "Responder uma pergunta de dois saltos com entity linking e travessia tipada",
    "Montar o contexto a partir do caminho e dos chunks de origem",
    "Interpretar o Personalized PageRank e os seus limites",
  ],
  steps: [
    {
      id: "bridge",
      shortTitle: "A ponte",
      title: "A peça que falta não está na pergunta",
      tag: "context",
      body: [
        `“${QUESTION}” Para responder, você precisa de dois fatos: qual projeto a Ana lidera, e onde esse projeto roda. O segundo fato fala do Atlas, e a palavra Atlas não está na pergunta. É como procurar “a cidade onde mora o autor do livro X” num índice: você acha o livro, acha cidades, mas não a biografia do autor.`,
        `O Atlas é a [[entidade ponte|bridge-entity]]: liga o primeiro salto ao segundo sem aparecer na pergunta. A busca por similaridade monta o top-${TOP_K} com ${topK.map((chunk) => chunk.id).join(", ")} e acha ${neededFound} dos ${NEEDED.length} chunks necessários. Pior: o c4 fala da Ana, de projeto e de “roda no ${wrongAnswer}”, e o modelo tende a responder ${wrongAnswer}, que está errado.`,
      ],
      keyIdea: "Em perguntas de vários saltos, o trecho decisivo costuma não ter nenhuma palavra da pergunta.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "question", kind: "user", label: "pergunta", col: 0, row: 0.5 },
              { id: "retrieval", kind: "retrieval", label: `top-${TOP_K}`, col: 1, row: 0.5 },
              { id: "context", kind: "context", label: topK.map((chunk) => chunk.id).join(" "), col: 2, row: 0.5 },
              { id: "wrong", kind: "no-result", label: `${wrongAnswer.toLowerCase()} (errado)`, col: 3, row: 0.5 },
            ],
            edges: [
              { from: "question", to: "retrieval" },
              { from: "retrieval", to: "context", label: `sem ${BRIDGE_CHUNK}` },
              { from: "context", to: "wrong", variant: "alternative" },
            ],
            active: "context",
          },
        ],
      },
      alt: `A pergunta passa pelo top-${TOP_K}, que traz ${topK.map((chunk) => chunk.id).join(", ")} sem o chunk ponte ${BRIDGE_CHUNK}; o contexto, em destaque, leva à resposta errada ${wrongAnswer}.`,
    },
    {
      id: "ranking",
      shortTitle: "Ranking",
      title: "O chunk ponte fica em último",
      tag: "mechanism",
      body: [
        `Na cena, a barra de cada chunk é a fração das ${questionTerms.length} palavras da pergunta (${questionTerms.join(", ")}) que ele contém. O ${BRIDGE_CHUNK}, “${chunks.find((chunk) => chunk.id === BRIDGE_CHUNK)?.text}”, tem ${percent(score(chunks.find((chunk) => chunk.id === BRIDGE_CHUNK)?.text ?? ""))}: fica em ${bridgeRank}º de ${chunks.length}. Com embeddings, o placar muda, mas o problema é o mesmo: o chunk ponte não se parece com a pergunta.`,
        `Aumentar o k não resolve com segurança: o ${BRIDGE_CHUNK} só entra com k = ${bridgeRank}, ou seja, o corpus inteiro. A saída do módulo 8 era a [[recuperação em vários saltos|multi-hop-retrieval]] com um agente, que busca, lê “Atlas” e busca de novo. A saída desta aula é guardar a ligação explícita: um grafo em que Ana → Atlas → datacenter já é um caminho.`,
      ],
      keyIdea: "Similaridade mede parecença com a pergunta; o elo do meio de um raciocínio não se parece com ela.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "scores",
            piece: "chart",
            kind: "bar",
            series: scored.map((chunk) => ({ label: chunk.id, value: chunk.score })),
            max: 1,
            highlight: scored.findIndex((chunk) => chunk.id === BRIDGE_CHUNK),
            color: "module-09",
          },
        ],
      },
      alt: `Score lexical de cada chunk: ${scored.map((chunk) => `${chunk.id} ${percent(chunk.score)}`).join(", ")}. O chunk ponte ${BRIDGE_CHUNK}, em destaque, tem ${percent(score(chunks.find((chunk) => chunk.id === BRIDGE_CHUNK)?.text ?? ""))} e fica em último.`,
    },
    {
      id: "traverse",
      shortTitle: "Travessia",
      title: "Ligar a entidade e andar pelo tipo",
      tag: "mechanism",
      body: [
        `Os mesmos chunks, extraídos em triplas, viram o grafo da cena. A extração normalizou “fica hospedado no” para roda_em, o vocabulário da ontologia. Agora a consulta tem dois passos: o [[entity linking|entity-linking]] liga “Ana” da pergunta ao nó Ana, e um LLM traduz a pergunta no padrão de relações ${RELATIONS.join(" → ")}.`,
        `A [[travessia em vários saltos|multi-hop-traversal]] segue só as arestas do tipo pedido: da Ana, ${RELATIONS[0]} leva ao ${hops[0]?.[2]}; do ${hops[0]?.[2]}, ${RELATIONS[1]} leva ao ${answer}. Foram examinadas ${edgesExamined} arestas, e “revisou Boreal” foi descartada pelo tipo. Resposta: ${answer}, com o caminho como justificativa.`,
      ],
      keyIdea: "Entity linking acha o ponto de partida; o tipo da relação escolhe, a cada salto, a aresta certa.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [graph({ path: answerPath, visited: answerPath, highlight: [answer] })],
      },
      alt: `Grafo extraído dos chunks com o caminho ${answerPath.join(", ")} em destaque, pelas relações ${RELATIONS.join(" e ")}; ${answer} é a resposta.`,
    },
    {
      id: "context",
      shortTitle: "Contexto",
      title: "O subgrafo vira contexto, com fontes",
      tag: "mechanism",
      body: [
        "O grafo encontra a resposta, mas quem escreve a frase final é o LLM. Ele recebe o caminho e também os chunks de onde cada aresta veio, para poder citar e para pegar nuances que a tripla perdeu, como “desde março”.",
        `Cada aresta guarda o chunk de origem. O caminho usa ${hops.length} arestas, vindas de ${evidence.join(" e ")}: o contexto leva as ${hops.length} triplas e esses ${evidence.length} chunks, e cada afirmação da resposta tem [[citação|citation]]. Isso é a [[recuperação por grafo|graph-retrieval]]: a unidade recuperada é um [[subgrafo|subgraph]] com as suas fontes, não um trecho parecido.`,
      ],
      keyIdea: "Recupere o caminho e os chunks de origem das arestas: o grafo acha, o texto justifica.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "question", kind: "user", label: "pergunta", col: 0, row: 0 },
              { id: "link", kind: "tool", label: "entity linking", col: 1, row: 0 },
              { id: "graph", kind: "nosql-db", label: "grafo", col: 2, row: 0 },
              { id: "context", kind: "context", label: `caminho + ${evidence.join(" ")}`, col: 2, row: 1 },
              { id: "llm", kind: "llm", label: "geração", col: 1, row: 1 },
              { id: "answer", kind: "answer", label: answer.toLowerCase(), col: 0, row: 1 },
            ],
            edges: [
              { from: "question", to: "link", label: "“Ana”" },
              { from: "link", to: "graph", label: RELATIONS.join(" → ") },
              { from: "graph", to: "context", label: "subgrafo" },
              { from: "context", to: "llm" },
              { from: "llm", to: "answer", label: "com citações" },
            ],
            active: "context",
            done: ["question", "link", "graph"],
          },
        ],
      },
      alt: `A pergunta passa pelo entity linking, que acha a Ana no grafo e segue ${RELATIONS.join(" e ")}; o subgrafo vira o contexto, em destaque, com o caminho e os chunks ${evidence.join(" e ")}, e o LLM responde ${answer} com citações.`,
    },
    {
      id: "ppr",
      shortTitle: "PageRank",
      title: "Personalized PageRank: a vizinhança que importa",
      tag: "example",
      body: [
        "Nem toda pergunta vira um padrão de relações limpo. Uma alternativa é pontuar os nós pela proximidade às entidades da pergunta: solte um andarilho na Ana, deixe-o andar pelas arestas ao acaso e, a cada passo, com 15% de chance, mande-o de volta à Ana. Os nós onde ele passa mais tempo são os relevantes.",
        `Isso é o [[Personalized PageRank|personalized-pagerank]], usado pelo HippoRAG (Gutiérrez et al., 2024) sobre um grafo extraído das passagens. Na cena: Ana ${fixed(pprOf("Ana"), 3)}, ${answer} ${fixed(pprOf(answer), 3)}, ${wrongAnswer} ${fixed(pprOf(wrongAnswer), 3)}, Bruno ${fixed(pprOf("Bruno"), 3)}. Ele acha a vizinhança da Ana, mas o ${wrongAnswer}, ligado a dois projetos, pontua ${pprOf(wrongAnswer) > pprOf(answer) ? "mais" : "menos"} que a resposta certa: o PPR não lê o tipo da relação. Ele é ótimo para escolher os chunks candidatos; a travessia tipada é que decide a resposta.`,
      ],
      keyIdea: "PPR ranqueia pela proximidade às entidades da pergunta, sem saber o que cada aresta significa.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "ppr",
            piece: "chart",
            kind: "bar",
            series: pprSeries,
            highlight: nodes.indexOf(answer),
            color: "module-09",
          },
        ],
      },
      alt: `Personalized PageRank a partir da Ana: ${pprSeries.map((item) => `${item.label} ${fixed(item.value, 3)}`).join(", ")}. ${answer}, a resposta certa, em destaque.`,
    },
    {
      id: "limits",
      shortTitle: "Limites",
      title: "Onde a recuperação por grafo quebra",
      tag: "tradeoff",
      body: [
        "Três pontos falham na prática. O entity linking erra com nomes repetidos: duas Anas na empresa, e a travessia parte do nó errado. A extração perde relações: se o c2 não tivesse virado tripla, o caminho não existiria. E a vizinhança explode: cada salto multiplica os nós.",
        `Na cena, a vizinhança da Ana tem ${neighborhood(1)} nós a 1 salto, ${neighborhood(2)} a 2 e ${neighborhood(3)} a 3, já quase o grafo inteiro de ${nodes.length} nós. Num grafo real, com hubs de grau alto, 2 ou 3 saltos sem filtro trazem milhares de nós. Por isso a travessia filtra pelo tipo da relação, limita os saltos e o número de vizinhos, e usa um ranking como o PPR para cortar o resto.`,
      ],
      keyIdea: "Filtre por tipo, limite saltos e vizinhos: sem isso, o subgrafo cresce mais rápido que a janela de contexto.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "neighborhood",
            piece: "metrics-panel",
            metrics: [
              { id: "h1", label: "nós a 1 salto", value: String(neighborhood(1)) },
              { id: "h2", label: "nós a 2 saltos", value: String(neighborhood(2)), color: "info" },
              { id: "h3", label: "nós a 3 saltos", value: String(neighborhood(3)), color: "danger" },
              { id: "typed", label: "arestas na travessia tipada", value: String(edgesExamined), color: "success" },
            ],
            highlight: "h3",
          },
        ],
      },
      alt: `Vizinhança da Ana: ${neighborhood(1)} nós a 1 salto, ${neighborhood(2)} a 2 e ${neighborhood(3)} a 3, em destaque; a travessia tipada examinou só ${edgesExamined} arestas.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Do texto ao caminho e de volta ao texto",
      tag: "summary",
      body: [
        "A recuperação por grafo resolve o elo que a similaridade não acha: ligar as entidades da pergunta aos nós, seguir as relações pedidas, juntar o subgrafo com os chunks de origem e deixar o LLM escrever com citações. PPR e limites de saltos controlam o tamanho.",
        "A próxima aula sobe um nível: como uma organização decide onde cada conhecimento mora, entre pesos, prompt, índice, grafo e ferramentas, e quem cuida de cada um.",
      ],
      keyIdea: "Ligar, andar, juntar fontes, responder: o caminho é a recuperação.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "steps",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "link", label: "entity linking" },
              { id: "plan", label: "padrão de relações" },
              { id: "walk", label: "travessia tipada", color: "module-09" },
              { id: "rank", label: "cortar com PPR e limites" },
              { id: "sources", label: "chunks de origem" },
              { id: "answer", label: "resposta com citações", color: "brand" },
            ],
          },
        ],
      },
      alt: "Fluxo em chips: entity linking, padrão de relações, travessia tipada, cortar com PPR e limites, chunks de origem e resposta com citações.",
    },
  ],
  realWorldExample:
    "O HippoRAG (Gutiérrez et al., 2024) extrai triplas das passagens com um LLM, liga as entidades da pergunta aos nós do grafo e roda Personalized PageRank a partir delas para ranquear as passagens. Ele foi avaliado em benchmarks de perguntas de vários saltos, como MuSiQue, 2WikiMultiHopQA e HotpotQA, contra recuperadores de um passo e iterativos.",
  code: {
    language: "python",
    source: `import networkx as nx

triplas = [("Ana", "lidera", "Atlas"), ("Atlas", "roda_em", "Fortaleza-2"),
           ("Ana", "revisou", "Boreal"), ("Boreal", "roda_em", "Recife-1"),
           ("Bruno", "lidera", "Cometa"), ("Cometa", "roda_em", "Recife-1")]

def seguir(inicio, relacoes):
    fronteira = {inicio}
    for relacao in relacoes:
        fronteira = {o for s, r, o in triplas if s in fronteira and r == relacao}
    return fronteira

print(seguir("Ana", ["lidera", "roda_em"]))  # {'Fortaleza-2'}

G = nx.Graph((s, o) for s, _, o in triplas)
print(nx.pagerank(G, alpha=0.85, personalization={"Ana": 1}))`,
    caption: "A travessia tipada da aula e o Personalized PageRank do NetworkX, com o recomeço sempre na Ana.",
  },
  tradeOffs: {
    pros: [
      "Resolve perguntas de vários saltos em que a entidade ponte não está na pergunta",
      "O caminho é uma justificativa auditável, com o chunk de origem de cada aresta",
      "Uma travessia examina poucas arestas, em vez de várias rodadas de busca",
    ],
    cons: [
      "Depende do entity linking: o nó de partida errado leva a uma resposta errada e confiante",
      "Relação não extraída é caminho inexistente",
      "A vizinhança cresce rápido com os saltos e com os hubs",
    ],
    alternatives: [
      "Agentic RAG com buscas iterativas, sem grafo",
      "Decomposição da pergunta em subperguntas, cada uma com a sua busca",
    ],
  },
  knowledgeCheck: [
    {
      id: "bridge-question",
      prompt: "“Qual é o orçamento do time do gerente que aprovou o contrato 88?” Qual é a entidade ponte?",
      options: [
        "O contrato 88",
        "O gerente que aprovou o contrato, que não é nomeado na pergunta",
        "A palavra orçamento",
        "Não há ponte: é uma pergunta de um salto",
      ],
      correct: 1,
      explanation: "O primeiro salto descobre quem aprovou o contrato; esse nome não está na pergunta e é o que liga ao segundo salto, o orçamento do time dele.",
      lesson: "09-06",
    },
    {
      id: "ppr-limit",
      prompt: "O PPR a partir das entidades da pergunta deu nota alta a um nó que não é a resposta. Qual é a causa mais provável?",
      options: [
        "O damping está errado",
        "O PPR mede proximidade no grafo e ignora o tipo das relações: um nó bem ligado à vizinhança pontua alto mesmo pela relação errada",
        "O grafo tem nós demais para o PPR",
        "O LLM escreveu a resposta errada",
      ],
      correct: 1,
      explanation: "O passeio aleatório segue qualquer aresta. Ele acha a região certa, e a escolha da aresta certa fica para a travessia tipada ou para o LLM lendo os chunks.",
      lesson: "09-06",
    },
  ],
  related: ["09-05", "08-14", "09-07"],
  references: [
    {
      title: "Gutiérrez et al. (2024), HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models",
      url: "https://arxiv.org/abs/2405.14831",
      kind: "paper",
    },
    {
      title: "Yang et al. (2018), HotpotQA: A Dataset for Diverse, Explainable Multi-hop Question Answering",
      url: "https://arxiv.org/abs/1809.09600",
      kind: "paper",
    },
    {
      title: "Sun et al. (2023), Think-on-Graph: Deep and Responsible Reasoning of Large Language Model on Knowledge Graph",
      url: "https://arxiv.org/abs/2307.07697",
      kind: "paper",
    },
  ],
};

export default lesson;
