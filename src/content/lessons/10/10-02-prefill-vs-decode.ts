import type { LessonContent } from "../../../types/content";

// Prefill e decode num modelo de 7B em fp16 numa H100, no teto teórico (roofline): o tempo de uma fase é o maior
// entre o tempo das contas (FLOPs / pico de cálculo) e o tempo de ler os pesos (bytes / banda de memória).
// Conta só os pesos: o KV cache e as ativações ficam de fora. Números da H100 (3,35 TB/s, cerca de 989 TFLOPS
// densos em BF16) da página da NVIDIA.

const fixed = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const percent = (value: number) => `${Math.round(value * 100)}%`;

const PARAMS = 7e9;
const FP16_BYTES = 2;
const weightBytes = PARAMS * FP16_BYTES;
const GB = 1e9;
const H100_FLOPS = 989e12;
const H100_BANDWIDTH = 3.35e12;
/** FLOPs por byte a partir dos quais a H100 deixa de esperar a memória. */
const ridge = H100_FLOPS / H100_BANDWIDTH;

/** Uma passada que processa `tokens` tokens de uma vez lê os pesos uma vez e faz 2 · N FLOPs por token. */
const pass = (tokens: number) => {
  const computeMs = ((2 * PARAMS * tokens) / H100_FLOPS) * 1000;
  const memoryMs = (weightBytes / H100_BANDWIDTH) * 1000;
  return { computeMs, memoryMs, ms: Math.max(computeMs, memoryMs), intensity: (2 * PARAMS * tokens) / weightBytes };
};

// Passo 2: o prefill de um prompt de 2.000 tokens.
const PROMPT_TOKENS = 2000;
const prefill = pass(PROMPT_TOKENS);
const promptPreview = ["Você", "é", "um", "assistente", "de", "RH", "…", "Quantos", "dias", "de", "férias?"];

// Passo 3: cada token do decode.
const decode = pass(1);
const memoryOverCompute = decode.memoryMs / decode.computeMs;

// Passo 4: intensidade aritmética por número de tokens na passada.
const intensitySizes = [1, 16, 64, 256, 512, PROMPT_TOKENS];
const intensitySeries = intensitySizes.map((tokens) => ({
  label: tokens === 1 ? "decode (1)" : `prompt ${integer(tokens)}`,
  value: Math.round(pass(tokens).intensity),
}));
const firstComputeBound = intensitySizes.find((tokens) => pass(tokens).intensity >= ridge) ?? PROMPT_TOKENS;

// Passo 5: uma requisição inteira e a interferência de um prefill novo nos usuários em decode.
const OUTPUT_TOKENS = 300;
const decodeTotalMs = decode.ms * OUTPUT_TOKENS;
const requestMs = prefill.ms + decodeTotalMs;
const decodeShare = decodeTotalMs / requestMs;
const stallTokens = prefill.ms / decode.ms;

const lesson: LessonContent = {
  id: "10-02",
  subtitle: "As duas fases de toda geração: o prefill lê o prompt inteiro de uma vez e esbarra no cálculo; o decode escreve token a token e esbarra na memória.",
  objectives: [
    "Separar a geração em prefill e decode e dizer o que cada fase calcula",
    "Calcular o tempo das duas fases a partir de FLOPs, bytes e da GPU",
    "Explicar por que o decode é limitado pela banda de memória",
    "Reconhecer como um prefill longo atrapalha quem já está gerando",
  ],
  steps: [
    {
      id: "phases",
      shortTitle: "Duas fases",
      title: "Ler a prova inteira, depois escrever a resposta à mão",
      tag: "context",
      body: [
        "Numa prova, você lê o enunciado inteiro de uma vez: os olhos passam pelo parágrafo e o cérebro absorve tudo junto. Depois vem a resposta, escrita letra por letra, e não dá para escrever a quinta palavra antes da quarta. Um LLM faz exatamente essas duas coisas, com custos bem diferentes.",
        "O [[prefill|prefill]] processa todos os tokens do prompt numa passada só, em paralelo, e guarda as keys e os values de cada um no [[KV cache|kv-cache]]. O [[decode|decode]] gera a resposta: uma passada por token novo, lendo o cache em vez de reler o prompt. O primeiro token sai no fim do prefill; os outros saem do decode.",
      ],
      keyIdea: "Toda geração é um prefill (o prompt de uma vez) seguido de muitos passos de decode (um token por vez).",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "prompt", kind: "tokens", label: `prompt: ${integer(PROMPT_TOKENS)}`, col: 0, row: 0 },
              { id: "prefill", kind: "llm", label: "prefill", col: 1, row: 0 },
              { id: "cache", kind: "kv-cache", label: "kv cache", col: 2, row: 0 },
              { id: "decode", kind: "llm", label: "decode", col: 2, row: 1 },
              { id: "answer", kind: "answer", label: "1 token por passo", col: 3, row: 1 },
            ],
            edges: [
              { from: "prompt", to: "prefill", label: "todos juntos" },
              { from: "prefill", to: "cache", label: "keys e values" },
              { from: "cache", to: "decode" },
              { from: "decode", to: "answer" },
            ],
            active: "prefill",
          },
        ],
      },
      alt: `O prompt de ${integer(PROMPT_TOKENS)} tokens entra todo junto no prefill, em destaque, que grava keys e values no KV cache; o decode lê o cache e gera um token por passo.`,
    },
    {
      id: "prefill",
      shortTitle: "Prefill",
      title: "Prefill: muitas contas para uma leitura dos pesos",
      tag: "mechanism",
      body: [
        `No prefill, a GPU lê os ${integer(weightBytes / GB)} GB de pesos uma vez e usa cada peso para os ${integer(PROMPT_TOKENS)} tokens do prompt. São 2 · N · ${integer(PROMPT_TOKENS)} = ${fixed((2 * PARAMS * PROMPT_TOKENS) / 1e12, 0)} TFLOPs. Numa H100, no pico de ${integer(H100_FLOPS / 1e12)} TFLOPS, as contas levam ${fixed(prefill.computeMs)} ms, e ler os pesos leva só ${fixed(prefill.memoryMs)} ms.`,
        "Quem manda no tempo é o cálculo: o prefill é [[compute-bound|compute-bound]]. É a mesma situação do treino, com matrizes grandes multiplicando matrizes grandes, e as tensor cores trabalham perto do limite. Por isso um prompt duas vezes maior leva cerca de duas vezes mais tempo até o primeiro token.",
      ],
      keyIdea: "No prefill, cada byte lido vira milhares de contas: o limite é a capacidade de cálculo.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "prefill-metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "compute", label: "tempo das contas", value: `${fixed(prefill.computeMs)} ms`, color: "danger" },
              { id: "memory", label: "tempo de ler os pesos", value: `${fixed(prefill.memoryMs)} ms` },
              { id: "limit", label: "limite", value: "cálculo" },
            ],
            highlight: "compute",
          },
          {
            id: "prompt",
            piece: "token-stream",
            tokens: promptPreview,
            bars: promptPreview.map(() => 1),
            color: "module-10",
          },
        ],
      },
      alt: `Prefill de ${integer(PROMPT_TOKENS)} tokens: ${fixed(prefill.computeMs)} ms de contas contra ${fixed(prefill.memoryMs)} ms de leitura dos pesos. Os tokens do prompt aparecem todos com a barra cheia, processados ao mesmo tempo.`,
    },
    {
      id: "decode",
      shortTitle: "Decode",
      title: "Decode: uma leitura inteira dos pesos para um token",
      tag: "mechanism",
      body: [
        `No decode, a passada processa um token só. A GPU continua tendo de ler os ${integer(weightBytes / GB)} GB de pesos, mas agora faz só 2 · N = ${fixed((2 * PARAMS) / 1e9, 0)} GFLOPs com eles. As contas levariam ${fixed(decode.computeMs, 3)} ms; a leitura leva ${fixed(decode.memoryMs, 2)} ms, ${integer(memoryOverCompute)} vezes mais.`,
        `O decode é [[memory-bound|memory-bound]]: as tensor cores passam quase todo o tempo esperando os dados chegarem. O número que define a velocidade não é o TFLOPS da GPU, é a [[banda de memória|memory-bandwidth]]. Na H100, ${fixed(H100_BANDWIDTH / 1e12, 2)} TB/s divididos por ${integer(weightBytes / GB)} GB dão no máximo ${integer(1000 / decode.memoryMs)} tokens por segundo para um usuário sozinho.`,
      ],
      keyIdea: "No decode, a GPU relê todos os pesos para gerar um único token: quem manda é a banda de memória.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "prompt", kind: "tokens", label: `prompt: ${integer(PROMPT_TOKENS)}`, col: 0, row: 0 },
              { id: "prefill", kind: "llm", label: "prefill", col: 1, row: 0 },
              { id: "cache", kind: "kv-cache", label: "kv cache", col: 2, row: 0 },
              { id: "vram", kind: "memory", label: `${integer(weightBytes / GB)} gb de pesos`, col: 1, row: 1 },
              { id: "decode", kind: "llm", label: "decode", col: 2, row: 1 },
              { id: "answer", kind: "answer", label: "1 token por passo", col: 3, row: 1 },
            ],
            edges: [
              { from: "prompt", to: "prefill" },
              { from: "prefill", to: "cache" },
              { from: "cache", to: "decode", label: "keys e values" },
              { from: "vram", to: "decode", label: "a cada token" },
              { from: "decode", to: "answer" },
            ],
            active: "decode",
            done: ["prompt", "prefill", "cache", "vram"],
          },
        ],
      },
      alt: `No decode, em destaque, cada token novo lê os ${integer(weightBytes / GB)} GB de pesos da memória e as keys e values do KV cache: ${fixed(decode.memoryMs, 2)} ms de leitura para ${fixed(decode.computeMs, 3)} ms de contas.`,
    },
    {
      id: "intensity",
      shortTitle: "Intensidade",
      title: "Uma régua só: FLOPs por byte lido",
      tag: "example",
      body: [
        `A [[intensidade aritmética|arithmetic-intensity]] junta as duas fases numa régua: FLOPs feitos por byte lido. Com pesos em fp16, uma passada com t tokens faz 2 · N · t FLOPs sobre 2 · N bytes, ou seja, cerca de t FLOPs por byte. O decode, com 1 token, fica em ${intensitySeries[0].value}; o prefill de ${integer(PROMPT_TOKENS)} tokens fica em ${integer(PROMPT_TOKENS)}.`,
        `A H100 faz ${integer(H100_FLOPS / 1e12)} TFLOPS e lê ${fixed(H100_BANDWIDTH / 1e12, 2)} TB/s: abaixo de ${integer(ridge)} FLOPs por byte, ela espera a memória. Na cena, só passadas com ${integer(firstComputeBound)} tokens ou mais cruzam a linha. Isso é uma aproximação que ignora o KV cache, mas já explica a principal ideia do módulo: juntar vários usuários na mesma passada de decode aumenta os FLOPs por byte quase de graça.`,
      ],
      keyIdea: `Abaixo de cerca de ${integer(ridge)} FLOPs por byte, uma H100 espera a memória; o decode de um usuário fica em 1.`,
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "intensity",
            piece: "chart",
            kind: "bar",
            series: intensitySeries,
            cutoff: { mode: "threshold", value: Math.round(ridge), label: `${integer(ridge)} FLOPs/byte` },
            highlight: 0,
            color: "module-10",
          },
        ],
      },
      alt: `Intensidade aritmética por tokens na passada: ${intensitySeries.map((item) => `${item.label} ${integer(item.value)}`).join(", ")} FLOPs por byte. A linha da H100 fica em ${integer(ridge)}: só as passadas acima dela usam o cálculo por completo.`,
    },
    {
      id: "interference",
      shortTitle: "Interferência",
      title: "Quando um prompt longo trava quem já está escrevendo",
      tag: "tradeoff",
      body: [
        `Numa requisição com ${integer(PROMPT_TOKENS)} tokens de prompt e ${OUTPUT_TOKENS} de resposta, o prefill leva ${fixed(prefill.ms)} ms e o decode ${integer(decodeTotalMs)} ms: ${percent(decodeShare)} do tempo é gerando. Prompt longo pesa no tempo até o primeiro token; resposta longa pesa no total.`,
        `O problema aparece com vários usuários na mesma GPU. Se um prompt novo de ${integer(PROMPT_TOKENS)} tokens entra no meio, os usuários que estavam gerando esperam ${fixed(prefill.ms)} ms naquele passo, o tempo de uns ${integer(stallTokens)} tokens deles. Há duas saídas: picar o prefill em pedaços que entram junto com o decode, o [[chunked prefill|chunked-prefill]] da aula de continuous batching, ou separar as fases em GPUs diferentes, o [[disaggregated serving|disaggregated-serving]], que manda o KV cache da GPU de prefill para a de decode.`,
      ],
      keyIdea: "Prefill e decode competem pela mesma GPU; misturar sem cuidado faz um prompt longo engasgar o streaming de todos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "split",
            piece: "block-diagram",
            blocks: [
              { id: "queue", kind: "queue", label: "pedidos", col: 0, row: 0.5 },
              { id: "prefill-gpu", kind: "server", label: "gpu de prefill", col: 1, row: 0 },
              { id: "cache", kind: "kv-cache", label: "kv transferido", col: 2, row: 0 },
              { id: "decode-gpu", kind: "server", label: "gpu de decode", col: 2, row: 1 },
              { id: "answer", kind: "answer", label: "streaming", col: 3, row: 1 },
            ],
            edges: [
              { from: "queue", to: "prefill-gpu", label: "prompt" },
              { from: "prefill-gpu", to: "cache" },
              { from: "cache", to: "decode-gpu", label: "rede rápida" },
              { from: "decode-gpu", to: "answer" },
              { from: "queue", to: "decode-gpu", label: "tudo junto: engasga", variant: "alternative" },
            ],
            active: "cache",
          },
        ],
      },
      alt: `Prefill e decode separados: a GPU de prefill lê o prompt e transfere o KV cache, em destaque, para a GPU de decode, que faz o streaming. O caminho tracejado, tudo na mesma GPU, faz um prefill de ${fixed(prefill.ms)} ms engasgar quem está gerando.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Duas fases, dois gargalos",
      tag: "summary",
      body: [
        "O prefill é largo e curto: lê o prompt inteiro em paralelo, é limitado pelo cálculo e define o tempo até o primeiro token. O decode é estreito e longo: um token por passada, limitado pela banda de memória, e define a velocidade do streaming.",
        "A próxima aula transforma essas duas fases nas métricas que você vê num painel de produção: tempo até o primeiro token, tempo entre tokens e tokens por segundo.",
      ],
      keyIdea: "Prefill: cálculo, TTFT. Decode: memória, tokens por segundo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "compare",
            piece: "metrics-panel",
            metrics: [
              { id: "prefill", label: `prefill (${integer(PROMPT_TOKENS)} tokens)`, value: `${fixed(prefill.ms)} ms · cálculo`, color: "module-10" },
              { id: "decode", label: "decode (por token)", value: `${fixed(decode.ms, 2)} ms · memória`, color: "info" },
              { id: "intensity", label: "FLOPs por byte", value: `${integer(PROMPT_TOKENS)} × 1` },
              { id: "share", label: `tempo gerando (${OUTPUT_TOKENS} tokens)`, value: percent(decodeShare) },
            ],
            highlight: "decode",
          },
        ],
      },
      alt: `Resumo: prefill de ${integer(PROMPT_TOKENS)} tokens em ${fixed(prefill.ms)} ms, limitado pelo cálculo; decode em ${fixed(decode.ms, 2)} ms por token, limitado pela memória; ${percent(decodeShare)} do tempo da requisição é gerando.`,
    },
  ],
  realWorldExample:
    "O DistServe (Zhong et al., 2024) e o Splitwise (Patel et al., 2024) partem justamente dessa diferença: colocam o prefill e o decode em GPUs separadas, cada grupo dimensionado para o seu gargalo, e transferem o KV cache entre elas. Motores como o vLLM oferecem o caminho oposto, o chunked prefill, que mistura pedaços do prompt nos passos de decode da mesma GPU.",
  code: {
    language: "python",
    source: `PARAMS = 7e9               # modelo de 7B
WEIGHT_BYTES = PARAMS * 2  # fp16
FLOPS = 989e12             # H100, BF16 denso
BANDWIDTH = 3.35e12        # H100, bytes por segundo

def pass_ms(tokens):
    compute = 2 * PARAMS * tokens / FLOPS
    memory = WEIGHT_BYTES / BANDWIDTH
    return 1000 * max(compute, memory)

print("prefill 2000:", pass_ms(2000))  # ≈ 28 ms, limitado pelo cálculo
print("decode 1:", pass_ms(1))         # ≈ 4,2 ms, limitado pela memória`,
    caption: "O modelo de roofline da aula: o tempo de uma passada é o maior entre o tempo das contas e o tempo de ler os pesos.",
  },
  tradeOffs: {
    pros: [
      "Separar as fases explica de onde vem cada métrica de latência",
      "O prefill aproveita bem a GPU: matrizes grandes, cálculo perto do pico",
      "O decode deixa espaço para juntar vários usuários na mesma leitura dos pesos",
    ],
    cons: [
      "O decode desperdiça quase todo o cálculo da GPU com um usuário só",
      "Um prefill longo atrasa todos os usuários que estão em decode na mesma GPU",
      "Separar as fases em GPUs diferentes exige transferir o KV cache por uma rede rápida",
    ],
    alternatives: ["Chunked prefill, que mistura pedaços do prompt nos passos de decode", "Disaggregated serving, com GPUs dedicadas a cada fase"],
  },
  knowledgeCheck: [
    {
      id: "longer-prompt",
      prompt: "Um assistente passou a mandar um prompt 4 vezes maior, com a mesma resposta. O que muda primeiro?",
      options: [
        "A velocidade do streaming cai 4 vezes",
        "O tempo até o primeiro token sobe, porque o prefill faz cerca de 4 vezes mais contas",
        "Nada, porque o prompt é lido em paralelo",
        "O modelo passa a usar mais pesos",
      ],
      correct: 1,
      explanation: "O prefill é limitado pelo cálculo e cresce com o tamanho do prompt. O decode por token quase não muda, a não ser pelo KV cache maior.",
      lesson: "10-02",
    },
    {
      id: "fewer-bytes",
      prompt: "Guardar os pesos em 4 bits em vez de 16 acelera muito o decode e pouco o prefill. Por quê?",
      options: [
        "Porque o decode é limitado pela leitura dos pesos, e 4 bits são 4 vezes menos bytes para ler; o prefill é limitado pelo cálculo",
        "Porque o prefill não usa os pesos",
        "Porque 4 bits deixam as contas mais precisas",
        "Porque o decode não lê a memória",
      ],
      correct: 0,
      explanation: "No decode, o tempo é bytes lidos / banda de memória: menos bytes, menos tempo. No prefill, as contas dominam, e elas continuam sendo feitas em 16 bits.",
      lesson: "10-02",
    },
  ],
  related: ["10-01", "10-03", "04-02"],
  references: [
    { title: "Zhong et al. (2024), DistServe: Disaggregating Prefill and Decoding for Goodput-optimized LLM Serving", url: "https://arxiv.org/abs/2401.09670", kind: "paper" },
    { title: "Patel et al. (2024), Splitwise: Efficient Generative LLM Inference Using Phase Splitting", url: "https://arxiv.org/abs/2311.18677", kind: "paper" },
    { title: "NVIDIA H100 Tensor Core GPU", url: "https://www.nvidia.com/en-us/data-center/h100/", kind: "docs" },
  ],
};

export default lesson;
