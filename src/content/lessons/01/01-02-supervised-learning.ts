import type { VectorPoint } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Separar limões de laranjas com k vizinhos mais próximos (k-NN). Cada fruta tem duas features,
// diâmetro em cm e cor de 0 (verde) a 10 (laranja). Votos, vizinhos e acurácias saem das contas abaixo.

type Fruit = "limão" | "laranja";

interface Example {
  id: string;
  diameter: number;
  color: number;
  label: Fruit;
}

const examples: Example[] = [
  { id: "l1", diameter: 4.5, color: 2, label: "limão" },
  { id: "l2", diameter: 5, color: 3, label: "limão" },
  { id: "l3", diameter: 5.5, color: 1.5, label: "limão" },
  { id: "l4", diameter: 6, color: 4, label: "limão" },
  { id: "l5", diameter: 5.2, color: 5.5, label: "limão" },
  { id: "o1", diameter: 7, color: 8, label: "laranja" },
  { id: "o2", diameter: 7.5, color: 7, label: "laranja" },
  { id: "o3", diameter: 6.5, color: 6, label: "laranja" },
  { id: "o4", diameter: 8, color: 8.5, label: "laranja" },
  { id: "o5", diameter: 6.8, color: 4.5, label: "laranja" },
];

const NEW_FRUIT = { diameter: 6.2, color: 5 };
const QUERY_ID = "new";
const K = 3;
const K_VALUES = [1, 3, 5, 7, 9];

const percent = (value: number) => `${Math.round(value * 100)}%`;
const distance = (a: { diameter: number; color: number }, b: { diameter: number; color: number }) =>
  Math.hypot(a.diameter - b.diameter, a.color - b.color);

const neighborsOf = (point: { diameter: number; color: number }, pool: Example[], k: number) =>
  [...pool].sort((a, b) => distance(a, point) - distance(b, point)).slice(0, k);
const orangeShare = (neighbors: Example[]) =>
  neighbors.filter((example) => example.label === "laranja").length / neighbors.length;
const vote = (neighbors: Example[]): Fruit => (orangeShare(neighbors) > 0.5 ? "laranja" : "limão");

const nearest = neighborsOf(NEW_FRUIT, examples, K);
const nearestOrange = nearest.filter((example) => example.label === "laranja").length;
const answer = vote(nearest);
const oneNeighbor = neighborsOf(NEW_FRUIT, examples, 1)[0];
const sharesByK = K_VALUES.map((k) => ({ k, share: orangeShare(neighborsOf(NEW_FRUIT, examples, k)) }));
const flip = sharesByK.find((item) => (item.share > 0.5 ? "laranja" : "limão") !== answer) ?? sharesByK[0];
const flipAnswer: Fruit = flip.share > 0.5 ? "laranja" : "limão";

/** Deixa um de fora: cada fruta é prevista pelas outras 9 e comparada com o rótulo dela. */
const leaveOneOut = (k: number) =>
  examples.filter((example) => {
    const others = examples.filter((other) => other.id !== example.id);
    return vote(neighborsOf(example, others, k)) === example.label;
  }).length / examples.length;
const accuracyByK = [1, 3, 5].map((k) => ({ k, accuracy: leaveOneOut(k) }));

const fruitColor = (label: Fruit) => (label === "laranja" ? "module-01" : "success");
const labeledPoints: VectorPoint[] = examples.map((example) => ({
  id: example.id,
  label: example.label,
  coords: [example.diameter, example.color],
  color: fruitColor(example.label),
}));
const queryPoint: VectorPoint = { id: QUERY_ID, label: "?", coords: [NEW_FRUIT.diameter, NEW_FRUIT.color], color: "ink" };

const lesson: LessonContent = {
  id: "01-02",
  subtitle: "Aprender com gabarito: exemplos que já trazem a resposta certa, e um modelo que generaliza para casos novos.",
  objectives: [
    "Reconhecer um problema supervisionado pelos pares (entrada, resposta)",
    "Classificar um caso novo com k vizinhos mais próximos",
    "Ver como a escolha de k muda a resposta",
    "Entender por que rótulos custam caro e o que acontece quando estão errados",
  ],
  steps: [
    {
      id: "answer-key",
      shortTitle: "Gabarito",
      title: "Aprender com a resposta do lado",
      tag: "context",
      body: [
        "Pense em fichas de estudo: de um lado a pergunta, do outro a resposta. Depois de ver muitas, você responde fichas novas sem olhar o verso. [[Aprendizado supervisionado|supervised-learning]] é isso: o treino recebe pares (entrada, [[rótulo|label]]) e o modelo aprende a ir da entrada à resposta.",
        "Formalmente, os dados são pares (x, y) e o treino procura uma função f tal que f(x) ≈ y. Quando y é uma categoria, a tarefa é [[classificação|classification]]; quando é um número, é [[regressão|regression]]. O objetivo não é acertar os exemplos vistos, e sim casos novos tirados da mesma distribuição.",
      ],
      keyIdea: "Supervisionado = aprender f(x) ≈ y a partir de exemplos em que alguém já disse quanto vale y.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "supervised",
            piece: "block-diagram",
            blocks: [
              { id: "pairs", kind: "documents", label: "frutas + rótulo", col: 0, row: 0 },
              { id: "model", kind: "llm", label: "modelo", col: 1, row: 0.5 },
              { id: "new", kind: "laptop", label: "fruta nova", col: 0, row: 1 },
              { id: "answer", kind: "answer", label: answer, col: 2, row: 0.5 },
            ],
            edges: [
              { from: "pairs", to: "model", label: "pares (x, y)" },
              { from: "new", to: "model", label: "x" },
              { from: "model", to: "answer", label: "y previsto" },
            ],
            active: "model",
          },
        ],
      },
      alt: "Frutas com rótulo alimentam o modelo, em destaque, como pares x e y; uma fruta nova entra só com x, e o modelo devolve o rótulo previsto.",
    },
    {
      id: "space",
      shortTitle: "Features",
      title: "Cada fruta vira um ponto",
      tag: "mechanism",
      body: [
        `Medimos ${examples.length} frutas: o diâmetro em centímetros e a cor numa escala de 0 (verde) a 10 (laranja). Com duas [[features|feature]], cada fruta vira um ponto num plano, e o rótulo vira a cor do ponto.`,
        "Repare que os limões ficam embaixo e à esquerda e as laranjas em cima e à direita, mas a fronteira não é perfeita: há um limão amarelado e uma laranja esverdeada no meio. Dados reais são assim, e é por isso que o modelo precisa de exemplos, não de uma regra simples.",
      ],
      keyIdea: "Features transformam cada exemplo num ponto; exemplos parecidos ficam perto.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [{ id: "fruits", piece: "vector-space", points: labeledPoints }],
      },
      alt: `Plano com ${examples.length} frutas pelo diâmetro e pela cor: limões embaixo à esquerda, laranjas em cima à direita, com alguns casos no meio.`,
    },
    {
      id: "neighbors",
      shortTitle: "Vizinhos",
      title: "Pergunte aos vizinhos",
      tag: "mechanism",
      body: [
        `Chega uma fruta com ${NEW_FRUIT.diameter.toLocaleString("pt-BR")} cm e cor ${NEW_FRUIT.color}. O jeito mais simples de classificar é olhar os exemplos mais parecidos. O [[k-NN|knn]] mede a distância até cada fruta conhecida, pega as k mais próximas e faz uma votação.`,
        `Com k = ${K}, os vizinhos são ${nearest.map((example) => example.label).join(", ")}: ${nearestOrange} de ${K} votos para laranja, e a resposta é “${answer}”. O k-NN não tem fase de treino: ele guarda todos os exemplos e faz as contas na hora da pergunta, o que fica caro com milhões de pontos.`,
      ],
      keyIdea: "k-NN: a resposta de um caso novo é a votação dos k exemplos rotulados mais próximos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [{ id: "fruits", piece: "vector-space", points: [...labeledPoints, queryPoint], query: QUERY_ID, neighbors: K }],
      },
      alt: `A fruta nova aparece como ponto de interrogação entre os grupos; os ${K} vizinhos mais próximos estão em destaque e decidem: ${answer}.`,
    },
    {
      id: "choose-k",
      shortTitle: "Escolher k",
      title: "O tamanho da vizinhança muda a resposta",
      tag: "example",
      body: [
        `Com k = 1, só o vizinho mais perto decide, e ele é ${oneNeighbor.label === "laranja" ? "uma laranja" : "um limão"}. Com k = ${flip.k}, a maioria vira ${flipAnswer}: a mesma fruta muda de classe só porque a vizinhança cresceu. O gráfico mostra a fração de laranjas entre os k vizinhos para k = ${K_VALUES.join(", ")}. Acima de 50%, a resposta é laranja.`,
        "k pequeno segue cada exemplo de perto, inclusive os estranhos; k grande suaviza, mas pode engolir grupos pequenos. Ninguém ensina k ao modelo: é um [[hiperparâmetro|hyperparameter]], escolhido medindo o erro em dados separados, como você verá na aula 01-08.",
      ],
      keyIdea: "k é uma escolha de quem treina: pouco k decora ruído, muito k apaga detalhes.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "votes",
            piece: "chart",
            kind: "bar",
            series: sharesByK.map((item) => ({ label: `k = ${item.k}`, value: Number(item.share.toFixed(2)) })),
            max: 1,
            cutoff: { mode: "threshold", value: 0.5, label: "50%" },
            highlight: K_VALUES.indexOf(K),
            color: "module-01",
          },
        ],
      },
      alt: `Barras com a fração de laranjas entre os vizinhos para cada k: ${sharesByK.map((item) => `${percent(item.share)} com k = ${item.k}`).join(", ")}.`,
    },
    {
      id: "labels-cost",
      shortTitle: "Rótulos",
      title: "O gabarito custa caro",
      tag: "tradeoff",
      body: [
        "Alguém precisa escrever cada rótulo. Para frutas é rápido; para laudos médicos, contratos ou fraudes, exige especialistas, tempo e dinheiro. Por isso tantos projetos começam com poucos milhares de exemplos e reaproveitam um modelo pré-treinado.",
        "Rótulo errado também ensina. Se 1 em cada 10 laranjas foi marcada como limão, o modelo aprende essa confusão. Antes de trocar de algoritmo, vale conferir uma amostra do gabarito: muitas vezes o ganho está em limpar os rótulos.",
      ],
      keyIdea: "No supervisionado, a qualidade do gabarito é o teto da qualidade do modelo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "labeling",
            piece: "block-diagram",
            blocks: [
              { id: "raw", kind: "documents", label: "dados brutos", col: 0, row: 0.5 },
              { id: "people", kind: "user", label: "anotadores", col: 1, row: 0.5 },
              { id: "labeled", kind: "sql-db", label: "dataset rotulado", col: 2, row: 0 },
              { id: "noise", kind: "no-result", label: "rótulo errado", col: 2, row: 1 },
              { id: "model", kind: "llm", label: "modelo", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "raw", to: "people" },
              { from: "people", to: "labeled", label: "rótulos" },
              { from: "people", to: "noise", variant: "alternative" },
              { from: "labeled", to: "model", label: "treino" },
              { from: "noise", to: "model", variant: "alternative" },
            ],
            active: "people",
          },
        ],
      },
      alt: "Dados brutos passam por anotadores, em destaque, que produzem o dataset rotulado para o treino; um caminho tracejado mostra rótulos errados chegando ao modelo também.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Medir antes de confiar",
      tag: "summary",
      body: [
        `Para medir sem dados extras, tiramos uma fruta por vez, classificamos com as outras ${examples.length - 1} e comparamos com o rótulo. O acerto é de ${accuracyByK.map((item) => `${percent(item.accuracy)} com k = ${item.k}`).join(", ")}. A mesma receita vale para regressão: em vez de votar, o k-NN tira a média do valor dos vizinhos.`,
        "Todo modelo supervisionado segue esse roteiro: pares rotulados, uma forma de modelo, um ajuste e uma medida em exemplos fora do treino. Na próxima aula, os rótulos somem e o algoritmo precisa achar estrutura sozinho.",
      ],
      keyIdea: "Supervisionado: rótulos para aprender e exemplos separados para medir.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "accuracy",
            piece: "metrics-panel",
            metrics: accuracyByK.map((item) => ({
              id: `k${item.k}`,
              label: `acerto com k = ${item.k}`,
              value: percent(item.accuracy),
              color: item.k === K ? "success" : undefined,
            })),
            highlight: `k${K}`,
          },
        ],
      },
      alt: `Painel com o acerto medido deixando uma fruta de fora por vez: ${accuracyByK.map((item) => `${percent(item.accuracy)} com k = ${item.k}`).join(", ")}.`,
    },
  ],
  realWorldExample:
    "O MNIST é um dataset clássico de aprendizado supervisionado: 70 mil imagens de dígitos escritos à mão, cada uma com o rótulo do dígito, divididas em 60 mil para treino e 10 mil para teste.",
  code: {
    language: "python",
    source: `from sklearn.neighbors import KNeighborsClassifier

X = [[4.5, 2], [5, 3], [5.5, 1.5], [6, 4], [5.2, 5.5],
     [7, 8], [7.5, 7], [6.5, 6], [8, 8.5], [6.8, 4.5]]
y = ["limão"] * 5 + ["laranja"] * 5

model = KNeighborsClassifier(n_neighbors=3).fit(X, y)
print(model.predict([[6.2, 5]]), model.predict_proba([[6.2, 5]]))`,
    caption: "As 10 frutas da aula: o k-NN guarda os exemplos e responde pela votação dos 3 vizinhos.",
  },
  tradeOffs: {
    pros: [
      "Objetivo claro: acertar o rótulo, que dá para medir",
      "Funciona com algoritmos simples quando as features são boas",
      "Base de quase todo produto de ML: spam, fraude, preço, intenção",
    ],
    cons: [
      "Rotular custa caro e exige especialistas em muitos domínios",
      "Rótulos errados ou enviesados viram erros do modelo",
      "Só aprende as classes e os casos que apareceram no gabarito",
    ],
    alternatives: [
      "Aprendizado não supervisionado, quando não há rótulos",
      "Aprendizado autossupervisionado, em que o próprio dado gera o rótulo, como no pré-treino de LLMs",
    ],
  },
  knowledgeCheck: [
    {
      id: "is-supervised",
      prompt: "Qual destes problemas é supervisionado?",
      options: [
        "Agrupar clientes parecidos sem saber quantos grupos existem",
        "Prever o preço de um imóvel a partir de vendas passadas com preço conhecido",
        "Comprimir imagens para ocupar menos espaço",
        "Um robô aprendendo a andar por tentativa e erro",
      ],
      correct: 1,
      explanation: "As vendas passadas trazem a resposta certa (o preço) para cada imóvel: são pares (x, y). Os outros não têm rótulo ou aprendem por recompensa.",
      lesson: "01-02",
    },
    {
      id: "knn-k1",
      prompt: "Com k = 1, um k-NN acerta 100% dos exemplos de treino e erra bastante em frutas novas. Por quê?",
      options: [
        "Porque k = 1 é proibido no k-NN",
        "Porque cada ponto de treino é o seu próprio vizinho mais próximo, então o modelo decora o treino, ruído incluído",
        "Porque faltou normalizar o rótulo",
        "Porque o k-NN só funciona com três classes",
      ],
      correct: 1,
      explanation: "Medido no próprio treino, cada exemplo vota em si mesmo. Em casos novos, um único vizinho estranho decide a resposta; por isso k é escolhido em dados separados.",
      lesson: "01-02",
    },
  ],
  related: ["01-01", "01-03", "01-05"],
  references: [
    { title: "scikit-learn: Supervised learning", url: "https://scikit-learn.org/stable/supervised_learning.html", kind: "docs" },
    { title: "scikit-learn: Nearest Neighbors", url: "https://scikit-learn.org/stable/modules/neighbors.html", kind: "docs" },
    { title: "An Introduction to Statistical Learning (livro aberto)", url: "https://www.statlearning.com/", kind: "article" },
  ],
};

export default lesson;
