import { CircleCheck, CircleDot, Circle, type LucideIcon } from "lucide-react";
import { LESSON_STATUS_LABEL } from "../../lib/lesson";
import { cn } from "../../lib/utils";
import type { Lesson, LessonStatus } from "../../types/course";

interface LessonTreeItemProps {
  lesson: Lesson;
  status: LessonStatus;
  isCurrent: boolean;
  onSelect: () => void;
}

const STATUS_ICON: Record<LessonStatus, LucideIcon> = {
  "not-started": Circle,
  "in-progress": CircleDot,
  completed: CircleCheck,
};

const STATUS_ICON_CLASS: Record<LessonStatus, string> = {
  "not-started": "text-muted",
  "in-progress": "text-green-dark",
  completed: "text-green-dark",
};

export function LessonTreeItem({ lesson, status, isCurrent, onSelect }: LessonTreeItemProps) {
  const StatusIcon = STATUS_ICON[status];

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={isCurrent ? "page" : undefined}
        className={cn(
          "relative flex w-full items-center gap-2 rounded-md py-1.5 pl-2.5 pr-2 text-left text-[13px] transition-colors",
          isCurrent ? "bg-green/30 font-semibold text-ink" : "text-muted hover:bg-surface-muted hover:text-ink",
        )}
      >
        {isCurrent && <span aria-hidden="true" className="absolute inset-y-1 -left-[9px] w-[3px] rounded-full bg-green-dark" />}
        <StatusIcon size={14} aria-hidden="true" className={cn("shrink-0", STATUS_ICON_CLASS[status])} />
        <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
        <span className="sr-only">
          {LESSON_STATUS_LABEL[status]}
          {isCurrent ? ", aula atual" : ""}
        </span>
      </button>
    </li>
  );
}
