import type { LessonContent } from "../../../types/content";

// Uma ferramenta MCP por dentro, com contas no arquivo: a definição de create_issue, quantos tokens cada
// campo dela custa (4 caracteres por token), os valores padrão das anotações quando o servidor não as
// declara, e o tamanho do mesmo resultado em texto, em structuredContent e nos dois. Campos e padrões
// seguem a revisão 2026-07-28 da especificação.

const SPEC = "2026-07-28";
const estimateTokens = (text: string) => Math.ceil(text.length / 4);
const integer = (value: number) => value.toLocaleString("pt-BR");

const definition = {
  name: "create_issue",
  title: "Criar issue",
  description: "Cria uma issue num repositório. Use só depois de confirmar o título e o corpo com o usuário.",
  inputSchema: {
    type: "object",
    properties: {
      repo: { type: "string", description: "Repositório no formato dono/nome, ex.: acme/api" },
      title: { type: "string", description: "Título curto da issue" },
      body: { type: "string", description: "Descrição em Markdown" },
    },
    required: ["repo", "title"],
  },
  outputSchema: {
    type: "object",
    properties: { number: { type: "integer" }, url: { type: "string" } },
    required: ["number", "url"],
  },
  annotations: { destructiveHint: false, idempotentHint: false },
};

type Field = keyof typeof definition;
const fields: Field[] = ["name", "title", "description", "inputSchema", "outputSchema", "annotations"];
const fieldTokens = fields.map((field) => estimateTokens(JSON.stringify(definition[field])));
const definitionTokens = estimateTokens(JSON.stringify(definition));
const largestField = fields[fieldTokens.indexOf(Math.max(...fieldTokens))];
const largestShare = Math.max(...fieldTokens) / fieldTokens.reduce((sum, value) => sum + value, 0);
const normalized = (values: number[]) => values.map((value) => value / Math.max(...values));

// Padrões das anotações na especificação: valem quando o servidor não declara o campo.
const ANNOTATION_DEFAULTS = { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true };
type Annotations = Partial<typeof ANNOTATION_DEFAULTS>;
const effective = (annotations: Annotations) => ({ ...ANNOTATION_DEFAULTS, ...annotations });
const bare = effective({});
const createIssue = effective(definition.annotations);
const yesNo = (value: boolean) => (value ? "sim" : "não");

// O mesmo resultado em três formatos.
const result = { number: 4821, url: "https://github.com/acme/api/issues/4821" };
const textOnly = JSON.stringify({ content: [{ type: "text", text: `Issue #${result.number} criada: ${result.url}` }] });
const structuredOnly = JSON.stringify({ content: [], structuredContent: result });
const both = JSON.stringify({ content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result });
const formatSeries = [
  { label: "só texto", value: estimateTokens(textOnly) },
  { label: "só structured", value: estimateTokens(structuredOnly) },
  { label: "os dois", value: estimateTokens(both) },
];

const UNKNOWN_TOOL_CODE = -32602;
const badDate = "Data inválida: use AAAA-MM-DD, ex.: 2026-05-14";

const lesson: LessonContent = {
  id: "13-05",
  subtitle: "Como um servidor descreve uma ferramenta, o que as anotações prometem (e não prometem) e os dois jeitos de uma chamada dar errado.",
  objectives: [
    "Ler a definição de uma ferramenta MCP: nome, descrição, inputSchema e outputSchema",
    "Aplicar os valores padrão das anotações e saber por que elas são só dicas",
    "Separar erro de protocolo de erro de execução (isError)",
    "Escolher entre resultado em texto e structuredContent",
  ],
  steps: [
    {
      id: "menu",
      shortTitle: "O cardápio",
      title: "Uma ferramenta é um item do cardápio",
      tag: "context",
      body: [
        "Num restaurante, o cardápio diz o nome do prato, o que vem nele e o que você precisa escolher (ponto da carne, acompanhamento). Quem cozinha é a cozinha, não você. Uma [[ferramenta MCP|mcp-tool]] é um item do cardápio do servidor: o modelo lê a descrição, escolhe, e o servidor executa.",
        "Ferramentas são controladas pelo modelo: ele decide quando chamar com base na conversa. Mas a especificação recomenda que sempre haja uma pessoa capaz de negar a chamada, e que o host mostre quais ferramentas o modelo enxerga e quando uma é usada.",
      ],
      keyIdea: "O servidor descreve e executa; o modelo escolhe; o host pode barrar.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "tool",
            piece: "block-diagram",
            blocks: [
              { id: "llm", kind: "llm", label: "modelo escolhe", col: 0, row: 0.5 },
              { id: "host", kind: "laptop", label: "host", col: 1, row: 0.5 },
              { id: "server", kind: "tool", label: "create_issue", col: 2, row: 0.5 },
              { id: "api", kind: "cloud", label: "api do github", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "llm", to: "host", label: "pedido" },
              { from: "host", to: "server", label: "tools/call" },
              { from: "server", to: "api", label: "executa" },
            ],
            active: "server",
          },
        ],
      },
      alt: "O modelo escolhe a ferramenta, o host envia o tools/call ao servidor, cuja ferramenta create_issue, em destaque, executa a chamada na API do GitHub.",
    },
    {
      id: "anatomy",
      shortTitle: "Anatomia",
      title: "Os campos de uma definição",
      tag: "mechanism",
      body: [
        "A definição tem name (identificador único no servidor, até 128 caracteres de letras, dígitos, _, - e .), title (nome para a interface), description (o texto que o modelo lê para decidir), inputSchema (um [[JSON Schema|json-schema]] dos argumentos, obrigatório e com type object na raiz), outputSchema (opcional, o formato do resultado) e annotations.",
        `A definição de create_issue custa uns ${integer(definitionTokens)} tokens. O campo mais caro é ${largestField}, com ${Math.round(largestShare * 100)}% do total: os schemas pesam mais que o nome. Essa conta importa porque o host costuma enviar as definições ao modelo em toda chamada.`,
      ],
      keyIdea: "Nome identifica, descrição convence, schema restringe; e tudo isso vira tokens no contexto.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "fields",
            piece: "token-stream",
            tokens: fields,
            bars: normalized(fieldTokens),
            query: fields.indexOf(largestField),
            color: "module-13",
          },
        ],
      },
      alt: `Os campos da definição com barras do custo em tokens: ${fields.map((field, index) => `${field}, ${fieldTokens[index]}`).join("; ")}. O mais caro é ${largestField}.`,
    },
    {
      id: "annotations",
      shortTitle: "Anotações",
      title: "Anotações: dicas, não garantias",
      tag: "mechanism",
      body: [
        "Uma etiqueta “frágil” na caixa ajuda quem carrega, mas não prova o que tem dentro. As [[anotações|tool-annotations]] são etiquetas assim: readOnlyHint (não altera nada), destructiveHint (pode apagar ou sobrescrever), idempotentHint (repetir não muda o efeito) e openWorldHint (fala com o mundo externo).",
        `O detalhe que pega: quando o servidor não declara nada, valem os padrões da especificação, e eles são pessimistas. Uma ferramenta sem anotações conta como readOnly ${yesNo(bare.readOnlyHint)}, destrutiva ${yesNo(bare.destructiveHint)}, idempotente ${yesNo(bare.idempotentHint)} e de mundo aberto ${yesNo(bare.openWorldHint)}. E o cliente deve tratar anotações de servidor não confiável como não confiáveis: nunca libere uma ação só porque o servidor disse readOnlyHint.`,
      ],
      keyIdea: "Sem anotação, assuma o pior: destrutiva e de mundo aberto. Com anotação, confie só em servidor confiável.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "hints",
            piece: "metrics-panel",
            metrics: [
              { id: "read", label: "readOnlyHint (padrão)", value: yesNo(bare.readOnlyHint) },
              { id: "destructive", label: "destructiveHint (padrão)", value: yesNo(bare.destructiveHint), color: "danger" },
              { id: "idempotent", label: "idempotentHint (padrão)", value: yesNo(bare.idempotentHint) },
              { id: "open", label: "openWorldHint (padrão)", value: yesNo(bare.openWorldHint), color: "danger" },
              { id: "create", label: "create_issue: destrutiva?", value: yesNo(createIssue.destructiveHint), color: "success" },
            ],
            highlight: "destructive",
          },
        ],
      },
      alt: `Padrões das anotações: readOnlyHint ${yesNo(bare.readOnlyHint)}, destructiveHint ${yesNo(bare.destructiveHint)}, idempotentHint ${yesNo(bare.idempotentHint)}, openWorldHint ${yesNo(bare.openWorldHint)}; create_issue declara destructiveHint ${yesNo(createIssue.destructiveHint)}.`,
    },
    {
      id: "errors",
      shortTitle: "Dois erros",
      title: "Erro de protocolo e erro de execução",
      tag: "example",
      body: [
        `Há dois jeitos de dar errado. Se o host pede uma ferramenta que não existe ou manda um pedido malformado, o servidor responde com um erro JSON-RPC, como o código ${UNKNOWN_TOOL_CODE}: é um erro de protocolo, que o modelo dificilmente conserta. Se a ferramenta roda e falha (API fora do ar, data no formato errado), o servidor devolve um resultado normal com isError: true e um texto que explica o problema.`,
        `A especificação pede que o cliente entregue os erros de execução ao modelo, para ele se corrigir. Um texto como “${badDate}” vira uma observação útil, e a próxima chamada sai certa. É o mesmo princípio do [[tool result|tool-result]] com erro acionável que você viu no módulo de agentes.`,
      ],
      keyIdea: "Ferramenta inexistente: erro JSON-RPC. Ferramenta que falhou: resultado com isError e um texto que ensina a corrigir.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "tool",
            piece: "block-diagram",
            blocks: [
              { id: "host", kind: "laptop", label: "host", col: 0, row: 0.5 },
              { id: "server", kind: "tool", label: "servidor", col: 1.5, row: 0.5 },
              { id: "exec", kind: "answer", label: "isError: true", col: 3, row: 0 },
              { id: "protocol", kind: "no-result", label: `erro ${UNKNOWN_TOOL_CODE}`, col: 3, row: 1 },
            ],
            edges: [
              { from: "host", to: "server", label: "tools/call" },
              { from: "server", to: "exec", label: "falhou ao executar" },
              { from: "server", to: "protocol", label: "ferramenta não existe", variant: "alternative" },
            ],
            active: "exec",
            done: ["host", "server"],
          },
        ],
      },
      alt: `O host chama o servidor; se a execução falha, volta um resultado com isError true, em destaque, que o modelo lê; se a ferramenta não existe, o caminho tracejado leva a um erro JSON-RPC ${UNKNOWN_TOOL_CODE}.`,
    },
    {
      id: "structured",
      shortTitle: "Formato",
      title: "Texto ou structuredContent",
      tag: "tradeoff",
      body: [
        "O resultado vem num array content, com blocos de texto, imagem, áudio, link para recurso ou recurso embutido. Se a ferramenta declara outputSchema, o servidor também deve devolver [[structuredContent|structured-content]], um JSON que segue o schema e que o cliente pode validar e usar em código.",
        `Para compatibilidade, a especificação recomenda devolver o JSON serializado também num bloco de texto. Na conta da cena, o mesmo resultado custa ${formatSeries.map((item) => `${item.value} tokens ${item.label === "os dois" ? "nos dois formatos" : item.label}`).join(", ")}. Não confunda com [[structured output|structured-output]]: aquele é o modelo gerando JSON preso a um schema; este é o servidor devolvendo dados.`,
      ],
      keyIdea: "outputSchema + structuredContent dão um contrato verificável; repetir em texto mantém clientes antigos funcionando.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "formats",
            piece: "chart",
            kind: "bar",
            series: formatSeries,
            highlight: 2,
            color: "module-13",
          },
        ],
      },
      alt: `Tokens do mesmo resultado em cada formato: ${formatSeries.map((item) => `${item.label}, ${item.value}`).join("; ")}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Uma boa ferramenta MCP",
      tag: "summary",
      body: [
        "Nome único e estável, descrição que diz quando usar, inputSchema estrito, outputSchema quando o resultado é dado, anotações honestas e erros de execução que explicam como corrigir.",
        "Ferramentas agem. A próxima aula trata dos recursos, que só informam, e de quem decide o que entra no contexto.",
      ],
      keyIdea: "Cardápio claro, contrato estrito, erro que ensina.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "checklist",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "name", label: "name único" },
              { id: "description", label: "description: quando usar" },
              { id: "input", label: "inputSchema estrito", color: "module-13" },
              { id: "output", label: "outputSchema + structuredContent" },
              { id: "hints", label: "anotações são só dicas", color: "danger" },
              { id: "errors", label: "isError com texto acionável" },
            ],
          },
        ],
      },
      alt: "Checklist em chips: name único, description que diz quando usar, inputSchema estrito, outputSchema com structuredContent, anotações são só dicas, isError com texto acionável.",
    },
  ],
  realWorldExample: `O tutorial oficial do MCP constrói um servidor de previsão do tempo com duas ferramentas, get_alerts e get_forecast, sobre a API do serviço meteorológico dos EUA. Quando a API não responde, as ferramentas devolvem um resultado com isError: true e um texto explicando a falha, em vez de derrubar a conexão, como pede a revisão ${SPEC}.`,
  code: {
    language: "typescript",
    source: `import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";

declare function searchIssues(repo: string, query: string, limit: number): Promise<{ number: number; title: string }[]>;

function createServer() {
  const server = new McpServer({ name: "issues", version: "1.0.0" });

  server.registerTool(
    "search_issues",
    {
      description: "Busca issues abertas de um repositório pelo texto do título. Devolve no máximo 20.",
      inputSchema: z.object({
        repo: z.string().describe("Repositório no formato dono/nome, ex.: acme/api"),
        query: z.string().min(2).describe("Texto a procurar no título"),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ repo, query }) => {
      const issues = await searchIssues(repo, query, 20);
      const text = issues.map((issue) => \`#\${issue.number} \${issue.title}\`).join("\\n");
      return { content: [{ type: "text", text: text || \`Nenhuma issue com "\${query}" em \${repo}.\` }] };
    },
  );

  return server;
}

serveStdio(createServer, { onerror: (error) => console.error(error) });`,
    caption: "Uma ferramenta com o SDK oficial de TypeScript, no formato do tutorial atual: schema em zod, anotação de leitura, resultado limitado a 20 itens e logs em stderr.",
  },
  tradeOffs: {
    pros: [
      "Definições autodescritivas: o host descobre e mostra as ferramentas sem código específico",
      "outputSchema dá um contrato que o cliente pode validar",
      "isError separa falhas de negócio de falhas de protocolo e permite autocorreção",
    ],
    cons: [
      "Cada definição custa tokens em toda chamada ao modelo",
      "Anotações e descrições vêm do servidor e podem mentir",
      "Ferramentas executam código arbitrário: o servidor precisa validar entradas e limitar uso",
    ],
    alternatives: ["Recursos, quando o servidor só precisa oferecer dados para leitura", "Prompts, quando o objetivo é um roteiro que o usuário escolhe"],
  },
  knowledgeCheck: [
    {
      id: "no-annotations",
      prompt: "Um servidor de terceiros expõe delete_branch sem nenhuma anotação. Como o host deve tratar essa ferramenta?",
      options: [
        "Como somente leitura, porque nada foi declarado",
        "Como possivelmente destrutiva e de mundo aberto, que são os padrões, e pedir confirmação antes de executar",
        "Como idempotente, para poder repetir à vontade",
        "Ignorar a ferramenta, porque anotações são obrigatórias",
      ],
      correct: 1,
      explanation: "Sem anotações, valem os padrões da especificação: readOnlyHint false, destructiveHint true, openWorldHint true. E, como o servidor não é confiável, nem anotações declaradas bastariam para liberar a ação.",
      lesson: "13-05",
    },
    {
      id: "error-kind",
      prompt: "A ferramenta book_flight recebe a data “amanhã” e não consegue interpretá-la. Como o servidor deve responder?",
      options: [
        "Com um erro JSON-RPC -32602, como se a ferramenta não existisse",
        "Com um resultado com isError: true e um texto que explica o formato esperado",
        "Fechando a conexão",
        "Com um resultado vazio sem erro",
      ],
      correct: 1,
      explanation: "A ferramenta existe e o pedido está bem formado; falhou a validação do valor. Isso é erro de execução: resultado com isError e mensagem acionável, que o modelo usa para corrigir a próxima chamada.",
      lesson: "13-05",
    },
  ],
  related: ["13-04", "13-06", "12-05"],
  references: [
    { title: "MCP Specification 2026-07-28: Tools", url: "https://modelcontextprotocol.io/specification/2026-07-28/server/tools", kind: "docs" },
    { title: "MCP: Build an MCP server", url: "https://modelcontextprotocol.io/docs/develop/build-server", kind: "docs" },
    { title: "MCP TypeScript SDK", url: "https://github.com/modelcontextprotocol/typescript-sdk", kind: "repo" },
  ],
};

export default lesson;
