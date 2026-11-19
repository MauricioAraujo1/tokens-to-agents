import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { projectCatalog } from "../content/catalog";
import { ContentNotFound } from "../content/registry";
import { playgrounds } from "../lab/registry";
import type { ProjectContent } from "../types/content";
import { LabPage } from "./LabPage";

const project02: ProjectContent = {
  id: "02",
  title: "RAG Knowledge Assistant",
  goal: "Responder perguntas sobre documentos citando as fontes.",
  steps: [{ title: "Indexar", body: "Gere os embeddings." }],
  concepts: ["08-02"],
  code: [{ path: "index.py", source: "index(docs)" }],
};

const WRITTEN = new Set(["02"]);

function renderLab({
  playgroundId,
  projectId,
  load = vi.fn(async (id: string): Promise<ProjectContent> => {
    if (id === "02") return project02;
    throw new ContentNotFound("project", id);
  }),
}: {
  playgroundId?: string;
  projectId?: string;
  load?: (id: string) => Promise<ProjectContent>;
} = {}) {
  const onNavigate = vi.fn();
  render(
    <LabPage
      playgroundId={playgroundId}
      projectId={projectId}
      onNavigate={onNavigate}
      loadProject={load}
      hasProject={(id) => WRITTEN.has(id)}
    />,
  );
  return { onNavigate, load, user: userEvent.setup() };
}

const list = (name: string) => within(screen.getByRole("region", { name })).getAllByRole("link");

describe("LabPage (LAB-01.1, LAB-01.3)", () => {
  it("lista os 8 playgrounds e os 5 projetos guiados, com o link de cada um", () => {
    renderLab();

    const playgroundLinks = list("Playgrounds");
    expect(playgroundLinks).toHaveLength(8);
    expect(playgroundLinks.map((link) => link.getAttribute("href"))).toEqual([
      "/lab/playground/bpe-tokenizer",
      "/lab/playground/sampling",
      "/lab/playground/attention-weights",
      "/lab/playground/embedding-space",
      "/lab/playground/chunking",
      "/lab/playground/bm25-vs-vector",
      "/lab/playground/kv-cache",
      "/lab/playground/agent-loop",
    ]);
    expect(playgroundLinks[1]).toHaveTextContent("Temperatura e amostragem");

    const projectLinks = list("Projetos guiados");
    expect(projectLinks).toHaveLength(5);
    expect(projectLinks.map((link) => link.getAttribute("href"))).toEqual(
      projectCatalog.map((project) => `/lab/project/${project.id}`),
    );
    expect(projectLinks[0]).toHaveTextContent("01 AI Chat Application");
    expect(projectLinks[0]).toHaveTextContent("em produção");
    expect(projectLinks[1]).not.toHaveTextContent("em produção");
  });

  it("sem item na URL mostra a apresentação do Laboratório, com um único h1", () => {
    const { load } = renderLab();

    expect(screen.getAllByRole("heading", { level: 1 }).map((heading) => heading.textContent)).toEqual(["Laboratório"]);
    expect(load).not.toHaveBeenCalled();
  });

  it("/lab/playground/:id abre o playground, marca o item atual e mantém um único h1", () => {
    renderLab({ playgroundId: "sampling" });

    expect(screen.getAllByRole("heading", { level: 1 }).map((heading) => heading.textContent)).toEqual([
      "Temperatura e amostragem",
    ]);
    expect(screen.getByRole("slider", { name: "Temperatura" })).toBeInTheDocument();
    expect(list("Playgrounds")[1]).toHaveAttribute("aria-current", "page");
    expect(list("Playgrounds")[0]).not.toHaveAttribute("aria-current");
  });

  it("cada id da lista abre o seu playground", () => {
    for (const playground of playgrounds) {
      const { unmount } = render(<LabPage playgroundId={playground.id} onNavigate={vi.fn()} />);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(playground.title);
      unmount();
    }
  });

  it("/lab/project/:id abre o projeto guiado com objetivo, etapas e conceitos", async () => {
    const { load } = renderLab({ projectId: "02" });

    expect(await screen.findByRole("heading", { level: 1, name: "RAG Knowledge Assistant" })).toBeInTheDocument();
    expect(load).toHaveBeenCalledWith("02");
    expect(screen.getByRole("region", { name: "Objetivo" })).toHaveTextContent(project02.goal);
    expect(list("Projetos guiados")[1]).toHaveAttribute("aria-current", "page");
  });

  it("projeto ainda não escrito mostra que está em produção", async () => {
    renderLab({ projectId: "01" });

    expect(await screen.findByText("Projeto em produção")).toBeInTheDocument();
  });

  it("falha ao carregar o projeto mostra tentar de novo, que recarrega", async () => {
    const load = vi
      .fn<(id: string) => Promise<ProjectContent>>()
      .mockRejectedValueOnce(new TypeError("Failed to fetch dynamically imported module"))
      .mockResolvedValueOnce(project02);
    const { user } = renderLab({ projectId: "02", load });

    expect(await screen.findByText("Não foi possível carregar o projeto")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));

    expect(await screen.findByRole("heading", { level: 1, name: "RAG Knowledge Assistant" })).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("id desconhecido de playground ou de projeto vira a página não encontrado", () => {
    const { unmount } = render(<LabPage playgroundId="nao-existe" onNavigate={vi.fn()} />);
    expect(screen.getByRole("heading", { level: 1, name: "Página não encontrada" })).toBeInTheDocument();
    unmount();

    render(<LabPage projectId="09" onNavigate={vi.fn()} />);
    expect(screen.getByRole("heading", { level: 1, name: "Página não encontrada" })).toBeInTheDocument();
  });

  it("escolher um item na lista navega para a URL dele", async () => {
    const { onNavigate, user } = renderLab();

    await user.click(list("Playgrounds")[6]);
    await user.click(list("Projetos guiados")[4]);

    expect(onNavigate).toHaveBeenNthCalledWith(1, { name: "lab", playgroundId: "kv-cache" });
    expect(onNavigate).toHaveBeenNthCalledWith(2, { name: "lab", projectId: "05" });
  });

  it("a página não encontrado leva para a home", async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    render(<LabPage playgroundId="nao-existe" onNavigate={onNavigate} />);

    await user.click(screen.getByRole("link", { name: "Ir para a página inicial" }));

    expect(onNavigate).toHaveBeenCalledWith({ name: "home" });
  });
});
