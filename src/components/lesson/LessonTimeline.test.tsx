import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { StepContent } from "../../types/content";
import { LessonTimeline } from "./LessonTimeline";

const steps: StepContent[] = ["Pergunta", "Embedding", "Busca", "Resposta"].map((shortTitle, index) => ({
  id: `s${index + 1}`,
  shortTitle,
  title: shortTitle,
  tag: "mechanism",
  body: [shortTitle],
  scene: { kind: "custom", id: "rag-flow" },
}));

describe('LessonTimeline: stepper "Nesta lição" (LES-01.1, LES-01.6)', () => {
  it('fica numa região "Nesta lição" com um botão por passo, na ordem', () => {
    render(<LessonTimeline steps={steps} currentIndex={0} onSelectStep={() => {}} />);

    const stepper = screen.getByRole("region", { name: "Nesta lição" });
    expect(within(stepper).getAllByRole("button").map((button) => button.textContent)).toEqual([
      "1Pergunta",
      "2Embedding",
      "3Busca",
      "4Resposta",
    ]);
  });

  it("marca os passos anteriores como concluídos, o atual como atual e os seguintes como futuros", () => {
    render(<LessonTimeline steps={steps} currentIndex={2} onSelectStep={() => {}} />);

    const buttons = within(screen.getByRole("region", { name: "Nesta lição" })).getAllByRole("button");
    expect(buttons.map((button) => button.dataset.state)).toEqual(["done", "done", "current", "upcoming"]);

    expect(screen.getByRole("button", { name: "Passo 1: Pergunta, concluído" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("button", { name: "Passo 2: Embedding, concluído" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Passo 3: Busca" })).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("button", { name: "Passo 4: Resposta" })).not.toHaveAttribute("aria-current");
    expect(screen.getByText("Passo 3 de 4")).toBeInTheDocument();
  });

  it("no primeiro passo, nenhum passo está concluído", () => {
    render(<LessonTimeline steps={steps} currentIndex={0} onSelectStep={() => {}} />);

    expect(screen.queryByRole("button", { name: /concluído$/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Passo 1: Pergunta" })).toHaveAttribute("aria-current", "step");
  });

  it("clicar num passo chama goTo com o índice desse passo (LES-01.6)", async () => {
    const goTo = vi.fn();
    render(<LessonTimeline steps={steps} currentIndex={2} onSelectStep={goTo} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Passo 4: Resposta" }));
    expect(goTo).toHaveBeenLastCalledWith(3);

    await user.click(screen.getByRole("button", { name: "Passo 1: Pergunta, concluído" }));
    expect(goTo).toHaveBeenLastCalledWith(0);
  });
});
