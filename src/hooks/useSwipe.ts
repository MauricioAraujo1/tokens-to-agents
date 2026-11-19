import { useMemo, useRef, type TouchEvent } from "react";

/** Distância horizontal mínima, em px, para o gesto contar como swipe (RSP-01.4). */
export const SWIPE_MIN_DISTANCE = 50;

export interface SwipeOptions {
  onNext: () => void;
  onPrevious: () => void;
  /** Em RTL o sentido inverte: arrastar para a direita avança. */
  rtl?: boolean;
}

export interface SwipeHandlers {
  onTouchStart: (event: TouchEvent<HTMLElement>) => void;
  onTouchEnd: (event: TouchEvent<HTMLElement>) => void;
  onTouchCancel: () => void;
}

/**
 * Swipe entre passos sobre a cena (RSP-01.4): arrastar para a esquerda avança e para a direita volta.
 * Só conta o gesto de um dedo com pelo menos 50 px na horizontal e mais horizontal que vertical,
 * para não brigar com a rolagem da página.
 */
export function useSwipe({ onNext, onPrevious, rtl = false }: SwipeOptions): SwipeHandlers {
  const startRef = useRef<{ x: number; y: number } | null>(null);

  return useMemo(
    () => ({
      onTouchStart(event) {
        const touch = event.touches.length === 1 ? event.touches[0] : undefined;
        startRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
      },
      onTouchEnd(event) {
        const start = startRef.current;
        startRef.current = null;
        const touch = event.changedTouches[0];
        if (!start || !touch) return;

        const deltaX = touch.clientX - start.x;
        const deltaY = touch.clientY - start.y;
        if (Math.abs(deltaX) < SWIPE_MIN_DISTANCE || Math.abs(deltaX) <= Math.abs(deltaY)) return;

        const draggedLeft = deltaX < 0;
        if (draggedLeft !== rtl) onNext();
        else onPrevious();
      },
      onTouchCancel() {
        startRef.current = null;
      },
    }),
    [onNext, onPrevious, rtl],
  );
}
