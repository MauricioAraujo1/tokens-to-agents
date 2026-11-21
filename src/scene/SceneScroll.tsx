import { useRef, type ReactNode, type TouchEvent } from "react";
import { useHorizontalOverflow } from "../hooks/useHorizontalOverflow";
import { cn } from "../lib/utils";

interface SceneScrollProps {
  /** Nome do quadro quando ele rola e recebe foco pelo teclado. */
  label: string;
  className?: string;
  /** Largura mínima do desenho, quando a peça a define: ao mudar, o quadro confere de novo se rola. */
  contentWidth?: number;
  children: ReactNode;
}

/**
 * Quadro da peça larga demais para a tela (LEG-01.4): o desenho mantém a largura mínima em que o
 * texto fica com 11 px e o quadro rola na horizontal, com a barra visível. Só o quadro rola, nunca a
 * página. Quando rola, o quadro entra na ordem do Tab (as setas do teclado o deslizam) e o gesto
 * horizontal sobre ele desliza o desenho em vez de trocar de passo.
 */
export function SceneScroll({ label, className, contentWidth, children }: SceneScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const scrolls = useHorizontalOverflow(ref, contentWidth);
  const keepGesture = (event: TouchEvent<HTMLDivElement>) => {
    if (scrolls) event.stopPropagation();
  };

  return (
    <div
      ref={ref}
      data-scene-scroll={scrolls ? "scroll" : "fit"}
      role={scrolls ? "group" : undefined}
      aria-label={scrolls ? label : undefined}
      tabIndex={scrolls ? 0 : undefined}
      onTouchStart={keepGesture}
      onTouchEnd={keepGesture}
      className={cn("scene-scroll overflow-x-auto overflow-y-hidden", className)}
    >
      {children}
    </div>
  );
}
