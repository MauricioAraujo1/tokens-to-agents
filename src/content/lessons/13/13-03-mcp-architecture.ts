import type { LessonContent } from "../../../types/content";

// As duas camadas do MCP com contas no arquivo: a mesma mensagem JSON-RPC de tools/call (revisão
// 2026-07-28), o tamanho dela em bytes, o quanto o campo _meta pesa em cada pedido e o que cada transporte
// acrescenta: uma quebra de linha no stdio, os cabeçalhos no Streamable HTTP. Tudo é texto ASCII, então
// caracteres e bytes coincidem.

const SPEC = "2026-07-28";
const integer = (value: number) => value.toLocaleString("pt-BR");
const percent = (value: number) => `${Math.round(value * 100)}%`;

const meta = {
  "io.modelcontextprotocol/protocolVersion": SPEC,
  "io.modelcontextprotocol/clientInfo": { name: "ExampleClient", version: "1.0.0" },
  "io.modelcontextprotocol/clientCapabilities": {},
};
const params = { name: "get_weather", arguments: { location: "Recife" } };
const request = { jsonrpc: "2.0", id: 7, method: "tools/call", params: { ...params, _meta: meta } };
const requestWithoutMeta = { jsonrpc: "2.0", id: 7, method: "tools/call", params };

const body = JSON.stringify(request);
const bodyBytes = body.length;
const bodyWithoutMetaBytes = JSON.stringify(requestWithoutMeta).length;
const metaBytes = bodyBytes - bodyWithoutMetaBytes;
const metaShare = metaBytes / bodyBytes;

// stdio: uma mensagem por linha, terminada por "\n".
const stdioBytes = bodyBytes + 1;

// Streamable HTTP: o mesmo corpo num POST, com os cabeçalhos exigidos pela revisão 2026-07-28.
const httpHeaders = [
  "POST /mcp HTTP/1.1",
  "Host: mcp.exemplo.com",
  "Content-Type: application/json",
  "Accept: application/json, text/event-stream",
  `Content-Length: ${bodyBytes}`,
  `MCP-Protocol-Version: ${SPEC}`,
  `Mcp-Method: ${request.method}`,
  `Mcp-Name: ${params.name}`,
];
const httpHeaderBytes = httpHeaders.reduce((sum, line) => sum + line.length + 2, 0) + 2;
const httpBytes = httpHeaderBytes + bodyBytes;

// As três formas de mensagem do JSON-RPC 2.0.
const messageParts = ["pedido", "id: 7", "method: tools/call", "resposta", "id: 7", "result", "notificação", "sem id"];
const REQUEST_ID = 1;
const RESPONSE_ID = 4;
const NOTIFICATION_NO_ID = 7;

// Quem decide o uso de cada primitiva do servidor.
const controllers = [
  { primitive: "tools", controller: "modelo" },
  { primitive: "resources", controller: "aplicação" },
  { primitive: "prompts", controller: "usuário" },
];

const lesson: LessonContent = {
  id: "13-03",
  subtitle: "As duas camadas do MCP, dados e transporte, as três formas de mensagem JSON-RPC e por que a revisão atual não guarda sessão.",
  objectives: [
    "Separar a camada de dados da camada de transporte",
    "Reconhecer pedido, resposta e notificação no JSON-RPC 2.0",
    "Associar cada primitiva do servidor a quem controla o seu uso",
    "Calcular o que cada transporte acrescenta a uma mensagem e o custo do _meta por pedido",
  ],
  steps: [
    {
      id: "letter",
      shortTitle: "Carta e envelope",
      title: "O conteúdo e o caminho",
      tag: "context",
      body: [
        "Uma carta tem duas partes independentes: o que está escrito e o jeito de entregar. A mesma carta pode ir pelo correio, por um motoboy ou em mãos, e o texto não muda. O MCP separa as coisas do mesmo jeito.",
        "A [[camada de dados|mcp-data-layer]] é a carta: o formato das mensagens, a descoberta de capacidades e as primitivas. A [[camada de transporte|mcp-transport-layer]] é a entrega: stdio, quando o servidor roda como processo na sua máquina, ou Streamable HTTP, quando ele está na rede. Trocar o transporte não muda nenhuma mensagem.",
      ],
      keyIdea: "Dados dizem o quê; transporte diz por onde. As mensagens são as mesmas em qualquer transporte.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "layers",
            piece: "block-diagram",
            blocks: [
              { id: "host", kind: "laptop", label: "host", col: 0, row: 0.5 },
              { id: "message", kind: "context", label: "json-rpc", col: 1, row: 0.5 },
              { id: "local", kind: "tool", label: "servidor local", col: 3, row: 0 },
              { id: "remote", kind: "cloud", label: "servidor remoto", col: 3, row: 1 },
            ],
            edges: [
              { from: "host", to: "message", label: "camada de dados" },
              { from: "message", to: "local", label: "stdio" },
              { from: "message", to: "remote", label: "https" },
            ],
            active: "message",
          },
        ],
      },
      alt: "O host produz uma mensagem JSON-RPC, em destaque, que viaja por stdio até um servidor local ou por HTTPS até um servidor remoto.",
    },
    {
      id: "json-rpc",
      shortTitle: "JSON-RPC",
      title: "Pedido, resposta e notificação",
      tag: "mechanism",
      body: [
        "Numa conversa por rádio, cada pergunta leva um número para que a resposta certa volte para quem perguntou; avisos gerais vão sem número, porque ninguém precisa responder. O [[JSON-RPC|json-rpc]] 2.0, base do MCP, tem exatamente essas três formas.",
        `Um pedido tem id e method; a resposta repete o id e traz result ou error; uma [[notificação|mcp-notification]] tem method e nenhum id, e não recebe resposta. Na revisão ${SPEC}, todo result também traz o campo resultType, que vale “complete” para respostas comuns.`,
      ],
      keyIdea: "Com id: pedido e resposta. Sem id: notificação, que ninguém responde.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "kinds",
            piece: "token-stream",
            tokens: messageParts,
            keys: [REQUEST_ID, RESPONSE_ID, NOTIFICATION_NO_ID],
            arcs: [{ from: REQUEST_ID, to: RESPONSE_ID, weight: 1, label: "mesmo id" }],
            color: "module-13",
          },
        ],
      },
      alt: "As três formas de mensagem em sequência: pedido com id 7 e method tools/call, resposta com o mesmo id 7 e result, e notificação sem id. Um arco liga os dois ids.",
    },
    {
      id: "primitives",
      shortTitle: "Quem decide",
      title: "Três primitivas, três donos",
      tag: "mechanism",
      body: [
        "Numa cozinha, o chef decide quando usar cada utensílio, o restaurante decide o que fica na bancada e o cliente escolhe o prato do cardápio. As três primitivas do servidor MCP seguem essa divisão de controle.",
        `${controllers.map((item) => `${item.primitive}: quem decide é ${item.controller === "modelo" ? "o modelo" : item.controller === "aplicação" ? "a aplicação" : "o usuário"}`).join("; ")}. A especificação define esse modelo de interação, mas deixa a interface livre: um host pode, por exemplo, deixar o modelo sugerir recursos. Do lado do cliente, a primitiva ativa na revisão ${SPEC} é a [[elicitação|elicitation]], que deixa o servidor pedir informação ao usuário.`,
      ],
      keyIdea: "Ferramentas: o modelo decide. Recursos: a aplicação. Prompts: o usuário.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "control",
            piece: "graph",
            nodes: [
              { id: "model", label: "modelo", x: 0.15, y: 0.2 },
              { id: "app", label: "aplicação", x: 0.15, y: 0.5 },
              { id: "user", label: "usuário", x: 0.15, y: 0.8 },
              { id: "tools", label: "tools", x: 0.6, y: 0.2, color: "module-13" },
              { id: "resources", label: "resources", x: 0.6, y: 0.5 },
              { id: "prompts", label: "prompts", x: 0.6, y: 0.8 },
              { id: "server", label: "servidor", x: 0.9, y: 0.5 },
            ],
            edges: [
              { from: "model", to: "tools", label: "decide" },
              { from: "app", to: "resources", label: "decide" },
              { from: "user", to: "prompts", label: "escolhe" },
              { from: "tools", to: "server" },
              { from: "resources", to: "server" },
              { from: "prompts", to: "server" },
            ],
            highlight: ["model", "tools"],
          },
        ],
      },
      alt: "Grafo: o modelo decide as tools, a aplicação decide os resources e o usuário escolhe os prompts; as três primitivas saem do servidor.",
    },
    {
      id: "same-message",
      shortTitle: "Mesma carta",
      title: "A mesma mensagem nos dois transportes",
      tag: "example",
      body: [
        `Pegue um tools/call pedindo a previsão para Recife. O corpo JSON tem ${integer(bodyBytes)} bytes. No stdio, ele vai numa linha só, terminada por uma quebra de linha: ${integer(stdioBytes)} bytes. No Streamable HTTP, o mesmo corpo vai num POST: a linha da requisição e ${httpHeaders.length - 1} cabeçalhos somam ${integer(httpHeaderBytes)} bytes, e o total chega a ${integer(httpBytes)}.`,
        `Os cabeçalhos não são enfeite: a revisão ${SPEC} exige que MCP-Protocol-Version, Mcp-Method e Mcp-Name repitam valores do corpo, para que balanceadores e gateways roteiem sem abrir o JSON. O servidor rejeita com 400 se cabeçalho e corpo não baterem.`,
      ],
      keyIdea: "O corpo é idêntico; o stdio acrescenta 1 byte, o HTTP acrescenta os cabeçalhos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "bytes",
            piece: "metrics-panel",
            metrics: [
              { id: "body", label: "corpo JSON-RPC", value: `${integer(bodyBytes)} bytes`, color: "module-13" },
              { id: "stdio", label: "no stdio (+ \\n)", value: `${integer(stdioBytes)} bytes` },
              { id: "headers", label: "cabeçalhos HTTP", value: `${integer(httpHeaderBytes)} bytes` },
              { id: "http", label: "no Streamable HTTP", value: `${integer(httpBytes)} bytes` },
            ],
            highlight: "body",
          },
        ],
      },
      alt: `Painel: o corpo JSON-RPC tem ${bodyBytes} bytes; no stdio vira ${stdioBytes} bytes; os cabeçalhos HTTP somam ${httpHeaderBytes} bytes e o POST completo tem ${httpBytes} bytes.`,
    },
    {
      id: "stateless",
      shortTitle: "Sem sessão",
      title: "Cada pedido se explica sozinho",
      tag: "tradeoff",
      body: [
        `Até a revisão 2025-11-25, a conexão começava com um handshake que guardava versão e capacidades numa sessão. A revisão ${SPEC} tornou o protocolo sem estado: cada pedido carrega no _meta a versão, as capacidades do cliente e, de preferência, a identidade dele. Assim qualquer instância atrás de um balanceador atende qualquer pedido, sem sessão grudada numa máquina.`,
        `O preço é pago em bytes: no exemplo, o _meta ocupa ${integer(metaBytes)} dos ${integer(bodyBytes)} bytes do corpo, ${percent(metaShare)}, e se repete em todo pedido. Estado que precisa durar entre chamadas, como um carrinho de compras, vira um identificador explícito que o servidor devolve e o modelo repassa como argumento.`,
      ],
      keyIdea: "Sem sessão, qualquer instância responde; o custo é repetir versão e capacidades em todo pedido.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "layers",
            piece: "block-diagram",
            blocks: [
              { id: "host", kind: "laptop", label: "host", col: 0, row: 0.5 },
              { id: "balancer", kind: "server", label: "balanceador", col: 1, row: 0.5 },
              { id: "a", kind: "tool", label: "instância a", col: 2.5, row: 0 },
              { id: "b", kind: "tool", label: "instância b", col: 2.5, row: 1 },
            ],
            edges: [
              { from: "host", to: "balancer", label: "pedido + _meta" },
              { from: "balancer", to: "a", label: "#7" },
              { from: "balancer", to: "b", label: "#8" },
            ],
            active: "balancer",
          },
        ],
      },
      alt: `O host envia pedidos com _meta a um balanceador, em destaque, que manda o pedido 7 para a instância A e o 8 para a instância B, sem sessão. O _meta ocupa ${percent(metaShare)} do corpo.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "A arquitetura em camadas",
      tag: "summary",
      body: [
        "O MCP tem uma camada de dados, com JSON-RPC, descoberta e primitivas, e uma camada de transporte, com stdio ou Streamable HTTP e a autorização. As primitivas do servidor têm donos diferentes, e a revisão atual não guarda sessão.",
        "A próxima aula olha os participantes de perto: o que cabe ao host, ao cliente e ao servidor, e o que o cliente oferece de volta.",
      ],
      keyIdea: "Carta (dados) e entrega (transporte), com cada pedido completo em si mesmo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "stack",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "data", label: "camada de dados", color: "module-13" },
              { id: "rpc", label: "JSON-RPC 2.0" },
              { id: "primitives", label: "tools · resources · prompts" },
              { id: "transport", label: "camada de transporte", color: "brand" },
              { id: "channels", label: "stdio · Streamable HTTP" },
              { id: "meta", label: `_meta em todo pedido (${SPEC})` },
            ],
          },
        ],
      },
      alt: "Resumo em chips: camada de dados com JSON-RPC 2.0 e as três primitivas; camada de transporte com stdio e Streamable HTTP; _meta em todo pedido.",
    },
  ],
  realWorldExample:
    "A própria documentação do MCP ilustra a arquitetura com o VS Code como host: ao conectar o servidor remoto do Sentry e o servidor local de arquivos, o VS Code cria um cliente para cada um. O do Sentry usa Streamable HTTP e atende muitos clientes; o de arquivos roda como processo local via stdio e atende um só.",
  code: {
    language: "json",
    source: `{
  "jsonrpc": "2.0",
  "id": 7,
  "method": "tools/call",
  "params": {
    "name": "get_weather",
    "arguments": { "location": "Recife" },
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientInfo": { "name": "ExampleClient", "version": "1.0.0" },
      "io.modelcontextprotocol/clientCapabilities": {}
    }
  }
}`,
    caption: "Um pedido tools/call na revisão 2026-07-28: método e argumentos na camada de dados, com versão, identidade e capacidades do cliente no _meta.",
  },
  tradeOffs: {
    pros: [
      "Mensagens iguais em qualquer transporte: trocar stdio por HTTP não muda a lógica",
      "Sem sessão, servidores remotos escalam com várias instâncias atrás de um balanceador",
      "JSON-RPC é simples de ler, registrar e depurar",
    ],
    cons: [
      "O _meta se repete em todo pedido e aumenta o tamanho das mensagens",
      "JSON em texto é maior e mais lento de processar que formatos binários",
      "Estado entre chamadas precisa de identificadores explícitos, com autorização checada a cada uso",
    ],
    alternatives: ["APIs REST ou gRPC próprias, quando só um app consome a integração", "SDKs oficiais do MCP, que escondem o JSON-RPC e o transporte"],
  },
  knowledgeCheck: [
    {
      id: "notification",
      prompt: "Um servidor envia {\"jsonrpc\": \"2.0\", \"method\": \"notifications/tools/list_changed\"}. O que o cliente deve fazer com essa mensagem?",
      options: [
        "Responder com o mesmo id",
        "Não responder: é uma notificação, sem id; se quiser, pedir de novo a lista de ferramentas",
        "Encerrar a conexão",
        "Tratar como erro, porque falta o id",
      ],
      correct: 1,
      explanation: "Mensagens sem id são notificações e não recebem resposta. Um aviso de lista alterada sugere fazer um novo tools/list.",
      lesson: "13-03",
    },
    {
      id: "stateless-scaling",
      prompt: "Um servidor MCP remoto roda em 4 instâncias atrás de um balanceador. Por que a revisão 2026-07-28 facilita isso?",
      options: [
        "Porque ela usa stdio em vez de HTTP",
        "Porque cada pedido carrega versão e capacidades no _meta, então qualquer instância processa qualquer pedido sem sessão",
        "Porque ela proíbe ferramentas com estado",
        "Porque o balanceador guarda a sessão de cada cliente",
      ],
      correct: 1,
      explanation: "Sem handshake nem sessão, nenhum pedido depende de algo que só uma instância sabe. O estado de negócio, quando existe, vira um identificador passado como argumento.",
      lesson: "13-03",
    },
  ],
  related: ["13-04", "13-08", "13-09"],
  references: [
    { title: "MCP: Architecture overview", url: "https://modelcontextprotocol.io/docs/learn/architecture", kind: "docs" },
    { title: "MCP Specification 2026-07-28: Base protocol", url: "https://modelcontextprotocol.io/specification/2026-07-28/basic", kind: "docs" },
    { title: "JSON-RPC 2.0 Specification", url: "https://www.jsonrpc.org/specification", kind: "docs" },
  ],
};

export default lesson;
