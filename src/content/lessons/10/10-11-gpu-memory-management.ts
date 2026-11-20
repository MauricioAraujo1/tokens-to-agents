import type { LessonContent } from "../../../types/content";

// Gerência da memória da GPU com as contas no arquivo: o orçamento de uma H100 de 80 GB com a fração
// padrão do vLLM (gpu_memory_utilization = 0,9), os pesos de um 7B em fp16 e uma reserva para ativações
// (hipótese da aula, não medida); o KV cache do Llama 2 7B (2 × 32 camadas × 32 cabeças × 128 dimensões
// × 2 bytes por token) em blocos de 16 tokens; a reserva contígua pelo tamanho máximo contra a paginação
// do PagedAttention para 6 pedidos; e o custo de tirar um pedido da GPU por troca ou por recálculo.

const fixed = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const percent = (value: number) => `${Math.round(value * 100)}%`;
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

// Passo 2: o orçamento.
const GB = 1e9;
const GPU_GB = 80;
const UTILIZATION = 0.9;
const usableGB = GPU_GB * UTILIZATION;
const WEIGHTS_GB = (7e9 * 2) / GB;
/** Hipótese da aula: ativações temporárias, buffers e o contexto do CUDA. O motor mede o valor real ao subir. */
const ACTIVATIONS_GB = 4;
const kvGB = usableGB - WEIGHTS_GB - ACTIVATIONS_GB;
const LAYERS = 32;
const KV_HEADS = 32;
const HEAD_DIM = 128;
const BYTES = 2;
const kvBytesPerToken = 2 * LAYERS * KV_HEADS * HEAD_DIM * BYTES;
const BLOCK_TOKENS = 16;
const blockBytes = BLOCK_TOKENS * kvBytesPerToken;
const totalBlocks = Math.floor((kvGB * GB) / blockBytes);
const totalTokens = totalBlocks * BLOCK_TOKENS;
const MiB = 1024 * 1024;

// Passo 3: reserva contígua pelo tamanho máximo, porque ninguém sabe de antemão o fim da resposta.
const MAX_LEN = 2048;
const lengths = [300, 1200, 150, 800, 2048, 500];
const usedTokens = sum(lengths);
const reservedTokens = lengths.length * MAX_LEN;
const contiguousUse = usedTokens / reservedTokens;
const contiguousSeqs = Math.floor(totalTokens / MAX_LEN);

// Passo 4: paginação. Cada pedido ocupa ⌈tokens / 16⌉ blocos; só o último bloco pode ter sobra.
const blocksOf = (tokens: number) => Math.ceil(tokens / BLOCK_TOKENS);
const pagedBlocks = sum(lengths.map(blocksOf));
const pagedWaste = (pagedBlocks * BLOCK_TOKENS - usedTokens) / (pagedBlocks * BLOCK_TOKENS);
const pagedSeqs = Math.floor(totalBlocks / (pagedBlocks / lengths.length));
const concurrencyGain = pagedSeqs / contiguousSeqs;

// Passo 5: tirar da GPU um pedido de 2.048 tokens.
const victimBytes = MAX_LEN * kvBytesPerToken;
/** Hipótese da aula: banda efetiva entre a GPU e a memória da CPU. */
const HOST_LINK_GBPS = 50;
const swapMs = (victimBytes / (HOST_LINK_GBPS * GB)) * 1000;
const PEAK_FLOPS = 989e12;
const recomputeMs = ((2 * 7e9 * MAX_LEN) / PEAK_FLOPS) * 1000;

const lesson: LessonContent = {
  id: "10-11",
  subtitle: "Para onde vão os 80 GB de uma GPU de inferência e como o KV cache em páginas cabe o dobro de pedidos na mesma memória.",
  objectives: [
    "Montar o orçamento de memória de uma GPU: pesos, ativações e KV cache",
    "Calcular quantos blocos e tokens de KV cache cabem na memória que sobra",
    "Explicar o desperdício da reserva contígua e como o PagedAttention o elimina",
    "Comparar troca e recálculo quando a memória acaba",
  ],
  steps: [
    {
      id: "budget",
      shortTitle: "Orçamento",
      title: "Os 80 GB não são todos seus",
      tag: "context",
      body: [
        `Num apartamento, a área total não é a área útil: parede, corredor e armário ocupam espaço. Uma GPU de ${GPU_GB} GB também. Os pesos de um modelo de 7B em fp16 levam ${integer(WEIGHTS_GB)} GB fixos. As ativações das contas, os buffers e o próprio CUDA levam mais alguns. E uma margem fica livre, para nenhum pico derrubar o processo.`,
        `O que sobra vai para o [[KV cache|kv-cache]], e é ele que decide quantos pedidos rodam ao mesmo tempo. O vLLM, por exemplo, usa por padrão ${percent(UTILIZATION)} da memória (o parâmetro gpu_memory_utilization), carrega os pesos, mede o pico das ativações e entrega todo o resto ao cache, em blocos.`,
      ],
      keyIdea: "Na inferência, a memória livre depois dos pesos é a capacidade do servidor.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "memory",
            piece: "block-diagram",
            blocks: [
              { id: "weights", kind: "memory", label: `pesos ${integer(WEIGHTS_GB)} gb`, col: 0, row: 0 },
              { id: "activations", kind: "memory", label: `ativações ${integer(ACTIVATIONS_GB)} gb`, col: 0, row: 1 },
              { id: "kv", kind: "kv-cache", label: `kv cache ${integer(kvGB)} gb`, col: 1, row: 0.5 },
              { id: "gpu", kind: "server", label: `h100 ${GPU_GB} gb`, col: 2, row: 0.5 },
              { id: "queue", kind: "queue", label: "pedidos", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "weights", to: "gpu" },
              { from: "activations", to: "gpu" },
              { from: "kv", to: "gpu", label: "blocos" },
              { from: "queue", to: "gpu" },
            ],
            active: "kv",
          },
        ],
      },
      alt: `A memória de uma H100 de ${GPU_GB} GB dividida em pesos (${integer(WEIGHTS_GB)} GB), ativações (${integer(ACTIVATIONS_GB)} GB) e KV cache, em destaque, com ${integer(kvGB)} GB; os pedidos da fila disputam esse cache.`,
    },
    {
      id: "blocks",
      shortTitle: "Blocos",
      title: "Quantos tokens cabem",
      tag: "mechanism",
      body: [
        `As contas: ${GPU_GB} GB × ${fixed(UTILIZATION)} = ${integer(usableGB)} GB utilizáveis. Menos ${integer(WEIGHTS_GB)} GB de pesos e ${integer(ACTIVATIONS_GB)} GB de ativações (uma hipótese da aula; o motor mede o valor real ao subir), sobram ${integer(kvGB)} GB. No Llama 2 7B, cada token guarda 2 × ${LAYERS} camadas × ${KV_HEADS} cabeças × ${HEAD_DIM} dimensões × ${BYTES} bytes = ${integer(kvBytesPerToken)} bytes, meio MiB.`,
        `O cache é dividido em blocos de ${BLOCK_TOKENS} tokens, ${integer(blockBytes / MiB)} MiB cada: cabem ${integer(totalBlocks)} blocos, ${integer(totalTokens)} tokens no total, somando todos os pedidos. Um detalhe que confunde: o PyTorch tem um alocador com cache que guarda a memória reservada para reusar, e o vLLM reserva todo o KV cache logo ao subir. Por isso a GPU aparece quase cheia no nvidia-smi mesmo sem tráfego.`,
      ],
      keyIdea: "Tokens de KV cache = memória livre / bytes por token. É um total dividido entre todos os pedidos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "budget",
            piece: "metrics-panel",
            metrics: [
              { id: "usable", label: `${percent(UTILIZATION)} de ${GPU_GB} GB`, value: `${integer(usableGB)} GB` },
              { id: "kv", label: "para o KV cache", value: `${integer(kvGB)} GB`, color: "module-10" },
              { id: "token", label: "por token", value: `${integer(kvBytesPerToken / 1024)} KiB` },
              { id: "blocks", label: `blocos de ${BLOCK_TOKENS} tokens`, value: integer(totalBlocks) },
              { id: "tokens", label: "tokens no cache", value: integer(totalTokens), color: "success" },
            ],
            highlight: "tokens",
          },
        ],
      },
      alt: `Orçamento: ${integer(usableGB)} GB utilizáveis, ${integer(kvGB)} GB para o KV cache, ${integer(kvBytesPerToken / 1024)} KiB por token, ${integer(totalBlocks)} blocos de ${BLOCK_TOKENS} tokens e ${integer(totalTokens)} tokens no total.`,
    },
    {
      id: "contiguous",
      shortTitle: "Reserva",
      title: "Reservar o pior caso desperdiça",
      tag: "mechanism",
      body: [
        `Quando um pedido chega, ninguém sabe quantos tokens ele vai gerar. O jeito ingênuo é reservar um pedaço contíguo para o máximo, ${integer(MAX_LEN)} tokens, como um restaurante que guarda uma mesa de 10 lugares para cada cliente porque ele talvez traga a família. Os ${lengths.length} pedidos da cena usaram ${integer(usedTokens)} dos ${integer(reservedTokens)} tokens reservados: ${percent(contiguousUse)}.`,
        `O resto é [[fragmentação|memory-fragmentation]]: reservado e sem uso, mais as sobras entre pedaços de tamanhos diferentes. Com essa regra, cabem ${contiguousSeqs} pedidos simultâneos no cache. O paper do PagedAttention mediu o mesmo problema em sistemas anteriores, que usavam só de 20,4% a 38,2% da memória do KV cache para tokens de verdade.`,
      ],
      keyIdea: "Reservar pelo tamanho máximo transforma memória em espaço vazio guardado.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "usage",
            piece: "chart",
            kind: "bar",
            series: lengths.map((length, index) => ({ label: `pedido ${index + 1}`, value: Number((length / MAX_LEN).toFixed(2)) })),
            max: 1,
            highlight: lengths.indexOf(Math.min(...lengths)),
            color: "module-10",
          },
        ],
      },
      alt: `Fração da reserva de ${integer(MAX_LEN)} tokens usada por pedido: ${lengths.map((length, index) => `pedido ${index + 1} ${percent(length / MAX_LEN)}`).join(", ")}. No total, ${percent(contiguousUse)}.`,
    },
    {
      id: "paged",
      shortTitle: "Páginas",
      title: "Blocos espalhados e uma tabela",
      tag: "mechanism",
      body: [
        `O [[PagedAttention|paged-attention]] faz o que o sistema operacional faz com a RAM. O KV cache de cada pedido é uma lista de blocos lógicos de ${BLOCK_TOKENS} tokens, e uma [[block table|block-table]] diz em que bloco físico cada um está. Os blocos não precisam ser vizinhos, e um bloco novo só é pego quando o anterior enche. O kernel de attention lê os blocos pela tabela.`,
        `Com páginas, os ${lengths.length} pedidos ocupam ${pagedBlocks} blocos, e só o último bloco de cada um pode ficar pela metade: o desperdício cai para ${fixed(pagedWaste * 100)}%. Com esse mesmo perfil de tamanhos, cabem ${pagedSeqs} pedidos em vez de ${contiguousSeqs}, ${fixed(concurrencyGain)} vezes mais. A tabela ainda permite que dois pedidos apontem para o mesmo bloco físico, como o prefixo comum da cena: é a base do prefix caching.`,
      ],
      keyIdea: "Paginação troca uma reserva grande e contígua por blocos pequenos pegos sob demanda.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "table",
            piece: "graph",
            nodes: [
              { id: "a0", label: "A · bloco 0", x: 0.15, y: 0.1, color: "module-10" },
              { id: "a1", label: "A · bloco 1", x: 0.15, y: 0.3, color: "module-10" },
              { id: "a2", label: "A · bloco 2", x: 0.15, y: 0.5, color: "module-10" },
              { id: "b0", label: "B · bloco 0", x: 0.15, y: 0.7, color: "info" },
              { id: "b1", label: "B · bloco 1", x: 0.15, y: 0.9, color: "info" },
              { id: "p0", label: "físico 0", x: 0.85, y: 0.1 },
              { id: "p1", label: "físico 1", x: 0.85, y: 0.26 },
              { id: "p2", label: "físico 2 (livre)", x: 0.85, y: 0.42 },
              { id: "p3", label: "físico 3", x: 0.85, y: 0.58 },
              { id: "p4", label: "físico 4", x: 0.85, y: 0.74 },
              { id: "p5", label: "físico 5", x: 0.85, y: 0.9 },
            ],
            edges: [
              { from: "a0", to: "p3", label: "prefixo comum" },
              { from: "b0", to: "p3", label: "prefixo comum" },
              { from: "a1", to: "p0" },
              { from: "a2", to: "p5" },
              { from: "b1", to: "p1" },
            ],
            highlight: ["p3"],
          },
        ],
      },
      alt: "Grafo da block table: os blocos lógicos dos pedidos A e B, à esquerda, apontam para blocos físicos espalhados, à direita. O bloco 0 de A e o bloco 0 de B compartilham o bloco físico 3, em destaque, com o prefixo comum; o bloco físico 2 está livre.",
    },
    {
      id: "preempt",
      shortTitle: "Faltou memória",
      title: "Quando os blocos acabam",
      tag: "tradeoff",
      body: [
        `Os blocos são pegos sob demanda, então pode faltar no meio da geração: todos os pedidos crescem ao mesmo tempo. O motor faz [[preemption|preemption]]: escolhe um pedido, normalmente o mais novo, libera os blocos dele e o devolve à fila. Um pedido de ${integer(MAX_LEN)} tokens ocupa ${fixed(victimBytes / GB, 2)} GB de cache.`,
        `Para retomar, há dois caminhos, ambos discutidos no paper do PagedAttention. Trocar: copiar os blocos para a memória da CPU e trazer de volta, cerca de ${integer(swapMs)} ms em cada sentido com uma banda de ${HOST_LINK_GBPS} GB/s (hipótese da aula). Recalcular: jogar o cache fora e refazer o prefill, cerca de ${integer(recomputeMs)} ms no teto de ${integer(PEAK_FLOPS / 1e12)} TFLOPS. Os dois custam latência a quem foi tirado; preempção frequente é sinal de lote grande demais para a memória.`,
      ],
      keyIdea: "Sem memória, alguém sai da GPU. Troca e recálculo custam parecido; o melhor é dimensionar para quase não precisar.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "memory",
            piece: "block-diagram",
            blocks: [
              { id: "queue", kind: "queue", label: "fila", col: 0, row: 0.5 },
              { id: "gpu", kind: "server", label: "gpu", col: 1, row: 0.5 },
              { id: "kv", kind: "kv-cache", label: "blocos cheios", col: 2, row: 0 },
              { id: "cpu", kind: "memory", label: "ram da cpu", col: 3, row: 0 },
              { id: "recompute", kind: "llm", label: "refazer prefill", col: 2, row: 1 },
            ],
            edges: [
              { from: "queue", to: "gpu" },
              { from: "gpu", to: "kv" },
              { from: "kv", to: "cpu", label: "trocar", variant: "alternative" },
              { from: "kv", to: "recompute", label: "recalcular", variant: "alternative" },
            ],
            active: "kv",
          },
        ],
      },
      alt: `Os blocos do KV cache, em destaque, acabam. Pelos caminhos tracejados, o pedido tirado da GPU tem os blocos copiados para a RAM da CPU (cerca de ${integer(swapMs)} ms) ou descartados para refazer o prefill (cerca de ${integer(recomputeMs)} ms).`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "A memória decide a concorrência",
      tag: "summary",
      body: [
        "A memória de inferência é um orçamento: pesos fixos, ativações medidas, uma margem e o resto para o KV cache. Reservar o tamanho máximo por pedido desperdiça a maior parte; páginas de poucos tokens, achadas por uma block table, quase zeram o desperdício e permitem compartilhar prefixos. Quando falta bloco, o motor preempta e retoma por troca ou recálculo.",
        "Memória é só um dos limites. A próxima aula junta tudo o que deixa a inferência mais rápida: o modelo roofline, o speculative decoding e kernels como o FlashAttention.",
      ],
      keyIdea: "Mais tokens no cache = mais pedidos no lote = mais throughput na mesma GPU.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "compare",
            piece: "metrics-panel",
            metrics: [
              { id: "contiguous", label: "reserva contígua", value: `${contiguousSeqs} pedidos`, color: "danger" },
              { id: "paged", label: "páginas de 16 tokens", value: `${pagedSeqs} pedidos`, color: "success" },
              { id: "use", label: "uso da reserva contígua", value: percent(contiguousUse) },
              { id: "waste", label: "desperdício com páginas", value: `${fixed(pagedWaste * 100)}%` },
            ],
            highlight: "paged",
          },
        ],
      },
      alt: `Com reserva contígua de ${integer(MAX_LEN)} tokens, cabem ${contiguousSeqs} pedidos e só ${percent(contiguousUse)} da reserva é usada; com páginas de ${BLOCK_TOKENS} tokens, cabem ${pagedSeqs} pedidos e o desperdício é de ${fixed(pagedWaste * 100)}%.`,
    },
  ],
  realWorldExample:
    "O vLLM nasceu do paper do PagedAttention (Kwon et al., 2023), que mediu que sistemas anteriores usavam só de 20,4% a 38,2% da memória do KV cache para guardar tokens de verdade; com blocos paginados, o desperdício ficou abaixo de 4% e o throughput subiu de 2 a 4 vezes com a mesma latência, segundo os autores. Ao subir, o vLLM imprime no log quantos blocos de KV cache conseguiu alocar e a concorrência máxima para o tamanho de contexto configurado.",
  code: {
    language: "python",
    source: `GB = 1e9
usable = 80 * GB * 0.9                     # gpu_memory_utilization
kv_free = usable - 14 * GB - 4 * GB         # pesos 7B fp16 e ativações (hipótese)
kv_per_token = 2 * 32 * 32 * 128 * 2        # Llama 2 7B, fp16
block = 16 * kv_per_token
blocks = int(kv_free // block)
print(blocks, blocks * 16)                  # blocos e tokens no cache`,
    caption: "O orçamento da cena: memória utilizável, pesos, ativações e quantos blocos de 16 tokens sobram para o KV cache.",
  },
  tradeOffs: {
    pros: [
      "Páginas pequenas quase zeram o desperdício do KV cache",
      "Mais pedidos simultâneos na mesma GPU, sem mudar o modelo",
      "Blocos compartilhados permitem reaproveitar prefixos comuns entre pedidos",
    ],
    cons: [
      "O kernel de attention precisa ler blocos espalhados pela tabela, o que é mais complexo",
      "Alocação sob demanda pode faltar no meio da geração e forçar preempção",
      "Uma margem de memória mal calculada derruba o processo por falta de memória",
    ],
    alternatives: [
      "Quantizar pesos ou o próprio KV cache para liberar memória",
      "GQA e MQA, que guardam menos cabeças de key e value",
      "Limitar o contexto máximo ou o número de pedidos por lote",
    ],
  },
  knowledgeCheck: [
    {
      id: "more-concurrency",
      prompt: "Um servidor com reserva contígua de 4.096 tokens por pedido atende poucos usuários simultâneos, mas as respostas têm em média 500 tokens. O que mais aumenta a concorrência?",
      options: [
        "Aumentar o contexto máximo para 8.192",
        "Alocar o KV cache em blocos pequenos sob demanda, como no PagedAttention",
        "Aumentar a temperatura",
        "Trocar a GPU por uma CPU",
      ],
      correct: 1,
      explanation: "Com reserva pelo máximo, cada pedido prende 4.096 tokens e usa uns 500. Blocos sob demanda ocupam só o que cada pedido usa, e cabem muito mais pedidos no mesmo cache.",
      lesson: "10-11",
    },
    {
      id: "kv-budget",
      prompt: "Numa GPU de 80 GB com 90% utilizáveis, um modelo ocupa 40 GB e as ativações 4 GB. Cada token de KV cache custa 0,5 MiB. Aproximadamente quantos tokens cabem no cache?",
      options: ["Cerca de 6.800", "Cerca de 53.000", "Cerca de 150.000", "Cerca de 1 milhão"],
      correct: 1,
      explanation: "72 − 40 − 4 = 28 GB para o cache. 28 × 10⁹ / 524.288 bytes ≈ 53.000 tokens, divididos entre todos os pedidos.",
      lesson: "10-11",
    },
  ],
  related: ["10-08", "10-12", "10-05"],
  references: [
    { title: "Kwon et al. (2023), Efficient Memory Management for Large Language Model Serving with PagedAttention", url: "https://arxiv.org/abs/2309.06180", kind: "paper" },
    { title: "vLLM: documentação", url: "https://docs.vllm.ai/", kind: "docs" },
    { title: "PyTorch: CUDA semantics e gerência de memória", url: "https://pytorch.org/docs/stable/notes/cuda.html", kind: "docs" },
  ],
};

export default lesson;
