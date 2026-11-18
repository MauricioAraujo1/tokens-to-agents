import { BookOpen, Menu, Moon, Search, Sun } from "lucide-react";
import { APP_SECTIONS } from "../../data/sections";
import { cn } from "../../lib/utils";
import type { AppSection, ThemeMode } from "../../types/app";
import { Button } from "../ui/Button";
import { Kbd } from "../ui/Kbd";

interface AppHeaderProps {
  activeSection: AppSection;
  onSectionChange: (section: AppSection) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onOpenSearch: () => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function AppHeader({
  activeSection,
  onSectionChange,
  theme,
  onToggleTheme,
  onOpenSearch,
  isSidebarOpen,
  onToggleSidebar,
}: AppHeaderProps) {
  const nextThemeLabel = theme === "light" ? "Ativar tema escuro" : "Ativar tema claro";

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-line bg-surface px-3 xl:px-4">
      <Button
        variant="ghost"
        size="sm"
        className="xl:hidden"
        aria-label="Abrir menu do curso"
        aria-expanded={isSidebarOpen}
        aria-controls="course-sidebar"
        onClick={onToggleSidebar}
      >
        <Menu size={16} aria-hidden="true" />
      </Button>

      <div className="flex shrink-0 items-center gap-2">
        <span className="grid size-7 place-items-center rounded-md border border-ink/70 bg-green text-on-accent">
          <BookOpen size={15} aria-hidden="true" />
        </span>
        <span className="text-sm font-semibold tracking-tight text-ink">
          AI{" "}
          <span className="rounded bg-green/50 px-1 py-px">Engineering</span>
        </span>
      </div>

      <nav aria-label="Seções" className="flex min-w-0 items-center gap-1 overflow-x-auto">
        {APP_SECTIONS.map((section) => {
          const isActive = section.id === activeSection;

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSectionChange(section.id)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "h-8 shrink-0 rounded-md border px-2.5 text-xs font-medium transition-colors sm:text-sm",
                isActive
                  ? "border-green-dark/40 bg-green/40 text-ink shadow-sm"
                  : "border-transparent text-muted hover:bg-surface-muted hover:text-ink",
              )}
            >
              {section.label}
            </button>
          );
        })}
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenSearch}
          className="hidden h-8 w-64 items-center gap-2 rounded-md border border-line bg-canvas px-2.5 text-left text-sm text-muted transition-colors hover:bg-surface-muted md:flex"
        >
          <Search size={14} aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">Buscar lições e conceitos...</span>
          <Kbd>Ctrl K</Kbd>
        </button>
        <Button variant="ghost" size="sm" className="md:hidden" aria-label="Buscar lições" onClick={onOpenSearch}>
          <Search size={16} aria-hidden="true" />
        </Button>

        <label htmlFor="app-language" className="sr-only">
          Idioma
        </label>
        <select
          id="app-language"
          defaultValue="pt"
          className="h-8 rounded-md border border-line bg-surface px-2 font-mono text-xs text-ink"
        >
          <option value="pt">PT</option>
          <option value="en" disabled>
            EN (em breve)
          </option>
        </select>

        <Button variant="ghost" size="sm" aria-label={nextThemeLabel} title={nextThemeLabel} onClick={onToggleTheme}>
          {theme === "light" ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
        </Button>

        <div
          role="img"
          aria-label="Perfil de visitante (autenticação em breve)"
          title="Perfil (autenticação em breve)"
          className="grid size-8 shrink-0 place-items-center rounded-full border border-line bg-surface-muted font-mono text-[11px] font-semibold text-muted"
        >
          AI
        </div>
      </div>
    </header>
  );
}
