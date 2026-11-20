import type { LessonContent } from "../../../types/content";

// Custo de contexto de skills, calculado aqui. Seis skills de brinquedo, cada uma com uma descrição real
// (estimada em 4 caracteres por token), um corpo (o SKILL.md) e referências. Carregar tudo no início contra
// revelação progressiva: no início só nome e descrição; o corpo entra quando a skill é ativada; a referência,
// só se o corpo mandar ler.

interface Skill {
  name: string;
  description: string;
  bodyTokens: number;
  referenceTokens: number;
}

const skills: Skill[] = [
  { name: "deploy", description: "Faz deploy do app em produção. Use só quando a pessoa pedir deploy explicitamente.", bodyTokens: 1_800, referenceTokens: 4_000 },
  { name: "release-notes", description: "Escreve notas de versão a partir dos commits desde a última tag.", bodyTokens: 1_200, referenceTokens: 2_500 },
  { name: "migration", description: "Cria e revisa migrations do banco. Use ao mudar schema em src/db/.", bodyTokens: 2_400, referenceTokens: 6_000 },
  { name: "pdf-report", description: "Gera relatórios em PDF com o template da empresa e o script de render.", bodyTokens: 2_000, referenceTokens: 5_000 },
  { name: "triage", description: "Classifica issues novas por área e prioridade, seguindo o guia do time.", bodyTokens: 1_000, referenceTokens: 1_500 },
  { name: "api-review", description: "Revisa mudanças em rotas da API contra o guia de estilo e o schema.", bodyTokens: 1_600, referenceTokens: 3_000 },
];

const estimateTokens = (text: string) => Math.ceil(text.length / 4);
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const listing = sum(skills.map((skill) => estimateTokens(`${skill.name}: ${skill.description}`)));
const everything = listing + sum(skills.map((skill) => skill.bodyTokens + skill.referenceTokens));
const active = skills.find((skill) => skill.name === "migration") ?? skills[0];
const progressive = listing + active.bodyTokens + active.referenceTokens;
const saving = 1 - progressive / everything;
const perSkillListing = listing / skills.length;
const LISTING_CAP_CHARS = 1_536;
const SKILL_MD_MAX_LINES = 500;

const visibility = ["padrão", "disable-model-invocation: true", "user-invocable: false"];
const visibilityCols = ["descrição no contexto", "modelo pode ativar", "você pode chamar com /"];
const visibilityValues = [
  [1, 1, 1],
  [0, 0, 1],
  [1, 1, 0],
];

const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const percent = (value: number) => `${Math.round(value * 100)}%`;

const lesson: LessonContent = {
  id: "14-06",
  subtitle: "Receitas que o agente guarda na gaveta e só abre quando vai cozinhar: skills, revelação progressiva e procedimentos que saem sempre do mesmo jeito.",
  objectives: [
    "Descrever a estrutura de uma skill: SKILL.md, scripts e referências",
    "Explicar a revelação progressiva em três estágios: descoberta, ativação e execução",
    "Calcular quanto contexto a revelação progressiva economiza",
    "Decidir quem pode disparar uma skill: o modelo, a pessoa ou os dois",
  ],
  steps: [
    {
      id: "recipes",
      shortTitle: "Receitas",
      title: "Um caderno de receitas fechado",
      tag: "context",
      body: [
        "Uma cozinheira não decora todas as receitas do restaurante. Ela sabe o índice: “risoto está na página 40”. Quando chega o pedido de risoto, abre a página, segue o passo a passo e usa o termômetro que fica junto. Saber o índice é barato; abrir a receita só quando precisa mantém a bancada livre.",
        "Uma [[skill|skill]] é uma dessas receitas: uma pasta com um SKILL.md (nome, descrição de quando usar e as instruções) e, se preciso, scripts e materiais de referência. Ela transforma um procedimento de vários passos num [[workflow reutilizável|reusable-workflow]]: escrito uma vez, executado igual toda vez, pelo agente ou por um comando.",
      ],
      keyIdea: "Skill é conhecimento de procedimento empacotado em pasta, aberto só quando a tarefa pede.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "kitchen",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "pedido", col: 0, row: 0.5 },
              { id: "agent", kind: "agent", label: "agente", col: 1, row: 0.5 },
              { id: "skills", kind: "documents", label: "skills/", col: 2, row: 0 },
              { id: "script", kind: "tool", label: "scripts/", col: 2, row: 1 },
              { id: "answer", kind: "answer", label: "resultado", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "user", to: "agent" },
              { from: "agent", to: "skills", label: "abre a receita" },
              { from: "agent", to: "script", label: "executa" },
              { from: "skills", to: "answer" },
              { from: "script", to: "answer" },
            ],
            active: "skills",
          },
        ],
      },
      alt: "O pedido chega ao agente, que abre a receita na pasta de skills, em destaque, e executa os scripts dela para chegar ao resultado.",
    },
    {
      id: "anatomy",
      shortTitle: "Anatomia",
      title: "O que tem dentro da pasta",
      tag: "mechanism",
      body: [
        "O formato aberto Agent Skills, criado pela Anthropic e adotado por várias ferramentas, define a pasta: um SKILL.md obrigatório, com nome e descrição no topo e as instruções no corpo, e pastas opcionais para scripts, referências e modelos de arquivo.",
        "A descrição é a peça que mais trabalha: é por ela que o agente decide se a skill serve. “Ajuda com banco” não dispara nada; “cria e revisa migrations; use ao mudar schema em src/db/” dispara na hora certa. Scripts são executados, não lidos, então um script de 2 mil linhas custa só a saída dele no contexto.",
      ],
      keyIdea: "Nome e descrição decidem quando a skill entra; o corpo diz como; scripts fazem sem ocupar contexto.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "folder",
            piece: "graph",
            nodes: [
              { id: "root", label: "migration/", x: 0.12, y: 0.5, color: "module-14" },
              { id: "skill", label: "SKILL.md: nome + descrição", x: 0.45, y: 0.15, color: "module-14" },
              { id: "body", label: "instruções", x: 0.82, y: 0.15 },
              { id: "refs", label: "references/checklist.md", x: 0.5, y: 0.55 },
              { id: "scripts", label: "scripts/validate.py", x: 0.5, y: 0.9 },
              { id: "run", label: "executado, não lido", x: 0.86, y: 0.9, color: "success" },
            ],
            edges: [
              { from: "root", to: "skill" },
              { from: "skill", to: "body" },
              { from: "root", to: "refs" },
              { from: "root", to: "scripts" },
              { from: "scripts", to: "run" },
            ],
            highlight: ["skill"],
          },
        ],
      },
      alt: "A pasta migration contém o SKILL.md, com nome e descrição em destaque e as instruções, uma referência checklist.md e um script validate.py, que é executado em vez de lido.",
    },
    {
      id: "progressive",
      shortTitle: "Em camadas",
      title: "Revelação progressiva",
      tag: "mechanism",
      body: [
        "A especificação descreve três estágios. Descoberta: no início da sessão, o agente carrega só nome e descrição de cada skill. Ativação: quando a tarefa casa com uma descrição, ele lê o SKILL.md inteiro. Execução: segue as instruções, roda scripts e lê as referências que o corpo apontar.",
        `Isso é [[revelação progressiva|progressive-disclosure]], e é o que permite ter dezenas de skills instaladas sem encher o contexto. No Claude Code, a descrição somada ao campo when_to_use é cortada em ${integer(LISTING_CAP_CHARS)} caracteres na listagem, e a documentação recomenda manter o SKILL.md abaixo de ${SKILL_MD_MAX_LINES} linhas, levando o detalhe para arquivos de referência.`,
      ],
      keyIdea: "Índice sempre, receita quando ativada, anexos só se a receita mandar.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "stages",
            piece: "block-diagram",
            blocks: [
              { id: "listing", kind: "context", label: "nomes + descrições", col: 0, row: 0.5 },
              { id: "llm", kind: "llm", label: "casa com a tarefa?", col: 1, row: 0.5 },
              { id: "body", kind: "documents", label: "SKILL.md", col: 2, row: 0 },
              { id: "refs", kind: "documents", label: "referências", col: 3, row: 0 },
              { id: "script", kind: "tool", label: "scripts", col: 3, row: 1 },
            ],
            edges: [
              { from: "listing", to: "llm", label: "sempre" },
              { from: "llm", to: "body", label: "ativa" },
              { from: "body", to: "refs", label: "se precisar" },
              { from: "body", to: "script", label: "roda" },
            ],
            active: "body",
            done: ["listing", "llm"],
          },
        ],
      },
      alt: "Nomes e descrições ficam sempre no contexto; quando o modelo vê que a tarefa casa, ativa o SKILL.md, em destaque, que lê referências se precisar e roda scripts.",
    },
    {
      id: "math",
      shortTitle: "A conta",
      title: "Seis skills, uma ativada",
      tag: "example",
      body: [
        `As ${skills.length} skills da cena têm descrições de uns ${integer(perSkillListing)} tokens cada; a listagem inteira custa ${integer(listing)} tokens. Carregar tudo no início, corpos e referências, daria ${integer(everything)} tokens antes de o agente fazer qualquer coisa.`,
        `A tarefa é mudar o schema do banco, então só a skill ${active.name} é ativada, com corpo (${integer(active.bodyTokens)}) e referência (${integer(active.referenceTokens)}). Total: ${integer(progressive)} tokens, ${percent(saving)} a menos. E a conta melhora com o número de skills: cada skill a mais custa só a sua descrição até ser usada.`,
      ],
      keyIdea: "Com revelação progressiva, o custo de ter uma skill é a descrição; o custo de usá-la só aparece quando ela serve.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "cost",
            piece: "chart",
            kind: "bar",
            series: [
              { label: "listagem", value: listing },
              { label: `corpo de ${active.name}`, value: active.bodyTokens },
              { label: "referência", value: active.referenceTokens },
              { label: "progressivo", value: progressive },
              { label: "tudo no início", value: everything },
            ],
            highlight: 3,
            color: "module-14",
          },
          {
            id: "cost-numbers",
            piece: "metrics-panel",
            metrics: [
              { id: "all", label: "tudo no início", value: `${integer(everything)} tokens`, color: "danger" },
              { id: "progressive", label: "progressivo", value: `${integer(progressive)} tokens`, color: "success" },
              { id: "saving", label: "economia", value: percent(saving) },
            ],
            highlight: "progressive",
          },
        ],
      },
      alt: `Barras de tokens: listagem ${integer(listing)}, corpo de ${active.name} ${integer(active.bodyTokens)}, referência ${integer(active.referenceTokens)}, total progressivo ${integer(progressive)} e tudo no início ${integer(everything)}; a revelação progressiva economiza ${percent(saving)}.`,
    },
    {
      id: "who",
      shortTitle: "Quem dispara",
      title: "Quem pode disparar a skill",
      tag: "tradeoff",
      body: [
        "Uma receita de bolo o assistente pode começar sozinho. A receita de “fechar o caixa do mês” só a gerente dispara. Skills com efeito colateral, como deploy ou publicar uma versão, não deveriam ser ativadas porque o modelo achou a descrição parecida com o pedido.",
        "No Claude Code isso é configurável no frontmatter. Por padrão, a descrição fica no contexto, o modelo pode ativar e você pode chamar com /nome. Com disable-model-invocation: true, a descrição sai do contexto e só você dispara. Com user-invocable: false, a skill some do menu e só o modelo a usa, bom para conhecimento de fundo. Ativação automática é cômoda, mas depende de uma descrição bem escrita.",
      ],
      keyIdea: "Skill com efeito colateral deve ser disparada por pessoa; conhecimento de fundo pode ficar com o modelo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "who-matrix",
            piece: "matrix",
            rows: visibility,
            cols: visibilityCols,
            values: visibilityValues,
            scale: { min: 0, max: 1 },
            highlight: { row: 1, col: 2 },
            color: "module-14",
          },
        ],
      },
      alt: "Matriz de visibilidade de uma skill no Claude Code: no padrão, a descrição está no contexto, o modelo ativa e você chama com barra; com disable-model-invocation, só você chama, em destaque; com user-invocable false, só o modelo ativa.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Procedimentos na gaveta certa",
      tag: "summary",
      body: [
        "Skills tiram procedimentos longos do arquivo de instruções e os guardam em pastas que entram em camadas: descrição sempre, corpo na ativação, referências e scripts na execução. Descrições precisas fazem a skill aparecer na hora certa; skills com efeito colateral ficam sob o comando de uma pessoa.",
        "Uma skill ainda é texto que o modelo decide seguir. Para que algo aconteça sempre, num momento exato do ciclo do agente, o harness tem outro mecanismo: os hooks, na próxima aula.",
      ],
      keyIdea: "Skill guarda o como fazer; o harness decide quando ela entra no contexto.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "discover", label: "descoberta: nome + descrição" },
              { id: "activate", label: "ativação: SKILL.md", color: "module-14" },
              { id: "execute", label: "execução: scripts e referências" },
              { id: "control", label: "efeito colateral: só por comando" },
            ],
          },
        ],
      },
      alt: "Chips com os estágios de uma skill: descoberta por nome e descrição, ativação do SKILL.md, execução de scripts e referências, e skills com efeito colateral só por comando.",
    },
  ],
  realWorldExample:
    "No Claude Code, uma skill de projeto fica em .claude/skills/<nome>/SKILL.md e vai para o git com o time; as pessoais ficam em ~/.claude/skills/. Ela pode ser chamada com /nome ou ativada pelo modelo quando a descrição casa com o pedido. Depois de uma compactação automática, o Claude Code reanexa a invocação mais recente de cada skill, mantendo os primeiros 5.000 tokens de cada uma.",
  code: {
    language: "bash",
    source: `mkdir -p .claude/skills/migration/scripts
cat > .claude/skills/migration/SKILL.md <<'EOF'
---
name: migration
description: Cria e revisa migrations do banco. Use ao mudar o schema em src/db/.
---
1. Gere a migration com: pnpm db:generate
2. Rode scripts/validate.py e corrija o que ele apontar
3. Para tabelas grandes, siga references/checklist.md
EOF`,
    caption: "Uma skill mínima: o frontmatter com nome e descrição entra na listagem; o corpo, só quando a skill é ativada.",
  },
  tradeOffs: {
    pros: [
      "Dezenas de procedimentos disponíveis com custo de contexto baixo",
      "O mesmo procedimento sai igual toda vez, versionado com o projeto",
      "Formato aberto, reaproveitável entre ferramentas compatíveis",
    ],
    cons: [
      "Uma descrição vaga faz a skill não disparar ou disparar na hora errada",
      "Ainda é texto: o modelo pode pular um passo",
      "Scripts dentro de skills rodam código, então pedem a mesma revisão de qualquer código",
    ],
    alternatives: ["Instruções no arquivo de projeto, para o que vale em toda tarefa", "Hooks, para passos que precisam acontecer sempre"],
  },
  knowledgeCheck: [
    {
      id: "deploy-skill",
      prompt: "Uma skill de deploy foi ativada sozinha quando alguém perguntou “como funciona o deploy?”. Qual ajuste resolve?",
      options: [
        "Escrever a descrição em maiúsculas",
        "Marcar a skill para ser disparada só por comando da pessoa (disable-model-invocation: true no Claude Code)",
        "Apagar a skill",
        "Colocar o procedimento de deploy no CLAUDE.md",
      ],
      correct: 1,
      explanation: "Skills com efeito colateral não devem ser ativadas pelo modelo. Desligar a invocação automática tira a descrição do contexto e deixa o disparo com a pessoa.",
      lesson: "14-06",
    },
    {
      id: "skills-math",
      prompt: "Há 30 skills com descrições de 40 tokens e corpos de 2.000 tokens. Numa tarefa que ativa uma skill, quantos tokens de skills entram com revelação progressiva?",
      options: ["1.200", "3.200", "60.000", "61.200"],
      correct: 1,
      explanation: "A listagem custa 30 × 40 = 1.200 tokens e o corpo da skill ativada, 2.000: 3.200 tokens, contra 61.200 carregando tudo.",
      lesson: "14-06",
    },
  ],
  related: ["14-05", "14-07", "12-07"],
  references: [
    { title: "Agent Skills: overview and specification", url: "https://agentskills.io/", kind: "docs" },
    { title: "Documentação do Claude Code: Skills", url: "https://code.claude.com/docs/en/skills", kind: "docs" },
    { title: "Anthropic: Effective context engineering for AI agents", url: "https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents", kind: "article" },
  ],
};

export default lesson;
