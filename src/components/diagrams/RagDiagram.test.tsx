import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ragLesson from "../../content/lessons/08/08-02-rag-architecture";
import { RagDiagram } from "./RagDiagram";

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

  it("a cena tem a proporção da viewBox, para ocupar a largura do quadro (T138)", () => {
    renderDiagram(0);

    const diagram = screen.getByRole("img", { name: "Fluxo de uma consulta RAG" });
    const [, , width, height] = (diagram.getAttribute("viewBox") ?? "").split(" ").map(Number);
    const stage = diagram.parentElement as HTMLElement;

    expect(stage.style.aspectRatio).toBe(`${width} / ${height}`);
    expect(stage).toHaveClass("w-full");
  });
});
