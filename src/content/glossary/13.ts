import type { GlossaryEntry } from "../glossary";

// Termos do módulo 13: Model Context Protocol (MCP). Os detalhes versionados seguem a revisão 2026-07-28
// da especificação; quando um termo mudou nessa revisão, a explicação diz o que valia antes.

const entries: GlossaryEntry[] = [
  {
    id: "model-context-protocol",
    term: "Model Context Protocol (MCP)",
    explanation:
      "Protocolo aberto, publicado pela Anthropic em 2024, que padroniza como apps de IA descobrem e usam ferramentas, dados e prompts de programas externos, os servidores MCP, com mensagens JSON-RPC.",
    lesson: "13-01",
  },
  {
    id: "nxm-integration-problem",
    term: "N×M Integration Problem",
    explanation:
      "Sem um padrão, N apps que querem M ferramentas pedem N × M conectores sob medida. Com um protocolo comum, cada lado implementa uma vez: N clientes + M servidores.",
    lesson: "13-02",
  },
  {
    id: "json-rpc",
    term: "JSON-RPC 2.0",
    explanation:
      "Formato leve de chamada remota em JSON: pedidos com id e method, respostas com o mesmo id e result ou error, e notificações sem id, que não esperam resposta. É o formato de todas as mensagens do MCP.",
    lesson: "13-03",
  },
  {
    id: "mcp-data-layer",
    term: "Data Layer",
    explanation:
      "Camada interna do MCP: o protocolo JSON-RPC, a descoberta de versão e capacidades e as primitivas (ferramentas, recursos, prompts, elicitação e notificações).",
    lesson: "13-03",
  },
  {
    id: "mcp-transport-layer",
    term: "Transport Layer",
    explanation:
      "Camada externa do MCP: como as mensagens viajam entre cliente e servidor (stdio ou Streamable HTTP), com o enquadramento das mensagens e a autorização.",
    lesson: "13-03",
  },
  {
    id: "mcp-host",
    term: "MCP Host",
    explanation:
      "O app de IA que o usuário usa, como um chat no desktop ou uma IDE. Cria um cliente MCP por servidor, junta o que os servidores oferecem, conversa com o modelo e decide o que executar.",
    lesson: "13-04",
  },
  {
    id: "mcp-client",
    term: "MCP Client",
    explanation:
      "Componente dentro do host que mantém a conexão com um único servidor MCP: envia os pedidos, recebe as respostas e entrega o resultado ao host.",
    lesson: "13-04",
  },
  {
    id: "mcp-server",
    term: "MCP Server",
    explanation:
      "Programa que oferece ferramentas, recursos e prompts a clientes MCP. Pode rodar na máquina do usuário (stdio) ou como serviço remoto (Streamable HTTP).",
    lesson: "13-04",
  },
  {
    id: "elicitation",
    term: "Elicitation",
    explanation:
      "Recurso do cliente que deixa o servidor pedir informação ao usuário no meio de uma operação: em modo formulário, com um schema simples, ou em modo URL, para dados sensíveis que não podem passar pelo cliente.",
    lesson: "13-04",
  },
  {
    id: "mcp-sampling",
    term: "Sampling (MCP)",
    explanation:
      "Recurso do cliente que deixa o servidor pedir uma geração ao modelo do host (sampling/createMessage). Foi marcado como deprecated na revisão 2026-07-28: a recomendação é o servidor chamar a API de um provedor direto.",
    lesson: "13-04",
  },
  {
    id: "mcp-roots",
    term: "Roots",
    explanation:
      "Recurso do cliente que informa ao servidor as pastas ou URIs em que ele pode trabalhar (roots/list). Deprecated na revisão 2026-07-28: passe caminhos por parâmetros, URIs de recursos ou configuração do servidor.",
    lesson: "13-04",
  },
  {
    id: "mcp-tool",
    term: "MCP Tool",
    explanation:
      "Função que um servidor expõe para o modelo chamar, descrita por nome, descrição e inputSchema em JSON Schema. É controlada pelo modelo: ele decide quando usar, e o host executa com tools/call.",
    lesson: "13-05",
  },
  {
    id: "tool-annotations",
    term: "Tool Annotations",
    explanation:
      "Dicas opcionais sobre o comportamento de uma ferramenta MCP: readOnlyHint, destructiveHint, idempotentHint e openWorldHint. São só dicas; o cliente não deve confiar nelas se o servidor não for confiável.",
    lesson: "13-05",
  },
  {
    id: "structured-content",
    term: "Structured Content",
    explanation:
      "Resultado de ferramenta MCP em JSON, no campo structuredContent, que segue o outputSchema da ferramenta. Não confundir com structured output, que é a geração do modelo presa a um schema.",
    lesson: "13-05",
  },
  {
    id: "mcp-resource",
    term: "MCP Resource",
    explanation:
      "Dado que um servidor oferece para leitura, identificado por uma URI (arquivo, registro, schema de banco). É controlado pela aplicação: o host decide o que entra no contexto, com resources/list e resources/read.",
    lesson: "13-06",
  },
  {
    id: "resource-template",
    term: "Resource Template",
    explanation:
      "Recurso parametrizado por um modelo de URI (RFC 6570), como docs://politicas/{tema}: o cliente preenche as variáveis e lê o recurso concreto.",
    lesson: "13-06",
  },
  {
    id: "mcp-prompt",
    term: "MCP Prompt",
    explanation:
      "Modelo de mensagens que o servidor oferece e o usuário escolhe, muitas vezes como comando de barra. Recebe argumentos em prompts/get e devolve mensagens prontas para o contexto.",
    lesson: "13-07",
  },
  {
    id: "argument-completion",
    term: "Argument Completion",
    explanation:
      "Utilitário do MCP (completion/complete) em que o servidor sugere valores para argumentos de prompts e de modelos de URI enquanto o usuário digita.",
    lesson: "13-07",
  },
  {
    id: "stdio-transport",
    term: "stdio Transport",
    explanation:
      "Transporte em que o cliente inicia o servidor como subprocesso e troca mensagens JSON-RPC pela entrada e saída padrão, uma por linha. Logs vão para stderr; stdout só leva mensagens MCP.",
    lesson: "13-08",
  },
  {
    id: "streamable-http",
    term: "Streamable HTTP",
    explanation:
      "Transporte remoto do MCP: o servidor expõe um único endpoint, cada mensagem do cliente é um POST, e a resposta vem como um JSON ou como um stream SSE ligado àquele pedido. Substituiu o HTTP+SSE de 2024-11-05.",
    lesson: "13-08",
  },
  {
    id: "server-sent-events",
    term: "Server-Sent Events (SSE)",
    explanation:
      "Formato HTTP em que o servidor mantém a resposta aberta e envia eventos de texto em sequência. No MCP, leva notificações de progresso antes da resposta final de um pedido.",
    lesson: "13-08",
  },
  {
    id: "dns-rebinding",
    term: "DNS Rebinding",
    explanation:
      "Ataque em que um site faz o navegador falar com um serviço em localhost trocando a resolução de DNS do próprio domínio. Servidores MCP HTTP se protegem validando o cabeçalho Origin e escutando só em 127.0.0.1.",
    lesson: "13-08",
  },
  {
    id: "initialization-handshake",
    term: "Initialization Handshake",
    explanation:
      "Abertura de conexão das revisões até 2025-11-25: initialize com versão e capacidades, resposta do servidor e notifications/initialized. A revisão 2026-07-28 removeu o handshake: cada pedido carrega essas informações.",
    lesson: "13-09",
  },
  {
    id: "capability-negotiation",
    term: "Capability Negotiation",
    explanation:
      "Troca em que cliente e servidor declaram os recursos opcionais que suportam (tools, resources, prompts, elicitation, listChanged…), para que nenhum lado use o que o outro não oferece.",
    lesson: "13-09",
  },
  {
    id: "server-discover",
    term: "server/discover",
    explanation:
      "Método obrigatório da revisão 2026-07-28 que devolve as versões suportadas, as capacidades e a identidade do servidor num só pedido. Chamar é opcional; serve também de sonda para detectar servidores antigos.",
    lesson: "13-09",
  },
  {
    id: "tools-list",
    term: "tools/list",
    explanation:
      "Pedido MCP que lista as ferramentas de um servidor, com paginação por cursor e, na revisão 2026-07-28, dicas de cache (ttlMs e cacheScope).",
    lesson: "13-10",
  },
  {
    id: "tools-call",
    term: "tools/call",
    explanation:
      "Pedido MCP que executa uma ferramenta pelo nome com os argumentos. A resposta traz content, opcionalmente structuredContent, e isError quando a falha é da execução.",
    lesson: "13-10",
  },
  {
    id: "mcp-notification",
    term: "MCP Notification",
    explanation:
      "Mensagem JSON-RPC sem id, que não espera resposta, como notifications/tools/list_changed ou notifications/progress. Na revisão 2026-07-28, as de mudança chegam num stream aberto com subscriptions/listen.",
    lesson: "13-10",
  },
  {
    id: "tool-namespacing",
    term: "Tool Namespacing",
    explanation:
      "Prefixar os nomes das ferramentas com o servidor de origem (github__search, jira__search) para evitar colisões quando o host junta ferramentas de vários servidores.",
    lesson: "13-10",
  },
  {
    id: "progressive-tool-discovery",
    term: "Progressive Tool Discovery",
    explanation:
      "Padrão em que o host não injeta todas as definições de ferramentas no contexto: oferece uma ferramenta de busca e carrega só as definições que a tarefa pede.",
    lesson: "13-10",
  },
  {
    id: "multi-round-trip-request",
    term: "Multi Round-Trip Request (MRTR)",
    explanation:
      "Padrão da revisão 2026-07-28 em que o servidor responde com resultType input_required e pedidos de entrada (como uma elicitação); o cliente reúne as respostas e repete o pedido original com elas.",
    lesson: "13-10",
  },
  {
    id: "tool-poisoning",
    term: "Tool Poisoning",
    explanation:
      "Ataque em que um servidor esconde instruções maliciosas na descrição ou no schema de uma ferramenta. O modelo lê o texto inteiro; o usuário, em geral, só vê o nome.",
    lesson: "13-11",
  },
  {
    id: "rug-pull",
    term: "Rug Pull",
    explanation:
      "Ataque em que um servidor muda a definição de uma ferramenta depois que o usuário a aprovou. Defesa: fixar um hash das definições aprovadas e pedir nova aprovação quando ele muda.",
    lesson: "13-11",
  },
  {
    id: "confused-deputy",
    term: "Confused Deputy",
    explanation:
      "Ataque em que um intermediário com permissões legítimas é induzido a usá-las em nome de quem não deveria. No MCP, um servidor proxy com client ID fixo e cookie de consentimento pode entregar códigos de autorização a um atacante.",
    lesson: "13-11",
  },
  {
    id: "token-passthrough",
    term: "Token Passthrough",
    explanation:
      "Antipadrão, proibido na especificação, em que o servidor MCP aceita um token que não foi emitido para ele e o repassa a uma API. O servidor deve aceitar só tokens com ele mesmo como audiência.",
    lesson: "13-11",
  },
  {
    id: "mcp-authorization",
    term: "MCP Authorization",
    explanation:
      "Autorização dos transportes HTTP do MCP, baseada em OAuth 2.1: o servidor MCP é um resource server, o cliente obtém um token num servidor de autorização e o envia em todo pedido. Servidores stdio leem credenciais do ambiente.",
    lesson: "13-11",
  },
  {
    id: "oauth",
    term: "OAuth 2.1",
    explanation:
      "Padrão de autorização delegada: o usuário aprova o acesso num servidor de autorização, e o cliente recebe um token de acesso com escopos limitados, sem ver a senha do usuário.",
    lesson: "13-11",
  },
  {
    id: "protected-resource-metadata",
    term: "Protected Resource Metadata",
    explanation:
      "Documento (RFC 9728) em que o servidor MCP diz quais servidores de autorização aceita e quais escopos existem. O cliente o encontra pelo cabeçalho WWW-Authenticate de uma resposta 401.",
    lesson: "13-11",
  },
  {
    id: "mcp-inspector",
    term: "MCP Inspector",
    explanation:
      "Ferramenta oficial de desenvolvimento que se conecta a um servidor MCP e permite listar e chamar ferramentas, ler recursos e ver as mensagens trocadas.",
    lesson: "13-12",
  },
  {
    id: "programmatic-tool-calling",
    term: "Programmatic Tool Calling",
    explanation:
      "Padrão, também chamado de code mode, em que o modelo escreve um script que chama várias ferramentas num sandbox, e só o resultado final volta ao contexto, em vez de cada resultado intermediário.",
    lesson: "13-13",
  },
];

export default entries;
