import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TokenStreamSpec } from "../types";
import { TokenStream } from "./TokenStream";
import { boxesOverlap, layoutTokenStream, MAX_ARC_WIDTH } from "./tokenStreamLayout";

const sentence: TokenStreamSpec = {
  piece: "token-stream",
  tokens: ["The", "cat", "sat", "on", "the", "mat"],
  query: 2,
  keys: [0, 1],
  arcs: [
    { from: 2, to: 1, weight: 0.8, label: "0.80" },
    { from: 2, to: 0, weight: 0.2, label: "0.20" },
  ],
  bars: [0.2, 0.8, 1, 0, 0, 0],
};

function renderPiece(spec: TokenStreamSpec) {
  const { container } = render(<TokenStream spec={spec} transition={{ from: null, animate: false }} reducedMotion />);
  return container;
}

describe("TokenStream", () => {
  it("desenha um token por item da fila, na ordem", () => {
    const container = renderPiece(sentence);

    const tokens = [...container.querySelectorAll("[data-token]")];
    expect(tokens).toHaveLength(6);
    expect(tokens.map((token) => token.textContent)).toEqual(["The", "cat", "sat", "on", "the", "mat"]);
  });

  it("destaca a query e as keys, e só elas", () => {
    const container = renderPiece(sentence);
    const roles = [...container.querySelectorAll("[data-token]")].map((token) => token.getAttribute("data-role"));

    expect(roles).toEqual(["key", "key", "query", "token", "token", "token"]);
  });

  it("marca a query e as keys sob os tokens, como no preview 01", () => {
    const container = renderPiece(sentence);
    const marks = [...container.querySelectorAll("[data-mark]")].map((mark) => [mark.getAttribute("data-mark"), mark.textContent]);

    expect(marks).toEqual([
      ["key", "↑ key"],
      ["key", "↑ key"],
      ["query", "↑ query"],
    ]);
    expect(renderPiece({ piece: "token-stream", tokens: ["a", "b"] }).querySelectorAll("[data-mark]")).toHaveLength(0);
  });

  it("desenha os arcos com espessura proporcional ao peso e o rótulo de cada um", () => {
    const container = renderPiece(sentence);
    const width = (arc: string) =>
      Number.parseFloat((container.querySelector(`[data-arc="${arc}"]`) as SVGPathElement).style.strokeWidth);

    expect(width("2-1")).toBeCloseTo(0.8 * MAX_ARC_WIDTH);
    expect(width("2-0")).toBeCloseTo(0.2 * MAX_ARC_WIDTH);
    expect(width("2-1") / width("2-0")).toBeCloseTo(4);
    expect(container.querySelector('[data-arc-label="2-1"]')).toHaveTextContent("0.80");
    expect(container.querySelector('[data-arc-label="2-0"]')).toHaveTextContent("0.20");
  });

  it("desenha as barras opcionais com altura proporcional ao valor", () => {
    const container = renderPiece(sentence);
    const height = (index: number) => Number(container.querySelector(`[data-bar="${index}"]`)?.getAttribute("height"));

    expect(container.querySelectorAll("[data-bar]")).toHaveLength(6);
    expect(height(2)).toBeGreaterThan(0);
    expect(height(1) / height(2)).toBeCloseTo(0.8);
    expect(height(3)).toBe(0);
    expect(renderPiece({ ...sentence, bars: undefined }).querySelectorAll("[data-bar]")).toHaveLength(0);
  });

  it("não sobrepõe rótulos de tokens e de arcos com até 12 tokens", () => {
    const tokens = ["Attention", "is", "all", "you", "need", "for", "sequence", "transduction", "with", "long", "range", "deps"];
    const spec: TokenStreamSpec = {
      piece: "token-stream",
      tokens,
      query: 6,
      arcs: tokens.map((_, index) => ({ from: 6, to: index, weight: (index + 1) / 12, label: ((index + 1) / 12).toFixed(2) })),
    };
    const layout = layoutTokenStream(spec);
    const boxes = [
      ...layout.tokens.map((token) => token.box),
      ...layout.arcs.flatMap((arc) => (arc.label ? [arc.label.box] : [])),
    ];

    expect(boxes).toHaveLength(24);
    boxes.forEach((box, index) => {
      boxes.slice(index + 1).forEach((other) => expect(boxesOverlap(box, other)).toBe(false));
    });
  });

  it("o texto em info usa o tom de texto: a marca da key e a pílula com texto claro (T136)", () => {
    const container = renderPiece(sentence);
    const keyMark = container.querySelector('[data-mark="key"]') as SVGTextElement;
    const keyPill = container.querySelector('[data-arc-label="2-0"] rect') as SVGRectElement;

    expect(keyMark.style.fill).toBe("var(--state-info-ink)");
    expect(keyPill.style.fill).toBe("var(--state-info-ink)");
  });

  describe("abaixo de 768 px (preview 06, T138)", () => {
    beforeEach(() => {
      window.matchMedia = vi.fn((query: string) => ({
        matches: query === "(max-width: 767.98px)",
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })) as unknown as typeof window.matchMedia;
    });

    it("troca a cena em SVG por uma lista com uma linha por token: chip, barra e valor", () => {
      const container = renderPiece(sentence);
      const list = container.querySelector('[data-variant="list"]') as HTMLElement;

      expect(container.querySelector("svg")).toBeNull();
      expect(list.querySelectorAll("li[data-token]")).toHaveLength(sentence.tokens.length);
      expect(list.querySelectorAll("[data-bar]")).toHaveLength(sentence.tokens.length);
      const key = list.querySelector('[data-token="1"]') as HTMLElement;
      expect(key).toHaveAttribute("data-role", "key");
      expect(key).toHaveTextContent("cat0.80");
    });

    it("ordena as linhas do maior para o menor valor, com a barra proporcional", () => {
      const container = renderPiece(sentence);
      const rows = [...container.querySelectorAll("li[data-token]")].map((row) => Number(row.getAttribute("data-token")));
      const width = (index: number) => (container.querySelector(`[data-bar="${index}"]`) as HTMLElement).style.width;

      expect(rows.slice(0, 3)).toEqual([2, 1, 0]);
      expect(width(2)).toBe("max(2px, 75%)");
      expect(width(1)).toBe("max(2px, 60%)");
    });

    it("o número da linha é o rótulo do arco; sem arcos rotulados, é o valor da barra", () => {
      const labelled = renderPiece(sentence);
      expect(labelled.querySelector('[data-token="2"]')?.textContent).toBe("sat");

      const barsOnly = renderPiece({ piece: "token-stream", tokens: ["a", "b"], bars: [0.5, 0.25] });
      expect([...barsOnly.querySelectorAll("li[data-token]")].map((row) => row.textContent)).toEqual(["a0,5", "b0,25"]);
    });

    it("sem barras nem arcos, mostra os tokens como chips na ordem", () => {
      const container = renderPiece({ piece: "token-stream", tokens: ["a", "b", "c"] });

      expect([...container.querySelectorAll("li[data-token]")].map((row) => row.textContent)).toEqual(["a", "b", "c"]);
      expect(container.querySelectorAll("[data-bar]")).toHaveLength(0);
    });
  });

  it("usa só cores do tema, via variáveis CSS (THM-01.4)", () => {
    const container = renderPiece(sentence);
    const styles = [...container.querySelectorAll("[style]")].map((element) => element.getAttribute("style") ?? "");

    expect(styles.join(" ")).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(/i);
    expect(styles.some((style) => style.includes("var(--accent-brand)"))).toBe(true);
  });
});
