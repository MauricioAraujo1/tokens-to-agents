import type { ReactNode } from "react";
import { useI18n } from "../../i18n/useI18n";
import { cn } from "../../lib/utils";
import type { LessonContent, LessonMeta, ModuleMeta } from "../../types/content";
import { ContentLanguageNotice } from "../lesson/ContentLanguageNotice";
import { LessonHeader } from "../lesson/LessonHeader";

interface LessonWorkspaceProps {
  module: ModuleMeta;
  meta: LessonMeta;
  lessonIndex: number;
  /** `null` quando a aula do catálogo ainda não tem arquivo de conteúdo (ou não carregou). */
  lesson: LessonContent | null;
  /** Cena da aula, logo abaixo do cabeçalho. */
  stage?: ReactNode;
  /** Painel de narração: coluna à direita a partir de 768 px, abaixo da cena no celular. */
  panel?: ReactNode;
  /** Resto da aula (stepper, checklist e rodapé), ou o estado de preparação ou erro. */
  children: ReactNode;
}

/**
 * Layout da aula (RSP-01). A árvore fica fora daqui: é coluna a partir de 1280 px e gaveta abaixo disso.
 * - Abaixo de 768 px: uma coluna, na ordem cabeçalho, cena, narração e resto (RSP-01.3).
 * - A partir de 768 px: cena e narração lado a lado; a narração fica fixa enquanto a coluna da cena rola (RSP-01.2).
 * Todas as áreas têm `min-w-0`, para nada empurrar a página para os lados (RSP-01.5).
 *
 * Visual (previews 01 e 06): a partir de 768 px, cabeçalho e cena formam um só cartão (metade de cima e
 * metade de baixo); no celular as áreas ocupam a largura toda, separadas por linhas.
 */
export function LessonWorkspace({ module, meta, lessonIndex, lesson, stage, panel, children }: LessonWorkspaceProps) {
  const { t } = useI18n();

  return (
    <section
      aria-label={t("workspace.label")}
      className="flex min-w-0 flex-1 flex-col md:grid md:grid-cols-[minmax(0,1fr)_auto] md:grid-rows-[auto_auto_1fr] md:gap-x-4 md:p-4 xl:p-0"
    >
      <div
        data-area="header"
        className={cn(
          "flex min-w-0 flex-col gap-4 border-b border-line px-4 py-4 md:col-start-1 md:row-start-1 md:rounded-t-lg md:border md:bg-surface md:px-5 md:pt-[18px]",
          stage ? "md:border-b-0 md:pb-3.5" : "md:rounded-b-lg md:pb-5",
        )}
      >
        <ContentLanguageNotice />
        <LessonHeader module={module} meta={meta} lessonIndex={lessonIndex} lesson={lesson} />
      </div>

      {stage && (
        <div
          data-area="stage"
          className="flex min-w-0 flex-col border-b border-line bg-surface px-4 py-4 md:col-start-1 md:row-start-2 md:rounded-b-lg md:border md:border-t-0 md:px-5 md:pb-5 md:pt-0"
        >
          {stage}
        </div>
      )}

      {panel && (
        <div
          data-area="panel"
          className="min-w-0 md:sticky md:top-0 md:col-start-2 md:row-span-3 md:row-start-1 md:h-[calc(100dvh-60px-2rem)] md:self-start"
        >
          {panel}
        </div>
      )}

      <div data-area="body" className="flex min-w-0 flex-1 flex-col gap-4 px-4 py-4 md:col-start-1 md:row-start-3 md:px-0 md:pb-0">
        {children}
      </div>
    </section>
  );
}

/** Caixa de estado no lugar do corpo da aula: em preparação ou erro de carregamento. */
export function LessonWorkspaceMessage({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="scene-grid grid flex-1 place-items-center rounded-lg border border-line p-6 text-center">
      <div className="flex max-w-md flex-col items-center gap-2">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="text-sm leading-relaxed text-muted">{body}</p>
        {action}
      </div>
    </div>
  );
}
