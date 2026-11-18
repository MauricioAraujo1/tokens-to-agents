import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export type BadgeTone = "neutral" | "blue" | "green" | "yellow" | "purple";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const toneClasses: Record<BadgeTone, string> = {
  neutral: "border-line bg-surface-muted text-muted",
  blue: "border-blue/60 bg-blue/25 text-ink",
  green: "border-green-dark/40 bg-green/35 text-green-dark",
  yellow: "border-yellow/70 bg-yellow/35 text-ink",
  purple: "border-purple/60 bg-purple/25 text-ink",
};

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[11px] font-medium leading-4",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
