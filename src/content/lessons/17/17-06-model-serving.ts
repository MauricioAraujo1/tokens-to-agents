import type { BlockDiagramSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Model serving do lado da operação, com as contas no arquivo. O que acontece dentro de uma réplica (fila,
// lotes, streaming, Little's Law) está na aula 10-13; aqui, a réplica é um pod do Kubernetes num pool de nós
// de GPU. Os tempos de subida são DE EXEMPLO (o pull e a leitura dos pesos seguem as velocidades de exemplo
// da aula 17-05). O liveness probe padrão do Kubernetes (periodSeconds 10, failureThreshold 3) reinicia um
// container que não responde em cerca de 30 s; o startup probe dá um prazo de periodSeconds × failureThreshold.
// No rolling update, maxSurge pede GPUs extras e maxUnavailable tira capacidade durante a troca.

const fixed = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const percent = (value: number) => `${Math.round(value * 100)}%`;

// Passo 3: subida de um pod num nó novo, em segundos (exemplo).
const phases = [
  { label: "agendar", seconds: 5 },
  { label: "pull da imagem", seconds: 21 },
  { label: "ler os pesos", seconds: 32 },
  { label: "iniciar o motor", seconds: 30 },
];
const cumulative = phases.map((_, index) => phases.slice(0, index + 1).reduce((sum, phase) => sum + phase.seconds, 0));
const readySeconds = cumulative[cumulative.length - 1];
const LIVENESS_PERIOD = 10;
const LIVENESS_FAILURES = 3;
const livenessKill = LIVENESS_PERIOD * LIVENESS_FAILURES;
const STARTUP_PERIOD = 10;
const STARTUP_FAILURES = 30;
const startupBudget = STARTUP_PERIOD * STARTUP_FAILURES;

// Passos 4 e 5: rolling update de 4 réplicas.
const REPLICAS = 4;
const UTILIZATION = 0.7;
const surgeGpus = REPLICAS + 1;
const rolloutSeconds = REPLICAS * readySeconds;
const unavailableCapacity = (REPLICAS - 1) / REPLICAS;
const utilizationDuringRollout = (UTILIZATION * REPLICAS) / (REPLICAS - 1);

const cluster = (active: string, done?: string[]): BlockDiagramSpec => ({
  id: "cluster",
  piece: "block-diagram",
  blocks: [
    { id: "laptop", kind: "laptop", label: "kubectl apply", col: 0, row: 0.5 },
    { id: "control", kind: "cloud", label: "control plane", col: 1, row: 0.5 },
    { id: "cpu-pool", kind: "app", label: "pool cpu: backend", col: 2, row: 0 },
    { id: "gpu-pool", kind: "server", label: "pool gpu", col: 2, row: 1 },
    { id: "pod-a", kind: "llm", label: "pod vllm 1", col: 3, row: 0 },
    { id: "pod-b", kind: "llm", label: `pod vllm ${REPLICAS}`, col: 3, row: 1 },
  ],
  edges: [
    { from: "laptop", to: "control", label: `replicas: ${REPLICAS}` },
    { from: "control", to: "cpu-pool" },
    { from: "control", to: "gpu-pool", label: "nvidia.com/gpu" },
    { from: "gpu-pool", to: "pod-a" },
    { from: "gpu-pool", to: "pod-b" },
  ],
  active,
  ...(done ? { done } : {}),
});

const lesson: LessonContent = {
  id: "17-06",
  subtitle: "Levar as réplicas do modelo para o Kubernetes: pods com GPU, pools de nós, probes que respeitam o carregamento dos pesos e deploys sem derrubar o serviço.",
  objectives: [
    "Descrever um Deployment de modelo: pods, pedido de GPU e pool de nós de GPU",
    "Configurar probes que esperam os pesos carregarem antes de mandar tráfego",
    "Calcular GPUs extras e tempo de um rolling update",
    "Escolher entre maxSurge e maxUnavailable pelo custo e pela capacidade",
  ],
  steps: [
    {
      id: "desired",
      shortTitle: "Estado",
      title: "Você declara o que quer, o cluster corre atrás",
      tag: "context",
      body: [
        "Um termostato não recebe ordens de ligar e desligar: você diz 22 graus, e ele age até a sala chegar lá, e de novo quando ela esfria. O [[Kubernetes|kubernetes]] funciona assim. Você declara “quero 4 réplicas do vLLM, cada uma com uma GPU”, e os controladores do cluster criam, reiniciam e movem containers até o estado real bater com o declarado.",
        "A aula 10-13 mostrou o que acontece dentro de uma réplica. Aqui, cada réplica é um [[pod|pod]], o menor bloco que o Kubernetes agenda, e os nós ficam em pools: um pool de CPU para o backend e um [[pool de nós de GPU|gpu-node-pool]] só para os pods que pedem nvidia.com/gpu. Uma taint no pool de GPU impede que pods comuns ocupem máquinas caras.",
      ],
      keyIdea: "No Kubernetes, você declara réplicas e recursos; os controladores mantêm o cluster nesse estado.",
      scene: { kind: "pieces", layout: "single", pieces: [cluster("control")] },
      alt: `O desenvolvedor aplica um manifesto com ${REPLICAS} réplicas no control plane, em destaque, que agenda o backend no pool de CPU e os pods do vLLM no pool de GPU.`,
    },
    {
      id: "lifecycle",
      shortTitle: "Subida",
      title: "Do pod pendente ao primeiro pedido",
      tag: "mechanism",
      body: [
        "Um pod novo nasce pendente. O escalonador procura um nó do pool de GPU com uma GPU livre; se não houver, o autoscaler de nós pede uma máquina nova à nuvem. Com o nó escolhido, o kubelet baixa a imagem, o container sobe, o motor lê os pesos para a GPU e só então o servidor HTTP responde.",
        "O passo que separa um deploy tranquilo de uma queda é o [[readiness probe|readiness-probe]]: o Service só manda tráfego para pods prontos. Sem ele, o balanceador começa a mandar pedidos para um pod que ainda está lendo pesos, e eles falham. O vLLM expõe um endpoint /health que serve para isso.",
      ],
      keyIdea: "Tráfego só entra depois do readiness: um pod de LLM está vivo bem antes de estar pronto.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "pod-lifecycle",
            piece: "pipeline",
            stages: [
              { id: "pending", label: "pendente" },
              { id: "schedule", label: "nó com gpu" },
              { id: "pull", label: "pull da imagem" },
              { id: "weights", label: "pesos na gpu" },
              { id: "ready", label: "readiness ok", color: "module-17" },
              { id: "traffic", label: "recebe tráfego" },
            ],
            active: "ready",
            done: ["pending", "schedule", "pull", "weights"],
            branch: { id: "new-node", label: "nó novo", from: "schedule", edgeLabel: "sem gpu livre", color: "danger" },
          },
        ],
      },
      alt: "Pipeline do pod: pendente, nó com GPU, pull da imagem, pesos na GPU, readiness ok (em destaque) e recebe tráfego. Um ramo tracejado sai da escolha do nó para pedir um nó novo quando não há GPU livre.",
    },
    {
      id: "probes",
      shortTitle: "Probes",
      title: "O probe que mata o pod antes dele nascer",
      tag: "mechanism",
      body: [
        `No exemplo, o pod leva ${phases.map((phase) => `${phase.seconds} s para ${phase.label}`).join(", ")}: fica pronto em ${readySeconds} s. Um liveness probe com os valores padrão (a cada ${LIVENESS_PERIOD} s, ${LIVENESS_FAILURES} falhas) reinicia o container que não responde em ${livenessKill} s. Ele mataria o pod no meio da leitura dos pesos, o pod recomeçaria do zero, e o deploy nunca terminaria.`,
        `A saída é um startup probe: enquanto ele não passa, os outros probes esperam. Com período de ${STARTUP_PERIOD} s e ${STARTUP_FAILURES} falhas permitidas, o prazo é ${startupBudget} s, folga de sobra para os ${readySeconds} s. Depois disso, o liveness volta a valer e reinicia o motor se ele travar de verdade.`,
      ],
      keyIdea: "Dê ao carregamento dos pesos um startup probe com prazo maior que o pior cold start.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "startup",
            piece: "chart",
            kind: "bar",
            series: phases.map((phase, index) => ({ label: `até ${phase.label}`, value: cumulative[index] })),
            cutoff: { mode: "threshold", value: livenessKill, label: `liveness mata em ${livenessKill} s` },
            highlight: phases.length - 1,
            color: "module-17",
          },
        ],
      },
      alt: `Tempo acumulado da subida do pod, em segundos: ${phases.map((phase, index) => `até ${phase.label} ${cumulative[index]}`).join(", ")}. As fases depois de ${livenessKill} s passam do ponto em que o liveness padrão reiniciaria o container.`,
    },
    {
      id: "rollout",
      shortTitle: "Rollout",
      title: "Trocar a versão sem parar o serviço",
      tag: "example",
      body: [
        `Um [[rolling update|rolling-update]] troca os pods aos poucos. Com maxSurge 1 e maxUnavailable 0, o Kubernetes sobe um pod novo, espera o readiness e só então desliga um antigo. Com ${REPLICAS} réplicas, o cluster precisa de ${surgeGpus} GPUs durante a troca, e cada rodada leva os ${readySeconds} s da subida: ${fixed(rolloutSeconds / 60)} minutos para o deploy inteiro.`,
        `O pod antigo também precisa sair com calma: ao receber o sinal de término, ele para de aceitar pedidos novos e termina os streams abertos. O terminationGracePeriodSeconds tem que cobrir a resposta mais longa, senão o usuário vê a resposta cortada no meio. Um PodDisruptionBudget impede que manutenções do cluster derrubem réplicas demais ao mesmo tempo.`,
      ],
      keyIdea: "maxSurge 1 troca as réplicas sem perder capacidade, ao custo de uma GPU a mais durante o deploy.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "rollout",
            piece: "metrics-panel",
            metrics: [
              { id: "replicas", label: "réplicas", value: String(REPLICAS) },
              { id: "gpus", label: "gpus no deploy (surge 1)", value: String(surgeGpus), color: "module-17" },
              { id: "round", label: "por rodada", value: `${readySeconds} s` },
              { id: "total", label: "deploy completo", value: `${fixed(rolloutSeconds / 60)} min` },
            ],
            highlight: "gpus",
          },
        ],
      },
      alt: `Rolling update com maxSurge 1: ${REPLICAS} réplicas, ${surgeGpus} GPUs durante a troca, ${readySeconds} s por rodada e ${fixed(rolloutSeconds / 60)} minutos para o deploy completo.`,
    },
    {
      id: "unavailable",
      shortTitle: "Sem folga",
      title: "Sem GPU extra, a capacidade cai",
      tag: "tradeoff",
      body: [
        `GPU extra nem sempre existe: a cota da região pode estar no limite. A alternativa é maxSurge 0 e maxUnavailable 1, que desliga um pod antigo antes de subir o novo. Nenhuma GPU a mais, mas durante o deploy só ${percent(unavailableCapacity)} da capacidade fica de pé.`,
        `Se as ${REPLICAS} réplicas rodavam a ${percent(UTILIZATION)}, as ${REPLICAS - 1} restantes vão a ${percent(utilizationDuringRollout)}, e a fila e o [[tail latency|tail-latency]] disparam (aula 10-04). Por isso deploys sem folga ficam para os horários de menos tráfego, ou o time reserva GPU para a troca. É a mesma escolha entre custo e risco que aparece de novo no blue-green da aula de CI/CD.`,
      ],
      keyIdea: "maxUnavailable economiza GPU e cobra em capacidade: só use com folga de utilização ou fora do pico.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "capacity",
            piece: "client-server",
            nodes: [
              { id: "lb", label: "service", role: "client" },
              { id: "queue", label: "fila", role: "queue", size: 12 },
              { id: "old", label: `${REPLICAS - 1} pods antigos`, role: "model", utilization: Number(utilizationDuringRollout.toFixed(2)) },
              { id: "new", label: "pod novo subindo", role: "server", utilization: 0 },
            ],
            messages: [
              { from: "lb", to: "queue", label: "pedidos" },
              { from: "queue", to: "old", label: `${percent(utilizationDuringRollout)} de uso` },
              { from: "queue", to: "new", label: `pronto em ${readySeconds} s` },
            ],
            active: 1,
          },
        ],
      },
      alt: `Com maxUnavailable 1, ${REPLICAS - 1} pods antigos carregam o tráfego a ${percent(utilizationDuringRollout)} de utilização, a fila cresce, e o pod novo, ainda vazio, leva ${readySeconds} s para ficar pronto.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Réplicas declaradas, trocadas com cuidado",
      tag: "summary",
      body: [
        "No Kubernetes, cada réplica do modelo é um pod que pede nvidia.com/gpu e cai num pool de nós de GPU. Startup e readiness probes esperam os pesos carregarem antes do tráfego. O rolling update troca versões aos poucos, com GPU extra (maxSurge) ou com capacidade reduzida (maxUnavailable), e os pods antigos terminam os streams antes de sair.",
        "O cluster pode ser seu ou da nuvem, e a nuvem oferece vários andares de ajuda, de máquinas com GPU até endpoints gerenciados. A próxima aula compara esses andares.",
      ],
      keyIdea: "Serving em produção = pods com GPU + probes que respeitam o cold start + deploys graduais.",
      scene: { kind: "pieces", layout: "single", pieces: [cluster("pod-b", ["laptop", "control", "cpu-pool", "gpu-pool", "pod-a"])] },
      alt: `O cluster completo: manifesto, control plane, pools de CPU e de GPU e o primeiro pod já de pé, e o pod ${REPLICAS} em destaque.`,
    },
  ],
  realWorldExample:
    "A documentação do Kubernetes descreve o agendamento de GPUs pelo recurso nvidia.com/gpu, anunciado pelo device plugin da NVIDIA, e recomenda startup probes para aplicações que demoram a iniciar. O GPU Operator da NVIDIA instala driver, container toolkit e device plugin nos nós de GPU do cluster, e o vLLM documenta o deploy em Kubernetes com o endpoint /health nos probes.",
  code: {
    language: "json",
    source: `{
  "apiVersion": "apps/v1",
  "kind": "Deployment",
  "metadata": { "name": "llm" },
  "spec": {
    "replicas": 4,
    "strategy": { "type": "RollingUpdate", "rollingUpdate": { "maxSurge": 1, "maxUnavailable": 0 } },
    "selector": { "matchLabels": { "app": "llm" } },
    "template": {
      "metadata": { "labels": { "app": "llm" } },
      "spec": {
        "tolerations": [{ "key": "nvidia.com/gpu", "operator": "Exists", "effect": "NoSchedule" }],
        "containers": [{
          "name": "vllm",
          "image": "vllm/vllm-openai:v0.6.3",
          "args": ["--model", "meta-llama/Llama-3.1-8B-Instruct"],
          "ports": [{ "containerPort": 8000 }],
          "resources": { "limits": { "nvidia.com/gpu": 1 } },
          "startupProbe": { "httpGet": { "path": "/health", "port": 8000 }, "periodSeconds": 10, "failureThreshold": 30 },
          "readinessProbe": { "httpGet": { "path": "/health", "port": 8000 }, "periodSeconds": 5 }
        }]
      }
    }
  }
}`,
    caption: "Deployment do vLLM em JSON (o kubectl aceita JSON e YAML): uma GPU por pod, toleration para o pool de GPU, startup probe de 300 s e rolling update sem perder capacidade.",
  },
  tradeOffs: {
    pros: [
      "Estado declarado: o cluster recria pods que caem sem ninguém acordar",
      "Pools separados mantêm as GPUs só para quem precisa delas",
      "Rolling update com probes troca versões sem derrubar o serviço",
    ],
    cons: [
      "Kubernetes é uma plataforma inteira para operar e aprender",
      "Cold start longo deixa deploys e escala lentos",
      "maxSurge pede GPU extra que a cota nem sempre tem",
    ],
    alternatives: [
      "Endpoints gerenciados da nuvem, que escondem o cluster",
      "KServe ou o Ray Serve em cima do Kubernetes, que empacotam esses padrões",
    ],
  },
  knowledgeCheck: [
    {
      id: "crash-loop",
      prompt: "Pods do vLLM reiniciam sem parar durante o deploy. Os logs mostram o carregamento dos pesos interrompido aos 30 s. Qual é a correção?",
      options: [
        "Aumentar o número de réplicas",
        "Adicionar um startup probe com prazo maior que o tempo de carregar os pesos",
        "Remover o readiness probe",
        "Trocar a GPU",
      ],
      correct: 1,
      explanation: "O liveness padrão reinicia o container em cerca de 30 s sem resposta. O startup probe suspende os outros probes até o servidor responder, com um prazo de period × failureThreshold.",
      lesson: "17-06",
    },
    {
      id: "surge-math",
      prompt: "Um serviço tem 6 réplicas de 2 GPUs cada. O rolling update usa maxSurge 1 e maxUnavailable 0. Quantas GPUs o cluster precisa no pico do deploy?",
      options: ["12", "13", "14", "6"],
      correct: 2,
      explanation: "Com maxSurge 1, existe um pod a mais durante a troca: 7 pods × 2 GPUs = 14 GPUs.",
      lesson: "17-06",
    },
  ],
  related: ["10-13", "17-05", "17-09"],
  references: [
    { title: "Kubernetes: Deployments", url: "https://kubernetes.io/docs/concepts/workloads/controllers/deployment/", kind: "docs" },
    {
      title: "Kubernetes: Configure Liveness, Readiness and Startup Probes",
      url: "https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/",
      kind: "docs",
    },
    { title: "Kubernetes: Schedule GPUs", url: "https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/", kind: "docs" },
  ],
};

export default lesson;
