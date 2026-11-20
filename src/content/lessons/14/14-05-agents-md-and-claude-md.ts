import type { LessonContent } from "../../../types/content";

// Como o Codex monta as instruções de um monorepo, calculado aqui. Segundo a documentação do Codex, ele lê o
// AGENTS.md global (~/.codex) e depois um arquivo por diretório, da raiz do repositório até o diretório atual,
// concatenando nessa ordem, e para de acrescentar arquivos quando o total chega a project_doc_max_bytes
// (32 KiB por padrão). Os tamanhos dos arquivos abaixo são de brinquedo.

const LIMIT_KIB = 32;

const chain = [
  { id: "global", label: "~/.codex", path: "~/.codex/AGENTS.md", kib: 3 },
  { id: "root", label: "raiz", path: "AGENTS.md", kib: 14 },
  { id: "api", label: "packages/api", path: "packages/api/AGENTS.md", kib: 9 },
  { id: "payments", label: "api/payments", path: "packages/api/payments/AGENTS.md", kib: 8 },
];

function include(files: typeof chain, limit: number) {
  const kept: string[] = [];
  let total = 0;
  for (const file of files) {
    if (total + file.kib > limit) break;
    total += file.kib;
    kept.push(file.id);
  }
  return { kept, total };
}

const cumulative = chain.map((_, index) => chain.slice(0, index + 1).reduce((sum, file) => sum + file.kib, 0));
const fullTotal = cumulative[cumulative.length - 1];
const { kept, total: keptTotal } = include(chain, LIMIT_KIB);
const dropped = chain.filter((file) => !kept.includes(file.id));
const ROOT_AFTER_TRIM = 6;
const trimmed = chain.map((file) => (file.id === "root" ? { ...file, kib: ROOT_AFTER_TRIM } : file));
const trimmedResult = include(trimmed, LIMIT_KIB);

const recommended = [
  { id: "overview", label: "visão geral" },
  { id: "build", label: "build e testes", color: "module-14" as const },
  { id: "style", label: "estilo de código" },
  { id: "testing", label: "como testar" },
  { id: "security", label: "segurança" },
  { id: "pr", label: "commits e PRs" },
];

const kib = (value: number) => `${value} KiB`;

const lesson: LessonContent = {
  id: "14-05",
  subtitle: "Um README para agentes: o formato aberto AGENTS.md, o CLAUDE.md do Claude Code, onde cada um fica e como os dois convivem no mesmo repositório.",
  objectives: [
    "Explicar o que é o AGENTS.md e o que costuma ir nele",
    "Descrever como as ferramentas combinam arquivos aninhados, da raiz ao diretório atual",
    "Calcular quando um limite de tamanho corta as instruções mais específicas",
    "Manter um só arquivo para várias ferramentas com o import @AGENTS.md",
  ],
  steps: [
    {
      id: "readme",
      shortTitle: "README",
      title: "Um README para quem não é gente",
      tag: "context",
      body: [
        "O README foi escrito para pessoas: como instalar, para que serve, como contribuir. Um agente precisa de outra coisa: o comando exato que roda só um teste, a pasta que não pode copiar, o formato do commit. Pôr isso no README polui o texto para humanos; deixar de fora faz o agente adivinhar.",
        "O [[AGENTS.md|agents-md]] resolve isso: um markdown comum, sem campos obrigatórios, que o site do formato descreve como “um README para agentes”. Ele nasceu da colaboração entre ferramentas como Codex, Amp, Jules, Cursor e Factory, e hoje é mantido pela Agentic AI Foundation, sob a Linux Foundation. O [[CLAUDE.md|claude-md]] é o equivalente do Claude Code, com recursos próprios.",
      ],
      keyIdea: "README para pessoas, AGENTS.md para agentes: o mesmo repositório, dois públicos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "readers",
            piece: "block-diagram",
            blocks: [
              { id: "dev", kind: "user", label: "pessoas", col: 0, row: 0 },
              { id: "readme", kind: "documents", label: "README.md", col: 1, row: 0 },
              { id: "agents", kind: "documents", label: "AGENTS.md", col: 1, row: 1 },
              { id: "agent", kind: "agent", label: "agentes", col: 0, row: 1 },
              { id: "repo", kind: "laptop", label: "repositório", col: 2, row: 0.5 },
            ],
            edges: [
              { from: "dev", to: "readme", label: "lê" },
              { from: "agent", to: "agents", label: "lê" },
              { from: "readme", to: "repo" },
              { from: "agents", to: "repo" },
            ],
            active: "agents",
          },
        ],
      },
      alt: "No mesmo repositório, pessoas leem o README.md e agentes leem o AGENTS.md, em destaque.",
    },
    {
      id: "contents",
      shortTitle: "Conteúdo",
      title: "O que vai no arquivo",
      tag: "mechanism",
      body: [
        "Pense no que você diria a um colega no primeiro dia. O site do AGENTS.md sugere seções como visão geral do projeto, comandos de build e teste, estilo de código, instruções de teste, cuidados de segurança e regras de commit e PR. Não há formato obrigatório: qualquer título serve.",
        "A seção de testes pesa mais do que parece. Segundo o site, o agente tenta rodar as checagens listadas no arquivo e corrigir as falhas antes de terminar a tarefa. Sem o comando escrito, ele não tem como fechar esse ciclo sozinho.",
      ],
      keyIdea: "Escreva o que você diria a um colega no primeiro dia, a começar pelos comandos de teste.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "sections",
            piece: "pipeline",
            display: "chips",
            stages: recommended,
          },
        ],
      },
      alt: `Chips com as seções sugeridas para o AGENTS.md: ${recommended.map((section) => section.label).join(", ")}.`,
    },
    {
      id: "nested",
      shortTitle: "Aninhados",
      title: "Um arquivo por pasta, da raiz até você",
      tag: "mechanism",
      body: [
        "Num prédio, o regulamento do condomínio vale para todos, e cada apartamento tem as suas regras da casa. Quem está na cozinha do 42 segue as duas, e a da casa vence quando elas brigam. Num monorepo, cada pacote pode ter o seu AGENTS.md, e o site do formato resume: o mais próximo do arquivo editado prevalece, e um pedido explícito no chat vence tudo.",
        "As ferramentas implementam isso concatenando. O Codex lê o arquivo global em ~/.codex e depois um arquivo por diretório, da raiz do repositório até o diretório atual, juntando nessa ordem: o mais próximo vem por último e sobrescreve o anterior. O Claude Code faz o mesmo com o CLAUDE.md nos diretórios acima de onde você abriu a sessão e carrega os das subpastas sob demanda, quando o agente lê arquivos ali.",
      ],
      keyIdea: "Instruções se empilham da raiz até a pasta atual; a mais próxima vem por último e vence.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "tree",
            piece: "graph",
            nodes: [
              { id: "global", label: "~/.codex/AGENTS.md", x: 0.12, y: 0.15 },
              { id: "root", label: "AGENTS.md (raiz)", x: 0.4, y: 0.15 },
              { id: "api", label: "packages/api", x: 0.6, y: 0.5 },
              { id: "web", label: "packages/web", x: 0.25, y: 0.55 },
              { id: "payments", label: "api/payments", x: 0.85, y: 0.85, color: "module-14" },
            ],
            edges: [
              { from: "global", to: "root" },
              { from: "root", to: "api" },
              { from: "root", to: "web" },
              { from: "api", to: "payments" },
            ],
            path: ["global", "root", "api", "payments"],
            highlight: ["payments"],
          },
        ],
      },
      alt: "Árvore de arquivos de instrução: o global em ~/.codex, o da raiz, packages/web e packages/api, e api/payments; o caminho do global até api/payments, o diretório atual, está em destaque.",
    },
    {
      id: "limit",
      shortTitle: "A conta",
      title: `Os ${LIMIT_KIB} KiB do Codex`,
      tag: "example",
      body: [
        `O Codex tem um teto para essa pilha: a configuração project_doc_max_bytes, de ${LIMIT_KIB} KiB por padrão. Ao chegar nele, para de acrescentar arquivos. Trabalhando em api/payments, a pilha da cena soma ${chain.map((file) => kib(file.kib)).join(" + ")} = ${kib(fullTotal)}.`,
        `Como a soma passa do teto, entram só ${kib(keptTotal)} e fica de fora ${dropped.map((file) => file.path).join(", ")}: justamente o arquivo mais específico, o que mais importava para a tarefa. Cortar o AGENTS.md da raiz para ${kib(ROOT_AFTER_TRIM)} faz a pilha caber (${kib(trimmedResult.total)}). Moral: arquivo raiz gordo rouba espaço das instruções locais.`,
      ],
      keyIdea: "Um arquivo raiz grande pode empurrar para fora as instruções mais próximas da tarefa.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "stack",
            piece: "chart",
            kind: "line",
            series: chain.map((file, index) => ({ label: file.label, value: cumulative[index] })),
            max: Math.max(fullTotal, LIMIT_KIB) + 4,
            cutoff: { mode: "threshold", value: LIMIT_KIB, label: `${LIMIT_KIB} KiB` },
            color: "module-14",
          },
          {
            id: "stack-numbers",
            piece: "metrics-panel",
            metrics: [
              { id: "total", label: "pilha completa", value: kib(fullTotal), color: "danger" },
              { id: "kept", label: "carregado", value: kib(keptTotal) },
              { id: "trimmed", label: `raiz com ${kib(ROOT_AFTER_TRIM)}`, value: kib(trimmedResult.total), color: "success" },
            ],
            highlight: "total",
          },
        ],
      },
      alt: `Soma acumulada dos arquivos de instrução, da pasta global até api/payments: ${cumulative.map((value) => kib(value)).join(", ")}; a última passa do teto de ${LIMIT_KIB} KiB e fica de fora. Com a raiz cortada para ${kib(ROOT_AFTER_TRIM)}, a pilha soma ${kib(trimmedResult.total)} e cabe.`,
    },
    {
      id: "together",
      shortTitle: "Juntos",
      title: "Um arquivo, várias ferramentas",
      tag: "tradeoff",
      body: [
        "Times usam ferramentas diferentes, e manter dois manuais iguais é pedir que fiquem diferentes. A saída é ter uma [[fonte única de verdade|single-source-of-truth]]: o AGENTS.md com o conteúdo comum, e o CLAUDE.md começando com a linha @AGENTS.md, um import que o Claude Code expande no contexto, seguido só do que é específico dele.",
        "O CLAUDE.md tem recursos que o formato aberto não define: escopos de organização, usuário (~/.claude/CLAUDE.md), projeto e local (CLAUDE.local.md, fora do git), imports @caminho com até quatro níveis, e versões recentes do Claude Code leem o AGENTS.md quando não há CLAUDE.md. Recurso específico prende você à ferramenta; mantenha no arquivo comum tudo o que não precisa dele.",
      ],
      keyIdea: "Conteúdo comum no AGENTS.md; o CLAUDE.md importa o comum e acrescenta só o que é do Claude Code.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "share",
            piece: "block-diagram",
            blocks: [
              { id: "agents", kind: "documents", label: "AGENTS.md", col: 0, row: 0.5 },
              { id: "claude", kind: "documents", label: "CLAUDE.md", col: 1, row: 0 },
              { id: "codex", kind: "agent", label: "codex", col: 1, row: 1 },
              { id: "cc", kind: "agent", label: "claude code", col: 2, row: 0 },
              { id: "others", kind: "agent", label: "outras", col: 2, row: 1 },
            ],
            edges: [
              { from: "agents", to: "claude", label: "@AGENTS.md" },
              { from: "agents", to: "codex", label: "lê direto" },
              { from: "claude", to: "cc" },
              { from: "agents", to: "others" },
            ],
            active: "agents",
          },
        ],
      },
      alt: "O AGENTS.md, em destaque, é lido direto pelo Codex e por outras ferramentas e importado pelo CLAUDE.md com @AGENTS.md, que o Claude Code carrega.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "O manual que vive no repositório",
      tag: "summary",
      body: [
        "AGENTS.md e CLAUDE.md são o ponto de entrada do harness no repositório: markdown versionado, lido no início da sessão, empilhado da raiz até a pasta atual, com o mais próximo valendo mais. Mantenha a raiz curta, ponha o específico nas pastas e compartilhe o comum entre ferramentas.",
        "Esses arquivos carregam o que vale sempre. Procedimentos longos, que só importam em algumas tarefas, ficam melhor como skills, o assunto da próxima aula.",
      ],
      keyIdea: "Raiz curta, específico nas pastas, um arquivo comum para todas as ferramentas.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "share",
            piece: "block-diagram",
            blocks: [
              { id: "agents", kind: "documents", label: "AGENTS.md raiz", col: 0, row: 0.5 },
              { id: "local", kind: "documents", label: "AGENTS.md pacote", col: 1, row: 0.5 },
              { id: "context", kind: "context", label: "contexto", col: 2, row: 0.5 },
              { id: "cc", kind: "agent", label: "agente", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "agents", to: "local", label: "depois vem" },
              { from: "local", to: "context", label: "vence" },
              { from: "context", to: "cc" },
            ],
            active: "context",
            done: ["agents", "local"],
          },
        ],
      },
      alt: "O AGENTS.md da raiz e depois o do pacote entram no contexto, em destaque, nessa ordem; o do pacote vence, e o agente lê o resultado.",
    },
  ],
  realWorldExample:
    "A documentação do Codex descreve a descoberta: o AGENTS.override.md ou AGENTS.md global em ~/.codex e, depois, no máximo um arquivo por diretório, da raiz do repositório até o diretório atual, concatenados com o mais próximo por último, até o limite de project_doc_max_bytes (32 KiB por padrão). A do Claude Code descreve o caminho inverso para quem já tem AGENTS.md: criar um CLAUDE.md que começa com @AGENTS.md e acrescentar abaixo só as instruções do Claude Code.",
  code: {
    language: "bash",
    source: `cat > AGENTS.md <<'EOF'
# Projeto
API de pagamentos em TypeScript (pnpm workspaces).

# Build e testes
- pnpm install
- pnpm test --filter @app/api
- pnpm lint

# Cuidados
- Nunca commite arquivos .env
EOF

cat > CLAUDE.md <<'EOF'
@AGENTS.md

## Claude Code
- Use plan mode para mudanças em src/billing/
EOF`,
    caption: "Um AGENTS.md comum a todas as ferramentas e um CLAUDE.md que o importa com @AGENTS.md e acrescenta só o específico do Claude Code.",
  },
  tradeOffs: {
    pros: [
      "Formato aberto, lido por várias ferramentas, sem campos obrigatórios",
      "Versionado com o código e revisado em pull request como qualquer arquivo",
      "Arquivos aninhados dão instruções específicas a cada pacote",
    ],
    cons: [
      "Cada ferramenta tem regras próprias de descoberta, limites e precedência",
      "Arquivos grandes pesam em toda chamada e podem ser cortados por limites",
      "Instruções desatualizadas enganam o agente com a mesma confiança das corretas",
    ],
    alternatives: ["Instruções só no system prompt da aplicação, quando não há repositório", "Skills para procedimentos longos usados de vez em quando"],
  },
  knowledgeCheck: [
    {
      id: "precedence",
      prompt: "O AGENTS.md da raiz diz “use npm”, e o de packages/web diz “use pnpm”. O agente edita um arquivo em packages/web. O que vale?",
      options: [
        "npm, porque a raiz vale para tudo",
        "pnpm, porque o arquivo mais próximo do arquivo editado prevalece",
        "Nenhum, porque as instruções se anulam",
        "O agente escolhe ao acaso",
      ],
      correct: 1,
      explanation: "Os arquivos são empilhados da raiz até a pasta atual e o mais próximo vem por último. Só um pedido explícito no chat passaria por cima dele.",
      lesson: "14-05",
    },
    {
      id: "codex-limit",
      prompt: "No Codex, com o limite padrão de 32 KiB, a pilha é global 2 KiB, raiz 28 KiB e pacote 5 KiB. O que acontece trabalhando no pacote?",
      options: [
        "Entram os três arquivos",
        "O arquivo do pacote fica de fora, porque a soma passaria de 32 KiB",
        "O arquivo da raiz é cortado pela metade",
        "O Codex dá erro e não inicia",
      ],
      correct: 1,
      explanation: "2 + 28 = 30 KiB cabem; somar mais 5 daria 35 KiB. O Codex para de acrescentar arquivos ao chegar no limite, e o mais específico, o último, fica de fora.",
      lesson: "14-05",
    },
  ],
  related: ["14-04", "14-06", "09-07"],
  references: [
    { title: "AGENTS.md: a simple, open format for guiding coding agents", url: "https://agents.md/", kind: "docs" },
    { title: "Documentação do Codex: AGENTS.md", url: "https://learn.chatgpt.com/docs/agent-configuration/agents-md", kind: "docs" },
    { title: "Claude Code: How Claude remembers your project", url: "https://code.claude.com/docs/en/memory", kind: "docs" },
  ],
};

export default lesson;
