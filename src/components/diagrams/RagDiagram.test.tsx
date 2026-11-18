import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ragHowItWorksLesson } from "../../data/lessons/rag";
import { RagDiagram } from "./RagDiagram";

const steps = ragHowItWorksLesson.steps;

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
});
