import { useI18n } from "../../i18n/useI18n";
import { cn } from "../../lib/utils";

export interface LessonStat {
  label: string;
  value: string;
  /** Cartão em destaque (fundo `brand-soft` e borda forte), como "MAIOR PONTUAÇÃO" no preview 01. */
  isHighlighted?: boolean;
}

interface LessonStatsProps {
  stats: LessonStat[];
}

export function LessonStats({ stats }: LessonStatsProps) {
  const { t } = useI18n();

  return (
    <ul aria-label={t("lesson.stats")} className="flex flex-wrap gap-2">
      {stats.map((stat) => (
        <li
          key={stat.label}
          className={cn(
            "flex flex-col gap-1 rounded-[5px] border px-3 py-2",
            stat.isHighlighted ? "border-line-strong bg-brand-soft" : "border-line bg-surface",
          )}
        >
          <span
            className={cn(
              "text-[9px] font-semibold uppercase leading-3 tracking-[0.8px]",
              stat.isHighlighted ? "text-ink" : "text-muted",
            )}
          >
            {stat.label}
          </span>
          <span className="whitespace-pre text-[15px] font-bold leading-5 text-ink">{stat.value}</span>
        </li>
      ))}
    </ul>
  );
}
