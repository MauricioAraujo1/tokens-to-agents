import type { LessonContent } from "../../../types/content";

// Latência e throughput com teoria de filas, calculada no arquivo. A lei de Little (L = λ · W) vale para qualquer
// fila estável. O resto usa o modelo mais simples, a fila M/M/1 (chegadas e atendimentos aleatórios, um servidor,
// tempo de atendimento médio S): W = S / (1 − ρ), e o tempo no sistema segue uma exponencial de média W, então o
// percentil q é −ln(1 − q) · W. É uma aproximação: serve para ver a forma da curva, não para prever o seu servidor.

const fixed = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const percent = (value: number) => `${Math.round(value * 100)}%`;

// Passo 2: lei de Little num serviço de chat.
const ARRIVALS_PER_S = 20;
const MEAN_TIME_S = 3;
const inSystem = ARRIVALS_PER_S * MEAN_TIME_S;

// Passo 3: um servidor que leva, em média, 1 s por pedido.
const SERVICE_S = 1;
const meanTime = (rho: number) => SERVICE_S / (1 - rho);
const loads = [0.1, 0.3, 0.5, 0.7, 0.8, 0.9, 0.95];
const curve = loads.map((rho) => ({ label: percent(rho), value: Number(meanTime(rho).toFixed(1)) }));
const HOT = 0.9;
const hotQueue = HOT / (1 - HOT);

// Passo 4: percentis com 80% de utilização.
const LOAD = 0.8;
const quantile = (rho: number, q: number) => -Math.log(1 - q) * meanTime(rho);
const percentiles = [
  { label: "média", value: Number(meanTime(LOAD).toFixed(1)) },
  { label: "p50", value: Number(quantile(LOAD, 0.5).toFixed(1)) },
  { label: "p90", value: Number(quantile(LOAD, 0.9).toFixed(1)) },
  { label: "p95", value: Number(quantile(LOAD, 0.95).toFixed(1)) },
  { label: "p99", value: Number(quantile(LOAD, 0.99).toFixed(1)) },
];
const p99OverP50 = quantile(LOAD, 0.99) / quantile(LOAD, 0.5);

// Passo 5: a maior utilização que mantém o p99 dentro de um SLO de 10 s, e quantos servidores isso pede.
const SLO_P99_S = 10;
const maxLoad = 1 - (SERVICE_S * Math.log(100)) / SLO_P99_S;
const DEMAND_PER_S = 2;
const servers = Math.ceil(DEMAND_PER_S / (maxLoad / SERVICE_S));
const loadPerServer = DEMAND_PER_S / servers / (1 / SERVICE_S);
const p99AtPlan = quantile(loadPerServer, 0.99);

// Exemplo real: um pedido que depende de 100 servidores, cada um lento em 1% das vezes.
const FAN_OUT = 100;
const slowChance = 1 - 0.99 ** FAN_OUT;

const lesson: LessonContent = {
  id: "10-04",
  subtitle: "Por que um servidor de LLM fica lento antes de ficar cheio: filas, a lei de Little, percentis e o preço de espremer a última gota de throughput.",
  objectives: [
    "Diferenciar latência de throughput e explicar por que eles brigam",
    "Usar a lei de Little para estimar quantos pedidos estão no sistema",
    "Explicar por que a latência explode perto de 100% de utilização",
    "Dimensionar servidores por um objetivo de p99, e não pela média",
  ],
  steps: [
    {
      id: "highway",
      shortTitle: "Estrada",
      title: "Velocidade de um carro e carros por hora",
      tag: "context",
      body: [
        "Numa estrada, há dois números diferentes. Um é quanto tempo um carro leva de uma cidade à outra. O outro é quantos carros passam pelo pedágio por hora. Você pode aumentar o segundo enchendo a estrada, mas a partir de certo ponto cada carro passa a levar muito mais tempo, e o congestionamento aparece de repente.",
        "Em inferência, o primeiro número é a [[latência|latency]]: quanto um pedido leva da chegada à resposta completa. O segundo é o [[throughput|throughput]]: quantos pedidos, ou tokens, o servidor conclui por segundo. O dono da GPU quer throughput alto, porque paga a hora dela. O usuário quer latência baixa. Esta aula mostra a conta que liga os dois.",
      ],
      keyIdea: "Latência é o tempo de cada pedido; throughput é a vazão do sistema. Aumentar um costuma piorar o outro.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "users", kind: "user", label: "usuários", col: 0, row: 0 },
              { id: "queue", kind: "queue", label: "fila", col: 1, row: 0 },
              { id: "api", kind: "server", label: "gpu", col: 2, row: 0 },
              { id: "answer", kind: "answer", label: "respostas/s", col: 3, row: 0 },
            ],
            edges: [
              { from: "users", to: "queue", label: "chegadas" },
              { from: "queue", to: "api", label: "espera" },
              { from: "api", to: "answer", label: "throughput" },
            ],
            active: "queue",
          },
        ],
      },
      alt: "Usuários chegam a uma fila, em destaque, que alimenta a GPU; a vazão de respostas por segundo é o throughput, e o tempo de espera na fila soma na latência.",
    },
    {
      id: "little",
      shortTitle: "Lei de Little",
      title: "Quantos pedidos estão lá dentro agora",
      tag: "mechanism",
      body: [
        `A [[lei de Little|littles-law]] diz que, numa fila estável, o número médio de pedidos no sistema é a taxa de chegada vezes o tempo médio que cada um fica lá: L = λ · W. Vale para supermercado, para banco de dados e para LLM, sem nenhuma suposição sobre a distribuição dos tempos.`,
        `Um chat que recebe ${ARRIVALS_PER_S} pedidos por segundo, com respostas que levam ${MEAN_TIME_S} s em média, tem ${inSystem} pedidos em andamento a qualquer momento. Cada um deles ocupa uma vaga no lote e guarda o próprio [[KV cache|kv-cache]] na GPU. Se as respostas ficarem 2 vezes mais longas, o tempo dobra e a memória precisa caber ${inSystem * 2} pedidos, com o mesmo tráfego.`,
      ],
      keyIdea: "L = λ · W: pedidos simultâneos = chegadas por segundo × segundos de cada pedido.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "little",
            piece: "metrics-panel",
            metrics: [
              { id: "lambda", label: "λ: chegadas por segundo", value: String(ARRIVALS_PER_S) },
              { id: "w", label: "W: tempo médio", value: `${MEAN_TIME_S} s` },
              { id: "l", label: "L: pedidos no sistema", value: String(inSystem), color: "module-10" },
              { id: "double", label: "com respostas 2× mais longas", value: String(inSystem * 2) },
            ],
            highlight: "l",
          },
        ],
      },
      alt: `Lei de Little: ${ARRIVALS_PER_S} chegadas por segundo vezes ${MEAN_TIME_S} s de tempo médio dão ${inSystem} pedidos em andamento; com respostas duas vezes mais longas, ${inSystem * 2}.`,
    },
    {
      id: "queue",
      shortTitle: "A curva",
      title: "A latência explode antes de a GPU encher",
      tag: "mechanism",
      body: [
        `Imagine um servidor que leva, em média, ${SERVICE_S} s por pedido, com chegadas aleatórias. A utilização ρ é a fração do tempo em que ele está ocupado. No modelo mais simples de fila (M/M/1), o tempo médio no sistema é W = S / (1 − ρ): com ρ = 50%, ${fixed(meanTime(0.5))} s; com 80%, ${fixed(meanTime(0.8))} s; com 95%, ${fixed(meanTime(0.95))} s.`,
        `A curva não é uma reta: os últimos pontos de utilização custam cada vez mais espera, porque qualquer rajada de chegadas encontra o servidor ocupado e forma fila. Com ρ = ${percent(HOT)}, há em média ${integer(hotQueue)} pedidos no sistema. O modelo é uma simplificação, mas a forma vale para qualquer servidor real: perto de 100%, a fila cresce sem limite.`,
      ],
      keyIdea: "Tempo médio = S / (1 − ρ): os últimos 10% de utilização dobram e redobram a espera.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "curve",
            piece: "chart",
            kind: "line",
            series: curve,
            highlight: loads.indexOf(HOT),
            color: "module-10",
          },
        ],
      },
      alt: `Curva do tempo médio no sistema pela utilização, com ${SERVICE_S} s por pedido: ${curve.map((item) => `${item.label} → ${fixed(item.value)} s`).join(", ")}.`,
    },
    {
      id: "percentiles",
      shortTitle: "Percentis",
      title: "A média mente: olhe o p99",
      tag: "example",
      body: [
        `Com ${percent(LOAD)} de utilização, o tempo médio é ${fixed(meanTime(LOAD))} s. Mas metade dos pedidos termina em até ${fixed(quantile(LOAD, 0.5))} s (p50), e o 1% mais lento passa de ${fixed(quantile(LOAD, 0.99))} s (p99). Neste modelo, o p99 é ${fixed(p99OverP50)} vezes o p50.`,
        `A [[tail latency|tail-latency]] é o que os usuários mais azarados vivem, e com milhões de pedidos por dia esse 1% é muita gente. Em LLMs a cauda é ainda mais pesada que no modelo, porque o tempo de atendimento varia com o tamanho do prompt e da resposta: um pedido de ${integer(SERVICE_S * 10)} s na frente da fila atrasa todos os de trás. Por isso metas de serviço (SLOs) são escritas em percentis, como “p99 do TTFT abaixo de 2 s”.`,
      ],
      keyIdea: "Dimensione pelo p99, não pela média: é na cauda que o usuário desiste.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "percentiles",
            piece: "chart",
            kind: "bar",
            series: percentiles,
            highlight: percentiles.length - 1,
            color: "module-10",
          },
        ],
      },
      alt: `Tempo no sistema com ${percent(LOAD)} de utilização: ${percentiles.map((item) => `${item.label} ${fixed(item.value)} s`).join(", ")}.`,
    },
    {
      id: "slo",
      shortTitle: "Dimensionar",
      title: "Quanto dá para encher a GPU sem quebrar a meta",
      tag: "tradeoff",
      body: [
        `Invertendo a conta: com um SLO de p99 até ${SLO_P99_S} s, a utilização máxima é ρ = 1 − S · ln(100) / SLO = ${percent(maxLoad)}. Cada servidor só pode ficar ocupado ${percent(maxLoad)} do tempo. Para ${DEMAND_PER_S} pedidos por segundo, são ${servers} servidores, cada um em ${percent(loadPerServer)}, com p99 de ${fixed(p99AtPlan)} s.`,
        `É a troca central de inferência: throughput alto por GPU barateia cada token, latência baixa exige folga. O [[batching|batching]], da aula 10-07, muda a conta: ele aumenta muito o throughput de cada GPU, mas cada passada fica um pouco mais lenta. A pergunta certa nunca é “quanto a GPU aguenta?”, e sim “quanto ela aguenta dentro do p99 que prometi?”.`,
      ],
      keyIdea: "Capacidade útil é a vazão que mantém o p99 dentro da meta, não a vazão máxima.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "serving",
            piece: "client-server",
            nodes: [
              { id: "clients", label: `${DEMAND_PER_S} pedidos/s`, role: "client" },
              { id: "queue", label: "fila", role: "queue", size: Math.round(loadPerServer / (1 - loadPerServer)) },
              { id: "gpu", label: `servidor 1 de ${servers}`, role: "model", utilization: Number(loadPerServer.toFixed(2)) },
            ],
            messages: [
              { from: "clients", to: "queue", label: `${fixed(DEMAND_PER_S / servers, 2)} pedidos/s por servidor` },
              { from: "queue", to: "gpu", label: `p99 ${fixed(p99AtPlan)} s` },
            ],
            active: 1,
          },
        ],
      },
      alt: `Plano de capacidade: ${DEMAND_PER_S} pedidos por segundo divididos entre ${servers} servidores, cada um com ${percent(loadPerServer)} de utilização e p99 de ${fixed(p99AtPlan)} s, dentro do SLO de ${SLO_P99_S} s.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Vazão com folga",
      tag: "summary",
      body: [
        "Latência e throughput são duas faces da mesma fila. A lei de Little liga tráfego, tempo e pedidos simultâneos. A latência cresce como 1 / (1 − ρ) perto do limite, e a cauda (p99) cresce mais rápido que a média. Capacidade se planeja pelo percentil prometido, com réplicas para manter cada uma com folga.",
        "A próxima aula entra na peça que mais pesa na memória de cada pedido simultâneo: o KV cache.",
      ],
      keyIdea: "Mais throughput por GPU barateia o token; folga na utilização protege o p99.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "users", kind: "user", label: "usuários", col: 0, row: 0 },
              { id: "lb", kind: "app", label: "balanceador", col: 1, row: 0 },
              { id: "gpus", kind: "server", label: `${servers} réplicas a ${percent(loadPerServer)}`, col: 2, row: 0 },
              { id: "eval", kind: "eval", label: `p99 ≤ ${SLO_P99_S} s`, col: 3, row: 0 },
            ],
            edges: [
              { from: "users", to: "lb", label: `${DEMAND_PER_S} pedidos/s` },
              { from: "lb", to: "gpus" },
              { from: "gpus", to: "eval", label: `p99 ${fixed(p99AtPlan)} s` },
            ],
            active: "eval",
            done: ["users", "lb", "gpus"],
          },
        ],
      },
      alt: `Usuários passam por um balanceador que divide ${DEMAND_PER_S} pedidos por segundo entre ${servers} réplicas de GPU com ${percent(loadPerServer)} de utilização cada, e o painel de avaliação, em destaque, confere o p99 de ${fixed(p99AtPlan)} s contra a meta de ${SLO_P99_S} s.`,
    },
  ],
  realWorldExample: `No artigo “The Tail at Scale” (2013), Jeffrey Dean e Luiz André Barroso, do Google, mostram por que a cauda importa tanto: se um pedido depende de ${FAN_OUT} servidores e cada um é lento em 1% das vezes, ${percent(slowChance)} dos pedidos ficam lentos (1 − 0,99^${FAN_OUT}). Um agente que encadeia várias chamadas de LLM sente o mesmo efeito: o p99 de cada chamada vira a experiência comum do fluxo inteiro.`,
  code: {
    language: "python",
    source: `import math

def mm1(service_s, rho):
    """Fila M/M/1: tempo médio e percentis do tempo no sistema."""
    mean = service_s / (1 - rho)
    pct = lambda q: -math.log(1 - q) * mean
    return {"mean": mean, "p50": pct(0.5), "p99": pct(0.99)}

def max_load(service_s, slo_p99_s):
    return 1 - service_s * math.log(100) / slo_p99_s

print(mm1(1.0, 0.8))      # média 5 s, p50 ≈ 3,5 s, p99 ≈ 23 s
print(max_load(1.0, 10))  # ≈ 0,54`,
    caption: "As contas da aula: tempo médio e percentis numa fila M/M/1 e a utilização máxima que respeita um SLO de p99.",
  },
  tradeOffs: {
    pros: [
      "A lei de Little dá os pedidos simultâneos, e com eles a memória necessária, sem simulação",
      "Planejar por percentil protege os usuários que mais sofrem",
      "A curva 1 / (1 − ρ) mostra quanto de folga cada SLO exige",
    ],
    cons: [
      "Folga é GPU paga e parada parte do tempo",
      "O modelo M/M/1 subestima a cauda de LLMs, cujos tempos variam muito",
      "Throughput máximo e latência baixa não cabem no mesmo servidor ao mesmo tempo",
    ],
    alternatives: ["Filas separadas por tamanho de pedido ou prioridade", "Autoscaling pela fila, para ganhar folga só nos picos"],
  },
  knowledgeCheck: [
    {
      id: "last-five",
      prompt: "A GPU está em 95% de utilização e o p99 está alto. Alguém propõe “aproveitar os 5% ociosos” com mais tráfego. O que acontece?",
      options: [
        "O throughput sobe 5% e a latência fica igual",
        "A fila cresce sem limite: perto de 100% de utilização, cada ponto a mais multiplica a espera",
        "Nada, porque a GPU tem folga",
        "A latência cai, porque o lote fica maior",
      ],
      correct: 1,
      explanation: "O tempo médio é S / (1 − ρ). De 95% para 100%, o denominador vai a zero: a fila não se estabiliza e a cauda explode antes disso.",
      lesson: "10-04",
    },
    {
      id: "little-memory",
      prompt: "Um serviço recebe 50 pedidos por segundo e cada resposta leva 4 s. Quantos KV caches de pedidos a frota de GPUs precisa guardar ao mesmo tempo, em média?",
      options: ["12,5", "54", "200", "50"],
      correct: 2,
      explanation: "Pela lei de Little, L = λ · W = 50 × 4 = 200 pedidos simultâneos, cada um com o seu KV cache na memória.",
      lesson: "10-04",
    },
  ],
  related: ["10-03", "10-05", "10-07"],
  references: [
    { title: "Google SRE Book: Service Level Objectives", url: "https://sre.google/sre-book/service-level-objectives/", kind: "article" },
    { title: "Little's law", url: "https://en.wikipedia.org/wiki/Little%27s_law", kind: "article" },
    { title: "Databricks (2023), LLM Inference Performance Engineering: Best Practices", url: "https://www.databricks.com/blog/llm-inference-performance-engineering-best-practices", kind: "article" },
  ],
};

export default lesson;
