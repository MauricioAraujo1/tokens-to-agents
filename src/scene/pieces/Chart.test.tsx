import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ChartSpec } from "../types";
import { Chart } from "./Chart";

const distribution: ChartSpec = {
  piece: "chart",
  kind: "bar",
  series: [
    { label: "gato", value: 0.5 },
    { label: "cão", value: 0.2 },
    { label: "rato", value: 0.15 },
    { label: "boi", value: 0.1 },
    { label: "sol", value: 0.05 },
  ],
};

function renderPiece(spec: ChartSpec) {
  const { container } = render(<Chart spec={spec} transition={{ from: null, animate: false }} reducedMotion />);
  const height = (index: number) => Number(container.querySelector(`[data-series="${index}"]`)?.getAttribute("data-height"));
  const faded = () =>
    [...container.querySelectorAll('[data-faded="true"]')].map((element) => Number(element.getAttribute("data-series")));
  return { container, height, faded };
}

describe("Chart", () => {
  it("desenha a altura de cada barra proporcional ao valor", () => {
    const { height } = renderPiece(distribution);

    expect(height(0)).toBeGreaterThan(0);
    expect(height(1) / height(0)).toBeCloseTo(0.4);
    expect(height(4) / height(0)).toBeCloseTo(0.1);
  });

  it("rótulos curtos ficam retos; longos ficam inclinados e a cena ganha altura para eles", () => {
    const short = renderPiece(distribution).container;
    const long = renderPiece({ ...distribution, series: distribution.series.map((point) => ({ ...point, label: `${point.label}-relatório` })) }).container;
    const viewHeight = (container: Element) => Number(container.querySelector("svg")?.getAttribute("viewBox")?.split(" ")[3]);

    expect(short.querySelector('[data-label="0"]')).not.toHaveAttribute("transform");
    expect(long.querySelector('[data-label="0"]')?.getAttribute("transform")).toMatch(/^rotate\(-35 /);
    expect(viewHeight(long)).toBeGreaterThan(viewHeight(short));
  });

  it("com `max` declarado, a escala vai até ele", () => {
    const { height } = renderPiece({ ...distribution, max: 1 });

    expect(height(0) / height(1)).toBeCloseTo(2.5);
    expect(height(0)).toBeCloseTo(renderPiece(distribution).height(0) / 2);
  });

  it("abaixo do corte só a barra esmaece; o rótulo fica com opacidade cheia (T136)", () => {
    const { container } = renderPiece({ ...distribution, cutoff: { mode: "top-p", value: 0.7 } });
    const series = container.querySelector('[data-series="4"]') as SVGGElement;
    const label = series.querySelector("text") as SVGTextElement;
    const bar = series.querySelector("rect") as SVGRectElement;

    expect(series).toHaveAttribute("data-faded", "true");
    expect(series.style.opacity).toBe("");
    expect((bar.parentElement as unknown as SVGGElement).style.opacity).toBe("0.3");
    expect(label.closest('[style*="opacity"]')).toBeNull();
  });

  it("top-p mantém as maiores barras até a soma chegar a p e esmaece as outras", () => {
    const { container, faded } = renderPiece({ ...distribution, cutoff: { mode: "top-p", value: 0.7, label: "p = 0.7" } });

    expect(faded()).toEqual([2, 3, 4]);
    expect(container.querySelector('[data-cutoff="top-p"]')).toHaveTextContent("p = 0.7");
  });

  it("top-p inclui a barra que cruza o limite", () => {
    const { faded } = renderPiece({ ...distribution, cutoff: { mode: "top-p", value: 0.75 } });

    expect(faded()).toEqual([3, 4]);
  });

  it("threshold desenha a linha de corte na altura do valor e esmaece as barras abaixo dela", () => {
    const { container, faded, height } = renderPiece({ ...distribution, cutoff: { mode: "threshold", value: 0.15 } });
    const cutoffY = Number(container.querySelector("[data-cutoff]")?.getAttribute("data-cutoff-y"));
    const barTopY = Number(container.querySelector('[data-series="2"] rect')?.getAttribute("y"));

    expect(faded()).toEqual([3, 4]);
    expect(cutoffY).toBeCloseTo(barTopY);
    expect(height(2)).toBeGreaterThan(height(3));
  });

  it("sem corte, nenhuma barra fica esmaecida e não há linha", () => {
    const { container, faded } = renderPiece(distribution);

    expect(faded()).toEqual([]);
    expect(container.querySelector("[data-cutoff]")).toBeNull();
  });

  it("destaca a barra declarada", () => {
    const { container } = renderPiece({ ...distribution, highlight: 1 });

    expect([...container.querySelectorAll('[data-highlight="true"]')].map((element) => element.getAttribute("data-series"))).toEqual(["1"]);
  });

  it("no modo linha, liga um ponto por valor", () => {
    const { container } = renderPiece({ ...distribution, kind: "line" });

    expect(container.querySelector("[data-line]")?.getAttribute("points")?.split(" ")).toHaveLength(5);
    expect(container.querySelectorAll("[data-series] circle")).toHaveLength(5);
  });
});
