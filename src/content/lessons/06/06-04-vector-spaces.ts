import type { GraphSpec, VectorPoint } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// O espaço de embeddings visto como geometria, com contas reais: o grafo de vizinhança (arestas entre
// pontos a menos de um raio) e os grupos que surgem dele, a ilusão de uma projeção 3D → 2D, e a
// anisotropia (todos os vetores num cone estreito) antes e depois de subtrair o vetor médio.
// As coordenadas são ilustrativas, escolhidas à mão.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const dot = (a: number[], b: number[]) => a.reduce((sum, value, index) => sum + value * b[index], 0);
const cosine = (a: number[], b: number[]) => dot(a, b) / (Math.hypot(...a) * Math.hypot(...b));
const distance = (a: number[], b: number[]) => Math.hypot(...a.map((value, index) => value - b[index]));
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

// Passos 1 e 2: chamados de suporte num mapa 2D.
type Coords2 = [number, number];
const tickets: Record<string, Coords2> = {
  senha: [-1.8, 1.6],
  login: [-1.4, 1.9],
  "2FA": [-2.1, 1.1],
  boleto: [1.7, 1.5],
  fatura: [2, 1],
  estorno: [1.3, 1.9],
  entrega: [0.2, -1.8],
  atraso: [0.6, -1.4],
  rastreio: [-0.2, -2],
};
const QUERY: Coords2 = [-1.6, 1.3];
const QUERY_LABEL = "não consigo entrar";
const ticketPoints: VectorPoint[] = [
  ...Object.entries(tickets).map(([label, coords]) => ({ id: label, label, coords })),
  { id: "query", label: QUERY_LABEL, coords: QUERY, color: "brand" },
];

// Grafo de vizinhança: aresta entre dois chamados a menos de RADIUS. Os grupos são as componentes conexas.
const RADIUS = 0.9;
const names = Object.keys(tickets);
const neighborEdges = names.flatMap((from, i) =>
  names
    .slice(i + 1)
    .filter((to) => distance(tickets[from], tickets[to]) < RADIUS)
    .map((to) => ({ from, to })),
);
const parent = new Map(names.map((name) => [name, name]));
const root = (name: string): string => {
  const up = parent.get(name) ?? name;
  return up === name ? name : root(up);
};
for (const edge of neighborEdges) parent.set(root(edge.from), root(edge.to));
const groups = new Set(names.map(root)).size;

const xs = names.map((name) => tickets[name][0]);
const ys = names.map((name) => tickets[name][1]);
const toUnit = (value: number, min: number, max: number) => (value - min) / (max - min);
const neighborhoodGraph: GraphSpec = {
  id: "neighborhood",
  piece: "graph",
  nodes: names.map((name) => ({
    id: name,
    label: name,
    x: toUnit(tickets[name][0], Math.min(...xs), Math.max(...xs)),
    y: 1 - toUnit(tickets[name][1], Math.min(...ys), Math.max(...ys)),
  })),
  edges: neighborEdges,
  highlight: ["senha", "login", "2FA"],
};

// Passo 3: dois pontos que a vista isométrica quase sobrepõe. A projeção achata a direção (1, 1, 1).
type Coords3 = [number, number, number];
const COS_30 = Math.cos(Math.PI / 6);
const isometric = ([x, y, z]: Coords3): Coords2 => [(x - z) * COS_30, y - (x + z) / 2];
const contrato: Coords3 = [1, 0.2, 0.2];
const SHIFT = 1.5;
const multa: Coords3 = [contrato[0] + SHIFT + 0.1, contrato[1] + SHIFT, contrato[2] + SHIFT];
const aluguel: Coords3 = [1.3, 0.9, 0.1];
const distance3d = distance(contrato, multa);
const distance2d = distance(isometric(contrato), isometric(multa));
const distanceAluguel3d = distance(contrato, aluguel);
const distanceAluguel2d = distance(isometric(contrato), isometric(aluguel));

// Passo 4: anisotropia. Cada vetor é uma componente comum grande mais uma parte própria do assunto.
const common = [1.5, 1.2, 1.4, 1.3];
const sentences = [
  { label: "trocar senha", topic: "conta", own: [0.6, -0.5, 0.1, 0] },
  { label: "esqueci a senha", topic: "conta", own: [0.5, -0.6, 0, 0.1] },
  { label: "boleto vencido", topic: "cobrança", own: [-0.5, 0.6, 0.1, -0.1] },
  { label: "2ª via da fatura", topic: "cobrança", own: [-0.6, 0.5, -0.1, 0.1] },
  { label: "rastrear pedido", topic: "entrega", own: [0, 0.1, 0.6, -0.6] },
];
const raw = sentences.map((sentence) => sentence.own.map((value, index) => value + common[index]));
const centroid = raw[0].map((_, col) => mean(raw.map((row) => row[col])));
const centered = raw.map((row) => row.map((value, col) => value - centroid[col]));
const pairsOf = (sameTopic: boolean) =>
  sentences.flatMap((a, i) =>
    sentences.slice(i + 1).flatMap((b, offset) => ((a.topic === b.topic) === sameTopic ? [[i, i + 1 + offset]] : [])),
  );
const meanCosine = (vectors: number[][], pairs: number[][]) => mean(pairs.map(([i, j]) => cosine(vectors[i], vectors[j])));
const rawDifferent = meanCosine(raw, pairsOf(false));
const centeredDifferent = meanCosine(centered, pairsOf(false));
const centeredSame = meanCosine(centered, pairsOf(true));
const rawMatrix = raw.map((a) => raw.map((b) => Number(cosine(a, b).toFixed(2))));
const rawMin = Math.min(...rawMatrix.flat());

const lesson: LessonContent = {
  id: "06-04",
  subtitle:
    "O espaço de embeddings como um mapa: vizinhanças, grupos que surgem sozinhos, projeções que enganam e um cone estreito que faz qualquer cosseno parecer alto.",
  objectives: [
    "Descrever um espaço de embeddings como pontos, distâncias e vizinhanças",
    "Mostrar como grupos de assuntos aparecem ao ligar pontos próximos",
    "Explicar por que projeções em 2D podem juntar pontos que estão longe",
    "Reconhecer a anisotropia e por que um limiar fixo de similaridade é frágil",
  ],
  steps: [
    {
      id: "city-map",
      shortTitle: "Mapa",
      title: "Um mapa em que cada texto é um endereço",
      tag: "context",
      body: [
        `Numa cidade, bairros juntam casas parecidas: o centro financeiro, a zona universitária, o bairro das oficinas. O [[espaço de embeddings|embedding-space]] é uma cidade assim para textos. Na cena, chamados de suporte formam três bairros: acesso à conta, cobrança e entrega. O chamado novo “${QUERY_LABEL}” chega e cai no bairro do acesso.`,
        "Formalmente, o espaço é o conjunto de todos os vetores que o modelo pode produzir, com uma medida de distância. Ele só tem sentido para o modelo que o criou: as coordenadas não são lugares universais, são lugares relativos aos outros textos codificados pelo mesmo modelo.",
      ],
      keyIdea: "Um espaço de embeddings é um mapa relativo: o que importa é quem está perto de quem, não a coordenada em si.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [{ id: "space", piece: "vector-space", points: ticketPoints, query: "query", neighbors: 3 }],
      },
      alt: `Mapa 2D com chamados de suporte em três grupos: acesso, cobrança e entrega. O chamado novo “${QUERY_LABEL}” tem senha, login e 2FA como vizinhos.`,
    },
    {
      id: "neighborhoods",
      shortTitle: "Vizinhança",
      title: "Ligue os vizinhos e os grupos aparecem",
      tag: "mechanism",
      body: [
        `Ninguém rotulou os bairros. Ligue cada par de chamados a menos de ${fixed(RADIUS, 1)} de distância: saem ${neighborEdges.length} arestas e ${groups} grupos separados, sem nenhuma aresta entre eles. Os assuntos surgem da geometria, que é o que algoritmos de agrupamento como o [[k-means|k-means]] exploram.`,
        "Esse grafo de vizinhança é mais do que um desenho. Ele é a ideia por trás dos índices que buscam rápido em milhões de vetores: em vez de comparar a pergunta com todo mundo, a busca anda de vizinho em vizinho em direção a ela. Você vai ver esse passeio na aula 06-12.",
      ],
      keyIdea: "Ligar pontos próximos revela a estrutura do espaço, e é a base dos índices de busca por grafo.",
      scene: { kind: "pieces", layout: "single", pieces: [neighborhoodGraph] },
      alt: `Grafo com os ${names.length} chamados ligados quando estão a menos de ${fixed(RADIUS, 1)}: ${neighborEdges.length} arestas formam ${groups} grupos, e o grupo de acesso está em destaque.`,
    },
    {
      id: "projection",
      shortTitle: "Projeção",
      title: "Uma projeção pode juntar quem está longe",
      tag: "mechanism",
      body: [
        `Uma sombra na parede junta objetos que estão em distâncias diferentes da lâmpada. Toda projeção faz isso. Na cena em 3D, “contrato” e “multa” aparecem quase colados, a ${fixed(distance2d)} no desenho, mas estão a ${fixed(distance3d)} no espaço: mais longe do que “aluguel”, que no desenho parece afastado (${fixed(distanceAluguel2d)}) e no espaço está a ${fixed(distanceAluguel3d)}.`,
        "Com 768 dimensões desenhadas em 2, a perda é muito maior. PCA, t-SNE e UMAP escolhem o que preservar: o PCA mantém as direções de maior variância; t-SNE e UMAP mantêm as vizinhanças locais e distorcem as distâncias grandes. Use as projeções para explorar e nunca para medir: as contas de busca usam todas as dimensões.",
      ],
      keyIdea: "Projeções em 2D servem para olhar, não para medir. Distâncias de verdade só no espaço completo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "space-3d",
            piece: "vector-space",
            points: [
              { id: "contrato", label: "contrato", coords: contrato },
              { id: "multa", label: "multa", coords: multa, color: "danger" },
              { id: "aluguel", label: "aluguel", coords: aluguel },
            ],
            distance: { from: "contrato", to: "multa", label: `${fixed(distance3d)} no espaço` },
          },
        ],
      },
      alt: `Vista 3D em que contrato e multa parecem quase sobrepostos, a ${fixed(distance2d)} no desenho, mas estão a ${fixed(distance3d)} no espaço; aluguel está mais perto de contrato, a ${fixed(distanceAluguel3d)}.`,
    },
    {
      id: "cone",
      shortTitle: "Cone",
      title: "Todos os vetores num cone estreito",
      tag: "mechanism",
      body: [
        `Imagine que todo endereço da cidade começa com “Rua Principal, km 1.000”: as diferenças ficam escondidas no fim. Muitos modelos fazem isso com os vetores, que ficam todos num cone estreito. Isso tem nome: [[anisotropia|anisotropy]]. Na cena, até “trocar senha” e “rastrear pedido”, que não têm nada a ver, têm cosseno alto; o menor da matriz é ${fixed(rawMin)}.`,
        `A causa é uma componente comum grande somada a todos os vetores. Subtraindo o vetor médio, o cosseno médio entre assuntos diferentes cai de ${fixed(rawDifferent)} para ${fixed(centeredDifferent)}, enquanto o do mesmo assunto continua alto, em ${fixed(centeredSame)}. Ethayarajh (2019) mediu esse efeito nas camadas do BERT e do GPT-2; o treino contrastivo da aula 06-02 reduz o problema, mas não o elimina.`,
      ],
      keyIdea: "Num espaço anisotrópico, todo cosseno parece alto. O que informa é a diferença entre os scores, não o valor absoluto.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "raw",
            piece: "matrix",
            rows: sentences.map((sentence) => sentence.label),
            cols: sentences.map((sentence) => sentence.label),
            values: rawMatrix,
            scale: { min: 0, max: 1 },
            highlight: { row: 0, col: 4 },
            showValues: true,
          },
          {
            id: "centering",
            piece: "metrics-panel",
            metrics: [
              { id: "raw-diff", label: "assuntos diferentes, bruto", value: fixed(rawDifferent), color: "danger" },
              { id: "centered-diff", label: "assuntos diferentes, centrado", value: fixed(centeredDifferent), color: "success" },
              { id: "centered-same", label: "mesmo assunto, centrado", value: fixed(centeredSame) },
            ],
            highlight: "raw-diff",
          },
        ],
      },
      alt: `Matriz de cossenos entre 5 frases, todos altos, com mínimo de ${fixed(rawMin)}. Depois de subtrair o vetor médio, o cosseno entre assuntos diferentes cai de ${fixed(rawDifferent)} para ${fixed(centeredDifferent)}.`,
    },
    {
      id: "threshold",
      shortTitle: "Limiar",
      title: "Um limiar fixo de similaridade engana",
      tag: "tradeoff",
      body: [
        "Um erro comum é decidir que “cosseno acima de 0,8 é relevante”. Num modelo anisotrópico, textos sem relação passam de 0,8; num modelo bem espalhado, um trecho ótimo pode ficar em 0,6. O mesmo número quer dizer coisas diferentes em modelos diferentes, e até em idiomas diferentes no mesmo modelo.",
        "O caminho mais seguro é usar a ordem dos resultados, os k mais próximos, e calibrar qualquer limiar com exemplos rotulados do seu domínio e do seu modelo. Quando o limiar barra tudo, o sistema devolve “nada encontrado”, que pode ser a resposta certa ou um limiar mal escolhido.",
      ],
      keyIdea: "Scores de similaridade são relativos ao modelo. Calibre limiares com os seus dados, ou confie na ordem.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "chamado novo", col: 0, row: 0.5 },
              { id: "vector", kind: "embedding", label: "vetor", col: 1, row: 0.5 },
              { id: "search", kind: "retrieval", label: "limiar 0,8", col: 2, row: 0.5 },
              { id: "answer", kind: "answer", label: "top-k", col: 3, row: 0 },
              { id: "empty", kind: "no-result", label: "nada achado", col: 3, row: 1 },
            ],
            edges: [
              { from: "user", to: "vector" },
              { from: "vector", to: "search", label: "consulta" },
              { from: "search", to: "answer", label: "ordem" },
              { from: "search", to: "empty", label: "limiar errado", variant: "alternative" },
            ],
            active: "search",
          },
        ],
      },
      alt: "O vetor do chamado novo passa por um filtro com limiar fixo de 0,8, em destaque. Pela ordem, saem os k mais próximos; com o limiar mal calibrado, o caminho tracejado leva a nada encontrado.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Um espaço, muitos vizinhos",
      tag: "summary",
      body: [
        "Documentos e perguntas moram no mesmo espaço, criado por um modelo. Vizinhos próximos têm sentido parecido, grupos surgem sem rótulos, projeções servem para olhar e os scores só valem em comparação com outros scores do mesmo modelo.",
        "Falta entender os eixos desse espaço: quantas dimensões ele tem, quanto custa guardar cada vetor e o que acontece com as distâncias quando o número de dimensões cresce. É a próxima aula.",
      ],
      keyIdea: "Espaço de embeddings: relativo ao modelo, organizado por vizinhança, enganoso em 2D.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "docs", kind: "documents", label: "chamados antigos", col: 0, row: 0 },
              { id: "user", kind: "user", label: "chamado novo", col: 0, row: 1 },
              { id: "vector", kind: "embedding", label: "mesmo modelo", col: 1, row: 0.5 },
              { id: "db", kind: "vector-db", label: "espaço", col: 2, row: 0.5 },
              { id: "search", kind: "retrieval", label: "vizinhos", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "docs", to: "vector" },
              { from: "user", to: "vector" },
              { from: "vector", to: "db", label: "pontos" },
              { from: "db", to: "search", label: "mais perto" },
            ],
            active: "search",
            done: ["docs", "user", "vector", "db"],
          },
        ],
      },
      alt: "Chamados antigos e o chamado novo passam pelo mesmo modelo e viram pontos no mesmo espaço; a busca devolve os vizinhos, em destaque.",
    },
  ],
  realWorldExample:
    "Ethayarajh (2019) mediu a semelhança média entre palavras sorteadas ao acaso nos vetores contextuais do BERT, do ELMo e do GPT-2 e encontrou valores altos nas camadas superiores, sinal de que os vetores ocupam um cone estreito. Mu e Viswanath (2018) já tinham mostrado, com vetores de palavra, que tirar a média e as direções dominantes melhora várias tarefas. Times que montam busca semântica reencontram o efeito na prática quando descobrem que o “cosseno mínimo de relevância” que funcionava num modelo não serve no seguinte.",
  code: {
    language: "python",
    source: `import numpy as np

vectors = np.load("vetores.npy")              # (N, d), um vetor por texto

def mean_random_cosine(matrix, pairs=10_000, seed=0):
    rng = np.random.default_rng(seed)
    i, j = rng.integers(0, len(matrix), size=(2, pairs))
    unit = matrix / np.linalg.norm(matrix, axis=1, keepdims=True)
    return float(np.mean(np.sum(unit[i] * unit[j], axis=1)))

print(mean_random_cosine(vectors))                         # alto: espaço anisotrópico
print(mean_random_cosine(vectors - vectors.mean(axis=0)))  # perto de 0 depois de centrar`,
    caption: "Um teste rápido de anisotropia: o cosseno médio entre pares sorteados, antes e depois de subtrair o vetor médio.",
  },
  tradeOffs: {
    pros: [
      "Vizinhança no espaço vira busca, agrupamento e recomendação sem rótulos",
      "A estrutura de grafo dos vizinhos permite índices rápidos",
      "Projeções 2D ajudam a explorar e depurar uma base de vetores",
    ],
    cons: [
      "O espaço é relativo ao modelo: coordenadas e scores não se transferem",
      "Projeções distorcem distâncias e podem sugerir grupos que não existem",
      "A anisotropia comprime os scores e torna limiares fixos frágeis",
    ],
    alternatives: ["Centrar os vetores ou remover direções dominantes antes de comparar", "Calibrar limiares com exemplos rotulados do domínio"],
  },
  knowledgeCheck: [
    {
      id: "umap-cluster",
      prompt:
        "Num gráfico UMAP dos seus documentos, dois grupos aparecem colados. Um colega conclui que os dois assuntos são quase iguais para o modelo. O que você responde?",
      options: [
        "Ele está certo: a distância no gráfico é a distância real",
        "O UMAP preserva vizinhanças locais e distorce distâncias grandes; para comparar os grupos, meça no espaço completo",
        "Grupos colados no UMAP são sempre um erro do modelo",
        "É preciso trocar o UMAP por um gráfico 3D, que é exato",
      ],
      correct: 1,
      explanation: "Toda projeção perde informação, e o UMAP não promete preservar distâncias entre grupos. As contas de similaridade usam todas as dimensões.",
      lesson: "06-04",
    },
    {
      id: "fixed-threshold",
      prompt:
        "Um sistema descarta resultados com cosseno abaixo de 0,75. Depois de trocar o modelo, quase tudo passa no filtro, inclusive trechos sem relação. O que provavelmente aconteceu?",
      options: [
        "O modelo novo entende tudo melhor",
        "O modelo novo é mais anisotrópico: os cossenos ficaram altos para qualquer par, e o limiar antigo perdeu o sentido",
        "O banco vetorial passou a arredondar os scores",
        "Os documentos ficaram mais curtos",
      ],
      correct: 1,
      explanation: "Scores de similaridade dependem da geometria de cada modelo. Um limiar precisa ser recalibrado com exemplos rotulados a cada troca.",
      lesson: "06-04",
    },
  ],
  related: ["06-03", "06-05", "01-07"],
  references: [
    {
      title: "Ethayarajh (2019), How Contextual are Contextualized Word Representations?",
      url: "https://arxiv.org/abs/1909.00512",
      kind: "paper",
    },
    {
      title: "Mu e Viswanath (2018), All-but-the-Top: Simple and Effective Postprocessing for Word Representations",
      url: "https://arxiv.org/abs/1702.01417",
      kind: "paper",
    },
    {
      title: "Li et al. (2020), On the Sentence Embeddings from Pre-trained Language Models",
      url: "https://arxiv.org/abs/2011.05864",
      kind: "paper",
    },
  ],
};

export default lesson;
