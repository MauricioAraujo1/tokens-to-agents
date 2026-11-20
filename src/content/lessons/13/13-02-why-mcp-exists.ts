import type { LessonContent } from "../../../types/content";

// A conta das integrações, feita no arquivo: N apps que querem M ferramentas. Sem um padrão, cada par
// (app, ferramenta) pede um conector próprio, N × M; com um protocolo comum, cada app implementa o cliente
// uma vez e cada ferramenta implementa o servidor uma vez, N + M.

const integer = (value: number) => value.toLocaleString("pt-BR");

const apps = ["chat", "ide", "suporte", "planilha"];
const tools = ["github", "jira", "drive", "slack", "postgres", "agenda"];

const withoutStandard = (n: number, m: number) => n * m;
const withStandard = (n: number, m: number) => n + m;

const N = apps.length;
const M = tools.length;
const pairwise = withoutStandard(N, M);
const shared = withStandard(N, M);

// Matriz de conectores: cada célula é um conector escrito à mão para um par (app, ferramenta).
const connectorMatrix = apps.map(() => tools.map(() => 1));

// Crescimento quando apps e ferramentas crescem juntos (n = m).
const sizes = [2, 4, 6, 8, 10];
const pairwiseSeries = sizes.map((n) => ({ label: `${n}×${n}`, value: withoutStandard(n, n) }));
const sharedSeries = sizes.map((n) => ({ label: `${n}+${n}`, value: withStandard(n, n) }));
const chartMax = Math.max(...pairwiseSeries.map((item) => item.value));
const largest = sizes[sizes.length - 1];

// Uma ferramenta nova entra: quanto trabalho cada abordagem pede.
const newToolWithout = N;
const newToolWith = 1;
// Um app novo entra.
const newAppWithout = M;
const newAppWith = 1;

const lesson: LessonContent = {
  id: "13-02",
  subtitle: "Por que um protocolo comum: a conta N × M dos conectores sob medida contra a conta N + M de um padrão.",
  objectives: [
    "Calcular o número de integrações com e sem um protocolo comum",
    "Explicar por que conectores sob medida não escalam com mais apps e ferramentas",
    "Relacionar o MCP a padrões anteriores, como o Language Server Protocol",
    "Reconhecer o que um padrão não resolve: qualidade e segurança das ferramentas",
  ],
  steps: [
    {
      id: "spaghetti",
      shortTitle: "Antes",
      title: "Cada app com o seu conector",
      tag: "context",
      body: [
        "Imagine uma cidade em que cada casa tem uma tomada de formato diferente. Cada aparelho que você compra precisa de um adaptador para cada casa em que vai ser usado. Era assim a integração de IA antes de um padrão: o chat da empresa tinha um conector para o GitHub, a IDE tinha outro, o bot de suporte tinha um terceiro, todos fazendo a mesma coisa de jeitos diferentes.",
        "Cada conector sabia autenticar, listar operações, montar a chamada e traduzir o resultado para o formato de [[tool calling|tool-calling]] daquele app. Quando a API do GitHub mudava, alguém consertava o mesmo problema em vários lugares.",
      ],
      keyIdea: "Sem padrão, a integração mora no par (app, ferramenta), e cada par é código a escrever e manter.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "wiring",
            piece: "block-diagram",
            blocks: [
              { id: "chat", kind: "phone", label: "chat", col: 0, row: 0 },
              { id: "ide", kind: "laptop", label: "ide", col: 0, row: 1 },
              { id: "github", kind: "tool", label: "github", col: 2, row: 0 },
              { id: "jira", kind: "tool", label: "jira", col: 2, row: 1 },
              { id: "drive", kind: "cloud", label: "drive", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "chat", to: "github", label: "conector a" },
              { from: "chat", to: "jira", label: "conector b" },
              { from: "chat", to: "drive", label: "conector c" },
              { from: "ide", to: "github", label: "conector d" },
              { from: "ide", to: "jira", label: "conector e" },
              { from: "ide", to: "drive", label: "conector f" },
            ],
            active: "github",
          },
        ],
      },
      alt: "Dois apps, chat e IDE, ligados a três ferramentas por seis conectores diferentes, um para cada par; o GitHub, em destaque, recebe dois conectores distintos.",
    },
    {
      id: "matrix",
      shortTitle: "N × M",
      title: "A conta que explode",
      tag: "mechanism",
      body: [
        `Monte uma tabela com os apps nas linhas e as ferramentas nas colunas. Cada célula é um conector. Com ${N} apps e ${M} ferramentas, são ${N} × ${M} = ${integer(pairwise)} conectores, cada um com o seu código de autenticação, formato e tratamento de erro.`,
        "Esse é o [[problema N × M|nxm-integration-problem]]: o trabalho cresce com o produto dos dois lados. Dobrar os apps e as ferramentas quadruplica os conectores. E nenhum app aproveita o trabalho do outro, porque cada conector fala o dialeto de um app só.",
      ],
      keyIdea: "N apps × M ferramentas = N × M conectores: o trabalho cresce com o produto.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "connectors",
            piece: "matrix",
            rows: apps,
            cols: tools,
            values: connectorMatrix,
            scale: { min: 0, max: 1 },
            highlight: { row: 0, col: 0 },
            showValues: true,
            color: "module-13",
          },
        ],
      },
      alt: `Tabela com ${N} apps nas linhas e ${M} ferramentas nas colunas, todas as ${pairwise} células preenchidas com 1: cada uma é um conector escrito à mão.`,
    },
    {
      id: "n-plus-m",
      shortTitle: "N + M",
      title: "Com um protocolo: N + M",
      tag: "mechanism",
      body: [
        `Com um padrão, o trabalho muda de lugar. Cada app implementa um [[cliente MCP|mcp-client]] uma vez, e cada ferramenta ganha um [[servidor MCP|mcp-server]] uma vez. Qualquer cliente fala com qualquer servidor. Os mesmos ${N} apps e ${M} ferramentas pedem ${N} + ${M} = ${integer(shared)} implementações, contra ${integer(pairwise)}.`,
        `Os gráficos mostram a diferença quando os dois lados crescem juntos: com ${largest} apps e ${largest} ferramentas, são ${integer(withoutStandard(largest, largest))} conectores sem padrão e ${integer(withStandard(largest, largest))} implementações com padrão. A ideia não é nova: o MCP se inspira no Language Server Protocol, que fez o mesmo para editores de código e linguagens de programação.`,
      ],
      keyIdea: "O protocolo transforma um produto (N × M) numa soma (N + M).",
      scene: {
        kind: "pieces",
        layout: "row",
        pieces: [
          { id: "pairwise", piece: "chart", kind: "bar", series: pairwiseSeries, max: chartMax, highlight: sizes.length - 1, color: "danger" },
          { id: "shared", piece: "chart", kind: "bar", series: sharedSeries, max: chartMax, highlight: sizes.length - 1, color: "module-13" },
        ],
      },
      alt: `Dois gráficos na mesma escala. Sem padrão: ${pairwiseSeries.map((item) => `${item.label} = ${item.value}`).join(", ")}. Com padrão: ${sharedSeries.map((item) => `${item.label} = ${item.value}`).join(", ")}.`,
    },
    {
      id: "growth",
      shortTitle: "Crescer",
      title: "O custo de entrar mais um",
      tag: "example",
      body: [
        `A conta fica mais clara na hora de crescer. Uma ferramenta nova, sem padrão, pede ${newToolWithout} conectores novos, um em cada app. Com MCP, pede ${newToolWith} servidor, e todos os apps que falam MCP passam a enxergá-la.`,
        `Um app novo, sem padrão, precisa de ${newAppWithout} conectores para alcançar as ferramentas existentes; com MCP, implementa ${newAppWith} cliente e herda as ${M}. É por isso que empresas publicam servidores MCP oficiais para os seus produtos: um servidor alcança todos os hosts compatíveis.`,
      ],
      keyIdea: "Com um padrão, quem chega paga uma vez e ganha acesso a todo o outro lado.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "cost",
            piece: "metrics-panel",
            metrics: [
              { id: "tool-without", label: "ferramenta nova, sem padrão", value: `${newToolWithout} conectores`, color: "danger" },
              { id: "tool-with", label: "ferramenta nova, com MCP", value: `${newToolWith} servidor`, color: "success" },
              { id: "app-without", label: "app novo, sem padrão", value: `${newAppWithout} conectores`, color: "danger" },
              { id: "app-with", label: "app novo, com MCP", value: `${newAppWith} cliente`, color: "success" },
            ],
            highlight: "tool-with",
          },
        ],
      },
      alt: `Painel: uma ferramenta nova custa ${newToolWithout} conectores sem padrão e ${newToolWith} servidor com MCP; um app novo custa ${newAppWithout} conectores sem padrão e ${newAppWith} cliente com MCP.`,
    },
    {
      id: "limits",
      shortTitle: "Limites",
      title: "O que o padrão não resolve",
      tag: "tradeoff",
      body: [
        "Uma tomada padrão não deixa o aparelho melhor. Um servidor MCP com ferramentas mal descritas continua confundindo o modelo, e um servidor malicioso continua perigoso: o padrão só facilita ligá-lo. Além disso, o ganho depende dos dois lados falarem o protocolo; um sistema legado sem servidor MCP ainda pede um conector próprio.",
        "O protocolo também evolui. A especificação é versionada por data, e revisões novas mudam detalhes de transporte e de ciclo de vida. Hosts e servidores precisam negociar a versão, e um servidor parado no tempo pode deixar de conversar com hosts novos.",
      ],
      keyIdea: "O padrão reduz o número de integrações, não o cuidado com cada uma.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "wiring",
            piece: "block-diagram",
            blocks: [
              { id: "chat", kind: "phone", label: "chat", col: 0, row: 0 },
              { id: "ide", kind: "laptop", label: "ide", col: 0, row: 1 },
              { id: "github", kind: "tool", label: "servidor github", col: 2, row: 0 },
              { id: "jira", kind: "tool", label: "servidor jira", col: 2, row: 1 },
              { id: "legacy", kind: "sql-db", label: "erp legado", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "chat", to: "github", label: "mcp" },
              { from: "chat", to: "jira", label: "mcp" },
              { from: "ide", to: "github", label: "mcp" },
              { from: "ide", to: "jira", label: "mcp" },
              { from: "ide", to: "legacy", label: "conector próprio", variant: "alternative" },
            ],
            active: "legacy",
          },
        ],
      },
      alt: "Chat e IDE falam MCP com os servidores de GitHub e Jira; o ERP legado, em destaque, ainda precisa de um conector próprio, numa seta tracejada.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Por que o MCP existe",
      tag: "summary",
      body: [
        "Conectores sob medida custam N × M; um protocolo comum custa N + M e deixa cada lado crescer sem reescrever o outro. O MCP segue o caminho do Language Server Protocol, agora para apps de IA e ferramentas.",
        "A próxima aula abre o protocolo por dentro: as camadas de dados e de transporte, e o formato das mensagens.",
      ],
      keyIdea: "Padrão = trabalho somado, não multiplicado.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "takeaways",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "pairwise", label: `sem padrão: ${N} × ${M} = ${pairwise}`, color: "danger" },
              { id: "shared", label: `com MCP: ${N} + ${M} = ${shared}`, color: "module-13" },
              { id: "new-tool", label: "ferramenta nova: 1 servidor" },
              { id: "new-app", label: "app novo: 1 cliente" },
              { id: "limits", label: "qualidade e segurança continuam com você" },
            ],
          },
        ],
      },
      alt: `Resumo em chips: sem padrão ${pairwise} conectores, com MCP ${shared} implementações, ferramenta nova custa um servidor, app novo custa um cliente, qualidade e segurança continuam com você.`,
    },
  ],
  realWorldExample:
    "O anúncio do MCP pela Anthropic, em novembro de 2024, descreve o problema assim: cada nova fonte de dados exigia a sua própria implementação sob medida. Em dezembro de 2025, Anthropic, Block e OpenAI fundaram a Agentic AI Foundation, na Linux Foundation, com o MCP como um dos projetos iniciais: concorrentes mantendo o mesmo padrão é o que faz a conta N + M valer na prática.",
  tradeOffs: {
    pros: [
      "Integrações crescem com N + M, não com N × M",
      "Um servidor bem feito serve a todos os hosts compatíveis",
      "Correções e melhorias num servidor chegam a todos os apps de uma vez",
    ],
    cons: [
      "Os dois lados precisam implementar e acompanhar as versões do protocolo",
      "Sistemas sem servidor MCP continuam pedindo integração própria",
      "Padronizar a conexão não melhora descrições ruins nem impede servidores maliciosos",
    ],
    alternatives: ["Conectores próprios, quando há um app e poucas ferramentas", "Plataformas de integração (iPaaS) que já centralizam APIs"],
  },
  knowledgeCheck: [
    {
      id: "count-integrations",
      prompt: "Uma empresa tem 5 apps de IA e quer ligá-los a 8 sistemas internos. Quantas implementações são necessárias sem padrão e com MCP?",
      options: ["13 e 40", "40 e 13", "40 e 40", "8 e 5"],
      correct: 1,
      explanation: "Sem padrão, um conector por par: 5 × 8 = 40. Com MCP, um cliente por app e um servidor por sistema: 5 + 8 = 13.",
      lesson: "13-02",
    },
    {
      id: "new-system",
      prompt: "Os 5 apps já falam MCP. A empresa adiciona um nono sistema. Qual é o trabalho mínimo para todos os apps o usarem?",
      options: ["5 conectores, um por app", "1 servidor MCP para o sistema novo", "Reescrever os 5 clientes", "9 servidores"],
      correct: 1,
      explanation: "Com o protocolo comum, o sistema novo ganha um servidor, e todo host que fala MCP passa a enxergá-lo sem mudar o próprio código.",
      lesson: "13-02",
    },
  ],
  related: ["13-01", "13-03", "13-14"],
  references: [
    { title: "Anthropic: Introducing the Model Context Protocol", url: "https://www.anthropic.com/news/model-context-protocol", kind: "article" },
    { title: "MCP Specification 2026-07-28: Overview", url: "https://modelcontextprotocol.io/specification/2026-07-28", kind: "docs" },
    { title: "Language Server Protocol", url: "https://microsoft.github.io/language-server-protocol/", kind: "docs" },
  ],
};

export default lesson;
