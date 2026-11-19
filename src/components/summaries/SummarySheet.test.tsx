import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { catalog } from "../../content/catalog";
import summary03 from "../../content/summaries/03";
import type { SummaryContent } from "../../types/content";
import { SummarySheet } from "./SummarySheet";

const summary: SummaryContent = {
  module: "03",
  concepts: [
    "Token: pedaço de texto que o modelo enxerga.",
    "Self-attention: cada token mistura informação dos outros.",
  ],
  formulas: ["Attention(Q,K,V) = softmax(Q·Kᵀ / √d_k) · V"],
  pitfalls: ["Dobrar o contexto quadruplica a conta da atenção."],
  diagram: {
    kind: "pieces",
    layout: "single",
    pieces: [
      {
        piece: "pipeline",
        stages: [
          { id: "text", label: "texto" },
          { id: "tokens", label: "tokens (BPE)" },
          { id: "attention", label: "multi-head attention" },
        ],
        active: "attention",
      },
    ],
  },
  lessons: ["03-01", "03-08"],
};

const module03 = catalog.find((module) => module.id === "03")!;

function region(name: string) {
  return screen.getByRole("region", { name });
}

describe("SummarySheet (SUM-01.1)", () => {
  it("mostra o módulo com a faixa da sua cor e o título do catálogo", () => {
    render(<SummarySheet summary={summary} />);

    const title = screen.getByRole("heading", { level: 1, name: module03.title });
    expect(title).toBeInTheDocument();
    expect(screen.getByText("Resumo · Módulo 03")).toBeInTheDocument();
    expect(screen.getByRole("article").getAttribute("style")).toContain("var(--module-03)");
  });

  it("mostra no cabeçalho o número de aulas e o tempo de estudo do módulo (preview 10)", () => {
    render(<SummarySheet summary={summary} />);

    // Módulo 03: 15 aulas que somam 163 min no catálogo, arredondados para ~3 h.
    expect(screen.getByText("15 aulas · ~3 h de estudo")).toBeInTheDocument();
  });

  it("desenha o diagrama do resumo com o motor de cenas e a descrição acessível", () => {
    render(<SummarySheet summary={summary} />);

    const diagram = screen.getByRole("figure", { name: /Pipeline com as etapas texto, tokens \(BPE\) e multi-head attention/ });
    expect(diagram.querySelector('[data-piece="pipeline"]')).not.toBeNull();
  });

  it("lista os conceitos-chave, as fórmulas e as pegadinhas", () => {
    render(<SummarySheet summary={summary} />);

    expect(within(region("Conceitos-chave")).getAllByRole("listitem").map((item) => item.textContent)).toEqual(summary.concepts);
    expect(within(region("Fórmulas")).getByText(summary.formulas![0])).toBeInTheDocument();
    expect(within(region("Pegadinhas")).getAllByRole("listitem").map((item) => item.textContent)).toEqual(summary.pitfalls);
  });

  it("resumo sem fórmulas não mostra a seção Fórmulas", () => {
    render(<SummarySheet summary={{ ...summary, formulas: undefined }} />);

    expect(screen.queryByRole("region", { name: "Fórmulas" })).not.toBeInTheDocument();
    expect(region("Conceitos-chave")).toBeInTheDocument();
  });

  it("os links das aulas apontam para /learn/:id com o número e o título do catálogo", () => {
    render(<SummarySheet summary={summary} />);

    const links = within(region("Aulas")).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/learn/03-01", "/learn/03-08"]);
    expect(links[0]).toHaveTextContent("03.01The Evolution of Language Models");
    expect(links[1]).toHaveTextContent("03.08Self-Attention");
  });

  it("o fluxo do resumo 03 sai em chips de texto como no preview 10, sem a faixa mínima da cena em SVG (T138)", () => {
    const { container } = render(<SummarySheet summary={summary03} />);
    const diagram = container.querySelector(".summary-diagram") as HTMLElement;

    expect(diagram).not.toHaveClass("min-h-48");
    expect(diagram.querySelector('[data-display="chips"]')).not.toBeNull();
    expect(within(diagram).getByText("multi-head attention").style.backgroundColor).toBe("var(--module-03)");
    expect(diagram.querySelector('[data-repeat="× N"]')).toHaveTextContent("multi-head attentionFFN× N");
    expect(within(diagram).getByText("logits → próximo token").style.backgroundColor).toBe("var(--accent-brand)");
  });

  it("um resumo com cena em SVG mantém a faixa mínima do diagrama", () => {
    const { container } = render(<SummarySheet summary={summary} />);

    expect(container.querySelector(".summary-diagram")).toHaveClass("min-h-48");
  });

  it("clicar numa aula navega pela SPA", async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    render(<SummarySheet summary={summary} onNavigate={onNavigate} />);

    await user.click(within(region("Aulas")).getByRole("link", { name: /Self-Attention/ }));

    expect(onNavigate).toHaveBeenCalledWith({ name: "lesson", lessonId: "03-08", step: null });
  });
});
