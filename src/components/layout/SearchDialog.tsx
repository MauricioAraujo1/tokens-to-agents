import { Search } from "lucide-react";
import { useMemo, useState, type KeyboardEvent } from "react";
import type { LessonLocation } from "../../lib/course";
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
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          onClose();
        }
      }}
    >
      <button type="button" tabIndex={-1} aria-label="Fechar busca" onClick={onClose} className="absolute inset-0 cursor-default bg-ink/30" />

      <div role="dialog" aria-modal="true" aria-label="Buscar lições" className="relative w-full max-w-xl overflow-hidden rounded-xl border border-line bg-surface shadow-paper">
        <div className="flex items-center gap-2 border-b border-line px-4">
          <Search size={16} aria-hidden="true" className="text-muted" />
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            aria-label="Buscar lições e conceitos"
            placeholder="Buscar lições e conceitos..."
            className="h-12 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
          />
          <Kbd>Esc</Kbd>
        </div>

        {results.length > 0 ? (
          <ul aria-label="Resultados da busca" className="max-h-80 overflow-y-auto p-1.5">
            {results.map(({ module, lesson }, index) => {
              const isSelected = index === selectedIndex;

              return (
                <li key={lesson.id}>
                  <button
                    type="button"
                    onClick={() => onSelectLesson(lesson.id)}
                    onMouseEnter={() => setActiveIndex(index)}
                    aria-current={isSelected ? "true" : undefined}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors",
                      isSelected ? "bg-green/30" : "hover:bg-surface-muted",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{lesson.title}</span>
                      <span className="block truncate font-mono text-[11px] text-muted">
                        {module.number}. {module.title}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-muted">{lesson.duration} min</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-4 py-6 text-center text-sm text-muted">
            {query.trim() === ""
              ? "Digite para encontrar aulas por título, módulo ou descrição."
              : `Nenhuma aula encontrada para “${query.trim()}”.`}
          </p>
        )}
      </div>
    </div>
  );
}
