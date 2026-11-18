import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "../ui/Button";

interface CourseProgressProps {
  completed: number;
  total: number;
  allExpanded: boolean;
  onToggleAll: () => void;
}

export function CourseProgress({ completed, total, allExpanded, onToggleAll }: CourseProgressProps) {
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div className="flex flex-col gap-2 border-t border-line px-4 py-3">
      <div className="flex items-center justify-between font-mono text-[11px] tracking-wide text-muted">
        <span className="uppercase">Progresso</span>
        <span className="text-ink">
          {completed} / {total}
        </span>
      </div>

      <div
        role="progressbar"
        aria-label="Progresso do curso"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={completed}
        className="h-1.5 overflow-hidden rounded-full bg-surface-muted"
      >
        <div className="h-full rounded-full bg-green-dark/70 transition-[width]" style={{ width: `${percentage}%` }} />
      </div>

      <Button variant="ghost" size="sm" className="justify-between px-0 hover:bg-transparent" onClick={onToggleAll}>
        {allExpanded ? "Recolher módulos" : "Expandir módulos"}
        {allExpanded ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
      </Button>
    </div>
  );
}
