import type { LessonContent } from "../../../types/content";

// Um índice de memória que cresce, calculado aqui. A memória automática do Claude Code carrega no início de cada
// sessão as primeiras 200 linhas (ou 25 KB) do MEMORY.md; o resto fica de fora. Cada sessão de brinquedo
// acrescenta 3 linhas. Sem curadoria, o índice cresce 3 por sessão; com curadoria (juntar e apagar entradas
// velhas), cresce 1. Os tokens por linha saem de linhas de exemplo, a 4 caracteres por token.

const LOADED_LINES = 200;
const ADDED_PER_SESSION = 3;
const CURATED_NET = 1;
const SESSIONS = 100;

const sampleEntries = [
  "- [feedback] testes de integração precisam de Redis local: docker compose up redis",
  "- [user] prefere pnpm a npm; respostas curtas",
  "- [project] migração do billing congelada até a revisão de 12/03",
  "- [reference] bugs do time ficam no projeto BILL do issue tracker",
];
const tokensPerLine = sampleEntries.reduce((sum, line) => sum + Math.ceil(line.length / 4), 0) / sampleEntries.length;

const linesAt = (session: number, perSession: number) => session * perSession;
const firstCut = Math.floor(LOADED_LINES / ADDED_PER_SESSION) + 1;
const uncuratedFinal = linesAt(SESSIONS, ADDED_PER_SESSION);
const curatedFinal = linesAt(SESSIONS, CURATED_NET);
const invisible = Math.max(0, uncuratedFinal - LOADED_LINES);
const invisibleShare = invisible / uncuratedFinal;
const loadedTokens = Math.round(Math.min(uncuratedFinal, LOADED_LINES) * tokensPerLine);
const curatedTokens = Math.round(Math.min(curatedFinal, LOADED_LINES) * tokensPerLine);
const sampled = Array.from({ length: 10 }, (_, index) => (index + 1) * 10);

const stores = ["CLAUDE.md do projeto", "CLAUDE.local.md", "memória automática", "memória de subagente (project)"];
const storeCols = ["escrito por pessoa", "escrito pelo agente", "no git do time", "carregado na sessão"];
const storeValues = [
  [1, 0, 1, 1],
  [1, 0, 0, 1],
  [0, 1, 0, 1],
  [0, 1, 0.5, 1],
];

const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const percent = (value: number) => `${Math.round(value * 100)}%`;

const lesson: LessonContent = {
  id: "14-11",
  subtitle: "O caderno de passagem de plantão: onde o harness guarda o que o agente aprende, quem escreve, quem lê e por que memória sem curadoria apodrece.",
  objectives: [
    "Separar memória escrita por pessoas de memória escrita pelo agente",
    "Descrever escopos de memória: organização, usuário, projeto e local",
    "Usar um índice curto com arquivos de tópico lidos sob demanda",
    "Calcular quando um índice sem curadoria passa do limite carregado",
  ],
  steps: [
    {
      id: "handover",
      shortTitle: "Plantão",
      title: "A passagem de plantão",
      tag: "context",
      body: [
        "Num hospital, a enfermeira da noite não lembra o que aconteceu de dia: ela lê o caderno de passagem de plantão. Se o caderno tem três linhas bem escritas, ela começa bem. Se tem trinta páginas sem ordem, ela pula o que importa.",
        "A aula 12-07 mostrou os tipos de memória de um agente e como buscá-las. Aqui o olhar é do harness: cada sessão começa com a janela vazia, e o que passa de uma para a outra é o que o harness grava em arquivos e recarrega. Um [[arquivo de memória|memory-file]] é esse caderno, e a [[memória de longo prazo|long-term-memory]] na prática costuma ser texto simples num diretório.",
      ],
      keyIdea: "Toda sessão começa do zero; a memória é o que o harness escolhe gravar e recarregar.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "shift",
            piece: "block-diagram",
            blocks: [
              { id: "s1", kind: "agent", label: "sessão 1", col: 0, row: 0.5 },
              { id: "file", kind: "memory", label: "MEMORY.md", col: 1, row: 0.5 },
              { id: "s2", kind: "agent", label: "sessão 2", col: 2, row: 0.5 },
              { id: "s3", kind: "agent", label: "sessão 3", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "s1", to: "file", label: "grava" },
              { from: "file", to: "s2", label: "recarrega" },
              { from: "s2", to: "s3", label: "via arquivo" },
            ],
            active: "file",
          },
        ],
      },
      alt: "A sessão 1 grava no MEMORY.md, em destaque, que é recarregado na sessão 2; a sessão 3 também começa a partir do arquivo.",
    },
    {
      id: "who-writes",
      shortTitle: "Quem escreve",
      title: "Quem escreve e onde mora",
      tag: "mechanism",
      body: [
        "O Claude Code tem duas memórias complementares, ambas carregadas no início de cada conversa. O CLAUDE.md é escrito por você: instruções e regras, nos escopos de organização, usuário, projeto e local. A memória automática é escrita pelo agente: aprendizados a partir das suas correções, guardados em ~/.claude/projects/<projeto>/memory/, um diretório por repositório, local da máquina e compartilhado entre worktrees.",
        "Cada [[escopo de memória|memory-scope]] responde a uma pergunta: quem vê? O CLAUDE.md do projeto vai no git e vale para o time; o CLAUDE.local.md fica fora do git e vale só para você; a memória automática não sai da sua máquina. Subagentes podem ter memória própria, com escopo user, project ou local. A documentação lembra que tudo isso é contexto, não configuração imposta: para bloquear algo, use hooks.",
      ],
      keyIdea: "Pergunte de cada memória: quem escreveu, quem enxerga e se ela vai para o git.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "stores",
            piece: "matrix",
            rows: stores,
            cols: storeCols,
            values: storeValues,
            scale: { min: 0, max: 1 },
            highlight: { row: 2, col: 1 },
            color: "module-14",
          },
        ],
      },
      alt: "Matriz de memórias do Claude Code: o CLAUDE.md do projeto é escrito por pessoa e vai no git; o CLAUDE.local.md é escrito por pessoa e fica fora do git; a memória automática, em destaque, é escrita pelo agente; todas são carregadas na sessão.",
    },
    {
      id: "index",
      shortTitle: "Índice",
      title: "Um índice curto e tópicos sob demanda",
      tag: "mechanism",
      body: [
        "Um bom caderno de plantão tem uma primeira página com o resumo de cada paciente e, atrás, as fichas completas. Ninguém lê todas as fichas; todo mundo lê a primeira página.",
        `A memória automática do Claude Code segue esse desenho. O MEMORY.md é um [[índice de memória|memory-index]]: as primeiras ${LOADED_LINES} linhas (ou 25 KB) entram em toda sessão, e o resto fica de fora. Detalhes vão para arquivos de tópico, que o agente lê sob demanda com as ferramentas normais. As notas são de quatro tipos (user, feedback, project e reference), e o agente pula o que dá para deduzir do código ou do git.`,
      ],
      keyIdea: "Índice sempre carregado, uma linha por entrada; o detalhe mora em arquivos lidos quando preciso.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "shift",
            piece: "block-diagram",
            blocks: [
              { id: "file", kind: "memory", label: "MEMORY.md", col: 0, row: 0 },
              { id: "context", kind: "context", label: `${LOADED_LINES} linhas`, col: 1, row: 0 },
              { id: "s2", kind: "agent", label: "agente", col: 2, row: 0 },
              { id: "topics", kind: "documents", label: "tópicos .md", col: 3, row: 1 },
              { id: "cut", kind: "no-result", label: "além do limite", col: 1, row: 1 },
            ],
            edges: [
              { from: "file", to: "context", label: "toda sessão" },
              { from: "context", to: "s2" },
              { from: "s2", to: "topics", label: "lê quando precisa" },
              { from: "file", to: "cut", label: "não carrega", variant: "alternative" },
            ],
            active: "context",
          },
        ],
      },
      alt: `O MEMORY.md entra no contexto, em destaque, até ${LOADED_LINES} linhas em toda sessão; o agente lê arquivos de tópico quando precisa; o que passa do limite não é carregado.`,
    },
    {
      id: "growth",
      shortTitle: "A conta",
      title: "O índice que cresce sem parar",
      tag: "example",
      body: [
        `Se cada sessão acrescenta ${ADDED_PER_SESSION} linhas e ninguém junta nem apaga nada, o índice passa de ${LOADED_LINES} linhas na sessão ${firstCut}. Na sessão ${SESSIONS}, ele tem ${uncuratedFinal} linhas, e ${invisible} delas (${percent(invisibleShare)}) nunca mais entram no contexto: o agente não sabe que sabe.`,
        `Com curadoria, juntando entradas parecidas e apagando as velhas, o índice cresce ${CURATED_NET} linha por sessão e fecha com ${curatedFinal}, todas carregadas, por uns ${integer(curatedTokens)} tokens, contra ${integer(loadedTokens)} do índice cheio. O Claude Code faz parte disso: quando o arquivo se aproxima do limite, avisa o agente para encurtá-lo, com uma linha por entrada e o detalhe nos tópicos.`,
      ],
      keyIdea: "Memória sem curadoria não some: fica invisível. O limite de carga transforma acúmulo em esquecimento.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "growth-chart",
            piece: "chart",
            kind: "line",
            series: sampled.map((session) => ({ label: `s${session}`, value: linesAt(session, ADDED_PER_SESSION) })),
            cutoff: { mode: "threshold", value: LOADED_LINES, label: `${LOADED_LINES} linhas` },
            color: "module-14",
          },
          {
            id: "growth-numbers",
            piece: "metrics-panel",
            metrics: [
              { id: "cut", label: "passa do limite na sessão", value: `${firstCut}`, color: "danger" },
              { id: "invisible", label: `invisíveis na sessão ${SESSIONS}`, value: `${invisible} linhas` },
              { id: "curated", label: "com curadoria", value: `${curatedFinal} linhas, todas carregadas`, color: "success" },
            ],
            highlight: "invisible",
          },
        ],
      },
      alt: `Linha do tamanho do índice sem curadoria, crescendo ${ADDED_PER_SESSION} linhas por sessão e passando do limite de ${LOADED_LINES} na sessão ${firstCut}; na sessão ${SESSIONS} são ${uncuratedFinal} linhas, ${invisible} invisíveis. Com curadoria, ${curatedFinal} linhas, todas carregadas.`,
    },
    {
      id: "risks",
      shortTitle: "Riscos",
      title: "Memória velha e memória envenenada",
      tag: "tradeoff",
      body: [
        "Um caderno errado é pior que nenhum: a enfermeira confia nele. Memórias envelhecem (o comando de teste mudou, a pasta foi renomeada) e são relidas com a mesma confiança das corretas. E quem escreve na memória pode ser manipulado: uma página da web com [[prompt injection|prompt-injection]] que convence o agente a “lembrar” uma instrução falsa contamina todas as sessões seguintes.",
        "As defesas são de harness: memória em texto simples, que pessoas leem e editam (no Claude Code, pelo comando /memory); escopo local para o que é pessoal; revisão em PR para o que vai no git; datas nas entradas; e nada de segredos em arquivos de memória. Escrever na memória é uma ação com efeito duradouro, e merece o mesmo cuidado de uma ferramenta que escreve em disco.",
      ],
      keyIdea: "Trate a escrita na memória como ação com efeito duradouro: legível, revisável e longe de segredos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "poison",
            piece: "block-diagram",
            blocks: [
              { id: "web", kind: "cloud", label: "página com injeção", col: 0, row: 0 },
              { id: "agent", kind: "agent", label: "agente", col: 1, row: 0 },
              { id: "memory", kind: "memory", label: "memória", col: 2, row: 0 },
              { id: "review", kind: "guardrail", label: "revisão humana", col: 2, row: 1 },
              { id: "future", kind: "agent", label: "sessões futuras", col: 3, row: 0 },
            ],
            edges: [
              { from: "web", to: "agent", label: "“lembre que…”", variant: "alternative" },
              { from: "agent", to: "memory", label: "grava", variant: "alternative" },
              { from: "review", to: "memory", label: "lê e corrige" },
              { from: "memory", to: "future", label: "relê" },
            ],
            active: "review",
          },
        ],
      },
      alt: "Uma página com prompt injection convence o agente a gravar uma instrução falsa na memória, por caminhos tracejados; a memória é relida por sessões futuras, e a revisão humana, em destaque, lê e corrige o que foi gravado.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Memória é arquivo com dono",
      tag: "summary",
      body: [
        "No harness, memória é arquivo: alguém escreve, alguém lê, tem escopo e tem limite de carga. Separe o que pessoas escrevem (instruções) do que o agente aprende (notas), mantenha um índice curto com tópicos sob demanda e faça curadoria, porque o limite transforma acúmulo em esquecimento.",
        "Memória, instruções e permissões dizem o que o agente sabe e pode pedir. A próxima aula cuida do que acontece se ele pedir algo errado mesmo assim: sandboxing e isolamento.",
      ],
      keyIdea: "Escreva pouco, curto e legível; revise o que o agente grava; nunca guarde segredos na memória.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "recap",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "people", label: "pessoas: instruções" },
              { id: "agent", label: "agente: notas" },
              { id: "scope", label: "escopo certo" },
              { id: "index", label: "índice curto", color: "module-14" },
              { id: "curate", label: "curadoria", color: "module-14" },
              { id: "secrets", label: "sem segredos", color: "danger" },
            ],
          },
        ],
      },
      alt: "Chips de resumo: pessoas escrevem instruções, o agente escreve notas, escopo certo, índice curto, curadoria e nenhum segredo na memória.",
    },
  ],
  realWorldExample:
    "No Claude Code, quando você diz “lembre que os testes de API precisam de um Redis local”, o agente grava isso na memória automática, em ~/.claude/projects/<projeto>/memory/. O MEMORY.md, com as primeiras 200 linhas ou 25 KB carregadas em toda sessão, funciona como índice, e notas detalhadas vão para arquivos de tópico lidos sob demanda. Para gravar no CLAUDE.md em vez disso, a documentação orienta pedir explicitamente ou editar pelo comando /memory.",
  tradeOffs: {
    pros: [
      "O agente para de redescobrir os mesmos fatos a cada sessão",
      "Texto simples: pessoas leem, editam e revisam",
      "Escopos separam o que é do time do que é pessoal",
    ],
    cons: [
      "Memórias velhas enganam com a mesma confiança das novas",
      "Sem curadoria, o limite de carga esconde entradas",
      "Escrita na memória é um alvo para injeção com efeito duradouro",
    ],
    alternatives: ["Só instruções versionadas, quando o projeto muda pouco", "Memória em banco com busca semântica, como na aula 12-07, para volumes grandes"],
  },
  knowledgeCheck: [
    {
      id: "where-to-store",
      prompt: "Você quer que todo o time saiba que “o build de release exige a variável SIGNING_KEY_ID”. Onde isso deve ficar?",
      options: [
        "Na memória automática da sua máquina",
        "No CLAUDE.md ou AGENTS.md do projeto, versionado no git",
        "No CLAUDE.local.md",
        "Em lugar nenhum: o agente descobre sozinho",
      ],
      correct: 1,
      explanation: "A memória automática e o CLAUDE.local.md ficam só com você. Um fato do time vai para o arquivo de instruções do projeto, que passa por revisão e chega a todos.",
      lesson: "14-11",
    },
    {
      id: "index-math",
      prompt: "Um índice de memória carrega 200 linhas e ganha 4 linhas por sessão sem curadoria. Em que sessão a primeira entrada fica de fora?",
      options: ["Na 40ª", "Na 50ª", "Na 51ª", "Na 200ª"],
      correct: 2,
      explanation: "Depois de 50 sessões o índice tem exatamente 200 linhas. Na 51ª ele passa a ter 204, e as linhas além da 200ª não entram mais.",
      lesson: "14-11",
    },
  ],
  related: ["14-10", "14-12", "12-07"],
  references: [
    { title: "Claude Code: How Claude remembers your project", url: "https://code.claude.com/docs/en/memory", kind: "docs" },
    { title: "Packer et al. (2023), MemGPT: Towards LLMs as Operating Systems", url: "https://arxiv.org/abs/2310.08560", kind: "paper" },
    { title: "Anthropic: Effective context engineering for AI agents", url: "https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents", kind: "article" },
  ],
};

export default lesson;
