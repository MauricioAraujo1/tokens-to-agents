import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { glossary } from "../../content/glossary";
import type { StepContent } from "../../types/content";
import { StepNarration } from "./StepNarration";

const embedding = glossary.find((entry) => entry.id === "embedding")!;

const step: StepContent = {
  id: "vector",
  shortTitle: "Vetor",
  title: "A pergunta vira um vetor",
  tag: "mechanism",
  body: ["Um [[Embedding|embedding]] guarda o sentido da pergunta.", "O vetor segue para a busca."],
  keyIdea: "Use o mesmo modelo na indexação e na consulta.",
  scene: { kind: "custom", id: "rag-flow" },
};

describe("StepNarration (LES-01.1, CNT-01.2)", () => {
  it('mostra "Passo X / N", a tag, o título e os parágrafos do passo', () => {
    render(<StepNarration step={step} stepIndex={2} stepCount={10} />);

    expect(screen.getByText("Passo 3 / 10")).toBeInTheDocument();
    expect(screen.getByText("MECANISMO")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "A pergunta vira um vetor" })).toBeInTheDocument();
    expect(screen.getByText("O vetor segue para a busca.")).toBeInTheDocument();
  });

  it("em RTL, o título, os parágrafos e a ideia-chave em PT ficam em LTR; o cromo segue o idioma (I18N-01.4, T140)", () => {
    render(
      <div dir="rtl">
        <StepNarration step={step} stepIndex={2} stepCount={10} />
      </div>,
    );
    const directionOf = (element: Element) => element.closest("[dir]")?.getAttribute("dir");

    expect(directionOf(screen.getByRole("heading", { level: 2, name: "A pergunta vira um vetor" }))).toBe("ltr");
    expect(directionOf(screen.getByText("O vetor segue para a busca."))).toBe("ltr");
    expect(directionOf(screen.getByText("Use o mesmo modelo na indexação e na consulta."))).toBe("ltr");
    expect(directionOf(screen.getByText("Passo 3 / 10"))).toBe("rtl");
  });

  it("[[termo|id]] vira um link do glossário, com a explicação e sem a marcação", () => {
    render(<StepNarration step={step} stepIndex={0} stepCount={10} />);

    const link = screen.getByRole("link", { name: "Embedding" });
    expect(link).toHaveAttribute("href", `/learn/${embedding.lesson}`);
    expect(link).toHaveAttribute("title", embedding.explanation);
    expect(link.closest("p")).toHaveTextContent("Um Embedding guarda o sentido da pergunta.");
    expect(screen.queryByText(/\[\[/)).not.toBeInTheDocument();
  });

  it("o clique no termo navega pela SPA para a aula que ensina o termo", async () => {
    const onNavigate = vi.fn();
    render(<StepNarration step={step} stepIndex={0} stepCount={10} onNavigate={onNavigate} />);

    await userEvent.setup().click(screen.getByRole("link", { name: "Embedding" }));

    expect(onNavigate).toHaveBeenCalledWith({ name: "lesson", lessonId: embedding.lesson, step: null });
    expect(window.location.pathname).toBe("/");
  });

  it("id fora do glossário fica como texto simples", () => {
    render(
      <StepNarration step={{ ...step, body: ["Um [[Foo|nao-existe]] qualquer."] }} stepIndex={0} stepCount={1} />,
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Um Foo qualquer.")).toBeInTheDocument();
  });

  it("mostra a ideia-chave num callout", () => {
    render(<StepNarration step={step} stepIndex={0} stepCount={10} />);

    expect(screen.getByRole("region", { name: "Ideia-chave" })).toHaveTextContent(
      "Use o mesmo modelo na indexação e na consulta.",
    );
  });

  it("passo sem ideia-chave não mostra o callout", () => {
    render(<StepNarration step={{ ...step, keyIdea: undefined }} stepIndex={0} stepCount={10} />);

    expect(screen.queryByRole("region", { name: "Ideia-chave" })).not.toBeInTheDocument();
  });
});
