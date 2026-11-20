import type { LessonContent } from "../../../types/content";

// Regras e restrições, calculadas aqui. Seis regras de um projeto são classificadas por duas perguntas: a
// regra tem exceções legítimas? o que ela protege, um passo obrigatório, um caminho ou a rede? A
// classificação decide onde cada regra mora. Depois, quatro arquivos de regras de um monorepo são carregados
// sempre ou só quando o agente toca arquivos do caminho declarado, e comparamos os tokens.

type Home = "instrução" | "hook" | "negação" | "sandbox";

interface Rule {
  text: string;
  hasExceptions: boolean;
  /** O que a regra protege: um passo obrigatório, um caminho ou a rede. */
  guards: "step" | "path" | "network";
}

const rules: Rule[] = [
  { text: "prefira exports nomeados", hasExceptions: true, guards: "path" },
  { text: "componentes em PascalCase", hasExceptions: true, guards: "path" },
  { text: "rode o formatador após editar", hasExceptions: false, guards: "step" },
  { text: "nunca leia .env", hasExceptions: false, guards: "path" },
  { text: "não edite migrations/", hasExceptions: false, guards: "path" },
  { text: "não acesse hosts externos", hasExceptions: false, guards: "network" },
];

const homes: Home[] = ["instrução", "hook", "negação", "sandbox"];
const classify = (rule: Rule): Home => {
  if (rule.hasExceptions) return "instrução";
  if (rule.guards === "network") return "sandbox";
  if (rule.guards === "step") return "hook";
  return "negação";
};
const placements = rules.map(classify);
const countIn = (home: Home) => placements.filter((placed) => placed === home).length;
const softCount = countIn("instrução");
const hardCount = rules.length - softCount;

const ruleFiles = [
  { id: "general", label: "geral", paths: "sem paths", tokens: 900, always: true },
  { id: "api", label: "api", paths: "src/api/**", tokens: 1_400, always: false },
  { id: "web", label: "web", paths: "src/web/**", tokens: 1_600, always: false },
  { id: "infra", label: "infra", paths: "infra/**", tokens: 1_100, always: false },
];
const allRules = ruleFiles.reduce((sum, file) => sum + file.tokens, 0);
const scopedFor = (id: string) =>
  ruleFiles.filter((file) => file.always || file.id === id).reduce((sum, file) => sum + file.tokens, 0);
const apiScoped = scopedFor("api");
const savingApi = 1 - apiScoped / allRules;

const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const percent = (value: number) => `${Math.round(value * 100)}%`;

const lesson: LessonContent = {
  id: "14-04",
  subtitle: "Placas orientam, cercas impedem. Como escrever regras que o agente segue e quando transformá-las em restrições que o ambiente impõe.",
  objectives: [
    "Diferenciar regra (orientação que o modelo interpreta) de restrição (limite que o harness impõe)",
    "Escrever regras específicas, verificáveis e com motivo",
    "Classificar uma regra pelo lugar onde ela deve morar: instrução, hook, negação ou sandbox",
    "Usar regras por caminho para não pagar tokens com regras que não se aplicam",
  ],
  steps: [
    {
      id: "signs",
      shortTitle: "Placas",
      title: "Placas e guard-rails",
      tag: "context",
      body: [
        "Numa estrada de serra há dois tipos de proteção. A placa “curva perigosa, 40 km/h” confia que o motorista vai ler e decidir. O guard-rail de aço não confia em ninguém: segura o carro mesmo que o motorista durma.",
        "No harness é igual. Uma regra num [[arquivo de regras|rules-file]] é a placa: o modelo lê, entende o motivo e decide se ela vale naquele caso. Uma [[restrição rígida|hard-constraint]] é o guard-rail: uma regra de negação, um hook que bloqueia ou um sandbox, que valem mesmo quando o modelo tenta o contrário. O [[guardrail|guardrail]] de verdade é o que não depende de leitura.",
      ],
      keyIdea: "Regra orienta quem lê; restrição segura quem não leu.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "road",
            piece: "block-diagram",
            blocks: [
              { id: "rules", kind: "documents", label: "regras", col: 0, row: 0 },
              { id: "agent", kind: "agent", label: "agente", col: 1, row: 0.5 },
              { id: "guard", kind: "guardrail", label: "restrições", col: 2, row: 0.5 },
              { id: "tool", kind: "tool", label: "ferramentas", col: 3, row: 0 },
              { id: "blocked", kind: "no-result", label: "barrado", col: 3, row: 1 },
            ],
            edges: [
              { from: "rules", to: "agent", label: "lê" },
              { from: "agent", to: "guard", label: "pedido" },
              { from: "guard", to: "tool", label: "passa" },
              { from: "guard", to: "blocked", label: "viola", variant: "alternative" },
            ],
            active: "guard",
            done: ["rules", "agent"],
          },
        ],
      },
      alt: "O agente lê as regras e faz um pedido; as restrições, em destaque, deixam o pedido chegar às ferramentas ou o barram por um caminho tracejado.",
    },
    {
      id: "good-rule",
      shortTitle: "Regra boa",
      title: "Como escrever uma regra que funciona",
      tag: "mechanism",
      body: [
        "“Escreva código limpo” não é regra: não dá para conferir. Compare com “use os helpers de src/lib/errors.ts para erros, porque o monitoramento lê o código de erro deles; nunca lance strings soltas”. Ela diz o quê, onde, por quê e o que fazer no lugar.",
        "Quatro testes para cada regra: é específica (aponta arquivo, comando ou padrão)? É verificável (dá para ver se foi seguida)? Tem motivo (o modelo generaliza a partir dele)? Tem alternativa (um “não faça X” sem “faça Y” deixa o agente sem caminho)? Regras que passam nos quatro são seguidas com mais consistência e brigam menos entre si.",
      ],
      keyIdea: "Uma regra boa é específica, verificável, explica o motivo e oferece a alternativa.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "rule-tests",
            piece: "pipeline",
            stages: [
              { id: "specific", label: "específica" },
              { id: "checkable", label: "verificável" },
              { id: "reason", label: "com motivo", color: "module-14" },
              { id: "alternative", label: "com alternativa" },
            ],
            active: "reason",
            done: ["specific", "checkable"],
          },
        ],
      },
      alt: "Quatro testes em sequência para uma regra: específica, verificável, com motivo, em destaque, e com alternativa.",
    },
    {
      id: "classify",
      shortTitle: "Onde mora",
      title: "Cada regra no seu lugar",
      tag: "mechanism",
      body: [
        "Três perguntas decidem onde uma regra mora. Ela tem exceções legítimas? Então fica como instrução, e o modelo decide caso a caso. Não tem exceção e é um passo que sempre precisa acontecer? Vira um hook. Não tem exceção e protege um caminho ou um comando? Vira uma regra de negação nas permissões. Protege a rede ou o sistema todo? Vai para o sandbox.",
        `Das ${rules.length} regras da matriz, ${softCount} ficam como instrução e ${hardCount} viram restrição: ${countIn("hook")} hook, ${countIn("negação")} regras de negação e ${countIn("sandbox")} limite de sandbox. Repare que “nunca leia .env” escrito só no texto é um convite ao erro: um ataque de [[prompt injection|prompt-injection]] pode convencer o modelo, mas não convence uma regra de negação.`,
      ],
      keyIdea: "Exceção legítima → instrução. Sem exceção → hook, negação ou sandbox, conforme o que a regra protege.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "homes",
            piece: "matrix",
            rows: rules.map((rule) => rule.text),
            cols: homes,
            values: placements.map((placed) => homes.map((home) => (home === placed ? 1 : 0))),
            scale: { min: 0, max: 1 },
            highlight: { row: 3, col: 2 },
            color: "module-14",
          },
        ],
      },
      alt: `Matriz de regras por lugar: ${rules.map((rule, index) => `${rule.text} vai para ${placements[index]}`).join("; ")}. “Nunca leia .env” como regra de negação está em destaque.`,
    },
    {
      id: "scoped",
      shortTitle: "Por caminho",
      title: "Regras que só aparecem quando importam",
      tag: "example",
      body: [
        "Num monorepo, as regras do frontend não ajudam quem mexe na infraestrutura. Carregar todas em toda tarefa é como pendurar o manual de todas as máquinas da fábrica em cada bancada.",
        `Uma [[regra por caminho|path-scoped-rule]] declara os arquivos a que se aplica. No Claude Code, é um markdown em .claude/rules/ com o campo paths no topo; ele só entra no contexto quando o agente trabalha com arquivos que casam com o padrão. Com os ${ruleFiles.length} arquivos da cena, carregar tudo custa ${integer(allRules)} tokens; numa tarefa em src/api/, entram só a geral e a da api, ${integer(apiScoped)} tokens, ${percent(savingApi)} a menos.`,
      ],
      keyIdea: "Regras por caminho cortam o custo fixo do contexto e evitam regras certas no lugar errado.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "scoped-chart",
            piece: "chart",
            kind: "bar",
            series: [
              { label: "tudo sempre", value: allRules },
              ...ruleFiles.filter((file) => !file.always).map((file) => ({ label: `tarefa em ${file.label}`, value: scopedFor(file.id) })),
            ],
            highlight: 1,
            color: "module-14",
          },
          {
            id: "scoped-numbers",
            piece: "metrics-panel",
            metrics: [
              { id: "all", label: "todas as regras", value: `${integer(allRules)} tokens`, color: "danger" },
              { id: "api", label: "tarefa em src/api/", value: `${integer(apiScoped)} tokens`, color: "success" },
              { id: "saving", label: "economia", value: percent(savingApi) },
            ],
            highlight: "saving",
          },
        ],
      },
      alt: `Barras de tokens de regras: ${integer(allRules)} carregando tudo sempre, contra ${ruleFiles.filter((file) => !file.always).map((file) => `${integer(scopedFor(file.id))} numa tarefa em ${file.label}`).join(", ")}; a tarefa na api economiza ${percent(savingApi)}.`,
    },
    {
      id: "layers",
      shortTitle: "Camadas",
      title: "Defesa em camadas",
      tag: "tradeoff",
      body: [
        "Uma restrição sozinha tem furos. Uma regra de negação para Bash(rm *) não pega um script Python que apaga arquivos; um sandbox não olha dentro das ferramentas de edição do próprio agente. Por isso as camadas se somam: a instrução explica, a permissão barra o pedido, o hook confere o caso específico e o sandbox limita o processo.",
        "O custo é rigidez e manutenção. Toda restrição bloqueia também os casos em que a ação estaria certa, e cada exceção vira configuração. Restrição demais faz o agente parar para pedir permissão o tempo todo, e a pessoa começa a aprovar sem ler, o que anula a proteção.",
      ],
      keyIdea: "Nenhuma camada cobre tudo; combine poucas restrições bem escolhidas em vez de muitas mal pensadas.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "road",
            piece: "block-diagram",
            blocks: [
              { id: "rules", kind: "documents", label: "instrução", col: 0, row: 0.5 },
              { id: "agent", kind: "agent", label: "agente", col: 1, row: 0.5 },
              { id: "guard", kind: "guardrail", label: "permissões", col: 2, row: 0 },
              { id: "hook", kind: "eval", label: "hook", col: 2, row: 1 },
              { id: "tool", kind: "server", label: "sandbox", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "rules", to: "agent", label: "explica" },
              { from: "agent", to: "guard", label: "barra pedidos" },
              { from: "agent", to: "hook", label: "confere casos" },
              { from: "guard", to: "tool" },
              { from: "hook", to: "tool", label: "limita o processo" },
            ],
            active: "tool",
            done: ["rules", "agent", "guard", "hook"],
          },
        ],
      },
      alt: "Camadas em volta do agente: a instrução explica, as permissões barram pedidos, o hook confere casos específicos e o sandbox, em destaque, limita o processo.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Regra no texto, garantia no ambiente",
      tag: "summary",
      body: [
        "Escreva regras específicas, verificáveis, com motivo e alternativa, e carregue-as só onde se aplicam. Quando uma regra não admite exceção, tire-a do texto e coloque-a no ambiente: hook para passos obrigatórios, negação para caminhos e comandos, sandbox para rede e sistema.",
        "A próxima aula mostra os dois arquivos de instrução mais usados hoje, AGENTS.md e CLAUDE.md: onde ficam, como são combinados e como um repositório serve a várias ferramentas.",
      ],
      keyIdea: "Pergunte de cada regra: ela tem exceção? A resposta diz onde ela mora.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "tally",
            piece: "metrics-panel",
            metrics: homes.map((home) => ({ id: home, label: home, value: `${countIn(home)} de ${rules.length}`, color: home === "instrução" ? undefined : "module-14" })),
            highlight: "negação",
          },
        ],
      },
      alt: `Contagem das ${rules.length} regras por lugar: ${homes.map((home) => `${countIn(home)} em ${home}`).join(", ")}.`,
    },
  ],
  realWorldExample:
    "No Claude Code, regras de projeto ficam em arquivos markdown dentro de .claude/rules/. Um arquivo com o campo paths no frontmatter, como src/api/**/*.ts, só é carregado quando o agente trabalha com arquivos que casam com o padrão. Para o que não pode falhar, a documentação manda sair do texto: a regra “nunca leia .env” vira uma regra de negação Read(./.env) nas permissões, aplicada pelo harness.",
  code: {
    language: "bash",
    source: `mkdir -p .claude/rules
cat > .claude/rules/api.md <<'EOF'
---
paths:
  - "src/api/**/*.ts"
---
# Regras da API
- Toda rota valida a entrada com o schema de src/api/schemas.ts
- Erros usam o formato padrão de src/api/errors.ts, porque o cliente depende dele
EOF`,
    caption: "Uma regra por caminho do Claude Code: o frontmatter paths faz o arquivo entrar no contexto só quando o agente toca arquivos da API.",
  },
  tradeOffs: {
    pros: [
      "Regras com motivo generalizam para casos não previstos",
      "Restrições valem mesmo contra prompt injection e esquecimento",
      "Regras por caminho reduzem o custo fixo de contexto",
    ],
    cons: [
      "Regras no texto podem ser ignoradas ou mal interpretadas",
      "Restrições não veem exceções legítimas e exigem manutenção",
      "Camadas demais geram interrupções e aprovações automáticas sem leitura",
    ],
    alternatives: ["Revisão humana obrigatória para ações de alto risco", "Validar a saída depois, quando bloquear antes é caro demais"],
  },
  knowledgeCheck: [
    {
      id: "classify-rule",
      prompt: "“Sempre rode o script de cabeçalho de licença depois de criar um arquivo.” Onde essa regra deve morar?",
      options: [
        "No CLAUDE.md, com ênfase",
        "Num hook que roda depois da ferramenta de escrita",
        "Numa regra de negação",
        "No sandbox",
      ],
      correct: 1,
      explanation: "É um passo que precisa acontecer sempre, sem exceção. Um hook depois da escrita garante que ele roda, sem depender do modelo lembrar.",
      lesson: "14-04",
    },
    {
      id: "scoped-math",
      prompt: "Um repositório tem regras gerais de 500 tokens e três arquivos por caminho de 1.500 tokens cada. Numa tarefa que só toca um desses caminhos, quanto entra de regras com escopo por caminho?",
      options: ["500", "2.000", "3.500", "5.000"],
      correct: 1,
      explanation: "Entram as gerais (500) e só o arquivo do caminho tocado (1.500): 2.000 tokens, contra 5.000 carregando tudo.",
      lesson: "14-04",
    },
  ],
  related: ["14-03", "14-05", "05-11"],
  references: [
    { title: "Claude Code: How Claude remembers your project (regras em .claude/rules)", url: "https://code.claude.com/docs/en/memory", kind: "docs" },
    { title: "Claude Code: Configure permissions", url: "https://code.claude.com/docs/en/permissions", kind: "docs" },
    { title: "Claude Code: Best practices", url: "https://code.claude.com/docs/en/best-practices", kind: "docs" },
  ],
};

export default lesson;
