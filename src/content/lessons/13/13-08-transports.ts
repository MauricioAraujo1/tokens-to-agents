import type { LessonContent } from "../../../types/content";

// Os dois transportes do MCP com contas no arquivo. No stdio, a saída padrão de um servidor que esqueceu
// um print: cada linha é testada com JSON.parse, e só as mensagens JSON-RPC válidas passam. No Streamable
// HTTP, a mesma resposta como um JSON único ou como um stream SSE com eventos de progresso: os bytes de
// cada forma e o instante do primeiro sinal, com tempos de brinquedo. Regras da revisão 2026-07-28.

const SPEC = "2026-07-28";
const integer = (value: number) => value.toLocaleString("pt-BR");
const seconds = (value: number) => `${value.toLocaleString("pt-BR")} s`;

// stdio: uma mensagem JSON-RPC por linha em stdout.
const stdoutLines = [
  JSON.stringify({ jsonrpc: "2.0", id: 1, result: { resultType: "complete", tools: [] } }),
  "carregando configuração...",
  JSON.stringify({ jsonrpc: "2.0", method: "notifications/progress", params: { progressToken: "t1", progress: 50, total: 100 } }),
  "DEBUG consulta ok",
  JSON.stringify({ jsonrpc: "2.0", id: 2, result: { resultType: "complete", content: [] } }),
];
const isMcpMessage = (line: string) => {
  try {
    const parsed = JSON.parse(line) as { jsonrpc?: string };
    return parsed.jsonrpc === "2.0";
  } catch {
    return false;
  }
};
const lineIsValid = stdoutLines.map(isMcpMessage);
const validLines = lineIsValid.filter(Boolean).length;
const invalidLines = stdoutLines.length - validLines;
const lineLabels = stdoutLines.map((line) => {
  if (!isMcpMessage(line)) return line;
  const parsed = JSON.parse(line) as { id?: number; method?: string };
  return parsed.method ?? `resposta #${parsed.id}`;
});

// Streamable HTTP: a resposta a um tools/call como JSON único ou como stream SSE.
const progressEvents = [25, 75].map((progress) =>
  JSON.stringify({ jsonrpc: "2.0", method: "notifications/progress", params: { progressToken: "t9", progress, total: 100 } }),
);
const finalResponse = JSON.stringify({
  jsonrpc: "2.0",
  id: 9,
  result: { resultType: "complete", content: [{ type: "text", text: "Relatório gerado: 42 linhas." }] },
});
const sseEvent = (data: string) => `data: ${data}\n\n`;
const jsonBytes = finalResponse.length;
const sseBytes = [...progressEvents, finalResponse].reduce((sum, data) => sum + sseEvent(data).length, 0);

// Tempos de brinquedo: a ferramenta leva 6 s e avisa o progresso a cada 2 s.
const TOOL_SECONDS = 6;
const PROGRESS_EVERY = 2;
const firstSignalJson = TOOL_SECONDS;
const firstSignalSse = PROGRESS_EVERY;

const httpMessages = [
  { from: "host", to: "server", label: "POST tools/call" },
  { from: "server", to: "host", label: "SSE: progresso 25%" },
  { from: "server", to: "host", label: "SSE: progresso 75%" },
  { from: "server", to: "host", label: "SSE: resultado" },
];

const lesson: LessonContent = {
  id: "13-08",
  subtitle: "stdio para servidores locais e Streamable HTTP para remotos: o enquadramento das mensagens, os streams e as regras de segurança.",
  objectives: [
    "Explicar como o stdio enquadra as mensagens e por que stdout é sagrado",
    "Descrever o Streamable HTTP: um endpoint, POST por mensagem, JSON ou SSE",
    "Comparar resposta JSON e stream SSE em bytes e em tempo até o primeiro sinal",
    "Aplicar as proteções contra DNS rebinding em servidores HTTP locais",
  ],
  steps: [
    {
      id: "two-roads",
      shortTitle: "Dois caminhos",
      title: "O interfone e o correio",
      tag: "context",
      body: [
        "Dentro de casa, você fala com a cozinha pelo interfone: um fio direto, só entre os dois. Para falar com outra cidade, usa o correio, com endereço, envelope e carimbo. O MCP tem os dois: um transporte para servidores na sua máquina e outro para servidores na rede.",
        "No [[stdio|stdio-transport]], o host inicia o servidor como subprocesso e conversa pela entrada e saída padrão dele. No [[Streamable HTTP|streamable-http]], o servidor é um processo independente, com um endpoint HTTP que atende muitos clientes. As mensagens JSON-RPC são as mesmas nos dois.",
      ],
      keyIdea: "stdio: processo filho, fio direto. Streamable HTTP: serviço em rede, muitos clientes.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "roads",
            piece: "block-diagram",
            blocks: [
              { id: "host", kind: "laptop", label: "host", col: 0, row: 0.5 },
              { id: "local", kind: "tool", label: "processo filho", col: 2, row: 0 },
              { id: "remote", kind: "cloud", label: "https://…/mcp", col: 2, row: 1 },
              { id: "others", kind: "user", label: "outros clientes", col: 3, row: 1 },
            ],
            edges: [
              { from: "host", to: "local", label: "stdin / stdout" },
              { from: "host", to: "remote", label: "POST" },
              { from: "others", to: "remote" },
            ],
            active: "host",
          },
        ],
      },
      alt: "O host, em destaque, fala com um servidor local, processo filho, por stdin e stdout, e com um servidor remoto por POST HTTP, que também atende outros clientes.",
    },
    {
      id: "stdio",
      shortTitle: "stdio",
      title: "Uma linha, uma mensagem",
      tag: "mechanism",
      body: [
        "No stdio, cada mensagem é um JSON numa linha só, terminada por quebra de linha, sem quebras no meio. O servidor lê pedidos do stdin e escreve mensagens no stdout; logs vão para o stderr, que o cliente pode mostrar ou ignorar. A regra é dura: nada que não seja mensagem MCP pode sair no stdout.",
        `A cena mostra a saída de um servidor que esqueceu dois prints. Das ${stdoutLines.length} linhas, ${validLines} são JSON-RPC válidas e ${invalidLines} quebram o protocolo: o cliente não consegue interpretá-las. É o erro mais comum de quem escreve o primeiro servidor, e o tutorial oficial avisa para não usar print nem console.log em servidores stdio. Para encerrar, o cliente fecha o stdin do servidor e, se ele não sair a tempo, força o término do processo.`,
      ],
      keyIdea: "stdout só leva mensagens MCP, uma por linha; todo log vai para stderr.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "stdout",
            piece: "token-stream",
            tokens: lineLabels,
            bars: lineIsValid.map((valid) => (valid ? 1 : 0.08)),
            keys: lineIsValid.map((valid, index) => (valid ? -1 : index)).filter((index) => index >= 0),
            color: "danger",
          },
        ],
      },
      alt: `As ${stdoutLines.length} linhas do stdout: ${lineLabels.join("; ")}. ${validLines} são mensagens válidas; as ${invalidLines} linhas de log, em destaque, corrompem o protocolo.`,
    },
    {
      id: "http",
      shortTitle: "HTTP",
      title: "Um endpoint, um POST por mensagem",
      tag: "mechanism",
      body: [
        "No Streamable HTTP, o servidor expõe um único endpoint, como https://exemplo.com/mcp. Cada mensagem do cliente é um POST novo, com Accept listando application/json e text/event-stream. Para cada pedido, o servidor escolhe: responde com um JSON único ou abre um stream de [[Server-Sent Events|server-sent-events]] ligado só àquele pedido, com notificações de progresso antes da resposta final.",
        `A revisão ${SPEC} simplificou o transporte: não há mais sessão (o cabeçalho Mcp-Session-Id saiu), nem o stream aberto por GET, nem retomada de stream com Last-Event-ID. Se o stream cai, o cliente refaz o pedido com um id novo. Fechar o stream da resposta vale como cancelamento do pedido. O antigo transporte HTTP+SSE, da revisão 2024-11-05, está deprecated.`,
      ],
      keyIdea: "Cada pedido é um POST; a resposta é um JSON ou um stream SSE só daquele pedido.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "exchange",
            piece: "client-server",
            nodes: [
              { id: "host", label: "host", role: "client" },
              { id: "server", label: "servidor mcp", role: "server", utilization: 0.6 },
            ],
            messages: httpMessages,
            active: 3,
          },
        ],
      },
      alt: `Troca no Streamable HTTP: ${httpMessages.map((message) => message.label).join(", ")}. O resultado final, em trânsito, fecha o stream.`,
    },
    {
      id: "json-or-sse",
      shortTitle: "JSON ou SSE",
      title: "Quanto custa avisar o progresso",
      tag: "example",
      body: [
        `Uma ferramenta que gera um relatório leva ${seconds(TOOL_SECONDS)} (tempo de brinquedo). Com resposta JSON, o host fica ${seconds(firstSignalJson)} sem notícia e recebe ${integer(jsonBytes)} bytes no fim. Com SSE e progresso a cada ${seconds(PROGRESS_EVERY)}, o primeiro sinal chega em ${seconds(firstSignalSse)}, e o stream inteiro soma ${integer(sseBytes)} bytes, com ${progressEvents.length} eventos de progresso e a resposta.`,
        "Para chamadas rápidas, JSON basta. Para operações longas, o stream deixa o host mostrar progresso e manter a conexão viva; proxies como o nginx precisam do cabeçalho X-Accel-Buffering: no para não segurar os eventos. Tarefas que duram minutos ou horas têm uma extensão oficial própria, a de tasks, com consulta periódica.",
      ],
      keyIdea: "SSE custa alguns bytes a mais e troca a espera muda por progresso visível.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "compare",
            piece: "metrics-panel",
            metrics: [
              { id: "json-bytes", label: "resposta JSON", value: `${integer(jsonBytes)} bytes` },
              { id: "sse-bytes", label: "stream SSE", value: `${integer(sseBytes)} bytes` },
              { id: "json-first", label: "1º sinal com JSON", value: seconds(firstSignalJson), color: "danger" },
              { id: "sse-first", label: "1º sinal com SSE", value: seconds(firstSignalSse), color: "success" },
            ],
            highlight: "sse-first",
          },
        ],
      },
      alt: `Painel: a resposta JSON tem ${jsonBytes} bytes e o stream SSE ${sseBytes}; o primeiro sinal chega em ${firstSignalJson} s com JSON e em ${firstSignalSse} s com SSE.`,
    },
    {
      id: "rebinding",
      shortTitle: "Segurança",
      title: "O site que fala com o seu localhost",
      tag: "tradeoff",
      body: [
        "Um servidor MCP HTTP rodando no seu notebook parece privado, mas o navegador também está no seu notebook. No [[DNS rebinding|dns-rebinding]], um site malicioso faz o próprio domínio passar a apontar para 127.0.0.1, e o JavaScript da página começa a mandar pedidos ao seu servidor local como se fosse da mesma origem.",
        "Por isso a especificação exige que o servidor valide o cabeçalho Origin de toda conexão e responda 403 a uma origem inválida, recomenda escutar só em 127.0.0.1 (não em 0.0.0.0) e autenticar as conexões. Para servidores que só o seu host usa, o stdio evita o problema: não há porta aberta para ninguém mais.",
      ],
      keyIdea: "Servidor HTTP local: valide Origin, escute em 127.0.0.1 e autentique; ou use stdio.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "attack",
            piece: "block-diagram",
            blocks: [
              { id: "site", kind: "cloud", label: "site malicioso", col: 0, row: 0.5 },
              { id: "browser", kind: "laptop", label: "seu navegador", col: 1, row: 0.5 },
              { id: "origin", kind: "guardrail", label: "valida origin", col: 2, row: 0.5 },
              { id: "server", kind: "tool", label: "127.0.0.1:8080", col: 3, row: 0 },
              { id: "denied", kind: "no-result", label: "403", col: 3, row: 1 },
            ],
            edges: [
              { from: "site", to: "browser", label: "javascript" },
              { from: "browser", to: "origin", label: "POST /mcp" },
              { from: "origin", to: "server", label: "só origem válida" },
              { from: "origin", to: "denied", label: "origem inválida", variant: "alternative" },
            ],
            active: "origin",
          },
        ],
      },
      alt: "Um site malicioso roda JavaScript no seu navegador, que tenta um POST ao servidor local; a validação de Origin, em destaque, responde 403 e só deixa passar origens válidas.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Escolhendo o transporte",
      tag: "summary",
      body: [
        "stdio para servidores locais de um host só: simples, sem porta aberta, com logs no stderr. Streamable HTTP para servidores remotos ou compartilhados: um endpoint, POST por mensagem, JSON ou SSE por pedido, Origin validado e autorização com OAuth.",
        "A próxima aula trata do ciclo de vida: como cliente e servidor combinam versão e capacidades, antes e depois da revisão sem estado.",
      ],
      keyIdea: "Local e de um só: stdio. Remoto ou compartilhado: Streamable HTTP.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "choose",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "stdio", label: "stdio: 1 linha = 1 mensagem", color: "module-13" },
              { id: "stderr", label: "logs no stderr" },
              { id: "http", label: "Streamable HTTP: 1 POST por mensagem", color: "brand" },
              { id: "sse", label: "JSON ou SSE por pedido" },
              { id: "origin", label: "validar Origin, escutar em 127.0.0.1" },
              { id: "nosession", label: `sem sessão em ${SPEC}` },
            ],
          },
        ],
      },
      alt: `Resumo em chips: stdio com uma mensagem por linha e logs no stderr; Streamable HTTP com um POST por mensagem e resposta JSON ou SSE; validar Origin e escutar em 127.0.0.1; sem sessão em ${SPEC}.`,
    },
  ],
  realWorldExample:
    "A documentação do MCP cita o servidor oficial do Sentry como exemplo de servidor remoto: ele roda na plataforma do Sentry e usa Streamable HTTP. Já o servidor de referência de sistema de arquivos roda localmente, iniciado pelo host como subprocesso via stdio.",
  code: {
    language: "bash",
    source: `curl -N https://mcp.exemplo.com/mcp \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json, text/event-stream" \\
  -H "MCP-Protocol-Version: 2026-07-28" \\
  -H "Mcp-Method: tools/list" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{"_meta":{
        "io.modelcontextprotocol/protocolVersion":"2026-07-28",
        "io.modelcontextprotocol/clientInfo":{"name":"curl","version":"1.0.0"},
        "io.modelcontextprotocol/clientCapabilities":{}}}}'`,
    caption: "Um tools/list por Streamable HTTP na revisão 2026-07-28: um POST com Accept para JSON e SSE, a versão no cabeçalho e no _meta, e o método também em Mcp-Method.",
  },
  tradeOffs: {
    pros: [
      "stdio não abre porta nem precisa de autenticação de rede",
      "Streamable HTTP escala para muitos clientes e passa por proxies e balanceadores",
      "SSE por pedido permite progresso sem manter conexões longas sem necessidade",
    ],
    cons: [
      "stdio prende o servidor à máquina e ao processo do host",
      "Servidores HTTP precisam de Origin, TLS, autorização e limites de uso",
      "Sem retomada de stream na revisão 2026-07-28, um stream que cai perde o pedido em andamento",
    ],
    alternatives: ["Transportes próprios sobre sockets Unix ou TCP, reaproveitando o enquadramento do stdio", "A extensão de tasks, para operações longas com consulta periódica"],
  },
  knowledgeCheck: [
    {
      id: "print-bug",
      prompt: "Um servidor stdio funciona no terminal, mas o host acusa erro de protocolo logo na primeira resposta. O código tem print(\"servidor iniciado\"). Qual é a causa provável?",
      options: [
        "O host não suporta Python",
        "O print escreve no stdout, que só pode levar mensagens JSON-RPC; o log deveria ir para stderr",
        "Falta o cabeçalho MCP-Protocol-Version",
        "O servidor precisa de HTTPS",
      ],
      correct: 1,
      explanation: "No stdio, stdout é o canal das mensagens, uma por linha. Uma linha de texto solta não é JSON-RPC e o cliente não consegue interpretá-la. Logs vão para stderr.",
      lesson: "13-08",
    },
    {
      id: "local-http",
      prompt: "Você quer rodar um servidor MCP HTTP só para uso local. Qual configuração segue a especificação?",
      options: [
        "Escutar em 0.0.0.0 sem autenticação, para facilitar",
        "Escutar em 127.0.0.1, validar o cabeçalho Origin e exigir autenticação",
        "Desligar o Origin, porque é local",
        "Usar HTTP+SSE da revisão 2024-11-05",
      ],
      correct: 1,
      explanation: "Localhost não é privado contra o navegador: DNS rebinding alcança 127.0.0.1. A especificação manda validar Origin e recomenda escutar só em localhost e autenticar.",
      lesson: "13-08",
    },
  ],
  related: ["13-03", "13-09", "13-11"],
  references: [
    { title: "MCP Specification 2026-07-28: stdio", url: "https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/stdio", kind: "docs" },
    { title: "MCP Specification 2026-07-28: Streamable HTTP", url: "https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http", kind: "docs" },
    { title: "WHATWG HTML: Server-sent events", url: "https://html.spec.whatwg.org/multipage/server-sent-events.html", kind: "docs" },
  ],
};

export default lesson;
