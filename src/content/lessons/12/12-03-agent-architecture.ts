import type { LessonContent } from "../../../types/content";

// A arquitetura de um agente de viagens de brinquedo, com as contas no arquivo: o tamanho de cada parte do
// contexto (instruções, definições das ferramentas, memória e histórico) estimado em 4 caracteres por token,
// e como o histórico passa a dominar a entrada à medida que o loop avança.

const estimateTokens = (text: string) => Math.ceil(text.length / 4);
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const percent = (value: number) => `${Math.round(value * 100)}%`;

const SYSTEM_PROMPT =
  "Você é um agente de viagens corporativas. Reserve voos e hotéis dentro da política da empresa: classe econômica em voos de até 4 horas, hotel de até R$ 500 por noite. Confirme com a pessoa antes de qualquer compra. Se faltar um dado, pergunte. Responda em português, de forma curta, e cite o código de cada reserva.";

const tools = [
  { name: "buscar_voos", description: "Lista voos entre duas cidades numa data, com preço e duração.", params: ["origem", "destino", "data"] },
  { name: "buscar_hoteis", description: "Lista hotéis perto de um endereço, com preço por noite.", params: ["endereco", "entrada", "saida"] },
  { name: "reservar", description: "Reserva um voo ou hotel já escolhido. Exige confirmação.", params: ["oferta_id"] },
  { name: "politica", description: "Consulta a política de viagens da empresa por tema.", params: ["tema"] },
];
const toolJson = (tool: (typeof tools)[number]) =>
  JSON.stringify({
    name: tool.name,
    description: tool.description,
    input_schema: {
      type: "object",
      properties: Object.fromEntries(tool.params.map((param) => [param, { type: "string" }])),
      required: tool.params,
    },
  });

const memoryNotes = ["prefere voos pela manhã", "trabalha no escritório da Av. Paulista", "última viagem: Recife, março"];

// Cada volta do loop acrescenta ao histórico o pensamento e a chamada do modelo e a observação da ferramenta.
const CALL_TOKENS = 60;
const OBSERVATION_TOKENS = 220;
const systemTokens = estimateTokens(SYSTEM_PROMPT);
const toolTokens = tools.map((tool) => estimateTokens(toolJson(tool))).reduce((sum, value) => sum + value, 0);
const memoryTokens = estimateTokens(memoryNotes.join("; "));
const historyTokens = (iteration: number) => (iteration - 1) * (CALL_TOKENS + OBSERVATION_TOKENS);
const inputTokens = (iteration: number) => systemTokens + toolTokens + memoryTokens + historyTokens(iteration);
const SHOWN_ITERATION = 6;
const historyShare = (iteration: number) => historyTokens(iteration) / inputTokens(iteration);

const budget = [
  { label: "instruções", value: systemTokens },
  { label: "ferramentas", value: toolTokens },
  { label: "memória", value: memoryTokens },
  { label: `histórico (iter. ${SHOWN_ITERATION})`, value: historyTokens(SHOWN_ITERATION) },
];

// O estado que o runtime carrega entre as voltas.
const stateFields = ["objetivo", "mensagens", "plano", "resultados", `iteração ${SHOWN_ITERATION}`, `${integer(inputTokens(SHOWN_ITERATION))} tokens`];

// Quem decide o quê: 1 marca o responsável.
const duties = ["escolher ferramenta", "preencher argumentos", "validar argumentos", "executar ferramenta", "parar no limite", "pedir aprovação"];
const owners = ["modelo", "código"];
const responsibility = [
  [1, 0],
  [1, 0],
  [0, 1],
  [0, 1],
  [0, 1],
  [0, 1],
];
const VALIDATE = duties.indexOf("validar argumentos");

const lesson: LessonContent = {
  id: "12-03",
  subtitle: "As peças de um agente (modelo, instruções, ferramentas, memória, estado e runtime) e quem é responsável por cada decisão.",
  objectives: [
    "Nomear os componentes de um agente e o papel de cada um",
    "Separar o que o modelo decide do que o runtime garante",
    "Descrever o estado que o agente carrega entre as iterações",
    "Estimar o orçamento de contexto de cada componente numa chamada",
  ],
  steps: [
    {
      id: "kitchen",
      shortTitle: "A cozinha",
      title: "Um agente é uma cozinha, não só um chef",
      tag: "context",
      body: [
        "Um restaurante não é só o chef. Tem a receita da casa, os utensílios, a despensa, o caderno de pedidos e o gerente que confere se nada sai da cozinha sem passar pela inspeção. O chef decide como cozinhar; o resto da cozinha torna isso possível e seguro.",
        "Num agente, o chef é o [[LLM|llm]], que decide. A receita da casa é o [[system prompt|system-prompt]], com o papel e as regras. Os utensílios são as ferramentas, chamadas por [[tool calling|tool-calling]]. A despensa é a memória. E quem gerencia tudo é o [[runtime do agente|agent-runtime]]: o código que roda o loop, executa as ferramentas e aplica os [[guardrails|guardrail]].",
      ],
      keyIdea: "O modelo é só uma peça: instruções, ferramentas, memória e o runtime fazem do modelo um agente.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "arch",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "pedido", col: 0, row: 0.5 },
              { id: "runtime", kind: "agent", label: "runtime", col: 1, row: 0.5 },
              { id: "llm", kind: "llm", label: "modelo", col: 2, row: 0 },
              { id: "tools", kind: "tool", label: "ferramentas", col: 2, row: 1 },
              { id: "memory", kind: "memory", label: "memória", col: 3, row: 0 },
              { id: "guard", kind: "guardrail", label: "regras", col: 3, row: 1 },
            ],
            edges: [
              { from: "user", to: "runtime" },
              { from: "runtime", to: "llm", label: "contexto" },
              { from: "runtime", to: "tools", label: "executa" },
              { from: "llm", to: "memory" },
              { from: "tools", to: "guard" },
            ],
            active: "runtime",
          },
        ],
      },
      alt: "O pedido chega ao runtime, em destaque, que manda o contexto ao modelo e executa as ferramentas; memória e regras de segurança completam a arquitetura.",
    },
    {
      id: "runtime",
      shortTitle: "O runtime",
      title: "O runtime conduz cada volta",
      tag: "mechanism",
      body: [
        "Pense no runtime como o garçom que leva o pedido à cozinha, traz o prato e confere a comanda. Ele não cozinha, mas nada acontece sem ele. A cada volta, ele monta o contexto, chama o modelo, lê a resposta e, se for uma chamada de ferramenta, executa.",
        "A sequência da cena é uma volta completa: o runtime lê a memória, manda instruções, ferramentas e histórico ao modelo, recebe um tool_use, executa a ferramenta e devolve o resultado como mensagem de ferramenta. Toda regra que precisa valer sempre (limite de iterações, validação dos argumentos contra o [[JSON Schema|json-schema]], permissões) mora aqui, no código, e não no prompt.",
      ],
      keyIdea: "O modelo propõe; o runtime executa, valida e impõe os limites.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "turn",
            piece: "client-server",
            nodes: [
              { id: "user", label: "pessoa", role: "client" },
              { id: "runtime", label: "runtime", role: "server" },
              { id: "memory", label: "memória", role: "cache" },
              { id: "model", label: "modelo", role: "model" },
              { id: "tools", label: "ferramentas", role: "database" },
            ],
            messages: [
              { from: "user", to: "runtime", label: "pedido" },
              { from: "runtime", to: "memory", label: "lê notas" },
              { from: "runtime", to: "model", label: "contexto" },
              { from: "model", to: "runtime", label: "tool_use" },
              { from: "runtime", to: "tools", label: "executa" },
              { from: "tools", to: "runtime", label: "resultado" },
              { from: "runtime", to: "model", label: "tool_result" },
            ],
            active: 4,
          },
        ],
      },
      alt: "Uma volta do runtime: a pessoa faz o pedido, o runtime lê a memória, manda o contexto ao modelo, recebe um tool_use, executa a ferramenta, em trânsito, recebe o resultado e o devolve ao modelo como tool_result.",
    },
    {
      id: "state",
      shortTitle: "O estado",
      title: "O que o agente carrega entre as voltas",
      tag: "mechanism",
      body: [
        "Um cozinheiro no meio de um jantar sabe em que prato está, o que já saiu e o que falta. Se ele sair e outro entrar, o substituto precisa da comanda para continuar. O agente também precisa dessa comanda entre uma volta e outra.",
        `É o [[estado do agente|agent-state]]: o objetivo, as mensagens trocadas, o plano, os resultados das ferramentas e contadores como a iteração e os tokens gastos. Na volta ${SHOWN_ITERATION} do agente de viagens, a próxima chamada leria ${integer(inputTokens(SHOWN_ITERATION))} tokens. Guardar esse estado fora do processo é o que permite pausar para uma aprovação e retomar, ou continuar depois de uma falha.`,
      ],
      keyIdea: "O estado é a comanda do agente: com ele, qualquer volta pode ser pausada, retomada ou auditada.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "state",
            piece: "token-stream",
            tokens: stateFields,
            bars: [0.5, 1, 0.6, 0.9, 0.3, 0.3],
            color: "module-12",
          },
        ],
      },
      alt: `Os campos do estado do agente: ${stateFields.join(", ")}. Mensagens e resultados são os campos que mais crescem.`,
    },
    {
      id: "budget",
      shortTitle: "Orçamento",
      title: "Cada peça ocupa contexto",
      tag: "example",
      body: [
        `Tudo o que o modelo precisa saber cabe numa mesma [[janela de contexto|context-window]]. No agente de viagens, as instruções ocupam ${integer(systemTokens)} tokens, as ${tools.length} definições de ferramentas ${integer(toolTokens)}, as notas de memória ${integer(memoryTokens)}. Essas partes são fixas: vão inteiras em toda chamada.`,
        `O histórico é a parte que cresce: cada volta soma ${CALL_TOKENS} tokens de chamada e ${OBSERVATION_TOKENS} de observação. Na volta 1, ele é ${percent(historyShare(1))} da entrada; na volta ${SHOWN_ITERATION}, já é ${percent(historyShare(SHOWN_ITERATION))}, ou ${integer(historyTokens(SHOWN_ITERATION))} tokens. Por isso as aulas de memória e de gerenciamento de contexto existem: o histórico precisa ser podado.`,
      ],
      keyIdea: "Instruções e ferramentas são um custo fixo por chamada; o histórico cresce a cada volta e vira a maior parte.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "budget",
            piece: "chart",
            kind: "bar",
            series: budget,
            highlight: 3,
            color: "module-12",
          },
        ],
      },
      alt: `Tokens por parte do contexto na volta ${SHOWN_ITERATION}: ${budget.map((item) => `${item.label}, ${integer(item.value)}`).join("; ")}. O histórico é a maior barra.`,
    },
    {
      id: "duties",
      shortTitle: "Quem decide",
      title: "O que fica com o modelo e o que fica no código",
      tag: "tradeoff",
      body: [
        "Num restaurante, o chef escolhe o tempero, mas não decide se a cozinha passa na vigilância sanitária. Com agentes é igual: o que é julgamento fica com o modelo; o que precisa valer sempre fica no código, porque o modelo pode errar ou ser manipulado por um texto no contexto.",
        "A matriz da cena divide o trabalho: o modelo escolhe a ferramenta e preenche os argumentos; o código valida esses argumentos, executa, para no limite de iterações e pede aprovação antes de ações irreversíveis. Colocar uma regra crítica só no prompt é pedir que o modelo a siga; colocar no runtime é garantir.",
      ],
      keyIdea: "Julgamento fica com o modelo; garantias ficam no código.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "duties",
            piece: "matrix",
            rows: duties,
            cols: owners,
            values: responsibility,
            scale: { min: 0, max: 1 },
            highlight: { row: VALIDATE, col: 1 },
            color: "module-12",
          },
        ],
      },
      alt: `Matriz de responsabilidades: o modelo escolhe a ferramenta e preenche os argumentos; o código valida os argumentos, em destaque, executa a ferramenta, para no limite e pede aprovação.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "A arquitetura completa",
      tag: "summary",
      body: [
        "Um agente é um runtime que, a cada volta, monta o contexto com instruções, ferramentas, memória e histórico, chama o modelo, executa o que ele pedir e atualiza o estado. As barreiras ficam na entrada e na saída, no código.",
        "Com as peças no lugar, falta ver o motor girando. A próxima aula é o loop do agente em detalhe: como cada volta começa, termina e quando o loop inteiro para.",
      ],
      keyIdea: "Agente = runtime + modelo + instruções + ferramentas + memória + estado, com as barreiras no código.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "arch",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "pedido", col: 0, row: 0 },
              { id: "input-guard", kind: "guardrail", label: "valida entrada", col: 1, row: 0 },
              { id: "runtime", kind: "agent", label: "runtime", col: 2, row: 0 },
              { id: "llm", kind: "llm", label: "modelo", col: 3, row: 0 },
              { id: "tools", kind: "tool", label: "ferramentas", col: 3, row: 1 },
              { id: "state", kind: "memory", label: "estado", col: 2, row: 1 },
            ],
            edges: [
              { from: "user", to: "input-guard" },
              { from: "input-guard", to: "runtime" },
              { from: "runtime", to: "llm", label: "decide" },
              { from: "runtime", to: "tools", label: "age" },
              { from: "runtime", to: "state", label: "salva" },
            ],
            active: "runtime",
            done: ["user", "input-guard"],
          },
        ],
      },
      alt: "O pedido passa pela validação de entrada e chega ao runtime, em destaque, que consulta o modelo para decidir, usa as ferramentas para agir e salva o estado.",
    },
  ],
  realWorldExample:
    "No texto “LLM Powered Autonomous Agents” (2023), Lilian Weng descreve o agente como um LLM no papel de cérebro, com três componentes em volta: planejamento, memória e uso de ferramentas. O framework CoALA (Sumers et al., 2023) organiza a mesma ideia em módulos de memória, um espaço de ações e um ciclo de decisão.",
  code: {
    language: "typescript",
    source: `interface AgentState {
  goal: string;
  messages: Message[];
  plan: string[];
  iteration: number;
}

async function step(state: AgentState): Promise<AgentState> {
  const reply = await model.create({ system, tools, messages: state.messages });
  const call = reply.toolCall;
  if (!call) return { ...state, messages: [...state.messages, reply] };
  const args = validate(call.name, call.input);   // o código valida
  const result = await tools[call.name](args);     // o código executa
  return {
    ...state,
    iteration: state.iteration + 1,
    messages: [...state.messages, reply, toolResult(call.id, result)],
  };
}`,
    caption: "Uma volta do runtime: o modelo propõe a chamada, o código valida, executa e devolve um estado novo.",
  },
  tradeOffs: {
    pros: [
      "Peças separadas podem ser trocadas: outro modelo, outra ferramenta, outra memória",
      "Regras no runtime valem sempre, independentemente do que o modelo gerar",
      "Estado explícito permite pausar, retomar e auditar cada volta",
    ],
    cons: [
      "Instruções e definições de ferramentas custam tokens em toda chamada",
      "Mais peças significam mais lugares para um erro aparecer",
      "O histórico cresce a cada volta e precisa de uma estratégia de poda",
    ],
    alternatives: [
      "Um LLM aumentado sem loop, quando uma chamada de ferramenta basta",
      "Um framework que já entrega o runtime e o estado prontos",
    ],
  },
  knowledgeCheck: [
    {
      id: "where-rule",
      prompt: "Um agente de compras nunca pode gastar mais de R$ 1.000 sem aprovação. Onde essa regra deve ficar?",
      options: [
        "Só no system prompt, em letras maiúsculas",
        "No runtime: o código confere o valor antes de executar a ferramenta de compra e pausa para aprovação",
        "Na descrição da ferramenta, para o modelo ler",
        "Na memória de longo prazo do agente",
      ],
      correct: 1,
      explanation: "O prompt pede; o código garante. Uma regra que não pode falhar precisa ser checada pelo runtime antes da execução, porque o modelo pode errar ou ser manipulado.",
      lesson: "12-03",
    },
    {
      id: "state-resume",
      prompt: "O servidor de um agente reiniciou no meio de uma tarefa de 8 voltas. O que permite continuar da volta 5 em vez de começar de novo?",
      options: [
        "Um modelo maior",
        "O estado do agente (mensagens, plano, resultados e iteração) salvo fora do processo",
        "Aumentar o limite de iterações",
        "Repetir o system prompt",
      ],
      correct: 1,
      explanation: "O estado é a comanda do agente. Salvo num banco a cada volta, ele permite retomar do ponto em que parou.",
      lesson: "12-03",
    },
  ],
  related: ["12-02", "12-04", "05-03"],
  references: [
    { title: "Lilian Weng: LLM Powered Autonomous Agents", url: "https://lilianweng.github.io/posts/2023-06-23-agent/", kind: "article" },
    { title: "Sumers et al. (2023), Cognitive Architectures for Language Agents (CoALA)", url: "https://arxiv.org/abs/2309.02427", kind: "paper" },
    { title: "Anthropic: Tool use with Claude", url: "https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview", kind: "docs" },
  ],
};

export default lesson;
