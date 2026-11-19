import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "../app/App";

// NAV-01.4: URL que não corresponde a módulo ou aula mostra "não encontrado" com link para a home.
describe("NotFoundPage", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it.each(["/learn/99-99", "/learn/99/x"])("mostra a página não encontrado em %s", (path) => {
    window.history.replaceState(null, "", path);
    render(<App />);

    expect(screen.getByRole("heading", { level: 1, name: "Página não encontrada" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1, name: "RAG Architecture" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir para a página inicial" })).toHaveAttribute("href", "/");
    for (const tab of ["Aprender", "Prática", "Laboratório", "Resumos"]) {
      expect(screen.getByRole("button", { name: tab })).not.toHaveAttribute("aria-current");
    }
  });

  it("o link leva à home", async () => {
    window.history.replaceState(null, "", "/learn/99-99");
    render(<App />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("link", { name: "Ir para a página inicial" }));

    expect(window.location.pathname).toBe("/");
    // Desde a T77, a home é a visão da trilha (NAV-01.6), não mais a aula 08.02.
    expect(await screen.findByRole("heading", { level: 1, name: "Dos tokens aos agentes em produção." })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1, name: "Página não encontrada" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aprender" })).toHaveAttribute("aria-current", "page");
  });
});
