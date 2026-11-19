import type { LessonNavigation } from "../../hooks/useLessonNavigation";
import { MOBILE_QUERY, useMediaQuery } from "../../hooks/useMediaQuery";
import { useI18n } from "../../i18n/useI18n";
import type { Route } from "../../lib/router";
import { cn } from "../../lib/utils";
import { StepNavigation } from "./StepNavigation";

/** Abaixo de 768 px (o `md` do Tailwind), a navegação de passos vira barra fixa no rodapé (RSP-01.3). */
export { MOBILE_QUERY };

interface MobileStepBarProps {
  navigation: LessonNavigation;
  nextStepTitle?: string;
  onNavigate: (route: Route) => void;
}

/**
 * Barra do celular: pontos de passo e Voltar/Próximo fixos no rodapé.
 * Só existe abaixo de 768 px; acima disso a navegação fica no painel de narração.
 */
export function MobileStepBar({ navigation, nextStepTitle, onNavigate }: MobileStepBarProps) {
  const { t } = useI18n();
  const isMobile = useMediaQuery(MOBILE_QUERY);

  if (!isMobile) return null;

  const position = t("timeline.position", { current: navigation.stepIndex + 1, total: navigation.stepCount });

  return (
    <>
      {/* Reserva o espaço da barra no fim da página, para ela não cobrir o conteúdo. */}
      <div aria-hidden="true" className="h-32 shrink-0" />
      <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-3 border-t-[1.5px] border-line-strong bg-surface px-4 pb-4 pt-3">
        <ol aria-label={position} className="flex justify-center gap-1.5">
          {Array.from({ length: navigation.stepCount }, (_, index) => {
            const state = index === navigation.stepIndex ? "current" : index < navigation.stepIndex ? "done" : "upcoming";
            return (
              <li
                key={index}
                data-state={state}
                aria-current={state === "current" ? "step" : undefined}
                className={cn(
                  "h-1.5 w-6 rounded-full border",
                  state === "done" && "border-success bg-success",
                  state === "current" && "border-line-strong bg-brand",
                  state === "upcoming" && "border-line bg-sunken",
                )}
              />
            );
          })}
        </ol>
        <StepNavigation compact navigation={navigation} nextStepTitle={nextStepTitle} onNavigate={onNavigate} />
      </div>
    </>
  );
}
