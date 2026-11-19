import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { setReducedMotionPreference } from "../test/reducedMotion";
import { Scene, type SceneStep } from "./Scene";
import { findPreviousPiece } from "./transition";
import type { PieceSpec, SceneSpec } from "./types";

const tokens: PieceSpec = { piece: "token-stream", id: "tokens", tokens: ["O", "gato", "sentou"], query: 1 };
const metrics: PieceSpec = { piece: "metrics-panel", metrics: [{ id: "loss", label: "loss", value: "0.42" }] };

const steps: SceneStep[] = [
  { id: "one", scene: { kind: "pieces", layout: "row", pieces: [tokens, metrics] } },
  {
    id: "two",
    scene: { kind: "pieces", layout: "row", pieces: [{ ...tokens, query: 2 }, metrics] },
  },
  {
    id: "three",
    scene: { kind: "pieces", layout: "single", pieces: [tokens] },
    alt: "Descrição escrita pelo autor",
  },
];

function renderScene(stepIndex: number) {
  const result = render(<Scene steps={steps} stepIndex={stepIndex} paused={false} />);
  const rerender = (nextIndex: number) =>
    result.rerender(<Scene steps={steps} stepIndex={nextIndex} paused={false} />);
  return { rerender };
}

function scene() {
  return screen.getByRole("figure");
}

describe("Scene", () => {
  it("mantém a cena da esquerda para a direita mesmo com a interface em RTL (preview 05)", () => {
    document.documentElement.dir = "rtl";
    renderScene(0);

    expect(scene()).toHaveAttribute("dir", "ltr");
    document.documentElement.removeAttribute("dir");
  });

  it("renderiza as peças da spec, na ordem e no layout declarados (SCN-01.1)", () => {
    renderScene(0);

    expect(scene()).toHaveAttribute("data-layout", "row");
    expect([...scene().querySelectorAll("[data-piece]")].map((element) => element.getAttribute("data-piece"))).toEqual([
      "token-stream",
      "metrics-panel",
    ]);
  });

  it("trocar o passo aplica a classe de transição (SCN-01.4)", () => {
    setReducedMotionPreference(false);
    const { rerender } = renderScene(0);
    expect(scene()).not.toHaveClass("scene-transition");

    rerender(1);

    expect(scene()).toHaveClass("scene-transition");
    expect(scene()).toHaveAttribute("data-motion", "full");
  });

  it("com movimento reduzido, trocar o passo não gera transição (SCN-01.5)", () => {
    setReducedMotionPreference(true);
    const { rerender } = renderScene(0);

    rerender(1);

    expect(scene()).not.toHaveClass("scene-transition");
    expect(scene()).toHaveAttribute("data-motion", "reduced");
  });

  it("descreve a cena no aria-label a partir dos dados do passo (SCN-01.7)", () => {
    const { rerender } = renderScene(0);

    expect(scene()).toHaveAccessibleName("Fluxo de tokens: O, gato e sentou (destaque: gato); Métricas: loss 0.42");

    rerender(1);
    expect(scene()).toHaveAccessibleName("Fluxo de tokens: O, gato e sentou (destaque: sentou); Métricas: loss 0.42");
  });

  it("usa a descrição do autor (alt) no lugar da gerada", () => {
    renderScene(2);

    expect(scene()).toHaveAccessibleName("Descrição escrita pelo autor");
  });
});

describe("findPreviousPiece", () => {
  const previous: SceneSpec = { kind: "pieces", layout: "row", pieces: [metrics, tokens] };

  it("acha a peça anterior pelo id, mesmo em outra posição", () => {
    expect(findPreviousPiece(previous, { ...tokens, query: 2 }, 0)).toBe(tokens);
  });

  it("sem id, usa a mesma posição, desde que o tipo seja o mesmo", () => {
    expect(findPreviousPiece(previous, { ...metrics, highlight: "loss" }, 0)).toBe(metrics);
    expect(findPreviousPiece(previous, { piece: "chart", kind: "bar", series: [] }, 0)).toBeNull();
  });

  it("não há peça anterior no primeiro passo nem vinda de uma cena custom", () => {
    expect(findPreviousPiece(null, tokens, 0)).toBeNull();
    expect(findPreviousPiece({ kind: "custom", id: "rag-flow" }, tokens, 0)).toBeNull();
  });
});
