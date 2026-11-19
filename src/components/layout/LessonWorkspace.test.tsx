import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { catalog } from "../../content/catalog";
import ragLesson from "../../content/lessons/08/08-02-rag-architecture";
import { CourseSidebar } from "./CourseSidebar";
import { LessonWorkspace } from "./LessonWorkspace";
import { createStatusMap } from "../../lib/course";

// O jsdom não faz layout: os testes conferem as classes de cada breakpoint.
// O layout real em 375, 1024 e 1440 px fica para o agente `qa` no navegador.

const rag = catalog.find((module) => module.id === "08")!;

function renderWorkspace() {
  render(
    <LessonWorkspace
      module={rag}
      meta={rag.lessons[1]}
      lessonIndex={1}
      lesson={ragLesson}
      stage={<div>cena</div>}
      panel={<aside aria-label="narração">narração</aside>}
    >
      <div>stepper</div>
    </LessonWorkspace>,
  );

  const layout = screen.getByRole("region", { name: "Aula atual" });
  const area = (name: string) => layout.querySelector<HTMLElement>(`:scope > [data-area="${name}"]`)!;
  return { layout, area };
}

describe("LessonWorkspace: layout responsivo (RSP-01)", () => {
  it("abaixo de 768 px empilha cabeçalho, cena, narração e resto, nessa ordem (RSP-01.3)", () => {
    const { layout } = renderWorkspace();

    expect(layout).toHaveClass("flex", "flex-col");
    const areas = Array.from(layout.children).map((child) => (child as HTMLElement).dataset.area);
    expect(areas).toEqual(["header", "stage", "panel", "body"]);
  });

  it("de 768 px em diante põe cena e narração lado a lado, com a narração na segunda coluna (RSP-01.2)", () => {
    const { layout, area } = renderWorkspace();

    expect(layout).toHaveClass("md:grid", "md:grid-cols-[minmax(0,1fr)_auto]");
    for (const name of ["header", "stage", "body"]) {
      expect(area(name)).toHaveClass("md:col-start-1");
    }
    expect(area("panel")).toHaveClass("md:col-start-2", "md:row-span-3", "md:sticky", "md:top-0");
    expect(area("panel")).toContainElement(screen.getByRole("complementary", { name: "narração" }));
    expect(area("stage")).toHaveTextContent("cena");
  });

  it("nenhuma área força largura mínima, para não haver rolagem horizontal a partir de 320 px (RSP-01.5)", () => {
    const { layout } = renderWorkspace();

    expect(layout).toHaveClass("min-w-0");
    for (const child of Array.from(layout.children)) {
      expect(child).toHaveClass("min-w-0");
    }
  });

  it("sem cena e sem narração (aula em preparação) mostra só cabeçalho e corpo", () => {
    render(
      <LessonWorkspace module={rag} meta={rag.lessons[1]} lessonIndex={1} lesson={null}>
        <p>em preparação</p>
      </LessonWorkspace>,
    );

    const layout = screen.getByRole("region", { name: "Aula atual" });
    const areas = Array.from(layout.children).map((child) => (child as HTMLElement).dataset.area);
    expect(areas).toEqual(["header", "body"]);
  });
});

describe("Árvore do curso por breakpoint (RSP-01.1, RSP-01.2)", () => {
  it("é coluna fixa a partir de 1280 px e gaveta abaixo disso", () => {
    render(
      <CourseSidebar
        modules={catalog}
        selectedLessonId="08-02"
        statuses={createStatusMap(catalog)}
        isOpen={false}
        onSelectLesson={vi.fn()}
      />,
    );

    const tree = screen.getByRole("complementary", { hidden: true });
    // Gaveta: fixa e fora da tela até o botão abrir.
    expect(tree).toHaveClass("fixed", "invisible", "-translate-x-full");
    // A partir de 1280 px: coluna no fluxo, sempre visível.
    expect(tree).toHaveClass("xl:relative", "xl:translate-x-0", "xl:visible");
  });
});
