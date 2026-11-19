import { cn } from "../../lib/utils";
import type { LessonStat } from "../../types/course";

interface LessonStatsProps {
  stats: LessonStat[];
}

export function LessonStats({ stats }: LessonStatsProps) {
  return (
    <ul aria-label="Indicadores da aula" className="flex flex-wrap gap-2">
      {stats.map((stat) => (
        <li
          key={stat.label}
          className={cn(
            "flex flex-col gap-1 rounded-[5px] border px-3 py-2",
            stat.isHighlighted ? "border-line-strong bg-brand-soft" : "border-line bg-surface",
          )}
        >
          <span className="text-[9px] font-semibold uppercase leading-3 tracking-[0.8px] text-muted">{stat.label}</span>
          <span className="whitespace-pre text-[15px] font-bold leading-5 text-ink">{stat.value}</span>
        </li>
      ))}
    </ul>
  );
}
