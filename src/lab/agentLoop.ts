// Loop de agente simulado: pensar → agir (chamar uma ferramenta) → observar, até responder ou bater no limite
// de iterações. O roteiro é fixo; nada chama modelo nem rede.

export interface AgentIteration {
  thought: string;
  /** Ferramenta chamada nesta iteração. Sem ela, a iteração termina na resposta. */
  action?: { tool: string; input: string };
  observation?: string;
  answer?: string;
}

export type AgentEvent =
  | { kind: "think"; iteration: number; text: string }
  | { kind: "act"; iteration: number; text: string }
  | { kind: "observe"; iteration: number; text: string }
  | { kind: "answer"; iteration: number; text: string }
  /** O agente parou no limite sem chegar à resposta. */
  | { kind: "limit"; iteration: number };

/** Os eventos do agente, em ordem, seguindo o roteiro até a resposta ou até completar `maxIterations` iterações. */
export function runAgent(script: readonly AgentIteration[], maxIterations: number): AgentEvent[] {
  const events: AgentEvent[] = [];

  for (const [index, step] of script.entries()) {
    const iteration = index + 1;
    if (iteration > maxIterations) {
      events.push({ kind: "limit", iteration: maxIterations });
      return events;
    }
    events.push({ kind: "think", iteration, text: step.thought });
    if (step.answer !== undefined) {
      events.push({ kind: "answer", iteration, text: step.answer });
      return events;
    }
    if (step.action) events.push({ kind: "act", iteration, text: `${step.action.tool}(${step.action.input})` });
    if (step.observation !== undefined) events.push({ kind: "observe", iteration, text: step.observation });
  }

  return events;
}
