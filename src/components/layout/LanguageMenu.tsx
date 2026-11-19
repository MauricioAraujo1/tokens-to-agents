import { Check, ChevronDown, Globe } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { getLocale, LOCALES, type LocaleTag } from "../../i18n/locales";
import { useI18n } from "../../i18n/useI18n";
import { cn } from "../../lib/utils";

// Coluna da esquerda: escrita latina (EN…VI); da direita: as outras escritas (EL…HE), como no print de referência.
const LEFT_COLUMN_SIZE = 11;
const COLUMNS = [LOCALES.slice(0, LEFT_COLUMN_SIZE), LOCALES.slice(LEFT_COLUMN_SIZE)];

function capitalize(text: string, locale: LocaleTag): string {
  return text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);
}

/** Índice do item na mesma linha da outra coluna. */
function otherColumnIndex(index: number): number {
  if (index < LEFT_COLUMN_SIZE) return Math.min(LEFT_COLUMN_SIZE + index, LOCALES.length - 1);
  return Math.min(index - LEFT_COLUMN_SIZE, LEFT_COLUMN_SIZE - 1);
}

export function LanguageMenu() {
  const { t, locale, setLocale } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Nome de cada idioma no idioma atual da interface (I18N-01.1), sem precisar de 21 × 21 mensagens.
  const displayNames = useMemo(() => new Intl.DisplayNames([locale], { type: "language" }), [locale]);

  useEffect(() => {
    if (!isOpen) return;
    itemRefs.current[LOCALES.findIndex((option) => option.tag === locale)]?.focus();

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen, locale]);

  function close() {
    setIsOpen(false);
    rootRef.current?.querySelector<HTMLButtonElement>("[aria-haspopup='menu']")?.focus();
  }

  function choose(tag: LocaleTag) {
    setLocale(tag);
    close();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = itemRefs.current.findIndex((element) => element === document.activeElement);
    const isRtl = document.documentElement.dir === "rtl";
    let next: number | null = null;

    switch (event.key) {
      case "Escape":
        event.preventDefault();
        close();
        return;
      case "ArrowDown":
        next = (current + 1) % LOCALES.length;
        break;
      case "ArrowUp":
        next = (current - 1 + LOCALES.length) % LOCALES.length;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = LOCALES.length - 1;
        break;
      case "ArrowRight":
      case "ArrowLeft": {
        // No RTL a coluna da esquerda (início) fica à direita: as setas seguem o lado visual.
        const towardsEnd = (event.key === "ArrowRight") !== isRtl;
        const isInFirstColumn = current < LEFT_COLUMN_SIZE;
        next = towardsEnd === isInFirstColumn ? otherColumnIndex(current) : current;
        break;
      }
      default:
        return;
    }

    // preventDefault também impede que as setas troquem o passo da aula (useAppShortcuts).
    event.preventDefault();
    itemRefs.current[next]?.focus();
  }

  const current = getLocale(locale);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={t("header.language")}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={() => setIsOpen((open) => !open)}
        className="flex h-[37px] items-center gap-1.5 rounded-md border-line-strong px-2 text-[13px] font-medium text-ink transition-colors hover:bg-sunken sm:border sm:bg-surface sm:px-3"
      >
        <Globe size={15} aria-hidden="true" />
        <span className="hidden sm:inline">{current.code}</span>
        <ChevronDown size={12} aria-hidden="true" className="hidden sm:block" />
      </button>

      {isOpen && (
        <div
          id={menuId}
          role="menu"
          aria-label={t("languageMenu.title")}
          onKeyDown={handleKeyDown}
          // Abaixo de 640 px o menu se prende às bordas da tela, para não sair dela (RSP-01.5).
          className="absolute end-0 top-full z-50 mt-2 max-h-[calc(100dvh-80px)] w-[min(35rem,calc(100vw-2rem))] overflow-y-auto rounded-lg border-[1.5px] border-line-strong bg-surface p-4 shadow-press-lg max-sm:fixed max-sm:inset-x-4 max-sm:top-15 max-sm:w-auto"
        >
          <p
            aria-hidden="true"
            className="border-b border-line pb-3 text-[11px] font-semibold uppercase tracking-[1px] text-ink"
          >
            {t("languageMenu.title")}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-x-4">
            {COLUMNS.map((column, columnIndex) => (
              <div key={columnIndex} role="group" className="flex min-w-0 flex-col gap-1">
                {column.map((option, rowIndex) => {
                  const index = columnIndex * LEFT_COLUMN_SIZE + rowIndex;
                  const isSelected = option.tag === locale;
                  const localName = capitalize(displayNames.of(option.tag) ?? option.nativeName, locale);

                  return (
                    <button
                      key={option.tag}
                      ref={(element) => {
                        itemRefs.current[index] = element;
                      }}
                      type="button"
                      role="menuitemradio"
                      aria-checked={isSelected}
                      tabIndex={-1}
                      data-locale={option.tag}
                      lang={option.tag}
                      onClick={() => choose(option.tag)}
                      className={cn(
                        "flex items-center gap-3 rounded-md border-[1.5px] px-2 py-1.5 text-start transition-colors",
                        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-line-strong",
                        isSelected ? "border-line-strong bg-brand-soft shadow-press" : "border-transparent hover:bg-sunken",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "grid size-7 shrink-0 place-items-center rounded-md border border-line-strong text-[9px] font-bold",
                          isSelected ? "bg-brand text-on-brand" : "bg-surface text-ink",
                        )}
                      >
                        {isSelected ? <Check size={13} strokeWidth={3} /> : option.code}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-bold uppercase text-ink">{option.nativeName}</span>
                        <span lang={locale} className="block truncate text-[11px] text-muted">
                          {localName}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10.5px] leading-[1.4] text-muted">
            {t("languageMenu.note")}
          </p>
        </div>
      )}
    </div>
  );
}
