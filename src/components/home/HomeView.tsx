import { ArrowRight, Download, Eraser, Upload } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";
import { GUIDED_PROJECTS } from "../../data/labs";
import {
  countCompletedLessons,
  countLessons,
  formatLessonCode,
  type LessonLocation,
  type LessonStatusMap,
} from "../../lib/course";
import type { CourseModule } from "../../types/course";
import { Button } from "../ui/Button";
import { ModuleCard } from "./ModuleCard";

interface HomeViewProps {
  modules: CourseModule[];
  statuses: LessonStatusMap;
  lastLesson: LessonLocation;
  lastStepIndex: number;
  onContinue: () => void;
  onOpenTrail: () => void;
  onOpenModule: (moduleId: string) => void;
  onOpenProjects: () => void;
  onExportProgress: () => void;
  onImportProgress: (raw: string) => boolean;
  onResetProgress: () => void;
}

type ImportFeedback = "imported" | "invalid" | "reset";

const IMPORT_FEEDBACK_TEXT: Record<ImportFeedback, string> = {
  imported: "Progresso importado.",
  invalid: "Arquivo inválido: o progresso não foi alterado.",
  reset: "Progresso zerado.",
};

const PROGRESS_ACTION_CLASS = "inline-flex items-center gap-1 font-medium text-ink underline-offset-2 hover:underline";

export function HomeView({
  modules,
  statuses,
  lastLesson,
  lastStepIndex,
  onContinue,
  onOpenTrail,
  onOpenModule,
  onOpenProjects,
  onExportProgress,
  onImportProgress,
  onResetProgress,
}: HomeViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<ImportFeedback>();
  const total = countLessons(modules);
  const completed = countCompletedLessons(modules, statuses);
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  const lastLessonCode = formatLessonCode(lastLesson.module, lastLesson.lessonIndex);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setFeedback(onImportProgress(await file.text()) ? "imported" : "invalid");
  }

  function handleReset() {
    onResetProgress();
    setFeedback("reset");
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-7 px-4 pb-7 pt-8 sm:px-10 sm:pt-9">
        <section aria-labelledby="home-title" className="flex flex-col gap-8 lg:flex-row lg:items-end">
          <div className="flex min-w-0 flex-1 flex-col gap-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-muted">
              Trilha gratuita de AI Engineering
            </p>
            <h1 id="home-title" className="text-[28px] font-bold leading-tight text-ink sm:text-[38px] sm:leading-[49px]">
              Dos tokens aos agentes em produção.
            </h1>
            <p className="max-w-[928px] text-sm leading-[1.6] text-muted">
              {total} aulas interativas em {modules.length} módulos: fundamentos, LLMs, RAG, agentes, MCP, avaliação e
              infraestrutura. Cada conceito é ensinado em passos, com uma cena que você pode pausar e repetir.
            </p>
            <div className="flex flex-wrap gap-2.5 pt-1.5">
              <Button variant="primary" size="lg" className="shadow-press-lg" onClick={onContinue}>
                Continuar: {lastLesson.lesson.title}
                <ArrowRight size={15} strokeWidth={2.5} aria-hidden="true" />
              </Button>
              <Button variant="secondary" size="lg" className="font-bold shadow-press-lg" onClick={onOpenTrail}>
                Ver a trilha completa
              </Button>
            </div>
          </div>

          <section
            aria-labelledby="home-progress-title"
            className="flex flex-col gap-3 rounded-lg border-[1.5px] border-line-strong bg-surface px-5 py-[18px] shadow-press-lg lg:w-[400px] lg:shrink-0"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 id="home-progress-title" className="text-[11px] font-semibold uppercase tracking-[1px] text-ink">
                Seu progresso
              </h2>
              <p className="text-xs font-bold text-ink">
                {completed} / {total} · {percentage}%
              </p>
            </div>
            <div
              role="progressbar"
              aria-label="Progresso geral"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={completed}
              className="h-2.5 overflow-hidden rounded-[5px] border border-line-strong bg-sunken"
            >
              <div className="h-full bg-brand" style={{ width: `${percentage}%` }} />
            </div>
            <p className="text-xs leading-4 text-muted">
              Última aula aberta: {lastLessonCode} {lastLesson.lesson.title} · passo {lastStepIndex + 1} de{" "}
              {lastLesson.lesson.steps.length}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] leading-[14px]">
              <span className="text-ink">Salvo só neste navegador.</span>
              <button type="button" className={PROGRESS_ACTION_CLASS} onClick={onExportProgress}>
                <Download size={12} aria-hidden="true" />
                Exportar
              </button>
              <button type="button" className={PROGRESS_ACTION_CLASS} onClick={() => fileInputRef.current?.click()}>
                <Upload size={12} aria-hidden="true" />
                Importar
              </button>
              <button type="button" className={PROGRESS_ACTION_CLASS} onClick={handleReset}>
                <Eraser size={12} aria-hidden="true" />
                Zerar
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                aria-label="Arquivo de progresso"
                className="sr-only"
                tabIndex={-1}
                onChange={handleFileChange}
              />
            </div>
            <p role="status" className="min-h-[14px] text-[11px] leading-[14px] text-muted">
              {feedback && IMPORT_FEEDBACK_TEXT[feedback]}
            </p>
          </section>
        </section>

        <section aria-labelledby="home-modules-title" className="flex flex-col gap-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="home-modules-title" className="text-xs font-bold uppercase tracking-[1.2px] text-ink">
              {modules.length} módulos
            </h2>
            <p className="whitespace-pre text-[11px] text-muted">● concluído   ◐ em andamento   ○ não iniciado</p>
          </div>

          <ul className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {modules.map((module) => (
              <li key={module.id}>
                <ModuleCard
                  module={module}
                  statuses={statuses}
                  isCurrent={module.id === lastLesson.module.id}
                  onOpen={() => onOpenModule(module.id)}
                />
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="home-projects-title" className="flex flex-wrap items-center gap-2.5">
          <h2 id="home-projects-title" className="text-xs font-bold uppercase tracking-[1.2px] text-ink">
            {GUIDED_PROJECTS.length} projetos →
          </h2>
          <ul className="flex flex-wrap gap-2.5">
            {GUIDED_PROJECTS.map((project) => (
              <li key={project.number}>
                <button
                  type="button"
                  onClick={onOpenProjects}
                  className="rounded-[14px] border border-line-strong bg-surface px-3 py-[7px] text-xs font-medium text-ink transition-colors hover:bg-sunken"
                >
                  {project.number} {project.title}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <footer className="whitespace-pre-wrap text-[10.5px] text-subtle">
          Inspirado em designed-to-scale  ·  código MIT  ·  conteúdo CC BY-SA 4.0  ·  sem login, sem cookies
        </footer>
      </div>
    </div>
  );
}
