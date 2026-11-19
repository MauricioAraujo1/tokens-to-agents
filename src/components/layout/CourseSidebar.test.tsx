import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { catalog } from "../../content/catalog";
import { createStatusMap, type LessonStatusMap } from "../../lib/course";
import { CourseSidebar } from "./CourseSidebar";

const SELECTED_LESSON_ID = "08-02";

function renderSidebar({
  onSelectLesson = vi.fn(),
  statuses = createStatusMap(catalog),
}: { onSelectLesson?: (lessonId: string) => void; statuses?: LessonStatusMap } = {}) {
  render(
    <CourseSidebar
      modules={catalog}
      selectedLessonId={SELECTED_LESSON_ID}
      statuses={statuses}
      isOpen
      onSelectLesson={onSelectLesson}
    />,
  );

  return { onSelectLesson };
}

function moduleButtons(): HTMLElement[] {
  const navigation = screen.getByRole("navigation", { name: "Módulos" });
  return within(navigation)
    .getAllByRole("button")
    .filter((button) => button.hasAttribute("aria-expanded"));
}

describe("CourseSidebar", () => {
  it("lista os 18 módulos do catálogo na ordem de 00 a 17, com o título do roadmap (NAV-01.1)", () => {
    renderSidebar();

    const labels = moduleButtons().map((button) => button.textContent);

    expect(labels).toHaveLength(18);
    catalog.forEach((module, index) => {
      expect(labels[index]).toBe(`${module.id}. ${module.title}0/${module.lessons.length}`);
    });
    expect(labels[0]).toBe("00. Introduction to AI0/8");
    expect(labels[17]).toBe("17. AI Infrastructure & Deployment0/14");
  });

  it("os títulos de módulo e de aula em PT ficam isolados em LTR, para o RTL não inverter o número (I18N-01.4, T140)", () => {
    renderSidebar();

    const module = moduleButtons()[8];
    const moduleTitle = module.querySelector("bdi");
    expect(moduleTitle).toHaveAttribute("dir", "ltr");
    expect(moduleTitle).toHaveTextContent("08. RAG Architecture");
    const lesson = screen.getByRole("button", { name: /^RAG Architecture/ });
    expect(lesson.querySelector("bdi")).toHaveAttribute("dir", "ltr");
    expect(lesson.querySelector("bdi")).toHaveTextContent("RAG Architecture");
  });

  it("pinta cada módulo com a sua cor --module-NN (NAV-01.1)", () => {
    renderSidebar();

    moduleButtons().forEach((button, index) => {
      const icon = button.querySelector("svg[style]");
      expect(icon?.getAttribute("style")).toContain(`var(--module-${catalog[index].id})`);
    });
  });

  it("mostra o contador concluídas/total de cada módulo e do curso (NAV-01.1)", () => {
    renderSidebar({
      statuses: {
        ...createStatusMap(catalog),
        "08-01": "completed",
        "08-02": "completed",
        "08-03": "in-progress",
        "03-08": "completed",
      },
    });

    expect(screen.getByRole("button", { name: /^08\. RAG Architecture/ })).toHaveTextContent("2/16");
    expect(screen.getByRole("button", { name: /^03\. Transformers Architecture/ })).toHaveTextContent("1/15");
    expect(screen.getByRole("button", { name: /^00\. Introduction to AI/ })).toHaveTextContent("0/8");
    expect(screen.getByText("3 / 237")).toBeInTheDocument();
  });

  it("abre com o título Trilha e o total de aulas, e marca com ✓ o módulo concluído", () => {
    const introLessons = catalog[0].lessons;
    renderSidebar({
      statuses: {
        ...createStatusMap(catalog),
        ...Object.fromEntries(introLessons.map((lesson) => [lesson.id, "completed" as const])),
      },
    });

    expect(screen.getByText("Trilha")).toBeInTheDocument();
    expect(screen.getByText("237 lições")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^00\. Introduction to AI/ })).toHaveTextContent(
      `${introLessons.length}/${introLessons.length} ✓`,
    );
    expect(screen.getByRole("button", { name: /^01\. / })).not.toHaveTextContent("✓");
  });

  it("começa com o curso todo por fazer: 0 / 237", () => {
    renderSidebar();

    expect(screen.getByText("0 / 237")).toBeInTheDocument();
  });

  it("ao expandir um módulo, lista as aulas na ordem do roadmap (NAV-01.2)", async () => {
    const user = userEvent.setup();
    renderSidebar();

    await user.click(screen.getByRole("button", { name: /^03\. Transformers Architecture/ }));

    const panel = document.getElementById("module-panel-03");
    expect(panel).not.toBeNull();
    const lessonTitles = within(panel as HTMLElement)
      .getAllByRole("button")
      .map((button) => button.querySelector(".truncate")?.textContent);
    expect(lessonTitles).toEqual(catalog[3].lessons.map((lesson) => lesson.title));
    expect(lessonTitles[7]).toBe("Self-Attention");
  });

  it("expande e recolhe um módulo ao clicar nele", async () => {
    const user = userEvent.setup();
    renderSidebar();

    expect(screen.queryByRole("button", { name: /What is Artificial Intelligence\?/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^00\. Introduction to AI/ }));
    expect(screen.getByRole("button", { name: /What is Artificial Intelligence\?/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^00\. Introduction to AI/ }));
    expect(screen.queryByRole("button", { name: /What is Artificial Intelligence\?/ })).not.toBeInTheDocument();
  });

  it("mantém aberto o módulo da aula atual", () => {
    renderSidebar();

    expect(screen.getByRole("button", { name: /^Chunking Strategies/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^RAG Architecture/ })).toHaveAttribute("aria-current", "page");
  });

  it("informa a aula escolhida ao clicar nela", async () => {
    const user = userEvent.setup();
    const { onSelectLesson } = renderSidebar();

    await user.click(screen.getByRole("button", { name: /^Chunking Strategies/ }));

    expect(onSelectLesson).toHaveBeenCalledWith("08-05");
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

  it("expande todos os módulos e depois recolhe todos", async () => {
    const user = userEvent.setup();
    renderSidebar();

    await user.click(screen.getByRole("button", { name: "Expandir módulos" }));
    expect(screen.getByRole("button", { name: /^Generative AI/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^CI\/CD for AI Systems/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Recolher módulos" }));
    expect(screen.queryByRole("button", { name: /^Generative AI/ })).not.toBeInTheDocument();
  });
});
