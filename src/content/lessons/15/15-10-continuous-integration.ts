import type { LessonContent } from "../../../types/content";

// Integração contínua com contas no arquivo. Os jobs de brinquedo têm minutos fixos e dependências (o
// `needs` do GitHub Actions); o tempo de parede é o caminho crítico do grafo, e os minutos de máquina são a
// soma de todos os jobs e shards. Um shard divide os testes de um job e repete o setup. A chance de um build
// vermelho sem bug real supõe testes instáveis independentes, cada um falhando com probabilidade f.

const minutes = (value: number) => `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} min`;
const percent = (value: number) => `${(value * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

interface Job {
  id: string;
  label: string;
  setup: number;
  work: number;
  needs: string[];
}

const jobs: Job[] = [
  { id: "lint", label: "lint", setup: 1, work: 2, needs: [] },
  { id: "typecheck", label: "typecheck", setup: 1, work: 2, needs: [] },
  { id: "unit", label: "testes unitários", setup: 1, work: 8, needs: [] },
  { id: "build", label: "build", setup: 1, work: 2, needs: ["typecheck"] },
  { id: "e2e", label: "testes e2e", setup: 1, work: 8, needs: ["build"] },
];
const labelOf = (id: string) => jobs.find((job) => job.id === id)?.label ?? id;

type Shards = Partial<Record<string, number>>;
const duration = (job: Job, shards: Shards) => job.setup + job.work / (shards[job.id] ?? 1);

const schedule = (shards: Shards) => {
  const finish = new Map<string, { time: number; via: string | null }>();
  for (const job of jobs) {
    const previous = job.needs.map((id) => ({ id, time: finish.get(id)?.time ?? 0 })).sort((a, b) => b.time - a.time)[0];
    finish.set(job.id, { time: (previous?.time ?? 0) + duration(job, shards), via: previous?.id ?? null });
  }
  const [lastId, last] = [...finish.entries()].sort((a, b) => b[1].time - a[1].time)[0];
  const path: string[] = [];
  for (let cursor: string | null = lastId; cursor; cursor = finish.get(cursor)?.via ?? null) path.unshift(cursor);
  const machine = jobs.reduce((sum, job) => sum + duration(job, shards) * (shards[job.id] ?? 1), 0);
  return { wall: last.time, path, machine };
};

const SHARDS = 4;
const TARGET = 10;
const oneJob = jobs.reduce((sum, job) => sum + job.setup + job.work, 0) - (jobs.length - 1);
const parallel = schedule({});
const shardUnit = schedule({ unit: SHARDS });
const shardE2e = schedule({ e2e: SHARDS });
const scenarios = [
  { label: "um job só", value: oneJob },
  { label: "jobs em paralelo", value: parallel.wall },
  { label: `unit em ${SHARDS} shards`, value: shardUnit.wall },
  { label: `e2e em ${SHARDS} shards`, value: shardE2e.wall },
];

const positions: Record<string, { x: number; y: number }> = {
  lint: { x: 0.12, y: 0.12 },
  unit: { x: 0.12, y: 0.5 },
  typecheck: { x: 0.12, y: 0.88 },
  build: { x: 0.5, y: 0.88 },
  e2e: { x: 0.88, y: 0.88 },
};
const graphFor = (shards: Shards) => ({
  nodes: jobs.map((job) => ({ id: job.id, label: `${job.label} · ${minutes(duration(job, shards))}`, ...positions[job.id] })),
  edges: jobs.flatMap((job) => job.needs.map((from) => ({ from, to: job.id }))),
});
const parallelGraph = graphFor({});

// Testes instáveis.
const FLAKE_RATE = 0.001;
const suiteSizes = [100, 500, 1000, 2000, 5000];
const falseRed = (tests: number, rate: number) => 1 - (1 - rate) ** tests;
const flakySeries = suiteSizes.map((tests) => ({ label: `${tests.toLocaleString("pt-BR")} testes`, value: Number(falseRed(tests, FLAKE_RATE).toFixed(3)) }));
const SUITE = 2000;
const withRetry = falseRed(SUITE, FLAKE_RATE ** 2);

const lesson: LessonContent = {
  id: "15-10",
  subtitle: "Integrar pequeno e muitas vezes, com uma máquina que constrói e testa cada mudança, e o que torna esse ciclo rápido e confiável.",
  objectives: [
    "Explicar por que integrar todo dia reduz o custo de juntar código",
    "Montar um pipeline de CI com jobs paralelos e dependências",
    "Calcular o tempo do pipeline pelo caminho crítico e decidir onde dividir os testes",
    "Calcular o efeito de testes instáveis e tratar a causa, não o sintoma",
  ],
  steps: [
    {
      id: "integrate",
      shortTitle: "Integrar",
      title: "Juntar pouco e sempre",
      tag: "context",
      body: [
        "Dois amigos escrevem um livro a quatro mãos. Se cada um escreve sozinho por três meses, juntar os capítulos vira uma guerra: personagens com nomes diferentes, a mesma cena contada duas vezes. Se juntam o texto todo dia, cada conflito é pequeno e resolvido na hora.",
        "[[Integração contínua|continuous-integration]] é juntar o código de todos na linha principal pelo menos uma vez por dia, com um build automático que compila e testa cada mudança. Martin Fowler resume as regras: todo mundo integra todo dia, o build se testa sozinho, build quebrado é a prioridade número um, e o build precisa ser rápido. Com agentes abrindo vários pull requests por dia, o CI é a primeira coisa que olha cada um.",
      ],
      keyIdea: "Integrar pouco e sempre troca uma fusão dolorosa por muitas pequenas e baratas.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "dev", kind: "laptop", label: "dev", col: 0, row: 0 },
              { id: "agent", kind: "agent", label: "agente", col: 0, row: 1 },
              { id: "queue", kind: "queue", label: "pushes", col: 1, row: 0.5 },
              { id: "ci", kind: "server", label: "ci", col: 2, row: 0.5 },
              { id: "checks", kind: "eval", label: "checks", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "dev", to: "queue", label: "push" },
              { from: "agent", to: "queue", label: "push" },
              { from: "queue", to: "ci", label: "cada mudança" },
              { from: "ci", to: "checks", label: "build + testes" },
            ],
            active: "ci",
          },
        ],
      },
      alt: "Um desenvolvedor e um agente enviam mudanças para uma fila de pushes; o servidor de CI, em destaque, pega cada mudança, faz o build e roda os testes, e publica os checks.",
    },
    {
      id: "pipeline",
      shortTitle: "Pipeline",
      title: "As etapas de um pipeline",
      tag: "mechanism",
      body: [
        "Uma linha de montagem confere a peça em estações, da mais barata para a mais cara: se a medida está errada, nem chega à pintura. O [[pipeline de CI|ci-pipeline]] faz o mesmo: baixar o código, instalar dependências, lint, checagem de tipos, testes, build.",
        "A ordem importa porque falhar cedo é barato: um erro de lint aparece em segundos e poupa os minutos dos testes. No GitHub Actions, cada push ou pull request dispara um workflow, escrito em YAML no próprio repositório, com jobs e passos. O resultado aparece no pull request como checks verdes ou vermelhos.",
      ],
      keyIdea: "Etapas baratas primeiro: cada uma barra o erro antes de gastar a próxima.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "pipeline",
            piece: "pipeline",
            stages: [
              { id: "checkout", label: "checkout" },
              { id: "install", label: "instalar" },
              { id: "lint", label: "lint" },
              { id: "types", label: "tipos" },
              { id: "test", label: "testes", color: "module-15" },
              { id: "build", label: "build" },
            ],
            active: "test",
            done: ["checkout", "install", "lint", "types"],
          },
        ],
      },
      alt: "Pipeline de CI em seis etapas: checkout, instalar, lint, tipos, testes, em destaque, e build.",
    },
    {
      id: "parallel",
      shortTitle: "Paralelo",
      title: "Jobs em paralelo e o caminho crítico",
      tag: "mechanism",
      body: [
        "Não precisa esperar o lint para começar os testes: as estações independentes podem trabalhar ao mesmo tempo. No GitHub Actions, os jobs de um workflow rodam em paralelo por padrão, e a palavra-chave needs cria a dependência quando um job precisa do resultado de outro, como o e2e que precisa do build.",
        `Com os jobs da cena em paralelo, o tempo de parede é o [[caminho crítico|critical-path]]: ${parallel.path.map(labelOf).join(" → ")}, com ${minutes(parallel.wall)}. Os testes unitários, com ${minutes(duration(jobs[2], {}))}, rodam ao lado e não atrasam nada.`,
      ],
      keyIdea: "Em paralelo, o pipeline dura o caminho crítico; o resto roda “de graça” ao lado.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "jobs",
            piece: "graph",
            nodes: parallelGraph.nodes,
            edges: parallelGraph.edges,
            path: parallel.path,
            highlight: [parallel.path[parallel.path.length - 1]],
          },
        ],
      },
      alt: `Grafo dos jobs: lint, testes unitários e typecheck começam juntos; build depende de typecheck e e2e depende de build. O caminho crítico em destaque é ${parallel.path.map(labelOf).join(", ")}, com ${minutes(parallel.wall)}.`,
    },
    {
      id: "shards",
      shortTitle: "Shards",
      title: "Dividir os testes onde importa",
      tag: "example",
      body: [
        `Fowler cita a regra do XP de um build de dez minutos. Num job só, o pipeline da cena leva ${minutes(oneJob)}; em paralelo, ${minutes(parallel.wall)}. O [[sharding de testes|test-sharding]] divide uma suíte em partes que rodam em máquinas diferentes. Dividir os unitários em ${SHARDS} não muda nada: ${minutes(shardUnit.wall)}, porque eles não estão no caminho crítico.`,
        `Dividir os e2e em ${SHARDS} derruba o pipeline para ${minutes(shardE2e.wall)}, dentro da meta de ${TARGET}. O preço aparece nos minutos de máquina: cada shard repete o setup, e a conta sobe de ${minutes(parallel.machine)} para ${minutes(shardE2e.machine)}. Paralelismo compra tempo de parede com tempo de máquina.`,
      ],
      keyIdea: "Divida o que está no caminho crítico; o resto só gasta máquina.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "machine",
            piece: "metrics-panel",
            metrics: [
              { id: "wall", label: "parede, e2e em shards", value: minutes(shardE2e.wall), color: "success" },
              { id: "machine-before", label: "máquina, paralelo", value: minutes(parallel.machine) },
              { id: "machine-after", label: "máquina, com shards", value: minutes(shardE2e.machine), color: "danger" },
            ],
            highlight: "wall",
          },
          {
            id: "scenarios",
            piece: "chart",
            kind: "bar",
            series: scenarios,
            highlight: scenarios.length - 1,
            color: "module-15",
          },
        ],
      },
      alt: `Tempo de parede do pipeline por cenário: ${scenarios.map((item) => `${item.label}, ${minutes(item.value)}`).join("; ")}. Só dividir os e2e fica dentro de ${TARGET} minutos, e os minutos de máquina sobem de ${minutes(parallel.machine)} para ${minutes(shardE2e.machine)}.`,
    },
    {
      id: "flaky",
      shortTitle: "Instáveis",
      title: "Um teste instável contamina o build inteiro",
      tag: "tradeoff",
      body: [
        `Um [[teste instável|flaky-test]] passa e falha sem mudança no código: depende de horário, de ordem, de rede. Um só incomoda pouco. Mas com ${percent(FLAKE_RATE)} de chance de falha por teste, uma suíte de ${SUITE.toLocaleString("pt-BR")} testes fica vermelha sem bug real em ${percent(falseRed(SUITE, FLAKE_RATE))} das execuções: 1 − (1 − f)^n. A equipe aprende a ignorar o vermelho, e aí o vermelho de verdade passa.`,
        `Um [[retry|retry]] automático de cada teste que falha derruba a conta para ${percent(withRetry)}, porque a falha precisa se repetir. Funciona como curativo, mas esconde bugs intermitentes reais, como uma corrida entre threads. O tratamento de verdade é medir a instabilidade de cada teste, pôr os piores em quarentena e corrigir a causa.`,
      ],
      keyIdea: "Instabilidade pequena por teste vira vermelho constante na suíte; trate a causa.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "flaky-metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "rate", label: "f por teste", value: percent(FLAKE_RATE) },
              { id: "red", label: `vermelho falso, ${SUITE.toLocaleString("pt-BR")} testes`, value: percent(falseRed(SUITE, FLAKE_RATE)), color: "danger" },
              { id: "retry", label: "com 1 retry", value: percent(withRetry), color: "success" },
            ],
            highlight: "red",
          },
          {
            id: "flaky",
            piece: "chart",
            kind: "line",
            series: flakySeries,
            max: 1,
            highlight: suiteSizes.indexOf(SUITE),
            color: "danger",
          },
        ],
      },
      alt: `Chance de um build vermelho sem bug real, com ${percent(FLAKE_RATE)} de instabilidade por teste: ${flakySeries.map((item) => `${item.label}, ${percent(item.value)}`).join("; ")}. Com um retry por teste, ${SUITE.toLocaleString("pt-BR")} testes ficam em ${percent(withRetry)}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "O portão antes da main",
      tag: "summary",
      body: [
        "O CI vira um [[quality gate|quality-gate]] quando o resultado dele é obrigatório: a regra de proteção da branch principal só deixa fazer merge com os checks verdes. Para um agente, o vermelho é a melhor observação possível: diz o que falhou, onde e com qual mensagem.",
        "Juntando spec, plano, testes, revisão e CI, falta montar o fluxo inteiro em que agentes trabalham em paralelo. É o tema da próxima aula.",
      ],
      keyIdea: "CI = cada mudança construída e testada em minutos, com o verde como condição de merge.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "agent", kind: "agent", label: "agente", col: 0, row: 0.5 },
              { id: "ci", kind: "server", label: "ci", col: 1, row: 0.5 },
              { id: "gate", kind: "guardrail", label: "quality gate", col: 2, row: 0.5 },
              { id: "main", kind: "server", label: "main", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "agent", to: "ci", label: "pull request" },
              { from: "ci", to: "gate", label: `${minutes(shardE2e.wall)}` },
              { from: "gate", to: "main", label: "verde" },
              { from: "gate", to: "agent", label: "vermelho + log", variant: "alternative" },
            ],
            active: "gate",
            done: ["agent", "ci"],
          },
        ],
      },
      alt: `O agente abre um pull request, o CI roda em ${minutes(shardE2e.wall)} e o quality gate, em destaque, só deixa chegar à main o que ficou verde. O vermelho volta ao agente com o log, num caminho tracejado.`,
    },
  ],
  realWorldExample:
    "No GitHub Actions, um workflow em .github/workflows/ dispara a cada push e pull request; os jobs rodam em paralelo por padrão e needs cria as dependências. As regras de proteção de branch transformam os checks em quality gate: o botão de merge só libera com os checks marcados como obrigatórios verdes. Este site ainda não tem workflow de CI, mas o gate de fim de fase do tasks.md é o mesmo trio que um workflow rodaria: lint com oxlint, build com tsc -b e testes com vitest.",
  code: {
    language: "bash",
    source: `mkdir -p .github/workflows
cat > .github/workflows/ci.yml <<'YAML'
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps: [{ uses: actions/checkout@v4 }, { uses: actions/setup-node@v4, with: { node-version: 22, cache: npm } }, { run: npm ci }, { run: npx oxlint src }]
  typecheck:
    runs-on: ubuntu-latest
    steps: [{ uses: actions/checkout@v4 }, { uses: actions/setup-node@v4, with: { node-version: 22, cache: npm } }, { run: npm ci }, { run: npx tsc -b }]
  unit:
    runs-on: ubuntu-latest
    steps: [{ uses: actions/checkout@v4 }, { uses: actions/setup-node@v4, with: { node-version: 22, cache: npm } }, { run: npm ci }, { run: npx vitest run }]
  build:
    needs: typecheck
    runs-on: ubuntu-latest
    steps: [{ uses: actions/checkout@v4 }, { uses: actions/setup-node@v4, with: { node-version: 22, cache: npm } }, { run: npm ci }, { run: npm run build }]
  e2e:
    needs: build
    runs-on: ubuntu-latest
    strategy: { matrix: { shard: [1, 2, 3, 4] } }
    steps: [{ uses: actions/checkout@v4 }, { uses: actions/setup-node@v4, with: { node-version: 22, cache: npm } }, { run: npm ci }, { run: "npx playwright test --shard=\${{ matrix.shard }}/4" }]
YAML

npx oxlint src && npx tsc -b && npx vitest run`,
    caption: "O grafo da aula como workflow do GitHub Actions, gravado pelo próprio script: jobs paralelos por padrão, needs para as dependências e uma matriz para dividir os e2e em 4 shards. A última linha roda localmente as mesmas checagens antes do push.",
  },
  tradeOffs: {
    pros: [
      "Conflitos e regressões aparecem no mesmo dia, enquanto são pequenos",
      "O vermelho é uma observação objetiva para pessoas e agentes",
      "Com o verde obrigatório, nada entra na main sem passar pelos mesmos checks",
    ],
    cons: [
      "Pipeline lento quebra o ciclo: ninguém espera 40 minutos por um check",
      "Paralelismo e shards trocam tempo de parede por minutos de máquina",
      "Testes instáveis ensinam a equipe a ignorar o vermelho",
    ],
    alternatives: [
      "Hooks locais de pré-commit para os checks mais rápidos, antes do push",
      "Merge queue, que testa cada mudança já combinada com as que entraram antes",
    ],
  },
  knowledgeCheck: [
    {
      id: "shard-where",
      prompt: "Jobs: lint (2 min), unit (6 min) e build (3 min) → e2e (10 min), com e2e dependendo do build. Onde dividir em shards para encurtar o pipeline?",
      options: ["No lint", "Nos unitários", "No e2e, que está no caminho crítico", "Em todos igualmente"],
      correct: 2,
      explanation: "O pipeline dura o caminho crítico, build → e2e = 13 min. Só encurtar esse caminho reduz o tempo de parede; dividir os unitários só gasta máquina.",
      lesson: "15-10",
    },
    {
      id: "flaky-math",
      prompt: "Cada teste tem 0,1% de chance de falhar sem bug. Numa suíte de 1.000 testes, qual a chance aproximada de um build vermelho falso?",
      options: ["0,1%", "1%", "Cerca de 63%", "100%"],
      correct: 2,
      explanation: "1 − (1 − 0,001)^1000 ≈ 1 − e^(−1) ≈ 63%. Instabilidade pequena por teste vira vermelho frequente na suíte.",
      lesson: "15-10",
    },
  ],
  related: ["15-09", "15-11", "17-14"],
  references: [
    { title: "Martin Fowler, Continuous Integration", url: "https://martinfowler.com/articles/continuousIntegration.html", kind: "article" },
    { title: "GitHub Actions: Workflow syntax", url: "https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions", kind: "docs" },
    { title: "Google Testing Blog: Flaky Tests at Google and How We Mitigate Them", url: "https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html", kind: "article" },
  ],
};

export default lesson;
