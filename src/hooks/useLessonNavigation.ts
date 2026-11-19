import { useCallback, useEffect, useState } from "react";
import { prefersReducedMotion } from "../lib/utils";

export const STEP_DURATION_MS = 3500;

interface NavigationState {
  lessonId: string;
  stepIndex: number;
  isPlaying: boolean;
}

export interface LessonNavigation {
  stepIndex: number;
  stepCount: number;
  isPlaying: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
  next: () => void;
  previous: () => void;
  goTo: (stepIndex: number) => void;
  restart: () => void;
  togglePlay: () => void;
}

function clampStepIndex(stepIndex: number, stepCount: number): number {
  return Math.min(Math.max(stepIndex, 0), Math.max(stepCount - 1, 0));
}

function createInitialState(lessonId: string, stepIndex: number): NavigationState {
  return { lessonId, stepIndex, isPlaying: !prefersReducedMotion() };
}

export function useLessonNavigation(
  lessonId: string,
  stepCount: number,
  entryStepIndex = 0,
  isAutoplayEnabled = true,
): LessonNavigation {
  const entryIndex = clampStepIndex(entryStepIndex, stepCount);
  const [storedState, setStoredState] = useState<NavigationState>(() => createInitialState(lessonId, entryIndex));
  const state = storedState.lessonId === lessonId ? storedState : createInitialState(lessonId, entryIndex);
  const { stepIndex, isPlaying } = state;

  const update = useCallback(
    (transform: (current: NavigationState) => NavigationState) => {
      setStoredState((previous) =>
        transform(previous.lessonId === lessonId ? previous : createInitialState(lessonId, entryIndex)),
      );
    },
    [lessonId, entryIndex],
  );

  const goTo = useCallback(
    (targetIndex: number) => {
      update((current) => ({ ...current, stepIndex: clampStepIndex(targetIndex, stepCount) }));
    },
    [update, stepCount],
  );

  const next = useCallback(() => {
    update((current) => ({ ...current, stepIndex: clampStepIndex(current.stepIndex + 1, stepCount) }));
  }, [update, stepCount]);

  const previous = useCallback(() => {
    update((current) => ({ ...current, stepIndex: clampStepIndex(current.stepIndex - 1, stepCount) }));
  }, [update, stepCount]);

  const restart = useCallback(() => {
    update((current) => ({ ...current, stepIndex: 0, isPlaying: true }));
  }, [update]);

  const togglePlay = useCallback(() => {
    update((current) => ({ ...current, isPlaying: !current.isPlaying }));
  }, [update]);

  useEffect(() => {
    if (!isPlaying || !isAutoplayEnabled) {
      return;
    }

    const timer = window.setTimeout(() => {
      update((current) =>
        current.stepIndex >= stepCount - 1
          ? { ...current, isPlaying: false }
          : { ...current, stepIndex: current.stepIndex + 1 },
      );
    }, STEP_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [isPlaying, isAutoplayEnabled, stepIndex, stepCount, update]);

  return {
    stepIndex,
    stepCount,
    isPlaying,
    isFirstStep: stepIndex === 0,
    isLastStep: stepIndex >= stepCount - 1,
    next,
    previous,
    goTo,
    restart,
    togglePlay,
  };
}
