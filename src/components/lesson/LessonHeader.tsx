import { Clock, ListOrdered, SignalMedium } from "lucide-react";
import type { MessageKey } from "../../i18n/messages/pt-BR";
import { useI18n } from "../../i18n/useI18n";
import { Badge } from "../ui/Badge";
import type { LessonContent, LessonMeta, Level, ModuleMeta } from "../../types/content";

interface LessonHeaderProps {
  module: ModuleMeta;
  meta: LessonMeta;
  lessonIndex: number;
  lesson: LessonContent | null;
}

const LEVEL_LABEL_KEY: Record<Level, MessageKey> = {
  beginner: "level.beginner",
  intermediate: "level.intermediate",
  advanced: "level.advanced",
};

export function LessonHeader({ module, meta, lessonIndex, lesson }: LessonHeaderProps) {
  const { t } = useI18n();

  return (
    <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        <nav aria-label={t("lesson.breadcrumb")}>
          <ol className="flex flex-wrap items-center gap-2 text-xs leading-4 text-muted">
            {/* Títulos e subtítulo são conteúdo em PT (AD-003): isolados em LTR dentro do RTL. */}
            <li>
              <bdi dir="ltr">
                {module.id}. {module.title}
              </bdi>
            </li>
            <li aria-hidden="true">/</li>
            <li>{t("lesson.position", { current: lessonIndex + 1, total: module.lessons.length })}</li>
          </ol>
        </nav>
        <h1 className="text-2xl font-bold leading-tight text-ink md:text-[30px] md:leading-[39px]">
          <bdi dir="ltr">{meta.title}</bdi>
        </h1>
        {lesson && (
          <p dir="ltr" className="max-w-[480px] text-[13px] leading-[17px] text-muted">
            {lesson.subtitle}
          </p>
        )}
      </div>

      <ul className="flex flex-wrap gap-1.5 md:shrink-0">
        <li>
          <Badge tone="brand">
            <Clock size={11} aria-hidden="true" />
            {t("lesson.duration", { minutes: meta.durationMin })}
          </Badge>
        </li>
        <li>
          <Badge tone="success">
            <SignalMedium size={12} aria-hidden="true" />
            {t(LEVEL_LABEL_KEY[meta.level])}
          </Badge>
        </li>
        {lesson && (
          <li>
            <Badge tone="info">
              <ListOrdered size={11} aria-hidden="true" />
              {t("lesson.stepCount", { count: lesson.steps.length })}
            </Badge>
          </li>
        )}
      </ul>
    </header>
  );
}
