import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

export const RESIZE_KEYBOARD_STEP = 16;

export interface PanelResizeOptions {
  initialWidth: number;
  minWidth: number;
  maxWidth: number;
  direction: 1 | -1;
}

export interface PanelResizeControl {
  width: number;
  separatorProps: {
    role: "separator";
    tabIndex: number;
    "aria-orientation": "vertical";
    "aria-valuemin": number;
    "aria-valuemax": number;
    "aria-valuenow": number;
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
    onPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
    onPointerCancel: (event: PointerEvent<HTMLDivElement>) => void;
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  };
}

interface DragState {
  startX: number;
  startWidth: number;
}

export function usePanelResize({ initialWidth, minWidth, maxWidth, direction }: PanelResizeOptions): PanelResizeControl {
  const [width, setWidth] = useState(initialWidth);
  const dragRef = useRef<DragState | null>(null);

  function clamp(value: number): number {
    return Math.min(maxWidth, Math.max(minWidth, value));
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    dragRef.current = { startX: event.clientX, startWidth: width };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;

    if (!drag) {
      return;
    }

    setWidth(clamp(drag.startWidth + direction * (event.clientX - drag.startX)));
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    dragRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    event.preventDefault();
    const signedStep = event.key === "ArrowRight" ? RESIZE_KEYBOARD_STEP : -RESIZE_KEYBOARD_STEP;
    setWidth((current) => clamp(current + direction * signedStep));
  }

  return {
    width,
    separatorProps: {
      role: "separator",
      tabIndex: 0,
      "aria-orientation": "vertical",
      "aria-valuemin": minWidth,
      "aria-valuemax": maxWidth,
      "aria-valuenow": width,
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerUp,
      onKeyDown: handleKeyDown,
    },
  };
}
