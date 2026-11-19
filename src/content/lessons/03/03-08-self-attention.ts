import { attentionRow } from "../../../lab/attention";
import type { LessonContent } from "../../../types/content";

// Self-attention de verdade, em escala de brinquedo. Os vetores dos tokens têm 4 traços
// [ser vivo, lugar, ação, emoção], escritos à mão. Q, K e V saem deles por multiplicação de matriz,
// e toda pontuação, peso e saída da cena é calculada aqui: q · k / √d_k, softmax e soma ponderada.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const vector = (values: number[]) => `[${values.map((value) => fixed(value)).join("; ")}]`;

type Matrix = number[][];

/** Vetor linha × matriz: x · W. */
const project = (x: number[], weights: Matrix) =>
  weights[0].map((_, col) => x.reduce((total, value, row) => total + value * weights[row][col], 0));

const tokens = ["O", "gato", "subiu", "no", "muro", "porque", "ele", "estava", "com", "medo"];
const features = ["vivo", "lugar", "ação", "emoção"];
const D_K = features.length;
const GATO = 1;
const ELE = 6;

// Vetores de entrada (embedding + posição já somados), um por token.
const X: Matrix = [
  [0.2, 0, 0, 0],
  [1, 0, 0, 0.1],
  [0, 0.1, 1, 0],
  [0, 0.3, 0, 0],
  [0.1, 1, 0, 0],
  [0, 0, 0.2, 0.2],
  [0.8, 0, 0, 0],
  [0, 0, 0.8, 0.2],
  [0, 0.1, 0, 0.1],
  [0.1, 0, 0, 1],
];

// Cabeça 1: um ser vivo procura outros seres vivos (quem é quem); verbos procuram o sujeito.
const W_Q: Matrix = [
  [7, 1, 0, 1.5],
  [0, 0, 1.5, 0],
  [2, 0.5, 0, 0],
  [1.5, 0, 0.5, 0],
];
// Aqui W_K e W_V são a identidade, para que keys e values sejam os próprios traços e a conta fique legível.
const identity: Matrix = features.map((_, row) => features.map((__, col) => (row === col ? 1 : 0)));
const W_K = identity;
const W_V = identity;

const Q = X.map((x) => project(x, W_Q));
const K = X.map((x) => project(x, W_K));
const V = X.map((x) => project(x, W_V));

const rows = Q.map((query) => attentionRow(query, K, V));
const ele = rows[ELE];
const eleQuery = Q[ELE];
const eleWeights = ele.weights;
const topScore = Math.max(...ele.scores);
const topKey = ele.scores.indexOf(topScore);

// Máscara causal: cada token só vê a si mesmo e os anteriores; o softmax é refeito só sobre eles.
const causalWeights: Matrix = rows.map((_, row) => {
  const visible = attentionRow(Q[row], K.slice(0, row + 1), V.slice(0, row + 1)).weights;
  return tokens.map((__, col) => (col <= row ? visible[col] : 0));
});

// Cabeça 2: um ser vivo procura ações (de quem é o verbo).
const W_Q2: Matrix = [
  [0, 0, 4, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
];
const head2 = attentionRow(project(X[ELE], W_Q2), K, V);
const head2Top = head2.weights.indexOf(Math.max(...head2.weights));

// Custo: n² pontuações por cabeça e por camada.
const lengths = [1024, 2048, 4096, 8192, 16_384, 32_768];
const FP16_BYTES = 2;
const scoreMatrixGiB = (n: number) => (n * n * FP16_BYTES) / 2 ** 30;

const arcsFrom = (query: number, weights: number[]) =>
  weights.map((weight, index) => ({
    from: query,
    to: index,
    weight,
    label: index !== query && weight >= 0.06 ? fixed(weight) : undefined,
  }));

const metrics = [
  { id: "tokens", label: "tokens", value: String(tokens.length) },
  { id: "dk", label: "d_k", value: String(D_K) },
  { id: "comparisons", label: "comparações", value: `${tokens.length} × ${tokens.length} = ${tokens.length ** 2}` },
  { id: "top", label: "maior pontuação", value: `ele → ${tokens[topKey]} ${fixed(topScore)}` },
];

const lesson: LessonContent = {
  id: "03-08",
  subtitle: "Como cada token decide em quais outros tokens prestar atenção, na mesma frase, e o que ele leva de cada um.",
  objectives: [
    "Explicar por que o contexto muda o significado de um token",
    "Mostrar como Q, K e V saem do mesmo vetor de entrada",
    "Calcular a pontuação q · k / √d_k",
    "Transformar pontuações em pesos com softmax e montar a saída como soma ponderada",
    "Aplicar a máscara causal e explicar por que o custo cresce com n²",
  ],
  steps: [
    {
      id: "context",
      shortTitle: "Contexto",
      title: "O significado de um token depende dos outros",
      tag: "context",
      body: [
        "Em “O gato subiu no muro porque ele estava com medo”, quem é “ele”? Você responde “o gato” sem esforço: muros não sentem medo. Mas o vetor de entrada de “ele” é o mesmo em qualquer frase. Ele não carrega essa resposta.",
        "[[Self-Attention|self-attention]] é a operação em que cada token da sequência consulta todos os tokens da mesma sequência e atualiza o seu vetor com o que encontrou. Depois dela, o vetor de “ele” passa a conter informação de “gato”.",
      ],
      keyIdea: "Self-attention transforma vetores isolados em vetores em contexto: cada token se reescreve olhando para a frase inteira.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          { id: "metrics", piece: "metrics-panel", metrics: metrics.slice(0, 1) },
          { id: "sentence", piece: "token-stream", tokens, query: ELE, keys: [GATO, 4] },
        ],
      },
      alt: "A frase “O gato subiu no muro porque ele estava com medo”, com ele em destaque e gato e muro como candidatos.",
    },
    {
      id: "vectors",
      shortTitle: "Vetores",
      title: "Cada token entra como um vetor",
      tag: "mechanism",
      body: [
        "A entrada é a matriz X, com uma linha por token: o embedding do token somado à codificação de posição. Na cena, cada vetor tem 4 traços escritos à mão, [ser vivo, lugar, ação, emoção], para que as contas sejam legíveis. Num modelo real, são centenas ou milhares de dimensões sem nome.",
        `“gato” é ${vector(X[GATO])}: muito “ser vivo”. “ele” é ${vector(X[ELE])}: um pronome que costuma apontar para seres vivos. “muro” é quase só “lugar”.`,
      ],
      keyIdea: "Antes da self-attention, cada linha de X só sabe sobre o seu próprio token e a sua posição.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          { id: "matrix", piece: "matrix", rows: tokens, cols: features, values: X, scale: { min: 0, max: 1 }, highlight: { row: ELE, col: 0 }, showValues: true },
        ],
      },
      alt: `Matriz X com os vetores dos 10 tokens. A linha de ele é ${vector(X[ELE])}.`,
    },
    {
      id: "qkv",
      shortTitle: "Q, K e V",
      title: "Três projeções do mesmo vetor: query, key e value",
      tag: "mechanism",
      body: [
        "Cada vetor de entrada é multiplicado por três matrizes aprendidas e vira três vetores: a [[query|query]] q = x · W_Q (o que este token procura), a [[key|key]] k = x · W_K (o que ele oferece para ser encontrado) e o [[value|value]] v = x · W_V (o que ele entrega se for escolhido). É a busca suave da aula anterior, agora com as três peças vindas da mesma frase.",
        `A cena mostra W_Q. A linha “vivo” diz que um ser vivo procura outros seres vivos, um pouco de lugar e de emoção. Por isso a query de “ele” sai ${vector(eleQuery)}. No exemplo, W_K e W_V são a identidade, para keys e values serem os próprios traços; num modelo treinado, as três matrizes são densas e aprendidas.`,
      ],
      keyIdea: "Q, K e V saem do mesmo vetor por três matrizes diferentes. O mesmo token pergunta, responde e entrega conteúdo de formas distintas.",
      scene: {
        kind: "pieces",
        layout: "row",
        pieces: [
          { id: "wq", piece: "matrix", rows: features, cols: features, values: W_Q, highlight: { row: 0, col: 0 }, showValues: true, color: "brand" },
          { id: "matrix", piece: "matrix", rows: tokens, cols: features, values: Q, highlight: { row: ELE, col: 0 }, showValues: true, color: "brand" },
        ],
      },
      alt: `À esquerda, a matriz W_Q; à direita, as queries de todos os tokens. A query de ele é ${vector(eleQuery)}.`,
    },
    {
      id: "scores",
      shortTitle: "Pontuação",
      title: "Quem combina com quem?",
      tag: "mechanism",
      body: [
        `Para o token “ele”, o modelo compara a sua query com a key de cada token da frase. Cada comparação é um produto escalar, q · k: quanto maior o número, mais os dois tokens combinam. Com ${tokens.length} tokens, são ${tokens.length} comparações para “ele” e ${tokens.length ** 2} para a frase inteira.`,
        `Depois, cada pontuação é dividida por √d_k (aqui √${D_K} = ${Math.sqrt(D_K)}; num modelo com d_k = 64, √64 = 8) para que os números não fiquem grandes demais antes do softmax. A maior pontuação de “ele” é com “${tokens[topKey]}”: ${fixed(topScore)}. A segunda é com ele mesmo, ${fixed(ele.scores[ELE])}, e “muro” fica com ${fixed(ele.scores[4])}.`,
      ],
      keyIdea: "Pense numa busca: a query é a pergunta que “ele” faz (“a quem eu me refiro?”), e as keys são as etiquetas de cada palavra. O produto escalar mede o quanto cada etiqueta responde à pergunta.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          { id: "metrics", piece: "metrics-panel", metrics, highlight: "top" },
          {
            id: "sentence",
            piece: "token-stream",
            tokens,
            query: ELE,
            keys: [topKey],
            arcs: ele.scores.map((score, index) => ({
              from: ELE,
              to: index,
              weight: Math.max(0, score) / topScore,
              label: index !== ELE && score >= 0.5 ? fixed(score) : undefined,
            })),
            bars: ele.scores.map((score) => Math.max(0, score) / topScore),
          },
        ],
      },
      alt: `Pontuações q · k / √d_k da query ele: ${tokens.map((token, index) => `${token} ${fixed(ele.scores[index])}`).join(", ")}. A maior é com ${tokens[topKey]}.`,
    },
    {
      id: "softmax",
      shortTitle: "Softmax",
      title: "Pontuações viram pesos que somam 1",
      tag: "mechanism",
      body: [
        `O [[softmax|softmax]] exponencia as dez pontuações de “ele” e divide pela soma. “gato” fica com ${fixed(eleWeights[GATO])} do peso, o próprio “ele” com ${fixed(eleWeights[ELE])} e “muro” com ${fixed(eleWeights[4])}. A soma dos dez pesos é ${fixed(eleWeights.reduce((total, weight) => total + weight, 0))}.`,
        "Os pesos não são escolhas binárias. “ele” continua recebendo um pouco de todos os tokens, mas a mistura é dominada por quem teve as maiores pontuações. A divisão por √d_k do passo anterior evita que o softmax fique saturado, com um peso perto de 1 e o resto perto de 0, o que mataria o gradiente no treino.",
      ],
      keyIdea: "Pesos de attention de um token formam uma distribuição: positivos, somando 1, concentrados onde as pontuações são altas.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "gato", label: "peso gato", value: fixed(eleWeights[GATO]) },
              { id: "self", label: "peso ele", value: fixed(eleWeights[ELE]) },
              { id: "muro", label: "peso muro", value: fixed(eleWeights[4]) },
              { id: "sum", label: "soma", value: fixed(eleWeights.reduce((total, weight) => total + weight, 0)) },
            ],
            highlight: "gato",
          },
          { id: "sentence", piece: "token-stream", tokens, query: ELE, keys: [GATO], arcs: arcsFrom(ELE, eleWeights), bars: eleWeights },
        ],
      },
      alt: `Pesos de ele depois do softmax: ${tokens.map((token, index) => `${token} ${fixed(eleWeights[index])}`).join(", ")}.`,
    },
    {
      id: "weighted-sum",
      shortTitle: "Soma",
      title: "O novo vetor de “ele” é a soma ponderada dos values",
      tag: "mechanism",
      body: [
        `Cada value é multiplicado pelo peso do seu token, e tudo é somado. O vetor de entrada de “ele” era ${vector(X[ELE])}. A saída é ${vector(ele.output)}: ganhou “emoção”, vinda de “medo” e do próprio “gato”, e um pouco de “lugar”, vinda de “muro”, mas o grosso continua sendo “ser vivo”, reforçado por “gato”.`,
        "Esse é o vetor contextual de “ele”. As camadas seguintes recebem um “ele” que já carrega informação sobre o gato. Num Transformer, a saída ainda passa por uma projeção W_O, é somada à entrada pela conexão residual e segue para a rede feed-forward.",
      ],
      keyIdea: "A saída da self-attention para um token é uma mistura dos values da frase, com a proporção dada pelos pesos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "matrix",
            piece: "matrix",
            rows: [...tokens.map((token, index) => `${token} × ${fixed(eleWeights[index])}`), "saída de ele"],
            cols: features,
            values: [...V, ele.output],
            scale: { min: 0, max: 1 },
            highlight: { row: tokens.length, col: 0 },
            showValues: true,
          },
        ],
      },
      alt: `Os values de cada token com o seu peso e, na última linha, a nova saída de ele: ${vector(ele.output)}.`,
    },
    {
      id: "causal-mask",
      shortTitle: "Máscara",
      title: "Na geração, um token não pode ver o futuro",
      tag: "mechanism",
      body: [
        "Um modelo como o GPT gera texto da esquerda para a direita. No treino, ele prevê cada token a partir dos anteriores, todos em paralelo. Se a posição 6 pudesse olhar a posição 7, ela veria a resposta. A [[Causal Mask|causal-mask]] (máscara causal) impede isso: antes do softmax, as pontuações das posições futuras viram −∞, e o peso delas fica exatamente 0.",
        `A matriz mostra os pesos de toda a frase com a máscara: a parte acima da diagonal fica apagada. Cada linha é um softmax só sobre o que está à esquerda. “ele” ainda alcança “gato”, que vem antes, agora com peso ${fixed(causalWeights[ELE][GATO])}, porque “estava”, “com” e “medo” saíram da conta. Encoders como o BERT não usam máscara e olham para os dois lados.`,
      ],
      keyIdea: "A máscara causal zera os pesos para tokens futuros. É ela que permite treinar a previsão do próximo token em paralelo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "weights",
            piece: "matrix",
            rows: tokens,
            cols: tokens,
            values: causalWeights,
            scale: { min: 0, max: 1 },
            causalMask: true,
            highlight: { row: ELE, col: GATO },
            color: "module-03",
          },
        ],
      },
      alt: `Matriz de pesos 10 × 10 com máscara causal: as células acima da diagonal estão apagadas. ele → gato vale ${fixed(causalWeights[ELE][GATO])}.`,
    },
    {
      id: "heads",
      shortTitle: "Cabeças",
      title: "Várias cabeças procuram relações diferentes",
      tag: "mechanism",
      body: [
        `Uma única distribuição de pesos não captura tudo o que “ele” precisa saber. Por isso o Transformer roda várias self-attentions em paralelo, cada uma com as suas próprias W_Q, W_K e W_V: são as cabeças da [[Multi-Head Attention|multi-head-attention]]. Na cena, a cabeça 1 liga “ele” a “gato” (${fixed(eleWeights[GATO])}); uma cabeça 2, com outra W_Q, liga “ele” às ações, e o maior peso vai para “${tokens[head2Top]}” (${fixed(head2.weights[head2Top])}).`,
        "O Transformer base tem 8 cabeças com d_k = 64 cada; as saídas são concatenadas e projetadas de volta para d = 512. Estudos com o BERT encontraram cabeças que seguem relações sintáticas e de correferência, como a cabeça 1 da cena. A aula 03.10 detalha o mecanismo.",
      ],
      keyIdea: "Cada cabeça aprende o seu próprio critério de busca. Juntas, cobrem relações diferentes na mesma camada.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          { id: "sentence", piece: "token-stream", tokens, query: ELE, keys: [GATO], arcs: arcsFrom(ELE, eleWeights) },
          { id: "head-2", piece: "token-stream", tokens, query: ELE, keys: [head2Top], arcs: arcsFrom(ELE, head2.weights), color: "info" },
        ],
      },
      alt: `Duas cabeças para a query ele. Cabeça 1: maior peso em gato (${fixed(eleWeights[GATO])}). Cabeça 2: maior peso em ${tokens[head2Top]} (${fixed(head2.weights[head2Top])}).`,
    },
    {
      id: "quadratic-cost",
      shortTitle: "Custo n²",
      title: "Todos contra todos: o custo cresce com n²",
      tag: "tradeoff",
      body: [
        `Cada token pontua todos os outros, então uma sequência de n tokens gera n² pontuações por cabeça e por camada. A frase da aula tem ${tokens.length ** 2}. Com ${lengths[0].toLocaleString("pt-BR")} tokens, são cerca de ${fixed(lengths[0] ** 2 / 1e6, 1)} milhão; com ${lengths[lengths.length - 1].toLocaleString("pt-BR")}, ${fixed(lengths[lengths.length - 1] ** 2 / 1e9, 1)} bilhão. Dobrar o contexto quadruplica o trabalho.`,
        `Guardar a matriz de pontuações em 16 bits para ${lengths[lengths.length - 1].toLocaleString("pt-BR")} tokens ocuparia ${fixed(scoreMatrixGiB(lengths[lengths.length - 1]), 0)} GiB por cabeça. Implementações como o FlashAttention calculam o mesmo resultado em blocos, sem materializar a matriz inteira: a memória deixa de crescer com n², mas o número de operações continua quadrático.`,
      ],
      keyIdea: "O preço de cada token ver todos os outros é quadrático. Contextos longos são caros por causa dele.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "n", label: "n", value: lengths[lengths.length - 1].toLocaleString("pt-BR") },
              { id: "comparisons", label: "comparações", value: `${fixed(lengths[lengths.length - 1] ** 2 / 1e9, 1)} bi` },
              { id: "memory", label: "matriz fp16", value: `${fixed(scoreMatrixGiB(lengths[lengths.length - 1]), 0)} GiB` },
            ],
            highlight: "comparisons",
          },
          {
            id: "cost",
            piece: "chart",
            kind: "line",
            series: lengths.map((n) => ({ label: `${n / 1024}k`, value: (n * n) / 1e6 })),
            highlight: lengths.length - 1,
            color: "danger",
          },
        ],
      },
      alt: `Milhões de pontuações por cabeça conforme o contexto cresce: ${lengths.map((n) => `${n / 1024}k tokens ${fixed((n * n) / 1e6, 0)}`).join(", ")}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Self-attention em uma linha",
      tag: "summary",
      body: [
        "Attention(Q, K, V) = softmax(Q · Kᵀ / √d_k) · V. Cada token projeta o seu vetor em query, key e value; compara a sua query com as keys de todos; transforma as pontuações em pesos com softmax; e sai com a soma dos values ponderada por esses pesos.",
        "A máscara causal limita cada token ao passado, várias cabeças buscam relações diferentes e o custo cresce com o quadrado do comprimento. A matriz da cena é o mapa completo de quem olhou para quem na frase. A próxima aula aprofunda Q, K e V.",
      ],
      keyIdea: "Self-attention é a operação que deixa cada token reescrever o próprio vetor com o contexto da sequência.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "weights",
            piece: "matrix",
            rows: tokens,
            cols: tokens,
            values: rows.map((row) => row.weights),
            scale: { min: 0, max: 1 },
            highlight: { row: ELE, col: GATO },
            color: "module-03",
          },
        ],
      },
      alt: `Matriz completa de pesos de self-attention, 10 × 10, sem máscara. Em destaque, ele → gato com ${fixed(eleWeights[GATO])}.`,
    },
  ],
  realWorldExample:
    "Quando um assistente de código completa uma função, cada token novo passa por dezenas de camadas de self-attention causal, e em cada uma ele consulta todos os tokens anteriores: o nome da função, os parâmetros, o import lá no topo do arquivo. É assim que o modelo usa uma variável declarada 200 linhas antes. O mesmo mecanismo explica o custo de contextos longos: um prompt de 32 mil tokens gera cerca de um bilhão de pontuações por cabeça e por camada no prefill. Servidores de inferência como o vLLM usam kernels do tipo FlashAttention e guardam keys e values já calculados (o KV cache) para não refazer essas contas a cada token gerado.",
  code: {
    language: "python",
    caption:
      "Self-attention com máscara causal em NumPy. Em PyTorch, a mesma conta, otimizada, é torch.nn.functional.scaled_dot_product_attention(q, k, v, is_causal=True).",
    source: `import numpy as np

def softmax(x: np.ndarray, axis: int = -1) -> np.ndarray:
    e = np.exp(x - x.max(axis=axis, keepdims=True))
    return e / e.sum(axis=axis, keepdims=True)

def self_attention(X, W_q, W_k, W_v, causal: bool = False):
    Q, K, V = X @ W_q, X @ W_k, X @ W_v            # (n, d_k), (n, d_k), (n, d_v)
    scores = Q @ K.T / np.sqrt(K.shape[-1])        # (n, n): todos contra todos
    if causal:
        n = X.shape[0]
        future = np.triu(np.ones((n, n), dtype=bool), k=1)
        scores = np.where(future, -np.inf, scores)  # exp(-inf) = 0: peso zero no futuro
    weights = softmax(scores, axis=-1)             # cada linha soma 1
    return weights @ V, weights

rng = np.random.default_rng(0)
n, d_model, d_k = 10, 64, 64
X = rng.normal(size=(n, d_model))
W_q, W_k, W_v = (rng.normal(size=(d_model, d_k)) / np.sqrt(d_model) for _ in range(3))

out, weights = self_attention(X, W_q, W_k, W_v, causal=True)
print(out.shape)                               # (10, 64)
print(np.allclose(weights.sum(axis=1), 1))     # True
print(np.allclose(np.triu(weights, k=1), 0))   # True: nenhum peso para tokens futuros`,
  },
  tradeOffs: {
    pros: [
      "Cada token alcança qualquer outro em um passo, sem depender da distância",
      "Todas as posições são calculadas em paralelo, com multiplicações de matriz que as GPUs fazem bem",
      "Os pesos são calculados a partir dos dados de cada frase: o mesmo modelo combina tokens de jeitos diferentes em contextos diferentes",
    ],
    cons: [
      "n² pontuações por cabeça e por camada: dobrar o contexto quadruplica o trabalho",
      "Sem codificação posicional, a operação não distingue a ordem dos tokens",
      "Na geração, cada token novo precisa das keys e values de todos os anteriores, o que exige guardá-los (KV cache)",
    ],
    alternatives: [
      "Attention esparsa ou em janela deslizante, que limita quantos tokens cada um consulta",
      "Modelos de espaço de estados (Mamba) e attention linear, com custo linear no comprimento",
    ],
  },
  knowledgeCheck: [
    {
      id: "score-formula",
      prompt: "Como é calculada a pontuação entre o token i e o token j na self-attention?",
      options: [
        "A distância entre as posições i e j",
        "q_i · k_j / √d_k",
        "v_i + v_j",
        "O id do token j dividido pelo id do token i",
      ],
      correct: 1,
      explanation:
        "A query de i é comparada com a key de j por produto escalar, e o resultado é dividido por √d_k para manter a escala estável antes do softmax.",
      lesson: "03-08",
    },
    {
      id: "causal-mask-effect",
      prompt: "O que a máscara causal faz?",
      options: [
        "Remove tokens repetidos",
        "Põe −∞ nas pontuações das posições futuras, e o peso delas vira 0 depois do softmax",
        "Divide as pontuações por √d_k",
        "Troca a ordem dos tokens",
      ],
      correct: 1,
      explanation:
        "Com −∞ antes do softmax, e^(−∞) = 0. Cada token só mistura values do próprio passado, o que permite treinar a previsão do próximo token em paralelo.",
      lesson: "03-08",
    },
    {
      id: "quadratic",
      prompt: "Um contexto passa de 8 mil para 16 mil tokens. O que acontece com o número de pontuações de self-attention por cabeça?",
      options: [
        "Fica igual",
        "Dobra",
        "Quadruplica",
        "Cai pela metade",
      ],
      correct: 2,
      explanation: "São n² pontuações. Com n duas vezes maior, (2n)² = 4n².",
      lesson: "03-08",
    },
  ],
  related: ["03-06", "03-07", "03-09", "03-10", "10-05"],
  references: [
    {
      title: "Vaswani et al. (2017), Attention Is All You Need",
      url: "https://arxiv.org/abs/1706.03762",
      kind: "paper",
    },
    {
      title: "Clark et al. (2019), What Does BERT Look At? An Analysis of BERT's Attention",
      url: "https://arxiv.org/abs/1906.04341",
      kind: "paper",
    },
    {
      title: "Dao et al. (2022), FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness",
      url: "https://arxiv.org/abs/2205.14135",
      kind: "paper",
    },
    {
      title: "PyTorch: torch.nn.functional.scaled_dot_product_attention",
      url: "https://pytorch.org/docs/stable/generated/torch.nn.functional.scaled_dot_product_attention.html",
      kind: "docs",
    },
    {
      title: "Jay Alammar, The Illustrated Transformer",
      url: "https://jalammar.github.io/illustrated-transformer/",
      kind: "article",
    },
  ],
};

export default lesson;
