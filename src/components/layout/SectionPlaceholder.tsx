import { Construction } from "lucide-react";
import type { AppSectionDefinition } from "../../data/sections";
import { useI18n } from "../../i18n/useI18n";
import type { AppSection } from "../../types/app";
import { Button } from "../ui/Button";

interface SectionPlaceholderProps {
  section: AppSectionDefinition;
  onNavigate: (section: AppSection) => void;
}

export function SectionPlaceholder({ section, onNavigate }: SectionPlaceholderProps) {
  const { t } = useI18n();

  return (
    <section aria-labelledby="section-placeholder-title" className="scene-grid flex flex-1 items-center justify-center p-6">
      <div className="flex w-full max-w-md animate-rise flex-col items-center gap-4 rounded-lg border-[1.5px] border-line-strong bg-surface p-8 text-center shadow-press-lg">
        <span className="grid size-12 place-items-center rounded-full border-[1.5px] border-line-strong bg-brand-soft text-ink">
          <Construction size={22} aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">{t("placeholder.eyebrow")}</p>
          <h1 id="section-placeholder-title" className="text-2xl font-semibold tracking-tight text-ink">
            {t(section.labelKey)}
          </h1>
          <p className="text-sm leading-relaxed text-muted">{t(section.descriptionKey)}</p>
          <p className="text-sm leading-relaxed text-muted">{t("placeholder.body")}</p>
        </div>
        <Button variant="primary" onClick={() => onNavigate("aprender")}>
          {t("placeholder.back")}
        </Button>
      </div>
    </section>
  );
}
