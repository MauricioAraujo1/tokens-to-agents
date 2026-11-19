import { attentionRow, dot, softmax } from "../../../lab/attention";
import { generationCost } from "../../../lab/kvCache";
import { seededRandom } from "../../../lab/sampling";
import type { LessonContent } from "../../../types/content";

// Q, K e V em escala de brinquedo. Os vetores de entrada têm 6 traços escritos à mão: os 3 primeiros
// ([vivo, ação, lugar]) servem para casar query com key, e os 3 últimos ([felino, mobília, passado]) são o
// conteúdo que o value entrega. Toda pontuação, peso, saída e estatística da cena é calculada aqui.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const vector = (values: number[]) => `[${values.map((value) => fixed(value)).join("; ")}]`;
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const percent = (value: number) => `${(value * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;

type Matrix = number[][];

/** Vetor linha × matriz: x · W. */
const project = (x: number[], weights: Matrix) =>
  weights[0].map((_, col) => x.reduce((total, value, row) => total + value * weights[row][col], 0));

const tokens = ["O", "gato", "dormiu", "no", "sofá"];
const inputFeatures = ["vivo", "ação", "lugar", "felino", "mobília", "passado"];
const keyFeatures = ["vivo", "ação", "lugar"];
const valueFeatures = ["felino", "mobília", "passado"];
const D_K = keyFeatures.length;
const GATO = 1;
const DORMIU = 2;
const SOFA = 4;

// Vetores de entrada (embedding + posição já somados), um por token.
const X: Matrix = [
  [0.2, 0, 0, 0, 0, 0],
  [1, 0, 0.1, 1, 0, 0],
  [0.1, 1, 0, 0, 0, 1],
  [0, 0, 0.3, 0, 0, 0],
  [0, 0.1, 1, 0, 1, 0],
];

// W_Q: o traço de entrada vira o traço procurado. Uma ação pergunta "quem?", um ser vivo pergunta "onde?"
// e um lugar pergunta "o que aconteceu aqui?". Os traços de conteúdo não entram na query.
const W_Q: Matrix = [
  [0, 0, 4],
  [4, 0, 0],
  [0, 4, 0],
  [0, 0, 0],
  [0, 0, 0],
  [0, 0, 0],
];
// W_K lê só os 3 traços de busca; W_V lê só os 3 traços de conteúdo.
const W_K: Matrix = inputFeatures.map((_, row) => keyFeatures.map((__, col) => (row === col ? 1 : 0)));
const W_V: Matrix = inputFeatures.map((_, row) => valueFeatures.map((__, col) => (row === col + keyFeatures.length ? 1 : 0)));

const Q = X.map((x) => project(x, W_Q));
const K = X.map((x) => project(x, W_K));
const V = X.map((x) => project(x, W_V));

const rows = Q.map((query) => attentionRow(query, K, V));
const dormiu = rows[DORMIU];
const weightsOf = (matrix: { weights: number[] }[]) => matrix.map((row) => row.weights);
const argmax = (values: number[]) => values.indexOf(Math.max(...values));

// Mesma matriz para query e key: a pontuação vira simétrica e cada token tende a escolher a si mesmo.
const shared = X.map((x) => project(x, W_Q));
const sharedRows = shared.map((query) => attentionRow(query, shared, V));
const sharedDormiu = sharedRows[DORMIU];

// Busca exata num dicionário: o resultado é um único value, o da key igual.
const dictionaryRow = tokens.map((_, index) => (index === GATO ? 1 : 0));

// Por que dividir por √d_k: produto escalar de vetores aleatórios com componentes de variância 1.
const random = seededRandom(20_17);
const gaussian = () => Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random());
const randomVector = (d: number) => Array.from({ length: d }, gaussian);
const SAMPLES = 1000;
const dims = [4, 16, 64, 256];
const stdOf = (values: number[]) => {
  const mean = values.reduce((total, value) => total + value, 0) / values.length;
  return Math.sqrt(values.reduce((total, value) => total + (value - mean) ** 2, 0) / values.length);
};
const dotStd = dims.map((d) => stdOf(Array.from({ length: SAMPLES }, () => dot(randomVector(d), randomVector(d)))));
const scaledStd = dotStd.map((std, index) => std / Math.sqrt(dims[index]));
// Uma query contra 10 keys aleatórias em d_k = 256: o softmax com e sem a divisão.
const SAT_D = 256;
const satQuery = randomVector(SAT_D);
const satScores = Array.from({ length: 10 }, () => dot(satQuery, randomVector(SAT_D)));
const satMaxRaw = Math.max(...softmax(satScores));
const satMaxScaled = Math.max(...softmax(satScores.map((score) => score / Math.sqrt(SAT_D))));

// Cross-attention: o decoder (português) pergunta, o encoder (inglês) responde. Traços [artigo, animal, dormir].
const source = ["the", "cat", "slept"];
const target = ["o", "gato", "dormiu"];
const sourceKeys: Matrix = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];
const targetQueries: Matrix = [
  [2.4, 0.4, 0],
  [0.2, 3, 0.2],
  [0, 0.8, 3],
];
const cross = targetQueries.map((query) => attentionRow(query, sourceKeys, sourceKeys));

// KV cache: operações simuladas do Laboratório para gerar 8 tokens depois de um prompt de 8.
const PROMPT = 8;
const GENERATED = 8;
const uncached = generationCost(PROMPT, GENERATED, false);
const cached = generationCost(PROMPT, GENERATED, true);

// Transformer base (Vaswani et al., 2017).
const D_MODEL = 512;
const HEADS = 8;
const HEAD_DIM = D_MODEL / HEADS;
const perHeadParams = 3 * D_MODEL * HEAD_DIM;
const layerParams = 4 * D_MODEL * D_MODEL;

// Llama 2 7B: 32 camadas, d_model = 4096, keys e values em 16 bits.
const LLAMA_LAYERS = 32;
const LLAMA_D = 4096;
const kvBytesPerToken = 2 * LLAMA_LAYERS * LLAMA_D * 2;
const kvGiB4k = (kvBytesPerToken * 4096) / 2 ** 30;

const arcsFrom = (query: number, weights: number[]) =>
  weights.map((weight, index) => ({
    from: query,
    to: index,
    weight,
    label: index !== query && weight >= 0.1 ? fixed(weight) : undefined,
  }));

const lesson: LessonContent = {
  id: "03-09",
  subtitle:
    "Por que a self-attention projeta cada token em três vetores diferentes, o que cada um faz e o que muda quando as três projeções se separam.",
  objectives: [
    "Explicar a self-attention como uma busca suave num dicionário de keys e values",
    "Mostrar por que query e key precisam de projeções diferentes",
    "Separar o papel da key (quem é escolhido) do papel do value (o que é entregue)",
    "Justificar a divisão por √d_k pela variância do produto escalar",
    "Reconhecer Q, K e V na cross-attention e no KV cache",
  ],
  steps: [
    {
      id: "context",
      shortTitle: "Contexto",
      title: "Três papéis para o mesmo token",
      tag: "context",
      body: [
        "Na aula anterior, cada token virou três vetores antes da self-attention. Esta aula explica por quê. Os nomes vêm da recuperação de informação: a [[query|query]] é o que um token procura, a [[key|key]] é a etiqueta pela qual ele é encontrado e o [[value|value]] é o conteúdo que ele entrega quando é encontrado.",
        "Na frase “O gato dormiu no sofá”, o verbo “dormiu” precisa saber quem dormiu. A query dele pergunta “quem?”. A key de “gato” responde “sou um ser vivo”. O value de “gato” entrega o que importa adiante: é um felino. Os três papéis são separados porque procurar, ser encontrado e informar são coisas diferentes.",
      ],
      keyIdea: "Query pergunta, key responde se combina e value entrega o conteúdo. O mesmo token faz os três papéis ao mesmo tempo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          { id: "sentence", piece: "token-stream", tokens, query: DORMIU, keys: [GATO] },
        ],
      },
      alt: "A frase “O gato dormiu no sofá”, com dormiu em destaque como query e gato como a key que responde.",
    },
    {
      id: "soft-lookup",
      shortTitle: "Busca suave",
      title: "Um dicionário que devolve uma mistura",
      tag: "mechanism",
      body: [
        "Num dicionário comum, você passa uma chave e recebe um valor: só a chave idêntica conta, e o resultado é tudo ou nada. Se “dormiu” buscasse “gato” num dicionário, o peso seria 1 para “gato” e 0 para o resto.",
        `A self-attention faz uma busca suave. A query é comparada com todas as keys, cada comparação vira um peso pelo [[softmax|softmax]], e a resposta é a média dos values ponderada por esses pesos. Na cena, “dormiu” dá ${fixed(dormiu.weights[GATO])} do peso a “gato” e divide o resto entre os outros tokens. Como a busca é contínua, ela é diferenciável, e o treino consegue ajustar as projeções pelo gradiente.`,
      ],
      keyIdea: "Attention é um dicionário com busca por semelhança: em vez de escolher uma chave, ela mistura todos os values na proporção da semelhança.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "weights",
            piece: "matrix",
            rows: ["dicionário", "attention"],
            cols: tokens,
            values: [dictionaryRow, dormiu.weights],
            scale: { min: 0, max: 1 },
            highlight: { row: 1, col: GATO },
            showValues: true,
            color: "module-03",
          },
        ],
      },
      alt: `Pesos da busca de dormiu. Dicionário: 1 em gato e 0 no resto. Attention: ${tokens.map((token, index) => `${token} ${fixed(dormiu.weights[index])}`).join(", ")}.`,
    },
    {
      id: "projections",
      shortTitle: "Projeções",
      title: "Três matrizes aprendidas leem o mesmo vetor",
      tag: "mechanism",
      body: [
        `Cada token entra com um vetor x de d_model números. Três matrizes aprendidas o transformam: q = x · W_Q, k = x · W_K e v = x · W_V. Na cena, x tem ${inputFeatures.length} traços. W_K lê só os três primeiros, [vivo, ação, lugar], e W_V lê só os três últimos, [felino, mobília, passado]. Assim, d_k = d_v = ${D_K}.`,
        `W_Q mapeia cada traço de entrada para o traço que o token procura: uma ação procura um ser vivo, um ser vivo procura um lugar e um lugar procura uma ação. A query de “dormiu” sai ${vector(Q[DORMIU])}: quase só “vivo”. Num modelo treinado, ninguém escreve essas regras. As matrizes são densas e o treino as ajusta.`,
      ],
      keyIdea: "Q, K e V não são dados de entrada: são três leituras diferentes do mesmo vetor, cada uma feita por uma matriz aprendida.",
      scene: {
        kind: "pieces",
        layout: "row",
        pieces: [
          { id: "wq", piece: "matrix", rows: inputFeatures, cols: keyFeatures, values: W_Q, highlight: { row: 1, col: 0 }, showValues: true, color: "brand" },
          { id: "queries", piece: "matrix", rows: tokens, cols: keyFeatures, values: Q, highlight: { row: DORMIU, col: 0 }, showValues: true, color: "brand" },
        ],
      },
      alt: `À esquerda, W_Q, com ${inputFeatures.length} linhas e ${D_K} colunas. À direita, as queries dos 5 tokens; a de dormiu é ${vector(Q[DORMIU])}.`,
    },
    {
      id: "asymmetry",
      shortTitle: "Q ≠ K",
      title: "Por que query e key têm matrizes diferentes",
      tag: "mechanism",
      body: [
        `Imagine usar a mesma matriz para query e key. A pontuação entre i e j vira (x_i · W) · (x_j · W), que é igual nos dois sentidos: a matriz de pontuações fica simétrica. Pior, o maior produto escalar costuma ser o do token com ele mesmo. Na cena de cima, com a matriz compartilhada, “dormiu” dá ${fixed(sharedDormiu.weights[DORMIU])} do peso a si mesmo, e “gato” fica com ${percent(sharedDormiu.weights[GATO])}.`,
        `Com W_Q e W_K separadas, na cena de baixo, a relação deixa de ser simétrica. “dormiu” → “gato” pesa ${fixed(rows[DORMIU].weights[GATO])}, mas “gato” → “dormiu” pesa ${fixed(rows[GATO].weights[DORMIU])}: o gato procura um lugar e dá ${fixed(rows[GATO].weights[SOFA])} a “sofá”. Relações de linguagem são assim: o verbo procura o sujeito, mas o sujeito não procura o verbo pelo mesmo critério.`,
      ],
      keyIdea: "Matrizes separadas para query e key permitem que i procure j sem que j procure i. Sem isso, cada token tenderia a olhar para si mesmo.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          { id: "shared", piece: "matrix", rows: tokens, cols: tokens, values: weightsOf(sharedRows), scale: { min: 0, max: 1 }, highlight: { row: DORMIU, col: DORMIU }, showValues: true, color: "danger" },
          { id: "weights", piece: "matrix", rows: tokens, cols: tokens, values: weightsOf(rows), scale: { min: 0, max: 1 }, highlight: { row: DORMIU, col: GATO }, showValues: true, color: "module-03" },
        ],
      },
      alt: `Duas matrizes de pesos 5 × 5. Em cima, com a mesma matriz para query e key: a diagonal domina e dormiu → dormiu vale ${fixed(sharedDormiu.weights[DORMIU])}. Embaixo, com W_Q e W_K separadas: dormiu → gato vale ${fixed(rows[DORMIU].weights[GATO])} e gato → dormiu vale ${fixed(rows[GATO].weights[DORMIU])}.`,
    },
    {
      id: "key-vs-value",
      shortTitle: "Key × value",
      title: "A key decide quem é escolhido; o value decide o que chega",
      tag: "mechanism",
      body: [
        "Os pesos dependem só de queries e keys. O value não entra na pontuação: ele só é misturado depois. Por isso um token pode ser encontrado por um traço e entregar outro. “gato” é encontrado por ser “vivo”, mas o que ele entrega é “felino”, um traço que nem aparece na key.",
        `A saída de “dormiu” é a soma dos values ponderada pelos pesos: ${vector(dormiu.output)}. O verbo agora carrega ${fixed(dormiu.output[0])} de “felino”, vindo do sujeito, e só ${fixed(dormiu.output[2])} de “passado”, o seu próprio traço: a saída é uma mistura, e o que o token já tinha volta pela conexão residual (aula 03.13). Se W_V mudar, a saída muda e os pesos continuam iguais.`,
      ],
      keyIdea: "Separar key e value separa o critério de busca do conteúdo transportado. O que serve para achar não precisa ser o que vale a pena levar.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "values",
            piece: "matrix",
            rows: [...tokens.map((token, index) => `${token} × ${fixed(dormiu.weights[index])}`), "saída de dormiu"],
            cols: valueFeatures,
            values: [...V, dormiu.output],
            scale: { min: 0, max: 1 },
            highlight: { row: tokens.length, col: 0 },
            showValues: true,
          },
        ],
      },
      alt: `Os values de cada token, com o peso dado por dormiu, e na última linha a saída de dormiu: ${vector(dormiu.output)}.`,
    },
    {
      id: "scaling",
      shortTitle: "√d_k",
      title: "Por que dividir a pontuação por √d_k",
      tag: "mechanism",
      body: [
        `Se q e k têm componentes independentes, com média 0 e variância 1, o produto escalar q · k tem variância d_k: o desvio padrão cresce com √d_k. A cena mede isso com ${integer(SAMPLES)} pares de vetores aleatórios: o desvio sai ${dims.map((d, index) => `${fixed(dotStd[index], 1)} com d_k = ${d}`).join(", ")}. Depois da divisão por √d_k, fica perto de 1 em todos: ${scaledStd.map((std) => fixed(std)).join(", ")}.`,
        `Pontuações grandes saturam o softmax. Com uma query e 10 keys aleatórias em d_k = ${SAT_D}, o maior peso sem a divisão é ${fixed(satMaxRaw)}: quase todo o peso num só token, e o gradiente dos outros some. Dividindo por √${SAT_D} = ${Math.sqrt(SAT_D)}, o maior peso cai para ${fixed(satMaxScaled)}, e o softmax volta a distribuir peso.`,
      ],
      keyIdea: "A divisão por √d_k mantém as pontuações na mesma escala, qualquer que seja d_k. Sem ela, o softmax vira quase um argmax e o treino perde gradiente.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "raw", label: `desvio de q · k (d_k = ${dims[dims.length - 1]})`, value: fixed(dotStd[dotStd.length - 1], 1) },
              { id: "scaled", label: "depois de ÷ √d_k", value: fixed(scaledStd[scaledStd.length - 1]) },
              { id: "sat-raw", label: "maior peso sem ÷", value: fixed(satMaxRaw) },
              { id: "sat-scaled", label: "maior peso com ÷", value: fixed(satMaxScaled) },
            ],
            highlight: "scaled",
          },
          {
            id: "std",
            piece: "chart",
            kind: "bar",
            series: dims.map((d, index) => ({ label: `d=${d}`, value: dotStd[index] })),
            highlight: dims.length - 1,
            color: "danger",
          },
        ],
      },
      alt: `Desvio padrão do produto escalar sem escala, por d_k: ${dims.map((d, index) => `d_k ${d} → ${fixed(dotStd[index], 1)}`).join("; ")}. Com a divisão por √d_k, todos ficam perto de 1.`,
    },
    {
      id: "matrix-form",
      shortTitle: "Em lote",
      title: "Todos os tokens de uma vez: Q = X · W_Q",
      tag: "example",
      body: [
        "Na prática, ninguém projeta token por token. Empilhando os n vetores de entrada na matriz X (n × d_model), uma multiplicação gera todas as queries: Q = X · W_Q, com forma n × d_k. O mesmo vale para K e V. Depois, Q · Kᵀ gera as n × n pontuações de uma vez. São multiplicações de matriz grandes, que as GPUs fazem bem.",
        `No Transformer base, d_model = ${D_MODEL} e cada uma das ${HEADS} cabeças usa d_k = d_v = ${HEAD_DIM}. As três projeções de uma cabeça têm 3 × ${D_MODEL} × ${HEAD_DIM} = ${integer(perHeadParams)} parâmetros. Somando as ${HEADS} cabeças e a projeção de saída W_O, a camada de attention tem 4 × ${D_MODEL}² = ${integer(layerParams)} parâmetros. A cena mostra Q e K da frase de brinquedo.`,
      ],
      keyIdea: "Q, K e V da sequência inteira saem de três multiplicações de matriz. É isso que torna a attention paralela.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "x", label: "X", value: `n × ${D_MODEL}` },
              { id: "wq", label: "W_Q por cabeça", value: `${D_MODEL} × ${HEAD_DIM}` },
              { id: "scores", label: "Q · Kᵀ", value: "n × n" },
              { id: "params", label: "parâmetros da camada", value: integer(layerParams) },
            ],
            highlight: "scores",
          },
          {
            id: "qk",
            piece: "matrix",
            rows: tokens,
            cols: [...keyFeatures.map((feature) => `q:${feature}`), ...keyFeatures.map((feature) => `k:${feature}`)],
            values: Q.map((query, index) => [...query, ...K[index]]),
            highlight: { row: DORMIU, col: 0 },
            showValues: true,
            color: "brand",
          },
        ],
      },
      alt: `Formas das matrizes no Transformer base: X é n × ${D_MODEL}, W_Q de cada cabeça é ${D_MODEL} × ${HEAD_DIM} e Q · Kᵀ é n × n; a camada tem ${integer(layerParams)} parâmetros. Abaixo, as queries e as keys dos 5 tokens da frase.`,
    },
    {
      id: "cross-attention",
      shortTitle: "Cross",
      title: "Cross-attention: a query vem de uma sequência e a key de outra",
      tag: "mechanism",
      body: [
        "Q, K e V não precisam vir da mesma sequência. Num tradutor encoder-decoder, o decoder escreve a tradução e, em cada camada, faz uma [[cross-attention|cross-attention]]: as queries vêm do texto que está sendo gerado, e as keys e os values vêm da saída do encoder, que leu a frase original.",
        `Na cena, o decoder escreve “o gato dormiu” consultando “the cat slept”. A query de “gato” dá ${fixed(cross[1].weights[1])} do peso a “cat”, e a de “dormiu” dá ${fixed(cross[2].weights[2])} a “slept”. É a mesma conta, softmax(Q · Kᵀ / √d_k) · V, com as linhas de um texto e as colunas de outro. A aula 03.12 volta a ela.`,
      ],
      keyIdea: "Na self-attention, Q, K e V vêm da mesma sequência. Na cross-attention, Q vem de uma e K e V vêm de outra.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "cross",
            piece: "matrix",
            rows: target,
            cols: source,
            values: weightsOf(cross),
            scale: { min: 0, max: 1 },
            highlight: { row: 1, col: 1 },
            showValues: true,
            color: "info",
          },
        ],
      },
      alt: `Pesos de cross-attention, com o decoder nas linhas (o, gato, dormiu) e o encoder nas colunas (the, cat, slept). gato → cat vale ${fixed(cross[1].weights[1])}; dormiu → slept vale ${fixed(cross[2].weights[2])}.`,
    },
    {
      id: "kv-cache",
      shortTitle: "KV cache",
      title: "Na geração, keys e values ficam guardados",
      tag: "tradeoff",
      body: [
        "Ao gerar texto, o modelo produz um token por vez. O token novo precisa da própria query e das keys e values de todos os anteriores. As queries antigas nunca mais são usadas, porque cada token passado já calculou a sua saída. Já as keys e os values deles são consultados de novo a cada token gerado.",
        `Por isso se guardam K e V, e não Q: é o [[KV cache|kv-cache]]. Na simulação do Laboratório, gerar ${GENERATED} tokens depois de um prompt de ${PROMPT} custa ${integer(uncached.total)} operações refazendo tudo e ${integer(cached.total)} com o cache, ${fixed(uncached.total / cached.total, 1)} vezes menos. O preço é memória: uma key e um value por token, por camada e por cabeça.`,
      ],
      keyIdea: "A query só serve ao token que a fez. Keys e values servem a todos os tokens seguintes, por isso são eles que vão para o cache.",
      scene: {
        kind: "pieces",
        layout: "row",
        pieces: [
          { id: "uncached", piece: "chart", kind: "bar", series: uncached.perToken.map((ops, index) => ({ label: `t${index + 1}`, value: ops })), max: Math.max(...uncached.perToken), color: "danger" },
          { id: "cached", piece: "chart", kind: "bar", series: cached.perToken.map((ops, index) => ({ label: `t${index + 1}`, value: ops })), max: Math.max(...uncached.perToken), color: "success" },
        ],
      },
      alt: `Operações por token gerado, na mesma escala. À esquerda, sem cache: de ${uncached.perToken[0]} a ${uncached.perToken[GENERATED - 1]}. À direita, com KV cache: de ${cached.perToken[0]} a ${cached.perToken[GENERATED - 1]}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Query, key e value em uma linha",
      tag: "summary",
      body: [
        "Q = X · W_Q, K = X · W_K e V = X · W_V. A pontuação Q · Kᵀ / √d_k decide quem olha para quem; o softmax transforma as pontuações em pesos; e os pesos misturam os values. Query e key têm matrizes separadas para a relação poder ser assimétrica, e o value é separado da key para o conteúdo não depender do critério de busca.",
        "A divisão por √d_k mantém o softmax fora da saturação. Na cross-attention, as queries vêm de outra sequência. Na geração, keys e values vão para o KV cache. A próxima aula roda várias dessas buscas em paralelo, uma por cabeça.",
      ],
      keyIdea: "Três projeções, três papéis: a query procura, a key é encontrada e o value é entregue.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          { id: "sentence", piece: "token-stream", tokens, query: DORMIU, keys: [argmax(dormiu.weights)], arcs: arcsFrom(DORMIU, dormiu.weights), bars: dormiu.weights },
          { id: "weights", piece: "matrix", rows: tokens, cols: tokens, values: weightsOf(rows), scale: { min: 0, max: 1 }, highlight: { row: DORMIU, col: GATO }, color: "module-03" },
        ],
      },
      alt: `Pesos da query dormiu sobre a frase, com o maior em ${tokens[argmax(dormiu.weights)]} (${fixed(Math.max(...dormiu.weights))}), e a matriz completa de pesos 5 × 5 com W_Q e W_K separadas.`,
    },
  ],
  realWorldExample: `Em produção, a separação entre query, key e value aparece na conta de memória. No Llama 2 7B, cada token guarda uma key e um value de ${integer(LLAMA_D)} números em cada uma das ${LLAMA_LAYERS} camadas. Em 16 bits, são ${integer(kvBytesPerToken)} bytes por token, ou ${fixed(kvBytesPerToken / 2 ** 20, 1)} MiB. Um contexto de 4.096 tokens ocupa ${fixed(kvGiB4k, 0)} GiB de KV cache, além dos pesos do modelo. As queries não entram nessa conta, porque só o token novo precisa da sua. É por isso que servidores como o vLLM organizam a memória da GPU em blocos de keys e values, e que modelos mais novos reduzem quantas keys e values guardam por camada (a aula 03.10 mostra como).`,
  code: {
    language: "python",
    caption:
      "Projeções Q, K e V em NumPy. Com matrizes separadas, as pontuações não são simétricas; com a mesma matriz, são. O laço final mede o desvio do produto escalar com e sem a divisão por √d_k.",
    source: `import numpy as np

rng = np.random.default_rng(0)
n, d_model, d_k = 6, 512, 64
X = rng.normal(size=(n, d_model))
W_q, W_k, W_v = (rng.normal(size=(d_model, d_k)) / np.sqrt(d_model) for _ in range(3))

Q, K, V = X @ W_q, X @ W_k, X @ W_v       # (n, d_k) cada
scores = Q @ K.T / np.sqrt(d_k)           # (n, n)
print(np.allclose(scores, scores.T))      # False: i → j é diferente de j → i

A = X @ W_q                               # a mesma matriz para query e key
print(np.allclose(A @ A.T, (A @ A.T).T))  # True: a pontuação fica simétrica

for d in (4, 64, 1024):
    q, k = rng.normal(size=(2, 10_000, d))
    dots = (q * k).sum(axis=1)
    print(d, dots.std().round(1), (dots / np.sqrt(d)).std().round(2))
# o desvio cresce como √d (perto de 2, 8 e 32); dividido por √d, fica perto de 1`,
  },
  tradeOffs: {
    pros: [
      "Projeções separadas permitem relações assimétricas: i procura j sem que j procure i",
      "Separar key e value desacopla o critério de busca do conteúdo transportado",
      "A busca suave é diferenciável, então as três matrizes são aprendidas por gradiente",
    ],
    cons: [
      "Três matrizes de d_model × d_k por cabeça e por camada: são parâmetros e multiplicações a mais",
      "Na geração, keys e values de todos os tokens anteriores precisam ficar em memória",
      "Os papéis de query, key e value são uma interpretação: num modelo treinado, as matrizes não têm traços com nome",
    ],
    alternatives: [
      "Multi-query attention e grouped-query attention, que compartilham keys e values entre cabeças para reduzir o KV cache",
      "Busca exata (hard attention), que escolhe um único token mas não é diferenciável",
    ],
  },
  knowledgeCheck: [
    {
      id: "shared-projection",
      prompt: "O que acontece com as pontuações se query e key usarem a mesma matriz de projeção?",
      options: [
        "Nada: as pontuações ficam iguais às de matrizes separadas",
        "A matriz de pontuações fica simétrica, e cada token tende a dar mais peso a si mesmo",
        "Os values deixam de ser usados",
        "As pontuações viram todas zero",
      ],
      correct: 1,
      explanation:
        "Com a mesma matriz, a pontuação de i para j é (x_i · W) · (x_j · W), igual à de j para i. E o maior produto escalar costuma ser o do vetor com ele mesmo, então a diagonal domina.",
      lesson: "03-09",
    },
    {
      id: "why-sqrt-dk",
      prompt: "Por que a pontuação é dividida por √d_k?",
      options: [
        "Para que os pesos somem 1",
        "Porque o desvio padrão de q · k cresce com √d_k, e pontuações grandes saturam o softmax",
        "Para reduzir o número de parâmetros",
        "Para esconder os tokens futuros",
      ],
      correct: 1,
      explanation:
        "Com componentes de variância 1, q · k tem variância d_k. Sem a divisão, as pontuações crescem com a dimensão, o softmax põe quase todo o peso num token e o gradiente dos outros some. Quem faz os pesos somarem 1 é o softmax.",
      lesson: "03-09",
    },
    {
      id: "kv-not-q",
      prompt: "Na geração token a token, por que o cache guarda keys e values, mas não queries?",
      options: [
        "Porque queries ocupam mais memória",
        "Porque a query de um token antigo não é usada de novo, enquanto as keys e os values dele são consultados por todos os tokens seguintes",
        "Porque as queries são sempre iguais",
        "Porque a máscara causal apaga as queries",
      ],
      correct: 1,
      explanation:
        "Cada token novo compara a sua própria query com as keys de todos os anteriores e mistura os values deles. As queries antigas já produziram a sua saída e não voltam a ser usadas.",
      lesson: "03-09",
    },
  ],
  related: ["03-07", "03-08", "03-10", "03-12", "10-05"],
  references: [
    {
      title: "Vaswani et al. (2017), Attention Is All You Need",
      url: "https://arxiv.org/abs/1706.03762",
      kind: "paper",
    },
    {
      title: "Bahdanau, Cho e Bengio (2014), Neural Machine Translation by Jointly Learning to Align and Translate",
      url: "https://arxiv.org/abs/1409.0473",
      kind: "paper",
    },
    {
      title: "Pope et al. (2022), Efficiently Scaling Transformer Inference",
      url: "https://arxiv.org/abs/2211.05102",
      kind: "paper",
    },
    {
      title: "PyTorch: torch.nn.MultiheadAttention",
      url: "https://pytorch.org/docs/stable/generated/torch.nn.MultiheadAttention.html",
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
