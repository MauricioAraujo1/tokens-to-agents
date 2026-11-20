import type { LessonContent } from "../../../types/content";

// Otimização de inferência com as contas no arquivo: o roofline de uma H100 (cerca de 989 TFLOPS densos em
// BF16 e 3,35 TB/s de HBM3, página da NVIDIA), em que o desempenho possível é min(pico, banda × intensidade);
// o speculative decoding de Leviathan et al. (2022), com E = (1 − α^(k+1)) / (1 − α) tokens por passada do
// modelo grande e ganho E / (k · c + 1); o tamanho da matriz de scores N × N que o FlashAttention evita gravar
// na HBM; e o tráfego de memória de três operações elemento a elemento com e sem fusão de kernels.

const fixed = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");

// Passo 2: roofline.
const PEAK_TFLOPS = 989;
const BANDWIDTH_TBS = 3.35;
const ridge = PEAK_TFLOPS / BANDWIDTH_TBS;
const attainable = (intensity: number) => Math.min(PEAK_TFLOPS, BANDWIDTH_TBS * intensity);
const intensities = [1, 4, 16, 64, 128, Math.round(ridge), 1024];
const roofline = intensities.map((intensity) => ({ label: `${integer(intensity)} FLOP/B`, value: Number(attainable(intensity).toFixed(1)) }));
const ridgeIndex = intensities.indexOf(Math.round(ridge));
/** Decode com 1 pedido em fp16: 2 FLOPs por peso e 2 bytes por peso, cerca de 1 FLOP por byte. */
const DECODE_INTENSITY = 1;
const decodeShare = attainable(DECODE_INTENSITY) / PEAK_TFLOPS;
const PROMPT = 1000;

// Passos 3 e 4: speculative decoding.
const ALPHA = 0.8;
const ALPHA_LOW = 0.6;
/** Custo de uma passada do draft model em relação a uma do modelo grande (hipótese da aula). */
const DRAFT_COST = 0.05;
const expectedTokens = (alpha: number, k: number) => (1 - alpha ** (k + 1)) / (1 - alpha);
const speedup = (alpha: number, k: number) => expectedTokens(alpha, k) / (k * DRAFT_COST + 1);
const ks = [1, 2, 3, 4, 5, 6, 7, 8];
const speedups = ks.map((k) => ({ label: `k = ${k}`, value: Number(speedup(ALPHA, k).toFixed(2)) }));
const K = 4;
const bestK = ks.reduce((best, k) => (speedup(ALPHA, k) > speedup(ALPHA, best) ? k : best), ks[0]);
const draft = ["subiu", "no", "telhado", "ontem"];
const accepted = 2;
const targetToken = "muro";
const streamTokens = ["o gato", ...draft.slice(0, accepted).map((token) => `${token} ✓`), `${draft[accepted]} ✗`, `${targetToken} (alvo)`];

// Passo 5: matriz de scores da attention e fusão de kernels.
const BYTES = 2;
const SEQ = 8192;
const HEADS = 32;
const MB = 1e6;
const GB = 1e9;
const scoresPerHead = SEQ * SEQ * BYTES;
const scoresPerLayer = scoresPerHead * HEADS;
const TENSOR = 4096 * 4096 * BYTES;
const OPS = 3;
/** Sem fusão, cada operação lê o tensor e grava o resultado; fundidas, lê uma vez e grava uma vez. */
const unfusedBytes = OPS * 2 * TENSOR;
const fusedBytes = 2 * TENSOR;
const microseconds = (bytes: number) => (bytes / (BANDWIDTH_TBS * 1e12)) * 1e6;

const lesson: LessonContent = {
  id: "10-12",
  subtitle: "Como achar o gargalo da inferência com o modelo roofline e as técnicas que atacam cada um: menos bytes, menos passadas e menos idas à memória.",
  objectives: [
    "Usar o modelo roofline para saber se uma operação é limitada por memória ou por cálculo",
    "Calcular o ganho esperado do speculative decoding pela taxa de aceitação",
    "Explicar o que o FlashAttention e a fusão de kernels economizam",
    "Escolher a otimização pelo gargalo medido, não pela lista de técnicas",
  ],
  steps: [
    {
      id: "map",
      shortTitle: "Gargalos",
      title: "Uma fábrica com esteira lenta",
      tag: "context",
      body: [
        "Imagine uma fábrica com uma máquina rapidíssima e uma esteira lenta trazendo peças. Comprar uma máquina mais rápida não adianta: ela já fica parada esperando. Uma GPU é assim. As tensor cores fazem as contas, e a memória HBM é a esteira que traz os pesos e o KV cache.",
        "Otimizar inferência é descobrir qual dos dois está segurando e atacar esse. Há três famílias de técnicas: trazer menos bytes ([[quantização|quantization]]), fazer menos passadas do modelo grande por token ([[speculative decoding|speculative-decoding]]) e ir menos vezes à memória por passada ([[FlashAttention|flash-attention]] e [[fusão de kernels|kernel-fusion]]).",
      ],
      keyIdea: "Antes de otimizar, descubra se a GPU espera a memória ou as contas.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "hbm", kind: "memory", label: `hbm ${fixed(BANDWIDTH_TBS, 2)} tb/s`, col: 0, row: 0 },
              { id: "fusion", kind: "tool", label: "fusão de kernels", col: 0, row: 1 },
              { id: "gpu", kind: "server", label: `${PEAK_TFLOPS} tflops`, col: 1, row: 0.5 },
              { id: "draft", kind: "llm", label: "draft model", col: 2, row: 0 },
              { id: "tokens", kind: "answer", label: "tokens", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "hbm", to: "gpu", label: "bytes" },
              { from: "fusion", to: "gpu", label: "menos idas" },
              { from: "draft", to: "gpu", label: "rascunho" },
              { from: "gpu", to: "tokens" },
            ],
            active: "gpu",
          },
        ],
      },
      alt: `A GPU, em destaque, com ${PEAK_TFLOPS} TFLOPS, recebe bytes da HBM de ${fixed(BANDWIDTH_TBS, 2)} TB/s. A fusão de kernels reduz as idas à memória e um draft model manda rascunhos de tokens; a saída são os tokens.`,
    },
    {
      id: "roofline",
      shortTitle: "Roofline",
      title: "O teto de cada operação",
      tag: "mechanism",
      body: [
        `O [[modelo roofline|roofline-model]] resume a fábrica num gráfico. O eixo x é a [[intensidade aritmética|arithmetic-intensity]], FLOPs feitos por byte lido. O desempenho possível é o menor de dois tetos: o pico de cálculo, ${PEAK_TFLOPS} TFLOPS, ou a banda × a intensidade. Os dois se cruzam em ${PEAK_TFLOPS} / ${fixed(BANDWIDTH_TBS, 2)} ≈ ${integer(ridge)} FLOPs por byte: abaixo disso, a operação é [[memory-bound|memory-bound]]; acima, [[compute-bound|compute-bound]].`,
        `O [[decode|decode]] com um pedido faz cerca de 2 FLOPs por peso e lê 2 bytes por peso em fp16: intensidade perto de ${DECODE_INTENSITY}, e o teto é ${fixed(attainable(DECODE_INTENSITY))} TFLOPS, ${fixed(decodeShare * 100, 2)}% do pico. O [[prefill|prefill]] de ${integer(PROMPT)} tokens reusa cada peso ${integer(PROMPT)} vezes e passa do ponto de virada. Por isso o decode melhora com menos bytes ou mais pedidos por lote, e o prefill, com kernels que usem melhor as contas.`,
      ],
      keyIdea: "Desempenho possível = min(pico de cálculo, banda × FLOPs por byte).",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "roof",
            piece: "chart",
            kind: "line",
            series: roofline,
            max: PEAK_TFLOPS,
            highlight: ridgeIndex,
            color: "module-10",
          },
        ],
      },
      alt: `Curva do roofline da H100: ${roofline.map((point) => `${point.label} chega a ${fixed(point.value)} TFLOPS`).join(", ")}. O ponto de virada, em destaque, fica em ${integer(ridge)} FLOPs por byte.`,
    },
    {
      id: "speculative",
      shortTitle: "Rascunho",
      title: "Um modelo pequeno escreve, o grande confere",
      tag: "mechanism",
      body: [
        "Um estagiário rápido escreve o rascunho de um e-mail e o chefe lê tudo de uma vez, riscando a partir da primeira palavra errada. Ler é muito mais rápido do que escrever palavra por palavra. No speculative decoding, um [[draft model|draft-model]] pequeno propõe k tokens, um por vez, e o modelo grande confere os k numa passada só, como num prefill curto.",
        `Na cena, o draft propôs ${draft.map((token) => `“${token}”`).join(", ")}. O modelo grande aceitou os ${accepted} primeiros, recusou “${draft[accepted]}” e, na mesma passada, já deu o token dele: “${targetToken}”. Foram ${accepted + 1} tokens por uma passada do modelo grande, em vez de 1. Com a regra de aceitação de Leviathan et al., a distribuição dos tokens finais é exatamente a do modelo grande: a qualidade não muda, só a velocidade.`,
      ],
      keyIdea: "O modelo grande confere k tokens pelo custo de uma passada; a saída é a mesma que ele daria sozinho.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "spec",
            piece: "block-diagram",
            blocks: [
              { id: "context", kind: "tokens", label: "o gato", col: 0, row: 0.5 },
              { id: "draft", kind: "llm", label: "draft pequeno", col: 1, row: 0 },
              { id: "target", kind: "llm", label: "modelo grande", col: 2, row: 0.5 },
              { id: "out", kind: "answer", label: `${accepted + 1} tokens`, col: 3, row: 0.5 },
            ],
            edges: [
              { from: "context", to: "draft" },
              { from: "draft", to: "target", label: `${draft.length} propostos` },
              { from: "target", to: "out", label: "1 passada" },
            ],
            active: "target",
          },
          {
            id: "draft-tokens",
            piece: "token-stream",
            tokens: streamTokens,
            bars: [0, 1, 1, 0, 1],
            query: streamTokens.length - 1,
            color: "module-10",
          },
        ],
      },
      alt: `O draft pequeno propõe ${draft.length} tokens depois de “o gato”; o modelo grande, em destaque, confere todos numa passada, aceita ${draft.slice(0, accepted).join(" e ")}, recusa ${draft[accepted]} e gera ${targetToken}: ${accepted + 1} tokens por passada.`,
    },
    {
      id: "speedup",
      shortTitle: "Ganho",
      title: "Quanto se ganha depende da aceitação",
      tag: "example",
      body: [
        `Se cada token do rascunho é aceito com probabilidade α, uma passada do modelo grande rende em média E = (1 − α^(k+1)) / (1 − α) tokens. Com α = ${fixed(ALPHA)} e k = ${K}, E = ${fixed(expectedTokens(ALPHA, K), 2)}. Mas o draft também custa: se cada passada dele vale ${fixed(DRAFT_COST, 2)} de uma passada do grande (hipótese da aula), o ganho é E / (k · c + 1) = ${fixed(speedup(ALPHA, K), 2)} vezes.`,
        `O gráfico mostra o ganho por k. Ele sobe rápido e achata: tokens no fim do rascunho raramente sobrevivem, e cada um custa uma passada do draft. Até k = ${bestK}, o ganho chega a ${fixed(speedup(ALPHA, bestK), 2)} vezes, só ${fixed(speedup(ALPHA, bestK) - speedup(ALPHA, K), 2)} acima de k = ${K}, com o dobro de rascunho jogado fora quando há recusa. Com um draft pior, α = ${fixed(ALPHA_LOW)}, o mesmo k = ${K} rende só ${fixed(speedup(ALPHA_LOW, K), 2)} vezes. O ganho vem do decode ser memory-bound: conferir k tokens custa quase o mesmo que gerar um. Com lotes grandes, a GPU já está ocupada e o ganho encolhe.`,
      ],
      keyIdea: "Speculative decoding vale quando o rascunho acerta muito e a GPU tem cálculo sobrando.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "gain",
            piece: "chart",
            kind: "bar",
            series: speedups,
            highlight: ks.indexOf(K),
            color: "module-10",
          },
        ],
      },
      alt: `Ganho do speculative decoding com α = ${fixed(ALPHA)} e custo do draft de ${fixed(DRAFT_COST, 2)}: ${speedups.map((item) => `${item.label} ${fixed(item.value, 2)} vezes`).join(", ")}. k = ${K}, em destaque, dá ${fixed(speedup(ALPHA, K), 2)} vezes.`,
    },
    {
      id: "kernels",
      shortTitle: "Kernels",
      title: "Menos idas à memória",
      tag: "tradeoff",
      body: [
        `A attention ingênua calcula a matriz de scores N × N, grava na HBM, aplica o softmax e lê de novo. Com N = ${integer(SEQ)} tokens em 16 bits, são ${integer(scoresPerHead / MB)} MB por cabeça e ${fixed(scoresPerLayer / GB)} GB por camada com ${HEADS} cabeças. O FlashAttention calcula a attention em blocos que cabem na memória rápida dentro do chip, com um softmax que se atualiza bloco a bloco, e nunca grava a matriz inteira: a memória fica linear em N e o tráfego cai.`,
        `A fusão de kernels aplica a mesma ideia a qualquer sequência de operações. ${OPS} operações elemento a elemento num tensor de 4.096 × 4.096 em 16 bits leem e gravam ${integer(unfusedBytes / MB)} MB separadas, cerca de ${integer(microseconds(unfusedBytes))} µs a ${fixed(BANDWIDTH_TBS, 2)} TB/s; fundidas num kernel, ${integer(fusedBytes / MB)} MB e ${integer(microseconds(fusedBytes))} µs. O preço dessas técnicas é engenharia: kernels específicos por GPU e por formato, que você ganha usando um motor de inferência, não escrevendo à mão.`,
      ],
      keyIdea: "Resultado intermediário que não sai do chip é tráfego de memória economizado.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "traffic",
            piece: "metrics-panel",
            metrics: [
              { id: "head", label: `scores N = ${integer(SEQ)}, por cabeça`, value: `${integer(scoresPerHead / MB)} MB`, color: "danger" },
              { id: "layer", label: `por camada (${HEADS} cabeças)`, value: `${fixed(scoresPerLayer / GB)} GB`, color: "danger" },
              { id: "unfused", label: `${OPS} operações separadas`, value: `${integer(microseconds(unfusedBytes))} µs` },
              { id: "fused", label: "operações fundidas", value: `${integer(microseconds(fusedBytes))} µs`, color: "success" },
            ],
            highlight: "fused",
          },
        ],
      },
      alt: `A matriz de scores com ${integer(SEQ)} tokens ocupa ${integer(scoresPerHead / MB)} MB por cabeça e ${fixed(scoresPerLayer / GB)} GB por camada. Três operações separadas levam cerca de ${integer(microseconds(unfusedBytes))} µs de tráfego de memória; fundidas, ${integer(microseconds(fusedBytes))} µs.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Gargalo primeiro, técnica depois",
      tag: "summary",
      body: [
        "O roofline diz se uma operação espera a memória ou as contas. O decode espera a memória: menos bytes (quantização), mais pedidos por leitura (batching) e mais tokens por passada (speculative decoding) ajudam. A attention e as operações pequenas gastam idas à memória: FlashAttention e fusão de kernels cortam essas idas. Toda otimização se confirma medindo antes e depois.",
        "Essas técnicas moram dentro de um servidor. A próxima aula sobe um nível: como servir o modelo atrás de uma API, com fila, streaming, réplicas e autoscaling.",
      ],
      keyIdea: "A otimização certa é a que ataca o gargalo que o perfil mostrou.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "cycle",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "profile", label: "medir o perfil" },
              { id: "roofline", label: "achar o limite (roofline)", color: "module-10" },
              { id: "bytes", label: "menos bytes" },
              { id: "passes", label: "menos passadas" },
              { id: "trips", label: "menos idas à memória" },
              { id: "again", label: "medir de novo", color: "brand" },
            ],
          },
        ],
      },
      alt: "Fluxo em chips: medir o perfil, achar o limite com o roofline, trazer menos bytes, fazer menos passadas, ir menos vezes à memória e medir de novo.",
    },
  ],
  realWorldExample:
    "Os motores de inferência atuais juntam essas técnicas. O vLLM e o TensorRT-LLM usam kernels de attention no estilo FlashAttention, fundem operações e oferecem speculative decoding com um draft model ou com cabeças extras de previsão. O paper de Leviathan et al. (Google, 2022) mostrou ganhos de 2 a 3 vezes no T5-XXL sem mudar as saídas, e o PyTorch oferece um backend no estilo FlashAttention na função scaled_dot_product_attention, que o Hugging Face Transformers pode usar.",
  code: {
    language: "python",
    source: `def expected_tokens(alpha, k):
    """Tokens por passada do modelo grande, com k tokens de rascunho."""
    return (1 - alpha ** (k + 1)) / (1 - alpha)

def speedup(alpha, k, c):
    """c = custo de uma passada do draft em relação ao modelo grande."""
    return expected_tokens(alpha, k) / (k * c + 1)

for k in range(1, 9):
    print(k, round(speedup(0.8, k, 0.05), 2))`,
    caption: "As fórmulas de Leviathan et al. usadas no gráfico: tokens esperados por passada e o ganho descontando o custo do draft.",
  },
  tradeOffs: {
    pros: [
      "O roofline mostra o gargalo com duas especificações da GPU e uma conta",
      "Speculative decoding acelera o decode sem mudar a distribuição das saídas",
      "FlashAttention e fusão de kernels cortam tráfego de memória em qualquer tamanho de modelo",
    ],
    cons: [
      "Speculative decoding exige um draft compatível (mesmo tokenizador) e memória para ele",
      "O ganho do rascunho encolhe com lotes grandes, quando a GPU já está ocupada",
      "Kernels otimizados dependem da GPU, do formato numérico e do motor",
    ],
    alternatives: [
      "Batching e continuous batching, para usar o cálculo que sobra no decode",
      "Quantização, para trazer menos bytes por token",
      "Variantes do speculative decoding sem draft separado, com cabeças extras no próprio modelo",
    ],
  },
  knowledgeCheck: [
    {
      id: "roofline-decode",
      prompt: "O decode de um pedido por vez usa menos de 1% do pico de TFLOPS da GPU. Qual mudança tende a ajudar mais?",
      options: [
        "Uma GPU com mais TFLOPS e a mesma banda de memória",
        "Ler menos bytes por token (quantização) ou atender mais pedidos por leitura dos pesos (batching)",
        "Aumentar a temperatura",
        "Desligar o KV cache",
      ],
      correct: 1,
      explanation: "Com intensidade perto de 1 FLOP por byte, o decode é memory-bound. O teto sobe com menos bytes por token ou mais FLOPs por byte lido, não com mais cálculo.",
      lesson: "10-12",
    },
    {
      id: "spec-acceptance",
      prompt: "Um time ativou speculative decoding e o ganho foi quase nenhum. O log mostra taxa de aceitação de 30%. O que fazer?",
      options: [
        "Aumentar k para 16",
        "Usar um draft mais parecido com o modelo grande (mesma família, ou treinado para imitá-lo)",
        "Desligar a regra de aceitação",
        "Usar temperatura maior no draft",
      ],
      correct: 1,
      explanation: "Com α = 0,3, quase todo rascunho é recusado no primeiro token, e cada token extra custa uma passada do draft. O ganho depende de α: um draft que acerta mais é a alavanca.",
      lesson: "10-12",
    },
  ],
  related: ["10-11", "10-13", "02-10"],
  references: [
    { title: "Leviathan, Kalman e Matias (2022), Fast Inference from Transformers via Speculative Decoding", url: "https://arxiv.org/abs/2211.17192", kind: "paper" },
    { title: "Dao et al. (2022), FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness", url: "https://arxiv.org/abs/2205.14135", kind: "paper" },
    { title: "NVIDIA H100 Tensor Core GPU", url: "https://www.nvidia.com/en-us/data-center/h100/", kind: "docs" },
  ],
};

export default lesson;
