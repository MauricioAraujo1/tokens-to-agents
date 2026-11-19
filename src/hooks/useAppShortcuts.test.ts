import { fireEvent, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAppShortcuts } from "./useAppShortcuts";

function setup() {
  const handlers = {
    onPrevious: vi.fn(),
    onNext: vi.fn(),
    onTogglePlay: vi.fn(),
    onRestart: vi.fn(),
  };
  renderHook(() => useAppShortcuts({ isNavigationEnabled: true, ...handlers }));
  return handlers;
}

function mount<T extends HTMLElement>(element: T): T {
  document.body.append(element);
  element.focus();
  return element;
}

afterEach(() => {
  document.body.replaceChildren();
  document.documentElement.removeAttribute("dir");
});

describe("useAppShortcuts", () => {
  it("← volta um passo e → avança um passo (LES-01.2, LES-01.3)", () => {
    const handlers = setup();

    fireEvent.keyDown(document.body, { key: "ArrowLeft" });
    expect(handlers.onPrevious).toHaveBeenCalledTimes(1);
    expect(handlers.onNext).not.toHaveBeenCalled();

    fireEvent.keyDown(document.body, { key: "ArrowRight" });
    expect(handlers.onNext).toHaveBeenCalledTimes(1);
    expect(handlers.onPrevious).toHaveBeenCalledTimes(1);
  });

  it('com dir="rtl", ← avança e → volta, no sentido do layout espelhado (I18N-01.4)', () => {
    document.documentElement.dir = "rtl";
    const handlers = setup();

    fireEvent.keyDown(document.body, { key: "ArrowLeft" });
    expect(handlers.onNext).toHaveBeenCalledTimes(1);
    expect(handlers.onPrevious).not.toHaveBeenCalled();

    fireEvent.keyDown(document.body, { key: "ArrowRight" });
    expect(handlers.onPrevious).toHaveBeenCalledTimes(1);
    expect(handlers.onNext).toHaveBeenCalledTimes(1);
  });

  const typingTargets: Array<[string, () => HTMLElement]> = [
    ["input de texto", () => Object.assign(document.createElement("input"), { type: "text" })],
    ["textarea", () => document.createElement("textarea")],
    [
      "elemento contenteditable",
      () => {
        const element = document.createElement("div");
        element.setAttribute("contenteditable", "true");
        element.tabIndex = 0;
        return element;
      },
    ],
  ];

  for (const [label, create] of typingTargets) {
    it(`ignora ←, →, R e Space com o foco num ${label} (LES-01.9)`, () => {
      const handlers = setup();
      const target = mount(create());

      for (const key of ["ArrowLeft", "ArrowRight", "r", " "]) {
        fireEvent.keyDown(target, { key });
      }

      expect(handlers.onPrevious).not.toHaveBeenCalled();
      expect(handlers.onNext).not.toHaveBeenCalled();
      expect(handlers.onRestart).not.toHaveBeenCalled();
      expect(handlers.onTogglePlay).not.toHaveBeenCalled();
    });
  }
});
