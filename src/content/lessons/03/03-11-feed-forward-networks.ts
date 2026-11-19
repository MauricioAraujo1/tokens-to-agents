import type { GraphSpec, PipelineSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Rede feed-forward de brinquedo: d_model = 3, com os traços [animal, ação, passado], e d_ff = 6.
// Cada neurônio oculto é um detector escrito à mão. Ativações, saídas e contagens de parâmetros
// da cena são calculadas aqui.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const vector = (values: number[]) => `[${values.map((value) => fixed(value)).join("; ")}]`;
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const millions = (value: number) => fixed(value / 1e6, 1);

type Matrix = number[][];

/** Vetor linha × matriz: x · W. */
const project = (x: number[], weights: Matrix) =>
  weights[0].map((_, col) => x.reduce((total, value, row) => total + value * weights[row][col], 0));
const add = (a: number[], b: number[]) => a.map((value, index) => value + b[index]);
const relu = (values: number[]) => values.map((value) => Math.max(0, value));
const matmul = (a: Matrix, b: Matrix) => a.map((row) => project(row, b));

const features = ["animal", "ação", "passado"];
const hidden = ["h1", "h2", "h3", "h4", "h5", "h6"];
const detectors = [
  "é um animal",
  "ação no passado",
  "ação no presente",
  "animal agindo",
  "não é animal",
  "tempo passado",
];

// W₁ (3 × 6): cada coluna é um detector. b₁ é o limiar de cada um.
const W1: Matrix = [
  [1, 0, 0, 1, -1, 0],
  [0, 1, 1, 1, 0, 0],
  [0, 1, -1, 0, 0, 1],
];
const b1 = [-0.5, -1.2, -0.5, -1.5, 0.3, -0.5];
// W₂ (6 × 3): o que cada detector ativo escreve de volta no vetor do token.
const W2: Matrix = [
  [0.2, 0, 0],
  [0, 0.3, 0.3],
  [0, 0.2, 0],
  [0.5, 0.5, 0],
  [-0.2, 0, 0],
  [0, 0, 0.2],
];
const b2 = [0, 0, 0];

// Vetores que chegam da self-attention. "dormiu" já recebeu informação do sujeito ("animal" = 0,7).
const tokens = ["gato", "dormiu", "sofá", "dorme"];
const inputs: Matrix = [
  [1, 0.1, 0],
  [0.7, 1, 1],
  [0, 0.1, 0],
  [0.1, 1, 0],
];
const DORMIU = 1;

const preActivations = inputs.map((x) => add(project(x, W1), b1));
const activations = preActivations.map(relu);
const outputs = activations.map((h) => add(project(h, W2), b2));
const active = activations[DORMIU].map((value, index) => (value > 0 ? index : -1)).filter((index) => index >= 0);
const silent = hidden.length - active.length;

// Sem a não linearidade, as duas camadas viram uma só: W₁ · W₂.
const collapsed = matmul(W1, W2);
const linearOutput = add(project(add(project(inputs[DORMIU], W1), b1), W2), b2);

// Parâmetros por camada, com bias. Transformer base: d_model = 512 e d_ff = 2048.
const BASE_D = 512;
const BASE_FF = 4 * BASE_D;
const baseFfn = 2 * BASE_D * BASE_FF + BASE_FF + BASE_D;
const baseAttention = 4 * (BASE_D * BASE_D + BASE_D);
// Llama 2 7B: d_model = 4096, SwiGLU com 3 matrizes de 4096 × 11008, sem bias.
const LLAMA_D = 4096;
const LLAMA_FF = 11_008;
const llamaFfn = 3 * LLAMA_D * LLAMA_FF;
const llamaAttention = 4 * LLAMA_D * LLAMA_D;
const share = (ffn: number, attention: number) => Math.round((100 * ffn) / (ffn + attention));

// Grafo da rede: entradas, neurônios ocultos e saídas. A espessura é o módulo do peso.
const maxWeight = Math.max(...W1.flat().map(Math.abs), ...W2.flat().map(Math.abs));
const column = (count: number, index: number) => (count === 1 ? 0.5 : index / (count - 1));
const network = (highlight: string[], path?: string[]): GraphSpec => ({
  id: "network",
  piece: "graph",
  nodes: [
    ...features.map((_, index) => ({ id: `x${index + 1}`, label: `x${index + 1}`, x: 0, y: 0.2 + 0.3 * index })),
    ...hidden.map((id, index) => ({ id, label: id, x: 0.5, y: column(hidden.length, index), color: activations[DORMIU][index] > 0 ? ("module-03" as const) : undefined })),
    ...features.map((_, index) => ({ id: `y${index + 1}`, label: `y${index + 1}`, x: 1, y: 0.2 + 0.3 * index })),
  ],
  edges: [
    ...W1.flatMap((row, input) =>
      row.flatMap((weight, unit) => (weight === 0 ? [] : [{ from: `x${input + 1}`, to: hidden[unit], weight: Math.abs(weight) / maxWeight }])),
    ),
    ...W2.flatMap((row, unit) =>
      row.flatMap((weight, output) => (weight === 0 ? [] : [{ from: hidden[unit], to: `y${output + 1}`, weight: Math.abs(weight) / maxWeight }])),
    ),
  ],
  highlight,
  path,
});

const block = (activeStage: string, done: string[]): PipelineSpec => ({
  id: "block",
  piece: "pipeline",
  stages: [
    { id: "input", label: "entrada" },
    { id: "attention", label: "self-attention" },
    { id: "norm-1", label: "soma + norma" },
    { id: "ffn", label: "feed-forward", color: "module-03" },
    { id: "norm-2", label: "soma + norma" },
    { id: "output", label: "saída" },
  ],
  active: activeStage,
  done,
});

const lesson: LessonContent = {
  id: "03-11",
  subtitle:
    "A outra metade de cada bloco do Transformer: uma rede densa que processa cada token sozinho, expande o vetor, filtra e contrai de volta.",
  objectives: [
    "Explicar a divisão de trabalho entre self-attention (entre tokens) e feed-forward (dentro de cada token)",
    "Calcular FFN(x) = max(0, x · W₁ + b₁) · W₂ + b₂ num exemplo pequeno",
    "Mostrar por que, sem a não linearidade, as duas camadas colapsam numa só",
    "Contar os parâmetros da FFN e comparar com os da attention",
    "Reconhecer as variantes GELU, SwiGLU e mixture of experts",
  ],
  steps: [
    {
      id: "context",
      shortTitle: "Contexto",
      title: "Depois de olhar para os outros, cada token processa sozinho",
      tag: "context",
      body: [
        "Cada bloco do Transformer tem duas subcamadas. A self-attention move informação entre tokens: depois dela, o vetor de “dormiu” já sabe que o sujeito é um animal. Mas, para cada token, a saída dela é uma média ponderada de values, que são projeções lineares: ela junta informação, mas não combina de forma não linear os traços que juntou.",
        "Essa é a função da [[Feed Forward Network|feed-forward-network]] (FFN), a segunda subcamada. Ela recebe o vetor de cada token, sozinho, e o transforma com duas camadas densas e uma não linearidade no meio. A attention comunica; a FFN processa o que chegou.",
      ],
      keyIdea: "Self-attention mistura informação entre posições. A feed-forward transforma cada posição por conta própria.",
      scene: { kind: "pieces", layout: "single", pieces: [block("ffn", ["input", "attention", "norm-1"])] },
      alt: "Pipeline de um bloco do Transformer: entrada, self-attention, soma + norma, feed-forward (em destaque), soma + norma e saída.",
    },
    {
      id: "architecture",
      shortTitle: "Arquitetura",
      title: "Expandir, filtrar e contrair",
      tag: "mechanism",
      body: [
        "A FFN é FFN(x) = max(0, x · W₁ + b₁) · W₂ + b₂. A primeira camada leva o vetor de d_model para d_ff dimensões, em geral 4 vezes maior. A [[ReLU|relu]], max(0, ·), zera o que for negativo. A segunda camada volta para d_model, para a saída poder ser somada à entrada do bloco.",
        `No Transformer base, d_model = ${BASE_D} e d_ff = ${integer(BASE_FF)}. Na cena, a rede é de brinquedo: ${features.length} entradas, [${features.join(", ")}], ${hidden.length} neurônios ocultos e ${features.length} saídas. A espessura de cada aresta é o tamanho do peso, e os neurônios coloridos são os que ficam ativos para “dormiu”.`,
      ],
      keyIdea: "A FFN é uma rede de duas camadas: sobe para um espaço maior, aplica a não linearidade e desce de volta.",
      scene: { kind: "pieces", layout: "single", pieces: [network(active.map((index) => hidden[index]))] },
      alt: `Grafo da rede: 3 entradas (x1 a x3), 6 neurônios ocultos (h1 a h6) e 3 saídas (y1 a y3). Para dormiu, ficam ativos ${active.map((index) => hidden[index]).join(", ")}.`,
    },
    {
      id: "expand",
      shortTitle: "Expandir",
      title: "Cada neurônio oculto é um detector",
      tag: "mechanism",
      body: [
        `Cada coluna de W₁ é um padrão, e o bias b₁ é um limiar. O neurônio calcula o quanto o vetor de entrada combina com o padrão e subtrai o limiar. Na cena, os detectores são: ${hidden.map((id, index) => `${id} “${detectors[index]}”`).join(", ")}.`,
        `Para “dormiu”, com entrada ${vector(inputs[DORMIU])}, a primeira linha mostra x · W₁ + b₁ e a segunda, a ReLU. ${active.length} neurônios passam do limiar e ${silent} ficam em zero. h4, “animal agindo”, só dispara porque a attention já trouxe o sujeito para dentro do verbo: a FFN combina o que a attention juntou.`,
      ],
      keyIdea: "A primeira camada pergunta “este vetor tem o padrão p?” para d_ff padrões ao mesmo tempo, e a ReLU só deixa passar as respostas positivas.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "hidden",
            piece: "matrix",
            rows: ["x · W₁ + b₁", "ReLU"],
            cols: hidden,
            values: [preActivations[DORMIU], activations[DORMIU]],
            scale: { min: -1, max: 1 },
            highlight: { row: 1, col: 3 },
            showValues: true,
            color: "module-03",
          },
        ],
      },
      alt: `Neurônios ocultos para dormiu. Antes da ReLU: ${vector(preActivations[DORMIU])}. Depois: ${vector(activations[DORMIU])}.`,
    },
    {
      id: "nonlinearity",
      shortTitle: "Não linear",
      title: "Sem a ReLU, as duas camadas viram uma só",
      tag: "mechanism",
      body: [
        "Se a ReLU sair, a FFN vira (x · W₁ + b₁) · W₂ + b₂ = x · (W₁ · W₂) + (b₁ · W₂ + b₂): uma única camada linear com a matriz W₁ · W₂. A cena mostra essa matriz, 3 × 3. Expandir para 6 dimensões e voltar para 3 não ganharia nada, porque uma composição de funções lineares é linear.",
        `Com a ReLU, a saída de “dormiu” é ${vector(outputs[DORMIU])}. Sem ela, seria ${vector(linearOutput)}, porque os neurônios negativos passariam a contribuir com valores negativos. É a não linearidade que deixa a rede responder “sim ou não” a cada padrão e combinar essas respostas.`,
      ],
      keyIdea: "Duas camadas lineares seguidas são uma camada linear. A não linearidade entre elas é o que dá capacidade à FFN.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [{ id: "collapsed", piece: "matrix", rows: features, cols: features, values: collapsed, showValues: true, color: "danger" }],
      },
      alt: `A matriz W₁ · W₂, 3 × 3, que substituiria a FFN sem a ReLU. Com a ReLU, a saída de dormiu é ${vector(outputs[DORMIU])}; sem ela, ${vector(linearOutput)}.`,
    },
    {
      id: "contract",
      shortTitle: "Contrair",
      title: "W₂ decide o que cada detector escreve de volta",
      tag: "mechanism",
      body: [
        "A segunda camada multiplica as ativações por W₂. Cada linha de W₂ é o que um neurônio escreve no vetor do token quando dispara, na proporção da sua ativação. Neurônio em zero não escreve nada.",
        `Para “dormiu”, a saída é ${vector(outputs[DORMIU])}. Essa saída não substitui o vetor: ela é somada à entrada pela conexão residual (aula 03.13). A FFN funciona como um ajuste, que acrescenta ao vetor do token o que os detectores ativos sabem.`,
      ],
      keyIdea: "FFN(x) é uma soma de linhas de W₂, ponderadas pelos neurônios que dispararam.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "contract",
            piece: "matrix",
            rows: [...hidden.map((id, index) => `${id} × ${fixed(activations[DORMIU][index])}`), "FFN(dormiu)"],
            cols: features,
            values: [...W2, outputs[DORMIU]],
            highlight: { row: hidden.length, col: 0 },
            showValues: true,
            color: "brand",
          },
        ],
      },
      alt: `As linhas de W₂, com a ativação de cada neurônio para dormiu, e na última linha a saída: ${vector(outputs[DORMIU])}.`,
    },
    {
      id: "position-wise",
      shortTitle: "Por posição",
      title: "Os mesmos pesos em cada posição, cada uma sozinha",
      tag: "mechanism",
      body: [
        "A FFN é aplicada a cada token separadamente, com os mesmos W₁, W₂, b₁ e b₂ em todas as posições. Nenhuma linha da conta olha para outra. Por isso a camada é chamada de position-wise, e por isso aplicar a FFN à matriz inteira (n × d_model) dá o mesmo que aplicá-la token por token.",
        `A cena mostra as ativações de 4 tokens. Cada um acende detectores diferentes: “gato” acende “é um animal”, “sofá” acende “não é animal”, “dorme” acende “ação no presente”. Se dois tokens chegassem com o mesmo vetor, sairiam com o mesmo resultado. Eles chegam diferentes porque a attention, antes, já misturou o contexto.`,
      ],
      keyIdea: "A FFN não troca informação entre tokens. Ela é a mesma função aplicada a cada posição, em paralelo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [{ id: "hidden-all", piece: "matrix", rows: tokens, cols: hidden, values: activations, scale: { min: 0, max: 1 }, highlight: { row: DORMIU, col: 1 }, showValues: true, color: "module-03" }],
      },
      alt: `Ativações dos 6 neurônios ocultos para 4 tokens: ${tokens.map((token, index) => `${token} ${vector(activations[index])}`).join("; ")}.`,
    },
    {
      id: "memory",
      shortTitle: "Memória",
      title: "A FFN como memória de chave e valor",
      tag: "example",
      body: [
        "Há uma leitura útil da FFN: as colunas de W₁ funcionam como keys, as linhas de W₂ como values, e a ReLU no lugar do softmax. Um neurônio dispara quando o vetor do token combina com a sua key, e então soma o seu value à saída. É uma memória com milhares de entradas, consultada por cada token.",
        "Pesquisas com modelos treinados acharam isso na prática: neurônios das camadas de baixo disparam em padrões superficiais, como uma palavra ou um sufixo, e os das camadas de cima em padrões de sentido. Os values tendem a aumentar a probabilidade dos tokens que costumam vir depois do padrão. Boa parte do conhecimento factual de um LLM parece estar guardada nessas camadas.",
      ],
      keyIdea: "Colunas de W₁ são padrões procurados, linhas de W₂ são o que cada padrão acrescenta. A FFN é uma grande memória associativa.",
      scene: { kind: "pieces", layout: "single", pieces: [network(["h4"], ["x2", "h4", "y1"])] },
      alt: "Grafo da rede com o caminho x2 → h4 → y1 em destaque: o detector h4, “animal agindo”, lê as entradas de animal e de ação e escreve nas saídas y1 e y2.",
    },
    {
      id: "parameters",
      shortTitle: "Parâmetros",
      title: "Onde ficam os parâmetros do bloco",
      tag: "tradeoff",
      body: [
        `No Transformer base, a FFN de uma camada tem 2 × ${BASE_D} × ${integer(BASE_FF)} + ${integer(BASE_FF)} + ${BASE_D} = ${integer(baseFfn)} parâmetros, contra ${integer(baseAttention)} da attention: ${share(baseFfn, baseAttention)}% do bloco. No Llama 2 7B, a FFN usa três matrizes de ${integer(LLAMA_D)} × ${integer(LLAMA_FF)}, ${millions(llamaFfn)} milhões de parâmetros por camada, contra ${millions(llamaAttention)} milhões da attention: ${share(llamaFfn, llamaAttention)}%.`,
        "Como a FFN processa cada token sem olhar os outros, o custo dela cresce em linha reta com o comprimento da sequência, enquanto o da attention cresce com n². Em contextos curtos e médios, a maior parte do tempo de cálculo de um LLM está nas FFNs.",
      ],
      keyIdea: "Cerca de dois terços dos parâmetros de um Transformer ficam nas FFNs, não na attention.",
      scene: {
        kind: "pieces",
        layout: "row",
        pieces: [
          { id: "base", piece: "chart", kind: "bar", series: [{ label: "attn", value: baseAttention / 1e6 }, { label: "FFN", value: baseFfn / 1e6 }], highlight: 1 },
          { id: "llama", piece: "chart", kind: "bar", series: [{ label: "attn", value: llamaAttention / 1e6 }, { label: "FFN", value: llamaFfn / 1e6 }], highlight: 1, color: "module-03" },
        ],
      },
      alt: `Parâmetros por camada, em milhões. Transformer base: attention ${millions(baseAttention)}, FFN ${millions(baseFfn)}. Llama 2 7B: attention ${millions(llamaAttention)}, FFN ${millions(llamaFfn)}.`,
    },
    {
      id: "variants",
      shortTitle: "Variantes",
      title: "GELU, SwiGLU e mixture of experts",
      tag: "tradeoff",
      body: [
        "Modelos posteriores trocaram a ReLU pela GELU, uma curva suave que deixa passar um pouco de valor negativo perto de zero (BERT e GPT-2 usam GELU). O Llama e muitos modelos recentes usam SwiGLU: uma terceira matriz gera um portão que multiplica, elemento a elemento, a ativação. Para manter o número de parâmetros, o d_ff encolhe para cerca de 2/3 de 4 · d_model, e é por isso que o Llama 2 7B tem d_ff = 11.008.",
        "A [[mixture of experts|mixture-of-experts]] (MoE) substitui a FFN única por várias FFNs, os experts, e um roteador escolhe poucos deles para cada token. O Mixtral 8x7B tem 8 experts por camada e usa 2 por token: o modelo tem cerca de 47 bilhões de parâmetros, mas cada token passa por cerca de 13 bilhões. Mais capacidade, com o custo por token de um modelo menor.",
      ],
      keyIdea: "A FFN é a peça mais trocada do bloco: muda a ativação, ganha um portão ou vira um conjunto de experts com roteador.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "block",
            piece: "pipeline",
            stages: [
              { id: "token", label: "token" },
              { id: "router", label: "roteador" },
              { id: "expert-3", label: "expert 3", color: "module-03" },
              { id: "sum", label: "soma ponderada" },
            ],
            active: "expert-3",
            done: ["token", "router"],
            branch: { id: "expert-7", label: "expert 7", from: "router", edgeLabel: "top-2", color: "info" },
          },
        ],
      },
      alt: "Pipeline de uma camada mixture of experts: o token passa pelo roteador, que escolhe 2 experts (3 e 7, num ramo à parte), e as saídas são somadas com os pesos do roteador.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Feed-forward em uma linha",
      tag: "summary",
      body: [
        "FFN(x) = max(0, x · W₁ + b₁) · W₂ + b₂, aplicada a cada token separadamente, com os mesmos pesos. W₁ expande para d_ff (em geral 4 · d_model) e funciona como um banco de detectores; a ReLU filtra; W₂ contrai e escreve de volta o que os detectores ativos sabem.",
        "Sem a não linearidade, a FFN seria uma camada linear só. Ela concentra cerca de dois terços dos parâmetros do bloco e boa parte do conhecimento do modelo. A próxima aula separa os dois tipos de pilha de blocos: encoder e decoder.",
      ],
      keyIdea: "Attention decide de onde vem a informação; a FFN decide o que fazer com ela.",
      scene: { kind: "pieces", layout: "single", pieces: [block("norm-2", ["input", "attention", "norm-1", "ffn"])] },
      alt: "Pipeline do bloco do Transformer com entrada, self-attention, soma + norma e feed-forward concluídos e o segundo soma + norma em andamento.",
    },
  ],
  realWorldExample: `Quando um modelo como o Llama 2 7B responde a um prompt curto, a maior parte das multiplicações acontece nas FFNs: são ${millions(llamaFfn)} milhões de parâmetros por camada, em 32 camadas, contra ${millions(llamaAttention)} milhões da attention. Por isso técnicas de inferência miram nelas. A quantização reduz o tamanho dessas matrizes, e os modelos mixture of experts, como o Mixtral, trocam uma FFN grande por várias menores e ativam só duas por token. A pesquisa em interpretabilidade também começa por elas: alterar os pesos de uma FFN escolhida é uma das formas estudadas de corrigir um fato errado que o modelo aprendeu, sem treinar tudo de novo.`,
  code: {
    language: "python",
    caption:
      "FFN position-wise em NumPy, com as dimensões do Transformer base. Aplicar à matriz inteira dá o mesmo que aplicar token por token, e sem a ReLU as duas camadas colapsam numa só.",
    source: `import numpy as np

def ffn(X, W1, b1, W2, b2):
    H = np.maximum(0, X @ W1 + b1)   # (n, d_ff): expande e zera o negativo
    return H @ W2 + b2               # (n, d_model): contrai de volta

rng = np.random.default_rng(0)
n, d_model, d_ff = 10, 512, 2048
X = rng.normal(size=(n, d_model))
W1 = rng.normal(size=(d_model, d_ff)) * 0.02
W2 = rng.normal(size=(d_ff, d_model)) * 0.02
b1, b2 = np.zeros(d_ff), np.zeros(d_model)

Y = ffn(X, W1, b1, W2, b2)
token_a_token = np.stack([ffn(x[None], W1, b1, W2, b2)[0] for x in X])
print(np.allclose(Y, token_a_token))          # True: cada posição é processada sozinha
print(W1.size + b1.size + W2.size + b2.size)  # 2099712 parâmetros por camada

linear = (X @ W1 + b1) @ W2 + b2              # a mesma rede sem a ReLU
print(np.allclose(linear, X @ (W1 @ W2) + (b1 @ W2 + b2)))  # True: vira uma camada só`,
  },
  tradeOffs: {
    pros: [
      "Cada token é processado em paralelo, com custo linear no comprimento da sequência",
      "A expansão para d_ff dá espaço para milhares de detectores por camada",
      "É a peça mais fácil de trocar: GELU, SwiGLU ou mixture of experts mantêm a mesma interface",
    ],
    cons: [
      "Concentra cerca de dois terços dos parâmetros e boa parte do cálculo do modelo",
      "Sozinha, não troca informação entre tokens: depende da attention para o contexto",
      "Com ReLU, neurônios que ficam sempre negativos param de aprender, porque o gradiente deles é zero",
    ],
    alternatives: [
      "SwiGLU e GeGLU, com um portão multiplicativo",
      "Mixture of experts, com várias FFNs e um roteador que escolhe poucas por token",
    ],
  },
  knowledgeCheck: [
    {
      id: "ffn-role",
      prompt: "O que a rede feed-forward faz que a self-attention não faz?",
      options: [
        "Compara cada token com todos os outros",
        "Transforma o vetor de cada token sozinho, com uma não linearidade, sem olhar para os outros tokens",
        "Aplica a máscara causal",
        "Gera a codificação de posição",
      ],
      correct: 1,
      explanation:
        "A attention mistura values entre posições. A FFN aplica a mesma rede de duas camadas a cada posição, independentemente, e cria traços novos com a não linearidade.",
      lesson: "03-11",
    },
    {
      id: "why-relu",
      prompt: "O que acontece se a ReLU for removida da FFN?",
      options: [
        "A FFN passa a misturar tokens",
        "As duas camadas viram uma única camada linear, com a matriz W₁ · W₂",
        "A FFN fica com o dobro de parâmetros",
        "Nada muda na saída",
      ],
      correct: 1,
      explanation:
        "(x · W₁ + b₁) · W₂ + b₂ = x · (W₁ · W₂) + (b₁ · W₂ + b₂). Sem a não linearidade, expandir para d_ff e voltar não acrescenta capacidade.",
      lesson: "03-11",
    },
    {
      id: "ffn-share",
      prompt: "No Transformer base, que fração dos parâmetros de um bloco fica na FFN?",
      options: ["Cerca de 10%", "Cerca de um terço", "Cerca de dois terços", "Todos"],
      correct: 2,
      explanation:
        "A FFN tem 2 × 512 × 2.048 pesos mais os bias, cerca de 2,1 milhões, contra cerca de 1,05 milhão da attention.",
      lesson: "03-11",
    },
  ],
  related: ["02-04", "03-08", "03-10", "03-13", "10-09"],
  references: [
    {
      title: "Vaswani et al. (2017), Attention Is All You Need",
      url: "https://arxiv.org/abs/1706.03762",
      kind: "paper",
    },
    {
      title: "Geva et al. (2021), Transformer Feed-Forward Layers Are Key-Value Memories",
      url: "https://arxiv.org/abs/2012.14913",
      kind: "paper",
    },
    {
      title: "Hendrycks e Gimpel (2016), Gaussian Error Linear Units (GELUs)",
      url: "https://arxiv.org/abs/1606.08415",
      kind: "paper",
    },
    {
      title: "Shazeer (2020), GLU Variants Improve Transformer",
      url: "https://arxiv.org/abs/2002.05202",
      kind: "paper",
    },
    {
      title: "Jiang et al. (2024), Mixtral of Experts",
      url: "https://arxiv.org/abs/2401.04088",
      kind: "paper",
    },
  ],
};

export default lesson;
