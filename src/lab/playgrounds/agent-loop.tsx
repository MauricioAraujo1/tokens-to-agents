import { useCallback, useState } from "react";
import { PlaygroundShell, type PlaygroundControl, type PlaygroundView } from "../../components/lab/PlaygroundShell";
import { Button } from "../../components/ui/Button";
import { agentLoopContent as content } from "../../content/playgrounds/agent-loop";
import type { AgentLoopSpec } from "../../scene/types";
import { runAgent, type AgentEvent } from "../agentLoop";

type Values = { limit: number };

const CONTROLS: ReadonlyArray<PlaygroundControl<Values>> = [
  { kind: "slider", id: "limit", label: content.limitLabel, hint: content.limitHint, min: 1, max: content.maxLimit, step: 1 },
];

const describeEvent = (event: Exclude<AgentEvent, { kind: "limit" }>) => content.event[event.kind](event.text);

/** Simula um agente com ferramentas de exemplo e limite de iterações, um passo por clique (LAB-01.1). */
export function AgentLoopPlayground() {
  // Quantos eventos do roteiro já aconteceram (o primeiro aparece ao abrir).
  const [shown, setShown] = useState(1);

  const derive = useCallback(
    ({ limit }: Values): PlaygroundView => {
      const events = runAgent(content.script, limit);
      const visible = events.slice(0, Math.min(shown, events.length));
      const current = visible[visible.length - 1];
      const loop: AgentLoopSpec = {
        piece: "agent-loop",
        phases: content.phases,
        active: current.kind === "answer" || current.kind === "limit" ? undefined : current.kind,
        iteration: current.iteration,
        maxIterations: limit,
        tool: current.kind === "act" ? current.text : undefined,
      };

      return {
        pieces: [loop],
        caption: content.caption(current.iteration, limit),
        details: (
          <div className="flex flex-col gap-2">
            <p>
              <span className="text-ink-muted">{content.taskLabel}: </span>
              {content.task}
            </p>
            <p>
              <span className="text-ink-muted">{content.toolsLabel}: </span>
              {content.tools.join(" · ")}
            </p>
            <ol aria-label={content.logLabel} className="flex flex-col gap-1">
              {visible.flatMap((event, index) =>
                event.kind === "limit"
                  ? []
                  : [
                      <li
                        key={index}
                        data-event={event.kind}
                        className={event.kind === "answer" ? "font-semibold text-state-success-ink" : undefined}
                      >
                        {event.iteration}. {describeEvent(event)}
                      </li>,
                    ],
              )}
            </ol>
            {current.kind === "limit" && (
              <p role="alert" className="rounded-md border border-state-danger px-3 py-2 text-state-danger-ink">
                {content.limitWarning(limit)}
              </p>
            )}
          </div>
        ),
      };
    },
    [shown],
  );

  const actions = ({ limit }: Values) => {
    const total = runAgent(content.script, limit).length;
    const finished = shown >= total;
    return (
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" size="sm" disabled={finished} onClick={() => setShown(Math.min(shown, total) + 1)}>
          {content.next}
        </Button>
        <Button variant="secondary" size="sm" disabled={finished} onClick={() => setShown(total)}>
          {content.runAll}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setShown(1)}>
          {content.reset}
        </Button>
      </div>
    );
  };

  return (
    <PlaygroundShell
      title={content.title}
      observe={content.observe}
      controls={CONTROLS}
      initialValues={{ limit: content.initialLimit }}
      derive={derive}
      actions={actions}
    />
  );
}
