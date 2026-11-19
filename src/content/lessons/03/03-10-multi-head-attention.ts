import { attentionRow } from "../../../lab/attention";
import type { LessonContent } from "../../../types/content";

// Multi-head attention em escala de brinquedo: d_model = 4, com os traços [pessoa, objeto, lugar, ação],
// e 2 cabeças de d_k = 2. Cada cabeça tem as suas W_Q, W_K e W_V. Pesos, saídas e tamanhos de cache
// da cena são calculados aqui.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");

type Matrix = number[][];

/** Vetor linha × matriz: x · W. */
const project = (x: number[], weights: Matrix) =>
  weights[0].map((_, col) => x.reduce((total, value, row) => total + value * weights[row][col], 0));

const tokens = ["a", "menina", "leu", "o", "livro", "na", "biblioteca"];
const features = ["pessoa", "objeto", "lugar", "ação"];
const MENINA = 1;
const LEU = 2;
const LIVRO = 4;
const BIBLIOTECA = 6;

// Vetores de entrada (embedding + posição já somados).
const X: Matrix = [
  [0.1, 0.1, 0, 0],
  [1, 0, 0, 0],
  [0, 0, 0, 1],
  [0.1, 0.1, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 0.2, 0],
  [0, 0.2, 1, 0],
];

// Uma cabeça só, com d_k = 4 e keys = values = X: o verbo procura ao mesmo tempo quem fez e o que foi feito.
const W_Q_single: Matrix = [
  [0, 0, 0, 4],
  [0, 0, 4, 0],
  [0, 0, 0, 0],
  [4, 4, 0, 0],
];
const single = X.map((x) => attentionRow(project(x, W_Q_single), X, X));

// Cabeça 1 (quem faz o quê): keys e values leem [pessoa, ação]. Uma ação procura uma pessoa, e uma pessoa procura uma ação.
const head1Features = ["pessoa", "ação"];
const W_K1: Matrix = [
  [1, 0],
  [0, 0],
  [0, 0],
  [0, 1],
];
const W_Q1: Matrix = [
  [0, 4],
  [0, 0],
  [0, 0],
  [4, 0],
];
// Cabeça 2 (o quê e onde): keys e values leem [objeto, lugar]. Uma ação procura um objeto, e um objeto procura um lugar.
const head2Features = ["objeto", "lugar"];
const W_K2: Matrix = [
  [0, 0],
  [1, 0],
  [0, 1],
  [0, 0],
];
const W_Q2: Matrix = [
  [0, 0],
  [0, 4],
  [0, 0],
  [4, 0],
];

function runHead(W_Q: Matrix, W_K: Matrix) {
  const keys = X.map((x) => project(x, W_K));
  // W_V = W_K: cada cabeça entrega os mesmos traços pelos quais é encontrada.
  return X.map((x) => attentionRow(project(x, W_Q), keys, keys));
}
const head1 = runHead(W_Q1, W_K1);
const head2 = runHead(W_Q2, W_K2);
const concat = head1.map((row, index) => [...row.output, ...head2[index].output]);
const concatCols = [...head1Features.map((feature) => `c1:${feature}`), ...head2Features.map((feature) => `c2:${feature}`)];

// Uma cabeça que só olha a posição: keys one-hot de posição, e a query de i aponta para i − 1.
const POSITION_GAIN = 8;
const positionKeys: Matrix = tokens.map((_, row) => tokens.map((__, col) => (row === col ? 1 : 0)));
const previousHead = tokens.map((_, index) =>
  attentionRow(positionKeys[Math.max(0, index - 1)].map((value) => value * POSITION_GAIN), positionKeys, positionKeys),
);

// Transformer base: d_model = 512 dividido entre as cabeças.
const D_MODEL = 512;
const headCounts = [1, 2, 4, 8, 16];
const BASE_HEADS = 8;
const attentionParams = 4 * D_MODEL * D_MODEL;

// Llama 2 70B: 80 camadas, 64 cabeças de query com dimensão 128, keys e values em 16 bits.
const LAYERS = 80;
const QUERY_HEADS = 64;
const HEAD_DIM = 128;
const kvVariants = [
  { id: "mha", label: "MHA", kvHeads: QUERY_HEADS },
  { id: "gqa", label: "GQA-8", kvHeads: 8 },
  { id: "mqa", label: "MQA", kvHeads: 1 },
];
const kvKiBPerToken = (kvHeads: number) => (2 * LAYERS * kvHeads * HEAD_DIM * 2) / 1024;
const CONTEXT = 4096;
const kvGiB = (kvHeads: number) => (kvKiBPerToken(kvHeads) * 1024 * CONTEXT) / 2 ** 30;
const [mha, gqa, mqa] = kvVariants;

const arcsFrom = (query: number, weights: number[]) =>
  weights.map((weight, index) => ({
    from: query,
    to: index,
    weight,
    label: index !== query && weight >= 0.1 ? fixed(weight) : undefined,
  }));
const argmax = (values: number[]) => values.indexOf(Math.max(...values));

const lesson: LessonContent = {
  id: "03-10",
  subtitle:
    "Por que o Transformer roda várias self-attentions em paralelo, como divide a dimensão entre elas e como junta os resultados.",
  objectives: [
    "Explicar por que um único softmax não consegue focar em duas relações ao mesmo tempo",
    "Mostrar que cada cabeça tem as suas próprias projeções e o seu próprio mapa de pesos",
    "Calcular d_k = d_model / h e mostrar que o custo total não muda com o número de cabeças",
    "Descrever a concatenação das cabeças e a projeção de saída W_O",
    "Comparar MHA, MQA e GQA pelo tamanho do KV cache",
  ],
  steps: [
    {
      id: "context",
      shortTitle: "Contexto",
      title: "Um softmax só precisa dividir o peso",
      tag: "context",
      body: [
        "Em “a menina leu o livro na biblioteca”, o verbo “leu” precisa de duas informações: quem leu e o que foi lido. Com uma única self-attention, há uma única distribuição de pesos para “leu”, e os pesos somam 1. Se dois tokens importam, eles disputam o mesmo total.",
        `Na cena, uma cabeça só tenta as duas buscas com a mesma query. “menina” fica com ${fixed(single[LEU].weights[MENINA])} e “livro” com ${fixed(single[LEU].weights[LIVRO])}: nenhum dos dois passa de metade. A saída mistura sujeito e objeto num único vetor, cada um com o sinal enfraquecido.`,
      ],
      keyIdea: "Uma distribuição de pesos é um orçamento que soma 1. Para olhar bem para duas coisas, o modelo precisa de duas distribuições.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "head-1",
            piece: "token-stream",
            tokens,
            query: LEU,
            keys: [MENINA, LIVRO],
            arcs: arcsFrom(LEU, single[LEU].weights),
            bars: single[LEU].weights,
            color: "danger",
          },
        ],
      },
      alt: `Uma cabeça só, com a query leu: ${tokens.map((token, index) => `${token} ${fixed(single[LEU].weights[index])}`).join(", ")}. O peso se divide entre menina e livro.`,
    },
    {
      id: "heads",
      shortTitle: "Cabeças",
      title: "Várias cabeças, cada uma com o seu critério",
      tag: "mechanism",
      body: [
        "A [[Multi-Head Attention|multi-head-attention]] roda h self-attentions em paralelo sobre a mesma entrada. Cada uma é uma cabeça, com as suas próprias matrizes W_Q, W_K e W_V e o seu próprio softmax. Como cada cabeça tem um orçamento de pesos só seu, cada uma pode se concentrar numa relação.",
        `Na cena, a cabeça 1 procura quem faz a ação, e “leu” dá ${fixed(head1[LEU].weights[MENINA])} do peso a “menina”. A cabeça 2 procura o objeto, e “leu” dá ${fixed(head2[LEU].weights[LIVRO])} a “livro”. As duas informações chegam inteiras, cada uma pela sua cabeça.`,
      ],
      keyIdea: "Cada cabeça é uma busca independente sobre a mesma frase. Juntas, cobrem relações que uma busca só teria de dividir.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          { id: "head-1", piece: "token-stream", tokens, query: LEU, keys: [argmax(head1[LEU].weights)], arcs: arcsFrom(LEU, head1[LEU].weights), color: "module-03" },
          { id: "head-2", piece: "token-stream", tokens, query: LEU, keys: [argmax(head2[LEU].weights)], arcs: arcsFrom(LEU, head2[LEU].weights), color: "info" },
        ],
      },
      alt: `Duas cabeças para a query leu. Cabeça 1: maior peso em ${tokens[argmax(head1[LEU].weights)]} (${fixed(Math.max(...head1[LEU].weights))}). Cabeça 2: maior peso em ${tokens[argmax(head2[LEU].weights)]} (${fixed(Math.max(...head2[LEU].weights))}).`,
    },
    {
      id: "projections",
      shortTitle: "Projeções",
      title: "Cada cabeça projeta o vetor do seu jeito",
      tag: "mechanism",
      body: [
        `As cabeças recebem o mesmo vetor de entrada, mas o leem com matrizes diferentes. Na cena, o vetor tem ${features.length} traços, [${features.join(", ")}], e cada cabeça projeta para d_k = 2. A cabeça 1 tem keys em [${head1Features.join(", ")}]; a cabeça 2, em [${head2Features.join(", ")}].`,
        "As duas W_Q mostram o critério de cada cabeça. Na cabeça 1, a linha “ação” aponta para “pessoa”: o verbo procura o sujeito. Na cabeça 2, a mesma linha aponta para “objeto”. Ninguém programa essa divisão de trabalho num modelo real: as cabeças começam com pesos aleatórios diferentes e o treino as leva para critérios diferentes.",
      ],
      keyIdea: "O que diferencia as cabeças são as matrizes. A entrada e a conta são as mesmas.",
      scene: {
        kind: "pieces",
        layout: "row",
        pieces: [
          { id: "wq1", piece: "matrix", rows: features, cols: head1Features, values: W_Q1, highlight: { row: 3, col: 0 }, showValues: true, color: "module-03" },
          { id: "wq2", piece: "matrix", rows: features, cols: head2Features, values: W_Q2, highlight: { row: 3, col: 0 }, showValues: true, color: "info" },
        ],
      },
      alt: "W_Q da cabeça 1, à esquerda, e da cabeça 2, à direita, com 4 linhas e 2 colunas cada. Na cabeça 1, ação aponta para pessoa; na cabeça 2, ação aponta para objeto.",
    },
    {
      id: "maps",
      shortTitle: "Mapas",
      title: "Um mapa de pesos por cabeça",
      tag: "mechanism",
      body: [
        `Cada cabeça produz a sua matriz n × n de pesos. Na cabeça 1, além de “leu” → “menina”, a relação também vai no outro sentido: “menina”, uma pessoa, procura uma ação e dá ${fixed(head1[MENINA].weights[LEU])} a “leu”. Na cabeça 2, “livro”, um objeto, procura um lugar e dá ${fixed(head2[LIVRO].weights[BIBLIOTECA])} a “biblioteca”.`,
        "Tokens sem nada para buscar numa cabeça, como “a” e “o”, ficam com pesos quase uniformes nela. É comum que modelos treinados tenham cabeças que, para muitos tokens, despejam o peso num token neutro, como o primeiro da sequência ou um separador, quando a relação que elas procuram não está presente.",
      ],
      keyIdea: "Com h cabeças, a camada produz h mapas de quem olha para quem. Cada mapa responde a uma pergunta diferente.",
      scene: {
        kind: "pieces",
        layout: "row",
        pieces: [
          { id: "map-1", piece: "matrix", rows: tokens, cols: tokens, values: head1.map((row) => row.weights), scale: { min: 0, max: 1 }, highlight: { row: LEU, col: MENINA }, color: "module-03" },
          { id: "map-2", piece: "matrix", rows: tokens, cols: tokens, values: head2.map((row) => row.weights), scale: { min: 0, max: 1 }, highlight: { row: LEU, col: LIVRO }, color: "info" },
        ],
      },
      alt: `Duas matrizes de pesos 7 × 7. Cabeça 1: leu → menina ${fixed(head1[LEU].weights[MENINA])} e menina → leu ${fixed(head1[MENINA].weights[LEU])}. Cabeça 2: leu → livro ${fixed(head2[LEU].weights[LIVRO])} e livro → biblioteca ${fixed(head2[LIVRO].weights[BIBLIOTECA])}.`,
    },
    {
      id: "split",
      shortTitle: "d_model / h",
      title: "Dividir a dimensão entre as cabeças",
      tag: "mechanism",
      body: [
        `As cabeças não multiplicam o tamanho do modelo. A dimensão d_model é repartida: cada cabeça trabalha com d_k = d_model / h. No Transformer base, d_model = ${D_MODEL} e h = ${BASE_HEADS}, então d_k = ${D_MODEL / BASE_HEADS}. As ${BASE_HEADS} cabeças juntas têm as mesmas matrizes de ${D_MODEL} × ${D_MODEL} de uma cabeça larga, só que fatiadas em colunas.`,
        `Por isso a camada tem 4 × ${D_MODEL}² = ${integer(attentionParams)} parâmetros com 1, 8 ou 16 cabeças, e o número de multiplicações quase não muda. O que muda é o que a camada consegue representar: muitas distribuições estreitas em vez de uma larga. O paper original testou essa escolha: com uma cabeça só, a tradução ficou 0,9 ponto de BLEU abaixo da melhor configuração, e com cabeças demais a qualidade também caiu.`,
      ],
      keyIdea: "Mais cabeças não custa mais parâmetros: a mesma dimensão é dividida em fatias, cada uma com o seu softmax.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "d-model", label: "d_model", value: String(D_MODEL) },
              { id: "heads", label: "cabeças", value: String(BASE_HEADS) },
              { id: "dk", label: "d_k por cabeça", value: String(D_MODEL / BASE_HEADS) },
              { id: "params", label: "parâmetros da camada", value: integer(attentionParams) },
            ],
            highlight: "dk",
          },
          {
            id: "dk-chart",
            piece: "chart",
            kind: "bar",
            series: headCounts.map((h) => ({ label: `h=${h}`, value: D_MODEL / h })),
            highlight: headCounts.indexOf(BASE_HEADS),
          },
        ],
      },
      alt: `d_k por cabeça com d_model = ${D_MODEL}: ${headCounts.map((h) => `${h} cabeça${h > 1 ? "s" : ""} → ${D_MODEL / h}`).join("; ")}. Em qualquer caso, a camada tem ${integer(attentionParams)} parâmetros.`,
    },
    {
      id: "concat",
      shortTitle: "Concat + W_O",
      title: "Concatenar as cabeças e projetar com W_O",
      tag: "mechanism",
      body: [
        "Cada cabeça devolve, para cada token, um vetor de d_v números. As saídas das h cabeças são postas lado a lado, e o resultado tem h · d_v = d_model números. Na cena, as colunas c1 vêm da cabeça 1 e as c2 da cabeça 2.",
        `Depois, uma última matriz aprendida, W_O, de d_model × d_model, mistura as fatias. Sem ela, cada fatia ficaria presa à sua cabeça; com ela, a camada seguinte recebe um vetor em que a informação de todas as cabeças pode se combinar. A linha de “leu” carrega ${fixed(concat[LEU][0])} de “pessoa”, vinda da cabeça 1, e ${fixed(concat[LEU][2])} de “objeto”, vinda da cabeça 2.`,
      ],
      keyIdea: "MultiHead(Q, K, V) = Concat(cabeça₁, …, cabeça_h) · W_O. A concatenação junta as fatias, e W_O as mistura.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          { id: "concat", piece: "matrix", rows: tokens, cols: concatCols, values: concat, scale: { min: 0, max: 1 }, highlight: { row: LEU, col: 0 }, showValues: true, color: "brand" },
        ],
      },
      alt: `Saídas das duas cabeças concatenadas, 7 linhas por 4 colunas. A linha de leu tem ${fixed(concat[LEU][0])} em c1:pessoa e ${fixed(concat[LEU][2])} em c2:objeto.`,
    },
    {
      id: "learned-heads",
      shortTitle: "Na prática",
      title: "O que as cabeças aprendem nos modelos treinados",
      tag: "example",
      body: [
        `Estudos com o BERT acharam cabeças com papéis claros: umas olham para o token anterior ou o seguinte, outras ligam um verbo ao seu objeto direto, outras ligam um pronome ao nome a que ele se refere. A cena mostra o padrão de uma cabeça de token anterior: as keys carregam só a posição, a query de cada token aponta para a posição anterior, e o peso cai na subdiagonal (${fixed(previousHead[LEU].weights[MENINA])} em “leu” → “menina”).`,
        "Nem todas as cabeças são indispensáveis. Em modelos de tradução e no BERT, muitas cabeças podem ser removidas depois do treino com perda pequena de qualidade, e algumas camadas funcionam com uma cabeça só. Poucas cabeças especializadas fazem a maior parte do trabalho.",
      ],
      keyIdea: "Cabeças treinadas se especializam em relações de posição, de sintaxe e de referência. Algumas são essenciais, muitas são redundantes.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          { id: "previous", piece: "matrix", rows: tokens, cols: tokens, values: previousHead.map((row) => row.weights), scale: { min: 0, max: 1 }, highlight: { row: LEU, col: MENINA }, color: "module-03" },
        ],
      },
      alt: `Mapa de pesos 7 × 7 de uma cabeça de token anterior: o peso de cada linha se concentra na coluna anterior. leu → menina vale ${fixed(previousHead[LEU].weights[MENINA])}.`,
    },
    {
      id: "gqa",
      shortTitle: "MQA e GQA",
      title: "Menos keys e values para guardar",
      tag: "tradeoff",
      body: [
        `Na geração, cada cabeça guarda as keys e os values de todos os tokens no KV cache. Com muitas cabeças e muitas camadas, isso pesa. No Llama 2 70B, com ${LAYERS} camadas e ${QUERY_HEADS} cabeças de dimensão ${HEAD_DIM}, guardar uma key e um value por cabeça custaria ${fixed(kvKiBPerToken(mha.kvHeads) / 1024, 1)} MiB por token em 16 bits: ${fixed(kvGiB(mha.kvHeads), 0)} GiB para um contexto de ${integer(CONTEXT)} tokens.`,
        `A multi-query attention (MQA) mantém as ${QUERY_HEADS} queries, mas usa uma única key e um único value para todas: ${integer(kvKiBPerToken(mqa.kvHeads))} KiB por token. A [[grouped-query attention|grouped-query-attention]] (GQA) fica no meio: o Llama 2 70B usa ${gqa.kvHeads} grupos, ${integer(kvKiBPerToken(gqa.kvHeads))} KiB por token, ${QUERY_HEADS / gqa.kvHeads} vezes menos que a MHA, com qualidade próxima dela. A MQA economiza mais, mas tende a perder mais qualidade.`,
      ],
      keyIdea: "As queries ficam todas; keys e values podem ser compartilhados entre cabeças. Menos cabeças de key e value é menos memória por token.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "metrics",
            piece: "metrics-panel",
            metrics: kvVariants.map((variant) => ({ id: variant.id, label: `${variant.label}, ${integer(CONTEXT)} tokens`, value: `${fixed(kvGiB(variant.kvHeads), 2)} GiB` })),
            highlight: "gqa",
          },
          {
            id: "kv-chart",
            piece: "chart",
            kind: "bar",
            series: kvVariants.map((variant) => ({ label: variant.label, value: kvKiBPerToken(variant.kvHeads) })),
            highlight: 1,
            color: "success",
          },
        ],
      },
      alt: `KV cache por token no Llama 2 70B em 16 bits: ${kvVariants.map((variant) => `${variant.label} ${integer(kvKiBPerToken(variant.kvHeads))} KiB`).join(", ")}. Para ${integer(CONTEXT)} tokens: ${kvVariants.map((variant) => `${variant.label} ${fixed(kvGiB(variant.kvHeads), 2)} GiB`).join(", ")}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Multi-head attention em uma linha",
      tag: "summary",
      body: [
        "cabeça_i = Attention(X · W_Q^i, X · W_K^i, X · W_V^i) e MultiHead = Concat(cabeça_1, …, cabeça_h) · W_O. Cada cabeça tem projeções próprias, um softmax próprio e d_k = d_model / h; as saídas são concatenadas e misturadas por W_O.",
        "Várias cabeças contornam o limite de uma distribuição única sem aumentar os parâmetros. Cabeças treinadas se especializam, e muitas podem ser podadas. Na inferência, MQA e GQA compartilham keys e values para encolher o KV cache. A próxima aula trata do que vem depois da attention em cada bloco: a rede feed-forward.",
      ],
      keyIdea: "Multi-head attention são h buscas estreitas em paralelo, juntadas por W_O.",
      scene: {
        kind: "pieces",
        layout: "row",
        pieces: [
          { id: "map-1", piece: "matrix", rows: tokens, cols: tokens, values: head1.map((row) => row.weights), scale: { min: 0, max: 1 }, highlight: { row: LEU, col: MENINA }, color: "module-03" },
          { id: "map-2", piece: "matrix", rows: tokens, cols: tokens, values: head2.map((row) => row.weights), scale: { min: 0, max: 1 }, highlight: { row: LEU, col: LIVRO }, color: "info" },
        ],
      },
      alt: `Os mapas de pesos das duas cabeças lado a lado: na cabeça 1, leu → menina (${fixed(head1[LEU].weights[MENINA])}); na cabeça 2, leu → livro (${fixed(head2[LEU].weights[LIVRO])}).`,
    },
  ],
  realWorldExample: `Abra o config.json de um modelo no Hugging Face Hub e as cabeças aparecem em dois campos: num_attention_heads e num_key_value_heads. No Llama 2 70B, são ${QUERY_HEADS} e ${gqa.kvHeads}: ${QUERY_HEADS} cabeças de query divididas em ${gqa.kvHeads} grupos que compartilham keys e values. Quem dimensiona um servidor de inferência usa esses dois números, junto com o de camadas e a dimensão de cada cabeça, para saber quantos tokens de contexto cabem na GPU: com GQA, o KV cache por token cai de ${fixed(kvKiBPerToken(mha.kvHeads) / 1024, 1)} MiB para ${integer(kvKiBPerToken(gqa.kvHeads))} KiB, e cabem ${QUERY_HEADS / gqa.kvHeads} vezes mais tokens, ou mais requisições simultâneas, na mesma memória.`,
  code: {
    language: "python",
    caption:
      "Multi-head attention em NumPy: as projeções de d_model × d_model são fatiadas em h cabeças por reshape, cada cabeça faz o seu softmax, e as saídas são concatenadas e projetadas por W_O.",
    source: `import numpy as np

def softmax(x, axis=-1):
    e = np.exp(x - x.max(axis=axis, keepdims=True))
    return e / e.sum(axis=axis, keepdims=True)

def multi_head_attention(X, W_q, W_k, W_v, W_o, h):
    n, d_model = X.shape
    d_k = d_model // h

    def split(M):                    # (n, d_model) -> (h, n, d_k): uma fatia de colunas por cabeça
        return M.reshape(n, h, d_k).transpose(1, 0, 2)

    Q, K, V = split(X @ W_q), split(X @ W_k), split(X @ W_v)
    weights = softmax(Q @ K.transpose(0, 2, 1) / np.sqrt(d_k))  # (h, n, n): um mapa por cabeça
    heads = weights @ V                                          # (h, n, d_k)
    concat = heads.transpose(1, 0, 2).reshape(n, d_model)        # (n, h * d_k) = (n, d_model)
    return concat @ W_o, weights

rng = np.random.default_rng(0)
n, d_model, h = 10, 512, 8
X = rng.normal(size=(n, d_model))
W_q, W_k, W_v, W_o = (rng.normal(size=(d_model, d_model)) / np.sqrt(d_model) for _ in range(4))

out, weights = multi_head_attention(X, W_q, W_k, W_v, W_o, h)
print(out.shape, weights.shape)  # (10, 512) (8, 10, 10)`,
  },
  tradeOffs: {
    pros: [
      "Cada cabeça tem o seu próprio softmax e pode focar numa relação sem disputar peso com as outras",
      "O número de parâmetros e de multiplicações é o mesmo de uma cabeça larga",
      "As cabeças rodam em paralelo, como uma única multiplicação de matriz em lote",
    ],
    cons: [
      "Cada cabeça trabalha num espaço menor (d_k = d_model / h); com cabeças demais, cada uma fica estreita demais",
      "Na geração, cada cabeça de key e value aumenta o KV cache",
      "Muitas cabeças acabam redundantes, o que gasta capacidade do modelo",
    ],
    alternatives: [
      "Grouped-query attention (GQA), com grupos de queries compartilhando keys e values",
      "Multi-query attention (MQA), com uma única key e um único value para todas as cabeças",
    ],
  },
  knowledgeCheck: [
    {
      id: "why-heads",
      prompt: "Qual é a principal limitação de uma única cabeça de attention que as várias cabeças resolvem?",
      options: [
        "Uma cabeça só não consegue usar a GPU",
        "Os pesos de um token somam 1, então focar em duas relações diferentes obriga a dividir o peso entre elas",
        "Uma cabeça só não aceita a máscara causal",
        "Uma cabeça só precisa de mais parâmetros",
      ],
      correct: 1,
      explanation:
        "Com uma distribuição só, dois tokens importantes disputam o mesmo total. Com várias cabeças, cada uma tem o seu softmax e pode se concentrar numa relação.",
      lesson: "03-10",
    },
    {
      id: "head-dim",
      prompt: "No Transformer base, com d_model = 512 e 8 cabeças, qual é o d_k de cada cabeça?",
      options: ["512", "4.096", "64", "8"],
      correct: 2,
      explanation:
        "A dimensão é dividida entre as cabeças: d_k = d_model / h = 512 / 8 = 64. As 8 cabeças juntas têm o mesmo tamanho de uma cabeça de 512.",
      lesson: "03-10",
    },
    {
      id: "gqa-shares",
      prompt: "O que a grouped-query attention (GQA) compartilha entre as cabeças?",
      options: [
        "As queries",
        "As keys e os values, entre as cabeças de query do mesmo grupo",
        "A matriz de saída W_O",
        "O softmax",
      ],
      correct: 1,
      explanation:
        "Na GQA, cada grupo de cabeças de query usa a mesma key e o mesmo value. Isso reduz o KV cache e mantém todas as queries.",
      lesson: "03-10",
    },
  ],
  related: ["03-08", "03-09", "03-11", "03-13", "10-05"],
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
      title: "Michel, Levy e Neubig (2019), Are Sixteen Heads Really Better than One?",
      url: "https://arxiv.org/abs/1905.10650",
      kind: "paper",
    },
    {
      title: "Voita et al. (2019), Analyzing Multi-Head Self-Attention: Specialized Heads Do the Heavy Lifting, the Rest Can Be Pruned",
      url: "https://arxiv.org/abs/1905.09418",
      kind: "paper",
    },
    {
      title: "Shazeer (2019), Fast Transformer Decoding: One Write-Head is All You Need",
      url: "https://arxiv.org/abs/1911.02150",
      kind: "paper",
    },
    {
      title: "Ainslie et al. (2023), GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints",
      url: "https://arxiv.org/abs/2305.13245",
      kind: "paper",
    },
  ],
};

export default lesson;
