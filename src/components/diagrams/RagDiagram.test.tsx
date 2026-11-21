import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ragLesson from "../../content/lessons/08/08-02-rag-architecture";
import { RagDiagram } from "./RagDiagram";
import { blockLabelLayout, getPillWidth, RAG_BLOCK_HALF_WIDTH, RAG_MIN_SCENE_WIDTH } from "./ragDiagramLayout";

const steps = ragLesson.steps;

function renderDiagram(activeStepIndex: number, onSelectStep = vi.fn()) {
  render(
    <RagDiagram steps={steps} activeStepIndex={activeStepIndex} isPaused={false} onSelectStep={onSelectStep} />,
  );

  return { onSelectStep };
}

describe("RagDiagram", () => {
  it("expõe o diagrama com título e descrição acessíveis", () => {
    renderDiagram(0);

    expect(screen.getByRole("img", { name: "Fluxo de uma consulta RAG" })).toBeInTheDocument();
  });

  it("marca o nó correspondente ao passo atual", () => {
    renderDiagram(4);

    expect(screen.getByRole("button", { name: "Recuperação" })).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("button", { name: "Banco vetorial" })).not.toHaveAttribute("aria-current");
  });

  it("seleciona a primeira etapa relacionada ao nó clicado", async () => {
    const user = userEvent.setup();
    const { onSelectStep } = renderDiagram(0);

    await user.click(screen.getByRole("button", { name: "Banco vetorial" }));

    expect(onSelectStep).toHaveBeenCalledWith(2);
  });

  it("mantém a etapa atual quando o nó clicado já a representa", async () => {
    const user = userEvent.setup();
    const { onSelectStep } = renderDiagram(3);

    await user.click(screen.getByRole("button", { name: "Banco vetorial" }));

    expect(onSelectStep).toHaveBeenCalledWith(3);
  });

  it("aciona o nó pelo teclado com Enter", async () => {
    const user = userEvent.setup();
    const { onSelectStep } = renderDiagram(0);

    screen.getByRole("button", { name: "LLM" }).focus();
    await user.keyboard("{Enter}");

    expect(onSelectStep).toHaveBeenCalledWith(8);
  });

  it("deixa de ser interativo o nó que não pertence a nenhuma etapa", () => {
    renderDiagram(0);

    expect(screen.getByRole("img", { name: "Usuário" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Usuário" })).not.toBeInTheDocument();
  });

  it("a legenda fica abaixo da cena, fora da área dos blocos (T138)", () => {
    renderDiagram(0);

    const diagram = screen.getByRole("img", { name: "Fluxo de uma consulta RAG" });
    const caption = document.querySelector("figcaption") as HTMLElement;
    const stage = diagram.parentElement as HTMLElement;

    // Nenhum ancestral da legenda até a figura a posiciona sobre a cena.
    for (let element: HTMLElement | null = caption; element && element.tagName !== "FIGURE"; element = element.parentElement) {
      expect(element.className).not.toMatch(/(?:^|\s)(?:absolute|fixed)(?:\s|$)/);
    }
    // A cena vem antes da legenda no fluxo e não a contém.
    expect(stage.contains(caption)).toBe(false);
    expect(stage.compareDocumentPosition(caption) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("com a escala medida, as pílulas ficam com 11 px na tela e o rótulo do bloco cabe na face (LEG-01.1)", () => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
    // 08-02 a 1440: o quadro tem 702 px de largura.
    const rect = vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(() => ({ width: 702, height: 5000 }) as DOMRect);
    try {
      renderDiagram(3);
      const diagram = screen.getByRole("img", { name: "Fluxo de uma consulta RAG" });
      const viewBoxWidth = Number(diagram.getAttribute("viewBox")?.split(" ")[2]);
      const scale = 702 / viewBoxWidth;
      const pillTexts = [...diagram.querySelectorAll("text.fill-ink.font-medium")] as SVGTextElement[];

      expect(pillTexts.length).toBeGreaterThan(0);
      for (const text of pillTexts) expect(Number.parseFloat(text.style.fontSize) * scale).toBeCloseTo(11, 1);
      const pill = screen.getByText("similarity score").closest("g")?.querySelector("rect:not(.fill-ink)") as SVGRectElement;
      // A fonte é arredondada a 0,01 unidade: a largura confere com a da pílula de 11 px a menos de 0,5.
      expect(Number(pill.getAttribute("width"))).toBeCloseTo(getPillWidth("similarity score", false, 11 / scale), 0);
    } finally {
      rect.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it("rótulo do bloco que não cabe na face quebra em 2 linhas e diminui só o necessário", () => {
    const wide = blockLabelLayout("Sem resultado", 18);
    const short = blockLabelLayout("LLM", 18);

    expect(wide.lines).toEqual(["Sem", "resultado"]);
    expect("resultado".length * 0.62 * wide.fontSize).toBeLessThanOrEqual(2 * RAG_BLOCK_HALF_WIDTH - 8 + 1e-9);
    expect(short).toEqual({ lines: ["LLM"], fontSize: (18 * 13) / 11 });
  });

  it("a cena tem a proporção da viewBox, para ocupar a largura do quadro (T138)", () => {
    renderDiagram(0);

    const diagram = screen.getByRole("img", { name: "Fluxo de uma consulta RAG" });
    const [, , width, height] = (diagram.getAttribute("viewBox") ?? "").split(" ").map(Number);
    const stage = diagram.parentElement as HTMLElement;

    expect(stage.style.aspectRatio).toBe(`${width} / ${height}`);
    expect(stage).toHaveClass("w-full");
  });

  it("rótulo em 2 linhas usa a largura menor da face, para a linha de baixo não encostar no contorno (T22)", () => {
    const wide = blockLabelLayout("Sem resultado", 18);

    expect("resultado".length * 0.62 * wide.fontSize).toBeLessThanOrEqual(2 * RAG_BLOCK_HALF_WIDTH - 20 + 1e-9);
  });

  it("no quadro largo mais estreito que a largura mínima (1440, 687 px), a cena cabe e não rola (T22)", () => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
    const client = vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(687);
    const scroll = vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(687);
    try {
      renderDiagram(0);
      const stage = screen.getByRole("img", { name: "Fluxo de uma consulta RAG" }).parentElement as HTMLElement;

      expect(stage.style.minWidth).toBe("687px");
      expect(stage.parentElement).toHaveAttribute("data-scene-scroll", "fit");
    } finally {
      client.mockRestore();
      scroll.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it("abaixo da largura mínima, a cena rola no quadro das peças largas, com a barra visível e foco (LEG-01.4)", () => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
    const client = vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(341);
    const scroll = vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(RAG_MIN_SCENE_WIDTH);
    try {
      renderDiagram(0);
      const stage = screen.getByRole("img", { name: "Fluxo de uma consulta RAG" }).parentElement as HTMLElement;
      const frame = stage.parentElement as HTMLElement;

      expect(stage.style.minWidth).toBe(`${RAG_MIN_SCENE_WIDTH}px`);
      expect(frame).toHaveClass("scene-scroll", "overflow-x-auto");
      expect(frame).not.toHaveClass("no-scrollbar");
      expect(frame).toHaveAttribute("data-scene-scroll", "scroll");
      expect(screen.getByRole("group", { name: "Fluxo de uma consulta RAG" })).toHaveAttribute("tabindex", "0");
    } finally {
      client.mockRestore();
      scroll.mockRestore();
      vi.unstubAllGlobals();
    }
  });
});
