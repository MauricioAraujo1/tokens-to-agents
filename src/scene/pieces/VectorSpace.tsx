import { useId } from "react";
import { DiagramPill } from "../../components/diagrams/DiagramPill";
import { sceneColor } from "../colors";
import type { PieceProps, VectorSpaceSpec } from "../types";
import { layoutVectorSpace, nearestNeighbors, VECTOR_SPACE_SIZE } from "./vectorSpaceLayout";

/** Pontos em 2D (ou 3D isométrico), vetores, distância e vizinhos mais próximos (SCN-01.2). */
export function VectorSpace({ spec, transition }: PieceProps<VectorSpaceSpec>) {
  const arrowId = `vector-arrow-${useId().replace(/:/g, "")}`;
  const { origin, points } = layoutVectorSpace(spec);
  const byId = new Map(points.map((projected) => [projected.point.id, projected]));
  const neighbors = new Set(nearestNeighbors(spec));
  const animate = transition.animate ? "scene-animate" : undefined;
  const distanceFrom = spec.distance && byId.get(spec.distance.from);
  const distanceTo = spec.distance && byId.get(spec.distance.to);

  return (
    <svg
      viewBox={`0 0 ${VECTOR_SPACE_SIZE} ${VECTOR_SPACE_SIZE}`}
      aria-hidden="true"
      className="block h-full max-h-full w-full"
    >
      <defs>
        <marker id={arrowId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0.5 L10,5 L0,9.5 Z" style={{ fill: "var(--ink-muted)" }} />
        </marker>
      </defs>

      <line x1={0} y1={origin.y} x2={VECTOR_SPACE_SIZE} y2={origin.y} style={{ stroke: "var(--line-soft)" }} />
      <line x1={origin.x} y1={0} x2={origin.x} y2={VECTOR_SPACE_SIZE} style={{ stroke: "var(--line-soft)" }} />

      {(spec.vectors ?? []).map((vector) => {
        const start = vector.from === undefined ? origin : byId.get(vector.from);
        const end = byId.get(vector.to);
        if (!start || !end) return null;
        return (
          <line
            key={`${vector.from ?? "origin"}-${vector.to}`}
            data-vector={`${vector.from ?? "origin"}-${vector.to}`}
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            markerEnd={`url(#${arrowId})`}
            className={animate}
            style={{ stroke: "var(--ink-muted)", strokeWidth: 1.6 }}
          />
        );
      })}

      {distanceFrom && distanceTo && spec.distance && (
        <g data-distance={`${spec.distance.from}-${spec.distance.to}`}>
          <line
            x1={distanceFrom.x}
            y1={distanceFrom.y}
            x2={distanceTo.x}
            y2={distanceTo.y}
            strokeDasharray="4 4"
            style={{ stroke: sceneColor("brand"), strokeWidth: 1.6 }}
          />
          {spec.distance.label && (
            <DiagramPill
              x={(distanceFrom.x + distanceTo.x) / 2}
              y={(distanceFrom.y + distanceTo.y) / 2 - 14}
              text={spec.distance.label}
            />
          )}
        </g>
      )}

      {points.map(({ point, x, y }) => {
        const role = point.id === spec.query ? "query" : neighbors.has(point.id) ? "neighbor" : "point";
        const color = sceneColor(point.color ?? (role === "query" ? "brand" : role === "neighbor" ? "success" : "muted"));
        return (
          <g key={point.id} data-point={point.id} data-role={role} data-x={x.toFixed(1)} data-y={y.toFixed(1)}>
            {role === "neighbor" && <circle cx={x} cy={y} r={11} style={{ fill: "none", stroke: color, strokeWidth: 2 }} />}
            <circle
              cx={x}
              cy={y}
              r={role === "query" ? 7 : 5}
              className={animate}
              style={{ fill: color, stroke: "var(--line-strong)", strokeWidth: role === "query" ? 2 : 1.5 }}
            />
            <text
              x={x + 10}
              y={y - 8}
              className={role === "point" ? "font-mono text-[11px] font-medium" : "font-mono text-[11px] font-bold"}
              style={{ fill: "var(--ink-primary)" }}
            >
              {point.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
