import type { LessonContent } from "../../../types/content";

// Um app de IA ligado a três servidores MCP, com contas no arquivo: quantos clientes o app abre, quantas
// ferramentas, recursos e prompts ele passa a enxergar e a troca de mensagens JSON-RPC de uma tarefa.
// Os nomes de métodos seguem a revisão 2026-07-28 da especificação.

const SPEC = "2026-07-28";
const integer = (value: number) => value.toLocaleString("pt-BR");

interface McpServerInfo {
  id: string;
  label: string;
  transport: "stdio" | "http";
  tools: string[];
  resources: number;
  prompts: number;
}

const servers: McpServerInfo[] = [
  { id: "files", label: "arquivos", transport: "stdio", tools: ["read_file", "write_file", "list_directory"], resources: 12, prompts: 0 },
  {
    id: "github",
    label: "github",
    transport: "http",
    tools: ["search_issues", "create_issue", "get_pull_request", "list_commits"],
    resources: 0,
    prompts: 2,
  },
  { id: "calendar", label: "agenda", transport: "http", tools: ["list_events", "create_event"], resources: 3, prompts: 1 },
];

const clients = servers.length;
const totalTools = servers.reduce((sum, server) => sum + server.tools.length, 0);
const totalResources = servers.reduce((sum, server) => sum + server.resources, 0);
const totalPrompts = servers.reduce((sum, server) => sum + server.prompts, 0);
const localServers = servers.filter((server) => server.transport === "stdio").length;
const remoteServers = servers.length - localServers;

// Passo 4: a tarefa vira pedidos e respostas JSON-RPC; o id liga cada resposta ao seu pedido.
const TASK = "Liste minhas issues abertas e marque uma reunião para revisar a mais antiga.";
interface WireMessage {
  arrow: "→" | "←";
  method: string;
  id: number;
}
const exchange: WireMessage[] = [
  { arrow: "→", method: "tools/list", id: 1 },
  { arrow: "←", method: "result", id: 1 },
  { arrow: "→", method: "tools/call search_issues", id: 2 },
  { arrow: "←", method: "result", id: 2 },
  { arrow: "→", method: "tools/call create_event", id: 3 },
  { arrow: "←", method: "result", id: 3 },
];
const exchangeTokens = exchange.map((message) => `${message.arrow} ${message.method} #${message.id}`);
const exchangeArcs = exchange
  .map((message, index) => ({ message, index }))
  .filter(({ message }) => message.arrow === "→")
  .map(({ message, index }) => ({
    from: index,
    to: exchange.findIndex((other, otherIndex) => otherIndex > index && other.arrow === "←" && other.id === message.id),
    weight: 1,
  }));
const requests = exchange.filter((message) => message.arrow === "→").length;
const toolCalls = exchange.filter((message) => message.method.startsWith("tools/call")).length;

const lesson: LessonContent = {
  id: "13-01",
  subtitle: "Um protocolo aberto que liga apps de IA a ferramentas e dados: quem conversa com quem e o que passa pelo fio.",
  objectives: [
    "Definir o Model Context Protocol e o problema que ele resolve",
    "Reconhecer os três papéis: host, cliente e servidor",
    "Citar o que um servidor oferece: ferramentas, recursos e prompts",
    "Ler uma troca simples de mensagens JSON-RPC entre cliente e servidor",
  ],
  steps: [
    {
      id: "port",
      shortTitle: "Uma porta",
      title: "Uma porta padrão para o app de IA",
      tag: "context",
      body: [
        "Pense na porta USB-C do notebook: o mesmo encaixe serve para carregador, monitor e pendrive, e ninguém precisa de um cabo especial para cada marca. Um app de IA vive um problema parecido: quer ler arquivos, consultar o GitHub e ver a agenda, e cada sistema tem a sua API.",
        `O [[Model Context Protocol|model-context-protocol]] (MCP) é esse encaixe: um protocolo aberto que define como um app de IA descobre e usa ferramentas e dados de programas externos, os [[servidores MCP|mcp-server]]. Na cena, o app se liga a ${servers.length} servidores pelo mesmo protocolo, ${localServers} rodando na própria máquina e ${remoteServers} pela rede.`,
      ],
      keyIdea: "MCP é um padrão de encaixe: o app aprende a falar MCP uma vez e conversa com qualquer servidor que fale também.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "mcp",
            piece: "block-diagram",
            blocks: [
              { id: "llm", kind: "llm", label: "modelo", col: 0, row: 0.5 },
              { id: "host", kind: "laptop", label: "app de ia", col: 1, row: 0.5 },
              { id: "files", kind: "tool", label: "arquivos", col: 2, row: 0 },
              { id: "github", kind: "tool", label: "github", col: 2, row: 1 },
              { id: "calendar", kind: "cloud", label: "agenda", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "llm", to: "host" },
              { from: "host", to: "files", label: "mcp" },
              { from: "host", to: "github", label: "mcp" },
              { from: "host", to: "calendar", label: "mcp" },
            ],
            active: "host",
          },
        ],
      },
      alt: `O modelo conversa com o app de IA, em destaque, que se liga pelo MCP a ${servers.length} servidores: arquivos, GitHub e agenda.`,
    },
    {
      id: "roles",
      shortTitle: "Três papéis",
      title: "Host, cliente e servidor",
      tag: "mechanism",
      body: [
        "Num prédio, a portaria recebe você e liga para o apartamento certo por um interfone, um aparelho para cada apartamento. No MCP, a portaria é o [[host|mcp-host]]: o app de IA que você usa, como um chat no desktop ou uma IDE. O interfone é o [[cliente MCP|mcp-client]]: o host cria um cliente para cada servidor e cada cliente mantém uma conexão dedicada com o seu servidor.",
        `Com ${servers.length} servidores, o host abre ${clients} clientes. As mensagens seguem o [[JSON-RPC|json-rpc]] 2.0, e os servidores podem rodar como processo local (transporte stdio) ou como serviço remoto (Streamable HTTP). O modelo nunca fala direto com o servidor: quem conversa é o host, por meio dos clientes.`,
      ],
      keyIdea: "Um host, um cliente por servidor, e o modelo sempre do lado do host.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "mcp",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "você", col: 0, row: 0.5 },
              { id: "host", kind: "laptop", label: `host: ${clients} clientes`, col: 1, row: 0.5 },
              { id: "files", kind: "tool", label: "arquivos (stdio)", col: 2, row: 0 },
              { id: "github", kind: "tool", label: "github (http)", col: 2, row: 1 },
              { id: "calendar", kind: "cloud", label: "agenda (http)", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "user", to: "host" },
              { from: "host", to: "files", label: "cliente 1" },
              { from: "host", to: "github", label: "cliente 2" },
              { from: "host", to: "calendar", label: "cliente 3" },
            ],
            active: "host",
          },
        ],
      },
      alt: `Você usa o host, em destaque, que mantém ${clients} clientes: o cliente 1 fala com o servidor de arquivos por stdio, os clientes 2 e 3 falam com GitHub e agenda por HTTP.`,
    },
    {
      id: "primitives",
      shortTitle: "O que oferece",
      title: "Ferramentas, recursos e prompts",
      tag: "mechanism",
      body: [
        "Um servidor é como uma loja com três balcões: um faz coisas por você (ferramentas), outro entrega material para leitura (recursos) e o terceiro tem roteiros prontos que você escolhe (prompts). Cada balcão tem um jeito de listar o que oferece e um jeito de usar.",
        `Somando os ${servers.length} servidores, o host enxerga ${totalTools} [[ferramentas|mcp-tool]], ${totalResources} [[recursos|mcp-resource]] e ${totalPrompts} [[prompts|mcp-prompt]]. A diferença está em quem decide o uso: ferramentas são controladas pelo modelo, recursos pela aplicação e prompts pelo usuário.`,
      ],
      keyIdea: "Ferramenta age, recurso informa, prompt guia; e cada um tem um dono diferente da decisão.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "totals",
            piece: "metrics-panel",
            metrics: [
              { id: "tools", label: "ferramentas (modelo decide)", value: integer(totalTools), color: "module-13" },
              { id: "resources", label: "recursos (app decide)", value: integer(totalResources) },
              { id: "prompts", label: "prompts (usuário decide)", value: integer(totalPrompts) },
              { id: "clients", label: "clientes abertos", value: integer(clients) },
            ],
            highlight: "tools",
          },
        ],
      },
      alt: `Painel com o que o host enxerga nos ${servers.length} servidores: ${totalTools} ferramentas, ${totalResources} recursos, ${totalPrompts} prompts e ${clients} clientes abertos.`,
    },
    {
      id: "wire",
      shortTitle: "No fio",
      title: "Uma tarefa, pedidos e respostas",
      tag: "example",
      body: [
        `Você pede: “${TASK}” O host pergunta aos servidores o que eles sabem fazer, mostra as ferramentas ao modelo, e o modelo escolhe quais chamar. Cada pedido do cliente leva um número, e a resposta do servidor volta com o mesmo número.`,
        `Na cena, a tarefa vira ${requests} pedidos JSON-RPC: um tools/list para descobrir as ferramentas e ${toolCalls} tools/call para usá-las. Na revisão ${SPEC} da especificação, cada pedido também carrega no campo _meta a versão do protocolo e as capacidades do cliente, então o servidor responde sem depender de conversa anterior.`,
      ],
      keyIdea: "Descobrir com */list, usar com tools/call; o id amarra cada resposta ao seu pedido.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "exchange",
            piece: "token-stream",
            tokens: exchangeTokens,
            keys: exchange.map((message, index) => (message.arrow === "←" ? index : -1)).filter((index) => index >= 0),
            arcs: exchangeArcs,
            color: "module-13",
          },
        ],
      },
      alt: `Sequência de mensagens: ${exchangeTokens.join(", ")}. Arcos ligam cada pedido à resposta de mesmo id.`,
    },
    {
      id: "not",
      shortTitle: "O que não é",
      title: "MCP não é modelo nem agente",
      tag: "tradeoff",
      body: [
        "Uma tomada padrão não escolhe o que você liga nela nem garante que o aparelho seja seguro. O MCP também não: ele padroniza a conversa entre host e servidor, mas não decide qual ferramenta usar, não roda o modelo e não substitui um framework de agentes.",
        "A especificação deixa claro que o protocolo não consegue impor segurança sozinho: o host deve pedir consentimento antes de chamar ferramentas e tratar descrições vindas de servidores não confiáveis como dados suspeitos. Na prática, uma camada de aprovação no host fica entre o modelo e as ações de risco.",
      ],
      keyIdea: "O MCP padroniza o encaixe; quem decide, aprova e protege continua sendo o host.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "mcp",
            piece: "block-diagram",
            blocks: [
              { id: "llm", kind: "llm", label: "modelo decide", col: 0, row: 0.5 },
              { id: "host", kind: "laptop", label: "host", col: 1, row: 0.5 },
              { id: "gate", kind: "guardrail", label: "aprovação", col: 2, row: 0.5 },
              { id: "github", kind: "tool", label: "create_issue", col: 3, row: 0 },
              { id: "files", kind: "tool", label: "read_file", col: 3, row: 1 },
            ],
            edges: [
              { from: "llm", to: "host", label: "pedido" },
              { from: "host", to: "gate" },
              { from: "gate", to: "github", label: "aprovado" },
              { from: "host", to: "files", label: "só leitura" },
            ],
            active: "gate",
            done: ["llm", "host"],
          },
        ],
      },
      alt: "O modelo pede uma ação ao host; antes de chegar à ferramenta create_issue, o pedido passa por uma camada de aprovação, em destaque, enquanto a leitura de arquivo segue direto.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "O mapa do módulo",
      tag: "summary",
      body: [
        "O MCP liga um host a vários servidores por clientes dedicados. Os servidores oferecem ferramentas, recursos e prompts; as mensagens são JSON-RPC e viajam por stdio ou HTTP.",
        "A próxima aula mostra por que esse padrão apareceu: a conta de integrações que explode quando cada app conecta cada ferramenta do seu jeito.",
      ],
      keyIdea: "Host, clientes, servidores, três primitivas e JSON-RPC: o vocabulário do resto do módulo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "map",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "host", label: "host (app de IA)" },
              { id: "client", label: "1 cliente por servidor" },
              { id: "server", label: "servidor MCP", color: "module-13" },
              { id: "primitives", label: "tools · resources · prompts" },
              { id: "wire", label: "JSON-RPC 2.0" },
              { id: "transport", label: "stdio ou HTTP" },
            ],
          },
        ],
      },
      alt: "Resumo em chips: host, um cliente por servidor, servidor MCP, ferramentas, recursos e prompts, JSON-RPC 2.0, stdio ou HTTP.",
    },
  ],
  realWorldExample:
    "A Anthropic publicou o MCP em 25 de novembro de 2024, com suporte no app Claude Desktop e servidores prontos para Google Drive, Slack, GitHub, Git, Postgres e Puppeteer. Em dezembro de 2025, doou o protocolo à Agentic AI Foundation, um fundo da Linux Foundation cofundado com Block e OpenAI.",
  code: {
    language: "json",
    source: `{
  "mcpServers": {
    "weather": {
      "command": "uv",
      "args": ["--directory", "/CAMINHO/ABSOLUTO/weather", "run", "weather.py"]
    }
  }
}`,
    caption: "Configuração de um host (Claude Desktop) do tutorial oficial: o host inicia o servidor local como subprocesso e conversa com ele por stdio.",
  },
  tradeOffs: {
    pros: [
      "Um só protocolo para qualquer servidor: o host não escreve um conector por sistema",
      "Servidores reaproveitáveis em vários hosts diferentes",
      "Descoberta em tempo de execução: o host lista o que cada servidor oferece",
    ],
    cons: [
      "Não decide nem protege nada sozinho: consentimento e permissões ficam com o host",
      "Servidores de terceiros são código e texto não confiáveis",
      "Mais uma peça para rodar, versionar e monitorar",
    ],
    alternatives: ["Function calling direto no código do app, quando as ferramentas são poucas e só dele", "Chamar a API do sistema sem LLM, quando o fluxo é fixo"],
  },
  knowledgeCheck: [
    {
      id: "clients-count",
      prompt: "Uma IDE se conecta a um servidor de arquivos local e a dois servidores remotos (Sentry e GitHub). Quantos clientes MCP ela mantém?",
      options: ["1, porque há um host só", "2, um por transporte", "3, um por servidor", "6, um por par de servidores"],
      correct: 2,
      explanation: "O host cria um cliente para cada servidor, e cada cliente mantém uma conexão dedicada. Três servidores, três clientes.",
      lesson: "13-01",
    },
    {
      id: "who-talks",
      prompt: "No MCP, quem envia o tools/call para o servidor quando o modelo decide usar uma ferramenta?",
      options: [
        "O próprio modelo, direto pela rede",
        "O cliente MCP dentro do host, depois que o host recebe o pedido do modelo",
        "O servidor chama a si mesmo",
        "O usuário, copiando o JSON",
      ],
      correct: 1,
      explanation: "O modelo só gera o pedido de ferramenta. O host recebe esse pedido, aplica as suas regras e manda o tools/call pelo cliente ligado ao servidor certo.",
      lesson: "13-01",
    },
  ],
  related: ["13-02", "05-10", "12-05"],
  references: [
    { title: "Model Context Protocol: What is MCP?", url: "https://modelcontextprotocol.io/docs/getting-started/intro", kind: "docs" },
    { title: "MCP Specification 2026-07-28", url: "https://modelcontextprotocol.io/specification/2026-07-28", kind: "docs" },
    { title: "Anthropic: Introducing the Model Context Protocol", url: "https://www.anthropic.com/news/model-context-protocol", kind: "article" },
  ],
};

export default lesson;
