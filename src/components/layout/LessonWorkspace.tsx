import type { LessonNavigation } from "../../hooks/useLessonNavigation";
import type { CourseModule, Lesson } from "../../types/course";
import { LessonCanvas } from "../lesson/LessonCanvas";
import { LessonHeader } from "../lesson/LessonHeader";
import { LessonTimeline } from "../lesson/LessonTimeline";

interface LessonWorkspaceProps {
  module: CourseModule;
  lesson: Lesson;
  lessonIndex: number;
  navigation: LessonNavigation;
}

export function LessonWorkspace({ module, lesson, lessonIndex, navigation }: LessonWorkspaceProps) {
  return (
    <section aria-label="Aula atual" className="flex min-w-0 flex-1 flex-col gap-3 xl:min-h-0 xl:overflow-y-auto">
      <div className="flex flex-1 flex-col gap-3.5 rounded-lg border border-line bg-surface px-4 pb-5 pt-[18px] md:px-5">
        <LessonHeader module={module} lesson={lesson} lessonIndex={lessonIndex} />
        <LessonCanvas lesson={lesson} navigation={navigation} />
      </div>
      <LessonTimeline steps={lesson.steps} currentIndex={navigation.stepIndex} onSelectStep={navigation.goTo} />
    </section>
  );
}
