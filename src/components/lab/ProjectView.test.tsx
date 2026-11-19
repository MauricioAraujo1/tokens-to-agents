import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ProjectContent } from "../../types/content";
import { ProjectView } from "./ProjectView";

const project: ProjectContent = {
  id: "02",
  title: "RAG Knowledge Assistant",
  goal: "Responder perguntas sobre uma base de documentos citando as fontes.",
  steps: [
    { title: "Ingerir os documentos", body: "Leia os PDFs e quebre em chunks." },
    { title: "Indexar", body: "Gere os embeddings e grave no banco vetorial." },
    { title: "Responder", body: "Busque os chunks e monte o prompt com as fontes." },
  ],
  concepts: ["06-06", "08-02"],
  code: [
    { path: "ingest.py", source: "chunks = split(docs)" },
    { path: "answer.py", source: "context = search(question)" },
  ],
};

function region(name: string) {
  return screen.getByRole("region", { name });
}

describe("ProjectView (LAB-01.3)", () => {
  it("mostra o título e o objetivo do projeto", () => {
    render(<ProjectView project={project} />);

    expect(screen.getByRole("heading", { level: 1, name: "RAG Knowledge Assistant" })).toBeInTheDocument();
    expect(screen.getByText("Projeto guiado 02")).toBeInTheDocument();
    expect(region("Objetivo")).toHaveTextContent(project.goal);
  });

  it("lista as etapas na ordem do projeto, numeradas", () => {
    render(<ProjectView project={project} />);

    const steps = within(region("Etapas")).getAllByRole("listitem");
    expect(steps).toHaveLength(3);
    expect(steps.map((step) => within(step).getByRole("heading").textContent)).toEqual([
      "Ingerir os documentos",
      "Indexar",
      "Responder",
    ]);
    expect(steps[1]).toHaveTextContent("Gere os embeddings e grave no banco vetorial.");
    expect(within(region("Etapas")).getByRole("list").tagName).toBe("OL");
  });

  it("os conceitos aplicados apontam para /learn/:id com o número e o título do catálogo", () => {
    render(<ProjectView project={project} />);

    const links = within(region("Conceitos aplicados")).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/learn/06-06", "/learn/08-02"]);
    expect(links[0]).toHaveTextContent("06.06Cosine Similarity");
    expect(links[1]).toHaveTextContent("08.02RAG Architecture");
  });

  it("clicar num conceito navega pela SPA até a aula", async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    render(<ProjectView project={project} onNavigate={onNavigate} />);

    await user.click(within(region("Conceitos aplicados")).getByRole("link", { name: /Cosine Similarity/ }));

    expect(onNavigate).toHaveBeenCalledWith({ name: "lesson", lessonId: "06-06", step: null });
  });

  it("mostra cada arquivo do código de referência com o caminho e copia o código", async () => {
    const user = userEvent.setup();
    render(<ProjectView project={project} />);

    const code = region("Código de referência");
    expect(within(code).getByText("ingest.py")).toBeInTheDocument();
    expect(within(code).getByText("answer.py")).toBeInTheDocument();
    expect([...code.querySelectorAll("pre code")].map((block) => block.textContent)).toEqual([
      "chunks = split(docs)",
      "context = search(question)",
    ]);

    await user.click(within(code).getAllByRole("button", { name: "Copiar código" })[1]);

    expect(await navigator.clipboard.readText()).toBe("context = search(question)");
  });
});
