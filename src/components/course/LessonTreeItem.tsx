import { LESSON_STATUS_LABEL } from "../../lib/lesson";
import { cn } from "../../lib/utils";
import type { Lesson, LessonStatus } from "../../types/course";

interface LessonTreeItemProps {
  lesson: Lesson;
  status: LessonStatus;
  isCurrent: boolean;
  onSelect: () => void;
}

const STATUS_GLYPH: Record<LessonStatus, string> = {
  "not-started": "○",
  "in-progress": "◐",
  completed: "✓",
};

export function LessonTreeItem({ lesson, status, isCurrent, onSelect }: LessonTreeItemProps) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={isCurrent ? "page" : undefined}
        className={cn(
          "flex w-full items-center gap-2 rounded-[5px] border-[1.5px] py-1 pl-7 pr-2 text-left text-xs leading-4 transition-colors",
          isCurrent
            ? "border-line-strong bg-brand-soft font-semibold text-ink shadow-press"
            : status === "completed"
              ? "border-transparent text-muted hover:bg-sunken hover:text-ink"
              : "border-transparent text-ink hover:bg-sunken",
        )}
      >
        <span aria-hidden="true" className="w-3 shrink-0 text-center">
          {isCurrent ? "●" : STATUS_GLYPH[status]}
        </span>
        <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
        <span className="sr-only">
          {LESSON_STATUS_LABEL[status]}
          {isCurrent ? ", aula atual" : ""}
        </span>
      </button>
    </li>
  );
}
