import { useId } from "react";
import { useProgress } from "../../hooks/useProgress";
import { useI18n } from "../../i18n/useI18n";
import { progressStore, type ProgressStore } from "../../lib/progress/store";
import { cn } from "../../lib/utils";
import type { LessonId } from "../../types/content";

interface ObjectivesChecklistProps {
  lessonId: LessonId;
  objectives: string[];
  store?: ProgressStore;
}

/** Checklist "Você vai aprender": cada marca fica salva no progresso da aula (PRG-01.3). */
export function ObjectivesChecklist({ lessonId, objectives, store = progressStore }: ObjectivesChecklistProps) {
  const { t } = useI18n();
  const progress = useProgress(store);
  const titleId = useId();
  const checked = progress.objectives[lessonId] ?? [];

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-2.5 rounded-lg border border-line bg-surface px-[18px] pb-4 pt-3.5"
    >
      <h2 id={titleId} className="text-[11px] font-semibold uppercase leading-[14px] tracking-[1px] text-ink">
        {t("objectives.title")}
      </h2>
      <ul className="flex flex-col gap-2.5">
        {objectives.map((objective, index) => {
          const isChecked = checked.includes(index);

          return (
            <li key={objective}>
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-2.5 text-xs leading-4 transition-colors",
                  isChecked ? "text-muted" : "text-ink",
                )}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => store.toggleObjective(lessonId, index)}
                  className="mt-px size-3.5 shrink-0 accent-brand"
                />
                <span dir="ltr">{objective}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
