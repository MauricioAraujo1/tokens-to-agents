import { SearchX } from "lucide-react";
import type { MouseEvent } from "react";
import { useI18n } from "../i18n/useI18n";
import { buildPath } from "../lib/router";

interface NotFoundPageProps {
  onNavigateHome: () => void;
}

const HOME_PATH = buildPath({ name: "home" });

export function NotFoundPage({ onNavigateHome }: NotFoundPageProps) {
  const { t } = useI18n();
  // Clique simples navega pelo router; Ctrl/Cmd/Shift/botão do meio seguem o comportamento nativo do link.
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    onNavigateHome();
  };

  return (
    <section aria-labelledby="not-found-title" className="scene-grid flex flex-1 items-center justify-center p-6">
      <div className="flex w-full max-w-md animate-rise flex-col items-center gap-4 rounded-lg border-[1.5px] border-line-strong bg-surface p-8 text-center shadow-press-lg">
        <span className="grid size-12 place-items-center rounded-full border-[1.5px] border-line-strong bg-brand-soft text-ink">
          <SearchX size={22} aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-muted">{t("notFound.eyebrow")}</p>
          <h1 id="not-found-title" className="text-2xl font-bold leading-[31px] text-ink">
            {t("notFound.title")}
          </h1>
          <p className="text-[13px] leading-[1.6] text-muted">{t("notFound.body")}</p>
        </div>
        {/* Link de verdade (não <Button>): a home tem URL própria e pode abrir em outra aba. */}
        <a
          href={HOME_PATH}
          onClick={handleClick}
          className="inline-flex items-center justify-center gap-1.5 rounded-md border-[1.5px] border-line-strong bg-brand px-3.5 py-2.5 text-[13px] font-bold leading-[18px] text-on-brand shadow-press transition-[filter,transform,box-shadow] hover:brightness-95 active:translate-x-px active:translate-y-px active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-line-strong"
        >
          {t("notFound.home")}
        </a>
      </div>
    </section>
  );
}
