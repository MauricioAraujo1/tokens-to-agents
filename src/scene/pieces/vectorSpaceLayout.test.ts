import { describe, expect, it } from "vitest";
import type { VectorSpaceSpec } from "../types";
import {
  crosses,
  layoutVectorSpace,
  nearestNeighbors,
  placeDistancePill,
  placePointLabels,
  VECTOR_SPACE_SIZE,
  type LabelBox,
} from "./vectorSpaceLayout";

// Casos da auditoria de 2026-11-20: rótulos sobrepostos (00-04#2) e cortados na borda (03-05#6).
const auditCases: Record<string, VectorSpaceSpec> = {
  "00-04#2": {
    piece: "vector-space",
    points: [
      { id: "a0", label: "gato", coords: [3.5, 5.5] },
      { id: "a1", label: "gato", coords: [4, 6] },
      { id: "a2", label: "gato", coords: [4.5, 5] },
      { id: "a3", label: "gato", coords: [5, 6.5] },
      { id: "a4", label: "gato", coords: [3, 6.2] },
      { id: "a5", label: "gato", coords: [5.5, 5.8] },
      { id: "a6", label: "cão", coords: [8, 9] },
      { id: "a7", label: "cão", coords: [9, 10.5] },
      { id: "a8", label: "cão", coords: [10, 9.5] },
      { id: "a9", label: "cão", coords: [11, 11] },
      { id: "a10", label: "cão", coords: [7.5, 10] },
      { id: "a11", label: "cão", coords: [12, 10.5] },
      { id: "new", label: "?", coords: [6.5, 7.5] },
    ],
    query: "new",
    neighbors: 3,
  },
  "03-05#6": {
    piece: "vector-space",
    points: [
      { id: "homem", label: "homem", coords: [1, 0.5] },
      { id: "mulher", label: "mulher", coords: [1, 2] },
      { id: "rei", label: "rei", coords: [3, 0.8] },
      { id: "rainha", label: "rainha", coords: [3.1, 2.2] },
      { id: "predicted", label: "rei − homem + mulher", coords: [3, 2.3] },
    ],
    vectors: [
      { from: "homem", to: "mulher" },
      { from: "rei", to: "rainha" },
    ],
    distance: { from: "predicted", to: "rainha", label: "0,14" },
  },
};

function labelsOf(spec: VectorSpaceSpec, font: number): LabelBox[] {
  const neighbors = new Set(nearestNeighbors(spec));
  const { points } = layoutVectorSpace(spec);
  return placePointLabels(
    points.map(({ point, x, y }) => ({ x, y, radius: point.id === spec.query ? 7 : neighbors.has(point.id) ? 11 : 5, label: point.label })),
    font,
  );
}

function overlap(a: LabelBox, b: LabelBox): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

describe("placePointLabels", () => {
  // 6,7 é a fonte dos rótulos a 1440 (11 px numa peça com escala 1,63); 11 é a de referência.
  it.each(Object.keys(auditCases))("%s: rótulos dentro do quadro e sem sobreposição (COL-01.5, COL-01.6)", (name) => {
    for (const font of [6.7, 11]) {
      const labels = labelsOf(auditCases[name], font);
      labels.forEach((label, index) => {
        expect(label.left, `${name} @${font} #${index}`).toBeGreaterThanOrEqual(0);
        expect(label.right, `${name} @${font} #${index}`).toBeLessThanOrEqual(VECTOR_SPACE_SIZE);
        expect(label.top).toBeGreaterThanOrEqual(0);
        expect(label.bottom).toBeLessThanOrEqual(VECTOR_SPACE_SIZE);
        for (const other of labels.slice(index + 1)) expect(overlap(label, other), `${name} @${font}`).toBe(false);
      });
    }
  });

  it("03-05#6: a pílula de distância não cobre os pontos que liga", () => {
    const spec = auditCases["03-05#6"];
    const { points } = layoutVectorSpace(spec);
    const marks = points.map(({ x, y }) => ({ x, y, radius: 5 }));
    const from = points.find((point) => point.point.id === "predicted");
    const to = points.find((point) => point.point.id === "rainha");
    if (!from || !to) throw new Error("caso incompleto");
    const pill = { width: 52, height: 22 };
    const center = placeDistancePill({ x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }, pill, marks);

    for (const point of [from, to]) {
      const inside = Math.abs(point.x - center.x) < pill.width / 2 + 5 && Math.abs(point.y - center.y) < pill.height / 2 + 5;
      expect(inside).toBe(false);
    }
    expect(center.x).toBeCloseTo((from.x + to.x) / 2, 6);
  });

  it("perto da borda direita, o rótulo passa para a esquerda do ponto", () => {
    const [label] = placePointLabels([{ x: 310, y: 160, radius: 5, label: "longe" }], 11);

    expect(label.right).toBeLessThan(310);
  });

  it("perto da borda de cima, o rótulo desce para baixo do ponto", () => {
    const [label] = placePointLabels([{ x: 100, y: 4, radius: 5, label: "topo" }], 11);

    expect(label.top).toBeGreaterThan(4);
  });

  it("longe das bordas e de outros pontos, o rótulo fica à direita e acima, como no design", () => {
    const [label] = placePointLabels([{ x: 100, y: 160, radius: 5, label: "rei" }], 11);

    expect(label.left).toBeGreaterThan(100);
    expect(label.bottom).toBeLessThan(160);
  });

  it("01-06#5: uma linha que passa rente ao rótulo também conta, e o rótulo vai para outro lado", () => {
    const point = { x: 100, y: 160, radius: 5, label: "a3" };
    const [free] = placePointLabels([point], 11);
    // Reta paralela à base do rótulo, 2 unidades abaixo dela: não cruza a caixa estimada, mas encosta no texto.
    const rente = { from: { x: 0, y: free.bottom + 2 }, to: { x: 320, y: free.bottom + 2 } };
    const [label] = placePointLabels([point], 11, [rente]);
    const gap = Math.min(Math.abs(label.top - rente.from.y), Math.abs(label.bottom - rente.from.y));

    expect(label.top > rente.from.y || label.bottom < rente.from.y).toBe(true);
    expect(gap).toBeGreaterThanOrEqual(3);
  });

  it("08-08#2: o eixo que cruza um rótulo baixo conta, mesmo entre pontos de amostra da linha", () => {
    // Cena alta (576 px para 320 unidades): o rótulo tem fonte de 6 unidades e 6,9 de altura. A caixa com
    // folga fica entre dois pontos de amostra do eixo (26,7 e 40), e a amostragem não via o cruzamento.
    const axis = { from: { x: 110, y: 0 }, to: { x: 110, y: 320 } };
    const [label] = placePointLabels([{ x: 90, y: 41.5, radius: 5, label: "viagens" }], 6, [axis]);

    expect(label.right < 110 || label.left > 110).toBe(true);
    expect(crosses(axis, { left: 100, right: 120, top: 28, bottom: 38 })).toBe(true);
    expect(crosses(axis, { left: 111, right: 130, top: 28, bottom: 38 })).toBe(false);
    expect(crosses({ from: { x: 0, y: 0 }, to: { x: 50, y: 50 } }, { left: 60, right: 80, top: 0, bottom: 100 })).toBe(false);
    expect(crosses({ from: { x: 0, y: 100 }, to: { x: 100, y: 0 } }, { left: 40, right: 60, top: 40, bottom: 60 })).toBe(true);
  });

  it("com as 8 posições junto do ponto cortadas por linhas, o rótulo vai um pouco mais longe, sem linha", () => {
    // Pontos agrupados entre vetores (04-09#3): faixas de linhas acima, através e abaixo do ponto.
    const point = { x: 100, y: 100, radius: 5, label: "doc" };
    const lines = [88, 94, 100, 106, 112].map((y) => ({ from: { x: 60, y }, to: { x: 140, y } }));
    const [label] = placePointLabels([point], 11, lines);
    const crossed = lines.some(({ from }) => from.y > label.top - 3 && from.y < label.bottom + 3 && label.right > 60 && label.left < 140);

    expect(crossed).toBe(false);
    expect(label.top).toBeGreaterThanOrEqual(0);
    // Continua perto do ponto: no máximo duas alturas de rótulo além da posição junto dele.
    expect(Math.hypot(label.left + (label.right - label.left) / 2 - point.x, label.top + (label.bottom - label.top) / 2 - point.y)).toBeLessThan(60);
  });
});
