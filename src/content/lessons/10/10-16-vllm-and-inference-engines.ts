import type { LessonContent } from "../../../types/content";

// Motores de inferência com as contas no arquivo: o orçamento de memória que o vLLM monta a partir de
// --gpu-memory-utilization e --max-model-len para o Llama 2 7B numa H100 de 80 GB (a reserva para
// ativações é uma hipótese rotulada), os blocos de 16 tokens do PagedAttention e a capacidade de KV cache
// do Llama 2 70B com GQA (80 camadas, 8 cabeças de KV, dimensão 128) por tamanho de tensor parallelism.

const fixed = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const GB = 1e9;

const H100_GB = 80;
const GPU_MEMORY_UTILIZATION = 0.9;
const MAX_MODEL_LEN = 4096;
const BLOCK_TOKENS = 16;
const FP16 = 2;

// Passo 3: Llama 2 7B (32 camadas, 32 cabeças de KV, dimensão 128) numa GPU.
const kvBytesPerToken = (layers: number, kvHeads: number, headDim = 128) => 2 * layers * kvHeads * headDim * FP16;
const KV_7B = kvBytesPerToken(32, 32);
const WEIGHTS_7B_GB = (7e9 * FP16) / GB;
const ACTIVATIONS_GB = 4;
const budgetGB = H100_GB * GPU_MEMORY_UTILIZATION;
const kvBudgetGB = budgetGB - WEIGHTS_7B_GB - ACTIVATIONS_GB;
const kvTokens = Math.floor((kvBudgetGB * GB) / KV_7B);
const kvBlocks = Math.floor(kvTokens / BLOCK_TOKENS);
const fullSequences = Math.floor(kvTokens / MAX_MODEL_LEN);
const blockMiB = (KV_7B * BLOCK_TOKENS) / 2 ** 20;

// Passo 4: Llama 2 70B em fp16, dividido entre 2, 4 ou 8 GPUs (tensor parallelism).
const KV_70B = kvBytesPerToken(80, 8);
const WEIGHTS_70B_GB = (70e9 * FP16) / GB;
const tpSizes = [2, 4, 8];
const tpCapacity = tpSizes.map((gpus) => {
  const freeGB = gpus * H100_GB * GPU_MEMORY_UTILIZATION - WEIGHTS_70B_GB;
  const tokens = Math.max(0, (freeGB * GB) / KV_70B);
  return { gpus, freeGB, tokens, sequences: Math.floor(tokens / MAX_MODEL_LEN) };
});
const [tp2, tp4] = tpCapacity;

const lesson: LessonContent = {
  id: "10-16",
  subtitle: "O que um motor de inferência como o vLLM faz por dentro, como configurar a memória dele e como escolher entre os motores disponíveis.",
  objectives: [
    "Reconhecer as peças de um motor de inferência e o laço que ele repete a cada passo",
    "Calcular o KV cache disponível a partir das opções do vLLM",
    "Dimensionar o tensor parallelism de um modelo grande pela memória que sobra",
    "Escolher um motor pelo hardware e pelo tipo de uso",
  ],
  steps: [
    {
      id: "engine",
      shortTitle: "O motor",
      title: "O modelo é o motor, o engine é o carro inteiro",
      tag: "context",
      body: [
        "Um motor de carro sozinho, no chão da garagem, não leva ninguém a lugar nenhum: falta câmbio, injeção, painel. Os pesos de um LLM são esse motor. O [[inference engine|inference-engine]] é o carro: recebe os pedidos por uma API, decide quem entra em cada passo, guarda o KV cache e chama os kernels certos na GPU.",
        "Tudo o que o módulo mostrou mora dentro dele. O [[vLLM|vllm]] nasceu com o [[PagedAttention|paged-attention]] e faz [[continuous batching|continuous-batching]], [[prefix caching|prefix-caching]], kernels de attention otimizados e [[tensor parallelism|tensor-parallelism]], atrás de um servidor HTTP compatível com a API da OpenAI.",
      ],
      keyIdea: "Um motor de inferência junta escalonador, gerência do KV cache e kernels: é ele que transforma pesos em serviço.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "internals",
            piece: "block-diagram",
            blocks: [
              { id: "phone", kind: "phone", label: "cliente", col: 0, row: 0 },
              { id: "api", kind: "app", label: "api openai", col: 1, row: 0 },
              { id: "scheduler", kind: "queue", label: "escalonador", col: 2, row: 0 },
              { id: "kv", kind: "kv-cache", label: "blocos de kv", col: 3, row: 0 },
              { id: "gpu", kind: "server", label: "gpu: kernels", col: 2, row: 1 },
              { id: "llm", kind: "llm", label: "pesos", col: 3, row: 1 },
            ],
            edges: [
              { from: "phone", to: "api", label: "/v1/chat" },
              { from: "api", to: "scheduler", label: "pedido" },
              { from: "scheduler", to: "kv", label: "aloca" },
              { from: "scheduler", to: "gpu", label: "lote" },
              { from: "llm", to: "gpu" },
            ],
            active: "scheduler",
          },
        ],
      },
      alt: "O cliente chama a API no formato da OpenAI, que entrega o pedido ao escalonador, em destaque; o escalonador aloca blocos de KV cache e monta o lote que a GPU executa com os pesos do modelo.",
    },
    {
      id: "step-loop",
      shortTitle: "O laço",
      title: "O mesmo laço, a cada passo",
      tag: "mechanism",
      body: [
        "Um motor de inferência é um laço que nunca para. A cada passo, o escalonador olha a fila e os pedidos em andamento, decide quem entra no lote (os novos com o prefill, os antigos com mais um token de decode) e reserva os blocos de KV cache de que cada um precisa.",
        "Aí a GPU roda uma passada com o lote inteiro, o amostrador escolhe um token para cada sequência, os tokens saem em streaming, e as sequências que terminaram devolvem os blocos. Se faltar memória, o escalonador faz preemption de alguém. O lote muda a cada volta: é isso o continuous batching.",
      ],
      keyIdea: "Agendar, alocar, rodar, amostrar, devolver, liberar: o motor repete esse laço milhares de vezes por segundo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "loop",
            piece: "pipeline",
            stages: [
              { id: "receive", label: "receber" },
              { id: "schedule", label: "agendar", color: "module-10" },
              { id: "allocate", label: "alocar blocos" },
              { id: "forward", label: "passada na gpu" },
              { id: "sample", label: "amostrar" },
              { id: "free", label: "liberar blocos" },
            ],
            active: "forward",
            done: ["receive", "schedule", "allocate"],
            repeat: { from: "schedule", to: "free", label: "× a cada passo" },
          },
        ],
      },
      alt: "Pipeline do motor: receber, e depois agendar, alocar blocos, passada na GPU (em destaque), amostrar e liberar blocos, num trecho repetido a cada passo.",
    },
    {
      id: "memory",
      shortTitle: "Memória",
      title: "Duas opções que decidem a capacidade",
      tag: "mechanism",
      body: [
        `Ao subir, o vLLM reserva uma fração da GPU dada por --gpu-memory-utilization (o padrão é ${fixed(GPU_MEMORY_UTILIZATION)}): numa H100 de ${H100_GB} GB, ${integer(budgetGB)} GB. Tira os ${integer(WEIGHTS_7B_GB)} GB dos pesos do Llama 2 7B em fp16 e o pico de ativações que ele mede num teste de inicialização (${ACTIVATIONS_GB} GB neste exemplo). O resto, ${integer(kvBudgetGB)} GB, vira KV cache.`,
        `A ${integer(KV_7B)} bytes por token, cabem ${integer(kvTokens)} tokens, ou ${integer(kvBlocks)} blocos de ${BLOCK_TOKENS} tokens (${integer(blockMiB)} MiB cada). Com --max-model-len ${MAX_MODEL_LEN}, são ${fullSequences} sequências de tamanho máximo ao mesmo tempo; sequências mais curtas deixam caber mais. Subir o max-model-len não reserva mais memória, mas aumenta quanto um único pedido pode ocupar.`,
      ],
      keyIdea: "KV cache disponível = fração da GPU − pesos − ativações; a capacidade em pedidos sai dele dividido pelo tamanho das sequências.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "budget",
            piece: "metrics-panel",
            metrics: [
              { id: "budget", label: `${H100_GB} GB × ${fixed(GPU_MEMORY_UTILIZATION)}`, value: `${integer(budgetGB)} GB` },
              { id: "weights", label: "pesos 7B fp16", value: `${integer(WEIGHTS_7B_GB)} GB` },
              { id: "kv", label: "kv cache", value: `${integer(kvBudgetGB)} GB`, color: "module-10" },
              { id: "tokens", label: "tokens no cache", value: integer(kvTokens), color: "success" },
              { id: "seqs", label: `sequências de ${MAX_MODEL_LEN}`, value: String(fullSequences) },
            ],
            highlight: "tokens",
          },
        ],
      },
      alt: `Orçamento de memória: ${integer(budgetGB)} GB reservados de ${H100_GB} GB, ${integer(WEIGHTS_7B_GB)} GB de pesos, ${integer(kvBudgetGB)} GB de KV cache, ${integer(kvTokens)} tokens e ${fullSequences} sequências de ${MAX_MODEL_LEN} tokens.`,
    },
    {
      id: "tensor-parallel",
      shortTitle: "Várias GPUs",
      title: "70B: caber não basta, precisa sobrar",
      tag: "example",
      body: [
        `O Llama 2 70B em fp16 tem ${integer(WEIGHTS_70B_GB)} GB de pesos: não cabe numa H100. Com --tensor-parallel-size 2, cada camada se divide entre 2 GPUs, e os pesos cabem nos ${integer(2 * H100_GB * GPU_MEMORY_UTILIZATION)} GB reservados. Mas sobram só ${integer(tp2.freeGB)} GB para o KV cache: ${integer(tp2.tokens)} tokens, ${tp2.sequences} sequências de ${MAX_MODEL_LEN} tokens, antes mesmo de descontar as ativações.`,
        `Com 4 GPUs, sobram ${integer(tp4.freeGB)} GB e cabem ${integer(tp4.tokens)} tokens, porque o GQA do 70B guarda só ${integer(KV_70B / 1024)} KiB por token. Dobrar as GPUs multiplicou a capacidade por ${integer(tp4.tokens / tp2.tokens)}: o que limita o serviço é a memória que sobra depois dos pesos. A alternativa é quantizar os pesos para caber em menos GPUs e deixar o espaço para o cache.`,
      ],
      keyIdea: "Escolha o número de GPUs pelo KV cache que sobra depois dos pesos, não só pelo que cabe.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "tp",
            piece: "chart",
            kind: "bar",
            series: tpCapacity.map((option) => ({ label: `${option.gpus} gpus`, value: Math.round(option.tokens / 1000) })),
            highlight: 1,
            color: "module-10",
          },
        ],
      },
      alt: `Milhares de tokens de KV cache do Llama 2 70B em fp16 por número de GPUs H100: ${tpCapacity.map((option) => `${option.gpus} GPUs, ${integer(option.tokens)} tokens`).join("; ")}.`,
    },
    {
      id: "landscape",
      shortTitle: "Motores",
      title: "Qual motor para qual lugar",
      tag: "tradeoff",
      body: [
        "Em GPU de datacenter, os mais usados são o vLLM, o SGLang (que compartilha prefixos numa árvore, o RadixAttention) e o TensorRT-LLM, da NVIDIA, que compila o modelo para extrair o máximo das GPUs dela. O TGI, da Hugging Face, faz o mesmo papel e se integra ao Hub. A escolha depende de quais modelos e GPUs cada um suporta bem e de testes de carga no seu tráfego.",
        "Fora do datacenter, o [[llama.cpp|llama-cpp]] roda modelos quantizados em [[GGUF|gguf]] em CPU, Apple Silicon e GPUs de consumo, e é a base de ferramentas como o Ollama. Ele troca vazão de muitos usuários por rodar em qualquer máquina: ótimo para um notebook offline, fraco para servir milhares de pedidos.",
      ],
      keyIdea: "Datacenter com muitos usuários: vLLM, SGLang, TensorRT-LLM. Uma máquina local: llama.cpp com GGUF.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "landscape",
            piece: "block-diagram",
            blocks: [
              { id: "users", kind: "user", label: "milhares", col: 0, row: 0 },
              { id: "dc", kind: "server", label: "gpus h100", col: 1, row: 0 },
              { id: "engines", kind: "llm", label: "vllm, sglang", col: 2, row: 0 },
              { id: "laptop", kind: "laptop", label: "notebook", col: 0, row: 1 },
              { id: "gguf", kind: "documents", label: "modelo gguf", col: 1, row: 1 },
              { id: "local", kind: "llm", label: "llama.cpp", col: 2, row: 1 },
            ],
            edges: [
              { from: "users", to: "dc" },
              { from: "dc", to: "engines", label: "alta vazão" },
              { from: "laptop", to: "gguf" },
              { from: "gguf", to: "local", label: "offline" },
            ],
            active: "engines",
          },
        ],
      },
      alt: "Duas trilhas: milhares de usuários chegam a GPUs H100 com vLLM ou SGLang, em destaque, para alta vazão; um notebook carrega um modelo GGUF no llama.cpp para rodar offline.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "O módulo inteiro dentro de um motor",
      tag: "summary",
      body: [
        "Um motor de inferência junta tudo o que o módulo mostrou: prefill e decode, KV cache paginado, prefix caching, continuous batching, quantização e paralelismo, atrás de uma API. Configurar bem é, antes de tudo, fazer a conta de memória: fração da GPU, pesos, ativações e o KV cache que sobra.",
        "Até aqui, o modelo foi usado como veio. O módulo 11 muda isso: fine-tuning, LoRA e QLoRA para adaptar o modelo aos seus dados e às suas tarefas.",
      ],
      keyIdea: "Servir bem um LLM = escolher o motor certo e fazer a conta de memória antes de subir.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "module",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "phases", label: "prefill e decode" },
              { id: "kv", label: "kv cache paginado", color: "module-10" },
              { id: "batch", label: "continuous batching" },
              { id: "quant", label: "quantização" },
              { id: "serve", label: "serving e custo" },
              { id: "route", label: "roteamento" },
              { id: "engine", label: "motor de inferência", color: "brand" },
            ],
          },
        ],
      },
      alt: "Fluxo em chips do módulo: prefill e decode, KV cache paginado, continuous batching, quantização, serving e custo, roteamento e motor de inferência.",
    },
  ],
  realWorldExample:
    "O vLLM saiu de Berkeley junto com o paper do PagedAttention (Kwon et al., SOSP 2023), que relatou de 2 a 4 vezes mais vazão que o FasterTransformer e o Orca com a mesma latência. Hoje é um projeto de código aberto com um servidor compatível com a API da OpenAI: o mesmo código cliente fala com a OpenAI ou com o seu modelo trocando só a base_url. No outro extremo, o Ollama roda modelos GGUF localmente em cima do llama.cpp.",
  code: {
    language: "bash",
    source: `vllm serve meta-llama/Llama-2-7b-chat-hf \\
  --gpu-memory-utilization 0.9 \\
  --max-model-len 4096 \\
  --tensor-parallel-size 1

curl http://localhost:8000/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -d '{"model": "meta-llama/Llama-2-7b-chat-hf",
       "messages": [{"role": "user", "content": "O que é KV cache?"}],
       "max_tokens": 200}'`,
    caption: "Sobe o vLLM com as opções de memória da aula e chama a rota /v1/chat/completions, no formato da OpenAI.",
  },
  tradeOffs: {
    pros: [
      "Continuous batching, KV cache paginado e prefix caching prontos, sem escrever escalonador",
      "API compatível com a da OpenAI facilita trocar de provedor para modelo próprio",
      "Opções explícitas de memória e paralelismo deixam a capacidade previsível",
    ],
    cons: [
      "Cada motor suporta bem um conjunto diferente de modelos, quantizações e GPUs",
      "Versões mudam rápido, com opções e padrões que mudam junto",
      "Desempenho real só aparece em teste de carga com o seu tráfego",
    ],
    alternatives: [
      "API gerenciada de um provedor, sem GPU para operar",
      "llama.cpp ou Ollama para uso local e offline",
      "Hugging Face Transformers com generate(), para protótipos e pesquisa",
    ],
  },
  knowledgeCheck: [
    {
      id: "max-model-len",
      prompt: "No vLLM com um 7B numa H100, você reduz --max-model-len de 8192 para 4096 sem mudar mais nada. O que acontece?",
      options: [
        "Os pesos passam a ocupar metade da memória",
        "O KV cache total continua o mesmo, mas cabem o dobro de sequências de tamanho máximo, e pedidos acima de 4096 tokens passam a ser recusados",
        "A GPU fica duas vezes mais rápida por token",
        "O prefix caching é desligado",
      ],
      correct: 1,
      explanation: "O cache sai da fração da GPU menos pesos e ativações. Com sequências máximas menores, cabem mais delas ao mesmo tempo, ao custo de limitar o tamanho de cada pedido.",
      lesson: "10-16",
    },
    {
      id: "engine-choice",
      prompt: "Uma equipe precisa rodar um modelo de 7B num notebook sem GPU dedicada, sem internet, para um único usuário. Qual combinação faz mais sentido?",
      options: [
        "vLLM com tensor parallelism em 8 GPUs",
        "llama.cpp com o modelo quantizado em GGUF",
        "TensorRT-LLM compilado para H100",
        "Uma Batch API na nuvem",
      ],
      correct: 1,
      explanation: "O llama.cpp roda modelos GGUF quantizados em CPU e Apple Silicon, offline. Os motores de datacenter brilham com muitos usuários em GPUs grandes.",
      lesson: "10-16",
    },
  ],
  related: ["10-15", "10-11", "17-11"],
  references: [
    {
      title: "Kwon et al. (2023), Efficient Memory Management for Large Language Model Serving with PagedAttention",
      url: "https://arxiv.org/abs/2309.06180",
      kind: "paper",
    },
    { title: "vLLM: repositório", url: "https://github.com/vllm-project/vllm", kind: "repo" },
    { title: "llama.cpp: repositório", url: "https://github.com/ggml-org/llama.cpp", kind: "repo" },
  ],
};

export default lesson;
