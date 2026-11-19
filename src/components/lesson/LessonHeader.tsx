import { Clock, ListOrdered, SignalMedium } from "lucide-react";
import { Badge } from "../ui/Badge";
import type { CourseModule, Lesson } from "../../types/course";

interface LessonHeaderProps {
  module: CourseModule;
  lesson: Lesson;
  lessonIndex: number;
}

export function LessonHeader({ module, lesson, lessonIndex }: LessonHeaderProps) {
  return (
    <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-2 text-xs leading-4 text-muted">
            <li>
              {module.number}. {module.title}
            </li>
            <li aria-hidden="true">/</li>
            <li>
              Lição {lessonIndex + 1} de {module.lessons.length}
            </li>
          </ol>
        </nav>
        <h1 className="text-2xl font-bold leading-tight text-ink md:text-[30px] md:leading-[39px]">{lesson.title}</h1>
        <p className="max-w-[480px] text-[13px] leading-[17px] text-muted">{lesson.description}</p>
      </div>

      <ul className="flex flex-wrap gap-1.5 md:shrink-0">
        <li>
          <Badge tone="brand">
            <Clock size={11} aria-hidden="true" />
            {lesson.duration} min
          </Badge>
        </li>
        <li>
          <Badge tone="success">
            <SignalMedium size={12} aria-hidden="true" />
            {lesson.difficulty}
          </Badge>
        </li>
        <li>
          <Badge tone="info">
            <ListOrdered size={11} aria-hidden="true" />
            {lesson.steps.length} passos
          </Badge>
        </li>
      </ul>
    </header>
  );
}
