import type { ReactNode } from "react";

interface TagProps {
  children: ReactNode;
}

/** Rótulo curto em caixa alta, como o tipo do passo ("MECANISMO") no preview 00. */
export function Tag({ children }: TagProps) {
  return (
    <span className="inline-flex items-center rounded-[10px] border border-line-strong bg-brand-soft px-2 py-[3px] text-[9px] font-bold uppercase leading-3 tracking-[0.8px] text-ink">
      {children}
    </span>
  );
}
