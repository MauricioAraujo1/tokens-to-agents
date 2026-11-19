import { dot, softmax } from "../../../lab/attention";
import type { LessonContent } from "../../../types/content";

// Exemplo de tradução "the black cat sleeps" → "o gato preto dorme". As keys são vetores de
// traços [cor, animal, artigo, ação]; a query de "preto" diz o quanto procura cada traço. Pontuações,
// pesos e saída são calculados aqui com produto escalar e softmax.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const vector = (values: number[]) => `[${values.map((value) => fixed(value)).join("; ")}]`;

const source = ["the", "black", "cat", "sleeps"];
const target = ["o", "gato", "preto", "dorme"];

const keys = [
  [0, 0, 1, 0], // the: artigo
  [1, 0, 0, 0], // black: cor
  [0, 1, 0, 0], // cat: animal
  [0, 0, 0, 1], // sleeps: ação
];
const queryPreto = [3.1, 1.4, 0.2, 0.1];
const scores = keys.map((key) => dot(queryPreto, key));
const weights = softmax(scores);

// Values com 3 traços de conteúdo: [cor, animal, ação].
const values = [
  [0.1, 0.1, 0],
  [0.9, 0, 0.1],
  [0.1, 0.9, 0.1],
  [0, 0.1, 0.9],
];
const output = values[0].map((_, dim) => values.reduce((total, row, index) => total + weights[index] * row[dim], 0));

// Passo da escala: as mesmas pontuações divididas e multiplicadas por 4.
const flat = softmax(scores.map((score) => score / 4));
const peaked = softmax(scores.map((score) => score * 4));

// Passo do alinhamento: uma query por palavra gerada, a mesma regra de pontuação.
const targetQueries = [
  [0.8, 0.2, 2.5, 0.1], // o: procura o artigo
  [1, 3, 0.3, 0.2], // gato: procura o animal
  queryPreto,
  [0.2, 0.9, 0.1, 3], // dorme: procura a ação
];
const alignment = targetQueries.map((query) => softmax(keys.map((key) => dot(query, key))));

const PRETO = 2;
const BLACK = 1;
const marker = "⇢ preto";
const withQuery = [...source, marker];
const QUERY_INDEX = withQuery.length - 1;

const lesson: LessonContent = {
  id: "03-07",
  subtitle:
    "Uma busca em que todas as respostas contam, cada uma com um peso. Pontuar, normalizar com softmax e somar: o mecanismo que deu nome ao Transformer.",
  objectives: [
    "Descrever attention como uma busca suave com query, keys e values",
    "Calcular pontuações por produto escalar e pesos com softmax",
    "Montar a saída como soma dos values ponderada pelos pesos",
    "Explicar por que a escala das pontuações muda o quanto os pesos se concentram",
  ],
  steps: [
    {
      id: "soft-lookup",
      shortTitle: "Busca suave",
      title: "Uma busca em que todas as respostas contam um pouco",
      tag: "context",
      body: [
        "Num dicionário comum, você pergunta por uma chave e recebe exatamente um valor. Ou a chave bate, ou não bate. [[Attention|attention]] é uma versão suave dessa busca: a pergunta, chamada query, é comparada com todas as chaves (keys), e a resposta é uma mistura de todos os valores (values), cada um com um peso proporcional ao quanto a sua key combina com a query.",
        "Os pesos são números entre 0 e 1 que somam 1. Uma busca exata seria o caso extremo, com peso 1 numa key e 0 nas outras. Attention permite tudo entre esse extremo e uma média uniforme.",
      ],
      keyIdea: "Attention = comparar uma query com todas as keys e devolver uma média dos values, ponderada pela semelhança.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "lookup",
            piece: "token-stream",
            tokens: withQuery,
            query: QUERY_INDEX,
            keys: [BLACK],
            arcs: [{ from: QUERY_INDEX, to: BLACK, weight: 1, label: "1" }],
            bars: [0, 1, 0, 0, 0],
          },
        ],
      },
      alt: "Busca exata: a query preto pega só a key black, com peso 1, e nenhuma outra.",
    },
    {
      id: "translation",
      shortTitle: "Tradução",
      title: "Na tradução, cada palavra gerada consulta a frase de origem",
      tag: "mechanism",
      body: [
        "O mecanismo nasceu na tradução automática (Bahdanau, Cho e Bengio, 2014). Ao traduzir “the black cat sleeps” para “o gato preto dorme”, o decoder precisa, a cada palavra que gera, das informações certas da frase em inglês. Para gerar “preto”, a palavra que importa é “black”, que está em outra posição, porque o português põe o adjetivo depois do substantivo.",
        "Em vez de depender de um único vetor-resumo da frase, o decoder faz uma consulta: a query vem do estado de quem está gerando “preto”, e as keys e values vêm das palavras em inglês.",
      ],
      keyIdea: "A query vem de quem precisa da informação; keys e values vêm de onde a informação está.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          { id: "source", piece: "token-stream", tokens: source, keys: [0, 1, 2, 3] },
          { id: "target", piece: "token-stream", tokens: target, query: PRETO, color: "module-03" },
        ],
      },
      alt: "A frase de origem the black cat sleeps e, abaixo, a tradução o gato preto dorme, com preto como a palavra que pergunta.",
    },
    {
      id: "scores",
      shortTitle: "Pontuar",
      title: "Pontuação: o produto escalar entre a query e cada key",
      tag: "mechanism",
      body: [
        "A semelhança entre query e key é medida pelo produto escalar: multiplique coordenada a coordenada e some. Vetores que apontam na mesma direção dão um número alto; vetores sem relação, um número perto de zero.",
        `No exemplo, as keys marcam traços [cor, animal, artigo, ação] de cada palavra, e a query de “preto” é ${vector(queryPreto)}: procura muito “cor” e um pouco “animal”. As pontuações saem ${source.map((word, index) => `${word} ${fixed(scores[index], 1)}`).join(", ")}. Num modelo treinado, queries e keys têm centenas de dimensões sem nome, mas a conta é a mesma.`,
      ],
      keyIdea: "Pontuação = q · k. Quanto mais alinhados os vetores, maior a pontuação.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "lookup",
            piece: "token-stream",
            tokens: withQuery,
            query: QUERY_INDEX,
            keys: [0, 1, 2, 3],
            arcs: scores.map((score, index) => ({
              from: QUERY_INDEX,
              to: index,
              weight: score / Math.max(...scores),
              label: fixed(score, 1),
            })),
          },
        ],
      },
      alt: `Pontuações da query preto: ${source.map((word, index) => `${word} ${fixed(scores[index], 1)}`).join(", ")}.`,
    },
    {
      id: "softmax",
      shortTitle: "Softmax",
      title: "O softmax transforma pontuações em pesos que somam 1",
      tag: "mechanism",
      body: [
        "Pontuações podem ser negativas e não somam nada em particular. O [[softmax|softmax]] resolve isso: eleva e (≈ 2,718) a cada pontuação, o que deixa tudo positivo, e divide pela soma, o que faz o total dar 1.",
        `A exponencial amplia as diferenças. A pontuação de “black” é ${fixed(scores[BLACK] / scores[2], 1)} vezes a de “cat”, mas o peso de “black” fica ${fixed(weights[BLACK] / weights[2], 1)} vezes maior: ${fixed(weights[BLACK])} contra ${fixed(weights[2])}. “the” e “sleeps” ficam com ${fixed(weights[0])} e ${fixed(weights[3])}. Nenhum peso é zero; os irrelevantes só ficam pequenos.`,
      ],
      keyIdea: "softmax(s)_i = e^(s_i) / Σ_j e^(s_j). Os pesos são positivos, somam 1 e favorecem as maiores pontuações.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "lookup",
            piece: "token-stream",
            tokens: withQuery,
            query: QUERY_INDEX,
            keys: [BLACK],
            arcs: weights.map((weight, index) => ({ from: QUERY_INDEX, to: index, weight, label: fixed(weight) })),
            bars: [...weights, 0],
          },
          {
            id: "weights",
            piece: "metrics-panel",
            metrics: [
              ...source.map((word, index) => ({ id: word, label: word, value: fixed(weights[index]) })),
              { id: "sum", label: "soma", value: fixed(weights.reduce((total, weight) => total + weight, 0)) },
            ],
            highlight: "black",
          },
        ],
      },
      alt: `Pesos depois do softmax: ${source.map((word, index) => `${word} ${fixed(weights[index])}`).join(", ")}. Soma 1.`,
    },
    {
      id: "weighted-sum",
      shortTitle: "Soma",
      title: "A saída é a média dos values, ponderada pelos pesos",
      tag: "mechanism",
      body: [
        "Cada key vem acompanhada de um value: o conteúdo que a palavra entrega se for consultada. Key e value são vetores diferentes. A key serve para ser encontrada; o value, para ser lido. Os pesos multiplicam os values, e a soma é a saída da consulta.",
        `Com values de traços [cor, animal, ação], a saída para “preto” é ${vector(output)}: quase toda a informação vem de “black”, com um pouco de “cat”. Esse vetor segue para o decoder, que o usa para gerar a palavra.`,
      ],
      keyIdea: "saída = Σ peso_i × value_i. A saída é uma mistura dos values, dominada pelos que tiveram as maiores pontuações.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "values",
            piece: "matrix",
            rows: [...source.map((word, index) => `${word} × ${fixed(weights[index])}`), "saída"],
            cols: ["cor", "animal", "ação"],
            values: [...values, output],
            scale: { min: 0, max: 1 },
            highlight: { row: source.length, col: 0 },
            showValues: true,
          },
        ],
      },
      alt: `Os values de cada palavra com o seu peso e, na última linha, a saída ${vector(output)}.`,
    },
    {
      id: "scale",
      shortTitle: "Escala",
      title: "A escala das pontuações decide se o foco é difuso ou afiado",
      tag: "mechanism",
      body: [
        `O softmax é sensível à escala. Dividindo as mesmas pontuações por 4, o peso de “black” cai para ${fixed(flat[BLACK])} e os pesos se espalham pelas quatro palavras. Multiplicando por 4, sobe para ${fixed(peaked[BLACK], 3)}: na prática, uma busca exata, e as outras palavras quase não recebem gradiente no treino.`,
        "Produtos escalares crescem com o número de dimensões dos vetores. Em vetores de 64 ou 128 dimensões, as pontuações podem ficar grandes e saturar o softmax. Por isso o Transformer divide as pontuações por √d antes do softmax, como mostra a aula seguinte.",
      ],
      keyIdea: "Pontuações pequenas espalham os pesos; grandes concentram tudo numa key. A escala precisa ser controlada.",
      scene: {
        kind: "pieces",
        layout: "row",
        pieces: [
          { id: "flat", piece: "chart", kind: "bar", series: source.map((label, index) => ({ label, value: flat[index] })), max: 1, highlight: BLACK, color: "info" },
          { id: "peaked", piece: "chart", kind: "bar", series: source.map((label, index) => ({ label, value: peaked[index] })), max: 1, highlight: BLACK, color: "danger" },
        ],
      },
      alt: `À esquerda, pesos com as pontuações divididas por 4 (black ${fixed(flat[BLACK])}); à direita, multiplicadas por 4 (black ${fixed(peaked[BLACK])}).`,
    },
    {
      id: "alignment",
      shortTitle: "Alinhamento",
      title: "Uma consulta por palavra gerada forma a matriz de alinhamento",
      tag: "example",
      body: [
        "Repetindo a consulta para cada palavra gerada, cada uma com a sua query, obtemos uma linha de pesos por palavra. Empilhadas, as linhas formam uma matriz de alinhamento entre as duas frases.",
        `A diagonal se quebra onde as línguas mudam a ordem: “gato” olha para “cat” (${fixed(alignment[1][2])}) e “preto” para “black” (${fixed(alignment[2][1])}). Ninguém ensinou esse alinhamento. Num modelo real, ele surge do treino de tradução, porque os pesos são diferenciáveis e o gradiente ajusta queries e keys até o modelo olhar para o lugar certo.`,
      ],
      keyIdea: "Attention é diferenciável: o modelo aprende onde olhar a partir do erro de previsão, sem rótulos de alinhamento.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "alignment",
            piece: "matrix",
            rows: target,
            cols: source,
            values: alignment,
            scale: { min: 0, max: 1 },
            highlight: { row: PRETO, col: BLACK },
            showValues: true,
            color: "module-03",
          },
        ],
      },
      alt: `Matriz de alinhamento: linhas o, gato, preto, dorme; colunas the, black, cat, sleeps. gato olha para cat (${fixed(alignment[1][2])}) e preto para black (${fixed(alignment[2][1])}).`,
    },
    {
      id: "everywhere",
      shortTitle: "Variações",
      title: "Mesma operação, fontes diferentes para query, keys e values",
      tag: "mechanism",
      body: [
        "Na tradução, a query vem do decoder e keys e values vêm do encoder. Isso é cross-attention, e continua nos modelos encoder-decoder atuais, como o T5 e o Whisper, que transcreve áudio consultando a representação do som.",
        "Quando query, keys e values vêm da mesma sequência, cada token consulta os outros tokens da própria frase. Essa é a self-attention, o tema da próxima aula, e é a base dos LLMs.",
      ],
      keyIdea: "O mecanismo é sempre o mesmo. Muda só de onde saem query, keys e values.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          { id: "source", piece: "token-stream", tokens: source, keys: [0, 1, 2, 3] },
          { id: "target", piece: "token-stream", tokens: target, query: PRETO, color: "module-03" },
        ],
      },
      alt: "Cross-attention: a query vem da frase gerada, e keys e values vêm da frase de origem.",
    },
    {
      id: "limits",
      shortTitle: "Limites",
      title: "Custo de todas as comparações e pesos que não são explicação",
      tag: "tradeoff",
      body: [
        "Cada query é comparada com todas as keys. Com n queries e m keys, são n × m pontuações. Numa sequência que consulta a si mesma, n = m, e o custo cresce com o quadrado do comprimento.",
        "É tentador ler os pesos como a explicação da decisão do modelo. Jain e Wallace (2019) mostraram que pesos bem diferentes podem levar à mesma previsão. Os pesos dizem para onde a informação fluiu numa camada, não por que o modelo decidiu.",
      ],
      keyIdea: "Attention custa n × m comparações, e um peso alto não prova causa.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "alignment",
            piece: "matrix",
            rows: target,
            cols: source,
            values: alignment,
            scale: { min: 0, max: 1 },
            color: "module-03",
          },
        ],
      },
      alt: `A matriz de alinhamento completa: ${target.length} × ${source.length} = ${target.length * source.length} pontuações.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Pontuar, normalizar, somar",
      tag: "summary",
      body: [
        "Attention compara uma query com todas as keys por produto escalar, transforma as pontuações em pesos com softmax e devolve a soma dos values ponderada por esses pesos. Tudo é diferenciável, então o modelo aprende onde olhar.",
        "A escala das pontuações controla o quanto os pesos se concentram. Na próxima aula, a sequência consulta a si mesma: a self-attention.",
      ],
      keyIdea: "attention(q, K, V) = softmax(q · K) · V, antes da escala por √d que a próxima aula acrescenta.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "lookup",
            piece: "token-stream",
            tokens: withQuery,
            query: QUERY_INDEX,
            keys: [BLACK],
            arcs: weights.map((weight, index) => ({ from: QUERY_INDEX, to: index, weight, label: fixed(weight) })),
            bars: [...weights, 0],
          },
        ],
      },
      alt: `Resumo: a query preto distribui os pesos ${source.map((word, index) => `${word} ${fixed(weights[index])}`).join(", ")}.`,
    },
  ],
  realWorldExample:
    "Um sistema de legendas automáticas usa o Whisper, um modelo encoder-decoder. O encoder transforma 30 segundos de áudio numa sequência de vetores. A cada token de texto que gera, o decoder faz cross-attention sobre esses vetores: a query sai do texto já escrito, e keys e values saem do áudio. Quando a pessoa fala rápido ou faz uma pausa longa, os pesos se deslocam pela sequência de áudio, e é isso que permite alinhar cada palavra ao trecho de som correspondente sem que ninguém tenha marcado esse alinhamento no treino.",
  code: {
    language: "python",
    caption:
      "Attention para uma query, com os números da aula: pontuação por produto escalar, softmax e soma ponderada dos values.",
    source: `import numpy as np

def softmax(x: np.ndarray) -> np.ndarray:
    e = np.exp(x - x.max())  # subtrair o máximo evita overflow e não muda o resultado
    return e / e.sum()

def attention(query: np.ndarray, keys: np.ndarray, values: np.ndarray):
    scores = keys @ query      # uma pontuação por key
    weights = softmax(scores)  # positivos, somam 1
    return weights @ values, weights

# Keys com traços [cor, animal, artigo, ação] de "the", "black", "cat" e "sleeps".
keys = np.array([[0, 0, 1, 0], [1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 0, 1]], dtype=float)
# Values com traços [cor, animal, ação].
values = np.array([[0.1, 0.1, 0.0], [0.9, 0.0, 0.1], [0.1, 0.9, 0.1], [0.0, 0.1, 0.9]])
query = np.array([3.1, 1.4, 0.2, 0.1])  # a query de "preto"

output, weights = attention(query, keys, values)
print(weights.round(2))  # o maior peso fica em "black"
print(output.round(2))   # mistura dominada pelo value de "black"`,
  },
  tradeOffs: {
    pros: [
      "Qualquer posição consulta qualquer outra diretamente, sem depender de memória comprimida",
      "Todas as consultas são independentes e podem ser calculadas em paralelo",
      "É diferenciável: o modelo aprende onde olhar sem rótulos de alinhamento",
    ],
    cons: [
      "n queries contra m keys custam n × m pontuações; para uma sequência sobre si mesma, o custo é quadrático",
      "Sem controle da escala, o softmax satura e o gradiente some",
      "Pesos de attention não são uma explicação confiável da decisão do modelo",
    ],
    alternatives: [
      "Attention aditiva de Bahdanau, que pontua com uma pequena rede em vez do produto escalar",
      "Attention local ou esparsa, que compara cada query só com uma parte das keys",
    ],
  },
  knowledgeCheck: [
    {
      id: "attention-output",
      prompt: "Qual é a saída de uma consulta de attention?",
      options: [
        "O value da key com maior pontuação, e só ele",
        "A soma dos values ponderada pelos pesos do softmax",
        "A média simples das keys",
        "A pontuação mais alta",
      ],
      correct: 1,
      explanation:
        "Os pesos do softmax multiplicam os values, e a soma é a saída. A key de maior pontuação domina, mas todas contribuem.",
      lesson: "03-07",
    },
    {
      id: "softmax-role",
      prompt: "Para que serve o softmax na attention?",
      options: [
        "Para ordenar os tokens",
        "Para transformar pontuações em pesos positivos que somam 1",
        "Para calcular o produto escalar",
        "Para remover tokens irrelevantes da sequência",
      ],
      correct: 1,
      explanation:
        "O softmax exponencia e normaliza as pontuações. Nenhum peso fica zero, mas os de pontuação baixa ficam pequenos.",
      lesson: "03-07",
    },
    {
      id: "scale-effect",
      prompt: "O que acontece com os pesos quando todas as pontuações são multiplicadas por 4?",
      options: [
        "Nada, porque o softmax normaliza",
        "Ficam mais uniformes",
        "Ficam mais concentrados na key de maior pontuação",
        "Passam a somar 4",
      ],
      correct: 2,
      explanation:
        "A exponencial amplia diferenças. Pontuações maiores fazem o softmax se aproximar de uma escolha única, e as outras keys quase não recebem peso nem gradiente.",
      lesson: "03-07",
    },
  ],
  related: ["03-01", "03-06", "03-08", "03-09", "03-12"],
  references: [
    {
      title: "Bahdanau, Cho e Bengio (2014), Neural Machine Translation by Jointly Learning to Align and Translate",
      url: "https://arxiv.org/abs/1409.0473",
      kind: "paper",
    },
    {
      title: "Luong, Pham e Manning (2015), Effective Approaches to Attention-based Neural Machine Translation",
      url: "https://arxiv.org/abs/1508.04025",
      kind: "paper",
    },
    {
      title: "Vaswani et al. (2017), Attention Is All You Need",
      url: "https://arxiv.org/abs/1706.03762",
      kind: "paper",
    },
    {
      title: "Jain e Wallace (2019), Attention is not Explanation",
      url: "https://arxiv.org/abs/1902.10186",
      kind: "paper",
    },
    {
      title: "Radford et al. (2022), Robust Speech Recognition via Large-Scale Weak Supervision (Whisper)",
      url: "https://arxiv.org/abs/2212.04356",
      kind: "paper",
    },
  ],
};

export default lesson;
