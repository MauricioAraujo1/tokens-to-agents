import type { LessonContent } from "../../../types/content";

// O ciclo de vida nas duas eras do MCP, com contas no arquivo. Legado (2025-11-25 e anteriores): handshake
// initialize, resposta e notifications/initialized, e só então a operação. Moderno (2026-07-28): sem
// handshake, cada pedido carrega versão e capacidades no _meta. Para a mesma tarefa (1 tools/list e
// 3 tools/call), o arquivo conta mensagens e bytes de cada era e escolhe a versão comum com cada servidor.

const LEGACY = "2025-11-25";
const MODERN = "2026-07-28";
const integer = (value: number) => value.toLocaleString("pt-BR");

// Capacidades de um cliente e de um servidor de exemplo.
const clientCapabilities = { elicitation: { form: {} }, sampling: {} };
const serverCapabilities = { tools: { listChanged: true }, resources: {} };
const clientInfo = { name: "ExampleClient", version: "1.0.0" };

// Era legada: o handshake abre a sessão.
const initializeRequest = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: { protocolVersion: LEGACY, capabilities: clientCapabilities, clientInfo },
});
const initializeResult = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  result: { protocolVersion: LEGACY, capabilities: serverCapabilities, serverInfo: { name: "ExampleServer", version: "1.0.0" } },
});
const initializedNotification = JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" });
const handshakeBytes = initializeRequest.length + initializeResult.length + initializedNotification.length;

// A mesma tarefa nas duas eras.
const TOOL_CALLS = 3;
const requests = 1 + TOOL_CALLS;
const legacyMessages = 3 + 2 * requests;
const modernMessages = 2 * requests;
const modernWithDiscover = modernMessages + 2;
const legacyRoundTripsBeforeWork = 1;
const modernRoundTripsBeforeWork = 0;

// Era moderna: o _meta vai em todo pedido.
const meta = JSON.stringify({
  "io.modelcontextprotocol/protocolVersion": MODERN,
  "io.modelcontextprotocol/clientInfo": clientInfo,
  "io.modelcontextprotocol/clientCapabilities": clientCapabilities,
});
const metaBytesPerRequest = `,"_meta":${meta}`.length;
const modernMetaBytes = metaBytesPerRequest * requests;

// Troca legada, mensagem a mensagem.
const legacyExchange = ["→ initialize #1", "← result #1", "→ initialized", "→ tools/list #2", "← result #2", "→ tools/call #3", "← result #3"];

// Negociação de capacidades: cada recurso opcional só pode ser usado se o lado que o oferece declarou.
interface CapabilityRow {
  name: string;
  offeredBy: "cliente" | "servidor";
  client: boolean;
  server: boolean;
}
const capabilityRows: CapabilityRow[] = [
  { name: "tools", offeredBy: "servidor", client: false, server: "tools" in serverCapabilities },
  { name: "tools.listChanged", offeredBy: "servidor", client: false, server: serverCapabilities.tools.listChanged },
  { name: "resources", offeredBy: "servidor", client: false, server: "resources" in serverCapabilities },
  { name: "prompts", offeredBy: "servidor", client: false, server: "prompts" in serverCapabilities },
  { name: "elicitation", offeredBy: "cliente", client: "elicitation" in clientCapabilities, server: false },
  { name: "sampling", offeredBy: "cliente", client: "sampling" in clientCapabilities, server: false },
];
const usable = (row: CapabilityRow) => (row.offeredBy === "cliente" ? row.client : row.server);
const capabilityMatrix = capabilityRows.map((row) => [row.client ? 1 : 0, row.server ? 1 : 0, usable(row) ? 1 : 0]);
const PROMPTS_ROW = capabilityRows.findIndex((row) => row.name === "prompts");
const usableNames = capabilityRows.filter(usable).map((row) => row.name);

// Escolha de versão: a mais recente que os dois lados suportam.
const clientVersions = [MODERN, LEGACY];
const pickVersion = (serverVersions: string[]) => clientVersions.find((version) => serverVersions.includes(version)) ?? null;
const modernServerVersions = [MODERN, LEGACY];
const legacyServerVersions = [LEGACY, "2025-06-18"];
const withModernServer = pickVersion(modernServerVersions);
const withLegacyServer = pickVersion(legacyServerVersions);
const UNSUPPORTED_VERSION_CODE = -32022;

const legacyPhases = [
  { id: "initialize", label: "initialize" },
  { id: "initialized", label: "initialized" },
  { id: "operation", label: "operação" },
  { id: "shutdown", label: "encerramento" },
];

const lesson: LessonContent = {
  id: "13-09",
  subtitle: "Como cliente e servidor combinam versão e capacidades: o handshake das revisões até 2025-11-25 e os pedidos autossuficientes da 2026-07-28.",
  objectives: [
    "Descrever as fases do ciclo de vida legado: inicialização, operação e encerramento",
    "Aplicar a negociação de capacidades para saber o que cada lado pode usar",
    "Explicar o modelo sem handshake da revisão 2026-07-28 e o server/discover",
    "Escolher a versão e o caminho de compatibilidade com servidores das duas eras",
  ],
  steps: [
    {
      id: "phone-call",
      shortTitle: "A ligação",
      title: "Primeiro se apresentar, depois conversar",
      tag: "context",
      body: [
        "Numa ligação internacional, os dois lados primeiro combinam a língua e se apresentam; só depois vem o assunto; no fim, alguém desliga. Até a revisão 2025-11-25, o MCP funcionava assim: a conexão tinha um ciclo de vida com três fases, inicialização, operação e encerramento.",
        "A fase de inicialização precisava ser a primeira interação. Nela, cliente e servidor combinavam a versão do protocolo, trocavam as capacidades e se identificavam. Esse acordo valia para a sessão inteira, até a conexão fechar.",
      ],
      keyIdea: "No MCP legado, a conexão começa com um acordo que vale até o fim da sessão.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "phases",
            piece: "pipeline",
            stages: legacyPhases,
            active: "initialize",
          },
        ],
      },
      alt: "As fases do ciclo de vida legado: initialize, initialized, operação e encerramento. A fase atual é o initialize.",
    },
    {
      id: "handshake",
      shortTitle: "Handshake",
      title: "Três mensagens antes do trabalho",
      tag: "mechanism",
      body: [
        `O [[handshake de inicialização|initialization-handshake]] tem três mensagens. O cliente manda initialize com protocolVersion (a mais recente que suporta), capabilities e clientInfo. O servidor responde com a versão escolhida, as próprias capacidades, serverInfo e, opcionalmente, instructions. O cliente confirma com a notificação notifications/initialized, e só então começam pedidos como tools/list.`,
        `Se o servidor não suporta a versão pedida, responde com outra que suporte; se o cliente não aceita essa, desconecta. Para encerrar no stdio, o cliente fecha o stdin do servidor e escala para SIGTERM e SIGKILL se ele não sair; no HTTP, fecha a conexão. Na cena, a abertura soma ${integer(handshakeBytes)} bytes.`,
      ],
      keyIdea: "initialize, resposta, initialized: só depois disso vêm os pedidos de trabalho.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "legacy",
            piece: "token-stream",
            tokens: legacyExchange,
            keys: [0, 1, 2],
            arcs: [
              { from: 0, to: 1, weight: 1, label: "versão + capacidades" },
              { from: 3, to: 4, weight: 0.6 },
              { from: 5, to: 6, weight: 0.6 },
            ],
            color: "module-13",
          },
        ],
      },
      alt: `Troca legada: ${legacyExchange.join(", ")}. As três primeiras mensagens, em destaque, são o handshake; depois vêm tools/list e tools/call.`,
    },
    {
      id: "capabilities",
      shortTitle: "Capacidades",
      title: "Cada um declara o que oferece",
      tag: "mechanism",
      body: [
        "Antes de uma reunião, cada participante diz o que pode trazer: um traz o projetor, outro os números. Ninguém pede ao outro o que ele não disse que tem. Na [[negociação de capacidades|capability-negotiation]], o cliente declara os recursos que oferece (elicitação, sampling) e o servidor declara os dele (tools, resources, prompts e subcapacidades como listChanged).",
        `A regra é simples: um recurso opcional só pode ser usado se o lado que o oferece o declarou. Na cena, podem ser usados ${usableNames.join(", ")}; prompts não, porque o servidor não declarou. Na revisão ${MODERN}, a regra continua: o cliente manda as capacidades em cada pedido, e o servidor não pode deduzi-las de pedidos anteriores.`,
      ],
      keyIdea: "Só se usa o que o outro lado declarou; o resto não existe para a conexão.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "negotiation",
            piece: "matrix",
            rows: capabilityRows.map((row) => row.name),
            cols: ["cliente declara", "servidor declara", "pode usar"],
            values: capabilityMatrix,
            scale: { min: 0, max: 1 },
            highlight: { row: PROMPTS_ROW, col: 2 },
            showValues: true,
            color: "module-13",
          },
        ],
      },
      alt: `Tabela de negociação: podem ser usados ${usableNames.join(", ")}; prompts, em destaque, não, porque o servidor não declarou.`,
    },
    {
      id: "stateless",
      shortTitle: "Sem handshake",
      title: `Em ${MODERN}: cada pedido se apresenta`,
      tag: "mechanism",
      body: [
        `Em vez de uma ligação com apresentação, pense em cartas: cada uma tem o remetente e a língua no cabeçalho, e qualquer funcionário dos correios entende sozinha. A revisão ${MODERN} removeu o initialize e o initialized. Todo pedido leva no _meta a versão, as capacidades do cliente e, de preferência, o clientInfo; o servidor aceita ou rejeita cada pedido de forma independente.`,
        `Para descobrir o servidor antes de trabalhar, existe o [[server/discover|server-discover]], que todo servidor precisa implementar: devolve as versões suportadas, as capacidades, a identidade e as instructions num pedido só, com dica de cache. Chamar é opcional. Se a versão do pedido não serve, o servidor responde com o erro ${UNSUPPORTED_VERSION_CODE} e a lista do que suporta, e o cliente tenta de novo.`,
      ],
      keyIdea: "Sem sessão: versão e capacidades vão em todo pedido; server/discover é a consulta opcional.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "modern",
            piece: "block-diagram",
            blocks: [
              { id: "client", kind: "laptop", label: "cliente", col: 0, row: 0.5 },
              { id: "request", kind: "context", label: "pedido + _meta", col: 1, row: 0.5 },
              { id: "server", kind: "tool", label: `servidor ${MODERN}`, col: 2, row: 0.5 },
              { id: "result", kind: "answer", label: "result", col: 3, row: 0 },
              { id: "error", kind: "no-result", label: `${UNSUPPORTED_VERSION_CODE}`, col: 3, row: 1 },
            ],
            edges: [
              { from: "client", to: "request" },
              { from: "request", to: "server", label: "tools/call" },
              { from: "server", to: "result", label: "versão aceita" },
              { from: "server", to: "error", label: "versão não suportada", variant: "alternative" },
            ],
            active: "request",
          },
        ],
      },
      alt: `O cliente envia um pedido com _meta, em destaque, direto ao servidor ${MODERN}, sem handshake; se a versão é aceita, volta o result; se não, o erro ${UNSUPPORTED_VERSION_CODE} com as versões suportadas.`,
    },
    {
      id: "dual-era",
      shortTitle: "Duas eras",
      title: "Falando com servidores novos e antigos",
      tag: "example",
      body: [
        `Um cliente que suporta ${clientVersions.join(" e ")} se conecta a dois servidores. O primeiro suporta ${modernServerVersions.join(" e ")}: a versão comum mais recente é ${withModernServer}, e o cliente segue sem handshake. O segundo suporta ${legacyServerVersions.join(" e ")}: a comum é ${withLegacyServer}, que exige o initialize.`,
        "Como o cliente descobre a era? No stdio, a especificação recomenda sondar com server/discover antes de tudo: um DiscoverResult ou um erro moderno reconhecido indica servidor novo; qualquer outro erro, ou silêncio até o timeout, indica servidor legado, e o cliente cai para o initialize. No HTTP, o cliente tenta um pedido moderno e examina o corpo de um 400 antes de cair para o legado. O resultado da sondagem deve ficar em cache.",
      ],
      keyIdea: "Sonde com server/discover; erro moderno, tente outra versão; outro erro, caia para o initialize.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "probe",
            piece: "block-diagram",
            blocks: [
              { id: "client", kind: "laptop", label: "cliente duas eras", col: 0, row: 0.5 },
              { id: "probe", kind: "retrieval", label: "server/discover", col: 1, row: 0.5 },
              { id: "modern", kind: "tool", label: `usa ${withModernServer}`, col: 2.5, row: 0 },
              { id: "legacy", kind: "server", label: `initialize ${withLegacyServer}`, col: 2.5, row: 1 },
            ],
            edges: [
              { from: "client", to: "probe", label: "sonda" },
              { from: "probe", to: "modern", label: "DiscoverResult" },
              { from: "probe", to: "legacy", label: "outro erro", variant: "alternative" },
            ],
            active: "probe",
          },
        ],
      },
      alt: `O cliente das duas eras sonda com server/discover, em destaque: um DiscoverResult leva a usar ${withModernServer}; outro erro leva, pelo caminho tracejado, ao initialize com ${withLegacyServer}.`,
    },
    {
      id: "cost",
      shortTitle: "A conta",
      title: "Mensagens e bytes nas duas eras",
      tag: "tradeoff",
      body: [
        `Para 1 tools/list e ${TOOL_CALLS} tools/call, a era legada troca ${legacyMessages} mensagens e espera ${legacyRoundTripsBeforeWork} ida e volta antes do primeiro pedido de trabalho; a moderna troca ${modernMessages} (ou ${modernWithDiscover} com o server/discover opcional) e espera ${modernRoundTripsBeforeWork}: começa direto. O handshake custa ${integer(handshakeBytes)} bytes uma vez; o _meta custa ${integer(metaBytesPerRequest)} bytes por pedido, ${integer(modernMetaBytes)} nos ${requests} pedidos.`,
        "A troca vale pelo que se ganha fora da conta de bytes: sem sessão, qualquer instância atende qualquer pedido, um processo stdio que reinicia não perde acordo nenhum, e balanceadores não precisam grudar o cliente numa máquina. O custo é repetir dados em todo pedido e manter compatibilidade com servidores legados por um tempo.",
      ],
      keyIdea: "Moderno: menos espera e nenhuma sessão, pagando o _meta em todo pedido.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "eras",
            piece: "metrics-panel",
            metrics: [
              { id: "legacy-msgs", label: `mensagens (${LEGACY})`, value: integer(legacyMessages) },
              { id: "modern-msgs", label: `mensagens (${MODERN})`, value: integer(modernMessages), color: "success" },
              { id: "handshake", label: "bytes do handshake (uma vez)", value: integer(handshakeBytes) },
              { id: "meta", label: `bytes de _meta (${requests} pedidos)`, value: integer(modernMetaBytes), color: "danger" },
            ],
            highlight: "modern-msgs",
          },
        ],
      },
      alt: `Painel: ${legacyMessages} mensagens na era legada contra ${modernMessages} na moderna; o handshake custa ${handshakeBytes} bytes uma vez e o _meta soma ${modernMetaBytes} bytes nos ${requests} pedidos.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "O ciclo de vida em duas versões",
      tag: "summary",
      body: [
        `Até ${LEGACY}: initialize, initialized, operação dentro do que foi negociado e encerramento pelo transporte. Em ${MODERN}: nenhum handshake, _meta em todo pedido, server/discover opcional e erro ${UNSUPPORTED_VERSION_CODE} para versão não suportada. Nos dois, só se usa a capacidade que o outro lado declarou, e todo pedido deve ter timeout.`,
        "Com a conexão de pé, falta ver o caminho completo de uma ferramenta: da descoberta à execução, passando pelo modelo.",
      ],
      keyIdea: "Combine a versão, respeite as capacidades e ponha timeout em todo pedido.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "recap",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "legacy", label: `${LEGACY}: initialize → initialized`, color: "muted" },
              { id: "modern", label: `${MODERN}: _meta em todo pedido`, color: "module-13" },
              { id: "discover", label: "server/discover (opcional)" },
              { id: "caps", label: "só o que foi declarado" },
              { id: "error", label: `${UNSUPPORTED_VERSION_CODE}: tente outra versão` },
              { id: "timeout", label: "timeout em todo pedido" },
            ],
          },
        ],
      },
      alt: `Resumo em chips: ${LEGACY} com initialize e initialized; ${MODERN} com _meta em todo pedido; server/discover opcional; só usar o que foi declarado; erro ${UNSUPPORTED_VERSION_CODE} para tentar outra versão; timeout em todo pedido.`,
    },
  ],
  realWorldExample:
    "O tutorial oficial de servidor em TypeScript usa a função serveStdio, que negocia a revisão com cada cliente: o mesmo servidor atende clientes 2026-07-28 e clientes que ainda abrem com o initialize de 2025. O tutorial avisa que ligar o servidor à mão com StdioServerTransport ainda compila, mas só atende clientes da era de 2025.",
  code: {
    language: "json",
    source: `{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2025-11-25",
    "capabilities": { "elicitation": { "form": {} }, "sampling": {} },
    "clientInfo": { "name": "ExampleClient", "version": "1.0.0" }
  }
}`,
    caption: "O initialize da revisão 2025-11-25, a primeira mensagem de uma conexão legada. Na 2026-07-28, esses mesmos dados vão no _meta de cada pedido.",
  },
  tradeOffs: {
    pros: [
      "Handshake legado: acordo único, mensagens de trabalho menores",
      "Modelo moderno: sem sessão, escala horizontal e reinício sem perda de acordo",
      "Capacidades declaradas evitam chamar o que o outro lado não suporta",
    ],
    cons: [
      "Handshake legado prende o acordo à conexão: reiniciar ou trocar de instância exige refazer",
      "Modelo moderno repete versão e capacidades em todo pedido",
      "Conviver com as duas eras exige sondagem, fallback e testes de compatibilidade",
    ],
    alternatives: ["Usar a função de servir do SDK oficial, que já trata as duas eras", "Fixar uma versão só, quando você controla cliente e servidor"],
  },
  knowledgeCheck: [
    {
      id: "pick-version",
      prompt: "Um cliente suporta 2026-07-28 e 2025-11-25. O servidor responde ao server/discover com supportedVersions [\"2025-11-25\", \"2026-07-28\"]. Qual versão usar?",
      options: ["2025-11-25, a primeira da lista", "2026-07-28, a mais recente que os dois suportam", "Nenhuma: precisa de initialize", "A do servidor, sempre"],
      correct: 1,
      explanation: "A ordem da lista não importa: o cliente escolhe uma versão que os dois suportam, normalmente a mais recente. Como o servidor respondeu ao server/discover, ele é moderno, e não há handshake.",
      lesson: "13-09",
    },
    {
      id: "capability-use",
      prompt: "Numa conexão legada, o servidor declarou tools e resources, e o cliente declarou só elicitation. O servidor pode mandar um pedido de sampling?",
      options: [
        "Sim, sampling é obrigatório",
        "Não: sampling é oferecido pelo cliente, e o cliente não o declarou",
        "Sim, se o servidor declarar sampling",
        "Só depois de um tools/list",
      ],
      correct: 1,
      explanation: "Um recurso opcional só pode ser usado se o lado que o oferece o declarou. Sampling é do cliente; sem a declaração, o servidor não pode pedir.",
      lesson: "13-09",
    },
  ],
  related: ["13-08", "13-10", "13-03"],
  references: [
    { title: "MCP Specification 2025-11-25: Lifecycle", url: "https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle", kind: "docs" },
    { title: "MCP Specification 2026-07-28: Versioning and compatibility", url: "https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning", kind: "docs" },
    { title: "MCP Specification 2026-07-28: Key changes", url: "https://modelcontextprotocol.io/specification/2026-07-28/changelog", kind: "docs" },
  ],
};

export default lesson;
