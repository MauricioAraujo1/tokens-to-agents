import { catalog } from "../catalog";
import type { LessonId, SummaryContent } from "../../types/content";

// Cheat sheet do módulo 12 (SUM-01.1). O diagrama é desenhado pelo <Scene> num passo único, e a folha
// tem estilo de impressão em A4 (SUM-01.2). As aulas linkadas saem do catálogo: as 18 do módulo, em ordem.

const lessons: LessonId[] = (catalog.find((module) => module.id === "12")?.lessons ?? []).map((lesson) => lesson.id);

const summary: SummaryContent = {
  module: "12",
  concepts: [
    "Agente = um LLM que recebe um objetivo e decide os próprios passos em loop, usando ferramentas e lendo as observações até terminar. Num workflow, quem decide a ordem é o código; num agente, é o modelo. Comece pelo mais simples que resolve.",
    "Arquitetura: modelo, instruções, ferramentas, memória e estado, conduzidos por um runtime que monta o contexto, executa as chamadas, valida argumentos e impõe limites. Julgamento fica com o modelo; garantias ficam no código.",
    "Loop: montar contexto → chamar o modelo → executar a ferramenta pedida → anexar a observação, até o modelo responder ou um limite de iterações, tempo ou orçamento parar a execução.",
    "Ferramentas: nome distinto, descrição que diz quando usar, schema estrito, resultado útil e erro acionável. Cada resultado volta com o id da chamada; ferramentas independentes podem ir em paralelo na mesma volta.",
    "Planejamento: decompor o objetivo; decidir passo a passo (ReAct) ou planejar antes e executar depois (plan-and-execute); verificar cada passo, replanejar quando algo falha e refletir sobre tentativas que falharam.",
    "Memória e contexto: curto prazo é o que está no contexto; longo prazo fica fora (episódica, semântica, procedural) e é buscada quando útil. Contextos longos pedem limpeza de resultados antigos, compactação e notas fora da janela.",
    "Vários agentes: especialistas com contexto próprio, ligados por mensagens, estado compartilhado ou handoffs, coordenados por um orquestrador ou supervisor, em sequência ou em paralelo (fan-out/fan-in). Custam bem mais tokens que um agente só.",
    "Confiabilidade: pessoas aprovam ações de risco (human-in-the-loop), frameworks como LangGraph salvam o estado a cada passo, e retries com backoff e idempotência tornam falhas recuperáveis. Meça com evals repetidos, não com uma execução.",
  ],
  formulas: [
    "Tokens de entrada acumulados em n voltas = n × base + (novos por volta) × n(n − 1) / 2",
    "Latência em paralelo ≈ chamadas ao modelo × latência do modelo + max(latência das ferramentas)",
    "Fan-out com concorrência c: ondas = ⌈n / c⌉; latência ≈ ondas × duração da subtarefa + agregação",
    "Cadeia de n passos com acerto p: P(tudo certo) = pⁿ; com r retries por passo (falha detectável): (1 − (1 − p)^(r + 1))ⁿ",
    "pass^k = chance de acertar a mesma tarefa em todas as k tentativas (pᵏ, se independentes)",
  ],
  pitfalls: [
    "Usar um agente onde um workflow resolve: mais custo, mais latência e um caminho diferente a cada execução.",
    "Deixar regras críticas só no prompt: limites, permissões e aprovações precisam ser checados pelo runtime antes de executar.",
    "Rodar o loop sem limite de iterações, tempo ou orçamento, e sem tratar a parada no limite com uma saída honesta.",
    "Devolver erros vagos das ferramentas: o agente não sabe o que corrigir e repete a mesma chamada até o limite.",
    "Deixar o histórico crescer sem poda: o custo cresce com o quadrado das voltas e o modelo passa a lembrar pior o que está no contexto.",
    "Repetir efeitos colaterais em retries ou retomadas sem chave de idempotência: cobranças e e-mails em dobro.",
  ],
  diagram: {
    kind: "pieces",
    layout: "single",
    pieces: [
      {
        id: "module-12",
        piece: "block-diagram",
        blocks: [
          { id: "user", kind: "user", label: "objetivo", col: 0, row: 0 },
          { id: "orchestrator", kind: "agent", label: "orquestrador", col: 1, row: 0 },
          { id: "workers", kind: "agent", label: "workers", col: 2, row: 0 },
          { id: "tools", kind: "tool", label: "ferramentas", col: 3, row: 0 },
          { id: "memory", kind: "memory", label: "memória + estado", col: 2, row: 1 },
          { id: "gate", kind: "guardrail", label: "aprovação", col: 1, row: 1 },
        ],
        edges: [
          { from: "user", to: "orchestrator" },
          { from: "orchestrator", to: "workers", label: "subtarefas" },
          { from: "workers", to: "tools", label: "tool calls" },
          { from: "workers", to: "memory", label: "resultados" },
          { from: "memory", to: "gate" },
          { from: "gate", to: "user", label: "ação de risco" },
        ],
        active: "orchestrator",
      },
    ],
  },
  lessons,
};

export default summary;
