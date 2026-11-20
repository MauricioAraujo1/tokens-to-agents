import type { LessonContent } from "../../../types/content";

// Dívida técnica com contas no arquivo. Os números de principal e juros são os do exemplo de Martin Fowler
// (bliki TechnicalDebt): uma feature leva 4 dias com o código limpo e 6 com o cruft, e limpar custa 5 dias.
// O custo de cada estratégia para k features futuras é somado aqui. A cópia do padrão ruim pelo agente e o
// registro de dívidas são de brinquedo: o principal cresce por cópia, e os juros mensais são dias extras
// por mudança vezes mudanças por mês.

const days = (value: number) => `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias`;
const fixed = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const CLEAN = 4;
const CRUFTY = 6;
const PRINCIPAL = 5;
const interest = CRUFTY - CLEAN;
const paybackFeatures = Math.ceil(PRINCIPAL / interest);

const FUTURE = 4;
const PAY_AFTER = 2;
const neverPay = (k: number) => CRUFTY * k;
const payNow = (k: number) => PRINCIPAL + CLEAN * k;
const payLater = (k: number, after: number) => CRUFTY * after + PRINCIPAL + CLEAN * (k - after);
const strategies = [
  { label: "nunca pagar", value: neverPay(FUTURE) },
  { label: "pagar agora", value: payNow(FUTURE) },
  { label: `pagar depois de ${PAY_AFTER}`, value: payLater(FUTURE, PAY_AFTER) },
];
const cheapest = strategies.reduce((best, item) => (item.value < best.value ? item : best));
const featureCounts = [1, 2, 3, 4, 5, 6];
const cumulativeInterest = featureCounts.map((k) => ({ label: `${k} feature${k > 1 ? "s" : ""}`, value: interest * k }));

// O agente copia o padrão que encontra: cada feature nova replica o trecho ruim uma vez.
const COPY_COST = 0.5;
const copies = ["checkout", "assinatura", "reembolso", "relatório"];
const principalWithCopies = PRINCIPAL + COPY_COST * copies.length;

type Intent = "deliberada" | "inadvertida";
type Care = "imprudente" | "prudente";

interface Debt {
  label: string;
  intent: Intent;
  care: Care;
  extraDaysPerChange: number;
  changesPerMonth: number;
  principal: number;
}

const register: Debt[] = [
  { label: "módulo de preços sem testes", intent: "deliberada", care: "imprudente", extraDaysPerChange: 1, changesPerMonth: 6, principal: 8 },
  { label: "atalho para a demo do cliente", intent: "deliberada", care: "prudente", extraDaysPerChange: 0.5, changesPerMonth: 1, principal: 3 },
  { label: "formatador de datas copiado", intent: "inadvertida", care: "imprudente", extraDaysPerChange: 0.5, changesPerMonth: 4, principal: principalWithCopies },
  { label: "modelo de dados da v1", intent: "inadvertida", care: "prudente", extraDaysPerChange: 1, changesPerMonth: 2, principal: 15 },
  { label: "script de deploy manual", intent: "deliberada", care: "prudente", extraDaysPerChange: 0.25, changesPerMonth: 8, principal: 2 },
  { label: "relatório antigo, quase sem uso", intent: "inadvertida", care: "imprudente", extraDaysPerChange: 2, changesPerMonth: 0.1, principal: 6 },
];
const monthlyInterest = (debt: Debt) => debt.extraDaysPerChange * debt.changesPerMonth;
const paybackMonths = (debt: Debt) => debt.principal / monthlyInterest(debt);
const prioritized = [...register].sort((a, b) => paybackMonths(a) - paybackMonths(b));
const first = prioritized[0];
const last = prioritized[prioritized.length - 1];

const intents: Intent[] = ["deliberada", "inadvertida"];
const cares: Care[] = ["imprudente", "prudente"];
const quadrant = intents.map((intent) => cares.map((care) => register.filter((debt) => debt.intent === intent && debt.care === care).length));

const graphNodes = [
  { id: "origin", label: "formatador original", x: 0.12, y: 0.5 },
  ...copies.map((label, index) => ({ id: `copy-${index}`, label, x: 0.62 + (index % 2) * 0.28, y: 0.15 + Math.floor(index / 2) * 0.7 })),
  { id: "agent", label: "agente", x: 0.4, y: 0.5 },
];
const graphEdges = [
  { from: "origin", to: "agent", label: "lê como padrão" },
  ...copies.map((_, index) => ({ from: "agent", to: `copy-${index}`, label: "copia" })),
];

const lesson: LessonContent = {
  id: "15-12",
  subtitle: "O que é dívida técnica, como os juros se acumulam, por que agentes copiam a dívida que encontram, e como decidir o que pagar primeiro.",
  objectives: [
    "Separar o principal e os juros de uma dívida técnica",
    "Calcular quando pagar a dívida se paga",
    "Explicar por que um agente espalha os padrões ruins do código existente",
    "Priorizar um registro de dívidas pelos juros, não pelo incômodo",
  ],
  steps: [
    {
      id: "debt",
      shortTitle: "A dívida",
      title: "Todo atalho cobra juros",
      tag: "context",
      body: [
        "Você deixa a louça na pia porque está com pressa. Amanhã, para cozinhar, precisa lavar uma panela antes de começar; depois de amanhã, duas. A louça acumulada não impede o jantar, mas cada jantar fica mais lento. Lavar tudo de uma vez custa uma tarde.",
        "[[Dívida técnica|technical-debt]] é a metáfora de Ward Cunningham, de 1992, para isso no código: atalhos e estruturas confusas que não quebram nada hoje, mas deixam toda mudança futura mais cara. Martin Fowler chama essa sujeira de cruft. O tempo extra em cada mudança são os juros; o trabalho de limpar é o principal.",
      ],
      keyIdea: "Dívida técnica não é código quebrado: é código que encarece cada mudança seguinte.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "feature", kind: "laptop", label: "feature nova", col: 0, row: 0.5 },
              { id: "module", kind: "app", label: "módulo confuso", col: 1, row: 0.5 },
              { id: "ship", kind: "server", label: "entrega", col: 3, row: 0.5 },
              { id: "interest", kind: "no-result", label: "juros", col: 2, row: 1 },
            ],
            edges: [
              { from: "feature", to: "module", label: `${CLEAN} dias se limpo` },
              { from: "module", to: "ship", label: `${CRUFTY} dias` },
              { from: "module", to: "interest", label: `+${interest} dias`, variant: "alternative" },
            ],
            active: "module",
          },
        ],
      },
      alt: `Uma feature nova passa por um módulo confuso, em destaque, antes da entrega: leva ${CRUFTY} dias em vez de ${CLEAN}. A diferença de ${interest} dias sai por um caminho tracejado como juros.`,
    },
    {
      id: "principal",
      shortTitle: "Principal",
      title: "Principal e juros, com números",
      tag: "mechanism",
      body: [
        `O exemplo de Fowler: uma feature leva ${CLEAN} dias com a estrutura limpa e ${CRUFTY} com o cruft. Os juros são ${interest} dias por feature. Limpar a estrutura, o principal, custa ${PRINCIPAL} dias. Para uma feature só, não compensa: ${PRINCIPAL} + ${CLEAN} = ${PRINCIPAL + CLEAN} dias contra ${CRUFTY}.`,
        `A conta muda com o número de features: o principal se paga a partir de ${PRINCIPAL} / ${interest} → ${paybackFeatures} features naquele trecho do código. Por isso a pergunta certa não é “o código está feio?”, mas “quantas vezes vamos mexer nele?”. Fowler resume: áreas de muita atividade pedem tolerância zero ao cruft, porque os juros são altos demais.`,
      ],
      keyIdea: "Pagar a dívida vale quando principal < juros por mudança × mudanças futuras.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "numbers",
            piece: "metrics-panel",
            metrics: [
              { id: "clean", label: "feature, código limpo", value: days(CLEAN) },
              { id: "crufty", label: "feature, com cruft", value: days(CRUFTY) },
              { id: "interest", label: "juros por feature", value: days(interest), color: "danger" },
              { id: "principal", label: "principal", value: days(PRINCIPAL) },
              { id: "payback", label: "se paga a partir de", value: `${paybackFeatures} features`, color: "success" },
            ],
            highlight: "payback",
          },
        ],
      },
      alt: `Os números de Fowler: ${days(CLEAN)} com código limpo, ${days(CRUFTY)} com cruft, ${days(interest)} de juros por feature, ${days(PRINCIPAL)} de principal. A limpeza se paga a partir de ${paybackFeatures} features.`,
    },
    {
      id: "when",
      shortTitle: "Quando",
      title: "Os juros passam o principal",
      tag: "example",
      body: [
        `As barras mostram os juros acumulados conforme as features chegam: ${interest} dias por feature. A linha é o principal, ${days(PRINCIPAL)}. A partir de ${paybackFeatures} features, já se pagou mais em juros do que custaria limpar.`,
        `Para as próximas ${FUTURE} features: nunca pagar custa ${days(neverPay(FUTURE))}, pagar agora custa ${days(payNow(FUTURE))}, e pagar depois de ${PAY_AFTER} custa ${days(payLater(FUTURE, PAY_AFTER))}, pior que as duas. A mais barata é “${cheapest.label}”. Adiar a decisão é a pior opção quando já se sabe que o trecho vai mudar muito: você paga os juros e o principal.`,
      ],
      keyIdea: "Se o trecho vai mudar muito, pague cedo; se não vai mudar, talvez nunca pague.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "strategies",
            piece: "metrics-panel",
            metrics: strategies.map((item, index) => ({
              id: `strategy-${index}`,
              label: item.label,
              value: days(item.value),
              color: item === cheapest ? ("success" as const) : undefined,
            })),
            highlight: `strategy-${strategies.indexOf(cheapest)}`,
          },
          {
            id: "interest",
            piece: "chart",
            kind: "bar",
            series: cumulativeInterest,
            cutoff: { mode: "threshold", value: PRINCIPAL, label: `principal: ${days(PRINCIPAL)}` },
            color: "danger",
          },
        ],
      },
      alt: `Juros acumulados por número de features: ${cumulativeInterest.map((item) => `${item.label}, ${days(item.value)}`).join("; ")}, com o principal de ${days(PRINCIPAL)} como linha de corte. Para ${FUTURE} features: ${strategies.map((item) => `${item.label}, ${days(item.value)}`).join("; ")}.`,
    },
    {
      id: "copies",
      shortTitle: "Cópias",
      title: "O agente copia a dívida que encontra",
      tag: "mechanism",
      body: [
        "Um aprendiz de cozinha imita o que vê o chef fazer, inclusive a mania de deixar a louça. Um agente faz o mesmo com o código: a instrução mais comum (e mais sensata) é seguir os padrões do projeto, e ele trata o que existe como padrão, sem saber o que é boa prática e o que é atalho antigo.",
        `Na cena, um formatador de datas duplicado e cheio de casos especiais vira modelo: o agente o copia nas features de ${copies.join(", ")}. Cada cópia é um [[code smell|code-smell]] a mais, e o principal cresce de ${days(PRINCIPAL)} para ${days(principalWithCopies)}. Com agentes, dívida não só cobra juros: ela se reproduz na velocidade em que o agente escreve. Marcar no código ou no arquivo de contexto o que não deve ser imitado corta a cópia.`,
      ],
      keyIdea: "Para um agente, o código existente é o exemplo. Dívida não marcada vira padrão.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "copies",
            piece: "graph",
            nodes: graphNodes,
            edges: graphEdges,
            highlight: copies.map((_, index) => `copy-${index}`),
          },
        ],
      },
      alt: `O agente lê o formatador original como padrão e o copia em ${copies.length} features: ${copies.join(", ")}, em destaque. O principal cresce de ${days(PRINCIPAL)} para ${days(principalWithCopies)}.`,
    },
    {
      id: "register",
      shortTitle: "Registro",
      title: "Qual dívida pagar primeiro",
      tag: "tradeoff",
      body: [
        "Nem toda dívida é erro. Fowler separa dois eixos: deliberada ou inadvertida, prudente ou imprudente. “Vamos lançar agora e limpar depois”, sabendo o custo, é deliberada e prudente. “Não temos tempo para testes” é deliberada e imprudente. “Agora sabemos como deveria ter sido” é inadvertida e prudente: aparece mesmo em equipes boas. A matriz conta as dívidas do registro de brinquedo em cada quadrante.",
        `Para priorizar, use os juros: dias extras por mudança × mudanças por mês. O tempo para se pagar é o principal dividido pelos juros mensais. “${first.label}” se paga em ${fixed(paybackMonths(first))} mês, e vai primeiro; “${last.label}” levaria ${fixed(paybackMonths(last), 0)} meses, e talvez nunca deva ser paga. O incômodo não entra na conta; a frequência de mudança sim.`,
      ],
      keyIdea: "Priorize pela razão principal / juros mensais: pague primeiro o que se paga mais rápido.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "quadrant",
            piece: "matrix",
            rows: intents,
            cols: cares,
            values: quadrant,
            showValues: true,
            highlight: { row: 0, col: 1 },
            color: "module-15",
          },
        ],
      },
      alt: `Quadrante de Fowler com as ${register.length} dívidas do registro: ${intents.map((intent, row) => cares.map((care, col) => `${intent} e ${care}, ${quadrant[row][col]}`).join("; ")).join("; ")}. Pela razão entre principal e juros, “${first.label}” vai primeiro e “${last.label}” por último.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Refatorar com rede, em pedaços pequenos",
      tag: "summary",
      body: [
        "Pagar dívida é [[refatoração|refactoring]]: mudar a estrutura interna do código sem mudar o comportamento externo, em passos pequenos, com os testes verdes antes e depois de cada um. Agentes são bons nisso quando a rede de testes é boa: a mudança é mecânica, e o teste confere que nada mudou por fora.",
        "Este módulo foi da spec ao merge: especificar, planejar, desenhar, testar antes, revisar, integrar e manter. O próximo módulo trata do que acontece depois: avaliar, proteger e observar os sistemas de IA em produção.",
      ],
      keyIdea: "Dívida técnica se gerencia com um registro priorizado por juros e refatorações pequenas com testes verdes.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "register", kind: "documents", label: "registro", col: 0, row: 0.5 },
              { id: "agent", kind: "agent", label: "agente refatora", col: 1, row: 0.5 },
              { id: "tests", kind: "eval", label: "testes verdes", col: 2, row: 0.5 },
              { id: "module", kind: "app", label: "módulo limpo", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "register", to: "agent", label: "1ª da fila" },
              { from: "agent", to: "tests", label: "passo pequeno" },
              { from: "tests", to: "module", label: "mesmo comportamento" },
            ],
            active: "tests",
            done: ["register", "agent"],
          },
        ],
      },
      alt: `Do registro de dívidas sai a primeira da fila, “${first.label}”; o agente refatora em passos pequenos, os testes verdes, em destaque, conferem que o comportamento não mudou, e o módulo fica limpo.`,
    },
  ],
  realWorldExample:
    "Ward Cunningham cunhou a metáfora num relatório de experiência na OOPSLA de 1992, e Martin Fowler a popularizou com o exemplo de principal e juros e com o quadrante de dívida deliberada, inadvertida, prudente e imprudente. No livro “Refactoring”, Fowler descreve cada refatoração como uma sequência de passos pequenos que preservam o comportamento, o mesmo formato que funciona bem para pedir a um agente uma limpeza grande dividida em pull requests pequenos.",
  code: {
    language: "typescript",
    source: `interface Debt {
  label: string;
  extraDaysPerChange: number;
  changesPerMonth: number;
  principal: number;
}

const monthlyInterest = (debt: Debt) => debt.extraDaysPerChange * debt.changesPerMonth;

export const prioritize = (register: Debt[]) =>
  [...register]
    .map((debt) => ({ ...debt, paybackMonths: debt.principal / monthlyInterest(debt) }))
    .sort((a, b) => a.paybackMonths - b.paybackMonths);`,
    caption: "O registro de dívidas ordenado por meses até se pagar: principal dividido pelos juros mensais. A frequência de mudança de cada trecho, tirada do histórico do git, alimenta changesPerMonth.",
  },
  tradeOffs: {
    pros: [
      "Dívida deliberada e prudente compra prazo de lançamento de forma consciente",
      "Juros por mudança dão um critério objetivo para priorizar a limpeza",
      "Com testes bons, agentes fazem refatorações mecânicas grandes em pedaços pequenos",
    ],
    cons: [
      "Juros são difíceis de medir com precisão; a conta é uma estimativa",
      "Agentes espalham a dívida que encontram na velocidade em que escrevem",
      "Refatorar sem testes troca dívida por risco de regressão",
    ],
    alternatives: [
      "Strangler fig: substituir um módulo velho aos poucos, desviando o tráfego para o novo",
      "Regra do escoteiro: deixar cada trecho tocado um pouco melhor, sem projeto de limpeza à parte",
    ],
  },
  knowledgeCheck: [
    {
      id: "payback",
      prompt: "Limpar um módulo custa 6 dias. Cada mudança nele custa 1,5 dia a mais por causa da dívida, e ele muda 2 vezes por mês. Em quanto tempo a limpeza se paga?",
      options: ["1 mês", "2 meses", "4 meses", "6 meses"],
      correct: 1,
      explanation: "Juros mensais = 1,5 × 2 = 3 dias. Principal / juros = 6 / 3 = 2 meses.",
      lesson: "15-12",
    },
    {
      id: "agent-copies",
      prompt: "Um agente instruído a seguir os padrões do projeto copia um tratamento de erro ruim em cinco arquivos novos. Qual a melhor correção de processo?",
      options: [
        "Proibir o agente de ler código antigo",
        "Marcar o padrão ruim como não imitável no código ou no arquivo de contexto e registrar a dívida para pagar",
        "Desligar a instrução de seguir os padrões",
        "Corrigir os cinco arquivos e seguir igual",
      ],
      correct: 1,
      explanation: "Para o agente, o que existe é exemplo. Sem uma marca dizendo o que não seguir, a dívida se reproduz a cada tarefa. Corrigir as cópias sem marcar o original repete o problema.",
      lesson: "15-12",
    },
  ],
  related: ["15-11", "15-07", "16-01"],
  references: [
    { title: "Martin Fowler, Technical Debt", url: "https://martinfowler.com/bliki/TechnicalDebt.html", kind: "article" },
    { title: "Martin Fowler, Technical Debt Quadrant", url: "https://martinfowler.com/bliki/TechnicalDebtQuadrant.html", kind: "article" },
    { title: "Martin Fowler, Refactoring", url: "https://refactoring.com/", kind: "article" },
  ],
};

export default lesson;
