import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export type BadgeTone = "brand" | "success" | "info";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const toneClasses: Record<BadgeTone, string> = {
  brand: "bg-brand-soft",
  success: "bg-success-soft",
  info: "bg-info-soft",
};

export function Badge({ tone = "brand", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl border border-line-strong px-2.5 py-1 text-[11px] font-medium leading-[14px] text-ink shadow-press-sm",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
