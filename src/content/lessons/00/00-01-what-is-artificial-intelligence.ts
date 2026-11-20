import type { LessonContent } from "../../../types/content";

// Um filtro de spam de brinquedo, calculado aqui: a regra escrita à mão e um modelo que aprende pesos
// por palavra com os exemplos (Naive Bayes com suavização de Laplace). Todo número da aula sai das contas abaixo.

interface Email {
  text: string;
  spam: boolean;
}

const training: Email[] = [
  { text: "ganhe dinheiro grátis agora", spam: true },
  { text: "oferta grátis clique agora", spam: true },
  { text: "prêmio em dinheiro clique aqui", spam: true },
  { text: "promoção só hoje clique", spam: true },
  { text: "reunião do projeto amanhã", spam: false },
  { text: "segue o relatório do projeto", spam: false },
  { text: "almoço com a equipe amanhã", spam: false },
  { text: "revisão do relatório hoje", spam: false },
];

const test: Email[] = [
  { text: "ganhe um prêmio clique agora", spam: true },
  { text: "dinheiro gr4tis só hoje", spam: true },
  { text: "almoço grátis com a equipe", spam: false },
  { text: "relatório da reunião de hoje", spam: false },
];

const words = (text: string) => text.split(" ");
const RULE_WORD = "grátis";
const ruleSaysSpam = (email: Email) => words(email.text).includes(RULE_WORD);

const vocabulary = [...new Set(training.flatMap((email) => words(email.text)))];
const countIn = (spam: boolean) => {
  const counts = new Map<string, number>();
  for (const email of training.filter((item) => item.spam === spam)) {
    for (const word of words(email.text)) counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  const total = [...counts.values()].reduce((sum, value) => sum + value, 0);
  return (word: string) => ((counts.get(word) ?? 0) + 1) / (total + vocabulary.length);
};
const inSpam = countIn(true);
const inHam = countIn(false);

const sigmoid = (value: number) => 1 / (1 + Math.exp(-value));

/** Peso de uma palavra: positivo puxa para spam, negativo para normal. Palavra nunca vista pesa 0. */
const weight = (word: string) => (vocabulary.includes(word) ? Math.log(inSpam(word) / inHam(word)) : 0);
const spamProbability = (text: string) => sigmoid(words(text).reduce((sum, word) => sum + weight(word), 0));
const modelSaysSpam = (email: Email) => spamProbability(email.text) >= 0.5;

const accuracy = (predict: (email: Email) => boolean) => test.filter((email) => predict(email) === email.spam).length;
const ruleHits = accuracy(ruleSaysSpam);
const modelHits = accuracy(modelSaysSpam);

const percent = (value: number) => `${Math.round(value * 100)}%`;

const NEW_EMAIL = "prêmio grátis clique agora";
const newEmailWords = words(NEW_EMAIL);
const newEmailProbability = spamProbability(NEW_EMAIL);
const shownWords = ["clique", "agora", "dinheiro", "grátis", "relatório", "projeto", "amanhã"];
/** Chance de spam de um e-mail que tivesse só essa palavra: acima de 50% ela puxa para spam. */
const shownScores = shownWords.map((word) => ({ label: word, value: Number(sigmoid(weight(word)).toFixed(2)) }));
const strongest = [...shownScores].sort((a, b) => b.value - a.value)[0];
const weakest = [...shownScores].sort((a, b) => a.value - b.value)[0];
const normalized = (values: number[]) => {
  const largest = Math.max(...values.map(Math.abs), 1e-9);
  return values.map((value) => Math.max(0, value) / largest);
};

const lesson: LessonContent = {
  id: "00-01",
  subtitle: "O que faz um sistema ser chamado de inteligente, e a diferença entre escrever regras e aprender com exemplos.",
  objectives: [
    "Definir inteligência artificial com as suas palavras",
    "Reconhecer onde a IA aparece num app do dia a dia",
    "Comparar um sistema de regras com um modelo que aprende com dados",
    "Entender o que um modelo devolve: uma decisão com uma confiança",
  ],
  steps: [
    {
      id: "everyday",
      shortTitle: "No dia a dia",
      title: "Você usa IA o dia todo",
      tag: "context",
      body: [
        "Quando você pergunta algo ao assistente do celular, o app manda o texto para um servidor, um [[modelo|model]] gera a resposta e ela volta para a tela. O mesmo acontece no filtro de spam, na recomendação de vídeos e na foto que o celular melhora sozinho.",
        "[[Inteligência artificial|artificial-intelligence]] é o nome da área que constrói esses sistemas: programas que entendem, decidem, preveem ou geram coisas que antes só uma pessoa conseguia.",
      ],
      keyIdea: "IA não é um robô de filme: é software que toma decisões a partir de dados, escondido atrás de apps comuns.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "você", col: 0, row: 0 },
              { id: "phone", kind: "phone", label: "app", col: 1, row: 0 },
              { id: "api", kind: "server", label: "servidor", col: 2, row: 0 },
              { id: "llm", kind: "llm", label: "modelo", col: 3, row: 0 },
            ],
            edges: [
              { from: "user", to: "phone", label: "pergunta" },
              { from: "phone", to: "api", label: "requisição" },
              { from: "api", to: "llm", label: "texto" },
            ],
            active: "llm",
          },
        ],
      },
      alt: "Você faz uma pergunta no app do celular, que manda a requisição a um servidor, que entrega o texto ao modelo, em destaque.",
    },
    {
      id: "rules",
      shortTitle: "Regras",
      title: "Antes: regras escritas à mão",
      tag: "mechanism",
      body: [
        `Um jeito de filtrar spam é escrever a regra: “se o e-mail tem a palavra ${RULE_WORD}, é spam”. Funciona no primeiro dia. Aí chega “dinheiro gr4tis só hoje”, e a regra deixa passar. Chega “almoço grátis com a equipe”, e a regra bloqueia um e-mail do seu chefe.`,
        `Nos 4 e-mails de teste da cena, a regra acerta ${ruleHits}. Para melhorar, alguém teria que escrever mais regras, para sempre: cada truque novo pede uma regra nova.`,
      ],
      keyIdea: "Regras só sabem o que alguém escreveu nelas. O mundo muda mais rápido do que a lista de regras.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "mail", kind: "documents", label: "e-mails", col: 0, row: 0 },
              { id: "rules", kind: "server", label: `regra: "${RULE_WORD}"`, col: 1, row: 0 },
              { id: "spam", kind: "no-result", label: "spam", col: 2, row: 0 },
              { id: "inbox", kind: "answer", label: "caixa de entrada", col: 2, row: 1 },
            ],
            edges: [
              { from: "mail", to: "rules" },
              { from: "rules", to: "spam", label: "tem a palavra" },
              { from: "rules", to: "inbox", label: "gr4tis passa", variant: "alternative" },
            ],
            active: "rules",
          },
        ],
      },
      alt: `E-mails passam por uma regra fixa que procura a palavra ${RULE_WORD}; o que tem a palavra vai para o spam e a variação gr4tis escapa para a caixa de entrada.`,
    },
    {
      id: "learning",
      shortTitle: "Aprender",
      title: "Agora: aprender com exemplos",
      tag: "mechanism",
      body: [
        `Em vez de escrever regras, você mostra ${training.length} e-mails já marcados como spam ou normal. O programa conta em quais e-mails cada palavra aparece e transforma isso num peso. Na cena, o peso virou uma chance: acima de 50%, a palavra puxa para spam; abaixo, para normal.`,
        `Ninguém disse que “${strongest.label}” é suspeito: a chance dela, ${percent(strongest.value)}, saiu dos exemplos. Do mesmo jeito, “${weakest.label}” ficou em ${percent(weakest.value)}. Esse conjunto de pesos aprendidos é o [[modelo|model]].`,
      ],
      keyIdea: "Aprender, aqui, é ajustar números a partir de exemplos. O programador escreve como aprender, não o que decidir.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "weights",
            piece: "chart",
            kind: "bar",
            series: shownScores,
            max: 1,
            cutoff: { mode: "threshold", value: 0.5, label: "50%" },
            highlight: shownWords.indexOf(strongest.label),
            color: "module-00",
          },
        ],
      },
      alt: `Barras com a chance de spam aprendida para cada palavra; ${strongest.label} é a mais suspeita, com ${percent(strongest.value)}, e ${weakest.label} puxa para normal, com ${percent(weakest.value)}.`,
    },
    {
      id: "decision",
      shortTitle: "Decisão",
      title: "O modelo decide com uma confiança",
      tag: "example",
      body: [
        `Chega um e-mail novo: “${NEW_EMAIL}”. O modelo soma os pesos das palavras e transforma a soma numa probabilidade: ${percent(newEmailProbability)} de ser spam.`,
        `No mesmo teste de 4 e-mails, o modelo acerta ${modelHits} e a regra acerta ${ruleHits}. O modelo também erra às vezes, mas, quando aparecem exemplos novos, basta treinar de novo: ninguém precisa reescrever o código.`,
      ],
      keyIdea: "Um modelo não devolve só “sim” ou “não”: devolve uma confiança, e o sistema decide o que fazer com ela.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "score",
            piece: "metrics-panel",
            metrics: [
              { id: "prob", label: "P(spam)", value: percent(newEmailProbability), color: "danger" },
              { id: "model", label: "acertos do modelo", value: `${modelHits} de ${test.length}`, color: "success" },
              { id: "rule", label: "acertos da regra", value: `${ruleHits} de ${test.length}` },
            ],
            highlight: "prob",
          },
          {
            id: "email",
            piece: "token-stream",
            tokens: newEmailWords,
            bars: normalized(newEmailWords.map(weight)),
            color: "module-00",
          },
        ],
      },
      alt: `As palavras do e-mail “${NEW_EMAIL}” com barras do quanto cada uma puxa para spam, e o painel com ${percent(newEmailProbability)} de chance de spam.`,
    },
    {
      id: "narrow",
      shortTitle: "IA estreita",
      title: "Toda IA de hoje é especialista",
      tag: "tradeoff",
      body: [
        "O filtro de spam é ótimo em uma coisa e não sabe fazer mais nada. Isso é [[IA estreita|narrow-ai]]: um sistema treinado para uma tarefa. Até os assistentes de chat, que parecem saber de tudo, são modelos treinados para prever texto, e erram com confiança quando saem do que viram.",
        "A IA geral, que aprenderia qualquer tarefa como uma pessoa, ainda é pesquisa. Na prática, um produto de IA junta várias peças especialistas: um modelo de texto, uma busca, regras de segurança.",
      ],
      keyIdea: "Pense em IA como um time de especialistas, não como um cérebro que sabe tudo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "phone", kind: "phone", label: "app", col: 0, row: 0.5 },
              { id: "guard", kind: "guardrail", label: "segurança", col: 1, row: 0.5 },
              { id: "llm", kind: "llm", label: "modelo de texto", col: 2, row: 0 },
              { id: "search", kind: "vector-db", label: "busca", col: 2, row: 1 },
            ],
            edges: [
              { from: "phone", to: "guard" },
              { from: "guard", to: "llm" },
              { from: "guard", to: "search" },
            ],
            active: "guard",
          },
        ],
      },
      alt: "Um app passa por uma camada de segurança, que distribui o trabalho entre um modelo de texto e uma busca: cada peça é especialista em uma tarefa.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Dos dados ao app",
      tag: "summary",
      body: [
        "Juntando tudo: exemplos marcados viram um modelo no treino, o modelo vai para um servidor, e o app manda as perguntas das pessoas para ele. Quando o modelo erra, mais exemplos e um novo treino corrigem.",
        "No resto do módulo você vai separar machine learning de deep learning, ver o que a IA generativa muda e montar o mapa do ecossistema.",
      ],
      keyIdea: "Inteligência artificial = dados + um jeito de aprender com eles + um sistema que usa o que foi aprendido.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "data", kind: "documents", label: "exemplos", col: 0, row: 0 },
              { id: "train", kind: "eval", label: "treino", col: 1, row: 0 },
              { id: "llm", kind: "llm", label: "modelo", col: 2, row: 0 },
              { id: "api", kind: "server", label: "servidor", col: 3, row: 0 },
              { id: "phone", kind: "phone", label: "app", col: 3, row: 1 },
            ],
            edges: [
              { from: "data", to: "train" },
              { from: "train", to: "llm", label: "pesos" },
              { from: "llm", to: "api" },
              { from: "api", to: "phone", label: "resposta" },
            ],
            active: "phone",
            done: ["data", "train", "llm", "api"],
          },
        ],
      },
      alt: "Exemplos alimentam o treino, que produz os pesos do modelo; o modelo roda num servidor, que entrega a resposta ao app.",
    },
  ],
  realWorldExample:
    "O Gmail filtra spam com modelos treinados em bilhões de e-mails marcados pelos próprios usuários: cada vez que alguém clica em “denunciar spam”, nasce um exemplo novo para o próximo treino.",
  code: {
    language: "python",
    source: `from sklearn.feature_extraction.text import CountVectorizer
from sklearn.naive_bayes import MultinomialNB

emails = ["ganhe dinheiro grátis agora", "reunião do projeto amanhã"]
labels = [1, 0]  # 1 = spam, 0 = normal

vectorizer = CountVectorizer()
model = MultinomialNB().fit(vectorizer.fit_transform(emails), labels)

print(model.predict_proba(vectorizer.transform(["prêmio grátis agora"])))`,
    caption: "O mesmo filtro da aula em poucas linhas: o modelo aprende os pesos das palavras com os exemplos e devolve a probabilidade de spam.",
  },
  tradeOffs: {
    pros: [
      "Aprende padrões que ninguém saberia escrever como regra",
      "Melhora com mais dados, sem reescrever o código",
      "Devolve uma confiança, que ajuda a decidir quando pedir revisão humana",
    ],
    cons: [
      "Precisa de exemplos bons e em quantidade",
      "Erra com confiança fora do que viu no treino",
      "É mais difícil explicar por que tomou uma decisão do que ler uma regra",
    ],
    alternatives: ["Regras e heurísticas, quando o problema é estável e pequeno", "Sistemas híbridos: regras de segurança em volta de um modelo"],
  },
  knowledgeCheck: [
    {
      id: "rules-vs-model",
      prompt: "Qual é a principal diferença entre um filtro de spam por regras e um filtro com modelo?",
      options: [
        "O modelo roda mais rápido",
        "As regras são escritas por pessoas; o modelo aprende os pesos a partir de exemplos marcados",
        "O modelo nunca erra",
        "As regras precisam de internet e o modelo não",
      ],
      correct: 1,
      explanation: "A regra só sabe o que alguém escreveu. O modelo ajusta números a partir dos exemplos e pode ser treinado de novo quando o mundo muda.",
      lesson: "00-01",
    },
    {
      id: "narrow-ai",
      prompt: "Um assistente de chat responde bem sobre culinária e inventa fatos sobre um remédio raro. O que isso mostra?",
      options: [
        "Que ele é uma IA geral com defeito",
        "Que todo modelo é uma IA estreita: bom no que os dados cobrem e frágil fora disso",
        "Que remédios não podem ser processados por IA",
        "Que faltou internet",
      ],
      correct: 1,
      explanation: "Os sistemas de hoje são IA estreita: aprendem a partir dos dados de treino e erram com confiança fora deles.",
      lesson: "00-01",
    },
  ],
  related: ["00-02", "00-03", "01-01"],
  references: [
    { title: "Artificial Intelligence: A Modern Approach (Russell & Norvig)", url: "https://aima.cs.berkeley.edu/", kind: "article" },
    { title: "Elements of AI: free online course", url: "https://www.elementsofai.com/", kind: "article" },
    { title: "scikit-learn: Naive Bayes", url: "https://scikit-learn.org/stable/modules/naive_bayes.html", kind: "docs" },
  ],
};

export default lesson;
