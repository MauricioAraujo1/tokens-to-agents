import type { LessonContent } from "../../../types/content";

// Quantização com as contas no arquivo: a quantização simétrica de 8 pesos de brinquedo em int8 e int4
// (escala = maior |w| / maior inteiro, q = round(w / escala), volta = q · escala), o efeito de um valor
// extremo com uma escala por tensor e com uma escala por grupo, a memória de modelos de 7B e 70B em cada
// precisão (com o custo das escalas de grupo, 16 bits a cada 128 pesos) e o teto de tokens por segundo no
// decode, que é a banda de memória da H100 (3,35 TB/s, página da NVIDIA) dividida pelos bytes dos pesos.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).replace("-", "−");
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const percent = (value: number) => `${Math.round(value * 100)}%`;
const mean = (values: number[]) => values.reduce((total, value) => total + value, 0) / values.length;

/** Quantização simétrica: o maior |w| vira o maior inteiro positivo, o zero continua zero. */
const quantize = (weights: number[], maxInt: number) => {
  const scale = Math.max(...weights.map(Math.abs)) / maxInt;
  const codes = weights.map((weight) => Math.max(-maxInt, Math.min(maxInt, Math.round(weight / scale))));
  const restored = codes.map((code) => code * scale);
  const error = mean(weights.map((weight, index) => Math.abs(weight - restored[index])));
  return { scale, codes, restored, error };
};
const INT8_MAX = 127;
const INT4_MAX = 7;

// Passo 2: 8 pesos de uma linha de matriz.
const weights = [0.42, -1.27, 0.08, 0.91, -0.35, 1.53, -0.66, 0.19];
const int8 = quantize(weights, INT8_MAX);
const int4 = quantize(weights, INT4_MAX);
const round2 = (values: number[]) => values.map((value) => Number(value.toFixed(2)));
const SAMPLE = 2;

// Passo 3: um peso extremo no meio de pesos pequenos, em int4.
const GROUP = 4;
const withOutlier = [0.12, -0.08, 0.05, 8.0, -0.1, 0.07, 0.03, -0.11];
const perTensor = quantize(withOutlier, INT4_MAX);
const groups = Array.from({ length: withOutlier.length / GROUP }, (_, index) =>
  quantize(withOutlier.slice(index * GROUP, (index + 1) * GROUP), INT4_MAX),
);
const perGroupRestored = groups.flatMap((group) => group.restored);
const perGroupError = mean(withOutlier.map((weight, index) => Math.abs(weight - perGroupRestored[index])));
const zeroedPerTensor = withOutlier.filter((weight, index) => weight !== 0 && perTensor.codes[index] === 0).length;
const zeroedPerGroup = withOutlier.filter((weight, index) => weight !== 0 && perGroupRestored[index] === 0).length;
const smallCount = withOutlier.filter((weight) => Math.abs(weight) < 1).length;

// Passo 4: memória dos pesos. Em int4 por grupo de 128, cada grupo leva uma escala de 16 bits.
const GB = 1e9;
const GROUP_SIZE = 128;
const SCALE_BITS = 16;
const INT4_BITS = 4 + SCALE_BITS / GROUP_SIZE;
const precisions = [
  { id: "fp16", bits: 16 },
  { id: "int8", bits: 8 },
  { id: "int4", bits: INT4_BITS },
];
const models = [
  { label: "7B", params: 7e9 },
  { label: "70B", params: 70e9 },
];
const weightGB = (params: number, bits: number) => (params * bits) / 8 / GB;
const H100_GB = 80;
const memorySeries = models.flatMap((model) =>
  precisions.map((precision) => ({ label: `${model.label} ${precision.id}`, value: Number(weightGB(model.params, precision.bits).toFixed(1)) })),
);
const seventyFp16 = weightGB(70e9, 16);
const seventyInt4 = weightGB(70e9, INT4_BITS);
const fitsCount = memorySeries.filter((item) => item.value < H100_GB).length;

// Teto de tokens por segundo no decode com lote 1: cada token relê todos os pesos.
const BANDWIDTH = 3.35e12;
const ceiling = (bits: number) => BANDWIDTH / (weightGB(7e9, bits) * GB);
const ceilingFp16 = ceiling(16);
const ceilingInt8 = ceiling(8);
const ceilingInt4 = ceiling(INT4_BITS);

const lesson: LessonContent = {
  id: "10-09",
  subtitle: "Como guardar cada peso com 8 ou 4 bits em vez de 16, quanto isso economiza de memória e de tempo no decode e onde a qualidade pode cair.",
  objectives: [
    "Quantizar um vetor de pesos em int8 e int4 com uma escala simétrica",
    "Explicar por que um valor extremo estraga a escala e como os grupos resolvem",
    "Calcular a memória de um modelo em fp16, int8 e int4, contando as escalas",
    "Diferenciar GPTQ, AWQ e GGUF e saber quando usar cada um",
  ],
  steps: [
    {
      id: "fit",
      shortTitle: "Não cabe",
      title: "O modelo não cabe na GPU",
      tag: "context",
      body: [
        `Uma foto de 12 megapixels pesa muito, mas uma versão em JPEG parece quase igual e cabe no WhatsApp. Com modelos é parecido. Um modelo de 70B em fp16 ocupa ${integer(seventyFp16)} GB só de pesos, e uma H100 tem ${H100_GB} GB: não cabe em uma GPU só.`,
        `[[Quantização|quantization]] é guardar cada peso com menos bits. Em int4, com as escalas, o mesmo modelo ocupa ${fixed(seventyInt4, 1)} GB e cabe com folga para o [[KV cache|kv-cache]]. Como o [[decode|decode]] relê todos os pesos a cada token, menos bytes também quer dizer mais tokens por segundo.`,
      ],
      keyIdea: "Quantizar troca um pouco de precisão por memória e por velocidade.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "fp16", kind: "memory", label: `70b fp16: ${integer(seventyFp16)} gb`, col: 0, row: 0 },
              { id: "nofit", kind: "no-result", label: `h100: ${H100_GB} gb`, col: 2, row: 0 },
              { id: "quant", kind: "tool", label: "quantizar", col: 1, row: 1 },
              { id: "int4", kind: "memory", label: `int4: ${integer(seventyInt4)} gb`, col: 2, row: 1 },
              { id: "gpu", kind: "server", label: "1 h100", col: 3, row: 1 },
            ],
            edges: [
              { from: "fp16", to: "nofit", label: "não cabe", variant: "alternative" },
              { from: "fp16", to: "quant" },
              { from: "quant", to: "int4", label: "4 bits" },
              { from: "int4", to: "gpu", label: "cabe" },
            ],
            active: "quant",
          },
        ],
      },
      alt: `Os pesos do modelo de 70B em fp16, ${integer(seventyFp16)} GB, não cabem numa H100 de ${H100_GB} GB, no caminho tracejado. Quantizados em 4 bits, em destaque, viram ${integer(seventyInt4)} GB e cabem numa GPU.`,
    },
    {
      id: "round",
      shortTitle: "Arredondar",
      title: "Uma régua com 255 ou 15 marcas",
      tag: "mechanism",
      body: [
        `A [[quantização simétrica|absmax-quantization]] usa uma régua. O maior peso em valor absoluto, ${fixed(Math.max(...weights.map(Math.abs)))}, vira o maior inteiro: 127 em int8, 7 em int4. A escala é esse peso dividido pelo inteiro: ${fixed(int8.scale, 4)} em int8 e ${fixed(int4.scale, 4)} em int4. Cada peso é dividido pela escala e arredondado: ${fixed(weights[SAMPLE])} vira ${int8.codes[SAMPLE]} em int8 e ${int4.codes[SAMPLE]} em int4.`,
        `Na hora da conta, o inteiro volta multiplicado pela escala. A cena mostra os pesos de volta: em int8, o erro médio é ${fixed(int8.error, 4)}, quase nada; em int4, com só 15 marcas na régua, é ${fixed(int4.error, 3)}. Na [[quantização só dos pesos|weight-only-quantization]], o mais comum em LLMs, os pesos ficam em 4 ou 8 bits na memória e as contas continuam em 16 bits.`,
      ],
      keyIdea: "Escala = maior |w| / maior inteiro. Menos bits, marcas mais espaçadas, erro maior.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "error",
            piece: "metrics-panel",
            metrics: [
              { id: "scale8", label: "escala int8", value: fixed(int8.scale, 4) },
              { id: "scale4", label: "escala int4", value: fixed(int4.scale, 4) },
              { id: "err8", label: "erro médio int8", value: fixed(int8.error, 4), color: "success" },
              { id: "err4", label: "erro médio int4", value: fixed(int4.error, 3), color: "danger" },
            ],
            highlight: "err4",
          },
          {
            id: "weights",
            piece: "matrix",
            rows: ["fp16", "int8", "int4"],
            cols: weights.map((_, index) => `w${index + 1}`),
            values: [round2(weights), round2(int8.restored), round2(int4.restored)],
            highlight: { row: 2, col: SAMPLE },
            showValues: true,
            color: "module-10",
          },
        ],
      },
      alt: `Matriz com os 8 pesos originais e os mesmos pesos depois de ir e voltar de int8 e int4. O erro médio é ${fixed(int8.error, 4)} em int8 e ${fixed(int4.error, 3)} em int4; o peso ${fixed(weights[SAMPLE])}, em destaque, vira ${fixed(int4.restored[SAMPLE])} em int4.`,
    },
    {
      id: "outlier",
      shortTitle: "Outlier",
      title: "Um peso gigante estraga a régua de todos",
      tag: "mechanism",
      body: [
        `Agora um dos pesos vale ${fixed(withOutlier[3], 1)} e os outros ficam perto de zero. Com uma escala só para o vetor inteiro, em int4, cada marca da régua vale ${fixed(perTensor.scale, 2)}: ${zeroedPerTensor} dos ${smallCount} pesos pequenos viram zero, e o erro médio vai a ${fixed(perTensor.error, 3)}. Os LLMs têm esses valores extremos de verdade, em poucos canais.`,
        `A [[quantização por grupo|block-wise-quantization]] dá uma escala para cada grupo de pesos vizinhos. Com grupos de ${GROUP}, o grupo sem o extremo ganha uma régua fina e só os ${zeroedPerGroup} pesos que dividem o grupo com ele viram zero. O erro médio cai para ${fixed(perGroupError, 3)}, ${percent(1 - perGroupError / perTensor.error)} a menos. Nos modelos reais, o grupo típico é de ${GROUP_SIZE} pesos, e cada escala guardada custa ${SCALE_BITS} bits a mais por grupo.`,
      ],
      keyIdea: "Escalas por grupo isolam o valor extremo: ele só estraga a régua do próprio grupo.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "vector",
            piece: "token-stream",
            tokens: withOutlier.map((weight) => fixed(weight)),
            bars: withOutlier.map((weight) => Math.abs(weight) / Math.max(...withOutlier.map(Math.abs))),
            query: 3,
            color: "module-10",
          },
          {
            id: "error",
            piece: "metrics-panel",
            metrics: [
              { id: "tensor", label: "escala por vetor", value: `erro ${fixed(perTensor.error, 3)}`, color: "danger" },
              { id: "group", label: `escala por grupo de ${GROUP}`, value: `erro ${fixed(perGroupError, 3)}`, color: "success" },
              { id: "zeros", label: "pesos zerados", value: `${zeroedPerTensor} → ${zeroedPerGroup}` },
            ],
            highlight: "group",
          },
        ],
      },
      alt: `Oito pesos com barras do valor absoluto; o peso ${fixed(withOutlier[3], 1)}, em destaque, domina. Com uma escala por vetor em int4, ${zeroedPerTensor} pesos pequenos viram zero e o erro médio é ${fixed(perTensor.error, 3)}; com uma escala por grupo de ${GROUP}, ${zeroedPerGroup} viram zero e o erro cai para ${fixed(perGroupError, 3)}.`,
    },
    {
      id: "memory",
      shortTitle: "Memória",
      title: "Quanto cada precisão ocupa",
      tag: "example",
      body: [
        `Memória dos pesos = parâmetros × bits por peso / 8. Em int4 por grupo de ${GROUP_SIZE}, cada peso custa 4 + ${SCALE_BITS} / ${GROUP_SIZE} = ${fixed(INT4_BITS, 3)} bits. Na cena, ${fitsCount} das ${memorySeries.length} combinações cabem numa H100 de ${H100_GB} GB. O 70B em fp16 fica de fora; em int8, com ${integer(weightGB(70e9, 8))} GB, cabe, mas sobra quase nada para o KV cache. Só em int4 ele cabe com folga.`,
        `A velocidade vem junto. No decode com um pedido por vez, cada token relê todos os pesos, e o teto é a [[banda de memória|memory-bandwidth]] dividida pelos bytes: o 7B sai de ${integer(ceilingFp16)} tokens/s em fp16 para ${integer(ceilingInt8)} em int8 e ${integer(ceilingInt4)} em int4, numa H100 de 3,35 TB/s. São tetos: o motor real perde para kernels, atenção e o trabalho de desfazer a escala.`,
      ],
      keyIdea: "Metade dos bits, metade da memória e, no decode, quase o dobro de tokens por segundo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "memory",
            piece: "chart",
            kind: "bar",
            series: memorySeries,
            cutoff: { mode: "threshold", value: H100_GB, label: `${H100_GB} GB: acima não cabe` },
            highlight: memorySeries.length - 1,
            color: "module-10",
          },
        ],
      },
      alt: `Memória dos pesos: ${memorySeries.map((item) => `${item.label} ${fixed(item.value, 1)} GB`).join(", ")}. A linha de ${H100_GB} GB separa o que cabe numa H100: só o 70B em fp16 fica acima, e o 70B em int8 fica perto do limite.`,
    },
    {
      id: "methods",
      shortTitle: "Métodos",
      title: "GPTQ, AWQ e GGUF",
      tag: "tradeoff",
      body: [
        `Arredondar cada peso sozinho, como na cena anterior, funciona bem em int8 e perde qualidade em int4. Os métodos pós-treino usam um conjunto pequeno de textos de calibração. O [[GPTQ|gptq]] arredonda os pesos de uma camada um a um e corrige os que faltam para compensar o erro; o paper quantiza modelos de 175B para 3 ou 4 bits em cerca de quatro horas de GPU, com pouca perda. O [[AWQ|awq]] olha as ativações: os autores mostram que proteger só 1% dos pesos, os dos canais mais ativos, já reduz muito o erro.`,
        `[[GGUF|gguf]] não é um método, é um formato: o arquivo do [[llama.cpp|llama-cpp]], com pesos em blocos quantizados (nomes como Q8_0 e Q4_K_M), tokenizador e metadados juntos, feito para rodar em CPU e notebook. O preço de qualquer um deles é o mesmo: medir. Compare a [[perplexidade|perplexity]] e, melhor, a sua avaliação da tarefa antes e depois; tarefas de raciocínio longo e de código costumam sofrer antes.`,
      ],
      keyIdea: "GPTQ e AWQ escolhem como arredondar; GGUF é como o resultado é guardado para o llama.cpp.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "model", kind: "llm", label: "modelo fp16", col: 0, row: 0 },
              { id: "calib", kind: "documents", label: "calibração", col: 0, row: 1 },
              { id: "method", kind: "eval", label: "gptq / awq", col: 1, row: 0.5 },
              { id: "int4", kind: "memory", label: "int4 + escalas", col: 2, row: 0.5 },
              { id: "gpu", kind: "server", label: "motor na gpu", col: 3, row: 0 },
              { id: "laptop", kind: "laptop", label: "gguf no notebook", col: 3, row: 1 },
            ],
            edges: [
              { from: "model", to: "method", label: "pesos" },
              { from: "calib", to: "method", label: "ativações" },
              { from: "method", to: "int4" },
              { from: "int4", to: "gpu" },
              { from: "int4", to: "laptop", label: "llama.cpp" },
            ],
            active: "method",
          },
        ],
      },
      alt: "O modelo em fp16 e um conjunto de textos de calibração entram no GPTQ ou no AWQ, em destaque, que produzem pesos int4 com escalas; eles rodam num motor na GPU ou, em GGUF, num notebook com llama.cpp.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Menos bits, medidos",
      tag: "summary",
      body: [
        "Quantizar é guardar pesos com 8 ou 4 bits e uma escala, voltando ao valor aproximado na hora da conta. A memória cai na proporção dos bits, o decode acelera porque lê menos bytes, e as escalas por grupo protegem contra os valores extremos. GPTQ e AWQ arredondam com a ajuda de dados de calibração; GGUF empacota o resultado para o llama.cpp.",
        "Quantizar não é a única forma de encolher um modelo. A próxima aula junta a quantização com a poda e a destilação, as outras técnicas de compressão.",
      ],
      keyIdea: "Escolha os bits pela memória disponível e confirme a qualidade com a sua avaliação.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "steps",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "measure", label: "medir a memória" },
              { id: "bits", label: "escolher os bits" },
              { id: "calibrate", label: "calibrar (gptq / awq)", color: "module-10" },
              { id: "eval", label: "avaliar a tarefa" },
              { id: "serve", label: "servir", color: "brand" },
            ],
          },
        ],
      },
      alt: "Fluxo em chips: medir a memória, escolher os bits, calibrar com GPTQ ou AWQ, avaliar a tarefa e servir.",
    },
  ],
  realWorldExample:
    "No Hugging Face Hub, muitos modelos abertos têm versões quantizadas publicadas ao lado dos pesos originais: repositórios GPTQ e AWQ para servir em GPU com motores como o vLLM, e arquivos GGUF com nomes como Q8_0 e Q4_K_M para o llama.cpp e o Ollama. A documentação do Hub descreve os tipos de quantização do GGUF, e o mesmo modelo aparece em vários tamanhos de arquivo para caber em máquinas diferentes.",
  code: {
    language: "python",
    source: `def quantize(weights, max_int):
    """Quantização simétrica: max_int = 127 (int8) ou 7 (int4)."""
    scale = max(abs(w) for w in weights) / max_int
    codes = [max(-max_int, min(max_int, round(w / scale))) for w in weights]
    return scale, codes

weights = [0.42, -1.27, 0.08, 0.91, -0.35, 1.53, -0.66, 0.19]
scale, codes = quantize(weights, 7)
print(codes)                       # inteiros de 4 bits
print([c * scale for c in codes])  # pesos de volta, aproximados`,
    caption: "A conta da cena: escala pelo maior peso, arredondamento e o caminho de volta multiplicando pela escala.",
  },
  tradeOffs: {
    pros: [
      "Corta a memória dos pesos pela metade (int8) ou para cerca de um quarto (int4)",
      "Acelera o decode, que é limitado pelos bytes lidos da memória",
      "Libera memória para o KV cache: mais contexto ou mais pedidos ao mesmo tempo",
    ],
    cons: [
      "Perde qualidade, pouco em int8 e mais em int4, sobretudo em raciocínio e código",
      "Kernels de int4 precisam de suporte do motor e do hardware para ficar rápidos",
      "Exige avaliar de novo a cada modelo e método; perplexidade sozinha não garante a tarefa",
    ],
    alternatives: [
      "Um modelo menor em 16 bits, quando a qualidade cai demais",
      "Destilação e poda, a próxima aula",
      "Tensor parallelism em várias GPUs, mantendo os 16 bits",
    ],
  },
  knowledgeCheck: [
    {
      id: "fit-24gb",
      prompt: "Você precisa rodar um modelo de 13B numa GPU de 24 GB, com espaço para o KV cache. Qual opção faz sentido?",
      options: [
        "fp16: 26 GB, cabe com folga",
        "int8: cerca de 13 GB de pesos, sobrando uns 11 GB para o KV cache",
        "fp32, para não perder qualidade",
        "Nenhuma: quantização não muda a memória",
      ],
      correct: 1,
      explanation: "Memória = parâmetros × bytes por peso. Em fp16, 13B ocupa 26 GB e não cabe; em int8, 13 GB, com espaço para o KV cache. Int4 também caberia, com mais risco de qualidade.",
      lesson: "10-09",
    },
    {
      id: "outlier-zeroed",
      prompt: "Depois de quantizar em int4 com uma escala por matriz, muitos pesos pequenos viraram zero e a qualidade caiu. Qual é a correção mais direta?",
      options: [
        "Usar escalas por grupo de pesos (por exemplo 128) ou um método como AWQ",
        "Aumentar a temperatura na geração",
        "Trocar o tokenizador",
        "Usar uma escala ainda maior",
      ],
      correct: 0,
      explanation: "Um valor extremo deixa a régua grossa demais para os pesos pequenos. Escalas por grupo isolam o extremo, e o AWQ protege os canais mais importantes antes de arredondar.",
      lesson: "10-09",
    },
  ],
  related: ["10-08", "10-10", "11-11"],
  references: [
    { title: "Frantar et al. (2022), GPTQ: Accurate Post-Training Quantization for Generative Pre-trained Transformers", url: "https://arxiv.org/abs/2210.17323", kind: "paper" },
    { title: "Lin et al. (2023), AWQ: Activation-aware Weight Quantization for LLM Compression and Acceleration", url: "https://arxiv.org/abs/2306.00978", kind: "paper" },
    { title: "Hugging Face Hub: GGUF", url: "https://huggingface.co/docs/hub/gguf", kind: "docs" },
  ],
};

export default lesson;
