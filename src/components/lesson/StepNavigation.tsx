import { ArrowLeft, ArrowRight } from "lucide-react";
import type { LessonNavigation } from "../../hooks/useLessonNavigation";
import { useI18n } from "../../i18n/useI18n";
import type { Route } from "../../lib/router";
import { cn } from "../../lib/utils";
import { Button } from "../ui/Button";

interface StepNavigationProps {
  navigation: LessonNavigation;
  nextStepTitle?: string;
  /** No último passo, o "Próxima aula" leva a `navigation.nextLesson` (LES-01.5). */
  onNavigate: (route: Route) => void;
  /** Barra do celular (RSP-01.3): Voltar só com o ícone (o nome segue acessível) e sem as dicas de teclado. */
  compact?: boolean;
}

export function StepNavigation({ navigation, nextStepTitle, onNavigate, compact = false }: StepNavigationProps) {
  const { t } = useI18n();
  const nextLabel = t("stepNav.next", { title: nextStepTitle ?? "" });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-[50px] gap-2">
        <Button
          variant="secondary"
          className={cn("h-full", compact && "w-[50px] px-0")}
          onClick={navigation.previous}
          disabled={navigation.isFirstStep}
        >
          <ArrowLeft size={14} aria-hidden="true" className="rtl:-scale-x-100" />
          <span className={cn(compact && "sr-only")}>{t("stepNav.previous")}</span>
        </Button>

        {navigation.isLastStep ? (
          <Button variant="primary" className="h-full min-w-0 flex-1" onClick={() => onNavigate(navigation.nextLesson)}>
            <span className="truncate">{t("stepNav.nextLesson")}</span>
            <ArrowRight size={16} strokeWidth={2.5} aria-hidden="true" className="rtl:-scale-x-100" />
          </Button>
        ) : (
          <Button
            variant="primary"
            className="h-full min-w-0 flex-1 justify-between px-3.5 py-2"
            aria-label={nextLabel}
            onClick={navigation.next}
          >
            {compact ? (
              <span className="min-w-0 flex-1 truncate text-start">{nextLabel}</span>
            ) : (
              <span className="flex min-w-0 flex-1 flex-col items-start text-start">
                <span className="text-[11px] font-normal leading-[14px]">{t("stepNav.nextCaption")}</span>
                <span className="max-w-full truncate text-[13px] font-bold leading-[17px]">{nextStepTitle}</span>
              </span>
            )}
            <ArrowRight size={16} strokeWidth={2.5} aria-hidden="true" className="shrink-0 rtl:-scale-x-100" />
          </Button>
        )}
      </div>

      {!compact && (
        <p className="whitespace-pre-wrap text-[10px] leading-[13px] text-muted">
          {`[←] [→] ${t("stepNav.navigateHint")}  ·  [R] ${t("stepNav.replayHint")}  ·  [Space] ${t("stepNav.pauseHint")}`}
        </p>
      )}
    </div>
  );
}
