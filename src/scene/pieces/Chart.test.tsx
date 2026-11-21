import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ChartSpec } from "../types";
import { getPillSize } from "../../components/diagrams/ragDiagramLayout";
import { Chart } from "./Chart";
import { layoutChart, LINE_POINT_RADIUS } from "./chartLayout";

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

  // Casos da auditoria de 2026-11-20: o primeiro rótulo inclinado saía pela esquerda da viewBox.
  const auditCases: Record<string, ChartSpec> = {
    "06-02#5": {
      piece: "chart",
      kind: "bar",
      series: [
        { label: "senha antes", value: 0.24 },
        { label: "senha depois", value: 0.89 },
        { label: "entrega antes", value: 0.24 },
        { label: "entrega depois", value: 0.81 },
        { label: "devolver antes", value: 0.25 },
        { label: "devolver depois", value: 0.91 },
        { label: "pagamento antes", value: 0.24 },
        { label: "pagamento depois", value: 0.92 },
      ],
      max: 1,
      highlight: 1,
    },
    "05-04#2": {
      piece: "chart",
      kind: "bar",
      series: [
        { label: "instrução", value: 60 },
        { label: "contrato", value: 1200 },
        { label: "aditivo", value: 900 },
        { label: "e-mails", value: 700 },
        { label: "histórico", value: 300 },
        { label: "pergunta", value: 25 },
      ],
      max: 1200,
      highlight: 0,
    },
  };

  it.each(Object.keys(auditCases))("%s: cada rótulo inclinado fica inteiro dentro da viewBox (GEO-01.2)", (name) => {
    for (const font of [7, 12, 20]) {
      const layout = layoutChart(auditCases[name], font);

      if (font >= 12) expect(layout.tilt).toBe(true);
      layout.labelBoxes.forEach((box, index) => {
        expect(box.left, `${name} @${font} #${index}`).toBeGreaterThanOrEqual(0);
        expect(box.right).toBeLessThanOrEqual(layout.width);
        expect(box.top).toBeGreaterThanOrEqual(0);
        expect(box.bottom, `${name} @${font} #${index}`).toBeLessThanOrEqual(layout.height);
      });
    }
  });

  it("06-05#4: no gráfico de linha, o rótulo fica abaixo do ponto de valor zero, sem cobri-lo", () => {
    const dimensions: ChartSpec = {
      piece: "chart",
      kind: "line",
      series: [
        { label: "d = 2", value: 0 },
        { label: "d = 8", value: 0.42 },
        { label: "d = 32", value: 0.6 },
        { label: "d = 128", value: 0.85 },
        { label: "d = 512", value: 0.95 },
      ],
      max: 1,
      highlight: 0,
    };

    for (const font of [7, 12, 20]) {
      const layout = layoutChart(dimensions, font);
      const pointBottom = layout.baseline - layout.heightOf(0) + LINE_POINT_RADIUS.highlighted;

      layout.labelBoxes.forEach((box, index) => expect(box.top, `@${font} #${index}`).toBeGreaterThan(pointBottom));
    }
  });

  it("a pílula de referência não cobre nenhuma barra (GEO-01.4)", () => {
    const meta: ChartSpec = {
      piece: "chart",
      kind: "bar",
      series: [
        { label: "1 bi", value: 0.7 },
        { label: "2 bi", value: 1.4 },
        { label: "5 bi", value: 3.5 },
        { label: "10 bi", value: 7 },
        { label: "20 bi", value: 14 },
      ],
      cutoff: { mode: "threshold", value: 5.65, label: "próprio US$ 5.650" },
    };

    for (const font of [7, 12, 20]) {
      const layout = layoutChart(meta, font);
      const pill = getPillSize("próprio US$ 5.650", layout.labelFont);
      const center = layout.cutoffPill;
      if (!center) throw new Error("sem pílula");
      meta.series.forEach((point, index) => {
        const barLeft = layout.centerX(index) - 14;
        const barRight = layout.centerX(index) + 14;
        const barTop = layout.baseline - layout.heightOf(point.value);
        const overlap =
          center.x - pill.width / 2 < barRight &&
          center.x + pill.width / 2 > barLeft &&
          center.y - pill.height / 2 < layout.baseline &&
          center.y + pill.height / 2 > barTop;
        expect(overlap, `barra ${index} @${font}`).toBe(false);
      });
      expect(center.x + pill.width / 2).toBeLessThanOrEqual(layout.width);
    }
  });

  it("os rótulos usam a fonte da cena, em unidades da viewBox", () => {
    const { container } = renderPiece(distribution);

    expect((container.querySelector('[data-label="0"]') as SVGTextElement).style.fontSize).toBe("11px");
  });

  it("no modo linha, liga um ponto por valor", () => {
    const { container } = renderPiece({ ...distribution, kind: "line" });

    expect(container.querySelector("[data-line]")?.getAttribute("points")?.split(" ")).toHaveLength(5);
    expect(container.querySelectorAll("[data-series] circle")).toHaveLength(5);
  });
});
