import { Construction } from "lucide-react";
import type { AppSectionDefinition } from "../../data/sections";
import type { AppSection } from "../../types/app";
import { Button } from "../ui/Button";

interface SectionPlaceholderProps {
  section: AppSectionDefinition;
  onNavigate: (section: AppSection) => void;
}

export function SectionPlaceholder({ section, onNavigate }: SectionPlaceholderProps) {
  return (
    <section aria-labelledby="section-placeholder-title" className="flex flex-1 items-center justify-center p-6">
      <div className="paper-grid flex w-full max-w-md flex-col items-center gap-4 rounded-xl border border-line p-8 text-center shadow-paper">
        <span className="grid size-12 place-items-center rounded-full border border-ink/60 bg-yellow/60 text-ink">
          <Construction size={22} aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Em preparação</p>
          <h1 id="section-placeholder-title" className="text-2xl font-semibold tracking-tight text-ink">
            {section.label}
          </h1>
          <p className="text-sm leading-relaxed text-muted">{section.description}</p>
          <p className="text-sm leading-relaxed text-muted">
            Esta área será liberada na próxima entrega. Enquanto isso, continue pela trilha de aulas.
          </p>
        </div>
        <Button variant="primary" onClick={() => onNavigate("aprender")}>
          Voltar para Aprender
        </Button>
      </div>
    </section>
  );
}
