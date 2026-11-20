import type { BlockDiagramSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Continuous batching simulado aqui. Um servidor com 4 vagas recebe 10 pedidos com hora de chegada e tamanho de
// resposta conhecidos; cada vaga gera 1 token por passo e o prefill fica fora da conta. O lote estático só admite
// pedidos quando o lote inteiro acaba; o contínuo (escalonamento por iteração, do sistema Orca) enche cada vaga
// livre a cada passo, em ordem de chegada. Daí saem a grade vagas × passos, o uso e a latência média.
// O chunked prefill usa o teto teórico de um 7B numa H100 (cerca de 989 TFLOPS densos em BF16 e 3,35 TB/s).

const fixed = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const percent = (value: number) => `${Math.round(value * 100)}%`;

interface Request {
  id: number;
  arrive: number;
  length: number;
}

interface Schedule {
  /** grid[vaga][passo] = id do pedido, 0 para vaga vazia. */
  grid: number[][];
  steps: number;
  finish: Map<number, number>;
}

const SLOTS = 4;
const requests: Request[] = [
  { id: 1, arrive: 0, length: 8 },
  { id: 2, arrive: 0, length: 2 },
  { id: 3, arrive: 0, length: 3 },
  { id: 4, arrive: 0, length: 2 },
  { id: 5, arrive: 1, length: 4 },
  { id: 6, arrive: 1, length: 3 },
  { id: 7, arrive: 2, length: 5 },
  { id: 8, arrive: 2, length: 2 },
  { id: 9, arrive: 3, length: 3 },
  { id: 10, arrive: 4, length: 2 },
];

function simulate(continuous: boolean): Schedule {
  const waiting = [...requests];
  const slots: Array<{ id: number; left: number } | null> = Array.from({ length: SLOTS }, () => null);
  const columns: number[][] = [];
  const finish = new Map<number, number>();
  let step = 0;
  while (waiting.length > 0 || slots.some((slot) => slot !== null)) {
    const batchEmpty = slots.every((slot) => slot === null);
    if (continuous || batchEmpty) {
      slots.forEach((slot, index) => {
        const next = waiting[0];
        if (slot === null && next && next.arrive <= step) {
          slots[index] = { id: next.id, left: next.length };
          waiting.shift();
        }
      });
    }
    columns.push(slots.map((slot) => slot?.id ?? 0));
    step += 1;
    slots.forEach((slot, index) => {
      if (!slot) return;
      slot.left -= 1;
      if (slot.left === 0) {
        finish.set(slot.id, step);
        slots[index] = null;
      }
    });
  }
  const grid = Array.from({ length: SLOTS }, (_, slot) => columns.map((column) => column[slot]));
  return { grid, steps: step, finish };
}

const staticRun = simulate(false);
const continuousRun = simulate(true);
const usefulSlotSteps = requests.reduce((total, request) => total + request.length, 0);
const usage = (run: Schedule) => usefulSlotSteps / (run.steps * SLOTS);
const meanLatency = (run: Schedule) =>
  requests.reduce((total, request) => total + (run.finish.get(request.id) ?? 0) - request.arrive, 0) / requests.length;
const latencyOf = (run: Schedule, id: number) => (run.finish.get(id) ?? 0) - (requests.find((request) => request.id === id)?.arrive ?? 0);
const COLUMNS = Math.max(staticRun.steps, continuousRun.steps);
const padded = (grid: number[][]) => grid.map((row) => [...row, ...Array.from({ length: COLUMNS - row.length }, () => 0)]);
const slotRows = Array.from({ length: SLOTS }, (_, index) => `vaga ${index + 1}`);
const stepCols = Array.from({ length: COLUMNS }, (_, index) => String(index + 1));
const LAST = requests[requests.length - 1].id;
const firstFreeStatic = Math.min(...staticRun.grid.map((row) => row.indexOf(0)).filter((index) => index >= 0)) + 1;

// Passo 5: um prompt de 4.000 tokens chegando no meio do decode, inteiro ou em pedaços de 512.
const PARAMS = 7e9;
const PEAK_FLOPS = 989e12;
const BANDWIDTH = 3.35e12;
const BATCH = 32;
const KV_SEQ = 524_288 * 1024;
const decodeStepMs = ((PARAMS * 2 + BATCH * KV_SEQ) / BANDWIDTH) * 1000;
const prefillMs = (tokens: number) => ((2 * PARAMS * tokens) / PEAK_FLOPS) * 1000;
const LONG_PROMPT = 4000;
const CHUNK = 512;
const chunks = Math.ceil(LONG_PROMPT / CHUNK);
const stallMs = prefillMs(LONG_PROMPT);
const chunkMs = prefillMs(CHUNK);
const stalledSteps = stallMs / decodeStepMs;

const scheduler = (active: string, done?: string[]): BlockDiagramSpec => ({
  id: "scheduler",
  piece: "block-diagram",
  blocks: [
    { id: "queue", kind: "queue", label: "fila", col: 0, row: 0.5 },
    { id: "sched", kind: "app", label: "escalonador", col: 1, row: 0.5 },
    { id: "gpu", kind: "server", label: `${SLOTS} vagas`, col: 2, row: 0 },
    { id: "cache", kind: "kv-cache", label: "kv cache", col: 2, row: 1 },
    { id: "answer", kind: "answer", label: "terminou: sai", col: 3, row: 0.5 },
  ],
  edges: [
    { from: "queue", to: "sched", label: "a cada passo" },
    { from: "sched", to: "gpu", label: "vaga livre" },
    { from: "cache", to: "gpu" },
    { from: "gpu", to: "answer" },
    { from: "sched", to: "cache", label: "preempção", variant: "alternative" },
  ],
  active,
  ...(done ? { done } : {}),
});

const lesson: LessonContent = {
  id: "10-08",
  subtitle: "Como trocar quem está no lote a cada passo de decode, por que isso enche a GPU e corta a espera, e como encaixar prompts longos sem travar quem já está gerando.",
  objectives: [
    "Comparar o lote estático com o escalonamento a cada passo",
    "Simular a ocupação das vagas e a latência média dos dois",
    "Explicar o chunked prefill e o problema que ele resolve",
    "Relacionar o lote contínuo com a memória do KV cache e a preempção",
  ],
  steps: [
    {
      id: "restaurant",
      shortTitle: "Restaurante",
      title: "Vagou a cadeira, alguém senta",
      tag: "context",
      body: [
        "Imagine um restaurante que só deixa a próxima turma entrar quando a mesa inteira vai embora. Quem pediu só um café espera o colega que pediu três pratos, e a fila na porta cresce com cadeiras vazias lá dentro. O certo é óbvio: vagou uma cadeira, a próxima pessoa senta.",
        "O [[continuous batching|continuous-batching]] faz isso com as vagas do lote. Em vez de montar um lote e esperar todo mundo terminar, o escalonador olha o lote a cada passo de [[decode|decode]]: quem gerou o token de fim sai, e um pedido da fila entra na vaga na hora. É o [[iteration-level scheduling|iteration-level-scheduling]] proposto pelo sistema Orca.",
      ],
      keyIdea: "O lote deixa de ser uma turma fechada e vira uma fila que anda a cada token.",
      scene: { kind: "pieces", layout: "single", pieces: [scheduler("sched")] },
      alt: `Pedidos saem da fila para o escalonador, em destaque, que a cada passo preenche as vagas livres de um servidor com ${SLOTS} vagas; o KV cache alimenta o servidor e quem terminou sai com a resposta.`,
    },
    {
      id: "static",
      shortTitle: "Estático",
      title: "Lote fechado: a grade cheia de buracos",
      tag: "mechanism",
      body: [
        `A cena simula ${requests.length} pedidos num servidor com ${SLOTS} vagas. Cada coluna é um passo de decode e cada número é o pedido que ocupa a vaga; 0 é vaga vazia. No [[static batching|static-batching]], os pedidos 1 a ${SLOTS} formam o lote e os outros só entram quando ele acaba. Já no passo ${firstFreeStatic} aparecem vagas vazias, e o pedido 1, de ${requests[0].length} tokens, segura o lote até o fim.`,
        `O servidor leva ${staticRun.steps} passos para atender tudo. Das ${staticRun.steps * SLOTS} vagas-passo, só ${usefulSlotSteps} geram token: ${percent(usage(staticRun))} de uso. O pedido ${LAST}, que chegou no passo ${requests[requests.length - 1].arrive}, espera e termina ${latencyOf(staticRun, LAST)} passos depois de chegar, para uma resposta de ${requests[requests.length - 1].length} tokens.`,
      ],
      keyIdea: "No lote fechado, cada zero da grade é GPU paga e parada enquanto há gente na fila.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "slots",
            piece: "matrix",
            rows: slotRows,
            cols: stepCols,
            values: padded(staticRun.grid),
            scale: { min: 0, max: requests.length },
            showValues: true,
            color: "danger",
          },
        ],
      },
      alt: `Grade de ${SLOTS} vagas por ${COLUMNS} passos no lote estático: os pedidos 1 a ${SLOTS} ocupam o primeiro lote, que deixa vagas vazias até o pedido 1 terminar; o atendimento leva ${staticRun.steps} passos, com ${percent(usage(staticRun))} de uso.`,
    },
    {
      id: "continuous",
      shortTitle: "Contínuo",
      title: "A cada passo, as vagas livres são preenchidas",
      tag: "mechanism",
      body: [
        `Agora o escalonador roda a cada passo. Quando o pedido 2 termina, o 5 entra na mesma vaga no passo seguinte, sem esperar o pedido 1. A grade fica quase sem zeros até o fim do trabalho: os ${requests.length} pedidos são atendidos em ${continuousRun.steps} passos, contra ${staticRun.steps}, e as colunas seguintes ficam vazias porque não há mais nada a gerar. O uso sobe para ${percent(usage(continuousRun))}.`,
        "Isso só funciona porque cada sequência carrega o próprio estado: a posição e o KV cache. O passo de decode junta sequências em pontos diferentes da resposta, e a attention de cada uma lê só o próprio cache. O lote tem tamanho fixo de vagas, não de conteúdo.",
      ],
      keyIdea: "Escalonar por iteração tira os buracos da grade: a GPU gera token em quase toda vaga, todo passo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "slots",
            piece: "matrix",
            rows: slotRows,
            cols: stepCols,
            values: padded(continuousRun.grid),
            scale: { min: 0, max: requests.length },
            showValues: true,
            color: "success",
          },
        ],
      },
      alt: `A mesma grade com continuous batching: cada vaga que vaga recebe o próximo pedido no passo seguinte; os ${requests.length} pedidos terminam em ${continuousRun.steps} passos, com ${percent(usage(continuousRun))} de uso.`,
    },
    {
      id: "numbers",
      shortTitle: "Números",
      title: "Mais vazão e menos espera, ao mesmo tempo",
      tag: "example",
      body: [
        `Somando a espera de cada pedido, da chegada ao último token: ${fixed(meanLatency(staticRun))} passos em média no lote estático e ${fixed(meanLatency(continuousRun))} no contínuo. O pedido ${LAST} vai de ${latencyOf(staticRun, LAST)} para ${latencyOf(continuousRun, LAST)} passos.`,
        "Raramente uma otimização melhora a vazão e a latência juntas; esta melhora porque não troca nada, só tira o desperdício. Com respostas de tamanhos muito diferentes, como num chat real, a diferença cresce. O paper do Orca relatou, para um modelo do tamanho do GPT-3, 36,9 vezes mais vazão que o FasterTransformer da NVIDIA na mesma latência.",
      ],
      keyIdea: "O continuous batching melhora vazão e latência porque elimina vagas ociosas, não porque acelera a conta.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "compare",
            piece: "metrics-panel",
            metrics: [
              { id: "steps", label: "passos: estático → contínuo", value: `${staticRun.steps} → ${continuousRun.steps}` },
              { id: "usage", label: "uso das vagas", value: `${percent(usage(staticRun))} → ${percent(usage(continuousRun))}`, color: "success" },
              { id: "latency", label: "espera média (passos)", value: `${fixed(meanLatency(staticRun))} → ${fixed(meanLatency(continuousRun))}`, color: "success" },
              { id: "last", label: `pedido ${LAST}`, value: `${latencyOf(staticRun, LAST)} → ${latencyOf(continuousRun, LAST)} passos` },
            ],
            highlight: "usage",
          },
        ],
      },
      alt: `Comparação: ${staticRun.steps} passos no lote estático e ${continuousRun.steps} no contínuo; uso de ${percent(usage(staticRun))} para ${percent(usage(continuousRun))}; espera média de ${fixed(meanLatency(staticRun))} para ${fixed(meanLatency(continuousRun))} passos.`,
    },
    {
      id: "chunked",
      shortTitle: "Prompt longo",
      title: "Um prompt longo não pode travar o lote",
      tag: "tradeoff",
      body: [
        `Pedido novo entrando significa [[prefill|prefill]] no meio do decode. Num 7B numa H100, um passo de decode com ${BATCH} sequências leva uns ${fixed(decodeStepMs)} ms. Um prompt de ${integer(LONG_PROMPT)} tokens pede ${fixed(stallMs)} ms de prefill no teto teórico: se entrar inteiro, os ${BATCH} usuários ficam sem token por uns ${integer(stalledSteps)} passos, um soluço no streaming.`,
        `O [[chunked prefill|chunked-prefill]] corta o prompt em pedaços de ${CHUNK} tokens, ${chunks} no total, e mistura um pedaço em cada passo: cada passo fica ${fixed(chunkMs)} ms mais longo em vez de parar. O outro limite é a memória: quem entra precisa de blocos de [[KV cache|kv-cache]]; quando eles acabam, o motor faz [[preempção|preemption]] de algum pedido, o tracejado da cena, e o retoma depois. A gerência dessa memória é a aula 10-11.`,
      ],
      keyIdea: "Admitir pedidos a cada passo exige dividir prefills longos e vigiar a memória do KV cache.",
      scene: { kind: "pieces", layout: "single", pieces: [scheduler("cache", ["queue", "sched", "gpu"])] },
      alt: `O KV cache, em destaque, limita quem entra nas ${SLOTS} vagas; o caminho tracejado do escalonador ao cache é a preempção quando a memória acaba. Um prompt de ${integer(LONG_PROMPT)} tokens entra em ${chunks} pedaços de ${CHUNK}, sem travar o decode.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "O laço de cada passo",
      tag: "summary",
      body: [
        "Continuous batching é um laço que roda a cada token: tirar quem terminou, admitir quem cabe na memória, encaixar um pedaço de prefill e dar um passo de decode em todo o lote. vLLM, SGLang, Text Generation Inference e TensorRT-LLM (que chama isso de in-flight batching) trabalham assim.",
        "Até aqui o módulo mexeu no escalonamento e na memória do cache. A próxima aula encolhe o que é lido em todo passo: os próprios pesos, com quantização.",
      ],
      keyIdea: "A cada passo: sai quem terminou, entra quem cabe, e a GPU nunca espera um lote inteiro.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "loop",
            piece: "pipeline",
            stages: [
              { id: "evict", label: "sai quem terminou" },
              { id: "admit", label: "entra quem cabe", color: "module-10" },
              { id: "chunk", label: "pedaço de prefill" },
              { id: "decode", label: "1 passo de decode" },
              { id: "stream", label: "tokens em streaming", color: "brand" },
            ],
            repeat: { from: "evict", to: "stream", label: "a cada passo" },
            active: "admit",
          },
        ],
      },
      alt: "Laço do continuous batching repetido a cada passo: sai quem terminou, entra quem cabe, um pedaço de prefill, um passo de decode e os tokens em streaming.",
    },
  ],
  realWorldExample:
    "O Orca, apresentado no OSDI 2022, propôs o escalonamento por iteração e relatou 36,9 vezes mais vazão que o FasterTransformer na mesma latência para um modelo do tamanho do GPT-3. A ideia virou padrão: o vLLM junta continuous batching com o KV cache paginado, a NVIDIA chama a mesma técnica de in-flight batching no TensorRT-LLM, e o Sarathi-Serve mostrou como o chunked prefill mistura prefills e decodes no mesmo passo sem travar a geração.",
  code: {
    language: "python",
    source: `def continuous(requests, slots=4):
    """requests: lista de (chegada, tamanho), em ordem de chegada."""
    waiting, active, step, finish = list(requests), [None] * slots, 0, []
    while waiting or any(active):
        for i in range(slots):
            if active[i] is None and waiting and waiting[0][0] <= step:
                arrive, length = waiting.pop(0)
                active[i] = [arrive, length]
        step += 1
        for i, seq in enumerate(active):
            if seq:
                seq[1] -= 1
                if seq[1] == 0:
                    finish.append(step - seq[0])
                    active[i] = None
    return step, sum(finish) / len(finish)`,
    caption: "O escalonador da simulação: a cada passo, cada vaga livre recebe o próximo pedido que já chegou.",
  },
  tradeOffs: {
    pros: [
      "Mantém as vagas da GPU ocupadas mesmo com respostas de tamanhos muito diferentes",
      "Melhora vazão e latência média ao mesmo tempo",
      "Pedidos novos começam no passo seguinte, sem esperar um lote terminar",
    ],
    cons: [
      "O escalonador roda a cada passo e precisa ser rápido",
      "Prefills longos atrapalham o decode dos outros sem chunked prefill",
      "Admitir pedidos sem prever a memória leva a preempção e retrabalho",
    ],
    alternatives: [
      "Lote estático, para jobs offline com respostas de tamanho parecido",
      "Separar prefill e decode em GPUs diferentes (disaggregated serving)",
      "Batch API dos provedores, quando a latência não importa",
    ],
  },
  knowledgeCheck: [
    {
      id: "slot-frees",
      prompt: "No continuous batching, uma sequência gera o token de fim no passo 37. O que acontece com a vaga dela?",
      options: [
        "Fica vazia até todas as outras sequências do lote terminarem",
        "Um pedido da fila pode ocupá-la já no passo seguinte",
        "O lote inteiro reinicia com novos pedidos",
        "A vaga é removida e o lote diminui para sempre",
      ],
      correct: 1,
      explanation: "O escalonamento é por iteração: a cada passo o escalonador tira quem terminou e admite da fila, desde que haja memória de KV cache para o novo pedido.",
      lesson: "10-08",
    },
    {
      id: "stall",
      prompt: "Depois de ativar o continuous batching, os usuários reclamam de pausas de alguns décimos de segundo no streaming quando chegam documentos longos. Qual ajuste ataca a causa?",
      options: [
        "Aumentar a temperatura",
        "Ativar o chunked prefill, para o prefill longo entrar em pedaços misturados aos passos de decode",
        "Diminuir o vocabulário",
        "Voltar ao lote estático",
      ],
      correct: 1,
      explanation: "O prefill de um prompt longo ocupa a GPU por muitos passos de decode. Dividido em pedaços, ele alonga um pouco cada passo em vez de parar a geração de todo mundo.",
      lesson: "10-08",
    },
  ],
  related: ["10-07", "10-09", "10-11"],
  references: [
    { title: "Yu et al. (2022), Orca: A Distributed Serving System for Transformer-Based Generative Models", url: "https://www.usenix.org/conference/osdi22/presentation/yu", kind: "paper" },
    { title: "Kwon et al. (2023), Efficient Memory Management for Large Language Model Serving with PagedAttention", url: "https://arxiv.org/abs/2309.06180", kind: "paper" },
    { title: "Agrawal et al. (2024), Taming Throughput-Latency Tradeoff in LLM Inference with Sarathi-Serve", url: "https://arxiv.org/abs/2403.02310", kind: "paper" },
  ],
};

export default lesson;
