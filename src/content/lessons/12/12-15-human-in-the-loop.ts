import type { LessonContent } from "../../../types/content";

// Human-in-the-loop com contas no arquivo: um agente de atendimento que propõe sete tipos de ação, cada um
// com um score de risco e um volume diário de brinquedo. Um limiar de risco decide o que vai para revisão
// humana; a carga dos revisores sai do volume revisado vezes os minutos por revisão. As taxas de aprovação
// por tipo também são de brinquedo e servem para mostrar como os dados do gate ajustam o próprio gate.

const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const fixed = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const percent = (value: number) => `${(value * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

interface ProposedAction {
  label: string;
  risk: number;
  perDay: number;
  /** Fração das revisões em que a pessoa aprova a ação, quando ela passa pelo gate. */
  approval: number;
}

const actions: ProposedAction[] = [
  { label: "ler pedido", risk: 0.05, perDay: 900, approval: 1 },
  { label: "enviar e-mail", risk: 0.35, perDay: 400, approval: 0.99 },
  { label: "reembolso R$ 80", risk: 0.45, perDay: 300, approval: 0.99 },
  { label: "mudar endereço", risk: 0.55, perDay: 200, approval: 0.97 },
  { label: "reembolso R$ 900", risk: 0.8, perDay: 120, approval: 0.99 },
  { label: "cancelar conta", risk: 0.9, perDay: 50, approval: 0.9 },
  { label: "apagar dados", risk: 0.97, perDay: 30, approval: 0.6 },
];

const THRESHOLD = 0.7;
const MINUTES_PER_REVIEW = 2;
const AUTO_CANDIDATE = 0.98;
const totalPerDay = actions.reduce((sum, action) => sum + action.perDay, 0);

const gated = (threshold: number) => actions.filter((action) => action.risk >= threshold);
const reviewsPerDay = (threshold: number) => gated(threshold).reduce((sum, action) => sum + action.perDay, 0);
const reviewerHours = (threshold: number) => (reviewsPerDay(threshold) * MINUTES_PER_REVIEW) / 60;

const gatedNow = gated(THRESHOLD);
const reviews = reviewsPerDay(THRESHOLD);
const reviewShare = reviews / totalPerDay;
const hours = reviewerHours(THRESHOLD);
const approvalRate = gatedNow.reduce((sum, action) => sum + action.perDay * action.approval, 0) / reviews;
const autoCandidates = gatedNow.filter((action) => action.approval >= AUTO_CANDIDATE).map((action) => action.label);
const mostRejected = [...gatedNow].sort((a, b) => a.approval - b.approval)[0];

const thresholds = [0.3, 0.5, 0.7, 0.85, 0.95];
const hourSeries = thresholds.map((threshold) => ({ label: `limiar ${fixed(threshold, 2)}`, value: Number(reviewerHours(threshold).toFixed(1)) }));
const strictest = thresholds[0];

const pauseMessages = [
  { from: "agent", to: "store", label: "checkpoint" },
  { from: "agent", to: "queue", label: "pedido de aprovação" },
  { from: "queue", to: "human", label: "revisar" },
  { from: "human", to: "agent", label: "resume: aprovar" },
  { from: "store", to: "agent", label: "estado" },
  { from: "agent", to: "api", label: gatedNow[0].label },
];
const RESUME = pauseMessages.findIndex((message) => message.from === "human");
const nodeNames: Record<string, string> = { agent: "agente", store: "checkpoints", queue: "fila", human: "revisor", api: "api" };

const lesson: LessonContent = {
  id: "12-15",
  subtitle: "Onde colocar uma pessoa no fluxo do agente, quanto isso custa em horas de revisão, e como pausar e retomar sem repetir ações.",
  objectives: [
    "Decidir quais ações passam por um approval gate a partir do risco",
    "Calcular a carga de revisão humana para um limiar de risco",
    "Explicar como um agente pausa, guarda o estado e retoma depois da aprovação",
    "Usar a taxa de aprovação para ajustar o gate",
  ],
  steps: [
    {
      id: "gate",
      shortTitle: "O gerente",
      title: "O gerente assina os saques grandes",
      tag: "context",
      body: [
        `No banco, o caixa paga um saque pequeno na hora. Um saque grande espera a assinatura do gerente. Ninguém quer o gerente assinando cada saque de R$ 50, e ninguém quer um saque de R$ 50 mil sem assinatura. Um agente de atendimento que lê pedidos, faz reembolsos e cancela contas precisa da mesma regra.`,
        `Isso é [[human-in-the-loop|human-in-the-loop]]: uma pessoa entra no fluxo em pontos definidos. O ponto mais comum é o [[approval gate|approval-gate]]: um [[guardrail|guardrail]] classifica o risco da ação proposta, as de risco baixo seguem direto para a ferramenta, e as de risco alto pausam até alguém aprovar. A Anthropic descreve isso como agentes que pausam para feedback humano em checkpoints ou quando encontram um bloqueio.`,
      ],
      keyIdea: "Ponha a pessoa onde o erro é caro ou irreversível, não em toda ação.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "gate",
            piece: "block-diagram",
            blocks: [
              { id: "agent", kind: "agent", label: "agente", col: 0, row: 0.5 },
              { id: "guard", kind: "guardrail", label: "risco da ação", col: 1, row: 0.5 },
              { id: "tool", kind: "tool", label: "executa", col: 3, row: 0.5 },
              { id: "human", kind: "user", label: "revisor aprova", col: 2, row: 1 },
            ],
            edges: [
              { from: "agent", to: "guard", label: "ação proposta" },
              { from: "guard", to: "tool", label: "risco baixo" },
              { from: "guard", to: "human", label: "risco alto" },
              { from: "human", to: "tool", label: "aprovada" },
            ],
            active: "guard",
          },
        ],
      },
      alt: "O agente propõe uma ação, que passa pela verificação de risco, em destaque. Risco baixo segue direto para a execução; risco alto vai ao revisor, e só depois da aprovação é executado.",
    },
    {
      id: "risk",
      shortTitle: "Limiar",
      title: `Tudo acima de ${fixed(THRESHOLD)} espera aprovação`,
      tag: "mechanism",
      body: [
        "O gerente não decide caso a caso quais saques assinar: existe uma regra, como “acima de R$ 5 mil”. O limiar do agente é a mesma régua, aplicada a um score de risco de cada tipo de ação.",
        `Com limiar ${fixed(THRESHOLD)}, ${gatedNow.length} dos ${actions.length} tipos de ação vão para revisão: ${gatedNow.map((action) => action.label).join(", ")}. O score pode vir de regras no código (valor, irreversibilidade, dado pessoal), de um classificador ou da combinação dos dois. O que não pode é ele vir só do próprio agente dizendo que a ação é segura: uma [[prompt injection indireta|indirect-prompt-injection]] convence o modelo, não a regra.`,
      ],
      keyIdea: "O limiar transforma uma política de risco numa régua aplicada pelo código, não pelo modelo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "risk",
            piece: "chart",
            kind: "bar",
            series: actions.map((action) => ({ label: action.label, value: action.risk })),
            max: 1,
            cutoff: { mode: "threshold", value: THRESHOLD, label: `revisão ≥ ${fixed(THRESHOLD)}` },
            color: "module-12",
          },
        ],
      },
      alt: `Score de risco por tipo de ação: ${actions.map((action) => `${action.label} ${fixed(action.risk, 2)}`).join(", ")}. Acima do limiar de ${fixed(THRESHOLD)} ficam ${gatedNow.map((action) => action.label).join(", ")}, que vão para revisão humana.`,
    },
    {
      id: "pause",
      shortTitle: "Pausar",
      title: "Pausar sem perder o lugar",
      tag: "mechanism",
      body: [
        "Quando o gerente sai para almoçar, o caixa não joga fora o pedido de saque: deixa o formulário preenchido na pasta. Quando o gerente volta e assina, o atendimento continua de onde parou, sem o cliente preencher tudo de novo.",
        `O agente faz o mesmo com um checkpoint: salva o estado, põe o pedido numa fila e para. No LangGraph, um nó chama interrupt(), o checkpointer guarda o estado do thread e a execução só volta com graph.invoke(Command(resume=...)) no mesmo thread_id. Um detalhe importa: na retomada, o nó roda de novo desde o começo, então tudo o que vem antes do interrupt() executa duas vezes. Efeitos colaterais antes da pausa precisam ser idempotentes, tema da aula 12-18.`,
      ],
      keyIdea: "Pausar é salvar o estado e esperar; retomar é carregar o estado e seguir, sem repetir efeitos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "pause",
            piece: "client-server",
            nodes: [
              { id: "agent", label: "agente", role: "server" },
              { id: "store", label: "checkpoints", role: "database" },
              { id: "queue", label: "fila de aprovação", role: "queue", size: gatedNow.length },
              { id: "human", label: "revisor", role: "client" },
              { id: "api", label: "api", role: "server" },
            ],
            messages: pauseMessages,
            active: RESUME,
          },
        ],
      },
      alt: `Troca de mensagens da pausa: ${pauseMessages.map((message) => `${nodeNames[message.from]} para ${nodeNames[message.to]}, ${message.label}`).join("; ")}. A mensagem em trânsito é a do revisor devolvendo a aprovação; só depois dela o agente carrega o estado e chama a API.`,
    },
    {
      id: "load",
      shortTitle: "Carga",
      title: `${integer(reviews)} revisões por dia`,
      tag: "example",
      body: [
        `Um gerente assina rápido, mas não infinitamente. Com ${integer(totalPerDay)} ações propostas por dia e o limiar ${fixed(THRESHOLD)}, ${integer(reviews)} vão para revisão: ${percent(reviewShare)} do volume. A ${MINUTES_PER_REVIEW} minutos cada, são ${fixed(hours)} horas de revisor por dia.`,
        `O limiar é um botão de custo. No ${fixed(strictest)}, seriam ${fixed(reviewerHours(strictest))} horas por dia, e a pessoa começa a aprovar sem ler: o gate vira carimbo. Os dados do próprio gate ajudam a ajustá-lo. Dos casos revisados, ${percent(approvalRate)} são aprovados; ${autoCandidates.join(", ")} passa de ${percent(AUTO_CANDIDATE)}, candidato a sair do gate com uma regra mais estreita, e ${mostRejected.label}, aprovado em só ${percent(mostRejected.approval)}, mostra onde o agente erra e pede [[escalação|escalation]] com mais contexto.`,
      ],
      keyIdea: "Cada ponto do limiar vira horas de revisor; meça a taxa de aprovação para mover o limiar com dados.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "load",
            piece: "metrics-panel",
            metrics: [
              { id: "reviews", label: "revisões por dia", value: integer(reviews) },
              { id: "share", label: "do volume", value: percent(reviewShare) },
              { id: "hours", label: "horas de revisor", value: fixed(hours), color: "info" },
              { id: "approval", label: "aprovadas", value: percent(approvalRate), color: "success" },
            ],
            highlight: "hours",
          },
          {
            id: "hours",
            piece: "chart",
            kind: "line",
            series: hourSeries,
            highlight: thresholds.indexOf(THRESHOLD),
            color: "module-12",
          },
        ],
      },
      alt: `Com limiar ${fixed(THRESHOLD)}: ${integer(reviews)} revisões por dia, ${percent(reviewShare)} do volume, ${fixed(hours)} horas de revisor e ${percent(approvalRate)} de aprovação. Horas de revisor por limiar: ${hourSeries.map((item) => `${item.label}, ${fixed(item.value)}`).join("; ")}.`,
    },
    {
      id: "states",
      shortTitle: "Rejeição",
      title: "Rejeitar também é resposta",
      tag: "tradeoff",
      body: [
        "Quando o gerente recusa o saque, o caixa não tenta de novo pela porta dos fundos. Ele explica ao cliente e, se for o caso, chama alguém com mais autoridade.",
        "A rejeição volta ao agente como observação, com o motivo, e ele replaneja ou encerra. Se o revisor não sabe decidir, ou se o caso some na fila, o fluxo precisa de prazo e de escalação para outra pessoa. O custo do gate é latência humana: um pedido pode esperar horas. Por isso o desenho bom pausa só a ação arriscada e deixa o resto do trabalho andar.",
      ],
      keyIdea: "Um gate completo trata aprovar, rejeitar e não responder, cada um com o seu caminho.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "states",
            piece: "pipeline",
            stages: [
              { id: "propose", label: "propor ação" },
              { id: "score", label: "classificar risco" },
              { id: "pause", label: "pausar" },
              { id: "review", label: "revisar", color: "module-12" },
              { id: "run", label: "executar", color: "success" },
            ],
            active: "review",
            done: ["propose", "score", "pause"],
            branch: { id: "escalate", label: "escalar ou encerrar", color: "danger", from: "review", edgeLabel: "rejeitada ou sem resposta" },
          },
        ],
      },
      alt: "Pipeline do gate: propor ação, classificar risco, pausar, revisar, em destaque, e executar. Um ramo tracejado sai da revisão para escalar ou encerrar quando a ação é rejeitada ou fica sem resposta.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Autonomia onde é barato errar",
      tag: "summary",
      body: [
        "Human-in-the-loop é uma decisão de projeto: quais ações pausam, com que limiar, quem revisa, em quanto tempo e o que acontece se ninguém responder. O agente salva o estado, espera e retoma sem repetir o que já fez.",
        "Montar pausa, retomada, fila e checkpoint à mão dá trabalho. Os frameworks de agentes entregam essas peças prontas: é o tema da próxima aula.",
      ],
      keyIdea: "Human-in-the-loop = limiar de risco no código + pausa com checkpoint + retomada idempotente.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "gate",
            piece: "block-diagram",
            blocks: [
              { id: "agent", kind: "agent", label: "agente", col: 0, row: 0.5 },
              { id: "guard", kind: "guardrail", label: "risco da ação", col: 1, row: 0.5 },
              { id: "store", kind: "memory", label: "checkpoint", col: 2, row: 0 },
              { id: "human", kind: "user", label: "revisor aprova", col: 2, row: 1 },
              { id: "tool", kind: "tool", label: "executa", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "agent", to: "guard", label: "ação proposta" },
              { from: "guard", to: "store", label: "pausa" },
              { from: "guard", to: "human", label: "risco alto" },
              { from: "human", to: "tool", label: "resume" },
              { from: "guard", to: "tool", label: "risco baixo" },
            ],
            active: "tool",
            done: ["agent", "guard", "store", "human"],
          },
        ],
      },
      alt: "O fluxo completo: a ação proposta passa pela verificação de risco; a de risco alto salva um checkpoint e vai ao revisor, que retoma a execução; a de risco baixo segue direto. A execução está em destaque.",
    },
  ],
  realWorldExample:
    "O Claude Agent SDK tem permissões que definem quais ferramentas rodam sozinhas e quais pedem aprovação, o mesmo modelo de permissões do Claude Code. No LangGraph, a função interrupt() pausa o grafo, o checkpointer salva o estado e Command(resume=...) retoma no mesmo thread, o que permite aprovar uma ação horas depois.",
  code: {
    language: "python",
    source: `from typing import TypedDict

from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, interrupt

class State(TypedDict):
    valor: int
    status: str

def aprovar(state: State):
    decisao = interrupt({"acao": "reembolso", "valor": state["valor"]})
    return {"status": "aprovado" if decisao == "sim" else "rejeitado"}

builder = StateGraph(State)
builder.add_node("aprovar", aprovar)
builder.add_edge(START, "aprovar")
builder.add_edge("aprovar", END)
graph = builder.compile(checkpointer=InMemorySaver())

config = {"configurable": {"thread_id": "pedido-4821"}}
graph.invoke({"valor": 900, "status": "pendente"}, config)  # pausa no interrupt
graph.invoke(Command(resume="sim"), config)                 # retoma o mesmo thread`,
    caption: "Um approval gate no LangGraph: interrupt() pausa e devolve o pedido, e Command(resume=...) no mesmo thread_id retoma o nó com a decisão.",
  },
  tradeOffs: {
    pros: [
      "Ações caras ou irreversíveis ganham uma segunda opinião antes de acontecer",
      "A taxa de aprovação mostra onde o agente erra e onde o gate sobra",
      "Permite dar mais autonomia ao agente aos poucos, com dados",
    ],
    cons: [
      "Latência humana: uma ação pode esperar horas na fila",
      "Limiar baixo demais gera fadiga e aprovação sem leitura",
      "Pausar e retomar exige estado salvo e efeitos idempotentes",
    ],
    alternatives: [
      "Revisão depois do fato (auditoria por amostragem) para ações reversíveis",
      "Limites rígidos no código, como valor máximo de reembolso, sem pessoa no fluxo",
    ],
  },
  knowledgeCheck: [
    {
      id: "where-gate",
      prompt: "Um agente de e-commerce lê pedidos, responde dúvidas e emite reembolsos de até R$ 5 mil. Onde colocar o approval gate?",
      options: [
        "Em toda mensagem do agente",
        "Nos reembolsos acima de um limiar de valor, aplicado no código",
        "Só na leitura de pedidos",
        "Em lugar nenhum: o system prompt já pede cuidado",
      ],
      correct: 1,
      explanation: "O gate vale onde o erro é caro ou irreversível. Ler pedidos é barato; um reembolso alto não. E a regra precisa estar no código, não só no prompt.",
      lesson: "12-15",
    },
    {
      id: "resume-side-effect",
      prompt: "Um nó do LangGraph envia um e-mail de aviso e depois chama interrupt() para aprovação. Após a retomada, o cliente recebe dois e-mails. Por quê?",
      options: [
        "O checkpointer duplicou o estado",
        "Na retomada o nó roda de novo desde o começo, e o envio antes do interrupt() não é idempotente",
        "O revisor aprovou duas vezes",
        "O thread_id mudou",
      ],
      correct: 1,
      explanation: "A documentação do LangGraph avisa: ao retomar, o nó reinicia do começo. Efeitos antes do interrupt() precisam ser idempotentes ou ir para depois dele ou para outro nó.",
      lesson: "12-15",
    },
  ],
  related: ["12-14", "12-16", "05-10"],
  references: [
    { title: "LangGraph: Interrupts", url: "https://docs.langchain.com/oss/python/langgraph/interrupts", kind: "docs" },
    { title: "Anthropic: Building effective agents", url: "https://www.anthropic.com/engineering/building-effective-agents", kind: "article" },
    { title: "Claude Agent SDK: overview", url: "https://code.claude.com/docs/en/agent-sdk/overview", kind: "docs" },
  ],
};

export default lesson;
