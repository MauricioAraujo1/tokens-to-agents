import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { catalog } from "../../content/catalog";
import ragLesson from "../../content/lessons/08/08-02-rag-architecture";
import { I18nProvider } from "../../i18n/I18nProvider";
import { createProgressStore } from "../../lib/progress/store";
import { createSafeStorage } from "../../lib/storage";
import type { LessonContent } from "../../types/content";
import { LessonHeader } from "./LessonHeader";

const rag = catalog.find((module) => module.id === "08")!;
const ragMeta = rag.lessons[1];

function renderHeader(lesson: LessonContent | null = ragLesson) {
  render(<LessonHeader module={rag} meta={ragMeta} lessonIndex={1} lesson={lesson} />);
}

afterEach(() => {
  document.documentElement.removeAttribute("lang");
  document.documentElement.removeAttribute("dir");
});

describe("LessonHeader (LES-01.1, NAV-01.3)", () => {
  it('mostra o breadcrumb "NN. Módulo / Lição X de Y"', () => {
    renderHeader();

    const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(breadcrumb).toHaveTextContent("08. RAG Architecture/Lição 2 de 16");
    expect(within(breadcrumb).getByText("08. RAG Architecture")).toBeInTheDocument();
    expect(within(breadcrumb).getByText("Lição 2 de 16")).toBeInTheDocument();
  });

  it("mostra o título do roadmap e o subtítulo da aula", () => {
    renderHeader();

    expect(screen.getByRole("heading", { level: 1, name: "RAG Architecture" })).toBeInTheDocument();
    expect(screen.getByText(ragLesson.subtitle)).toBeInTheDocument();
  });

  it("mostra os badges de duração, nível e número de passos", () => {
    renderHeader();

    expect(ragMeta.durationMin).toBe(12);
    expect(ragMeta.level).toBe("intermediate");
    expect(screen.getByText("12 min")).toBeInTheDocument();
    expect(screen.getByText("Intermediário")).toBeInTheDocument();
    expect(screen.getByText("10 passos")).toBeInTheDocument();
  });

  it("usa o singular para a aula de 1 passo", () => {
    renderHeader({ ...ragLesson, steps: ragLesson.steps.slice(0, 1) });

    expect(screen.getByText("1 passo")).toBeInTheDocument();
  });

  it("aula sem conteúdo não mostra subtítulo nem contagem de passos", () => {
    renderHeader(null);

    expect(screen.getByRole("heading", { level: 1, name: "RAG Architecture" })).toBeInTheDocument();
    expect(screen.queryByText(/passos?$/)).not.toBeInTheDocument();
    expect(screen.getByText("12 min")).toBeInTheDocument();
  });

  it("traduz o breadcrumb e os badges para o idioma da interface", async () => {
    const store = createProgressStore(createSafeStorage(() => undefined));
    render(
      <I18nProvider store={store} languages={["en"]}>
        <LessonHeader module={rag} meta={ragMeta} lessonIndex={1} lesson={ragLesson} />
      </I18nProvider>,
    );

    expect(await screen.findByText("Intermediate")).toBeInTheDocument();
    expect(screen.getByText("10 steps")).toBeInTheDocument();
    expect(within(screen.getByRole("navigation", { name: "Breadcrumb" })).getByText("Lesson 2 of 16")).toBeInTheDocument();
  });
});
