import { runAgent, type AgentIteration } from "../../../lab/agentLoop";
import type { LessonContent } from "../../../types/content";

// Um agente de atendimento de loja, sozinho, com cinco ferramentas. O roteiro roda no mesmo loop do
// Laboratório (runAgent). A latência sai de um tempo de brinquedo por chamada ao modelo e por ferramenta, e o
// custo das definições de ferramentas sai do JSON delas (4 caracteres por token), reenviado a cada chamada.

const estimateTokens = (text: string) => Math.ceil(text.length / 4);
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const seconds = (value: number) => `${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} s`;
const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Tool {
  name: string;
  description: string;
  parameters: Record<string, string>;
  seconds: number;
}

const tools: Tool[] = [
  { name: "buscar_pedido", description: "Status, data de entrega e valor de um pedido pelo número.", parameters: { numero: "string" }, seconds: 0.1 },
  { name: "buscar_politica", description: "Busca trechos da política de trocas e reembolsos.", parameters: { consulta: "string" }, seconds: 0.4 },
  { name: "rastrear_entrega", description: "Posição atual da entrega na transportadora.", parameters: { codigo: "string" }, seconds: 0.9 },
  { name: "abrir_reembolso", description: "Abre um reembolso para um pedido entregue. Ação que move dinheiro.", parameters: { numero: "string", valor: "number" }, seconds: 0.8 },
  { name: "falar_com_humano", description: "Transfere o atendimento para uma pessoa da equipe.", parameters: { motivo: "string" }, seconds: 0.2 },
];
const definitionTokens = tools.map((tool) =>
  estimateTokens(
    JSON.stringify({
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: "object",
        properties: Object.fromEntries(Object.entries(tool.parameters).map(([key, type]) => [key, { type }])),
        required: Object.keys(tool.parameters),
      },
    }),
  ),
);
const allDefinitions = definitionTokens.reduce((sum, value) => sum + value, 0);
const perTool = allDefinitions / tools.length;

const ORDER = "4821";
const PRICE = 189.9;
const REFUND_LIMIT = 500;
const MAX_ITERATIONS = 6;
const QUESTION = `Meu pedido ${ORDER} chegou quebrado. Quero o reembolso.`;

const script: AgentIteration[] = [
  {
    thought: `Preciso ver o pedido ${ORDER}.`,
    action: { tool: "buscar_pedido", input: `"${ORDER}"` },
    observation: `entregue em 12/11, ${money(PRICE)}`,
  },
  {
    thought: "Produto danificado: o que diz a política?",
    action: { tool: "buscar_politica", input: '"produto danificado"' },
    observation: "reembolso integral até 7 dias após a entrega, com foto",
  },
  {
    thought: "Está no prazo e a foto veio na conversa. Abro o reembolso.",
    action: { tool: "abrir_reembolso", input: `"${ORDER}", ${PRICE}` },
    observation: "protocolo R-1093 criado",
  },
  {
    thought: "Reembolso aberto, posso responder.",
    answer: `Reembolso de ${money(PRICE)} aberto, protocolo R-1093.`,
  },
];
const events = runAgent(script, MAX_ITERATIONS);
const actOf = (iteration: number) => {
  const event = events.find((item) => item.kind === "act" && item.iteration === iteration);
  return event && event.kind === "act" ? event.text : "";
};
const answerEvent = events.find((event) => event.kind === "answer");
const answerText = answerEvent && answerEvent.kind === "answer" ? answerEvent.text : "";
const iterationsUsed = answerEvent?.iteration ?? MAX_ITERATIONS;
const usedTools = script.flatMap((step) => (step.action ? [step.action.tool] : []));

// Latência: cada iteração é uma chamada ao modelo, e as ferramentas rodam entre elas.
const MODEL_SECONDS = 1.5;
const toolSeconds = usedTools.reduce((sum, name) => sum + (tools.find((tool) => tool.name === name)?.seconds ?? 0), 0);
const modelSeconds = iterationsUsed * MODEL_SECONDS;
const totalSeconds = modelSeconds + toolSeconds;
const definitionsPerRun = allDefinitions * iterationsUsed;

// Passo 5: o peso das definições quando o agente único acumula ferramentas.
const toolCounts = [5, 10, 20, 40, 80];
const toolSeries = toolCounts.map((count) => ({ label: `${count} tools`, value: Math.round(count * perTool) }));
const BIG = 80;

const messages = [
  { from: "user", to: "agent", label: "pedido quebrado" },
  { from: "agent", to: "llm", label: "msgs + tools" },
  { from: "llm", to: "agent", label: actOf(1) },
  { from: "agent", to: "orders", label: "consulta" },
  { from: "orders", to: "agent", label: "entregue" },
  { from: "agent", to: "llm", label: "resultado" },
  { from: "llm", to: "agent", label: actOf(2) },
  { from: "agent", to: "user", label: "resposta" },
];
const SECOND_CALL = 6;

const lesson: LessonContent = {
  id: "12-09",
  subtitle: "Um agente, um prompt, um punhado de ferramentas e um loop: como montar, quanto custa e quando ele já basta.",
  objectives: [
    "Montar um agente único com ferramentas bem escolhidas e um limite de iterações",
    "Estimar a latência e o custo de uma execução a partir das iterações",
    "Colocar guardrails em ferramentas que mexem com dinheiro",
    "Reconhecer os sinais de que um agente único chegou no limite",
  ],
  steps: [
    {
      id: "clerk",
      shortTitle: "Um atendente",
      title: "Um atendente que resolve sozinho",
      tag: "context",
      body: [
        "Numa loja pequena, um bom atendente resolve quase tudo: consulta o pedido no sistema, lê a política de trocas, liga para a transportadora e abre o reembolso. Ele não precisa de um departamento para cada passo, só de acesso às ferramentas certas.",
        `Um [[sistema de agente único|single-agent-system]] é isso: um [[system prompt|system-prompt]], um conjunto pequeno de ferramentas por [[tool calling|tool-calling]] e um loop com limite. O agente da aula tem ${tools.length} ferramentas: ${tools.map((tool) => tool.name).join(", ")}. A Anthropic recomenda começar sempre pela solução mais simples que funciona e só aumentar a complexidade quando ela melhorar o resultado de forma medida.`,
      ],
      keyIdea: "Comece com um agente e poucas ferramentas boas; complexidade extra precisa se pagar.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "cliente", col: 0, row: 0.5 },
              { id: "agent", kind: "agent", label: "agente", col: 1, row: 0.5 },
              { id: "orders", kind: "sql-db", label: "pedidos", col: 2, row: 0 },
              { id: "policy", kind: "vector-db", label: "política", col: 2, row: 1 },
              { id: "carrier", kind: "cloud", label: "transportadora", col: 3, row: 0 },
              { id: "refund", kind: "tool", label: "reembolso", col: 3, row: 1 },
            ],
            edges: [
              { from: "user", to: "agent", label: "pedido quebrado" },
              { from: "agent", to: "orders", label: "buscar_pedido" },
              { from: "agent", to: "policy", label: "buscar_politica" },
              { from: "agent", to: "carrier", label: "rastrear" },
              { from: "agent", to: "refund", label: "abrir" },
            ],
            active: "agent",
          },
        ],
      },
      alt: "O cliente fala com o agente, em destaque, que tem acesso ao banco de pedidos, à política de reembolso, à transportadora e à ferramenta de reembolso.",
    },
    {
      id: "loop",
      shortTitle: "O loop",
      title: "Quatro voltas para um reembolso",
      tag: "mechanism",
      body: [
        `O cliente escreve: “${QUESTION}” O atendente não sabe a resposta de cara: primeiro olha o pedido, depois a regra. O agente faz o mesmo no loop: na iteração 1 chama ${actOf(1)}; na iteração 2, ${actOf(2)}.`,
        `Cada observação muda a próxima decisão: a data de entrega diz se o pedido está no prazo, a política diz o que exigir. Na iteração 3 o agente chama ${actOf(3)} e, na ${iterationsUsed}, responde: “${answerText}” Foram ${usedTools.length} ferramentas e ${iterationsUsed} de no máximo ${MAX_ITERATIONS} iterações.`,
      ],
      keyIdea: "O agente único encadeia as ferramentas que a conversa pede, uma decisão por volta.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "loop",
            piece: "agent-loop",
            phases: [
              { id: "think", label: "pensar" },
              { id: "act", label: "agir" },
              { id: "observe", label: "observar" },
            ],
            active: "act",
            iteration: 2,
            maxIterations: MAX_ITERATIONS,
            tool: actOf(2),
          },
        ],
      },
      alt: `Loop do agente na iteração 2 de ${MAX_ITERATIONS}, na fase de agir, chamando ${actOf(2)}.`,
    },
    {
      id: "exchange",
      shortTitle: "A conversa",
      title: "Quem fala com quem, e quanto demora",
      tag: "mechanism",
      body: [
        "Por trás do chat, cada volta é uma ida ao modelo e, quase sempre, uma ida a um sistema da loja. O cliente só vê o “digitando...”, mas o atendente está consultando, esperando e decidindo.",
        `Com ${seconds(MODEL_SECONDS)} por chamada ao modelo (número de brinquedo), as ${iterationsUsed} iterações somam ${seconds(modelSeconds)} de modelo e ${seconds(toolSeconds)} de ferramentas: ${seconds(totalSeconds)} até a resposta. As definições das ${tools.length} ferramentas, cerca de ${integer(allDefinitions)} tokens, vão em todas as chamadas: ${integer(definitionsPerRun)} tokens por atendimento só nisso. A latência de um agente cresce com o número de voltas, não com o tamanho da resposta.`,
      ],
      keyIdea: "Latência de agente ≈ iterações × tempo do modelo + tempo das ferramentas.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "exchange",
            piece: "client-server",
            nodes: [
              { id: "user", label: "cliente", role: "client" },
              { id: "agent", label: "agente", role: "server" },
              { id: "llm", label: "llm", role: "model" },
              { id: "orders", label: "pedidos", role: "database" },
            ],
            messages,
            active: SECOND_CALL,
          },
        ],
      },
      alt: `Troca de mensagens entre cliente, agente, LLM e banco de pedidos; a mensagem em trânsito é o LLM pedindo ${actOf(2)} ao agente. A execução leva ${seconds(totalSeconds)} no total.`,
    },
    {
      id: "guard",
      shortTitle: "Reembolso",
      title: "A ferramenta que mexe com dinheiro",
      tag: "example",
      body: [
        `O atendente novo pode devolver até ${money(REFUND_LIMIT)} sem pedir ao gerente; acima disso, chama alguém. O reembolso de ${money(PRICE)} passa direto; um de ${money(REFUND_LIMIT * 2)} pararia na mesa do gerente.`,
        "No agente, essa regra fica no código da ferramenta, não no prompt: o runtime confere o valor, o dono do pedido e o prazo antes de executar, e acima do limite chama falar_com_humano. Um [[guardrail|guardrail]] em código vale mesmo se uma [[prompt injection|prompt-injection]] convencer o modelo a pedir o reembolso errado.",
      ],
      keyIdea: "Limites de ações perigosas vivem no código da ferramenta, onde o modelo não consegue negociar.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "agent", kind: "agent", label: "agente", col: 0, row: 0.5 },
              { id: "guard", kind: "guardrail", label: `até ${money(REFUND_LIMIT)}`, col: 1, row: 0.5 },
              { id: "refund", kind: "tool", label: "reembolso", col: 2, row: 0 },
              { id: "human", kind: "user", label: "gerente", col: 2, row: 1 },
            ],
            edges: [
              { from: "agent", to: "guard", label: actOf(3) },
              { from: "guard", to: "refund", label: "dentro do limite" },
              { from: "guard", to: "human", label: "acima", variant: "alternative" },
            ],
            active: "guard",
          },
          {
            id: "run",
            piece: "metrics-panel",
            metrics: [
              { id: "latency", label: "tempo até a resposta", value: seconds(totalSeconds) },
              { id: "calls", label: "chamadas ao modelo", value: String(iterationsUsed) },
              { id: "defs", label: "tokens de definições", value: integer(definitionsPerRun), color: "danger" },
            ],
            highlight: "latency",
          },
        ],
      },
      alt: `O pedido de reembolso do agente passa por um guardrail de ${money(REFUND_LIMIT)}, em destaque: dentro do limite segue para a ferramenta, acima vai para o gerente pelo caminho tracejado. O painel mostra ${seconds(totalSeconds)} até a resposta, ${iterationsUsed} chamadas ao modelo e ${integer(definitionsPerRun)} tokens de definições.`,
    },
    {
      id: "limits",
      shortTitle: "Limites",
      title: "Quando o atendente vira a loja inteira",
      tag: "tradeoff",
      body: [
        "Se o mesmo atendente também cuidar do estoque, do financeiro e do marketing, ele começa a confundir os sistemas e a esquecer regras. O problema não é a inteligência dele: é o excesso de coisas na cabeça ao mesmo tempo.",
        `Cada ferramenta custa uns ${integer(perTool)} tokens de definição. Com ${BIG} ferramentas, são ${integer(toolSeries[toolSeries.length - 1].value)} tokens em toda chamada, descrições parecidas competindo pela escolha e um prompt com regras de vários domínios. Os sinais de que o agente único chegou no limite são esses: ferramentas demais ou sobrepostas, instruções que se contradizem e contexto que não cabe. Antes de dividir em vários agentes, tente juntar ferramentas e melhorar as descrições.`,
      ],
      keyIdea: "Ferramentas demais e domínios misturados são o sinal para dividir; antes disso, simplifique.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "defs",
            piece: "chart",
            kind: "bar",
            series: toolSeries,
            highlight: 0,
            color: "module-12",
          },
        ],
      },
      alt: `Tokens de definições por chamada conforme o número de ferramentas: ${toolSeries.map((item) => `${item.label}, ${integer(item.value)}`).join("; ")}. O agente da aula, com ${tools.length}, está em destaque.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "A receita do agente único",
      tag: "summary",
      body: [
        "Um agente único bem feito tem um objetivo claro no prompt, poucas ferramentas com descrições precisas, um limite de iterações, guardrails no código das ações perigosas e uma bateria de testes. Para a maioria dos produtos, isso basta, e é muito mais fácil de depurar do que um time de agentes.",
        "Quando a tarefa realmente tem partes independentes, papéis diferentes ou contexto demais para uma janela, vale dividir. A próxima aula mostra os sistemas multiagente: o que se ganha e o que se paga.",
      ],
      keyIdea: "Um agente, poucas ferramentas boas, limite, guardrails e testes: comece por aqui.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "recipe",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "goal", label: "objetivo no prompt" },
              { id: "tools", label: "poucas ferramentas boas", color: "module-12" },
              { id: "limit", label: "limite de iterações" },
              { id: "guard", label: "guardrails no código" },
              { id: "eval", label: "testes e avaliação" },
              { id: "split", label: "dividir só se precisar", color: "brand" },
            ],
          },
        ],
      },
      alt: "Fluxo em chips: objetivo no prompt, poucas ferramentas boas, limite de iterações, guardrails no código, testes e avaliação e dividir só se precisar.",
    },
  ],
  realWorldExample:
    "O Claude Agent SDK entrega um agente único pronto, o mesmo loop do Claude Code, com ferramentas embutidas para ler e editar arquivos e rodar comandos, permissões que dizem quais ferramentas rodam sozinhas e quais pedem aprovação, e hooks para executar código em pontos do ciclo do agente.",
  code: {
    language: "python",
    source: `MAX_ITERATIONS = 6
REFUND_LIMIT = 500

def abrir_reembolso(numero, valor, cliente):
    pedido = pedidos.get(numero)
    if pedido.cliente != cliente or valor > pedido.valor:
        return {"is_error": True, "content": "Pedido ou valor inválido."}
    if valor > REFUND_LIMIT:
        return falar_com_humano(f"reembolso de {valor} no pedido {numero}")
    return {"content": reembolsos.criar(numero, valor)}`,
    caption: "A regra do limite fica no código da ferramenta: o modelo pode pedir qualquer valor, mas só o que passa nas checagens é executado.",
  },
  tradeOffs: {
    pros: [
      "Um só prompt e um só loop: fácil de entender, testar e depurar",
      "Menos chamadas e menos tokens que um time de agentes",
      "Todo o contexto da conversa fica num lugar só",
    ],
    cons: [
      "Ferramentas e regras de domínios demais confundem a escolha",
      "O contexto de uma janela limita tarefas muito longas",
      "Tudo roda em sequência: partes independentes não andam em paralelo",
    ],
    alternatives: [
      "Workflow fixo, quando os passos são sempre os mesmos",
      "Sistema multiagente, quando há papéis distintos ou partes paralelas",
    ],
  },
  knowledgeCheck: [
    {
      id: "latency-estimate",
      prompt: "Um agente leva em média 5 iterações, 2 s por chamada ao modelo e 0,5 s por ferramenta em 4 delas. Qual é a latência estimada?",
      options: ["2 s", "12 s", "10 s", "4,5 s"],
      correct: 1,
      explanation: "São 5 chamadas ao modelo (5 × 2 s = 10 s) mais 4 ferramentas (4 × 0,5 s = 2 s): 12 s. A latência cresce com o número de voltas.",
      lesson: "12-09",
    },
    {
      id: "split-or-not",
      prompt: "Um agente de suporte com 6 ferramentas erra às vezes a escolha entre buscar_pedido e rastrear_entrega. O que tentar primeiro?",
      options: [
        "Criar um agente separado para cada ferramenta",
        "Melhorar as descrições das duas ferramentas, dizendo quando usar cada uma",
        "Remover o limite de iterações",
        "Trocar o tool calling por regex",
      ],
      correct: 1,
      explanation: "Seis ferramentas cabem bem num agente único. Escolha errada entre duas ferramentas parecidas costuma ser descrição ambígua, e corrigir a descrição é muito mais barato que dividir o sistema.",
      lesson: "12-09",
    },
  ],
  related: ["12-04", "12-10", "05-10"],
  references: [
    { title: "Anthropic: Building effective agents", url: "https://www.anthropic.com/engineering/building-effective-agents", kind: "article" },
    { title: "Anthropic: Writing effective tools for agents", url: "https://www.anthropic.com/engineering/writing-tools-for-agents", kind: "article" },
    { title: "Claude Agent SDK: overview", url: "https://code.claude.com/docs/en/agent-sdk/overview", kind: "docs" },
  ],
};

export default lesson;
