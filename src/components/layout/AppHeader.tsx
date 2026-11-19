import { CircleDot, FlaskConical, Menu, Moon, Search, SquareMenu, Sun, TextAlignJustify, type LucideIcon } from "lucide-react";
import { APP_SECTIONS } from "../../data/sections";
import { cn } from "../../lib/utils";
import type { AppSection, ThemeMode } from "../../types/app";
import { Kbd } from "../ui/Kbd";
import { BrandMark } from "./BrandMark";
import { LanguageMenu } from "./LanguageMenu";

interface AppHeaderProps {
  activeSection: AppSection;
  onSectionChange: (section: AppSection) => void;
  onOpenHome: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onOpenSearch: () => void;
  hasCourseMenu: boolean;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

const SECTION_ICON: Record<AppSection, LucideIcon> = {
  aprender: SquareMenu,
  pratica: CircleDot,
  laboratorio: FlaskConical,
  resumos: TextAlignJustify,
};

const ICON_BUTTON_CLASS =
  "grid h-[37px] w-[34px] shrink-0 place-items-center rounded-md border border-line-strong bg-surface text-ink transition-colors hover:bg-sunken";

export function AppHeader({
  activeSection,
  onSectionChange,
  onOpenHome,
  theme,
  onToggleTheme,
  onOpenSearch,
  hasCourseMenu,
  isSidebarOpen,
  onToggleSidebar,
}: AppHeaderProps) {
  const nextThemeLabel = theme === "light" ? "Ativar tema escuro" : "Ativar tema claro";

  return (
    <header className="flex h-[60px] shrink-0 items-center gap-3 border-b border-line bg-paper px-3 print:hidden sm:px-5">
      {hasCourseMenu && (
        <button
          type="button"
          className="grid size-9 shrink-0 place-items-center rounded-md text-ink hover:bg-sunken xl:hidden"
          aria-label="Abrir menu do curso"
          aria-expanded={isSidebarOpen}
          aria-controls="course-sidebar"
          onClick={onToggleSidebar}
        >
          <Menu size={20} aria-hidden="true" />
        </button>
      )}

      <button
        type="button"
        onClick={onOpenHome}
        aria-label="Tokens to Agents, página inicial"
        className="flex shrink-0 items-center gap-2.5 rounded-md"
      >
        <BrandMark />
        <span className="hidden text-[17px] font-bold leading-[22px] text-ink sm:inline">Tokens to Agents</span>
      </button>

      <nav aria-label="Seções" className="no-scrollbar mx-auto flex min-w-0 items-center gap-1.5 overflow-x-auto">
        {APP_SECTIONS.map((section) => {
          const isActive = section.id === activeSection;
          const Icon = SECTION_ICON[section.id];

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSectionChange(section.id)}
              aria-current={isActive ? "page" : undefined}
              aria-label={section.label}
              title={section.label}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm leading-[18px] text-ink transition-colors xl:px-4",
                isActive
                  ? "border-[1.5px] border-line-strong bg-brand-soft font-semibold shadow-press"
                  : "border-[1.5px] border-transparent font-medium hover:bg-sunken",
              )}
            >
              <Icon size={15} strokeWidth={2} aria-hidden="true" />
              <span className="hidden lg:inline">{section.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenSearch}
          className="hidden h-[38px] w-[300px] items-center justify-between gap-2 rounded-md border border-line-strong bg-surface py-2 pl-3 pr-2 text-left text-[13px] text-subtle transition-colors hover:bg-sunken xl:flex"
        >
          <span className="flex min-w-0 items-center gap-2">
            <Search size={14} aria-hidden="true" />
            <span className="truncate">Buscar aulas e conceitos…</span>
          </span>
          <Kbd>Ctrl K</Kbd>
        </button>
        <button type="button" className={cn(ICON_BUTTON_CLASS, "xl:hidden")} aria-label="Buscar aulas" onClick={onOpenSearch}>
          <Search size={16} aria-hidden="true" />
        </button>

        <LanguageMenu />

        <button
          type="button"
          className={ICON_BUTTON_CLASS}
          aria-label={nextThemeLabel}
          title={nextThemeLabel}
          onClick={onToggleTheme}
        >
          {theme === "light" ? <Moon size={15} aria-hidden="true" /> : <Sun size={15} aria-hidden="true" />}
        </button>
      </div>
    </header>
  );
}
