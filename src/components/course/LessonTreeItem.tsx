import type { MessageKey } from "../../i18n/messages/pt-BR";
import { useI18n } from "../../i18n/useI18n";
import type { LessonStatus } from "../../lib/course";
import { cn } from "../../lib/utils";
import type { LessonMeta } from "../../types/content";

const STATUS_LABEL_KEY: Record<LessonStatus, MessageKey> = {
  "not-started": "lessonStatus.notStarted",
  "in-progress": "lessonStatus.inProgress",
  completed: "lessonStatus.completed",
};

interface LessonTreeItemProps {
  lesson: LessonMeta;
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
  const { t } = useI18n();
  const statusLabel = t(STATUS_LABEL_KEY[status]);

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={isCurrent ? "page" : undefined}
        className={cn(
          "flex w-full items-center gap-2 rounded-[5px] border-[1.5px] py-1 pe-2 ps-7 text-start text-xs leading-4 transition-colors",
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
        {/* Título em PT (AD-003): isolado em LTR, mas alinhado pelo idioma da interface. */}
        <span className="min-w-0 flex-1 truncate">
          <bdi dir="ltr">{lesson.title}</bdi>
        </span>
        <span className="sr-only">
          {isCurrent ? t("lessonStatus.current", { status: statusLabel }) : statusLabel}
        </span>
      </button>
    </li>
  );
}
