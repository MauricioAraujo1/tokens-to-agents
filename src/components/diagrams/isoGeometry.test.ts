import { describe, expect, it } from "vitest";
import {
  formatNumber,
  isoPoint,
  localEllipse,
  localPolygon,
  localPolyline,
  localRoundedRect,
  rotateSegments,
  segmentsToPath,
} from "./isoGeometry";

const identity = (u: number, w: number) => ({ x: u, y: w });

describe("isoGeometry", () => {
  it("projeta no piso 2:1: i desce para a direita, j desce para a esquerda e k sobe", () => {
    expect(isoPoint(100, 100, 10, 0)).toEqual({ x: 110, y: 105 });
    expect(isoPoint(100, 100, 0, 10)).toEqual({ x: 90, y: 105 });
    expect(isoPoint(100, 100, 0, 0, 20)).toEqual({ x: 100, y: 80 });
  });

  it("um quadrado de lado s no piso vira o losango de 2s × s do diagrama", () => {
    const corners = [isoPoint(0, 0, 30, -30), isoPoint(0, 0, 30, 30), isoPoint(0, 0, -30, 30), isoPoint(0, 0, -30, -30)];

    expect(corners).toEqual([
      { x: 60, y: 0 },
      { x: 0, y: 30 },
      { x: -60, y: 0 },
      { x: 0, y: -30 },
    ]);
  });

  it("formata números com até duas casas e sem -0", () => {
    expect(formatNumber(1.005)).toBe("1");
    expect(formatNumber(2.5)).toBe("2.5");
    expect(formatNumber(-0.001)).toBe("0");
    expect(formatNumber(10)).toBe("10");
  });

  it("monta polígonos fechados e linhas abertas", () => {
    expect(segmentsToPath(localPolygon([[0, 0], [10, 0], [10, 5]]), identity)).toBe("M0 0L10 0L10 5Z");
    expect(segmentsToPath(localPolyline([[0, 0], [4, 4]]), identity)).toBe("M0 0L4 4");
  });

  it("o retângulo arredondado limita o raio à metade do lado menor", () => {
    const path = segmentsToPath(localRoundedRect(0, 0, 10, 4, 99), identity);

    expect(path.startsWith("M2 4L8 4")).toBe(true);
    expect(path.endsWith("Z")).toBe(true);
  });

  it("a elipse passa pelos quatro extremos", () => {
    const path = segmentsToPath(localEllipse(0, 0, 10, 5), identity);

    for (const point of ["10 0", "0 5", "-10 0", "0 -5"]) expect(path).toContain(point);
  });

  it("gira os pontos em torno do centro dado", () => {
    const [moved] = rotateSegments([["M", [10, 0]]], 90, 0, 0);
    if (moved[0] !== "M") throw new Error("o segmento girado deveria continuar sendo um M");

    expect(moved[1][0]).toBeCloseTo(0);
    expect(moved[1][1]).toBeCloseTo(10);
  });
});
