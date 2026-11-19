import { sceneColor } from "../colors";
import type { MatrixSpec, PieceProps } from "../types";

const CELL = 36;
const LABEL_CHAR_WIDTH = 6.8;
const LABEL_GAP = 8;
const PADDING = 8;
const SHADOW_OFFSET = 2;
const COL_LABEL_HEIGHT = 20;
/** Folga mínima entre um rótulo de coluna reto e a borda da célula. */
const COL_LABEL_SLACK = 6;
const TILTED_LABEL_ANGLE = -45;

/** Matriz/heatmap com rótulos de linha e coluna, escala de cor, célula em destaque e máscara causal (SCN-01.2). */
export function Matrix({ spec, transition }: PieceProps<MatrixSpec>) {
  const values = spec.values.flat();
  const min = spec.scale?.min ?? Math.min(...values);
  const max = spec.scale?.max ?? Math.max(...values);
  const range = max - min;
  const intensity = (value: number) => (range === 0 ? 1 : Math.min(1, Math.max(0, (value - min) / range)));
  const color = sceneColor(spec.color ?? "info");
  const animate = transition.animate ? "scene-animate" : undefined;

  const rowLabelWidth = Math.max(0, ...spec.rows.map((label) => label.length)) * LABEL_CHAR_WIDTH + LABEL_GAP;
  const colLabelWidth = Math.max(0, ...spec.cols.map((label) => label.length)) * LABEL_CHAR_WIDTH;
  // Rótulo de coluna que não cabe na célula fica inclinado, para não encostar no vizinho.
  const tiltColLabels = colLabelWidth > CELL - COL_LABEL_SLACK;
  const tiltedExtent = Math.ceil(colLabelWidth * Math.SQRT1_2);
  const colLabelHeight = tiltColLabels ? tiltedExtent + LABEL_GAP : COL_LABEL_HEIGHT;
  const left = PADDING + rowLabelWidth;
  const top = PADDING + colLabelHeight;
  const width = left + spec.cols.length * CELL + PADDING + (tiltColLabels ? tiltedExtent : 0);
  const height = top + spec.rows.length * CELL + PADDING;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="block h-full max-h-full w-full">
      {spec.cols.map((label, col) => {
        const x = left + col * CELL + CELL / 2;
        const y = tiltColLabels ? top - LABEL_GAP / 2 : PADDING + colLabelHeight / 2;
        return (
          <text
            key={`col-${col}`}
            data-col-label={col}
            x={x}
            y={y}
            textAnchor={tiltColLabels ? "start" : "middle"}
            dominantBaseline="central"
            transform={tiltColLabels ? `rotate(${TILTED_LABEL_ANGLE} ${x} ${y})` : undefined}
            className="font-mono text-[11px]"
            style={{ fill: "var(--ink-muted)" }}
          >
            {label}
          </text>
        );
      })}

      {spec.rows.map((label, row) => (
        <text
          key={`row-${row}`}
          data-row-label={row}
          x={left - LABEL_GAP}
          y={top + row * CELL + CELL / 2}
          textAnchor="end"
          dominantBaseline="central"
          className="font-mono text-[11px]"
          style={{ fill: "var(--ink-muted)" }}
        >
          {label}
        </text>
      ))}

      {/* Sombra dura da célula em destaque, atrás da grade, como os cartões do design. */}
      {spec.highlight && !(spec.causalMask === true && spec.highlight.col > spec.highlight.row) && (
        <rect
          data-highlight-shadow="true"
          x={left + spec.highlight.col * CELL + 1 + SHADOW_OFFSET}
          y={top + spec.highlight.row * CELL + 1 + SHADOW_OFFSET}
          width={CELL - 2}
          height={CELL - 2}
          rx={4}
          className={animate}
          style={{ fill: "var(--shadow-hard)" }}
        />
      )}

      {spec.rows.map((_, row) =>
        spec.cols.map((__, col) => {
          const value = spec.values[row]?.[col] ?? 0;
          const masked = spec.causalMask === true && col > row;
          const level = masked ? 0 : intensity(value);
          const highlighted = !masked && spec.highlight?.row === row && spec.highlight.col === col;

          return (
            <g
              key={`${row}-${col}`}
              data-cell={`${row}-${col}`}
              data-intensity={level.toFixed(3)}
              data-masked={masked ? "true" : undefined}
              data-highlight={highlighted ? "true" : undefined}
            >
              <rect
                x={left + col * CELL + 1}
                y={top + row * CELL + 1}
                width={CELL - 2}
                height={CELL - 2}
                rx={4}
                className={animate}
                style={{
                  fill: masked
                    ? "var(--surface-sunken)"
                    : `color-mix(in srgb, ${color} ${Math.round(level * 100)}%, var(--surface-raised))`,
                  stroke: highlighted ? "var(--line-strong)" : "var(--line-soft)",
                  strokeWidth: highlighted ? 2 : 1,
                  opacity: masked ? 0.5 : 1,
                }}
              />
              {spec.showValues && !masked && (
                <text
                  x={left + col * CELL + CELL / 2}
                  y={top + row * CELL + CELL / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className={highlighted ? "font-mono text-[10px] font-bold" : "font-mono text-[10px]"}
                  style={{ fill: "var(--ink-primary)" }}
                >
                  {value.toFixed(2)}
                </text>
              )}
            </g>
          );
        }),
      )}
    </svg>
  );
}
