import type { LucideIcon } from "lucide-react";
import { PILL_FONT, PILL_ICON_SPACE, getPillSize } from "./ragDiagramLayout";

export type DiagramPillTone = "neutral" | "success" | "danger";

interface DiagramPillProps {
  x: number;
  y: number;
  text: string;
  icon?: LucideIcon;
  tone?: DiagramPillTone;
  /** Fonte em unidades da viewBox; a pílula inteira acompanha (LEG-01.3). Sem ela, 11. */
  fontSize?: number;
}

const PILL_SHADOW_OFFSET = 2.5;

// "Pílulas e conexões" (FigCraft): neutra em surface, passo com 45% de verde, erro com 28% de vermelho.
const PILL_FILL: Record<DiagramPillTone, string> = {
  neutral: "var(--surface-raised)",
  success: "color-mix(in srgb, var(--diagram-green) 45%, var(--surface-raised))",
  danger: "color-mix(in srgb, var(--diagram-red) 28%, var(--surface-raised))",
};

export function DiagramPill({ x, y, text, icon: Icon, tone = "neutral", fontSize = PILL_FONT }: DiagramPillProps) {
  const ratio = fontSize / PILL_FONT;
  const { width, height } = getPillSize(text, fontSize, Icon !== undefined);
  const left = x - width / 2;
  const top = y - height / 2;

  return (
    <g>
      <rect x={left} y={top + PILL_SHADOW_OFFSET * ratio} width={width} height={height} rx={height / 2} className="fill-ink" />
      <rect
        x={left}
        y={top}
        width={width}
        height={height}
        rx={height / 2}
        className="stroke-ink"
        strokeWidth={1.6}
        style={{ fill: PILL_FILL[tone] }}
      />
      {Icon && (
        <Icon
          x={left + 9 * ratio}
          y={y - 6.5 * ratio}
          width={13 * ratio}
          height={13 * ratio}
          strokeWidth={2.4}
          className="text-ink"
          aria-hidden="true"
        />
      )}
      <text
        x={Icon ? x + (PILL_ICON_SPACE * ratio) / 2 : x}
        y={y + 0.5 * ratio}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-ink font-mono font-medium"
        style={{ fontSize }}
      >
        {text}
      </text>
    </g>
  );
}
