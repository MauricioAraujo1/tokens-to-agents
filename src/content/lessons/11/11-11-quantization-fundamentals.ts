import type { LessonContent } from "../../../types/content";

// Quantização do zero, com as contas no arquivo: tamanho do Llama 2 7B (pela configuração publicada) em cada formato,
// a faixa e a precisão do fp16 e do bf16 pelos bits de expoente e mantissa, e o round-trip absmax (q = round(w · s),
// w' = q / s, com s = q_max / max|w|) em 8 pesos de brinquedo: em int8, em int4, com um peso extremo e em blocos de 4.
// A quantização assimétrica usa s = (máx − mín) / 255 e zero-point = round(−mín / s) num intervalo de ativações.

const fixed = (value: number, digits = 2) =>
  (value + 0).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).replace("-", "−");
const percent = (value: number) => `${Math.round(value * 100)}%`;
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

// Tamanhos.
const D = 4096;
const FFN = 11008;
const LAYERS = 32;
const VOCAB = 32_000;
const totalParams = LAYERS * (4 * D * D + 3 * D * FFN + 2 * D) + D + 2 * VOCAB * D;
const formats = [
  { label: "fp32", bytes: 4 },
  { label: "bf16", bytes: 2 },
  { label: "int8", bytes: 1 },
  { label: "int4", bytes: 0.5 },
];
const sizeGb = (bytes: number) => (totalParams * bytes) / 1e9;

// Faixa e precisão.
const fp16Max = (2 - 2 ** -10) * 2 ** 15;
const bf16MaxExponent = 127;
const fp16Epsilon = 2 ** -10;
const bf16Epsilon = 2 ** -7;

// Round-trip absmax.
const roundTrip = (weights: number[], qMax: number) => {
  const scale = qMax / Math.max(...weights.map(Math.abs));
  return weights.map((weight) => {
    const q = Math.round(weight * scale) + 0;
    const restored = q / scale;
    return { weight, q, restored, error: Math.abs(restored - weight) };
  });
};
const meanError = (rows: Array<{ error: number }>) => mean(rows.map((row) => row.error));

const weights = [0.12, -0.45, 0.03, 0.88, -0.27, 0.51, -0.09, 0.34];
const int8 = roundTrip(weights, 127);
const int8Scale = 127 / Math.max(...weights.map(Math.abs));
const int8Error = meanError(int8);
const int4 = roundTrip(weights, 7);
const int4Error = meanError(int4);

const OUTLIER_INDEX = 6;
const OUTLIER = 6;
const withOutlier = weights.map((weight, index) => (index === OUTLIER_INDEX ? OUTLIER : weight));
const outlierRows = roundTrip(withOutlier, 7);
const others = <T,>(rows: T[]) => rows.filter((_, index) => index !== OUTLIER_INDEX);
const outlierErrorOthers = meanError(others(outlierRows));
const zeroed = others(outlierRows).filter((row) => row.q === 0).length;
const int4ErrorOthers = meanError(others(int4));

const BLOCK = 4;
const blocks = [roundTrip(withOutlier.slice(0, BLOCK), 7), roundTrip(withOutlier.slice(BLOCK), 7)];
const blockRows = blocks.flat();
const cleanBlockError = meanError(blocks[0]);
const dirtyBlockError = meanError(blocks[1]);
const blockErrorOthers = meanError(others(blockRows));

// Assimétrica.
const ACT_MIN = -0.2;
const ACT_MAX = 2;
const asymScale = (ACT_MAX - ACT_MIN) / 255;
const zeroPoint = Math.round(-ACT_MIN / asymScale);
const symmetricUse = (ACT_MAX - ACT_MIN) / (2 * Math.max(Math.abs(ACT_MIN), Math.abs(ACT_MAX)));

const lesson: LessonContent = {
  id: "11-11",
  subtitle: "Guardar números com menos bits: formatos de ponto flutuante, a escala absmax, o erro de ida e volta, o estrago de um valor extremo e a quantização em blocos.",
  objectives: [
    "Comparar fp32, fp16, bf16, int8 e int4 em memória, faixa e precisão",
    "Quantizar e dequantizar pesos com absmax e medir o erro",
    "Explicar por que um valor extremo estraga a escala e como os blocos resolvem",
    "Diferenciar quantização simétrica e assimétrica (zero-point)",
  ],
  steps: [
    {
      id: "ruler",
      shortTitle: "Régua",
      title: "Uma régua com menos marcas",
      tag: "context",
      body: [
        "Uma régua com marcas de milímetro mede com precisão. Uma régua só com marcas de centímetro é mais simples de ler e de guardar, mas cada medida é arredondada para a marca mais próxima. Se o objeto tem 3,4 cm, ela diz 3. Quantizar é trocar a régua fina por uma com menos marcas.",
        `Um peso em fp32 usa 4 bytes. Em [[bf16|bfloat16]], 2; em int8, 1; em int4, meio byte. No Llama 2 7B, isso vai de ${fixed(sizeGb(4), 1)} GB para ${fixed(sizeGb(0.5), 1)} GB. A [[quantização|quantization]] é escolher quantos bits cada número recebe e como mapear o valor real para as marcas disponíveis.`,
      ],
      keyIdea: "Menos bits por número: menos memória e banda, ao custo de arredondar cada valor.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "fp32", kind: "llm", label: `fp32: ${fixed(sizeGb(4), 1)} gb`, col: 0, row: 0 },
              { id: "quantize", kind: "app", label: "quantizar", col: 1, row: 0 },
              { id: "int4", kind: "llm", label: `int4: ${fixed(sizeGb(0.5), 1)} gb`, col: 2, row: 0 },
              { id: "gpu", kind: "memory", label: "cabe na vram", col: 3, row: 0 },
              { id: "error", kind: "eval", label: "medir o erro", col: 2, row: 1 },
            ],
            edges: [
              { from: "fp32", to: "quantize" },
              { from: "quantize", to: "int4", label: "8 × menor" },
              { from: "int4", to: "gpu" },
              { from: "int4", to: "error" },
            ],
            active: "quantize",
          },
        ],
      },
      alt: `O Llama 2 7B em fp32, com ${fixed(sizeGb(4), 1)} GB, passa pela quantização, em destaque, e vira ${fixed(sizeGb(0.5), 1)} GB em int4, que cabe na VRAM; o erro precisa ser medido.`,
    },
    {
      id: "floats",
      shortTitle: "fp16 e bf16",
      title: "fp16 e bf16: mesmos 16 bits, divisão diferente",
      tag: "mechanism",
      body: [
        `Um número de ponto flutuante tem sinal, expoente (a faixa) e mantissa (a precisão). O fp16 usa 5 bits de expoente e 10 de mantissa: passo relativo de 2⁻¹⁰ ≈ ${fixed(fp16Epsilon, 4)}, mas o maior valor é ${fp16Max.toLocaleString("pt-BR")}. Gradientes e ativações grandes estouram, e o treino em fp16 precisa de escala de perda.`,
        `O bf16 usa 8 bits de expoente, como o fp32, e 7 de mantissa: vai até cerca de 2¹²⁸ (o expoente máximo é ${bf16MaxExponent}), com passo relativo de 2⁻⁷ ≈ ${fixed(bf16Epsilon, 4)}. Perde precisão, mas não estoura. Por isso o [[treino em precisão mista|mixed-precision]] de LLMs usa bf16 e o QLoRA calcula em bf16.`,
      ],
      keyIdea: "fp16 tem mais precisão e pouca faixa; bf16 tem a faixa do fp32 e menos precisão.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          { id: "fp16", piece: "token-stream", tokens: ["fp16", "sinal 1", "expoente 5", "mantissa 10"], bars: [0, 0.1, 0.5, 1], color: "muted" },
          { id: "bf16", piece: "token-stream", tokens: ["bf16", "sinal 1", "expoente 8", "mantissa 7"], bars: [0, 0.1, 0.8, 0.7], color: "module-11" },
        ],
      },
      alt: "Divisão dos 16 bits: o fp16 tem 1 bit de sinal, 5 de expoente e 10 de mantissa; o bf16 tem 1 de sinal, 8 de expoente e 7 de mantissa.",
    },
    {
      id: "absmax",
      shortTitle: "Absmax",
      title: "Escala, arredonda, volta",
      tag: "mechanism",
      body: [
        `A [[quantização absmax|absmax-quantization]] divide pelo maior valor absoluto e escala para a faixa do inteiro. Nos ${weights.length} pesos da cena, o maior é ${fixed(Math.max(...weights.map(Math.abs)))}, então s = 127 / ${fixed(Math.max(...weights.map(Math.abs)))} ≈ ${fixed(int8Scale, 1)}. Cada peso vira q = round(w · s), um inteiro de −127 a 127, e volta como w' = q / s.`,
        `A diferença entre w e w' é o [[erro de quantização|quantization-error]]. Em int8, o erro médio é ${fixed(int8Error, 4)}: quase nada. Em int4, com só 15 níveis de −7 a 7, sobe para ${fixed(int4Error, 4)}, ${Math.round(int4Error / int8Error)} vezes maior. Guardar q e s basta para reconstruir: a escala é um número por grupo de pesos.`,
      ],
      keyIdea: "q = round(w · s) e w' = q / s; o erro cresce rápido quando os níveis ficam poucos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "roundtrip",
            piece: "matrix",
            rows: ["peso w", "volta w'", "erro"],
            cols: int8.map((row) => `q=${row.q}`),
            values: [
              int8.map((row) => Number(row.weight.toFixed(2))),
              int8.map((row) => Number(row.restored.toFixed(2))),
              int8.map((row) => Number(row.error.toFixed(2))),
            ],
            scale: { min: -1, max: 1 },
            highlight: { row: 0, col: 3 },
            showValues: true,
            color: "module-11",
          },
        ],
      },
      alt: `Matriz com os ${weights.length} pesos, um por coluna, rotulada pelo inteiro int8 de cada um (${int8.map((row) => row.q).join(", ")}), com o peso original, o valor reconstruído e o erro, que fica perto de zero. Em destaque, o maior peso, que vira 127.`,
    },
    {
      id: "outlier",
      shortTitle: "Valor extremo",
      title: "Um valor extremo estraga a escala de todos",
      tag: "example",
      body: [
        `Troque o peso w${OUTLIER_INDEX + 1} por ${fixed(OUTLIER, 1)}, um valor extremo, e quantize em int4. A escala agora é 7 / ${fixed(OUTLIER, 1)}: cada nível vale quase 1. Dos outros ${weights.length - 1} pesos, ${zeroed} viram 0, e o erro médio deles sobe de ${fixed(int4ErrorOthers, 3)} para ${fixed(outlierErrorOthers, 3)}. O extremo fica perfeito; os normais perdem quase tudo.`,
        "Valores extremos não são raros: LLMs têm algumas dimensões de ativação com valores muito maiores que as outras, e alguns pesos grandes. Esse é o motivo de quase todo método prático usar uma escala por grupo pequeno de valores, e de alguns guardarem os extremos à parte em 16 bits, como o LLM.int8().",
      ],
      keyIdea: "Com uma escala só, o maior valor define o tamanho do nível e esmaga todos os outros.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "errors",
            piece: "chart",
            kind: "bar",
            series: outlierRows.map((row, index) => ({ label: `w${index + 1}`, value: Number(row.error.toFixed(3)) })),
            highlight: OUTLIER_INDEX,
            color: "danger",
          },
        ],
      },
      alt: `Erro de cada peso em int4 com um valor extremo de ${fixed(OUTLIER, 1)} em w${OUTLIER_INDEX + 1}: o extremo tem erro zero e os outros chegam a ${fixed(Math.max(...outlierRows.map((row) => row.error)), 2)}, com média de ${fixed(outlierErrorOthers, 3)}.`,
    },
    {
      id: "blocks",
      shortTitle: "Blocos",
      title: "Uma escala por bloco",
      tag: "mechanism",
      body: [
        `Na [[quantização em blocos|block-wise-quantization]], os pesos são divididos em blocos pequenos, cada um com a própria escala. Com blocos de ${BLOCK}, o extremo estraga só o segundo bloco: o primeiro fica com erro médio de ${fixed(cleanBlockError, 3)}, e o segundo, com ${fixed(dirtyBlockError, 3)}. O erro médio dos pesos normais cai de ${fixed(outlierErrorOthers, 3)} para ${fixed(blockErrorOthers, 3)}.`,
        "Blocos menores erram menos e custam mais escalas: com uma escala de 32 bits a cada 64 pesos, são 0,5 bit a mais por peso, a conta que a double quantization do QLoRA reduz. Os formatos de inferência que o módulo 10 apresenta, como [[GPTQ|gptq]], [[AWQ|awq]] e os do llama.cpp, são variações dessa ideia com escolhas melhores das escalas e dos arredondamentos.",
      ],
      keyIdea: "Escalas por bloco isolam os valores extremos, pagando alguns bits por bloco.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "block-metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "single", label: "uma escala: erro dos normais", value: fixed(outlierErrorOthers, 3), color: "danger" },
              { id: "blocks", label: `blocos de ${BLOCK}: erro dos normais`, value: fixed(blockErrorOthers, 3), color: "module-11" },
              { id: "clean", label: "bloco sem extremo", value: fixed(cleanBlockError, 3), color: "success" },
            ],
            highlight: "blocks",
          },
          {
            id: "block-flow",
            piece: "block-diagram",
            blocks: [
              { id: "weights", kind: "embedding", label: `${weights.length} pesos`, col: 0, row: 0.5 },
              { id: "block-1", kind: "memory", label: "bloco 1, escala s₁", col: 1, row: 0 },
              { id: "block-2", kind: "memory", label: "bloco 2, escala s₂", col: 1, row: 1 },
              { id: "restore", kind: "eval", label: "dequantizar", col: 2, row: 0.5 },
            ],
            edges: [
              { from: "weights", to: "block-1" },
              { from: "weights", to: "block-2", label: "extremo aqui" },
              { from: "block-1", to: "restore", label: "erro baixo" },
              { from: "block-2", to: "restore", label: "erro alto", variant: "alternative" },
            ],
            active: "block-1",
          },
        ],
      },
      alt: `Os ${weights.length} pesos divididos em dois blocos de ${BLOCK}, cada um com a sua escala. O bloco sem o extremo, em destaque, fica com erro de ${fixed(cleanBlockError, 3)}; o erro médio dos pesos normais cai de ${fixed(outlierErrorOthers, 3)} para ${fixed(blockErrorOthers, 3)}.`,
    },
    {
      id: "zero-point",
      shortTitle: "Zero-point",
      title: "Quando os valores não são centrados",
      tag: "tradeoff",
      body: [
        `Pesos ficam em volta de zero, e a escala simétrica serve. Ativações, não: depois de algumas funções, ficam quase todas positivas. Para valores entre ${fixed(ACT_MIN, 1)} e ${fixed(ACT_MAX, 1)}, a escala simétrica cobre de −${fixed(ACT_MAX, 1)} a ${fixed(ACT_MAX, 1)} e usa só ${percent(symmetricUse)} dos níveis. A assimétrica usa s = (máx − mín) / 255 = ${fixed(asymScale, 4)} e um [[zero-point|zero-point]] = ${zeroPoint}, o inteiro que representa o zero real, e usa a faixa toda.`,
        "Há ainda a escolha de quando quantizar. Quantizar depois do treino é rápido e quase sempre basta em 8 bits; em 4 bits ou menos, o erro pesa mais, e métodos que treinam já vendo a quantização, ou que calibram com dados, recuperam qualidade. Em qualquer caso, a regra é medir: compare o modelo quantizado com o original no seu conjunto de avaliação.",
      ],
      keyIdea: "Simétrica para valores centrados em zero; assimétrica, com zero-point, para faixas deslocadas.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "sizes",
            piece: "chart",
            kind: "bar",
            series: formats.map((format) => ({ label: format.label, value: Number(sizeGb(format.bytes).toFixed(1)) })),
            highlight: 3,
            color: "module-11",
          },
        ],
      },
      alt: `Tamanho do Llama 2 7B por formato: ${formats.map((format) => `${format.label} ${fixed(sizeGb(format.bytes), 1)} GB`).join(", ")}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Bits, escala, erro",
      tag: "summary",
      body: [
        "Escolha os bits pelo uso: bf16 para treinar, int8 ou 4 bits para guardar e servir. Quantize com escala absmax, ou com zero-point quando a faixa é deslocada; use escalas por bloco para isolar valores extremos; e meça o erro e a qualidade no fim.",
        "Com o ajuste pronto em LoRA, QLoRA ou PEFT, falta saber se ele está aprendendo de verdade. A próxima aula acompanha o treino pelas curvas de perda de treino e de validação.",
      ],
      keyIdea: "Formato → escala (simétrica ou com zero-point) → blocos → medir.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "checklist",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "format", label: "formato: bf16, int8, 4 bits" },
              { id: "scale", label: "escala: absmax ou zero-point" },
              { id: "blocks", label: "escala por bloco", color: "module-11" },
              { id: "measure", label: "medir erro e qualidade" },
            ],
          },
        ],
      },
      alt: "Chips: formato bf16, int8 ou 4 bits; escala absmax ou zero-point; escala por bloco, em destaque; medir erro e qualidade.",
    },
  ],
  realWorldExample:
    "O LLM.int8() (Dettmers et al., 2022) quantiza as multiplicações de matrizes em 8 bits com uma escala por linha e por coluna, e separa as poucas dimensões com valores extremos para calcular em 16 bits. Com isso, modelos de até 175B rodam em int8 sem perda de qualidade nos testes do paper.",
  code: {
    language: "python",
    source: `import numpy as np

w = np.array([0.12, -0.45, 0.03, 0.88, -0.27, 0.51, -0.09, 0.34])

def absmax_roundtrip(w, bits=8):
    q_max = 2 ** (bits - 1) - 1          # 127 em int8, 7 em int4
    scale = q_max / np.abs(w).max()
    q = np.round(w * scale).astype(np.int8)
    return q, q / scale

q, w_back = absmax_roundtrip(w, bits=4)
print(q, np.abs(w - w_back).mean())`,
    caption: "Quantização absmax de ida e volta: o vetor de inteiros e o erro médio. Troque bits=4 por 8 e compare o erro.",
  },
  tradeOffs: {
    pros: [
      "Menos memória e menos banda: o modelo cabe em GPUs menores e roda mais rápido",
      "Em 8 bits, o erro costuma ser desprezível",
      "Escalas por bloco isolam valores extremos com pouco custo",
    ],
    cons: [
      "Em 4 bits ou menos, a qualidade cai e precisa ser medida",
      "As escalas ocupam bits a mais por peso",
      "Contas em inteiro dependem de suporte da GPU e de kernels específicos",
    ],
    alternatives: ["Modelos menores em 16 bits", "Destilação para um modelo menor"],
  },
  knowledgeCheck: [
    {
      id: "scale-calc",
      prompt: "Um bloco de pesos tem maior valor absoluto 0,5. Em int8 absmax, qual inteiro representa o peso 0,25?",
      options: ["25", "64", "127", "0"],
      correct: 1,
      explanation: "s = 127 / 0,5 = 254, e q = round(0,25 × 254) = round(63,5) = 64.",
      lesson: "11-11",
    },
    {
      id: "outlier-fix",
      prompt: "Depois de quantizar uma camada em 4 bits com uma escala só, quase todos os pesos viraram zero. Qual a causa provável e a correção?",
      options: [
        "Bits demais; usar 2 bits",
        "Um valor extremo dominou a escala; usar escalas por bloco pequeno",
        "Faltou zero-point; usar fp32",
        "O modelo foi mal treinado; treinar de novo",
      ],
      correct: 1,
      explanation: "Com uma escala só, o maior valor define o tamanho do nível. Blocos pequenos com escala própria isolam o extremo no próprio bloco.",
      lesson: "11-11",
    },
  ],
  related: ["02-10", "10-09", "11-09"],
  references: [
    { title: "Nagel et al. (2021), A White Paper on Neural Network Quantization", url: "https://arxiv.org/abs/2106.08295", kind: "paper" },
    { title: "Dettmers et al. (2022), LLM.int8(): 8-bit Matrix Multiplication for Transformers at Scale", url: "https://arxiv.org/abs/2208.07339", kind: "paper" },
    { title: "Jacob et al. (2017), Quantization and Training of Neural Networks for Efficient Integer-Arithmetic-Only Inference", url: "https://arxiv.org/abs/1712.05877", kind: "paper" },
  ],
};

export default lesson;
