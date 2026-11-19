import { DiagramPill } from "../../components/diagrams/DiagramPill";
import { getPillWidth } from "../../components/diagrams/ragDiagramLayout";
import { cn } from "../../lib/utils";
import { sceneColor } from "../colors";
import type { ChartSpec, PieceProps } from "../types";

const SLOT = 44;
const BAR_WIDTH = 28;
const PLOT_HEIGHT = 160;
const TOP = 24;
const LEFT = 16;
const LABEL_SPACE = 24;
const EPSILON = 1e-9;
const SHADOW_OFFSET = 2;

/** Índices das barras mantidas pela linha de corte; sem corte, todas. */
function keptIndexes(spec: ChartSpec): Set<number> {
  const all = spec.series.map((_, index) => index);
  if (!spec.cutoff) return new Set(all);
  const { mode, value } = spec.cutoff;
  if (mode === "threshold") return new Set(all.filter((index) => spec.series[index].value >= value - EPSILON));

  // top-p: as maiores barras até a soma acumulada chegar a p (a barra que cruza o limite entra).
  const kept = new Set<number>();
  let sum = 0;
  for (const index of [...all].sort((a, b) => spec.series[b].value - spec.series[a].value)) {
    if (sum >= value - EPSILON) break;
    kept.add(index);
    sum += spec.series[index].value;
  }
  return kept;
}

/** Barras ou linhas para distribuições e métricas, com eixo, linha de corte e destaque (SCN-01.2). */
export function Chart({ spec, transition }: PieceProps<ChartSpec>) {
  const max = spec.max ?? Math.max(EPSILON, ...spec.series.map((point) => point.value));
  const heightOf = (value: number) => (Math.min(Math.max(value, 0), max) / max) * PLOT_HEIGHT;
  const baseline = TOP + PLOT_HEIGHT;
  const width = LEFT * 2 + SLOT * spec.series.length;
  const height = baseline + LABEL_SPACE;
  const color = sceneColor(spec.color ?? "brand");
  const kept = keptIndexes(spec);
  const animate = transition.animate ? "scene-animate" : undefined;
  const centerX = (index: number) => LEFT + SLOT * (index + 0.5);

  const keptValues = spec.series.filter((_, index) => kept.has(index)).map((point) => point.value);
  const cutoffValue =
    spec.cutoff === undefined
      ? undefined
      : spec.cutoff.mode === "threshold"
        ? spec.cutoff.value
        : Math.min(...keptValues);
  const cutoffY = cutoffValue === undefined ? undefined : baseline - heightOf(cutoffValue);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="block h-full max-h-full w-full">
      <line x1={LEFT} y1={baseline} x2={width - LEFT} y2={baseline} style={{ stroke: "var(--line-strong)" }} />

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
                  r={highlighted ? 6 : 4}
                  className={animate}
                  style={{ fill: color, stroke: "var(--line-strong)", strokeWidth: highlighted ? 2 : 1 }}
                />
              )}
            </g>
            <text
              x={centerX(index)}
              y={baseline + LABEL_SPACE / 2}
              textAnchor="middle"
              dominantBaseline="central"
              className={cn("font-mono text-[11px]", highlighted && "font-bold")}
              style={{ fill: "var(--ink-muted)" }}
            >
              {point.label}
            </text>
          </g>
        );
      })}

      {cutoffY !== undefined && spec.cutoff && (
        <g data-cutoff={spec.cutoff.mode} data-cutoff-y={cutoffY.toFixed(2)}>
          <line
            x1={LEFT}
            y1={cutoffY}
            x2={width - LEFT}
            y2={cutoffY}
            strokeDasharray="5 4"
            className={animate}
            style={{ stroke: "var(--state-danger)", strokeWidth: 1.6 }}
          />
          {spec.cutoff.label && (
            <DiagramPill
              x={width - LEFT - getPillWidth(spec.cutoff.label) / 2}
              y={Math.max(13, cutoffY - 14)}
              text={spec.cutoff.label}
              tone="danger"
            />
          )}
        </g>
      )}
    </svg>
  );
}
