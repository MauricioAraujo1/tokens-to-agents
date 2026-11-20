import type { LessonContent } from "../../../types/content";

// Uma sessão de brinquedo contada evento por evento. Três pedidos do usuário, cada um com as suas chamadas de
// ferramenta. Contamos quantas vezes cada evento do ciclo dispara e quantas vezes cada hook roda: um guarda em
// PreToolUse para Bash, um formatador em PostToolUse para Edit|Write e um typecheck em Stop. Os nomes dos
// eventos são os da documentação do Claude Code.

interface Call {
  tool: "Read" | "Grep" | "Edit" | "Write" | "Bash";
  input: string;
  fails?: boolean;
}

const turns: Call[][] = [
  [
    { tool: "Grep", input: "createInvoice" },
    { tool: "Read", input: "src/billing/invoice.ts" },
    { tool: "Edit", input: "src/billing/invoice.ts", fails: true },
    { tool: "Edit", input: "src/billing/invoice.ts" },
    { tool: "Bash", input: "pnpm vitest run invoice" },
  ],
  [
    { tool: "Read", input: "src/billing/tax.ts" },
    { tool: "Write", input: "src/billing/tax.test.ts" },
    { tool: "Bash", input: "rm -rf dist/ node_modules/.cache" },
    { tool: "Edit", input: "src/billing/tax.ts" },
    { tool: "Bash", input: "pnpm vitest run tax" },
  ],
  [
    { tool: "Grep", input: "TODO(billing)" },
    { tool: "Edit", input: "src/billing/report.ts" },
    { tool: "Bash", input: "pnpm vitest run report" },
  ],
];

/** Respostas em que o typecheck do Stop hook falha uma vez e manda o agente de volta. */
const STOP_FAILURES = 1;
const DANGEROUS = "rm -rf";

const calls = turns.flat();
const isBlocked = (call: Call) => call.tool === "Bash" && call.input.includes(DANGEROUS);
const executed = calls.filter((call) => !isBlocked(call));
const events = [
  { id: "SessionStart", count: 1 },
  { id: "UserPromptSubmit", count: turns.length },
  { id: "PreToolUse", count: calls.length },
  { id: "PostToolUse", count: executed.filter((call) => !call.fails).length },
  { id: "PostToolUseFailure", count: executed.filter((call) => call.fails).length },
  { id: "Stop", count: turns.length + STOP_FAILURES },
];
const bashGuardRuns = calls.filter((call) => call.tool === "Bash").length;
const blockedCount = calls.filter(isBlocked).length;
const formatterRuns = executed.filter((call) => (call.tool === "Edit" || call.tool === "Write") && !call.fails).length;
const stopRuns = events[events.length - 1].count;
const largestEvent = Math.max(...events.map((event) => event.count));

const exits = ["sai com 0", "sai com 2", "JSON deny", "JSON ask"];
const exitCols = ["ferramenta roda", "motivo vai ao modelo", "pessoa decide"];
const exitValues = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 1, 0],
  [0.5, 0, 1],
];

const lesson: LessonContent = {
  id: "14-07",
  subtitle: "Os sensores do ciclo do agente: código seu que o harness roda sempre, em momentos exatos, para bloquear, formatar, conferir ou avisar.",
  objectives: [
    "Listar os principais eventos do ciclo de um agente e o que cada um permite",
    "Montar um hook com evento, matcher e comando",
    "Usar o código de saída e a resposta JSON para bloquear ou deixar passar uma ação",
    "Prever quantas vezes cada hook roda numa sessão",
  ],
  steps: [
    {
      id: "lifecycle",
      shortTitle: "O ciclo",
      title: "Os momentos do ciclo",
      tag: "context",
      body: [
        "Um carro moderno tem sensores em momentos certos: ao dar a partida, confere o cinto; antes de trocar de faixa, olha o ponto cego; ao desligar, trava as portas. O motorista não precisa lembrar de nada disso.",
        "O ciclo do agente tem momentos parecidos, os [[eventos do ciclo|lifecycle-event]]: a sessão começa, a pessoa envia um prompt, o modelo pede uma ferramenta, a ferramenta termina, o contexto vai ser compactado, o agente tenta encerrar. Um [[hook|hook]] é um comando seu que o harness roda sozinho num desses momentos, toda vez, sem depender do modelo lembrar.",
      ],
      keyIdea: "Hooks penduram código seu em momentos fixos do loop; o harness os executa sempre.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "loop",
            piece: "agent-loop",
            phases: [
              { id: "start", label: "SessionStart" },
              { id: "prompt", label: "UserPromptSubmit" },
              { id: "pre", label: "PreToolUse" },
              { id: "post", label: "PostToolUse" },
              { id: "stop", label: "Stop" },
            ],
            active: "pre",
            iteration: 1,
            tool: 'Bash("pnpm vitest run")',
          },
        ],
      },
      alt: "Ciclo do agente com os eventos SessionStart, UserPromptSubmit, PreToolUse, em destaque, PostToolUse e Stop; o modelo acaba de pedir a ferramenta Bash para rodar os testes.",
    },
    {
      id: "anatomy",
      shortTitle: "Anatomia",
      title: "Evento, matcher, comando",
      tag: "mechanism",
      body: [
        "Um hook tem três partes: o evento (quando), o matcher (para quais ferramentas) e o comando (o quê). No Claude Code, isso fica em settings.json, na chave hooks: o evento, por exemplo PreToolUse, recebe grupos com um matcher, como Bash ou Edit|Write, e a lista de comandos.",
        "O harness passa ao comando um JSON pela entrada padrão, com o nome da ferramenta e os argumentos pedidos. O [[hook PreToolUse|pre-tool-use-hook]] é o mais poderoso: roda depois de o modelo pedir e antes de a ferramenta executar. Se o comando sai com código 2, a chamada é bloqueada e o texto do stderr volta ao modelo como motivo; com código 0, ela segue para as regras de permissão.",
      ],
      keyIdea: "O PreToolUse vê o pedido antes da execução e pode barrá-lo, devolvendo o motivo ao modelo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "hook-flow",
            piece: "block-diagram",
            blocks: [
              { id: "llm", kind: "llm", label: "modelo", col: 0, row: 0.5 },
              { id: "hook", kind: "guardrail", label: "hook PreToolUse", col: 1, row: 0.5 },
              { id: "perm", kind: "eval", label: "permissões", col: 2, row: 0 },
              { id: "tool", kind: "tool", label: "Bash", col: 3, row: 0 },
              { id: "blocked", kind: "no-result", label: "exit 2", col: 2, row: 1 },
            ],
            edges: [
              { from: "llm", to: "hook", label: "JSON no stdin" },
              { from: "hook", to: "perm", label: "exit 0" },
              { from: "perm", to: "tool" },
              { from: "hook", to: "blocked", label: "bloqueia", variant: "alternative" },
              { from: "blocked", to: "llm", label: "motivo", variant: "alternative" },
            ],
            active: "hook",
            done: ["llm"],
          },
        ],
      },
      alt: "O pedido do modelo chega ao hook PreToolUse, em destaque, como JSON; com saída 0 segue para as permissões e o Bash roda; com saída 2 é bloqueado e o motivo volta ao modelo por um caminho tracejado.",
    },
    {
      id: "answers",
      shortTitle: "Respostas",
      title: "Os jeitos de responder",
      tag: "mechanism",
      body: [
        "O hook pode responder de forma simples, pelo código de saída, ou detalhada, imprimindo um JSON. No PreToolUse do Claude Code, o JSON vai em hookSpecificOutput, com permissionDecision igual a allow, deny, ask ou defer e um permissionDecisionReason.",
        "Duas sutilezas da documentação. Um hook que responde allow não passa por cima das regras de negação e de pergunta: elas continuam valendo. E o código 2 vem antes de tudo: bloqueia mesmo que uma regra de allow deixasse a chamada passar. O hook pode apertar a política, mas não afrouxar o que já foi negado.",
      ],
      keyIdea: "Hooks podem bloquear acima das permissões, mas um allow do hook não fura uma regra de negação.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "exit-matrix",
            piece: "matrix",
            rows: exits,
            cols: exitCols,
            values: exitValues,
            scale: { min: 0, max: 1 },
            highlight: { row: 1, col: 1 },
            color: "module-14",
          },
        ],
      },
      alt: "Matriz de respostas de um hook PreToolUse: sair com 0 deixa seguir para as permissões; sair com 2, em destaque, e JSON deny bloqueiam e mandam o motivo ao modelo; JSON ask leva a decisão para a pessoa.",
    },
    {
      id: "count",
      shortTitle: "A conta",
      title: "Uma sessão contada evento por evento",
      tag: "example",
      body: [
        `Na sessão de brinquedo, a pessoa faz ${turns.length} pedidos e o modelo pede ${calls.length} ferramentas. O guarda em PreToolUse com matcher Bash roda ${bashGuardRuns} vezes e bloqueia ${blockedCount} (o ${DANGEROUS}). O formatador em PostToolUse com matcher Edit|Write roda ${formatterRuns} vezes, uma por edição concluída.`,
        `O typecheck no [[Stop hook|stop-hook]] roda ${stopRuns} vezes: uma por resposta e mais ${STOP_FAILURES} porque falhou uma vez e mandou o agente de volta ao trabalho. Hooks rodam no caminho de toda chamada que casa com o matcher; um hook de 2 segundos em PreToolUse sem matcher somaria ${calls.length * 2} segundos a esta sessão curta.`,
      ],
      keyIdea: "Conte quantas vezes cada evento dispara antes de pendurar algo lento nele.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "events-chart",
            piece: "chart",
            kind: "bar",
            series: events.map((event) => ({ label: event.id, value: event.count })),
            max: largestEvent,
            highlight: 2,
            color: "module-14",
          },
          {
            id: "hook-runs",
            piece: "metrics-panel",
            metrics: [
              { id: "guard", label: "guarda Bash", value: `${bashGuardRuns} execuções, ${blockedCount} bloqueio` },
              { id: "format", label: "formatador Edit|Write", value: `${formatterRuns} execuções` },
              { id: "stop", label: "typecheck no Stop", value: `${stopRuns} execuções`, color: "success" },
            ],
            highlight: "guard",
          },
        ],
      },
      alt: `Barras de quantas vezes cada evento disparou: ${events.map((event) => `${event.id} ${event.count}`).join(", ")}. O guarda de Bash rodou ${bashGuardRuns} vezes e bloqueou ${blockedCount}; o formatador rodou ${formatterRuns}; o typecheck no Stop rodou ${stopRuns}.`,
    },
    {
      id: "stop",
      shortTitle: "Stop hook",
      title: "Não deixar terminar antes da hora",
      tag: "tradeoff",
      body: [
        "Um agente para quando o trabalho parece pronto. Um Stop hook transforma “parece” em “está”: quando o agente tenta encerrar, o harness roda o typecheck; se ele falha, o hook sai com código 2, o erro vai ao modelo e o agente continua. A documentação do Claude Code mostra exatamente isso com pnpm tsc --noEmit 1>&2 || exit 2.",
        "O custo: hooks são código que roda com as suas permissões, fora do modelo, então pedem revisão como qualquer script. Hooks lentos atrasam cada evento, e um Stop hook que nunca passa prenderia o agente; por isso o Claude Code encerra o turno depois de um número de bloqueios seguidos. Hook é para regra sem exceção, não para preferência.",
      ],
      keyIdea: "O Stop hook só deixa o agente terminar quando a checagem passa; use-o para o que não pode ficar para depois.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "hook-flow",
            piece: "block-diagram",
            blocks: [
              { id: "agent", kind: "agent", label: "agente", col: 0, row: 0.5 },
              { id: "hook", kind: "guardrail", label: "Stop hook", col: 1, row: 0.5 },
              { id: "check", kind: "eval", label: "tsc --noEmit", col: 2, row: 0.5 },
              { id: "done", kind: "answer", label: "fim do turno", col: 3, row: 0 },
              { id: "back", kind: "no-result", label: "erros de tipo", col: 3, row: 1 },
            ],
            edges: [
              { from: "agent", to: "hook", label: "quer parar" },
              { from: "hook", to: "check" },
              { from: "check", to: "done", label: "passou" },
              { from: "check", to: "back", label: "exit 2", variant: "alternative" },
              { from: "back", to: "agent", label: "continua", variant: "alternative" },
            ],
            active: "check",
            done: ["agent", "hook"],
          },
        ],
      },
      alt: "Quando o agente quer parar, o Stop hook roda tsc --noEmit, em destaque; se passa, o turno termina; se falha, sai com código 2 e os erros de tipo mandam o agente continuar.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Uma necessidade, um evento",
      tag: "summary",
      body: [
        "Escolha o evento pela necessidade: barrar uma ação perigosa é PreToolUse; formatar ou registrar depois de editar é PostToolUse; injetar contexto no início é SessionStart; exigir uma checagem antes de terminar é Stop. O matcher limita o hook às ferramentas certas, e o código de saída diz ao harness o que fazer.",
        "Hooks barram casos específicos. Para definir de forma geral o que o agente pode ou não fazer, o harness tem as permissões, o assunto da próxima aula.",
      ],
      keyIdea: "Hooks são o jeito de dizer “sempre que X acontecer, faça Y” e ter certeza de que acontece.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "needs",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "start", label: "contexto inicial: SessionStart" },
              { id: "pre", label: "barrar: PreToolUse", color: "module-14" },
              { id: "post", label: "formatar: PostToolUse" },
              { id: "compact", label: "salvar antes de resumir: PreCompact" },
              { id: "stop", label: "checar antes de terminar: Stop", color: "module-14" },
            ],
          },
        ],
      },
      alt: "Chips que ligam cada necessidade a um evento: contexto inicial em SessionStart, barrar em PreToolUse, formatar em PostToolUse, salvar antes de resumir em PreCompact e checar antes de terminar em Stop.",
    },
  ],
  realWorldExample:
    "A página de boas práticas do Claude Code mostra um Stop hook de poucas linhas em .claude/settings.json que roda pnpm tsc --noEmit e sai com código 2 quando há erros: em vez de terminar, o agente recebe os erros do compilador e continua até o typecheck passar. Para regras como “não toque na pasta migrations/”, ela sugere um hook PreToolUse que sai com código 2 para qualquer caminho nessa pasta.",
  code: {
    language: "json",
    source: `{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "\${CLAUDE_PROJECT_DIR}/.claude/hooks/protect-migrations.sh" }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          { "type": "command", "command": "pnpm tsc --noEmit 1>&2 || exit 2" }
        ]
      }
    ]
  }
}`,
    caption: "Hooks do Claude Code em .claude/settings.json: um script barra edições em migrations antes de rodarem, e o typecheck impede o agente de terminar com erros de tipo.",
  },
  tradeOffs: {
    pros: [
      "Executam sempre, independentemente do que o modelo decidiu",
      "Devolvem o motivo ao modelo, que pode corrigir o rumo",
      "Encaixam checagens do projeto (formatador, testes, auditoria) no ciclo do agente",
    ],
    cons: [
      "São código com as suas permissões: um hook ruim é um risco",
      "Rodam em cada evento que casa com o matcher e somam latência",
      "Regras rígidas demais travam o agente em casos legítimos",
    ],
    alternatives: ["Regras de permissão, para negar ferramentas ou caminhos de forma geral", "Instruções no CLAUDE.md, para preferências com exceções"],
  },
  knowledgeCheck: [
    {
      id: "which-event",
      prompt: "Você quer que o agente nunca termine um turno com testes quebrados. Qual evento usar?",
      options: ["SessionStart", "PreToolUse", "PostToolUse", "Stop"],
      correct: 3,
      explanation: "O Stop dispara quando o agente tenta encerrar. Um hook ali roda os testes e, se falharem, sai com código 2 e manda o agente continuar.",
      lesson: "14-07",
    },
    {
      id: "matcher-count",
      prompt: "Numa sessão com 40 chamadas de ferramenta, 12 são Edit ou Write. Quantas vezes roda um hook PostToolUse com matcher Edit|Write, se todas as edições terminarem bem?",
      options: ["1", "12", "28", "40"],
      correct: 1,
      explanation: "O matcher limita o hook às ferramentas que casam. PostToolUse dispara depois de cada chamada bem-sucedida, então ele roda uma vez por edição: 12.",
      lesson: "14-07",
    },
  ],
  related: ["14-06", "14-08", "12-04"],
  references: [
    { title: "Documentação do Claude Code: Hooks reference", url: "https://code.claude.com/docs/en/hooks", kind: "docs" },
    { title: "Documentação do Claude Code: Hooks guide", url: "https://code.claude.com/docs/en/hooks-guide", kind: "docs" },
    { title: "Claude Code: Best practices", url: "https://code.claude.com/docs/en/best-practices", kind: "docs" },
  ],
};

export default lesson;
