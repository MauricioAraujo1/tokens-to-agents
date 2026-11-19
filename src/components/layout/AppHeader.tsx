import { CircleDot, FlaskConical, Menu, Moon, Search, SquareMenu, Sun, TextAlignJustify, type LucideIcon } from "lucide-react";
import { APP_SECTIONS } from "../../data/sections";
import { useI18n } from "../../i18n/useI18n";
import { cn } from "../../lib/utils";
import type { AppSection, ThemeMode } from "../../types/app";
import { Kbd } from "../ui/Kbd";
import { BrandMark } from "./BrandMark";
import { LanguageMenu } from "./LanguageMenu";

interface AppHeaderProps {
  /** `null` fora das seções, por exemplo na página "não encontrado": nenhuma aba fica destacada. */
  activeSection: AppSection | null;
  onSectionChange: (section: AppSection) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onOpenSearch: () => void;
  /** O botão da trilha só aparece onde a trilha existe, isto é, na aula. */
  hasCourseMenu?: boolean;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

const SECTION_ICON: Record<AppSection, LucideIcon> = {
  aprender: SquareMenu,
  pratica: CircleDot,
  laboratorio: FlaskConical,
  resumos: TextAlignJustify,
};

/** Botão de ícone do cabeçalho: com borda a partir de 640 px, só o ícone no celular (preview 06). */
const HEADER_ICON_BUTTON_CLASS =
  "grid h-[37px] min-w-[34px] shrink-0 place-items-center rounded-md border-line-strong text-ink transition-colors hover:bg-sunken sm:border sm:bg-surface";

export function AppHeader({
  activeSection,
  onSectionChange,
  theme,
  onToggleTheme,
  onOpenSearch,
  hasCourseMenu = true,
  isSidebarOpen,
  onToggleSidebar,
}: AppHeaderProps) {
  const { t } = useI18n();
  const nextThemeLabel = theme === "light" ? t("header.themeDark") : t("header.themeLight");

  return (
    <header className="flex h-15 shrink-0 items-center gap-3 border-b border-line bg-paper px-3 print:hidden sm:px-5">
      {hasCourseMenu && (
        <button
          type="button"
          className="grid size-9 shrink-0 place-items-center rounded-md text-ink hover:bg-sunken xl:hidden"
          aria-label={t("header.openCourseMenu")}
          aria-expanded={isSidebarOpen}
          aria-controls="course-sidebar"
          onClick={onToggleSidebar}
        >
          <Menu size={20} aria-hidden="true" />
        </button>
      )}

      <div className="flex shrink-0 items-center gap-2.5">
        <BrandMark />
        <span className="hidden text-[17px] font-bold leading-[22px] text-ink sm:inline">Tokens to Agents</span>
      </div>

      <nav aria-label={t("sections.nav")} className="no-scrollbar mx-auto flex min-w-0 items-center gap-1.5 overflow-x-auto">
        {APP_SECTIONS.map((section) => {
          const isActive = section.id === activeSection;
          const Icon = SECTION_ICON[section.id];
          const label = t(section.labelKey);

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSectionChange(section.id)}
              aria-current={isActive ? "page" : undefined}
              aria-label={label}
              title={label}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-md border-[1.5px] px-3 py-2 text-sm leading-[18px] text-ink transition-colors xl:px-4",
                isActive
                  ? "border-line-strong bg-brand-soft font-semibold shadow-press"
                  : "border-transparent font-medium hover:bg-sunken",
              )}
            >
              <Icon size={15} strokeWidth={2} aria-hidden="true" />
              <span className="hidden lg:inline">{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenSearch}
          className="hidden h-[38px] w-[300px] items-center justify-between gap-2 rounded-md border border-line-strong bg-surface py-2 pl-3 pr-2 text-start text-[13px] text-muted transition-colors hover:bg-sunken xl:flex"
        >
          <span className="flex min-w-0 items-center gap-2">
            <Search size={14} aria-hidden="true" />
            <span className="truncate">{t("header.searchPlaceholder")}</span>
          </span>
          <Kbd>Ctrl K</Kbd>
        </button>
        <button
          type="button"
          className={cn(HEADER_ICON_BUTTON_CLASS, "xl:hidden")}
          aria-label={t("header.searchButton")}
          onClick={onOpenSearch}
        >
          <Search size={16} aria-hidden="true" />
        </button>

        <LanguageMenu />

        <button
          type="button"
          className={HEADER_ICON_BUTTON_CLASS}
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
