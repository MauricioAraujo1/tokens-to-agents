import { runAgent } from "../../../lab/agentLoop";
import { agentLoopContent } from "../../playgrounds/agent-loop";
import type { LessonContent } from "../../../types/content";

// A tarefa do playground "Loop de agente" (3 cafés a US$ 2 em reais), rodada aqui pelo mesmo runAgent do
// Laboratório: a aula e o playground mostram o mesmo rastro. Cada iteração do loop é uma chamada ao modelo,
// e é daí que saem as contagens de chamadas comparadas com um chat e com um fluxo de ferramenta fixa.

const { task, script, phases, initialLimit, maxLimit } = agentLoopContent;
const events = runAgent(script, initialLimit);
const acts = events.filter((event) => event.kind === "act");
const observations = events.filter((event) => event.kind === "observe");
const answerEvent = events.find((event) => event.kind === "answer");
const answer = answerEvent?.text ?? "";
const iterationsUsed = answerEvent?.iteration ?? initialLimit;
const toolCalls = acts.length;
const firstAct = acts[0]?.text ?? "";
const firstObservation = observations[0]?.text ?? "";
const secondAct = acts[1]?.text ?? "";
const secondObservation = observations[1]?.text ?? "";

// O rastro como uma fila de fases: pensar, agir, observar... até responder.
const phaseLabel: Record<(typeof events)[number]["kind"], string> = {
  think: "pensar",
  act: "agir",
  observe: "observar",
  answer: "responder",
  limit: "limite",
};
const trace = events.map((event) => phaseLabel[event.kind]);
const traceBars = events.map((event) => (event.kind === "act" || event.kind === "answer" ? 1 : 0.45));

// Chamadas ao modelo: um chat responde numa chamada; um fluxo com uma ferramenta fixa faz duas (decidir e
// responder com o resultado); o agente faz uma por iteração, até o limite do playground.
const callSeries = [
  { label: "chat", value: 1 },
  { label: "1 ferramenta fixa", value: 2 },
  { label: "agente: café", value: iterationsUsed },
  { label: `agente: limite ${maxLimit}`, value: maxLimit },
];

const lesson: LessonContent = {
  id: "12-01",
  subtitle: "O que transforma um modelo que responde num sistema que age: um objetivo, ferramentas e um loop que decide o próximo passo.",
  objectives: [
    "Definir agente de IA como um sistema que persegue um objetivo agindo em loop",
    "Reconhecer as três partes de um agente: modelo, ferramentas e loop",
    "Seguir o rastro de um agente de verdade, iteração por iteração",
    "Explicar por que mais autonomia significa mais chamadas, mais custo e mais risco",
  ],
  steps: [
    {
      id: "doer",
      shortTitle: "Quem faz",
      title: "Do conselho à ação",
      tag: "context",
      body: [
        `Pergunte a um amigo: “${task}” Um amigo explica como fazer a conta. Outro abre o app do banco, olha a cotação, faz a conta na calculadora e te diz o valor. O segundo amigo não sabe mais que o primeiro: ele age. Usa ferramentas, olha o resultado e decide o que fazer em seguida.`,
        `Um [[agente|agent]] de IA é esse segundo amigo. É um [[LLM|llm]] ligado a ferramentas, que recebe um objetivo e decide sozinho os passos: aqui, chamar ${firstAct}, depois ${secondAct}, e só então responder. O modelo continua só gerando texto; quem executa as ferramentas é o código em volta dele, como você viu em [[tool calling|tool-calling]].`,
      ],
      keyIdea: "Um agente não sabe mais que o modelo: ele usa ferramentas e decide o próximo passo até cumprir o objetivo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "você", col: 0, row: 0.5 },
              { id: "agent", kind: "agent", label: "agente", col: 1, row: 0.5 },
              { id: "rate", kind: "cloud", label: "cotacao", col: 2, row: 0 },
              { id: "calc", kind: "tool", label: "calcular", col: 2, row: 1 },
              { id: "answer", kind: "answer", label: "resposta", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "user", to: "agent", label: "objetivo" },
              { from: "agent", to: "rate", label: "1º passo" },
              { from: "agent", to: "calc", label: "2º passo" },
              { from: "agent", to: "answer" },
            ],
            active: "agent",
          },
        ],
      },
      alt: "Você entrega um objetivo ao agente, em destaque, que chama primeiro a ferramenta de cotação, depois a calculadora, e então produz a resposta.",
    },
    {
      id: "loop",
      shortTitle: "O loop",
      title: "Pensar, agir, observar",
      tag: "mechanism",
      body: [
        `O agente trabalha em voltas. Na primeira, ele pensa “${script[0].thought}”, age chamando ${firstAct} e observa a resposta: ${firstObservation}. Cada volta termina com uma informação nova no contexto, e a próxima decisão parte dela.`,
        "Esse ciclo é o [[agent loop|agent-loop]]. O padrão vem do [[ReAct|react-prompting]] (Yao et al., 2022): o modelo intercala raciocínio e ações. O que muda de uma volta para outra é o contexto, que ganha a ação e o resultado. Quanto mais o sistema decide sozinho o próximo passo, maior a sua [[autonomia|agent-autonomy]]; aqui, o modelo escolhe a ferramenta, o argumento e a hora de parar.",
      ],
      keyIdea: "O agente é um loop: cada volta lê o contexto, escolhe uma ação e acrescenta o resultado ao contexto.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "loop",
            piece: "agent-loop",
            phases,
            active: "act",
            iteration: 1,
            maxIterations: initialLimit,
            tool: firstAct,
          },
        ],
      },
      alt: `Loop do agente com as fases pensar, agir e observar, na fase agir da iteração 1 de ${initialLimit}, chamando ${firstAct}.`,
    },
    {
      id: "perceive",
      shortTitle: "Perceber",
      title: "Perceber o ambiente e agir sobre ele",
      tag: "mechanism",
      body: [
        "Um termostato também é um agente simples: mede a temperatura e liga ou desliga o aquecedor. A definição clássica, de Russell e Norvig, é essa: um agente percebe o ambiente e age sobre ele. Para um agente de IA, o ambiente são as ferramentas, os arquivos, as APIs e as pessoas com quem ele fala.",
        `O que o agente percebe chega como [[observação|observation]]: a saída da ferramenta, um erro, uma mensagem. Na segunda volta da tarefa, a ação ${secondAct} devolve ${secondObservation}. O modelo nunca toca no mundo diretamente: o ambiente responde às ações pedidas, e só o que volta como observação entra na próxima decisão.`,
      ],
      keyIdea: "O agente só conhece o mundo pelas observações que voltam das suas ações.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "env",
            piece: "graph",
            nodes: [
              { id: "goal", label: "objetivo", x: 0.1, y: 0.5 },
              { id: "agent", label: "agente", x: 0.38, y: 0.5, color: "module-12" },
              { id: "action", label: secondAct, x: 0.68, y: 0.2 },
              { id: "world", label: "ambiente", x: 0.9, y: 0.5 },
              { id: "obs", label: `observação: ${secondObservation}`, x: 0.68, y: 0.8, color: "success" },
            ],
            edges: [
              { from: "goal", to: "agent" },
              { from: "agent", to: "action", label: "age" },
              { from: "action", to: "world" },
              { from: "world", to: "obs", label: "responde" },
              { from: "obs", to: "agent", label: "percebe" },
            ],
            path: ["agent", "action", "world", "obs", "agent"],
          },
        ],
      },
      alt: `Grafo do ciclo: o objetivo chega ao agente, que age com ${secondAct} sobre o ambiente; o ambiente responde com a observação ${secondObservation}, que volta ao agente.`,
    },
    {
      id: "trace",
      shortTitle: "O rastro",
      title: `A tarefa em ${iterationsUsed} iterações`,
      tag: "example",
      body: [
        `Rodando a tarefa inteira com o limite de ${initialLimit} iterações do playground, o agente faz ${toolCalls} chamadas de ferramenta e responde na iteração ${iterationsUsed}: “${answer}” A fila da cena é o rastro completo, fase por fase, e as barras altas marcam as ações e a resposta.`,
        `Cada iteração é uma chamada ao modelo com o histórico inteiro: ${iterationsUsed} chamadas para uma pergunta de uma linha. A última volta não chama ferramenta: o modelo decide que já tem o que precisa, e é essa decisão que encerra o loop. Se a tarefa pedisse mais voltas que o limite, o runtime pararia o agente sem resposta.`,
      ],
      keyIdea: "O rastro de um agente é a sequência de pensamentos, ações e observações; a resposta é só a última linha.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "iterations", label: "iterações", value: `${iterationsUsed} de ${initialLimit}`, color: "module-12" },
              { id: "tools", label: "chamadas de ferramenta", value: String(toolCalls) },
              { id: "answer", label: "resposta", value: answer, color: "success" },
            ],
            highlight: "answer",
          },
          {
            id: "trace",
            piece: "token-stream",
            tokens: trace,
            bars: traceBars,
            color: "module-12",
          },
        ],
      },
      alt: `Rastro da tarefa: ${trace.join(", ")}. O painel mostra ${iterationsUsed} iterações de ${initialLimit}, ${toolCalls} chamadas de ferramenta e a resposta ${answer}`,
    },
    {
      id: "cost",
      shortTitle: "Autonomia",
      title: "Autonomia custa chamadas",
      tag: "tradeoff",
      body: [
        "Um estagiário que pode decidir sozinho resolve mais coisas, e também pode errar mais caro. Com agentes é igual: deixar o modelo escolher os passos resolve tarefas abertas, mas cada decisão a mais é uma chamada ao modelo e uma chance a mais de erro.",
        `Na cena, um chat faz 1 chamada; um fluxo com uma ferramenta fixa faz 2; o agente fez ${iterationsUsed} na tarefa do café e chegaria a ${maxLimit} no limite máximo do playground. Por isso a Anthropic chama tudo isso de [[sistemas agênticos|agentic-system]], mas recomenda começar pelo mais simples que resolve: muitas tarefas não precisam de um agente.`,
      ],
      keyIdea: "Use um agente quando os passos não dão para prever; para o resto, um fluxo fixo é mais barato e previsível.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "calls",
            piece: "chart",
            kind: "bar",
            series: callSeries,
            highlight: 2,
            color: "module-12",
          },
        ],
      },
      alt: `Chamadas ao modelo por abordagem: ${callSeries.map((item) => `${item.label}, ${item.value}`).join("; ")}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "As peças de um agente",
      tag: "summary",
      body: [
        "Juntando tudo: um agente é um modelo que recebe um objetivo, decide ações, usa ferramentas para agir e lê as observações até terminar. Em volta dele ficam a memória, que guarda o que importa, e as barreiras de segurança, que limitam o que ele pode fazer.",
        "O módulo segue essa ordem: primeiro a diferença entre um LLM e um agente, depois a arquitetura, o loop, as ferramentas, o planejamento e a memória, e por fim sistemas com vários agentes e como torná-los confiáveis. A próxima aula compara um LLM sozinho com um agente.",
      ],
      keyIdea: "Agente = modelo + ferramentas + loop, com memória e barreiras em volta.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "objetivo", col: 0, row: 0.5 },
              { id: "agent", kind: "agent", label: "agente", col: 1, row: 0.5 },
              { id: "llm", kind: "llm", label: "modelo", col: 2, row: 0 },
              { id: "tool", kind: "tool", label: "ferramentas", col: 2, row: 1 },
              { id: "memory", kind: "memory", label: "memória", col: 3, row: 0 },
              { id: "guard", kind: "guardrail", label: "barreiras", col: 3, row: 1 },
            ],
            edges: [
              { from: "user", to: "agent" },
              { from: "agent", to: "llm", label: "decide" },
              { from: "agent", to: "tool", label: "age" },
              { from: "llm", to: "memory" },
              { from: "tool", to: "guard" },
            ],
            active: "agent",
            done: ["user", "llm", "tool"],
          },
        ],
      },
      alt: "O objetivo chega ao agente, em destaque, que usa o modelo para decidir e as ferramentas para agir; memória e barreiras de segurança aparecem como as próximas peças do módulo.",
    },
  ],
  realWorldExample:
    "O Claude Code, assistente de programação da Anthropic, é um agente: recebe uma tarefa, lê arquivos, roda comandos e edita código em loop até terminar. A Anthropic oferece o mesmo loop, as mesmas ferramentas e o mesmo gerenciamento de contexto como biblioteca, no Claude Agent SDK.",
  tradeOffs: {
    pros: [
      "Resolve tarefas cujos passos não dá para prever no código",
      "Usa dados e ações que não estão nos pesos do modelo",
      "Corrige o rumo a cada observação, em vez de seguir um roteiro cego",
    ],
    cons: [
      "Cada iteração é mais uma chamada ao modelo, com custo e latência",
      "O caminho muda de uma execução para outra, o que dificulta testar",
      "Mais autonomia significa mais estrago possível quando ele erra",
    ],
    alternatives: [
      "Um chat simples, quando a resposta já está no conhecimento do modelo",
      "Um fluxo fixo no código, quando os passos são sempre os mesmos",
    ],
  },
  knowledgeCheck: [
    {
      id: "is-agent",
      prompt: "Qual destes sistemas é um agente?",
      options: [
        "Um chatbot que responde perguntas só com o que aprendeu no treino",
        "Um app que sempre traduz o texto e depois resume, nessa ordem fixa",
        "Um assistente que recebe “reserve uma mesa para sábado”, consulta horários, escolhe um e confirma, decidindo cada passo pelo resultado anterior",
        "Um filtro de spam que dá uma probabilidade para cada e-mail",
      ],
      correct: 2,
      explanation: "O que define o agente é decidir os próprios passos em loop, usando ferramentas e as observações que voltam. A ordem fixa do tradutor é um fluxo definido no código.",
      lesson: "12-01",
    },
    {
      id: "observation-only",
      prompt: "Um agente chamou uma ferramenta de cotação, mas a ferramenta caiu e devolveu um erro. O que o agente sabe sobre a cotação na próxima iteração?",
      options: [
        "A cotação certa, porque o modelo acessa a internet diretamente",
        "Só o que voltou como observação: o erro. Ele pode tentar de novo, usar outra ferramenta ou avisar que não conseguiu",
        "Nada, porque o loop sempre termina quando uma ferramenta falha",
        "A cotação do dia em que o modelo foi treinado, que é sempre válida",
      ],
      correct: 1,
      explanation: "O agente só percebe o ambiente pelas observações. Um erro também é uma observação, e a próxima decisão parte dela.",
      lesson: "12-01",
    },
  ],
  related: ["00-08", "05-10", "12-02"],
  references: [
    { title: "Anthropic: Building effective agents", url: "https://www.anthropic.com/engineering/building-effective-agents", kind: "article" },
    { title: "Yao et al. (2022), ReAct: Synergizing Reasoning and Acting in Language Models", url: "https://arxiv.org/abs/2210.03629", kind: "paper" },
    { title: "Artificial Intelligence: A Modern Approach (Russell & Norvig)", url: "https://aima.cs.berkeley.edu/", kind: "article" },
  ],
};

export default lesson;
