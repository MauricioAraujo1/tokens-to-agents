import type { LessonContent } from "../../../types/content";

// Supervisor e workers com contas no arquivo: um relatório de concorrentes dividido entre três workers de
// brinquedo. Cada worker lê muitos tokens brutos e devolve um resumo curto; o supervisor só vê os resumos.
// O custo do supervisor sai de um prompt base mais os resumos acumulados, reenviados a cada chamada.
// No fim, um loop avaliador-otimizador com notas de brinquedo roda até a nota passar do mínimo.

const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const fixed = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const TASK = "Relatório comparando os 3 maiores concorrentes";

interface Worker {
  id: string;
  label: string;
  job: string;
  /** Tokens que o worker lê no próprio contexto: páginas, tabelas, rascunhos. */
  raw: number;
  /** Tokens do resumo que ele devolve ao supervisor. */
  summary: number;
}

const workers: Worker[] = [
  { id: "research", label: "pesquisador", job: "buscar preços e notícias", raw: 18_000, summary: 600 },
  { id: "analysis", label: "analista", job: "comparar os números", raw: 9_000, summary: 400 },
  { id: "writer", label: "redator", job: "escrever o relatório", raw: 6_000, summary: 900 },
];

const SUPERVISOR_BASE = 2_000;
const totalRaw = workers.reduce((sum, worker) => sum + worker.raw, 0);
const totalSummary = workers.reduce((sum, worker) => sum + worker.summary, 0);
const compression = totalRaw / totalSummary;

// Uma chamada do supervisor para cada delegação e uma última para encerrar.
const supervisorCalls = workers.length + 1;
const supervisorCallTokens = Array.from(
  { length: supervisorCalls },
  (_, call) => SUPERVISOR_BASE + workers.slice(0, call).reduce((sum, worker) => sum + worker.summary, 0),
);
const supervisorInputTokens = supervisorCallTokens.reduce((sum, value) => sum + value, 0);
const supervisorFinalContext = SUPERVISOR_BASE + totalSummary;
const singleAgentFinalContext = SUPERVISOR_BASE + totalRaw;
const contextRatio = singleAgentFinalContext / supervisorFinalContext;

const tokenSeries = workers.flatMap((worker) => [
  { label: `${worker.label} lê`, value: worker.raw },
  { label: `${worker.label} devolve`, value: worker.summary },
]);

// Avaliador-otimizador: o gerador refaz o texto com a crítica até a nota passar do mínimo ou o limite chegar.
const PASS_SCORE = 0.8;
const MAX_ROUNDS = 4;
const roundScores = [0.55, 0.72, 0.86];
const passingRound = roundScores.findIndex((score) => score >= PASS_SCORE) + 1;
const roundsUsed = passingRound > 0 ? passingRound : Math.min(roundScores.length, MAX_ROUNDS);

const DELEGATING = 2;
const delegated = workers[DELEGATING - 1];

const loopPhases = [
  { id: "choose", label: "escolher worker" },
  { id: "delegate", label: "delegar" },
  { id: "review", label: "revisar resultado" },
];

const messages = [
  { from: "boss", to: "research", label: "pesquisar" },
  { from: "research", to: "boss", label: `resumo ${integer(workers[0].summary)}` },
  { from: "boss", to: "analysis", label: "comparar" },
  { from: "analysis", to: "boss", label: `resumo ${integer(workers[1].summary)}` },
  { from: "boss", to: "writer", label: "escrever" },
  { from: "writer", to: "boss", label: `rascunho ${integer(workers[2].summary)}` },
  { from: "boss", to: "user", label: "relatório" },
];
const ACTIVE_MESSAGE = 3;
const nodeNames: Record<string, string> = {
  user: "cliente",
  boss: "supervisor",
  research: "pesquisador",
  analysis: "analista",
  writer: "redator",
};

const lesson: LessonContent = {
  id: "12-13",
  subtitle: "Um agente que não faz o trabalho: escolhe quem faz, recebe um resumo, confere e decide o próximo passo.",
  objectives: [
    "Descrever o loop do supervisor: escolher o worker, delegar, revisar",
    "Calcular quanto contexto um subagente poupa ao devolver só um resumo",
    "Estimar o custo extra das chamadas do supervisor",
    "Montar um loop avaliador-otimizador com critério de parada",
  ],
  steps: [
    {
      id: "foreman",
      shortTitle: "Mestre",
      title: "O mestre de obras não assenta tijolo",
      tag: "context",
      body: [
        `Numa obra, o mestre de obras não pega na colher de pedreiro. Ele olha a planta, chama o eletricista, depois o encanador, confere o serviço de cada um e decide quem entra em seguida. Com “${TASK}” é igual: um agente coordena e três especialistas executam.`,
        `No padrão [[supervisor/worker|supervisor-worker]], o supervisor é um [[agente|agent]] cujas ferramentas são os outros agentes. A cada passo ele escolhe um worker, manda a subtarefa e recebe o resultado. Aqui são ${workers.length} workers: ${workers.map((worker) => `${worker.label} (${worker.job})`).join(", ")}. É a variante dinâmica do [[orquestrador|orchestrator]]: a ordem não está no código, o supervisor decide durante a execução.`,
      ],
      keyIdea: "O supervisor decide e confere; os workers executam. A ordem do trabalho sai do modelo, não do código.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "team",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "cliente", col: 0, row: 0.5 },
              { id: "boss", kind: "agent", label: "supervisor", col: 1, row: 0.5 },
              { id: "research", kind: "agent", label: workers[0].label, col: 2, row: 0 },
              { id: "analysis", kind: "agent", label: workers[1].label, col: 2, row: 1 },
              { id: "writer", kind: "agent", label: workers[2].label, col: 3, row: 0.5 },
            ],
            edges: [
              { from: "user", to: "boss", label: "tarefa" },
              { from: "boss", to: "research", label: "delega" },
              { from: "boss", to: "analysis", label: "delega" },
              { from: "boss", to: "writer", label: "delega" },
            ],
            active: "boss",
          },
        ],
      },
      alt: `O cliente entrega a tarefa ao supervisor, em destaque, que delega para três workers: ${workers.map((worker) => worker.label).join(", ")}.`,
    },
    {
      id: "loop",
      shortTitle: "O loop",
      title: "Escolher, delegar, revisar",
      tag: "mechanism",
      body: [
        "O mestre de obras repete sempre a mesma rotina: vê o que falta, chama alguém, confere o resultado. Se a parede saiu torta, chama o pedreiro de novo antes de liberar o pintor.",
        `O supervisor roda o mesmo [[loop de agente|agent-loop]], só que cada ação é uma delegação. Na iteração ${DELEGATING}, ele manda o ${delegated.label} ${delegated.job}. A delegação costuma ser exposta ao modelo como uma ferramenta, do jeito do [[handoff|handoff]], com a diferença de que o controle volta ao supervisor depois. Cada volta é uma chamada ao supervisor: ${supervisorCalls} chamadas para ${workers.length} delegações, contando a que encerra o trabalho.`,
      ],
      keyIdea: "O supervisor é um agente comum cujas ferramentas são outros agentes, e o controle sempre volta para ele.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "loop",
            piece: "agent-loop",
            phases: loopPhases,
            active: "delegate",
            iteration: DELEGATING,
            maxIterations: supervisorCalls + 2,
            tool: `delegar(${delegated.label})`,
          },
        ],
      },
      alt: `Loop do supervisor em três fases: escolher worker, delegar, em destaque, e revisar resultado. Iteração ${DELEGATING} de no máximo ${supervisorCalls + 2}, delegando ao ${delegated.label}.`,
    },
    {
      id: "isolation",
      shortTitle: "Contexto limpo",
      title: "O worker lê muito e devolve pouco",
      tag: "mechanism",
      body: [
        "O eletricista não entrega ao mestre de obras os 40 metros de fio que usou: entrega um bilhete “quadro instalado, 12 circuitos, tudo testado”. O mestre de obras não precisa ver o trabalho bruto para decidir o próximo passo.",
        `Cada worker é um [[subagente|subagent]] com [[janela de contexto|context-window]] própria e limpa. Os ${workers.length} leem ${integer(totalRaw)} tokens no total e devolvem ${integer(totalSummary)}: uma compressão de ${fixed(compression)} vezes. No fim, o contexto do supervisor tem ${integer(supervisorFinalContext)} tokens; um agente único que fizesse tudo sozinho carregaria ${integer(singleAgentFinalContext)}, ${fixed(contextRatio)} vezes mais.`,
      ],
      keyIdea: "Subagentes isolam o trabalho bruto no próprio contexto e devolvem só o que o supervisor precisa para decidir.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "tokens",
            piece: "chart",
            kind: "bar",
            series: tokenSeries,
            highlight: 1,
            color: "module-12",
          },
        ],
      },
      alt: `Tokens que cada worker lê e devolve: ${tokenSeries.map((item) => `${item.label} ${integer(item.value)}`).join(", ")}. O que volta ao supervisor é uma fração pequena do que cada worker leu.`,
    },
    {
      id: "exchange",
      shortTitle: "Mensagens",
      title: `${messages.length} mensagens, ${supervisorCalls} chamadas ao supervisor`,
      tag: "example",
      body: [
        `Siga a obra do começo ao fim: o supervisor chama o pesquisador, recebe o resumo, chama o analista, recebe a comparação, chama o redator e entrega o relatório ao cliente. São ${messages.length} mensagens, e nenhum worker fala diretamente com outro.`,
        `Cada chamada do supervisor reenvia o prompt base de ${integer(SUPERVISOR_BASE)} tokens mais os resumos que já chegaram. As ${supervisorCalls} chamadas leem ${supervisorCallTokens.map(integer).join(" + ")} = ${integer(supervisorInputTokens)} tokens de entrada. Esse é o preço da coordenação, que se soma ao trabalho dos workers: cada delegação custa uma chamada ao supervisor mais a execução inteira do worker.`,
      ],
      keyIdea: "Toda delegação custa duas vezes: a chamada do supervisor e a execução do worker.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "exchange",
            piece: "client-server",
            nodes: [
              { id: "user", label: "cliente", role: "client" },
              { id: "boss", label: "supervisor", role: "server" },
              { id: "research", label: "pesquisador", role: "model" },
              { id: "analysis", label: "analista", role: "model" },
              { id: "writer", label: "redator", role: "model" },
            ],
            messages,
            active: ACTIVE_MESSAGE,
          },
          {
            id: "cost",
            piece: "metrics-panel",
            metrics: [
              { id: "calls", label: "chamadas ao supervisor", value: `${supervisorCalls}` },
              { id: "input", label: "tokens de entrada do supervisor", value: integer(supervisorInputTokens), color: "info" },
              { id: "context", label: "contexto final do supervisor", value: integer(supervisorFinalContext), color: "success" },
            ],
            highlight: "input",
          },
        ],
      },
      alt: `Troca de ${messages.length} mensagens: ${messages.map((message) => `${nodeNames[message.from]} para ${nodeNames[message.to]}, ${message.label}`).join("; ")}. O painel mostra ${supervisorCalls} chamadas ao supervisor, ${integer(supervisorInputTokens)} tokens de entrada e contexto final de ${integer(supervisorFinalContext)} tokens.`,
    },
    {
      id: "evaluator",
      shortTitle: "Avaliar",
      title: "Um worker que só avalia",
      tag: "tradeoff",
      body: [
        "Antes de entregar a obra, o mestre de obras chama o fiscal. Se o fiscal reprova, a equipe refaz o trecho e o fiscal olha de novo. O fiscal não constrói nada: só confere contra a norma.",
        `Esse é o [[avaliador-otimizador|evaluator-optimizer]]: um LLM gera, outro avalia com critérios claros e devolve a crítica. Com mínimo de ${fixed(PASS_SCORE)} e notas de brinquedo ${roundScores.map((score) => fixed(score, 2)).join(", ")}, o texto passa na rodada ${roundsUsed} de no máximo ${MAX_ROUNDS}. O limite de rodadas é obrigatório: sem ele, um avaliador exigente demais prende o loop. E o avaliador só ajuda quando o critério é verificável; se ele não sabe dizer o que está errado, cada rodada só gasta tokens.`,
      ],
      keyIdea: "Separar quem gera de quem avalia melhora o resultado, desde que o critério seja claro e as rodadas tenham limite.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "review",
            piece: "block-diagram",
            blocks: [
              { id: "boss", kind: "agent", label: "supervisor", col: 0, row: 0.5 },
              { id: "writer", kind: "llm", label: "redator gera", col: 1, row: 0.5 },
              { id: "eval", kind: "eval", label: `avaliador ≥ ${fixed(PASS_SCORE)}`, col: 2, row: 0.5 },
              { id: "answer", kind: "answer", label: "relatório", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "boss", to: "writer", label: "escrever" },
              { from: "writer", to: "eval", label: "rascunho" },
              { from: "eval", to: "writer", label: "crítica", variant: "alternative" },
              { from: "eval", to: "answer", label: `rodada ${roundsUsed}` },
            ],
            active: "eval",
            done: ["boss", "writer"],
          },
        ],
      },
      alt: `O supervisor pede o texto ao redator, que manda o rascunho ao avaliador, em destaque. Abaixo de ${fixed(PASS_SCORE)}, a crítica volta ao redator pelo caminho tracejado; na rodada ${roundsUsed}, o relatório é aprovado.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Coordenar custa, isolar compensa",
      tag: "summary",
      body: [
        "O padrão supervisor/worker troca um agente sobrecarregado por um coordenador e especialistas. Cada worker trabalha com contexto limpo e devolve um resumo; o supervisor decide com pouco contexto e confere o resultado, se preciso com um avaliador.",
        "O preço são chamadas extras e mais tokens no total, então ele compensa quando as subtarefas são grandes e diferentes entre si. Quando elas são independentes, dá para rodá-las ao mesmo tempo: é o tema da próxima aula, agentes em sequência e em paralelo.",
      ],
      keyIdea: "Supervisor/worker = um loop que delega, subagentes com contexto próprio e um avaliador com limite de rodadas.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "team",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "cliente", col: 0, row: 0.5 },
              { id: "boss", kind: "agent", label: "supervisor", col: 1, row: 0.5 },
              { id: "research", kind: "agent", label: workers[0].label, col: 2, row: 0 },
              { id: "analysis", kind: "agent", label: workers[1].label, col: 2, row: 1 },
              { id: "eval", kind: "eval", label: "avaliador", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "user", to: "boss", label: "tarefa" },
              { from: "boss", to: "research", label: "delega" },
              { from: "boss", to: "analysis", label: "delega" },
              { from: "boss", to: "eval", label: "confere" },
            ],
            active: "eval",
            done: ["user", "boss", "research", "analysis"],
          },
        ],
      },
      alt: "O cliente entrega a tarefa ao supervisor, que delega a pesquisa e a análise e manda o resultado ao avaliador, em destaque, antes de entregar.",
    },
  ],
  realWorldExample:
    "O sistema de pesquisa do Claude descrito pela Anthropic segue esse desenho: um agente líder planeja, salva o plano em memória, cria de 3 a 5 subagentes que pesquisam em paralelo e devolvem o que acharam, e um agente de citações confere as fontes no fim. A Anthropic relata que esse sistema multiagente gasta cerca de 15 vezes mais tokens que um chat.",
  code: {
    language: "python",
    source: `MAX_STEPS = 6

def supervisor(task, llm, workers):
    notes = [task]
    for _ in range(MAX_STEPS):
        step = llm.decide(notes, list(workers))   # qual worker chamar, ou encerrar
        if step.done:
            return step.answer
        summary = workers[step.worker](step.subtask)  # roda com contexto próprio
        notes.append(f"{step.worker}: {summary}")     # só o resumo volta
    return "Limite de passos atingido; entrego o que tenho."`,
    caption: "O loop do supervisor: cada worker roda isolado e devolve um resumo curto, e o limite de passos garante uma saída.",
  },
  tradeOffs: {
    pros: [
      "Cada worker tem prompt, ferramentas e contexto só do seu papel",
      "O supervisor decide com pouco contexto, porque recebe resumos",
      "Um avaliador separado pega erros que o gerador não vê no próprio texto",
    ],
    cons: [
      "Cada delegação soma uma chamada ao supervisor e a execução do worker",
      "Um resumo ruim esconde do supervisor o detalhe que importava",
      "Mais agentes, mais caminhos para testar e depurar",
    ],
    alternatives: [
      "Um agente único com boas ferramentas, quando a tarefa cabe num contexto",
      "Orquestração em código, quando a ordem das subtarefas é sempre a mesma",
    ],
  },
  knowledgeCheck: [
    {
      id: "raw-context",
      prompt: "O worker de pesquisa lê 50 páginas e devolve tudo o que leu ao supervisor. Qual é o problema?",
      options: [
        "Nenhum: quanto mais contexto o supervisor tiver, melhor",
        "Perde o isolamento: o contexto do supervisor enche de material bruto, e ele decide pior e gasta mais",
        "O worker fica sem memória",
        "O supervisor não consegue ler texto de outro agente",
      ],
      correct: 1,
      explanation: "O ganho do subagente é ler muito no próprio contexto e devolver só um resumo destilado. Devolver o bruto anula essa vantagem.",
      lesson: "12-13",
    },
    {
      id: "evaluator-loop",
      prompt: "O avaliador reprova o texto oito vezes seguidas com a crítica “pode melhorar”. O que corrigir primeiro?",
      options: [
        "Aumentar o limite de rodadas para 50",
        "Dar ao avaliador critérios verificáveis e manter um limite de rodadas",
        "Remover o avaliador e confiar no gerador",
        "Trocar o gerador por um modelo maior a cada rodada",
      ],
      correct: 1,
      explanation: "O avaliador-otimizador só funciona com critérios claros, que digam o que mudar. Sem isso, o loop gira sem convergir; o limite garante que ele termina.",
      lesson: "12-13",
    },
  ],
  related: ["12-12", "12-14", "14-09"],
  references: [
    { title: "Anthropic: Building effective agents", url: "https://www.anthropic.com/engineering/building-effective-agents", kind: "article" },
    { title: "Anthropic: How we built our multi-agent research system", url: "https://www.anthropic.com/engineering/multi-agent-research-system", kind: "article" },
    { title: "Anthropic: Effective context engineering for AI agents", url: "https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents", kind: "article" },
  ],
};

export default lesson;
