import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { catalog } from "../content/catalog";
import { ContentNotFound } from "../content/registry";
import { createProgressStore } from "../lib/progress/store";
import { createSafeStorage } from "../lib/storage";
import type { QuizContent } from "../types/content";
import { PracticePage } from "./PracticePage";

const quiz08: QuizContent = {
  module: "08",
  questions: [
    {
      id: "q1",
      prompt: "Por que usar o mesmo modelo de embedding na indexação e na consulta?",
      options: ["Para gastar menos tokens", "Para os vetores ficarem no mesmo espaço"],
      correct: 1,
      explanation: "Modelos diferentes geram espaços vetoriais incompatíveis.",
      lesson: "08-02",
    },
  ],
};

const PUBLISHED = new Set(["00", "08"]);

function memoryStore() {
  return createProgressStore(createSafeStorage(() => undefined));
}

function renderPractice({
  moduleId,
  load = vi.fn(async (id: string): Promise<QuizContent> => {
    if (id === "08") return quiz08;
    throw new ContentNotFound("quiz", id);
  }),
  store = memoryStore(),
}: {
  moduleId?: string;
  load?: (id: string) => Promise<QuizContent>;
  store?: ReturnType<typeof memoryStore>;
} = {}) {
  const onNavigate = vi.fn();
  render(
    <PracticePage
      moduleId={moduleId}
      onNavigate={onNavigate}
      load={load}
      hasQuiz={(id) => PUBLISHED.has(id)}
      store={store}
    />,
  );
  return { onNavigate, load, store, user: userEvent.setup() };
}

const items = () => within(screen.getByRole("navigation", { name: "Quiz por módulo" })).getAllByRole("link");

describe("PracticePage (PRAC-01.1)", () => {
  it("lista os 18 quizzes, um por módulo, com a melhor nota ou —", () => {
    const store = memoryStore();
    store.recordQuiz("00", { correct: 7, total: 8 });
    renderPractice({ store });

    const links = items();
    expect(links).toHaveLength(18);
    expect(links.map((link) => link.closest("li")?.dataset.module)).toEqual(catalog.map((module) => module.id));
    expect(links[0]).toHaveTextContent("00 Introduction to AI");
    expect(links[0]).toHaveTextContent("7/8");
    expect(links[0]).toHaveAccessibleName(/Melhor nota: 7\/8$/);
    expect(links[8]).toHaveTextContent("—");
    expect(links[0]).toHaveAttribute("href", "/practice/00");
  });

  it("o nome que a lista trunca fica inteiro no title e no nome acessível (UI-01.1)", () => {
    renderPractice();

    const evaluation = items()[16];
    expect(evaluation).toHaveAttribute("title", "16 Evaluation, Safety & Observability");
    expect(evaluation).toHaveAccessibleName(/^16 Evaluation, Safety & Observability /);
    for (const [index, link] of items().entries()) {
      expect(link).toHaveAttribute("title", `${catalog[index].id} ${catalog[index].title}`);
    }
  });

  it("módulo sem quiz publicado aparece como em produção", () => {
    renderPractice();

    expect(items()[3]).toHaveTextContent("03 Transformers Architecture");
    expect(items()[3]).toHaveTextContent("em produção");
    expect(items()[8]).not.toHaveTextContent("em produção");
  });

  it("sem módulo na URL, pede para escolher um módulo", () => {
    const { load } = renderPractice();

    expect(screen.getByText("Escolha um módulo na lista para fazer o quiz.")).toBeInTheDocument();
    expect(load).not.toHaveBeenCalled();
  });

  it("/practice/:moduleId abre o quiz do módulo e marca o item atual", async () => {
    const { load } = renderPractice({ moduleId: "08" });

    expect(await screen.findByRole("heading", { name: "Quiz · 08. RAG Architecture" })).toBeInTheDocument();
    expect(load).toHaveBeenCalledWith("08");
    expect(screen.getByRole("group", { name: quiz08.questions[0].prompt })).toBeInTheDocument();
    expect(items()[8]).toHaveAttribute("aria-current", "page");
    expect(items()[0]).not.toHaveAttribute("aria-current");
  });

  it("/practice/:moduleId de módulo sem quiz mostra que o quiz está em produção", async () => {
    renderPractice({ moduleId: "03" });

    expect(await screen.findByText("Quiz em produção")).toBeInTheDocument();
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
  });

  it("escolher um módulo na lista navega para /practice/:moduleId", async () => {
    const { onNavigate, user } = renderPractice();

    await user.click(items()[8]);

    expect(onNavigate).toHaveBeenCalledWith({ name: "practice", moduleId: "08" });
  });

  it("falha ao carregar o quiz mostra tentar de novo, que recarrega", async () => {
    const load = vi
      .fn<(id: string) => Promise<QuizContent>>()
      .mockRejectedValueOnce(new TypeError("Failed to fetch dynamically imported module"))
      .mockResolvedValueOnce(quiz08);
    const { user } = renderPractice({ moduleId: "08", load });

    await user.click(await screen.findByRole("button", { name: "Tentar de novo" }));

    expect(await screen.findByRole("heading", { name: "Quiz · 08. RAG Architecture" })).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(2);
  });
});
