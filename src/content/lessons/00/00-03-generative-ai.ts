import type { LessonContent } from "../../../types/content";

// Um gerador de texto de brinquedo, calculado aqui: um modelo de bigramas que conta, em 6 frases,
// qual palavra vem depois de qual. Ele gera escolhendo a próxima palavra mais provável, uma por vez.
// As chances, a frase gerada e a contagem de frases novas saem das contas abaixo.

const corpus = [
  "o gato subiu no muro",
  "o gato subiu no telhado",
  "o gato subiu no chão",
  "o gato dormiu no sofá",
  "o cachorro dormiu no sofá",
  "o cachorro dormiu no tapete",
];

const START = "o";
const words = (sentence: string) => sentence.split(" ");

const followers = new Map<string, Map<string, number>>();
for (const sentence of corpus) {
  const tokens = words(sentence);
  tokens.slice(1).forEach((next, index) => {
    const counts = followers.get(tokens[index]) ?? new Map<string, number>();
    counts.set(next, (counts.get(next) ?? 0) + 1);
    followers.set(tokens[index], counts);
  });
}

const probability = (current: string, next: string) => {
  const counts = followers.get(current);
  if (!counts) return 0;
  const total = [...counts.values()].reduce((sum, value) => sum + value, 0);
  return (counts.get(next) ?? 0) / total;
};

const mostLikely = (current: string) =>
  [...(followers.get(current) ?? new Map<string, number>()).entries()].reduce<[string, number] | null>(
    (best, entry) => (best === null || entry[1] > best[1] ? entry : best),
    null,
  )?.[0];

const generated: string[] = [START];
for (let next = mostLikely(START); next !== undefined; next = mostLikely(next)) generated.push(next);
const generatedSentence = generated.join(" ");
const isNew = !corpus.includes(generatedSentence);
const stepProbabilities = generated.map((word, index) => (index === 0 ? 1 : probability(generated[index - 1], word)));
const sentenceProbability = stepProbabilities.reduce((product, value) => product * value, 1);

const allSentences = (prefix: string[]): string[] => {
  const last = prefix[prefix.length - 1];
  const counts = followers.get(last);
  if (!counts) return [prefix.join(" ")];
  return [...counts.keys()].flatMap((next) => allSentences([...prefix, next]));
};
const possible = allSentences([START]);
const knownSentences = new Set(corpus);
const newSentences = possible.filter((sentence) => !knownSentences.has(sentence));

/** Recorte da tabela que cabe na cena: as palavras do começo das frases e as que podem vir depois delas. */
const rowWords = [START, "gato", "cachorro", "subiu", "dormiu"];
const colWords = [...new Set(rowWords.flatMap((current) => [...(followers.get(current)?.keys() ?? [])]))];
const table = rowWords.map((current) => colWords.map((next) => probability(current, next)));

const BEFORE_PLACE = "no";
const places = [...(followers.get(BEFORE_PLACE)?.keys() ?? [])];
const placeChances = places.map((place) => ({ label: place, value: probability(BEFORE_PLACE, place) }));
const chosenPlace = generated[generated.length - 1];

const percent = (value: number) => `${Math.round(value * 100)}%`;
const GPT3_PARAMETERS_BILLIONS = 175;

const lesson: LessonContent = {
  id: "00-03",
  subtitle: "Como um modelo cria texto, imagem e código que ninguém escreveu antes: prever o próximo pedaço, uma vez depois da outra.",
  objectives: [
    "Explicar o que a IA generativa produz e como ela difere de um classificador",
    "Gerar uma frase com um modelo de bigramas, passo a passo",
    "Entender por que o modelo cria frases novas e por que elas podem ser falsas",
    "Reconhecer o papel do prompt e dos foundation models",
  ],
  steps: [
    {
      id: "create",
      shortTitle: "Criar",
      title: "De classificar para criar",
      tag: "context",
      body: [
        "O filtro de spam da primeira aula respondia uma pergunta fechada: spam ou não. A [[IA generativa|generative-ai]] responde com algo novo: um parágrafo, uma imagem, uma função em Python. Você escreve um [[prompt|prompt]] e recebe conteúdo que não existia.",
        "Por baixo, a ideia é a mesma em todas as modalidades: o modelo aprendeu como os dados costumam ser e produz uma continuação provável. Para texto, isso vira um [[LLM|llm]] que prevê o próximo pedaço; para imagem, um modelo que tira ruído até sobrar uma figura.",
      ],
      keyIdea: "Um classificador escolhe entre respostas prontas; um modelo generativo monta a resposta pedaço por pedaço.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "você", col: 0, row: 0.5 },
              { id: "prompt", kind: "tokens", label: "prompt", col: 1, row: 0.5 },
              { id: "llm", kind: "llm", label: "modelo generativo", col: 2, row: 0.5 },
              { id: "text", kind: "answer", label: "texto", col: 3, row: 0 },
              { id: "code", kind: "laptop", label: "código", col: 3, row: 1 },
            ],
            edges: [
              { from: "user", to: "prompt" },
              { from: "prompt", to: "llm" },
              { from: "llm", to: "text" },
              { from: "llm", to: "code" },
            ],
            active: "llm",
          },
        ],
      },
      alt: "Você escreve um prompt, o modelo generativo em destaque recebe o prompt e produz texto e código novos.",
    },
    {
      id: "table",
      shortTitle: "Chances",
      title: "O modelo é uma tabela de chances",
      tag: "mechanism",
      body: [
        `Leia ${corpus.length} frases curtas sobre um gato e um cachorro e anote, para cada palavra, quais vieram depois. Depois de “${START}”, “gato” apareceu ${percent(probability(START, "gato"))} das vezes. Depois de “gato”, “subiu” apareceu ${percent(probability("gato", "subiu"))}. A cena mostra um pedaço dessa tabela: cada linha é a palavra atual, cada coluna é a próxima, e cada linha soma 100%.`,
        "Esse é um modelo de bigramas, o avô dos [[modelos de linguagem|language-model]]. Ele só olha a palavra anterior. Um LLM faz a mesma pergunta, “qual é o próximo token?”, mas olha milhares de tokens anteriores ao mesmo tempo, com bilhões de parâmetros no lugar da tabela.",
      ],
      keyIdea: "Treinar um modelo generativo é aprender a probabilidade do próximo pedaço dado o que veio antes.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "bigrams",
            piece: "matrix",
            rows: rowWords,
            cols: colWords,
            values: table,
            scale: { min: 0, max: 1 },
            highlight: { row: rowWords.indexOf("gato"), col: colWords.indexOf("subiu") },
            showValues: true,
            color: "module-00",
          },
        ],
      },
      alt: `Pedaço da tabela de bigramas: cada linha é uma palavra e cada coluna a palavra seguinte; em destaque, a chance de “subiu” depois de “gato”, ${percent(probability("gato", "subiu"))}.`,
    },
    {
      id: "generate",
      shortTitle: "Gerar",
      title: "Uma palavra de cada vez",
      tag: "mechanism",
      body: [
        `Para gerar, comece em “${START}”, escolha a próxima palavra mais provável, junte à frase e repita até não haver continuação. As barras da cena mostram a chance de cada escolha. O resultado é “${generatedSentence}”.`,
        `A chance da frase inteira é o produto das chances de cada passo: ${stepProbabilities.slice(1).map(percent).join(" × ")} ≈ ${percent(sentenceProbability)}. Esse laço, prever, escolher, anexar e repetir, é a geração [[autorregressiva|autoregressive]] que todo LLM usa.`,
      ],
      keyIdea: "Gerar texto é repetir a mesma previsão: cada palavra escolhida vira parte da entrada da próxima.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "sentence",
            piece: "token-stream",
            tokens: generated,
            bars: stepProbabilities,
            query: generated.length - 1,
            color: "module-00",
          },
        ],
      },
      alt: `A frase gerada “${generatedSentence}”, com uma barra por palavra mostrando a chance de cada escolha.`,
    },
    {
      id: "novel",
      shortTitle: "Frase nova",
      title: "Uma frase que ninguém escreveu",
      tag: "example",
      body: [
        `Procure “${generatedSentence}” nas ${corpus.length} frases de treino: ${isNew ? "ela não está lá" : "ela está lá"}. Depois de “${BEFORE_PLACE}”, “${chosenPlace}” é o lugar mais comum, e o modelo juntou esse lugar a “gato subiu”, uma combinação que não está no treino. Seguindo a tabela, dá para formar ${possible.length} frases, e ${newSentences.length} delas são novas.`,
        "É isso que torna o modelo generativo: ele recombina padrões. Na prática, ele não escolhe sempre a mais provável. Ele faz [[sampling|sampling]]: sorteia de acordo com as chances, e a mesma pergunta pode gerar respostas diferentes.",
      ],
      keyIdea: "O modelo não copia o treino: ele aprende padrões e os recombina em saídas que não existiam.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "places",
            piece: "chart",
            kind: "bar",
            series: placeChances,
            max: 1,
            highlight: places.indexOf(chosenPlace),
            color: "module-00",
          },
          {
            id: "counts",
            piece: "metrics-panel",
            metrics: [
              { id: "possible", label: "frases possíveis", value: String(possible.length) },
              { id: "new", label: "frases novas", value: String(newSentences.length), color: "success" },
              { id: "prob", label: "P(frase gerada)", value: percent(sentenceProbability) },
            ],
            highlight: "new",
          },
        ],
      },
      alt: `Barras com a chance de cada lugar depois de “${BEFORE_PLACE}”, com ${chosenPlace} em destaque, e o painel: ${possible.length} frases possíveis, ${newSentences.length} novas.`,
    },
    {
      id: "plausible",
      shortTitle: "Plausível",
      title: "Plausível não é verdadeiro",
      tag: "tradeoff",
      body: [
        `Talvez o gato nunca tenha subido no sofá. O modelo não sabe: ele só sabe que a frase é provável. Um LLM faz o mesmo em escala, e quando falta informação ele gera um fato que soa certo e não é. Isso se chama [[alucinação|hallucination]].`,
        "A defesa mais comum é dar ao modelo as fontes certas junto com a pergunta e pedir que responda só com base nelas. É a ideia do [[RAG|rag]], que aparece mais adiante no curso, e da [[fundamentação|grounding]] da resposta em documentos.",
      ],
      keyIdea: "Um modelo generativo otimiza o provável, não o verdadeiro. A verdade vem do contexto que você entrega.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "docs", kind: "documents", label: "fontes", col: 0, row: 0 },
              { id: "context", kind: "context", label: "contexto", col: 1, row: 0 },
              { id: "llm", kind: "llm", label: "modelo", col: 2, row: 0.5 },
              { id: "answer", kind: "answer", label: "resposta", col: 3, row: 0 },
              { id: "made-up", kind: "no-result", label: "fato inventado", col: 3, row: 1 },
            ],
            edges: [
              { from: "docs", to: "context" },
              { from: "context", to: "llm" },
              { from: "llm", to: "answer", label: "com fontes" },
              { from: "llm", to: "made-up", label: "sem fontes", variant: "alternative" },
            ],
            active: "llm",
          },
        ],
      },
      alt: "Fontes entram no contexto do modelo, que gera uma resposta fundamentada; sem fontes, o caminho tracejado leva a um fato inventado.",
    },
    {
      id: "foundation",
      shortTitle: "Resumo",
      title: "Um modelo, muitos produtos",
      tag: "summary",
      body: [
        `Os modelos generativos de hoje são treinados uma vez, em uma quantidade enorme de dados, e depois servem a muitas tarefas só mudando o prompt. Por isso são chamados de [[foundation models|foundation-model]]. O GPT-3, de 2020, tinha ${GPT3_PARAMETERS_BILLIONS} bilhões de parâmetros.`,
        "Resumindo: aprender as chances do próximo pedaço, gerar um pedaço por vez, sortear para variar e fundamentar para não inventar. Na próxima aula, você compara esse tipo de modelo com os que só classificam.",
      ],
      keyIdea: "IA generativa = um modelo grande que prevê o próximo pedaço + um prompt que diz o que gerar.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "web", kind: "documents", label: "texto da web", col: 0, row: 0.5 },
              { id: "train", kind: "eval", label: "pré-treino", col: 1, row: 0.5 },
              { id: "llm", kind: "llm", label: "foundation model", col: 2, row: 0.5 },
              { id: "chat", kind: "phone", label: "chat", col: 3, row: 0 },
              { id: "code", kind: "laptop", label: "código", col: 3, row: 1 },
            ],
            edges: [
              { from: "web", to: "train" },
              { from: "train", to: "llm", label: "pesos" },
              { from: "llm", to: "chat", label: "prompt" },
              { from: "llm", to: "code", label: "prompt" },
            ],
            active: "llm",
            done: ["web", "train"],
          },
        ],
      },
      alt: "Texto da web alimenta o pré-treino, que produz um foundation model; o mesmo modelo serve um chat e um assistente de código, mudando só o prompt.",
    },
  ],
  realWorldExample:
    "O GitHub Copilot sugere a próxima linha de código enquanto você digita. É a mesma ideia da aula, prever a continuação mais provável, aplicada a código, com um modelo treinado em muito código público.",
  code: {
    language: "python",
    source: `from collections import Counter, defaultdict

corpus = ["o gato subiu no muro", "o gato dormiu no sofá", "o cachorro dormiu no sofá"]

next_words = defaultdict(Counter)
for sentence in corpus:
    words = sentence.split()
    for current, following in zip(words, words[1:]):
        next_words[current][following] += 1

word, sentence = "o", ["o"]
while next_words[word]:
    word = next_words[word].most_common(1)[0][0]
    sentence.append(word)

print(" ".join(sentence))  # o gato subiu no sofá`,
    caption: "Um gerador de bigramas: conta as continuações e escolhe a mais comum. A frase gerada não está no corpus.",
  },
  tradeOffs: {
    pros: [
      "Produz conteúdo novo em texto, imagem, áudio e código",
      "Um só modelo atende muitas tarefas, trocando só o prompt",
      "A interface é linguagem natural: qualquer pessoa consegue usar",
    ],
    cons: [
      "Gera o provável, não o verdadeiro: pode inventar fatos com confiança",
      "A saída varia de uma chamada para outra, o que dificulta testes",
      "Treinar e servir modelos grandes custa caro em GPU e energia",
    ],
    alternatives: ["Um classificador ou uma busca, quando a resposta certa já existe numa lista", "Templates com campos preenchidos, quando o formato é fixo"],
  },
  knowledgeCheck: [
    {
      id: "why-new",
      prompt: "Um modelo de bigramas treinado só com “o gato subiu no muro” e “o cão dormiu no sofá” gera “o gato subiu no sofá”. Por quê?",
      options: [
        "Porque ele copiou uma frase do treino",
        "Porque ele escolhe cada palavra olhando só a anterior, e “no” já foi seguido de “sofá”",
        "Porque ele entendeu que gatos sobem em sofás",
        "Porque houve um erro de digitação no corpus",
      ],
      correct: 1,
      explanation: "O bigrama só olha a palavra anterior. Depois de “no” vale qualquer continuação vista, e a recombinação produz uma frase nova.",
      lesson: "00-03",
    },
    {
      id: "same-prompt",
      prompt: "Você manda o mesmo prompt duas vezes a um assistente de chat e recebe textos diferentes. O que explica isso?",
      options: [
        "O modelo foi treinado de novo entre as chamadas",
        "O modelo sorteia o próximo token de acordo com as probabilidades, em vez de escolher sempre o mais provável",
        "A internet mudou a resposta",
        "Um defeito no servidor",
      ],
      correct: 1,
      explanation: "Com sampling, cada token é sorteado conforme a distribuição do modelo. Duas sequências de sorteios levam a textos diferentes.",
      lesson: "00-03",
    },
  ],
  related: ["00-02", "00-04", "04-02"],
  references: [
    { title: "Language Models are Few-Shot Learners (GPT-3)", url: "https://arxiv.org/abs/2005.14165", kind: "paper" },
    { title: "On the Opportunities and Risks of Foundation Models", url: "https://arxiv.org/abs/2108.07258", kind: "paper" },
    { title: "Speech and Language Processing (Jurafsky & Martin): N-gram Language Models", url: "https://web.stanford.edu/~jurafsky/slp3/", kind: "article" },
  ],
};

export default lesson;
