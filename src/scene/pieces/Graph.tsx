import { useId, useRef } from "react";
import { DiagramPill } from "../../components/diagrams/DiagramPill";
import { useSvgTextScale } from "../../hooks/useSvgTextScale";
import { useI18n } from "../../i18n/useI18n";
import { cn } from "../../lib/utils";
import { FADED_TEXT_OPACITY, sceneColor } from "../colors";
import { describeScene } from "../describe";
import { SceneScroll } from "../SceneScroll";
import { scrollMinWidth } from "../textScale";
import type { GraphSpec, PieceProps } from "../types";
import { getPillSize } from "../../components/diagrams/ragDiagramLayout";
import { GRAPH_HEIGHT, GRAPH_WIDTH, layoutGraph, placeEdgeLabel, type CenteredBox } from "./graphLayout";
import { pillFontFor, STAGE_FONT } from "./pipelineLayout";

const ARROW_GAP = 4;
/** Tamanho da ponta da seta com o texto de 12 unidades: o da aresta comum e o da aresta do caminho. */
const ARROW_SIZE = 9;
const ACTIVE_ARROW_SIZE = 12;
/** Quadro de referência do grafo, antes de crescer para separar nós. */
const GRAPH_FRAME = { width: GRAPH_WIDTH, height: GRAPH_HEIGHT };
/**
 * Fonte de referência da largura mínima (LEG-01.4): com o texto de 9,6 unidades no quadro de 480, os nós
 * e as pílulas das arestas têm a proporção que se vê a 1440 (8,8 unidades), e as pílulas cabem entre os
 * nós em todos os grafos das aulas. Com 12 px na tela, isso dá 600 px, abaixo do quadro de 655 px a 1440.
 */
const GRAPH_SCROLL_FONT = 9.6;
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

/** Nós e arestas nas posições declaradas, sem sobreposição, com caminho em destaque e travessia (SCN-01.2). */
export function Graph({ spec, transition }: PieceProps<GraphSpec>) {
  const arrowId = `graph-arrow-${useId().replace(/:/g, "")}`;
  const animate = transition.animate ? "scene-animate" : undefined;
  const ref = useRef<SVGSVGElement>(null);
  const { t, locale } = useI18n();
  const { font } = useSvgTextScale(ref, (candidate) => layoutGraph(spec, candidate));
  const layout = layoutGraph(spec, font);
  // Num quadro estreito (375), o desenho fica com a largura de referência e o quadro rola: mais estreito,
  // o texto de 12 px deixava os nós e as pílulas grandes demais, e as pílulas caíam sobre os nós
  // (LEG-01.4). A 1440, o quadro é mais largo que isso e nada muda.
  const minWidth = scrollMinWidth(() => GRAPH_FRAME, GRAPH_SCROLL_FONT);
  const ratio = font / STAGE_FONT;
  // Posição e tamanho de cada nó, já separados e dentro do quadro (COL-01.5, COL-01.6).
  const position = new Map(layout.nodes.map((item) => [item.node.id, item]));

  // Distância do centro até a borda do nó na direção da aresta (a pílula aproximada por uma elipse).
  const reachOf = (id: string, unit: { x: number; y: number }) => {
    const item = position.get(id);
    if (!item) return 0;
    return 1 / Math.hypot(unit.x / item.halfWidth, unit.y / item.halfHeight);
  };

  // As pílulas das arestas desviam dos nós e das pílulas já colocadas.
  const placedLabels: CenteredBox[] = [];
  const segments = spec.edges.flatMap((edge) => {
    const from = position.get(edge.from);
    const to = position.get(edge.to);
    if (!from || !to) return [];
    const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
    const unit = { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
    const trimStart = reachOf(edge.from, unit);
    const trimEnd = reachOf(edge.to, unit) + ARROW_GAP * ratio;
    const start = { x: from.x + unit.x * trimStart, y: from.y + unit.y * trimStart };
    const end = { x: to.x - unit.x * trimEnd, y: to.y - unit.y * trimEnd };
    return [{ edge, start, end }];
  });
  const edges = segments.map(({ edge, start, end }, index) => {
    const size = edge.label ? getPillSize(edge.label, pillFontFor(font)) : undefined;
    // As arestas desenhadas depois desta passariam por cima do rótulo dela: ele evita essas linhas.
    const later = segments.slice(index + 1).map((other) => ({ from: other.start, to: other.end }));
    const label = size && placeEdgeLabel(start, end, size, [...layout.nodes, ...placedLabels], 4 * ratio, layout, later);
    if (size && label) placedLabels.push({ ...label, halfWidth: size.width / 2, halfHeight: size.height / 2 });
    return { edge, start, end, label };
  });

  return (
    <SceneScroll label={describeScene({ kind: "pieces", layout: "single", pieces: [spec] }, { t, locale })} className="h-full">
      <svg ref={ref} viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true" className="block h-full max-h-full w-full" style={{ minWidth }}>
        <defs>
          {/* Ponta em unidades da cena, não da espessura: a aresta grossa (peso) não ganha uma ponta enorme (08-13#2). */}
          <marker
            id={arrowId}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerUnits="userSpaceOnUse"
            markerWidth={ARROW_SIZE * ratio}
            markerHeight={ARROW_SIZE * ratio}
            orient="auto"
          >
            <path d="M0,0.5 L10,5 L0,9.5 Z" style={{ fill: "var(--ink-muted)" }} />
          </marker>
          <marker
            id={`${arrowId}-active`}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerUnits="userSpaceOnUse"
            markerWidth={ACTIVE_ARROW_SIZE * ratio}
            markerHeight={ACTIVE_ARROW_SIZE * ratio}
            orient="auto"
          >
            <path d="M0,0.5 L10,5 L0,9.5 Z" style={{ fill: sceneColor("brand") }} />
          </marker>
        </defs>

        {edges.map(({ edge, start, end, label }) => {
          const active = isOnPath(spec.path, edge.from, edge.to);
          const width = (active ? 2.4 : 1.4) + (edge.weight ?? 0) * 3;

          return (
            <g key={`${edge.from}-${edge.to}`} data-edge={`${edge.from}-${edge.to}`} data-active={active ? "true" : undefined}>
              <line
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                strokeWidth={width}
                strokeLinecap="round"
                markerEnd={`url(#${active ? `${arrowId}-active` : arrowId})`}
                className={animate}
                style={{ stroke: active ? sceneColor("brand") : "var(--ink-muted)" }}
              />
              {edge.label && label && <DiagramPill x={label.x} y={label.y} text={edge.label} fontSize={pillFontFor(font)} />}
            </g>
          );
        })}

        {spec.nodes.map((node) => {
          const point = position.get(node.id);
          if (!point) return null;
          const state = nodeState(spec, node.id);
          const { halfWidth, halfHeight } = point;
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
              <rect
                x={point.x - halfWidth + SHADOW_OFFSET * ratio}
                y={point.y - halfHeight + SHADOW_OFFSET * ratio}
                width={halfWidth * 2}
                height={halfHeight * 2}
                rx={halfHeight}
                className={animate}
                style={{ fill: "var(--shadow-hard)" }}
              />
              <rect
                data-node-shape="true"
                x={point.x - halfWidth}
                y={point.y - halfHeight}
                width={halfWidth * 2}
                height={halfHeight * 2}
                rx={halfHeight}
                strokeWidth={state === "active" ? 2.4 : 1.5}
                className={animate}
                style={{ fill, stroke: "var(--line-strong)" }}
              />
              <text
                x={point.x}
                y={point.y}
                textAnchor="middle"
                dominantBaseline="central"
                className={cn("font-mono", state === "active" ? "font-bold" : "font-semibold")}
                style={{ fontSize: font, fill: state === "active" ? "var(--accent-on-brand)" : "var(--ink-primary)" }}
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </SceneScroll>
  );
}
