import type { VectorPoint } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Três réguas sobre os mesmos pontos, calculadas aqui: distância euclidiana, produto escalar e cosseno entre
// uma consulta e 4 documentos em 2D. Sem normalização, cada régua elege um vencedor diferente; depois de
// normalizar, as três concordam, pela identidade |a − b|² = 2 − 2·cos(a, b) para vetores unitários.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

type Coords2 = [number, number];
const dot = (a: number[], b: number[]) => a.reduce((sum, value, index) => sum + value * b[index], 0);
const norm = (a: number[]) => Math.hypot(...a);
const cosine = (a: number[], b: number[]) => dot(a, b) / (norm(a) * norm(b));
const euclidean = (a: number[], b: number[]) => Math.hypot(...a.map((value, index) => value - b[index]));
const unit = (a: Coords2): Coords2 => [a[0] / norm(a), a[1] / norm(a)];

const query: Coords2 = [1, 2];
const docs: Array<{ id: string; label: string; coords: Coords2 }> = [
  { id: "a", label: "doc A", coords: [1.3, 1.9] },
  { id: "b", label: "doc B", coords: [3, 5.4] },
  { id: "c", label: "doc C", coords: [2.2, 1] },
  { id: "d", label: "doc D", coords: [0.45, 0.95] },
];

const measure = (q: Coords2, list: typeof docs) =>
  list.map((doc) => ({
    ...doc,
    l2: euclidean(q, doc.coords),
    dot: dot(q, doc.coords),
    cos: cosine(q, doc.coords),
  }));
type Measured = ReturnType<typeof measure>[number];
const winner = (rows: Measured[], key: "l2" | "dot" | "cos") =>
  [...rows].sort((x, y) => (key === "l2" ? x[key] - y[key] : y[key] - x[key]))[0];
const order = (rows: Measured[], key: "l2" | "dot" | "cos") =>
  [...rows].sort((x, y) => (key === "l2" ? x[key] - y[key] : y[key] - x[key])).map((row) => row.label);

const raw = measure(query, docs);
const byL2 = winner(raw, "l2");
const byDot = winner(raw, "dot");
const byCos = winner(raw, "cos");

const unitDocs = docs.map((doc) => ({ ...doc, coords: unit(doc.coords) }));
const unitQuery = unit(query);
const normalized = measure(unitQuery, unitDocs);
const orderL2 = order(normalized, "l2");
const orderDot = order(normalized, "dot");
const orderCos = order(normalized, "cos");
const allAgree = orderL2.join() === orderDot.join() && orderDot.join() === orderCos.join();
const sampleUnit = normalized.find((row) => row.id === "c") ?? normalized[0];
const identityLeft = sampleUnit.l2 ** 2;
const identityRight = 2 - 2 * sampleUnit.cos;

const pointsOf = (q: Coords2, list: typeof docs): VectorPoint[] => [
  { id: "q", label: "consulta", coords: q, color: "brand" },
  ...list.map((doc) => ({ id: doc.id, label: doc.label, coords: doc.coords })),
];

const lesson: LessonContent = {
  id: "06-07",
  subtitle:
    "Duas outras réguas para comparar vetores: a distância em linha reta e o produto escalar. Quando cada uma faz sentido, por que podem discordar e por que, normalizando, as três dão a mesma ordem.",
  objectives: [
    "Calcular a distância euclidiana e o produto escalar entre vetores",
    "Mostrar com um exemplo que cosseno, distância e produto escalar podem eleger vencedores diferentes",
    "Usar a identidade |a − b|² = 2 − 2·cos para vetores normalizados",
    "Escolher a métrica do índice a partir de como o modelo foi treinado",
  ],
  steps: [
    {
      id: "three-rulers",
      shortTitle: "Três réguas",
      title: "Três jeitos de dizer “perto”",
      tag: "context",
      body: [
        "Para saber se duas casas estão perto, você pode medir a linha reta entre elas, ver se ficam na mesma direção a partir do centro, ou dar mais pontos às casas grandes na direção certa. São três réguas diferentes, e elas nem sempre concordam. Em vetores, elas são a distância euclidiana, o cosseno e o produto escalar.",
        "A cena tem uma consulta e quatro documentos com tamanhos e direções diferentes, de propósito. Os próximos passos medem os mesmos pontos com cada régua. Em busca vetorial, a régua é uma configuração do índice, escolhida ao criar a coleção, e trocá-la depois significa reconstruir o índice.",
      ],
      keyIdea: "A métrica define o que “mais parecido” quer dizer. Ela é escolhida ao criar o índice.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "space",
            piece: "vector-space",
            points: pointsOf(query, docs),
            vectors: [{ to: "q" }, ...docs.map((doc) => ({ to: doc.id }))],
          },
        ],
      },
      alt: "Uma consulta e quatro documentos como setas da origem, com comprimentos e direções diferentes.",
    },
    {
      id: "euclidean",
      shortTitle: "Euclidiana",
      title: "Distância euclidiana: a linha reta",
      tag: "mechanism",
      body: [
        `A [[distância euclidiana|euclidean-distance]] é a régua da escola: a raiz da soma dos quadrados das diferenças, posição por posição. É a única das três em que menor é melhor. Na cena, o vizinho mais próximo da consulta é o ${byL2.label}, a ${fixed(byL2.l2)}; o ${byDot.label}, grande e na mesma direção, está a ${fixed(byDot.l2)}.`,
        "Ela olha posição, não só direção: dois vetores na mesma direção com tamanhos muito diferentes ficam longe. É uma distância de verdade, com desigualdade triangular, o que muitos índices aproveitam. A distância L2 é a padrão de várias bibliotecas, como o IndexFlatL2 do FAISS e o operador <-> do pgvector.",
      ],
      keyIdea: "Euclidiana = linha reta entre os pontos. Menor é mais parecido, e o tamanho do vetor conta.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "space",
            piece: "vector-space",
            points: pointsOf(query, docs),
            query: "q",
            neighbors: 1,
            distance: { from: "q", to: byL2.id, label: fixed(byL2.l2) },
          },
        ],
      },
      alt: `A consulta e o seu vizinho mais próximo pela distância euclidiana, o ${byL2.label}, a ${fixed(byL2.l2)}.`,
    },
    {
      id: "dot",
      shortTitle: "Escalar",
      title: "Produto escalar: direção vezes tamanho",
      tag: "mechanism",
      body: [
        `O [[produto escalar|dot-product]] multiplica posição por posição e soma: q · d = |q| × |d| × cos(q, d). Ele cresce com o ângulo certo e também com o tamanho. Na cena, o ${byDot.label} vence com ${fixed(byDot.dot)}, não por ser o mais alinhado, mas por ser o mais comprido.`,
        "Às vezes isso é exatamente o desejado. Em recomendação, o comprimento do vetor de um item pode aprender a sua popularidade, e o produto escalar recomenda o item alinhado e popular. A busca pelo maior produto escalar tem nome próprio, [[MIPS|mips]], e é um problema um pouco diferente da busca por distância, porque um ponto pode nem ser o seu próprio vizinho mais próximo.",
      ],
      keyIdea: "Produto escalar = direção × tamanho. Vetores longos ganham, o que pode ser defeito ou recurso.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "dot-scores",
            piece: "chart",
            kind: "bar",
            series: raw.map((row) => ({ label: row.label, value: Number(row.dot.toFixed(2)) })),
            highlight: raw.findIndex((row) => row.id === byDot.id),
            color: "module-06",
          },
        ],
      },
      alt: `Produto escalar da consulta com cada documento: ${raw.map((row) => `${row.label} ${fixed(row.dot)}`).join(", ")}. O ${byDot.label}, o mais comprido, vence.`,
    },
    {
      id: "disagree",
      shortTitle: "Discordam",
      title: "Mesmos pontos, três vencedores",
      tag: "example",
      body: [
        `Juntando as três réguas na tabela: pela distância euclidiana vence o ${byL2.label}; pelo produto escalar, o ${byDot.label}; pelo cosseno, o ${byCos.label}, curto e quase perfeitamente alinhado (${fixed(byCos.cos, 4)}). Não é um erro de conta: cada régua responde a uma pergunta diferente.`,
        "Por isso a métrica não é um detalhe. Indexar com L2 vetores de um modelo treinado para cosseno, sem normalizar, faz o banco devolver resultados que o modelo não consideraria os mais parecidos, e nada avisa: a busca só fica pior.",
      ],
      keyIdea: "Sem normalização, distância, produto escalar e cosseno podem ordenar os resultados de jeitos diferentes.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "table",
            piece: "matrix",
            rows: raw.map((row) => row.label),
            cols: ["euclidiana", "produto escalar", "cosseno"],
            values: raw.map((row) => [Number(row.l2.toFixed(2)), Number(row.dot.toFixed(2)), Number(row.cos.toFixed(3))]),
            highlight: { row: raw.findIndex((row) => row.id === byCos.id), col: 2 },
            showValues: true,
          },
          {
            id: "winners",
            piece: "metrics-panel",
            metrics: [
              { id: "l2", label: "vence na euclidiana", value: byL2.label },
              { id: "dot", label: "vence no produto escalar", value: byDot.label },
              { id: "cos", label: "vence no cosseno", value: byCos.label, color: "success" },
            ],
            highlight: "cos",
          },
        ],
      },
      alt: `Tabela com as três medidas para cada documento. Vencedores: ${byL2.label} na euclidiana, ${byDot.label} no produto escalar e ${byCos.label} no cosseno.`,
    },
    {
      id: "normalized",
      shortTitle: "Normalizados",
      title: "Com vetores unitários, as três concordam",
      tag: "mechanism",
      body: [
        `Normalize tudo para comprimento 1 e os pontos vão para o círculo unitário, como na cena. Agora o tamanho sumiu, e as três réguas ${allAgree ? "dão a mesma ordem" : "quase concordam"}: ${orderCos.join(", ")}. O motivo é uma identidade: para vetores unitários, |a − b|² = 2 − 2·cos(a, b).`,
        `Conferindo com o ${sampleUnit.label}: a distância ao quadrado é ${fixed(identityLeft, 3)} e 2 − 2 × ${fixed(sampleUnit.cos, 3)} = ${fixed(identityRight, 3)}. Menor distância é o mesmo que maior cosseno, e o produto escalar de unitários já é o cosseno. Por isso, com vetores normalizados, a escolha da métrica vira uma questão de velocidade, e o produto escalar costuma ser a mais barata.`,
      ],
      keyIdea: "Vetores normalizados: |a − b|² = 2 − 2·cos. Distância, cosseno e produto escalar dão o mesmo ranking.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "space",
            piece: "vector-space",
            points: pointsOf(unitQuery, unitDocs),
            vectors: [{ to: "q" }, ...unitDocs.map((doc) => ({ to: doc.id }))],
            query: "q",
            neighbors: 2,
          },
        ],
      },
      alt: `Os mesmos vetores normalizados no círculo unitário. As três medidas dão a mesma ordem: ${orderCos.join(", ")}.`,
    },
    {
      id: "choose",
      shortTitle: "Escolher",
      title: "Use a régua com que o modelo foi treinado",
      tag: "tradeoff",
      body: [
        "A regra prática é simples: use a métrica que o modelo usou no treino, que o cartão do modelo informa. Modelos treinados com cosseno vão bem com cosseno, ou com produto escalar sobre vetores normalizados. O DPR, um dos primeiros modelos de busca densa, foi treinado com produto escalar e indexado com produto escalar no FAISS.",
        "Na configuração, cada banco tem os seus nomes: o pgvector tem os operadores <-> (L2), <#> (produto escalar negativo) e <=> (distância de cosseno); o Qdrant aceita Cosine, Dot, Euclid e Manhattan; o FAISS tem IndexFlatL2 e IndexFlatIP. A próxima aula usa essas réguas para buscar de verdade: comparar a consulta com todos os vetores e ficar com os k melhores.",
      ],
      keyIdea: "Métrica do índice = métrica do treino do modelo. Normalizou, prefira o produto escalar pela velocidade.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "card", kind: "eval", label: "cartão do modelo", col: 0, row: 0.5 },
              { id: "model", kind: "embedding", label: "vetores", col: 1, row: 0.5 },
              { id: "cos", kind: "vector-db", label: "cosseno", col: 2, row: 0 },
              { id: "dot", kind: "vector-db", label: "produto escalar", col: 2, row: 1 },
              { id: "search", kind: "retrieval", label: "top-k", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "card", to: "model", label: "métrica do treino" },
              { from: "model", to: "cos", label: "sem normalizar" },
              { from: "model", to: "dot", label: "normalizados" },
              { from: "cos", to: "search" },
              { from: "dot", to: "search" },
            ],
            active: "dot",
          },
        ],
      },
      alt: "O cartão do modelo define a métrica. Vetores sem normalizar vão para um índice por cosseno; normalizados, para um índice por produto escalar, em destaque. Os dois levam ao top-k.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Três réguas, uma escolha",
      tag: "summary",
      body: [
        "Distância euclidiana mede a linha reta e conta o tamanho; produto escalar soma direção e tamanho; cosseno mede só a direção. Sem normalização, elas podem discordar; com vetores unitários, dão o mesmo ranking.",
        "O que fica para a prática: descubra a métrica do modelo, normalize quando ela for o cosseno e configure o índice com a mesma régua na indexação e na consulta.",
      ],
      keyIdea: "Euclidiana, produto escalar e cosseno: iguais em vetores unitários, diferentes no resto.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "docs", kind: "documents", label: "documentos", col: 0, row: 0 },
              { id: "model", kind: "embedding", label: "vetores unitários", col: 1, row: 0 },
              { id: "db", kind: "vector-db", label: "mesma métrica", col: 2, row: 0 },
              { id: "user", kind: "user", label: "consulta", col: 1, row: 1 },
              { id: "search", kind: "retrieval", label: "top-k", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "docs", to: "model" },
              { from: "model", to: "db", label: "indexar" },
              { from: "user", to: "db", label: "buscar" },
              { from: "db", to: "search" },
            ],
            active: "db",
            done: ["docs", "model", "user"],
          },
        ],
      },
      alt: "Documentos viram vetores unitários e são indexados com a mesma métrica usada na consulta; o banco, em destaque, devolve o top-k.",
    },
  ],
  realWorldExample:
    "O DPR (Dense Passage Retrieval), de Karpukhin e coautores (2020), treinou dois encoders BERT para que o produto escalar entre a pergunta e o trecho certo da Wikipédia fosse alto, e usou um índice de produto escalar do FAISS para buscar entre 21 milhões de trechos. Do outro lado, o README do pgvector recomenda o produto escalar quando os vetores já vêm normalizados, como os da OpenAI, porque é a operação mais rápida e dá o mesmo resultado que o cosseno.",
  code: {
    language: "python",
    source: `import numpy as np

q = np.array([1.0, 2.0])
docs = np.array([[1.3, 1.9], [3.0, 5.4], [2.2, 1.0], [0.45, 0.95]])  # A, B, C, D

l2 = np.linalg.norm(docs - q, axis=1)
ip = docs @ q
cos = ip / (np.linalg.norm(docs, axis=1) * np.linalg.norm(q))
print(l2.argmin(), ip.argmax(), cos.argmax())   # 0 1 3: três vencedores

unit = docs / np.linalg.norm(docs, axis=1, keepdims=True)
qu = q / np.linalg.norm(q)
print(np.linalg.norm(unit - qu, axis=1).argsort(), (unit @ qu).argsort()[::-1])  # mesma ordem`,
    caption: "As três réguas sobre os mesmos vetores da aula: sem normalizar, cada uma escolhe um documento; normalizando, a ordem é a mesma.",
  },
  tradeOffs: {
    pros: [
      "A distância euclidiana é uma métrica de verdade, aproveitada por muitos índices",
      "O produto escalar é a operação mais barata e pode usar o tamanho como sinal, como a popularidade",
      "Com vetores normalizados, qualquer uma das três dá o mesmo ranking",
    ],
    cons: [
      "Sem normalização, as réguas discordam e a errada piora a busca em silêncio",
      "O produto escalar favorece vetores longos mesmo quando o tamanho não significa nada",
      "Trocar a métrica de um índice exige reconstruí-lo",
    ],
    alternatives: ["Distância de Manhattan (L1), oferecida por alguns bancos", "Converter MIPS em busca por distância com uma dimensão extra nos vetores"],
  },
  knowledgeCheck: [
    {
      id: "wrong-metric",
      prompt:
        "Um modelo foi treinado com cosseno e não normaliza a saída. O time cria um índice com distância euclidiana e não normaliza os vetores. O que esperar?",
      options: [
        "O mesmo resultado, porque as métricas são equivalentes",
        "Resultados piores, porque a distância passa a punir diferenças de tamanho que o modelo não considera relevantes",
        "Um erro ao criar o índice",
        "Resultados melhores, porque a euclidiana é mais precisa",
      ],
      correct: 1,
      explanation: "A equivalência só vale com vetores unitários. Sem normalizar, a euclidiana mistura tamanho e direção, e a ordem muda.",
      lesson: "06-07",
    },
    {
      id: "identity",
      prompt: "Dois vetores unitários têm cosseno 0,9. Qual é a distância euclidiana entre eles?",
      options: ["0,10", "cerca de 0,45", "0,90", "1,80"],
      correct: 1,
      explanation: "|a − b|² = 2 − 2 × 0,9 = 0,2, e a raiz de 0,2 é cerca de 0,447.",
      lesson: "06-07",
    },
  ],
  related: ["06-06", "06-08", "01-02"],
  references: [
    { title: "Karpukhin et al. (2020), Dense Passage Retrieval for Open-Domain Question Answering", url: "https://arxiv.org/abs/2004.04906", kind: "paper" },
    { title: "pgvector: operadores de distância", url: "https://github.com/pgvector/pgvector", kind: "repo" },
    { title: "Qdrant: Collections e métricas de distância", url: "https://qdrant.tech/documentation/concepts/collections/", kind: "docs" },
  ],
};

export default lesson;
