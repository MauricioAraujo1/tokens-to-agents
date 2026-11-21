import { useRef } from "react";
import { DiagramPill } from "../../components/diagrams/DiagramPill";
import { useSvgTextScale } from "../../hooks/useSvgTextScale";
import { cn } from "../../lib/utils";
import { sceneColor } from "../colors";
import type { ChartSpec, PieceProps } from "../types";
import { BAR_WIDTH, layoutChart, LINE_POINT_RADIUS, SLOT, TILTED_LABEL_ANGLE } from "./chartLayout";

const SHADOW_OFFSET = 2;

/** Barras ou linhas para distribuições e métricas, com eixo, linha de corte e destaque (SCN-01.2). */
export function Chart({ spec, transition }: PieceProps<ChartSpec>) {
  const ref = useRef<SVGSVGElement>(null);
  const { font } = useSvgTextScale(ref, (candidate) => layoutChart(spec, candidate));
  const { width, height, left, plotRight, baseline, labelFont, labelY, tilt, centerX, heightOf, kept, cutoffY, cutoffPill } =
    layoutChart(spec, font);
  const color = sceneColor(spec.color ?? "brand");
  const animate = transition.animate ? "scene-animate" : undefined;

  return (
    <svg ref={ref} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="block h-full max-h-full w-full">
      <line x1={left} y1={baseline} x2={left + SLOT * spec.series.length} y2={baseline} style={{ stroke: "var(--line-strong)" }} />

      {spec.kind === "line" && (
        <polyline
          data-line="true"
          points={spec.series.map((point, index) => `${centerX(index)},${baseline - heightOf(point.value)}`).join(" ")}
          fill="none"
          className={animate}
          style={{ stroke: color, strokeWidth: 2 }}
        />
      )}

      {spec.series.map((point, index) => {
        const barHeight = heightOf(point.value);
        const faded = !kept.has(index);
        const highlighted = spec.highlight === index;

        return (
          <g
            key={`${point.label}-${index}`}
            data-series={index}
            data-height={barHeight.toFixed(2)}
            data-faded={faded ? "true" : undefined}
            data-highlight={highlighted ? "true" : undefined}
            className={animate}
          >
            {/* Só a marca esmaece abaixo do corte; o rótulo continua legível (T136). */}
            <g style={{ opacity: faded ? 0.3 : 1 }} className={animate}>
              {spec.kind === "bar" ? (
                <>
                  {/* Barras com contorno, como as do preview 01; a barra em destaque ganha sombra dura. */}
                  {highlighted && (
                    <rect
                      x={centerX(index) - BAR_WIDTH / 2 + SHADOW_OFFSET}
                      y={baseline - barHeight + SHADOW_OFFSET}
                      width={BAR_WIDTH}
                      height={Math.max(0, barHeight - SHADOW_OFFSET)}
                      rx={3}
                      className={animate}
                      style={{ fill: "var(--shadow-hard)" }}
                    />
                  )}
                  <rect
                    x={centerX(index) - BAR_WIDTH / 2}
                    y={baseline - barHeight}
                    width={BAR_WIDTH}
                    height={barHeight}
                    rx={3}
                    className={animate}
                    style={{
                      fill: color,
                      stroke: "var(--line-strong)",
                      strokeWidth: highlighted ? 2 : 1,
                    }}
                  />
                </>
              ) : (
                <circle
                  cx={centerX(index)}
                  cy={baseline - barHeight}
                  r={highlighted ? LINE_POINT_RADIUS.highlighted : LINE_POINT_RADIUS.normal}
                  className={animate}
                  style={{ fill: color, stroke: "var(--line-strong)", strokeWidth: highlighted ? 2 : 1 }}
                />
              )}
            </g>
            <text
              data-label={index}
              x={centerX(index)}
              y={labelY}
              textAnchor={tilt ? "end" : "middle"}
              dominantBaseline="central"
              transform={tilt ? `rotate(${TILTED_LABEL_ANGLE} ${centerX(index)} ${labelY})` : undefined}
              className={cn("font-mono", highlighted && "font-bold")}
              style={{ fontSize: labelFont, fill: "var(--ink-muted)" }}
            >
              {point.label}
            </text>
          </g>
        );
      })}

      {cutoffY !== undefined && spec.cutoff && (
        <g data-cutoff={spec.cutoff.mode} data-cutoff-y={cutoffY.toFixed(2)}>
          <line
            x1={left}
            y1={cutoffY}
            x2={plotRight}
            y2={cutoffY}
            strokeDasharray="5 4"
            className={animate}
            style={{ stroke: "var(--state-danger)", strokeWidth: 1.6 }}
          />
          {spec.cutoff.label && cutoffPill && (
            <DiagramPill x={cutoffPill.x} y={cutoffPill.y} text={spec.cutoff.label} tone="danger" fontSize={labelFont} />
          )}
        </g>
      )}
    </svg>
  );
}
