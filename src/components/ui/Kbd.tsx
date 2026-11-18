import type { ReactNode } from "react";

interface KbdProps {
  children: ReactNode;
}

export function Kbd({ children }: KbdProps) {
  return (
    <kbd className="rounded border border-line bg-surface px-1.5 py-px font-mono text-[10px] leading-4 text-muted shadow-[0_1px_0_var(--line)]">
      {children}
    </kbd>
  );
}
