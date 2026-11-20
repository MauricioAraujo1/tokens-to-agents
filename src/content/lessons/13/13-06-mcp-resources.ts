import type { LessonContent } from "../../../types/content";

// Recursos MCP com contas no arquivo: um servidor de políticas internas lista seis recursos, cada um com
// tamanho estimado em tokens e prioridade (a anotação priority, de 0 a 1). O host enche um orçamento de
// contexto em ordem de prioridade e para no primeiro que não cabe. Um modelo de URI (RFC 6570, expansão
// simples) gera as URIs concretas. Métodos e códigos seguem a revisão 2026-07-28.

const SPEC = "2026-07-28";
const integer = (value: number) => value.toLocaleString("pt-BR");

interface Resource {
  uri: string;
  short: string;
  tokens: number;
  priority: number;
}

const resources: Resource[] = [
  { uri: "docs://politicas/ferias", short: "férias", tokens: 900, priority: 0.9 },
  { uri: "docs://politicas/reembolso", short: "reembolso", tokens: 1200, priority: 0.8 },
  { uri: "docs://politicas/home-office", short: "home office", tokens: 700, priority: 0.6 },
  { uri: "file:///manual/onboarding.md", short: "onboarding", tokens: 2600, priority: 0.5 },
  { uri: "db://rh/schema", short: "schema rh", tokens: 1500, priority: 0.4 },
  { uri: "docs://atas/2026-10", short: "ata out.", tokens: 1800, priority: 0.2 },
];

const BUDGET = 3000;
const byPriority = [...resources].sort((a, b) => b.priority - a.priority);
const selected: Resource[] = [];
let used = 0;
for (const resource of byPriority) {
  if (used + resource.tokens > BUDGET) break;
  selected.push(resource);
  used += resource.tokens;
}
const firstLeftOut = byPriority[selected.length];
const cutoffPriority = selected[selected.length - 1].priority;
const totalTokens = resources.reduce((sum, resource) => sum + resource.tokens, 0);
const prioritySeries = byPriority.map((resource) => ({ label: resource.short, value: Math.round(resource.priority * 100) }));

// Modelo de URI: expansão simples {var} da RFC 6570.
const TEMPLATE = "docs://politicas/{tema}";
const expand = (template: string, values: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (_, name: string) => encodeURIComponent(values[name] ?? ""));
const themes = ["ferias", "reembolso", "home-office"];
const expanded = themes.map((tema) => expand(TEMPLATE, { tema }));

// list e read: a lista traz metadados; o conteúdo só vem no read.
const listExchange = ["resources/list", `${resources.length} uris`, "resources/read", resources[0].uri, "contents", "text"];
const NOT_FOUND = -32602;
const OLD_NOT_FOUND = -32002;

const lesson: LessonContent = {
  id: "13-06",
  subtitle: "Dados que o servidor oferece para leitura, identificados por URI, e o host decidindo o que cabe no contexto.",
  objectives: [
    "Usar resources/list e resources/read e entender por que o conteúdo só vem no read",
    "Expandir um modelo de URI e saber quando usar templates",
    "Selecionar recursos por prioridade dentro de um orçamento de tokens",
    "Comparar recursos com ferramentas e acompanhar mudanças com assinaturas",
  ],
  steps: [
    {
      id: "library",
      shortTitle: "Biblioteca",
      title: "O fichário e a estante",
      tag: "context",
      body: [
        "Numa biblioteca, o fichário diz que livros existem, com título e assunto, e cada ficha tem um código de estante. Você consulta o fichário, escolhe e pede o livro pelo código. Ninguém despeja a biblioteca inteira na sua mesa.",
        "Um [[recurso MCP|mcp-resource]] é um livro dessa biblioteca: um dado para leitura, identificado por uma URI, como um arquivo, uma política interna ou o schema de um banco. Diferente das ferramentas, recursos são controlados pela aplicação: é o host que decide o que entra no contexto do modelo, seja por um seletor na interface, seja por uma regra automática.",
      ],
      keyIdea: "Recurso é dado para ler, com endereço próprio; quem decide colocar no contexto é o host.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "resources",
            piece: "block-diagram",
            blocks: [
              { id: "docs", kind: "documents", label: "políticas", col: 0, row: 0.5 },
              { id: "server", kind: "tool", label: "servidor mcp", col: 1, row: 0.5 },
              { id: "host", kind: "laptop", label: "host escolhe", col: 2, row: 0.5 },
              { id: "context", kind: "context", label: "contexto", col: 3, row: 0 },
              { id: "llm", kind: "llm", label: "modelo", col: 3, row: 1 },
            ],
            edges: [
              { from: "docs", to: "server" },
              { from: "server", to: "host", label: "resources/read" },
              { from: "host", to: "context" },
              { from: "context", to: "llm" },
            ],
            active: "host",
          },
        ],
      },
      alt: "As políticas da empresa ficam num servidor MCP; o host, em destaque, lê os recursos e escolhe o que vai para o contexto do modelo.",
    },
    {
      id: "list-read",
      shortTitle: "List e read",
      title: "Primeiro o fichário, depois o livro",
      tag: "mechanism",
      body: [
        `O resources/list devolve só metadados: uri, name, title, description, mimeType e, se o servidor souber, o tamanho. Com ${resources.length} recursos que somam ${integer(totalTokens)} tokens, a lista custa quase nada; o conteúdo só chega quando o host pede um resources/read com a URI.`,
        `O read devolve contents, com text para texto ou blob em base64 para binários. Se a URI não existe, o servidor responde com o erro JSON-RPC ${NOT_FOUND}; revisões anteriores usavam ${OLD_NOT_FOUND}, e clientes devem aceitar os dois. Recursos também podem trazer anotações: audience (user ou assistant), priority de 0 a 1 e lastModified.`,
      ],
      keyIdea: "list traz fichas; read traz o conteúdo de uma URI.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "exchange",
            piece: "token-stream",
            tokens: listExchange,
            query: 3,
            arcs: [
              { from: 0, to: 1, weight: 0.6 },
              { from: 2, to: 4, weight: 1, label: "mesma uri" },
            ],
            color: "module-13",
          },
        ],
      },
      alt: `Troca em partes: ${listExchange.join(", ")}. O resources/list devolve ${resources.length} URIs; o resources/read de ${resources[0].uri} devolve o conteúdo em texto.`,
    },
    {
      id: "templates",
      shortTitle: "Templates",
      title: "Um endereço com espaço em branco",
      tag: "mechanism",
      body: [
        "Um formulário de endereço tem campos vazios que você preenche: o mesmo formulário serve para qualquer casa. Um [[modelo de recurso|resource-template]] é uma URI com variáveis, no padrão RFC 6570, que o servidor lista em resources/templates/list.",
        `O modelo ${TEMPLATE} cobre todas as políticas sem listar uma por uma: com tema = ${themes.join(", ")}, viram ${expanded.join(", ")}. Templates servem para conjuntos grandes ou abertos, como arquivos de um projeto ou registros de um banco, e os argumentos podem ter autocompletar pelo servidor.`,
      ],
      keyIdea: "Um modelo de URI cobre infinitos recursos sem listar todos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "template",
            piece: "graph",
            nodes: [
              { id: "template", label: TEMPLATE, x: 0.2, y: 0.5, color: "module-13" },
              ...expanded.map((uri, index) => ({ id: `uri-${index}`, label: uri, x: 0.75, y: 0.2 + index * 0.3 })),
            ],
            edges: expanded.map((_, index) => ({ from: "template", to: `uri-${index}`, label: `tema=${themes[index]}` })),
            highlight: ["template"],
          },
        ],
      },
      alt: `O modelo ${TEMPLATE} se expande em ${expanded.length} URIs concretas: ${expanded.join(", ")}.`,
    },
    {
      id: "budget",
      shortTitle: "Orçamento",
      title: "O que cabe no contexto",
      tag: "example",
      body: [
        `O usuário pergunta sobre benefícios, e o host tem ${integer(BUDGET)} tokens de orçamento para recursos. Ele ordena pela prioridade anotada e vai lendo até o próximo não caber: entram ${selected.map((resource) => resource.short).join(", ")}, somando ${integer(used)} tokens. O seguinte, ${firstLeftOut.short}, tem ${integer(firstLeftOut.tokens)} tokens e estouraria o orçamento.`,
        "A regra é do host, não do protocolo: a especificação só oferece as dicas (priority, audience, tamanho) e deixa a decisão com a aplicação. Um host melhor poderia buscar trechos por relevância, como num pipeline de RAG, em vez de ler recursos inteiros.",
      ],
      keyIdea: "O host decide o que ler; anotações de prioridade e tamanho ajudam a caber no orçamento.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "used",
            piece: "metrics-panel",
            metrics: [
              { id: "budget", label: "orçamento", value: `${integer(BUDGET)} tokens` },
              { id: "used", label: `${selected.length} recursos lidos`, value: `${integer(used)} tokens`, color: "success" },
              { id: "out", label: `fora: ${firstLeftOut.short}`, value: `${integer(firstLeftOut.tokens)} tokens`, color: "danger" },
            ],
            highlight: "used",
          },
          {
            id: "priorities",
            piece: "chart",
            kind: "bar",
            series: prioritySeries,
            max: 100,
            cutoff: { mode: "threshold", value: Math.round(cutoffPriority * 100), label: "cabe no orçamento" },
            color: "module-13",
          },
        ],
      },
      alt: `Prioridades em porcentagem: ${prioritySeries.map((item) => `${item.label}, ${item.value}`).join("; ")}. Com ${BUDGET} tokens, entram ${selected.map((resource) => resource.short).join(", ")} (${used} tokens); ${firstLeftOut.short} fica de fora.`,
    },
    {
      id: "fresh",
      shortTitle: "Mudanças",
      title: "Recurso que muda e recurso ou ferramenta",
      tag: "tradeoff",
      body: [
        `Recursos mudam. Se o servidor declara subscribe na capacidade resources, o cliente pode acompanhar URIs específicas; na revisão ${SPEC}, isso é feito abrindo um stream com subscriptions/listen, e o servidor manda notifications/resources/updated quando uma delas muda. Aí o host faz um novo read. Os resultados de list e read também trazem ttlMs, uma dica de quanto tempo dá para usar a cópia em cache.`,
        "Recurso ou ferramenta? Se o dado é lido e o host deve decidir quando incluir, recurso. Se o modelo precisa decidir sozinho buscar algo no meio do raciocínio, ou se a operação tem parâmetros de busca, ferramenta. Muitos servidores oferecem os dois, e uma ferramenta pode devolver um link para um recurso (resource_link).",
      ],
      keyIdea: "Assine o que muda; use recurso quando o host decide e ferramenta quando o modelo decide.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "resources",
            piece: "block-diagram",
            blocks: [
              { id: "docs", kind: "documents", label: "política nova", col: 0, row: 0.5 },
              { id: "server", kind: "tool", label: "servidor mcp", col: 1, row: 0.5 },
              { id: "host", kind: "laptop", label: "host", col: 2.5, row: 0.5 },
              { id: "cache", kind: "kv-cache", label: "cópia em cache", col: 3.5, row: 0.5 },
            ],
            edges: [
              { from: "docs", to: "server", label: "mudou" },
              { from: "server", to: "host", label: "resources/updated" },
              { from: "host", to: "cache", label: "novo read" },
            ],
            active: "host",
          },
        ],
      },
      alt: "Uma política muda no servidor, que avisa o host, em destaque, com notifications/resources/updated; o host faz um novo read e atualiza a cópia em cache.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Recursos em uma frase",
      tag: "summary",
      body: [
        "Recursos são dados com URI: list traz as fichas, read traz o conteúdo, templates cobrem conjuntos grandes, anotações ajudam a escolher e assinaturas avisam quando algo muda. Quem decide o que entra no contexto é o host.",
        "Falta a terceira primitiva do servidor: os prompts, que o próprio usuário escolhe.",
      ],
      keyIdea: "Ler sob demanda, pelo endereço, dentro de um orçamento.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "recap",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "list", label: "resources/list: fichas" },
              { id: "read", label: "resources/read: conteúdo", color: "module-13" },
              { id: "template", label: "templates RFC 6570" },
              { id: "annotations", label: "priority · audience · lastModified" },
              { id: "subscribe", label: "subscriptions/listen" },
              { id: "host", label: "o host decide", color: "brand" },
            ],
          },
        ],
      },
      alt: "Resumo em chips: resources/list traz fichas, resources/read traz conteúdo, templates RFC 6570, anotações priority, audience e lastModified, subscriptions/listen, e o host decide.",
    },
  ],
  realWorldExample:
    "A própria especificação ilustra os recursos com um seletor de contexto: o host mostra os recursos dos servidores conectados numa lista ou árvore, o usuário busca e marca os que quer, e só esses são lidos e anexados à conversa. É o mesmo gesto de anexar um arquivo num chat, só que o arquivo vem de qualquer servidor MCP.",
  code: {
    language: "python",
    source: `from mcp.server import MCPServer

mcp = MCPServer("politicas")

POLITICAS = {
    "ferias": "Férias: 30 dias por ano, divisíveis em até 3 períodos.",
    "reembolso": "Reembolso: envie a nota em até 30 dias pelo portal.",
}


@mcp.resource("docs://politicas/{tema}")
def politica(tema: str) -> str:
    """Texto da política interna sobre um tema."""
    return POLITICAS[tema]


if __name__ == "__main__":
    mcp.run(transport="stdio")`,
    caption: "Um modelo de recurso com o SDK oficial de Python: a variável {tema} da URI vira o argumento da função, e a docstring vira a descrição.",
  },
  tradeOffs: {
    pros: [
      "O conteúdo só entra no contexto quando o host lê, então listar é barato",
      "URIs dão um endereço estável para citar, cachear e assinar",
      "O host controla o que o modelo vê, o que ajuda com privacidade e custo",
    ],
    cons: [
      "Recurso inteiro pode ser grande demais: o host precisa de orçamento ou de busca por trechos",
      "Nem todo host oferece seletor de recursos; o suporte varia entre aplicações",
      "Servidores precisam validar URIs e caminhos para evitar travessia de diretórios",
    ],
    alternatives: ["Uma ferramenta de busca, quando o modelo precisa decidir o que procurar", "Um pipeline de RAG, quando o acervo é grande e só trechos interessam"],
  },
  knowledgeCheck: [
    {
      id: "resource-or-tool",
      prompt: "Um servidor de banco quer oferecer o schema das tabelas, que o host deve anexar no começo de toda conversa sobre o banco. O que usar?",
      options: [
        "Uma ferramenta get_schema, para o modelo chamar quando quiser",
        "Um recurso, como db://schema, que o host lê e coloca no contexto",
        "Um prompt",
        "Uma notificação",
      ],
      correct: 1,
      explanation: "É um dado para leitura, e quem decide incluir é a aplicação: o caso típico de recurso. Uma ferramenta deixaria a decisão com o modelo, que poderia esquecer de chamá-la.",
      lesson: "13-06",
    },
    {
      id: "budget-pick",
      prompt: "Orçamento de 2.000 tokens. Recursos em ordem de prioridade: A (800), B (900), C (600). Com a regra da aula (ler em ordem e parar no primeiro que não cabe), o que entra?",
      options: ["A, B e C", "A e B", "Só A", "B e C"],
      correct: 1,
      explanation: "A soma 800, B leva a 1.700 e C levaria a 2.300, acima de 2.000. A regra para em C: entram A e B.",
      lesson: "13-06",
    },
  ],
  related: ["13-05", "13-07", "08-09"],
  references: [
    { title: "MCP Specification 2026-07-28: Resources", url: "https://modelcontextprotocol.io/specification/2026-07-28/server/resources", kind: "docs" },
    { title: "RFC 6570: URI Template", url: "https://datatracker.ietf.org/doc/html/rfc6570", kind: "docs" },
    { title: "MCP Python SDK", url: "https://github.com/modelcontextprotocol/python-sdk", kind: "repo" },
  ],
};

export default lesson;
