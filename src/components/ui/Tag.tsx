import type { ReactNode } from "react";

interface TagProps {
  children: ReactNode;
}

export function Tag({ children }: TagProps) {
  return (
    <span className="inline-flex items-center rounded-[10px] border border-line-strong bg-brand-soft px-2 py-[3px] text-[9px] font-bold leading-3 tracking-[0.8px] text-ink">
      {children}
    </span>
  );
}
