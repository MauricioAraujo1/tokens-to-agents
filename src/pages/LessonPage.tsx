import { Component, useCallback, useEffect, useState, type ReactNode } from "react";
import { LessonRightPanel } from "../components/layout/LessonRightPanel";
import { LessonWorkspace, LessonWorkspaceMessage } from "../components/layout/LessonWorkspace";
import { LessonCanvas } from "../components/lesson/LessonCanvas";
import { LessonTimeline } from "../components/lesson/LessonTimeline";
import { MobileStepBar } from "../components/lesson/MobileStepBar";
import { ObjectivesChecklist } from "../components/lesson/ObjectivesChecklist";
import { Button } from "../components/ui/Button";
import { catalog } from "../content/catalog";
import { ContentNotFound, loadLesson } from "../content/registry";
import { useAppShortcuts } from "../hooks/useAppShortcuts";
import { useLessonNavigation } from "../hooks/useLessonNavigation";
import { useProgress } from "../hooks/useProgress";
import { useI18n } from "../i18n/useI18n";
import { findLessonLocation } from "../lib/course";
import { progressStore, type ProgressStore } from "../lib/progress/store";
import type { Route } from "../lib/router";
import type { LessonContent, LessonId } from "../types/content";

interface LessonPageProps {
  lessonId: string;
  /** `?step` da URL (1-based), ou `null` quando ausente ou inválido. */
  step: number | null;
  /** Recebe o passo atual para a URL; sem ele (rota "/"), a URL não muda. */
  onStepChange?: (step: number) => void;
  /** "Próxima aula", termos do glossário e conceitos relacionados. */
  onNavigate: (route: Route) => void;
  /** Falso com a busca aberta: as setas, Space e R ficam com o modal. */
  shortcutsEnabled: boolean;
  load?: (lessonId: string) => Promise<LessonContent>;
  store?: ProgressStore;
}

type LoadState =
  | { lessonId: string; attempt: number; status: "ready"; content: LessonContent }
  | { lessonId: string; attempt: number; status: "pending" | "error" };

interface BoundaryProps {
  fallback: (retry: () => void) => ReactNode;
  onRetry: () => void;
  children: ReactNode;
}

/** Erro ao renderizar a aula (conteúdo quebrado): mostra a mesma tela de "tentar de novo" da falha de import. */
class LessonErrorBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  retry = () => {
    this.setState({ failed: false });
    this.props.onRetry();
  };

  render() {
    return this.state.failed ? this.props.fallback(this.retry) : this.props.children;
  }
}

export function LessonPage({
  lessonId,
  step,
  onStepChange,
  onNavigate,
  shortcutsEnabled,
  load = loadLesson,
  store = progressStore,
}: LessonPageProps) {
  const { t } = useI18n();
  const progress = useProgress(store);
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<LoadState | null>(null);

  useEffect(() => {
    let isCurrent = true;
    load(lessonId).then(
      (content) => isCurrent && setLoaded({ lessonId, attempt, status: "ready", content }),
      // Aula sem arquivo de conteúdo = em preparação; outra falha (rede, deploy novo) = tentar de novo.
      (error: unknown) =>
        isCurrent && setLoaded({ lessonId, attempt, status: error instanceof ContentNotFound ? "pending" : "error" }),
    );
    return () => {
      isCurrent = false;
    };
  }, [lessonId, attempt, load]);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  const state = loaded?.lessonId === lessonId && loaded.attempt === attempt ? loaded : null;
  const lesson = state?.status === "ready" ? state.content : null;
  const navigation = useLessonNavigation(lessonId, lesson?.steps.length ?? 0, { initialStep: step, onStepChange });

  useAppShortcuts({
    isNavigationEnabled: shortcutsEnabled && lesson !== null,
    onPrevious: navigation.previous,
    onNext: navigation.next,
    onTogglePlay: navigation.togglePlay,
    onRestart: navigation.restart,
  });

  // Chegar ao último passo conclui a aula (PRG-01.1); concluir de novo não muda nada (PRG-01.2).
  const hasReachedLastStep = lesson !== null && navigation.isLastStep;
  useEffect(() => {
    if (hasReachedLastStep) store.completeLesson(lessonId as LessonId);
  }, [hasReachedLastStep, lessonId, store]);

  // Última aula aberta e o passo em que o aluno está: o "Continuar" da home leva até aqui (NAV-01.6).
  const isOpen = state !== null && state.status !== "error";
  const currentStep = navigation.stepIndex + 1;
  useEffect(() => {
    if (isOpen) store.setLastVisited(lessonId as LessonId, currentStep);
  }, [isOpen, lessonId, currentStep, store]);

  const location = findLessonLocation(catalog, lessonId);
  // Enquanto carrega, a página fica vazia: o cabeçalho e a cena entram juntos.
  if (!location || !state) return null;

  const errorMessage = (onRetry: () => void) => (
    <LessonWorkspaceMessage
      title={t("lessonPage.errorTitle")}
      body={t("lessonPage.errorBody")}
      action={
        <Button variant="primary" size="sm" className="mt-2" onClick={onRetry}>
          {t("lessonPage.retry")}
        </Button>
      }
    />
  );

  const workspace = (body: ReactNode, content: LessonContent | null, slots: { stage?: ReactNode; panel?: ReactNode } = {}) => (
    <LessonWorkspace
      module={location.module}
      meta={location.lesson}
      lessonIndex={location.lessonIndex}
      lesson={content}
      stage={slots.stage}
      panel={slots.panel}
    >
      {body}
    </LessonWorkspace>
  );

  if (state.status === "pending") {
    return workspace(<LessonWorkspaceMessage title={t("workspace.pendingTitle")} body={t("workspace.pendingBody")} />, null);
  }
  if (state.status === "error" || !lesson) {
    return workspace(errorMessage(retry), null);
  }

  return (
    <LessonErrorBoundary key={`${lessonId}:${attempt}`} onRetry={retry} fallback={(onRetry) => workspace(errorMessage(onRetry), null)}>
      {workspace(
        <>
          {/* A aula termina no stepper, como na versão publicada: sem o rodapé de exemplo, código, trade-offs,
              relacionados, referências e knowledge check (decisão do usuário, AD-011). */}
          <LessonTimeline steps={lesson.steps} currentIndex={navigation.stepIndex} onSelectStep={navigation.goTo} />
          <MobileStepBar
            navigation={navigation}
            nextStepTitle={lesson.steps[navigation.stepIndex + 1]?.shortTitle}
            onNavigate={onNavigate}
          />
        </>,
        lesson,
        {
          stage: <LessonCanvas steps={lesson.steps} navigation={navigation} />,
          panel: (
            <LessonRightPanel
              lesson={lesson}
              navigation={navigation}
              isLessonCompleted={progress.completed[lesson.id] === true}
              onNavigate={onNavigate}
            >
              {/* Na coluna da narração, abaixo dela, como no preview 01. */}
              <ObjectivesChecklist key={lessonId} lessonId={lesson.id} objectives={lesson.objectives} store={store} />
            </LessonRightPanel>
          ),
        },
      )}
    </LessonErrorBoundary>
  );
}
