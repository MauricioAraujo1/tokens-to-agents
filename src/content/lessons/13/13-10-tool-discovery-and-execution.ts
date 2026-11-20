import type { LessonContent } from "../../../types/content";

// Descoberta e execução do ponto de vista do host, com contas no arquivo: três servidores com ferramentas
// de mesmo nome (colisões resolvidas com prefixo), o custo em tokens das definições quando o host conecta
// mais servidores (4 caracteres por token, 15 ferramentas por servidor, janela de 200 mil tokens como
// exemplo) e o que a descoberta progressiva economiza. Métodos seguem a revisão 2026-07-28.

const SPEC = "2026-07-28";
const estimateTokens = (text: string) => Math.ceil(text.length / 4);
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");

const servers: Record<string, string[]> = {
  github: ["search", "create_issue", "get_pull_request"],
  jira: ["search", "create_ticket"],
  docs: ["search", "read_page"],
};
const rawNames = Object.values(servers).flat();
const SEPARATOR = "__";
const namespaced = Object.entries(servers).flatMap(([server, tools]) => tools.map((tool) => `${server}${SEPARATOR}${tool}`));
const nameCounts = rawNames.reduce((counts, name) => counts.set(name, (counts.get(name) ?? 0) + 1), new Map<string, number>());
const collidingName = [...nameCounts.entries()].find(([, count]) => count > 1)?.[0] ?? "";
const collisions = nameCounts.get(collidingName) ?? 0;
const collidingIndexes = rawNames.map((name, index) => (name === collidingName ? index : -1)).filter((index) => index >= 0);
const route = (modelToolName: string) => {
  const [server, ...rest] = modelToolName.split(SEPARATOR);
  return { server, tool: rest.join(SEPARATOR) };
};
const routed = route(namespaced[0]);

// Custo das definições: uma definição típica, repetida por ferramenta e por servidor.
const sampleDefinition = JSON.stringify({
  name: "github__search",
  description: "Busca issues e pull requests abertos por texto. Use para achar itens antes de criar um novo.",
  input_schema: {
    type: "object",
    properties: {
      repo: { type: "string", description: "Repositório no formato dono/nome" },
      query: { type: "string", description: "Texto a procurar" },
      limit: { type: "integer", description: "Máximo de itens, até 20" },
    },
    required: ["repo", "query"],
  },
});
const tokensPerTool = estimateTokens(sampleDefinition);
const TOOLS_PER_SERVER = 15;
const CONTEXT_WINDOW = 200_000;
const THRESHOLD_SHARE = 0.05;
const threshold = CONTEXT_WINDOW * THRESHOLD_SHARE;
const serverCounts = [1, 2, 4, 6, 8];
const costSeries = serverCounts.map((count) => ({ label: `${count} servidores`, value: count * TOOLS_PER_SERVER * tokensPerTool }));
const firstOverThreshold = costSeries.find((item) => item.value >= threshold);
const maxServers = serverCounts[serverCounts.length - 1];
const upfrontTokens = maxServers * TOOLS_PER_SERVER * tokensPerTool;

// Descoberta progressiva: uma ferramenta de busca no contexto e só as definições que a tarefa pede.
const searchToolTokens = estimateTokens(
  JSON.stringify({
    name: "search_tools",
    description: "Busca ferramentas disponíveis por descrição e devolve nomes e resumos.",
    input_schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  }),
);
const LOADED_DEFINITIONS = 2;
const progressiveTokens = searchToolTokens + LOADED_DEFINITIONS * tokensPerTool;
const savedShare = 1 - progressiveTokens / upfrontTokens;

const lesson: LessonContent = {
  id: "13-10",
  subtitle: "O caminho completo de uma ferramenta no host: listar em vários servidores, evitar colisões, rotear a chamada, pedir dados ao usuário e caber no contexto.",
  objectives: [
    "Juntar ferramentas de vários servidores e evitar colisões de nome com prefixos",
    "Seguir uma chamada do pedido do modelo ao tools/call e de volta",
    "Explicar o padrão de várias idas e voltas (input_required) da revisão 2026-07-28",
    "Calcular o custo das definições no contexto e quando usar descoberta progressiva",
  ],
  steps: [
    {
      id: "switchboard",
      shortTitle: "A central",
      title: "O host como central telefônica",
      tag: "context",
      body: [
        "Uma central telefônica antiga tinha uma lista de todos os ramais e uma telefonista que ligava a chamada certa. O host faz esse papel: pede a cada servidor a lista de ferramentas, monta um catálogo único, mostra ao modelo e, quando o modelo pede uma ferramenta, liga a chamada para o servidor dono dela.",
        "A descoberta usa o [[tools/list|tools-list]], com paginação por cursor; a execução usa o [[tools/call|tools-call]]. Entre os dois fica o modelo, que só enxerga o catálogo traduzido para o formato de [[tool calling|tool-calling]] da API dele.",
      ],
      keyIdea: "O host lista, traduz, mostra ao modelo e roteia cada chamada ao servidor certo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "central",
            piece: "block-diagram",
            blocks: [
              { id: "llm", kind: "llm", label: "modelo", col: 0, row: 0.5 },
              { id: "host", kind: "laptop", label: "host: catálogo", col: 1, row: 0.5 },
              { id: "github", kind: "tool", label: "github", col: 2.5, row: 0 },
              { id: "jira", kind: "tool", label: "jira", col: 2.5, row: 1 },
              { id: "docs", kind: "documents", label: "docs", col: 3.5, row: 0.5 },
            ],
            edges: [
              { from: "host", to: "llm", label: "ferramentas" },
              { from: "host", to: "github", label: "tools/list" },
              { from: "host", to: "jira", label: "tools/list" },
              { from: "host", to: "docs", label: "tools/list" },
            ],
            active: "host",
          },
        ],
      },
      alt: "O host, em destaque, pede tools/list aos servidores GitHub, Jira e docs, monta um catálogo único e o entrega ao modelo.",
    },
    {
      id: "namespacing",
      shortTitle: "Colisões",
      title: "Três ferramentas chamadas search",
      tag: "mechanism",
      body: [
        `O nome de uma ferramenta só é único dentro do próprio servidor. Juntando os ${Object.keys(servers).length} servidores, o catálogo tem ${rawNames.length} ferramentas e ${collisions} delas se chamam ${collidingName}. Se o modelo pedir ${collidingName}, o host não sabe para quem ligar.`,
        `A especificação recomenda uma estratégia de desambiguação, como o [[prefixo do servidor|tool-namespacing]]: ${namespaced.filter((name) => name.endsWith(collidingName)).join(", ")}. Use um separador que a API do modelo aceite em nomes (aqui, ${SEPARATOR}) e não dependa do name do serverInfo, que não é garantidamente único. A revisão ${SPEC} também pede que o servidor devolva as ferramentas em ordem determinística, o que ajuda o cache de prompt do provedor.`,
      ],
      keyIdea: "Nomes só são únicos por servidor: prefixe antes de mostrar ao modelo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "names",
            piece: "token-stream",
            tokens: rawNames,
            keys: collidingIndexes,
            arcs: collidingIndexes.slice(1).map((index) => ({ from: collidingIndexes[0], to: index, weight: 0.8, label: "mesmo nome" })),
            color: "danger",
          },
        ],
      },
      alt: `Catálogo bruto: ${rawNames.join(", ")}. As ${collisions} ferramentas ${collidingName}, em destaque, colidem; com prefixo viram ${namespaced.filter((name) => name.endsWith(collidingName)).join(", ")}.`,
    },
    {
      id: "execute",
      shortTitle: "Executar",
      title: "Do pedido do modelo ao resultado",
      tag: "mechanism",
      body: [
        `O modelo devolve um pedido de ferramenta com o nome prefixado, como ${namespaced[0]}. O host separa o prefixo (servidor ${routed.server}, ferramenta ${routed.tool}), confere as regras de aprovação, manda o tools/call pelo cliente desse servidor e espera a resposta com timeout.`,
        "A resposta volta como content, talvez com structuredContent e isError. O host converte para o [[tool result|tool-result]] da API do modelo, com o id da chamada original, e o loop continua. Erros de execução vão para o modelo se corrigir; erros de protocolo, como ferramenta desconhecida, indicam um bug do host ou um catálogo desatualizado.",
      ],
      keyIdea: "Separe o prefixo, aprove, chame com timeout e devolva o resultado com o id da chamada.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "loop",
            piece: "agent-loop",
            phases: [
              { id: "ask", label: "modelo pede" },
              { id: "route", label: "host roteia" },
              { id: "call", label: "tools/call" },
              { id: "result", label: "tool result" },
            ],
            active: "call",
            iteration: 1,
            maxIterations: 8,
            tool: `${routed.tool}(repo: "acme/api", query: "timeout")`,
          },
        ],
      },
      alt: `Loop de execução na iteração 1 de 8: o modelo pede, o host roteia, a fase atual é o tools/call de ${routed.tool} no servidor ${routed.server}, e o resultado volta ao modelo.`,
    },
    {
      id: "input-required",
      shortTitle: "Mais uma volta",
      title: "Quando o servidor precisa de mais",
      tag: "mechanism",
      body: [
        "Às vezes o servidor só consegue terminar com uma informação extra, como a confirmação de um valor. Em vez de segurar a conexão esperando, na revisão 2026-07-28 ele devolve um resultado com resultType “input_required”, com os pedidos de entrada (por exemplo, uma elicitação) e um requestState opaco.",
        "É o [[padrão de várias idas e voltas|multi-round-trip-request]]: o host reúne as respostas, mostra o formulário ao usuário se for o caso, e repete o tools/call original com inputResponses, o requestState de volta sem mexer e um id JSON-RPC novo. O servidor não precisa guardar nada entre as duas chamadas, mas deve tratar o requestState como entrada de atacante e protegê-lo com assinatura quando ele afeta permissão ou negócio.",
      ],
      keyIdea: "input_required: o host junta o que falta e refaz o mesmo pedido, com id novo e o requestState intacto.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "mrtr",
            piece: "block-diagram",
            blocks: [
              { id: "first", kind: "laptop", label: "host: chamada #1", col: 0, row: 0 },
              { id: "server", kind: "tool", label: "servidor", col: 1, row: 0 },
              { id: "user", kind: "user", label: "usuário confirma", col: 2, row: 0 },
              { id: "retry", kind: "laptop", label: "host: chamada #2", col: 2, row: 1 },
              { id: "result", kind: "answer", label: "resultado", col: 3, row: 1 },
            ],
            edges: [
              { from: "first", to: "server", label: "tools/call" },
              { from: "server", to: "user", label: "input_required" },
              { from: "user", to: "retry", label: "respostas" },
              { from: "retry", to: "result", label: "+ requestState" },
            ],
            active: "retry",
            done: ["first", "server", "user"],
          },
        ],
      },
      alt: "O host faz a chamada 1; o servidor devolve input_required; o usuário confirma pelo formulário do host; o host refaz a chamada, agora com o id 2, as respostas e o requestState, em destaque, e recebe o resultado.",
    },
    {
      id: "context-cost",
      shortTitle: "O custo",
      title: "O catálogo também ocupa o contexto",
      tag: "example",
      body: [
        `Uma definição típica, já traduzida para a API do modelo, custa uns ${integer(tokensPerTool)} tokens. Com ${TOOLS_PER_SERVER} ferramentas por servidor, ${costSeries.map((item) => `${item.label} somam ${integer(item.value)}`).join(", ")} tokens, enviados em toda chamada ao modelo.`,
        `Numa janela de ${integer(CONTEXT_WINDOW)} tokens, a documentação do MCP sugere um limite de 1% a 5% para as definições. Com o limite de ${Math.round(THRESHOLD_SHARE * 100)}% (${integer(threshold)} tokens), o catálogo passa do ponto a partir de ${firstOverThreshold?.label ?? "nenhum ponto da série"}. O resultado do tools/list traz ttlMs: o host deve guardar o catálogo em cache e só refazer a lista quando o prazo vence ou chega uma [[notificação|mcp-notification]] tools/list_changed.`,
      ],
      keyIdea: "Cada servidor conectado custa tokens em toda chamada; meça antes de conectar mais um.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "cost",
            piece: "chart",
            kind: "bar",
            series: costSeries,
            cutoff: { mode: "threshold", value: threshold, label: `${Math.round(THRESHOLD_SHARE * 100)}% da janela` },
            color: "module-13",
          },
        ],
      },
      alt: `Tokens das definições por número de servidores: ${costSeries.map((item) => `${item.label}, ${integer(item.value)}`).join("; ")}. A linha de ${integer(threshold)} tokens marca ${Math.round(THRESHOLD_SHARE * 100)}% da janela.`,
    },
    {
      id: "progressive",
      shortTitle: "Sob demanda",
      title: "Descoberta progressiva",
      tag: "tradeoff",
      body: [
        `Na [[descoberta progressiva|progressive-tool-discovery]], o host continua chamando tools/list, mas não injeta tudo: oferece ao modelo uma ferramenta search_tools e carrega só as definições escolhidas. Com ${maxServers} servidores, em vez de ${integer(upfrontTokens)} tokens de catálogo, o contexto recebe ${integer(searchToolTokens)} da busca mais ${LOADED_DEFINITIONS} definições, ${integer(progressiveTokens)} tokens: ${Math.round(savedShare * 100)}% a menos. A ilustração da documentação do MCP compara cerca de 150 mil tokens com cerca de 2 mil.`,
        "O preço é uma volta extra do modelo para buscar, o risco de a busca não achar a ferramenta certa e o cache de prompt: mudar o array de ferramentas no meio da conversa invalida o prefixo em cache. A documentação sugere acrescentar definições depois do ponto de cache ou usar uma ferramenta call_tool estável, e reindexar a busca a cada list_changed.",
      ],
      keyIdea: "Muitas ferramentas: busque e carregue sob demanda; poucas: mande todas.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "saving",
            piece: "metrics-panel",
            metrics: [
              { id: "upfront", label: `catálogo inteiro (${maxServers} servidores)`, value: `${integer(upfrontTokens)} tokens`, color: "danger" },
              { id: "progressive", label: "busca + 2 definições", value: `${integer(progressiveTokens)} tokens`, color: "success" },
              { id: "saved", label: "economia", value: `${Math.round(savedShare * 100)}%` },
              { id: "extra", label: "custo extra", value: "1 volta de busca" },
            ],
            highlight: "progressive",
          },
        ],
      },
      alt: `Painel: o catálogo inteiro de ${maxServers} servidores custa ${integer(upfrontTokens)} tokens; a busca mais 2 definições custa ${integer(progressiveTokens)}, economia de ${Math.round(savedShare * 100)}%, ao preço de uma volta de busca.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Do catálogo à chamada",
      tag: "summary",
      body: [
        "O host lista as ferramentas de cada servidor, prefixa os nomes, guarda em cache pelo ttlMs, mostra ao modelo (tudo ou sob demanda), roteia cada pedido para o servidor dono, repete a chamada quando vem input_required e devolve o resultado com o id da chamada.",
        "Cada etapa desse caminho é também uma porta de entrada para ataques. A próxima aula trata da segurança do MCP.",
      ],
      keyIdea: "Listar, prefixar, cachear, mostrar, rotear, repetir se preciso, devolver.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "path",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "list", label: "tools/list + cursor" },
              { id: "prefix", label: "prefixar nomes", color: "module-13" },
              { id: "cache", label: "cache por ttlMs" },
              { id: "show", label: "tudo ou sob demanda" },
              { id: "route", label: "rotear tools/call" },
              { id: "mrtr", label: "input_required: repetir" },
              { id: "result", label: "tool result com o id" },
            ],
          },
        ],
      },
      alt: "Resumo em chips: tools/list com cursor, prefixar nomes, cache por ttlMs, mostrar tudo ou sob demanda, rotear o tools/call, repetir em input_required e devolver o tool result com o id.",
    },
  ],
  realWorldExample:
    "A página Client Best Practices da documentação do MCP descreve hosts com dezenas de servidores e centenas de ferramentas, em que as definições sozinhas ocupariam a maior parte da janela de contexto. Ela cita que OpenAI e Anthropic já oferecem busca de ferramentas nativa nas suas APIs e recomenda usá-la quando existir, em vez de implementar a própria.",
  code: {
    language: "typescript",
    source: `interface McpTool {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}

interface ModelTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

const SEPARATOR = "__";

function toModelTools(server: string, tools: McpTool[]): ModelTool[] {
  return tools.map((tool) => ({
    name: \`\${server}\${SEPARATOR}\${tool.name}\`,
    description: tool.description ?? "",
    input_schema: tool.inputSchema,
  }));
}

function route(modelToolName: string): { server: string; tool: string } {
  const [server, ...rest] = modelToolName.split(SEPARATOR);
  return { server, tool: rest.join(SEPARATOR) };
}`,
    caption: "O host traduz as ferramentas MCP para o formato de tools de uma API de modelo, com o servidor como prefixo, e desfaz o prefixo para rotear o tools/call.",
  },
  tradeOffs: {
    pros: [
      "Catálogo dinâmico: ferramentas novas aparecem sem mudar o código do host",
      "Prefixos resolvem colisões e deixam claro de onde vem cada ferramenta",
      "Cache por ttlMs e list_changed evita listar de novo a cada pergunta",
    ],
    cons: [
      "Definições de muitos servidores ocupam o contexto em toda chamada",
      "Descoberta progressiva custa uma volta a mais e pode errar a busca",
      "Mudar a lista de ferramentas no meio da conversa invalida o cache de prompt",
    ],
    alternatives: ["Busca de ferramentas nativa da API do modelo", "Programmatic tool calling, para encadear ferramentas sem passar resultados pelo modelo"],
  },
  knowledgeCheck: [
    {
      id: "collision",
      prompt: "Dois servidores expõem uma ferramenta chamada search. O que o host deve fazer antes de mostrar o catálogo ao modelo?",
      options: [
        "Mostrar só a primeira e descartar a segunda",
        "Prefixar com um identificador do servidor, como github__search e jira__search, e rotear pelo prefixo",
        "Usar o name do serverInfo como chave única",
        "Pedir aos servidores que renomeiem",
      ],
      correct: 1,
      explanation: "A especificação recomenda desambiguar, por exemplo com prefixo do servidor. O name do serverInfo não é garantidamente único e não serve de chave.",
      lesson: "13-10",
    },
    {
      id: "threshold",
      prompt: "Um host tem janela de 128 mil tokens e definições de 120 tokens por ferramenta. Com o limite de 5% da janela, quantas ferramentas cabem antes de valer a descoberta progressiva?",
      options: ["Cerca de 53", "Cerca de 107", "Cerca de 533", "Cerca de 1.067"],
      correct: 0,
      explanation: "5% de 128.000 são 6.400 tokens; 6.400 / 120 ≈ 53 ferramentas. Acima disso, vale carregar definições sob demanda.",
      lesson: "13-10",
    },
  ],
  related: ["13-09", "13-11", "12-05"],
  references: [
    { title: "MCP Specification 2026-07-28: Tools", url: "https://modelcontextprotocol.io/specification/2026-07-28/server/tools", kind: "docs" },
    { title: "MCP Specification 2026-07-28: Multi Round-Trip Requests", url: "https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr", kind: "docs" },
    { title: "MCP: Client Best Practices", url: "https://modelcontextprotocol.io/docs/develop/clients/client-best-practices", kind: "docs" },
  ],
};

export default lesson;
