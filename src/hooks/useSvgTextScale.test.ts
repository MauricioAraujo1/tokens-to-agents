import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSvgTextScale } from "./useSvgTextScale";

const VIEWBOX = { width: 1000, height: 250 };

/** SVG com tamanho controlado pelo teste; o jsdom não faz layout. */
function svgOfWidth(initialWidth: number) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  element.setAttribute("viewBox", `0 0 ${VIEWBOX.width} ${VIEWBOX.height}`);
  let width = initialWidth;
  element.getBoundingClientRect = () => ({ width, height: (width * VIEWBOX.height) / VIEWBOX.width }) as DOMRect;
  return { element, resize: (next: number) => (width = next) };
}

describe("useSvgTextScale", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("devolve escala 1 e fonte de 12 unidades sem ResizeObserver", () => {
    vi.stubGlobal("ResizeObserver", undefined);
    const ref = { current: svgOfWidth(500).element };
    const { result } = renderHook(() => useSvgTextScale(ref, () => VIEWBOX));

    expect(result.current).toEqual({ scale: 1, font: 12, box: null });
  });

  it("recalcula a escala e a fonte quando o ResizeObserver dispara", () => {
    let notify: () => void = () => undefined;
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          notify = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    const svg = svgOfWidth(500);
    const ref = { current: svg.element };
    const { result } = renderHook(() => useSvgTextScale(ref, () => VIEWBOX));

    expect(result.current.scale).toBeCloseTo(0.5, 6);
    expect(result.current.font * result.current.scale).toBeCloseTo(12, 1);

    svg.resize(1500);
    act(() => notify());

    expect(result.current.scale).toBeCloseTo(1.5, 6);
    expect(result.current.font * result.current.scale).toBeCloseTo(12, 1);
  });

  it("com `minFont`, não amplia o desenho: a fonte para no mínimo e o SVG ganha largura máxima", () => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
    const ref = { current: svgOfWidth(3000).element };
    const { result } = renderHook(() => useSvgTextScale(ref, () => VIEWBOX, 12, undefined, 12));

    expect(result.current.font).toBe(12);
    expect(result.current.maxWidth).toBeCloseTo(VIEWBOX.width, 6);
  });
});
