import type { MouseEvent, ReactNode } from "react";
import type { GlossaryEntry } from "../../content/glossary";
import { useGlossary } from "../../hooks/useGlossary";
import type { MessageKey } from "../../i18n/messages/pt-BR";
import { useI18n } from "../../i18n/useI18n";
import { buildPath, type Route } from "../../lib/router";
import { cn } from "../../lib/utils";
import type { StepContent, StepTag } from "../../types/content";
import { Callout } from "../ui/Callout";
import { Tag } from "../ui/Tag";

const STEP_TAG_LABEL_KEY: Record<StepTag, MessageKey> = {
  context: "stepTag.context",
  mechanism: "stepTag.mechanism",
  example: "stepTag.example",
  code: "stepTag.code",
  tradeoff: "stepTag.tradeoff",
  check: "stepTag.check",
  summary: "stepTag.summary",
};

const GLOSSARY_TERM = /\[\[([^|\]]+)\|([^\]]+)\]\]/g;

interface StepNarrationProps {
  step: StepContent;
  stepIndex: number;
  stepCount: number;
  glossary?: readonly GlossaryEntry[];
  /** Navegação da SPA para os links de termo; sem ela, o link recarrega a página no destino. */
  onNavigate?: (route: Route) => void;
}

export function StepNarration({ step, stepIndex, stepCount, glossary: glossaryProp, onNavigate }: StepNarrationProps) {
  const { t } = useI18n();
  // O glossário vem sob demanda, só quando o passo marca algum termo (PERF-01.1). Até chegar, o termo
  // aparece como texto simples; depois vira o link.
  const hasTerms = step.body.some((paragraph) => paragraph.includes("[["));
  const loadedGlossary = useGlossary(glossaryProp === undefined && hasTerms);
  const glossary = glossaryProp ?? loadedGlossary ?? [];

  function renderParagraph(paragraph: string): ReactNode[] {
    const parts: ReactNode[] = [];
    let cursor = 0;
    for (const match of paragraph.matchAll(GLOSSARY_TERM)) {
      const [raw, term, id] = match;
      parts.push(paragraph.slice(cursor, match.index));
      cursor = match.index + raw.length;
      const entry = glossary.find((candidate) => candidate.id === id);
      if (!entry) {
        parts.push(term);
        continue;
      }
      // O termo leva à aula que o ensina, com a explicação curta do glossário no `title` (CNT-01.2).
      const route: Route = { name: "lesson", lessonId: entry.lesson, step: null };
      const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
        if (!onNavigate) return;
        event.preventDefault();
        onNavigate(route);
      };
      parts.push(
        <a
          key={`${match.index}-${id}`}
          href={buildPath(route)}
          title={entry.explanation}
          data-glossary={entry.id}
          onClick={handleClick}
          className="font-medium text-ink underline decoration-dotted underline-offset-2 hover:decoration-solid"
        >
          {term}
        </a>,
      );
    }
    parts.push(paragraph.slice(cursor));
    return parts;
  }

  return (
    // A chave remonta a narração a cada passo, para ela entrar deslizando (motion do 27abe4e).
    <div key={step.id} className="flex animate-step-in flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase leading-[14px] tracking-[1px] text-ink">
          {t("panel.position", { current: stepIndex + 1, total: stepCount })}
        </p>
        <Tag>{t(STEP_TAG_LABEL_KEY[step.tag])}</Tag>
      </div>

      {/*
       * O conteúdo é sempre PT (AD-003): em RTL ele fica isolado em LTR, para a pontuação não inverter
       * ("?Quem combina com quem"), como no preview 05. O cromo em volta segue o idioma.
       */}
      <div dir="ltr" className="flex flex-col gap-3">
        <h2 className="text-lg font-bold leading-[23px] text-ink">{step.title}</h2>
        {/* Como no preview 01: o primeiro parágrafo em ink, os seguintes em muted. */}
        {step.body.map((paragraph, index) => (
          <p key={paragraph} className={cn("text-[12.5px] leading-[1.6]", index === 0 ? "text-ink" : "text-muted")}>
            {renderParagraph(paragraph)}
          </p>
        ))}
      </div>

      {step.keyIdea && <KeyIdea>{step.keyIdea}</KeyIdea>}
    </div>
  );
}

export function KeyIdea({ children }: { children: ReactNode }) {
  const { t } = useI18n();

  return (
    <Callout title={t("panel.keyIdea")}>
      <p dir="ltr">{children}</p>
    </Callout>
  );
}
