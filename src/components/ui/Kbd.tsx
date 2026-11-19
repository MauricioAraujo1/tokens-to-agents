import type { ReactNode } from "react";

interface KbdProps {
  children: ReactNode;
}

export function Kbd({ children }: KbdProps) {
  return (
    <kbd className="whitespace-nowrap rounded border border-line bg-sunken px-1.5 py-0.5 font-mono text-[11px] leading-[14px] text-muted">
      {children}
    </kbd>
  );
}
