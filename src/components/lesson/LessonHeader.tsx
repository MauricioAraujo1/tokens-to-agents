import { Clock, Gauge, ListOrdered } from "lucide-react";
import { Badge, type BadgeTone } from "../ui/Badge";
import type { CourseModule, Lesson, LessonDifficulty } from "../../types/course";

interface LessonHeaderProps {
  module: CourseModule;
  lesson: Lesson;
  lessonIndex: number;
}

const DIFFICULTY_TONE: Record<LessonDifficulty, BadgeTone> = {
  Iniciante: "green",
  Intermediário: "yellow",
  Avançado: "purple",
};

export function LessonHeader({ module, lesson, lessonIndex }: LessonHeaderProps) {
  return (
    <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 font-mono text-xs text-muted">
            <li>
              {module.number}. {module.title}
            </li>
            <li aria-hidden="true">/</li>
            <li>
              Aula {lessonIndex + 1} de {module.lessons.length}
            </li>
          </ol>
        </nav>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink md:text-[28px]">{lesson.title}</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">{lesson.description}</p>
      </div>

      <ul className="flex flex-wrap gap-2 md:shrink-0">
        <li>
          <Badge tone="blue">
            <Clock size={12} aria-hidden="true" />
            {lesson.duration} min
          </Badge>
        </li>
        <li>
          <Badge tone={DIFFICULTY_TONE[lesson.difficulty]}>
            <Gauge size={12} aria-hidden="true" />
            {lesson.difficulty}
          </Badge>
        </li>
        <li>
          <Badge>
            <ListOrdered size={12} aria-hidden="true" />
            {lesson.steps.length} passos
          </Badge>
        </li>
      </ul>
    </header>
  );
}
