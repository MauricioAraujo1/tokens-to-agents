import type { LessonContent } from "../../../types/content";

// Arquitetura com contas no arquivo. O grafo de módulos é uma versão simplificada do diagrama de
// .specs/features/learning-platform/design.md. O "raio de impacto" de uma mudança é o fecho transitivo dos
// módulos que dependem do módulo alterado, calculado por busca no grafo invertido. A versão acoplada
// acrescenta três dependências diretas ao localStorage, de brinquedo. A matriz de decisão tem notas de 1 a 5
// dadas à mão e pesos explícitos; o total ponderado é calculado aqui.

const fixed = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

interface Module {
  id: string;
  label: string;
  x: number;
  y: number;
}

const modules: Module[] = [
  { id: "app", label: "App", x: 0.08, y: 0.5 },
  { id: "router", label: "router", x: 0.3, y: 0.12 },
  { id: "page", label: "LessonPage", x: 0.3, y: 0.5 },
  { id: "search", label: "busca", x: 0.3, y: 0.88 },
  { id: "progress", label: "progresso", x: 0.55, y: 0.12 },
  { id: "registry", label: "registry", x: 0.55, y: 0.5 },
  { id: "scene", label: "Scene", x: 0.55, y: 0.78 },
  { id: "storage", label: "localStorage", x: 0.88, y: 0.12 },
  { id: "catalog", label: "catálogo", x: 0.88, y: 0.5 },
  { id: "pieces", label: "peças", x: 0.88, y: 0.88 },
];
const labelOf = (id: string) => modules.find((module) => module.id === id)?.label ?? id;

type Edge = { from: string; to: string };
/** `from` depende de `to`. */
const layered: Edge[] = [
  { from: "app", to: "router" },
  { from: "app", to: "page" },
  { from: "app", to: "search" },
  { from: "app", to: "progress" },
  { from: "progress", to: "storage" },
  { from: "page", to: "registry" },
  { from: "page", to: "scene" },
  { from: "registry", to: "catalog" },
  { from: "search", to: "catalog" },
  { from: "scene", to: "pieces" },
];
const coupled: Edge[] = [
  ...layered,
  { from: "page", to: "storage" },
  { from: "search", to: "storage" },
  { from: "scene", to: "storage" },
];

/** Módulos que dependem, direta ou indiretamente, de `target`. */
const blastRadius = (edges: Edge[], target: string) => {
  const reached = new Set<string>();
  const queue = [target];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const edge of edges) {
      if (edge.to === current && !reached.has(edge.from)) {
        reached.add(edge.from);
        queue.push(edge.from);
      }
    }
  }
  return [...reached];
};

const CHANGED = "storage";
const coupledRadius = blastRadius(coupled, CHANGED);
const layeredRadius = blastRadius(layered, CHANGED);
const directBefore = coupled.filter((edge) => edge.to === CHANGED).length;
const directAfter = layered.filter((edge) => edge.to === CHANGED).length;
const graphNodes = modules.map(({ id, label, x, y }) => ({ id, label, x, y }));

// Matriz de decisão do formato do conteúdo (notas de 1 a 5, à mão).
const criteria = [
  { label: "erro de build", weight: 0.4 },
  { label: "revisão por diff", weight: 0.2 },
  { label: "sem pipeline novo", weight: 0.25 },
  { label: "conforto de escrita", weight: 0.15 },
];
const options = [
  { label: "MDX", scores: [2, 4, 2, 5] },
  { label: "JSON + schema", scores: [4, 3, 4, 2] },
  { label: "TS tipado", scores: [5, 4, 5, 3] },
];
const MAX_SCORE = 5;
const weighted = options.map((option) => option.scores.reduce((sum, score, index) => sum + score * criteria[index].weight, 0));
const bestIndex = weighted.indexOf(Math.max(...weighted));
const best = options[bestIndex];
const runnerUp = [...weighted].sort((a, b) => b - a)[1];
const decisionValues = options.map((option, row) => [
  ...option.scores.map((score) => score / MAX_SCORE),
  weighted[row] / MAX_SCORE,
]);

const adrSections = [
  { id: "title", label: "título" },
  { id: "context", label: "contexto" },
  { id: "decision", label: "decisão" },
  { id: "status", label: "status" },
  { id: "consequences", label: "consequências" },
];

const lesson: LessonContent = {
  id: "15-06",
  subtitle: "Decidir a forma do sistema antes de pedir código: módulos, dependências, o raio de impacto de uma mudança e decisões registradas que o agente não reabre.",
  objectives: [
    "Escrever um design doc com componentes, dados, erros e alternativas",
    "Medir o acoplamento pelo raio de impacto de uma mudança",
    "Comparar opções de design com uma matriz de decisão ponderada",
    "Registrar decisões em ADRs que pessoas e agentes consultam",
  ],
  steps: [
    {
      id: "blueprint",
      shortTitle: "A planta",
      title: "A spec diz o quê; o design diz como",
      tag: "context",
      body: [
        "A spec da casa diz “três quartos e luz natural na cozinha”. A planta decide onde passa o encanamento, que parede é estrutural e onde fica o quadro de luz. Mudar um quarto de lugar depois que o encanamento está pronto custa caro; na planta, custa uma borracha.",
        "O [[design doc|design-document]] é a planta do software: componentes, fluxo dos dados, modelos, tratamento de erros, riscos e as alternativas descartadas. O deste site decide uma SPA estática com Vite, conteúdo em TypeScript tipado carregado por módulo e progresso no localStorage. Um agente que lê esse documento não inventa um backend.",
      ],
      keyIdea: "O design fecha as decisões estruturais que o agente tomaria sozinho, e de jeitos diferentes em cada sessão.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "arch",
            piece: "block-diagram",
            blocks: [
              { id: "browser", kind: "laptop", label: "navegador", col: 0, row: 0.5 },
              { id: "spa", kind: "app", label: "spa react", col: 1, row: 0.5 },
              { id: "content", kind: "documents", label: "aulas em ts", col: 2, row: 0 },
              { id: "storage", kind: "memory", label: "localStorage", col: 2, row: 1 },
              { id: "validator", kind: "eval", label: "validador", col: 3, row: 0 },
            ],
            edges: [
              { from: "browser", to: "spa", label: "url" },
              { from: "spa", to: "content", label: "import lazy" },
              { from: "spa", to: "storage", label: "progresso" },
              { from: "validator", to: "content", label: "confere no build" },
            ],
            active: "spa",
          },
        ],
      },
      alt: "A arquitetura deste site: o navegador abre a SPA em React, em destaque, que carrega as aulas em TypeScript sob demanda e guarda o progresso no localStorage. Um validador confere as aulas no build.",
    },
    {
      id: "blast",
      shortTitle: "Impacto",
      title: "Acoplamento é o raio de impacto",
      tag: "mechanism",
      body: [
        "Numa casa mal planejada, trocar o chuveiro exige quebrar a parede da sala, porque o cano passa por ali. No software, [[acoplamento|coupling]] é o quanto um módulo depende dos detalhes de outro. Dá para medir pelo [[raio de impacto|blast-radius]]: mude um módulo e conte quantos outros, direta ou indiretamente, podem quebrar.",
        `Na versão acoplada da cena, a página da aula, a busca e a cena leem o localStorage direto, além do módulo de progresso. São ${directBefore} dependências diretas, e mudar o formato salvo atinge ${coupledRadius.length} módulos: ${coupledRadius.map(labelOf).join(", ")}. Um agente que muda o formato precisa achar e corrigir todos, e qualquer um esquecido quebra só em produção.`,
      ],
      keyIdea: "Raio de impacto = quantos módulos uma mudança pode quebrar. Quanto maior, mais caro mudar.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "modules",
            piece: "graph",
            nodes: graphNodes,
            edges: coupled,
            highlight: [CHANGED, ...coupledRadius],
          },
        ],
      },
      alt: `Grafo de módulos acoplado: ${directBefore} módulos dependem direto do localStorage. Mudar o localStorage atinge ${coupledRadius.length} módulos, em destaque: ${coupledRadius.map(labelOf).join(", ")}.`,
    },
    {
      id: "boundary",
      shortTitle: "Fronteira",
      title: "Uma fronteira encolhe o raio",
      tag: "mechanism",
      body: [
        "A casa bem feita concentra o encanamento numa parede técnica: trocar o chuveiro mexe só nela. No design deste site, só o módulo de progresso conhece o localStorage; os outros pedem “marcar a aula como concluída” e não sabem como isso é salvo.",
        `Com essa fronteira, sobra ${directAfter} dependência direta, e mudar o formato atinge ${layeredRadius.length} módulos: ${layeredRadius.map(labelOf).join(" e ")}. O módulo de progresso ganhou [[coesão|cohesion]]: tudo sobre salvar progresso mora nele. Para um agente, isso significa uma mudança com um arquivo para editar e um teste para rodar.`,
      ],
      keyIdea: "Baixo acoplamento e alta coesão: cada decisão mora num lugar só, atrás de uma interface.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "radius",
            piece: "metrics-panel",
            metrics: [
              { id: "before", label: "impacto acoplado", value: `${coupledRadius.length} módulos`, color: "danger" },
              { id: "after", label: "impacto com fronteira", value: `${layeredRadius.length} módulos`, color: "success" },
              { id: "direct", label: "acessos diretos", value: `${directBefore} → ${directAfter}` },
            ],
            highlight: "after",
          },
          {
            id: "modules",
            piece: "graph",
            nodes: graphNodes,
            edges: layered,
            highlight: [CHANGED, ...layeredRadius],
          },
        ],
      },
      alt: `Com a fronteira, só o progresso acessa o localStorage. O impacto de mudar o formato cai de ${coupledRadius.length} para ${layeredRadius.length} módulos: ${layeredRadius.map(labelOf).join(" e ")}.`,
    },
    {
      id: "decision",
      shortTitle: "Decisão",
      title: "Comparar opções com pesos",
      tag: "example",
      body: [
        "Para escolher o formato do conteúdo das aulas, o design deste site comparou alternativas. Uma matriz de decisão deixa a escolha explícita: critérios com peso, uma nota por opção e critério, e o total ponderado. Os pesos são a parte que vale discutir, porque mostram o que o projeto prioriza.",
        `Com peso ${fixed(criteria[0].weight)} para “cena inválida vira erro de build”, a opção ${best.label} soma ${fixed(weighted[bestIndex], 2)} de ${MAX_SCORE}, contra ${fixed(runnerUp, 2)} da segunda. Foi a decisão registrada: TS tipado em vez de MDX, porque a configuração de cena errada não compila, sem pipeline novo, e o texto fica revisável por diff. As notas são julgamento; o ganho da matriz é que o julgamento fica escrito e pode ser contestado.`,
      ],
      keyIdea: "A matriz não decide por você; ela torna visível o que você está priorizando.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "decision",
            piece: "matrix",
            rows: options.map((option) => option.label),
            cols: [...criteria.map((criterion) => `${criterion.label} (${fixed(criterion.weight, 2)})`), "total"],
            values: decisionValues,
            scale: { min: 0, max: 1 },
            highlight: { row: bestIndex, col: criteria.length },
            color: "module-15",
          },
        ],
      },
      alt: `Matriz de decisão do formato do conteúdo. Totais ponderados de 0 a ${MAX_SCORE}: ${options.map((option, row) => `${option.label} ${fixed(weighted[row], 2)}`).join(", ")}. ${best.label} vence.`,
    },
    {
      id: "adr",
      shortTitle: "ADR",
      title: "Decisões com data, para não decidir de novo",
      tag: "tradeoff",
      body: [
        "Uma decisão que só existe na memória da equipe é reaberta toda vez que alguém novo chega. Um agente é sempre alguém novo: cada sessão começa sem lembrar por que o projeto não usa MDX. O [[ADR|architecture-decision-record]], proposto por Michael Nygard em 2011, é um registro curto por decisão: título, contexto, decisão, status e consequências.",
        "O STATE.md deste site guarda decisões assim, de AD-001 (site estático, sem backend) a AD-011, cada uma com motivo e data. Apontar o agente para esses registros, por exemplo num [[arquivo de contexto|context-file]], evita que ele reintroduza o que foi descartado. O custo: ADR que ninguém marca como substituído engana, e arquitetura demais no começo trava o que só o código vai esclarecer.",
      ],
      keyIdea: "ADR = uma decisão, o contexto dela e as consequências, num arquivo que pessoas e agentes leem.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "adr",
            piece: "pipeline",
            stages: adrSections.map((section) =>
              section.id === "consequences" ? { ...section, color: "module-15" as const } : section,
            ),
            active: "consequences",
            done: adrSections.slice(0, 4).map((section) => section.id),
          },
        ],
      },
      alt: `As seções de um ADR, em ordem: ${adrSections.map((section) => section.label).join(", ")}. Consequências está em destaque.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Design que o agente segue",
      tag: "summary",
      body: [
        "O design doc dá a forma do sistema; os ADRs explicam cada escolha; as fronteiras entre módulos mantêm o raio de impacto pequeno. Regras de arquitetura que importam muito podem virar checagem automática, como uma regra de lint que proíbe importar o localStorage fora do módulo de progresso.",
        "Com spec, design e tarefas prontos, começa o código. A próxima aula mostra como escrever o teste antes dele.",
      ],
      keyIdea: "Arquitetura = fronteiras que encolhem o impacto + decisões escritas + regras checadas no build.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "arch",
            piece: "block-diagram",
            blocks: [
              { id: "design", kind: "documents", label: "design doc", col: 0, row: 0 },
              { id: "adrs", kind: "documents", label: "ADRs", col: 0, row: 1 },
              { id: "agent", kind: "agent", label: "agente", col: 1, row: 0.5 },
              { id: "lint", kind: "guardrail", label: "regras de import", col: 2, row: 0.5 },
              { id: "spa", kind: "app", label: "código", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "design", to: "agent", label: "forma" },
              { from: "adrs", to: "agent", label: "porquês" },
              { from: "agent", to: "lint", label: "mudança" },
              { from: "lint", to: "spa", label: "fronteiras ok" },
            ],
            active: "lint",
            done: ["design", "adrs", "agent"],
          },
        ],
      },
      alt: "O design doc e os ADRs orientam o agente; a mudança passa por regras de import, em destaque, que conferem as fronteiras antes de chegar ao código.",
    },
  ],
  realWorldExample:
    "O formato de ADR de Michael Nygard virou padrão em muitas equipes, com ferramentas como o adr-tools que criam um arquivo numerado por decisão no próprio repositório. No Google, o design doc é revisado antes da implementação e inclui uma seção de alternativas consideradas, para que a próxima pessoa saiba o que já foi descartado e por quê.",
  code: {
    language: "json",
    source: `{
  "rules": {
    "no-restricted-globals": [
      "error",
      { "name": "localStorage", "message": "Use o módulo de progresso (AD-001)." }
    ]
  },
  "overrides": [
    { "files": ["src/lib/progress/**"], "rules": { "no-restricted-globals": "off" } }
  ]
}`,
    caption: "Uma fronteira de arquitetura como regra de lint (.eslintrc.json): só o módulo de progresso pode usar o localStorage. O agente que esquecer a fronteira recebe o erro no CI, com o motivo.",
  },
  tradeOffs: {
    pros: [
      "Fronteiras claras deixam cada mudança pequena e com um teste óbvio para rodar",
      "Decisões registradas não são reabertas a cada sessão do agente",
      "A matriz de decisão torna as prioridades explícitas e discutíveis",
    ],
    cons: [
      "Desenhar demais antes do código trava decisões que só a implementação esclarece",
      "ADRs e design docs desatualizados orientam o agente para o lugar errado",
      "Cada camada de indireção tem custo de leitura; abstração sem necessidade é dívida",
    ],
    alternatives: [
      "Arquitetura evolutiva: decidir o mínimo e refatorar quando a pressão aparecer",
      "Spike: um protótipo descartável para responder a dúvida antes de decidir",
    ],
  },
  knowledgeCheck: [
    {
      id: "blast-radius",
      prompt: "Cinco telas chamam a API de pagamentos direto, cada uma montando a requisição. A API muda o formato. O que reduz o impacto da próxima mudança?",
      options: [
        "Pedir ao agente que corrija as cinco telas",
        "Um módulo de pagamentos que é o único a conhecer o formato, usado pelas cinco telas",
        "Copiar a requisição para um arquivo de exemplos",
        "Aumentar a cobertura de testes das telas",
      ],
      correct: 1,
      explanation: "Com uma fronteira, o formato mora num lugar só: o raio de impacto cai de cinco telas para um módulo. Corrigir as cinco resolve hoje e repete o problema amanhã.",
      lesson: "15-06",
    },
    {
      id: "adr-agent",
      prompt: "A cada sessão, o agente sugere trocar o roteador próprio por uma biblioteca. Qual a melhor resposta?",
      options: [
        "Aceitar, já que o agente insiste",
        "Explicar de novo em cada sessão",
        "Registrar a decisão num ADR com o motivo e apontá-lo no arquivo de contexto do projeto",
        "Proibir o agente de ler o roteador",
      ],
      correct: 2,
      explanation: "O agente não lembra entre sessões. Um ADR com contexto e consequências, referenciado no arquivo de contexto, faz a decisão chegar a toda sessão nova.",
      lesson: "15-06",
    },
  ],
  related: ["15-05", "15-07", "09-07"],
  references: [
    { title: "Michael Nygard (2011), Documenting Architecture Decisions", url: "https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions", kind: "article" },
    { title: "Malte Ubl, Design Docs at Google", url: "https://www.industrialempathy.com/posts/design-docs-at-google/", kind: "article" },
    { title: "Architectural Decision Records (adr.github.io)", url: "https://adr.github.io/", kind: "docs" },
  ],
};

export default lesson;
