import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useHorizontalOverflow } from "./useHorizontalOverflow";

/** Elemento com larguras controladas pelo teste; o jsdom não faz layout. */
function frameOf(client: number, scroll: number) {
  const element = document.createElement("div");
  element.append(document.createElement("svg"));
  const size = { client, scroll };
  Object.defineProperty(element, "clientWidth", { get: () => size.client });
  Object.defineProperty(element, "scrollWidth", { get: () => size.scroll });
  return { element, size };
}

describe("useHorizontalOverflow", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sem ResizeObserver, não rola", () => {
    vi.stubGlobal("ResizeObserver", undefined);
    const ref = { current: frameOf(309, 515).element };
    const { result } = renderHook(() => useHorizontalOverflow(ref));

    expect(result.current).toBe(false);
  });

  it("acompanha o conteúdo: rola quando passa do quadro e para quando volta a caber", () => {
    let notify: () => void = () => undefined;
    const observed: Element[] = [];
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          notify = callback;
        }
        observe(target: Element) {
          observed.push(target);
        }
        disconnect() {}
      },
    );
    const frame = frameOf(309, 515);
    const ref = { current: frame.element };
    const { result } = renderHook(() => useHorizontalOverflow(ref));

    expect(result.current).toBe(true);
    // Observa o quadro e o desenho: a largura mínima do SVG muda sem o quadro mudar.
    expect(observed).toEqual([frame.element, frame.element.firstElementChild]);

    frame.size.client = 702;
    frame.size.scroll = 702;
    act(() => notify());
    expect(result.current).toBe(false);
  });

  it("um px de arredondamento não conta como rolagem", () => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
    const ref = { current: frameOf(309, 310).element };
    const { result } = renderHook(() => useHorizontalOverflow(ref));

    expect(result.current).toBe(false);
  });
});
