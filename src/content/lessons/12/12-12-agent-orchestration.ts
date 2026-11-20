import type { LessonContent } from "../../../types/content";

// Orquestração com uma central de atendimento de brinquedo: 10 mil tickets por dia, divididos em perguntas
// frequentes, consultas de pedido e casos complexos (fatias de brinquedo). O custo é medido em unidades de
// chamada: 1 para o modelo grande e 0,1 para o modelo pequeno. Sem roteador, todo ticket passa pelo agente;
// com roteador, um modelo pequeno classifica e cada tipo segue o caminho mais barato que resolve.

const TICKETS_PER_DAY = 10_000;
const SMALL = 0.1;

interface TicketType {
  id: string;
  label: string;
  share: number;
  /** Chamadas ao modelo grande quando o agente atende sozinho. */
  agentCalls: number;
  /** Custo do caminho especializado depois do roteador. */
  routedPath: number;
  path: string;
}

const types: TicketType[] = [
  { id: "faq", label: "faq", share: 0.6, agentCalls: 2, routedPath: SMALL, path: "resposta pronta com modelo pequeno" },
  { id: "order", label: "pedido", share: 0.3, agentCalls: 3, routedPath: 2, path: "workflow fixo: consulta e resposta" },
  { id: "complex", label: "complexo", share: 0.1, agentCalls: 6, routedPath: 6, path: "agente com ferramentas" },
];

const routedCost = (type: TicketType) => SMALL + type.routedPath;
const average = (cost: (type: TicketType) => number) => types.reduce((sum, type) => sum + type.share * cost(type), 0);
const avgWithout = average((type) => type.agentCalls);
const avgWith = average(routedCost);
const savings = 1 - avgWith / avgWithout;
const dailyWithout = avgWithout * TICKETS_PER_DAY;
const dailyWith = avgWith * TICKETS_PER_DAY;

const decimal = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const percent = (value: number) => `${Math.round(value * 100)}%`;

const costSeries = types.flatMap((type) => [
  { label: `${type.label} · agente`, value: type.agentCalls },
  { label: `${type.label} · roteado`, value: Number(routedCost(type).toFixed(2)) },
]);
const faq = types[0];
const complex = types[2];

// Passo 3: o orquestrador decide em tempo de execução quantos workers criar.
const contracts = ["contrato a", "contrato b", "contrato c", "contrato d"];

const patterns = ["prompt chaining", "routing", "paralelização", "orquestrador-workers", "avaliador-otimizador", "agente autônomo"];
const decisions = ["passos fixos", "llm escolhe caminho", "llm cria subtarefas", "llm decide parar"];
const whoDecides = [
  [1, 0, 0, 0],
  [1, 1, 0, 0],
  [1, 0, 0, 0],
  [0, 1, 1, 0],
  [1, 0, 0, 1],
  [0, 1, 1, 1],
];

const lesson: LessonContent = {
  id: "12-12",
  subtitle: "Quem decide o próximo passo: os padrões de orquestração, do caminho fixo no código ao orquestrador que cria subtarefas, e quanto cada um custa.",
  objectives: [
    "Separar orquestração no código de orquestração decidida pelo LLM",
    "Reconhecer os padrões: encadeamento, roteamento, paralelização, orquestrador-workers, avaliador-otimizador",
    "Calcular a economia de um roteador que manda cada pedido para o caminho mais barato",
    "Modelar o fluxo como um grafo de estados com saídas para pessoas",
  ],
  steps: [
    {
      id: "router",
      shortTitle: "Roteador",
      title: "A recepção do hospital",
      tag: "context",
      body: [
        "No pronto-socorro, ninguém passa direto para o cirurgião. A triagem olha cada paciente e manda para o caminho certo: curativo, clínico geral ou especialista. O hospital inteiro funciona melhor porque cada caso vai para quem resolve com o menor esforço.",
        "[[Orquestração de agentes|agent-orchestration]] é decidir quem faz o quê, em que ordem e quem escolhe o próximo passo. O padrão mais simples é o [[roteamento|task-routing]]: um classificador, muitas vezes um LLM pequeno, lê o pedido e manda para um caminho especializado. É a mesma ideia do [[roteamento de modelos|model-routing]], aplicada a caminhos inteiros: uma resposta pronta, um workflow fixo ou um agente.",
      ],
      keyIdea: "Orquestrar é decidir o fluxo do trabalho; rotear é o primeiro passo: cada pedido no caminho certo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "tickets", kind: "queue", label: "tickets", col: 0, row: 0.5 },
              { id: "router", kind: "llm", label: "roteador", col: 1, row: 0.5 },
              { id: "faq", kind: "answer", label: "faq", col: 2, row: 0 },
              { id: "workflow", kind: "tool", label: "workflow pedido", col: 2, row: 1 },
              { id: "agent", kind: "agent", label: "agente", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "tickets", to: "router" },
              { from: "router", to: "faq", label: percent(types[0].share) },
              { from: "router", to: "workflow", label: percent(types[1].share) },
              { from: "router", to: "agent", label: percent(types[2].share) },
            ],
            active: "router",
          },
        ],
      },
      alt: `A fila de tickets passa por um roteador, em destaque, que manda ${percent(types[0].share)} para respostas prontas, ${percent(types[1].share)} para um workflow de pedidos e ${percent(types[2].share)} para o agente.`,
    },
    {
      id: "chain",
      shortTitle: "Cadeia",
      title: "Uma linha de montagem com inspeção",
      tag: "mechanism",
      body: [
        "Numa linha de montagem, cada estação faz uma coisa, e há um inspetor no meio: se a peça veio sem um parafuso, ela volta antes de seguir. Ninguém espera chegar no fim para descobrir o defeito.",
        "No [[prompt chaining|prompt-chaining]], cada chamada ao LLM faz um passo e passa o resultado ao próximo, com checagens em código entre eles. Aqui, o workflow de pedidos extrai os dados, um portão em código valida o número e o CPF, e só então o LLM redige e revisa. Se faltar dado, o ramo pergunta ao cliente. Quem decide a ordem é o código: é um workflow, não um agente.",
      ],
      keyIdea: "Encadear passos fixos com portões em código é a orquestração mais previsível que existe.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "chain",
            piece: "pipeline",
            stages: [
              { id: "extract", label: "extrair dados" },
              { id: "validate", label: "portão: validar", color: "module-12" },
              { id: "draft", label: "redigir" },
              { id: "review", label: "revisar tom" },
            ],
            active: "validate",
            done: ["extract"],
            branch: { id: "ask", label: "perguntar ao cliente", from: "validate", edgeLabel: "falta dado" },
          },
        ],
      },
      alt: "Pipeline do workflow de pedidos: extrair dados, um portão de validação em destaque, redigir e revisar o tom; um ramo tracejado sai do portão para perguntar ao cliente quando falta dado.",
    },
    {
      id: "workers",
      shortTitle: "Workers",
      title: "O chefe de obra divide o trabalho",
      tag: "mechanism",
      body: [
        `Um chefe de obra recebe “reformar o apartamento” e só olhando decide: eletricista, pintor, encanador. Para outro apartamento, a lista seria outra. Do mesmo jeito, um pedido “compare estes ${contracts.length} contratos” vira ${contracts.length} subtarefas, mas outro pedido viraria 2 ou 10.`,
        "No padrão orquestrador-workers, um LLM [[orquestrador|orchestrator]] decide as subtarefas em tempo de execução, distribui para workers e junta os resultados. A diferença para a paralelização fixa é que o número e o tipo das subtarefas não estão no código. No LangGraph, isso se faz com Send: uma aresta condicional devolve um Send por item, os workers rodam em paralelo e um reducer junta as saídas no estado.",
      ],
      keyIdea: "Orquestrador-workers: o LLM decide quantas e quais subtarefas, em tempo de execução.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "pedido", col: 0, row: 0.5 },
              { id: "orchestrator", kind: "agent", label: "orquestrador", col: 1, row: 0.5 },
              { id: "w1", kind: "llm", label: "worker a", col: 2, row: 0 },
              { id: "w2", kind: "llm", label: `worker ${contracts.length}`, col: 2, row: 1 },
              { id: "merge", kind: "answer", label: "comparação", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "user", to: "orchestrator" },
              { from: "orchestrator", to: "w1", label: contracts[0] },
              { from: "orchestrator", to: "w2", label: contracts[contracts.length - 1] },
              { from: "w1", to: "merge" },
              { from: "w2", to: "merge" },
            ],
            active: "orchestrator",
          },
        ],
      },
      alt: `O pedido chega ao orquestrador, em destaque, que cria um worker por contrato, de ${contracts[0]} a ${contracts[contracts.length - 1]}; os resultados se juntam numa comparação.`,
    },
    {
      id: "numbers",
      shortTitle: "A conta",
      title: "Quanto o roteador economiza",
      tag: "example",
      body: [
        `Sem roteador, todo ticket passa pelo agente com o modelo grande: na conta de brinquedo, uma pergunta frequente gasta ${faq.agentCalls} chamadas (uma busca e a resposta), e um caso complexo, ${complex.agentCalls}. A média fica em ${decimal(avgWithout)} unidades por ticket, ${integer(dailyWithout)} por dia em ${integer(TICKETS_PER_DAY)} tickets.`,
        `Com roteador, a classificação custa ${decimal(SMALL, 1)} (modelo pequeno), e cada tipo vai pelo caminho mais barato: a FAQ custa ${decimal(routedCost(faq))}, o caso complexo continua com o agente, ${decimal(routedCost(complex))}. A média cai para ${decimal(avgWith)}, ${integer(dailyWith)} por dia: ${percent(savings)} a menos. A conta só fecha se o roteador acerta: um caso complexo mandado para a FAQ sai barato e errado, por isso o caminho barato precisa de uma saída para o agente.`,
      ],
      keyIdea: "Rotear paga quando a maioria dos pedidos é simples e o classificador é barato e preciso.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "cost",
            piece: "chart",
            kind: "bar",
            series: costSeries,
            highlight: 1,
            color: "module-12",
          },
          {
            id: "totals",
            piece: "metrics-panel",
            metrics: [
              { id: "without", label: "média sem roteador", value: decimal(avgWithout), color: "danger" },
              { id: "with", label: "média com roteador", value: decimal(avgWith), color: "success" },
              { id: "saved", label: "economia", value: percent(savings) },
            ],
            highlight: "saved",
          },
        ],
      },
      alt: `Barras de custo por ticket, em unidades de chamada: ${costSeries.map((item) => `${item.label} ${decimal(item.value)}`).join(", ")}. O painel mostra média de ${decimal(avgWithout)} sem roteador e ${decimal(avgWith)} com roteador, ${percent(savings)} a menos.`,
    },
    {
      id: "graph",
      shortTitle: "Grafo",
      title: "O fluxo como um mapa de estados",
      tag: "tradeoff",
      body: [
        "Um mapa de metrô mostra todas as linhas e baldeações possíveis: você sabe por onde o trem pode ir, mesmo sem saber qual caminho cada passageiro vai pegar. Desenhar o fluxo dos agentes assim deixa claro onde o modelo decide e onde o código decide.",
        "Cada nó é um passo (classificar, responder, rodar o workflow, chamar o agente, chamar uma pessoa) e cada aresta é uma transição, fixa ou escolhida. Quanto mais arestas escolhidas pelo LLM, mais flexível e menos previsível o sistema. A Anthropic recomenda começar pelo mais simples e só dar ao modelo as decisões que melhoram o resultado de forma medida, com uma saída para uma pessoa quando o agente trava.",
      ],
      keyIdea: "Desenhe o fluxo como grafo e decida, aresta por aresta, quem escolhe: o código ou o modelo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "states",
            piece: "graph",
            nodes: [
              { id: "classify", label: "classificar", x: 0.1, y: 0.5, color: "module-12" },
              { id: "faq", label: "faq", x: 0.4, y: 0.12 },
              { id: "workflow", label: "workflow", x: 0.4, y: 0.5 },
              { id: "agent", label: "agente", x: 0.4, y: 0.88 },
              { id: "human", label: "pessoa", x: 0.72, y: 0.88, color: "danger" },
              { id: "end", label: "fim", x: 0.92, y: 0.5, color: "success" },
            ],
            edges: [
              { from: "classify", to: "faq" },
              { from: "classify", to: "workflow" },
              { from: "classify", to: "agent" },
              { from: "faq", to: "agent", label: "não resolveu" },
              { from: "faq", to: "end" },
              { from: "workflow", to: "end" },
              { from: "agent", to: "end" },
              { from: "agent", to: "human", label: "travou" },
              { from: "human", to: "end" },
            ],
            path: ["classify", "agent", "human", "end"],
          },
        ],
      },
      alt: "Grafo de estados: classificar leva a faq, workflow ou agente; a faq pode escalar para o agente; o agente pode terminar ou chamar uma pessoa quando trava. O caminho em destaque vai de classificar ao agente, à pessoa e ao fim.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Quem decide o quê em cada padrão",
      tag: "summary",
      body: [
        "Os padrões de orquestração formam uma escada de autonomia: no encadeamento e na paralelização o código decide tudo; no roteamento o LLM escolhe o caminho; no orquestrador-workers ele também cria as subtarefas; no avaliador-otimizador ele decide quando a resposta está boa; no agente autônomo ele decide tudo isso.",
        "O orquestrador-workers mais usado com agentes tem nome próprio: supervisor e workers. A próxima aula mostra como um supervisor escolhe, a cada passo, qual especialista chamar.",
      ],
      keyIdea: "Suba a escada de autonomia só até o degrau que a tarefa exige.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "ladder",
            piece: "matrix",
            rows: patterns,
            cols: decisions,
            values: whoDecides,
            scale: { min: 0, max: 1 },
            highlight: { row: 3, col: 2 },
            color: "module-12",
          },
        ],
      },
      alt: `Matriz dos padrões de orquestração contra quem decide: ${patterns.map((pattern, row) => `${pattern}: ${decisions.filter((_, col) => whoDecides[row][col] === 1).join(", ")}`).join("; ")}. Em destaque, o orquestrador-workers criando subtarefas.`,
    },
  ],
  realWorldExample:
    "O artigo “Building effective agents”, da Anthropic, organiza os sistemas agênticos nesses mesmos padrões (prompt chaining, routing, parallelization, orchestrator-workers e evaluator-optimizer) antes de chegar aos agentes autônomos, e a documentação do LangGraph mostra como montar o orquestrador-workers com a API Send.",
  code: {
    language: "python",
    source: `import operator
from typing import Annotated, TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.types import Send

class State(TypedDict):
    contratos: list[str]
    analises: Annotated[list[str], operator.add]  # reducer: junta as saídas dos workers

def distribuir(state: State):
    return [Send("analisar", {"contratos": [c], "analises": []}) for c in state["contratos"]]

def analisar(state: State):
    return {"analises": [f"resumo de {state['contratos'][0]}"]}

builder = StateGraph(State)
builder.add_node("analisar", analisar)
builder.add_conditional_edges(START, distribuir, ["analisar"])
builder.add_edge("analisar", END)
graph = builder.compile()`,
    caption: "Orquestrador-workers no LangGraph: a aresta condicional devolve um Send por contrato, os workers rodam em paralelo e o reducer operator.add junta as análises.",
  },
  tradeOffs: {
    pros: [
      "Cada pedido segue o caminho mais barato que resolve",
      "Caminhos fixos no código são previsíveis, testáveis e auditáveis",
      "O orquestrador adapta a divisão do trabalho a cada pedido",
    ],
    cons: [
      "Um roteador errado manda casos difíceis para caminhos que não resolvem",
      "Cada decisão dada ao LLM torna o fluxo menos previsível",
      "Mais caminhos significam mais coisas para testar e monitorar",
    ],
    alternatives: [
      "Agente único para tudo, quando o volume é baixo e os pedidos variam muito",
      "Regras simples em código no lugar do roteador, quando as categorias são óbvias",
    ],
  },
  knowledgeCheck: [
    {
      id: "pick-pattern",
      prompt: "Um app traduz um documento, confere se termos técnicos foram mantidos e só então formata. Os passos são sempre os mesmos. Qual padrão usar?",
      options: [
        "Um agente autônomo com as três ferramentas",
        "Prompt chaining com uma checagem em código entre a tradução e a formatação",
        "Orquestrador-workers com subtarefas dinâmicas",
        "Debate entre três agentes",
      ],
      correct: 1,
      explanation: "Os passos são fixos e conhecidos: o encadeamento com um portão em código é o mais simples, previsível e barato. Não há decisão para dar ao modelo.",
      lesson: "12-12",
    },
    {
      id: "router-math",
      prompt: "80% dos pedidos são simples e custam 1 unidade num caminho barato; 20% precisam do agente, que custa 5. Sem roteador, todos custam 5. Com um roteador de 0,1, qual é a média?",
      options: ["5,0", "1,9", "1,8", "4,1"],
      correct: 1,
      explanation: "Com roteador: 0,1 + 0,8 × 1 + 0,2 × 5 = 0,1 + 0,8 + 1,0 = 1,9 unidades, contra 5 sem roteador.",
      lesson: "12-12",
    },
  ],
  related: ["12-11", "12-13", "05-12"],
  references: [
    { title: "Anthropic: Building effective agents", url: "https://www.anthropic.com/engineering/building-effective-agents", kind: "article" },
    { title: "LangGraph: Graph API (State, Send, Command)", url: "https://docs.langchain.com/oss/python/langgraph/graph-api", kind: "docs" },
    { title: "Shen et al. (2023), HuggingGPT: Solving AI Tasks with ChatGPT and its Friends in Hugging Face", url: "https://arxiv.org/abs/2303.17580", kind: "paper" },
  ],
};

export default lesson;
