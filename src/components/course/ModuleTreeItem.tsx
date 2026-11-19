import { ChevronRight } from "lucide-react";
import type { LessonStatusMap } from "../../lib/course";
import { cn } from "../../lib/utils";
import type { ModuleMeta } from "../../types/content";
import { LessonTreeItem } from "./LessonTreeItem";

interface ModuleTreeItemProps {
  module: ModuleMeta;
  completedCount: number;
  isExpanded: boolean;
  selectedLessonId: string;
  statuses: LessonStatusMap;
  onToggle: () => void;
  onSelectLesson: (lessonId: string) => void;
}

export function ModuleTreeItem({
  module,
  completedCount,
  isExpanded,
  selectedLessonId,
  statuses,
  onToggle,
  onSelectLesson,
}: ModuleTreeItemProps) {
  const panelId = `module-panel-${module.id}`;
  const isComplete = module.lessons.length > 0 && completedCount === module.lessons.length;

  return (
    <li>
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full items-center gap-2 rounded-[5px] py-1.5 pl-1 pr-2 text-start text-xs leading-4 text-ink transition-colors hover:bg-sunken"
      >
        <ChevronRight
          size={14}
          aria-hidden="true"
          className={cn("shrink-0 transition-transform", isExpanded ? "rotate-90 text-ink" : "text-muted")}
        />
        <svg
          aria-hidden="true"
          width="14"
          height="11"
          viewBox="0 0 14 11"
          className="shrink-0"
          style={{ color: `var(--module-${module.id})` }}
        >
          <rect x="0.5" y="0.5" width="13" height="10" rx="2" fill="currentColor" className="stroke-line-strong" />
        </svg>
        {/* "08. RAG Architecture" é conteúdo: em RTL o número não pode ir para o fim ("RAG Architecture .08"). */}
        <span className={cn("min-w-0 flex-1", isExpanded && "font-semibold")}>
          <bdi dir="ltr">
            {module.id}. {module.title}
          </bdi>
        </span>
        <span className={cn("shrink-0 text-[11px] leading-[14px]", isComplete ? "text-success-ink" : "text-muted")}>
          {completedCount}/{module.lessons.length}
          {isComplete && <span aria-hidden="true"> ✓</span>}
        </span>
      </button>

      {isExpanded && (
        <ul id={panelId} className="mt-0.5 flex flex-col gap-0.5">
          {module.lessons.map((lesson) => (
            <LessonTreeItem
              key={lesson.id}
              lesson={lesson}
              status={statuses[lesson.id] ?? "not-started"}
              isCurrent={lesson.id === selectedLessonId}
              onSelect={() => onSelectLesson(lesson.id)}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
