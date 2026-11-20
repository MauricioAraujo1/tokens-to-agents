import type { LessonContent } from "../../../types/content";

// MCP dentro de um agente, com contas no arquivo: a tarefa "abrir um ticket para cada erro único da última
// hora". Com chamadas diretas, todos os logs passam pelo contexto do modelo; com programmatic tool calling,
// o modelo escreve um script, o sandbox executa e só o resumo volta. Tamanhos de brinquedo para os logs;
// script e resumo medidos no próprio texto (4 caracteres por token).

const estimateTokens = (text: string) => Math.ceil(text.length / 4);
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");

const TASK = "Abra um ticket para cada erro único da última hora.";
const TOKENS_PER_LOG = 40;
const LOG_COUNT = 300;
const UNIQUE_ERRORS = 6;
const TOKENS_PER_TICKET_CALL = 60;
const TOKENS_PER_TICKET_RESULT = 30;

const directTokens = (logs: number) => logs * TOKENS_PER_LOG + UNIQUE_ERRORS * (TOKENS_PER_TICKET_CALL + TOKENS_PER_TICKET_RESULT);
const direct = directTokens(LOG_COUNT);

const script = `const logs = await sentry_listErrors({ since: Date.now() - 3600000 });
const unique = new Map(logs.entries.map((log) => [log.message, log]));
for (const [message, log] of unique) {
  await tickets_create({ title: \`Erro: \${message}\`, body: log.timestamp, priority: "high" });
}
console.log(\`\${unique.size} tickets a partir de \${logs.entries.length} logs\`);`;
const summary = `${UNIQUE_ERRORS} tickets a partir de ${LOG_COUNT} logs`;
const scriptTokens = estimateTokens(script);
const summaryTokens = estimateTokens(summary);
const codeMode = scriptTokens + summaryTokens;
const savedShare = 1 - codeMode / direct;

const logCounts = [50, 100, 200, 300, 500];
const directSeries = logCounts.map((logs) => ({ label: `${logs} logs`, value: directTokens(logs) }));

// Chamadas ao modelo: direto em paralelo (listar, criar os tickets numa volta, responder) contra code mode.
const directModelCalls = 3;
const codeModeModelCalls = 2;

const approvalFlow = [
  { id: "use", label: "pedido do modelo" },
  { id: "policy", label: "política do host" },
  { id: "call", label: "tools/call" },
  { id: "result", label: "tool result" },
];

const lesson: LessonContent = {
  id: "13-13",
  subtitle: "Como um agente usa servidores MCP: ferramentas no loop, aprovações, código que encadeia chamadas e divisão do trabalho entre agentes.",
  objectives: [
    "Encaixar ferramentas MCP no loop de um agente, do pedido ao tool result",
    "Aplicar aprovações por política antes de executar chamadas MCP",
    "Calcular a economia do programmatic tool calling em tarefas encadeadas",
    "Organizar vários servidores entre subagentes e distinguir MCP de A2A",
  ],
  steps: [
    {
      id: "agent-host",
      shortTitle: "Agente host",
      title: "O agente é o host",
      tag: "context",
      body: [
        "Um técnico de campo leva uma maleta com ferramentas de vários fabricantes, todas com o mesmo encaixe. Ele decide qual usar a cada passo. Num [[agente|agent]], o runtime é o host MCP: conecta os servidores, coloca as ferramentas deles na lista do modelo e executa o que o modelo pedir, volta após volta.",
        `Para “${TASK}”, o agente usa o servidor do Sentry para ler os erros e um servidor de tickets para abrir os chamados. O modelo nunca fala com os servidores; ele pede, e o runtime chama.`,
      ],
      keyIdea: "No agente, o runtime é o host: o modelo pede, o runtime chama os servidores.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "agent",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "objetivo", col: 0, row: 0.5 },
              { id: "agent", kind: "agent", label: "agente (host)", col: 1, row: 0.5 },
              { id: "sentry", kind: "cloud", label: "sentry", col: 2.5, row: 0 },
              { id: "tickets", kind: "tool", label: "tickets", col: 2.5, row: 1 },
              { id: "memory", kind: "memory", label: "estado", col: 3.5, row: 0.5 },
            ],
            edges: [
              { from: "user", to: "agent" },
              { from: "agent", to: "sentry", label: "mcp" },
              { from: "agent", to: "tickets", label: "mcp" },
              { from: "agent", to: "memory" },
            ],
            active: "agent",
          },
        ],
      },
      alt: "O objetivo chega ao agente, em destaque, que é o host: ele fala por MCP com os servidores do Sentry e de tickets e guarda o estado da tarefa.",
    },
    {
      id: "loop",
      shortTitle: "No loop",
      title: "Cada volta do loop passa pelo MCP",
      tag: "mechanism",
      body: [
        "O [[loop do agente|agent-loop]] continua o mesmo: pensar, pedir uma ação, observar o resultado. O que muda é de onde vêm as ferramentas. O runtime faz tools/list nos servidores, traduz as definições para o formato da API do modelo, e cada pedido de ferramenta vira um tools/call no servidor certo.",
        "O resultado volta como [[tool result|tool-result]], com o id da chamada; isError vira um resultado marcado como erro, que o modelo lê para se corrigir. Ferramentas independentes de servidores diferentes podem ir como [[chamadas paralelas|parallel-tool-calls]] na mesma volta, e o runtime as executa ao mesmo tempo.",
      ],
      keyIdea: "Pedido do modelo → tools/call → tool result: o MCP é o encanamento de cada volta.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "turn",
            piece: "agent-loop",
            phases: [
              { id: "think", label: "pensar" },
              { id: "act", label: "tools/call" },
              { id: "observe", label: "tool result" },
            ],
            active: "act",
            iteration: 1,
            maxIterations: 10,
            tool: "sentry__list_errors(since: 1h)",
          },
        ],
      },
      alt: "Loop do agente na iteração 1 de 10, na fase do tools/call, chamando sentry__list_errors para a última hora.",
    },
    {
      id: "approval",
      shortTitle: "Aprovação",
      title: "A política fica entre o pedido e a chamada",
      tag: "mechanism",
      body: [
        "Um agente autônomo chama ferramentas sem ninguém olhando cada passo, então a política do host precisa decidir sozinha o que passa direto e o que espera uma pessoa. Leituras de servidores confiáveis seguem; criar, apagar ou pagar vão para um [[approval gate|approval-gate]], com o nome da ferramenta e os argumentos à vista.",
        "A especificação pede um humano capaz de negar chamadas, e o MCP dá ao host as peças: anotações (só confiáveis vindas de servidores confiáveis), definições fixadas por hash e elicitação para o servidor pedir confirmação. Quando a pessoa nega, o runtime devolve isso ao modelo como resultado de erro, e o agente replaneja em vez de travar.",
      ],
      keyIdea: "Leitura confiável passa; ação de risco espera aprovação; negação vira observação.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "gate",
            piece: "pipeline",
            stages: approvalFlow,
            active: "policy",
            done: ["use"],
            branch: { id: "ask", label: "pedir aprovação", from: "policy", edgeLabel: "ação de risco", color: "danger" },
          },
        ],
      },
      alt: "Fluxo: pedido do modelo, política do host (etapa atual), tools/call e tool result; um ramo tracejado sai da política para pedir aprovação quando a ação é de risco.",
    },
    {
      id: "code-mode",
      shortTitle: "Code mode",
      title: "Quando os dados não precisam passar pelo modelo",
      tag: "example",
      body: [
        `Com chamadas diretas, os ${LOG_COUNT} logs voltam inteiros para o contexto (uns ${integer(LOG_COUNT * TOKENS_PER_LOG)} tokens) e cada ticket custa mais uma chamada e um resultado: cerca de ${integer(direct)} tokens só de dados intermediários, em ${directModelCalls} chamadas ao modelo mesmo com paralelismo. O modelo não precisa ler os logs: precisa só deduplicar e abrir tickets.`,
        `No [[programmatic tool calling|programmatic-tool-calling]], o host transforma as ferramentas MCP em funções tipadas dentro de um sandbox, o modelo escreve um script (aqui, ${integer(scriptTokens)} tokens), o sandbox executa as chamadas pelo host, e só o console.log volta: “${summary}”, ${integer(summaryTokens)} tokens. São ${integer(codeMode)} tokens contra ${integer(direct)}, ${Math.round(savedShare * 100)}% a menos, em ${codeModeModelCalls} chamadas ao modelo.`,
      ],
      keyIdea: "Encadeamento com muitos dados: deixe o código mover os dados e o modelo ler só o resumo.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "totals",
            piece: "metrics-panel",
            metrics: [
              { id: "direct", label: `direto (${LOG_COUNT} logs)`, value: `${integer(direct)} tokens`, color: "danger" },
              { id: "code", label: "script + resumo", value: `${integer(codeMode)} tokens`, color: "success" },
              { id: "saved", label: "economia", value: `${Math.round(savedShare * 100)}%` },
            ],
            highlight: "code",
          },
          {
            id: "growth",
            piece: "chart",
            kind: "bar",
            series: directSeries,
            highlight: logCounts.indexOf(LOG_COUNT),
            color: "module-13",
          },
        ],
      },
      alt: `Painel: chamadas diretas com ${LOG_COUNT} logs custam ${integer(direct)} tokens; script e resumo custam ${integer(codeMode)}, ${Math.round(savedShare * 100)}% a menos. O gráfico mostra o custo direto crescendo com os logs: ${directSeries.map((item) => `${item.label}, ${integer(item.value)}`).join("; ")}.`,
    },
    {
      id: "sandbox",
      shortTitle: "O sandbox",
      title: "O host como corretor do sandbox",
      tag: "mechanism",
      body: [
        "O script roda isolado, sem rede. As funções que ele chama são stubs: cada chamada sai do sandbox, chega ao host, que a transforma num tools/call para o servidor MCP certo, adiciona as credenciais e devolve o resultado ao script. Tokens e chaves ficam no host, nunca no código gerado.",
        "As regras de segurança não mudam por estar dentro de um script: o host aplica a mesma política de aprovação a cada chamada vinda do sandbox, trata o resultado de um servidor como entrada não confiável para o outro e impõe limites de tempo e de memória ao script. Aprovar o script não aprova, sozinho, cada chamada que ele fizer.",
      ],
      keyIdea: "O sandbox não tem rede nem segredos: toda chamada passa pelo host, com a mesma política.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "broker",
            piece: "block-diagram",
            blocks: [
              { id: "llm", kind: "llm", label: "modelo escreve", col: 0, row: 0.5 },
              { id: "sandbox", kind: "guardrail", label: "sandbox sem rede", col: 1, row: 0.5 },
              { id: "host", kind: "laptop", label: "host (corretor)", col: 2, row: 0.5 },
              { id: "sentry", kind: "cloud", label: "sentry", col: 3, row: 0 },
              { id: "tickets", kind: "tool", label: "tickets", col: 3, row: 1 },
            ],
            edges: [
              { from: "llm", to: "sandbox", label: "script" },
              { from: "sandbox", to: "host", label: "stub chamado" },
              { from: "host", to: "sentry", label: "tools/call" },
              { from: "host", to: "tickets", label: "tools/call" },
            ],
            active: "host",
          },
        ],
      },
      alt: "O modelo escreve um script que roda num sandbox sem rede; cada função chamada sai para o host, em destaque, que faz o tools/call no Sentry ou no servidor de tickets.",
    },
    {
      id: "split",
      shortTitle: "Dividir",
      title: "Muitos servidores, vários agentes",
      tag: "tradeoff",
      body: [
        "Com dezenas de servidores, um agente só carrega um catálogo enorme e escolhe pior. Uma saída é dividir: cada [[subagente|subagent]] recebe só os servidores da sua especialidade, com contexto próprio, e o orquestrador recebe os resultados. Outra é conectar servidores sob demanda, quando a tarefa precisa deles.",
        "E quando o outro lado não é uma ferramenta, mas outro agente, de outra empresa? Aí o protocolo é outro: o [[A2A|a2a-protocol]] liga agente com agente; o MCP liga agente com ferramentas e dados. Os dois convivem: o agente parceiro pode usar os próprios servidores MCP por trás. O custo de dividir é coordenação: mais chamadas ao modelo, mais tokens e mais pontos de falha.",
      ],
      keyIdea: "Separe servidores por subagente quando o catálogo cresce; use A2A para falar com outros agentes.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "topology",
            piece: "graph",
            nodes: [
              { id: "orchestrator", label: "orquestrador", x: 0.15, y: 0.5, color: "module-13" },
              { id: "ops", label: "subagente ops", x: 0.45, y: 0.25 },
              { id: "code", label: "subagente código", x: 0.45, y: 0.75 },
              { id: "sentry", label: "mcp: sentry", x: 0.8, y: 0.12 },
              { id: "tickets", label: "mcp: tickets", x: 0.8, y: 0.38 },
              { id: "github", label: "mcp: github", x: 0.8, y: 0.65 },
              { id: "partner", label: "agente parceiro", x: 0.45, y: 0.95 },
            ],
            edges: [
              { from: "orchestrator", to: "ops" },
              { from: "orchestrator", to: "code" },
              { from: "ops", to: "sentry" },
              { from: "ops", to: "tickets" },
              { from: "code", to: "github" },
              { from: "orchestrator", to: "partner", label: "a2a" },
            ],
            highlight: ["orchestrator"],
          },
        ],
      },
      alt: "O orquestrador, em destaque, delega a um subagente de operações, ligado aos servidores MCP do Sentry e de tickets, e a um subagente de código, ligado ao GitHub; com um agente parceiro ele fala por A2A.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "MCP no agente",
      tag: "summary",
      body: [
        "O runtime do agente é o host: lista e traduz ferramentas, executa cada pedido como tools/call, aplica a política de aprovação e devolve tool results. Quando a tarefa encadeia muitos dados, o code mode deixa o script mover os dados e o modelo ler só o resumo. Quando o catálogo cresce, divida servidores entre subagentes ou conecte sob demanda.",
        "A última aula do módulo junta tudo numa comparação direta: MCP e function calling, o que cada um resolve e quando usar cada um.",
      ],
      keyIdea: "Host no runtime, política antes da chamada, código para dados, subagentes para catálogos grandes.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "recap",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "host", label: "runtime = host MCP", color: "module-13" },
              { id: "loop", label: "pedido → tools/call → tool result" },
              { id: "policy", label: "política antes da chamada", color: "danger" },
              { id: "code", label: "code mode para dados grandes" },
              { id: "split", label: "subagentes por servidor" },
              { id: "a2a", label: "A2A para outros agentes" },
            ],
          },
        ],
      },
      alt: "Resumo em chips: runtime é o host MCP; pedido, tools/call e tool result; política antes da chamada; code mode para dados grandes; subagentes por servidor; A2A para outros agentes.",
    },
  ],
  realWorldExample:
    "A página Client Best Practices da documentação do MCP usa exatamente esta tarefa, achar os erros da última hora e abrir um ticket por erro único, para ilustrar o programmatic tool calling: a figura compara mais de 100 mil tokens de resultados intermediários passando pelo modelo com um script de uns 200 tokens e um resumo de uns 15.",
  code: {
    language: "typescript",
    source: `interface ToolUse { id: string; name: string; input: Record<string, unknown> }
interface ModelTurn { text: string; toolUses: ToolUse[] }
interface McpResult { content: unknown[]; isError?: boolean }

declare function callModel(messages: unknown[], tools: unknown[]): Promise<ModelTurn>;
declare function callMcpTool(server: string, tool: string, args: Record<string, unknown>): Promise<McpResult>;
declare function approve(use: ToolUse): Promise<boolean>;

async function runAgent(goal: string, tools: unknown[], maxIterations = 10): Promise<string> {
  const messages: unknown[] = [{ role: "user", content: goal }];
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const turn = await callModel(messages, tools);
    if (turn.toolUses.length === 0) return turn.text;
    messages.push({ role: "assistant", content: turn });
    const results = await Promise.all(
      turn.toolUses.map(async (use) => {
        if (!(await approve(use))) return { tool_use_id: use.id, is_error: true, content: "Ação negada pelo usuário." };
        const [server, ...rest] = use.name.split("__");
        const result = await callMcpTool(server, rest.join("__"), use.input);
        return { tool_use_id: use.id, is_error: result.isError ?? false, content: result.content };
      }),
    );
    messages.push({ role: "user", content: results });
  }
  return "Parei no limite de iterações sem terminar a tarefa.";
}`,
    caption: "O esqueleto de um agente que usa ferramentas MCP: aprova cada pedido, roteia pelo prefixo do servidor, executa em paralelo e devolve cada resultado com o id da chamada.",
  },
  tradeOffs: {
    pros: [
      "Qualquer servidor MCP vira ferramenta do agente sem código específico",
      "Code mode corta tokens e chamadas ao modelo em tarefas que movem muitos dados",
      "Subagentes com poucos servidores escolhem melhor e isolam contexto",
    ],
    cons: [
      "Autonomia aumenta o risco: a política do host precisa decidir sem ninguém olhando",
      "Code mode exige um sandbox bem isolado, com limites e a mesma política por chamada",
      "Mais agentes e servidores significam mais coordenação, latência e pontos de falha",
    ],
    alternatives: ["Workflow fixo chamando os servidores em ordem, quando os passos não mudam", "Busca de ferramentas nativa da API do modelo, para catálogos grandes"],
  },
  knowledgeCheck: [
    {
      id: "when-code-mode",
      prompt: "Um agente precisa ler 2.000 linhas de uma planilha, somar valores por cliente e gravar 15 totais em outro sistema. Qual abordagem economiza mais contexto?",
      options: [
        "Chamar a ferramenta de leitura e deixar o modelo somar as 2.000 linhas no contexto",
        "Programmatic tool calling: o modelo escreve um script que lê, soma e grava no sandbox, e só o resumo volta",
        "Aumentar a janela de contexto",
        "Dividir em 2.000 chamadas de uma linha",
      ],
      correct: 1,
      explanation: "Os dados intermediários não precisam passar pelo modelo. No code mode, o script move as 2.000 linhas entre os servidores e o contexto recebe só o resumo.",
      lesson: "13-13",
    },
    {
      id: "denied",
      prompt: "No meio da tarefa, o usuário nega a ferramenta tickets__delete. O que o runtime deve fazer?",
      options: [
        "Encerrar o agente com erro",
        "Executar mesmo assim, porque o modelo pediu",
        "Devolver ao modelo um tool result de erro dizendo que a ação foi negada, para ele replanejar",
        "Repetir a pergunta até o usuário aceitar",
      ],
      correct: 2,
      explanation: "A negação é uma observação. Voltando como resultado de erro com o id da chamada, o modelo sabe que aquela ação não vai acontecer e procura outro caminho ou explica ao usuário.",
      lesson: "13-13",
    },
  ],
  related: ["13-12", "13-14", "12-04"],
  references: [
    { title: "MCP: Client Best Practices (progressive discovery e programmatic tool calling)", url: "https://modelcontextprotocol.io/docs/develop/clients/client-best-practices", kind: "docs" },
    { title: "MCP Specification 2026-07-28: Tools (user interaction model)", url: "https://modelcontextprotocol.io/specification/2026-07-28/server/tools", kind: "docs" },
    { title: "Anthropic: Building effective agents", url: "https://www.anthropic.com/engineering/building-effective-agents", kind: "article" },
  ],
};

export default lesson;
