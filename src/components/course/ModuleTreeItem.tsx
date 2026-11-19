import { ChevronRight } from "lucide-react";
import { getModuleColor, type LessonStatusMap } from "../../lib/course";
import { cn } from "../../lib/utils";
import type { CourseModule } from "../../types/course";
import { LessonTreeItem } from "./LessonTreeItem";

interface ModuleTreeItemProps {
  module: CourseModule;
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
        className="flex w-full items-center gap-2 rounded-[5px] py-1.5 pl-1 pr-2 text-left text-xs leading-4 text-ink transition-colors hover:bg-sunken"
      >
        <ChevronRight
          size={14}
          aria-hidden="true"
          className={cn("shrink-0 transition-transform", isExpanded ? "rotate-90 text-ink" : "text-muted")}
        />
        <span
          aria-hidden="true"
          className="h-[11px] w-3.5 shrink-0 rounded-[2px] border border-line-strong"
          style={{ backgroundColor: getModuleColor(module) }}
        />
        <span className={cn("min-w-0 flex-1", isExpanded && "font-semibold")}>
          {module.number}. {module.title}
        </span>
        <span className={cn("shrink-0 text-[11px] leading-[14px]", isComplete ? "text-success" : "text-muted")}>
          {completedCount}/{module.lessons.length}
          {isComplete && " ✓"}
        </span>
      </button>

      {isExpanded && (
        <ul id={panelId} className="mt-0.5 flex flex-col gap-0.5">
          {module.lessons.map((lesson) => (
            <LessonTreeItem
              key={lesson.id}
              lesson={lesson}
              status={statuses[lesson.id] ?? lesson.status}
              isCurrent={lesson.id === selectedLessonId}
              onSelect={() => onSelectLesson(lesson.id)}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
