import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { attentionWeightsContent } from "../../content/playgrounds/attention-weights";
import { attentionRow } from "../attention";
import { AttentionWeightsPlayground } from "./attention-weights";

describe("attention (lógica)", () => {
  it("pontua q · k / √d, aplica softmax e soma os valores com esses pesos", () => {
    const identity = [
      [1, 0],
      [0, 1],
    ];
    const row = attentionRow([1, 0], identity, identity);

    // q·k = [1, 0]; ÷ √2 = [0.7071, 0]; softmax = e^0.7071 / (e^0.7071 + 1) = 0.6698.
    expect(row.scores[0]).toBeCloseTo(0.70711, 5);
    expect(row.scores[1]).toBe(0);
    expect(row.weights[0]).toBeCloseTo(0.66976, 5);
    expect(row.weights[1]).toBeCloseTo(0.33024, 5);
    expect(row.output[0]).toBeCloseTo(0.66976, 5);
    expect(row.output[1]).toBeCloseTo(0.33024, 5);
  });

  it.each(attentionWeightsContent.tokens.map((entry, index) => [entry.token, index] as const))(
    "os pesos da query “%s” somam 1",
    (_, index) => {
      const keys = attentionWeightsContent.tokens.map((entry) => entry.k);
      const { weights } = attentionRow(attentionWeightsContent.tokens[index].q, keys, keys);

      expect(weights.reduce((total, weight) => total + weight, 0)).toBeCloseTo(1, 10);
      expect(weights.every((weight) => weight > 0 && weight < 1)).toBe(true);
    },
  );
});

describe("AttentionWeightsPlayground (LAB-01.1)", () => {
  const displayedWeights = (container: HTMLElement) =>
    [...container.querySelectorAll("[data-key-row] td:last-child")].map((cell) => Number(cell.textContent));

  it("abre na query “fugiu”, com o rato como key mais pesada e os pesos somando 1", () => {
    const { container } = render(<AttentionWeightsPlayground />);

    expect(container.querySelector("[data-row-label='0']")).toHaveTextContent("fugiu");
    expect(container.querySelector("[data-cell][data-highlight]")).toHaveAttribute("data-cell", "0-4");
    expect(container.querySelector("[data-token][data-role='query']")).toHaveAttribute("data-token", "6");
    expect(container.querySelector("[data-token][data-role='key']")).toHaveAttribute("data-token", "4");
    expect(screen.getByText("Soma dos pesos: 1.00")).toBeInTheDocument();
    const weights = displayedWeights(container);
    expect(weights).toHaveLength(7);
    expect(weights.reduce((total, weight) => total + weight, 0)).toBeCloseTo(1, 1);
    expect(weights[4]).toBeGreaterThan(weights[1]);
  });

  it("trocar a query atualiza a linha da matriz, os arcos e a tabela", () => {
    const { container } = render(<AttentionWeightsPlayground />);
    const before = container.querySelector("[data-cell='0-4']")?.getAttribute("data-intensity");
    const weightsBefore = displayedWeights(container);

    fireEvent.change(screen.getByRole("combobox", { name: "Token de query" }), { target: { value: "1" } });

    // gata: q·k = viu 1.8 é o maior.
    expect(container.querySelector("[data-row-label='0']")).toHaveTextContent("gata");
    expect(container.querySelector("[data-cell][data-highlight]")).toHaveAttribute("data-cell", "0-2");
    expect(container.querySelector("[data-cell='0-4']")?.getAttribute("data-intensity")).not.toBe(before);
    expect(container.querySelector("[data-arc='1-2']")).not.toBeNull();
    expect(container.querySelector("[data-arc='6-4']")).toBeNull();
    expect(screen.getByRole("table", { name: "Pontuações e pesos da query “gata”" })).toBeInTheDocument();
    expect(displayedWeights(container)).not.toEqual(weightsBefore);
    expect(screen.getByText("Soma dos pesos: 1.00")).toBeInTheDocument();
  });
});
