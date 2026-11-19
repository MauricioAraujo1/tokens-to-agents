import { softmax } from "../../../lab/attention";
import type { SceneSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Os números das cenas saem de contas feitas aqui, não de valores soltos: as contagens do bigrama
// viram probabilidades, o tamanho do espaço de n-grams vem de V^n e os pesos de attention vêm de softmax.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

// Passo 1: distribuição hipotética para a próxima palavra depois de "O gato subiu no".
const nextWord = [
  { label: "muro", value: 0.42 },
  { label: "telhado", value: 0.27 },
  { label: "sofá", value: 0.16 },
  { label: "chão", value: 0.1 },
  { label: "carro", value: 0.05 },
];

// Passo 2: no corpus do exemplo de código, "gato" aparece 4 vezes com uma palavra depois.
const afterGato = { dorme: 2, mia: 1, come: 1 };
const afterGatoTotal = Object.values(afterGato).reduce((total, count) => total + count, 0);
const afterGatoProbs = Object.entries(afterGato).map(([label, count]) => ({ label, value: count / afterGatoTotal }));

// Passos 3, 6 e 8: a mesma frase, com o sujeito longe do verbo.
const longSentence = ["O", "gato", "que", "a", "vizinha", "adotou", "no", "ano", "passado", "dorme"];
const verb = longSentence.length - 1;

// Passo 4: tamanho do espaço de n-grams com um vocabulário de 50 mil palavras.
const VOCAB = 50_000;
const ngramSpace = [1, 2, 3, 4].map((n) => ({ n, count: VOCAB ** n }));
const trigramSpace = VOCAB ** 3;
const corpusTokens = 1e12;
const seenAtMost = corpusTokens / trigramSpace;

// Passo 6: ilustração de uma RNN em que cada passo preserva 80% do sinal de "gato".
const KEEP = 0.8;
const gatoSignal = longSentence.map((_, index) => (index < 1 ? 0 : KEEP ** (index - 1)));

// Passo 8: pontuações de "dorme" contra os tokens anteriores e o softmax que vira peso.
const dormeScores = [0.1, 3.0, 0.3, 0.1, 1.4, 0.8, 0.1, 0.2, 0.5];
const dormeWeights = softmax(dormeScores);

// Passo 9: parâmetros publicados de cada modelo.
const models = [
  { year: "2017", name: "Transformer base", params: 65e6, label: "65 M" },
  { year: "2018", name: "GPT-1", params: 117e6, label: "117 M" },
  { year: "2019", name: "GPT-2", params: 1.5e9, label: "1,5 B" },
  { year: "2020", name: "GPT-3", params: 175e9, label: "175 B" },
];

const timeline = [
  { id: "ngram", label: "n-gram" },
  { id: "neural", label: "LM neural" },
  { id: "rnn", label: "RNN/LSTM" },
  { id: "attention", label: "attention" },
  { id: "transformer", label: "Transformer" },
];

const historyScene: SceneSpec = {
  kind: "pieces",
  layout: "single",
  pieces: [
    {
      id: "history",
      piece: "pipeline",
      stages: timeline,
      active: "transformer",
      done: timeline.slice(0, -1).map((stage) => stage.id),
    },
  ],
};

const lesson: LessonContent = {
  id: "03-01",
  subtitle:
    "De contar palavras a prever o próximo token com redes neurais: n-grams, RNNs, attention e a virada do Transformer.",
  objectives: [
    "Definir um modelo de linguagem como uma distribuição de probabilidade sobre o próximo token",
    "Explicar como um modelo n-gram conta contextos e por que ele esbarra na esparsidade",
    "Descrever o que RNNs e LSTMs trouxeram e onde travam: memória comprimida e processamento sequencial",
    "Relacionar attention e o Transformer à escala dos LLMs atuais",
  ],
  steps: [
    {
      id: "what-is-a-language-model",
      shortTitle: "Definição",
      title: "Um modelo de linguagem prevê o próximo token",
      tag: "context",
      body: [
        "Um [[Language Model|language-model]] (modelo de linguagem) recebe um trecho de texto e devolve uma distribuição de probabilidade sobre o que vem depois. Para “O gato subiu no”, um modelo hipotético dá 0,42 para “muro”, 0,27 para “telhado” e valores menores para as outras palavras do vocabulário. A soma de todas as probabilidades é 1.",
        "Com essa única operação dá para pontuar uma frase inteira. Pela regra da cadeia, P(o gato dorme) = P(o) × P(gato | o) × P(dorme | o gato). E dá para gerar texto: escolha uma palavra da distribuição, acrescente ao contexto e peça a próxima distribuição.",
        "Toda a história desta aula é a mesma pergunta respondida de jeitos cada vez melhores: como estimar P(próxima palavra | tudo o que veio antes)?",
      ],
      keyIdea: "Um modelo de linguagem não guarda frases prontas. Ele guarda uma forma de calcular a probabilidade da próxima palavra.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          { id: "prompt", piece: "token-stream", tokens: ["O", "gato", "subiu", "no"], query: 3 },
          { id: "next-word", piece: "chart", kind: "bar", series: nextWord, max: 0.5, highlight: 0 },
        ],
      },
      alt: `Os tokens “O gato subiu no” e, abaixo, a probabilidade de cada próxima palavra: ${nextWord
        .map((word) => `${word.label} ${fixed(word.value)}`)
        .join(", ")}.`,
    },
    {
      id: "counting-ngrams",
      shortTitle: "n-gram",
      title: "Os primeiros modelos contavam sequências",
      tag: "mechanism",
      body: [
        "Um modelo [[n-gram|n-gram]] estima a probabilidade da próxima palavra contando, num corpus, quantas vezes cada sequência de n palavras aparece. No bigrama (n = 2), o contexto é só a palavra anterior.",
        `No corpus do exemplo de código, “gato” aparece ${afterGatoTotal} vezes seguido de outra palavra: ${afterGato.dorme} vezes de “dorme”, ${afterGato.mia} de “mia” e ${afterGato.come} de “come”. Então P(dorme | gato) = ${afterGato.dorme} / ${afterGatoTotal} = ${fixed(afterGatoProbs[0].value)}. Treinar é só contar e dividir.`,
        "Esse foi o padrão em reconhecimento de fala e tradução estatística por décadas, com vocabulários grandes e corpora de bilhões de palavras.",
      ],
      keyIdea: "No n-gram, a probabilidade é uma frequência relativa: contagem da sequência dividida pela contagem do contexto.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          { id: "prompt", piece: "token-stream", tokens: ["o", "gato", "?"], query: 1, keys: [2] },
          { id: "next-word", piece: "chart", kind: "bar", series: afterGatoProbs, max: 1, highlight: 0 },
        ],
      },
      alt: `Depois de “gato”, as frequências relativas no corpus: ${afterGatoProbs
        .map((word) => `${word.label} ${fixed(word.value)}`)
        .join(", ")}.`,
    },
    {
      id: "short-window",
      shortTitle: "Janela curta",
      title: "O n-gram só enxerga as n − 1 palavras anteriores",
      tag: "mechanism",
      body: [
        "Para manter as contagens viáveis, o n-gram assume que só as n − 1 palavras anteriores importam. É a suposição de Markov. Num trigrama, a previsão de “dorme” depende apenas de “ano passado”.",
        "Na frase da cena, quem dorme é o gato, oito posições atrás. O trigrama não tem como saber disso: “gato” está fora da janela. Aumentar n até cobrir a frase toda parece a saída, mas cria outro problema, que aparece no próximo passo.",
      ],
      keyIdea: "Dependências longas, como sujeito e verbo separados por uma oração, ficam fora da janela de um n-gram.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "sentence",
            piece: "token-stream",
            tokens: longSentence,
            query: verb,
            keys: [verb - 2, verb - 1],
            arcs: [
              { from: verb, to: verb - 1, weight: 1 },
              { from: verb, to: verb - 2, weight: 1 },
            ],
          },
        ],
      },
      alt: "Frase “O gato que a vizinha adotou no ano passado dorme”. O trigrama liga “dorme” só a “ano” e “passado”; “gato” fica fora da janela.",
    },
    {
      id: "sparsity",
      shortTitle: "Esparsidade",
      title: "Cada palavra a mais no contexto multiplica as combinações",
      tag: "tradeoff",
      body: [
        `Com um vocabulário de V = ${VOCAB.toLocaleString("pt-BR")} palavras, existem V^n sequências possíveis de n palavras. Para trigramas, são ${fixed(trigramSpace / 1e14)} × 10¹⁴ combinações. Um corpus de 1 trilhão de palavras tem no máximo 10¹² trigramas, ou ${fixed(seenAtMost * 100, 1)}% do espaço. Pelo menos ${fixed(100 - seenAtMost * 100, 1)}% dos trigramas possíveis nunca aparecem.`,
        "Uma sequência que nunca apareceu recebe contagem zero, e a frase inteira recebe probabilidade zero. Técnicas de suavização, como Kneser-Ney, redistribuem um pouco de probabilidade para o que não foi visto, mas o modelo continua sem saber que “gato dorme” diz algo sobre “cachorro dorme”: para ele, são símbolos sem relação.",
      ],
      keyIdea: "O n-gram não generaliza entre palavras parecidas. Cada sequência é estimada sozinha, e o espaço cresce como V^n.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "space",
            piece: "chart",
            kind: "bar",
            series: ngramSpace.map(({ n, count }) => ({ label: `n=${n}`, value: Math.log10(count) })),
            highlight: 2,
            color: "danger",
          },
          {
            id: "space-metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "vocab", label: "V", value: VOCAB.toLocaleString("pt-BR") },
              { id: "trigrams", label: "trigramas possíveis", value: `${fixed(trigramSpace / 1e14)} × 10¹⁴` },
              { id: "seen", label: "vistos (máx.)", value: `${fixed(seenAtMost * 100, 1)}%` },
            ],
            highlight: "seen",
          },
        ],
      },
      alt: `Barras com log10 de V^n para n de 1 a 4: ${ngramSpace
        .map(({ n, count }) => `n=${n}: ${fixed(Math.log10(count), 1)}`)
        .join(", ")}. Um corpus de um trilhão de palavras cobre no máximo ${fixed(seenAtMost * 100, 1)}% dos trigramas.`,
    },
    {
      id: "neural-language-model",
      shortTitle: "LM neural",
      title: "Redes neurais trocam contagens por vetores",
      tag: "mechanism",
      body: [
        "Em 2003, Bengio e coautores propuseram o modelo de linguagem neural. Cada palavra vira um vetor aprendido, um [[embedding|embedding]], e uma rede neural calcula a próxima palavra a partir dos vetores do contexto.",
        "Palavras usadas em contextos parecidos acabam com vetores parecidos. Se o modelo viu “gato dorme” muitas vezes, “cachorro dorme” já recebe probabilidade alta, porque “cachorro” está perto de “gato” no espaço. A esparsidade cai: o modelo aprende sobre regiões do espaço, não sobre cada sequência isolada.",
        "O contexto ainda era uma janela fixa de poucas palavras, mas a ideia de representar palavras como vetores ficou. Ela é a base de toda a aula 03.05.",
      ],
      keyIdea: "Vetores próximos compartilham o que foi aprendido. É isso que permite generalizar para frases nunca vistas.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "words",
            piece: "vector-space",
            points: [
              { id: "gato", label: "gato", coords: [2, 1.6] },
              { id: "cachorro", label: "cachorro", coords: [1.7, 1.9] },
              { id: "cavalo", label: "cavalo", coords: [1.3, 1.5] },
              { id: "carro", label: "carro", coords: [-1.6, 0.4] },
              { id: "moto", label: "moto", coords: [-1.9, 0.8] },
              { id: "muro", label: "muro", coords: [0.2, -1.8] },
            ],
            query: "gato",
            neighbors: 2,
          },
        ],
      },
      alt: "Espaço 2D com palavras. Os vizinhos mais próximos de “gato” são “cachorro” e “cavalo”; “carro”, “moto” e “muro” ficam longe.",
    },
    {
      id: "recurrent-networks",
      shortTitle: "RNN",
      title: "RNNs leem a frase inteira, um token por vez",
      tag: "mechanism",
      body: [
        "Uma [[Recurrent Neural Network (RNN)|rnn]] tira a janela fixa. Ela lê um token por vez e mantém um estado oculto h, um vetor que resume tudo o que já foi lido: h_t = f(W · h_{t−1} + U · x_t). A previsão sai desse estado.",
        `O problema é que o resumo tem tamanho fixo e é reescrito a cada token. Na ilustração da cena, cada passo preserva ${fixed(KEEP * 100, 0)}% do sinal de “gato”. Quando a rede chega em “dorme”, sobram ${fixed(gatoSignal[verb] * 100, 0)}%. No treino, o gradiente faz o mesmo caminho de volta e também encolhe a cada passo: é o vanishing gradient.`,
        "A [[LSTM|lstm]] (Hochreiter e Schmidhuber, 1997) acrescenta portões que decidem o que guardar e o que esquecer, e aguenta dependências bem mais longas. Mesmo assim, o token 100 só é processado depois do 99: o treino não paraleliza ao longo da sequência.",
      ],
      keyIdea: "Uma RNN comprime todo o passado num vetor de tamanho fixo e processa em série. Esses dois limites motivaram o Transformer.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "sentence",
            piece: "token-stream",
            tokens: longSentence,
            query: verb,
            keys: [1],
            arcs: longSentence.slice(1).map((_, index) => ({ from: index, to: index + 1, weight: 0.6 })),
            bars: gatoSignal,
          },
        ],
      },
      alt: `A RNN passa o estado de token em token. As barras mostram quanto do sinal de “gato” resta em cada posição, caindo de 100% para ${fixed(gatoSignal[verb] * 100, 0)}% em “dorme”.`,
    },
    {
      id: "seq2seq-bottleneck",
      shortTitle: "Gargalo",
      title: "No seq2seq, a frase inteira cabe num vetor só",
      tag: "mechanism",
      body: [
        "Em 2014, o modelo [[sequence-to-sequence (seq2seq)|seq2seq]] levou as RNNs à tradução: um encoder lê a frase de origem e entrega o último estado a um decoder, que gera a tradução palavra por palavra.",
        "Tudo o que o decoder sabe da frase de origem está nesse único vetor, com algumas centenas ou poucos milhares de números. Para frases curtas funciona. Para frases longas, a qualidade cai, porque detalhes do começo já foram sobrescritos quando o encoder termina.",
      ],
      keyIdea: "O vetor fixo entre encoder e decoder é um gargalo: frases longas não cabem nele sem perda.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "seq2seq",
            piece: "pipeline",
            stages: [
              { id: "source", label: "frase" },
              { id: "encoder", label: "encoder RNN" },
              { id: "vector", label: "vetor fixo", color: "danger" },
              { id: "decoder", label: "decoder RNN" },
              { id: "target", label: "tradução" },
            ],
            active: "vector",
            done: ["source", "encoder"],
          },
        ],
      },
      alt: "Pipeline do seq2seq: frase, encoder RNN, vetor fixo em destaque, decoder RNN e tradução.",
    },
    {
      id: "attention-and-transformer",
      shortTitle: "Transformer",
      title: "Attention deixa cada token consultar todos os anteriores",
      tag: "mechanism",
      body: [
        "Bahdanau, Cho e Bengio (2014) propuseram que o decoder olhasse para todos os estados do encoder a cada palavra gerada, com um peso para cada um. Esse mecanismo de [[attention|attention]] acabou com o gargalo: nada precisa caber num vetor só.",
        `Na cena, “dorme” pontua cada token anterior e o [[softmax|softmax]] transforma as pontuações em pesos que somam 1. “gato” recebe ${fixed(dormeWeights[1])} do peso total, mesmo estando oito posições atrás. A distância deixou de importar.`,
        "Em 2017, Vaswani e coautores foram além em Attention Is All You Need: tiraram a recorrência e montaram o [[Transformer|transformer]] só com attention e camadas densas. Todas as posições são processadas ao mesmo tempo, o que encaixa bem em GPUs.",
      ],
      keyIdea: "Attention troca a memória comprimida da RNN por consulta direta: cada token busca, com pesos, o que precisa no resto da sequência.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "sentence",
            piece: "token-stream",
            tokens: longSentence,
            query: verb,
            keys: [1],
            arcs: dormeWeights.map((weight, index) => ({
              from: verb,
              to: index,
              weight,
              label: weight >= 0.1 ? fixed(weight) : undefined,
            })),
            bars: [...dormeWeights, 0],
          },
        ],
      },
      alt: `“dorme” liga-se a todos os tokens anteriores. O arco mais grosso vai para “gato”, com peso ${fixed(dormeWeights[1])}.`,
    },
    {
      id: "scale",
      shortTitle: "Escala",
      title: "Com o Transformer, o tamanho dos modelos explodiu",
      tag: "example",
      body: [
        "Treinar em paralelo permitiu usar muito mais dados e parâmetros. Em três anos, os modelos da OpenAI passaram de 117 milhões de parâmetros (GPT-1, 2018) para 1,5 bilhão (GPT-2, 2019) e 175 bilhões (GPT-3, 2020). O gráfico usa o log10 do número de parâmetros: cada unidade a mais é 10 vezes maior.",
        "O objetivo de treino continuou o mesmo do começo da aula: prever o próximo token. Kaplan e coautores (2020) mostraram que a perda cai de forma previsível, como lei de potência, quando parâmetros, dados e computação crescem juntos. Essa previsibilidade justificou os investimentos que levaram aos LLMs atuais.",
      ],
      keyIdea: "A tarefa não mudou desde os n-grams. Mudaram a arquitetura e a escala com que ela é aprendida.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "params",
            piece: "chart",
            kind: "bar",
            series: models.map((model) => ({ label: model.year, value: Math.log10(model.params) })),
            highlight: 3,
          },
          {
            id: "params-metrics",
            piece: "metrics-panel",
            metrics: models.map((model) => ({ id: model.name, label: model.name, value: model.label })),
            highlight: "GPT-3",
          },
        ],
      },
      alt: `Log10 do número de parâmetros por ano: ${models
        .map((model) => `${model.name} (${model.year}) ${model.label}`)
        .join(", ")}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "A mesma pergunta, respostas cada vez melhores",
      tag: "summary",
      body: [
        "n-grams contam sequências e não generalizam. O modelo neural troca palavras por vetores e generaliza entre palavras parecidas. RNNs e LSTMs leem a sequência inteira, mas comprimem o passado e não paralelizam. Attention deixa cada posição consultar todas as outras. O Transformer usa só attention e escala.",
        "As próximas aulas do módulo abrem o Transformer peça por peça: como o texto vira tokens, como os tokens viram vetores, como a ordem entra e como attention é calculada.",
      ],
      keyIdea: "Todo LLM atual ainda é um modelo de linguagem no mesmo sentido do n-gram: estima a probabilidade do próximo token.",
      scene: historyScene,
      alt: "Linha do tempo: n-gram, LM neural, RNN/LSTM, attention e Transformer, com o Transformer em destaque.",
    },
  ],
  realWorldExample:
    "O teclado do celular mostra três sugestões de próxima palavra enquanto você digita. Por muito tempo, essas sugestões vieram de modelos n-gram compactos, treinados com contagens e guardados no aparelho: rápidos e baratos, mas presos às últimas uma ou duas palavras. Um assistente como o ChatGPT faz a mesma operação, prever o próximo token, com um Transformer que considera milhares de tokens de contexto. A diferença de qualidade entre os dois não vem de uma tarefa diferente. Vem do quanto de contexto cada modelo consegue usar e de quanto ele generaliza a partir do que viu.",
  code: {
    language: "python",
    caption:
      "Um modelo bigrama completo em Python puro: treinar é contar pares de palavras, e prever é dividir pela contagem do contexto. Uma palavra nunca vista devolve uma distribuição vazia, que é o problema da esparsidade.",
    source: `from collections import Counter, defaultdict

corpus = [
    "o gato dorme no sofá",
    "o gato mia para o cachorro",
    "o cachorro dorme no quintal",
    "o gato dorme no muro",
    "o gato come ração",
]

# Conta quantas vezes cada palavra aparece depois de cada contexto de 1 palavra.
counts: dict[str, Counter] = defaultdict(Counter)
for sentence in corpus:
    words = ["<s>"] + sentence.split() + ["</s>"]
    for previous, current in zip(words, words[1:]):
        counts[previous][current] += 1

def next_word_probs(previous: str) -> dict[str, float]:
    following = counts[previous]
    total = sum(following.values())
    return {word: n / total for word, n in following.most_common()}

print(next_word_probs("gato"))    # {'dorme': 0.5, 'mia': 0.25, 'come': 0.25}
print(next_word_probs("dorme"))   # {'no': 1.0}
print(next_word_probs("girafa"))  # {}: nunca vista, nenhuma probabilidade`,
  },
  tradeOffs: {
    pros: [
      "Modelos neurais generalizam entre palavras parecidas, porque compartilham o que aprendem pelos vetores",
      "Attention liga posições distantes diretamente, sem depender de uma memória comprimida",
      "O Transformer processa todas as posições em paralelo no treino, o que viabiliza modelos com bilhões de parâmetros",
    ],
    cons: [
      "Modelos neurais custam muito mais para treinar e rodar do que uma tabela de contagens",
      "Um n-gram é transparente (cada probabilidade é uma contagem); um modelo neural não explica a sua previsão",
      "Attention compara cada token com todos os outros, e o custo cresce com o quadrado do tamanho da sequência",
    ],
    alternatives: [
      "n-grams com suavização Kneser-Ney, como baseline ou em dispositivos muito limitados",
      "Modelos de espaço de estados, como o Mamba, que voltam a processar a sequência com custo linear",
    ],
  },
  knowledgeCheck: [
    {
      id: "lm-definition",
      prompt: "O que um modelo de linguagem calcula?",
      options: [
        "A tradução de uma frase para outro idioma",
        "A probabilidade de cada próximo token, dado o texto anterior",
        "O significado exato de cada palavra num dicionário",
        "A frase mais longa que cabe na memória",
      ],
      correct: 1,
      explanation:
        "Tradução, resumo e conversa são usos. A operação básica de qualquer modelo de linguagem é estimar P(próximo token | contexto).",
      lesson: "03-01",
    },
    {
      id: "ngram-sparsity",
      prompt: "Por que aumentar o n de um modelo n-gram não resolve as dependências longas?",
      options: [
        "Porque o espaço de sequências cresce como V^n e quase todas nunca aparecem no corpus",
        "Porque o n-gram só aceita n = 3",
        "Porque contagens não podem ser divididas",
        "Porque o n-gram precisa de GPU para valores grandes de n",
      ],
      correct: 0,
      explanation:
        "Com V = 50 mil, já existem 1,25 × 10¹⁴ trigramas possíveis. Cada palavra a mais no contexto multiplica isso por V, e as contagens viram quase todas zero.",
      lesson: "03-01",
    },
    {
      id: "rnn-limits",
      prompt: "Quais limites das RNNs o Transformer atacou?",
      options: [
        "Vocabulário pequeno e falta de embeddings",
        "Uso de softmax na saída",
        "Memória comprimida num vetor fixo e processamento em série ao longo da sequência",
        "Incapacidade de gerar texto",
      ],
      correct: 2,
      explanation:
        "A RNN resume o passado num estado de tamanho fixo e só processa o token t depois do t − 1. Attention consulta qualquer posição diretamente e permite processar todas em paralelo.",
      lesson: "03-01",
    },
  ],
  related: ["02-09", "03-02", "03-05", "03-07", "03-13", "04-03"],
  references: [
    {
      title: "Bengio et al. (2003), A Neural Probabilistic Language Model",
      url: "https://www.jmlr.org/papers/volume3/bengio03a/bengio03a.pdf",
      kind: "paper",
    },
    {
      title: "Sutskever, Vinyals e Le (2014), Sequence to Sequence Learning with Neural Networks",
      url: "https://arxiv.org/abs/1409.3215",
      kind: "paper",
    },
    {
      title: "Bahdanau, Cho e Bengio (2014), Neural Machine Translation by Jointly Learning to Align and Translate",
      url: "https://arxiv.org/abs/1409.0473",
      kind: "paper",
    },
    {
      title: "Vaswani et al. (2017), Attention Is All You Need",
      url: "https://arxiv.org/abs/1706.03762",
      kind: "paper",
    },
    {
      title: "Brown et al. (2020), Language Models are Few-Shot Learners",
      url: "https://arxiv.org/abs/2005.14165",
      kind: "paper",
    },
    {
      title: "Kaplan et al. (2020), Scaling Laws for Neural Language Models",
      url: "https://arxiv.org/abs/2001.08361",
      kind: "paper",
    },
  ],
};

export default lesson;
