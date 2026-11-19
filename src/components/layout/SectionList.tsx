import { cn } from "../../lib/utils";

export interface SectionListItem {
  id: string;
  label: string;
  meta?: string;
  isDisabled?: boolean;
  hint?: string;
}

export interface SectionListGroup {
  title: string;
  items: SectionListItem[];
}

interface SectionListProps {
  label: string;
  groups: SectionListGroup[];
  activeId?: string;
  onSelect?: (id: string) => void;
  hasActiveMarker?: boolean;
}

export function SectionList({ label, groups, activeId, onSelect, hasActiveMarker = false }: SectionListProps) {
  return (
    <nav
      aria-label={label}
      className="no-scrollbar flex shrink-0 flex-col gap-4 overflow-y-auto rounded-lg border border-line bg-surface px-2.5 py-3.5 print:hidden lg:w-[290px]"
    >
      {groups.map((group) => (
        <div key={group.title} className="flex flex-col gap-1">
          <p className="px-2 text-[11px] font-bold uppercase leading-[14px] tracking-[1px] text-ink">{group.title}</p>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const isActive = item.id === activeId;

              return (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={item.isDisabled || !onSelect}
                    aria-current={isActive ? "page" : undefined}
                    title={item.hint}
                    onClick={() => onSelect?.(item.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-[5px] border-[1.5px] px-2 py-[3px] text-left text-xs leading-4 transition-colors",
                      isActive
                        ? "border-line-strong bg-brand-soft py-1.5 font-semibold text-ink"
                        : "border-transparent text-ink enabled:hover:bg-sunken disabled:cursor-default disabled:text-muted",
                    )}
                  >
                    <span className="min-w-0 truncate">
                      {isActive && hasActiveMarker && <span aria-hidden="true">▶ </span>}
                      {item.label}
                    </span>
                    {item.meta && <span className="shrink-0 text-[11px]">{item.meta}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
