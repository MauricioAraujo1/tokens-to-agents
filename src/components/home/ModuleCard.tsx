import type { MouseEvent } from "react";
import { useI18n } from "../../i18n/useI18n";
import { cn } from "../../lib/utils";
import type { ModuleMeta } from "../../types/content";
import { STATUS_CLASS, STATUS_GLYPH, STATUS_LABEL, type ModuleStatus } from "./moduleStatus";

interface ModuleCardProps {
  module: ModuleMeta;
  completed: number;
  status: ModuleStatus;
  /** Módulo da última aula aberta: ganha a borda grossa e a sombra dura do preview 07. */
  isCurrent: boolean;
  href: string;
  onOpen: (event: MouseEvent<HTMLAnchorElement>) => void;
}

/** Card de módulo da home (preview 07): faixa na cor do módulo, número, status, título, contagem e barra. */
export function ModuleCard({ module, completed, status, isCurrent, href, onOpen }: ModuleCardProps) {
  const { t } = useI18n();
  const total = module.lessons.length;
  const progress = total === 0 ? 0 : (completed / total) * 100;
  const color = `var(--module-${module.id})`;

  return (
    <a
      href={href}
      onClick={onOpen}
      className={cn(
        "flex h-full w-full flex-col gap-2 overflow-hidden rounded-[7px] border border-line-strong bg-surface pb-3 text-start transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-press-lg",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-line-strong",
        isCurrent && "border-[1.5px] shadow-press-lg",
      )}
    >
      <span aria-hidden="true" className="h-2 w-full shrink-0" style={{ backgroundColor: color }} />
      <span className="flex flex-1 flex-col gap-1.5 px-3 pt-1">
        <span className="flex items-start justify-between">
          <span className="text-[11px] font-bold text-muted">{module.id}</span>
          <span aria-hidden="true" className={cn("text-xs font-bold", STATUS_CLASS[status])}>
            {STATUS_GLYPH[status]}
          </span>
          <span className="sr-only">{t(STATUS_LABEL[status])}</span>
        </span>
        <span className="text-[13px] font-bold leading-[17px] text-ink">{module.title}</span>
        <span className="text-[11px] text-muted">{t("home.moduleLessons", { completed, count: total })}</span>
        <span aria-hidden="true" className="mt-auto h-[5px] overflow-hidden rounded-[3px] bg-sunken">
          <span
            className="block h-full transition-[width] duration-700 ease-out"
            style={{ width: `${progress}%`, backgroundColor: color }}
          />
        </span>
      </span>
    </a>
  );
}
