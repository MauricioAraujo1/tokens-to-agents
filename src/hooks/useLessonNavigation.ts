import { useCallback, useEffect, useState } from "react";
import { catalog } from "../content/catalog";
import { flattenLessons } from "../lib/course";
import { resolveStep, type Route } from "../lib/router";
import { prefersReducedMotion } from "../lib/utils";
import type { ModuleMeta } from "../types/content";

interface NavigationState {
  lessonId: string;
  /** `null` até o aluno mudar de passo: vale o passo pedido pela URL. */
  stepIndex: number | null;
  isPlaying: boolean;
  replayCount: number;
}

export interface LessonNavigationOptions {
  /** Passo pedido pela URL (`?step`, 1-based); fora de 1..N abre o passo 1 (LES-01.11). */
  initialStep?: number | null;
  /** Chamado com o passo atual (1-based) para a URL refletir o passo (LES-01.10). */
  onStepChange?: (step: number) => void;
  modules?: ModuleMeta[];
}

export interface LessonNavigation {
  stepIndex: number;
  stepCount: number;
  /** A animação do passo está rodando. Avançar de passo é sempre manual. */
  isPlaying: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
  /** Muda a cada `restart`; a cena usa como `key` para repetir a animação do passo. */
  replayCount: number;
  /** Destino do "Próxima aula": a aula seguinte do catálogo ou, depois da última, o Laboratório. */
  nextLesson: Route;
  next: () => void;
  previous: () => void;
  goTo: (stepIndex: number) => void;
  restart: () => void;
  togglePlay: () => void;
}

function createInitialState(lessonId: string): NavigationState {
  return { lessonId, stepIndex: null, isPlaying: !prefersReducedMotion(), replayCount: 0 };
}

function clampStepIndex(stepIndex: number, stepCount: number): number {
  return Math.min(Math.max(stepIndex, 0), Math.max(stepCount - 1, 0));
}

function nextLessonRoute(modules: ModuleMeta[], lessonId: string): Route {
  const lessons = flattenLessons(modules);
  const index = lessons.findIndex(({ lesson }) => lesson.id === lessonId);
  const next = index >= 0 ? lessons[index + 1] : undefined;
  // Depois da última aula da trilha (17.14), o próximo passo são os projetos do Laboratório.
  return next ? { name: "lesson", lessonId: next.lesson.id, step: null } : { name: "lab" };
}

export function useLessonNavigation(
  lessonId: string,
  stepCount: number,
  { initialStep = null, onStepChange, modules = catalog }: LessonNavigationOptions = {},
): LessonNavigation {
  const [storedState, setStoredState] = useState<NavigationState>(() => createInitialState(lessonId));
  const state = storedState.lessonId === lessonId ? storedState : createInitialState(lessonId);
  const { isPlaying, replayCount } = state;
  const stepIndex = state.stepIndex ?? resolveStep(initialStep, stepCount) - 1;

  const update = useCallback(
    (transform: (current: NavigationState) => NavigationState) => {
      setStoredState((previous) =>
        transform(previous.lessonId === lessonId ? previous : createInitialState(lessonId)),
      );
    },
    [lessonId],
  );

  const moveTo = useCallback(
    (target: (current: number) => number) => {
      update((current) => {
        const from = current.stepIndex ?? resolveStep(initialStep, stepCount) - 1;
        return { ...current, stepIndex: clampStepIndex(target(from), stepCount) };
      });
    },
    [update, initialStep, stepCount],
  );

  const goTo = useCallback((targetIndex: number) => moveTo(() => targetIndex), [moveTo]);
  const next = useCallback(() => moveTo((current) => current + 1), [moveTo]);
  const previous = useCallback(() => moveTo((current) => current - 1), [moveTo]);

  const restart = useCallback(() => {
    update((current) => ({ ...current, isPlaying: true, replayCount: current.replayCount + 1 }));
  }, [update]);

  const togglePlay = useCallback(() => {
    update((current) => ({ ...current, isPlaying: !current.isPlaying }));
  }, [update]);

  // Sem passos (aula carregando ou sem conteúdo), a URL fica como está.
  useEffect(() => {
    if (stepCount > 0) onStepChange?.(stepIndex + 1);
  }, [stepIndex, stepCount, onStepChange]);

  return {
    stepIndex,
    stepCount,
    isPlaying,
    isFirstStep: stepIndex === 0,
    isLastStep: stepIndex >= stepCount - 1,
    replayCount,
    nextLesson: nextLessonRoute(modules, lessonId),
    next,
    previous,
    goTo,
    restart,
    togglePlay,
  };
}
