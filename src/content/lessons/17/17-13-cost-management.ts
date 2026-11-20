import type { BlockDiagramSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Gestão de custo com as contas no arquivo. O custo por token e as alavancas de prompt estão na aula 10-14;
// aqui, a conta é a da infraestrutura no mês. Todos os preços e descontos são DE EXEMPLO (a AWS anuncia spot
// com até 90% de desconto e aviso de 2 minutos antes da interrupção; consulte a tabela do seu provedor).
// A demanda tem uma base 24 × 7 e um pico em dias úteis; cada estratégia de compra é somada hora a hora.

const money = (value: number) => `US$ ${Math.round(value).toLocaleString("pt-BR")}`;
const fixed = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const percent = (value: number) => `${Math.round(value * 100)}%`;

// Passo 2: preços de exemplo por GPU-hora.
const ON_DEMAND = 4;
const RESERVED_DISCOUNT = 0.4;
const SPOT_DISCOUNT = 0.65;
const reserved = ON_DEMAND * (1 - RESERVED_DISCOUNT);
const spot = ON_DEMAND * (1 - SPOT_DISCOUNT);
const SPOT_FALLBACK = 0.1;

// Passo 3: a forma da demanda num dia útil, de 2 em 2 horas.
const BASE_GPUS = 4;
const PEAK_EXTRA_GPUS = 4;
const PEAK_HOURS = 10;
const WEEKDAYS = 22;
const HOURS_PER_MONTH = 730;
const weekday = ["0h", "2h", "4h", "6h", "8h", "10h", "12h", "14h", "16h", "18h", "20h", "22h"].map((hour, index) => ({
  label: hour,
  value: index >= 4 && index < 4 + PEAK_HOURS / 2 ? BASE_GPUS + PEAK_EXTRA_GPUS : BASE_GPUS,
}));
const baseHours = BASE_GPUS * HOURS_PER_MONTH;
const peakHours = PEAK_EXTRA_GPUS * PEAK_HOURS * WEEKDAYS;
const totalHours = baseHours + peakHours;
const peakUtilizationOfReserved = totalHours / ((BASE_GPUS + PEAK_EXTRA_GPUS) * HOURS_PER_MONTH);

// Passo 4: quatro estratégias de compra.
const spotEffective = (1 - SPOT_FALLBACK) * spot + SPOT_FALLBACK * ON_DEMAND;
const strategies = [
  { label: "tudo sob demanda", value: totalHours * ON_DEMAND },
  { label: "reserva no pico", value: (BASE_GPUS + PEAK_EXTRA_GPUS) * HOURS_PER_MONTH * reserved },
  { label: "reserva base + sob demanda", value: baseHours * reserved + peakHours * ON_DEMAND },
  { label: "reserva base + spot", value: baseHours * reserved + peakHours * spotEffective },
];
const cheapest = strategies.reduce((best, strategy) => (strategy.value < best.value ? strategy : best));
const cheapestIndex = strategies.indexOf(cheapest);
const savingVsOnDemand = 1 - cheapest.value / strategies[0].value;

// Passo 5: alerta de orçamento por previsão. Um bug no dia 1 dobra o gasto diário.
const BUDGET = 10_000;
const DAYS = 30;
const expectedDaily = cheapest.value / DAYS;
const buggyDaily = expectedDaily * 2;
const CHECK_DAY = 7;
const spentByCheck = buggyDaily * CHECK_DAY;
const forecast = (spentByCheck / CHECK_DAY) * DAYS;
const ACTUAL_ALERT = 0.8;
const actualAlertDay = Math.ceil((BUDGET * ACTUAL_ALERT) / buggyDaily);

// Planejamento: crescimento de exemplo de 10% ao mês sobre a base.
const GROWTH = 0.1;
const MONTHS = 12;
const baseInAYear = BASE_GPUS * (1 + GROWTH) ** MONTHS;

const sources = (active: string): BlockDiagramSpec => ({
  id: "sources",
  piece: "block-diagram",
  blocks: [
    { id: "api", kind: "cloud", label: "tokens de api", col: 0, row: 0 },
    { id: "gpu", kind: "server", label: "horas de gpu", col: 0, row: 1 },
    { id: "storage", kind: "documents", label: "pesos e logs", col: 1, row: 1 },
    { id: "tags", kind: "kv-cache", label: "tags por time", col: 2, row: 0.5 },
    { id: "bill", kind: "eval", label: "custo por feature", col: 3, row: 0.5 },
  ],
  edges: [
    { from: "api", to: "tags" },
    { from: "gpu", to: "tags" },
    { from: "storage", to: "tags" },
    { from: "tags", to: "bill", label: "fatura detalhada" },
  ],
  active,
});

const lesson: LessonContent = {
  id: "17-13",
  subtitle: "Controlar a conta da infraestrutura de IA no mês: de onde vem o gasto, como comprar GPU sob demanda, reservada ou spot e como saber do estouro antes da fatura.",
  objectives: [
    "Separar a conta por fonte e atribuí-la a times e features",
    "Comparar instâncias sob demanda, reservadas e spot para uma demanda com base e pico",
    "Configurar alertas de orçamento por previsão, não só pelo gasto real",
    "Planejar capacidade com crescimento antes de assumir compromissos longos",
  ],
  steps: [
    {
      id: "sources",
      shortTitle: "De onde vem",
      title: "A conta de luz sem medidor por cômodo",
      tag: "context",
      body: [
        "Uma conta de luz alta não diz se foi o chuveiro ou o ar-condicionado. Sem um medidor por cômodo, ninguém sabe o que desligar. Na infraestrutura de IA, a conta vem de tokens de API, horas de GPU, armazenamento de pesos e logs, e rede. Somadas num número só, elas não dizem qual feature ficou cara.",
        "O medidor por cômodo são as [[tags de alocação de custo|cost-allocation-tag]]: cada recurso e cada chave de API leva o time, a feature e o ambiente. A fatura detalhada, agrupada por tag, mostra o custo por feature, e esse número, dividido por conversas ou usuários, diz se a feature se paga. O custo por token de cada pedido está na aula 10-14; aqui a conta é a do mês inteiro.",
      ],
      keyIdea: "Sem tags por time e feature, a conta é um número só e ninguém sabe o que otimizar.",
      scene: { kind: "pieces", layout: "single", pieces: [sources("tags")] },
      alt: "Tokens de API, horas de GPU e armazenamento de pesos e logs passam por tags por time, em destaque, que geram a fatura detalhada com o custo por feature.",
    },
    {
      id: "pricing",
      shortTitle: "Como comprar",
      title: "Três jeitos de pagar pela mesma GPU",
      tag: "mechanism",
      body: [
        `A [[instância sob demanda|on-demand-instance]] cobra por hora, sem compromisso: ${money(ON_DEMAND)} por GPU-hora no exemplo. A [[instância reservada|reserved-instance]] (ou plano de compromisso) troca um contrato de 1 ou 3 anos por desconto: com ${percent(RESERVED_DISCOUNT)}, ${fixed(reserved, 2)} dólares por hora, paga usando ou não.`,
        `A [[instância spot|spot-instance]] usa a capacidade ociosa do provedor com desconto grande (${percent(SPOT_DISCOUNT)} no exemplo, ${fixed(spot, 2)} dólares por hora), mas pode ser retomada: na AWS, com aviso de 2 minutos. Para um servidor de modelo, isso quer dizer drenar os pedidos e sair; serve para réplicas extras e para jobs em lote que podem recomeçar, nunca para a única réplica.`,
      ],
      keyIdea: "Sob demanda é flexível, reservada é barata se usada sempre, spot é baratíssima mas pode sumir.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "prices",
            piece: "metrics-panel",
            metrics: [
              { id: "on-demand", label: "sob demanda", value: `US$ ${fixed(ON_DEMAND, 2)}/h` },
              { id: "reserved", label: `reservada (−${percent(RESERVED_DISCOUNT)})`, value: `US$ ${fixed(reserved, 2)}/h`, color: "success" },
              { id: "spot", label: `spot (−${percent(SPOT_DISCOUNT)})`, value: `US$ ${fixed(spot, 2)}/h`, color: "module-17" },
              { id: "notice", label: "aviso antes de retomar (aws)", value: "2 min", color: "danger" },
            ],
            highlight: "spot",
          },
        ],
      },
      alt: `Preços de exemplo por GPU-hora: sob demanda US$ ${fixed(ON_DEMAND, 2)}, reservada US$ ${fixed(reserved, 2)} e spot US$ ${fixed(spot, 2)}, que pode ser retomada com 2 minutos de aviso na AWS.`,
    },
    {
      id: "shape",
      shortTitle: "Base e pico",
      title: "A demanda tem um piso e um morro",
      tag: "mechanism",
      body: [
        `Num dia útil de exemplo, o serviço precisa de ${BASE_GPUS} GPUs o tempo todo e mais ${PEAK_EXTRA_GPUS} durante ${PEAK_HOURS} horas de horário comercial, em ${WEEKDAYS} dias úteis. No mês, são ${integer(baseHours)} GPU-horas de base e ${integer(peakHours)} de pico.`,
        `O piso é previsível e roda o mês inteiro: é onde a reserva rende. O morro dura poucas horas: reservar GPUs para ele deixaria as ${PEAK_EXTRA_GPUS} extras paradas a maior parte do tempo, e as ${BASE_GPUS + PEAK_EXTRA_GPUS} GPUs reservadas ficariam só ${percent(peakUtilizationOfReserved)} usadas. A regra: reserve o piso, compre o morro por hora.`,
      ],
      keyIdea: "Reserve a base que roda o mês inteiro; o pico se paga melhor por hora ou em spot.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "weekday",
            piece: "chart",
            kind: "line",
            series: weekday,
            max: BASE_GPUS + PEAK_EXTRA_GPUS,
            highlight: 6,
            color: "module-17",
          },
        ],
      },
      alt: `GPUs necessárias num dia útil, de 2 em 2 horas: ${weekday.map((point) => `${point.label} ${point.value}`).join(", ")}. A base é de ${BASE_GPUS} GPUs e o pico chega a ${BASE_GPUS + PEAK_EXTRA_GPUS}.`,
    },
    {
      id: "strategies",
      shortTitle: "Estratégias",
      title: "Quatro jeitos de comprar o mesmo mês",
      tag: "example",
      body: [
        `Para as mesmas ${integer(totalHours)} GPU-horas: ${strategies.map((strategy) => `${strategy.label}, ${money(strategy.value)}`).join("; ")}. Reservar para o pico sai quase tão caro quanto tudo sob demanda, porque paga as GPUs extras paradas à noite e nos fins de semana.`,
        `A mais barata é ${cheapest.label}: ${percent(savingVsOnDemand)} a menos que tudo sob demanda. A conta já inclui ${percent(SPOT_FALLBACK)} das horas de pico caindo em sob demanda quando o spot some (hipótese do exemplo), o que dá ${fixed(spotEffective, 2)} dólares por hora efetivos no pico. Sem esse plano B, uma retomada no meio da tarde vira fila e erro para os usuários.`,
      ],
      keyIdea: "Base reservada + pico em spot com fallback sob demanda costuma ser a combinação mais barata.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "strategies",
            piece: "chart",
            kind: "bar",
            series: strategies.map((strategy) => ({ label: strategy.label, value: Number((strategy.value / 1000).toFixed(1)) })),
            highlight: cheapestIndex,
            color: "module-17",
          },
        ],
      },
      alt: `Custo mensal em milhares de dólares, com preços de exemplo: ${strategies.map((strategy) => `${strategy.label} ${money(strategy.value)}`).join(", ")}. A mais barata, em destaque, é ${cheapest.label}.`,
    },
    {
      id: "alerts",
      shortTitle: "Orçamento",
      title: "Saber do estouro antes da fatura",
      tag: "tradeoff",
      body: [
        `Com orçamento de ${money(BUDGET)} e gasto esperado de ${money(expectedDaily)} por dia, um bug no dia 1 dobra os tokens por pedido: ${money(buggyDaily)} por dia. Um [[alerta de orçamento|budget-alert]] pelo gasto real de ${percent(ACTUAL_ALERT)} só dispara no dia ${actualAlertDay}. Um alerta por previsão, no dia ${CHECK_DAY}, já projeta ${money(forecast)} para o mês e avisa ${actualAlertDay - CHECK_DAY} dias antes.`,
        `Alertas não desligam nada sozinhos: alguém precisa agir. Por isso times combinam alertas de previsão por tag com limites duros onde dá, como teto de gasto por chave de API no gateway. E o [[planejamento de capacidade|capacity-planning]] olha para a frente: com ${percent(GROWTH)} de crescimento ao mês (exemplo), a base de ${BASE_GPUS} GPUs vira ${fixed(baseInAYear)} em ${MONTHS} meses, e uma reserva de 3 anos assinada hoje cobre só o piso de hoje.`,
      ],
      keyIdea: "Alerte pela previsão, por tag, e ponha tetos duros onde puder: o gasto real avisa tarde.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "budget",
            piece: "metrics-panel",
            metrics: [
              { id: "budget", label: "orçamento do mês", value: money(BUDGET) },
              { id: "daily", label: "gasto por dia com o bug", value: money(buggyDaily), color: "danger" },
              { id: "forecast", label: `previsão no dia ${CHECK_DAY}`, value: money(forecast), color: "module-17" },
              { id: "actual", label: `alerta real de ${percent(ACTUAL_ALERT)}`, value: `dia ${actualAlertDay}` },
            ],
            highlight: "forecast",
          },
          {
            id: "alert-flow",
            piece: "block-diagram",
            blocks: [
              { id: "bill", kind: "eval", label: "fatura por tag", col: 0, row: 0 },
              { id: "forecast", kind: "server", label: "previsão", col: 1, row: 0 },
              { id: "phone", kind: "phone", label: "dono da feature", col: 2, row: 0 },
              { id: "gateway", kind: "guardrail", label: "teto por chave", col: 3, row: 0 },
            ],
            edges: [
              { from: "bill", to: "forecast" },
              { from: "forecast", to: "phone", label: "vai estourar" },
              { from: "phone", to: "gateway", label: "ação" },
            ],
            active: "forecast",
          },
        ],
      },
      alt: `Orçamento de ${money(BUDGET)}; com o bug, o gasto vai a ${money(buggyDaily)} por dia. A previsão no dia ${CHECK_DAY} projeta ${money(forecast)} e avisa o dono da feature, que pode ajustar o teto por chave no gateway; o alerta pelo gasto real só viria no dia ${actualAlertDay}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Medir, comprar bem e vigiar",
      tag: "summary",
      body: [
        "Gestão de custo começa por tags que dividem a conta por time e feature. Depois, comprar pela forma da demanda: reservar a base, pagar o pico por hora ou em spot com fallback. Por fim, vigiar: alertas por previsão, tetos por chave e planejamento de capacidade antes de compromissos longos.",
        "Custo, qualidade e estabilidade mudam a cada deploy: um prompt maior, um modelo novo, uma imagem quebrada. A última aula do módulo junta tudo num pipeline de CI/CD que testa, avalia e libera cada mudança aos poucos.",
      ],
      keyIdea: "Custo sob controle = alocação por tag + compra pela forma da demanda + alertas por previsão.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "finops",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "tags", label: "tags por time e feature" },
              { id: "unit", label: "custo por conversa" },
              { id: "reserve", label: "reservar a base", color: "module-17" },
              { id: "spot", label: "pico em spot com fallback" },
              { id: "forecast", label: "alerta por previsão", color: "module-17" },
              { id: "plan", label: "planejar o crescimento" },
            ],
          },
        ],
      },
      alt: "Checklist em chips: tags por time e feature, custo por conversa, reservar a base, pico em spot com fallback, alerta por previsão e planejar o crescimento.",
    },
  ],
  realWorldExample:
    "A AWS anuncia instâncias spot com até 90% de desconto sobre o preço sob demanda e avisa 2 minutos antes de retomá-las; o AWS Budgets dispara alertas tanto pelo gasto real quanto pelo previsto, filtrados por tags de alocação de custo. A FinOps Foundation organiza essas práticas (alocação, otimização de compra e previsão) como a disciplina de FinOps.",
  tradeOffs: {
    pros: [
      "Tags tornam visível o custo de cada feature e de cada time",
      "Reservas e spot cortam a conta sem mudar uma linha do modelo",
      "Alertas por previsão avisam dias antes da fatura",
    ],
    cons: [
      "Reservas longas apostam numa demanda que pode mudar ou crescer",
      "Spot exige drenagem e fallback, senão a retomada vira erro para o usuário",
      "Tags só funcionam se todo recurso e toda chave forem marcados",
    ],
    alternatives: [
      "APIs por token, que transformam GPU ociosa em problema do provedor",
      "Endpoints serverless com GPU, para tráfego esporádico que tolera cold start",
    ],
  },
  knowledgeCheck: [
    {
      id: "reserve-what",
      prompt: "A demanda é de 6 GPUs o tempo todo e 10 GPUs por 4 horas por dia. O que reservar?",
      options: [
        "10 GPUs, para cobrir o pico",
        "6 GPUs, a base; as 4 do pico por hora ou em spot",
        "Nenhuma: tudo sob demanda é sempre mais barato",
        "4 GPUs, as do pico",
      ],
      correct: 1,
      explanation: "A reserva rende quando a GPU roda o mês inteiro: a base de 6. As 4 extras rodam 4 horas por dia; reservadas, ficariam paradas 20 horas por dia.",
      lesson: "17-13",
    },
    {
      id: "forecast-alert",
      prompt: "O orçamento é US$ 9.000 no mês. No dia 5, o gasto acumulado é US$ 3.000. O que um alerta por previsão diz?",
      options: [
        "Nada: ainda faltam US$ 6.000",
        "Que o mês vai fechar em cerca de US$ 18.000, o dobro do orçamento, se o ritmo continuar",
        "Que o mês vai fechar em US$ 3.000",
        "Que o gasto vai cair sozinho",
      ],
      correct: 1,
      explanation: "Ritmo de US$ 600 por dia × 30 dias = US$ 18.000. O alerta pelo gasto real de 80% (US$ 7.200) só dispararia no dia 12.",
      lesson: "17-13",
    },
  ],
  related: ["10-14", "17-12", "17-14"],
  references: [
    { title: "Amazon EC2 Spot Instances", url: "https://aws.amazon.com/ec2/spot/", kind: "docs" },
    {
      title: "AWS Budgets: Managing your costs",
      url: "https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html",
      kind: "docs",
    },
    { title: "AWS Well-Architected: pilar de otimização de custo", url: "https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/welcome.html", kind: "docs" },
  ],
};

export default lesson;
