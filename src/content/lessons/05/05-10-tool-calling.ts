import type { LessonContent } from "../../../types/content";

// Tool calling com contas no arquivo: as definições de três ferramentas de uma loja, com o custo estimado
// em tokens (4 caracteres por token) que elas somam em toda requisição, e a troca de mensagens de uma
// chamada completa entre usuário, app, modelo e banco.

const estimateTokens = (text: string) => Math.ceil(text.length / 4);
const integer = (value: number) => value.toLocaleString("pt-BR");

interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string }>;
  dangerous: boolean;
}

const tools: ToolDefinition[] = [
  {
    name: "buscar_pedido",
    description: "Busca o status e a data prevista de entrega de um pedido pelo número.",
    parameters: { numero: { type: "string", description: "Número do pedido, só dígitos." } },
    dangerous: false,
  },
  {
    name: "calcular_frete",
    description: "Calcula o preço e o prazo do frete para um CEP e um peso.",
    parameters: {
      cep: { type: "string", description: "CEP de destino, 8 dígitos." },
      peso_kg: { type: "number", description: "Peso total em quilos." },
    },
    dangerous: false,
  },
  {
    name: "cancelar_pedido",
    description: "Cancela um pedido ainda não enviado e inicia o reembolso.",
    parameters: { numero: { type: "string", description: "Número do pedido, só dígitos." } },
    dangerous: true,
  },
];

const asJson = (tool: ToolDefinition) =>
  JSON.stringify({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: { type: "object", properties: tool.parameters, required: Object.keys(tool.parameters), additionalProperties: false },
    },
  });
const toolTokens = tools.map((tool) => estimateTokens(asJson(tool)));
const allToolTokens = toolTokens.reduce((sum, value) => sum + value, 0);
const REQUESTS_PER_DAY = 50_000;
const dailyToolTokens = allToolTokens * REQUESTS_PER_DAY;
const dangerousTools = tools.filter((tool) => tool.dangerous).map((tool) => tool.name);

// Passo 2: a definição de uma ferramenta, parte por parte.
const definitionParts = ["name", "buscar_pedido", "description", "Busca o status…", "parameters", "numero: string", "required"];
const NAME = 1;
const DESCRIPTION = 3;

// Passo 3 e 4: a chamada que o modelo devolve e a troca de mensagens.
const ORDER = "4821";
const call = { name: tools[0].name, arguments: JSON.stringify({ numero: ORDER }) };
const callText = `${call.name}("${(JSON.parse(call.arguments) as { numero: string }).numero}")`;
const messages = [
  { from: "user", to: "app", label: "pergunta" },
  { from: "app", to: "model", label: "msgs + tools" },
  { from: "model", to: "app", label: "tool_call" },
  { from: "app", to: "db", label: "consulta" },
  { from: "db", to: "app", label: "status" },
  { from: "app", to: "model", label: "resultado" },
  { from: "model", to: "app", label: "resposta" },
  { from: "app", to: "user", label: "resposta" },
];
const nodeNames: Record<string, string> = { user: "cliente", app: "app", model: "llm", db: "banco" };
const TOOL_CALL = messages.findIndex((message) => message.label === "tool_call");
const modelCalls = messages.filter((message) => message.to === "model").length;

const lesson: LessonContent = {
  id: "05-10",
  subtitle: "Como o modelo pede ações em JSON, o app executa e devolve o resultado, e o que validar antes de deixar uma ferramenta agir no mundo.",
  objectives: [
    "Explicar a divisão de trabalho: o modelo escolhe a ferramenta, o app executa",
    "Escrever a definição de uma ferramenta com nome, descrição e schema de parâmetros",
    "Seguir a troca de mensagens de uma chamada completa",
    "Proteger ferramentas perigosas com validação, permissões mínimas e confirmação humana",
  ],
  steps: [
    {
      id: "asks",
      shortTitle: "Pedir ação",
      title: "O modelo pede, o app executa",
      tag: "context",
      body: [
        "Um assistente de loja não sabe onde está o pedido 4821: isso está no banco de dados, não nos pesos. Ele também não consegue consultar o banco, porque só produz texto. A solução é a mesma de um gerente com uma secretária: ele escreve num bilhete “consulte o pedido 4821”, ela faz a consulta e traz a resposta.",
        "No [[tool calling|tool-calling]], o app descreve as ferramentas disponíveis na requisição. Quando precisa de uma, o modelo não responde em texto: devolve o nome da ferramenta e os argumentos em JSON. Quem executa é o app, com o código e as permissões dele. O modelo nunca toca no banco.",
      ],
      keyIdea: "O modelo só escreve o pedido de ação em JSON; o app decide se executa e executa.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "cliente", col: 0, row: 0 },
              { id: "app", kind: "app", label: "app", col: 1, row: 0 },
              { id: "llm", kind: "llm", label: "llm", col: 2, row: 0 },
              { id: "call", kind: "nosql-db", label: "tool_call json", col: 3, row: 0 },
              { id: "tool", kind: "tool", label: "buscar_pedido", col: 1, row: 1 },
              { id: "db", kind: "sql-db", label: "pedidos", col: 2, row: 1 },
            ],
            edges: [
              { from: "user", to: "app", label: "cadê meu pedido?" },
              { from: "app", to: "llm", label: "+ tools" },
              { from: "llm", to: "call", label: "pede" },
              { from: "app", to: "tool", label: "executa" },
              { from: "tool", to: "db" },
            ],
            active: "call",
          },
        ],
      },
      alt: "O cliente pergunta pelo pedido; o app manda a pergunta e as ferramentas ao LLM, que devolve um tool_call em JSON, em destaque; quem executa a ferramenta buscar_pedido no banco de pedidos é o app.",
    },
    {
      id: "definition",
      shortTitle: "Definição",
      title: "Nome, descrição e parâmetros",
      tag: "mechanism",
      body: [
        "Cada ferramenta é declarada com três coisas: um nome, uma descrição em linguagem natural e um [[JSON Schema|json-schema]] dos parâmetros. O modelo escolhe a ferramenta lendo a descrição, então a descrição é um prompt: diz para que serve, quando usar e o formato de cada argumento (“só dígitos”, “8 dígitos”).",
        `As definições entram no contexto de toda requisição. As ${tools.length} ferramentas da aula somam cerca de ${allToolTokens} tokens (${toolTokens.join(", ")}). Em ${integer(REQUESTS_PER_DAY)} requisições por dia, são ${integer(dailyToolTokens)} tokens só de definições. Dezenas de ferramentas custam caro e confundem a escolha: ofereça só as que a tarefa precisa.`,
      ],
      keyIdea: "A descrição da ferramenta é um prompt; as definições custam tokens em toda requisição.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "definition",
            piece: "token-stream",
            tokens: definitionParts,
            keys: [NAME, DESCRIPTION],
            bars: definitionParts.map((_, index) => (index === NAME || index === DESCRIPTION ? 1 : 0.4)),
            color: "module-05",
          },
        ],
      },
      alt: "A definição da ferramenta em partes: name, buscar_pedido, description, o texto da descrição, parameters, numero do tipo string e required. O nome e a descrição, em destaque, são o que o modelo lê para escolher.",
    },
    {
      id: "loop",
      shortTitle: "O ciclo",
      title: "Decidir, executar, observar, responder",
      tag: "mechanism",
      body: [
        `Recebida a pergunta, o modelo decide: responder direto ou chamar uma ferramenta. Aqui ele devolve ${callText}. O app valida os argumentos contra o schema, executa e devolve o resultado numa mensagem do papel tool, ligada à chamada pelo id. Com o resultado no contexto, o modelo escreve a resposta final ou pede outra ferramenta.`,
        "Esse ciclo pode repetir: o modelo pode precisar consultar o pedido e depois calcular o frete de uma troca. Muitas APIs aceitam várias chamadas em paralelo numa resposta, e o parâmetro tool_choice controla se o modelo pode, deve ou não pode chamar ferramentas. Quando o próprio modelo conduz o ciclo por vários passos até cumprir um objetivo, temos um [[agente|agent]], tema do módulo 12.",
      ],
      keyIdea: "Chamar, executar, devolver o resultado como tool, repetir até a resposta: é o embrião de um agente.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "loop",
            piece: "agent-loop",
            phases: [
              { id: "decide", label: "modelo decide" },
              { id: "execute", label: "app executa" },
              { id: "observe", label: "resultado como tool" },
              { id: "answer", label: "responde ou repete" },
            ],
            active: "execute",
            iteration: 1,
            maxIterations: 5,
            tool: callText,
          },
        ],
      },
      alt: `Ciclo de quatro fases: o modelo decide, o app executa, em destaque, o resultado volta como mensagem tool, e o modelo responde ou repete. Na iteração 1 de 5, a ferramenta chamada é ${callText}.`,
    },
    {
      id: "messages",
      shortTitle: "Mensagens",
      title: `${messages.length} mensagens, ${modelCalls} chamadas ao modelo`,
      tag: "example",
      body: [
        `Uma pergunta simples gera ${messages.length} mensagens entre as partes. O modelo é chamado ${modelCalls} vezes: uma para decidir a ferramenta e outra para escrever a resposta com o resultado. Na segunda chamada, o histórico inteiro vai de novo, com a chamada e o resultado, como você viu na aula de papéis.`,
        "Isso tem custo de latência: duas idas ao modelo mais a consulta ao banco antes de o cliente ver qualquer coisa. Por isso vale mostrar um “consultando seu pedido...” enquanto a ferramenta roda, e evitar ferramentas que demoram sem necessidade. Cada iteração a mais no ciclo soma outra chamada ao modelo.",
      ],
      keyIdea: "Cada ferramenta usada custa pelo menos mais uma chamada ao modelo, com o histórico reenviado.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "exchange",
            piece: "client-server",
            nodes: [
              { id: "user", label: "cliente", role: "client" },
              { id: "app", label: "app", role: "server" },
              { id: "model", label: "llm", role: "model" },
              { id: "db", label: "pedidos", role: "database" },
            ],
            messages,
            active: TOOL_CALL,
          },
        ],
      },
      alt: `Troca de ${messages.length} mensagens: ${messages.map((message) => `${nodeNames[message.from]} para ${nodeNames[message.to]}, ${message.label}`).join("; ")}. A mensagem em trânsito é o tool_call do modelo para o app.`,
    },
    {
      id: "safety",
      shortTitle: "Segurança",
      title: "O app é o porteiro",
      tag: "tradeoff",
      body: [
        `Os argumentos vêm de um modelo, que pode errar ou ser manipulado por um texto malicioso no contexto. Trate-os como entrada de usuário: valide contra o schema, confira se o pedido pertence ao cliente logado e aplique as permissões no código. Ferramentas que mudam o mundo, como ${dangerousTools.join(", ")}, pedem confirmação explícita do cliente antes de executar.`,
        "A regra geral é a do menor privilégio: cada ferramenta faz só o necessário, com credenciais só para isso. Uma ferramenta “executar_sql” genérica é muito mais perigosa que “buscar_pedido(numero)”. A próxima aula mostra como um texto no contexto pode induzir o modelo a chamar a ferramenta errada, e por que essas barreiras no código são indispensáveis.",
      ],
      keyIdea: "Argumentos de ferramenta são entrada não confiável: valide, aplique permissões no código e confirme ações irreversíveis.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "llm", kind: "llm", label: "llm", col: 0, row: 0.5 },
              { id: "guard", kind: "guardrail", label: "valida + permissão", col: 1, row: 0.5 },
              { id: "read", kind: "tool", label: "buscar_pedido", col: 2, row: 0 },
              { id: "human", kind: "user", label: "cliente confirma", col: 2, row: 1 },
              { id: "cancel", kind: "tool", label: "cancelar_pedido", col: 3, row: 1 },
            ],
            edges: [
              { from: "llm", to: "guard", label: "tool_call" },
              { from: "guard", to: "read", label: "leitura" },
              { from: "guard", to: "human", label: "ação irreversível" },
              { from: "human", to: "cancel", label: "sim" },
              { from: "llm", to: "cancel", label: "direto: nunca", variant: "alternative" },
            ],
            active: "guard",
          },
        ],
      },
      alt: "O tool_call do LLM passa por validação e permissões, em destaque: leituras como buscar_pedido seguem direto; ações irreversíveis como cancelar_pedido só depois da confirmação do cliente. O caminho tracejado do LLM direto para o cancelamento é proibido.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "O modelo como roteador de ações",
      tag: "summary",
      body: [
        "Com tool calling, o modelo vira um roteador: lê a pergunta e as descrições, escolhe a ferramenta e preenche os argumentos. O app executa, valida e devolve o resultado. Descrições claras, poucas ferramentas por requisição e barreiras no código são o que tornam isso confiável.",
        "Dar ferramentas ao modelo também cria uma superfície de ataque: qualquer texto que entra no contexto pode tentar redirecionar essas escolhas. A próxima aula trata disso: prompt injection e segurança.",
      ],
      keyIdea: "Tool calling = o modelo escolhe e preenche; o código executa, valida e decide.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "router",
            piece: "graph",
            nodes: [
              { id: "question", label: "“cadê meu pedido?”", x: 0.1, y: 0.5 },
              { id: "llm", label: "llm escolhe", x: 0.38, y: 0.5, color: "module-05" },
              { id: "t0", label: tools[0].name, x: 0.75, y: 0.15, color: "success" },
              { id: "t1", label: tools[1].name, x: 0.75, y: 0.5 },
              { id: "t2", label: tools[2].name, x: 0.75, y: 0.85, color: "danger" },
            ],
            edges: [
              { from: "question", to: "llm" },
              { from: "llm", to: "t0", label: `{"numero": "${ORDER}"}` },
              { from: "llm", to: "t1" },
              { from: "llm", to: "t2", label: "exige confirmação" },
            ],
            path: ["question", "llm", "t0"],
          },
        ],
      },
      alt: `A pergunta “cadê meu pedido?” chega ao LLM, que escolhe entre ${tools.map((tool) => tool.name).join(", ")}; o caminho em destaque vai para ${tools[0].name} com o número ${ORDER}, e ${tools[2].name} exige confirmação.`,
    },
  ],
  realWorldExample:
    "A OpenAI lançou function calling na API em junho de 2023, nos modelos gpt-3.5-turbo-0613 e gpt-4-0613, e hoje Anthropic, Google e os principais modelos abertos oferecem o mesmo recurso com nome, descrição e JSON Schema. O Model Context Protocol, tema do módulo 13, padroniza como apps descobrem e expõem essas ferramentas.",
  code: {
    language: "json",
    source: `{
  "type": "function",
  "function": {
    "name": "buscar_pedido",
    "description": "Busca o status e a data prevista de entrega de um pedido pelo número.",
    "strict": true,
    "parameters": {
      "type": "object",
      "properties": {
        "numero": { "type": "string", "description": "Número do pedido, só dígitos." }
      },
      "required": ["numero"],
      "additionalProperties": false
    }
  }
}`,
    caption: "Definição de ferramenta no formato da API da OpenAI: nome, descrição que o modelo lê para escolher e schema estrito dos parâmetros.",
  },
  tradeOffs: {
    pros: [
      "O modelo acessa dados e ações que não estão nos pesos",
      "Argumentos em JSON com schema são fáceis de validar",
      "O app mantém o controle: decide o que executar e com que permissão",
    ],
    cons: [
      "Definições custam tokens em toda requisição",
      "Cada ferramenta usada soma pelo menos uma chamada ao modelo",
      "Argumentos podem vir errados ou manipulados e precisam de validação",
    ],
    alternatives: ["RAG, quando a necessidade é só ler documentos", "Fluxo fixo no código, quando a ferramenta é sempre a mesma e o modelo não precisa escolher"],
  },
  knowledgeCheck: [
    {
      id: "who-executes",
      prompt: "No tool calling, o modelo devolve {\"name\": \"cancelar_pedido\", \"arguments\": {\"numero\": \"4821\"}}. O que acontece em seguida?",
      options: [
        "O modelo cancela o pedido no banco",
        "O app recebe o pedido de chamada, valida e decide se executa, aqui pedindo confirmação por ser irreversível",
        "O provedor da API cancela o pedido",
        "Nada: o JSON é mostrado ao cliente",
      ],
      correct: 1,
      explanation: "O modelo só produz o pedido. Quem executa é o app, que valida argumentos, aplica permissões e, para ações irreversíveis, pede confirmação.",
      lesson: "05-10",
    },
    {
      id: "wrong-tool",
      prompt: "O modelo chama calcular_frete quando o cliente pergunta do status do pedido. Qual é a primeira correção a tentar?",
      options: [
        "Treinar um modelo novo",
        "Melhorar as descrições das ferramentas, dizendo quando usar cada uma",
        "Remover os parâmetros",
        "Aumentar a temperatura",
      ],
      correct: 1,
      explanation: "O modelo escolhe pela descrição. Descrições ambíguas causam escolhas erradas; dizer para que serve e quando usar cada ferramenta costuma resolver.",
      lesson: "05-10",
    },
  ],
  related: ["05-08", "05-11", "12-05"],
  references: [
    { title: "OpenAI: Function calling", url: "https://platform.openai.com/docs/guides/function-calling", kind: "docs" },
    { title: "Anthropic: Tool use with Claude", url: "https://docs.claude.com/en/docs/agents-and-tools/tool-use/overview", kind: "docs" },
    { title: "Schick et al. (2023), Toolformer: Language Models Can Teach Themselves to Use Tools", url: "https://arxiv.org/abs/2302.04761", kind: "paper" },
  ],
};

export default lesson;
