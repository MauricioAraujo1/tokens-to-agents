import type { LessonContent } from "../../../types/content";

// Uma política de permissões aplicada a 40 chamadas de ferramenta, calculada aqui. As regras seguem a sintaxe
// e a ordem documentadas no Claude Code: deny, depois ask, depois allow; vale a primeira que casar. Sem regra
// que case, leituras no diretório de trabalho rodam sem perguntar e o resto pede aprovação (modo padrão).

type Tool = "Read" | "Grep" | "Edit" | "Bash" | "WebFetch";
type Decision = "allow" | "ask" | "deny";

interface Call {
  tool: Tool;
  arg: string;
}

const repeat = (count: number, call: Call): Call[] => Array.from({ length: count }, () => call);

const log: Call[] = [
  ...repeat(12, { tool: "Read", arg: "src/app/handlers.ts" }),
  ...repeat(6, { tool: "Grep", arg: "src" }),
  ...repeat(8, { tool: "Bash", arg: "pnpm test billing" }),
  ...repeat(9, { tool: "Edit", arg: "src/app/handlers.ts" }),
  { tool: "Bash", arg: "git push origin main" },
  { tool: "WebFetch", arg: "domain:pypi.org" },
  { tool: "WebFetch", arg: "domain:paste.example" },
  { tool: "Read", arg: "./.env" },
  { tool: "Bash", arg: "rm -rf build" },
];

const policy: Record<Decision, string[]> = {
  deny: ["Read(./.env)", "Bash(rm *)"],
  ask: ["Bash(git push *)"],
  allow: ["Bash(pnpm test *)", "Edit(src/**)"],
};

const READ_ONLY: Tool[] = ["Read", "Grep"];
const escapeRegex = (text: string) => text.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
function matches(rule: string, call: Call): boolean {
  const parsed = rule.match(/^(\w+)\((.*)\)$/);
  if (!parsed || parsed[1] !== call.tool) return false;
  const pattern = escapeRegex(parsed[2]).replace(/\*\*?/g, ".*");
  return new RegExp(`^${pattern}$`).test(call.arg);
}
const order: Decision[] = ["deny", "ask", "allow"];
function decide(call: Call, rules: Record<Decision, string[]>): Decision {
  for (const decision of order) {
    if (rules[decision].some((rule) => matches(rule, call))) return decision;
  }
  return READ_ONLY.includes(call.tool) ? "allow" : "ask";
}

const noRules: Record<Decision, string[]> = { deny: [], ask: [], allow: [] };
const tally = (rules: Record<Decision, string[]>) => {
  const decisions = log.map((call) => decide(call, rules));
  return {
    allow: decisions.filter((decision) => decision === "allow").length,
    ask: decisions.filter((decision) => decision === "ask").length,
    deny: decisions.filter((decision) => decision === "deny").length,
  };
};
const withPolicy = tally(policy);
const withoutRules = tally(noRules);
const envCall = log.find((call) => call.arg === "./.env") ?? log[0];
const decisionLabel: Record<Decision, string> = { allow: "livre", ask: "pergunta", deny: "bloqueada" };
const envWithoutRules = decisionLabel[decide(envCall, noRules)];
const promptsCut = withoutRules.ask - withPolicy.ask;

const modes = ["default", "acceptEdits", "plan", "dontAsk", "bypassPermissions"];
const modeCols = ["ler arquivos", "editar arquivos", "outros comandos"];
const modeValues = [
  [1, 0.5, 0.5],
  [1, 1, 0.5],
  [1, 0, 0],
  [1, 0, 0],
  [1, 1, 1],
];

const percent = (value: number) => `${Math.round(value * 100)}%`;

const lesson: LessonContent = {
  id: "14-08",
  subtitle: "O crachá do agente: ferramentas desenhadas para um modelo usar, regras de allow, ask e deny, modos de permissão e o princípio do menor privilégio.",
  objectives: [
    "Desenhar ferramentas que um agente usa bem: nomes, saídas e erros",
    "Avaliar uma chamada contra regras de deny, ask e allow, na ordem certa",
    "Comparar modos de permissão pelo que cada um deixa rodar sem perguntar",
    "Calcular quantas chamadas uma política libera, pergunta e bloqueia",
  ],
  steps: [
    {
      id: "badge",
      shortTitle: "Crachá",
      title: "O crachá que abre algumas portas",
      tag: "context",
      body: [
        "Num hospital, o crachá do estagiário abre a biblioteca e a cantina, o da enfermeira abre a farmácia, e nenhum abre o cofre sem alguém autorizar na hora. Ninguém confia na boa vontade: a porta confere o crachá.",
        "O agente tem dois tipos de controle sobre o que toca. As ferramentas definem o que ele consegue fazer. As permissões definem o que ele pode fazer sem perguntar. O harness confere cada pedido de [[tool calling|tool-calling]] antes de executar, e a pergunta de projeto é sempre a mesma: qual o menor conjunto de portas que esta tarefa precisa?",
      ],
      keyIdea: "Ferramentas dizem o que o agente consegue fazer; permissões dizem o que ele pode fazer sem perguntar.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "doors",
            piece: "block-diagram",
            blocks: [
              { id: "agent", kind: "agent", label: "agente", col: 0, row: 0.5 },
              { id: "guard", kind: "guardrail", label: "permissões", col: 1, row: 0.5 },
              { id: "read", kind: "documents", label: "ler código", col: 2, row: 0 },
              { id: "bash", kind: "tool", label: "comandos", col: 2, row: 1 },
              { id: "web", kind: "cloud", label: "internet", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "agent", to: "guard", label: "pedido" },
              { from: "guard", to: "read", label: "livre" },
              { from: "guard", to: "bash", label: "conforme a regra" },
              { from: "guard", to: "web", label: "pergunta", variant: "alternative" },
            ],
            active: "guard",
          },
        ],
      },
      alt: "Os pedidos do agente passam pelas permissões, em destaque: ler código é livre, comandos dependem da regra e acesso à internet pede aprovação.",
    },
    {
      id: "aci",
      shortTitle: "Ferramentas",
      title: "Ferramentas desenhadas para um modelo",
      tag: "mechanism",
      body: [
        "Uma interface ruim atrapalha qualquer pessoa: botões com nomes iguais, mensagens de erro em código hexadecimal. O SWE-agent chamou de [[interface agente-computador|agent-computer-interface]] o conjunto de ferramentas que o modelo usa, e mostrou que desenhá-lo bem muda o desempenho do mesmo modelo em tarefas de código.",
        "A Anthropic dá as regras práticas: poucas ferramentas com fronteiras claras, nomes com prefixo (asana_search, jira_search) para separar serviços, saídas que devolvem só informação de alto sinal, paginação e corte para respostas grandes (o Claude Code limita respostas de ferramentas a 25.000 tokens por padrão) e erros que dizem o que corrigir em vez de um traceback opaco.",
      ],
      keyIdea: "Desenhe ferramentas para o modelo como desenharia uma interface para pessoas: nomes claros, saídas enxutas, erros acionáveis.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "tool-design",
            piece: "pipeline",
            stages: [
              { id: "name", label: "nome distinto" },
              { id: "desc", label: "quando usar" },
              { id: "args", label: "argumentos estritos" },
              { id: "output", label: "saída enxuta", color: "module-14" },
              { id: "error", label: "erro acionável" },
            ],
            active: "output",
            done: ["name", "desc", "args"],
          },
        ],
      },
      alt: "Etapas de uma boa ferramenta para agentes: nome distinto, descrição de quando usar, argumentos estritos, saída enxuta, em destaque, e erro acionável.",
    },
    {
      id: "rules",
      shortTitle: "Deny, ask, allow",
      title: "A ordem das regras",
      tag: "mechanism",
      body: [
        "As permissões viram listas: a [[denylist|denylist]] do que é proibido, a lista do que pede aprovação e a [[allowlist|allowlist]] do que roda sem perguntar. No Claude Code, as regras ficam em permissions no settings.json, com sintaxe como Bash(pnpm test *), Edit(src/**) ou Read(./.env).",
        "A ordem importa e é fixa: primeiro deny, depois ask, depois allow, e vale a primeira que casar, não a mais específica. Por isso um deny amplo, como Bash(aws *), bloqueia até um allow mais estreito, como Bash(aws s3 ls). E nada disso é decidido pelo modelo: a documentação lembra que as regras são aplicadas pelo Claude Code, e que instruções no prompt ou no CLAUDE.md não as mudam.",
      ],
      keyIdea: "Deny, depois ask, depois allow: a primeira regra que casa decide, e o modelo não tem voto.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "order",
            piece: "block-diagram",
            blocks: [
              { id: "call", kind: "llm", label: "pedido", col: 0, row: 0 },
              { id: "deny", kind: "guardrail", label: "casa deny?", col: 1, row: 0 },
              { id: "ask", kind: "user", label: "casa ask?", col: 2, row: 0 },
              { id: "allow", kind: "tool", label: "casa allow?", col: 3, row: 0 },
              { id: "blocked", kind: "no-result", label: "bloqueado", col: 1, row: 1 },
              { id: "person", kind: "laptop", label: "pessoa aprova", col: 2, row: 1 },
            ],
            edges: [
              { from: "call", to: "deny" },
              { from: "deny", to: "ask", label: "não" },
              { from: "ask", to: "allow", label: "não" },
              { from: "deny", to: "blocked", label: "sim", variant: "alternative" },
              { from: "ask", to: "person", label: "sim" },
            ],
            active: "deny",
          },
        ],
      },
      alt: "Um pedido passa primeiro pela checagem de deny, em destaque, que bloqueia se casar; depois pela de ask, que leva a uma pessoa; por fim pela de allow, que deixa rodar.",
    },
    {
      id: "modes",
      shortTitle: "Modos",
      title: "Modos: o quanto perguntar",
      tag: "mechanism",
      body: [
        "Além das regras, o [[modo de permissão|permission-mode]] define o padrão geral, como o nível de autonomia de um carro. No Claude Code, default pergunta antes da maioria das edições e comandos; acceptEdits aceita edições e comandos comuns de arquivo no diretório de trabalho; plan só explora e não edita; dontAsk nega tudo o que perguntaria, exceto o pré-aprovado; bypassPermissions pula todas as perguntas, e a própria documentação recomenda usá-lo só dentro de um ambiente isolado, como um container ou uma VM sem segredos (aula 14-12).",
        "Leituras e um conjunto fixo de comandos só de leitura rodam sem pergunta em qualquer modo. O Codex tem a mesma ideia com outros nomes: uma política de aprovação (on-request ou never) combinada com um modo de sandbox, e o preset padrão é workspace-write com on-request. A documentação do Claude Code é explícita: bypassPermissions só em ambientes isolados, como containers ou VMs.",
      ],
      keyIdea: "O modo dá o padrão; as regras ajustam ferramenta por ferramenta; o modo mais solto só cabe dentro de isolamento.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "modes-matrix",
            piece: "matrix",
            rows: modes,
            cols: modeCols,
            values: modeValues,
            scale: { min: 0, max: 1 },
            highlight: { row: 4, col: 2 },
            color: "module-14",
          },
        ],
      },
      alt: "Matriz de modos de permissão do Claude Code: todos leem arquivos; default pergunta para editar e rodar comandos; acceptEdits edita sem perguntar; plan e dontAsk não editam nem rodam o que não foi pré-aprovado; bypassPermissions, em destaque, faz tudo sem perguntar.",
    },
    {
      id: "policy",
      shortTitle: "A conta",
      title: `${log.length} chamadas, uma política`,
      tag: "example",
      body: [
        `Uma sessão faz ${log.length} chamadas. Sem regras, no modo padrão, leituras rodam livres e o resto pergunta: são ${withoutRules.ask} interrupções, e a leitura do .env passa como “${envWithoutRules}”, porque é só uma leitura. A política da cena tem duas negações (Read(./.env), Bash(rm *)), uma pergunta (Bash(git push *)) e duas liberações (Bash(pnpm test *), Edit(src/**)).`,
        `Com ela, ${withPolicy.allow} chamadas rodam sozinhas, ${withPolicy.ask} perguntam (o push e as duas buscas na web, que nenhuma regra cobre) e ${withPolicy.deny} são bloqueadas: o .env e o rm -rf. São ${promptsCut} interrupções a menos e as duas ações perigosas barradas. No bypassPermissions, as ${log.length} rodariam, inclusive as duas.`,
      ],
      keyIdea: "Uma política curta corta interrupções e barra o que é perigoso ao mesmo tempo.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "policy-chart",
            piece: "chart",
            kind: "bar",
            series: [
              { label: "sem regras: livre", value: withoutRules.allow },
              { label: "sem regras: pergunta", value: withoutRules.ask },
              { label: "política: livre", value: withPolicy.allow },
              { label: "política: pergunta", value: withPolicy.ask },
              { label: "política: bloqueia", value: withPolicy.deny },
            ],
            max: log.length,
            highlight: 4,
            color: "module-14",
          },
          {
            id: "policy-numbers",
            piece: "metrics-panel",
            metrics: [
              { id: "auto", label: "rodam sozinhas", value: `${withPolicy.allow} de ${log.length} (${percent(withPolicy.allow / log.length)})`, color: "success" },
              { id: "prompts", label: "interrupções", value: `${withoutRules.ask} → ${withPolicy.ask}` },
              { id: "blocked", label: "bloqueadas", value: `${withPolicy.deny}`, color: "danger" },
            ],
            highlight: "blocked",
          },
        ],
      },
      alt: `Barras das ${log.length} chamadas: sem regras, ${withoutRules.allow} livres e ${withoutRules.ask} com pergunta; com a política, ${withPolicy.allow} livres, ${withPolicy.ask} com pergunta e ${withPolicy.deny} bloqueadas.`,
    },
    {
      id: "least",
      shortTitle: "Menor privilégio",
      title: "Só as portas que a tarefa precisa",
      tag: "tradeoff",
      body: [
        "O [[menor privilégio|least-privilege]] é o princípio por trás de tudo isso: cada agente recebe só o que a tarefa exige. Um revisor de código só precisa ler; um agente que gera relatórios não precisa de push; credenciais de produção não deveriam estar ao alcance de um agente de desenvolvimento.",
        "O custo é atrito. Permissões apertadas demais geram perguntas o tempo todo, e quem aprova vinte pedidos seguidos para de ler o vigésimo primeiro. Regras de Bash também têm limites: um padrão de prefixo não enxerga um script que apaga arquivos por conta própria. Por isso permissões se combinam com sandbox, que limita o processo inteiro, como na aula 14-12.",
      ],
      keyIdea: "Dê a cada agente o mínimo de acesso e conte as perguntas: aprovação em excesso vira aprovação sem leitura.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "least-flow",
            piece: "block-diagram",
            blocks: [
              { id: "main", kind: "agent", label: "agente principal", col: 0, row: 0.5 },
              { id: "reviewer", kind: "agent", label: "revisor: só leitura", col: 1, row: 0 },
              { id: "writer", kind: "agent", label: "editor: src/", col: 1, row: 1 },
              { id: "repo", kind: "documents", label: "repositório", col: 2, row: 0.5 },
              { id: "prod", kind: "server", label: "produção", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "main", to: "reviewer" },
              { from: "main", to: "writer" },
              { from: "reviewer", to: "repo", label: "Read, Grep" },
              { from: "writer", to: "repo", label: "Edit(src/**)" },
              { from: "repo", to: "prod", label: "sem acesso", variant: "alternative" },
            ],
            active: "reviewer",
          },
        ],
      },
      alt: "O agente principal delega a um revisor, em destaque, que só lê o repositório, e a um editor limitado a src/; nenhum dos dois tem caminho para produção.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Ferramentas boas, portas contadas",
      tag: "summary",
      body: [
        "Ferramentas bem desenhadas fazem o agente acertar mais; permissões bem desenhadas fazem os erros custarem menos. Escreva poucas regras: deny para o que nunca pode acontecer, ask para o que é caro ou irreversível, allow para o que é rotina, e um modo que combine com o nível de isolamento do ambiente.",
        "Um jeito de dar menos acesso a uma parte do trabalho é entregá-la a outro agente, com ferramentas e contexto próprios. Esse é o assunto da próxima aula: subagentes.",
      ],
      keyIdea: "Deny para o que nunca, ask para o que é caro, allow para a rotina; o resto, menor privilégio.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "recap",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "tools", label: "ferramentas enxutas" },
              { id: "deny", label: "deny: nunca", color: "danger" },
              { id: "ask", label: "ask: caro ou irreversível" },
              { id: "allow", label: "allow: rotina", color: "success" },
              { id: "mode", label: "modo conforme o isolamento", color: "module-14" },
            ],
          },
        ],
      },
      alt: "Chips de resumo: ferramentas enxutas, deny para o que nunca pode acontecer, ask para o caro ou irreversível, allow para a rotina e um modo conforme o isolamento.",
    },
  ],
  realWorldExample:
    "No Claude Code, uma política versionada em .claude/settings.json pode liberar Bash(npm run *) e Bash(git commit *) e negar Bash(git push *), como no exemplo da documentação de permissões. Para o que não pode ser lido de jeito nenhum, a mesma documentação indica uma regra de negação de Read, como Read(./.env) ou Read(./secrets/**), em vez de um arquivo .claudeignore, que não tem efeito.",
  code: {
    language: "json",
    source: `{
  "permissions": {
    "allow": ["Bash(pnpm test *)", "Edit(src/**)"],
    "ask": ["Bash(git push *)"],
    "deny": ["Read(./.env)", "Bash(rm *)"]
  }
}`,
    caption: "A política da aula no formato do Claude Code: deny é checado primeiro, depois ask, depois allow.",
  },
  tradeOffs: {
    pros: [
      "Regras aplicadas pelo harness, imunes ao que o modelo decide ou ao que um texto injetado pede",
      "Menos interrupções para a rotina e bloqueio garantido do que é perigoso",
      "Política versionada e compartilhada com o time",
    ],
    cons: [
      "Padrões de comando não enxergam o que um script faz por dentro",
      "Políticas apertadas geram fadiga de aprovação",
      "Cada ferramenta tem a própria sintaxe e os próprios modos",
    ],
    alternatives: ["Sandbox no nível do sistema operacional, que limita o processo inteiro", "Aprovação humana para cada ação, quando o volume é baixo"],
  },
  knowledgeCheck: [
    {
      id: "rule-order",
      prompt: "A política tem deny: Bash(git *) e allow: Bash(git status). O agente pede git status. O que acontece?",
      options: [
        "Roda, porque o allow é mais específico",
        "É bloqueado, porque deny é checado primeiro e a primeira regra que casa decide",
        "Pergunta à pessoa",
        "O modelo escolhe qual regra seguir",
      ],
      correct: 1,
      explanation: "A ordem é deny, ask, allow, e a especificidade não muda isso. Um deny amplo não pode ser furado por um allow mais estreito.",
      lesson: "14-08",
    },
    {
      id: "count-prompts",
      prompt: "Numa sessão com 30 chamadas (10 leituras, 12 rodadas de testes, 6 edições e 2 pushes), sem regras e no modo padrão, quantas perguntas aparecem? E com allow para os testes e as edições?",
      options: ["20 e 2", "30 e 0", "10 e 2", "20 e 8"],
      correct: 0,
      explanation: "Sem regras, só as 10 leituras rodam livres: 12 + 6 + 2 = 20 perguntas. Liberando testes e edições, sobram os 2 pushes.",
      lesson: "14-08",
    },
  ],
  related: ["14-07", "14-09", "05-10"],
  references: [
    { title: "Documentação do Claude Code: Configure permissions", url: "https://code.claude.com/docs/en/permissions", kind: "docs" },
    { title: "Anthropic: Writing effective tools for agents, with agents", url: "https://www.anthropic.com/engineering/writing-tools-for-agents", kind: "article" },
    { title: "Documentação do Codex: Agent approvals & security", url: "https://learn.chatgpt.com/docs/agent-approvals-security", kind: "docs" },
  ],
};

export default lesson;
