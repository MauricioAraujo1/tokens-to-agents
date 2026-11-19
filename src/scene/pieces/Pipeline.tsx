import { ArrowRight } from "lucide-react";
import { useId, type CSSProperties } from "react";
import { DiagramPill } from "../../components/diagrams/DiagramPill";
import { cn } from "../../lib/utils";
import { FADED_TEXT_OPACITY, sceneColor } from "../colors";
import type { PieceProps, PipelineSpec, PipelineStage } from "../types";
import { layoutPipeline, STAGE_HALF_HEIGHT, STAGE_HALF_WIDTH, type ConnectionLayout, type StageLayout } from "./pipelineLayout";

const FLOW_DOT_OFFSETS = ["30%", "70%"];
const FLOW_DOT_DELAYS = ["0s", "-0.9s"];
const STAGE_SHADOW_OFFSET = 3;

/** Marcadores de seta das conexões: normal e alternativo. */
export function ConnectionMarkers({ id }: { id: string }) {
  return (
    <defs>
      <marker id={id} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
        <path d="M0,0.5 L10,5 L0,9.5 Z" style={{ fill: "var(--ink-primary)" }} />
      </marker>
      <marker id={`${id}-alt`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
        <path d="M0,0.5 L10,5 L0,9.5 Z" style={{ fill: sceneColor("danger") }} />
      </marker>
    </defs>
  );
}

interface ConnectionProps {
  connection: ConnectionLayout;
  markerId: string;
  /** Sem animação, a conexão ativa fica mais grossa, mas os pontos não andam. */
  animate: boolean;
}

/**
 * Conexão entre etapas. Na conexão ativa, pontos `.flow-dot` andam pelo caminho; a cena
 * pausada (`.is-paused`) e o movimento reduzido param os pontos pelo CSS.
 */
export function PipelineConnection({ connection, markerId, animate }: ConnectionProps) {
  const { start, end, labelPoint } = connection.geometry;
  const isAlternative = connection.variant === "alternative";
  const path = `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} L ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
  const stroke = isAlternative ? sceneColor("danger") : "var(--ink-primary)";

  return (
    <g data-connection={connection.id} data-variant={connection.variant} data-flowing={connection.flowing ? "true" : undefined}>
      <path
        d={path}
        fill="none"
        strokeLinecap="round"
        strokeWidth={connection.flowing ? 2.4 : 1.8}
        strokeDasharray={isAlternative ? "7 6" : undefined}
        markerEnd={`url(#${isAlternative ? `${markerId}-alt` : markerId})`}
        style={{ stroke }}
      />
      {connection.flowing &&
        animate &&
        FLOW_DOT_OFFSETS.map((offsetDistance, index) => (
          <circle
            key={offsetDistance}
            r={5}
            className="flow-dot"
            strokeWidth={1.6}
            style={
              {
                // Pontos laranja das regras de conexão do design ("04 · Blocos do diagrama").
                fill: "var(--diagram-orange)",
                stroke: "var(--line-strong)",
                offsetPath: `path("${path}")`,
                offsetDistance,
                animationDelay: FLOW_DOT_DELAYS[index],
              } as CSSProperties
            }
          />
        ))}
      {connection.label && (
        <DiagramPill x={labelPoint.x} y={labelPoint.y} text={connection.label} tone={isAlternative ? "danger" : "neutral"} />
      )}
    </g>
  );
}

/** Caixa de uma etapa: ativa na cor da etapa, concluída em verde claro, futura esmaecida. */
export function PipelineStageBox({ layout, animate }: { layout: StageLayout; animate: boolean }) {
  const { stage, center, state } = layout;
  const color = sceneColor(stage.color ?? (state === "done" ? "success" : "brand"));
  const fill =
    state === "active"
      ? color
      : state === "done"
        ? `color-mix(in srgb, ${color} 35%, var(--surface-raised))`
        : "var(--surface-raised)";

  return (
    <g
      data-stage={stage.id}
      data-state={state}
      data-x={center.x.toFixed(1)}
      data-y={center.y.toFixed(1)}
      aria-current={state === "active" ? "step" : undefined}
      opacity={state === "upcoming" ? FADED_TEXT_OPACITY : 1}
      className={animate ? "scene-animate" : undefined}
    >
      {/* Caixa com sombra dura, como os tokens e os cartões do design. */}
      <rect
        x={center.x - STAGE_HALF_WIDTH + STAGE_SHADOW_OFFSET}
        y={center.y - STAGE_HALF_HEIGHT + STAGE_SHADOW_OFFSET}
        width={STAGE_HALF_WIDTH * 2}
        height={STAGE_HALF_HEIGHT * 2}
        rx={8}
        style={{ fill: "var(--shadow-hard)" }}
      />
      <rect
        x={center.x - STAGE_HALF_WIDTH}
        y={center.y - STAGE_HALF_HEIGHT}
        width={STAGE_HALF_WIDTH * 2}
        height={STAGE_HALF_HEIGHT * 2}
        rx={8}
        strokeWidth={state === "active" ? 2.4 : 1.5}
        className={animate ? "scene-animate" : undefined}
        style={{ fill, stroke: "var(--line-strong)" }}
      />
      <text
        x={center.x}
        y={center.y}
        textAnchor="middle"
        dominantBaseline="central"
        className={cn("font-mono text-[12px]", state === "active" ? "font-bold" : "font-semibold")}
        style={{ fill: state === "active" ? "var(--accent-on-brand)" : "var(--ink-primary)" }}
      >
        {stage.label}
      </text>
    </g>
  );
}

type ChipItem = { kind: "stage"; stage: PipelineStage } | { kind: "repeat"; stages: PipelineStage[]; label: string };

/** Agrupa o trecho `repeat` (de `from` a `to`) num único item; um trecho inválido é ignorado. */
function chipItems(spec: PipelineSpec): ChipItem[] {
  const ids = spec.stages.map((stage) => stage.id);
  const start = spec.repeat ? ids.indexOf(spec.repeat.from) : -1;
  const end = spec.repeat ? ids.indexOf(spec.repeat.to) : -1;
  if (!spec.repeat || start < 0 || end < start) return spec.stages.map((stage) => ({ kind: "stage", stage }));

  return [
    ...spec.stages.slice(0, start).map((stage): ChipItem => ({ kind: "stage", stage })),
    { kind: "repeat", stages: spec.stages.slice(start, end + 1), label: spec.repeat.label },
    ...spec.stages.slice(end + 1).map((stage): ChipItem => ({ kind: "stage", stage })),
  ];
}

/** Chip de etapa do preview 10: neutro em surface, ou preenchido na cor da etapa com tinta escura. */
function StageChip({ stage }: { stage: PipelineStage }) {
  return (
    <span
      data-stage={stage.id}
      className={cn(
        "whitespace-nowrap rounded-[5px] border-[1.5px] border-line-strong px-2.5 py-[7px] text-[11.5px] leading-[15px]",
        stage.color ? "font-bold" : "bg-surface font-semibold text-ink",
      )}
      style={stage.color ? { backgroundColor: sceneColor(stage.color), color: "var(--accent-on-brand)" } : undefined}
    >
      {stage.label}
    </span>
  );
}

/** Fluxo em chips de texto que quebram com a largura, legível em qualquer tamanho (resumos, T138). */
function PipelineChips({ spec }: { spec: PipelineSpec }) {
  return (
    <ol aria-hidden="true" data-display="chips" className="m-0 flex list-none flex-wrap items-center gap-2 p-0 font-mono">
      {chipItems(spec).map((item, index) => (
        <li key={item.kind === "stage" ? item.stage.id : `repeat-${item.stages[0].id}`} className="flex items-center gap-2">
          {index > 0 && <ArrowRight size={13} aria-hidden="true" className="shrink-0 text-muted" />}
          {item.kind === "stage" ? (
            <StageChip stage={item.stage} />
          ) : (
            <span
              data-repeat={item.label}
              className="flex flex-wrap items-center gap-1.5 rounded-md border-[1.5px] border-dashed border-info bg-info-soft px-2 py-1.5"
            >
              {item.stages.map((stage) => (
                <StageChip key={stage.id} stage={stage} />
              ))}
              <span className="text-[11px] font-bold text-info-ink">{item.label}</span>
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

/** Etapas em sequência com o dado fluindo e ramo alternativo (SCN-01.2), na geometria do diagrama RAG. */
export function Pipeline({ spec, transition }: PieceProps<PipelineSpec>) {
  const markerId = `pipeline-arrow-${useId().replace(/:/g, "")}`;
  if (spec.display === "chips") return <PipelineChips spec={spec} />;
  const layout = layoutPipeline(spec);

  return (
    <svg viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true" className="block h-full max-h-full w-full">
      <ConnectionMarkers id={markerId} />
      {layout.connections.map((connection) => (
        <PipelineConnection key={connection.id} connection={connection} markerId={markerId} animate={transition.animate} />
      ))}
      {layout.stages.map((stage) => (
        <PipelineStageBox key={stage.stage.id} layout={stage} animate={transition.animate} />
      ))}
    </svg>
  );
}
