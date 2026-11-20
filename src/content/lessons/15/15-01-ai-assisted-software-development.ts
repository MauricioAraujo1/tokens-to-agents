import type { LessonContent } from "../../../types/content";

// Desenvolvimento assistido por IA com contas no arquivo: as horas de brinquedo de uma feature pequena,
// divididas por atividade, e a Lei de Amdahl aplicada a elas. Se só a parte "escrever código" fica mais
// rápida, o ganho total é limitado pelo resto. Os números dos estudos (Peng et al., 2023; METR, 2025) são
// os publicados nos resumos dos papers, citados nas referências.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const percent = (value: number) => `${(value * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const hours = (value: number) => `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`;

interface Activity {
  id: string;
  label: string;
  hours: number;
}

const activities: Activity[] = [
  { id: "understand", label: "entender o código", hours: 3 },
  { id: "write", label: "escrever código", hours: 2.5 },
  { id: "test", label: "testar", hours: 2 },
  { id: "review", label: "revisar", hours: 1.5 },
  { id: "integrate", label: "integrar", hours: 1 },
];
const total = activities.reduce((sum, activity) => sum + activity.hours, 0);
const hoursOf = (ids: string[]) =>
  activities.filter((activity) => ids.includes(activity.id)).reduce((sum, activity) => sum + activity.hours, 0);

/** Lei de Amdahl: a fração p do trabalho fica s vezes mais rápida; o resto continua igual. */
const amdahl = (p: number, s: number) => 1 / (1 - p + p / s);

const writeShare = hoursOf(["write"]) / total;
const speeds = [1, 2, 4, 10, 100];
const speedupSeries = speeds.map((s) => ({ label: `${s}×`, value: Number(amdahl(writeShare, s).toFixed(2)) }));
const ceiling = 1 / (1 - writeShare);
const AGENT_SPEED = 2;
const agentShare = hoursOf(["understand", "write", "test"]) / total;
const autocompleteGain = amdahl(writeShare, AGENT_SPEED);
const agentGain = amdahl(agentShare, AGENT_SPEED);

// Números dos resumos dos papers (arXiv 2302.06590 e 2507.09089).
const COPILOT_FASTER = 0.558;
const METR_DEVELOPERS = 16;
const METR_TASKS = 246;
const METR_FORECAST_FASTER = 0.24;
const METR_PERCEIVED_FASTER = 0.2;
const METR_MEASURED_SLOWER = 0.19;

const lesson: LessonContent = {
  id: "15-01",
  subtitle: "Do autocompletar ao agente que roda os testes: onde a IA entra no trabalho de quem programa e onde o ganho realmente aparece.",
  objectives: [
    "Distinguir autocompletar, chat e agente de código pelo quanto do ciclo cada um cobre",
    "Usar a Lei de Amdahl para estimar o ganho de acelerar só uma parte do trabalho",
    "Ler com cuidado os estudos de produtividade com IA",
    "Reconhecer a verificação como a parte que a IA não elimina",
  ],
  steps: [
    {
      id: "three-ways",
      shortTitle: "Três jeitos",
      title: "Três jeitos de ter ajuda da IA",
      tag: "context",
      body: [
        "Pense em três ajudantes numa cozinha. O primeiro termina a frase da receita que você está escrevendo. O segundo responde perguntas quando você chama. O terceiro recebe o pedido, abre a geladeira, cozinha, prova e só chama você para provar no fim. No código é igual: o autocompletar sugere a próxima linha, o chat responde e gera trechos, e o agente lê o repositório, edita arquivos e roda comandos.",
        "[[Desenvolvimento assistido por IA|ai-assisted-development]] é o nome para todo esse espectro. O que muda de um ponto ao outro é a autonomia: um [[agente de código|coding-agent]] é um [[agente|agent]] cujas ferramentas são o editor, o terminal e o git, e que fecha o ciclo sozinho rodando os testes e lendo o resultado.",
      ],
      keyIdea: "A pergunta útil não é “usa IA?”, mas “quanto do ciclo a IA fecha sozinha, e quem confere?”.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "helpers",
            piece: "block-diagram",
            blocks: [
              { id: "dev", kind: "user", label: "você", col: 0, row: 0.5 },
              { id: "ide", kind: "laptop", label: "editor", col: 1, row: 0 },
              { id: "llm", kind: "llm", label: "autocompletar", col: 2, row: 0 },
              { id: "agent", kind: "agent", label: "agente", col: 1, row: 1 },
              { id: "tests", kind: "eval", label: "testes", col: 2, row: 1 },
              { id: "repo", kind: "server", label: "repositório", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "dev", to: "ide", label: "digita" },
              { from: "ide", to: "llm", label: "próxima linha" },
              { from: "dev", to: "agent", label: "pedido" },
              { from: "agent", to: "tests", label: "roda" },
              { from: "tests", to: "repo", label: "verde" },
            ],
            active: "agent",
          },
        ],
      },
      alt: "Você digita no editor, e o autocompletar sugere a próxima linha. Em outro caminho, você faz um pedido ao agente, em destaque, que roda os testes e só leva ao repositório o que ficou verde.",
    },
    {
      id: "loop",
      shortTitle: "O loop",
      title: "O agente de código é um loop com testes",
      tag: "mechanism",
      body: [
        "O ajudante que prova a comida antes de servir erra menos: ele percebe o sal demais e corrige. O agente de código faz o mesmo com o terminal. Ele lê os arquivos, edita, roda os testes, lê a falha e tenta de novo, até os testes passarem ou o limite de tentativas acabar.",
        "É o [[loop do agente|agent-loop]] do módulo 12 com ferramentas de programação. A diferença para o chat é a observação: o chat devolve código que ninguém executou; o agente devolve código que passou por um comando real. O SWE-bench mede exatamente isso: 2.294 issues reais de 12 repositórios Python, e a solução só conta se os testes da issue passam.",
      ],
      keyIdea: "O que torna um agente de código confiável não é o modelo sozinho, é ter um teste para rodar dentro do loop.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "loop",
            piece: "agent-loop",
            phases: [
              { id: "read", label: "ler o código" },
              { id: "edit", label: "editar" },
              { id: "run", label: "rodar testes" },
              { id: "observe", label: "ler a falha" },
            ],
            active: "run",
            iteration: 2,
            maxIterations: 5,
            tool: "npm test",
          },
        ],
      },
      alt: "Loop do agente de código com quatro fases: ler o código, editar, rodar testes, em destaque, e ler a falha. Iteração 2 de 5, com a ferramenta npm test.",
    },
    {
      id: "time",
      shortTitle: "O tempo",
      title: "Onde vai o tempo de uma feature",
      tag: "mechanism",
      body: [
        `Escrever código é só uma parte do trabalho. Na feature de brinquedo da cena, que leva ${hours(total)}, escrever código ocupa ${hours(hoursOf(["write"]))}: ${percent(writeShare)}. O resto é entender o código que já existe, testar, revisar e integrar.`,
        "Essa divisão muda de equipe para equipe, mas a lição é estável: uma ferramenta que só acelera a digitação mexe numa fatia pequena. Para medir o ganho de verdade, é preciso saber qual fatia ela acelera e quanto.",
      ],
      keyIdea: "Antes de perguntar quanto a IA acelera, pergunte qual parte do trabalho ela acelera.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "time",
            piece: "chart",
            kind: "bar",
            series: activities.map((activity) => ({ label: activity.label, value: activity.hours })),
            highlight: activities.findIndex((activity) => activity.id === "write"),
            color: "module-15",
          },
        ],
      },
      alt: `Horas por atividade numa feature de ${hours(total)}: ${activities.map((activity) => `${activity.label} ${hours(activity.hours)}`).join(", ")}. Escrever código está em destaque.`,
    },
    {
      id: "amdahl",
      shortTitle: "Amdahl",
      title: "Acelerar uma parte tem teto",
      tag: "example",
      body: [
        `A [[Lei de Amdahl|amdahls-law]] diz quanto o todo acelera quando só uma fração p fica s vezes mais rápida: ganho = 1 / ((1 − p) + p / s). Com p = ${fixed(writeShare)}, escrever código ${AGENT_SPEED} vezes mais rápido dá ${fixed(autocompleteGain)}×. Mesmo infinitamente mais rápido, o teto é ${fixed(ceiling)}×.`,
        `Se o agente também ajuda a entender o código e a testar, p sobe para ${fixed(agentShare)} e o mesmo ${AGENT_SPEED}× vira ${fixed(agentGain)}×. Por isso o ganho maior vem de cobrir mais do ciclo, e não de digitar mais rápido. E o que sobra fora de p, revisar e integrar, vira o novo gargalo.`,
      ],
      keyIdea: "Ganho total = 1 / ((1 − p) + p / s). A fatia que a IA não toca define o teto.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "gain",
            piece: "metrics-panel",
            metrics: [
              { id: "p", label: "p (escrever)", value: percent(writeShare) },
              { id: "two", label: `${AGENT_SPEED}× só no código`, value: `${fixed(autocompleteGain)}×` },
              { id: "ceiling", label: "teto", value: `${fixed(ceiling)}×`, color: "danger" },
              { id: "agent", label: `${AGENT_SPEED}× em ${percent(agentShare)}`, value: `${fixed(agentGain)}×`, color: "success" },
            ],
            highlight: "ceiling",
          },
          {
            id: "curve",
            piece: "chart",
            kind: "line",
            series: speedupSeries,
            highlight: speeds.length - 1,
            color: "module-15",
          },
        ],
      },
      alt: `Ganho total da feature quando só a escrita de código acelera: ${speedupSeries.map((item) => `${item.label} dá ${fixed(item.value)}×`).join(", ")}. O teto é ${fixed(ceiling)}×; com o agente cobrindo ${percent(agentShare)} do trabalho, ${AGENT_SPEED}× vira ${fixed(agentGain)}×.`,
    },
    {
      id: "studies",
      shortTitle: "Estudos",
      title: "O que os estudos medem, e o que não medem",
      tag: "tradeoff",
      body: [
        `Num experimento controlado de 2023, quem usou o GitHub Copilot terminou uma tarefa definida, um servidor HTTP em JavaScript, ${percent(COPILOT_FASTER)} mais rápido que o grupo sem a ferramenta. Em 2025, o METR acompanhou ${METR_DEVELOPERS} desenvolvedores experientes em ${METR_TASKS} tarefas dos próprios repositórios open source: com IA, eles levaram ${percent(METR_MEASURED_SLOWER)} mais tempo.`,
        `O dado mais curioso do METR: antes, os desenvolvedores previam ficar ${percent(METR_FORECAST_FASTER)} mais rápidos e, depois, achavam que tinham ficado ${percent(METR_PERCEIVED_FASTER)} mais rápidos. A sensação não bate com o relógio. Os dois estudos não se contradizem: tarefa nova e isolada é diferente de código grande e maduro, com padrões que a ferramenta não conhece. Meça no seu contexto, com tempo real.`,
      ],
      keyIdea: "Ganho com IA depende da tarefa e do código. A percepção de quem usa não é medida.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "studies",
            piece: "metrics-panel",
            metrics: [
              { id: "copilot", label: "Copilot, tarefa nova", value: `${percent(COPILOT_FASTER)} mais rápido`, color: "success" },
              { id: "forecast", label: "METR: previsto", value: `${percent(METR_FORECAST_FASTER)} mais rápido` },
              { id: "perceived", label: "METR: percebido", value: `${percent(METR_PERCEIVED_FASTER)} mais rápido` },
              { id: "measured", label: "METR: medido", value: `${percent(METR_MEASURED_SLOWER)} mais lento`, color: "danger" },
            ],
            highlight: "measured",
          },
        ],
      },
      alt: `Resultados de dois estudos: com Copilot numa tarefa nova, ${percent(COPILOT_FASTER)} mais rápido. No METR, com desenvolvedores experientes em repositórios próprios: previsto ${percent(METR_FORECAST_FASTER)} mais rápido, percebido ${percent(METR_PERCEIVED_FASTER)} mais rápido e medido ${percent(METR_MEASURED_SLOWER)} mais lento.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "O fluxo que o resto do módulo monta",
      tag: "summary",
      body: [
        "O agente gera código rápido; o trabalho de engenharia passa a ser dizer com precisão o que construir e conferir se foi construído. Uma especificação diz o quê, os testes dizem se funciona, a revisão humana diz se deve entrar.",
        "As próximas aulas montam esse fluxo peça por peça, começando pelo desenvolvimento guiado por especificação.",
      ],
      keyIdea: "Com agentes, escrever código fica barato; especificar e verificar viram o trabalho principal.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "helpers",
            piece: "block-diagram",
            blocks: [
              { id: "spec", kind: "documents", label: "especificação", col: 0, row: 0.5 },
              { id: "agent", kind: "agent", label: "agente", col: 1, row: 0.5 },
              { id: "tests", kind: "eval", label: "testes", col: 2, row: 0 },
              { id: "dev", kind: "user", label: "revisão humana", col: 2, row: 1 },
              { id: "repo", kind: "server", label: "repositório", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "spec", to: "agent", label: "o quê" },
              { from: "agent", to: "tests", label: "código" },
              { from: "tests", to: "dev", label: "verde" },
              { from: "dev", to: "repo", label: "aprova" },
            ],
            active: "repo",
            done: ["spec", "agent", "tests", "dev"],
          },
        ],
      },
      alt: "A especificação diz ao agente o que construir; o código passa pelos testes, depois pela revisão humana, e só então chega ao repositório, em destaque.",
    },
  ],
  realWorldExample:
    "O SWE-bench (Jimenez et al., 2023) virou a régua pública dos agentes de código: cada tarefa é uma issue real do GitHub em projetos como Django e scikit-learn, e o patch do agente só conta se os testes ligados à issue passam sem quebrar os que já passavam. No lançamento, o melhor modelo resolvia 1,96% das tarefas; a subamostra SWE-bench Verified, com 500 tarefas conferidas por engenheiros, é a usada hoje nos anúncios de modelos.",
  tradeOffs: {
    pros: [
      "Tira trabalho mecânico do caminho: boilerplate, migrações repetitivas, testes de casos óbvios",
      "Um agente com testes no loop corrige os próprios erros antes de mostrar o resultado",
      "Ajuda a entender código desconhecido, que costuma ser a maior fatia do tempo",
    ],
    cons: [
      "O ganho medido varia muito com a tarefa e com o tamanho do código; a sensação de ganho não é medida",
      "Código gerado rápido ainda precisa ser revisado, e a revisão vira o gargalo",
      "Sem testes ou especificação, o agente entrega com confiança algo diferente do pedido",
    ],
    alternatives: [
      "Programação em par entre pessoas, para tarefas em que o contexto está na cabeça da equipe",
      "Geradores determinísticos (scaffolding, codemods) para mudanças mecânicas e repetíveis",
    ],
  },
  knowledgeCheck: [
    {
      id: "amdahl-ceiling",
      prompt: "Revisar e integrar ocupam 40% do tempo de uma equipe e a IA não mexe nessa parte. Qual o maior ganho total possível, mesmo com o resto infinitamente mais rápido?",
      options: ["1,4×", "2,5×", "4×", "Ilimitado"],
      correct: 1,
      explanation: "Pela Lei de Amdahl, com p = 0,6 e s → ∞, o ganho é 1 / 0,4 = 2,5×. A fatia que não acelera define o teto.",
      lesson: "15-01",
    },
    {
      id: "agent-vs-chat",
      prompt: "Qual a diferença essencial entre pedir código num chat e pedir a um agente de código?",
      options: [
        "O agente usa um modelo maior",
        "O agente executa ferramentas, como os testes, e usa o resultado para corrigir o código antes de entregar",
        "O chat não sabe programar",
        "O agente não precisa de revisão humana",
      ],
      correct: 1,
      explanation: "O agente fecha o loop: edita, roda, observa a saída e tenta de novo. O código do chat nunca foi executado. Os dois continuam precisando de revisão.",
      lesson: "15-01",
    },
  ],
  related: ["12-01", "12-04", "15-02"],
  references: [
    { title: "Jimenez et al. (2023), SWE-bench: Can Language Models Resolve Real-World GitHub Issues?", url: "https://arxiv.org/abs/2310.06770", kind: "paper" },
    { title: "Peng et al. (2023), The Impact of AI on Developer Productivity: Evidence from GitHub Copilot", url: "https://arxiv.org/abs/2302.06590", kind: "paper" },
    { title: "Becker et al. (2025), Measuring the Impact of Early-2025 AI on Experienced Open-Source Developer Productivity", url: "https://arxiv.org/abs/2507.09089", kind: "paper" },
  ],
};

export default lesson;
