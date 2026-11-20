import type { GraphSpec, VectorPoint } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Dez clientes de uma cafeteria, sem rótulo nenhum: visitas por mês e gasto médio (em dezenas de reais).
// Grupos por vizinhança (componentes conexos de um grafo), PCA pela matriz de covariância e anomalia
// pela distância ao vizinho mais próximo, tudo calculado abaixo.

interface Customer {
  id: string;
  visits: number;
  spend: number;
}

const customers: Customer[] = [
  { id: "c1", visits: 1, spend: 8 },
  { id: "c2", visits: 1.5, spend: 9 },
  { id: "c3", visits: 2, spend: 8.2 },
  { id: "c4", visits: 4.2, spend: 5 },
  { id: "c5", visits: 5, spend: 5.5 },
  { id: "c6", visits: 4.6, spend: 4.2 },
  { id: "c7", visits: 8, spend: 2 },
  { id: "c8", visits: 9, spend: 2.6 },
  { id: "c9", visits: 8.6, spend: 1.4 },
  { id: "c10", visits: 9.5, spend: 9.5 },
];

const fixed = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const percent = (value: number) => `${Math.round(value * 100)}%`;
const distance = (a: Customer, b: Customer) => Math.hypot(a.visits - b.visits, a.spend - b.spend);

/** Liga clientes a menos de `radius` de distância e conta os grupos (componentes conexos). */
const groupsWithin = (radius: number) => {
  const edges = customers.flatMap((a, i) =>
    customers.slice(i + 1).filter((b) => distance(a, b) < radius).map((b) => ({ from: a.id, to: b.id })),
  );
  const group = new Map<string, number>();
  let count = 0;
  for (const start of customers) {
    if (group.has(start.id)) continue;
    const queue = [start.id];
    group.set(start.id, count);
    while (queue.length > 0) {
      const current = queue.shift();
      for (const edge of edges) {
        const next = edge.from === current ? edge.to : edge.to === current ? edge.from : undefined;
        if (next !== undefined && !group.has(next)) {
          group.set(next, count);
          queue.push(next);
        }
      }
    }
    count += 1;
  }
  const sizes = [...new Set(group.values())].map((id) => [...group.values()].filter((value) => value === id).length);
  return { edges, count, singletons: sizes.filter((size) => size === 1).length };
};

const RADIUS = 1.6;
const WIDE_RADIUS = 4;
const tight = groupsWithin(RADIUS);
const wide = groupsWithin(WIDE_RADIUS);

const AXIS_MAX = 11;
const graph: GraphSpec = {
  id: "similarity",
  piece: "graph",
  nodes: customers.map((customer) => ({
    id: customer.id,
    label: customer.id,
    x: customer.visits / AXIS_MAX,
    y: 1 - customer.spend / AXIS_MAX,
  })),
  edges: tight.edges,
};

// PCA em 2D: covariância, maior autovalor e o autovetor dele.
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
const meanVisits = mean(customers.map((customer) => customer.visits));
const meanSpend = mean(customers.map((customer) => customer.spend));
const covariance = (f: (c: Customer) => number, g: (c: Customer) => number, mf: number, mg: number) =>
  customers.reduce((sum, customer) => sum + (f(customer) - mf) * (g(customer) - mg), 0) / (customers.length - 1);
const varVisits = covariance((c) => c.visits, (c) => c.visits, meanVisits, meanVisits);
const varSpend = covariance((c) => c.spend, (c) => c.spend, meanSpend, meanSpend);
const covVS = covariance((c) => c.visits, (c) => c.spend, meanVisits, meanSpend);
const trace = varVisits + varSpend;
const gap = Math.sqrt(((varVisits - varSpend) / 2) ** 2 + covVS ** 2);
const lambda1 = trace / 2 + gap;
const explained = lambda1 / trace;
const rawDirection = [covVS, lambda1 - varVisits];
const directionLength = Math.hypot(rawDirection[0], rawDirection[1]);
const direction = rawDirection.map((value) => value / directionLength);
const ARROW = 3;
const pcaPoints: VectorPoint[] = [
  ...customers.map<VectorPoint>((customer) => ({ id: customer.id, label: customer.id, coords: [customer.visits, customer.spend] })),
  { id: "mean", label: "média", coords: [meanVisits, meanSpend], color: "ink" },
  {
    id: "pc1",
    label: "PC1",
    coords: [meanVisits + ARROW * direction[0], meanSpend + ARROW * direction[1]],
    color: "module-01",
  },
];
/** Coordenada de cada cliente no eixo PC1: dois números viram um. */
const pc1Score = (customer: Customer) => (customer.visits - meanVisits) * direction[0] + (customer.spend - meanSpend) * direction[1];
const loyal = customers.find((customer) => customer.id === "c8") ?? customers[0];

// Anomalia: distância até o vizinho mais próximo.
const nearestDistance = (customer: Customer) =>
  Math.min(...customers.filter((other) => other.id !== customer.id).map((other) => distance(customer, other)));
const isolation = customers.map((customer) => ({ id: customer.id, value: nearestDistance(customer) }));
const ANOMALY_THRESHOLD = 2;
const anomalies = isolation.filter((item) => item.value >= ANOMALY_THRESHOLD);
const outlier = [...isolation].sort((a, b) => b.value - a.value)[0];

const lesson: LessonContent = {
  id: "01-03",
  subtitle: "Sem gabarito: o algoritmo procura sozinho grupos, direções importantes e casos fora do padrão.",
  objectives: [
    "Reconhecer quando um problema não tem rótulos e o que dá para extrair mesmo assim",
    "Ver grupos surgirem de uma regra de vizinhança",
    "Entender o PCA como a direção em que os dados mais variam",
    "Detectar uma anomalia pela distância aos vizinhos",
  ],
  steps: [
    {
      id: "no-labels",
      shortTitle: "Sem rótulo",
      title: "Uma pilha de dados sem gabarito",
      tag: "context",
      body: [
        "Imagine uma caixa de fotos antigas sem legenda. Ninguém diz quem é quem, mas você logo separa as fotos da praia, as do casamento e uma foto estranha que não combina com nada. [[Aprendizado não supervisionado|unsupervised-learning]] faz isso com dados: acha estrutura sem rótulos.",
        `A cafeteria tem ${customers.length} clientes, cada um com visitas por mês e gasto médio. Não existe a coluna “tipo de cliente”. Três perguntas cabem aqui: quais clientes se parecem (grupos), qual resumo perde menos informação ([[redução de dimensionalidade|dimensionality-reduction]]) e quem foge do padrão ([[anomalias|anomaly-detection]]).`,
      ],
      keyIdea: "Sem rótulo não há certo ou errado para copiar: o algoritmo descreve a forma dos dados.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "unsupervised",
            piece: "block-diagram",
            blocks: [
              { id: "data", kind: "documents", label: "compras", col: 0, row: 0.5 },
              { id: "algo", kind: "retrieval", label: "algoritmo", col: 1, row: 0.5 },
              { id: "groups", kind: "sql-db", label: "grupos", col: 2, row: 0 },
              { id: "summary", kind: "embedding", label: "resumo (PCA)", col: 3, row: 0.5 },
              { id: "odd", kind: "no-result", label: "anomalias", col: 2, row: 1 },
            ],
            edges: [
              { from: "data", to: "algo", label: "sem rótulo" },
              { from: "algo", to: "groups" },
              { from: "algo", to: "summary" },
              { from: "algo", to: "odd" },
            ],
            active: "algo",
          },
        ],
      },
      alt: "Compras sem rótulo entram num algoritmo, em destaque, que devolve três coisas: grupos de clientes, um resumo por PCA e as anomalias.",
    },
    {
      id: "neighbors-graph",
      shortTitle: "Grafo",
      title: "Quem é parecido se liga",
      tag: "mechanism",
      body: [
        `Uma regra simples já cria grupos: ligue dois clientes quando a distância entre eles for menor que ${fixed(RADIUS)}. No grafo, x é a frequência e a altura é o gasto. As ligações formam ${tight.count} ilhas: os que vêm pouco e gastam muito, os do meio, os que vêm sempre e gastam pouco, e ${tight.singletons} cliente sozinho.`,
        "Nenhum rótulo foi usado: os grupos saíram só da distância. O detalhe técnico que importa é que a distância depende da escala. Se o gasto estivesse em reais e as visitas em unidades, o gasto dominaria tudo; por isso se padronizam as features (média 0, desvio 1) antes de medir.",
      ],
      keyIdea: "Defina o que é “parecido” e os grupos aparecem; a escala das features decide o que é parecido.",
      scene: { kind: "pieces", layout: "single", pieces: [graph] },
      alt: `Grafo dos ${customers.length} clientes posicionados por visitas e gasto; ligações entre clientes próximos formam ${tight.count} ilhas, uma delas com um cliente isolado.`,
    },
    {
      id: "pca",
      shortTitle: "PCA",
      title: "Dois números viram um",
      tag: "mechanism",
      body: [
        `Visitas e gasto andam juntos ao contrário: quem vem mais gasta menos por visita. O [[PCA|pca]] acha a direção em que os pontos mais se espalham, a seta PC1, que sai da média dos clientes. Só nessa direção está ${percent(explained)} da variação total dos dados.`,
        `A conta: monte a matriz de covariância (variâncias ${fixed(varVisits)} e ${fixed(varSpend)}, covariância ${fixed(covVS)}), pegue o autovetor do maior autovalor (${fixed(lambda1)}) e projete cada cliente nele. O cliente ${loyal.id} vira o número ${fixed(pc1Score(loyal))} nesse eixo. Com 1.000 features em vez de 2, o PCA guarda as poucas direções que explicam a maior parte e descarta o resto.`,
      ],
      keyIdea: "PCA troca as features originais pelas direções de maior variância, e guarda só as primeiras.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [{ id: "pca", piece: "vector-space", points: pcaPoints, vectors: [{ from: "mean", to: "pc1" }] }],
      },
      alt: `Os clientes no plano de visitas e gasto, com a seta PC1 saindo da média na direção de maior espalhamento, que concentra ${percent(explained)} da variação.`,
    },
    {
      id: "outlier",
      shortTitle: "Anomalia",
      title: "O cliente que não combina",
      tag: "example",
      body: [
        `Para cada cliente, medimos a distância até o vizinho mais próximo. Quem está num grupo tem alguém por perto; quem está longe de todos é suspeito. O cliente ${outlier.id} fica a ${fixed(outlier.value)} do vizinho mais perto, e é o único acima do limite de ${fixed(ANOMALY_THRESHOLD)}.`,
        "Esse cliente vem quase todo dia e gasta muito: pode ser um ótimo cliente, uma empresa comprando para a equipe ou um cartão clonado. O algoritmo só aponta o diferente; decidir o que ele significa continua com uma pessoa ou com outro modelo. Sistemas antifraude costumam combinar essa nota de anomalia com regras e com modelos supervisionados.",
      ],
      keyIdea: "Anomalia é distância do normal; o algoritmo encontra, e o contexto explica.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "isolation",
            piece: "chart",
            kind: "bar",
            series: isolation.map((item) => ({ label: item.id, value: Number(item.value.toFixed(2)) })),
            cutoff: { mode: "threshold", value: ANOMALY_THRESHOLD, label: `limite ${fixed(ANOMALY_THRESHOLD)}` },
            highlight: isolation.indexOf(outlier),
            color: "module-01",
          },
        ],
      },
      alt: `Barras com a distância de cada cliente ao vizinho mais próximo; só ${anomalies.map((item) => item.id).join(", ")} passa do limite de ${fixed(ANOMALY_THRESHOLD)}.`,
    },
    {
      id: "no-truth",
      shortTitle: "Sem verdade",
      title: "Quem diz se o resultado está certo?",
      tag: "tradeoff",
      body: [
        `Troque o raio de ${fixed(RADIUS)} para ${fixed(WIDE_RADIUS)} e os mesmos dados viram ${wide.count} ${wide.count === 1 ? "grupo" : "grupos"} em vez de ${tight.count}. As duas respostas são “corretas”: não existe gabarito para comparar. O resultado depende das escolhas de quem roda o algoritmo.`,
        "Por isso a avaliação é indireta: os grupos fazem sentido para o negócio? Uma campanha diferente para cada grupo vende mais? O PCA mantém a informação que importa para a próxima tarefa? Métricas internas, como a coesão dos grupos, ajudam a comparar opções, mas não dizem qual é a verdadeira.",
      ],
      keyIdea: "No não supervisionado, as escolhas (distância, escala, número de grupos) fazem parte do resultado.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "choices",
            piece: "metrics-panel",
            metrics: [
              { id: "tight", label: `grupos com raio ${fixed(RADIUS)}`, value: `${tight.count}` },
              { id: "wide", label: `grupos com raio ${fixed(WIDE_RADIUS)}`, value: `${wide.count}`, color: "danger" },
              { id: "pca", label: "variação no PC1", value: percent(explained) },
              { id: "odd", label: "anomalias", value: `${anomalies.length}` },
            ],
            highlight: "wide",
          },
        ],
      },
      alt: `Painel: ${tight.count} grupos com raio ${fixed(RADIUS)} e ${wide.count} com raio ${fixed(WIDE_RADIUS)}, ${percent(explained)} da variação no PC1 e ${anomalies.length} anomalia.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Sem rótulo, mas em todo lugar",
      tag: "summary",
      body: [
        "Grupos, resumos e anomalias são as três tarefas clássicas sem rótulo. A mais usada, o [[clustering|clustering]], ganha uma aula própria com o k-means. Elas aparecem antes de um modelo supervisionado (para explorar os dados) e depois dele (para achar o que o modelo não previu).",
        "Os LLMs levam a ideia mais longe: o [[pré-treino|pre-training]] usa texto sem rótulo humano nenhum, porque a próxima palavra do texto serve de gabarito. Isso se chama aprendizado autossupervisionado. Os [[embeddings|embedding]] que saem desse treino são agrupados e buscados exatamente como os clientes desta aula. Na próxima aula, o sinal de aprendizado vira uma recompensa.",
      ],
      keyIdea: "Dado sem rótulo é o dado mais barato que existe, e o pré-treino dos LLMs é feito dele.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "self-supervised",
            piece: "block-diagram",
            blocks: [
              { id: "text", kind: "documents", label: "texto bruto", col: 0, row: 0 },
              { id: "tokens", kind: "tokens", label: "tokens", col: 1, row: 0 },
              { id: "llm", kind: "llm", label: "pré-treino", col: 2, row: 0 },
              { id: "vectors", kind: "embedding", label: "embeddings", col: 2, row: 1 },
              { id: "groups", kind: "vector-db", label: "grupos e busca", col: 3, row: 1 },
            ],
            edges: [
              { from: "text", to: "tokens" },
              { from: "tokens", to: "llm", label: "próximo token" },
              { from: "llm", to: "vectors" },
              { from: "vectors", to: "groups" },
            ],
            active: "llm",
          },
        ],
      },
      alt: "Texto bruto vira tokens que alimentam o pré-treino, em destaque, usando o próximo token como gabarito; o modelo produz embeddings que são agrupados e buscados.",
    },
  ],
  realWorldExample:
    "O pré-treino de modelos como o GPT-3 usou centenas de bilhões de tokens de texto da web, livros e Wikipedia sem rótulo humano: o próprio texto fornece a resposta, que é o token seguinte.",
  code: {
    language: "python",
    source: `import numpy as np
from sklearn.decomposition import PCA

X = np.array([[1, 8], [1.5, 9], [2, 8.2], [4.2, 5], [5, 5.5],
              [4.6, 4.2], [8, 2], [9, 2.6], [8.6, 1.4], [9.5, 9.5]])

pca = PCA(n_components=1).fit(X)
print(pca.explained_variance_ratio_)  # fração da variação no PC1
print(pca.transform(X)[:3])           # cada cliente vira um número`,
    caption: "Os 10 clientes da aula: o PCA encontra a direção principal e projeta cada cliente nela.",
  },
  tradeOffs: {
    pros: [
      "Funciona com o dado mais abundante e barato: o sem rótulo",
      "Revela grupos e padrões que ninguém tinha pensado em rotular",
      "Comprime features e acelera os modelos seguintes",
    ],
    cons: [
      "Não há gabarito: o resultado depende de escolhas como escala e número de grupos",
      "Grupos podem não ter significado para o negócio",
      "Difícil de avaliar de forma objetiva",
    ],
    alternatives: [
      "Rotular uma amostra e treinar um modelo supervisionado",
      "Autossupervisionado: criar o rótulo a partir do próprio dado, como prever a próxima palavra",
    ],
  },
  knowledgeCheck: [
    {
      id: "scale-matters",
      prompt: "Você agrupa clientes por idade (anos) e renda (reais por mês) sem padronizar. O que acontece?",
      options: [
        "Nada: o algoritmo ajusta a escala sozinho",
        "A renda, com números na casa dos milhares, domina a distância e a idade quase não conta",
        "A idade domina, porque é uma feature inteira",
        "O algoritmo devolve um erro",
      ],
      correct: 1,
      explanation: "Distâncias somam diferenças nas unidades originais. Uma diferença de R$ 1.000 pesa muito mais que 30 anos. Padronizar cada feature deixa as duas com o mesmo peso.",
      lesson: "01-03",
    },
    {
      id: "pca-keeps",
      prompt: "Um PCA em 50 features mostra que os 3 primeiros componentes explicam 95% da variância. O que isso permite?",
      options: [
        "Descartar 47 features originais escolhidas ao acaso",
        "Representar cada exemplo com 3 números perdendo cerca de 5% da variação",
        "Saber o rótulo de cada exemplo",
        "Garantir que um classificador vai acertar 95%",
      ],
      correct: 1,
      explanation: "Os componentes são combinações das 50 features. Projetar nos 3 primeiros guarda 95% da variância; isso não diz nada sobre acerto de um modelo nem sobre rótulos.",
      lesson: "01-03",
    },
  ],
  related: ["01-02", "01-04", "01-07"],
  references: [
    { title: "scikit-learn: Unsupervised learning", url: "https://scikit-learn.org/stable/unsupervised_learning.html", kind: "docs" },
    { title: "scikit-learn: Decomposing signals in components (PCA)", url: "https://scikit-learn.org/stable/modules/decomposition.html", kind: "docs" },
    { title: "Language Models are Few-Shot Learners (GPT-3)", url: "https://arxiv.org/abs/2005.14165", kind: "paper" },
  ],
};

export default lesson;
