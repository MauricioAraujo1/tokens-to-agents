import type { LessonContent } from "../../../types/content";

// Um servidor MCP de notas, do projeto ao teste, com contas no arquivo: o inputSchema que o SDK de Python
// gera a partir da assinatura da função, o tamanho do resultado conforme o limite pedido (4 caracteres por
// token) e o maior limite que cabe num orçamento de resposta. Métodos e regras seguem a revisão 2026-07-28.

const SPEC = "2026-07-28";
const estimateTokens = (text: string) => Math.ceil(text.length / 4);
const integer = (value: number) => value.toLocaleString("pt-BR");

// A assinatura buscar_notas(termo: str, limite: int = 5) vira um JSON Schema.
interface Param {
  name: string;
  pythonType: "str" | "int";
  description: string;
  defaultValue?: number;
}
const params: Param[] = [
  { name: "termo", pythonType: "str", description: "Texto a procurar" },
  { name: "limite", pythonType: "int", description: "Máximo de notas", defaultValue: 5 },
];
const JSON_TYPE: Record<Param["pythonType"], string> = { str: "string", int: "integer" };
const inputSchema = {
  type: "object",
  properties: Object.fromEntries(
    params.map((param) => [
      param.name,
      { type: JSON_TYPE[param.pythonType], description: param.description, ...(param.defaultValue === undefined ? {} : { default: param.defaultValue }) },
    ]),
  ),
  required: params.filter((param) => param.defaultValue === undefined).map((param) => param.name),
};
const schemaTokens = estimateTokens(JSON.stringify(inputSchema));
const requiredParams = inputSchema.required;

// O resultado cresce com o limite: cada acerto traz título e um trecho.
const sampleHit = "férias-2026: Plano de férias da equipe, com as datas de cada pessoa e quem cobre quem…";
const tokensPerHit = estimateTokens(sampleHit);
const RESPONSE_BUDGET = 1000;
const limits = [1, 5, 10, 20, 50];
const resultSeries = limits.map((limit) => ({ label: `limite ${limit}`, value: limit * tokensPerHit }));
const maxLimitInBudget = Math.floor(RESPONSE_BUDGET / tokensPerHit);
const LIMIT_CAP = 20;
const capFits = LIMIT_CAP * tokensPerHit <= RESPONSE_BUDGET;

const buildSteps = [
  { id: "design", label: "escolher primitivas" },
  { id: "signature", label: "assinatura + docstring" },
  { id: "schema", label: "inputSchema gerado" },
  { id: "list", label: "aparece no tools/list" },
];

const inspectorMessages = [
  { from: "inspector", to: "server", label: "server/discover" },
  { from: "inspector", to: "server", label: "tools/list" },
  { from: "inspector", to: "server", label: "tools/call buscar_notas" },
  { from: "server", to: "inspector", label: "result: 3 títulos" },
  { from: "inspector", to: "server", label: "resources/read notas://ferias" },
];

const lesson: LessonContent = {
  id: "13-12",
  subtitle: "Um servidor de notas do zero com o SDK oficial de Python: escolher primitivas, limitar resultados, respeitar o stdio, testar e publicar.",
  objectives: [
    "Decidir o que vira ferramenta e o que vira recurso num servidor",
    "Escrever uma ferramenta e um modelo de recurso com o SDK oficial de Python",
    "Limitar o tamanho dos resultados e validar entradas, como caminhos de arquivo",
    "Testar com o MCP Inspector e ligar o servidor a um host",
  ],
  steps: [
    {
      id: "plan",
      shortTitle: "Planejar",
      title: "O que o servidor vai oferecer",
      tag: "context",
      body: [
        "Antes de abrir uma loja, você decide o que fica na vitrine e o que só se entrega a pedido. O servidor de notas da aula guarda arquivos Markdown numa pasta e oferece duas coisas: buscar notas por um termo, que o modelo decide quando fazer, e ler uma nota inteira pelo título, que o host pode anexar ao contexto.",
        "A primeira vira uma [[ferramenta|mcp-tool]], buscar_notas; a segunda, um [[modelo de recurso|resource-template]], notas://{titulo}. O servidor roda localmente, iniciado pelo host via stdio, porque as notas estão na máquina do usuário e não precisam de rede.",
      ],
      keyIdea: "Busca que o modelo dispara: ferramenta. Conteúdo que o host anexa: recurso.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "server",
            piece: "block-diagram",
            blocks: [
              { id: "notes", kind: "documents", label: "~/notas/*.md", col: 0, row: 0.5 },
              { id: "server", kind: "tool", label: "servidor notas", col: 1, row: 0.5 },
              { id: "host", kind: "laptop", label: "host", col: 2, row: 0.5 },
              { id: "llm", kind: "llm", label: "modelo", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "notes", to: "server", label: "lê" },
              { from: "server", to: "host", label: "stdio" },
              { from: "host", to: "llm", label: "buscar_notas" },
            ],
            active: "server",
          },
        ],
      },
      alt: "As notas em Markdown ficam numa pasta lida pelo servidor de notas, em destaque, que fala com o host por stdio; o host oferece a ferramenta buscar_notas ao modelo.",
    },
    {
      id: "signature",
      shortTitle: "Assinatura",
      title: "A função vira a definição",
      tag: "mechanism",
      body: [
        "Com o SDK oficial de Python, você escreve uma função comum e a decora com @mcp.tool(). O SDK lê os type hints e a docstring e monta a definição: o nome da função vira o name, a docstring vira a description, e cada parâmetro vira uma propriedade do inputSchema.",
        `Para buscar_notas(termo: str, limite: int = 5), o schema gerado tem ${params.length} propriedades, com ${requiredParams.join(", ")} obrigatório e limite com default 5, e custa uns ${integer(schemaTokens)} tokens. Por isso a docstring merece cuidado: ela é a descrição que o modelo lê para decidir quando chamar.`,
      ],
      keyIdea: "Type hints viram schema; docstring vira descrição; e as duas coisas são o prompt da ferramenta.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "build",
            piece: "pipeline",
            stages: buildSteps,
            active: "schema",
            done: ["design", "signature"],
          },
        ],
      },
      alt: `Etapas: ${buildSteps.map((step) => step.label).join(", ")}. A etapa atual é o inputSchema gerado, com ${requiredParams.join(", ")} obrigatório e limite com default 5.`,
    },
    {
      id: "bounded",
      shortTitle: "Limitar",
      title: "Resultado com tamanho máximo",
      tag: "mechanism",
      body: [
        `Cada nota encontrada volta com título e trecho, uns ${integer(tokensPerHit)} tokens. O resultado cresce com o limite: ${resultSeries.map((item) => `${item.label}, ${integer(item.value)} tokens`).join("; ")}. Tudo isso entra no contexto do modelo.`,
        `Com um orçamento de ${integer(RESPONSE_BUDGET)} tokens por resposta, cabem até ${maxLimitInBudget} notas. O servidor da aula aceita limite até ${LIMIT_CAP}, que ${capFits ? "cabe no orçamento" : "passa do orçamento"}, e corta qualquer valor maior em vez de confiar no modelo. Para listas longas, devolva os primeiros itens e diga como pedir os próximos; e para arquivos inteiros, prefira o recurso, que o host lê quando decidir.`,
      ],
      keyIdea: "Todo resultado tem teto no servidor: o modelo não decide quanto texto despeja no contexto.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "sizes",
            piece: "chart",
            kind: "bar",
            series: resultSeries,
            cutoff: { mode: "threshold", value: RESPONSE_BUDGET, label: "orçamento" },
            highlight: limits.indexOf(LIMIT_CAP),
            color: "module-13",
          },
        ],
      },
      alt: `Tokens do resultado por limite: ${resultSeries.map((item) => `${item.label}, ${item.value}`).join("; ")}. A linha marca o orçamento de ${RESPONSE_BUDGET} tokens.`,
    },
    {
      id: "stdio",
      shortTitle: "stdout",
      title: "O canal das mensagens é sagrado",
      tag: "mechanism",
      body: [
        "No stdio, o stdout do processo é o fio por onde passam as mensagens JSON-RPC. Um print esquecido escreve texto solto nesse fio e quebra a conversa com o host. O tutorial oficial é taxativo: em servidores stdio, nada de print no stdout; logs vão para o stderr ou para um arquivo.",
        "O resto é higiene de servidor: validar entradas (o título vira caminho de arquivo, então o servidor confere que ele fica dentro da pasta de notas, contra travessia de diretório), devolver erros de execução com texto útil e sair quando o stdin fechar, que é o sinal de encerramento do host.",
      ],
      keyIdea: "Mensagens no stdout, logs no stderr, entradas validadas.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "server",
            piece: "block-diagram",
            blocks: [
              { id: "server", kind: "tool", label: "servidor notas", col: 0, row: 0.5 },
              { id: "stdout", kind: "queue", label: "stdout: json-rpc", col: 1.5, row: 0 },
              { id: "stderr", kind: "documents", label: "stderr: logs", col: 1.5, row: 1 },
              { id: "host", kind: "laptop", label: "host", col: 3, row: 0 },
            ],
            edges: [
              { from: "server", to: "stdout" },
              { from: "server", to: "stderr", label: "print(..., file=sys.stderr)" },
              { from: "stdout", to: "host", label: "uma linha por mensagem" },
            ],
            active: "stdout",
          },
        ],
      },
      alt: "O servidor de notas escreve mensagens JSON-RPC no stdout, em destaque, que chega ao host uma linha por mensagem; os logs vão para o stderr.",
    },
    {
      id: "inspector",
      shortTitle: "Testar",
      title: "Testar antes de ligar ao host",
      tag: "example",
      body: [
        "Antes de ligar o servidor a um app de chat, teste com o [[MCP Inspector|mcp-inspector]], a ferramenta oficial que se conecta ao servidor e deixa você chamar cada primitiva à mão. No SDK de Python, uv run mcp dev servidor.py abre o servidor no Inspector.",
        `A cena mostra uma sessão de teste: descobrir o servidor, listar as ferramentas, chamar buscar_notas e ler um recurso. Confira três coisas: a descrição e o schema que aparecem no tools/list, o formato do resultado, e o que acontece com entradas ruins (termo vazio, limite de 500, título com ../). Depois, ligue o servidor ao host com um bloco mcpServers que diz o comando para iniciá-lo.`,
      ],
      keyIdea: "Teste cada primitiva no Inspector, inclusive com entradas ruins, antes de entregar ao modelo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "session",
            piece: "client-server",
            nodes: [
              { id: "inspector", label: "mcp inspector", role: "client" },
              { id: "server", label: "servidor notas", role: "server", utilization: 0.3 },
            ],
            messages: inspectorMessages,
            active: 2,
          },
        ],
      },
      alt: `Sessão de teste no Inspector: ${inspectorMessages.map((message) => message.label).join(", ")}. A mensagem em trânsito é a chamada a buscar_notas.`,
    },
    {
      id: "ship",
      shortTitle: "Publicar",
      title: "Local ou remoto",
      tag: "tradeoff",
      body: [
        "Local via stdio é o caminho mais curto: sem porta aberta, sem login, com credenciais lidas de variáveis de ambiente. O custo é cada usuário instalar e atualizar o servidor na própria máquina, e o servidor rodar com os privilégios dele.",
        `Remoto via Streamable HTTP atende muitos usuários e se atualiza num lugar só, mas pede muito mais: autorização OAuth com validação de audiência, validação do Origin, limites de taxa e, na revisão ${SPEC}, nenhum estado escondido na conexão. Comece local; vá para remoto quando houver mais de um usuário ou dados que não podem morar na máquina de cada um.`,
      ],
      keyIdea: "Comece com stdio local; vá para HTTP remoto quando o servidor precisar servir muita gente.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "options",
            piece: "metrics-panel",
            metrics: [
              { id: "local", label: "local", value: "stdio + variáveis de ambiente", color: "success" },
              { id: "remote", label: "remoto", value: "Streamable HTTP + OAuth" },
              { id: "origin", label: "remoto exige", value: "Origin, TLS, limites de taxa", color: "danger" },
              { id: "state", label: `estado em ${SPEC}`, value: "só por identificador explícito" },
            ],
            highlight: "local",
          },
        ],
      },
      alt: `Painel: local usa stdio e variáveis de ambiente; remoto usa Streamable HTTP com OAuth e exige Origin, TLS e limites de taxa; em ${SPEC}, estado só por identificador explícito.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "O roteiro de um servidor",
      tag: "summary",
      body: [
        "Escolha as primitivas, escreva funções com type hints e docstrings claras, ponha teto nos resultados, valide entradas, mantenha o stdout limpo, teste no Inspector com entradas ruins e só então ligue ao host.",
        "Na próxima aula, o servidor entra num agente: como o loop do agente usa ferramentas MCP, aprovações e o código que encadeia chamadas.",
      ],
      keyIdea: "Primitivas certas, schema claro, teto, validação, stdout limpo, teste.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "recipe",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "primitives", label: "ferramenta ou recurso" },
              { id: "docstring", label: "docstring = descrição", color: "module-13" },
              { id: "cap", label: `limite até ${LIMIT_CAP}` },
              { id: "validate", label: "validar caminhos" },
              { id: "stderr", label: "logs no stderr" },
              { id: "inspector", label: "testar no Inspector", color: "brand" },
            ],
          },
        ],
      },
      alt: `Roteiro em chips: ferramenta ou recurso, docstring como descrição, limite até ${LIMIT_CAP}, validar caminhos, logs no stderr e testar no Inspector.`,
    },
  ],
  realWorldExample:
    "O tutorial oficial do MCP constrói o mesmo tipo de servidor: um servidor de previsão do tempo em Python, com as ferramentas get_alerts e get_forecast sobre a API do serviço meteorológico dos EUA, rodando por stdio e ligado ao Claude Desktop por um bloco mcpServers que chama uv run weather.py. O tutorial dedica uma seção inteira ao aviso de não escrever no stdout.",
  code: {
    language: "python",
    source: `import sys
from pathlib import Path

from mcp.server import MCPServer

NOTAS = (Path.home() / "notas").resolve()
LIMITE_MAXIMO = 20

mcp = MCPServer("notas")


@mcp.tool()
def buscar_notas(termo: str, limite: int = 5) -> list[str]:
    """Busca notas que contêm o termo. Devolve até \`limite\` títulos (no máximo 20)."""
    limite = max(1, min(limite, LIMITE_MAXIMO))
    titulos: list[str] = []
    for arquivo in sorted(NOTAS.glob("*.md")):
        if termo.lower() in arquivo.read_text(encoding="utf-8").lower():
            titulos.append(arquivo.stem)
            if len(titulos) == limite:
                break
    print(f"busca {termo!r}: {len(titulos)} notas", file=sys.stderr)
    return titulos


@mcp.resource("notas://{titulo}")
def ler_nota(titulo: str) -> str:
    """Conteúdo completo de uma nota pelo título."""
    caminho = (NOTAS / f"{titulo}.md").resolve()
    if caminho.parent != NOTAS:
        raise ValueError("título inválido")
    return caminho.read_text(encoding="utf-8")


if __name__ == "__main__":
    mcp.run(transport="stdio")`,
    caption: "O servidor de notas com o SDK oficial de Python: uma ferramenta com teto de resultados, um modelo de recurso que bloqueia travessia de diretório e logs no stderr.",
  },
  tradeOffs: {
    pros: [
      "O SDK gera schema e descrição a partir do código, sem JSON escrito à mão",
      "Um servidor local stdio não abre porta e não precisa de login",
      "O Inspector deixa testar cada primitiva sem depender de um modelo",
    ],
    cons: [
      "Docstrings e type hints viram contrato público: mudar quebra hosts",
      "A busca da aula lê todos os arquivos a cada chamada; pastas grandes pedem um índice",
      "Servidor local roda com os privilégios do usuário e precisa ser instalado em cada máquina",
    ],
    alternatives: ["O SDK oficial de TypeScript, com registerTool e schemas em zod", "Servidores prontos do repositório oficial, quando já existe um para o seu sistema"],
  },
  knowledgeCheck: [
    {
      id: "cap-limit",
      prompt: "Cada acerto de uma busca custa 40 tokens e o orçamento por resposta é de 1.000 tokens. O modelo pede limite = 200. O que o servidor deve fazer?",
      options: [
        "Devolver os 200, porque o modelo pediu",
        "Cortar no teto do servidor (no máximo 25 itens nesse orçamento) e dizer como pedir os próximos",
        "Responder com erro de protocolo",
        "Ignorar o limite e devolver tudo",
      ],
      correct: 1,
      explanation: "1.000 / 40 = 25 itens cabem no orçamento. O teto é responsabilidade do servidor: ele corta o valor pedido e, se houver mais resultados, explica como paginar.",
      lesson: "13-12",
    },
    {
      id: "traversal",
      prompt: "O recurso notas://{titulo} recebe titulo = \"../.ssh/id_rsa\". Qual é a defesa correta?",
      options: [
        "Confiar no host, que só manda títulos válidos",
        "Resolver o caminho e conferir que ele continua dentro da pasta de notas antes de ler",
        "Trocar o recurso por uma ferramenta",
        "Usar HTTP em vez de stdio",
      ],
      correct: 1,
      explanation: "A especificação manda o servidor validar URIs e sanitizar caminhos contra travessia de diretório. Resolver o caminho e checar a pasta-mãe bloqueia o ../.",
      lesson: "13-12",
    },
  ],
  related: ["13-11", "13-13", "13-05"],
  references: [
    { title: "MCP: Build an MCP server", url: "https://modelcontextprotocol.io/docs/develop/build-server", kind: "docs" },
    { title: "MCP Python SDK", url: "https://github.com/modelcontextprotocol/python-sdk", kind: "repo" },
    { title: "MCP Inspector", url: "https://github.com/modelcontextprotocol/inspector", kind: "repo" },
  ],
};

export default lesson;
