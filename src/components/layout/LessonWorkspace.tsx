import type { LessonNavigation } from "../../hooks/useLessonNavigation";
import type { CourseModule, Lesson } from "../../types/course";
import { LessonCanvas } from "../lesson/LessonCanvas";
import { LessonHeader } from "../lesson/LessonHeader";
import { LessonStats } from "../lesson/LessonStats";
import { LessonTimeline } from "../lesson/LessonTimeline";

interface LessonWorkspaceProps {
  module: CourseModule;
  lesson: Lesson;
  lessonIndex: number;
  navigation: LessonNavigation;
}

export function LessonWorkspace({ module, lesson, lessonIndex, navigation }: LessonWorkspaceProps) {
  return (
    <section aria-label="Aula atual" className="flex min-w-0 flex-1 flex-col gap-4 p-4 xl:min-h-0 xl:overflow-y-auto xl:p-5">
      <LessonHeader module={module} lesson={lesson} lessonIndex={lessonIndex} />
      {lesson.stats && lesson.stats.length > 0 && <LessonStats stats={lesson.stats} />}
      <LessonCanvas lesson={lesson} navigation={navigation} />
      <LessonTimeline steps={lesson.steps} currentIndex={navigation.stepIndex} onSelectStep={navigation.goTo} />
    </section>
  );
}
