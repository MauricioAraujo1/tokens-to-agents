import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ragLesson from "../../content/lessons/08/08-02-rag-architecture";
import { ragFlowContent } from "../../content/scenes/rag-flow";
import { Scene } from "../Scene";
import { customScenes } from ".";
import { RagFlowScene } from "./RagFlowScene";

describe("cenas custom (SCN-01.3)", () => {
  it("registra o diagrama RAG como a cena custom rag-flow", () => {
    expect(customScenes["rag-flow"].component).toBe(RagFlowScene);
  });

  it("kind: custom renderiza o componente registrado no lugar das peças", () => {
    render(<Scene steps={ragLesson.steps} stepIndex={4} paused={false} />);

    const scene = screen.getByRole("figure", { name: ragFlowContent.description });
    expect(scene).toHaveAttribute("data-custom", "rag-flow");
    expect(scene.querySelector("[data-piece]")).toBeNull();
    expect(screen.getByRole("img", { name: "Fluxo de uma consulta RAG" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recuperação" })).toHaveAttribute("aria-current", "step");
    expect(screen.getByText("passo 5")).toBeInTheDocument();
  });

  it("a cena custom recebe o passo e devolve a escolha de passo pelo clique no nó", async () => {
    const onSelectStep = vi.fn();
    render(<Scene steps={ragLesson.steps} stepIndex={0} paused={false} onSelectStep={onSelectStep} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "LLM" }));

    expect(onSelectStep).toHaveBeenCalledWith(8);
  });
});
