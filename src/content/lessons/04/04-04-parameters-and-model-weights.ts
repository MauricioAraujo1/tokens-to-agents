import type { LessonContent } from "../../../types/content";

// Parâmetros e pesos, com as contas no arquivo: os parâmetros de uma camada de brinquedo, a aproximação
// 12 · L · d² para os blocos de um Transformer, memória = parâmetros × bytes por peso, a memória do treino
// com Adam em precisão mista (16 bytes por parâmetro, do paper do ZeRO) e o custo de ≈ 2 · N FLOPs por
// token (Kaplan et al., 2020). Os totais e ativos do Mixtral são os do paper.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const GB = 1e9;
const gb = (bytes: number) => fixed(bytes / GB, 0);

// Passo 1: uma camada densa com 3 entradas e 4 saídas.
const inputs = ["x₁", "x₂", "x₃"];
const outputs = ["s₁", "s₂", "s₃", "s₄"];
const layerWeights = [
  [0.8, -0.3, 0.1, 0.5],
  [-0.2, 0.9, 0.4, -0.6],
  [0.3, 0.2, -0.7, 0.1],
];
const layerBias = [0.1, 0, -0.2, 0.05];
const layerParams = inputs.length * outputs.length + outputs.length;

// Passo 2: um Transformer decoder hipotético com 24 blocos, d = 2.048 e vocabulário de 32.000.
const LAYERS = 24;
const D = 2048;
const VOCAB = 32_000;
/** Attention: 4 · d² (Q, K, V e saída). FFN com d_ff = 4d: 8 · d². Normas e vieses ficam de fora. */
const perBlock = 12 * D * D;
const blocksParams = LAYERS * perBlock;
const embeddingParams = VOCAB * D;
const totalParams = blocksParams + embeddingParams;
const blocksShare = (100 * blocksParams) / totalParams;

// Passo 3: memória dos pesos em bf16 (2 bytes) para tamanhos comuns de modelos abertos.
const BF16 = 2;
const sizes = [
  { label: "1B", params: 1e9 },
  { label: "7B", params: 7e9 },
  { label: "13B", params: 13e9 },
  { label: "70B", params: 70e9 },
];
const GPU_GB = 80;
const memoryGB = sizes.map((size) => (size.params * BF16) / GB);

// Passo 4: treino com Adam em precisão mista: 2 (pesos fp16) + 2 (gradientes) + 12 (cópia fp32, momento e variância).
const SEVEN_B = 7e9;
const weightsBytes = SEVEN_B * 2;
const gradientBytes = SEVEN_B * 2;
const adamBytes = SEVEN_B * 12;
const trainingBytes = weightsBytes + gradientBytes + adamBytes;
const trainingGpus = Math.ceil(trainingBytes / (GPU_GB * GB));

// Passo 5: ≈ 2 · N FLOPs por token gerado; Mixtral 8x7B com 47B totais e 13B ativos por token.
const flopsPerToken = (params: number) => 2 * params;
const MIXTRAL_TOTAL = 47e9;
const MIXTRAL_ACTIVE = 13e9;

const lesson: LessonContent = {
  id: "04-04",
  subtitle: "O que são os bilhões de números de um LLM, onde eles ficam, quanta memória ocupam e quanto custam a cada token.",
  objectives: [
    "Explicar o que é um parâmetro e contar os de uma camada",
    "Estimar os parâmetros de um Transformer com 12 · L · d²",
    "Calcular a memória dos pesos para inferência e para treino",
    "Relacionar o número de parâmetros ao custo por token, incluindo MoE",
  ],
  steps: [
    {
      id: "knobs",
      shortTitle: "Botões",
      title: "Um parâmetro é um botão ajustado pelo treino",
      tag: "context",
      body: [
        "Pense numa mesa de som com muitos botões: cada um muda um pouco o resultado. Um [[parâmetro|parameter]] é um desses botões, um número que o treino ajusta. Os pesos multiplicam as entradas; os vieses são somados no fim.",
        `A camada da cena tem ${inputs.length} entradas e ${outputs.length} saídas: ${inputs.length} × ${outputs.length} = ${inputs.length * outputs.length} pesos mais ${outputs.length} vieses, ${layerParams} parâmetros. Um LLM é feito das mesmas matrizes, só que com milhares de linhas e colunas, empilhadas em dezenas de blocos.`,
      ],
      keyIdea: "Parâmetros são os números aprendidos; “pesos do modelo” é o arquivo com todos eles.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "layer",
            piece: "matrix",
            rows: [...inputs, "viés"],
            cols: outputs,
            values: [...layerWeights, layerBias],
            scale: { min: -1, max: 1 },
            highlight: { row: 1, col: 1 },
            showValues: true,
            color: "module-04",
          },
        ],
      },
      alt: `Matriz de uma camada com ${inputs.length} entradas e ${outputs.length} saídas, mais uma linha de vieses: ${layerParams} parâmetros no total.`,
    },
    {
      id: "count",
      shortTitle: "Contagem",
      title: "Onde ficam os bilhões de parâmetros",
      tag: "mechanism",
      body: [
        `Em cada bloco do [[Transformer|transformer]], a attention tem 4 matrizes d × d (query, key, value e saída) e a feed-forward, com d_ff = 4d, tem 2 matrizes de d × 4d. Somando, cerca de 12 · d² por bloco. Com d = ${integer(D)}, são ${integer(perBlock)} parâmetros por bloco.`,
        `Um modelo com ${LAYERS} blocos e vocabulário de ${integer(VOCAB)} tokens tem ${integer(blocksParams)} nos blocos e ${integer(embeddingParams)} na tabela de embeddings: ${fixed(totalParams / 1e9)} ${totalParams < 2e9 ? "bilhão" : "bilhões"}, ${fixed(blocksShare, 0)}% nos blocos. Dobrar d quadruplica os blocos; dobrar L só dobra.`,
      ],
      keyIdea: "Parâmetros ≈ 12 · L · d² + V · d: a largura d pesa ao quadrado.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "params",
            piece: "metrics-panel",
            metrics: [
              { id: "block", label: "por bloco (12 · d²)", value: integer(perBlock) },
              { id: "blocks", label: `${LAYERS} blocos`, value: integer(blocksParams) },
              { id: "embed", label: "embeddings (V · d)", value: integer(embeddingParams) },
              { id: "total", label: "total", value: `${fixed(totalParams / 1e9)} bi`, color: "module-04" },
            ],
            highlight: "total",
          },
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "tokens", kind: "tokens", label: "tokens", col: 0, row: 0 },
              { id: "embed", kind: "embedding", label: "embeddings", col: 1, row: 0 },
              { id: "llm", kind: "llm", label: `${LAYERS} blocos`, col: 2, row: 0 },
              { id: "logits", kind: "answer", label: "logits", col: 3, row: 0 },
            ],
            edges: [
              { from: "tokens", to: "embed", label: "V · d" },
              { from: "embed", to: "llm", label: "12 · L · d²" },
              { from: "llm", to: "logits" },
            ],
            active: "llm",
          },
        ],
      },
      alt: `Contagem de parâmetros de um Transformer com ${LAYERS} blocos e d = ${integer(D)}: ${integer(perBlock)} por bloco, ${integer(embeddingParams)} nos embeddings, ${fixed(totalParams / 1e9)} ${totalParams < 2e9 ? "bilhão" : "bilhões"} no total.`,
    },
    {
      id: "memory",
      shortTitle: "Memória",
      title: "Memória = parâmetros × bytes por peso",
      tag: "mechanism",
      body: [
        `Para rodar o modelo, todos os pesos precisam estar na memória da GPU. A conta é direta: parâmetros × bytes por peso. Em bf16, cada peso ocupa 2 bytes. ${sizes.map((size, index) => `${size.label}: ${fixed(memoryGB[index], 0)} GB`).join("; ")}.`,
        `Uma GPU de ${GPU_GB} GB comporta os três primeiros. O de 70B, aceso na cena, passa da linha e precisa de pelo menos duas GPUs, ou de [[quantização|quantization]]: em 4 bits (0,5 byte por peso), ele cai para ${fixed((70e9 * 0.5) / GB, 0)} GB. E ainda é preciso sobrar memória para o KV cache das conversas.`,
      ],
      keyIdea: "Antes de escolher um modelo, multiplique: parâmetros × bytes por peso diz se ele cabe na sua GPU.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "memory",
            piece: "chart",
            kind: "bar",
            series: sizes.map((size, index) => ({ label: size.label, value: memoryGB[index] })),
            cutoff: { mode: "threshold", value: GPU_GB, label: `${GPU_GB} GB` },
            highlight: sizes.length - 1,
            color: "module-04",
          },
        ],
      },
      alt: `Memória dos pesos em bf16: ${sizes.map((size, index) => `${size.label} ${fixed(memoryGB[index], 0)} GB`).join(", ")}. Só o de 70B passa da linha de ${GPU_GB} GB de uma GPU.`,
    },
    {
      id: "training-memory",
      shortTitle: "Treino",
      title: "Treinar pede muito mais memória que rodar",
      tag: "example",
      body: [
        `Rodar um modelo de 7B em bf16 pede ${gb(weightsBytes)} GB de pesos. Treinar com o otimizador Adam em precisão mista pede bem mais: os pesos (2 bytes), os gradientes (2 bytes) e, para o Adam, uma cópia dos pesos em fp32, o momento e a variância (12 bytes). São 16 bytes por parâmetro.`,
        `Para 7B, ${gb(weightsBytes)} + ${gb(gradientBytes)} + ${gb(adamBytes)} = ${gb(trainingBytes)} GB, sem contar as ativações. Isso já exige ${trainingGpus} GPUs de ${GPU_GB} GB com o estado dividido entre elas, a ideia do ZeRO. É por isso que ajustar modelos grandes costuma usar [[LoRA|lora]], que treina só uma fração dos parâmetros.`,
      ],
      keyIdea: "Inferência: cerca de 2 bytes por parâmetro. Treino completo com Adam: cerca de 16.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "gpu", kind: "server", label: `${trainingGpus} gpus de ${GPU_GB} GB`, col: 0, row: 0.5 },
              { id: "weights", kind: "memory", label: `pesos ${gb(weightsBytes)} GB`, col: 1, row: 0 },
              { id: "grads", kind: "memory", label: `gradientes ${gb(gradientBytes)} GB`, col: 1, row: 1 },
              { id: "adam", kind: "memory", label: `adam ${gb(adamBytes)} GB`, col: 2, row: 0.5 },
            ],
            edges: [
              { from: "gpu", to: "weights" },
              { from: "gpu", to: "grads" },
              { from: "gpu", to: "adam", label: "12 bytes/parâm." },
            ],
            active: "adam",
          },
        ],
      },
      alt: `Memória do treino de um modelo de 7B com Adam: pesos ${gb(weightsBytes)} GB, gradientes ${gb(gradientBytes)} GB e estado do Adam ${gb(adamBytes)} GB, em destaque, somando ${gb(trainingBytes)} GB em ${trainingGpus} GPUs.`,
    },
    {
      id: "compute",
      shortTitle: "Custo",
      title: "Cada token custa cerca de 2 FLOPs por parâmetro",
      tag: "tradeoff",
      body: [
        `Gerar um token passa por todos os pesos uma vez: uma multiplicação e uma soma para cada um, cerca de 2 · N operações. ${sizes.map((size) => `${size.label}: ${fixed(flopsPerToken(size.params) / 1e9, 0)} GFLOPs`).join("; ")} por token. Mais parâmetros dão mais capacidade, e cada token fica proporcionalmente mais caro.`,
        `O [[Mixture of Experts|mixture-of-experts]] separa as duas coisas. O Mixtral 8x7B tem cerca de 47B parâmetros no total, mas usa só uns 13B por token: o custo por token fica perto de ${fixed(flopsPerToken(MIXTRAL_ACTIVE) / 1e9, 0)} GFLOPs. A memória, não: os ${fixed((MIXTRAL_TOTAL * BF16) / GB, 0)} GB dos pesos em bf16 continuam precisando estar carregados.`,
      ],
      keyIdea: "Parâmetros ativos definem o custo por token; parâmetros totais definem a memória.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "moe",
            piece: "metrics-panel",
            metrics: [
              { id: "total", label: "Mixtral: total", value: "≈ 47B" },
              { id: "active", label: "ativos por token", value: "≈ 13B", color: "module-04" },
              { id: "flops", label: "GFLOPs por token", value: fixed(flopsPerToken(MIXTRAL_ACTIVE) / 1e9, 0) },
              { id: "memory", label: "pesos bf16", value: `${fixed((MIXTRAL_TOTAL * BF16) / GB, 0)} GB` },
            ],
            highlight: "active",
          },
          {
            id: "flops",
            piece: "chart",
            kind: "line",
            series: sizes.map((size) => ({ label: size.label, value: flopsPerToken(size.params) / 1e9 })),
            highlight: 1,
            color: "module-04",
          },
        ],
      },
      alt: `GFLOPs por token gerado, cerca de 2 por parâmetro: ${sizes.map((size) => `${size.label} ${fixed(flopsPerToken(size.params) / 1e9, 0)}`).join(", ")}. O Mixtral tem 47B no total e 13B ativos por token.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Do treino ao arquivo de pesos",
      tag: "summary",
      body: [
        "O treino ajusta os parâmetros, e o resultado é um arquivo de pesos: bilhões de números em bf16, normalmente em .safetensors. Para servir o modelo, esse arquivo é carregado na GPU, e cada token gerado passa por todos os pesos ativos.",
        "Três contas resolvem a maior parte das decisões: 12 · L · d² para o tamanho, parâmetros × bytes para a memória e 2 · N para o custo por token. A próxima aula mostra o outro grande consumidor de memória: a janela de contexto.",
      ],
      keyIdea: "Tamanho, memória e custo por token saem da contagem de parâmetros.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "data", kind: "documents", label: "dados", col: 0, row: 0 },
              { id: "train", kind: "eval", label: "treino", col: 1, row: 0 },
              { id: "weights", kind: "memory", label: "pesos bf16", col: 2, row: 0 },
              { id: "gpu", kind: "server", label: "gpu", col: 2, row: 1 },
              { id: "answer", kind: "answer", label: "tokens", col: 3, row: 1 },
            ],
            edges: [
              { from: "data", to: "train" },
              { from: "train", to: "weights", label: "ajusta" },
              { from: "weights", to: "gpu", label: "carrega" },
              { from: "gpu", to: "answer", label: "2 · N por token" },
            ],
            active: "weights",
            done: ["data", "train"],
          },
        ],
      },
      alt: "Os dados alimentam o treino, que ajusta os pesos em bf16, em destaque; os pesos são carregados na GPU, que gera tokens a cerca de 2 · N FLOPs cada.",
    },
  ],
  realWorldExample:
    "Os modelos abertos são publicados com o tamanho no nome (Llama 2 7B, 13B e 70B) e os pesos em arquivos .safetensors no Hugging Face Hub. Quem vai hospedar um deles faz a conta desta aula antes de alugar hardware: o Llama 2 70B em bf16 ocupa cerca de 140 GB só de pesos e não cabe numa única GPU de 80 GB; quantizado em 4 bits, cabe.",
  code: {
    language: "python",
    source: `from transformers import AutoModelForCausalLM

model = AutoModelForCausalLM.from_pretrained("openai-community/gpt2")
params = sum(p.numel() for p in model.parameters())
print(f"{params:,} parâmetros")                  # 124,439,808
print(f"{params * 2 / 1e9:.2f} GB em bf16")      # ~0.25 GB`,
    caption: "Contando os parâmetros do GPT-2 small e estimando a memória dos pesos em 2 bytes por parâmetro.",
  },
  tradeOffs: {
    pros: [
      "Mais parâmetros guardam mais conhecimento e padrões",
      "A contagem permite prever memória e custo antes de rodar",
      "MoE aumenta a capacidade sem aumentar o custo por token na mesma proporção",
    ],
    cons: [
      "Memória e custo por token crescem com o tamanho",
      "Treino completo pede cerca de 8 vezes a memória da inferência",
      "Modelos grandes exigem várias GPUs ou quantização, com perda de qualidade a medir",
    ],
    alternatives: [
      "Quantização em 8 ou 4 bits para caber em menos memória",
      "Modelos menores e destilados quando a tarefa permite",
      "LoRA e outras técnicas que treinam só uma fração dos parâmetros",
    ],
  },
  knowledgeCheck: [
    {
      id: "fit-13b",
      prompt: "Um modelo de 13B em bf16 precisa rodar numa GPU de 24 GB. O que acontece?",
      options: [
        "Cabe com folga, porque 13 é menor que 24",
        "Não cabe: só os pesos ocupam cerca de 26 GB; é preciso quantizar ou usar mais GPUs",
        "Cabe, porque os pesos ficam no disco durante a geração",
        "Cabe, desde que a temperatura seja baixa",
      ],
      correct: 1,
      explanation: "Memória = parâmetros × bytes. 13 bilhões × 2 bytes = 26 GB, acima de 24 GB, e ainda falta espaço para o KV cache.",
      lesson: "04-04",
    },
    {
      id: "moe-cost",
      prompt: "Um modelo MoE tem 47B parâmetros no total e 13B ativos por token. Qual afirmação está certa?",
      options: [
        "Ele precisa de memória para 13B e custa como um de 47B",
        "Ele precisa de memória para os 47B e custa por token perto de um denso de 13B",
        "Ele precisa de memória e custo de 13B",
        "Ele precisa de memória e custo de 47B",
      ],
      correct: 1,
      explanation: "Todos os experts ficam carregados, então a memória acompanha o total. Cada token passa só pelos experts escolhidos, então o custo acompanha os ativos.",
      lesson: "04-04",
    },
  ],
  related: ["03-13", "03-15", "04-05", "10-09"],
  references: [
    { title: "Kaplan et al. (2020), Scaling Laws for Neural Language Models", url: "https://arxiv.org/abs/2001.08361", kind: "paper" },
    { title: "Rajbhandari et al. (2019), ZeRO: Memory Optimizations Toward Training Trillion Parameter Models", url: "https://arxiv.org/abs/1910.02054", kind: "paper" },
    { title: "Jiang et al. (2024), Mixtral of Experts", url: "https://arxiv.org/abs/2401.04088", kind: "paper" },
  ],
};

export default lesson;
