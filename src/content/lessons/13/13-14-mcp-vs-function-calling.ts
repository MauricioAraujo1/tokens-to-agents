import type { LessonContent } from "../../../types/content";

// MCP e function calling lado a lado, com contas no arquivo: a mesma ferramenta escrita como definição MCP
// e como tool da API de um modelo, com o custo de cada uma em tokens (4 caracteres por token), e uma regra
// de decisão aplicada a cinco cenários. Campos seguem a revisão 2026-07-28 do MCP e a API Messages da
// Anthropic.

const estimateTokens = (text: string) => Math.ceil(text.length / 4);

const description = "Consulta o status e a previsão de entrega de um pedido pelo número.";
const schema = {
  type: "object",
  properties: { numero: { type: "string", description: "Número do pedido, só dígitos" } },
  required: ["numero"],
};
const mcpDefinition = { name: "buscar_pedido", description, inputSchema: schema };
const apiDefinition = { name: "loja__buscar_pedido", description, input_schema: schema };
const mcpTokens = estimateTokens(JSON.stringify(mcpDefinition));
const apiTokens = estimateTokens(JSON.stringify(apiDefinition));
const tokenDifference = apiTokens - mcpTokens;

interface Scenario {
  label: string;
  manyApps: boolean;
  vendorProvided: boolean;
  userChooses: boolean;
}
const scenarios: Scenario[] = [
  { label: "1 app, 2 funções internas", manyApps: false, vendorProvided: false, userChooses: false },
  { label: "4 apps, as mesmas ferramentas", manyApps: true, vendorProvided: false, userChooses: false },
  { label: "ferramenta de fornecedor", manyApps: false, vendorProvided: true, userChooses: false },
  { label: "mudar a tela do próprio app", manyApps: false, vendorProvided: false, userChooses: false },
  { label: "IDE: usuário traz ferramentas", manyApps: false, vendorProvided: false, userChooses: true },
];
const recommendMcp = (scenario: Scenario) => scenario.manyApps || scenario.vendorProvided || scenario.userChooses;
const decisionMatrix = scenarios.map((scenario) => [
  scenario.manyApps ? 1 : 0,
  scenario.vendorProvided ? 1 : 0,
  scenario.userChooses ? 1 : 0,
  recommendMcp(scenario) ? 1 : 0,
]);
const mcpCount = scenarios.filter(recommendMcp).length;
const functionCallingOnly = scenarios.filter((scenario) => !recommendMcp(scenario)).map((scenario) => scenario.label);

const layers = [
  { id: "user", label: "usuário" },
  { id: "model", label: "modelo: tool_use", color: "brand" as const },
  { id: "host", label: "host: política" },
  { id: "client", label: "cliente: tools/call", color: "module-13" as const },
  { id: "server", label: "servidor MCP", color: "module-13" as const },
  { id: "api", label: "API do sistema" },
];

const lesson: LessonContent = {
  id: "13-14",
  subtitle: "Function calling é como o modelo pede uma ferramenta; MCP é como o host encontra e chama ferramentas de fora. Onde cada um entra e quando usar.",
  objectives: [
    "Separar o papel do function calling (modelo ↔ app) do papel do MCP (host ↔ servidores)",
    "Mostrar que o modelo vê a mesma definição com ou sem MCP",
    "Decidir entre funções no próprio código e servidores MCP com critérios explícitos",
    "Traçar o caminho completo de uma chamada pelas duas camadas",
  ],
  steps: [
    {
      id: "function-calling",
      shortTitle: "Sem MCP",
      title: "Function calling sozinho",
      tag: "context",
      body: [
        "Num restaurante pequeno, o garçom anota o pedido num bloquinho e entrega na cozinha do próprio restaurante. O bloquinho é o [[function calling|tool-calling]]: o formato em que o modelo pede uma ferramenta (nome e argumentos em JSON), e em que o app devolve o resultado. A cozinha é o código do seu app, que executa a função.",
        "Isso basta para muita coisa. Um app com duas funções internas, como buscar um pedido no próprio banco, declara as funções na chamada da API, recebe o pedido do modelo, executa e devolve o resultado. Nenhum protocolo extra entra na história.",
      ],
      keyIdea: "Function calling é o formulário entre o modelo e o app; a execução fica no código do app.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "paths",
            piece: "block-diagram",
            blocks: [
              { id: "llm", kind: "llm", label: "modelo", col: 0, row: 0.5 },
              { id: "app", kind: "app", label: "seu app", col: 1.5, row: 0.5 },
              { id: "fn", kind: "tool", label: "função local", col: 3, row: 0 },
              { id: "db", kind: "sql-db", label: "banco do app", col: 3, row: 1 },
            ],
            edges: [
              { from: "llm", to: "app", label: "tool_use" },
              { from: "app", to: "fn", label: "executa" },
              { from: "fn", to: "db" },
            ],
            active: "app",
          },
        ],
      },
      alt: "O modelo pede uma ferramenta ao seu app, em destaque, que executa uma função local consultando o banco do próprio app, sem MCP.",
    },
    {
      id: "with-mcp",
      shortTitle: "Com MCP",
      title: "Onde o MCP entra",
      tag: "mechanism",
      body: [
        "Num restaurante grande, alguns pratos vêm de fornecedores: o garçom continua usando o mesmo bloquinho, mas a cozinha encaminha parte dos pedidos para fora, por um canal padrão com cada fornecedor. O MCP é esse canal: fica do outro lado do app, entre o host e os servidores.",
        "O modelo continua pedindo ferramentas por function calling, exatamente igual. A diferença é de onde as ferramentas vêm e quem executa: o host as descobriu com tools/list e, quando o modelo pede, chama o servidor com tools/call. MCP não substitui function calling; ele alimenta function calling com ferramentas de fora.",
      ],
      keyIdea: "Function calling: modelo ↔ host. MCP: host ↔ servidores. Um não substitui o outro.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "paths",
            piece: "block-diagram",
            blocks: [
              { id: "llm", kind: "llm", label: "modelo", col: 0, row: 0.5 },
              { id: "app", kind: "laptop", label: "host", col: 1.5, row: 0.5 },
              { id: "fn", kind: "tool", label: "servidor loja", col: 3, row: 0 },
              { id: "vendor", kind: "cloud", label: "servidor fornecedor", col: 3, row: 1 },
            ],
            edges: [
              { from: "llm", to: "app", label: "tool_use (igual)" },
              { from: "app", to: "fn", label: "tools/call" },
              { from: "app", to: "vendor", label: "tools/call" },
            ],
            active: "app",
          },
        ],
      },
      alt: "O modelo pede uma ferramenta ao host, em destaque, com o mesmo tool_use de antes; o host encaminha por tools/call ao servidor MCP da loja ou ao de um fornecedor.",
    },
    {
      id: "same-tokens",
      shortTitle: "Mesmos tokens",
      title: "O modelo vê a mesma coisa",
      tag: "mechanism",
      body: [
        `A definição MCP de buscar_pedido tem name, description e inputSchema; o host a traduz para a tool da API do modelo, que na Anthropic tem name, description e input_schema. O schema é o mesmo objeto. A definição MCP custa uns ${mcpTokens} tokens e a da API uns ${apiTokens}; a diferença, ${tokenDifference}, vem do prefixo do servidor no nome.`,
        "Isso derruba um mito comum: MCP não deixa o modelo mais esperto nem mais caro por chamada. O modelo nem sabe que a ferramenta veio de um servidor MCP. O custo e a qualidade dependem das mesmas coisas de sempre: quantas ferramentas vão no contexto, quão boas são as descrições e quão estritos são os schemas.",
      ],
      keyIdea: "Para o modelo, uma ferramenta MCP é só mais uma tool, com o mesmo custo em tokens.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "tokens",
            piece: "metrics-panel",
            metrics: [
              { id: "mcp", label: "definição MCP", value: `${mcpTokens} tokens`, color: "module-13" },
              { id: "api", label: "tool na API do modelo", value: `${apiTokens} tokens`, color: "brand" },
              { id: "diff", label: "diferença (prefixo)", value: `${tokenDifference} tokens` },
            ],
            highlight: "api",
          },
        ],
      },
      alt: `Painel: a definição MCP custa ${mcpTokens} tokens e a mesma ferramenta na API do modelo custa ${apiTokens}; a diferença de ${tokenDifference} tokens vem do prefixo no nome.`,
    },
    {
      id: "decide",
      shortTitle: "Decidir",
      title: "Quando vale um servidor MCP",
      tag: "example",
      body: [
        "A pergunta não é “MCP ou function calling”, porque o function calling estará lá de qualquer jeito. A pergunta é: a ferramenta mora no código do app ou num servidor MCP? Uma regra prática: servidor MCP quando a ferramenta é usada por mais de um app, quando vem de um fornecedor que já publica um servidor, ou quando o usuário escolhe quais ferramentas ligar.",
        `Nos ${scenarios.length} cenários da cena, a regra indica servidor MCP em ${mcpCount} e função no próprio código em ${functionCallingOnly.length}: ${functionCallingOnly.join(" e ")}. Mudar a tela do próprio app, por exemplo, depende do estado interno dele e não ganha nada saindo para um processo separado.`,
      ],
      keyIdea: "Reuso entre apps, fornecedor externo ou escolha do usuário: servidor MCP. Só seu e acoplado ao app: função local.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "decision",
            piece: "matrix",
            rows: scenarios.map((scenario) => scenario.label),
            cols: ["vários apps", "fornecedor", "usuário escolhe", "servidor MCP?"],
            values: decisionMatrix,
            scale: { min: 0, max: 1 },
            highlight: { row: 3, col: 3 },
            showValues: true,
            color: "module-13",
          },
        ],
      },
      alt: `Tabela de decisão: ${scenarios.map((scenario) => `${scenario.label}, ${recommendMcp(scenario) ? "servidor MCP" : "função local"}`).join("; ")}.`,
    },
    {
      id: "layers",
      shortTitle: "Camadas",
      title: "O caminho completo de uma chamada",
      tag: "tradeoff",
      body: [
        "Juntando as duas camadas: o usuário pede, o modelo responde com um tool_use (function calling), o host aplica a política e manda o tools/call pelo cliente (MCP), o servidor chama a API do sistema, e o resultado volta pelo mesmo caminho até virar um tool_result para o modelo.",
        "O preço do MCP é a camada extra: mais um processo ou serviço para operar, versionar, autenticar e monitorar, e mais um ponto de falha e de latência. O ganho é desacoplar: o servidor evolui sem mexer no app, serve a vários hosts e pode ser escrito por quem conhece o sistema. Para uma função que só o seu app usa, a camada extra costuma não se pagar.",
      ],
      keyIdea: "MCP acrescenta uma camada: paga-se em operação e latência, ganha-se em reuso e desacoplamento.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "path",
            piece: "pipeline",
            stages: layers,
            active: "client",
            done: ["user", "model", "host"],
          },
        ],
      },
      alt: `O caminho de uma chamada: ${layers.map((layer) => layer.label).join(", ")}. A etapa atual é o cliente enviando o tools/call.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Duas peças do mesmo encaixe",
      tag: "summary",
      body: [
        "Function calling é o contrato entre o modelo e o app: o modelo pede, o app executa e devolve. MCP é o contrato entre o host e os servidores: descobrir, chamar e receber ferramentas, recursos e prompts de fora. Toda ferramenta MCP chega ao modelo como uma tool comum.",
        "Com isso, o módulo fecha o MCP de ponta a ponta. O próximo módulo, Harness Engineering, olha para o ambiente inteiro em volta do agente: instruções, permissões, hooks e isolamento.",
      ],
      keyIdea: "Function calling dentro, MCP fora; juntos, um modelo que usa ferramentas de qualquer lugar.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "recap",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "fc", label: "function calling: modelo ↔ host", color: "brand" },
              { id: "mcp", label: "MCP: host ↔ servidores", color: "module-13" },
              { id: "same", label: "mesma tool para o modelo" },
              { id: "reuse", label: "MCP: reuso e fornecedores" },
              { id: "local", label: "função local: só do app" },
            ],
          },
        ],
      },
      alt: "Resumo em chips: function calling entre modelo e host, MCP entre host e servidores, a mesma tool para o modelo, MCP para reuso e fornecedores, função local para o que é só do app.",
    },
  ],
  realWorldExample:
    "As APIs de modelos passaram a aceitar servidores MCP direto na requisição: a Anthropic oferece um conector MCP na API Messages e a OpenAI aceita servidores MCP remotos como tipo de ferramenta na Responses API. Mesmo nesses casos, o modelo continua pedindo ferramentas pelo mesmo mecanismo de tool use; quem fala MCP com o servidor é a plataforma, no papel de host.",
  code: {
    language: "json",
    source: `{
  "mcp_tools_list_item": {
    "name": "buscar_pedido",
    "description": "Consulta o status e a previsão de entrega de um pedido pelo número.",
    "inputSchema": {
      "type": "object",
      "properties": { "numero": { "type": "string", "description": "Número do pedido, só dígitos" } },
      "required": ["numero"]
    }
  },
  "anthropic_tools_param": {
    "name": "loja__buscar_pedido",
    "description": "Consulta o status e a previsão de entrega de um pedido pelo número.",
    "input_schema": {
      "type": "object",
      "properties": { "numero": { "type": "string", "description": "Número do pedido, só dígitos" } },
      "required": ["numero"]
    }
  }
}`,
    caption: "A mesma ferramenta como item do tools/list do MCP e como tool da API Messages da Anthropic: o schema é idêntico, e o host só renomeia com o prefixo do servidor.",
  },
  tradeOffs: {
    pros: [
      "Function calling direto: menos peças, menor latência, tudo no código do app",
      "MCP: ferramentas reaproveitadas por vários hosts e mantidas por quem conhece o sistema",
      "Os dois combinam: funções locais e servidores MCP na mesma lista de tools",
    ],
    cons: [
      "Function calling direto: cada app reimplementa as mesmas integrações",
      "MCP: mais um serviço para operar, autenticar, versionar e monitorar",
      "MCP traz servidores de terceiros e, com eles, novos riscos de segurança",
    ],
    alternatives: ["Conectores MCP das próprias APIs de modelos, em que a plataforma faz o papel de host", "Workflows sem LLM, quando a sequência de chamadas é fixa"],
  },
  knowledgeCheck: [
    {
      id: "replace",
      prompt: "Um colega diz: “Agora que usamos MCP, não precisamos mais de function calling”. O que está errado?",
      options: [
        "Nada, MCP substitui function calling",
        "O modelo continua pedindo ferramentas por function calling; MCP só define como o host descobre e chama ferramentas de servidores externos",
        "MCP só funciona com modelos sem function calling",
        "Function calling é usado apenas para recursos",
      ],
      correct: 1,
      explanation: "São camadas diferentes. As ferramentas MCP chegam ao modelo como tools comuns, e o modelo as pede por function calling; o host então faz o tools/call no servidor.",
      lesson: "13-14",
    },
    {
      id: "choose",
      prompt: "Um app interno tem uma ferramenta que reordena os painéis da própria interface do usuário. Ninguém mais vai usá-la. Onde ela deve morar?",
      options: [
        "Num servidor MCP remoto com OAuth",
        "Como função local declarada na chamada da API, porque depende do estado do app e não há reuso",
        "Num servidor MCP stdio",
        "Num prompt MCP",
      ],
      correct: 1,
      explanation: "Sem reuso, sem fornecedor e acoplada ao estado interno do app, a ferramenta não ganha nada com a camada extra do MCP. Função local resolve com menos peças.",
      lesson: "13-14",
    },
  ],
  related: ["13-13", "05-10", "14-08"],
  references: [
    { title: "MCP: Architecture overview", url: "https://modelcontextprotocol.io/docs/learn/architecture", kind: "docs" },
    { title: "Anthropic: Tool use with Claude", url: "https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview", kind: "docs" },
    { title: "OpenAI: Function calling", url: "https://developers.openai.com/api/docs/guides/function-calling", kind: "docs" },
  ],
};

export default lesson;
