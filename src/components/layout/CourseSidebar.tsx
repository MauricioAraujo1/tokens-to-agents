import { FolderOpen } from "lucide-react";
import { useState, type CSSProperties } from "react";
import {
  countCompletedLessons,
  countLessons,
  countModuleCompletedLessons,
  type LessonStatusMap,
} from "../../lib/course";
import { cn } from "../../lib/utils";
import type { CourseModule } from "../../types/course";
import { usePanelResize } from "../../hooks/usePanelResize";
import { CourseProgress } from "../course/CourseProgress";
import { ModuleTreeItem } from "../course/ModuleTreeItem";
import { ResizeHandle } from "./ResizeHandle";

const SIDEBAR_MIN_WIDTH = 200;
const SIDEBAR_MAX_WIDTH = 380;
const SIDEBAR_INITIAL_WIDTH = 240;

interface CourseSidebarProps {
  modules: CourseModule[];
  selectedLessonId: string;
  statuses: LessonStatusMap;
  isOpen: boolean;
  onSelectLesson: (lessonId: string) => void;
}

function findModuleIdByLesson(modules: CourseModule[], lessonId: string): string | undefined {
  return modules.find((module) => module.lessons.some((lesson) => lesson.id === lessonId))?.id;
}

export function CourseSidebar({ modules, selectedLessonId, statuses, isOpen, onSelectLesson }: CourseSidebarProps) {
  const selectedModuleId = findModuleIdByLesson(modules, selectedLessonId);
  const [expandedModuleIds, setExpandedModuleIds] = useState<string[]>(() =>
    selectedModuleId ? [selectedModuleId] : [],
  );
  const [revealedModuleId, setRevealedModuleId] = useState(selectedModuleId);

  if (revealedModuleId !== selectedModuleId) {
    setRevealedModuleId(selectedModuleId);

    if (selectedModuleId && !expandedModuleIds.includes(selectedModuleId)) {
      setExpandedModuleIds([...expandedModuleIds, selectedModuleId]);
    }
  }

  const { width, separatorProps } = usePanelResize({
    initialWidth: SIDEBAR_INITIAL_WIDTH,
    minWidth: SIDEBAR_MIN_WIDTH,
    maxWidth: SIDEBAR_MAX_WIDTH,
    direction: 1,
  });

  const allExpanded = expandedModuleIds.length === modules.length;

  function toggleModule(moduleId: string) {
    setExpandedModuleIds((previous) =>
      previous.includes(moduleId) ? previous.filter((id) => id !== moduleId) : [...previous, moduleId],
    );
  }

  function toggleAllModules() {
    setExpandedModuleIds(allExpanded ? [] : modules.map((module) => module.id));
  }

  return (
    <aside
      id="course-sidebar"
      aria-label="Currículo do curso"
      style={{ "--sidebar-width": `${width}px` } as CSSProperties}
      className={cn(
        "fixed bottom-0 left-0 top-12 z-40 flex w-[248px] flex-col border-r border-line bg-surface transition-transform duration-200 xl:relative xl:top-0 xl:z-auto xl:w-(--sidebar-width) xl:shrink-0 xl:translate-x-0 xl:visible xl:transition-none",
        isOpen ? "visible translate-x-0" : "invisible -translate-x-full",
      )}
    >
      <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
        <FolderOpen size={16} aria-hidden="true" className="text-muted" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">Curso</p>
          <p className="font-mono text-[11px] text-muted">{countLessons(modules)} lições</p>
        </div>
      </div>

      <nav aria-label="Módulos" className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-2 py-3">
        <ul className="flex flex-col gap-1">
          {modules.map((module) => (
            <ModuleTreeItem
              key={module.id}
              module={module}
              completedCount={countModuleCompletedLessons(module, statuses)}
              isExpanded={expandedModuleIds.includes(module.id)}
              selectedLessonId={selectedLessonId}
              statuses={statuses}
              onToggle={() => toggleModule(module.id)}
              onSelectLesson={onSelectLesson}
            />
          ))}
        </ul>
      </nav>

      <CourseProgress
        completed={countCompletedLessons(modules, statuses)}
        total={countLessons(modules)}
        allExpanded={allExpanded}
        onToggleAll={toggleAllModules}
      />

      <ResizeHandle label="Redimensionar sidebar do curso" edge="right" separatorProps={separatorProps} />
    </aside>
  );
}
