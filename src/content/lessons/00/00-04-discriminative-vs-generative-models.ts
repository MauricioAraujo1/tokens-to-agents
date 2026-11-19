import type { LessonContent, StepContent } from "../../../types/content";

// Gatos e cães de brinquedo, com 2 features: peso (kg) e tamanho da orelha (cm). O modelo discriminativo
// é um k-NN, que só olha os vizinhos; o generativo é um Naive Bayes gaussiano, que aprende média e
// desvio de cada classe. Toda chance, média e curva da aula sai das contas abaixo.

type Animal = { weight: number; ear: number; cat: boolean };

const animals: Animal[] = [
  { weight: 3.5, ear: 5.5, cat: true },
  { weight: 4, ear: 6, cat: true },
  { weight: 4.5, ear: 5, cat: true },
  { weight: 5, ear: 6.5, cat: true },
  { weight: 3, ear: 6.2, cat: true },
  { weight: 5.5, ear: 5.8, cat: true },
  { weight: 8, ear: 9, cat: false },
  { weight: 9, ear: 10.5, cat: false },
  { weight: 10, ear: 9.5, cat: false },
  { weight: 11, ear: 11, cat: false },
  { weight: 7.5, ear: 10, cat: false },
  { weight: 12, ear: 10.5, cat: false },
];
const NEW_ANIMAL = { weight: 6.5, ear: 7.5 };
const K = 3;

const distance = (animal: Animal) => Math.hypot(animal.weight - NEW_ANIMAL.weight, animal.ear - NEW_ANIMAL.ear);
const neighbors = [...animals].sort((a, b) => distance(a) - distance(b)).slice(0, K);
const knnCatChance = neighbors.filter((animal) => animal.cat).length / K;

const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
const deviation = (values: number[]) => {
  const center = mean(values);
  return Math.sqrt(mean(values.map((value) => (value - center) ** 2)));
};
const gaussian = (x: number, center: number, spread: number) =>
  Math.exp(-((x - center) ** 2) / (2 * spread ** 2)) / (spread * Math.sqrt(2 * Math.PI));

const describe = (cat: boolean) => {
  const group = animals.filter((animal) => animal.cat === cat);
  const weights = group.map((animal) => animal.weight);
  const ears = group.map((animal) => animal.ear);
  return {
    prior: group.length / animals.length,
    weightMean: mean(weights),
    weightSpread: deviation(weights),
    earMean: mean(ears),
    earSpread: deviation(ears),
  };
};
const cats = describe(true);
const dogs = describe(false);

const likelihood = (model: ReturnType<typeof describe>) =>
  model.prior *
  gaussian(NEW_ANIMAL.weight, model.weightMean, model.weightSpread) *
  gaussian(NEW_ANIMAL.ear, model.earMean, model.earSpread);
const bayesCatChance = likelihood(cats) / (likelihood(cats) + likelihood(dogs));

const curveWeights = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const catCurve = curveWeights.map((weight) => ({
  label: `${weight} kg`,
  value: Number(gaussian(weight, cats.weightMean, cats.weightSpread).toFixed(3)),
}));
const curvePeak = catCurve.reduce((best, item, index) => (item.value > catCurve[best].value ? index : best), 0);

const percent = (value: number) => `${Math.round(value * 100)}%`;
const decimal = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

const points = [
  ...animals.map((animal, index) => ({
    id: `a${index}`,
    label: animal.cat ? "gato" : "cão",
    coords: [animal.weight, animal.ear] as [number, number],
    color: animal.cat ? ("module-00" as const) : ("info" as const),
  })),
  { id: "new", label: "?", coords: [NEW_ANIMAL.weight, NEW_ANIMAL.ear] as [number, number], color: "brand" as const },
];

const twoStudents: StepContent["scene"] = {
  kind: "pieces",
  layout: "single",
  pieces: [
    {
      id: "flow",
      piece: "block-diagram",
      blocks: [
        { id: "data", kind: "documents", label: "exemplos", col: 0, row: 0.5 },
        { id: "disc", kind: "llm", label: "discriminativo", col: 1, row: 0 },
        { id: "label", kind: "answer", label: "é gato", col: 2, row: 0 },
        { id: "gen", kind: "llm", label: "generativo", col: 1, row: 1 },
        { id: "sample", kind: "embedding", label: "gato novo", col: 2, row: 1 },
      ],
      edges: [
        { from: "data", to: "disc" },
        { from: "disc", to: "label", label: "P(classe | x)" },
        { from: "data", to: "gen" },
        { from: "gen", to: "sample", label: "P(x | classe)" },
      ],
      active: "disc",
    },
  ],
};

const lesson: LessonContent = {
  id: "00-04",
  subtitle: "Um modelo aprende a separar, o outro aprende a desenhar: o que cada um estima, o que cada um consegue fazer e quando usar.",
  objectives: [
    "Diferenciar um modelo que estima P(classe | x) de um que estima P(x | classe)",
    "Classificar um exemplo novo com k-NN e com Naive Bayes, fazendo as contas",
    "Explicar por que só o modelo generativo consegue criar exemplos novos",
    "Decidir entre um classificador pequeno e um LLM para uma tarefa de classificação",
  ],
  steps: [
    {
      id: "two-students",
      shortTitle: "Dois alunos",
      title: "Separar ou desenhar",
      tag: "context",
      body: [
        "Dois alunos estudam fotos de gatos e cães. O primeiro só procura o que os diferencia: “orelha grande, é cão”. O segundo estuda cada animal por inteiro, a ponto de conseguir desenhar um gato que nunca viu. Os dois acertam a prova, mas só o segundo sabe desenhar.",
        "O primeiro é um [[modelo discriminativo|discriminative-model]]: aprende P(classe | x), a chance da classe dado o exemplo. O segundo é um [[modelo generativo|generative-model]]: aprende P(x | classe), como os exemplos de cada classe costumam ser, e pela regra de Bayes também consegue classificar.",
      ],
      keyIdea: "Discriminativo aprende a fronteira entre as classes. Generativo aprende como os dados de cada classe são.",
      scene: twoStudents,
      alt: "Os mesmos exemplos treinam dois modelos: o discriminativo, em destaque, responde é gato; o generativo produz um gato novo.",
    },
    {
      id: "boundary",
      shortTitle: "Fronteira",
      title: "Discriminativo: olhar os vizinhos",
      tag: "mechanism",
      body: [
        `Cada animal virou um ponto: peso no eixo horizontal, tamanho da orelha no vertical. Chega um animal novo, com ${decimal(NEW_ANIMAL.weight)} kg e orelha de ${decimal(NEW_ANIMAL.ear)} cm. O [[k-NN|knn]] olha os ${K} vizinhos mais próximos: ${neighbors.filter((animal) => animal.cat).length} são gatos. A chance de gato é ${percent(knnCatChance)}.`,
        "O k-NN nunca aprendeu como é um gato. Ele só sabe de que lado da [[fronteira de decisão|decision-boundary]] o ponto caiu. A [[regressão logística|logistic-regression]] e os classificadores de redes neurais fazem o mesmo de um jeito mais compacto: ajustam a fronteira e nada além dela.",
      ],
      keyIdea: "Um modelo discriminativo responde “qual classe?” e só isso. Ele não sabe gerar um exemplo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "space",
            piece: "vector-space",
            points,
            query: "new",
            neighbors: K,
          },
        ],
      },
      alt: `Pontos de gatos (leves, orelha pequena) e cães (pesados, orelha grande); o animal novo, com ${decimal(NEW_ANIMAL.weight)} kg, está ligado aos ${K} vizinhos mais próximos.`,
    },
    {
      id: "shape",
      shortTitle: "Formato",
      title: "Generativo: aprender o formato",
      tag: "mechanism",
      body: [
        `O modelo generativo resume cada classe. Os gatos do treino pesam em média ${decimal(cats.weightMean)} kg, com desvio de ${decimal(cats.weightSpread)} kg; os cães, ${decimal(dogs.weightMean)} kg. A curva da cena é a chance de cada peso entre os gatos: P(peso | gato), com pico perto de ${catCurve[curvePeak].label}.`,
        "Com essas curvas, o modelo faz duas coisas. Classifica: compara a chance do animal novo vir da curva dos gatos e da curva dos cães. E gera: sorteia um peso e uma orelha das curvas dos gatos e obtém um gato que não estava no treino. O filtro de spam da aula 00-01, um Naive Bayes, era generativo.",
      ],
      keyIdea: "Quem sabe P(x | classe) sabe classificar e sabe criar exemplos novos daquela classe.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "curve",
            piece: "chart",
            kind: "line",
            series: catCurve,
            highlight: curvePeak,
            color: "module-00",
          },
        ],
      },
      alt: `Curva da chance de cada peso entre os gatos, com pico perto de ${catCurve[curvePeak].label} e caindo para pesos de cão.`,
    },
    {
      id: "compare",
      shortTitle: "Comparar",
      title: "Os dois respondem, só um cria",
      tag: "example",
      body: [
        `Para o animal novo, o k-NN diz ${percent(knnCatChance)} de chance de gato. O Naive Bayes multiplica a chance do peso pela chance da orelha em cada classe e normaliza: ${percent(bayesCatChance)} de gato. Os dois concordam na resposta, por caminhos diferentes.`,
        `Peça agora: “me dê um gato típico”. O k-NN não tem o que responder. O generativo devolve a média que aprendeu: ${decimal(cats.weightMean)} kg e orelha de ${decimal(cats.earMean)} cm. Os LLMs são generativos pelo mesmo motivo, só que a “curva” deles é a chance de cada próximo token.`,
      ],
      keyIdea: "Classificar, os dois classificam. Gerar, só quem modelou os próprios dados.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "results",
            piece: "metrics-panel",
            metrics: [
              { id: "knn", label: "k-NN, P(gato)", value: percent(knnCatChance) },
              { id: "bayes", label: "Naive Bayes, P(gato)", value: percent(bayesCatChance) },
              { id: "weight", label: "gato típico: peso", value: `${decimal(cats.weightMean)} kg`, color: "success" },
              { id: "ear", label: "gato típico: orelha", value: `${decimal(cats.earMean)} cm`, color: "success" },
            ],
            highlight: "weight",
          },
        ],
      },
      alt: `Painel: k-NN dá ${percent(knnCatChance)} de gato, Naive Bayes dá ${percent(bayesCatChance)}, e só o generativo descreve um gato típico de ${decimal(cats.weightMean)} kg.`,
    },
    {
      id: "llm-classifier",
      shortTitle: "Na prática",
      title: "Um LLM também classifica",
      tag: "tradeoff",
      body: [
        "Hoje é comum pedir a um LLM: “classifique este e-mail como spam ou normal”. Funciona sem nenhum exemplo de treino, porque o modelo generativo já viu muito texto. Um [[classificador|classification]] discriminativo pequeno precisa de exemplos rotulados, mas responde em milissegundos e custa quase nada por chamada.",
        "A regra prática: com poucos exemplos ou uma tarefa que muda toda semana, comece pelo LLM com prompt. Com milhões de chamadas e rótulos estáveis, um classificador treinado costuma sair mais barato, mais rápido e mais previsível.",
      ],
      keyIdea: "Um generativo grande faz trabalho discriminativo por prompt, mas um discriminativo pequeno faz o mesmo mais barato quando há dados.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "mail", kind: "documents", label: "e-mail", col: 0, row: 0.5 },
              { id: "prompt", kind: "context", label: "prompt", col: 1, row: 0 },
              { id: "llm", kind: "llm", label: "LLM", col: 2, row: 0 },
              { id: "small", kind: "server", label: "classificador", col: 1.5, row: 1 },
              { id: "label", kind: "answer", label: "spam", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "mail", to: "prompt" },
              { from: "prompt", to: "llm" },
              { from: "llm", to: "label" },
              { from: "mail", to: "small", label: "com rótulos", variant: "alternative" },
              { from: "small", to: "label" },
            ],
            active: "llm",
          },
        ],
      },
      alt: "Um e-mail vai num prompt para um LLM, que responde spam; o caminho alternativo leva o e-mail a um classificador pequeno treinado com rótulos, que dá a mesma resposta.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Quem é quem",
      tag: "summary",
      body: [
        "Discriminativos: k-NN, regressão logística, árvores de decisão e redes que terminam num rótulo, como um BERT ajustado para classificar. Generativos: Naive Bayes, modelos de difusão e os LLMs como o GPT, que estimam a chance do próximo token.",
        "A pergunta que separa os dois é simples: o modelo consegue produzir um exemplo novo? Na próxima aula, você organiza os modelos por outro critério: o que entra e o que sai deles.",
      ],
      keyIdea: "Discriminativo: P(classe | x). Generativo: P(x), e com ele, a capacidade de criar.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "families",
            piece: "graph",
            nodes: [
              { id: "disc", label: "discriminativo", x: 0.25, y: 0.1, color: "info" },
              { id: "gen", label: "generativo", x: 0.75, y: 0.1, color: "module-00" },
              { id: "knn", label: "k-NN", x: 0.05, y: 0.55 },
              { id: "logistic", label: "regressão logística", x: 0.25, y: 0.9 },
              { id: "bert", label: "BERT classificador", x: 0.4, y: 0.55 },
              { id: "nb", label: "Naive Bayes", x: 0.6, y: 0.55 },
              { id: "gpt", label: "GPT", x: 0.75, y: 0.9 },
              { id: "diffusion", label: "difusão", x: 0.95, y: 0.55 },
            ],
            edges: [
              { from: "disc", to: "knn" },
              { from: "disc", to: "logistic" },
              { from: "disc", to: "bert" },
              { from: "gen", to: "nb" },
              { from: "gen", to: "gpt" },
              { from: "gen", to: "diffusion" },
            ],
            highlight: ["gen"],
            path: ["gen", "gpt"],
          },
        ],
      },
      alt: "Duas famílias: discriminativos, com k-NN, regressão logística e BERT classificador; generativos, com Naive Bayes, GPT e difusão, com o caminho até o GPT em destaque.",
    },
  ],
  realWorldExample:
    "A biblioteca scikit-learn oferece as duas famílias lado a lado: GaussianNB e MultinomialNB (generativos) e LogisticRegression e KNeighborsClassifier (discriminativos), todos com a mesma interface fit e predict_proba. Trocar um pelo outro é uma linha de código.",
  code: {
    language: "python",
    source: `from sklearn.naive_bayes import GaussianNB
from sklearn.neighbors import KNeighborsClassifier

X = [[3.5, 5.5], [4, 6], [4.5, 5], [8, 9], [9, 10.5], [10, 9.5]]  # peso (kg), orelha (cm)
y = ["gato", "gato", "gato", "cão", "cão", "cão"]

knn = KNeighborsClassifier(n_neighbors=3).fit(X, y)  # discriminativo: só a fronteira
nb = GaussianNB().fit(X, y)                          # generativo: média e variância por classe

print(knn.predict_proba([[6.5, 7.5]]), nb.predict_proba([[6.5, 7.5]]))
print(nb.theta_)  # o cão típico e o gato típico que o modelo aprendeu`,
    caption: "Os dois modelos respondem a mesma pergunta; só o generativo guarda a descrição de cada classe (theta_ são as médias).",
  },
  tradeOffs: {
    pros: [
      "Discriminativo: foca no que importa para decidir e tende a errar menos quando há muitos exemplos",
      "Generativo: classifica e também cria exemplos novos",
      "Generativo: com poucos exemplos, a suposição sobre o formato dos dados ajuda",
    ],
    cons: [
      "Discriminativo: não gera nada e não diz se um exemplo é estranho para as duas classes",
      "Generativo: modelar os dados inteiros é mais difícil do que modelar só a fronteira",
      "LLM como classificador: mais caro e mais lento por chamada que um classificador pequeno",
    ],
    alternatives: ["Usar um LLM para rotular exemplos e treinar com eles um classificador pequeno e barato"],
  },
  knowledgeCheck: [
    {
      id: "which-can-generate",
      prompt: "Você precisa criar imagens sintéticas de peças com defeito para testar uma linha de produção. Qual tipo de modelo serve?",
      options: [
        "Um discriminativo, porque já separa peças boas de ruins",
        "Um generativo, porque aprendeu como as imagens com defeito são e consegue amostrar novas",
        "Qualquer k-NN",
        "Nenhum modelo consegue fazer isso",
      ],
      correct: 1,
      explanation: "Criar exemplos novos exige saber como os dados são, P(x | classe). O discriminativo só sabe de que lado da fronteira cada exemplo cai.",
      lesson: "00-04",
    },
    {
      id: "volume",
      prompt: "Um sistema classifica 50 milhões de tickets por dia em 5 categorias fixas, e há 1 milhão de tickets já rotulados. O que tende a ser mais econômico?",
      options: [
        "Chamar um LLM grande com prompt para cada ticket",
        "Treinar um classificador discriminativo pequeno com os rótulos existentes",
        "Escrever regras à mão",
        "Treinar um modelo generativo de imagens",
      ],
      correct: 1,
      explanation: "Com rótulos abundantes e categorias estáveis, um classificador pequeno é mais barato e rápido por chamada. O LLM brilha quando faltam dados ou a tarefa muda.",
      lesson: "00-04",
    },
  ],
  related: ["00-03", "00-05", "01-05"],
  references: [
    { title: "scikit-learn: Naive Bayes", url: "https://scikit-learn.org/stable/modules/naive_bayes.html", kind: "docs" },
    { title: "scikit-learn: Nearest Neighbors", url: "https://scikit-learn.org/stable/modules/neighbors.html", kind: "docs" },
    { title: "Google: Background, What is a Generative Model?", url: "https://developers.google.com/machine-learning/gan/generative", kind: "article" },
  ],
};

export default lesson;
