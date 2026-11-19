import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { cacheEntries, generationCost, opsPerToken } from "../kvCache";
import { KvCachePlayground } from "./kv-cache";

const differences = (values: readonly number[]) => values.slice(1).map((value, index) => value - values[index]);

describe("KV cache (lógica)", () => {
  it("sem cache o custo por token cresce de forma quadrática; com cache, linear", () => {
    // Contexto L = 1, 2, 3, 4: sem cache L + L² = 2, 6, 12, 20; com cache 1 + L = 2, 3, 4, 5.
    expect(generationCost(0, 4, false).perToken).toEqual([2, 6, 12, 20]);
    expect(generationCost(0, 4, true).perToken).toEqual([2, 3, 4, 5]);

    const uncached = generationCost(10, 20, false).perToken;
    const cached = generationCost(10, 20, true).perToken;
    // Quadrática: a segunda diferença é constante e positiva. Linear: a primeira diferença é constante.
    expect(new Set(differences(differences(uncached)))).toEqual(new Set([2]));
    expect(new Set(differences(cached))).toEqual(new Set([1]));
  });

  it("dobrar o contexto quase quadruplica o custo sem cache e quase dobra com cache", () => {
    expect(opsPerToken(1000, false) / opsPerToken(500, false)).toBeCloseTo(4, 2);
    expect(opsPerToken(1000, true) / opsPerToken(500, true)).toBeCloseTo(2, 2);
  });

  it("soma o custo da geração e conta uma key e um value por token no cache", () => {
    expect(generationCost(0, 4, false).total).toBe(40);
    expect(generationCost(0, 4, true).total).toBe(14);
    expect(cacheEntries(16, 16)).toBe(64);
  });
});

describe("KvCachePlayground (LAB-01.1)", () => {
  const heights = (container: HTMLElement, chart: number) =>
    [...container.querySelectorAll("[data-piece='chart']")[chart].querySelectorAll("[data-series]")].map((bar) =>
      Number(bar.getAttribute("data-height")),
    );

  it("mostra operações, tempo simulado, aceleração e memória para 16 tokens de prompt e 16 gerados", () => {
    render(<KvCachePlayground />);

    // L = 17..32: Σ(L + L²) = 392 + 9944 = 10336; Σ(1 + L) = 16 + 392 = 408.
    expect(screen.getByText("10336")).toBeInTheDocument();
    expect(screen.getByText("408")).toBeInTheDocument();
    expect(screen.getByText("206.7 ms")).toBeInTheDocument();
    expect(screen.getByText("8.2 ms")).toBeInTheDocument();
    expect(screen.getByText("25.3×").closest("li")).toHaveAttribute("aria-current", "true");
    expect(screen.getByText("64")).toBeInTheDocument();
  });

  it("os gráficos mostram a curva quadrática sem cache e a reta com cache, na mesma escala", () => {
    const { container } = render(<KvCachePlayground />);

    fireEvent.change(screen.getByRole("slider", { name: "Tokens do prompt" }), { target: { value: "1" } });
    fireEvent.change(screen.getByRole("slider", { name: "Tokens gerados" }), { target: { value: "4" } });

    // L = 2..5: sem cache 6, 12, 20, 30; com cache 3, 4, 5, 6; escala 30 = 160 px.
    const uncached = heights(container, 0);
    const cached = heights(container, 1);
    expect(uncached).toEqual([32, 64, 106.67, 160]);
    expect(cached).toEqual([16, 21.33, 26.67, 32]);
    const uncachedSteps = differences(uncached);
    expect(uncachedSteps[1]).toBeGreaterThan(uncachedSteps[0]);
    expect(uncachedSteps[2]).toBeGreaterThan(uncachedSteps[1]);
    differences(cached).forEach((step) => expect(step).toBeCloseTo(5.33, 1));
  });
});
