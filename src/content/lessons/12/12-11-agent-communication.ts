import type { LessonContent } from "../../../types/content";

// Comunicação entre agentes com contas no arquivo: quantos canais existem quando todos falam com todos
// (n × (n − 1) / 2) e quando todos falam só com um coordenador (n − 1), e quanto pesa um handoff que
// repassa o histórico inteiro em vez de um resumo. O nome da ferramenta de handoff segue o padrão do
// OpenAI Agents SDK (transfer_to_<nome do agente>).

const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");

const meshChannels = (agents: number) => (agents * (agents - 1)) / 2;
const starChannels = (agents: number) => agents - 1;
const teamSizes = [2, 3, 4, 5, 6, 7];
const BIG_TEAM = teamSizes[teamSizes.length - 1];
const channelSeries = teamSizes.map((size) => ({ label: `${size} agentes`, value: meshChannels(size) }));

const MESH_SIZE = 5;
const meshAgents = ["triagem", "pedidos", "reembolso", "logística", "faq"].slice(0, MESH_SIZE);
const meshPositions: Array<[number, number]> = [
  [0.5, 0.1],
  [0.88, 0.38],
  [0.74, 0.88],
  [0.26, 0.88],
  [0.12, 0.38],
];
const meshEdges = meshAgents.flatMap((from, i) => meshAgents.slice(i + 1).map((to) => ({ from, to })));

// Handoff: o histórico inteiro contra um resumo com os ids necessários.
const HISTORY = 18_000;
const HANDOFF_SUMMARY = 600;
const payloadRatio = HISTORY / HANDOFF_SUMMARY;

const handoffTool = (agentName: string) =>
  `transfer_to_${agentName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "_")}`;
const TARGET = "Reembolso";
const toolName = handoffTool(TARGET);

const envelope = {
  de: "triagem",
  para: "reembolso",
  tipo: "handoff",
  pedido: "4821",
  resumo: "chegou quebrado, no prazo",
  cliente: "c-77",
};
const envelopeTokens = Object.entries(envelope).map(([key, value]) => `${key}: ${value}`);
const PAYLOAD_KEYS = [3, 4, 5];

const lesson: LessonContent = {
  id: "12-11",
  subtitle: "Como agentes trocam tarefas e resultados: mensagens diretas, um quadro compartilhado, handoffs e os protocolos que ligam agentes de sistemas diferentes.",
  objectives: [
    "Comparar troca de mensagens com estado compartilhado (blackboard)",
    "Calcular quantos canais um time tem em rede completa e em estrela",
    "Explicar o handoff como uma ferramenta e o que deve ir junto com ele",
    "Diferenciar A2A (agente com agente) de MCP (agente com ferramentas)",
  ],
  steps: [
    {
      id: "mesh",
      shortTitle: "Canais",
      title: "Todo mundo falando com todo mundo",
      tag: "context",
      body: [
        `Num escritório em que cada pessoa manda recado direto para qualquer outra, com ${MESH_SIZE} pessoas já existem ${meshChannels(MESH_SIZE)} conversas possíveis. Ninguém sabe quem já avisou quem, e um recado importante se perde numa conversa paralela.`,
        `Com agentes é igual. Numa rede completa, n agentes têm n × (n − 1) / 2 canais: ${meshChannels(MESH_SIZE)} para ${MESH_SIZE}, ${meshChannels(BIG_TEAM)} para ${BIG_TEAM}. Com um coordenador no meio, são só n − 1: ${starChannels(BIG_TEAM)} para ${BIG_TEAM}. O formato da comunicação decide quanto contexto cada agente recebe e quão fácil é seguir o rastro de uma decisão.`,
      ],
      keyIdea: "Canais crescem com o quadrado do número de agentes na rede completa, e linearmente com um coordenador.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "topology",
            piece: "graph",
            nodes: meshAgents.map((agent, index) => ({
              id: agent,
              label: agent,
              x: meshPositions[index][0],
              y: meshPositions[index][1],
              ...(index === 0 ? { color: "module-12" as const } : {}),
            })),
            edges: meshEdges,
            highlight: [meshAgents[0]],
          },
        ],
      },
      alt: `Grafo com ${MESH_SIZE} agentes (${meshAgents.join(", ")}) ligados todos com todos, somando ${meshChannels(MESH_SIZE)} canais.`,
    },
    {
      id: "envelope",
      shortTitle: "Mensagens",
      title: "Uma mensagem com envelope",
      tag: "mechanism",
      body: [
        "Um bom recado tem remetente, destinatário, assunto e o essencial do conteúdo. “Liga pra ele” não serve; “Cliente 77, pedido 4821, quer reembolso, já conferi o prazo” serve.",
        "Na [[troca de mensagens|message-passing]], cada agente manda ao outro uma mensagem com envelope (de, para, tipo) e uma carga útil. A carga deve ser [[saída estruturada|structured-output]] validada por um [[JSON Schema|json-schema]], com ids em vez de textos longos, para o receptor buscar o detalhe sob demanda. Texto livre entre agentes é onde instruções se perdem e onde uma [[prompt injection|prompt-injection]] passa de um agente para o outro.",
      ],
      keyIdea: "Mensagem entre agentes = envelope + carga estruturada e curta, com ids para buscar o resto.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "envelope",
            piece: "token-stream",
            tokens: envelopeTokens,
            keys: PAYLOAD_KEYS,
            bars: envelopeTokens.map((_, index) => (PAYLOAD_KEYS.includes(index) ? 1 : 0.4)),
            color: "module-12",
          },
        ],
      },
      alt: `Mensagem em campos: ${envelopeTokens.join(", ")}. Os três primeiros são o envelope; pedido, resumo e cliente, em destaque, são a carga útil.`,
    },
    {
      id: "blackboard",
      shortTitle: "O quadro",
      title: "Um quadro na parede da sala",
      tag: "mechanism",
      body: [
        "Outra forma de trabalhar em equipe é um quadro na parede: cada um escreve o que descobriu, e quem precisa lê. Ninguém manda recado para ninguém; o quadro é a fonte da verdade.",
        "Esse é o padrão [[blackboard|blackboard]]: os agentes leem e escrevem num estado compartilhado. O estado de um grafo no LangGraph funciona assim: cada nó lê o estado e devolve uma atualização, e funções de redução dizem como juntar escritas que chegam juntas, como anexar a uma lista em vez de sobrescrever. O cuidado é com quem pode escrever o quê: um campo que todos sobrescrevem vira corrida entre agentes.",
      ],
      keyIdea: "Estado compartilhado troca recados por um quadro comum, com regras claras de escrita.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "board",
            piece: "block-diagram",
            blocks: [
              { id: "research", kind: "agent", label: "pesquisador", col: 0, row: 0 },
              { id: "analyst", kind: "agent", label: "analista", col: 0, row: 1 },
              { id: "board", kind: "memory", label: "quadro", col: 1, row: 0.5 },
              { id: "writer", kind: "agent", label: "redator", col: 2, row: 0.5 },
              { id: "answer", kind: "answer", label: "relatório", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "research", to: "board", label: "fontes" },
              { from: "analyst", to: "board", label: "números" },
              { from: "board", to: "writer", label: "lê tudo" },
              { from: "writer", to: "answer" },
            ],
            active: "board",
          },
        ],
      },
      alt: "O pesquisador escreve fontes e o analista escreve números no quadro compartilhado, em destaque; o redator lê o quadro e escreve o relatório.",
    },
    {
      id: "handoff",
      shortTitle: "Handoff",
      title: "Passar o atendimento adiante",
      tag: "example",
      body: [
        "No call center, a atendente de triagem não resolve o reembolso: ela transfere a ligação para o setor certo e já conta o caso, para o cliente não repetir tudo.",
        `Um [[handoff|handoff]] é isso entre agentes: o controle da conversa passa para outro agente. No OpenAI Agents SDK, cada handoff aparece para o modelo como uma ferramenta: a transferência para o agente “${TARGET}” vira a ferramenta ${toolName}. O que vai junto importa: repassar o histórico inteiro custa uns ${integer(HISTORY)} tokens, um resumo com os ids custa ${integer(HANDOFF_SUMMARY)}, ${integer(payloadRatio)} vezes menos.`,
      ],
      keyIdea: "Handoff é uma ferramenta que transfere o controle; leve o resumo e os ids, não a conversa inteira.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "exchange",
            piece: "client-server",
            nodes: [
              { id: "user", label: "cliente", role: "client" },
              { id: "triage", label: "triagem", role: "server" },
              { id: "refund", label: "reembolso", role: "server" },
              { id: "orders", label: "pedidos", role: "database" },
            ],
            messages: [
              { from: "user", to: "triage", label: "chegou quebrado" },
              { from: "triage", to: "refund", label: toolName },
              { from: "refund", to: "orders", label: "consulta 4821" },
              { from: "orders", to: "refund", label: "no prazo" },
              { from: "refund", to: "user", label: "reembolso aberto" },
            ],
            active: 1,
          },
        ],
      },
      alt: `O cliente fala com o agente de triagem, que chama ${toolName} e passa o controle ao agente de reembolso; este consulta o pedido e responde ao cliente. A mensagem em trânsito é o handoff.`,
    },
    {
      id: "cost",
      shortTitle: "O custo",
      title: "Mais agentes, mais conversa",
      tag: "tradeoff",
      body: [
        `Cada canal a mais é um lugar onde um recado pode se perder ou ser mal interpretado. Com ${BIG_TEAM} agentes em rede completa, são ${meshChannels(BIG_TEAM)} canais para vigiar; num coordenador central, ${starChannels(BIG_TEAM)}.`,
        "Rede completa dá flexibilidade, mas cada agente recebe mais mensagens e o rastro de uma decisão fica espalhado. Coordenador central dá controle e um log único, mas vira gargalo e ponto único de falha. Estado compartilhado reduz mensagens, mas exige regras de escrita. Na prática, comece pelo centralizado com mensagens estruturadas e um log de todas as trocas.",
      ],
      keyIdea: "Escolha o formato da comunicação pelo rastro que você precisa seguir, não pela flexibilidade.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "channels",
            piece: "chart",
            kind: "bar",
            series: channelSeries,
            highlight: teamSizes.indexOf(MESH_SIZE),
            color: "module-12",
          },
          {
            id: "payload",
            piece: "metrics-panel",
            metrics: [
              { id: "mesh", label: `rede com ${BIG_TEAM}`, value: `${meshChannels(BIG_TEAM)} canais`, color: "danger" },
              { id: "star", label: `estrela com ${BIG_TEAM}`, value: `${starChannels(BIG_TEAM)} canais`, color: "success" },
              { id: "summary", label: "handoff com resumo", value: `${integer(payloadRatio)}× menos tokens` },
            ],
            highlight: "star",
          },
        ],
      },
      alt: `Barras com os canais de uma rede completa: ${channelSeries.map((item) => `${item.label}, ${item.value}`).join("; ")}. O painel compara ${meshChannels(BIG_TEAM)} canais em rede com ${starChannels(BIG_TEAM)} em estrela e mostra que o handoff com resumo usa ${integer(payloadRatio)} vezes menos tokens.`,
    },
    {
      id: "summary",
      shortTitle: "Protocolos",
      title: "Agentes de sistemas diferentes",
      tag: "summary",
      body: [
        "Dentro do seu sistema, você escolhe o formato. Para falar com agentes de outras empresas, é preciso um protocolo comum. O [[A2A|a2a-protocol]] é um protocolo aberto, hoje sob a Linux Foundation, para agentes de plataformas diferentes colaborarem sem expor memória, ferramentas ou lógica interna. Ele complementa o MCP: o MCP liga um agente a ferramentas e dados, o A2A liga um agente a outros agentes.",
        "Saber trocar mensagens é metade do problema; a outra metade é decidir quem manda em quem e em que ordem. A próxima aula trata da orquestração de agentes.",
      ],
      keyIdea: "MCP: agente com ferramentas e dados. A2A: agente com agente.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "board",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "usuário", col: 0, row: 0.5 },
              { id: "agent", kind: "agent", label: "seu agente", col: 1, row: 0.5 },
              { id: "partner", kind: "cloud", label: "agente parceiro", col: 2, row: 0 },
              { id: "mcp", kind: "tool", label: "servidor mcp", col: 2, row: 1 },
              { id: "data", kind: "sql-db", label: "dados", col: 3, row: 1 },
            ],
            edges: [
              { from: "user", to: "agent" },
              { from: "agent", to: "partner", label: "a2a" },
              { from: "agent", to: "mcp", label: "mcp" },
              { from: "mcp", to: "data" },
            ],
            active: "agent",
          },
        ],
      },
      alt: "O usuário fala com o seu agente, em destaque, que conversa com um agente parceiro de outra plataforma pelo A2A e acessa ferramentas e dados por um servidor MCP.",
    },
  ],
  realWorldExample:
    "No OpenAI Agents SDK, um agente de triagem declara handoffs para agentes especializados, e o SDK os expõe ao modelo como ferramentas: a transferência para um agente chamado “Refund Agent” aparece como a ferramenta transfer_to_refund_agent.",
  code: {
    language: "python",
    source: `from agents import Agent, Runner

reembolso = Agent(name="Reembolso", instructions="Abra reembolsos de pedidos no prazo.")
logistica = Agent(name="Logistica", instructions="Responda sobre entregas e rastreio.")

triagem = Agent(
    name="Triagem",
    instructions="Entenda o pedido do cliente e transfira para o agente certo.",
    handoffs=[reembolso, logistica],  # viram as ferramentas transfer_to_reembolso e transfer_to_logistica
)

result = Runner.run_sync(triagem, "Meu pedido 4821 chegou quebrado.")
print(result.final_output)`,
    caption: "Handoffs no OpenAI Agents SDK: o agente de triagem recebe uma ferramenta de transferência para cada agente especializado.",
  },
  tradeOffs: {
    pros: [
      "Mensagens estruturadas são validáveis e deixam um rastro auditável",
      "Handoffs mantêm cada agente com prompt e ferramentas do seu domínio",
      "Protocolos abertos ligam agentes de equipes e empresas diferentes",
    ],
    cons: [
      "Canais crescem rápido em rede completa e espalham as decisões",
      "Resumos de handoff podem perder o detalhe que o próximo agente precisava",
      "Texto vindo de outro agente é entrada não confiável e pode carregar injeção",
    ],
    alternatives: [
      "Agente único, quando a conversa não precisa trocar de especialista",
      "Coordenador central que chama os outros como ferramentas, sem passar o controle",
    ],
  },
  knowledgeCheck: [
    {
      id: "channels-count",
      prompt: "Um time de 8 agentes em que todos podem falar com todos tem quantos canais? E com um coordenador central?",
      options: ["8 e 8", "28 e 7", "64 e 8", "56 e 1"],
      correct: 1,
      explanation: "Rede completa: 8 × 7 / 2 = 28 canais. Em estrela, cada agente fala só com o coordenador: 8 − 1 = 7.",
      lesson: "12-11",
    },
    {
      id: "handoff-payload",
      prompt: "Na transferência da triagem para o agente de reembolso, o que deve ir junto?",
      options: [
        "Nada: o agente de reembolso pergunta tudo de novo ao cliente",
        "Um resumo estruturado com o pedido, o motivo e os ids, para buscar o resto sob demanda",
        "Todo o histórico, sempre, para não perder nada",
        "Só o nome do cliente",
      ],
      correct: 1,
      explanation: "Resumo com ids evita que o cliente repita o caso e custa muito menos tokens que o histórico inteiro; o detalhe pode ser buscado pelos ids quando for preciso.",
      lesson: "12-11",
    },
  ],
  related: ["12-10", "12-12", "13-01"],
  references: [
    { title: "OpenAI Agents SDK: Handoffs", url: "https://openai.github.io/openai-agents-python/handoffs/", kind: "docs" },
    { title: "Agent2Agent (A2A) Protocol", url: "https://a2a-protocol.org/latest/", kind: "docs" },
    { title: "Model Context Protocol", url: "https://modelcontextprotocol.io/", kind: "docs" },
  ],
};

export default lesson;
