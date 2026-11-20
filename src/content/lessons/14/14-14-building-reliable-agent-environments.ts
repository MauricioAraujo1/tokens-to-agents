import type { LessonContent } from "../../../types/content";

// Estado limpo ao longo de muitas sessões, calculado aqui. Um projeto avança uma feature por sessão. Cada sessão
// tem 5% de chance de deixar o projeto quebrado sem perceber; um estado quebrado contamina as sessões seguintes.
// Com o protocolo de início do harness da Anthropic (ler progresso e git log, subir o app com init.sh e rodar um
// teste básico antes de começar), 90% dessas quebras são detectadas e revertidas pelo git na sessão seguinte.

const BREAK_RATE = 0.05;
const DETECTION = 0.9;
const checkpoints = [5, 10, 20, 30];

const cleanAfter = (sessions: number, effectiveBreak: number) => (1 - effectiveBreak) ** sessions;
const effectiveWithProtocol = BREAK_RATE * (1 - DETECTION);
const policies = [
  { label: "sem protocolo", rate: BREAK_RATE },
  { label: "com teste no início", rate: effectiveWithProtocol },
];
const table = policies.map((policy) => checkpoints.map((sessions) => cleanAfter(sessions, policy.rate)));
const LAST = checkpoints[checkpoints.length - 1];
const bareFinal = cleanAfter(LAST, BREAK_RATE);
const protocolFinal = cleanAfter(LAST, effectiveWithProtocol);

const startRitual = [
  { id: "pwd", label: "pwd" },
  { id: "progress", label: "ler progresso e git log" },
  { id: "features", label: "ler a lista de features" },
  { id: "init", label: "rodar init.sh", color: "module-14" as const },
  { id: "smoke", label: "teste básico", color: "module-14" as const },
  { id: "pick", label: "escolher 1 feature" },
];

const failures = [
  { id: "f-done", label: "declara pronto cedo", fix: "x-list", fixLabel: "lista de features" },
  { id: "f-broken", label: "deixa bugs sem registro", fix: "x-git", fixLabel: "git + progresso" },
  { id: "f-untested", label: "marca sem testar", fix: "x-verify", fixLabel: "testar como usuário" },
  { id: "f-setup", label: "perde tempo subindo o app", fix: "x-init", fixLabel: "init.sh" },
];

const percent = (value: number) => `${Math.round(value * 100)}%`;
const fixed = (value: number) => value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const lesson: LessonContent = {
  id: "14-14",
  subtitle: "A oficina arrumada: um ambiente que sobe igual toda vez, sessões que começam e terminam do mesmo jeito, e o harness inteiro trabalhando junto.",
  objectives: [
    "Montar um ambiente reproduzível para agentes a partir de arquivos versionados",
    "Definir um ritual de início e um de fim para cada sessão",
    "Calcular como um protocolo de estado limpo protege projetos de muitas sessões",
    "Ligar cada modo de falha de agentes longos à peça do harness que o resolve",
  ],
  steps: [
    {
      id: "workshop",
      shortTitle: "A oficina",
      title: "A oficina que se arruma sozinha",
      tag: "context",
      body: [
        "Numa oficina com turnos, cada mecânico encontra as ferramentas no lugar, o carro no elevador e uma ficha dizendo o que foi feito e o que falta. Se um turno sai deixando peças soltas, o seguinte perde a manhã descobrindo o que aconteceu, ou pior, monta em cima do erro.",
        "Um agente que trabalha por muitas sessões vive essa situação, porque cada sessão começa sem memória. Um [[ambiente reproduzível|reproducible-environment]] é a oficina arrumada: dependências fixadas, um script de setup e instruções versionadas, para que o app suba igual em toda sessão, na máquina de qualquer pessoa e na do agente. Em volta dele ficam todas as peças deste módulo.",
      ],
      keyIdea: "Agente de muitas sessões precisa de uma oficina que sobe igual e de uma ficha que conta o que aconteceu.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "env",
            piece: "block-diagram",
            blocks: [
              { id: "docs", kind: "documents", label: "AGENTS.md + features", col: 0, row: 0 },
              { id: "memory", kind: "memory", label: "progresso", col: 0, row: 1 },
              { id: "agent", kind: "agent", label: "agente", col: 1, row: 0.5 },
              { id: "sandbox", kind: "guardrail", label: "permissões + sandbox", col: 2, row: 0 },
              { id: "app", kind: "server", label: "app via init.sh", col: 3, row: 0 },
              { id: "eval", kind: "eval", label: "testes", col: 2, row: 1 },
            ],
            edges: [
              { from: "docs", to: "agent", label: "lê" },
              { from: "memory", to: "agent", label: "retoma" },
              { from: "agent", to: "sandbox" },
              { from: "sandbox", to: "app" },
              { from: "agent", to: "eval", label: "confere" },
            ],
            active: "agent",
          },
        ],
      },
      alt: "O agente, em destaque, lê o AGENTS.md e a lista de features, retoma pelo arquivo de progresso, age através de permissões e sandbox sobre o app que sobe com init.sh, e confere o trabalho com testes.",
    },
    {
      id: "start",
      shortTitle: "Começar",
      title: "Toda sessão começa igual",
      tag: "mechanism",
      body: [
        "No harness de tarefas longas da Anthropic, um agente inicializador prepara o ambiente uma vez: uma lista de features em JSON (todas começando como falhando), um [[arquivo de progresso|progress-file]] chamado claude-progress.txt, um script init.sh que sobe o servidor de desenvolvimento e um repositório git com o primeiro commit.",
        "Depois, cada sessão do agente de código começa com o mesmo ritual: conferir o diretório, ler o progresso e o git log, ler a lista de features, rodar o init.sh e um teste básico de ponta a ponta antes de mexer em qualquer coisa, e só então escolher uma única feature. O teste básico é o que pega um projeto que a sessão anterior deixou quebrado.",
      ],
      keyIdea: "Antes de construir, confira que o chão está firme: progresso, git log, app no ar e um teste básico.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "ritual",
            piece: "pipeline",
            stages: startRitual,
            active: "smoke",
            done: ["pwd", "progress", "features", "init"],
          },
        ],
      },
      alt: `Ritual de início de sessão em etapas: ${startRitual.map((stage) => stage.label).join(", ")}; o teste básico está em destaque.`,
    },
    {
      id: "finish",
      shortTitle: "Terminar",
      title: "Toda sessão termina limpa",
      tag: "mechanism",
      body: [
        "O turno da oficina só acaba com a ficha preenchida e a bancada limpa. O equivalente para o agente é o [[estado limpo|clean-state]]: código que se poderia mesclar na branch principal, sem bugs grandes, bem organizado e documentado, com a feature marcada como passando só depois de testada.",
        "O fim da sessão tem três gestos: rodar as checagens, fazer um commit com mensagem descritiva e atualizar o arquivo de progresso. O git é a rede de segurança: se a sessão seguinte achar o projeto quebrado, ela volta ao último commit bom. Um Stop hook pode exigir as checagens, e um hook depois da edição pode conferir que, na lista de features, só o campo de status mudou.",
      ],
      keyIdea: "Checar, commitar, anotar: a sessão seguinte depende do que esta deixa.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "env",
            piece: "block-diagram",
            blocks: [
              { id: "agent", kind: "agent", label: "agente", col: 0, row: 0.5 },
              { id: "eval", kind: "eval", label: "checagens", col: 1, row: 0.5 },
              { id: "git", kind: "documents", label: "git commit", col: 2, row: 0 },
              { id: "memory", kind: "memory", label: "progresso", col: 3, row: 0 },
              { id: "revert", kind: "no-result", label: "volta ao último bom", col: 2, row: 1 },
            ],
            edges: [
              { from: "agent", to: "eval" },
              { from: "eval", to: "git", label: "passou" },
              { from: "git", to: "memory", label: "anota" },
              { from: "eval", to: "revert", label: "quebrou", variant: "alternative" },
            ],
            active: "git",
            done: ["agent", "eval"],
          },
        ],
      },
      alt: "O agente roda as checagens; se passam, faz git commit, em destaque, e anota o progresso; se o projeto quebrou, volta ao último commit bom por um caminho tracejado.",
    },
    {
      id: "sessions",
      shortTitle: "A conta",
      title: `${LAST} sessões sem desmoronar`,
      tag: "example",
      body: [
        `Cada sessão tem ${percent(BREAK_RATE)} de chance de deixar o projeto quebrado sem perceber, e uma quebra contamina o que vem depois. Sem protocolo, a chance de o projeto seguir limpo é 0,95 elevado ao número de sessões: depois de ${LAST}, só ${percent(bareFinal)}.`,
        `Com o teste básico no início e o git para reverter, ${percent(DETECTION)} das quebras são pegas na sessão seguinte, e a taxa efetiva cai para ${fixed(effectiveWithProtocol * 100)}% por sessão. Depois de ${LAST} sessões, o projeto segue limpo em ${percent(protocolFinal)} dos casos. O modelo é o mesmo; mudou o ritual que o harness impõe.`,
      ],
      keyIdea: "Em trabalho de muitas sessões, detectar e reverter quebras cedo vale mais do que errar menos.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "clean-table",
            piece: "matrix",
            rows: policies.map((policy) => policy.label),
            cols: checkpoints.map((sessions) => `${sessions} sessões`),
            values: table.map((row) => row.map((value) => Number(value.toFixed(2)))),
            scale: { min: 0, max: 1 },
            highlight: { row: 1, col: checkpoints.length - 1 },
            showValues: true,
            color: "module-14",
          },
          {
            id: "clean-numbers",
            piece: "metrics-panel",
            metrics: [
              { id: "bare", label: `limpo após ${LAST}, sem protocolo`, value: percent(bareFinal), color: "danger" },
              { id: "protocol", label: `limpo após ${LAST}, com protocolo`, value: percent(protocolFinal), color: "success" },
              { id: "rate", label: "quebra efetiva por sessão", value: `${fixed(effectiveWithProtocol * 100)}%` },
            ],
            highlight: "protocol",
          },
        ],
      },
      alt: `Tabela da chance de o projeto seguir limpo após 5, 10, 20 e ${LAST} sessões: sem protocolo cai até ${percent(bareFinal)}; com teste no início e reversão pelo git fica em ${percent(protocolFinal)} após ${LAST} sessões.`,
    },
    {
      id: "failures",
      shortTitle: "Falhas",
      title: "Cada falha, uma peça do harness",
      tag: "tradeoff",
      body: [
        "A Anthropic lista quatro falhas de agentes longos e o conserto de cada uma: declarar o projeto pronto cedo demais (uma lista de features escrita a partir da spec, uma feature por sessão), deixar bugs e progresso sem registro (git e arquivo de progresso), marcar features sem testar direito (testar como um usuário antes de marcar) e perder tempo descobrindo como rodar o app (o init.sh).",
        "Cada conserto custa alguma coisa: arquivos para manter, rituais que gastam tokens no início de cada sessão, checagens lentas. Sem medir, um harness só cresce. Com [[evals|eval]] repetidos, dá para ver quais peças mudam o resultado e cortar as que não mudam, inclusive quando um modelo novo torna uma delas desnecessária.",
      ],
      keyIdea: "Ligue cada falha observada a uma peça do harness, e meça para saber quais peças continuam valendo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "failure-map",
            piece: "graph",
            nodes: [
              ...failures.map((failure, index) => ({ id: failure.id, label: failure.label, x: 0.18, y: 0.12 + index * 0.25, color: "danger" as const })),
              ...failures.map((failure, index) => ({ id: failure.fix, label: failure.fixLabel, x: 0.8, y: 0.12 + index * 0.25, color: "success" as const })),
            ],
            edges: failures.map((failure) => ({ from: failure.id, to: failure.fix })),
            highlight: ["f-untested", "x-verify"],
          },
        ],
      },
      alt: `Mapa de falhas e consertos: ${failures.map((failure) => `${failure.label} se resolve com ${failure.fixLabel}`).join("; ")}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "O harness inteiro",
      tag: "summary",
      body: [
        "Um ambiente confiável junta o módulo todo: instruções curtas e regras no lugar certo, skills para procedimentos, hooks para o que precisa acontecer sempre, permissões mínimas, sandbox e worktrees para conter erros, contexto e memória enxutos, feedback que o agente não pode reescrever, e um ritual de início e fim que mantém o estado limpo entre sessões.",
        "O próximo módulo usa esse ambiente para o trabalho de software do dia a dia com agentes: specs, planejamento, testes e revisão de código.",
      ],
      keyIdea: "Ambiente reproduzível, sessões com ritual, garantias no harness e medição: é isso que torna um agente confiável.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "recap",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "instructions", label: "instruções e regras" },
              { id: "skills", label: "skills e hooks" },
              { id: "perms", label: "permissões mínimas" },
              { id: "isolation", label: "sandbox e worktrees" },
              { id: "context", label: "contexto e memória" },
              { id: "feedback", label: "feedback protegido", color: "module-14" },
              { id: "ritual", label: "ritual de sessão", color: "module-14" },
            ],
          },
        ],
      },
      alt: "Chips com as peças de um ambiente confiável: instruções e regras, skills e hooks, permissões mínimas, sandbox e worktrees, contexto e memória, feedback protegido e ritual de sessão.",
    },
  ],
  realWorldExample:
    "No artigo “Effective harnesses for long-running agents”, a Anthropic descreve o par inicializador e agente de código: o primeiro escreve uma lista de features em JSON, com campos como description, steps e passes, todas começando como falhando, além do claude-progress.txt, do init.sh e do commit inicial. Cada sessão seguinte lê o progresso e o git log, roda um teste básico, trabalha numa feature, e termina com commit e notas atualizadas, deixando o código em estado limpo.",
  code: {
    language: "bash",
    source: `#!/usr/bin/env bash
# init.sh: sobe o ambiente igual em toda sessão
set -euo pipefail
pnpm install --frozen-lockfile     # dependências fixadas pelo lockfile
pnpm db:migrate
pnpm dev > .dev.log 2>&1 &
npx wait-on http://localhost:3000
pnpm test:smoke                    # teste básico antes de começar`,
    caption: "Um init.sh no espírito do harness da Anthropic: instala exatamente o que o lockfile diz, sobe o app e roda um teste básico de ponta a ponta antes de a sessão começar.",
  },
  tradeOffs: {
    pros: [
      "Sessões retomam de onde a anterior parou, sem redescobrir o projeto",
      "Quebras são detectadas cedo e revertidas pelo git",
      "O mesmo ambiente serve a pessoas e agentes",
    ],
    cons: [
      "O ritual de início gasta tokens e tempo em toda sessão",
      "Arquivos de progresso e listas de features precisam de manutenção",
      "Testes de ponta a ponta são lentos e às vezes instáveis",
    ],
    alternatives: ["Sessões curtas e independentes, quando a tarefa cabe numa janela", "Ambientes remotos gerenciados pela ferramenta, com snapshot pronto"],
  },
  knowledgeCheck: [
    {
      id: "first-thing",
      prompt: "Uma sessão nova de um agente de código começa num projeto que outra sessão mexeu ontem. Qual é o primeiro passo mais seguro?",
      options: [
        "Começar a próxima feature da lista imediatamente",
        "Ler o progresso e o git log, subir o app e rodar um teste básico antes de mudar qualquer coisa",
        "Apagar o arquivo de progresso para começar do zero",
        "Marcar todas as features como passando",
      ],
      correct: 1,
      explanation: "Se a sessão anterior deixou algo quebrado, construir em cima espalha o erro. O ritual de início confere o estado e permite reverter pelo git antes de avançar.",
      lesson: "14-14",
    },
    {
      id: "sessions-math",
      prompt: "Cada sessão tem 10% de chance de quebrar o projeto sem perceber. Um teste no início pega 80% das quebras. Qual é a taxa efetiva de quebra por sessão?",
      options: ["2%", "8%", "10%", "18%"],
      correct: 0,
      explanation: "Só passam as quebras que o teste não pega: 0,10 × (1 − 0,8) = 0,02. Em 20 sessões, a chance de seguir limpo sobe de 0,9²⁰ ≈ 12% para 0,98²⁰ ≈ 67%.",
      lesson: "14-14",
    },
  ],
  related: ["14-13", "15-01", "12-18"],
  references: [
    { title: "Anthropic: Effective harnesses for long-running agents", url: "https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents", kind: "article" },
    { title: "Claude Code: Best practices", url: "https://code.claude.com/docs/en/best-practices", kind: "docs" },
    { title: "Git: git-worktree documentation", url: "https://git-scm.com/docs/git-worktree", kind: "docs" },
  ],
};

export default lesson;
