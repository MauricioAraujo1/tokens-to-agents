import { CornerDownLeft, Search } from "lucide-react";
import { useEffect, useId, useMemo, useState, type KeyboardEvent } from "react";
import { useI18n } from "../../i18n/useI18n";
import {
  baseSearchIndex,
  loadFullSearchIndex,
  MIN_QUERY_LENGTH,
  SEARCH_GROUPS,
  searchAll,
  type SearchResult,
} from "../../lib/search";
import { cn, normalizeText } from "../../lib/utils";
import { Kbd } from "../ui/Kbd";

interface SearchDialogProps {
  onSelectLesson: (lessonId: string) => void;
  onClose: () => void;
}

function resultContext(result: SearchResult): string {
  return result.group === "lesson" ? result.module.title : `${result.lesson.number} · ${result.lesson.title}`;
}

export function SearchDialog({ onSelectLesson, onClose }: SearchDialogProps) {
  const { t } = useI18n();
  const groupIdPrefix = useId();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [index, setIndex] = useState(baseSearchIndex);
  const results = useMemo(() => searchAll(query, index), [query, index]);
  const selectedIndex = Math.min(activeIndex, Math.max(results.length - 1, 0));
  const isQueryTooShort = normalizeText(query).replace(/\s+/g, "").length < MIN_QUERY_LENGTH;

  // Lido no render, antes do autoFocus do campo: é o elemento que abriu a busca. Ao fechar,
  // o foco volta para ele (SRCH-01.4).
  const [opener] = useState(() => document.activeElement);
  useEffect(
    () => () => {
      if (opener instanceof HTMLElement && opener !== document.body && opener.isConnected) opener.focus();
    },
    [opener],
  );

  // Os conceitos (títulos de passo) chegam com os chunks das aulas; até lá, aulas e glossário.
  useEffect(() => {
    let isCurrent = true;
    loadFullSearchIndex().then((full) => isCurrent && setIndex(full));
    return () => {
      isCurrent = false;
    };
  }, []);

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex(Math.min(selectedIndex + 1, Math.max(results.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(Math.max(selectedIndex - 1, 0));
    } else if (event.key === "Enter" && results[selectedIndex]) {
      event.preventDefault();
      onSelectLesson(results[selectedIndex].lesson.id);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[8vh]"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          onClose();
        }
      }}
    >
      <button type="button" tabIndex={-1} aria-label={t("search.close")} onClick={onClose} className="absolute inset-0 cursor-default bg-ink/25" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("search.dialog")}
        className="relative w-full max-w-[640px] overflow-hidden rounded-lg border-[1.5px] border-line-strong bg-surface shadow-press-lg"
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search size={15} aria-hidden="true" className="text-muted" />
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            aria-label={t("search.input")}
            placeholder={t("search.placeholder")}
            className="h-[50px] min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
          />
          <Kbd>Esc</Kbd>
        </div>

        {results.length > 0 ? (
          <div aria-label={t("search.results")} role="region" className="max-h-[360px] overflow-y-auto p-2">
            {SEARCH_GROUPS.map((group) => {
              const groupResults = results.filter((result) => result.group === group);
              if (groupResults.length === 0) return null;
              const headingId = `${groupIdPrefix}-${group}`;

              return (
                <div key={group}>
                  <p id={headingId} className="px-2 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[1px] text-muted">
                    {t(`search.group.${group}`)}
                  </p>
                  <ul aria-labelledby={headingId} className="flex flex-col gap-0.5">
                    {groupResults.map((result) => {
                      const position = results.indexOf(result);
                      const isSelected = position === selectedIndex;

                      return (
                        <li key={result.key}>
                          <button
                            type="button"
                            onClick={() => onSelectLesson(result.lesson.id)}
                            onMouseEnter={() => setActiveIndex(position)}
                            aria-current={isSelected ? "true" : undefined}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-md border-[1.5px] px-2.5 py-2 text-start text-[13px] transition-colors",
                              isSelected ? "border-line-strong bg-brand-soft" : "border-transparent hover:bg-sunken",
                            )}
                          >
                            {result.group === "glossary" ? (
                              <span aria-hidden="true" className="w-3.5 shrink-0 text-center font-bold text-info-ink">
                                §
                              </span>
                            ) : (
                              <span
                                aria-hidden="true"
                                className="h-[11px] w-3.5 shrink-0 rounded-[2px] border border-line-strong"
                                style={{ backgroundColor: `var(--module-${result.module.id})` }}
                              />
                            )}
                            {result.group === "lesson" && (
                              <span className="shrink-0 font-medium text-ink">{result.lesson.number}</span>
                            )}
                            <span className={cn("min-w-0 flex-1 truncate text-ink", isSelected && "font-semibold")}>
                              {result.label}
                              {result.explanation && (
                                <span className={cn("font-normal", isSelected ? "text-ink" : "text-muted")}> — {result.explanation}</span>
                              )}
                            </span>
                            {/* Sobre o brand-soft do item escolhido, ink-muted fica abaixo de 4,5:1 no escuro. */}
                            <span
                              className={cn(
                                "hidden max-w-[40%] shrink-0 truncate text-[11px] sm:inline",
                                isSelected ? "text-ink" : "text-muted",
                              )}
                            >
                              {resultContext(result)}
                            </span>
                            {isSelected && <CornerDownLeft size={12} aria-hidden="true" className="shrink-0 text-muted rtl:-scale-x-100" />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="px-4 py-8 text-center text-[13px] text-muted">
            {isQueryTooShort ? t("search.hint") : t("search.empty", { query: query.trim() })}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-paper px-4 py-2.5 text-[10px] text-muted">
          <span className="whitespace-pre">{t("search.shortcuts")}</span>
          {/* Sem resultado, a mensagem do corpo já explica; e o plural do pt trata 0 como singular. */}
          {results.length > 0 && <span>{t("search.resultCount", { count: results.length })}</span>}
        </div>
      </div>
    </div>
  );
}
