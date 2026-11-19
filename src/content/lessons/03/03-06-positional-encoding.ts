import type { LessonContent } from "../../../types/content";

// Todos os números desta aula saem das fórmulas do paper original (Vaswani et al., 2017):
// PE(pos, 2i) = sen(pos / 10000^(2i/d)) e PE(pos, 2i+1) = cos(pos / 10000^(2i/d)).

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const round2 = (value: number) => Math.round(value * 100) / 100;

/** Frequência angular do par de dimensões que começa na dimensão par `evenDim`. */
const omega = (evenDim: number, d: number) => 1 / 10_000 ** (evenDim / d);

function sinusoidal(position: number, d: number): number[] {
  return Array.from({ length: d }, (_, dim) => {
    const angle = position * omega(dim - (dim % 2), d);
    return dim % 2 === 0 ? Math.sin(angle) : Math.cos(angle);
  });
}

const dot = (a: number[], b: number[]) => a.reduce((total, value, index) => total + value * b[index], 0);

// Passo 1: mesma multiplicidade de tokens, ordem diferente.
const sentenceA = ["o", "cão", "mordeu", "o", "homem"];
const sentenceB = ["o", "homem", "mordeu", "o", "cão"];

// Passo 2: embedding + posição com d = 4, para três tokens.
const SMALL_D = 4;
const sumTokens = ["o", "cão", "mordeu"];
const tokenVectors = [
  [0.12, -0.4, 0.33, 0.05],
  [0.71, 0.18, -0.52, 0.3],
  [-0.26, 0.64, 0.09, -0.47],
];
const positionVectors = sumTokens.map((_, position) => sinusoidal(position, SMALL_D).map(round2));
const summed = tokenVectors.map((row, position) => row.map((value, dim) => round2(value + positionVectors[position][dim])));

// Passo 3: mapa de calor com 10 posições e d = 8.
const HEAT_D = 8;
const heatPositions = Array.from({ length: 10 }, (_, position) => position);
const heat = heatPositions.map((position) => sinusoidal(position, HEAT_D));

// Passo 4: comprimento de onda de cada par de dimensões com d = 512, em posições.
const PAPER_D = 512;
const wavelengthDims = [0, 64, 128, 256, 384, 510];
const wavelength = (evenDim: number) => (2 * Math.PI) / omega(evenDim, PAPER_D);
const shortest = wavelength(0);
const longest = wavelength(PAPER_D - 2);

// Passo 5: produto escalar entre posições com d = 16. Só depende da distância.
const DOT_D = 16;
const dotPositions = Array.from({ length: 8 }, (_, position) => position);
const dotMatrix = dotPositions.map((p) => dotPositions.map((q) => dot(sinusoidal(p, DOT_D), sinusoidal(q, DOT_D))));

// Passo 7: RoPE em 2D, girando o mesmo vetor θ radianos por posição.
const THETA = 0.5;
const baseQuery: [number, number] = [1, 0.3];
const rotate = ([x, y]: [number, number], angle: number): [number, number] => [
  x * Math.cos(angle) - y * Math.sin(angle),
  x * Math.sin(angle) + y * Math.cos(angle),
];
const ropePositions = [0, 1, 2, 3];
const degrees = (radians: number) => (radians * 180) / Math.PI;

// Passo 8: janelas de contexto publicadas.
const contexts = [
  { label: "BERT", name: "BERT (aprendida)", tokens: 512 },
  { label: "GPT-2", name: "GPT-2 (aprendida)", tokens: 1024 },
  { label: "Llama2", name: "Llama 2 (RoPE)", tokens: 4096 },
  { label: "Llama3", name: "Llama 3 (RoPE)", tokens: 8192 },
  { label: "L3.1", name: "Llama 3.1 (RoPE com escala)", tokens: 131_072 },
];

const lesson: LessonContent = {
  id: "03-06",
  subtitle:
    "Attention compara tokens sem saber em que ordem eles vieram. A codificação posicional coloca essa ordem dentro dos vetores.",
  objectives: [
    "Explicar por que um Transformer sem informação de posição não distingue a ordem das palavras",
    "Calcular a codificação senoidal do paper original e ler o seu mapa de frequências",
    "Mostrar que o produto escalar entre posições senoidais depende só da distância",
    "Comparar posições aprendidas, senoidais e RoPE quanto ao limite de comprimento",
  ],
  steps: [
    {
      id: "order-blind",
      shortTitle: "Ordem",
      title: "Sem posição, as duas frases são o mesmo conjunto de tokens",
      tag: "context",
      body: [
        "“O cão mordeu o homem” e “o homem mordeu o cão” têm os mesmos cinco tokens. Uma camada de attention compara cada token com todos os outros e soma o resultado; ela não olha para a ordem. Sem máscara, se a ordem dos tokens de entrada muda, cada saída é a mesma, só que trocada de lugar.",
        "Uma RNN recebia a ordem de graça, porque lia um token por vez. O Transformer processa tudo em paralelo e perde essa informação. Sem um sinal de posição, para ele as duas frases dizem a mesma coisa.",
      ],
      keyIdea: "Attention é cega à ordem. A posição precisa ser escrita nos próprios vetores.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          { id: "a", piece: "token-stream", tokens: sentenceA, keys: [1, 4] },
          { id: "b", piece: "token-stream", tokens: sentenceB, keys: [1, 4] },
        ],
      },
      alt: "As frases “o cão mordeu o homem” e “o homem mordeu o cão”, com cão e homem trocados de lugar.",
    },
    {
      id: "add-position",
      shortTitle: "Soma",
      title: "Cada posição ganha um vetor, somado ao vetor do token",
      tag: "mechanism",
      body: [
        "A solução do paper original é somar a cada vetor de token um vetor que depende só da posição: x_i = e(token_i) + p_i, com p_i do mesmo tamanho d. Depois da soma, “cão” na posição 1 e “cão” na posição 4 são vetores diferentes, e as camadas seguintes conseguem separar as duas frases.",
        "Somar, e não concatenar, mantém a largura d do modelo. Funciona porque, em dimensões altas, o modelo consegue reservar direções do espaço para a posição sem apagar o significado do token. O paper também multiplica os vetores de token por √d antes da soma, para que fiquem numa escala comparável à dos vetores de posição.",
      ],
      keyIdea: "Positional encoding é um vetor por posição, somado ao vetor do token antes da primeira camada.",
      scene: {
        kind: "pieces",
        layout: "row",
        pieces: [
          { id: "tokens", piece: "matrix", rows: sumTokens, cols: ["1", "2", "3", "4"], values: tokenVectors, scale: { min: -1.5, max: 1.5 }, showValues: true },
          { id: "positions", piece: "matrix", rows: ["p0", "p1", "p2"], cols: ["1", "2", "3", "4"], values: positionVectors, scale: { min: -1.5, max: 1.5 }, showValues: true, color: "module-03" },
          { id: "sum", piece: "matrix", rows: sumTokens, cols: ["1", "2", "3", "4"], values: summed, scale: { min: -1.5, max: 1.5 }, showValues: true, color: "brand" },
        ],
      },
      alt: "Três matrizes lado a lado: os vetores dos tokens o, cão e mordeu, os vetores das posições 0 a 2 e a soma dos dois.",
    },
    {
      id: "sinusoids",
      shortTitle: "Senoides",
      title: "Senos e cossenos de frequências diferentes",
      tag: "mechanism",
      body: [
        "Usar o próprio índice (0, 1, 2…, 1000) não funciona: os números crescem sem limite e logo dominam a soma. Normalizar por comprimento (i / n) muda o significado de uma posição conforme o tamanho do texto. O [[Positional Encoding|positional-encoding]] do paper original usa funções limitadas entre −1 e 1:",
        "PE(pos, 2i) = sen(pos / 10000^(2i/d)) e PE(pos, 2i+1) = cos(pos / 10000^(2i/d)). Cada par de dimensões é uma senoide com a sua própria frequência. No mapa da cena (d = 8), as primeiras colunas oscilam rápido de uma posição para a outra; as últimas mudam devagar. A combinação de todas dá a cada posição uma assinatura única.",
      ],
      keyIdea: "Cada posição vira um padrão de senos e cossenos, todos entre −1 e 1, que nunca se repete no comprimento usado.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "heat",
            piece: "matrix",
            rows: heatPositions.map((position) => `p${position}`),
            cols: Array.from({ length: HEAT_D }, (_, dim) => String(dim)),
            values: heat,
            scale: { min: -1, max: 1 },
            color: "module-03",
          },
        ],
      },
      alt: "Mapa de calor da codificação senoidal para as posições 0 a 9 e as dimensões 0 a 7. As colunas da esquerda variam rápido; as da direita, devagar.",
    },
    {
      id: "frequencies",
      shortTitle: "Frequências",
      title: "Do relógio rápido ao relógio lento",
      tag: "mechanism",
      body: [
        `Com d = ${PAPER_D}, como no Transformer base, o comprimento de onda do primeiro par de dimensões é 2π ≈ ${fixed(shortest, 1)} posições: ele dá uma volta completa a cada seis tokens. O último par tem comprimento de onda de cerca de ${Math.round(longest).toLocaleString("pt-BR")} posições. Os comprimentos crescem em progressão geométrica entre os dois.`,
        "É como ler as horas num relógio com vários ponteiros. O ponteiro rápido distingue posições vizinhas, mas se repete logo. Os lentos distinguem regiões distantes do texto. Juntos, identificam cada posição sem ambiguidade. O gráfico usa o log10 do comprimento de onda.",
      ],
      keyIdea: "Dimensões de frequência alta codificam a posição fina; as de frequência baixa, a posição grossa.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "wavelengths",
            piece: "chart",
            kind: "line",
            series: wavelengthDims.map((dim) => ({ label: String(dim), value: Math.log10(wavelength(dim)) })),
            highlight: 0,
          },
          {
            id: "wavelength-metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "fast", label: "dim 0–1", value: `${fixed(shortest, 1)} posições` },
              { id: "slow", label: `dim ${PAPER_D - 2}–${PAPER_D - 1}`, value: `${Math.round(longest).toLocaleString("pt-BR")} posições` },
            ],
            highlight: "fast",
          },
        ],
      },
      alt: `Log10 do comprimento de onda por dimensão, com d = ${PAPER_D}: de ${fixed(shortest, 1)} posições na dimensão 0 a cerca de ${Math.round(longest)} na dimensão ${PAPER_D - 2}.`,
    },
    {
      id: "relative-distance",
      shortTitle: "Distância",
      title: "O produto escalar entre posições depende só da distância",
      tag: "mechanism",
      body: [
        "Como sen(a)·sen(b) + cos(a)·cos(b) = cos(a − b), o produto escalar entre os vetores das posições p e q é uma soma de cossenos de (p − q) multiplicado por cada frequência. Ele não depende de onde o par está no texto, só da distância entre as posições.",
        `A matriz da cena mostra esse produto para as posições 0 a 7, com d = ${DOT_D}. Cada diagonal tem um valor constante: a diagonal principal vale ${fixed(dotMatrix[0][0], 0)} e as vizinhas valem ${fixed(dotMatrix[0][1])}. É por isso que o modelo consegue aprender regras do tipo “olhe para o token anterior”, válidas em qualquer ponto da frase.`,
      ],
      keyIdea: "Na codificação senoidal, a relação entre duas posições é a mesma onde quer que elas estejam.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "dots",
            piece: "matrix",
            rows: dotPositions.map((position) => `p${position}`),
            cols: dotPositions.map((position) => `p${position}`),
            values: dotMatrix,
            highlight: { row: 4, col: 3 },
            color: "module-03",
          },
        ],
      },
      alt: `Matriz do produto escalar entre as posições 0 a 7. Os valores são constantes ao longo de cada diagonal: ${fixed(dotMatrix[0][0], 0)} na principal e ${fixed(dotMatrix[0][1])} nas vizinhas.`,
    },
    {
      id: "learned",
      shortTitle: "Aprendida",
      title: "A alternativa simples: uma tabela de posições aprendida",
      tag: "mechanism",
      body: [
        "BERT e GPT-2 não usam senoides. Eles têm uma segunda tabela, como a de tokens, com uma linha por posição: 512 linhas no BERT e 1.024 no GPT-2. Cada linha é aprendida no treino. O paper original testou essa opção e obteve resultados quase iguais aos da senoidal.",
        "O limite é duro: a tabela só tem linhas até o comprimento máximo escolhido. No GPT-2, o 1.025º token não tem linha de posição, e textos maiores precisam ser cortados.",
      ],
      keyIdea: "Posições aprendidas são flexíveis, mas param no tamanho da tabela.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "context-metrics",
            piece: "metrics-panel",
            metrics: contexts.slice(0, 2).map((model) => ({
              id: model.label,
              label: `${model.name}: posições`,
              value: model.tokens.toLocaleString("pt-BR"),
            })),
          },
        ],
      },
      alt: "Tabelas de posição aprendidas: 512 posições no BERT e 1.024 no GPT-2.",
    },
    {
      id: "rope",
      shortTitle: "RoPE",
      title: "RoPE: girar os vetores em vez de somar",
      tag: "mechanism",
      body: [
        "A maioria dos LLMs abertos atuais, como Llama, Mistral e Qwen, usa [[RoPE|rope]] (Rotary Position Embedding), proposta por Su e coautores em 2021. Em vez de somar um vetor na entrada, ela gira os vetores de [[query|query]] e [[key|key]] de cada camada de attention (o que cada token procura e o que ele oferece, tema da aula 03.09) por um ângulo proporcional à posição, com uma frequência por par de dimensões, as mesmas da senoidal.",
        `Na cena, o mesmo vetor gira ${fixed(THETA)} rad (${fixed(degrees(THETA), 1)}°) a cada posição. Quando a query da posição m é comparada com a key da posição n, as duas rotações se combinam numa rotação de (m − n)·θ. O produto escalar, e portanto o peso de attention, passa a depender da distância relativa, sem nenhum vetor somado ao token.`,
      ],
      keyIdea: "RoPE codifica a posição como rotação. O que chega ao produto escalar é só a diferença entre as posições.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "rotation",
            piece: "vector-space",
            points: ropePositions.map((position) => ({
              id: `q${position}`,
              label: `posição ${position}`,
              coords: rotate(baseQuery, position * THETA),
              color: position === 0 ? "brand" : "info",
            })),
            vectors: ropePositions.map((position) => ({ to: `q${position}` })),
          },
        ],
      },
      alt: `O mesmo vetor girado ${fixed(degrees(THETA), 1)} graus a cada posição, nas posições 0 a 3.`,
    },
    {
      id: "length-limits",
      shortTitle: "Comprimento",
      title: "O comprimento do treino vira o limite do modelo",
      tag: "tradeoff",
      body: [
        "Um modelo só aprende bem as posições e distâncias que viu no treino. Tabelas aprendidas param no tamanho da tabela. Senoides e RoPE produzem números para qualquer posição, mas o desempenho cai quando o texto passa do comprimento de treino, porque o modelo encontra combinações de ângulos que nunca viu.",
        "Para estender a janela, a técnica mais usada é reescalar as frequências do RoPE e fazer um ajuste curto com textos longos. Foi assim que o Llama 3.1 passou de 8.192 para 131.072 tokens de contexto. Outra linha, o ALiBi, dispensa vetores de posição e subtrai da pontuação de attention um valor proporcional à distância, o que extrapola melhor para textos mais longos.",
      ],
      keyIdea: "A escolha da codificação posicional define até onde o contexto do modelo pode crescer.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "context-chart",
            piece: "chart",
            kind: "bar",
            series: contexts.map((model) => ({ label: model.label, value: Math.log2(model.tokens) })),
            highlight: contexts.length - 1,
          },
          {
            id: "context-metrics",
            piece: "metrics-panel",
            metrics: contexts.map((model) => ({ id: model.label, label: model.name, value: model.tokens.toLocaleString("pt-BR") })),
            highlight: "L3.1",
          },
        ],
      },
      alt: `Log2 da janela de contexto por modelo: ${contexts.map((model) => `${model.name} ${model.tokens}`).join(", ")}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Ordem escrita dentro dos vetores",
      tag: "summary",
      body: [
        "Attention não vê ordem, então a posição precisa entrar nos vetores. O Transformer original soma senoides de frequências geométricas; BERT e GPT-2 somam uma tabela aprendida; os LLMs abertos atuais giram query e key com RoPE.",
        "Senoides e RoPE fazem o produto escalar depender da distância relativa entre os tokens. O comprimento visto no treino continua sendo o limite prático, e estendê-lo exige reescalar as posições. Com tokens e posições prontos, a próxima aula entra no mecanismo de attention.",
      ],
      keyIdea: "Vetor de entrada = significado do token + informação de posição.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "heat",
            piece: "matrix",
            rows: heatPositions.map((position) => `p${position}`),
            cols: Array.from({ length: HEAT_D }, (_, dim) => String(dim)),
            values: heat,
            scale: { min: -1, max: 1 },
            color: "module-03",
          },
        ],
      },
      alt: "Resumo: o mapa de calor da codificação senoidal para as posições 0 a 9.",
    },
  ],
  realWorldExample:
    "Uma empresa quer resumir contratos de 60 mil tokens com um modelo aberto treinado com janela de 8 mil. A primeira tentativa, só aumentar o limite de tokens na configuração, gera resumos sem sentido depois de alguns milhares de tokens: as rotações do RoPE nessas posições ficam fora de tudo o que o modelo viu. A equipe troca para uma versão do modelo publicada com RoPE reescalado e treinada com textos longos, como as variantes de contexto estendido do Llama 3.1, e os resumos voltam a fazer sentido. A lição: a janela de contexto é uma propriedade do treino, não um parâmetro de configuração.",
  code: {
    language: "python",
    caption:
      "Codificação senoidal em NumPy, com a fórmula do paper. O teste no fim confirma que o produto escalar entre duas posições depende só da distância.",
    source: `import numpy as np

def sinusoidal_positions(n_positions: int, d_model: int) -> np.ndarray:
    positions = np.arange(n_positions)[:, None]          # (n, 1)
    even_dims = np.arange(0, d_model, 2)[None, :]          # 0, 2, 4, ... (1, d/2)
    angles = positions / np.power(10_000, even_dims / d_model)
    pe = np.zeros((n_positions, d_model))
    pe[:, 0::2] = np.sin(angles)                           # dimensões pares: seno
    pe[:, 1::2] = np.cos(angles)                           # dimensões ímpares: cosseno
    return pe

pe = sinusoidal_positions(n_positions=128, d_model=64)
print(pe.shape)    # (128, 64)
print(pe[0, :4])   # [0. 1. 0. 1.]: na posição 0, seno = 0 e cosseno = 1

# O produto escalar entre posições só depende da distância entre elas.
print(np.isclose(pe[10] @ pe[13], pe[50] @ pe[53]))  # True

# Na entrada do modelo, a posição é somada (não concatenada) aos vetores dos tokens.
token_vectors = np.random.randn(10, 64)  # vetores de 10 tokens (aqui aleatórios)
x = token_vectors + pe[:10]               # (10, 64): mesma largura, agora com posição`,
  },
  tradeOffs: {
    pros: [
      "A codificação senoidal não tem parâmetros e gera valores para qualquer posição",
      "Senoides e RoPE tornam a relação entre duas posições dependente só da distância",
      "RoPE não ocupa espaço no vetor de entrada e permite estender o contexto reescalando frequências",
    ],
    cons: [
      "Posições aprendidas param no tamanho da tabela",
      "Nenhum método garante bom desempenho além do comprimento visto no treino",
      "Somar a posição ao vetor do token mistura as duas informações no mesmo espaço",
    ],
    alternatives: [
      "ALiBi, que subtrai da pontuação de attention uma penalidade proporcional à distância",
      "Posições relativas aprendidas (Shaw et al., 2018), que representam a distância entre pares de tokens",
    ],
  },
  knowledgeCheck: [
    {
      id: "why-position",
      prompt: "Por que o Transformer precisa de codificação posicional?",
      options: [
        "Porque o tokenizador apaga os espaços",
        "Porque attention compara todos os tokens sem considerar a ordem, e frases com os mesmos tokens ficariam iguais",
        "Porque os vetores de token têm dimensão pequena",
        "Porque o softmax precisa de números positivos",
      ],
      correct: 1,
      explanation:
        "Attention é uma soma ponderada sobre todos os tokens, e somas não dependem da ordem. A posição precisa ser escrita nos vetores.",
      lesson: "03-06",
    },
    {
      id: "sinusoid-relative",
      prompt: "O que a cena do produto escalar entre posições senoidais mostra?",
      options: [
        "Que posições distantes têm sempre produto zero",
        "Que o produto cresce com a posição absoluta",
        "Que o produto depende só da distância entre as posições, por isso é constante em cada diagonal",
        "Que todas as posições têm o mesmo vetor",
      ],
      correct: 2,
      explanation:
        "sen(a)·sen(b) + cos(a)·cos(b) = cos(a − b). Somando sobre as frequências, o resultado depende só de p − q.",
      lesson: "03-06",
    },
    {
      id: "rope-mechanism",
      prompt: "Como o RoPE codifica a posição?",
      options: [
        "Somando o índice da posição ao vetor do token",
        "Girando query e key por um ângulo proporcional à posição, de modo que o produto escalar dependa da distância relativa",
        "Concatenando a posição ao final do vetor",
        "Ordenando os tokens antes de cada camada",
      ],
      correct: 1,
      explanation:
        "A rotação da query na posição m e a da key na posição n se combinam numa rotação de (m − n)·θ dentro do produto escalar.",
      lesson: "03-06",
    },
  ],
  related: ["03-05", "03-07", "03-08", "03-13", "04-05"],
  references: [
    {
      title: "Vaswani et al. (2017), Attention Is All You Need",
      url: "https://arxiv.org/abs/1706.03762",
      kind: "paper",
    },
    {
      title: "Su et al. (2021), RoFormer: Enhanced Transformer with Rotary Position Embedding",
      url: "https://arxiv.org/abs/2104.09864",
      kind: "paper",
    },
    {
      title: "Press, Smith e Lewis (2021), Train Short, Test Long: Attention with Linear Biases (ALiBi)",
      url: "https://arxiv.org/abs/2108.12409",
      kind: "paper",
    },
    {
      title: "Shaw, Uszkoreit e Vaswani (2018), Self-Attention with Relative Position Representations",
      url: "https://arxiv.org/abs/1803.02155",
      kind: "paper",
    },
    {
      title: "Chen et al. (2023), Extending Context Window of Large Language Models via Positional Interpolation",
      url: "https://arxiv.org/abs/2306.15595",
      kind: "paper",
    },
  ],
};

export default lesson;
