import { Wrench } from "lucide-react";
import { useId, useRef } from "react";
import { DiagramPill } from "../../components/diagrams/DiagramPill";
import { useSvgTextScale } from "../../hooks/useSvgTextScale";
import { useI18n } from "../../i18n/useI18n";
import { sceneColor } from "../colors";
import { describeScene } from "../describe";
import { SceneScroll } from "../SceneScroll";
import { scrollMinWidth } from "../textScale";
import type { AgentLoopSpec, PieceProps } from "../types";
import { counterText, layoutAgentLoop } from "./agentLoopLayout";
import { ConnectionMarkers, PipelineConnection, PipelineStageBox } from "./Pipeline";
import { STAGE_FONT } from "./pipelineLayout";

/** Ciclo pensar → agir → observar, com a ferramenta chamada e o contador de iterações (SCN-01.2). */
export function AgentLoop({ spec, transition }: PieceProps<AgentLoopSpec>) {
  const markerId = `agent-loop-arrow-${useId().replace(/:/g, "")}`;
  const ref = useRef<SVGSVGElement>(null);
  const { t, locale } = useI18n();
  const sizeAt = (candidate: number) => layoutAgentLoop(spec, candidate);
  const { font } = useSvgTextScale(ref, sizeAt);
  const layout = layoutAgentLoop(spec, font);
  const limitReached = spec.iteration !== undefined && spec.maxIterations !== undefined && spec.iteration >= spec.maxIterations;
  const counter = counterText(spec);
  // Num quadro estreito (375), o ciclo mantém o desenho de referência (texto de 12 unidades) em 12 px na
  // tela e o quadro rola; mais estreito, a pílula da ferramenta caía para 8 px (LEG-01.4). A 1440, o
  // quadro é mais largo que isso e nada muda.
  const minWidth = scrollMinWidth(sizeAt, STAGE_FONT);

  return (
    <SceneScroll label={describeScene({ kind: "pieces", layout: "single", pieces: [spec] }, { t, locale })} className="h-full">
      <svg ref={ref} viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true" className="block h-full max-h-full w-full" style={{ minWidth }}>
        <ConnectionMarkers id={markerId} />
        {layout.connections.map((connection) => (
          <PipelineConnection key={connection.id} connection={connection} markerId={markerId} animate={transition.animate} />
        ))}
        {layout.stages.map((stage) => (
          <PipelineStageBox key={stage.stage.id} layout={stage} animate={transition.animate} />
        ))}

        {counter !== undefined && (
          <text
            data-iteration={spec.iteration}
            data-limit-reached={limitReached ? "true" : undefined}
            x={layout.counter.point.x}
            y={layout.counter.point.y}
            textAnchor="middle"
            dominantBaseline="central"
            className="font-mono font-bold"
            style={{ fontSize: layout.counter.font, fill: limitReached ? sceneColor("danger") : "var(--ink-primary)" }}
          >
            {counter}
          </text>
        )}
        {spec.tool && layout.tool && (
          <g data-tool={spec.tool} className={transition.animate ? "scene-animate" : undefined}>
            <DiagramPill x={layout.tool.point.x} y={layout.tool.point.y} text={spec.tool} icon={Wrench} fontSize={layout.tool.font} />
          </g>
        )}
      </svg>
    </SceneScroll>
  );
}
