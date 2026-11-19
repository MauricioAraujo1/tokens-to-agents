import {
  countModuleCompletedLessons,
  getModuleColor,
  getModuleStatus,
  type LessonStatusMap,
  type ModuleStatus,
} from "../../lib/course";
import { cn } from "../../lib/utils";
import type { CourseModule } from "../../types/course";

interface ModuleCardProps {
  module: CourseModule;
  statuses: LessonStatusMap;
  isCurrent: boolean;
  onOpen: () => void;
}

const STATUS_GLYPH: Record<ModuleStatus, string> = {
  completed: "●",
  "in-progress": "◐",
  "not-started": "○",
};

const STATUS_CLASS: Record<ModuleStatus, string> = {
  completed: "text-success",
  "in-progress": "text-brand",
  "not-started": "text-subtle",
};

const STATUS_LABEL: Record<ModuleStatus, string> = {
  completed: "concluído",
  "in-progress": "em andamento",
  "not-started": "não iniciado",
};

export function ModuleCard({ module, statuses, isCurrent, onOpen }: ModuleCardProps) {
  const status = getModuleStatus(module, statuses);
  const completed = countModuleCompletedLessons(module, statuses);
  const total = module.lessons.length;
  const progress = total === 0 ? 0 : (completed / total) * 100;
  const color = getModuleColor(module);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${module.number} ${module.title}, ${completed} de ${total} aulas, ${STATUS_LABEL[status]}`}
      className={cn(
        "flex h-full w-full flex-col gap-2 overflow-hidden rounded-[7px] border border-line-strong bg-surface pb-3 text-left transition-colors hover:bg-sunken",
        isCurrent && "border-[1.5px] shadow-press-lg",
      )}
    >
      <span aria-hidden="true" className="h-2 w-full shrink-0" style={{ backgroundColor: color }} />
      <span className="flex flex-1 flex-col gap-1.5 px-3 pt-1">
        <span className="flex items-start justify-between">
          <span className="text-[11px] font-bold text-muted">{module.number}</span>
          <span aria-hidden="true" className={cn("text-xs font-bold", STATUS_CLASS[status])}>
            {STATUS_GLYPH[status]}
          </span>
        </span>
        <span className="text-[13px] font-bold leading-[17px] text-ink">{module.title}</span>
        <span className="text-[11px] text-muted">
          {completed}/{total} aulas
        </span>
        <span aria-hidden="true" className="mt-auto h-[5px] overflow-hidden rounded-[3px] bg-sunken">
          <span className="block h-full" style={{ width: `${progress}%`, backgroundColor: color }} />
        </span>
      </span>
    </button>
  );
}
