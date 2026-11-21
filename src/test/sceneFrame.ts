import { vi } from "vitest";

/**
 * Simula o navegador num quadro de cena de `frame` px (o jsdom não faz layout): o SVG ocupa o quadro
 * ou a própria largura mínima, o que for maior, e o quadro (`SceneScroll`) rola quando o SVG passa
 * dele. Devolve a função que desfaz a simulação.
 */
export function stubSceneFrame(frame: number): () => void {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  const svgWidth = (svg: Element) => Math.max(frame, Number.parseFloat((svg as SVGSVGElement).style.minWidth) || 0);
  const rect = vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    return { width: this instanceof SVGSVGElement ? svgWidth(this) : frame, height: 2000 } as DOMRect;
  });
  const client = vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(frame);
  const scroll = vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockImplementation(function (this: HTMLElement) {
    const svg = this.querySelector("svg");
    return svg ? svgWidth(svg) : frame;
  });
  return () => {
    rect.mockRestore();
    client.mockRestore();
    scroll.mockRestore();
    vi.unstubAllGlobals();
  };
}

/** Tamanho na tela, em px, de cada texto do primeiro SVG do contêiner. */
export function svgTextOnScreen(container: HTMLElement): number[] {
  const svg = container.querySelector("svg") as SVGSVGElement;
  const scale = svg.getBoundingClientRect().width / Number(svg.getAttribute("viewBox")?.split(" ")[2]);
  return [...svg.querySelectorAll("text")].map((text) => Number.parseFloat(text.style.fontSize) * scale);
}
