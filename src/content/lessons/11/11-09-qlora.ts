import type { BlockDiagramSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// QLoRA com as contas no arquivo. Os 16 níveis do NF4 são os da tabela do QLoRA e do bitsandbytes (Dettmers et al.,
// 2023); o int4 uniforme usa k / 7. O round-trip quantiza 8 pesos de brinquedo num bloco com escala absmax. A memória
// do Llama 2 7B sai da configuração publicada, sem ativações: ajuste completo com Adam em precisão mista a 16 bytes por
// parâmetro (2 de pesos, 2 de gradiente, 4 da cópia fp32 e 8 do Adam); LoRA com a base em bf16; QLoRA com as lineares
// em NF4 (blocos de 64 e constantes com double quantization: 8 bits por bloco de 64 e 32 bits por bloco de 256
// constantes), embeddings e cabeça em bf16. Os adaptadores são os do LoRA com r = 16 nas 7 lineares, a 16 bytes por
// parâmetro treinável.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const percent = (value: number) => `${Math.round(value * 100)}%`;
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

const NF4 = [
  -1, -0.6961928009986877, -0.5250730514526367, -0.39491748809814453, -0.28444138169288635, -0.18477343022823334,
  -0.09105003625154495, 0, 0.07958029955625534, 0.16093020141124725, 0.24611230194568634, 0.33791524171829224,
  0.44070982933044434, 0.5626170039176941, 0.7229568362236023, 1,
];
const INT4 = Array.from({ length: 15 }, (_, index) => (index - 7) / 7);
const positive = (levels: number[]) => levels.filter((level) => level > 0);

const weights = [0.021, -0.113, 0.047, 0.312, -0.068, 0.009, -0.187, 0.094];
const absmax = Math.max(...weights.map(Math.abs));
const nearest = (levels: number[], value: number) =>
  levels.reduce((best, level) => (Math.abs(level - value) < Math.abs(best - value) ? level : best));
const roundTripError = (levels: number[]) =>
  mean(weights.map((weight) => Math.abs(nearest(levels, weight / absmax) * absmax - weight)));
const nf4Error = roundTripError(NF4);
const int4Error = roundTripError(INT4);
const errorCut = 1 - nf4Error / int4Error;
const nearZeroNf4 = positive(NF4).filter((level) => level < 0.5).length;
const nearZeroInt4 = positive(INT4).filter((level) => level < 0.5).length;

// Llama 2 7B.
const D = 4096;
const FFN = 11008;
const LAYERS = 32;
const VOCAB = 32_000;
const linearParams = LAYERS * (4 * D * D + 3 * D * FFN);
const totalParams = linearParams + LAYERS * 2 * D + D + 2 * VOCAB * D;
const otherParams = totalParams - linearParams;
const loraParams = LAYERS * (4 * 16 * (D + D) + 3 * 16 * (D + FFN));

const GB = 1e9;
const BYTES_FULL_FT = 16;
const BYTES_TRAINABLE = 16;
const BYTES_BF16 = 2;
const BYTES_4BIT = 0.5;
const BLOCK = 64;
const CONSTANT_BLOCK = 256;
const constantBits = 32 / BLOCK;
const doubleQuantBits = 8 / BLOCK + 32 / (BLOCK * CONSTANT_BLOCK);
const savedBits = constantBits - doubleQuantBits;

const fullFt = (totalParams * BYTES_FULL_FT) / GB;
const loraGb = (totalParams * BYTES_BF16 + loraParams * BYTES_TRAINABLE) / GB;
const qloraGb =
  (linearParams * BYTES_4BIT + (linearParams * doubleQuantBits) / 8 + otherParams * BYTES_BF16 + loraParams * BYTES_TRAINABLE) / GB;

// 65B numa GPU de 48 GB.
const BIG = 65e9;
const GPU_GB = 48;
const bigWeights = (BIG * BYTES_4BIT) / GB;
const bigConstants = (BIG * doubleQuantBits) / 8 / GB;
const bigSaved = (BIG * savedBits) / 8 / GB;
const bigFree = GPU_GB - bigWeights - bigConstants;

const setup = (active: string, done?: string[]): BlockDiagramSpec => ({
  id: "setup",
  piece: "block-diagram",
  blocks: [
    { id: "base", kind: "llm", label: "base em nf4", col: 0, row: 0 },
    { id: "lora", kind: "embedding", label: "lora em bf16", col: 0, row: 1 },
    { id: "gpu", kind: "memory", label: "uma gpu", col: 1, row: 0.5 },
    { id: "train", kind: "server", label: "treino", col: 2, row: 0.5 },
    { id: "adapter", kind: "documents", label: "adaptador", col: 3, row: 0.5 },
  ],
  edges: [
    { from: "base", to: "gpu", label: "congelada" },
    { from: "lora", to: "gpu", label: "treina" },
    { from: "gpu", to: "train" },
    { from: "train", to: "adapter", label: "salva" },
  ],
  active,
  ...(done ? { done } : {}),
});

const lesson: LessonContent = {
  id: "11-09",
  subtitle: "LoRA sobre uma base guardada em 4 bits: o tipo NF4, a dequantização na hora da conta, a double quantization, os paged optimizers e a memória que sobra.",
  objectives: [
    "Explicar por que o NF4 erra menos que um int4 uniforme em pesos com distribuição normal",
    "Descrever o caminho de uma conta no QLoRA, do peso em 4 bits ao gradiente no adaptador",
    "Calcular a memória do ajuste completo, do LoRA e do QLoRA para um 7B",
    "Calcular a economia da double quantization",
  ],
  steps: [
    {
      id: "pocket",
      shortTitle: "Bolso",
      title: "O livro em edição de bolso, as anotações a caneta",
      tag: "context",
      body: [
        "Para estudar no ônibus, você leva a edição de bolso do livro: letra menor, papel fino, mas o conteúdo está todo lá. Suas anotações, que são o que muda, você escreve a caneta num caderno separado, com toda a clareza.",
        "O [[QLoRA|qlora]] faz isso com o ajuste. A base congelada é guardada em 4 bits, no tipo [[NF4|nf4]], ocupando um quarto da memória de 16 bits. Os [[adaptadores|adapter]] LoRA, que são o que treina, ficam em 16 bits. Assim, um modelo que precisava de várias GPUs para ajustar cabe numa só.",
      ],
      keyIdea: "Base congelada em 4 bits, adaptadores treinando em 16 bits.",
      scene: { kind: "pieces", layout: "single", pieces: [setup("gpu")] },
      alt: "A base em NF4, congelada, e os adaptadores LoRA em bf16, que treinam, cabem numa GPU, em destaque; o treino salva só o adaptador.",
    },
    {
      id: "nf4",
      shortTitle: "NF4",
      title: "Níveis onde os pesos estão",
      tag: "mechanism",
      body: [
        `Pesos de uma rede treinada se concentram perto de zero, numa forma parecida com a normal. Um int4 uniforme espalha os seus níveis por igual entre −1 e 1. O NF4 posiciona os 16 níveis pelos quantis da normal: na cena, só a metade positiva, o NF4 tem ${nearZeroNf4} níveis abaixo de 0,5, e o int4 uniforme, ${nearZeroInt4}.`,
        `Com [[quantização|quantization]] absmax num bloco de ${weights.length} pesos de brinquedo, o erro médio de ida e volta é ${fixed(nf4Error, 4)} no NF4 e ${fixed(int4Error, 4)} no int4 uniforme: ${percent(errorCut)} menor, com os mesmos 4 bits. A aula 11.11 detalha a escala e o erro de quantização.`,
      ],
      keyIdea: "NF4 gasta os 16 níveis onde há mais pesos, perto de zero, e erra menos com os mesmos 4 bits.",
      scene: {
        kind: "pieces",
        layout: "row",
        pieces: [
          {
            id: "nf4-levels",
            piece: "chart",
            kind: "bar",
            series: positive(NF4).map((level, index) => ({ label: `n${index + 1}`, value: Number(level.toFixed(3)) })),
            max: 1,
            color: "module-11",
          },
          {
            id: "int4-levels",
            piece: "chart",
            kind: "bar",
            series: positive(INT4).map((level, index) => ({ label: `u${index + 1}`, value: Number(level.toFixed(3)) })),
            max: 1,
            color: "muted",
          },
        ],
      },
      alt: `Níveis positivos do NF4, mais densos perto de zero, ao lado dos níveis do int4 uniforme, igualmente espaçados. Erro médio de ida e volta: ${fixed(nf4Error, 4)} no NF4 e ${fixed(int4Error, 4)} no int4.`,
    },
    {
      id: "compute",
      shortTitle: "A conta",
      title: "Guardar em 4 bits, calcular em 16",
      tag: "mechanism",
      body: [
        "A GPU não multiplica em NF4. Em cada camada, o bloco de pesos é dequantizado para bf16 na hora (nível × escala do bloco), a multiplicação acontece em 16 bits, e a saída do LoRA é somada. Os pesos em 4 bits voltam a ser só armazenamento.",
        "No backward, o gradiente atravessa a base dequantizada até a entrada de cada camada, mas só A e B recebem atualização: a base nunca muda, então não precisa de gradiente próprio nem de estado do Adam. O preço é tempo: dequantizar em toda conta deixa cada passo mais lento que o LoRA em bf16.",
      ],
      keyIdea: "NF4 é o formato de armazenamento; a conta e o gradiente acontecem em bf16.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "path",
            piece: "pipeline",
            stages: [
              { id: "store", label: "pesos NF4" },
              { id: "dequant", label: "dequantizar bloco" },
              { id: "matmul", label: "matmul bf16" },
              { id: "lora", label: "+ LoRA", color: "module-11" },
              { id: "grad", label: "gradiente em A e B" },
            ],
            active: "lora",
            done: ["store", "dequant", "matmul"],
          },
        ],
      },
      alt: "Caminho de uma conta: pesos em NF4, dequantização do bloco, multiplicação em bf16, soma do LoRA, em destaque, e gradiente só em A e B.",
    },
    {
      id: "memory",
      shortTitle: "Memória",
      title: "Quanto cabe numa GPU: o Llama 2 7B",
      tag: "example",
      body: [
        `O ajuste completo com Adam em precisão mista guarda 16 bytes por parâmetro: pesos e gradientes em 16 bits, a cópia em fp32 e os dois momentos do Adam. No Llama 2 7B, ${fixed(fullFt, 1)} GB, sem contar as ativações. O LoRA em bf16 guarda a base em 2 bytes e só os ${fixed(loraParams / 1e6, 1)} milhões de parâmetros do adaptador a 16 bytes: ${fixed(loraGb, 1)} GB.`,
        `O QLoRA guarda as camadas lineares em NF4 e deixa embeddings e a cabeça de saída em bf16: ${fixed(qloraGb, 1)} GB. São ${fixed(fullFt / qloraGb, 0)} vezes menos que o ajuste completo e ${fixed(loraGb / qloraGb, 1)} vezes menos que o LoRA. As ativações vêm por cima e crescem com o lote e o comprimento da sequência.`,
      ],
      keyIdea: `Para um 7B, sem ativações: cerca de ${fixed(fullFt, 0)} GB no ajuste completo, ${fixed(loraGb, 0)} GB no LoRA e ${fixed(qloraGb, 1)} GB no QLoRA.`,
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "memory-metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "full", label: "ajuste completo", value: `${fixed(fullFt, 1)} GB`, color: "danger" },
              { id: "lora", label: "LoRA (base bf16)", value: `${fixed(loraGb, 1)} GB` },
              { id: "qlora", label: "QLoRA (base NF4)", value: `${fixed(qloraGb, 1)} GB`, color: "module-11" },
            ],
            highlight: "qlora",
          },
          {
            id: "memory-chart",
            piece: "chart",
            kind: "bar",
            series: [
              { label: "completo", value: Number(fullFt.toFixed(1)) },
              { label: "LoRA", value: Number(loraGb.toFixed(1)) },
              { label: "QLoRA", value: Number(qloraGb.toFixed(1)) },
            ],
            highlight: 2,
            color: "module-11",
          },
        ],
      },
      alt: `Memória para ajustar o Llama 2 7B, sem ativações: ${fixed(fullFt, 1)} GB no ajuste completo, ${fixed(loraGb, 1)} GB no LoRA e ${fixed(qloraGb, 1)} GB no QLoRA, em destaque.`,
    },
    {
      id: "double-paged",
      shortTitle: "Dupla e paged",
      title: "Double quantization e paged optimizers",
      tag: "mechanism",
      body: [
        `Cada bloco de ${BLOCK} pesos precisa da sua escala. Em fp32, são 32 / ${BLOCK} = ${fixed(constantBits, 1)} bit a mais por parâmetro. A [[double quantization|double-quantization]] quantiza essas escalas em 8 bits, em blocos de ${CONSTANT_BLOCK} com uma escala fp32 cada: 8 / ${BLOCK} + 32 / (${BLOCK} × ${CONSTANT_BLOCK}) = ${fixed(doubleQuantBits, 3)} bit. Economia de ${fixed(savedBits, 3)} bit por parâmetro, ${fixed(bigSaved, 1)} GB num modelo de 65B.`,
        "O outro truque é o [[paged optimizer|paged-optimizer]]. O estado do otimizador mora em memória unificada da NVIDIA: quando um lote com sequências longas faz a memória da GPU subir num pico, páginas desse estado passam para a RAM da CPU e voltam quando há espaço. O treino fica mais lento nesse instante, em vez de parar com erro de falta de memória.",
      ],
      keyIdea: "Escalas quantizadas economizam cerca de 0,37 bit por peso; a paginação absorve os picos de memória.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "bits",
            piece: "metrics-panel",
            metrics: [
              { id: "plain", label: "escalas em fp32", value: `${fixed(constantBits, 3)} bit/peso` },
              { id: "double", label: "double quantization", value: `${fixed(doubleQuantBits, 3)} bit/peso`, color: "module-11" },
              { id: "saved-65b", label: "economia num 65B", value: `${fixed(bigSaved, 1)} GB` },
            ],
            highlight: "double",
          },
          {
            id: "paging",
            piece: "block-diagram",
            blocks: [
              { id: "batch", kind: "queue", label: "lote longo", col: 0, row: 0 },
              { id: "gpu", kind: "memory", label: "vram da gpu", col: 1, row: 0 },
              { id: "cpu", kind: "memory", label: "ram da cpu", col: 2, row: 0 },
            ],
            edges: [
              { from: "batch", to: "gpu", label: "pico" },
              { from: "gpu", to: "cpu", label: "páginas do adam", variant: "alternative" },
            ],
            active: "cpu",
          },
        ],
      },
      alt: `Escalas em fp32 custam ${fixed(constantBits, 3)} bit por peso; com double quantization, ${fixed(doubleQuantBits, 3)}, uma economia de ${fixed(bigSaved, 1)} GB num 65B. Embaixo, um lote longo causa um pico na VRAM, e páginas do Adam passam para a RAM da CPU, em destaque.`,
    },
    {
      id: "65b",
      shortTitle: "65B",
      title: "Um 65B numa GPU de 48 GB",
      tag: "tradeoff",
      body: [
        `O resultado do paper: ajustar um modelo de 65B numa única GPU de ${GPU_GB} GB. A conta fecha: ${fixed(bigWeights, 1)} GB de pesos em 4 bits e ${fixed(bigConstants, 1)} GB de escalas deixam cerca de ${fixed(bigFree, 0)} GB para adaptadores, estado do otimizador e ativações. Com isso, a família Guanaco chegou a 99,3% do nível do ChatGPT no benchmark do Vicuna, com 24 horas de ajuste numa GPU.`,
        "O custo: passos mais lentos por causa da dequantização, e um adaptador que aprendeu a corrigir a base quantizada, não a original. Na hora de servir, juntar esse adaptador com a base em 16 bits muda um pouco o resultado, e reaplicar a quantização depois da soma também. A aula 11.14 trata dessa escolha.",
      ],
      keyIdea: "QLoRA troca velocidade por memória e cabe modelos grandes em uma GPU.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "big",
            piece: "metrics-panel",
            metrics: [
              { id: "weights", label: "pesos 65B em 4 bits", value: `${fixed(bigWeights, 1)} GB` },
              { id: "constants", label: "escalas (double quant)", value: `${fixed(bigConstants, 1)} GB` },
              { id: "free", label: `livre numa GPU de ${GPU_GB} GB`, value: `≈ ${fixed(bigFree, 0)} GB`, color: "module-11" },
              { id: "guanaco", label: "Guanaco no Vicuna", value: "99,3% do ChatGPT" },
            ],
            highlight: "free",
          },
        ],
      },
      alt: `Um modelo de 65B em 4 bits ocupa ${fixed(bigWeights, 1)} GB de pesos e ${fixed(bigConstants, 1)} GB de escalas, deixando cerca de ${fixed(bigFree, 0)} GB livres numa GPU de ${GPU_GB} GB.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "QLoRA em quatro peças",
      tag: "summary",
      body: [
        "NF4 para guardar a base com pouco erro, dequantização para calcular em bf16, double quantization para encolher as escalas e paged optimizers para sobreviver aos picos. Por cima, adaptadores LoRA em 16 bits, de preferência em todas as camadas lineares.",
        "LoRA e QLoRA são os métodos mais usados de uma família maior. A próxima aula abre a família PEFT: prompt tuning, prefix tuning, adapters e IA³.",
      ],
      keyIdea: "QLoRA = base NF4 congelada + LoRA bf16 + double quantization + paged optimizer.",
      scene: { kind: "pieces", layout: "single", pieces: [setup("adapter", ["base", "lora", "gpu", "train"])] },
      alt: "O mesmo fluxo com a base em NF4, o LoRA, a GPU e o treino concluídos, e o adaptador salvo em destaque.",
    },
  ],
  realWorldExample:
    "O QLoRA virou o padrão para ajustar modelos abertos em uma GPU: no Transformers, um BitsAndBytesConfig com bnb_4bit_quant_type=\"nf4\" e bnb_4bit_use_double_quant=True carrega a base em 4 bits, e o PEFT acrescenta os adaptadores. Os paged optimizers estão disponíveis como optim=\"paged_adamw_8bit\" nos argumentos de treino.",
  code: {
    language: "python",
    source: `import torch
from transformers import AutoModelForCausalLM, BitsAndBytesConfig
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training

bnb = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_use_double_quant=True,
    bnb_4bit_compute_dtype=torch.bfloat16,
)
model = AutoModelForCausalLM.from_pretrained("meta-llama/Llama-2-7b-hf", quantization_config=bnb)
model = prepare_model_for_kbit_training(model)
model = get_peft_model(model, LoraConfig(r=16, lora_alpha=32, target_modules="all-linear", task_type="CAUSAL_LM"))`,
    caption: "QLoRA no Transformers e no PEFT: base em NF4 com double quantization e contas em bf16, e LoRA em todas as camadas lineares.",
  },
  tradeOffs: {
    pros: [
      "Cerca de 3 vezes menos memória que o LoRA em bf16 para a mesma base",
      "Modelos grandes ajustados numa única GPU",
      "Qualidade próxima à do ajuste em 16 bits nos experimentos do paper",
    ],
    cons: [
      "Cada passo é mais lento por causa da dequantização",
      "O adaptador aprende sobre a base quantizada, o que complica a fusão em 16 bits",
      "Depende de kernels específicos de GPU (bitsandbytes)",
    ],
    alternatives: ["LoRA em bf16, quando a memória sobra e a velocidade importa", "Ajuste completo com ZeRO em várias GPUs"],
  },
  knowledgeCheck: [
    {
      id: "why-nf4",
      prompt: "Por que o NF4 erra menos que um int4 uniforme ao quantizar pesos de uma rede treinada?",
      options: [
        "Porque usa mais bits",
        "Porque os pesos se concentram perto de zero, e o NF4 coloca mais níveis ali, seguindo os quantis da normal",
        "Porque guarda os pesos em ponto flutuante de 16 bits",
        "Porque não usa escala por bloco",
      ],
      correct: 1,
      explanation: "Os dois têm 16 níveis. O NF4 os distribui pelos quantis da normal, mais densos perto de zero, onde está a maioria dos pesos.",
      lesson: "11-09",
    },
    {
      id: "what-trains",
      prompt: "No QLoRA, o que recebe atualização do otimizador durante o treino?",
      options: [
        "Os pesos em NF4 da base",
        "Só as matrizes A e B dos adaptadores, em 16 bits",
        "As escalas de cada bloco",
        "Todos os pesos, dequantizados",
      ],
      correct: 1,
      explanation: "A base fica congelada em NF4. O gradiente atravessa a base dequantizada, mas só os adaptadores LoRA são atualizados.",
      lesson: "11-09",
    },
  ],
  related: ["02-10", "11-08", "11-11"],
  references: [
    { title: "Dettmers et al. (2023), QLoRA: Efficient Finetuning of Quantized LLMs", url: "https://arxiv.org/abs/2305.14314", kind: "paper" },
    { title: "bitsandbytes (repositório)", url: "https://github.com/bitsandbytes-foundation/bitsandbytes", kind: "repo" },
    { title: "Rajbhandari et al. (2019), ZeRO: Memory Optimizations Toward Training Trillion Parameter Models", url: "https://arxiv.org/abs/1910.02054", kind: "paper" },
  ],
};

export default lesson;
