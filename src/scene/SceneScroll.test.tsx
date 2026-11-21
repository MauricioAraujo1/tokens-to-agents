import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SceneScroll } from "./SceneScroll";

/** Quadro de `frame` px com conteúdo de `content` px; o jsdom não faz layout. */
function stubLayout(frame: number, content: number) {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  const client = vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(frame);
  const scroll = vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(content);
  return () => {
    client.mockRestore();
    scroll.mockRestore();
  };
}

function renderFrame(onParentTouch = vi.fn()) {
  const { container } = render(
    <div onTouchStart={onParentTouch} onTouchEnd={onParentTouch}>
      <SceneScroll label="Diagrama de blocos: celular e api">
        <svg style={{ minWidth: 515 }} />
      </SceneScroll>
    </div>,
  );
  return { frame: container.querySelector(".scene-scroll") as HTMLDivElement, onParentTouch };
}

describe("SceneScroll (LEG-01.4)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("quadro com rolagem própria e barra visível, sem a classe que esconde a barra", () => {
    const { frame } = renderFrame();

    expect(frame).toHaveClass("overflow-x-auto", "overflow-y-hidden");
    expect(frame).not.toHaveClass("no-scrollbar");
  });

  it("quando o desenho cabe (1440), o quadro não entra no Tab nem vira grupo", () => {
    const restore = stubLayout(702, 702);
    try {
      const { frame } = renderFrame();

      expect(frame).toHaveAttribute("data-scene-scroll", "fit");
      expect(frame).not.toHaveAttribute("tabindex");
      expect(screen.queryByRole("group")).toBeNull();
    } finally {
      restore();
    }
  });

  it("quando o desenho passa do quadro (375), o quadro rola, recebe foco e tem nome", () => {
    const restore = stubLayout(309, 515);
    try {
      const { frame } = renderFrame();
      const group = screen.getByRole("group", { name: "Diagrama de blocos: celular e api" });

      expect(group).toBe(frame);
      expect(frame).toHaveAttribute("data-scene-scroll", "scroll");
      expect(frame).toHaveAttribute("tabindex", "0");
      frame.focus();
      expect(frame).toHaveFocus();
    } finally {
      restore();
    }
  });

  it("o gesto sobre o quadro que rola desliza o desenho e não chega ao swipe de passo", () => {
    const restore = stubLayout(309, 515);
    try {
      const { frame, onParentTouch } = renderFrame();
      fireEvent.touchStart(frame, { touches: [{ clientX: 200, clientY: 10 }] });
      fireEvent.touchEnd(frame, { changedTouches: [{ clientX: 60, clientY: 10 }] });

      expect(onParentTouch).not.toHaveBeenCalled();
    } finally {
      restore();
    }
  });

  it("quando o desenho cabe, o gesto continua chegando ao swipe de passo", () => {
    const restore = stubLayout(702, 702);
    try {
      const { frame, onParentTouch } = renderFrame();
      fireEvent.touchStart(frame, { touches: [{ clientX: 200, clientY: 10 }] });
      fireEvent.touchEnd(frame, { changedTouches: [{ clientX: 60, clientY: 10 }] });

      expect(onParentTouch).toHaveBeenCalledTimes(2);
    } finally {
      restore();
    }
  });
});
