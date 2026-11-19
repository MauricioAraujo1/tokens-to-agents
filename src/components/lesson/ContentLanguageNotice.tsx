import { Info } from "lucide-react";
import { useI18n } from "../../i18n/useI18n";

/** As aulas só existem em PT-BR (AD-003): fora do PT, a aula avisa no idioma da interface (I18N-01.5). */
export function ContentLanguageNotice() {
  const { t, locale } = useI18n();
  if (locale === "pt-BR") return null;

  return (
    <p
      role="note"
      className="flex items-start gap-2 rounded-md border border-info bg-info-soft px-3.5 py-2.5 text-xs leading-relaxed text-ink"
    >
      <Info size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-info" />
      {t("contentNotice.message")}
    </p>
  );
}
