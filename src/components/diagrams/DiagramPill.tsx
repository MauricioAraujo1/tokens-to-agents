import type { LucideIcon } from "lucide-react";

export type DiagramPillTone = "neutral" | "success" | "danger";

interface DiagramPillProps {
  x: number;
  y: number;
  text: string;
  icon?: LucideIcon;
  tone?: DiagramPillTone;
}

const PILL_HEIGHT = 22;
const PILL_CHAR_WIDTH = 6.7;
const PILL_PADDING = 22;
const PILL_ICON_SPACE = 16;
const PILL_SHADOW_OFFSET = 2.5;

const PILL_FILL: Record<DiagramPillTone, string> = {
  neutral: "var(--surface-raised)",
  success: "color-mix(in srgb, var(--diagram-green) 45%, var(--surface-raised))",
  danger: "color-mix(in srgb, var(--diagram-red) 28%, var(--surface-raised))",
};

export function DiagramPill({ x, y, text, icon: Icon, tone = "neutral" }: DiagramPillProps) {
  const width = text.length * PILL_CHAR_WIDTH + PILL_PADDING + (Icon ? PILL_ICON_SPACE : 0);
  const left = x - width / 2;
  const top = y - PILL_HEIGHT / 2;

  return (
    <g>
      <rect x={left} y={top + PILL_SHADOW_OFFSET} width={width} height={PILL_HEIGHT} rx={PILL_HEIGHT / 2} className="fill-ink" />
      <rect
        x={left}
        y={top}
        width={width}
        height={PILL_HEIGHT}
        rx={PILL_HEIGHT / 2}
        className="stroke-ink"
        strokeWidth={1.6}
        style={{ fill: PILL_FILL[tone] }}
      />
      {Icon && <Icon x={left + 9} y={y - 6.5} width={13} height={13} strokeWidth={2.4} className="text-ink" aria-hidden="true" />}
      <text
        x={Icon ? x + PILL_ICON_SPACE / 2 : x}
        y={y + 0.5}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-ink font-mono text-[11px] font-medium"
      >
        {text}
      </text>
    </g>
  );
}
