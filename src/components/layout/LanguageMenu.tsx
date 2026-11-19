import { Check, ChevronDown, Globe } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CURRENT_LANGUAGE_CODE, INTERFACE_LANGUAGES } from "../../data/languages";
import { cn } from "../../lib/utils";

export function LanguageMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls="language-menu"
        aria-label={`Idioma da interface: ${CURRENT_LANGUAGE_CODE}`}
        onClick={() => setIsOpen((current) => !current)}
        className="flex h-[37px] items-center gap-1.5 rounded-md border border-line-strong bg-surface px-2.5 text-[13px] font-medium text-ink transition-colors hover:bg-sunken sm:px-3"
      >
        <Globe size={15} aria-hidden="true" />
        <span className="hidden sm:inline">{CURRENT_LANGUAGE_CODE}</span>
        <ChevronDown size={12} aria-hidden="true" className="hidden sm:block" />
      </button>

      {isOpen && (
        <div
          id="language-menu"
          role="dialog"
          aria-label="Idioma da interface"
          className="fixed inset-x-3 top-[64px] z-50 origin-top-right animate-pop-in max-h-[calc(100dvh-80px)] overflow-y-auto rounded-lg border-[1.5px] border-line-strong bg-surface p-4 shadow-press-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+8px)] sm:w-[560px]"
        >
          <p className="border-b border-line pb-3 text-[11px] font-semibold uppercase tracking-[1px] text-ink">
            Idioma da interface
          </p>
          <ul className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
            {INTERFACE_LANGUAGES.map((language) => {
              const isCurrent = language.code === CURRENT_LANGUAGE_CODE;

              return (
                <li key={language.code}>
                  <button
                    type="button"
                    disabled={!language.isAvailable}
                    aria-pressed={isCurrent}
                    title={language.isAvailable ? undefined : "Em breve"}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md border-[1.5px] px-2 py-1.5 text-left transition-colors",
                      isCurrent
                        ? "border-line-strong bg-brand-soft shadow-press"
                        : "border-transparent enabled:hover:bg-sunken disabled:cursor-not-allowed",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "grid size-7 shrink-0 place-items-center rounded-md border border-line-strong text-[9px] font-bold",
                        isCurrent ? "bg-brand text-on-brand" : "bg-surface text-ink",
                      )}
                    >
                      {isCurrent ? <Check size={13} strokeWidth={3} /> : language.code}
                    </span>
                    <span className={cn("min-w-0", !language.isAvailable && "opacity-60")}>
                      <span className="block truncate text-xs font-bold uppercase text-ink">{language.nativeName}</span>
                      <span className="block truncate text-[11px] text-muted">
                        {language.portugueseName}
                        {!language.isAvailable && " · em breve"}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-[10.5px] leading-[1.4] text-muted">
            As aulas estão em português. Em outros idiomas, a interface é traduzida e a aula mostra um aviso.
          </p>
        </div>
      )}
    </div>
  );
}
