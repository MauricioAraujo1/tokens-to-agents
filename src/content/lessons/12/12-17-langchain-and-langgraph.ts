import { runAgent } from "../../../lab/agentLoop";
import type { LessonContent } from "../../../types/content";
import { agentLoopContent } from "../../playgrounds/agent-loop";

// LangGraph com contas no arquivo: a tarefa do café do playground do loop de agente (src/lab/agentLoop.ts),
// rodada pelo runAgent e traduzida num grafo de dois nós, agente e ferramentas, ligados por uma aresta
// condicional. Cada nó roda num super-step, acrescenta uma mensagem ao estado pelo reducer e gera um
// checkpoint. Os números da cena saem desse roteiro, não de uma execução real do LangGraph.

const { script, task, initialLimit } = agentLoopContent;
const events = runAgent(script, initialLimit);
const acts = events.filter((event) => event.kind === "act");
const observations = events.filter((event) => event.kind === "observe");
const answer = events.find((event) => event.kind === "answer");
const textOf = (event: (typeof events)[number] | undefined) => (event && event.kind !== "limit" ? event.text : "");

const toolCalls = acts.length;
// O nó agente roda uma vez por chamada de ferramenta e mais uma para responder; o nó ferramentas, uma vez por chamada.
const superSteps = 2 * toolCalls + 1;
const checkpoints = superSteps;

// O estado tem um campo messages com reducer: cada nó devolve uma mensagem nova, que é anexada à lista.
const stateMessages = [
  "user: pergunta",
  ...acts.flatMap((act, index) => [`ai: ${act.text.split("(")[0]}`, `tool: ${textOf(observations[index])}`]),
  `ai: ${textOf(answer)}`,
];
const lengthAfter = Array.from({ length: superSteps }, (_, step) => step + 2);
const finalLength = stateMessages.length;

const RECURSION_LIMIT = 4;
const limitHit = superSteps > RECURSION_LIMIT;

const lesson: LessonContent = {
  id: "12-17",
  subtitle: "O agente como um grafo de estados: nós que atualizam o estado, arestas que decidem o próximo passo e checkpoints que deixam pausar e retomar.",
  objectives: [
    "Diferenciar o create_agent do LangChain do grafo explícito do LangGraph",
    "Montar um StateGraph com nós, aresta condicional, START e END",
    "Explicar reducers, super-steps e o limite de recursão",
    "Escolher um checkpointer e usar thread_id para retomar uma execução",
  ],
  steps: [
    {
      id: "stack",
      shortTitle: "Duas camadas",
      title: "O jogo pronto e o tabuleiro em branco",
      tag: "context",
      body: [
        "Você pode comprar um jogo de tabuleiro com as regras prontas ou um tabuleiro em branco onde desenha as casas e as setas. O jogo pronto sai jogando; o tabuleiro em branco aceita qualquer regra que você inventar.",
        "O [[LangChain|langchain]] é o jogo pronto: create_agent monta um agente com modelo, ferramentas e prompt, e a documentação o descreve como um harness mínimo e configurável. O [[LangGraph|langgraph]] é o tabuleiro: uma biblioteca de orquestração de baixo nível em que você desenha o fluxo como grafo. Os agentes do LangChain rodam sobre o LangGraph, e por isso herdam dele a persistência, a pausa humana e a execução durável.",
      ],
      keyIdea: "LangChain dá o agente pronto; LangGraph dá o grafo por baixo, quando você precisa desenhar o fluxo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "stack",
            piece: "block-diagram",
            blocks: [
              { id: "app", kind: "laptop", label: "seu app", col: 0, row: 0.5 },
              { id: "langchain", kind: "agent", label: "create_agent", col: 1, row: 0.5 },
              { id: "langgraph", kind: "server", label: "langgraph", col: 2, row: 0.5 },
              { id: "llm", kind: "llm", label: "modelo", col: 3, row: 0 },
              { id: "tools", kind: "tool", label: "ferramentas", col: 3, row: 1 },
            ],
            edges: [
              { from: "app", to: "langchain", label: "tools + prompt" },
              { from: "langchain", to: "langgraph", label: "roda sobre" },
              { from: "langgraph", to: "llm" },
              { from: "langgraph", to: "tools" },
            ],
            active: "langgraph",
          },
        ],
      },
      alt: "Seu app entrega ferramentas e prompt ao create_agent do LangChain, que roda sobre o LangGraph, em destaque; o LangGraph chama o modelo e as ferramentas.",
    },
    {
      id: "graph",
      shortTitle: "O grafo",
      title: "Nós, arestas e uma decisão",
      tag: "mechanism",
      body: [
        `No tabuleiro, cada casa é uma ação e cada seta diz para onde ir. Uma casa especial tem duas setas e uma regra: “se tirou par, vá para a esquerda”. Na tarefa “${task}”, a regra é: o modelo pediu ferramenta? Vá para as ferramentas. Senão, fim.`,
        "Num [[StateGraph|state-graph]], cada nó é uma função que recebe o estado e devolve uma atualização parcial. add_edge liga dois nós sempre; add_conditional_edges chama uma função de roteamento sobre o estado e escolhe o próximo nó. Essa [[aresta condicional|conditional-edge]] é o coração do agente: do nó agente para tools quando há tool calls, para END quando não há. START entrega a entrada ao primeiro nó e END encerra o caminho.",
      ],
      keyIdea: "Um agente ReAct no LangGraph são dois nós e uma aresta condicional que volta ao modelo depois de cada ferramenta.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "graph",
            piece: "graph",
            nodes: [
              { id: "start", label: "START", x: 0.08, y: 0.5 },
              { id: "agent", label: "agente", x: 0.38, y: 0.5, color: "module-12" },
              { id: "tools", label: "ferramentas", x: 0.68, y: 0.2 },
              { id: "end", label: "END", x: 0.9, y: 0.75 },
            ],
            edges: [
              { from: "start", to: "agent" },
              { from: "agent", to: "tools", label: "tool calls?" },
              { from: "tools", to: "agent" },
              { from: "agent", to: "end", label: "sem tool call" },
            ],
            highlight: ["agent"],
            path: ["start", "agent", "tools"],
          },
        ],
      },
      alt: "Grafo de estados: START leva ao nó agente, em destaque. A aresta condicional vai para ferramentas quando há tool calls, e as ferramentas voltam ao agente; sem tool call, o agente vai para END.",
    },
    {
      id: "state",
      shortTitle: "Estado",
      title: "O reducer anexa, não sobrescreve",
      tag: "mechanism",
      body: [
        "A ficha que o peão carrega no tabuleiro é o estado. Se cada casa apagasse a ficha e escrevesse só a sua anotação, na última casa ninguém lembraria qual era a pergunta.",
        `Por padrão, a atualização de um nó sobrescreve o campo do estado. Um [[reducer|state-reducer]] muda isso: com Annotated[list, add_messages], cada mensagem devolvida é anexada à lista (e uma mensagem com o mesmo id é atualizada). Na tarefa do café, a lista cresce de 1 para ${finalLength} mensagens: ${stateMessages.join(", ")}. Sem o reducer, depois de cada nó ela teria só a última mensagem.`,
      ],
      keyIdea: "O reducer define como cada atualização se junta ao estado; para mensagens, anexar é o que mantém o histórico.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "state",
            piece: "token-stream",
            tokens: stateMessages,
            keys: [finalLength - 1],
            bars: stateMessages.map((_, index) => (index + 1) / finalLength),
            color: "module-12",
          },
        ],
      },
      alt: `O campo messages do estado depois da execução, com ${finalLength} mensagens: ${stateMessages.join(", ")}. A barra de cada mensagem cresce com a posição na lista, e a última, a resposta, está em destaque.`,
    },
    {
      id: "steps",
      shortTitle: "Super-steps",
      title: `${superSteps} super-steps, ${checkpoints} checkpoints`,
      tag: "example",
      body: [
        `Cada rodada do jogo é um lance. A tarefa do café, rodada pelo mesmo loop do Laboratório, faz ${toolCalls} chamadas de ferramenta e responde: o nó agente roda ${toolCalls + 1} vezes e o nó ferramentas ${toolCalls}, num total de ${superSteps} lances.`,
        `O LangGraph executa em super-steps: nós que rodam em paralelo dividem o mesmo super-step, e nós em sequência usam super-steps separados. A lista de mensagens tem ${lengthAfter.join(", ")} itens depois de cada um, e o [[checkpointing|checkpointing]] grava o estado a cada super-step. O recursion_limit limita quantos super-steps uma execução pode ter: com limite ${RECURSION_LIMIT}, esta execução ${limitHit ? "pararia com GraphRecursionError antes de responder" : "terminaria normalmente"}. É o [[limite de iterações|max-iterations]] do agente, no vocabulário do grafo.`,
      ],
      keyIdea: "Cada passo do grafo é um super-step com checkpoint, e o recursion_limit é o limite de iterações do agente.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "steps",
            piece: "pipeline",
            stages: [
              { id: "start", label: "START" },
              { id: "agent", label: "agente", color: "module-12" },
              { id: "tools", label: "ferramentas" },
              { id: "answer", label: "agente responde" },
              { id: "end", label: "END" },
            ],
            repeat: { from: "agent", to: "tools", label: `× ${toolCalls}` },
            active: "answer",
            done: ["start", "agent", "tools"],
          },
          {
            id: "run",
            piece: "metrics-panel",
            metrics: [
              { id: "steps", label: "super-steps", value: `${superSteps}` },
              { id: "checkpoints", label: "checkpoints", value: `${checkpoints}`, color: "info" },
              { id: "messages", label: "mensagens no estado", value: `${finalLength}` },
              { id: "limit", label: `recursion_limit ${RECURSION_LIMIT}`, value: limitHit ? "GraphRecursionError" : "ok", color: limitHit ? "danger" : "success" },
            ],
            highlight: "limit",
          },
        ],
      },
      alt: `Pipeline da execução: START, agente e ferramentas repetidos ${toolCalls} vezes, agente responde, em destaque, e END. O painel mostra ${superSteps} super-steps, ${checkpoints} checkpoints, ${finalLength} mensagens no estado e, com recursion_limit ${RECURSION_LIMIT}, ${limitHit ? "GraphRecursionError" : "execução normal"}.`,
    },
    {
      id: "persist",
      shortTitle: "Checkpointer",
      title: "Salvar o jogo, retomar depois",
      tag: "tradeoff",
      body: [
        "Salvar o jogo permite parar no meio e continuar amanhã, ou voltar a uma jogada anterior. Mas onde o jogo fica salvo importa: na memória do console, ele some quando a energia cai.",
        "O checkpointer guarda o estado por thread, escolhido com {\"configurable\": {\"thread_id\": ...}}. InMemorySaver serve para testes e perde tudo quando o processo reinicia; SqliteSaver serve para desenvolvimento local; PostgresSaver é o recomendado para produção. É ele que permite o interrupt() da aula anterior e retomar depois de uma falha. O preço do grafo explícito é mais código e mais conceitos que um create_agent; o ganho é controle sobre cada passo.",
      ],
      keyIdea: "Sem checkpointer durável não há pausa longa nem retomada depois de falha; o thread_id escolhe qual execução retomar.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "persist",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "thread_id", col: 0, row: 0.5 },
              { id: "graph", kind: "server", label: "grafo compilado", col: 1, row: 0.5 },
              { id: "memory", kind: "memory", label: "InMemorySaver", col: 2, row: 0 },
              { id: "postgres", kind: "sql-db", label: "PostgresSaver", col: 2, row: 1 },
              { id: "resume", kind: "answer", label: "retoma o thread", col: 3, row: 1 },
            ],
            edges: [
              { from: "user", to: "graph", label: "invoke" },
              { from: "graph", to: "memory", label: "testes", variant: "alternative" },
              { from: "graph", to: "postgres", label: "produção" },
              { from: "postgres", to: "resume", label: "checkpoint" },
            ],
            active: "postgres",
          },
        ],
      },
      alt: "O app chama o grafo compilado com um thread_id. O grafo salva checkpoints no InMemorySaver, tracejado, que serve só para testes, ou no PostgresSaver, em destaque, de produção, a partir do qual a execução do thread é retomada.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Estado, nós, arestas e checkpoints",
      tag: "summary",
      body: [
        "No LangGraph, o agente é um grafo: o estado tem campos com reducers, os nós devolvem atualizações, as arestas condicionais decidem o próximo nó e o checkpointer salva cada super-step por thread. O LangChain monta esse grafo para você com create_agent.",
        "Ter o fluxo explícito facilita testar cada nó e retomar execuções, mas não torna o agente confiável sozinho. A próxima aula, a última do módulo, trata disso: erros que se acumulam, retries e idempotência.",
      ],
      keyIdea: "LangGraph = estado com reducers + nós + arestas condicionais + checkpoints por thread.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "graph",
            piece: "graph",
            nodes: [
              { id: "start", label: "START", x: 0.08, y: 0.5 },
              { id: "agent", label: "agente", x: 0.38, y: 0.5, color: "module-12" },
              { id: "tools", label: "ferramentas", x: 0.68, y: 0.2 },
              { id: "end", label: "END", x: 0.9, y: 0.75 },
            ],
            edges: [
              { from: "start", to: "agent" },
              { from: "agent", to: "tools", label: "tool calls?" },
              { from: "tools", to: "agent" },
              { from: "agent", to: "end", label: "sem tool call" },
            ],
            path: ["start", "agent", "end"],
            visited: ["start", "agent", "tools", "end"],
          },
        ],
      },
      alt: "O mesmo grafo depois da execução: todos os nós visitados, e o caminho final em destaque vai de START ao agente e dele para END, quando não há mais tool calls.",
    },
  ],
  realWorldExample:
    "A documentação do LangGraph mostra o padrão orquestrador-workers com a API Send, que roda o mesmo nó uma vez por item em paralelo e junta os resultados pelo reducer, e a pausa humana com interrupt() sobre um checkpointer. O create_agent do LangChain usa esse mesmo motor: um agente criado com checkpointer e thread_id guarda e retoma o histórico da conversa.",
  code: {
    language: "python",
    source: `from typing import Annotated, TypedDict

from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages

class State(TypedDict):
    messages: Annotated[list, add_messages]

def agent(state: State):
    return {"messages": [llm_with_tools.invoke(state["messages"])]}

def tools(state: State):
    return {"messages": run_tool_calls(state["messages"][-1])}

def route(state: State):
    return "tools" if state["messages"][-1].tool_calls else END

builder = StateGraph(State)
builder.add_node("agent", agent)
builder.add_node("tools", tools)
builder.add_edge(START, "agent")
builder.add_conditional_edges("agent", route, ["tools", END])
builder.add_edge("tools", "agent")
graph = builder.compile(checkpointer=InMemorySaver())

config = {"configurable": {"thread_id": "cafe-1"}, "recursion_limit": 10}
graph.invoke({"messages": [("user", "Quanto custam 3 cafés em reais?")]}, config)`,
    caption: "O agente da aula como StateGraph: llm_with_tools é o modelo com as ferramentas ligadas e run_tool_calls executa as chamadas da última mensagem e devolve as mensagens de ferramenta.",
  },
  tradeOffs: {
    pros: [
      "Fluxo explícito: cada nó e cada decisão de rota pode ser testado sozinho",
      "Checkpoints por thread permitem pausar, retomar e voltar a um passo anterior",
      "Mistura passos fixos em código com passos decididos pelo modelo no mesmo grafo",
    ],
    cons: [
      "Mais conceitos que um loop simples: estado, reducers, super-steps, checkpointers",
      "Reducer errado apaga o histórico sem dar erro",
      "Retomar exige nós com efeitos idempotentes",
    ],
    alternatives: [
      "create_agent do LangChain, quando o loop padrão de agente basta",
      "Um loop próprio com a API do modelo, para agentes pequenos sem pausa",
    ],
  },
  knowledgeCheck: [
    {
      id: "lost-history",
      prompt: "O estado tem messages: list sem reducer. Depois do nó de ferramentas, o modelo não lembra mais a pergunta do usuário. Por quê?",
      options: [
        "O checkpointer apagou o estado",
        "Sem reducer, a atualização sobrescreve o campo, e a lista fica só com a última mensagem",
        "O recursion_limit é baixo demais",
        "Faltou o START",
      ],
      correct: 1,
      explanation: "Por padrão, a atualização de um nó substitui o valor do campo. Com Annotated[list, add_messages], as mensagens novas são anexadas e o histórico fica.",
      lesson: "12-17",
    },
    {
      id: "recursion",
      prompt: "Um agente com 6 chamadas de ferramenta roda num grafo agente ↔ ferramentas com recursion_limit 10. O que acontece?",
      options: [
        "Termina normalmente",
        "Para com GraphRecursionError: precisa de 2 × 6 + 1 = 13 super-steps, mais que o limite",
        "Executa só 10 ferramentas",
        "O LangGraph aumenta o limite sozinho",
      ],
      correct: 1,
      explanation: "Cada chamada usa um super-step do agente e um das ferramentas, mais o super-step final de resposta. Passar do recursion_limit levanta GraphRecursionError.",
      lesson: "12-17",
    },
  ],
  related: ["12-16", "12-18", "12-04"],
  references: [
    { title: "LangGraph: Graph API overview", url: "https://docs.langchain.com/oss/python/langgraph/graph-api", kind: "docs" },
    { title: "LangGraph: Persistence", url: "https://docs.langchain.com/oss/python/langgraph/persistence", kind: "docs" },
    { title: "LangChain: overview", url: "https://docs.langchain.com/oss/python/langchain/overview", kind: "docs" },
  ],
};

export default lesson;
