import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { courseModules, DEFAULT_LESSON_ID } from "../../data/course";
import { createStatusMap } from "../../lib/course";
import { CourseSidebar } from "./CourseSidebar";

function renderSidebar(onSelectLesson = vi.fn()) {
  render(
    <CourseSidebar
      modules={courseModules}
      selectedLessonId={DEFAULT_LESSON_ID}
      statuses={createStatusMap(courseModules)}
      isOpen
      onSelectLesson={onSelectLesson}
    />,
  );

  return { onSelectLesson };
}

describe("CourseSidebar", () => {
  it("lista os 18 módulos e o progresso geral do curso", () => {
    renderSidebar();
    const navigation = screen.getByRole("navigation", { name: "Módulos" });

    expect(within(navigation).getAllByRole("button", { expanded: false }).length).toBeGreaterThanOrEqual(17);
    expect(screen.getByRole("button", { name: /00\. Introdução à IA/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /17\. AI Infrastructure/ })).toBeInTheDocument();
    expect(screen.getByText("6 / 59")).toBeInTheDocument();
  });

  it("expande e recolhe um módulo ao clicar nele", async () => {
    const user = userEvent.setup();
    renderSidebar();

    expect(screen.queryByRole("button", { name: /O que é Inteligência Artificial\?/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /00\. Introdução à IA/ }));
    expect(screen.getByRole("button", { name: /O que é Inteligência Artificial\?/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /00\. Introdução à IA/ }));
    expect(screen.queryByRole("button", { name: /O que é Inteligência Artificial\?/ })).not.toBeInTheDocument();
  });

  it("mostra o total de aulas no cabeçalho da trilha e marca módulos concluídos", () => {
    renderSidebar();

    expect(screen.getByText("59 aulas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /00\. Introdução à IA.*3\/3 ✓/ })).toBeInTheDocument();
  });

  it("mantém aberto o módulo da aula atual", () => {
    renderSidebar();

    expect(screen.getByRole("button", { name: /Chunking Strategies/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Como funciona o RAG/ })).toHaveAttribute("aria-current", "page");
  });

  it("informa a aula escolhida ao clicar nela", async () => {
    const user = userEvent.setup();
    const { onSelectLesson } = renderSidebar();

    await user.click(screen.getByRole("button", { name: /Chunking Strategies/ }));

    expect(onSelectLesson).toHaveBeenCalledWith("08-04");
  });

  it("oferece um separador acessível para redimensionar a sidebar pelo teclado", async () => {
    const user = userEvent.setup();
    renderSidebar();
    const separator = screen.getByRole("separator", { name: "Redimensionar sidebar do curso" });
    const initialWidth = Number(separator.getAttribute("aria-valuenow"));

    separator.focus();
    await user.keyboard("{ArrowRight}");

    expect(Number(separator.getAttribute("aria-valuenow"))).toBeGreaterThan(initialWidth);
  });

  it("mantém a rolagem da navegação de módulos sem barra visível", () => {
    renderSidebar();

    expect(screen.getByRole("navigation", { name: "Módulos" })).toHaveClass("no-scrollbar", "overflow-y-auto");
  });
});
