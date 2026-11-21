import { useCallback, useState } from "react";
import { AppHeader } from "../components/layout/AppHeader";
import { CourseSidebar } from "../components/layout/CourseSidebar";
import { SearchDialog } from "../components/layout/SearchDialog";
import { StorageNotice } from "../components/layout/StorageNotice";
import { catalog } from "../content/catalog";
import { useAppShortcuts } from "../hooks/useAppShortcuts";
import { useCourseProgress } from "../hooks/useCourseProgress";
import { useRoute } from "../hooks/useRoute";
import { useTheme } from "../hooks/useTheme";
import { useI18n } from "../i18n/useI18n";
import type { Route } from "../lib/router";
import { cn } from "../lib/utils";
import { HomePage } from "../pages/HomePage";
import { LabPage } from "../pages/LabPage";
import { LessonPage } from "../pages/LessonPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { PracticePage } from "../pages/PracticePage";
import { SummariesPage } from "../pages/SummariesPage";
import type { AppSection } from "../types/app";

const SECTION_ROUTES: Record<AppSection, Route> = {
  aprender: { name: "home" },
  pratica: { name: "practice" },
  laboratorio: { name: "lab" },
  resumos: { name: "summaries" },
};

function sectionOf(route: Route): AppSection | null {
  switch (route.name) {
    case "home":
    case "lesson":
      return "aprender";
    case "practice":
      return "pratica";
    case "lab":
      return "laboratorio";
    case "summaries":
      return "resumos";
    case "not-found":
      return null;
  }
}

export function App() {
  const { route, navigate } = useRoute();
  const activeSection = sectionOf(route);
  // Na home nenhuma aula fica selecionada na árvore.
  const isLessonRoute = route.name === "lesson";
  const selectedLessonId = route.name === "lesson" ? route.lessonId : "";
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const { t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const { statuses, startLesson } = useCourseProgress(catalog);

  const openSearch = useCallback(() => setIsSearchOpen(true), []);
  const closeSearch = useCallback(() => setIsSearchOpen(false), []);
  const toggleSidebar = useCallback(() => setIsSidebarOpen((current) => !current), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  // Os atalhos de passo (←, →, Space, R) ficam na LessonPage.
  useAppShortcuts({ isNavigationEnabled: false, onOpenSearch: openSearch });

  // A URL reflete o passo (LES-01.10); trocar de passo substitui a entrada do histórico em vez de empilhar.
  const syncStepToUrl = useCallback(
    (step: number) => {
      if (route.name === "lesson" && route.step !== step) {
        navigate({ name: "lesson", lessonId: route.lessonId, step }, { replace: true });
      }
    },
    [route, navigate],
  );

  const handleSelectLesson = useCallback(
    (lessonId: string, step: number | null = null) => {
      startLesson(lessonId);
      navigate({ name: "lesson", lessonId, step });
      setIsSidebarOpen(false);
      setIsSearchOpen(false);
    },
    [startLesson, navigate],
  );

  const handleSectionChange = useCallback(
    (section: AppSection) => navigate(SECTION_ROUTES[section]),
    [navigate],
  );

  const navigateHome = useCallback(() => navigate({ name: "home" }), [navigate]);

  // "Próxima aula" (LES-01.5): uma aula entra como em andamento, igual a escolher pela árvore.
  const handleLessonNavigate = useCallback(
    (target: Route) =>
      target.name === "lesson" ? handleSelectLesson(target.lessonId, target.step) : navigate(target),
    [handleSelectLesson, navigate],
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-paper text-ink">
      <AppHeader
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenSearch={openSearch}
        hasCourseMenu={isLessonRoute}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={toggleSidebar}
      />

      {/* A trilha só existe na aula; as telas de seção ocupam a largura toda (previews 07–10). */}
      <div className={cn("relative flex min-h-0 flex-1", isLessonRoute && "xl:gap-4 xl:p-4")}>
        {isLessonRoute && (
          <CourseSidebar
            modules={catalog}
            selectedLessonId={selectedLessonId}
            statuses={statuses}
            isOpen={isSidebarOpen}
            onSelectLesson={handleSelectLesson}
          />
        )}

        {isLessonRoute && isSidebarOpen && (
          <button
            type="button"
            tabIndex={-1}
            aria-label={t("header.closeCourseMenu")}
            onClick={closeSidebar}
            className="fixed bottom-0 left-0 right-0 top-15 z-30 cursor-default bg-ink/25 xl:hidden"
          />
        )}

        {/* A calha da barra fica reservada: a barra que aparece e some não muda a largura da cena (00-04#1). */}
        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto [scrollbar-gutter:stable]">
          {route.name === "home" ? (
            <HomePage onNavigate={handleLessonNavigate} />
          ) : route.name === "lesson" ? (
            <LessonPage
              lessonId={route.lessonId}
              step={route.step}
              onStepChange={syncStepToUrl}
              onNavigate={handleLessonNavigate}
              shortcutsEnabled={!isSearchOpen}
            />
          ) : route.name === "practice" ? (
            <PracticePage moduleId={route.moduleId} onNavigate={handleLessonNavigate} />
          ) : route.name === "lab" ? (
            <LabPage playgroundId={route.playgroundId} projectId={route.projectId} onNavigate={handleLessonNavigate} />
          ) : route.name === "summaries" ? (
            <SummariesPage moduleId={route.moduleId} onNavigate={handleLessonNavigate} />
          ) : (
            <NotFoundPage onNavigateHome={navigateHome} />
          )}
        </main>
      </div>

      {isSearchOpen && (
        <SearchDialog onSelectLesson={handleSelectLesson} onClose={closeSearch} />
      )}

      <StorageNotice />
    </div>
  );
}
