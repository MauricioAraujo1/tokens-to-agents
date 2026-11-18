import { cn } from "../../lib/utils";
import type { PanelResizeControl } from "../../hooks/usePanelResize";

interface ResizeHandleProps {
  label: string;
  edge: "left" | "right";
  separatorProps: PanelResizeControl["separatorProps"];
}

export function ResizeHandle({ label, edge, separatorProps }: ResizeHandleProps) {
  return (
    <div
      aria-label={label}
      {...separatorProps}
      className={cn(
        "group absolute inset-y-0 z-20 hidden w-2 cursor-col-resize touch-none select-none xl:block",
        edge === "right" ? "-right-1" : "-left-1",
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-transparent transition-colors group-hover:bg-green-dark group-focus-visible:bg-green-dark"
      />
    </div>
  );
}
