import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { catalog } from "../../content/catalog";
import { createProgressStore } from "../../lib/progress/store";
import { createSafeStorage } from "../../lib/storage";
import type { QuizContent } from "../../types/content";
import { QuizRunner } from "./QuizRunner";

const transformers = catalog.find((module) => module.id === "03")!;

const quiz: QuizContent = {
  module: "03",
  questions: [
    {
      id: "q1",
      prompt: "Por que dividimos q · k por √d_k?",
      options: ["Para normalizar o embedding", "Para o softmax não saturar", "Para os pesos somarem 1"],
      correct: 1,
      explanation: "Sem a divisão, os produtos escalares crescem com a dimensão e o softmax satura.",
      lesson: "03-08",
    },
    {
      id: "q2",
      prompt: "O que o BPE faz?",
      options: ["Junta pares frequentes", "Remove acentos"],
      correct: 0,
      explanation: "O BPE junta o par de símbolos mais frequente a cada passo.",
      lesson: "03-04",
    },
  ],
};

function memoryStore() {
  return createProgressStore(createSafeStorage(() => undefined));
}

function renderRunner(store = memoryStore()) {
  const onNavigate = vi.fn();
  render(<QuizRunner quiz={quiz} module={transformers} onNavigate={onNavigate} store={store} />);
  return { store, onNavigate, user: userEvent.setup() };
}

const options = (prompt: string) => within(screen.getByRole("group", { name: prompt })).getAllByRole("button");

describe("QuizRunner (PRAC-01)", () => {
  it("mostra uma questão por vez, com a posição, os acertos e a melhor nota", () => {
    renderRunner();

    expect(screen.getByRole("heading", { name: "Quiz · 03. Transformers Architecture" })).toBeInTheDocument();
    expect(screen.getByText(/Questão 1 de 2/)).toHaveTextContent("Questão 1 de 2 · Acertos: 0 · Melhor nota: —");
    expect(screen.getByRole("group", { name: quiz.questions[0].prompt })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: quiz.questions[1].prompt })).not.toBeInTheDocument();
    expect(screen.queryByText(quiz.questions[0].explanation)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Próxima questão" })).not.toBeInTheDocument();
  });

  it("errar mostra na hora a resposta certa, a explicação e o link para a aula (PRAC-01.2, PRAC-01.4)", async () => {
    const { onNavigate, user } = renderRunner();

    await user.click(options(quiz.questions[0].prompt)[2]);

    const [, correct, chosen] = options(quiz.questions[0].prompt);
    expect(chosen).toHaveAttribute("data-result", "incorrect");
    expect(correct).toHaveAttribute("data-result", "correct");
    const feedback = screen.getByRole("status");
    expect(feedback).toHaveTextContent("Resposta errada. A certa é: Para o softmax não saturar");
    expect(feedback).toHaveTextContent(quiz.questions[0].explanation);

    const review = within(feedback).getByRole("link", { name: "Revisar: 03.08 Self-Attention" });
    expect(review).toHaveAttribute("href", "/learn/03-08");
    await user.click(review);
    expect(onNavigate).toHaveBeenCalledWith({ name: "lesson", lessonId: "03-08", step: null });
  });

  it("errar marca a certa e a escolhida nas opções e explica pela letra da certa (PRAC-01.2, preview 08)", async () => {
    const { user } = renderRunner();

    await user.click(options(quiz.questions[0].prompt)[2]);

    const [first, correct, chosen] = options(quiz.questions[0].prompt);
    expect(correct).toHaveTextContent(/^BPara o softmax não saturarcorreta$/);
    expect(chosen).toHaveTextContent(/^CPara os pesos somarem 1sua resposta$/);
    expect(first).toHaveTextContent(/^APara normalizar o embedding$/);
    // As letras e as marcas são visuais: o nome acessível continua sendo o texto da opção.
    expect(chosen).toHaveAccessibleName("Para os pesos somarem 1");
    expect(screen.getByRole("status")).toHaveTextContent(/^✦ Por que B/);
  });

  it("acertar mostra o acerto e conta na barra de acertos (PRAC-01.2)", async () => {
    const { user } = renderRunner();

    await user.click(options(quiz.questions[0].prompt)[1]);

    expect(screen.getByRole("status")).toHaveTextContent("Resposta certa.");
    expect(screen.getByText(/Questão 1 de 2/)).toHaveTextContent("Acertos: 1");
  });

  it("a questão respondida fica travada", async () => {
    const { user } = renderRunner();

    await user.click(options(quiz.questions[0].prompt)[2]);
    await user.click(options(quiz.questions[0].prompt)[1]);

    expect(options(quiz.questions[0].prompt)[2]).toHaveAttribute("aria-pressed", "true");
    expect(options(quiz.questions[0].prompt)[1]).toHaveAttribute("aria-pressed", "false");
  });

  it("terminar mostra a nota e salva como melhor nota do módulo (PRAC-01.3)", async () => {
    const { store, user } = renderRunner();

    await user.click(options(quiz.questions[0].prompt)[1]);
    await user.click(screen.getByRole("button", { name: "Próxima questão" }));
    expect(screen.getByText(/Questão 2 de 2/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: quiz.questions[1].prompt })).toHaveFocus();

    await user.click(options(quiz.questions[1].prompt)[1]);
    await user.click(screen.getByRole("button", { name: "Ver a nota" }));

    expect(screen.getByRole("heading", { name: "Você acertou 1 de 2 (50%)." })).toHaveFocus();
    expect(screen.getByText("Melhor nota: 1/2")).toBeInTheDocument();
    expect(store.getSnapshot().quizBest["03"]).toEqual({ correct: 1, total: 2 });
  });

  it("a melhor nota não regride quando o aluno refaz e vai pior (PRAC-01.3)", async () => {
    const store = memoryStore();
    store.recordQuiz("03", { correct: 2, total: 2 });
    const { user } = renderRunner(store);
    expect(screen.getByText(/Questão 1 de 2/)).toHaveTextContent("Melhor nota: 2/2");

    await user.click(options(quiz.questions[0].prompt)[0]);
    await user.click(screen.getByRole("button", { name: "Próxima questão" }));
    await user.click(options(quiz.questions[1].prompt)[1]);
    await user.click(screen.getByRole("button", { name: "Ver a nota" }));

    expect(screen.getByRole("heading", { name: "Você acertou 0 de 2 (0%)." })).toBeInTheDocument();
    expect(screen.getByText("Melhor nota: 2/2")).toBeInTheDocument();
    expect(store.getSnapshot().quizBest["03"]).toEqual({ correct: 2, total: 2 });
  });

  it("refazer volta à primeira questão sem respostas", async () => {
    const { user } = renderRunner();

    await user.click(options(quiz.questions[0].prompt)[1]);
    await user.click(screen.getByRole("button", { name: "Próxima questão" }));
    await user.click(options(quiz.questions[1].prompt)[0]);
    await user.click(screen.getByRole("button", { name: "Ver a nota" }));
    await user.click(screen.getByRole("button", { name: "Refazer o quiz" }));

    expect(screen.getByText(/Questão 1 de 2/)).toHaveTextContent("Acertos: 0 · Melhor nota: 2/2");
    expect(options(quiz.questions[0].prompt).every((option) => !option.hasAttribute("data-result"))).toBe(true);
  });

  it("as opções funcionam pelo teclado", async () => {
    const { user } = renderRunner();

    await user.tab();
    expect(options(quiz.questions[0].prompt)[0]).toHaveFocus();
    await user.tab();
    await user.keyboard("{Enter}");

    expect(screen.getByRole("status")).toHaveTextContent("Resposta certa.");
  });
});
