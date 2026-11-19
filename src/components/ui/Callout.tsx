import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface CalloutProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function Callout({ title, children, className }: CalloutProps) {
  return (
    <section aria-label={title} className={cn("flex flex-col gap-1.5 rounded-md border border-info bg-info-soft px-3.5 py-3", className)}>
      <p className="text-[10px] font-bold uppercase leading-[13px] tracking-[1px] text-info">
        <span aria-hidden="true">✦ </span>
        {title}
      </p>
      <div className="text-xs leading-[1.55] text-ink">{children}</div>
    </section>
  );
}
