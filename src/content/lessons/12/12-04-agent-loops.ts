import { runAgent } from "../../../lab/agentLoop";
import { agentLoopContent } from "../../playgrounds/agent-loop";
import type { LessonContent } from "../../../types/content";

// O loop do agente com a tarefa do playground (3 cafés em reais), rodada pelo runAgent do Laboratório com dois
// limites: o do playground, que basta, e um limite curto demais, que para o agente sem resposta. Depois, uma
// tarefa longa de brinquedo mostra os tokens de entrada acumulados: cada chamada reenvia o prompt base e todo o
// histórico, então o total cresce com o quadrado do número de iterações. O preço por token é só um exemplo.

const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const money = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const { script, phases, initialLimit } = agentLoopContent;
const SHORT_LIMIT = 2;
const fullRun = runAgent(script, initialLimit);
const shortRun = runAgent(script, SHORT_LIMIT);
const answerEvent = fullRun.find((event) => event.kind === "answer");
const answerText = answerEvent?.text ?? "";
const iterationsUsed = answerEvent?.iteration ?? initialLimit;
const shortStopped = shortRun.some((event) => event.kind === "limit");
const shortAnswered = shortRun.some((event) => event.kind === "answer");
const textAt = (kind: "think" | "act" | "observe", iteration: number) => {
  const event = fullRun.find((item) => item.kind === kind && item.iteration === iteration);
  return event && event.kind !== "limit" ? event.text : "";
};

// Tarefa longa de brinquedo: prompt base (instruções + definições das ferramentas), e cada volta acrescenta a
// chamada do modelo e a observação. A chamada i lê BASE + (i − 1) × (CALL + OBSERVATION) tokens.
const BASE = 1_500;
const CALL = 80;
const OBSERVATION = 400;
const callInput = (iteration: number) => BASE + (iteration - 1) * (CALL + OBSERVATION);
const cumulativeInput = (iterations: number) =>
  Array.from({ length: iterations }, (_, index) => callInput(index + 1)).reduce((sum, value) => sum + value, 0);
const iterationCounts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const cumulativeSeries = iterationCounts.map((count) => ({ label: `${count}`, value: cumulativeInput(count) }));
const LIMIT = 10;
const HALF = LIMIT / 2;
const growth = cumulativeInput(LIMIT) / cumulativeInput(HALF);
const PRICE_PER_MILLION = 3;
const costOf = (iterations: number) => (cumulativeInput(iterations) / 1_000_000) * PRICE_PER_MILLION;
const TASKS_PER_DAY = 10_000;

const lesson: LessonContent = {
  id: "12-04",
  subtitle: "Como cada volta do loop começa e termina, as condições de parada, e por que o custo de um agente cresce mais rápido que o número de voltas.",
  objectives: [
    "Descrever uma iteração do loop: montar o contexto, chamar o modelo, executar, observar",
    "Listar as condições de parada e implementar um limite de iterações",
    "Prever o que acontece quando o limite é menor que a tarefa",
    "Calcular os tokens acumulados de N iterações e o custo da tarefa",
  ],
  steps: [
    {
      id: "taste",
      shortTitle: "Uma volta",
      title: "Provar, ajustar, provar de novo",
      tag: "context",
      body: [
        "Quem cozinha um molho não segue a receita de olhos fechados: prova, acrescenta sal, prova de novo, até ficar bom. Cada prova é uma informação nova que decide o próximo ajuste, e parar também é uma decisão: a hora em que o molho está pronto.",
        `O [[agent loop|agent-loop]] é esse ciclo. Na volta 1 da tarefa do playground, o modelo pensa “${textAt("think", 1)}”, pede ${textAt("act", 1)} e recebe a [[observação|observation]] “${textAt("observe", 1)}”. É o padrão do [[ReAct|react-prompting]]: raciocínio e ação se alternam, e cada observação entra no contexto da volta seguinte.`,
      ],
      keyIdea: "Cada volta do loop termina com uma observação nova, e a decisão seguinte parte dela.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "loop",
            piece: "agent-loop",
            phases,
            active: "think",
            iteration: 1,
            maxIterations: initialLimit,
          },
        ],
      },
      alt: `Loop do agente na fase pensar da iteração 1 de ${initialLimit}, com as fases pensar, agir e observar.`,
    },
    {
      id: "inside",
      shortTitle: "Por dentro",
      title: "O que o runtime faz em cada volta",
      tag: "mechanism",
      body: [
        "Por dentro, uma volta é uma sequência curta e sempre igual. O runtime junta instruções, ferramentas e histórico; chama o modelo; olha a resposta. Se a resposta pede uma ferramenta, ele executa e anexa o resultado ao histórico. Se não pede, a volta termina com a resposta final.",
        `Na API da Anthropic, o sinal vem no campo stop_reason: "tool_use" quando o modelo quer uma ferramenta. O runtime executa cada bloco tool_use e devolve um tool_result com o mesmo id. Na volta 2 da tarefa, isso significa executar ${textAt("act", 2)} e anexar “${textAt("observe", 2)}”. Nada no modelo guarda a volta anterior: a memória do loop é o histórico reenviado.`,
      ],
      keyIdea: "Uma volta = montar o contexto, chamar o modelo, executar a ferramenta pedida, anexar a observação.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "loop-flow",
            piece: "block-diagram",
            blocks: [
              { id: "context", kind: "context", label: "contexto", col: 0, row: 0 },
              { id: "llm", kind: "llm", label: "modelo", col: 1, row: 0 },
              { id: "tool", kind: "tool", label: "calcular", col: 2, row: 0 },
              { id: "obs", kind: "documents", label: "observação", col: 2, row: 1 },
              { id: "answer", kind: "answer", label: "resposta", col: 3, row: 0 },
            ],
            edges: [
              { from: "context", to: "llm" },
              { from: "llm", to: "tool", label: "tool_use" },
              { from: "tool", to: "obs", label: "resultado" },
              { from: "obs", to: "context", label: "anexa" },
              { from: "llm", to: "answer", label: "sem tool" },
            ],
            active: "tool",
            done: ["context", "llm"],
          },
        ],
      },
      alt: "O contexto vai ao modelo, que pede uma ferramenta; a ferramenta calcular, em destaque, produz uma observação, que é anexada ao contexto da próxima volta. Quando o modelo não pede ferramenta, sai a resposta.",
    },
    {
      id: "stop",
      shortTitle: "Parar",
      title: "Quatro jeitos de o loop parar",
      tag: "mechanism",
      body: [
        "Todo laço precisa de uma saída. A saída boa é o modelo decidir que terminou e responder sem pedir ferramenta. Mas o modelo pode girar em falso: repetir a mesma busca, alternar entre duas ferramentas, esperar por algo que não vem. Sem uma trava, o loop vira um taxímetro ligado.",
        "Por isso o runtime define cada [[condição de parada|stop-condition]]: a resposta sem ferramenta, um [[limite de iterações|max-iterations]], um tempo máximo e um orçamento de tokens. Quando um limite é atingido, a saída honesta é parar e dizer que não terminou, ou escalar para uma pessoa. A Anthropic recomenda exatamente isso: limites como um número máximo de iterações para manter o controle.",
      ],
      keyIdea: "Uma saída é do modelo (respondeu); as outras são do runtime (iterações, tempo, orçamento).",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "loop-flow",
            piece: "block-diagram",
            blocks: [
              { id: "context", kind: "context", label: "contexto", col: 0, row: 0 },
              { id: "llm", kind: "llm", label: "modelo", col: 1, row: 0 },
              { id: "tool", kind: "tool", label: "calcular", col: 2, row: 0 },
              { id: "obs", kind: "documents", label: "observação", col: 2, row: 1 },
              { id: "answer", kind: "answer", label: "resposta", col: 3, row: 0 },
              { id: "limit", kind: "guardrail", label: "limite", col: 1, row: 1 },
            ],
            edges: [
              { from: "context", to: "llm" },
              { from: "llm", to: "tool", label: "tool_use" },
              { from: "tool", to: "obs", label: "resultado" },
              { from: "obs", to: "limit", label: "checa" },
              { from: "limit", to: "context", label: "continua" },
              { from: "llm", to: "answer", label: "sem tool" },
              { from: "limit", to: "answer", label: "para", variant: "alternative" },
            ],
            active: "limit",
          },
        ],
      },
      alt: "O mesmo loop com uma trava de limite, em destaque, entre a observação e o próximo contexto: se o limite de iterações, tempo ou orçamento chegou, o caminho tracejado encerra o loop; senão, a volta continua.",
    },
    {
      id: "limit",
      shortTitle: "O limite",
      title: `Limite ${initialLimit} contra limite ${SHORT_LIMIT}`,
      tag: "example",
      body: [
        `Com o limite do playground, ${initialLimit} iterações, o agente responde na volta ${iterationsUsed}: “${answerText}” Com um limite de ${SHORT_LIMIT}, o runAgent do Laboratório ${shortStopped ? `para na volta ${SHORT_LIMIT}` : "não para"}: o agente já tem a cotação e já fez a conta, mas a volta em que escreveria a resposta nunca acontece.`,
        `O limite é uma escolha de projeto. Curto demais, ele corta tarefas que estavam quase prontas${shortAnswered ? "" : ", como aqui"}. Longo demais, deixa um agente perdido gastar tokens por muito tempo. Uma regra prática é medir quantas voltas as tarefas reais usam e pôr o limite com folga acima disso. Teste os dois casos no playground do loop de agente, no Laboratório.`,
      ],
      keyIdea: "O limite de iterações precisa caber nas tarefas reais, com folga, e a parada no limite precisa ser tratada.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "limits",
            piece: "metrics-panel",
            metrics: [
              { id: "full", label: `limite ${initialLimit}`, value: `resposta na volta ${iterationsUsed}`, color: "success" },
              { id: "short", label: `limite ${SHORT_LIMIT}`, value: shortStopped ? "parou sem resposta" : "respondeu", color: "danger" },
            ],
            highlight: "short",
          },
          {
            id: "loop",
            piece: "agent-loop",
            phases,
            active: "observe",
            iteration: SHORT_LIMIT,
            maxIterations: SHORT_LIMIT,
            tool: textAt("act", SHORT_LIMIT),
          },
        ],
      },
      alt: `Com limite ${initialLimit}, o agente responde na volta ${iterationsUsed}; com limite ${SHORT_LIMIT}, o loop para na volta ${SHORT_LIMIT}, na fase observar, depois de ${textAt("act", SHORT_LIMIT)}, sem escrever a resposta.`,
    },
    {
      id: "tokens",
      shortTitle: "Tokens",
      title: "O custo cresce mais rápido que as voltas",
      tag: "tradeoff",
      body: [
        "Imagine reler o caderno inteiro antes de escrever cada linha nova. Na primeira linha é rápido; na centésima, você relê 99 linhas. Um agente faz isso: o modelo não guarda nada entre chamadas, então cada volta reenvia tudo o que aconteceu antes.",
        `Numa tarefa longa com prompt base de ${integer(BASE)} tokens e ${CALL + OBSERVATION} tokens novos por volta, a chamada i lê ${integer(BASE)} + (i − 1) × ${CALL + OBSERVATION}. O total acumulado é ${integer(cumulativeInput(HALF))} tokens em ${HALF} voltas e ${integer(cumulativeInput(LIMIT))} em ${LIMIT}: o dobro de voltas custa ${growth.toFixed(1).replace(".", ",")} vezes mais. A um preço de exemplo de US$ ${PRICE_PER_MILLION} por milhão de tokens de entrada, são ${money(costOf(LIMIT))} por tarefa, ou ${money(costOf(LIMIT) * TASKS_PER_DAY)} por dia em ${integer(TASKS_PER_DAY)} tarefas.`,
      ],
      keyIdea: "Os tokens de entrada acumulados crescem com o quadrado das iterações: cada volta a mais custa mais que a anterior.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "cumulative",
            piece: "chart",
            kind: "line",
            series: cumulativeSeries,
            highlight: iterationCounts.indexOf(HALF),
            color: "module-12",
          },
        ],
      },
      alt: `Linha dos tokens de entrada acumulados por número de iterações, de 1 a ${LIMIT}: ${cumulativeSeries.map((item) => `${item.label}, ${integer(item.value)}`).join("; ")}. A curva sobe cada vez mais rápido.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "O loop em uma linha",
      tag: "summary",
      body: [
        "O loop do agente repete quatro passos até uma condição de parada: montar o contexto, chamar o modelo, executar a ferramenta pedida e anexar a observação. A parada boa vem do modelo; as travas vêm do runtime.",
        "As ferramentas são a parte do loop que toca o mundo. A próxima aula olha para elas do ponto de vista do agente: como descrevê-las, como devolver resultados e erros, e quando chamar várias de uma vez.",
      ],
      keyIdea: "Loop = contexto → modelo → ferramenta → observação, repetido até parar, sempre com limite.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "cycle",
            piece: "pipeline",
            stages: [
              { id: "build", label: "montar contexto" },
              { id: "call", label: "chamar modelo", color: "module-12" },
              { id: "run", label: "executar ferramenta" },
              { id: "append", label: "anexar observação" },
              { id: "stop", label: "parar", color: "success" },
            ],
            repeat: { from: "build", to: "append", label: `× até ${initialLimit}` },
            active: "stop",
            done: ["build", "call", "run", "append"],
          },
        ],
      },
      alt: `Pipeline do loop: montar contexto, chamar modelo, executar ferramenta e anexar observação, num trecho repetido até ${initialLimit} vezes, e então parar.`,
    },
  ],
  realWorldExample:
    "A documentação de tool use da Anthropic descreve o mesmo ciclo: quando o Claude quer uma ferramenta, a resposta vem com stop_reason \"tool_use\" e blocos tool_use; o código executa e devolve tool_result. O Claude Agent SDK entrega esse loop pronto, o mesmo que roda no Claude Code.",
  code: {
    language: "python",
    source: `MAX_ITERATIONS = 10

def run(client, messages):
    for _ in range(MAX_ITERATIONS):
        response = client.messages.create(
            model=MODEL, max_tokens=16_000, system=SYSTEM, tools=TOOLS, messages=messages
        )
        messages.append({"role": "assistant", "content": response.content})
        if response.stop_reason != "tool_use":
            return response  # o modelo respondeu: parada natural
        results = [
            {"type": "tool_result", "tool_use_id": block.id, "content": run_tool(block.name, block.input)}
            for block in response.content
            if block.type == "tool_use"
        ]
        messages.append({"role": "user", "content": results})
    raise RuntimeError("limite de iterações atingido")`,
    caption: "O loop com a API de mensagens da Anthropic: executa cada tool_use, devolve tool_result e para quando o modelo responde ou o limite chega.",
  },
  tradeOffs: {
    pros: [
      "O mesmo loop simples resolve tarefas de tamanhos muito diferentes",
      "Cada observação corrige o rumo da decisão seguinte",
      "Limites no runtime tornam o custo máximo de uma tarefa previsível",
    ],
    cons: [
      "Os tokens acumulados crescem com o quadrado das voltas",
      "O modelo pode girar em falso, repetindo ações sem progresso",
      "Um limite mal calibrado corta tarefas boas ou deixa passar loops perdidos",
    ],
    alternatives: [
      "Planejar antes e executar os passos sem reenviar todo o raciocínio (aula de planejamento)",
      "Compactar o histórico quando ele cresce (aula de gerenciamento de contexto)",
    ],
  },
  knowledgeCheck: [
    {
      id: "limit-hit",
      prompt: "Um agente de suporte bate no limite de 8 iterações em 30% das conversas e para sem resposta. Os rastros mostram a mesma busca repetida várias vezes. Qual é a melhor primeira ação?",
      options: [
        "Subir o limite para 100 iterações",
        "Investigar por que ele repete a busca (descrição da ferramenta, observação pouco útil) e tratar a parada no limite com uma resposta honesta ou escalação",
        "Remover o limite",
        "Trocar o limite de iterações por um limite de caracteres na resposta",
      ],
      correct: 1,
      explanation: "Repetir a mesma ação é sinal de loop em falso: subir o limite só aumenta o custo. Corrija a causa e trate a parada no limite com uma saída honesta.",
      lesson: "12-04",
    },
    {
      id: "token-growth",
      prompt: "Cada volta de um agente acrescenta 500 tokens ao histórico. Por que o total de tokens de entrada de 20 voltas é bem mais que o dobro do de 10 voltas?",
      options: [
        "Porque o modelo fica mais lento",
        "Porque cada chamada reenvia o histórico inteiro, que é maior a cada volta: o total cresce com o quadrado das voltas",
        "Porque as ferramentas cobram por chamada",
        "Não é: o total é exatamente o dobro",
      ],
      correct: 1,
      explanation: "A chamada i lê o prompt base mais (i − 1) blocos de histórico. Somando todas as chamadas, o termo do histórico cresce como n(n − 1)/2.",
      lesson: "12-04",
    },
  ],
  related: ["12-03", "12-05", "08-14"],
  references: [
    { title: "Anthropic: Tool use with Claude", url: "https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview", kind: "docs" },
    { title: "Anthropic: Building effective agents", url: "https://www.anthropic.com/engineering/building-effective-agents", kind: "article" },
    { title: "Yao et al. (2022), ReAct: Synergizing Reasoning and Acting in Language Models", url: "https://arxiv.org/abs/2210.03629", kind: "paper" },
  ],
};

export default lesson;
