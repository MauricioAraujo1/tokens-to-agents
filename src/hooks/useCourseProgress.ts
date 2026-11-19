import { useCallback, useEffect, useMemo, useState } from "react";
import { createStatusMap, type LessonStatusMap } from "../lib/course";
import { createEmptyProgress, parseProgress, readStoredProgress, serializeProgress, writeStoredProgress } from "../lib/progress";
import type { CourseModule } from "../types/course";

export interface CourseProgress {
  statuses: LessonStatusMap;
  startLesson: (lessonId: string) => void;
  completeLesson: (lessonId: string) => void;
  resetProgress: () => void;
  exportProgress: () => string;
  importProgress: (raw: string) => boolean;
}

export function useCourseProgress(modules: CourseModule[]): CourseProgress {
  const baseStatuses = useMemo(() => createStatusMap(modules), [modules]);
  const [statuses, setStatuses] = useState<LessonStatusMap>(() => readStoredProgress(baseStatuses));

  useEffect(() => {
    writeStoredProgress(statuses);
  }, [statuses]);

  const startLesson = useCallback((lessonId: string) => {
    setStatuses((previous) =>
      previous[lessonId] === "not-started" ? { ...previous, [lessonId]: "in-progress" } : previous,
    );
  }, []);

  const completeLesson = useCallback((lessonId: string) => {
    setStatuses((previous) =>
      previous[lessonId] === "completed" ? previous : { ...previous, [lessonId]: "completed" },
    );
  }, []);

  const resetProgress = useCallback(() => {
    setStatuses(createEmptyProgress(baseStatuses));
  }, [baseStatuses]);

  const exportProgress = useCallback(() => serializeProgress(statuses), [statuses]);

  const importProgress = useCallback(
    (raw: string) => {
      const imported = parseProgress(raw, createEmptyProgress(baseStatuses));

      if (!imported) {
        return false;
      }

      setStatuses(imported);
      return true;
    },
    [baseStatuses],
  );

  return { statuses, startLesson, completeLesson, resetProgress, exportProgress, importProgress };
}
