import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { QuizQuestion } from "../../types/content";
import { KnowledgeCheck } from "./KnowledgeCheck";

const questions: QuizQuestion[] = [
  {
    id: "q1",
    prompt: "Por que usar o mesmo modelo de embedding na indexação e na consulta?",
    options: ["Para gastar menos tokens", "Para os vetores ficarem no mesmo espaço", "Para indexar mais rápido"],
    correct: 1,
    explanation: "Modelos diferentes geram espaços vetoriais incompatíveis.",
    lesson: "08-02",
  },
  {
    id: "q2",
    prompt: "O que acontece com um K muito alto?",
    options: ["Entra ruído no contexto", "A resposta fica mais curta"],
    correct: 0,
    explanation: "Trechos pouco relevantes poluem o prompt.",
    lesson: "08-02",
  },
];

function question(prompt: string) {
  return screen.getByRole("group", { name: prompt });
}

describe("KnowledgeCheck (LES-01.12)", () => {
  it('mostra as perguntas da aula numa seção "Teste seu conhecimento", sem resposta no início', () => {
    render(<KnowledgeCheck questions={questions} />);

    expect(screen.getByRole("region", { name: "Teste seu conhecimento" })).toBeInTheDocument();
    expect(screen.getByText("Pergunta 1 de 2")).toBeInTheDocument();
    expect(within(question(questions[0].prompt)).getAllByRole("button")).toHaveLength(3);
    expect(within(question(questions[1].prompt)).getAllByRole("button")).toHaveLength(2);
    expect(screen.queryByText(questions[0].explanation)).not.toBeInTheDocument();
  });

  it("resposta certa mostra o acerto e a explicação na hora", async () => {
    render(<KnowledgeCheck questions={questions} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Para os vetores ficarem no mesmo espaço" }));

    const chosen = screen.getByRole("button", { name: "Para os vetores ficarem no mesmo espaço" });
    expect(chosen).toHaveAttribute("aria-pressed", "true");
    expect(chosen).toHaveAttribute("data-result", "correct");
    const [status] = screen.getAllByRole("status");
    expect(status).toHaveTextContent("Resposta certa.");
    expect(status).toHaveTextContent(questions[0].explanation);
  });

  it("resposta errada marca a escolha como errada, aponta a certa e mostra a explicação", async () => {
    render(<KnowledgeCheck questions={questions} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Para gastar menos tokens" }));

    expect(screen.getByRole("button", { name: "Para gastar menos tokens" })).toHaveAttribute("data-result", "incorrect");
    expect(screen.getByRole("button", { name: "Para os vetores ficarem no mesmo espaço" })).toHaveAttribute(
      "data-result",
      "correct",
    );
    const [status] = screen.getAllByRole("status");
    expect(status).toHaveTextContent("Resposta errada. A certa é: Para os vetores ficarem no mesmo espaço");
    expect(status).toHaveTextContent(questions[0].explanation);
  });

  it("depois de responder, a escolha fica travada até tentar de novo", async () => {
    const user = userEvent.setup();
    render(<KnowledgeCheck questions={questions} />);

    await user.click(screen.getByRole("button", { name: "Para gastar menos tokens" }));
    await user.click(screen.getByRole("button", { name: "Para indexar mais rápido" }));
    expect(screen.getByRole("button", { name: "Para gastar menos tokens" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Para indexar mais rápido" })).toHaveAttribute("aria-pressed", "false");

    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(screen.queryByText(questions[0].explanation)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Para gastar menos tokens" })).toHaveAttribute("aria-pressed", "false");
  });

  it("cada pergunta é corrigida de forma independente", async () => {
    render(<KnowledgeCheck questions={questions} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Entra ruído no contexto" }));

    expect(screen.getByText(questions[1].explanation)).toBeInTheDocument();
    expect(screen.queryByText(questions[0].explanation)).not.toBeInTheDocument();
  });

  it("funciona pelo teclado: Tab chega às opções e Enter ou Space respondem", async () => {
    const user = userEvent.setup();
    render(<KnowledgeCheck questions={questions} />);

    await user.tab();
    expect(screen.getByRole("button", { name: "Para gastar menos tokens" })).toHaveFocus();
    await user.tab();
    await user.keyboard("{Enter}");
    expect(screen.getAllByRole("status")[0]).toHaveTextContent("Resposta certa.");

    screen.getByRole("button", { name: "A resposta fica mais curta" }).focus();
    await user.keyboard(" ");
    expect(screen.getAllByRole("status")[1]).toHaveTextContent("Resposta errada. A certa é: Entra ruído no contexto");
  });

  it("aula sem perguntas não mostra a seção", () => {
    render(<KnowledgeCheck questions={[]} />);

    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });
});
