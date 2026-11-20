import type { LessonContent } from "../../../types/content";

// Planejamento com contas no arquivo: a feature "exportar e importar o progresso em JSON" (uma história real
// da spec deste site) quebrada em seis tarefas de brinquedo, com horas e dependências. O caminho crítico sai
// do caminho mais longo no grafo; as ondas de trabalho paralelo saem da profundidade de cada tarefa. O
// formato de cada tarefa copia o tasks.md da plataforma (T13, do roteador, é real).

const hours = (value: number) => `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`;
const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

interface PlanTask {
  id: string;
  label: string;
  hours: number;
  after: string[];
}

const plan: PlanTask[] = [
  { id: "t1", label: "T1 schema", hours: 2, after: [] },
  { id: "t5", label: "T5 mensagens", hours: 1, after: [] },
  { id: "t2", label: "T2 exportar", hours: 3, after: ["t1"] },
  { id: "t3", label: "T3 importar", hours: 4, after: ["t1"] },
  { id: "t4", label: "T4 menu", hours: 2, after: ["t2"] },
  { id: "t6", label: "T6 teste do fluxo", hours: 2, after: ["t3", "t4", "t5"] },
];
const byId = new Map(plan.map((task) => [task.id, task]));
const labelOf = (id: string) => byId.get(id)?.label ?? id;

const finish = new Map<string, { time: number; via: string | null }>();
const depth = new Map<string, number>();
for (const task of plan) {
  const previous = task.after
    .map((id) => ({ id, time: finish.get(id)?.time ?? 0 }))
    .sort((a, b) => b.time - a.time)[0];
  finish.set(task.id, { time: (previous?.time ?? 0) + task.hours, via: previous?.id ?? null });
  depth.set(task.id, Math.max(0, ...task.after.map((id) => (depth.get(id) ?? 0) + 1)));
}
const lastTask = plan[plan.length - 1];
const criticalPath: string[] = [];
for (let cursor: string | null = lastTask.id; cursor; cursor = finish.get(cursor)?.via ?? null) criticalPath.unshift(cursor);
const criticalHours = finish.get(lastTask.id)?.time ?? 0;
const sequentialHours = plan.reduce((sum, task) => sum + task.hours, 0);
const speedup = sequentialHours / criticalHours;

const waveCount = Math.max(...plan.map((task) => depth.get(task.id) ?? 0)) + 1;
const waves = Array.from({ length: waveCount }, (_, wave) => plan.filter((task) => depth.get(task.id) === wave));
const waveSeries = waves.map((tasks, wave) => ({ label: `onda ${wave + 1}`, value: tasks.length }));
const widest = Math.max(...waves.map((tasks) => tasks.length));

const positions: Record<string, { x: number; y: number }> = {
  t1: { x: 0.08, y: 0.35 },
  t5: { x: 0.08, y: 0.85 },
  t2: { x: 0.38, y: 0.15 },
  t3: { x: 0.38, y: 0.6 },
  t4: { x: 0.66, y: 0.15 },
  t6: { x: 0.92, y: 0.6 },
};
const graphNodes = plan.map((task) => ({ id: task.id, label: `${task.label} · ${hours(task.hours)}`, ...positions[task.id] }));
const graphEdges = plan.flatMap((task) => task.after.map((from) => ({ from, to: task.id })));

const taskFields = [
  { id: "what", label: "o quê" },
  { id: "where", label: "onde" },
  { id: "depends", label: "depende de" },
  { id: "reuses", label: "reusa" },
  { id: "requirement", label: "requisito" },
  { id: "done", label: "pronto quando" },
  { id: "commit", label: "commit" },
];

const lesson: LessonContent = {
  id: "15-05",
  subtitle: "Como um agente transforma a spec em tarefas pequenas, com dependências e critério de pronto, e por que o plano vem antes do código.",
  objectives: [
    "Pedir ao agente um plano revisável antes de qualquer edição",
    "Escrever tarefas com escopo, dependências, requisito e critério de pronto",
    "Calcular o caminho crítico e as ondas de tarefas paralelas",
    "Decidir quando replanejar no meio da execução",
  ],
  steps: [
    {
      id: "plan-first",
      shortTitle: "Plano",
      title: "Plano antes do código",
      tag: "context",
      body: [
        "Numa mudança de casa, ninguém começa carregando o sofá. Primeiro vem a lista: desmontar a cama, embalar a cozinha, contratar o caminhão, e a ordem certa entre elas. Se a lista está errada, é barato corrigir no papel; no meio da escada com o sofá, não.",
        "Com agentes vale o mesmo. É o padrão [[plan-and-execute|plan-and-execute]] do módulo 12 aplicado a código: o agente lê a spec e o repositório e escreve a [[quebra em tarefas|task-breakdown]] sem editar nada. Você revisa o plano, que é curto, antes de revisar o código, que é longo. Esse ponto de revisão é um [[approval gate|approval-gate]] barato: corrigir um plano custa minutos.",
      ],
      keyIdea: "Revise o plano, que tem dez linhas, antes de revisar o código, que tem mil.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "spec", kind: "documents", label: "spec", col: 0, row: 0.5 },
              { id: "planner", kind: "agent", label: "planejador", col: 1, row: 0.5 },
              { id: "tasks", kind: "documents", label: "tasks.md", col: 2, row: 0 },
              { id: "dev", kind: "user", label: "você aprova", col: 2, row: 1 },
              { id: "executor", kind: "agent", label: "executor", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "spec", to: "planner", label: "lê" },
              { from: "planner", to: "tasks", label: "escreve" },
              { from: "tasks", to: "dev", label: "revisa" },
              { from: "dev", to: "executor", label: "aprovado" },
            ],
            active: "tasks",
          },
        ],
      },
      alt: "O planejador lê a spec e escreve o tasks.md, em destaque; você revisa e aprova, e só então o executor começa a editar.",
    },
    {
      id: "anatomy",
      shortTitle: "Anatomia",
      title: "O que uma tarefa precisa dizer",
      tag: "mechanism",
      body: [
        "Uma tarefa boa é uma ordem de serviço que outra pessoa conseguiria executar sem perguntar nada. A T13 do tasks.md deste site é um exemplo: o quê (parse e build de rotas), onde (src/lib/router.ts), depende de (nenhuma), reusa (o catálogo), requisito (NAV-01.3, NAV-01.4, LES-01.10, LES-01.11), pronto quando (os testes cobrem passo ausente, zero, negativo, não numérico e maior que N) e a mensagem de commit.",
        "O campo mais importante é a [[definição de pronto|definition-of-done]]. Sem ela, o agente para quando acha que terminou. Com ela, para quando um comando passa. O tamanho também importa: o guia de revisão do Google diz que cerca de 100 linhas costuma ser uma mudança de tamanho razoável e 1.000 costuma ser grande demais. Uma tarefa deve caber numa sessão do agente e numa revisão humana.",
      ],
      keyIdea: "Cada tarefa diz onde mexer, o que reusar, qual critério cumpre e qual comando prova que acabou.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "fields",
            piece: "pipeline",
            display: "chips",
            stages: taskFields.map((field) => (field.id === "done" ? { ...field, color: "module-15" as const } : field)),
            active: "done",
            done: taskFields.slice(0, 5).map((field) => field.id),
          },
        ],
      },
      alt: `Os campos de uma tarefa, em ordem: ${taskFields.map((field) => field.label).join(", ")}. Pronto quando está em destaque.`,
    },
    {
      id: "graph",
      shortTitle: "Grafo",
      title: "Dependências viram um grafo",
      tag: "mechanism",
      body: [
        `A feature de exportar e importar o progresso em JSON virou ${plan.length} tarefas. Algumas dependem de outras: exportar e importar precisam do schema; o teste do fluxo precisa de tudo. Escrever “depende de” em cada tarefa transforma a lista num grafo.`,
        `O [[caminho crítico|critical-path]] é a corrente de dependências mais longa: ${criticalPath.map(labelOf).join(" → ")}, com ${hours(criticalHours)}. Nenhuma quantidade de agentes em paralelo termina a feature antes disso. A [[decomposição|task-decomposition]] boa encurta esse caminho, não só o total.`,
      ],
      keyIdea: "O caminho crítico é o prazo mínimo; paralelizar fora dele não adianta.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "dag",
            piece: "graph",
            nodes: graphNodes,
            edges: graphEdges,
            path: criticalPath,
            highlight: [lastTask.id],
          },
        ],
      },
      alt: `Grafo das ${plan.length} tarefas com as dependências. O caminho crítico em destaque é ${criticalPath.map(labelOf).join(", ")}, com ${hours(criticalHours)}.`,
    },
    {
      id: "waves",
      shortTitle: "Ondas",
      title: "Ondas de tarefas paralelas",
      tag: "example",
      body: [
        `Tarefas sem dependência entre si podem ir para [[subagentes|subagent]] diferentes ao mesmo tempo. Agrupando por profundidade no grafo, saem ${waves.length} ondas: ${waves.map((tasks, wave) => `onda ${wave + 1} com ${tasks.map((task) => task.label).join(" e ")}`).join("; ")}.`,
        `Em sequência, a feature leva ${hours(sequentialHours)}. Com as ondas em paralelo, leva o caminho crítico, ${hours(criticalHours)}: ${fixed(speedup)}× mais rápido, com no máximo ${widest} agentes ao mesmo tempo. Na prática, cada agente paralelo precisa da própria cópia do repositório, e alguém revisa o que cada um entregou.`,
      ],
      keyIdea: "Paralelismo útil = tarefas independentes no grafo, cada uma com o seu espaço de trabalho.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "waves-metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "sequential", label: "em sequência", value: hours(sequentialHours) },
              { id: "critical", label: "caminho crítico", value: hours(criticalHours), color: "module-15" },
              { id: "speedup", label: "ganho", value: `${fixed(speedup)}×`, color: "success" },
              { id: "agents", label: "agentes no pico", value: String(widest) },
            ],
            highlight: "critical",
          },
          {
            id: "waves",
            piece: "chart",
            kind: "bar",
            series: waveSeries,
            highlight: 0,
            color: "module-15",
          },
        ],
      },
      alt: `Em sequência, ${hours(sequentialHours)}; pelo caminho crítico, ${hours(criticalHours)}, um ganho de ${fixed(speedup)}× com até ${widest} agentes. Tarefas por onda: ${waveSeries.map((item) => `${item.label}, ${item.value}`).join("; ")}.`,
    },
    {
      id: "replan",
      shortTitle: "Replanejar",
      title: "O plano erra, e tudo bem",
      tag: "tradeoff",
      body: [
        "Na mudança, você descobre que o sofá não passa pela porta. Insistir no plano é pior do que refazê-lo. Quando uma tarefa revela algo que a spec não previa (a API de download não existe no navegador alvo, o schema antigo precisa de migração), o agente para e volta ao plano.",
        "Isso é [[replanejamento|replanning]], e a regra prática é simples: falha dentro da tarefa, o agente tenta corrigir; falha que muda dependências ou critérios, volta para o plano e para você. Plano de mais também custa: detalhar 40 tarefas antes de entender o código gera um plano que vai ser jogado fora.",
      ],
      keyIdea: "Replaneje quando a falha muda o grafo; corrija dentro da tarefa quando não muda.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "tasks", kind: "documents", label: "tasks.md", col: 0, row: 0.5 },
              { id: "executor", kind: "agent", label: "executor", col: 1, row: 0.5 },
              { id: "tests", kind: "eval", label: "pronto quando", col: 2, row: 0.5 },
              { id: "planner", kind: "agent", label: "planejador", col: 2, row: 1 },
              { id: "repo", kind: "server", label: "repositório", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "tasks", to: "executor", label: "T3" },
              { from: "executor", to: "tests", label: "roda" },
              { from: "tests", to: "repo", label: "verde" },
              { from: "tests", to: "planner", label: "muda o grafo", variant: "alternative" },
              { from: "planner", to: "tasks", label: "replaneja", variant: "alternative" },
            ],
            active: "planner",
            done: ["tasks", "executor", "tests"],
          },
        ],
      },
      alt: "O executor pega a tarefa T3 e roda o critério de pronto. Se passa, vai ao repositório; se a falha muda o grafo, um caminho tracejado leva ao planejador, em destaque, que reescreve o tasks.md.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Um grafo de tarefas verificáveis",
      tag: "summary",
      body: [
        "O plano é um grafo: cada nó é uma tarefa pequena com onde mexer, o que reusar, qual critério cumpre e qual comando prova que acabou; cada aresta é uma dependência. O caminho crítico dá o prazo mínimo e as ondas mostram o que pode rodar em paralelo.",
        "Antes de quebrar em tarefas, alguém precisa decidir a forma do sistema: módulos, dados, fronteiras. É o tema da próxima aula, arquitetura e design.",
      ],
      keyIdea: "Planejar = grafo de tarefas pequenas, cada uma com critério de pronto executável.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "dag",
            piece: "graph",
            nodes: graphNodes,
            edges: graphEdges,
            path: criticalPath,
            visited: plan.map((task) => task.id),
            highlight: [lastTask.id],
          },
        ],
      },
      alt: `O grafo completo, com as ${plan.length} tarefas concluídas e o caminho crítico ${criticalPath.map(labelOf).join(", ")} em destaque.`,
    },
  ],
  realWorldExample:
    "O Claude Code tem um modo de planejamento em que o agente só lê o código e propõe o plano, sem editar arquivos, até você aprovar. O tasks.md deste site seguiu o mesmo formato em cada uma das tarefas da plataforma: o quê, onde, depende de, reusa, requisito, pronto quando e mensagem de commit. A T13, do roteador, cita os critérios NAV-01.3, NAV-01.4, LES-01.10 e LES-01.11 e lista os casos de teste que provam que ela acabou.",
  code: {
    language: "json",
    source: `{
  "id": "T13",
  "what": "parseRoute e buildPath para home, lesson, practice, lab, summaries e not-found",
  "where": "src/lib/router.ts",
  "dependsOn": [],
  "reuses": ["catalog"],
  "requirements": ["NAV-01.3", "NAV-01.4", "LES-01.10", "LES-01.11"],
  "doneWhen": ["router.test.ts cobre passo ausente, 0, negativo, não numérico e > N", "npm test passa"],
  "commit": "feat(router): parse and build typed routes"
}`,
    caption: "A T13 do tasks.md deste site como dado estruturado: um agente executor recebe exatamente isto e sabe onde mexer e como provar que terminou.",
  },
  tradeOffs: {
    pros: [
      "Corrigir um plano custa minutos; corrigir o código errado custa horas",
      "Tarefas pequenas cabem numa sessão do agente e numa revisão humana",
      "O grafo mostra o caminho crítico e o que pode rodar em paralelo",
    ],
    cons: [
      "Planejar demais antes de entender o código gera um plano descartável",
      "Dependências esquecidas aparecem só na execução, e forçam replanejamento",
      "Paralelizar exige cópias isoladas do repositório e mais revisão",
    ],
    alternatives: [
      "Uma tarefa só, sem plano, para mudanças pequenas e locais",
      "Planejar só a próxima onda e replanejar a cada uma",
    ],
  },
  knowledgeCheck: [
    {
      id: "critical-path",
      prompt: "Tarefas: A (3 h), B (2 h) e C (4 h), todas sem dependência; D (1 h) depende de A, B e C. Com agentes ilimitados em paralelo, qual o tempo mínimo?",
      options: ["1 h", "4 h", "5 h", "10 h"],
      correct: 2,
      explanation: "O caminho crítico é C → D: 4 h + 1 h = 5 h. A e B terminam antes de C e não atrasam nada.",
      lesson: "15-05",
    },
    {
      id: "done-when",
      prompt: "Qual “pronto quando” deixa um agente parar no momento certo?",
      options: [
        "Quando o código estiver limpo",
        "Quando a feature funcionar",
        "Quando npm test passar com os casos de importação de arquivo válido, inválido e de versão antiga",
        "Quando o agente achar que terminou",
      ],
      correct: 2,
      explanation: "Só a terceira é um comando com casos definidos. As outras dependem da opinião de quem executa.",
      lesson: "15-05",
    },
  ],
  related: ["15-04", "15-06", "12-06"],
  references: [
    { title: "Google Engineering Practices: Small CLs", url: "https://google.github.io/eng-practices/review/developer/small-cls.html", kind: "docs" },
    { title: "Anthropic: Building effective agents", url: "https://www.anthropic.com/engineering/building-effective-agents", kind: "article" },
    { title: "GitHub Spec Kit", url: "https://github.com/github/spec-kit", kind: "repo" },
  ],
};

export default lesson;
