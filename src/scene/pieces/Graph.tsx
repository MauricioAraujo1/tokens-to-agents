import { useId } from "react";
import { DiagramPill } from "../../components/diagrams/DiagramPill";
import { cn } from "../../lib/utils";
import { FADED_TEXT_OPACITY, sceneColor } from "../colors";
import type { GraphSpec, PieceProps } from "../types";

const WIDTH = 480;
const HEIGHT = 300;
const PADDING = 44;
const NODE_RADIUS = 20;
const ARROW_GAP = 4;
const SHADOW_OFFSET = 2.5;

type NodeState = "active" | "visited" | "unvisited" | "idle";

/** Estado do nó: em foco, visitado, não visitado (com travessia declarada) ou neutro. */
function nodeState(spec: GraphSpec, id: string): NodeState {
  if (spec.highlight?.includes(id)) return "active";
  if (spec.visited === undefined) return "idle";
  return spec.visited.includes(id) ? "visited" : "unvisited";
}

/** A aresta está no caminho quando liga dois nós consecutivos dele, em qualquer sentido. */
function isOnPath(path: string[] | undefined, from: string, to: string): boolean {
  if (!path) return false;
  return path.some((id, index) => {
    const next = path[index + 1];
    return next !== undefined && ((id === from && next === to) || (id === to && next === from));
  });
}

/** Nós e arestas com layout fixo, caminho em destaque e travessia passo a passo (SCN-01.2). */
export function Graph({ spec, transition }: PieceProps<GraphSpec>) {
  const arrowId = `graph-arrow-${useId().replace(/:/g, "")}`;
  const animate = transition.animate ? "scene-animate" : undefined;
  const position = new Map(
    spec.nodes.map((node) => [
      node.id,
      { x: PADDING + node.x * (WIDTH - 2 * PADDING), y: PADDING + node.y * (HEIGHT - 2 * PADDING) },
    ]),
  );

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true" className="block h-full max-h-full w-full">
      <defs>
        <marker id={arrowId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0.5 L10,5 L0,9.5 Z" style={{ fill: "var(--ink-muted)" }} />
        </marker>
        <marker id={`${arrowId}-active`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0.5 L10,5 L0,9.5 Z" style={{ fill: sceneColor("brand") }} />
        </marker>
      </defs>

      {spec.edges.map((edge) => {
        const from = position.get(edge.from);
        const to = position.get(edge.to);
        if (!from || !to) return null;
        const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
        const unit = { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
        const trimStart = NODE_RADIUS;
        const trimEnd = NODE_RADIUS + ARROW_GAP;
        const active = isOnPath(spec.path, edge.from, edge.to);
        const width = (active ? 2.4 : 1.4) + (edge.weight ?? 0) * 3;

        return (
          <g key={`${edge.from}-${edge.to}`} data-edge={`${edge.from}-${edge.to}`} data-active={active ? "true" : undefined}>
            <line
              x1={from.x + unit.x * trimStart}
              y1={from.y + unit.y * trimStart}
              x2={to.x - unit.x * trimEnd}
              y2={to.y - unit.y * trimEnd}
              strokeWidth={width}
              strokeLinecap="round"
              markerEnd={`url(#${active ? `${arrowId}-active` : arrowId})`}
              className={animate}
              style={{ stroke: active ? sceneColor("brand") : "var(--ink-muted)" }}
            />
            {edge.label && <DiagramPill x={(from.x + to.x) / 2} y={(from.y + to.y) / 2} text={edge.label} />}
          </g>
        );
      })}

      {spec.nodes.map((node) => {
        const point = position.get(node.id);
        if (!point) return null;
        const state = nodeState(spec, node.id);
        const color = sceneColor(node.color ?? (state === "visited" ? "success" : "brand"));
        const fill =
          state === "active"
            ? color
            : state === "visited"
              ? `color-mix(in srgb, ${color} 35%, var(--surface-raised))`
              : "var(--surface-raised)";

        return (
          <g
            key={node.id}
            data-node={node.id}
            data-state={state}
            data-x={point.x.toFixed(1)}
            data-y={point.y.toFixed(1)}
            opacity={state === "unvisited" ? FADED_TEXT_OPACITY : 1}
            className={animate}
          >
            {/* Sombra dura e contorno forte, como as caixas de token do design. */}
            <circle
              cx={point.x + SHADOW_OFFSET}
              cy={point.y + SHADOW_OFFSET}
              r={NODE_RADIUS}
              className={animate}
              style={{ fill: "var(--shadow-hard)" }}
            />
            <circle
              cx={point.x}
              cy={point.y}
              r={NODE_RADIUS}
              strokeWidth={state === "active" ? 2.4 : 1.5}
              className={animate}
              style={{ fill, stroke: "var(--line-strong)" }}
            />
            <text
              x={point.x}
              y={point.y}
              textAnchor="middle"
              dominantBaseline="central"
              className={cn("font-mono text-[12px]", state === "active" ? "font-bold" : "font-semibold")}
              style={{ fill: state === "active" ? "var(--accent-on-brand)" : "var(--ink-primary)" }}
            >
              {node.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
