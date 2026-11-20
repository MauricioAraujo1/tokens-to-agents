import type { BlockDiagramSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Balanceamento de carga com as contas no arquivo. Um rastro de brinquedo com 12 pedidos, um por segundo, e
// durações de LLM bem desiguais (respostas curtas e longas). Round-robin manda o pedido i para a réplica
// i mod 3; least-connections manda para a réplica com menos pedidos em andamento no instante da chegada
// (empate: a primeira). O pico de pedidos simultâneos por réplica sai da simulação abaixo. A taxa de acerto
// do prefix cache e os tempos do health check são DE EXEMPLO.

const fixed = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const percent = (value: number) => `${Math.round(value * 100)}%`;

const REPLICAS = ["a", "b", "c"];
const DURATIONS_S = [20, 2, 2, 18, 3, 2, 16, 2, 3, 2, 2, 3];
const trace = DURATIONS_S.map((duration, index) => ({ start: index, end: index + duration }));

type Assignment = number[];
const roundRobin: Assignment = trace.map((_, index) => index % REPLICAS.length);

const inFlightAt = (assignment: Assignment, replica: number, time: number, upTo: number) =>
  trace.filter((request, index) => index < upTo && assignment[index] === replica && request.start <= time && time < request.end).length;

const leastConnections: Assignment = [];
trace.forEach((request, index) => {
  const loads = REPLICAS.map((_, replica) => inFlightAt(leastConnections, replica, request.start, index));
  leastConnections.push(loads.indexOf(Math.min(...loads)));
});

const peakOf = (assignment: Assignment, replica: number) =>
  Math.max(...trace.map((request) => inFlightAt(assignment, replica, request.start, trace.length)));
const rrPeaks = REPLICAS.map((_, replica) => peakOf(roundRobin, replica));
const lcPeaks = REPLICAS.map((_, replica) => peakOf(leastConnections, replica));
const peakSeries = [
  ...REPLICAS.map((name, replica) => ({ label: `rr ${name}`, value: rrPeaks[replica] })),
  ...REPLICAS.map((name, replica) => ({ label: `lc ${name}`, value: lcPeaks[replica] })),
];
const rrWorst = Math.max(...rrPeaks);
const lcWorst = Math.max(...lcPeaks);
const longOnA = roundRobin.filter((replica, index) => replica === 0 && DURATIONS_S[index] >= 10).length;
const SNAPSHOT_T = 10;
const rrSnapshot = REPLICAS.map((_, replica) => inFlightAt(roundRobin, replica, SNAPSHOT_T, trace.length));

// Passo 4: afinidade de sessão e prefix cache. Histórico e mensagem nova de exemplo.
const HISTORY_TOKENS = 4000;
const NEW_TOKENS = 200;
const randomHit = 1 / REPLICAS.length;
const prefill = (hit: number) => hit * NEW_TOKENS + (1 - hit) * (HISTORY_TOKENS + NEW_TOKENS);
const randomPrefill = prefill(randomHit);
const stickyPrefill = prefill(1);

// Passo 5: health check ativo de exemplo.
const RATE_PER_S = 20;
const CHECK_INTERVAL_S = 5;
const UNHEALTHY_AFTER = 2;
const detectionS = CHECK_INTERVAL_S * UNHEALTHY_AFTER;
const failedRequests = RATE_PER_S * detectionS * (1 / REPLICAS.length);

const balancer = (active: string, done?: string[]): BlockDiagramSpec => ({
  id: "lb",
  piece: "block-diagram",
  blocks: [
    { id: "users", kind: "user", label: "usuários", col: 0, row: 0.5 },
    { id: "lb", kind: "server", label: "balanceador", col: 1, row: 0.5 },
    { id: "a", kind: "llm", label: "réplica a", col: 2.5, row: 0 },
    { id: "b", kind: "llm", label: "réplica b", col: 3, row: 0.5 },
    { id: "c", kind: "llm", label: "réplica c", col: 2.5, row: 1 },
  ],
  edges: [
    { from: "users", to: "lb" },
    { from: "lb", to: "a" },
    { from: "lb", to: "b" },
    { from: "lb", to: "c" },
  ],
  active,
  ...(done ? { done } : {}),
});

const lesson: LessonContent = {
  id: "17-10",
  subtitle: "Decidir qual réplica atende cada pedido quando uma resposta leva 2 s e outra 20 s: round-robin, least-connections, afinidade com o cache e health checks.",
  objectives: [
    "Explicar o papel do balanceador de carga na frente das réplicas",
    "Comparar round-robin e least-connections num rastro de pedidos de LLM",
    "Usar afinidade de sessão para aproveitar o prefix cache",
    "Calcular o custo de detectar uma réplica com falha",
  ],
  steps: [
    {
      id: "toll",
      shortTitle: "O pedágio",
      title: "Qual cabine do pedágio",
      tag: "context",
      body: [
        "Num pedágio com três cabines, alguém precisa decidir para qual cabine vai cada carro. Se a regra for alternar, um caminhão que demora a pagar segura uma fila inteira atrás dele enquanto as outras cabines ficam vazias. O [[balanceador de carga|load-balancer]] é esse organizador: recebe todos os pedidos num endereço só e escolhe uma réplica para cada um.",
        "Além de distribuir, ele tira do caminho as réplicas doentes, termina o TLS e pode aplicar limites. O que muda com LLMs é a duração: um pedido de classificação termina em 1 s, uma resposta longa leva 30 s, e a regra de distribuição precisa levar isso em conta.",
      ],
      keyIdea: "O balanceador escolhe a réplica de cada pedido; com durações desiguais, a regra de escolha decide a fila.",
      scene: { kind: "pieces", layout: "single", pieces: [balancer("lb")] },
      alt: "Usuários chegam a um balanceador de carga, em destaque, que distribui os pedidos entre as réplicas A, B e C.",
    },
    {
      id: "round-robin",
      shortTitle: "Round-robin",
      title: "Alternar é justo só quando os pedidos são iguais",
      tag: "mechanism",
      body: [
        `O [[round-robin|round-robin]] manda o pedido 1 para A, o 2 para B, o 3 para C, e recomeça. No rastro de brinquedo, ${trace.length} pedidos chegam um por segundo com durações de ${DURATIONS_S.join(", ")} segundos. Por azar do padrão, os ${longOnA} pedidos longos caem todos na réplica A.`,
        `No segundo ${SNAPSHOT_T}, A tem ${rrSnapshot[0]} pedidos em andamento, B tem ${rrSnapshot[1]} e C tem ${rrSnapshot[2]}. No pico, A chega a ${rrWorst}. Para um motor com continuous batching, mais pedidos simultâneos querem dizer mais KV cache e tokens mais lentos para cada um: os usuários de A esperam, e B e C ficam ociosas.`,
      ],
      keyIdea: "Round-robin conta pedidos, não trabalho: com durações desiguais, uma réplica acumula as respostas longas.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "rr-snapshot",
            piece: "client-server",
            nodes: [
              { id: "lb", label: "round-robin", role: "queue", size: 0 },
              { id: "a", label: `a: ${rrSnapshot[0]} em andamento`, role: "model", utilization: rrSnapshot[0] / rrWorst },
              { id: "b", label: `b: ${rrSnapshot[1]} em andamento`, role: "model", utilization: rrSnapshot[1] / rrWorst },
              { id: "c", label: `c: ${rrSnapshot[2]} em andamento`, role: "model", utilization: rrSnapshot[2] / rrWorst },
            ],
            messages: [
              { from: "lb", to: "a", label: "pedidos 1, 4, 7, 10" },
              { from: "lb", to: "b", label: "pedidos 2, 5, 8, 11" },
              { from: "lb", to: "c", label: "pedidos 3, 6, 9, 12" },
            ],
            active: 0,
          },
        ],
      },
      alt: `Round-robin no segundo ${SNAPSHOT_T}: a réplica A tem ${rrSnapshot[0]} pedidos em andamento, B tem ${rrSnapshot[1]} e C tem ${rrSnapshot[2]}, porque os pedidos longos caíram todos em A.`,
    },
    {
      id: "least-connections",
      shortTitle: "Menos conexões",
      title: "Mandar para quem está mais livre",
      tag: "mechanism",
      body: [
        `O [[least-connections|least-connections]] olha, a cada chegada, quantos pedidos cada réplica tem em andamento e escolhe a mais vazia. No mesmo rastro, o pico por réplica fica em ${lcPeaks.join(", ")}, contra ${rrPeaks.join(", ")} no round-robin. O pior caso cai de ${rrWorst} para ${lcWorst} pedidos simultâneos, sem saber nada da duração de antemão: um pedido longo ocupa a réplica, e o balanceador percebe.`,
        "Para LLMs, dá para ir além das conexões: balanceadores que leem métricas do motor (fila, uso do KV cache) escolhem pela carga real. O projeto Gateway API Inference Extension, do Kubernetes, faz isso para servidores de modelo. Em escala, sortear duas réplicas e escolher a mais vazia (power of two choices) chega perto do mesmo resultado consultando menos estado.",
      ],
      keyIdea: "Least-connections reage à duração real dos pedidos: as respostas longas se espalham sozinhas.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "peaks",
            piece: "chart",
            kind: "bar",
            series: peakSeries,
            highlight: 0,
            color: "module-17",
          },
        ],
      },
      alt: `Pico de pedidos simultâneos por réplica: round-robin ${rrPeaks.join(", ")} e least-connections ${lcPeaks.join(", ")}. O pior caso cai de ${rrWorst} para ${lcWorst}.`,
    },
    {
      id: "sticky",
      shortTitle: "Afinidade",
      title: "Mandar a conversa para quem já tem o contexto",
      tag: "example",
      body: [
        `Numa conversa longa, cada mensagem nova reenvia o histórico. Com ${integer(HISTORY_TOKENS)} tokens de histórico e ${NEW_TOKENS} novos, a réplica que já atendeu a conversa tem o prefixo no [[prefix cache|prefix-caching]] e faz prefill só dos ${NEW_TOKENS}. Com escolha aleatória entre ${REPLICAS.length} réplicas, a chance de cair nela é ${percent(randomHit)}, e o prefill médio fica em ${integer(randomPrefill)} tokens por mensagem.`,
        `Com [[sticky sessions|sticky-sessions]], um hash do id da conversa leva sempre à mesma réplica, e o prefill cai para ${integer(stickyPrefill)} tokens, ${fixed(randomPrefill / stickyPrefill)} vezes menos trabalho de GPU e um TTFT bem menor. O risco é o desequilíbrio: uma conversa enorme prende uma réplica. Por isso o roteamento por prefixo costuma combinar afinidade com a carga e abrir mão dela quando a réplica preferida está cheia.`,
      ],
      keyIdea: "Afinidade por conversa transforma o prefix cache em ganho real; combinada com a carga, não desequilibra.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "sticky",
            piece: "metrics-panel",
            metrics: [
              { id: "history", label: "histórico", value: `${integer(HISTORY_TOKENS)} tokens` },
              { id: "random", label: `aleatório (acerto ${percent(randomHit)})`, value: `${integer(randomPrefill)} tokens`, color: "danger" },
              { id: "sticky", label: "afinidade (acerto 100%)", value: `${integer(stickyPrefill)} tokens`, color: "success" },
              { id: "ratio", label: "menos prefill", value: `${fixed(randomPrefill / stickyPrefill)}×`, color: "module-17" },
            ],
            highlight: "ratio",
          },
        ],
      },
      alt: `Prefill médio por mensagem numa conversa com ${integer(HISTORY_TOKENS)} tokens de histórico: ${integer(randomPrefill)} tokens com escolha aleatória e ${integer(stickyPrefill)} com afinidade de sessão, ${fixed(randomPrefill / stickyPrefill)} vezes menos.`,
    },
    {
      id: "health",
      shortTitle: "Health check",
      title: "Tirar do caminho quem caiu",
      tag: "tradeoff",
      body: [
        `Um [[health check|health-check]] ativo chama /health de cada réplica a cada ${CHECK_INTERVAL_S} s e a tira da rotação depois de ${UNHEALTHY_AFTER} falhas: até ${detectionS} s para perceber uma queda. Com ${RATE_PER_S} pedidos por segundo divididos por ${REPLICAS.length}, uma réplica morta recebe cerca de ${integer(failedRequests)} pedidos que vão falhar nesse intervalo.`,
        "Checar mais vezes encurta a janela, mas gera tráfego e falsos alarmes numa réplica só ocupada. A combinação usual é o check ativo mais a detecção passiva: o balanceador observa os erros e timeouts reais e ejeta a réplica depois de alguns seguidos, em segundos. E o cliente faz retry com outra réplica nos erros que podem ser repetidos.",
      ],
      keyIdea: "Tempo para detectar = intervalo × falhas; detecção passiva pelos erros reais encurta essa janela.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "health",
            piece: "block-diagram",
            blocks: [
              { id: "users", kind: "user", label: "usuários", col: 0, row: 0.5 },
              { id: "lb", kind: "server", label: "balanceador", col: 1, row: 0.5 },
              { id: "a", kind: "llm", label: "réplica a", col: 2.5, row: 0 },
              { id: "b", kind: "no-result", label: "réplica b caiu", col: 3, row: 0.5 },
              { id: "c", kind: "llm", label: "réplica c", col: 2.5, row: 1 },
            ],
            edges: [
              { from: "users", to: "lb" },
              { from: "lb", to: "a" },
              { from: "lb", to: "b", label: `${detectionS} s até ejetar`, variant: "alternative" },
              { from: "lb", to: "c" },
            ],
            active: "b",
          },
        ],
      },
      alt: `O balanceador continua mandando pedidos à réplica B, que caiu, por um caminho tracejado, durante até ${detectionS} s, até o health check tirá-la da rotação; A e C seguem atendendo.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Distribuir pelo trabalho, não pela contagem",
      tag: "summary",
      body: [
        "Com pedidos de duração desigual, round-robin acumula respostas longas numa réplica; least-connections, ou um balanceador que lê a carga do motor, espalha o trabalho real. Afinidade por conversa aproveita o prefix cache, combinada com a carga para não desequilibrar. Health checks ativos e passivos tiram réplicas doentes em segundos.",
        "Até aqui, cada réplica cabia numa máquina e numa região. A próxima aula trata de quando não cabe: modelos divididos entre GPUs e nós, e serviços espalhados por várias regiões.",
      ],
      keyIdea: "Balancear LLM = olhar a carga real + afinidade com o cache + tirar rápido quem caiu.",
      scene: { kind: "pieces", layout: "single", pieces: [balancer("c", ["users", "lb", "a", "b"])] },
      alt: "O balanceador distribui entre as réplicas A, B e C, com A e B já atendidas e C em destaque, a mais livre no momento.",
    },
  ],
  realWorldExample:
    "O NGINX e o Envoy trazem round-robin, least-connections e hash consistente como opções de balanceamento, e o Envoy tem outlier detection para ejetar réplicas pelos erros reais. Para servidores de modelo, o projeto Gateway API Inference Extension, do Kubernetes, roteia pedidos olhando métricas do motor, como fila e uso do KV cache.",
  code: {
    language: "python",
    source: `def least_connections(durations: list[int], replicas: int) -> list[int]:
    ends: list[list[int]] = [[] for _ in range(replicas)]
    chosen = []
    for start, duration in enumerate(durations):
        loads = [sum(1 for end in replica if end > start) for replica in ends]
        target = loads.index(min(loads))
        ends[target].append(start + duration)
        chosen.append(target)
    return chosen

print(least_connections([20, 2, 2, 18, 3, 2, 16, 2, 3, 2, 2, 3], replicas=3))`,
    caption: "A simulação da aula: um pedido por segundo, cada um para a réplica com menos pedidos em andamento naquele instante.",
  },
  tradeOffs: {
    pros: [
      "Least-connections se adapta a durações desiguais sem conhecê-las antes",
      "Afinidade por conversa reaproveita o prefix cache e reduz o TTFT",
      "Health checks tiram réplicas doentes sem intervenção humana",
    ],
    cons: [
      "Contar conexões ignora o tamanho do pedido: dois pedidos não são iguais",
      "Afinidade pode concentrar conversas pesadas numa réplica",
      "Checks frequentes geram tráfego e falsos alarmes em réplicas só ocupadas",
    ],
    alternatives: [
      "Roteamento pela carga do motor (fila, KV cache), quando o balanceador consegue ler as métricas",
      "Fila central com workers puxando pedidos, em vez de o balanceador empurrar",
    ],
  },
  knowledgeCheck: [
    {
      id: "rr-imbalance",
      prompt: "Um serviço de LLM usa round-robin entre 4 réplicas. Uma delas tem latência muito pior que as outras, embora as máquinas sejam iguais. O que é mais provável?",
      options: [
        "A GPU dessa réplica é mais lenta",
        "Pedidos longos se acumularam nela; round-robin conta pedidos, não trabalho em andamento",
        "O balanceador está desligado",
        "Falta streaming",
      ],
      correct: 1,
      explanation: "Round-robin distribui o mesmo número de pedidos, mas não o mesmo trabalho. Least-connections ou roteamento pela carga do motor espalham as respostas longas.",
      lesson: "17-10",
    },
    {
      id: "health-window",
      prompt: "O health check roda a cada 10 s e marca a réplica como doente depois de 3 falhas. Chegam 30 pedidos por segundo divididos entre 3 réplicas. Quantos pedidos, no máximo, vão para uma réplica que caiu antes de ela sair?",
      options: ["30", "100", "300", "900"],
      correct: 2,
      explanation: "A janela de detecção é 10 × 3 = 30 s. A réplica recebe 30 ÷ 3 = 10 pedidos por segundo, ou 300 no intervalo. Detecção passiva pelos erros reais encurta muito essa janela.",
      lesson: "17-10",
    },
  ],
  related: ["17-09", "17-11", "10-06"],
  references: [
    { title: "NGINX: HTTP Load Balancing", url: "https://nginx.org/en/docs/http/load_balancing.html", kind: "docs" },
    {
      title: "Envoy: Supported load balancers",
      url: "https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/load_balancers",
      kind: "docs",
    },
    { title: "Kubernetes Gateway API Inference Extension", url: "https://gateway-api-inference-extension.sigs.k8s.io/", kind: "docs" },
  ],
};

export default lesson;
