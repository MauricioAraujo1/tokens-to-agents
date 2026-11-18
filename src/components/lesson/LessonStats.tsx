import type { LessonStat } from "../../types/course";

interface LessonStatsProps {
  stats: LessonStat[];
}

const STAT_ACCENT_CLASSES = ["border-l-red", "border-l-green-dark", "border-l-blue"];

export function LessonStats({ stats }: LessonStatsProps) {
  return (
    <ul aria-label="Indicadores da aula" className="flex flex-wrap gap-2">
      {stats.map((stat, index) => (
        <li
          key={stat.label}
          className={`flex items-center gap-3 rounded-md border border-l-[3px] border-line bg-surface px-3 py-1.5 shadow-paper ${STAT_ACCENT_CLASSES[index % STAT_ACCENT_CLASSES.length]}`}
        >
          <span className="font-mono text-[11px] uppercase tracking-wide text-muted">{stat.label}</span>
          <span className="font-mono text-sm font-semibold text-ink">{stat.value}</span>
        </li>
      ))}
    </ul>
  );
}
