import { ChevronRight, Folder } from "lucide-react";
import type { LessonStatusMap } from "../../lib/course";
import { cn } from "../../lib/utils";
import type { CourseModule, ModuleAccent } from "../../types/course";
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

const MODULE_ACCENT_TEXT_CLASS: Record<ModuleAccent, string> = {
  blue: "text-blue",
  green: "text-green-dark",
  purple: "text-purple",
  orange: "text-orange",
  yellow: "text-yellow",
};

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

  return (
    <li>
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium text-ink transition-colors hover:bg-surface-muted"
      >
        <ChevronRight
          size={14}
          aria-hidden="true"
          className={cn("shrink-0 text-muted transition-transform", isExpanded && "rotate-90")}
        />
        <Folder size={14} aria-hidden="true" className={cn("shrink-0", MODULE_ACCENT_TEXT_CLASS[module.accent])} />
        <span className="min-w-0 flex-1 truncate">
          {module.number}. {module.title}
        </span>
        <span className="shrink-0 font-mono text-[11px] text-muted">
          {completedCount}/{module.lessons.length}
        </span>
      </button>

      {isExpanded && (
        <ul id={panelId} className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-line pl-2">
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
