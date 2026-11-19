import { useState, type CSSProperties } from "react";
import {
  countCompletedLessons,
  countLessons,
  countModuleCompletedLessons,
  type LessonStatusMap,
} from "../../lib/course";
import { useI18n } from "../../i18n/useI18n";
import { cn } from "../../lib/utils";
import type { ModuleMeta } from "../../types/content";
import { usePanelResize } from "../../hooks/usePanelResize";
import { CourseProgress } from "../course/CourseProgress";
import { ModuleTreeItem } from "../course/ModuleTreeItem";
import { ProgressMenu } from "../course/ProgressMenu";
import { ResizeHandle } from "./ResizeHandle";

const SIDEBAR_MIN_WIDTH = 240;
const SIDEBAR_MAX_WIDTH = 400;
const SIDEBAR_INITIAL_WIDTH = 290;

interface CourseSidebarProps {
  modules: ModuleMeta[];
  selectedLessonId: string;
  statuses: LessonStatusMap;
  isOpen: boolean;
  onSelectLesson: (lessonId: string) => void;
}

function findModuleIdByLesson(modules: ModuleMeta[], lessonId: string): string | undefined {
  return modules.find((module) => module.lessons.some((lesson) => lesson.id === lessonId))?.id;
}

export function CourseSidebar({ modules, selectedLessonId, statuses, isOpen, onSelectLesson }: CourseSidebarProps) {
  const { t } = useI18n();
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
      aria-label={t("sidebar.label")}
      style={{ "--sidebar-width": `${width}px` } as CSSProperties}
      className={cn(
        "fixed bottom-0 left-0 top-15 z-40 flex w-[290px] flex-col border-r border-line bg-surface transition-transform duration-200 print:hidden xl:relative xl:top-0 xl:z-auto xl:w-(--sidebar-width) xl:shrink-0 xl:translate-x-0 xl:visible xl:rounded-lg xl:border xl:transition-none",
        isOpen ? "visible translate-x-0" : "invisible -translate-x-full",
      )}
    >
      <div className="flex items-center justify-between gap-2 px-3.5 pb-2.5 pt-3.5">
        <p className="text-sm font-bold leading-[18px] text-ink">
          <span aria-hidden="true">■ </span>
          {t("sidebar.title")}
        </p>
        <p className="text-[11px] leading-[14px] text-muted">
          {t("sidebar.lessonCount", { count: countLessons(modules) })}
        </p>
      </div>

      <nav aria-label={t("sidebar.modules")} className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <ul className="flex flex-col gap-0.5">
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

      <ProgressMenu />

      <ResizeHandle label={t("sidebar.resize")}edge="right" separatorProps={separatorProps} />
    </aside>
  );
}
