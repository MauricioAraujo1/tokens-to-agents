import { useRef } from "react";
import { useSvgTextScale } from "../../hooks/useSvgTextScale";
import { useI18n } from "../../i18n/useI18n";
import { sceneColor } from "../colors";
import { describeScene } from "../describe";
import { SceneScroll } from "../SceneScroll";
import { scrollMinWidth } from "../textScale";
import type { MatrixSpec, PieceProps } from "../types";
import { LABEL_GAP, layoutMatrix, PADDING } from "./matrixLayout";
import { STAGE_FONT } from "./pipelineLayout";

const SHADOW_OFFSET = 2;
const TILTED_LABEL_ANGLE = -45;
/**
 * Fonte de referência da largura mínima (LEG-01.4): as células crescem com o texto, e com 3 vezes a
 * fonte da cena as margens fixas quase não pesam. A largura em que essa fonte dá 12 px na tela fica
 * perto da menor em que o texto ainda chega a 12 px. A 1440, a célula mais estreita (3 matrizes lado a
 * lado, 207 px) é mais larga que isso, e nada rola.
 */
const MATRIX_SCROLL_FONT = 3 * STAGE_FONT;

/** Matriz/heatmap com rótulos de linha e coluna, escala de cor, célula em destaque e máscara causal (SCN-01.2). */
export function Matrix({ spec, transition }: PieceProps<MatrixSpec>) {
  const ref = useRef<SVGSVGElement>(null);
  const { t, locale } = useI18n();
  const sizeAt = (candidate: number) => layoutMatrix(spec, candidate);
  const { font } = useSvgTextScale(ref, sizeAt);
  // Num quadro estreito (375, ou duas matrizes lado a lado), o desenho fica com a largura em que o texto
  // tem 12 px e o quadro rola.
  const minWidth = scrollMinWidth(sizeAt, MATRIX_SCROLL_FONT);
  const values = spec.values.flat();
  const min = spec.scale?.min ?? Math.min(...values);
  const max = spec.scale?.max ?? Math.max(...values);
  const range = max - min;
  const intensity = (value: number) => (range === 0 ? 1 : Math.min(1, Math.max(0, (value - min) / range)));
  const color = sceneColor(spec.color ?? "info");
  const animate = transition.animate ? "scene-animate" : undefined;
  const { labelFont, cell: CELL, tiltColLabels, colLabelHeight, left, top, width, height, rowLines } = layoutMatrix(spec, font);

  return (
    <SceneScroll label={describeScene({ kind: "pieces", layout: "single", pieces: [spec] }, { t, locale })} className="h-full">
      <svg ref={ref} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="block h-full max-h-full w-full" style={{ minWidth }}>
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
              className="font-mono"
              style={{ fontSize: labelFont, fill: "var(--ink-muted)" }}
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
            className="font-mono"
            style={{ fontSize: labelFont, fill: "var(--ink-muted)" }}
          >
            {rowLines[row].length === 1
              ? label
              : rowLines[row].map((line, index) => (
                  <tspan key={`${index}-${line}`} x={left - LABEL_GAP} dy={index === 0 ? `${-(rowLines[row].length - 1) * 0.6}em` : "1.2em"}>
                    {line}
                  </tspan>
                ))}
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
                    className={highlighted ? "font-mono font-bold" : "font-mono"}
                    style={{ fontSize: labelFont, fill: "var(--ink-primary)" }}
                  >
                    {value.toFixed(2)}
                  </text>
                )}
              </g>
            );
          }),
        )}
      </svg>
    </SceneScroll>
  );
}
