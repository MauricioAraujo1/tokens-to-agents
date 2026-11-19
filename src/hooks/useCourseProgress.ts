import { useCallback, useMemo, useState } from "react";
import { createStatusMap, type LessonStatusMap } from "../lib/course";
import { progressStore, type ProgressStore } from "../lib/progress/store";
import type { LessonId, ModuleMeta } from "../types/content";
import { useProgress } from "./useProgress";

export interface CourseProgress {
  statuses: LessonStatusMap;
  startLesson: (lessonId: string) => void;
  completeLesson: (lessonId: string) => void;
}

/** Fachada do `ProgressStore` com a API antiga; "em andamento" vale só para a sessão. */
export function useCourseProgress(modules: ModuleMeta[], store: ProgressStore = progressStore): CourseProgress {
  const { completed } = useProgress(store);
  const [started, setStarted] = useState<ReadonlySet<string>>(() => new Set());

  const statuses = useMemo(() => {
    const map = createStatusMap(modules);
    for (const id of Object.keys(map)) {
      if (completed[id as LessonId]) map[id] = "completed";
      else if (started.has(id)) map[id] = "in-progress";
    }
    return map;
  }, [modules, completed, started]);

  const startLesson = useCallback((lessonId: string) => {
    setStarted((previous) => (previous.has(lessonId) ? previous : new Set(previous).add(lessonId)));
  }, []);

  const completeLesson = useCallback((lessonId: string) => store.completeLesson(lessonId as LessonId), [store]);

  return { statuses, startLesson, completeLesson };
}
