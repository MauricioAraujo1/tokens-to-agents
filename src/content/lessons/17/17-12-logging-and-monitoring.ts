import type { BlockDiagramSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Logs e monitoração com as contas no arquivo. SLI = eventos bons ÷ eventos válidos; o error budget é
// (1 − SLO) × eventos do período, como no livro de SRE do Google. A taxa de queima (burn rate) é a taxa de
// erro ÷ (1 − SLO): queimar 1× gasta o orçamento exatamente no fim da janela de 30 dias. O workbook de SRE
// sugere alertar quando 2% do orçamento de 30 dias some em 1 hora, o que dá 0,02 × 720 h ÷ 1 h = 14,4×.
// O volume de pedidos, o incidente e o consumo de base são DE EXEMPLO.

const fixed = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const percent = (value: number) => `${Math.round(value * 100)}%`;

// Passo 2: os campos de uma linha de log por pedido.
const logFields = ["ts", "request_id", "model", "tokens_in", "tokens_out", "ttft_ms", "latency_ms", "status"];

// Passo 4: SLO e error budget.
const SLO = 0.999;
const DAYS = 30;
const REQUESTS_PER_DAY = 200_000;
const monthRequests = REQUESTS_PER_DAY * DAYS;
const budgetRequests = (1 - SLO) * monthRequests;
const budgetMinutes = (1 - SLO) * DAYS * 24 * 60;
const BASE_BURN = 0.5;
const INCIDENT_DAY = 12;
const INCIDENT_SHARE = 0.3;
const remaining = (day: number) => 1 - BASE_BURN * (day / DAYS) - (day >= INCIDENT_DAY ? INCIDENT_SHARE : 0);
const checkpoints = [0, 5, 10, 15, 20, 25, 30];
const budgetSeries = checkpoints.map((day) => ({ label: `dia ${day}`, value: Math.round(remaining(day) * 100) }));
const incidentRequests = INCIDENT_SHARE * budgetRequests;

// Passo 5: alerta por taxa de queima.
const WINDOW_HOURS = DAYS * 24;
const PAGE_SHARE = 0.02;
const PAGE_HOURS = 1;
const pageBurnRate = (PAGE_SHARE * WINDOW_HOURS) / PAGE_HOURS;
const INCIDENT_ERROR_RATE = 0.02;
const incidentBurn = INCIDENT_ERROR_RATE / (1 - SLO);
const hoursToEmpty = WINDOW_HOURS / incidentBurn;

const pipeline = (active: string, done?: string[]): BlockDiagramSpec => ({
  id: "telemetry",
  piece: "block-diagram",
  blocks: [
    { id: "pods", kind: "server", label: "réplicas", col: 0, row: 0.5 },
    { id: "collector", kind: "queue", label: "coletor", col: 1, row: 0.5 },
    { id: "logs", kind: "documents", label: "logs indexados", col: 2, row: 0 },
    { id: "metrics", kind: "sql-db", label: "métricas", col: 2, row: 1 },
    { id: "dashboard", kind: "laptop", label: "dashboard", col: 3, row: 0 },
    { id: "pager", kind: "phone", label: "plantão", col: 3, row: 1 },
  ],
  edges: [
    { from: "pods", to: "collector", label: "json + /metrics" },
    { from: "collector", to: "logs" },
    { from: "collector", to: "metrics" },
    { from: "logs", to: "dashboard" },
    { from: "metrics", to: "pager", label: "alerta" },
  ],
  active,
  ...(done ? { done } : {}),
});

const lesson: LessonContent = {
  id: "17-12",
  subtitle: "O que registrar de cada pedido, quais métricas olhar num serviço de LLM e como um SLO com error budget decide quando acordar alguém.",
  objectives: [
    "Escrever logs estruturados que dá para filtrar e somar",
    "Escolher as métricas de um serviço de LLM além de erro e latência",
    "Calcular SLI, SLO e error budget de um mês",
    "Alertar pela taxa de queima do orçamento, não por limiares soltos",
  ],
  steps: [
    {
      id: "panel",
      shortTitle: "O painel",
      title: "O painel do carro e a caixa-preta do avião",
      tag: "context",
      body: [
        "O painel do carro mostra, agora, velocidade, combustível e temperatura: números para decidir na hora. A caixa-preta do avião guarda cada evento, para entender depois o que aconteceu. Um serviço em produção precisa dos dois: [[métricas|metrics]] são o painel, logs são a caixa-preta. (O terceiro sinal, o rastro de cada pedido entre serviços, é assunto do módulo 16, junto da [[observabilidade|observability]] da qualidade das respostas.)",
        "Cada réplica escreve logs e expõe métricas; um coletor junta tudo na [[agregação de logs|log-aggregation]], que indexa os logs de todas as máquinas num lugar só, e num banco de séries temporais, como o Prometheus. Em cima disso ficam os [[dashboards|dashboard]] e as regras de [[alerta|alerting]] que chamam o plantão.",
      ],
      keyIdea: "Métricas dizem que algo está errado agora; logs dizem o que aconteceu em cada pedido.",
      scene: { kind: "pieces", layout: "single", pieces: [pipeline("collector")] },
      alt: "As réplicas mandam logs em JSON e métricas para um coletor, em destaque, que alimenta os logs indexados, ligados ao dashboard, e o banco de métricas, que dispara alertas para o plantão.",
    },
    {
      id: "structured",
      shortTitle: "Logs",
      title: "Uma linha de log que dá para somar",
      tag: "mechanism",
      body: [
        "“Erro ao chamar o modelo” num log de texto livre não ajuda ninguém às 3 h da manhã. Um [[log estruturado|structured-logging]] é um objeto JSON por evento, com campos fixos: dá para filtrar todos os pedidos de um modelo, somar tokens por cliente ou achar os pedidos com TTFT acima de 2 s numa consulta.",
        "Para LLM, a linha por pedido leva o request_id (que liga o log do backend ao do motor), o modelo e a versão do prompt, tokens de entrada e saída, TTFT, latência total e status. O texto do prompt e da resposta é outra história: pode ter dados pessoais, então fica fora por padrão, ou mascarado e com retenção curta.",
      ],
      keyIdea: "Logue campos, não frases: request_id, modelo, tokens, tempos e status em cada pedido.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "log-line",
            piece: "token-stream",
            tokens: logFields,
            query: 1,
            keys: [2, 3, 4, 5],
            color: "module-17",
          },
        ],
      },
      alt: `Os campos de uma linha de log estruturado: ${logFields.join(", ")}. O request_id está em destaque, ligado ao modelo, aos tokens e ao TTFT.`,
    },
    {
      id: "metrics",
      shortTitle: "Métricas",
      title: "O que olhar num serviço de LLM",
      tag: "mechanism",
      body: [
        "O básico de qualquer serviço vale: taxa de pedidos, taxa de erros e duração (o método RED). Num serviço de LLM, a duração se divide em [[TTFT|time-to-first-token]] e tempo entre tokens, porque cada uma tem causa diferente: TTFT alto costuma ser fila ou prompt longo; tempo entre tokens alto, lote cheio demais.",
        "Somam-se as métricas de saturação do motor, que o vLLM expõe no formato do Prometheus: pedidos em andamento e na fila, uso do KV cache e preempções. E as de negócio: tokens por pedido e custo por hora, que mostram um prompt que dobrou de tamanho num deploy antes da fatura chegar.",
      ],
      keyIdea: "Para LLM, separe TTFT de tempo entre tokens e olhe fila, KV cache e tokens por pedido.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "metrics-panel",
            piece: "metrics-panel",
            metrics: [
              { id: "rate", label: "pedidos/s", value: "taxa" },
              { id: "errors", label: "erros 5xx e 429", value: "erros", color: "danger" },
              { id: "ttft", label: "ttft p95", value: "fila", color: "module-17" },
              { id: "itl", label: "tempo entre tokens", value: "lote" },
              { id: "kv", label: "uso do kv cache", value: "saturação" },
              { id: "tokens", label: "tokens por pedido", value: "custo" },
            ],
            highlight: "ttft",
          },
        ],
      },
      alt: "Painel de métricas de um serviço de LLM: pedidos por segundo, erros 5xx e 429, TTFT p95 (ligado à fila), tempo entre tokens (ligado ao lote), uso do KV cache (saturação) e tokens por pedido (custo).",
    },
    {
      id: "slo",
      shortTitle: "SLO",
      title: "Quanto erro o mês pode ter",
      tag: "example",
      body: [
        `Um [[SLI|sli]] é uma razão: pedidos bons ÷ pedidos válidos. “Bom” pode ser status 200 com TTFT abaixo de 2 s. O [[SLO|slo]] é a meta desse SLI numa janela: ${fixed(SLO * 100)}% em ${DAYS} dias. Com ${integer(REQUESTS_PER_DAY)} pedidos por dia, são ${integer(monthRequests)} no mês, e o [[error budget|error-budget]] é o que sobra: ${integer(budgetRequests)} pedidos ruins, ou ${fixed(budgetMinutes)} minutos de queda total.`,
        `No exemplo, o consumo normal gasta metade do orçamento no mês, e um incidente no dia ${INCIDENT_DAY} queima ${percent(INCIDENT_SHARE)} de uma vez (${integer(incidentRequests)} pedidos). O mês fecha com ${budgetSeries[budgetSeries.length - 1].value}% sobrando. O orçamento vira regra de time: sobrou, dá para arriscar deploys; acabou, o foco vai para confiabilidade até a janela virar.`,
      ],
      keyIdea: "Error budget = (1 − SLO) × pedidos: é o erro permitido, e a régua para decidir entre lançar e estabilizar.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "budget",
            piece: "chart",
            kind: "line",
            series: budgetSeries,
            max: 100,
            highlight: checkpoints.indexOf(15),
            color: "module-17",
          },
        ],
      },
      alt: `Error budget restante ao longo de ${DAYS} dias, em porcentagem: ${budgetSeries.map((point) => `${point.label} ${point.value}%`).join(", ")}. A queda depois do dia ${INCIDENT_DAY} é o incidente.`,
    },
    {
      id: "burn",
      shortTitle: "Alertas",
      title: "Acordar alguém pela taxa de queima",
      tag: "tradeoff",
      body: [
        `Alertar em “erro acima de 1% por 5 minutos” acorda gente por picos que não ameaçam nada e deixa passar um erro baixo e constante que come o mês inteiro. A alternativa do workbook de SRE é a [[taxa de queima|burn-rate]]: erro observado ÷ (1 − SLO). Queimar 1× gasta o orçamento exatamente em ${DAYS} dias.`,
        `Um alerta que chama o plantão quando ${percent(PAGE_SHARE)} do orçamento some em ${PAGE_HOURS} hora corresponde a ${fixed(pageBurnRate)}×. Um incidente com ${percent(INCIDENT_ERROR_RATE)} de erro queima ${integer(incidentBurn)}× e esvazia o mês em ${integer(hoursToEmpty)} horas: chama na hora. Queimas lentas, como 2× por dias, viram ticket, não telefone tocando de madrugada.`,
      ],
      keyIdea: "Alerte pela velocidade com que o orçamento some: rápido chama o plantão, lento vira ticket.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "alerts",
            piece: "block-diagram",
            blocks: [
              { id: "metrics", kind: "sql-db", label: "métricas", col: 0, row: 0.5 },
              { id: "rule", kind: "eval", label: `queima > ${fixed(pageBurnRate)}×`, col: 1.5, row: 0.5 },
              { id: "pager", kind: "phone", label: "plantão agora", col: 3, row: 0 },
              { id: "ticket", kind: "documents", label: "ticket", col: 3, row: 1 },
            ],
            edges: [
              { from: "metrics", to: "rule", label: "erro ÷ (1 − slo)" },
              { from: "rule", to: "pager", label: `incidente: ${integer(incidentBurn)}×` },
              { from: "rule", to: "ticket", label: "queima lenta", variant: "alternative" },
            ],
            active: "rule",
          },
        ],
      },
      alt: `As métricas alimentam uma regra de taxa de queima, em destaque, que chama o plantão acima de ${fixed(pageBurnRate)}×, como no incidente de ${integer(incidentBurn)}×, e abre um ticket para queimas lentas.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Ver, medir e decidir",
      tag: "summary",
      body: [
        "Logs estruturados com request_id contam a história de cada pedido; métricas de taxa, erros, TTFT, tempo entre tokens, fila, KV cache e tokens por pedido mostram a saúde agora. Um SLO por SLI dá o error budget do mês, e alertas pela taxa de queima chamam gente só quando o orçamento corre perigo.",
        "As mesmas métricas que mostram saúde mostram dinheiro: tokens, horas de GPU e réplicas ociosas. A próxima aula transforma isso em gestão de custo, com orçamentos, alertas e a escolha entre instâncias sob demanda, reservadas e spot.",
      ],
      keyIdea: "Monitorar = logs estruturados + métricas de LLM + SLO com error budget + alertas por queima.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "checklist",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "logs", label: "logs json com request_id" },
              { id: "red", label: "taxa, erros, duração" },
              { id: "llm", label: "ttft, fila, kv cache", color: "module-17" },
              { id: "slo", label: "slo e error budget" },
              { id: "burn", label: "alerta por queima", color: "module-17" },
            ],
          },
        ],
      },
      alt: "Checklist em chips: logs em JSON com request_id; taxa, erros e duração; TTFT, fila e KV cache; SLO e error budget; alerta por taxa de queima.",
    },
  ],
  realWorldExample:
    "O livro de SRE do Google define SLI, SLO e error budget, e o workbook que o acompanha recomenda alertas por taxa de queima em mais de uma janela, como 2% do orçamento em 1 hora e 5% em 6 horas. O vLLM expõe métricas no formato do Prometheus, como pedidos em andamento, pedidos na fila, uso do KV cache e tempo até o primeiro token.",
  code: {
    language: "json",
    source: `{
  "ts": "2026-11-19T14:03:22.418Z",
  "level": "info",
  "request_id": "req_8f2c1a",
  "model": "llama-3.1-8b-instruct",
  "prompt_version": "suporte-v14",
  "tokens_in": 1840,
  "tokens_out": 212,
  "ttft_ms": 380,
  "latency_ms": 5710,
  "status": 200
}`,
    caption: "Uma linha de log estruturado por pedido: dá para filtrar por modelo, somar tokens e achar os pedidos lentos sem ler texto livre. O prompt e a resposta ficam fora.",
  },
  tradeOffs: {
    pros: [
      "Logs estruturados permitem consultas e somas em vez de leitura linha a linha",
      "SLO com error budget dá uma régua comum para produto e engenharia",
      "Alertas por queima chamam gente só quando o mês corre risco",
    ],
    cons: [
      "Volume de logs custa armazenamento e pede retenção e amostragem",
      "Escolher o SLI certo para LLM exige decidir o que é uma resposta boa",
      "Logar prompts e respostas cria um problema de privacidade",
    ],
    alternatives: [
      "Plataformas gerenciadas de monitoração da nuvem, em vez de operar Prometheus",
      "Ferramentas de observabilidade de LLM com rastros por pedido, vistas no módulo 16",
    ],
  },
  knowledgeCheck: [
    {
      id: "budget-math",
      prompt: "O SLO é 99,5% dos pedidos bons em 30 dias, com 1 milhão de pedidos no mês. Qual é o error budget?",
      options: ["500 pedidos", "5.000 pedidos", "50.000 pedidos", "995.000 pedidos"],
      correct: 1,
      explanation: "Error budget = (1 − 0,995) × 1.000.000 = 5.000 pedidos ruins no mês.",
      lesson: "17-12",
    },
    {
      id: "burn-alert",
      prompt: "Com SLO de 99,9%, o erro sobe para 1% e fica lá. Qual é a taxa de queima e o que fazer?",
      options: [
        "1×: nada, está dentro do orçamento",
        "10×: o mês inteiro some em 3 dias; abrir um alerta de alta prioridade",
        "0,1×: virar ticket",
        "100×: desligar o serviço",
      ],
      correct: 1,
      explanation: "Queima = 0,01 ÷ 0,001 = 10×. O orçamento de 30 dias acaba em 3 dias, rápido o bastante para exigir ação logo, mesmo sem ser uma queda total.",
      lesson: "17-12",
    },
  ],
  related: ["10-04", "17-13", "16-13"],
  references: [
    { title: "Google SRE Book: Service Level Objectives", url: "https://sre.google/sre-book/service-level-objectives/", kind: "article" },
    { title: "Google SRE Workbook: Alerting on SLOs", url: "https://sre.google/workbook/alerting-on-slos/", kind: "article" },
    { title: "Prometheus: Overview", url: "https://prometheus.io/docs/introduction/overview/", kind: "docs" },
  ],
};

export default lesson;
