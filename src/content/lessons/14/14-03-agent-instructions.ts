import type { LessonContent } from "../../../types/content";

// Orçamento de instruções contra contexto da tarefa, calculado aqui. As instruções são carregadas em toda
// chamada ao modelo. Estimamos os tokens por linha a partir de linhas reais de um arquivo de instruções
// (4 caracteres por token, como no módulo 05) e comparamos um arquivo enxuto com um inchado ao longo de uma
// sessão de 40 chamadas.

const sampleLines = [
  "- Rodar um arquivo de teste: pnpm vitest run caminho/do/arquivo.test.ts",
  "- Typecheck: pnpm tsc --noEmit",
  "- Use os helpers de erro em src/lib/errors.ts; nunca lance strings soltas",
  "- src/legacy/ ainda está em uso, mas não copie os padrões dele em código novo",
  "- Testes de integração precisam de DATABASE_URL; veja .env.example",
  "- Pronto = testes do pacote passando e typecheck limpo",
];

const estimateTokens = (text: string) => Math.ceil(text.length / 4);
const tokensPerLine = sampleLines.reduce((sum, line) => sum + estimateTokens(line), 0) / sampleLines.length;

const SYSTEM_PROMPT = 3_000;
const TOOL_DEFINITIONS = 6_000;
const LEAN_LINES = 60;
const BLOATED_LINES = 600;
const TASK_REQUEST = 400;
const CALLS = 40;

const lean = Math.round(LEAN_LINES * tokensPerLine);
const bloated = Math.round(BLOATED_LINES * tokensPerLine);
const firstCall = (instructions: number) => SYSTEM_PROMPT + TOOL_DEFINITIONS + instructions + TASK_REQUEST;
const instructionShare = (instructions: number) => instructions / firstCall(instructions);
const sessionInstructionTokens = (instructions: number) => CALLS * instructions;
const extraPerSession = sessionInstructionTokens(bloated) - sessionInstructionTokens(lean);
const taskShareLean = TASK_REQUEST / firstCall(lean);
const taskShareBloated = TASK_REQUEST / firstCall(bloated);

const sections = [
  { label: "papel e objetivo", tokens: 120 },
  { label: "ambiente", tokens: 180 },
  { label: "comandos", tokens: 160 },
  { label: "convenções", tokens: 220 },
  { label: "armadilhas", tokens: 140 },
  { label: "pronto quando", tokens: 80 },
];
const largestSection = Math.max(...sections.map((section) => section.tokens));

const altitudes = ["regras rígidas (if/else)", "altitude certa", "vago demais"];
const altitudeTraits = ["casos novos", "previsível", "poucos tokens"];
const altitudeValues = [
  [0, 1, 0],
  [1, 1, 1],
  [0.5, 0, 1],
];

const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const percent = (value: number) => `${(value * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const decimal = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

const lesson: LessonContent = {
  id: "14-03",
  subtitle: "O manual que o agente relê em toda chamada: o que escrever, em que altura, e quanto do contexto ele pode ocupar.",
  objectives: [
    "Listar as seções de boas instruções para um agente",
    "Escrever instruções na altitude certa, nem regras rígidas nem conselhos vagos",
    "Calcular o custo em tokens de um arquivo de instruções ao longo de uma sessão",
    "Separar o que precisa estar sempre carregado do que pode vir sob demanda",
  ],
  steps: [
    {
      id: "manual",
      shortTitle: "O manual",
      title: "O manual do colega novo",
      tag: "context",
      body: [
        "Um colega novo chega e você entrega um manual. Se ele tiver 300 páginas, ninguém lê; se tiver duas linhas (“seja cuidadoso”), não ajuda. O manual bom diz o que ele não descobriria sozinho: como rodar os testes, qual pasta parece abandonada mas não está, o que conta como trabalho terminado.",
        "As [[instruções do agente|agent-instructions]] são esse manual. Ficam no [[system prompt|system-prompt]] e em arquivos que o harness carrega no início de cada sessão, como o [[arquivo de contexto|context-file]] do projeto. A diferença para um prompt comum: elas são relidas em toda chamada do loop, por toda a sessão.",
      ],
      keyIdea: "Instruções de agente são relidas em toda chamada; escreva só o que o agente não descobriria lendo o código.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "assembly",
            piece: "block-diagram",
            blocks: [
              { id: "instructions", kind: "documents", label: "instruções", col: 0, row: 0 },
              { id: "task", kind: "user", label: "tarefa", col: 0, row: 1 },
              { id: "context", kind: "context", label: "contexto", col: 1, row: 0.5 },
              { id: "llm", kind: "llm", label: "modelo", col: 2, row: 0.5 },
              { id: "agent", kind: "agent", label: "próxima ação", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "instructions", to: "context", label: "toda chamada" },
              { from: "task", to: "context", label: "uma vez" },
              { from: "context", to: "llm" },
              { from: "llm", to: "agent" },
            ],
            active: "instructions",
          },
        ],
      },
      alt: "As instruções, em destaque, entram no contexto em toda chamada; a tarefa entra uma vez; o contexto vai ao modelo, que decide a próxima ação.",
    },
    {
      id: "sections",
      shortTitle: "Seções",
      title: "O que escrever",
      tag: "mechanism",
      body: [
        "Um bom manual de agente cabe em poucas seções: quem ele é e qual o objetivo; o ambiente (linguagem, pastas, serviços); os comandos exatos de build, teste e lint; as convenções que o código não mostra; as armadilhas conhecidas; e o critério de pronto.",
        `A seção de comandos é a de maior retorno: com ela, o agente confere o próprio trabalho. A de convenções tende a inchar (na cena, é a maior, com ${integer(largestSection)} tokens). Cada linha deve passar no teste: “se eu apagar isto, o agente erra?”. Se não, apague.`,
      ],
      keyIdea: "Papel, ambiente, comandos, convenções, armadilhas e critério de pronto. O resto o agente lê no código.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "sections-stream",
            piece: "token-stream",
            tokens: sections.map((section) => section.label),
            bars: sections.map((section) => section.tokens / largestSection),
            keys: [2],
            color: "module-14",
          },
        ],
      },
      alt: `As seções de um arquivo de instruções com barras do tamanho de cada uma: ${sections.map((section) => `${section.label} com ${section.tokens} tokens`).join(", ")}; comandos está em destaque.`,
    },
    {
      id: "altitude",
      shortTitle: "Altitude",
      title: "Nem roteiro, nem conselho vago",
      tag: "mechanism",
      body: [
        "Instruções de avião em altitude errada não servem: perto demais do chão, você vê cada árvore e perde o caminho; alto demais, só vê nuvens. A Anthropic usa a mesma imagem: o system prompt deve estar na altitude certa, entre a lógica rígida de “se X, faça Y” e a orientação vaga que supõe contexto que o modelo não tem.",
        "Lógica rígida é previsível mas quebra no primeiro caso não previsto. Conselho vago (“escreva código bom”) custa pouco e não muda nada. A altitude certa dá heurísticas concretas com o motivo: “use os helpers de src/lib/errors.ts, porque o monitoramento lê o código de erro deles”. Com o motivo, o modelo generaliza para casos que você não escreveu.",
      ],
      keyIdea: "Dê heurísticas concretas e o porquê; o motivo deixa o modelo acertar casos que a regra não previu.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "altitude-matrix",
            piece: "matrix",
            rows: altitudes,
            cols: altitudeTraits,
            values: altitudeValues,
            scale: { min: 0, max: 1 },
            highlight: { row: 1, col: 0 },
            color: "module-14",
          },
        ],
      },
      alt: "Matriz de três estilos de instrução contra três qualidades: regras rígidas são previsíveis mas não cobrem casos novos; o vago gasta poucos tokens mas não é previsível; a altitude certa cobre os três, em destaque.",
    },
    {
      id: "budget",
      shortTitle: "A conta",
      title: "O orçamento das instruções",
      tag: "example",
      body: [
        `Linhas típicas de um arquivo de instruções têm uns ${decimal(tokensPerLine)} tokens. Um arquivo enxuto de ${LEAN_LINES} linhas custa ${integer(lean)} tokens; um inchado de ${BLOATED_LINES} linhas, ${integer(bloated)}. Somando system prompt (${integer(SYSTEM_PROMPT)}) e definições de ferramentas (${integer(TOOL_DEFINITIONS)}), o pedido real do usuário, ${integer(TASK_REQUEST)} tokens, vira ${percent(taskShareLean)} da primeira chamada no caso enxuto e ${percent(taskShareBloated)} no inchado.`,
        `Como as instruções são reenviadas em toda chamada, uma sessão de ${CALLS} chamadas paga ${integer(extraPerSession)} tokens a mais com o arquivo inchado. O [[prompt caching|prompt-caching]] barateia esse prefixo repetido, mas não devolve atenção: cada linha disputa o foco do modelo em toda tarefa, relevante ou não. A documentação do Claude Code recomenda manter cada CLAUDE.md abaixo de 200 linhas.`,
      ],
      keyIdea: "Instrução é custo fixo por chamada. Multiplique pelo número de chamadas antes de acrescentar uma linha.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "budget-chart",
            piece: "chart",
            kind: "bar",
            series: [
              { label: "system prompt", value: SYSTEM_PROMPT },
              { label: "ferramentas", value: TOOL_DEFINITIONS },
              { label: `instruções ${LEAN_LINES} linhas`, value: lean },
              { label: `instruções ${BLOATED_LINES} linhas`, value: bloated },
              { label: "pedido do usuário", value: TASK_REQUEST },
            ],
            highlight: 3,
            color: "module-14",
          },
          {
            id: "budget-numbers",
            piece: "metrics-panel",
            metrics: [
              { id: "lean", label: "instruções na 1ª chamada (enxuto)", value: percent(instructionShare(lean)), color: "success" },
              { id: "bloated", label: "instruções na 1ª chamada (inchado)", value: percent(instructionShare(bloated)), color: "danger" },
              { id: "session", label: `a mais em ${CALLS} chamadas`, value: `${integer(extraPerSession)} tokens` },
            ],
            highlight: "bloated",
          },
        ],
      },
      alt: `Barras de tokens da primeira chamada: system prompt ${integer(SYSTEM_PROMPT)}, ferramentas ${integer(TOOL_DEFINITIONS)}, instruções enxutas ${integer(lean)}, instruções inchadas ${integer(bloated)} e pedido do usuário ${integer(TASK_REQUEST)}. As instruções inchadas somam ${integer(extraPerSession)} tokens a mais em ${CALLS} chamadas.`,
    },
    {
      id: "layers",
      shortTitle: "Camadas",
      title: "Sempre carregado ou sob demanda",
      tag: "tradeoff",
      body: [
        "Nem todo conhecimento precisa estar na mesa o tempo todo. O manual curto fica sempre aberto; o procedimento de deploy fica numa pasta que o colega abre quando vai fazer deploy.",
        "No harness, isso vira camadas: um núcleo pequeno sempre carregado, regras que só entram quando o agente toca certos arquivos, e procedimentos longos guardados como skills, que entram quando a tarefa pede. O preço é que o agente precisa perceber que algo existe para buscá-lo, por isso o núcleo deve apontar onde está o resto.",
      ],
      keyIdea: "Núcleo curto sempre presente, o resto sob demanda, e o núcleo dizendo onde o resto mora.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "assembly",
            piece: "block-diagram",
            blocks: [
              { id: "core", kind: "documents", label: "núcleo curto", col: 0, row: 0 },
              { id: "rules", kind: "documents", label: "regras por pasta", col: 0, row: 1 },
              { id: "skills", kind: "tool", label: "skills", col: 1, row: 1 },
              { id: "context", kind: "context", label: "contexto", col: 2, row: 0.5 },
              { id: "llm", kind: "llm", label: "modelo", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "core", to: "context", label: "sempre" },
              { from: "rules", to: "skills" },
              { from: "skills", to: "context", label: "sob demanda" },
              { from: "context", to: "llm" },
            ],
            active: "context",
          },
        ],
      },
      alt: "Um núcleo curto entra sempre no contexto, em destaque; regras por pasta e skills entram só sob demanda; o contexto vai ao modelo.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Instruções que pagam o próprio custo",
      tag: "summary",
      body: [
        "Boas instruções de agente são curtas, concretas e explicam o porquê. Elas trazem os comandos para o agente se conferir, as decisões que não estão no código e o critério de pronto. Cada linha é paga em toda chamada, em tokens e em atenção.",
        "A próxima aula separa dois tipos de linha que costumam se misturar nesses arquivos: as regras, que orientam, e as restrições, que precisam valer sempre.",
      ],
      keyIdea: "Escreva o mínimo que muda o comportamento, na altitude certa, e mova o resto para camadas sob demanda.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "checklist",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "role", label: "papel e objetivo" },
              { id: "env", label: "ambiente" },
              { id: "commands", label: "comandos exatos", color: "module-14" },
              { id: "conventions", label: "convenções com motivo" },
              { id: "traps", label: "armadilhas" },
              { id: "done", label: "critério de pronto", color: "module-14" },
            ],
          },
        ],
      },
      alt: "Chips do checklist de instruções: papel e objetivo, ambiente, comandos exatos, convenções com motivo, armadilhas e critério de pronto.",
    },
  ],
  realWorldExample:
    "A documentação do Claude Code recomenda que o CLAUDE.md traga só o que o agente não descobriria no código: os comandos exatos de teste, typecheck e lint, os lugares onde o código engana (um padrão antigo que não deve ser copiado), decisões que não estão no repositório e qualquer coisa que você já precisou corrigir duas vezes. Ela sugere ficar abaixo de 200 linhas por arquivo, porque arquivos longos consomem contexto e reduzem a aderência.",
  code: {
    language: "bash",
    source: `cat > CLAUDE.md <<'EOF'
# Comandos
- Instalar: pnpm install
- Um arquivo de teste: pnpm vitest run caminho/do/arquivo.test.ts
- Typecheck: pnpm tsc --noEmit

# Convenções
- Use os helpers de src/lib/errors.ts: o monitoramento lê o código de erro deles
- src/legacy/ ainda roda, mas não copie os padrões dele em código novo

# Pronto quando
- Testes do pacote passando e typecheck limpo
EOF
wc -l CLAUDE.md`,
    caption: "Um arquivo de instruções enxuto: comandos para o agente se conferir, convenções com motivo e critério de pronto. O wc -l ajuda a vigiar o tamanho.",
  },
  tradeOffs: {
    pros: [
      "Orienta o agente em toda chamada, sem você repetir o pedido",
      "Versionado no repositório, vale para todo o time",
      "Barato de mudar: é texto",
    ],
    cons: [
      "Custo fixo de tokens em cada chamada da sessão",
      "Arquivos longos diluem a atenção e reduzem a aderência",
      "Não garante nada: o modelo ainda decide se segue",
    ],
    alternatives: ["Regras por caminho e skills, para o que só importa em parte das tarefas", "Hooks e permissões, para o que não pode falhar"],
  },
  knowledgeCheck: [
    {
      id: "cut-line",
      prompt: "Qual linha mais merece sair de um arquivo de instruções de 400 linhas?",
      options: [
        "“Rodar os testes: pnpm vitest run”",
        "“O projeto usa React com componentes em src/components/”, algo visível em qualquer arquivo",
        "“src/legacy/ parece morto, mas ainda roda em produção”",
        "“Pronto = typecheck limpo e testes passando”",
      ],
      correct: 1,
      explanation: "O agente descobre a estrutura lendo o código. Comandos, armadilhas e critério de pronto são o que ele não deduz sozinho.",
      lesson: "14-03",
    },
    {
      id: "budget-math",
      prompt: "Um arquivo de instruções tem 2.000 tokens e uma sessão faz 50 chamadas. Cortar o arquivo pela metade economiza quantos tokens de entrada na sessão?",
      options: ["1.000", "25.000", "50.000", "100.000"],
      correct: 2,
      explanation: "As instruções vão em toda chamada: 1.000 tokens a menos × 50 chamadas = 50.000 tokens.",
      lesson: "14-03",
    },
  ],
  related: ["14-02", "14-04", "05-04"],
  references: [
    { title: "Anthropic: Effective context engineering for AI agents", url: "https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents", kind: "article" },
    { title: "Claude Code: How Claude remembers your project", url: "https://code.claude.com/docs/en/memory", kind: "docs" },
    { title: "Claude Code: Best practices", url: "https://code.claude.com/docs/en/best-practices", kind: "docs" },
  ],
};

export default lesson;
