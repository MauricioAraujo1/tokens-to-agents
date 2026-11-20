import { cacheEntries, generationCost, opsPerToken } from "../../../lab/kvCache";
import { kvCacheContent } from "../../playgrounds/kv-cache";
import type { BlockDiagramSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// KV cache em contas. O custo com e sem cache usa o mesmo modelo de operações do playground do Laboratório
// (src/lab/kvCache.ts) e os mesmos valores iniciais dele. A memória sai de
// 2 (key e value) × camadas × cabeças de KV × dimensão da cabeça × bytes, com as configurações do Llama 2
// (paper da Meta): 7B com 32 camadas, 32 cabeças de 128 dimensões; 70B com 80 camadas e GQA de 8 cabeças de KV.
// A GPU é uma H100 de 80 GB (página da NVIDIA). Ativações e sobras do motor ficam fora da conta.

const fixed = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");

// Passo 2: o mesmo cenário inicial do playground.
const { prompt: PROMPT, generated: GENERATED } = kvCacheContent.initial;
const MS_PER_OP = kvCacheContent.msPerOp;
const uncached = generationCost(PROMPT, GENERATED, false);
const cached = generationCost(PROMPT, GENERATED, true);
const speedup = uncached.total / cached.total;
const vectorsPerLayer = cacheEntries(PROMPT, GENERATED);
const SAMPLE_STEPS = [1, Math.round(GENERATED / 2), GENERATED];
const sampleSeries = [
  ...SAMPLE_STEPS.map((step) => ({ label: `sem cache: ${step}º`, value: opsPerToken(PROMPT + step, false) })),
  ...SAMPLE_STEPS.map((step) => ({ label: `com cache: ${step}º`, value: opsPerToken(PROMPT + step, true) })),
];
const lastUncached = opsPerToken(PROMPT + GENERATED, false);
const lastCached = opsPerToken(PROMPT + GENERATED, true);

// Passo 3: bytes por token.
const BYTES_FP16 = 2;
const kvBytesPerToken = (layers: number, kvHeads: number, headDim: number, bytes = BYTES_FP16) => 2 * layers * kvHeads * headDim * bytes;
const LLAMA7 = { layers: 32, kvHeads: 32, headDim: 128 };
const kv7 = kvBytesPerToken(LLAMA7.layers, LLAMA7.kvHeads, LLAMA7.headDim);
const MIB = 1024 * 1024;
const GB = 1e9;
const LLAMA2_WINDOW = 4096;
const kv7Window = kv7 * LLAMA2_WINDOW;

// A cena do passo 3: 2 camadas × (K, V) × 8 posições, preenchidas até o token atual.
const SHOWN_TOKENS = 8;
const CURRENT_TOKEN = 6;
const cacheRows = ["K camada 1", "V camada 1", "K camada 2", "V camada 2"];
const cacheCols = Array.from({ length: SHOWN_TOKENS }, (_, index) => `t${index + 1}`);
const cacheValues = cacheRows.map(() => cacheCols.map((_, index) => (index < CURRENT_TOKEN ? 1 : 0)));

// Passo 4: quantas sequências cabem numa H100 de 80 GB com o 7B em fp16.
const H100_GB = 80;
const PARAMS_7B = 7e9;
const weights7 = PARAMS_7B * BYTES_FP16;
const free7 = H100_GB * GB - weights7;
const CONTEXTS = [2048, 4096, 8192, 16_384, 32_768];
const sequencesFor = (bytesPerToken: number, freeBytes: number, context: number) => Math.floor(freeBytes / (bytesPerToken * context));
const concurrency = CONTEXTS.map((context) => ({ label: `${integer(context)} tokens`, value: sequencesFor(kv7, free7, context) }));
const at4k = sequencesFor(kv7, free7, LLAMA2_WINDOW);
const at8k = sequencesFor(kv7, free7, 8192);

// Passo 5: Llama 2 70B com e sem GQA, em 2 H100 (160 GB) com os pesos em fp16.
const LLAMA70 = { layers: 80, queryHeads: 64, kvHeads: 8, headDim: 128 };
const kv70Mha = kvBytesPerToken(LLAMA70.layers, LLAMA70.queryHeads, LLAMA70.headDim);
const kv70Gqa = kvBytesPerToken(LLAMA70.layers, LLAMA70.kvHeads, LLAMA70.headDim);
const kv70Fp8 = kvBytesPerToken(LLAMA70.layers, LLAMA70.kvHeads, LLAMA70.headDim, 1);
const GPUS_70B = 2;
const free70 = GPUS_70B * H100_GB * GB - 70e9 * BYTES_FP16;
const seqs70Mha = sequencesFor(kv70Mha, free70, LLAMA2_WINDOW);
const seqs70Gqa = sequencesFor(kv70Gqa, free70, LLAMA2_WINDOW);
const seqs70Fp8 = sequencesFor(kv70Fp8, free70, LLAMA2_WINDOW);

const memoryDiagram = (active: string, done?: string[]): BlockDiagramSpec => ({
  id: "gpu",
  piece: "block-diagram",
  blocks: [
    { id: "tokens", kind: "tokens", label: "token novo", col: 0, row: 0.5 },
    { id: "llm", kind: "llm", label: "modelo", col: 1, row: 0.5 },
    { id: "cache", kind: "kv-cache", label: "kv cache", col: 2, row: 0 },
    { id: "weights", kind: "memory", label: "pesos", col: 2, row: 1 },
    { id: "answer", kind: "answer", label: "próximo token", col: 3, row: 0.5 },
  ],
  edges: [
    { from: "tokens", to: "llm", label: "query" },
    { from: "cache", to: "llm", label: "keys e values" },
    { from: "weights", to: "llm" },
    { from: "llm", to: "cache", label: "k e v novos" },
    { from: "llm", to: "answer" },
  ],
  active,
  ...(done ? { done } : {}),
});

const lesson: LessonContent = {
  id: "10-05",
  subtitle: "Por que o modelo guarda as keys e os values de cada token, quanto isso acelera a geração e quanta memória da GPU custa.",
  objectives: [
    "Explicar o que o KV cache guarda e por que ele troca contas por memória",
    "Calcular os bytes do KV cache por token a partir da configuração do modelo",
    "Estimar quantas conversas simultâneas cabem numa GPU",
    "Comparar MHA, GQA e cache em 8 bits pelo efeito na memória",
  ],
  steps: [
    {
      id: "notes",
      shortTitle: "Anotações",
      title: "Quem anota não precisa ouvir a reunião de novo",
      tag: "context",
      body: [
        "Imagine responder a cada pergunta de uma reunião ouvindo a gravação inteira desde o começo. Na décima pergunta, você já ouviu a abertura dez vezes. Quem anota os pontos principais só lê as anotações e ouve a pergunta nova.",
        "Na geração [[autoregressiva|autoregressive]], cada token novo precisa da [[attention|attention]] sobre todos os anteriores, e a attention usa a [[key|key]] e o [[value|value]] de cada um. Esses vetores não mudam depois de calculados. O [[KV cache|kv-cache]] guarda as keys e os values de todos os tokens, em todas as camadas: no [[decode|decode]], o token novo calcula só a própria query, key e value e lê o resto da memória.",
      ],
      keyIdea: "O KV cache é a anotação da reunião: calcula uma vez, consulta sempre.",
      scene: { kind: "pieces", layout: "single", pieces: [memoryDiagram("cache")] },
      alt: "O token novo entra no modelo como query; o KV cache, em destaque, entrega as keys e os values dos tokens anteriores, recebe os do token novo, e o modelo produz o próximo token.",
    },
    {
      id: "ops",
      shortTitle: "Contas",
      title: "Sem cache, o custo por token cresce com o quadrado",
      tag: "mechanism",
      body: [
        `No modelo de custo do playground de KV cache, projetar a key e o value de um token custa 1 operação e comparar uma query com uma key custa 1. Sem cache, o token que vê L posições reprojeta todas e compara todas as queries com todas as keys: L + L² operações. Com cache, projeta só o token novo e compara a query dele com as L keys guardadas: 1 + L.`,
        `Com ${PROMPT} tokens de prompt e ${GENERATED} gerados, o último token custa ${integer(lastUncached)} operações sem cache e ${integer(lastCached)} com cache. No total, são ${integer(uncached.total)} contra ${integer(cached.total)}, ${fixed(speedup)} vezes menos. A ${fixed(MS_PER_OP, 2)} ms por operação, isso dá ${fixed(uncached.total * MS_PER_OP)} ms contra ${fixed(cached.total * MS_PER_OP)} ms. O preço é guardar ${vectorsPerLayer} vetores por camada ao fim da geração: uma key e um value para cada um dos ${PROMPT + GENERATED} tokens.`,
      ],
      keyIdea: "Com KV cache, o custo de cada token novo cresce em linha reta com o contexto, e não com o quadrado.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "ops-metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "uncached", label: "ops sem cache", value: integer(uncached.total), color: "danger" },
              { id: "cached", label: "ops com cache", value: integer(cached.total), color: "success" },
              { id: "speedup", label: "aceleração", value: `${fixed(speedup)}×` },
              { id: "vectors", label: "vetores por camada", value: String(vectorsPerLayer) },
            ],
            highlight: "speedup",
          },
          { id: "per-token", piece: "chart", kind: "bar", series: sampleSeries, highlight: SAMPLE_STEPS.length - 1, color: "module-10" },
        ],
      },
      alt: `Operações por token gerado, com ${PROMPT} tokens de prompt: ${sampleSeries.map((item) => `${item.label} ${integer(item.value)}`).join(", ")}. No total, ${integer(uncached.total)} sem cache contra ${integer(cached.total)} com cache, ${fixed(speedup)} vezes menos.`,
    },
    {
      id: "bytes",
      shortTitle: "Bytes",
      title: "Quanto pesa cada token guardado",
      tag: "mechanism",
      body: [
        "O cache é uma tabela que ganha uma coluna por token. Cada coluna tem uma key e um value para cada camada e cada cabeça de atenção. A conta é direta: bytes por token = 2 (key e value) × camadas × cabeças de KV × dimensão da cabeça × bytes por número.",
        `No Llama 2 7B em 16 bits: 2 × ${LLAMA7.layers} × ${LLAMA7.kvHeads} × ${LLAMA7.headDim} × ${BYTES_FP16} = ${integer(kv7)} bytes, exatamente ${fixed(kv7 / MIB, 1)} MiB por token. Uma conversa que enche a janela de ${integer(LLAMA2_WINDOW)} tokens ocupa ${fixed(kv7Window / GB, 2)} GB só de cache. A memória cresce em linha reta com o contexto e com o número de conversas, e não depende do tamanho do vocabulário nem da FFN.`,
      ],
      keyIdea: "KV cache por token = 2 × camadas × cabeças de KV × dimensão da cabeça × bytes.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "bytes-metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "per-token", label: "por token (7B, fp16)", value: `${fixed(kv7 / MIB, 1)} MiB` },
              { id: "window", label: `${integer(LLAMA2_WINDOW)} tokens`, value: `${fixed(kv7Window / GB, 2)} GB`, color: "danger" },
              { id: "layers", label: "camadas × cabeças × dim.", value: `${LLAMA7.layers} × ${LLAMA7.kvHeads} × ${LLAMA7.headDim}` },
            ],
            highlight: "window",
          },
          {
            id: "cache-grid",
            piece: "matrix",
            rows: cacheRows,
            cols: cacheCols,
            values: cacheValues,
            scale: { min: 0, max: 1 },
            highlight: { row: 0, col: CURRENT_TOKEN - 1 },
            color: "module-10",
          },
        ],
      },
      alt: `Grade do cache com keys e values de 2 camadas, preenchida até o token ${CURRENT_TOKEN} de ${SHOWN_TOKENS}. No Llama 2 7B, cada token ocupa ${fixed(kv7 / MIB, 1)} MiB e a janela de ${integer(LLAMA2_WINDOW)} tokens ocupa ${fixed(kv7Window / GB, 2)} GB.`,
    },
    {
      id: "fit",
      shortTitle: "Quantos cabem",
      title: "O cache decide quantas conversas a GPU atende",
      tag: "example",
      body: [
        `Uma H100 tem ${H100_GB} GB. Os pesos do 7B em fp16 levam ${integer(weights7 / GB)} GB, e sobram ${integer(free7 / GB)} GB para o cache (ignorando ativações e as reservas do motor, que comem mais alguns GB). Com conversas de ${integer(LLAMA2_WINDOW)} tokens, cabem ${at4k} ao mesmo tempo. Dobrando o contexto para ${integer(8192)}, cabem ${at8k}.`,
        "O Llama 2 vai até 4.096 tokens; as colunas maiores mostram a mesma arquitetura numa janela mais longa. A curva é o motivo de contexto longo custar caro: não é a conta, é a memória que cada conversa prende enquanto está ativa. Menos conversas simultâneas significam lotes menores e menos tokens por segundo no total.",
      ],
      keyIdea: "Dobrar o contexto dobra o cache por conversa e corta pela metade quantas conversas cabem.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          { id: "concurrency", piece: "chart", kind: "bar", series: concurrency, highlight: CONTEXTS.indexOf(LLAMA2_WINDOW), color: "module-10" },
        ],
      },
      alt: `Conversas simultâneas que cabem numa H100 de ${H100_GB} GB com o Llama 2 7B em fp16, pelo tamanho do contexto: ${concurrency.map((item) => `${item.label}, ${item.value}`).join("; ")}.`,
    },
    {
      id: "shrink",
      shortTitle: "Encolher",
      title: "Menos cabeças de KV, menos bits",
      tag: "tradeoff",
      body: [
        `Num modelo grande, o cache pesa ainda mais. Se o Llama 2 70B guardasse uma key e um value por cabeça de query (${LLAMA70.queryHeads} cabeças, ${LLAMA70.layers} camadas), seriam ${fixed(kv70Mha / MIB, 1)} MiB por token. Ele usa [[grouped-query attention|grouped-query-attention]] com ${LLAMA70.kvHeads} cabeças de KV: ${integer(kv70Gqa / 1024)} KiB por token, ${LLAMA70.queryHeads / LLAMA70.kvHeads} vezes menos.`,
        `Em ${GPUS_70B} H100, os pesos em fp16 deixam ${integer(free70 / GB)} GB livres. Com conversas de ${integer(LLAMA2_WINDOW)} tokens, cabem ${seqs70Mha} sem GQA, ${seqs70Gqa} com GQA e ${seqs70Fp8} guardando o cache em 8 bits, que é a [[quantização|quantization]] aplicada às keys e aos values. O custo: GQA precisa vir do treino, e o cache em 8 bits pode perder um pouco de qualidade. A outra alavanca é não desperdiçar memória com reservas vazias: o [[PagedAttention|paged-attention]] da aula 10-11.`,
      ],
      keyIdea: "Encolher o cache é aumentar o lote: GQA, cache em 8 bits e paginação servem mais conversas na mesma GPU.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          memoryDiagram("weights", ["tokens", "llm", "cache"]),
          {
            id: "variants",
            piece: "metrics-panel",
            metrics: [
              { id: "mha", label: "70B sem GQA", value: `${seqs70Mha} conversas`, color: "danger" },
              { id: "gqa", label: `GQA, ${LLAMA70.kvHeads} cabeças de KV`, value: `${seqs70Gqa} conversas`, color: "success" },
              { id: "fp8", label: "GQA + cache em 8 bits", value: `${seqs70Fp8} conversas`, color: "success" },
            ],
            highlight: "gqa",
          },
        ],
      },
      alt: `Os pesos do 70B ocupam a memória de ${GPUS_70B} H100 e sobram ${integer(free70 / GB)} GB para o cache. Com ${integer(LLAMA2_WINDOW)} tokens por conversa, cabem ${seqs70Mha} sem GQA, ${seqs70Gqa} com GQA e ${seqs70Fp8} com GQA e cache em 8 bits.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Contas trocadas por memória",
      tag: "summary",
      body: [
        "O [[prefill|prefill]] preenche o cache com o prompt inteiro; cada passo de decode lê o cache, acrescenta uma coluna e gera um token. O cache transforma um custo quadrático em linear, mas prende memória proporcional ao contexto e ao número de conversas, e essa memória é o que limita o lote.",
        "Teste o efeito no playground de KV cache do Laboratório, que usa as mesmas contas desta aula. A próxima aula leva a ideia além de uma conversa: reaproveitar o cache de um começo de prompt que muitos pedidos compartilham, o prompt caching.",
      ],
      keyIdea: "KV cache: linear em tempo, linear em memória, e a memória é quem manda no tamanho do lote.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "gpu",
            piece: "block-diagram",
            blocks: [
              { id: "prompt", kind: "context", label: "prompt", col: 0, row: 0.5 },
              { id: "llm", kind: "llm", label: "prefill", col: 1, row: 0.5 },
              { id: "cache", kind: "kv-cache", label: "kv cache", col: 2, row: 0.5 },
              { id: "decode", kind: "server", label: "decode", col: 3, row: 0 },
              { id: "answer", kind: "answer", label: "resposta", col: 3, row: 1 },
            ],
            edges: [
              { from: "prompt", to: "llm" },
              { from: "llm", to: "cache", label: "preenche" },
              { from: "cache", to: "decode", label: "lê a cada token" },
              { from: "decode", to: "answer" },
            ],
            active: "cache",
            done: ["prompt", "llm"],
          },
        ],
      },
      alt: "O prompt passa pelo prefill, que preenche o KV cache, em destaque; o decode lê o cache a cada token e escreve a resposta.",
    },
  ],
  realWorldExample: `No config.json de um modelo no Hugging Face Hub estão os quatro números da conta: num_hidden_layers, num_attention_heads, num_key_value_heads e a dimensão por cabeça (hidden_size dividido por num_attention_heads). No Llama 2 7B, dão ${integer(kv7)} bytes por token em fp16. Motores como o vLLM fazem essa conta ao subir: medem a memória que sobra depois dos pesos e reservam o resto para blocos de KV cache, o que define quantas sequências entram num mesmo passo.`,
  code: {
    language: "python",
    source: `def kv_bytes_per_token(layers, kv_heads, head_dim, bytes_per_value=2):
    """Uma key e um value por camada e por cabeça de KV."""
    return 2 * layers * kv_heads * head_dim * bytes_per_value

llama2_7b = kv_bytes_per_token(32, 32, 128)   # 524288 bytes = 0,5 MiB
llama2_70b = kv_bytes_per_token(80, 8, 128)   # 327680 bytes com GQA

free = 80e9 - 7e9 * 2                         # H100 menos os pesos do 7B
print(int(free // (llama2_7b * 4096)))        # conversas de 4.096 tokens`,
    caption: "A conta do KV cache por token e de quantas conversas cabem numa H100, com as configurações do Llama 2.",
  },
  tradeOffs: {
    pros: [
      "Transforma o custo por token novo de quadrático em linear no contexto",
      "É exato: o resultado é o mesmo de recalcular tudo, sem perda de qualidade",
      "Habilita o reaproveitamento entre pedidos, como o prompt caching",
    ],
    cons: [
      "Prende memória proporcional a contexto × conversas, e limita o tamanho do lote",
      "Contexto longo custa caro mesmo quando a conta é barata",
      "Reduzir o cache (GQA, 8 bits) exige mudança no treino ou aceita alguma perda",
    ],
    alternatives: [
      "Grouped-query ou multi-query attention para menos cabeças de KV",
      "Cache em 8 bits (fp8 ou int8)",
      "Paginação do cache (PagedAttention) para não reservar memória sem uso",
    ],
  },
  knowledgeCheck: [
    {
      id: "double-context",
      prompt: "Um serviço com o 7B atende 30 conversas de 4.096 tokens numa GPU. O produto quer contexto de 8.192. Sem mudar mais nada, o que acontece?",
      options: [
        "Nada: o KV cache não depende do contexto",
        "O cache por conversa dobra, e cabem cerca da metade das conversas ao mesmo tempo",
        "Os pesos do modelo dobram de tamanho",
        "O custo por token passa a crescer com o quadrado do contexto",
      ],
      correct: 1,
      explanation: "O cache cresce em linha reta com os tokens. Com a mesma memória livre, conversas duas vezes mais longas cabem pela metade, e o lote encolhe.",
      lesson: "10-05",
    },
    {
      id: "gqa-heads",
      prompt: "Dois modelos têm as mesmas 32 camadas e 32 cabeças de query de dimensão 128. Um usa 32 cabeças de KV, o outro 8 (GQA). Quanto menor fica o KV cache do segundo?",
      options: ["Igual: as queries são as mesmas", "2 vezes menor", "4 vezes menor", "32 vezes menor"],
      correct: 2,
      explanation: "O cache guarda keys e values por cabeça de KV. De 32 para 8 cabeças, a conta 2 × camadas × cabeças de KV × dimensão × bytes cai 4 vezes.",
      lesson: "10-05",
    },
  ],
  related: ["10-04", "10-06", "03-10"],
  references: [
    { title: "Hugging Face Transformers: KV cache strategies", url: "https://huggingface.co/docs/transformers/kv_cache", kind: "docs" },
    { title: "Ainslie et al. (2023), GQA: Training Generalized Multi-Query Transformer Models", url: "https://arxiv.org/abs/2305.13245", kind: "paper" },
    { title: "Touvron et al. (2023), Llama 2: Open Foundation and Fine-Tuned Chat Models", url: "https://arxiv.org/abs/2307.09288", kind: "paper" },
  ],
};

export default lesson;
