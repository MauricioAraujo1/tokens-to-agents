import { useCallback, useState } from "react";
import { AppHeader } from "../components/layout/AppHeader";
import { CourseSidebar } from "../components/layout/CourseSidebar";
import { LessonRightPanel } from "../components/layout/LessonRightPanel";
import { LessonWorkspace } from "../components/layout/LessonWorkspace";
import { SearchDialog } from "../components/layout/SearchDialog";
import { SectionPlaceholder } from "../components/layout/SectionPlaceholder";
import { courseModules, DEFAULT_LESSON_ID } from "../data/course";
import { APP_SECTIONS } from "../data/sections";
import { useAppShortcuts } from "../hooks/useAppShortcuts";
import { useCourseProgress } from "../hooks/useCourseProgress";
import { useLessonNavigation } from "../hooks/useLessonNavigation";
import { useTheme } from "../hooks/useTheme";
import { findLessonLocation, flattenLessons } from "../lib/course";
import type { AppSection } from "../types/app";

const lessonEntries = flattenLessons(courseModules);

export function App() {
  const [activeSection, setActiveSection] = useState<AppSection>("aprender");
  const [selectedLessonId, setSelectedLessonId] = useState(DEFAULT_LESSON_ID);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const { theme, toggleTheme } = useTheme();
  const { statuses, startLesson, completeLesson } = useCourseProgress(courseModules);

  const location = findLessonLocation(courseModules, selectedLessonId);
  const navigation = useLessonNavigation(selectedLessonId, location?.lesson.steps.length ?? 0);

  const openSearch = useCallback(() => setIsSearchOpen(true), []);
  const closeSearch = useCallback(() => setIsSearchOpen(false), []);
  const toggleSidebar = useCallback(() => setIsSidebarOpen((current) => !current), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  useAppShortcuts({
    isNavigationEnabled: !isSearchOpen && activeSection === "aprender",
    onPrevious: navigation.previous,
    onNext: navigation.next,
    onTogglePlay: navigation.togglePlay,
    onOpenSearch: openSearch,
  });

  const handleSelectLesson = useCallback(
    (lessonId: string) => {
      startLesson(lessonId);
      setSelectedLessonId(lessonId);
      setActiveSection("aprender");
      setIsSidebarOpen(false);
      setIsSearchOpen(false);
    },
    [startLesson],
  );

  const handleCompleteLesson = useCallback(() => {
    completeLesson(selectedLessonId);
  }, [completeLesson, selectedLessonId]);

  const activeSectionDefinition = APP_SECTIONS.find((section) => section.id === activeSection);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-canvas text-ink">
      <AppHeader
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenSearch={openSearch}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={toggleSidebar}
      />

      <div className="relative flex min-h-0 flex-1">
        <CourseSidebar
          modules={courseModules}
          selectedLessonId={selectedLessonId}
          statuses={statuses}
          isOpen={isSidebarOpen}
          onSelectLesson={handleSelectLesson}
        />

        {isSidebarOpen && (
          <button
            type="button"
            tabIndex={-1}
            aria-label="Fechar menu do curso"
            onClick={closeSidebar}
            className="fixed bottom-0 left-0 right-0 top-12 z-30 cursor-default bg-ink/25 xl:hidden"
          />
        )}

        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto xl:flex-row xl:overflow-hidden">
          {activeSection === "aprender" && location ? (
            <>
              <LessonWorkspace
                module={location.module}
                lesson={location.lesson}
                lessonIndex={location.lessonIndex}
                navigation={navigation}
              />
              <LessonRightPanel
                lesson={location.lesson}
                navigation={navigation}
                isLessonCompleted={statuses[location.lesson.id] === "completed"}
                onCompleteLesson={handleCompleteLesson}
              />
            </>
          ) : (
            activeSectionDefinition && (
              <SectionPlaceholder section={activeSectionDefinition} onNavigate={setActiveSection} />
            )
          )}
        </main>
      </div>

      {isSearchOpen && (
        <SearchDialog entries={lessonEntries} onSelectLesson={handleSelectLesson} onClose={closeSearch} />
      )}
    </div>
  );
}
