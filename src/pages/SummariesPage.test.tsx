import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { catalog } from "../content/catalog";
import { ContentNotFound } from "../content/registry";
import type { SummaryContent } from "../types/content";
import { SummariesPage } from "./SummariesPage";

const summary08: SummaryContent = {
  module: "08",
  concepts: ["RAG: buscar trechos relevantes antes de gerar a resposta."],
  pitfalls: ["Trocar o modelo de embedding exige reindexar a base."],
  diagram: { kind: "custom", id: "rag-flow" },
  lessons: ["08-02"],
};

const PUBLISHED = new Set(["08"]);

function renderSummaries({
  moduleId,
  load = vi.fn(async (id: string): Promise<SummaryContent> => {
    if (id === "08") return summary08;
    throw new ContentNotFound("summary", id);
  }),
}: { moduleId?: string; load?: (id: string) => Promise<SummaryContent> } = {}) {
  const onNavigate = vi.fn();
  render(
    <SummariesPage moduleId={moduleId} onNavigate={onNavigate} load={load} hasSummary={(id) => PUBLISHED.has(id)} />,
  );
  return { onNavigate, load, user: userEvent.setup() };
}

const items = () => within(screen.getByRole("navigation", { name: "Resumos (cheat sheets)" })).getAllByRole("link");

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SummariesPage (SUM-01.1)", () => {
  it("lista os 18 resumos, um por módulo, na ordem do catálogo", () => {
    renderSummaries();

    const links = items();
    expect(links).toHaveLength(18);
    expect(links.map((link) => link.closest("li")?.dataset.module)).toEqual(catalog.map((module) => module.id));
    expect(links[0]).toHaveTextContent("00 Introduction to AI");
    expect(links[8]).toHaveAttribute("href", "/summaries/08");
    expect(links[3]).toHaveTextContent("em produção");
    expect(links[8]).not.toHaveTextContent("em produção");
  });

  it("sem módulo na URL pede para escolher um resumo, com um único h1", () => {
    const { load } = renderSummaries();

    expect(screen.getAllByRole("heading", { level: 1 }).map((heading) => heading.textContent)).toEqual(["Resumos"]);
    expect(screen.getByText("Escolha um módulo na lista para ver o resumo.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Imprimir / PDF" })).not.toBeInTheDocument();
    expect(load).not.toHaveBeenCalled();
  });

  it("/summaries/:moduleId abre o resumo do módulo e marca o item atual", async () => {
    const { load } = renderSummaries({ moduleId: "08" });

    expect(await screen.findByRole("heading", { level: 1, name: "RAG Architecture" })).toBeInTheDocument();
    expect(screen.getByText("Resumo · Módulo 08")).toBeInTheDocument();
    expect(load).toHaveBeenCalledWith("08");
    expect(screen.getByRole("region", { name: "Conceitos-chave" })).toHaveTextContent(summary08.concepts[0]);
    expect(items()[8]).toHaveAttribute("aria-current", "page");
    expect(items()[0]).not.toHaveAttribute("aria-current");
  });

  it("o botão Imprimir / PDF chama window.print", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    const { user } = renderSummaries({ moduleId: "08" });

    await user.click(await screen.findByRole("button", { name: "Imprimir / PDF" }));

    expect(print).toHaveBeenCalledTimes(1);
  });

  it("a navegação e o botão de imprimir ficam fora da impressão (SUM-01.2)", async () => {
    renderSummaries({ moduleId: "08" });

    const button = await screen.findByRole("button", { name: "Imprimir / PDF" });
    expect(screen.getByRole("navigation", { name: "Resumos (cheat sheets)" })).toHaveClass("print-hidden");
    expect(button.closest(".print-hidden")).not.toBeNull();
    expect(screen.getByRole("article").closest(".print-hidden")).toBeNull();
  });

  it("módulo sem resumo publicado mostra que o resumo está em produção", async () => {
    renderSummaries({ moduleId: "03" });

    expect(await screen.findByText("Resumo em produção")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Imprimir / PDF" })).not.toBeInTheDocument();
  });

  it("falha ao carregar o resumo mostra tentar de novo, que recarrega", async () => {
    const load = vi
      .fn<(id: string) => Promise<SummaryContent>>()
      .mockRejectedValueOnce(new TypeError("Failed to fetch dynamically imported module"))
      .mockResolvedValueOnce(summary08);
    const { user } = renderSummaries({ moduleId: "08", load });

    expect(await screen.findByText("Não foi possível carregar o resumo")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));

    expect(await screen.findByRole("heading", { level: 1, name: "RAG Architecture" })).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("escolher um módulo na lista navega para /summaries/:moduleId", async () => {
    const { onNavigate, user } = renderSummaries();

    await user.click(items()[10]);

    expect(onNavigate).toHaveBeenCalledWith({ name: "summaries", moduleId: "10" });
  });
});
