import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getLoadedGlossary } from "../../content/glossaryStore";
import type { StepContent } from "../../types/content";
import { StepNarration } from "./StepNarration";

// Este arquivo não importa `content/glossary`: o glossário só chega pelo import dinâmico (PERF-01.1).

const step: StepContent = {
  id: "vector",
  shortTitle: "Vetor",
  title: "A pergunta vira um vetor",
  tag: "mechanism",
  body: ["Um [[Embedding|embedding]] guarda o sentido da pergunta."],
  scene: { kind: "custom", id: "rag-flow" },
};

describe("StepNarration com o glossário sob demanda", () => {
  it("passo sem termo marcado não baixa o glossário", () => {
    render(<StepNarration step={{ ...step, body: ["Sem termos aqui."] }} stepIndex={0} stepCount={1} />);

    expect(screen.getByText("Sem termos aqui.")).toBeInTheDocument();
    expect(getLoadedGlossary()).toBeNull();
  });

  it("mostra o termo como texto até o glossário chegar e então resolve o [[termo|id]] em link", async () => {
    render(<StepNarration step={step} stepIndex={0} stepCount={1} />);

    expect(screen.getByText("Um Embedding guarda o sentido da pergunta.")).toBeInTheDocument();
    expect(screen.queryByText(/\[\[/)).not.toBeInTheDocument();

    const link = await screen.findByRole("link", { name: "Embedding" }, { timeout: 10_000 });
    expect(link).toHaveAttribute("href", "/learn/03-05");
    expect(link).toHaveAttribute("title", expect.stringContaining("Vetor"));
    expect(getLoadedGlossary()).not.toBeNull();
  }, 20_000);
});
