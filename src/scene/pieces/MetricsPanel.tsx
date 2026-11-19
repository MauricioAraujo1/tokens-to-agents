import { cn } from "../../lib/utils";
import { sceneColor } from "../colors";
import type { MetricsPanelSpec, PieceProps } from "../types";

/**
 * Cards de métrica ao vivo sobre a cena, com um em destaque (SCN-01.2). Mesmo visual de `LessonStats`:
 * rótulo em caixa alta sobre o valor, e o card em destaque em `brand-soft` com borda forte, como
 * "MAIOR PONTUAÇÃO" no preview 01. A cor declarada na métrica vira um marcador ao lado do rótulo.
 */
export function MetricsPanel({ spec, transition }: PieceProps<MetricsPanelSpec>) {
  return (
    <ul className="flex flex-wrap gap-2">
      {spec.metrics.map((metric) => {
        const highlighted = metric.id === spec.highlight;

        return (
          <li
            key={metric.id}
            aria-current={highlighted ? "true" : undefined}
            className={cn(
              "flex flex-col gap-1 rounded-[5px] border px-3 py-2",
              highlighted ? "border-line-strong bg-brand-soft shadow-press-sm" : "border-line bg-surface",
              transition.animate && "scene-animate",
            )}
          >
            {/* Sobre o brand-soft, ink-muted fica abaixo de 4,5:1 no escuro; o rótulo em destaque usa ink. */}
            <span
              className={cn(
                "inline-flex items-center gap-1.5 font-mono text-[9px] font-semibold uppercase leading-3 tracking-[0.8px]",
                highlighted ? "text-ink" : "text-muted",
              )}
            >
              {metric.color && (
                <span
                  aria-hidden="true"
                  data-swatch="true"
                  className="size-2 rounded-[2px] border border-line-strong"
                  style={{ backgroundColor: sceneColor(metric.color) }}
                />
              )}
              {metric.label}
            </span>
            <span className="whitespace-pre font-mono text-[15px] font-bold leading-5 text-ink">{metric.value}</span>
          </li>
        );
      })}
    </ul>
  );
}
