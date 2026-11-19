import { ChevronDown, ChevronUp } from "lucide-react";
import { useI18n } from "../../i18n/useI18n";
import { Button } from "../ui/Button";

interface CourseProgressProps {
  completed: number;
  total: number;
  allExpanded: boolean;
  onToggleAll: () => void;
}

export function CourseProgress({ completed, total, allExpanded, onToggleAll }: CourseProgressProps) {
  const { t } = useI18n();
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div className="flex flex-col gap-2 border-t border-line px-3.5 pb-3.5 pt-3">
      <div className="flex items-center justify-between text-[11px] leading-[14px]">
        <span className="font-semibold uppercase tracking-[1px] text-ink">{t("courseProgress.title")}</span>
        <span className="text-muted">
          {completed} / {total}
        </span>
      </div>

      <div
        role="progressbar"
        aria-label={t("courseProgress.bar")}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={completed}
        className="h-2 overflow-hidden rounded border border-line-strong bg-sunken"
      >
        <div className="h-full bg-brand transition-[width] duration-700 ease-out" style={{ width: `${percentage}%` }} />
      </div>

      <Button variant="ghost" size="sm" className="justify-between px-0 hover:bg-transparent" onClick={onToggleAll}>
        {allExpanded ? t("courseProgress.collapseAll") : t("courseProgress.expandAll")}
        {allExpanded ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
      </Button>
    </div>
  );
}
