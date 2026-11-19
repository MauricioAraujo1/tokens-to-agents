import { useCallback, useState } from "react";
import { HomeView } from "../components/home/HomeView";
import { LabView } from "../components/lab/LabView";
import { AppHeader } from "../components/layout/AppHeader";
import { CourseSidebar } from "../components/layout/CourseSidebar";
import { LessonRightPanel } from "../components/layout/LessonRightPanel";
import { LessonWorkspace } from "../components/layout/LessonWorkspace";
import { SearchDialog } from "../components/layout/SearchDialog";
import { PracticeView } from "../components/practice/PracticeView";
import { SummariesView } from "../components/summaries/SummariesView";
import { courseModules, DEFAULT_LESSON_ID } from "../data/course";
import { useAppShortcuts } from "../hooks/useAppShortcuts";
import { useCourseProgress } from "../hooks/useCourseProgress";
import { useLessonNavigation } from "../hooks/useLessonNavigation";
import { useTheme } from "../hooks/useTheme";
import { findLessonLocation, findResumeLessonId, flattenLessons } from "../lib/course";
import { PROGRESS_EXPORT_FILE_NAME } from "../lib/progress";
import { downloadTextFile } from "../lib/utils";
import type { AppSection, LearnView } from "../types/app";
import type { QuizReview } from "../types/practice";

const lessonEntries = flattenLessons(courseModules);

function findLesson(lessonId: string) {
  return findLessonLocation(courseModules, lessonId);
}

export function App() {
  const [activeSection, setActiveSection] = useState<AppSection>("aprender");
  const [learnView, setLearnView] = useState<LearnView>("home");
  const [selectedLessonId, setSelectedLessonId] = useState(DEFAULT_LESSON_ID);
  const [entryStepIndex, setEntryStepIndex] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const { theme, toggleTheme } = useTheme();
  const { statuses, startLesson, completeLesson, resetProgress, exportProgress, importProgress } =
    useCourseProgress(courseModules);

  const location = findLesson(selectedLessonId);
  const isLessonView = activeSection === "aprender" && learnView === "lesson";
  const navigation = useLessonNavigation(
    selectedLessonId,
    location?.lesson.steps.length ?? 0,
    entryStepIndex,
    isLessonView,
  );

  const openSearch = useCallback(() => setIsSearchOpen(true), []);
  const closeSearch = useCallback(() => setIsSearchOpen(false), []);
  const toggleSidebar = useCallback(() => setIsSidebarOpen((current) => !current), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  useAppShortcuts({
    isNavigationEnabled: !isSearchOpen && isLessonView,
    onPrevious: navigation.previous,
    onNext: navigation.next,
    onTogglePlay: navigation.togglePlay,
    onRestart: navigation.restart,
    onOpenSearch: openSearch,
  });

  const openLesson = useCallback(
    (lessonId: string, stepIndex = 0) => {
      startLesson(lessonId);
      setSelectedLessonId(lessonId);
      setEntryStepIndex(stepIndex);
      setActiveSection("aprender");
      setLearnView("lesson");
      setIsSidebarOpen(false);
      setIsSearchOpen(false);
    },
    [startLesson],
  );

  const handleSelectLesson = useCallback((lessonId: string) => openLesson(lessonId), [openLesson]);

  function handleReview(review: QuizReview) {
    openLesson(review.lessonId, review.stepIndex);

    if (review.lessonId === selectedLessonId) {
      navigation.goTo(review.stepIndex);
    }
  }

  function handleOpenModule(moduleId: string) {
    const module = courseModules.find((candidate) => candidate.id === moduleId);
    const lessonId = module && findResumeLessonId(module, statuses);

    if (lessonId) {
      openLesson(lessonId);
    }
  }

  function handleOpenHome() {
    setActiveSection("aprender");
    setLearnView("home");
    setIsSidebarOpen(false);
  }

  function handleContinue() {
    startLesson(selectedLessonId);
    setLearnView("lesson");
  }

  function handleOpenTrail() {
    handleContinue();
    setIsSidebarOpen(true);
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-paper text-ink">
      <AppHeader
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onOpenHome={handleOpenHome}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenSearch={openSearch}
        hasCourseMenu={isLessonView}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={toggleSidebar}
      />

      <div className="relative flex min-h-0 flex-1">
        {activeSection === "aprender" && learnView === "home" && location && (
          <HomeView
            modules={courseModules}
            statuses={statuses}
            lastLesson={location}
            lastStepIndex={navigation.stepIndex}
            onContinue={handleContinue}
            onOpenTrail={handleOpenTrail}
            onOpenModule={handleOpenModule}
            onOpenProjects={() => setActiveSection("laboratorio")}
            onExportProgress={() => downloadTextFile(PROGRESS_EXPORT_FILE_NAME, exportProgress())}
            onImportProgress={importProgress}
            onResetProgress={resetProgress}
          />
        )}

        {isLessonView && location && (
          <div className="flex min-h-0 flex-1 gap-4 overflow-y-auto p-3 sm:p-4 xl:overflow-hidden">
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
                className="fixed bottom-0 left-0 right-0 top-[60px] z-30 cursor-default bg-ink/25 xl:hidden"
              />
            )}

            <main className="flex min-w-0 flex-1 flex-col gap-4 xl:flex-row xl:overflow-hidden">
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
                onCompleteLesson={() => completeLesson(selectedLessonId)}
              />
            </main>
          </div>
        )}

        {activeSection === "pratica" && (
          <PracticeView modules={courseModules} findLesson={findLesson} onReview={handleReview} />
        )}

        {activeSection === "laboratorio" && <LabView findLesson={findLesson} />}

        {activeSection === "resumos" && (
          <SummariesView modules={courseModules} findLesson={findLesson} onOpenLesson={handleSelectLesson} />
        )}
      </div>

      {isSearchOpen && (
        <SearchDialog entries={lessonEntries} onSelectLesson={handleSelectLesson} onClose={closeSearch} />
      )}
    </div>
  );
}
