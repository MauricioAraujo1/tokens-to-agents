import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { sampleToken, samplingDistribution, seededRandom, softmaxWithTemperature } from "../sampling";
import { SamplingPlayground } from "./sampling";

const FIXED = [
  { token: "a", probability: 0.5 },
  { token: "b", probability: 0.3 },
  { token: "c", probability: 0.1 },
  { token: "d", probability: 0.06 },
  { token: "e", probability: 0.04 },
];
const ALL = { temperature: 1, topK: FIXED.length, topP: 1 };

/** Sequência fixa de sorteios, para conferir à mão o token de cada um. */
const sequence = (...draws: number[]) => {
  let index = 0;
  return () => draws[index++];
};

describe("amostragem (lógica)", () => {
  it("T = 0 põe toda a massa no maior logit", () => {
    expect(softmaxWithTemperature([0.1, 2, -1], 0)).toEqual([0, 1, 0]);
  });

  it("T → 0 concentra no topo; T = 1 devolve a distribuição-base; T = 2 espalha", () => {
    const cold = samplingDistribution(FIXED, { ...ALL, temperature: 0.1 });
    expect(cold[0].token).toBe("a");
    expect(cold[0].probability).toBeGreaterThan(0.99);

    const base = samplingDistribution(FIXED, ALL);
    base.forEach((row, index) => expect(row.probability).toBeCloseTo(FIXED[index].probability, 10));

    const hot = samplingDistribution(FIXED, { ...ALL, temperature: 2 });
    expect(hot[0].probability).toBeLessThan(0.5);
    expect(hot[4].probability).toBeGreaterThan(0.04);
  });

  it("top-p 0.95 mantém o menor conjunto com soma ≥ 0.95 e renormaliza", () => {
    const rows = samplingDistribution(FIXED, { ...ALL, topP: 0.95 });

    // .5 + .3 + .1 = .9 não chega a .95; com o "d" chega a .96.
    expect(rows.map((row) => row.cut)).toEqual([null, null, null, null, "top-p"]);
    expect(rows[3].cumulative).toBeCloseTo(0.96, 10);
    expect(rows[0].final).toBeCloseTo(0.5 / 0.96, 10);
    expect(rows[4].final).toBe(0);
    expect(rows.reduce((total, row) => total + row.final, 0)).toBeCloseTo(1, 10);
  });

  it("top-k mantém só os k mais prováveis", () => {
    const rows = samplingDistribution(FIXED, { ...ALL, topK: 2 });

    expect(rows.map((row) => row.cut)).toEqual([null, null, "top-k", "top-k", "top-k"]);
    expect(rows[1].final).toBeCloseTo(0.3 / 0.8, 10);
  });

  it("o sorteio segue a probabilidade acumulada dos tokens que ficaram", () => {
    const rows = samplingDistribution(FIXED, ALL);
    const random = sequence(0.1, 0.6, 0.85, 0.97);

    expect([1, 2, 3, 4].map(() => sampleToken(rows, random))).toEqual(["a", "b", "c", "e"]);
  });

  it("o RNG com seed repete a mesma sequência, em [0, 1)", () => {
    const first = seededRandom(42);
    const second = seededRandom(42);
    const draws = Array.from({ length: 20 }, () => first());

    expect(Array.from({ length: 20 }, () => second())).toEqual(draws);
    expect(draws.every((value) => value >= 0 && value < 1)).toBe(true);
    expect(new Set(draws).size).toBe(20);
  });
});

describe("SamplingPlayground (LAB-01.1, LAB-01.2)", () => {
  const setSlider = (name: string, value: number) =>
    fireEvent.change(screen.getByRole("slider", { name }), { target: { value: String(value) } });
  const cutOf = (container: HTMLElement) =>
    [...container.querySelectorAll("[data-token-row]")].map((row) => [row.getAttribute("data-token-row"), row.getAttribute("data-cut")]);
  const draw = (times: number) => {
    for (let index = 0; index < times; index += 1) fireEvent.click(screen.getByRole("button", { name: "Sortear um token" }));
  };

  it("temperatura 0 concentra tudo no topo e o sorteio com seed só tira o primeiro", () => {
    const { container } = render(<SamplingPlayground random={seededRandom(7)} />);

    setSlider("Temperatura", 0);

    expect(container.querySelector("[data-token-row='azul'] [data-value]")).toHaveTextContent("1.00");
    expect(container.querySelector("[data-series='0']")).toHaveAttribute("data-width", "100.00");
    expect(container.querySelector("[data-series='1']")).toHaveAttribute("data-width", "0.00");
    draw(5);
    expect(container.querySelector("[data-drawn]")).toHaveTextContent("azul · azul · azul · azul · azul");
  });

  it("top-p 0.95 com temperatura 1 mantém os 7 primeiros (soma exatamente 0.95) e corta o resto", () => {
    const { container } = render(<SamplingPlayground random={seededRandom(7)} />);

    setSlider("Temperatura", 1);
    setSlider("Top-p", 0.95);

    expect(cutOf(container)).toEqual([
      ["azul", null],
      ["nublado", null],
      ["limpo", null],
      ["escuro", null],
      ["lindo", null],
      ["cinza", null],
      ["claro", null],
      ["chuvoso", "top-p"],
      ["frio", "top-p"],
      ["quente", "top-p"],
    ]);
    const faded = [...container.querySelectorAll("[data-series][data-faded]")].map((bar) => bar.getAttribute("data-series"));
    expect(faded).toEqual(["7", "8", "9"]);
  });

  it("mover a temperatura de 0 para 2 muda a distribuição na mesma renderização", () => {
    const { container } = render(<SamplingPlayground />);
    const topProbability = () => Number(container.querySelector("[data-series='0'] [data-value]")?.textContent);

    setSlider("Temperatura", 0);
    const cold = topProbability();
    setSlider("Temperatura", 2);

    expect(cold).toBe(1);
    expect(topProbability()).toBeLessThan(0.4);
  });

  it("os sorteios seguem o RNG e o último fica em destaque na cena", () => {
    const { container } = render(<SamplingPlayground random={sequence(0.1, 0.5, 0.985)} />);

    setSlider("Temperatura", 1);
    setSlider("Top-p", 1);
    draw(3);

    // Acumulado da base: azul .40, nublado .60, …, chuvoso .98, frio .99.
    expect(container.querySelector("[data-drawn]")).toHaveTextContent("azul · nublado · frio");
    expect(container.querySelector("[data-series][data-highlight]")).toHaveAttribute("data-series", "8");
  });

  it("abre como o preview 09: caixa do prompt, top-k 40 e uma barra por token com valor e acumulado (T139)", () => {
    const { container } = render(<SamplingPlayground />);

    expect(container.querySelector("[data-prompt]")).toHaveTextContent("O céu hoje está");
    expect(container.querySelector("[data-prompt]")?.parentElement).toHaveTextContent(/^prompt ›/);
    expect(screen.getByRole("slider", { name: "Top-k" })).toHaveValue("40");

    const rows = within(screen.getByRole("list", { name: "Distribuição do próximo token" })).getAllByRole("listitem");
    expect(rows).toHaveLength(10);
    // Temperatura 0,8 e top-p 0,95: os 6 primeiros somam 0,95 ou mais; o top-k 40 não corta nenhum.
    expect(cutOf(container).filter(([, cut]) => cut === "top-k")).toEqual([]);
    const first = rows[0];
    expect(first.querySelector("[data-value]")?.textContent).toMatch(/^0\.\d\d$/);
    expect(first.querySelector("[data-cumulative]")?.textContent).toBe(`acum. ${first.querySelector("[data-value]")?.textContent}`);
    const lastKept = rows.filter((row) => !row.hasAttribute("data-cut")).at(-1)!;
    expect(lastKept.querySelector("[data-cumulative]")?.textContent).toMatch(/^acum\. 0\.9\d {2}← passa de 0\.95: último que entra$/);
    expect(rows.at(-1)!.querySelector("[data-cumulative]")).toHaveTextContent("cortado pelo top-p");
  });

  it("o token cortado fica esmaecido sem perder o contraste do texto (T136, T139)", () => {
    const { container } = render(<SamplingPlayground />);
    const cut = container.querySelector("[data-token-row][data-cut]") as HTMLElement;

    expect(cut.className).not.toMatch(/opacity/);
    expect(cut.querySelector("[data-value]")).toHaveClass("text-muted");
  });

  it("a mesma seed gera os mesmos sorteios", () => {
    const first = render(<SamplingPlayground random={seededRandom(123)} />);
    draw(6);
    const drawn = first.container.querySelector("[data-drawn]")?.textContent;
    first.unmount();

    const second = render(<SamplingPlayground random={seededRandom(123)} />);
    draw(6);

    expect(second.container.querySelector("[data-drawn]")?.textContent).toBe(drawn);
    expect(drawn?.split(" · ")).toHaveLength(6);
  });
});
