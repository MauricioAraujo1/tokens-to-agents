import { runAgent, type AgentIteration } from "../../../lab/agentLoop";
import type { LessonContent } from "../../../types/content";

// A mesma tarefa de agenda resolvida de três jeitos: um LLM sozinho, um workflow com os passos fixos no código
// e um agente rodado pelo runAgent do Laboratório. No caso difícil, a sala do novo horário está ocupada: o
// workflow para no passo que falha, e o agente decide dois passos a mais. Os tamanhos de prompt são de
// brinquedo; o total de tokens de entrada sai das contas abaixo.

const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const TASK = "Mude a minha reunião de amanhã para depois das 15h e avise os participantes.";

// Workflow: a ordem está no código. Cada passo é uma chamada pequena ao modelo, que recebe o resultado do anterior.
const workflowSteps = ["buscar_reuniao", "buscar_horarios", "mover_reuniao", "avisar_participantes"];
const STEP_PROMPT = 500;
const STEP_RESULT = 300;
const workflowInput = (steps: number) =>
  Array.from({ length: steps }, (_, index) => STEP_PROMPT + (index > 0 ? STEP_RESULT : 0)).reduce((sum, value) => sum + value, 0);
const FAILING_STEP = workflowSteps.indexOf("mover_reuniao");

// Agente: o modelo escolhe a próxima ferramenta. Cada iteração reenvia o prompt base (instruções + definições
// das ferramentas) e tudo o que já aconteceu: pensamento + chamada e observação de cada volta anterior.
const AGENT_BASE = 1_200;
const PER_ITERATION = 150 + 300;
const agentInput = (iterations: number) =>
  Array.from({ length: iterations }, (_, index) => AGENT_BASE + index * PER_ITERATION).reduce((sum, value) => sum + value, 0);

const happyScript: AgentIteration[] = [
  { thought: "Primeiro acho a reunião.", action: { tool: "buscar_reuniao", input: '"amanhã"' }, observation: "reunião às 10h, sala 1" },
  { thought: "Preciso de um horário livre depois das 15h.", action: { tool: "buscar_horarios", input: '"após 15h"' }, observation: "16h livre" },
  { thought: "Movo para as 16h.", action: { tool: "mover_reuniao", input: '"16h, sala 1"' }, observation: "ok" },
  { thought: "Falta avisar.", action: { tool: "avisar_participantes", input: '"nova hora: 16h"' }, observation: "4 e-mails enviados" },
  { thought: "Tudo feito.", answer: "Reunião movida para as 16h e participantes avisados." },
];
const conflictScript: AgentIteration[] = [
  happyScript[0],
  happyScript[1],
  { thought: "Movo para as 16h.", action: { tool: "mover_reuniao", input: '"16h, sala 1"' }, observation: "erro: sala 1 ocupada às 16h" },
  { thought: "A sala 1 está ocupada: procuro outra sala às 16h.", action: { tool: "buscar_sala", input: '"16h"' }, observation: "sala 2 livre" },
  { thought: "Movo para a sala 2.", action: { tool: "mover_reuniao", input: '"16h, sala 2"' }, observation: "ok" },
  { thought: "Falta avisar, com a sala nova.", action: { tool: "avisar_participantes", input: '"16h, sala 2"' }, observation: "4 e-mails enviados" },
  { thought: "Tudo feito.", answer: "Reunião movida para as 16h na sala 2 e participantes avisados." },
];
const MAX_ITERATIONS = 8;
const iterationsOf = (script: AgentIteration[]) =>
  runAgent(script, MAX_ITERATIONS).find((event) => event.kind === "answer")?.iteration ?? MAX_ITERATIONS;
const happyIterations = iterationsOf(happyScript);
const conflictEvents = runAgent(conflictScript, MAX_ITERATIONS);
const conflictIterations = iterationsOf(conflictScript);
const conflictAnswer = conflictEvents.find((event) => event.kind === "answer");
const conflictAnswerText = conflictAnswer && conflictAnswer.kind === "answer" ? conflictAnswer.text : "";
const errorObservation = conflictScript[FAILING_STEP].observation ?? "";

const CHAT_INPUT = 300;
const tokenSeries = [
  { label: "llm sozinho", value: CHAT_INPUT },
  { label: "workflow", value: workflowInput(workflowSteps.length) },
  { label: "workflow: erro", value: workflowInput(FAILING_STEP + 1) },
  { label: "agente", value: agentInput(happyIterations) },
  { label: "agente: replaneja", value: agentInput(conflictIterations) },
];
const agentOverWorkflow = agentInput(happyIterations) / workflowInput(workflowSteps.length);

const lesson: LessonContent = {
  id: "12-02",
  subtitle: "Um LLM responde; um workflow segue passos escritos no código; um agente escolhe os passos. Quando cada um vale o custo.",
  objectives: [
    "Distinguir um LLM sozinho, um LLM aumentado, um workflow e um agente",
    "Identificar quem decide a ordem dos passos em cada caso: o código ou o modelo",
    "Comparar o custo em tokens da mesma tarefa nas três abordagens",
    "Escolher a abordagem mais simples que resolve um problema",
  ],
  steps: [
    {
      id: "answer-vs-do",
      shortTitle: "Responder",
      title: "Responder não é fazer",
      tag: "context",
      body: [
        `Peça a um [[LLM|llm]] sozinho: “${TASK}” Ele devolve um texto bem escrito com o passo a passo para você seguir. Não muda nada no calendário, porque um modelo só produz texto. Quem faz o trabalho continua sendo você.`,
        "Um [[agente|agent]] recebe o mesmo pedido e termina com a reunião movida e os convites enviados. A diferença não está no modelo, que pode ser o mesmo: está no sistema em volta, que oferece ferramentas, executa as chamadas e devolve os resultados para o modelo decidir o passo seguinte.",
      ],
      keyIdea: "O mesmo modelo pode só responder ou, dentro de um agente, agir: a diferença é o sistema em volta.",
      scene: {
        kind: "pieces",
        layout: "row",
        pieces: [
          {
            id: "llm-only",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "você", col: 0, row: 0 },
              { id: "llm", kind: "llm", label: "llm", col: 1, row: 0 },
              { id: "text", kind: "answer", label: "passo a passo", col: 1, row: 1 },
            ],
            edges: [
              { from: "user", to: "llm", label: "pedido" },
              { from: "llm", to: "text", label: "texto" },
            ],
            active: "text",
          },
          {
            id: "agent",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "você", col: 0, row: 0 },
              { id: "agent", kind: "agent", label: "agente", col: 1, row: 0 },
              { id: "calendar", kind: "tool", label: "calendário", col: 1, row: 1 },
              { id: "done", kind: "answer", label: "reunião movida", col: 0, row: 1 },
            ],
            edges: [
              { from: "user", to: "agent", label: "pedido" },
              { from: "agent", to: "calendar", label: "age" },
              { from: "calendar", to: "done" },
            ],
            active: "calendar",
          },
        ],
      },
      alt: "Lado a lado: à esquerda, o pedido vai ao LLM, que devolve só um passo a passo em texto; à direita, o pedido vai ao agente, que age no calendário e termina com a reunião movida.",
    },
    {
      id: "spectrum",
      shortTitle: "O espectro",
      title: "Do LLM sozinho ao agente",
      tag: "mechanism",
      body: [
        "Entre o modelo que só responde e o agente que decide tudo há degraus. Pense numa cozinha: a receita escrita (LLM sozinho), o cozinheiro com geladeira e fogão (LLM aumentado), a linha de montagem com a ordem fixa dos pratos (workflow) e o chef que decide o cardápio do dia pelo que chegou do mercado (agente).",
        "O degrau básico é o [[LLM aumentado|augmented-llm]]: o modelo com busca, ferramentas e memória, que gera as próprias consultas e escolhe as ferramentas. A Anthropic separa o resto em dois grupos: no [[workflow|llm-workflow]], LLMs e ferramentas seguem caminhos definidos no código; no agente, o LLM dirige o próprio processo e o uso das ferramentas.",
      ],
      keyIdea: "Workflow: o código define o caminho. Agente: o modelo define o caminho.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "spectrum",
            piece: "pipeline",
            stages: [
              { id: "llm", label: "llm sozinho" },
              { id: "augmented", label: "llm aumentado", color: "module-12" },
              { id: "workflow", label: "workflow" },
              { id: "agent", label: "agente" },
            ],
            active: "augmented",
            done: ["llm"],
          },
        ],
      },
      alt: "Quatro degraus em linha: LLM sozinho, LLM aumentado, em destaque, workflow e agente.",
    },
    {
      id: "who-decides",
      shortTitle: "Quem decide",
      title: "No workflow, o código decide a ordem",
      tag: "mechanism",
      body: [
        `Um workflow para a tarefa é uma receita: ${workflowSteps.join(" → ")}. O modelo preenche cada passo (lê a agenda, escolhe o horário, escreve o e-mail), mas a ordem está escrita no código. É previsível, fácil de testar e barato: ${workflowSteps.length} chamadas pequenas, ${integer(workflowInput(workflowSteps.length))} tokens de entrada no total.`,
        `O problema aparece quando o mundo sai do roteiro. Se a sala do novo horário estiver ocupada, ${workflowSteps[FAILING_STEP]} devolve “${errorObservation}”, e o workflow não tem um passo para isso. Ou ele falha, ou alguém precisa ter previsto esse desvio no código. Cada desvio previsto vira mais um ramo para manter.`,
      ],
      keyIdea: "Um workflow só sabe lidar com os desvios que alguém escreveu nele.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "paths",
            piece: "graph",
            nodes: [
              { id: "find", label: "buscar_reuniao", x: 0.08, y: 0.3 },
              { id: "slots", label: "buscar_horarios", x: 0.3, y: 0.3 },
              { id: "move", label: "mover_reuniao", x: 0.52, y: 0.3 },
              { id: "notify", label: "avisar", x: 0.76, y: 0.3 },
              { id: "busy", label: "sala ocupada", x: 0.52, y: 0.75, color: "danger" },
              { id: "room", label: "buscar_sala", x: 0.76, y: 0.75 },
              { id: "end", label: "fim", x: 0.94, y: 0.5, color: "success" },
            ],
            edges: [
              { from: "find", to: "slots" },
              { from: "slots", to: "move" },
              { from: "move", to: "notify", label: "ok" },
              { from: "move", to: "busy", label: "erro" },
              { from: "busy", to: "room" },
              { from: "room", to: "move" },
              { from: "notify", to: "end" },
            ],
            path: ["find", "slots", "move", "busy"],
          },
        ],
      },
      alt: `Grafo dos passos: buscar_reuniao, buscar_horarios, mover_reuniao, avisar e fim. O caminho em destaque é o do workflow que para no erro de sala ocupada, porque o desvio por buscar_sala não está no roteiro.`,
    },
    {
      id: "agent-path",
      shortTitle: "O agente",
      title: "O agente encontra outro caminho",
      tag: "example",
      body: [
        `O agente recebe o mesmo erro como observação e decide: “${conflictScript[3].thought}” Ele chama buscar_sala, move para a sala livre, avisa e responde: “${conflictAnswerText}” Ninguém escreveu esse desvio; o modelo o montou a partir do erro.`,
        `O preço aparece na conta. No caso normal, o agente usa ${happyIterations} iterações e ${integer(agentInput(happyIterations))} tokens de entrada, cerca de ${agentOverWorkflow.toFixed(1).replace(".", ",")} vezes o workflow, porque cada volta reenvia as instruções, as definições das ferramentas e o histórico. Com o desvio, são ${conflictIterations} iterações e ${integer(agentInput(conflictIterations))} tokens.`,
      ],
      keyIdea: "O agente troca previsibilidade e custo por flexibilidade diante do imprevisto.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "agent-metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "workflow", label: "workflow", value: `${workflowSteps.length} chamadas, para no erro`, color: "danger" },
              { id: "agent", label: "agente com desvio", value: `${conflictIterations} iterações`, color: "success" },
              { id: "tokens", label: "tokens do agente", value: integer(agentInput(conflictIterations)) },
            ],
            highlight: "agent",
          },
          {
            id: "paths",
            piece: "graph",
            nodes: [
              { id: "find", label: "buscar_reuniao", x: 0.08, y: 0.3 },
              { id: "slots", label: "buscar_horarios", x: 0.3, y: 0.3 },
              { id: "move", label: "mover_reuniao", x: 0.52, y: 0.3 },
              { id: "notify", label: "avisar", x: 0.76, y: 0.3 },
              { id: "busy", label: "sala ocupada", x: 0.52, y: 0.75, color: "danger" },
              { id: "room", label: "buscar_sala", x: 0.76, y: 0.75 },
              { id: "end", label: "fim", x: 0.94, y: 0.5, color: "success" },
            ],
            edges: [
              { from: "find", to: "slots" },
              { from: "slots", to: "move" },
              { from: "move", to: "notify", label: "ok" },
              { from: "move", to: "busy", label: "erro" },
              { from: "busy", to: "room" },
              { from: "room", to: "move" },
              { from: "notify", to: "end" },
            ],
            path: ["find", "slots", "move", "busy", "room", "move", "notify", "end"],
          },
        ],
      },
      alt: `O mesmo grafo, agora com o caminho do agente: depois do erro de sala ocupada, ele busca outra sala, move de novo, avisa e termina, em ${conflictIterations} iterações e ${integer(agentInput(conflictIterations))} tokens de entrada.`,
    },
    {
      id: "cost",
      shortTitle: "Custo",
      title: "Quanto custa cada abordagem",
      tag: "tradeoff",
      body: [
        "Contratar um chef para fazer sempre o mesmo sanduíche é desperdício; uma linha de montagem faz melhor e mais barato. Mas, quando o pedido muda todo dia, só o chef resolve. A escolha é pelo tipo de tarefa, não pelo que parece mais moderno.",
        `Na cena, os tokens de entrada da tarefa: ${tokenSeries.map((item) => `${item.label}, ${integer(item.value)}`).join("; ")}. O LLM sozinho é o mais barato e não faz nada. O workflow é barato e previsível, mas para no imprevisto. O agente custa mais e cresce com cada volta. A recomendação da Anthropic é começar pelo mais simples e só subir de degrau quando a tarefa pedir.`,
      ],
      keyIdea: "Escolha o degrau mais baixo que resolve: cada degrau acima soma custo, latência e imprevisibilidade.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "tokens",
            piece: "chart",
            kind: "bar",
            series: tokenSeries,
            highlight: 4,
            color: "module-12",
          },
        ],
      },
      alt: `Tokens de entrada da mesma tarefa: ${tokenSeries.map((item) => `${item.label}, ${integer(item.value)}`).join("; ")}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "O bloco básico: o LLM aumentado",
      tag: "summary",
      body: [
        "Workflows e agentes são montados com a mesma peça: um LLM com busca, ferramentas e memória. No workflow, o código liga várias dessas peças numa ordem fixa. No agente, uma delas recebe o objetivo e decide sozinha a ordem.",
        "A pergunta de projeto é sempre a mesma: os passos dão para prever? Se sim, workflow. Se não, agente, com limites. A próxima aula abre o agente e mostra as partes da sua arquitetura.",
      ],
      keyIdea: "Passos previsíveis pedem workflow; passos imprevisíveis pedem agente.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "augmented",
            piece: "block-diagram",
            blocks: [
              { id: "in", kind: "user", label: "entrada", col: 0, row: 0.5 },
              { id: "llm", kind: "llm", label: "llm aumentado", col: 1, row: 0.5 },
              { id: "search", kind: "retrieval", label: "busca", col: 2, row: 0 },
              { id: "tools", kind: "tool", label: "ferramentas", col: 2, row: 1 },
              { id: "memory", kind: "memory", label: "memória", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "in", to: "llm" },
              { from: "llm", to: "search", label: "consulta" },
              { from: "llm", to: "tools", label: "chamada" },
              { from: "llm", to: "memory", label: "lê e grava" },
            ],
            active: "llm",
          },
        ],
      },
      alt: "O LLM aumentado, em destaque, recebe a entrada e se liga à busca, às ferramentas e à memória: é a peça de workflows e agentes.",
    },
  ],
  realWorldExample:
    "No artigo “Building effective agents”, a Anthropic relata que as implementações de maior sucesso que acompanhou usavam padrões simples e componíveis, e não frameworks complexos. O texto descreve cinco workflows (prompt chaining, routing, parallelization, orchestrator-workers e evaluator-optimizer) antes de chegar aos agentes autônomos.",
  code: {
    language: "python",
    source: `# Workflow: a ordem está no código.
reuniao = llm_preenche(buscar_reuniao, pedido)
horario = llm_preenche(buscar_horarios, reuniao)
mover_reuniao(reuniao, horario)
avisar_participantes(reuniao, horario)

# Agente: o modelo escolhe a próxima ferramenta a cada volta.
historico = [pedido]
for _ in range(MAX_ITERACOES):
    passo = llm_decide(historico, ferramentas)
    if passo.resposta:
        break
    historico.append(ferramentas[passo.nome](**passo.argumentos))`,
    caption: "A mesma tarefa como workflow e como agente: no primeiro, quem decide a ordem é o código; no segundo, é o modelo.",
  },
  tradeOffs: {
    pros: [
      "LLM sozinho: uma chamada, barato e rápido",
      "Workflow: previsível, fácil de testar e de explicar",
      "Agente: lida com desvios que ninguém previu no código",
    ],
    cons: [
      "LLM sozinho: não age no mundo nem consulta dados atuais",
      "Workflow: cada desvio novo exige mudar o código",
      "Agente: custa mais tokens, demora mais e varia de uma execução para outra",
    ],
    alternatives: [
      "Workflow com um ramo de fallback para os erros mais comuns",
      "Workflow que chama um agente só no passo que pede decisão aberta",
    ],
  },
  knowledgeCheck: [
    {
      id: "pick-approach",
      prompt: "Todo dia, um sistema precisa ler a nota fiscal que chega por e-mail, extrair 5 campos e gravar numa planilha. Qual abordagem faz mais sentido?",
      options: [
        "Um agente autônomo com acesso a todas as ferramentas da empresa",
        "Um workflow: os passos são sempre os mesmos, e o modelo só extrai os campos",
        "Um LLM sozinho, sem acesso à planilha",
        "Vários agentes debatendo cada nota",
      ],
      correct: 1,
      explanation: "Os passos são previsíveis. Um workflow é mais barato, mais rápido e mais fácil de testar; o modelo entra só onde precisa entender texto.",
      lesson: "12-02",
    },
    {
      id: "who-decides",
      prompt: "Num sistema, o código chama o modelo para classificar o pedido e, conforme a classe, executa uma de três sequências fixas. Isso é um workflow ou um agente?",
      options: [
        "Um agente, porque usa um LLM",
        "Um workflow: o modelo só classifica, e os caminhos possíveis estão escritos no código",
        "Um agente, porque há mais de um caminho",
        "Nenhum dos dois",
      ],
      correct: 1,
      explanation: "O que define o agente é o modelo dirigir o próprio processo. Aqui, os três caminhos estão no código e o modelo só escolhe a etiqueta: é o workflow de routing.",
      lesson: "12-02",
    },
  ],
  related: ["12-01", "12-03", "05-12"],
  references: [
    { title: "Anthropic: Building effective agents", url: "https://www.anthropic.com/engineering/building-effective-agents", kind: "article" },
    { title: "Lilian Weng: LLM Powered Autonomous Agents", url: "https://lilianweng.github.io/posts/2023-06-23-agent/", kind: "article" },
    { title: "OpenAI: Function calling", url: "https://developers.openai.com/api/docs/guides/function-calling", kind: "docs" },
  ],
};

export default lesson;
