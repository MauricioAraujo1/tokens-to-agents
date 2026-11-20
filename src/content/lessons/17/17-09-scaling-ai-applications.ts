import type { BlockDiagramSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Escalar uma aplicação de IA com as contas no arquivo. A regra é a do Horizontal Pod Autoscaler do
// Kubernetes: réplicas desejadas = ⌈réplicas atuais × métrica atual / métrica alvo⌉, ignorando variações
// dentro da tolerância padrão de 10%. A métrica é o número de pedidos em andamento por réplica, que vem da
// Little's Law (pedidos em andamento = chegada × duração). O dia de tráfego, a duração e o alvo são DE EXEMPLO.

const fixed = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const percent = (value: number) => `${Math.round(value * 100)}%`;

const TOLERANCE = 0.1;
const desiredReplicas = (current: number, metric: number, target: number, min: number, max: number) => {
  const ratio = metric / target;
  if (Math.abs(ratio - 1) <= TOLERANCE) return current;
  return Math.min(max, Math.max(min, Math.ceil(current * ratio)));
};

// Passo 2: um exemplo da regra.
const CURRENT = 4;
const METRIC_NOW = 26;
const TARGET_PER_REPLICA = 16;
const MIN_REPLICAS = 1;
const MAX_REPLICAS = 10;
const example = desiredReplicas(CURRENT, METRIC_NOW, TARGET_PER_REPLICA, MIN_REPLICAS, MAX_REPLICAS);
const METRIC_CLOSE = 17;
const insideTolerance = desiredReplicas(CURRENT, METRIC_CLOSE, TARGET_PER_REPLICA, MIN_REPLICAS, MAX_REPLICAS);

// Passo 4: um dia, de 2 em 2 horas. Chegada em pedidos por segundo; cada pedido dura 8 s.
const DURATION_S = 8;
const day = [
  { hour: "0h", rate: 2 },
  { hour: "2h", rate: 1 },
  { hour: "4h", rate: 1 },
  { hour: "6h", rate: 3 },
  { hour: "8h", rate: 8 },
  { hour: "10h", rate: 14 },
  { hour: "12h", rate: 16 },
  { hour: "14h", rate: 15 },
  { hour: "16h", rate: 12 },
  { hour: "18h", rate: 10 },
  { hour: "20h", rate: 6 },
  { hour: "22h", rate: 3 },
];
const replicasNeeded = (rate: number) =>
  Math.min(MAX_REPLICAS, Math.max(MIN_REPLICAS, Math.ceil((rate * DURATION_S) / TARGET_PER_REPLICA)));
const plan = day.map((point) => ({ label: point.hour, value: replicasNeeded(point.rate) }));
const HOURS_PER_POINT = 2;
const autoscaledGpuHours = plan.reduce((sum, point) => sum + point.value * HOURS_PER_POINT, 0);
const peakReplicas = Math.max(...plan.map((point) => point.value));
const fixedGpuHours = peakReplicas * 24;
const saving = 1 - autoscaledGpuHours / fixedGpuHours;
const peakIndex = plan.findIndex((point) => point.value === peakReplicas);

// Passo 5: acima do máximo, a fila cresce sem limite; o excesso precisa ser recusado cedo.
const SPIKE_RATE = 25;
const maxInFlight = MAX_REPLICAS * TARGET_PER_REPLICA;
const capacityRate = maxInFlight / DURATION_S;
const shedShare = (SPIKE_RATE - capacityRate) / SPIKE_RATE;

const replicasDiagram = (active: string, done?: string[]): BlockDiagramSpec => ({
  id: "scale",
  piece: "block-diagram",
  blocks: [
    { id: "users", kind: "user", label: "usuários", col: 0, row: 0.5 },
    { id: "queue", kind: "queue", label: "fila", col: 1, row: 0.5 },
    { id: "hpa", kind: "eval", label: "autoscaler", col: 2, row: 1 },
    { id: "r1", kind: "server", label: "réplica 1", col: 2, row: 0 },
    { id: "r2", kind: "server", label: `réplica ${example}`, col: 3, row: 0.5 },
  ],
  edges: [
    { from: "users", to: "queue" },
    { from: "queue", to: "r1" },
    { from: "queue", to: "hpa", label: "em andamento" },
    { from: "hpa", to: "r2", label: "+ réplicas" },
  ],
  active,
  ...(done ? { done } : {}),
});

const lesson: LessonContent = {
  id: "17-09",
  subtitle: "Crescer e encolher com o tráfego: a regra do autoscaler, as duas camadas de escala (pods e nós), o dia que sobe e desce e o que fazer quando nem o máximo basta.",
  objectives: [
    "Diferenciar escala horizontal e vertical",
    "Aplicar a regra do Horizontal Pod Autoscaler com uma métrica de LLM",
    "Calcular as réplicas de um dia de tráfego e as horas de GPU economizadas",
    "Proteger o serviço no limite com recusa antecipada de carga",
  ],
  steps: [
    {
      id: "out-or-up",
      shortTitle: "Para os lados",
      title: "Mais caixas ou um caixa mais rápido",
      tag: "context",
      body: [
        "Num supermercado cheio, você pode treinar o caixa para ser mais rápido ou abrir mais caixas. O primeiro tem limite: ninguém passa compras a uma velocidade infinita. O segundo cresce enquanto houver caixas e gente. [[Escala vertical|vertical-scaling]] é trocar a máquina por uma maior; [[escala horizontal|horizontal-scaling]] é somar réplicas iguais atrás de uma fila.",
        "Em LLMs, a escala vertical acaba cedo: a maior GPU disponível é o teto, e trocar de GPU exige reiniciar a réplica. A escala horizontal funciona porque cada réplica é independente, e o backend é um serviço sem estado. O que o [[autoscaling|autoscaling]] precisa é de uma métrica que diga quando abrir e quando fechar caixas.",
      ],
      keyIdea: "Escale para os lados: réplicas iguais e independentes atrás de uma fila, ligadas e desligadas por uma métrica.",
      scene: { kind: "pieces", layout: "single", pieces: [replicasDiagram("queue")] },
      alt: "Usuários entram numa fila, em destaque, que alimenta as réplicas; um autoscaler observa os pedidos em andamento e liga mais réplicas.",
    },
    {
      id: "rule",
      shortTitle: "A regra",
      title: "A regra do Horizontal Pod Autoscaler",
      tag: "mechanism",
      body: [
        `O [[Horizontal Pod Autoscaler|horizontal-pod-autoscaler]] do Kubernetes faz uma conta simples: réplicas desejadas = ⌈réplicas atuais × métrica atual ÷ métrica alvo⌉. Com ${CURRENT} réplicas, ${METRIC_NOW} pedidos em andamento por réplica e alvo de ${TARGET_PER_REPLICA}, o resultado é ⌈${CURRENT} × ${METRIC_NOW} ÷ ${TARGET_PER_REPLICA}⌉ = ${example} réplicas.`,
        `Duas proteções vêm de fábrica. Uma tolerância de ${percent(TOLERANCE)}: com ${METRIC_CLOSE} por réplica, a razão fica dentro dela e o HPA mantém ${insideTolerance}. E uma janela de estabilização para descer (300 s por padrão), que evita desligar réplicas num vale curto e religar no minuto seguinte, pagando o [[cold start|cold-start]] de novo. Para LLM, a métrica certa é a fila ou os pedidos em andamento por réplica, não a CPU (aula 10-13).`,
      ],
      keyIdea: "Réplicas = ⌈atuais × métrica ÷ alvo⌉, com tolerância e janela para não oscilar.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "hpa",
            piece: "metrics-panel",
            metrics: [
              { id: "current", label: "réplicas atuais", value: String(CURRENT) },
              { id: "metric", label: "em andamento por réplica", value: String(METRIC_NOW), color: "danger" },
              { id: "target", label: "alvo", value: String(TARGET_PER_REPLICA) },
              { id: "desired", label: "desejadas", value: String(example), color: "module-17" },
            ],
            highlight: "desired",
          },
        ],
      },
      alt: `Regra do HPA: ${CURRENT} réplicas com ${METRIC_NOW} pedidos em andamento cada, contra um alvo de ${TARGET_PER_REPLICA}, pedem ${example} réplicas.`,
    },
    {
      id: "two-levels",
      shortTitle: "Dois níveis",
      title: "Escalar pods não basta: alguém precisa criar nós",
      tag: "mechanism",
      body: [
        "O HPA cria pods, mas pods com GPU precisam de nós com GPU livre. Se não há, eles ficam pendentes até o autoscaler de nós (Cluster Autoscaler ou Karpenter) pedir máquinas à nuvem. São duas esperas somadas: a máquina nova subir e entrar no cluster, e depois o pod baixar a imagem e carregar os pesos.",
        "Para encurtar, times mantêm nós de folga já ligados, usam imagens e pesos em cache nos nós e escalam por uma métrica que sobe antes da saturação. A [[escala até zero|scale-to-zero]], desligando tudo quando não há tráfego, economiza nas madrugadas vazias, mas o primeiro usuário da manhã paga o cold start inteiro.",
      ],
      keyIdea: "Escala de LLM tem dois níveis, pods e nós: a espera total é a soma das duas subidas.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "levels",
            piece: "pipeline",
            stages: [
              { id: "metric", label: "métrica sobe" },
              { id: "hpa", label: "hpa cria pods" },
              { id: "pending", label: "pods pendentes" },
              { id: "nodes", label: "nó novo na nuvem", color: "module-17" },
              { id: "load", label: "imagem e pesos" },
              { id: "ready", label: "réplica pronta" },
            ],
            active: "nodes",
            done: ["metric", "hpa", "pending"],
            branch: { id: "spare", label: "nó de folga", from: "pending", edgeLabel: "atalho", color: "success" },
          },
        ],
      },
      alt: "Pipeline da escala: a métrica sobe, o HPA cria pods, os pods ficam pendentes, um nó novo é pedido à nuvem (em destaque), a imagem e os pesos carregam e a réplica fica pronta. Um ramo sai dos pods pendentes para um nó de folga já ligado, como atalho.",
    },
    {
      id: "day",
      shortTitle: "Um dia",
      title: "O dia sobe e desce, as réplicas acompanham",
      tag: "example",
      body: [
        `Num dia de exemplo, a chegada vai de ${Math.min(...day.map((point) => point.rate))} pedido por segundo de madrugada a ${Math.max(...day.map((point) => point.rate))} ao meio-dia. Com ${DURATION_S} s por pedido, a [[Little's Law|littles-law]] dá os pedidos em andamento, e o alvo de ${TARGET_PER_REPLICA} por réplica, com mínimo ${MIN_REPLICAS} e máximo ${MAX_REPLICAS}, dá as réplicas de cada horário: de ${Math.min(...plan.map((point) => point.value))} a ${peakReplicas}.`,
        `Somando de 2 em 2 horas, o dia usa ${integer(autoscaledGpuHours)} horas de réplica. Ligar ${peakReplicas} réplicas fixas o dia todo, dimensionadas para o pico, usaria ${integer(fixedGpuHours)}. O autoscaling economiza ${percent(saving)} das horas de GPU, sem mudar nada no modelo.`,
      ],
      keyIdea: "Dimensionar pelo pico paga o vale; o autoscaling paga só a curva do dia.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "day",
            piece: "chart",
            kind: "line",
            series: plan,
            highlight: peakIndex,
            color: "module-17",
          },
        ],
      },
      alt: `Réplicas ao longo do dia, de 2 em 2 horas: ${plan.map((point) => `${point.label} ${point.value}`).join(", ")}. São ${integer(autoscaledGpuHours)} horas de réplica contra ${integer(fixedGpuHours)} com ${peakReplicas} fixas, ${percent(saving)} a menos.`,
    },
    {
      id: "shed",
      shortTitle: "No limite",
      title: "Quando nem o máximo basta",
      tag: "tradeoff",
      body: [
        `O máximo de ${MAX_REPLICAS} réplicas aguenta ${maxInFlight} pedidos em andamento, ou ${fixed(capacityRate)} por segundo. Num pico de ${SPIKE_RATE} por segundo, deixar todo mundo na fila é o pior desfecho: a espera cresce para todos, os clientes desistem e repetem, e o serviço inteiro fica lento.`,
        `A [[recusa antecipada de carga|load-shedding]] devolve 429 ou 503 rápido para os ${percent(shedShare)} que não cabem, com retry-after, e mantém a latência boa para quem entrou. Dá para priorizar: usuários pagantes passam, tarefas em lote esperam. O máximo de réplicas existe por causa da cota e do orçamento: subir o teto é uma decisão de custo, não um ajuste técnico.`,
      ],
      keyIdea: "No teto, recuse cedo e com critério: uma fila sem limite derruba a latência de todo mundo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "shed",
            piece: "client-server",
            nodes: [
              { id: "users", label: `${SPIKE_RATE} pedidos/s`, role: "client" },
              { id: "gate", label: "admissão", role: "queue", size: 8 },
              { id: "replicas", label: `${MAX_REPLICAS} réplicas (máx.)`, role: "model", utilization: 1 },
              { id: "reject", label: "429 + retry-after", role: "server", utilization: Number(shedShare.toFixed(2)) },
            ],
            messages: [
              { from: "users", to: "gate", label: "pico" },
              { from: "gate", to: "replicas", label: `${fixed(capacityRate)}/s` },
              { from: "gate", to: "reject", label: `${percent(shedShare)} recusados` },
            ],
            active: 2,
          },
        ],
      },
      alt: `No pico de ${SPIKE_RATE} pedidos por segundo, ${MAX_REPLICAS} réplicas no máximo atendem ${fixed(capacityRate)} por segundo; a admissão recusa ${percent(shedShare)} com 429 e retry-after.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Escala horizontal com freios",
      tag: "summary",
      body: [
        "Escale réplicas iguais pela métrica que mede saturação de LLM: fila ou pedidos em andamento por réplica. A regra do HPA, com tolerância e janela, decide os pods; o autoscaler de nós cria as máquinas; nós de folga e cache encurtam o cold start; e, no teto, a recusa antecipada protege quem já entrou.",
        "Com várias réplicas de pé, falta decidir qual delas recebe cada pedido. A próxima aula trata do balanceamento de carga, onde a duração variável dos pedidos de LLM muda a escolha do algoritmo.",
      ],
      keyIdea: "Escalar = métrica certa + regra estável + dois níveis de subida + limite com recusa.",
      scene: { kind: "pieces", layout: "single", pieces: [replicasDiagram("r2", ["users", "queue", "hpa", "r1"])] },
      alt: `O fluxo completo: usuários, fila, autoscaler e a primeira réplica já percorridos, e a réplica ${example} em destaque, criada pela regra.`,
    },
  ],
  realWorldExample:
    "A documentação do Kubernetes publica a fórmula do Horizontal Pod Autoscaler, a tolerância padrão de 10% e a janela de estabilização de 300 s para reduzir réplicas. O KEDA, projeto da CNCF, estende o autoscaling para métricas externas, como uma consulta ao Prometheus com a fila do vLLM, e permite escalar até zero réplicas.",
  code: {
    language: "python",
    source: `import math

def desired_replicas(current: int, metric: float, target: float,
                     minimum: int = 1, maximum: int = 10, tolerance: float = 0.1) -> int:
    ratio = metric / target
    if abs(ratio - 1) <= tolerance:
        return current
    return min(maximum, max(minimum, math.ceil(current * ratio)))

print(desired_replicas(current=4, metric=26, target=16))
print(desired_replicas(current=4, metric=17, target=16))`,
    caption: "A regra do HPA com tolerância e limites: imprime 7 e depois 4, porque 17 contra 16 fica dentro dos 10%.",
  },
  tradeOffs: {
    pros: [
      "Paga GPU pela curva do dia, não pelo pico",
      "Réplicas independentes isolam falhas e somam capacidade",
      "Recusa antecipada mantém a latência de quem foi atendido",
    ],
    cons: [
      "Cold start de pods e nós atrasa a reação a picos rápidos",
      "Escala até zero faz o primeiro usuário esperar a subida inteira",
      "O teto de réplicas depende de cota e orçamento, não só da técnica",
    ],
    alternatives: [
      "Capacidade fixa dimensionada pelo pico, quando o tráfego é plano",
      "Endpoints gerenciados ou APIs por token, que absorvem os picos por você",
    ],
  },
  knowledgeCheck: [
    {
      id: "hpa-math",
      prompt: "Há 5 réplicas, cada uma com 30 pedidos em andamento, e o alvo é 20 por réplica, com máximo de 10. Quantas réplicas o HPA pede?",
      options: ["5", "6", "8", "10"],
      correct: 2,
      explanation: "⌈5 × 30 ÷ 20⌉ = ⌈7,5⌉ = 8, dentro do máximo de 10. A razão 1,5 está fora da tolerância de 10%.",
      lesson: "17-09",
    },
    {
      id: "scale-signal",
      prompt: "Um pico chega, o HPA cria pods, mas eles ficam pendentes por minutos. O que está faltando?",
      options: [
        "Uma regra de HPA mais agressiva",
        "Nós com GPU livre: o autoscaler de nós precisa criar máquinas, ou nós de folga precisam estar ligados",
        "Mais CPU no backend",
        "Desligar o readiness probe",
      ],
      correct: 1,
      explanation: "Pods com GPU só rodam em nós com GPU livre. Sem eles, a espera inclui criar a máquina; nós de folga e pesos em cache encurtam essa subida.",
      lesson: "17-09",
    },
  ],
  related: ["10-13", "17-06", "17-10"],
  references: [
    { title: "Kubernetes: Horizontal Pod Autoscaling", url: "https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/", kind: "docs" },
    { title: "KEDA: documentação", url: "https://keda.sh/docs/", kind: "docs" },
    { title: "Google SRE Book: Handling Overload", url: "https://sre.google/sre-book/handling-overload/", kind: "article" },
  ],
};

export default lesson;
