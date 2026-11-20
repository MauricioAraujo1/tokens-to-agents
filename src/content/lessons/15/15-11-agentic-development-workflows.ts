import type { LessonContent } from "../../../types/content";

// Fluxos agênticos com contas no arquivo. Modelo de brinquedo de uma tentativa do agente: acerta com
// probabilidade p; quando erra, os testes pegam o erro com probabilidade c (a qualidade do oráculo) e o agente
// tenta de novo, até k tentativas; o erro que os testes não pegam sai verde. As tentativas são independentes.
// A fila de revisão compara PRs que chegam por dia com PRs que um revisor consegue ler no orçamento diário.

const percent = (value: number) => `${(value * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const fixed = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const P_RIGHT = 0.4;
const MAX_ATTEMPTS = 5;

/** Resultado do loop com até k tentativas e um oráculo que pega erros com probabilidade c. */
const loop = (k: number, c: number) => {
  const retry = (1 - P_RIGHT) * c;
  let reach = 1;
  let right = 0;
  let wrongGreen = 0;
  for (let attempt = 0; attempt < k; attempt += 1) {
    right += reach * P_RIGHT;
    wrongGreen += reach * (1 - P_RIGHT) * (1 - c);
    reach *= retry;
  }
  return { right, wrongGreen, gaveUp: reach };
};

const perfect = loop(MAX_ATTEMPTS, 1);
const single = loop(1, 1);
const ORACLE = 0.8;
const realistic = loop(MAX_ATTEMPTS, ORACLE);
const greenShareWrong = realistic.wrongGreen / (realistic.right + realistic.wrongGreen);
const oracles = [0.5, 0.6, 0.7, 0.8, 0.9, 1];
const wrongGreenSeries = oracles.map((c) => {
  const result = loop(MAX_ATTEMPTS, c);
  return { label: `c = ${fixed(c)}`, value: Number((result.wrongGreen / (result.right + result.wrongGreen)).toFixed(3)) };
});

// Fila de revisão.
const AGENTS = 4;
const PRS_PER_AGENT = 5;
const REVIEW_BUDGET_MIN = 240;
const MINUTES_PER_PR = 20;
const MINUTES_WITH_PREREVIEW = 10;
const arrivals = AGENTS * PRS_PER_AGENT;
const capacity = (minutesPerPr: number) => Math.floor(REVIEW_BUDGET_MIN / minutesPerPr);
const capacityNow = capacity(MINUTES_PER_PR);
const capacityAfter = capacity(MINUTES_WITH_PREREVIEW);
const DAYS = 5;
const backlogAfter = (days: number, perDay: number) => Math.max(0, (arrivals - perDay) * days);
const backlogNow = backlogAfter(DAYS, capacityNow);
const waitDays = backlogNow / capacityNow;
const utilizationNow = arrivals / capacityNow;
const utilizationAfter = arrivals / capacityAfter;

const lesson: LessonContent = {
  id: "15-11",
  subtitle: "Da issue ao merge com agentes em paralelo: isolamento por worktree, testes como oráculo do loop e o gargalo que sobra, a revisão humana.",
  objectives: [
    "Montar o fluxo issue, plano, implementação, CI, revisão e merge com agentes",
    "Isolar agentes paralelos com git worktrees",
    "Calcular o efeito da qualidade dos testes sobre PRs verdes mas errados",
    "Dimensionar a fila de revisão humana para o volume que os agentes produzem",
  ],
  steps: [
    {
      id: "flow",
      shortTitle: "O fluxo",
      title: "Da issue ao merge",
      tag: "context",
      body: [
        "Numa cozinha de restaurante, o pedido entra, cada cozinheiro faz o seu prato na própria bancada, o chef prova tudo antes de sair, e só então o garçom leva. Ninguém cozinha na bancada do outro, e nada sai sem passar pelo chef.",
        "Um [[fluxo agêntico|agentic-workflow]] de desenvolvimento junta as peças do módulo: a issue com critérios, um agente que planeja e implementa, o CI como primeiro portão, um agente revisor com contexto limpo e uma pessoa que decide o merge. É um [[human-in-the-loop|human-in-the-loop]] com portões automáticos antes do humano, para que o humano só veja o que já passou pelos outros.",
      ],
      keyIdea: "Agentes fazem o trabalho entre portões; os portões automáticos vêm antes do humano.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "issue", kind: "documents", label: "issue", col: 0, row: 0.5 },
              { id: "agent", kind: "agent", label: "implementador", col: 1, row: 0.5 },
              { id: "ci", kind: "eval", label: "ci", col: 2, row: 0 },
              { id: "reviewer", kind: "agent", label: "revisor", col: 2, row: 1 },
              { id: "human", kind: "user", label: "humano", col: 3, row: 1 },
              { id: "main", kind: "server", label: "main", col: 3, row: 0 },
            ],
            edges: [
              { from: "issue", to: "agent", label: "critérios" },
              { from: "agent", to: "ci", label: "pr" },
              { from: "ci", to: "reviewer", label: "verde" },
              { from: "reviewer", to: "human", label: "achados" },
              { from: "human", to: "main", label: "merge" },
            ],
            active: "agent",
          },
        ],
      },
      alt: "A issue com critérios vai ao agente implementador, em destaque, que abre um pull request; o CI confere, o revisor agente lê o que ficou verde, e o humano decide o merge na main.",
    },
    {
      id: "worktrees",
      shortTitle: "Worktrees",
      title: "Uma bancada por agente",
      tag: "mechanism",
      body: [
        "Dois cozinheiros na mesma tábua cortam o dedo um do outro. Dois agentes no mesmo diretório sobrescrevem os arquivos um do outro, e um roda os testes no meio da edição do outro. Cada agente precisa da própria bancada.",
        "O [[git worktree|worktree]] dá isso sem clonar o repositório de novo: são vários diretórios de trabalho ligados ao mesmo repositório, cada um numa branch. O Claude Code cria uma sessão em worktree própria com claude -w, e a documentação lembra o detalhe prático: a worktree é um checkout limpo, sem os arquivos ignorados pelo git (como o .env) e sem as dependências instaladas.",
      ],
      keyIdea: "Paralelismo seguro = uma worktree e uma branch por agente, juntando só pelo pull request.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "worktrees",
            piece: "block-diagram",
            blocks: [
              { id: "repo", kind: "server", label: "repositório", col: 0, row: 0.5 },
              { id: "a", kind: "agent", label: "wt-a: export", col: 1, row: 0 },
              { id: "b", kind: "agent", label: "wt-b: import", col: 1, row: 0.5 },
              { id: "c", kind: "agent", label: "wt-c: i18n", col: 1, row: 1 },
              { id: "prs", kind: "queue", label: "pull requests", col: 2, row: 0.5 },
              { id: "human", kind: "user", label: "revisão", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "repo", to: "a", label: "branch a" },
              { from: "repo", to: "b", label: "branch b" },
              { from: "repo", to: "c", label: "branch c" },
              { from: "a", to: "prs" },
              { from: "b", to: "prs" },
              { from: "c", to: "prs" },
              { from: "prs", to: "human" },
            ],
            active: "prs",
          },
        ],
      },
      alt: "Do mesmo repositório saem três worktrees, cada uma com um agente e uma branch: export, import e i18n. Os três entregam pull requests a uma fila, em destaque, que segue para a revisão.",
    },
    {
      id: "oracle-loop",
      shortTitle: "Loop",
      title: "Os testes decidem quando o agente para",
      tag: "mechanism",
      body: [
        `Dentro da bancada, o agente roda um [[verification loop|verification-loop]]: edita, roda os testes, lê a falha, tenta de novo, até passar ou bater em [[máximo de iterações|max-iterations]]. Se uma tentativa acerta com p = ${fixed(P_RIGHT)} e os testes pegam todo erro, ${MAX_ATTEMPTS} tentativas acertam ${percent(perfect.right)} das tarefas, contra ${percent(single.right)} com uma só: 1 − (1 − p)^k.`,
        "É a mesma régua do SWE-bench: o patch só conta se os testes que a issue fazia falhar passam e os que já passavam continuam passando. A conta supõe tentativas independentes; na prática, um agente que erra por não entender a tarefa tende a errar de novo do mesmo jeito, e por isso o [[pass^k|pass-hat-k]] (acertar em todas as tentativas) é uma medida mais honesta de consistência.",
      ],
      keyIdea: "Com um bom oráculo, tentar de novo converte erro em acerto; o oráculo é o que torna o loop útil.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "loop-metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "p", label: "acerto por tentativa", value: percent(P_RIGHT) },
              { id: "one", label: "1 tentativa", value: percent(single.right) },
              { id: "k", label: `${MAX_ATTEMPTS} tentativas`, value: percent(perfect.right), color: "success" },
            ],
            highlight: "k",
          },
          {
            id: "loop",
            piece: "agent-loop",
            phases: [
              { id: "edit", label: "editar" },
              { id: "test", label: "rodar testes" },
              { id: "read", label: "ler a falha" },
              { id: "fix", label: "corrigir" },
            ],
            active: "test",
            iteration: 3,
            maxIterations: MAX_ATTEMPTS,
            tool: "npm test",
          },
        ],
      },
      alt: `Loop do agente com editar, rodar testes, em destaque, ler a falha e corrigir, na iteração 3 de ${MAX_ATTEMPTS}. Com ${percent(P_RIGHT)} de acerto por tentativa e testes que pegam todo erro, uma tentativa acerta ${percent(single.right)} e ${MAX_ATTEMPTS} tentativas, ${percent(perfect.right)}.`,
    },
    {
      id: "green-wrong",
      shortTitle: "Verde errado",
      title: "Verde não é certo",
      tag: "example",
      body: [
        `Testes reais não pegam todo erro. Se eles pegam só c = ${fixed(ORACLE)} dos erros, um pouco como um mutation score de ${percent(ORACLE)}, o erro não pego sai verde e para o loop. Com ${MAX_ATTEMPTS} tentativas, ${percent(realistic.right)} das tarefas saem certas e ${percent(realistic.wrongGreen)} saem verdes e erradas: ${percent(greenShareWrong)} dos PRs verdes estão errados.`,
        "A cena mostra essa fração conforme a qualidade do oráculo melhora. Mais tentativas não resolvem: elas só aumentam a chance de um erro escapar pelo buraco dos testes. Quem resolve é o oráculo, com testes gerados da spec, mutantes mortos e um revisor que compara o diff com os critérios. Num fluxo com agentes, investir nos testes rende mais do que investir em tentativas.",
      ],
      keyIdea: "A fração de PRs verdes e errados é definida pela qualidade dos testes, não pelo número de tentativas.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "green-wrong",
            piece: "chart",
            kind: "line",
            series: wrongGreenSeries,
            highlight: oracles.indexOf(ORACLE),
            color: "danger",
          },
        ],
      },
      alt: `Fração de PRs verdes que estão errados, com ${MAX_ATTEMPTS} tentativas, conforme a fração de erros que os testes pegam: ${wrongGreenSeries.map((item) => `${item.label}, ${percent(item.value)}`).join("; ")}.`,
    },
    {
      id: "bottleneck",
      shortTitle: "Gargalo",
      title: "O gargalo vira a revisão humana",
      tag: "tradeoff",
      body: [
        `${AGENTS} agentes com ${PRS_PER_AGENT} PRs por dia cada produzem ${arrivals} PRs por dia. Um revisor com ${REVIEW_BUDGET_MIN / 60} horas diárias de revisão, a ${MINUTES_PER_PR} minutos por PR, lê ${capacityNow}. A utilização é ${percent(utilizationNow)}: acima de 100%, a fila só cresce. Em ${DAYS} dias são ${backlogNow} PRs esperando e, pela [[lei de Little|littles-law]], um PR novo espera uns ${fixed(waitDays)} dias.`,
        `Contratar mais agentes piora. O que ajuda é baratear cada revisão: PRs menores, CI e revisor agente antes do humano, descrição que liga o diff aos critérios. Se cada revisão cair para ${MINUTES_WITH_PREREVIEW} minutos, a capacidade vai a ${capacityAfter} por dia e a utilização a ${percent(utilizationAfter)}. Tudo que o agente faz para reduzir o tempo humano por PR vale mais do que um agente a mais.`,
      ],
      keyIdea: "Com agentes, a produção de código escala; a atenção humana não. Projete o fluxo em volta dela.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "queue",
            piece: "client-server",
            nodes: [
              { id: "agents", label: `${AGENTS} agentes`, role: "client" },
              { id: "prs", label: "fila de PRs", role: "queue", size: backlogNow },
              { id: "reviewer", label: "revisor humano", role: "server", utilization: Math.min(1, utilizationNow) },
              { id: "main", label: "main", role: "database" },
            ],
            messages: [
              { from: "agents", to: "prs", label: `${arrivals} PRs/dia` },
              { from: "prs", to: "reviewer", label: `${capacityNow} lidos/dia` },
              { from: "reviewer", to: "main", label: "merge" },
            ],
            active: 0,
          },
        ],
      },
      alt: `${AGENTS} agentes enviam ${arrivals} PRs por dia para uma fila com ${backlogNow} PRs acumulados em ${DAYS} dias; o revisor humano lê ${capacityNow} por dia, com utilização acima de 100%.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "O fluxo inteiro",
      tag: "summary",
      body: [
        "Um fluxo agêntico de desenvolvimento é uma linha de portões: issue com critérios, plano aprovado, agente isolado numa worktree com testes no loop, CI obrigatório, revisor agente com contexto limpo e decisão humana. A qualidade dos testes define quantos erros passam; a capacidade de revisão define a vazão.",
        "Tanto código gerado tão rápido acumula outra coisa: dívida técnica. A última aula do módulo mostra como medir e pagar essa dívida.",
      ],
      keyIdea: "Fluxo agêntico = isolamento + oráculo forte + portões automáticos + atenção humana bem gasta.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "gates",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "issue", label: "issue com critérios" },
              { id: "plan", label: "plano aprovado" },
              { id: "worktree", label: "agente na worktree" },
              { id: "ci", label: "CI obrigatório" },
              { id: "review", label: "revisor agente" },
              { id: "human", label: "decisão humana", color: "module-15" },
              { id: "merge", label: "merge", color: "success" },
            ],
            active: "human",
            done: ["issue", "plan", "worktree", "ci", "review"],
          },
        ],
      },
      alt: "Os portões do fluxo, em ordem: issue com critérios, plano aprovado, agente na worktree, CI obrigatório, revisor agente, decisão humana, em destaque, e merge.",
    },
  ],
  realWorldExample:
    "O Claude Code roda sessões em worktrees próprias (claude -w nome-da-feature) e o comando /batch divide uma mudança mecânica grande em 5 a 30 unidades, mostra o plano e, depois de aprovado, dá a cada unidade a sua worktree e abre um pull request por unidade. O SWE-bench Verified, com 500 tarefas conferidas por engenheiros, é a avaliação pública mais usada desse tipo de fluxo: o patch só vale se os testes da issue passam sem quebrar os outros.",
  code: {
    language: "bash",
    source: `# Uma worktree e uma branch por agente, no mesmo repositório
git worktree add ../wt-export -b feat/export-progresso
git worktree add ../wt-import -b feat/import-progresso

# Cada worktree é um checkout limpo: instale as dependências antes de rodar
(cd ../wt-export && npm ci && npx vitest run)

# Depois do merge, remova a worktree
git worktree remove ../wt-export`,
    caption: "Isolamento de agentes paralelos com git worktree: cada agente trabalha no seu diretório e na sua branch, e o trabalho só se encontra no pull request.",
  },
  tradeOffs: {
    pros: [
      "Tarefas independentes andam em paralelo, sem um agente pisar no outro",
      "Portões automáticos filtram o grosso dos erros antes de gastar atenção humana",
      "Com bons testes, o loop converte tentativas em acertos sem intervenção",
    ],
    cons: [
      "Testes fracos deixam passar PRs verdes e errados, e mais tentativas pioram isso",
      "A revisão humana vira o gargalo; mais agentes aumentam a fila",
      "Worktrees exigem setup próprio, e mudanças paralelas ainda podem conflitar no merge",
    ],
    alternatives: [
      "Um agente só, em sequência, quando as tarefas dependem umas das outras",
      "Agentes em segundo plano só para mudanças mecânicas, com revisão por amostragem",
    ],
  },
  knowledgeCheck: [
    {
      id: "more-attempts",
      prompt: "Os testes de um projeto pegam metade dos erros. Subir o limite de tentativas do agente de 3 para 10 faz o quê com a fração de PRs verdes que estão errados?",
      options: [
        "Zera",
        "Cai pela metade",
        "Não resolve: o que define essa fração é a qualidade dos testes",
        "Dobra a qualidade dos testes",
      ],
      correct: 2,
      explanation: "Cada tentativa extra só acontece quando o erro foi pego. Os erros que os testes não pegam saem verdes na hora, com qualquer limite. Melhorar o oráculo é o que reduz essa fração.",
      lesson: "15-11",
    },
    {
      id: "review-queue",
      prompt: "Seis agentes produzem 30 PRs por dia; a equipe revisa 15. O que mais ajuda?",
      options: [
        "Adicionar mais agentes",
        "Reduzir o tempo humano por PR: PRs menores, CI e revisor agente antes, descrição ligada aos critérios",
        "Aprovar sem ler os PRs dos agentes",
        "Revisar só às sextas",
      ],
      correct: 1,
      explanation: "Com chegada maior que capacidade, a fila cresce sem limite. Mais agentes pioram; baratear cada revisão aumenta a capacidade sem abrir mão do portão humano.",
      lesson: "15-11",
    },
  ],
  related: ["15-10", "15-12", "12-14"],
  references: [
    { title: "Jimenez et al. (2023), SWE-bench: Can Language Models Resolve Real-World GitHub Issues?", url: "https://arxiv.org/abs/2310.06770", kind: "paper" },
    { title: "Claude Code: Best practices", url: "https://code.claude.com/docs/en/best-practices", kind: "docs" },
    { title: "Git: git-worktree", url: "https://git-scm.com/docs/git-worktree", kind: "docs" },
  ],
};

export default lesson;
