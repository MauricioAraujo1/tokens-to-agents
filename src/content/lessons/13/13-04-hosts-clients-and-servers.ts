import type { LessonContent } from "../../../types/content";

// Os participantes do MCP com contas no arquivo: dois hosts (uma IDE e um chat de desktop) ligados a três
// servidores. Cada host abre um cliente por servidor; um servidor remoto atende vários clientes; um servidor
// local por stdio atende o host que o iniciou. A tabela de recursos segue a revisão 2026-07-28.

const SPEC = "2026-07-28";
const integer = (value: number) => value.toLocaleString("pt-BR");

interface ServerInfo {
  id: string;
  label: string;
  transport: "stdio" | "http";
}
const servers: ServerInfo[] = [
  { id: "files", label: "arquivos", transport: "stdio" },
  { id: "sentry", label: "sentry", transport: "http" },
  { id: "github", label: "github", transport: "http" },
];
const hosts: Array<{ id: string; label: string; servers: string[] }> = [
  { id: "ide", label: "ide", servers: ["files", "sentry", "github"] },
  { id: "chat", label: "chat desktop", servers: ["sentry", "github"] },
];

const clientsPerHost = hosts.map((host) => ({ host: host.label, clients: host.servers.length }));
const totalClients = clientsPerHost.reduce((sum, item) => sum + item.clients, 0);
const clientsAt = (serverId: string) => hosts.filter((host) => host.servers.includes(serverId)).length;
const ide = clientsPerHost[0];
const remoteServer = servers.find((server) => server.transport === "http")!;
const localServer = servers.find((server) => server.transport === "stdio")!;

// O que cada lado oferece. "ativo" = não está marcado como deprecated na revisão 2026-07-28.
interface Feature {
  name: string;
  offeredBy: "servidor" | "cliente";
  active: boolean;
}
const features: Feature[] = [
  { name: "tools", offeredBy: "servidor", active: true },
  { name: "resources", offeredBy: "servidor", active: true },
  { name: "prompts", offeredBy: "servidor", active: true },
  { name: "elicitation", offeredBy: "cliente", active: true },
  { name: "sampling", offeredBy: "cliente", active: false },
  { name: "roots", offeredBy: "cliente", active: false },
];
const featureCols = ["servidor oferece", "cliente oferece", `ativo em ${SPEC}`];
const featureMatrix = features.map((feature) => [
  feature.offeredBy === "servidor" ? 1 : 0,
  feature.offeredBy === "cliente" ? 1 : 0,
  feature.active ? 1 : 0,
]);
const deprecated = features.filter((feature) => !feature.active).map((feature) => feature.name);
const SAMPLING_ROW = features.findIndex((feature) => feature.name === "sampling");

// O que o host faz numa chamada de ferramenta, em ordem.
const hostDuties = [
  { id: "connect", label: "conectar servidores" },
  { id: "discover", label: "descobrir ferramentas" },
  { id: "present", label: "mostrar ao modelo" },
  { id: "approve", label: "pedir aprovação" },
  { id: "execute", label: "executar via cliente" },
  { id: "return", label: "devolver ao modelo" },
];
const ELICITATION_ACTIONS = ["accept", "decline", "cancel"];

const lesson: LessonContent = {
  id: "13-04",
  subtitle: "Quem é quem no MCP: o host que coordena, o cliente que mantém cada conexão e o servidor que oferece contexto.",
  objectives: [
    "Distinguir host, cliente e servidor e contar as conexões de um host",
    "Listar as responsabilidades do host numa chamada de ferramenta",
    "Explicar a elicitação e os seus dois modos",
    "Saber quais recursos do cliente estão deprecated na revisão 2026-07-28",
  ],
  steps: [
    {
      id: "concierge",
      shortTitle: "Os papéis",
      title: "A recepção, as linhas e os fornecedores",
      tag: "context",
      body: [
        "A recepção de um hotel atende o hóspede e, para resolver o pedido, liga para fornecedores: a lavanderia, o restaurante, o táxi. Cada fornecedor tem a sua linha. O hóspede nunca liga direto; quem decide para quem ligar é a recepção.",
        `No MCP, a recepção é o [[host|mcp-host]], o app de IA. Cada linha é um [[cliente MCP|mcp-client]], que mantém a conexão com um único [[servidor MCP|mcp-server]]. A IDE da cena usa ${ide.clients} servidores e por isso mantém ${ide.clients} clientes.`,
      ],
      keyIdea: "O host coordena; cada cliente é uma linha dedicada para um servidor.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "roles",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "usuário", col: 0, row: 0.5 },
              { id: "host", kind: "laptop", label: "host: ide", col: 1, row: 0.5 },
              { id: "files", kind: "tool", label: "arquivos (stdio)", col: 2.5, row: 0 },
              { id: "sentry", kind: "cloud", label: "sentry (http)", col: 2.5, row: 1 },
              { id: "github", kind: "tool", label: "github (http)", col: 3.5, row: 0.5 },
            ],
            edges: [
              { from: "user", to: "host" },
              { from: "host", to: "files", label: "cliente 1" },
              { from: "host", to: "sentry", label: "cliente 2" },
              { from: "host", to: "github", label: "cliente 3" },
            ],
            active: "host",
          },
        ],
      },
      alt: `O usuário usa a IDE, que é o host, em destaque; ela mantém ${ide.clients} clientes, um para cada servidor: arquivos por stdio, Sentry e GitHub por HTTP.`,
    },
    {
      id: "counting",
      shortTitle: "Contar",
      title: "Clientes por host, clientes por servidor",
      tag: "mechanism",
      body: [
        `Agora há ${hosts.length} hosts: a IDE usa ${hosts[0].servers.length} servidores e o chat de desktop usa ${hosts[1].servers.length}. São ${totalClients} clientes no total, porque um cliente pertence a um host e fala com um servidor. O servidor remoto do ${remoteServer.label} atende ${clientsAt(remoteServer.id)} clientes ao mesmo tempo.`,
        `O servidor de ${localServer.label}, que roda por stdio, é diferente: o host o inicia como subprocesso e conversa pela entrada e saída padrão dele, então ele atende só quem o iniciou (${clientsAt(localServer.id)} cliente). Servidores remotos com Streamable HTTP costumam atender muitos clientes; locais com stdio, um só.`,
      ],
      keyIdea: "Clientes = soma dos servidores de cada host; um servidor remoto atende vários clientes.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "counts",
            piece: "metrics-panel",
            metrics: [
              ...clientsPerHost.map((item) => ({ id: item.host, label: `clientes: ${item.host}`, value: integer(item.clients) })),
              { id: "total", label: "clientes no total", value: integer(totalClients), color: "module-13" as const },
              { id: "remote", label: `clientes em ${remoteServer.label}`, value: integer(clientsAt(remoteServer.id)) },
              { id: "local", label: `clientes em ${localServer.label}`, value: integer(clientsAt(localServer.id)) },
            ],
            highlight: "total",
          },
        ],
      },
      alt: `Painel: ${clientsPerHost.map((item) => `${item.clients} clientes em ${item.host}`).join(", ")}, ${totalClients} no total; o ${remoteServer.label} atende ${clientsAt(remoteServer.id)} clientes e o servidor de ${localServer.label} atende ${clientsAt(localServer.id)}.`,
    },
    {
      id: "host-duties",
      shortTitle: "O host",
      title: "O que só o host faz",
      tag: "mechanism",
      body: [
        "O cliente é só a linha; quem tem o hóspede, o cardápio e a responsabilidade é a recepção. O host conecta os servidores configurados, junta as ferramentas de todos, decide o que mostrar ao modelo, pede a aprovação do usuário quando a ação tem risco, executa pelo cliente certo e devolve o resultado ao modelo.",
        "A especificação põe essas obrigações no host: consentimento explícito antes de chamar ferramentas, interface que mostre quais ferramentas o modelo enxerga e cuidado com dados do usuário. Um servidor nunca vê a conversa inteira, só os pedidos que o host decide mandar a ele.",
      ],
      keyIdea: "Consentimento, contexto e roteamento moram no host, não no servidor.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "duties",
            piece: "pipeline",
            stages: hostDuties,
            active: "approve",
            done: ["connect", "discover", "present"],
          },
        ],
      },
      alt: `Etapas do host numa chamada: ${hostDuties.map((duty) => duty.label).join(", ")}. A etapa atual é pedir aprovação.`,
    },
    {
      id: "elicitation",
      shortTitle: "Elicitação",
      title: "Quando o servidor precisa perguntar",
      tag: "example",
      body: [
        "Às vezes o fornecedor precisa de uma informação que só o hóspede tem, como o horário de saída. Ele não liga para o quarto: pede à recepção, que pergunta ao hóspede e repassa a resposta. A [[elicitação|elicitation]] é isso no MCP: o servidor pede um dado ao usuário por meio do cliente.",
        `No modo formulário, o servidor manda uma mensagem e um JSON Schema simples (campos de texto, número, booleano ou lista de opções), e o usuário responde com ${ELICITATION_ACTIONS.join(", ")}. Senhas, chaves de API e dados de pagamento não podem ir por formulário: para isso existe o modo URL, que abre uma página do próprio servidor sem o dado passar pelo cliente. Na revisão ${SPEC}, o pedido chega dentro da resposta do servidor, e o cliente repete a chamada original com a resposta do usuário.`,
      ],
      keyIdea: "O servidor pergunta ao usuário pela recepção; segredos vão por URL, nunca por formulário.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "ask",
            piece: "block-diagram",
            blocks: [
              { id: "server", kind: "tool", label: "servidor github", col: 0, row: 0.5 },
              { id: "host", kind: "laptop", label: "host", col: 1.5, row: 0.5 },
              { id: "user", kind: "user", label: "usuário", col: 3, row: 0 },
              { id: "page", kind: "cloud", label: "página do servidor", col: 3, row: 1 },
            ],
            edges: [
              { from: "server", to: "host", label: "elicitation/create" },
              { from: "host", to: "user", label: "formulário" },
              { from: "host", to: "page", label: "modo url", variant: "alternative" },
            ],
            active: "user",
            done: ["server", "host"],
          },
        ],
      },
      alt: "O servidor do GitHub pede uma informação ao host, que mostra um formulário ao usuário, em destaque; para dados sensíveis, o caminho tracejado leva a uma página do próprio servidor, no modo URL.",
    },
    {
      id: "client-features",
      shortTitle: "Cada lado",
      title: "O que cada lado oferece hoje",
      tag: "tradeoff",
      body: [
        "Servidores oferecem ferramentas, recursos e prompts. Clientes também ofereciam recursos aos servidores: além da elicitação, o [[sampling|mcp-sampling]], que deixava o servidor pedir uma geração ao modelo do host, e os [[roots|mcp-roots]], que diziam ao servidor em quais pastas trabalhar.",
        `Na revisão ${SPEC}, ${deprecated.join(" e ")} ficaram deprecated: continuam funcionando durante a janela de depreciação (no mínimo doze meses), mas implementações novas não devem adotá-los. A especificação sugere chamar a API de um provedor direto no lugar do sampling e passar caminhos por parâmetros, URIs de recursos ou configuração no lugar dos roots.`,
      ],
      keyIdea: `Servidor: tools, resources, prompts. Cliente: elicitação; sampling e roots estão deprecated em ${SPEC}.`,
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "features",
            piece: "matrix",
            rows: features.map((feature) => feature.name),
            cols: featureCols,
            values: featureMatrix,
            scale: { min: 0, max: 1 },
            highlight: { row: SAMPLING_ROW, col: 2 },
            showValues: true,
            color: "module-13",
          },
        ],
      },
      alt: `Tabela de recursos: tools, resources e prompts são oferecidos pelo servidor e estão ativos; elicitation, sampling e roots são do cliente, e só elicitation segue ativo em ${SPEC}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Quem faz o quê",
      tag: "summary",
      body: [
        "O host é o app de IA e carrega as decisões: conexões, contexto, consentimento e roteamento. Cada cliente mantém uma conexão com um servidor. Os servidores oferecem ferramentas, recursos e prompts, e podem pedir dados ao usuário por elicitação.",
        "As próximas aulas abrem cada primitiva do servidor, começando pelas ferramentas.",
      ],
      keyIdea: "Host decide, cliente conecta, servidor oferece.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "who",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "host", label: "host: decide e pede consentimento", color: "module-13" },
              { id: "client", label: "cliente: 1 conexão por servidor" },
              { id: "server", label: "servidor: tools · resources · prompts" },
              { id: "elicitation", label: "elicitação: servidor pergunta ao usuário" },
              { id: "deprecated", label: `sampling e roots: deprecated em ${SPEC}`, color: "muted" },
            ],
          },
        ],
      },
      alt: `Resumo em chips: o host decide e pede consentimento, o cliente mantém uma conexão por servidor, o servidor oferece as três primitivas, a elicitação deixa o servidor perguntar ao usuário, e sampling e roots estão deprecated em ${SPEC}.`,
    },
  ],
  realWorldExample:
    "O VS Code é o exemplo da documentação oficial: ao conectar o servidor remoto do Sentry, ele cria um cliente MCP para essa conexão; ao conectar também o servidor local de arquivos, cria outro cliente. O mesmo servidor do Sentry, rodando na plataforma do Sentry, atende ao mesmo tempo clientes de muitos usuários.",
  code: {
    language: "json",
    source: `{
  "method": "elicitation/create",
  "params": {
    "mode": "form",
    "message": "Qual é o seu usuário no GitHub?",
    "requestedSchema": {
      "type": "object",
      "properties": { "name": { "type": "string" } },
      "required": ["name"]
    }
  }
}`,
    caption: "Um pedido de elicitação em modo formulário: mensagem para o usuário e um schema plano. A resposta volta com action accept, decline ou cancel.",
  },
  tradeOffs: {
    pros: [
      "Responsabilidades claras: o servidor não precisa saber nada da conversa nem do modelo",
      "Um cliente por servidor isola falhas: um servidor travado não derruba os outros",
      "Elicitação deixa o servidor pedir o que falta sem inventar um canal próprio",
    ],
    cons: [
      "O host concentra decisões de segurança: um host descuidado expõe tudo",
      "Muitos servidores significam muitos processos e conexões para gerenciar",
      "Recursos deprecated (sampling, roots) ainda aparecem em servidores antigos e precisam de compatibilidade",
    ],
    alternatives: ["Um gateway MCP que agrega vários servidores atrás de um endpoint", "Ferramentas embutidas no host, sem servidor, quando só ele as usa"],
  },
  knowledgeCheck: [
    {
      id: "api-key-elicitation",
      prompt: "Um servidor precisa da chave de API do usuário para um serviço externo. Como ele deve pedir?",
      options: [
        "Elicitação em modo formulário com um campo de senha",
        "Elicitação em modo URL, levando o usuário a uma página do servidor, sem a chave passar pelo cliente",
        "Pedir ao modelo que pergunte na conversa",
        "Ler a chave do histórico do chat",
      ],
      correct: 1,
      explanation: "A especificação proíbe pedir segredos por formulário. O modo URL leva o usuário a uma página segura do servidor, e a chave nunca passa pelo cliente nem pelo contexto do modelo.",
      lesson: "13-04",
    },
    {
      id: "count-clients",
      prompt: "Três desenvolvedores usam, cada um, uma IDE ligada a 2 servidores locais e ao mesmo servidor remoto da empresa. Quantos clientes o servidor remoto atende?",
      options: ["1", "3", "6", "9"],
      correct: 1,
      explanation: "Cada IDE é um host com um cliente para o servidor remoto. Três hosts, três clientes nesse servidor. Os servidores locais não contam: cada um atende só a IDE que o iniciou.",
      lesson: "13-04",
    },
  ],
  related: ["13-03", "13-05", "12-15"],
  references: [
    { title: "MCP: Architecture overview (participants)", url: "https://modelcontextprotocol.io/docs/learn/architecture", kind: "docs" },
    { title: "MCP Specification 2026-07-28: Elicitation", url: "https://modelcontextprotocol.io/specification/2026-07-28/client/elicitation", kind: "docs" },
    { title: "MCP Specification 2026-07-28: Deprecated features", url: "https://modelcontextprotocol.io/specification/2026-07-28/deprecated", kind: "docs" },
  ],
};

export default lesson;
