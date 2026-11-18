import { useCallback, useState } from "react";
import { createStatusMap, type LessonStatusMap } from "../lib/course";
import type { CourseModule } from "../types/course";

export interface CourseProgress {
  statuses: LessonStatusMap;
  startLesson: (lessonId: string) => void;
  completeLesson: (lessonId: string) => void;
}

export function useCourseProgress(modules: CourseModule[]): CourseProgress {
  const [statuses, setStatuses] = useState<LessonStatusMap>(() => createStatusMap(modules));

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

  return { statuses, startLesson, completeLesson };
}
