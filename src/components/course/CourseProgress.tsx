interface CourseProgressProps {
  completed: number;
  total: number;
}

export function CourseProgress({ completed, total }: CourseProgressProps) {
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div className="flex flex-col gap-2 border-t border-line px-3.5 pb-3.5 pt-3">
      <div className="flex items-center justify-between text-[11px] leading-[14px]">
        <span className="font-semibold uppercase tracking-[1px] text-ink">Progresso</span>
        <span className="text-muted">
          {completed} / {total}
        </span>
      </div>

      <div
        role="progressbar"
        aria-label="Progresso do curso"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={completed}
        className="h-2 overflow-hidden rounded border border-line-strong bg-sunken"
      >
        <div className="h-full bg-brand transition-[width] duration-700 ease-out" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
