import { CornerDownLeft, Search } from "lucide-react";
import { useMemo, useState, type KeyboardEvent } from "react";
import { formatLessonCode, getModuleColor, type LessonLocation } from "../../lib/course";
import { searchLessons } from "../../lib/search";
import { cn } from "../../lib/utils";
import { Kbd } from "../ui/Kbd";

interface SearchDialogProps {
  entries: LessonLocation[];
  onSelectLesson: (lessonId: string) => void;
  onClose: () => void;
}

export function SearchDialog({ entries, onSelectLesson, onClose }: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const results = useMemo(() => searchLessons(entries, query), [entries, query]);
  const selectedIndex = Math.min(activeIndex, Math.max(results.length - 1, 0));

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
      <button
        type="button"
        tabIndex={-1}
        aria-label="Fechar busca"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink/25"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Buscar aulas"
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
            aria-label="Buscar aulas e conceitos"
            placeholder="Buscar aulas e conceitos…"
            className="h-[50px] min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-subtle"
          />
          <Kbd>Esc</Kbd>
        </div>

        {results.length > 0 ? (
          <div className="max-h-[360px] overflow-y-auto p-2">
            <p className="px-2 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[1px] text-muted">Aulas</p>
            <ul aria-label="Resultados da busca" className="flex flex-col gap-0.5">
              {results.map(({ module, lesson, lessonIndex }, index) => {
                const isSelected = index === selectedIndex;

                return (
                  <li key={lesson.id}>
                    <button
                      type="button"
                      onClick={() => onSelectLesson(lesson.id)}
                      onMouseEnter={() => setActiveIndex(index)}
                      aria-current={isSelected ? "true" : undefined}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md border-[1.5px] px-2.5 py-2 text-left text-[13px] transition-colors",
                        isSelected ? "border-line-strong bg-brand-soft" : "border-transparent hover:bg-sunken",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className="h-[11px] w-3.5 shrink-0 rounded-[2px] border border-line-strong"
                        style={{ backgroundColor: getModuleColor(module) }}
                      />
                      <span className="shrink-0 font-medium text-ink">{formatLessonCode(module, lessonIndex)}</span>
                      <span className={cn("min-w-0 flex-1 truncate text-ink", isSelected && "font-semibold")}>
                        {lesson.title}
                      </span>
                      <span className="hidden shrink-0 text-[11px] text-muted sm:inline">{module.title}</span>
                      {isSelected && <CornerDownLeft size={12} aria-hidden="true" className="shrink-0 text-muted" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <p className="px-4 py-8 text-center text-[13px] text-muted">
            {query.trim() === ""
              ? "Digite para encontrar aulas por título, módulo ou descrição."
              : `Nenhuma aula encontrada para “${query.trim()}”.`}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-paper px-4 py-2.5 text-[10px] text-muted">
          <span className="whitespace-pre">[↑↓] navegar  ·  [Enter] abrir  ·  [Esc] fechar</span>
          <span>
            {results.length} {results.length === 1 ? "resultado" : "resultados"} · funciona offline
          </span>
        </div>
      </div>
    </div>
  );
}
