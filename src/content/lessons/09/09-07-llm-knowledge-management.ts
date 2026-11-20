import type { LessonContent } from "../../../types/content";

// O mapa de conhecimento de um assistente de empresa, calculado aqui. Cada item tem tamanho em tokens, de
// quanto em quanto tempo muda e o formato, e uma regra escrita no arquivo decide onde ele mora: ferramenta,
// grafo, prompt, pesos ou índice. Os números de tamanho, janela e volume de chamadas são de brinquedo e
// servem para mostrar a conta: o que fica no prompt é pago em toda chamada.

type Shape = "texto" | "relação" | "valor" | "comportamento";
type Home = "pesos" | "prompt" | "índice" | "grafo" | "ferramenta";

interface Item {
  label: string;
  tokens: number;
  changesEveryDays: number;
  shape: Shape;
}

const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");

const items: Item[] = [
  { label: "tom e formato", tokens: 800, changesEveryDays: 90, shape: "comportamento" },
  { label: "glossário interno", tokens: 1_500, changesEveryDays: 60, shape: "texto" },
  { label: "manuais de produto", tokens: 1_200_000, changesEveryDays: 14, shape: "texto" },
  { label: "políticas de RH", tokens: 300_000, changesEveryDays: 90, shape: "texto" },
  { label: "organograma e contas", tokens: 50_000, changesEveryDays: 7, shape: "relação" },
  { label: "estoque e preços", tokens: 20_000, changesEveryDays: 0.01, shape: "valor" },
  { label: "status de pedidos", tokens: 400_000, changesEveryDays: 0.001, shape: "valor" },
  { label: "respostas aprovadas", tokens: 5_000_000, changesEveryDays: 180, shape: "comportamento" },
];

const PROMPT_ITEM_MAX = 2_000;
const STABLE_DAYS = 30;

/** A regra de casa de cada conhecimento, na ordem em que as perguntas são feitas. */
function homeOf(item: Item): Home {
  if (item.changesEveryDays < 1) return "ferramenta";
  if (item.shape === "relação") return "grafo";
  if (item.tokens <= PROMPT_ITEM_MAX && item.changesEveryDays >= STABLE_DAYS) return "prompt";
  if (item.shape === "comportamento") return "pesos";
  return "índice";
}

const homes: Home[] = ["pesos", "prompt", "índice", "grafo", "ferramenta"];
const placement = items.map((item) => ({ ...item, home: homeOf(item) }));
const placementMatrix = placement.map((item) => homes.map((home) => (item.home === home ? 1 : 0)));
const countIn = (home: Home) => placement.filter((item) => item.home === home).length;
const labelsIn = (home: Home) => placement.filter((item) => item.home === home).map((item) => item.label);

const WINDOW = 200_000;
const CALLS_PER_DAY = 10_000;
const promptTokens = placement.filter((item) => item.home === "prompt").reduce((total, item) => total + item.tokens, 0);
const allTokens = items.reduce((total, item) => total + item.tokens, 0);
const promptTokensPerDay = promptTokens * CALLS_PER_DAY;
const windowsNeeded = Math.ceil(allTokens / WINDOW);

const lesson: LessonContent = {
  id: "09-07",
  subtitle: "Pesos, prompt, índice, grafo ou ferramenta: como decidir onde cada conhecimento de um sistema com LLM mora, quem cuida dele e quem pode lê-lo.",
  objectives: [
    "Listar os lugares onde um sistema com LLM pode guardar conhecimento",
    "Escolher o lugar pelo tamanho, pela frequência de mudança e pelo formato",
    "Calcular o custo de manter conhecimento sempre no prompt",
    "Aplicar fonte única da verdade e permissões ao conhecimento servido ao modelo",
  ],
  steps: [
    {
      id: "homes",
      shortTitle: "Onde mora",
      title: "Cinco lugares para guardar conhecimento",
      tag: "context",
      body: [
        "Pense numa pessoa nova na empresa. Algumas coisas ela aprende de vez e leva na cabeça. Outras ficam num cartão na mesa. Outras ela procura no manual quando precisa, pergunta a quem sabe ou confere no sistema na hora, como o estoque. Ninguém decora o estoque.",
        `Um sistema com [[LLM|llm]] tem os mesmos cinco lugares: os pesos ([[memória paramétrica|parametric-memory]], muda com [[fine-tuning|fine-tuning]]), o prompt (o cartão na mesa, um [[arquivo de contexto|context-file]] ou o [[prompt de sistema|system-prompt]]), o índice de documentos do [[RAG|rag]], o [[grafo de conhecimento|knowledge-graph]] e as ferramentas, chamadas por [[tool calling|tool-calling]]. [[Gestão de conhecimento para LLMs|llm-knowledge-management]] é decidir o lugar de cada coisa e manter cada lugar em dia.`,
      ],
      keyIdea: "Conhecimento não é uma coisa só: cada tipo tem um lugar certo, e o erro mais comum é pôr tudo no mesmo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "homes",
            piece: "block-diagram",
            blocks: [
              { id: "weights", kind: "memory", label: "pesos", col: 0, row: 0 },
              { id: "prompt", kind: "context", label: "prompt", col: 0, row: 1 },
              { id: "llm", kind: "llm", label: "assistente", col: 1.5, row: 0 },
              { id: "index", kind: "vector-db", label: "índice", col: 3, row: 0 },
              { id: "graph", kind: "nosql-db", label: "grafo", col: 3, row: 1 },
              { id: "tool", kind: "tool", label: "ferramenta", col: 1.5, row: 1 },
            ],
            edges: [
              { from: "weights", to: "llm", label: "treino" },
              { from: "prompt", to: "llm", label: "toda chamada" },
              { from: "index", to: "llm", label: "busca" },
              { from: "graph", to: "llm", label: "caminho" },
              { from: "tool", to: "llm", label: "ao vivo" },
            ],
            active: "llm",
          },
        ],
      },
      alt: "O assistente, em destaque, recebe conhecimento de cinco lugares: os pesos, pelo treino; o prompt, em toda chamada; o índice, por busca; o grafo, por caminho; e a ferramenta, ao vivo.",
    },
    {
      id: "placement",
      shortTitle: "Decidir",
      title: "Quatro perguntas decidem o lugar",
      tag: "mechanism",
      body: [
        `Para cada conhecimento, pergunte em ordem: muda dentro do dia? Vai para uma ferramenta que lê a fonte na hora. É sobre ligações entre entidades? Grafo. É pequeno (até ${integer(PROMPT_ITEM_MAX)} tokens) e estável (muda a cada ${STABLE_DAYS} dias ou mais)? Prompt. É comportamento em grande volume, como milhões de tokens de respostas aprovadas? Pesos. O resto, texto grande que muda de vez em quando, vai para o índice.`,
        `Aplicada aos ${items.length} itens da cena: ${homes.map((home) => `${home}, ${countIn(home)}`).join("; ")}. O status de pedidos é grande, mas muda a cada minuto: no índice, estaria sempre velho. O tom e formato vai para o prompt, não para os pesos: são ${integer(items[0].tokens)} tokens que mudam por decisão de produto, e fine-tuning a cada mudança seria caro e lento.`,
      ],
      keyIdea: "Volatilidade primeiro, formato depois, tamanho por último: é a ordem que evita conhecimento velho.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "placement",
            piece: "matrix",
            rows: items.map((item) => item.label),
            cols: homes,
            values: placementMatrix,
            scale: { min: 0, max: 1 },
            highlight: { row: items.findIndex((item) => item.label === "status de pedidos"), col: homes.indexOf("ferramenta") },
            color: "module-09",
          },
        ],
      },
      alt: `Matriz de ${items.length} conhecimentos por 5 lugares: ${homes.map((home) => `${home}: ${labelsIn(home).join(", ") || "nenhum"}`).join("; ")}. Status de pedidos na ferramenta, em destaque.`,
    },
    {
      id: "budget",
      shortTitle: "Prompt",
      title: "O que fica no prompt é pago toda vez",
      tag: "mechanism",
      body: [
        "Colocar tudo no prompt parece a solução simples: o modelo vê tudo, sempre. Mas o prompt é reenviado em toda chamada, como um anexo que você manda em cada e-mail.",
        `Os itens que foram para o prompt somam ${integer(promptTokens)} tokens. Com ${integer(CALLS_PER_DAY)} chamadas por dia, são ${integer(promptTokensPerDay)} tokens de entrada só desse trecho, todo dia. Os ${items.length} itens juntos têm ${integer(allTokens)} tokens: precisariam de ${windowsNeeded} [[janelas de contexto|context-window]] de ${integer(WINDOW)}. Prompt é para o pequeno, estável e necessário em toda conversa; o resto se busca quando a pergunta pede. O prompt caching, do módulo 10, barateia o trecho fixo, mas não o faz caber.`,
      ],
      keyIdea: "Prompt é o lugar mais caro por token: reserve para o que toda chamada precisa.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "budget",
            piece: "metrics-panel",
            metrics: [
              { id: "prompt", label: "tokens no prompt", value: integer(promptTokens), color: "info" },
              { id: "day", label: `por dia (${integer(CALLS_PER_DAY)} chamadas)`, value: integer(promptTokensPerDay) },
              { id: "all", label: "tudo junto", value: integer(allTokens), color: "danger" },
              { id: "windows", label: `janelas de ${integer(WINDOW)}`, value: String(windowsNeeded), color: "danger" },
            ],
            highlight: "all",
          },
        ],
      },
      alt: `Painel: ${integer(promptTokens)} tokens no prompt, ${integer(promptTokensPerDay)} por dia com ${integer(CALLS_PER_DAY)} chamadas; tudo junto, em destaque, daria ${integer(allTokens)} tokens, ${windowsNeeded} janelas de ${integer(WINDOW)}.`,
    },
    {
      id: "lifecycle",
      shortTitle: "Ciclo",
      title: "Conhecimento tem ciclo de vida",
      tag: "mechanism",
      body: [
        "Um manual não nasce pronto nem dura para sempre. Ele é escrito, revisado, publicado, consultado, corrigido quando alguém reclama e, um dia, aposentado quando o produto sai de linha. Se a etapa de aposentar não existe, o assistente continua citando o produto que acabou.",
        "Para cada lugar, o ciclo é o mesmo: capturar da fonte, curar (dono, data, formato), armazenar no lugar certo, servir ao modelo e medir o uso e os erros. As medições voltam para a curadoria: perguntas sem resposta mostram o que falta capturar, e citações de documentos aposentados mostram o que esqueceram de remover. O índice precisa de [[indexação incremental|incremental-indexing]] que trate remoções.",
      ],
      keyIdea: "Sem a etapa de aposentar, todo conhecimento vira conhecimento velho.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "lifecycle",
            piece: "pipeline",
            stages: [
              { id: "capture", label: "capturar" },
              { id: "curate", label: "curar" },
              { id: "store", label: "armazenar" },
              { id: "serve", label: "servir", color: "module-09" },
              { id: "measure", label: "medir" },
            ],
            active: "measure",
            done: ["capture", "curate", "store", "serve"],
            branch: { id: "retire", label: "aposentar", from: "measure", edgeLabel: "obsoleto" },
          },
        ],
      },
      alt: "Pipeline do ciclo de vida: capturar, curar, armazenar, servir e medir, em destaque, com um ramo tracejado para aposentar o conhecimento obsoleto.",
    },
    {
      id: "permissions",
      shortTitle: "Permissão",
      title: "Quem pode ler o quê",
      tag: "tradeoff",
      body: [
        "Na empresa, o estagiário não lê a planilha de salários. Se o assistente lê tudo e responde a todos, ele vira a porta dos fundos dessa planilha. A regra de quem pode ler precisa acompanhar o conhecimento até o modelo.",
        `A permissão vai na busca, como o [[filtro de acesso|access-control-filter]] do módulo 8, não numa instrução do prompt, que um [[prompt injection|prompt-injection]] contorna. Cada lugar tem o seu jeito: o índice filtra por grupo nos metadados, o grafo filtra nós e arestas pelo usuário, a ferramenta chama a API com a credencial de quem perguntou. O custo é manter as permissões sincronizadas com a fonte, porque cópia sem permissão vira vazamento.`,
      ],
      keyIdea: "Permissão é dado: viaja com o conhecimento e é aplicada na busca, com a identidade de quem pergunta.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "acl",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "estagiário", col: 0, row: 0.5 },
              { id: "app", kind: "app", label: "assistente", col: 1, row: 0.5 },
              { id: "guard", kind: "guardrail", label: "filtro por grupo", col: 2, row: 0.5 },
              { id: "index", kind: "vector-db", label: "manuais", col: 3, row: 0 },
              { id: "denied", kind: "no-result", label: "salários: negado", col: 3, row: 1 },
            ],
            edges: [
              { from: "user", to: "app", label: "pergunta" },
              { from: "app", to: "guard", label: "identidade" },
              { from: "guard", to: "index", label: "permitido" },
              { from: "guard", to: "denied", variant: "alternative" },
            ],
            active: "guard",
          },
        ],
      },
      alt: "O estagiário pergunta ao assistente, que repassa a identidade ao filtro por grupo, em destaque; o filtro libera a busca nos manuais e nega o acesso aos salários, num caminho tracejado.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Uma fonte, várias cópias derivadas",
      tag: "summary",
      body: [
        `O mesmo fato pode aparecer em vários lugares: no índice, no grafo, num resumo no prompt. Se cada cópia for editada à mão, elas divergem. A regra é a [[fonte única da verdade|single-source-of-truth]]: um lugar oficial por fato, e os outros são gerados a partir dele e refeitos quando ele muda.`,
        "Decidir o lugar, aplicar o ciclo de vida, levar as permissões e derivar as cópias de uma fonte: é a gestão de conhecimento. A próxima aula mostra uma proposta concreta e recente de juntar isso num artefato só: a wiki mantida por LLM, de Andrej Karpathy.",
      ],
      keyIdea: "Edite na fonte, derive o resto: cópias editadas à mão sempre divergem.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "homes",
            piece: "block-diagram",
            blocks: [
              { id: "source", kind: "documents", label: "fonte oficial", col: 0, row: 0.5 },
              { id: "pipeline", kind: "queue", label: "ingestão", col: 1, row: 0.5 },
              { id: "index", kind: "vector-db", label: "índice", col: 2, row: 0 },
              { id: "graph", kind: "nosql-db", label: "grafo", col: 2, row: 1 },
              { id: "prompt", kind: "context", label: "resumo no prompt", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "source", to: "pipeline", label: "mudou" },
              { from: "pipeline", to: "index", label: "deriva" },
              { from: "pipeline", to: "graph", label: "deriva" },
              { from: "index", to: "prompt", label: "deriva" },
            ],
            active: "source",
          },
        ],
      },
      alt: "A fonte oficial, em destaque, alimenta a ingestão, que deriva o índice e o grafo; o resumo no prompt é derivado do índice. Nenhuma cópia é editada à mão.",
    },
  ],
  realWorldExample:
    "Ferramentas de código com agentes leem arquivos de contexto do repositório a cada sessão: o Claude Code carrega o CLAUDE.md, e o AGENTS.md é um formato aberto, descrito como um README para agentes, lido por várias ferramentas. São conhecimento pequeno, estável e necessário em toda conversa (comandos de build, convenções, armadilhas do projeto), versionado junto com o código.",
  code: {
    language: "python",
    source: `PROMPT_ITEM_MAX = 2_000   # tokens
STABLE_DAYS = 30

def lugar(item):
    if item["muda_a_cada_dias"] < 1:
        return "ferramenta"   # lê a fonte na hora
    if item["formato"] == "relação":
        return "grafo"
    if item["tokens"] <= PROMPT_ITEM_MAX and item["muda_a_cada_dias"] >= STABLE_DAYS:
        return "prompt"
    if item["formato"] == "comportamento":
        return "pesos"        # fine-tuning
    return "índice"           # RAG

print(lugar({"tokens": 400_000, "muda_a_cada_dias": 0.001, "formato": "valor"}))  # ferramenta`,
    caption: "A regra da aula em código: volatilidade, formato e tamanho, nessa ordem, decidem onde o conhecimento mora.",
  },
  tradeOffs: {
    pros: [
      "Cada conhecimento no lugar certo: valor ao vivo não envelhece, texto grande não estoura o prompt",
      "Fonte única evita cópias divergentes",
      "Permissão aplicada na busca protege dados sensíveis mesmo contra prompt injection",
    ],
    cons: [
      "Mais lugares para operar, monitorar e sincronizar",
      "A regra de casa precisa de dono: sem ele, tudo acaba indo para o prompt ou para o índice",
      "Manter permissões sincronizadas com as fontes é trabalho contínuo",
    ],
    alternatives: [
      "Uma wiki mantida por LLM como camada única de conhecimento, assunto da próxima aula",
      "Só RAG sobre tudo, aceitando conhecimento velho em dados voláteis",
    ],
  },
  knowledgeCheck: [
    {
      id: "where-price",
      prompt: "O preço de cada produto muda várias vezes por dia. Onde o assistente deveria buscar esse dado?",
      options: [
        "No índice do RAG, reindexado toda noite",
        "Numa ferramenta que consulta o sistema de preços na hora da pergunta",
        "No prompt de sistema",
        "Nos pesos, com fine-tuning semanal",
      ],
      correct: 1,
      explanation: "Dado que muda dentro do dia envelhece em qualquer cópia. A ferramenta lê a fonte na hora, e a resposta sai com o valor vigente.",
      lesson: "09-07",
    },
    {
      id: "prompt-cost",
      prompt: "Um time quer colocar um manual de 150 mil tokens no prompt de sistema para “o modelo saber tudo”. Qual é o problema principal?",
      options: [
        "O modelo não lê prompts de sistema longos",
        "Os 150 mil tokens são pagos em toda chamada e ocupam a janela, mesmo quando a pergunta usa uma página do manual",
        "O manual fica desatualizado mais rápido no prompt",
        "Não há problema: quanto mais contexto, melhor",
      ],
      correct: 1,
      explanation: "O prompt é reenviado em toda chamada. Para texto grande, buscar o trecho certo custa uma fração e ainda deixa espaço na janela para o resto da conversa.",
      lesson: "09-07",
    },
  ],
  related: ["09-06", "09-08", "08-03"],
  references: [
    { title: "AGENTS.md: um formato aberto para orientar agentes de código", url: "https://agents.md/", kind: "docs" },
    { title: "Claude Code: gerenciar a memória do Claude (CLAUDE.md)", url: "https://docs.anthropic.com/en/docs/claude-code/memory", kind: "docs" },
    {
      title: "Lewis et al. (2020), Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
      url: "https://arxiv.org/abs/2005.11401",
      kind: "paper",
    },
  ],
};

export default lesson;
