import { ArrowRight } from "lucide-react";
import { useId, useRef, type CSSProperties } from "react";
import { DiagramPill } from "../../components/diagrams/DiagramPill";
import { useSvgTextScale } from "../../hooks/useSvgTextScale";
import { cn } from "../../lib/utils";
import { FADED_TEXT_OPACITY, sceneColor } from "../colors";
import { SCENE_TEXT_PX, solveSceneFont } from "../textScale";
import type { PieceProps, PipelineSpec, PipelineStage } from "../types";
import {
  connectionPath,
  layoutPipeline,
  pipelineDisplay,
  STAGE_FONT,
  stageState,
  type ConnectionLayout,
  type StageLayout,
  type StageState,
} from "./pipelineLayout";

/** Em chips não há SVG para medir. */
const CHIPS_VIEWBOX = { width: 1, height: 1 };
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
  /**
   * `false` deixa o rótulo para `ConnectionLabel`, desenhado depois de todas as linhas: assim nenhuma
   * linha passa por cima do texto de outra conexão.
   */
  withLabel?: boolean;
  /**
   * `false` deixa a linha para `ConnectionLine`, desenhada antes dos nós: o grupo da conexão fica só com
   * os pontos que andam e o rótulo, por cima de tudo (ClientServer, T22).
   */
  withLine?: boolean;
}

function ConnectionPath({ connection, markerId }: Pick<ConnectionProps, "connection" | "markerId">) {
  const isAlternative = connection.variant === "alternative";
  return (
    <path
      d={connectionPath(connection)}
      fill="none"
      strokeLinecap="round"
      strokeWidth={connection.flowing ? 2.4 : 1.8}
      strokeDasharray={isAlternative ? "7 6" : undefined}
      markerEnd={`url(#${isAlternative ? `${markerId}-alt` : markerId})`}
      style={{ stroke: isAlternative ? sceneColor("danger") : "var(--ink-primary)" }}
    />
  );
}

/** Só a linha da conexão, para a peça que a desenha numa camada abaixo dos nós. */
export function ConnectionLine({ connection, markerId }: Pick<ConnectionProps, "connection" | "markerId">) {
  return (
    <g data-connection-line={connection.id}>
      <ConnectionPath connection={connection} markerId={markerId} />
    </g>
  );
}

/** Pílula do rótulo de uma conexão. */
export function ConnectionLabel({ connection }: { connection: ConnectionLayout }) {
  if (!connection.label) return null;
  const { labelPoint } = connection.geometry;
  return (
    <g data-connection-label={connection.id}>
      <DiagramPill
        x={labelPoint.x}
        y={labelPoint.y}
        text={connection.label}
        tone={connection.variant === "alternative" ? "danger" : "neutral"}
        fontSize={connection.labelFont}
      />
    </g>
  );
}

/**
 * Conexão entre etapas. Na conexão ativa, pontos `.flow-dot` andam pelo caminho; a cena
 * pausada (`.is-paused`) e o movimento reduzido param os pontos pelo CSS.
 */
export function PipelineConnection({ connection, markerId, animate, withLabel = true, withLine = true }: ConnectionProps) {
  const { labelPoint } = connection.geometry;
  const isAlternative = connection.variant === "alternative";
  const path = connectionPath(connection);

  return (
    <g data-connection={connection.id} data-variant={connection.variant} data-flowing={connection.flowing ? "true" : undefined}>
      {withLine && <ConnectionPath connection={connection} markerId={markerId} />}
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
      {withLabel && connection.label && (
        <DiagramPill
          x={labelPoint.x}
          y={labelPoint.y}
          text={connection.label}
          tone={isAlternative ? "danger" : "neutral"}
          fontSize={connection.labelFont}
        />
      )}
    </g>
  );
}

/** Caixa de uma etapa: ativa na cor da etapa, concluída em verde claro, futura esmaecida. */
export function PipelineStageBox({ layout, animate }: { layout: StageLayout; animate: boolean }) {
  const { stage, center, state, half, lines, font } = layout;
  const ratio = font / STAGE_FONT;
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
        x={center.x - half.width + STAGE_SHADOW_OFFSET * ratio}
        y={center.y - half.height + STAGE_SHADOW_OFFSET * ratio}
        width={half.width * 2}
        height={half.height * 2}
        rx={8 * ratio}
        style={{ fill: "var(--shadow-hard)" }}
      />
      <rect
        x={center.x - half.width}
        y={center.y - half.height}
        width={half.width * 2}
        height={half.height * 2}
        rx={8 * ratio}
        strokeWidth={state === "active" ? 2.4 : 1.5}
        className={animate ? "scene-animate" : undefined}
        style={{ fill, stroke: "var(--line-strong)" }}
      />
      <text
        x={center.x}
        y={center.y}
        textAnchor="middle"
        dominantBaseline="central"
        className={cn("font-mono", state === "active" ? "font-bold" : "font-semibold")}
        style={{ fontSize: font, fill: state === "active" ? "var(--accent-on-brand)" : "var(--ink-primary)" }}
      >
        {lines.length === 1
          ? lines[0]
          : lines.map((line, index) => (
              <tspan key={`${index}-${line}`} x={center.x} dy={index === 0 ? `${-(lines.length - 1) * 0.6}em` : "1.2em"}>
                {line}
              </tspan>
            ))}
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

/**
 * Chip de etapa do preview 10: neutro em surface, ou preenchido na cor da etapa com tinta escura. Com
 * passo declarado, a etapa ativa ganha o preenchimento e as futuras esmaecem, como as caixas da cena.
 */
function StageChip({ stage, state }: { stage: PipelineStage; state?: StageState }) {
  const fillColor = stage.color ?? (state === "active" ? "brand" : undefined);
  return (
    <span
      data-stage={stage.id}
      data-state={state}
      aria-current={state === "active" ? "step" : undefined}
      className={cn(
        "whitespace-nowrap rounded-[5px] border-[1.5px] border-line-strong px-2.5 py-[7px] text-[11.5px] leading-[15px]",
        fillColor ? "font-bold" : "bg-surface font-semibold text-ink",
      )}
      style={{
        ...(fillColor ? { backgroundColor: sceneColor(fillColor), color: "var(--accent-on-brand)" } : {}),
        ...(state === "upcoming" ? { opacity: FADED_TEXT_OPACITY } : {}),
      }}
    >
      {stage.label}
    </span>
  );
}

/** Fluxo em chips de texto que quebram com a largura, legível em qualquer tamanho (resumos, T138). */
function PipelineChips({ spec, listRef }: { spec: PipelineSpec; listRef?: (element: Element | null) => void }) {
  // Chips declarados seguem o preview 10; os automáticos (COL-01.2) mantêm o passo e o ramo da cena.
  const stateOf = (id: string) => (spec.display !== "chips" && spec.active ? stageState(id, spec) : undefined);
  return (
    <ol ref={listRef} aria-hidden="true" data-display="chips" className="m-0 flex list-none flex-wrap items-center gap-2 p-0 font-mono">
      {chipItems(spec).map((item, index) => (
        <li key={item.kind === "stage" ? item.stage.id : `repeat-${item.stages[0].id}`} className="flex items-center gap-2">
          {index > 0 && <ArrowRight size={13} aria-hidden="true" className="shrink-0 text-muted" />}
          {item.kind === "stage" ? (
            <StageChip stage={item.stage} state={stateOf(item.stage.id)} />
          ) : (
            <span
              data-repeat={item.label}
              className="flex flex-wrap items-center gap-1.5 rounded-md border-[1.5px] border-dashed border-info bg-info-soft px-2 py-1.5"
            >
              {item.stages.map((stage) => (
                <StageChip key={stage.id} stage={stage} state={stateOf(stage.id)} />
              ))}
              <span className="text-[11px] font-bold text-info-ink">{item.label}</span>
            </span>
          )}
        </li>
      ))}
      {spec.branch && (
        <li data-branch={spec.branch.from} className="flex basis-full flex-wrap items-center gap-2">
          <span className="text-[11.5px] font-bold text-danger-ink">
            ↳ {spec.stages.find((stage) => stage.id === spec.branch?.from)?.label ?? spec.branch.from}
            {spec.branch.edgeLabel ? `: ${spec.branch.edgeLabel}` : ""}
          </span>
          <ArrowRight size={13} aria-hidden="true" className="shrink-0 text-danger" />
          <span className="rounded-md border-[1.5px] border-dashed border-danger p-0.5">
            <StageChip stage={spec.branch} state={stateOf(spec.branch.id)} />
          </span>
        </li>
      )}
    </ol>
  );
}

/** Etapas em sequência com o dado fluindo e ramo alternativo (SCN-01.2), na geometria do diagrama RAG. */
export function Pipeline({ spec, transition }: PieceProps<PipelineSpec>) {
  const markerId = `pipeline-arrow-${useId().replace(/:/g, "")}`;
  const ref = useRef<Element | null>(null);
  const setRef = (element: Element | null) => {
    ref.current = element;
  };
  const declared = pipelineDisplay(spec);
  const sizeAt = (candidate: number) => (declared === "chips" ? CHIPS_VIEWBOX : layoutPipeline(spec, candidate));
  const { font, box } = useSvgTextScale(ref, sizeAt);
  // A decisão olha só a largura, que é a mesma medida no SVG e nos chips; assim a peça não alterna.
  const widthOnly = box && solveSceneFont({ width: box.width, maxHeight: Number.POSITIVE_INFINITY }, sizeAt);
  // O rótulo do ramo é uma pílula (11/12 da fonte das etapas): com ele, as etapas precisam chegar ao
  // alvo de 12 px para a pílula ficar com 11 (03-14#1, 09-07#4).
  const needed = spec.branch?.edgeLabel ? SCENE_TEXT_PX.target : SCENE_TEXT_PX.min;
  const fitsWidth = !widthOnly || widthOnly.font * widthOnly.scale >= needed - 0.05;
  if (declared === "chips" || !fitsWidth) return <PipelineChips spec={spec} listRef={setRef} />;
  const layout = layoutPipeline(spec, font);

  return (
    <svg ref={setRef} viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true" className="block h-full max-h-full w-full">
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
