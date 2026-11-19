import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ChartSpec } from "../../scene/types";
import { PlaygroundShell, type PlaygroundControl, type PlaygroundView } from "./PlaygroundShell";

type Values = { bars: number; kind: string; label: string };

const controls: ReadonlyArray<PlaygroundControl<Values>> = [
  { kind: "slider", id: "bars", label: "Barras", min: 1, max: 6, step: 1, hint: "quantas barras desenhar" },
  {
    kind: "select",
    id: "kind",
    label: "Tipo",
    options: [
      { value: "bar", label: "Barras" },
      { value: "line", label: "Linha" },
    ],
  },
  { kind: "text", id: "label", label: "Rótulo" },
];

// Cena derivada só dos valores: N barras do tipo escolhido, com o rótulo digitado.
function derive(values: Values): PlaygroundView {
  if (values.label === "") return { pieces: [], error: "Digite um rótulo." };
  const chart: ChartSpec = {
    piece: "chart",
    kind: values.kind as ChartSpec["kind"],
    series: Array.from({ length: values.bars }, (_, index) => ({ label: `${values.label}${index}`, value: index + 1 })),
  };
  return { pieces: [chart], caption: `${values.bars} barras` };
}

function renderShell() {
  return render(
    <PlaygroundShell
      title="Playground de teste"
      observe="Mais barras, mais itens."
      controls={controls}
      initialValues={{ bars: 2, kind: "bar", label: "x" }}
      derive={derive}
      actions={(values) => <button type="button">Ação com {values.bars}</button>}
    />,
  );
}

const seriesCount = (container: HTMLElement) => container.querySelectorAll("[data-series]").length;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PlaygroundShell (LAB-01)", () => {
  it("mostra título, cena derivada dos valores iniciais, parâmetros e o quadro O que observar", () => {
    const { container } = renderShell();

    expect(screen.getByRole("heading", { level: 1, name: "Playground de teste" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Parâmetros" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "O que observar" })).toBeInTheDocument();
    expect(screen.getByText("Mais barras, mais itens.")).toBeInTheDocument();
    expect(screen.getByText("Tudo roda no navegador, sem nenhuma chamada a API.")).toBeInTheDocument();
    expect(screen.getByRole("figure", { name: /Gráfico: x0 e x1/ })).toBeInTheDocument();
    expect(seriesCount(container)).toBe(2);
    expect(screen.getByRole("slider", { name: "Barras" })).toHaveAccessibleDescription("quantas barras desenhar");
    expect(screen.getByRole("button", { name: "Ação com 2" })).toBeInTheDocument();
  });

  // O limite de 100 ms (LAB-01.2) é medido no navegador pelo agente `qa`: no jsdom, sob carga, o tempo de
  // render não diz nada. Aqui a prova é estrutural: a cena nova já está no DOM na volta do evento, sem
  // `await` e sem nenhum timer agendado (nada de debounce nem transição).
  it("mudar o slider re-renderiza a cena na mesma chamada, sem await e sem timer (LAB-01.2)", () => {
    vi.useFakeTimers();
    try {
      const { container } = renderShell();

      fireEvent.change(screen.getByRole("slider", { name: "Barras" }), { target: { value: "5" } });

      expect(seriesCount(container)).toBe(5);
      expect(screen.getByText("5 barras")).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent("5");
      expect(screen.getByRole("button", { name: "Ação com 5" })).toBeInTheDocument();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("o trilho do slider fica preenchido até o valor atual (preview 09)", () => {
    renderShell();
    const slider = screen.getByRole("slider", { name: "Barras" });
    // 2 no intervalo de 1 a 6 = 20 % do trilho.
    expect(slider.style.getPropertyValue("--range-progress")).toBe("20%");

    fireEvent.change(slider, { target: { value: "6" } });

    expect(slider.style.getPropertyValue("--range-progress")).toBe("100%");
  });

  it("o select e o campo de texto também atualizam a cena de forma síncrona (LAB-01.1)", () => {
    const { container } = renderShell();

    fireEvent.change(screen.getByRole("combobox", { name: "Tipo" }), { target: { value: "line" } });
    expect(container.querySelector("[data-line]")).not.toBeNull();

    fireEvent.change(screen.getByRole("textbox", { name: "Rótulo" }), { target: { value: "tok" } });
    expect(screen.getByRole("figure", { name: /Gráfico: tok0 e tok1/ })).toBeInTheDocument();
  });

  it("parâmetro inválido mostra a mensagem em alerta e tira a cena", () => {
    renderShell();

    fireEvent.change(screen.getByRole("textbox", { name: "Rótulo" }), { target: { value: "" } });

    expect(screen.getByRole("alert")).toHaveTextContent("Digite um rótulo.");
    expect(screen.queryByRole("figure")).not.toBeInTheDocument();
  });

  it("não chama a rede ao montar nem ao mexer nos controles (LAB-01.4)", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    renderShell();

    fireEvent.change(screen.getByRole("slider", { name: "Barras" }), { target: { value: "6" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Tipo" }), { target: { value: "line" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Rótulo" }), { target: { value: "y" } });

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
