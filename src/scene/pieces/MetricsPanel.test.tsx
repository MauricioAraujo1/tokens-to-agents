import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MetricsPanelSpec } from "../types";
import { MetricsPanel } from "./MetricsPanel";

const panel: MetricsPanelSpec = {
  piece: "metrics-panel",
  metrics: [
    { id: "latency", label: "latência", value: "120 ms" },
    { id: "tokens", label: "tokens", value: "1 024" },
    { id: "cost", label: "custo", value: "$0.004", color: "danger" },
  ],
  highlight: "tokens",
};

function renderPiece(spec: MetricsPanelSpec) {
  render(<MetricsPanel spec={spec} transition={{ from: null, animate: false }} reducedMotion />);
  return screen.getAllByRole("listitem");
}

describe("MetricsPanel", () => {
  it("renderiza um card por métrica, com rótulo e valor", () => {
    const cards = renderPiece(panel);

    expect(cards).toHaveLength(3);
    expect(within(cards[0]).getByText("latência")).toBeInTheDocument();
    expect(within(cards[0]).getByText("120 ms")).toBeInTheDocument();
    expect(within(cards[2]).getByText("$0.004")).toBeInTheDocument();
  });

  it("marca só o card em destaque com aria-current", () => {
    const cards = renderPiece(panel);

    expect(cards[1]).toHaveAttribute("aria-current", "true");
    expect(cards[0]).not.toHaveAttribute("aria-current");
    expect(cards[2]).not.toHaveAttribute("aria-current");
  });

  it("sem destaque, nenhum card tem aria-current", () => {
    const cards = renderPiece({ ...panel, highlight: undefined });

    expect(cards.filter((card) => card.hasAttribute("aria-current"))).toEqual([]);
  });

  it("usa as cores do tema: a cor da métrica no marcador e o destaque em brand-soft (THM-01.4)", () => {
    const cards = renderPiece(panel);

    expect((cards[2].querySelector("[data-swatch]") as HTMLElement).style.backgroundColor).toBe("var(--state-danger)");
    expect(cards[0].querySelector("[data-swatch]")).toBeNull();
    expect(cards[1]).toHaveClass("bg-brand-soft");
    expect(cards[0]).not.toHaveClass("bg-brand-soft");
  });

  it("o rótulo do card em destaque usa ink sobre o brand-soft, e os outros ink-muted (T136)", () => {
    const cards = renderPiece(panel);

    expect(within(cards[1]).getByText("tokens")).toHaveClass("text-ink");
    expect(within(cards[1]).getByText("tokens")).not.toHaveClass("text-muted");
    expect(within(cards[0]).getByText("latência")).toHaveClass("text-muted");
  });
});
