import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { catalog } from "../../content/catalog";
import ragLesson from "../../content/lessons/08/08-02-rag-architecture";
import { findLessonLocation } from "../../lib/course";
import { LessonFooterSections } from "./LessonFooterSections";

function region(name: string) {
  return screen.getByRole("region", { name });
}

describe("LessonFooterSections (LES-01.12, CNT-01.3, CNT-01.4)", () => {
  it("mostra as seções do rodapé com o conteúdo da aula", () => {
    render(<LessonFooterSections lesson={ragLesson} />);

    expect(region("Exemplo real")).toHaveTextContent(ragLesson.realWorldExample);
    expect(within(region("Exemplo de código")).getByText(ragLesson.code!.caption)).toBeInTheDocument();
    expect(region("Exemplo de código").querySelector("pre code")?.textContent).toBe(ragLesson.code!.source);

    const tradeOffs = region("Trade-offs");
    for (const item of [...ragLesson.tradeOffs.pros, ...ragLesson.tradeOffs.cons, ...ragLesson.tradeOffs.alternatives!]) {
      expect(within(tradeOffs).getByText(item)).toBeInTheDocument();
    }
    expect(within(tradeOffs).getByRole("heading", { name: "Vantagens" })).toBeInTheDocument();
    expect(within(tradeOffs).getByRole("heading", { name: "Desvantagens" })).toBeInTheDocument();
    expect(within(tradeOffs).getByRole("heading", { name: "Alternativas" })).toBeInTheDocument();

    expect(region("Conceitos relacionados")).toBeInTheDocument();
    expect(region("Referências")).toBeInTheDocument();
  });

  it("aula sem código não mostra o bloco de código", () => {
    render(<LessonFooterSections lesson={{ ...ragLesson, code: undefined }} />);

    expect(screen.queryByRole("region", { name: "Exemplo de código" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copiar código" })).not.toBeInTheDocument();
    expect(region("Exemplo real")).toBeInTheDocument();
  });

  it("aula sem alternativas não mostra a lista de alternativas", () => {
    render(<LessonFooterSections lesson={{ ...ragLesson, tradeOffs: { pros: ["a"], cons: ["b"] } }} />);

    expect(within(region("Trade-offs")).queryByRole("heading", { name: "Alternativas" })).not.toBeInTheDocument();
  });

  it("o botão copiar põe o código no clipboard e confirma", async () => {
    const user = userEvent.setup();
    render(<LessonFooterSections lesson={ragLesson} />);

    await user.click(screen.getByRole("button", { name: "Copiar código" }));

    expect(await navigator.clipboard.readText()).toBe(ragLesson.code!.source);
    expect(screen.getByRole("button", { name: "Código copiado" })).toBeInTheDocument();
  });

  it("os conceitos relacionados apontam para /learn/:id com o número e o título do catálogo", () => {
    render(<LessonFooterSections lesson={ragLesson} />);

    const links = within(region("Conceitos relacionados")).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual(ragLesson.related.map((id) => `/learn/${id}`));
    const first = findLessonLocation(catalog, ragLesson.related[0])!.lesson;
    expect(links[0]).toHaveTextContent(`${first.number}${first.title}`);
  });

  it("o clique num conceito relacionado navega pela SPA", async () => {
    const onNavigate = vi.fn();
    render(<LessonFooterSections lesson={ragLesson} onNavigate={onNavigate} />);

    await userEvent.setup().click(within(region("Conceitos relacionados")).getAllByRole("link")[0]);

    expect(onNavigate).toHaveBeenCalledWith({ name: "lesson", lessonId: ragLesson.related[0], step: null });
  });

  it('as referências abrem numa aba nova com rel="noopener noreferrer" e mostram o tipo da fonte', () => {
    render(<LessonFooterSections lesson={ragLesson} />);

    const references = region("Referências");
    const links = within(references).getAllByRole("link");
    expect(links).toHaveLength(ragLesson.references.length);
    ragLesson.references.forEach((reference, index) => {
      expect(links[index]).toHaveAttribute("href", reference.url);
      expect(links[index]).toHaveAttribute("target", "_blank");
      expect(links[index]).toHaveAttribute("rel", "noopener noreferrer");
      expect(links[index]).toHaveAccessibleName(`${reference.title} (abre em nova aba)`);
    });
    expect(within(references).getAllByText("Paper")).toHaveLength(
      ragLesson.references.filter((reference) => reference.kind === "paper").length,
    );
    expect(within(references).getByText("Documentação")).toBeInTheDocument();
  });

  it("em RTL, o conteúdo em PT do rodapé fica em LTR e os títulos das seções seguem o idioma (I18N-01.4, T140)", () => {
    render(
      <div dir="rtl">
        <LessonFooterSections lesson={ragLesson} />
      </div>,
    );
    const directionOf = (element: Element) => element.closest("[dir]")?.getAttribute("dir");

    expect(directionOf(within(region("Exemplo real")).getByText(ragLesson.realWorldExample))).toBe("ltr");
    expect(directionOf(within(region("Exemplo de código")).getByText(ragLesson.code!.caption))).toBe("ltr");
    expect(directionOf(within(region("Trade-offs")).getByText(ragLesson.tradeOffs.pros[0]))).toBe("ltr");
    expect(directionOf(within(region("Referências")).getByText(ragLesson.references[0].title))).toBe("ltr");
    expect(directionOf(within(region("Trade-offs")).getByRole("heading", { name: "Vantagens" }))).toBe("rtl");
  });

  it("legenda e referências longas quebram linha, sem scroll horizontal no celular (RSP-01.5)", () => {
    render(<LessonFooterSections lesson={ragLesson} />);

    const caption = within(region("Exemplo de código")).getByText(ragLesson.code!.caption);
    expect(caption).toHaveClass("min-w-0", "wrap-anywhere");
    expect(caption.closest("figure")).toHaveClass("min-w-0");
    expect(caption.parentElement).toHaveClass("min-w-0");
    for (const link of within(region("Referências")).getAllByRole("link")) {
      expect(link).toHaveClass("min-w-0", "wrap-anywhere");
    }
  });
});
