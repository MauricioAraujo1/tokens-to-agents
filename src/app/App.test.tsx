import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";

function renderApp() {
  render(<App />);

  return { user: userEvent.setup() };
}

describe("App", () => {
  it("abre na aula RAG com o primeiro passo, a timeline e o painel explicativo", () => {
    renderApp();

    expect(screen.getByRole("heading", { level: 1, name: "Como funciona o RAG" })).toBeInTheDocument();
    expect(screen.getByText("Passo 1 / 10")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "A aplicação recebe a pergunta" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Próximo: Embedding" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Voltar" })).toBeDisabled();
  });

  it("avança para o próximo passo atualizando painel, timeline e diagrama juntos", async () => {
    const { user } = renderApp();

    await user.click(screen.getByRole("button", { name: "Próximo: Embedding" }));

    expect(screen.getByRole("heading", { level: 2, name: "O modelo de embedding gera um vetor" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Passo 2: Embedding" })).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("button", { name: "Embedding" })).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("button", { name: "Voltar" })).toBeEnabled();
  });

  it("volta ao passo anterior e repete a demonstração a partir do primeiro passo", async () => {
    const { user } = renderApp();

    await user.click(screen.getByRole("button", { name: "Próximo: Embedding" }));
    await user.click(screen.getByRole("button", { name: "Voltar" }));
    expect(screen.getByText("Passo 1 / 10")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Próximo: Embedding" }));
    await user.click(screen.getByRole("button", { name: "Próximo: Busca" }));
    await user.click(screen.getByRole("button", { name: "Repetir" }));
    expect(screen.getByText("Passo 1 / 10")).toBeInTheDocument();
  });

  it("seleciona uma etapa pela timeline e pelo nó do diagrama", async () => {
    const { user } = renderApp();

    await user.click(screen.getByRole("button", { name: "Passo 7: Contexto" }));
    expect(screen.getByText("Passo 7 / 10")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "LLM" }));
    expect(screen.getByText("Passo 9 / 10")).toBeInTheDocument();
  });

  it("navega com as setas e pausa com Space, mas não captura teclas durante a digitação", async () => {
    const { user } = renderApp();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByText("Passo 2 / 10")).toBeInTheDocument();

    await user.keyboard(" ");
    expect(screen.getByRole("button", { name: "Pausar" })).toBeInTheDocument();

    await user.keyboard("{Control>}k{/Control}");
    const searchInput = screen.getByRole("searchbox", { name: "Buscar lições e conceitos" });
    await user.type(searchInput, " ");
    expect(searchInput).toHaveValue(" ");
    expect(screen.getByRole("button", { name: "Pausar" })).toBeInTheDocument();
  });

  it("abre a busca com Ctrl+K e leva até a aula escolhida", async () => {
    const { user } = renderApp();

    await user.keyboard("{Control>}k{/Control}");
    await user.type(screen.getByRole("searchbox", { name: "Buscar lições e conceitos" }), "chunking");
    const dialog = screen.getByRole("dialog", { name: "Buscar lições" });
    await user.click(within(dialog).getByRole("button", { name: /Chunking Strategies/ }));

    expect(screen.getByRole("heading", { level: 1, name: "Chunking Strategies" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("alterna o tema claro e escuro pelo cabeçalho", async () => {
    const { user } = renderApp();

    await user.click(screen.getByRole("button", { name: "Ativar tema escuro" }));
    expect(document.documentElement.dataset.theme).toBe("dark");

    await user.click(screen.getByRole("button", { name: "Ativar tema claro" }));
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("abre uma aula genérica pela sidebar e marca a aula como em andamento", async () => {
    const { user } = renderApp();

    await user.click(screen.getByRole("button", { name: /01\. Machine Learning/ }));
    await user.click(screen.getByRole("button", { name: /Aprendizado Supervisionado/ }));

    expect(screen.getByRole("heading", { level: 1, name: "Aprendizado Supervisionado" })).toBeInTheDocument();
    expect(screen.getByText("Visualização em preparação")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Aprendizado Supervisionado.*Em andamento/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByText("6 / 59")).toBeInTheDocument();
  });

  it("marca a aula como concluída ao finalizar o último passo", async () => {
    const { user } = renderApp();

    await user.click(screen.getByRole("button", { name: "Passo 10: Resposta" }));
    await user.click(screen.getByRole("button", { name: "Concluir aula" }));

    expect(screen.getByRole("button", { name: "Aula concluída" })).toBeDisabled();
    expect(screen.getByText("7 / 59")).toBeInTheDocument();
  });

  it("mostra o placeholder das outras seções e volta para Aprender", async () => {
    const { user } = renderApp();

    await user.click(screen.getByRole("button", { name: "Prática" }));
    expect(screen.getByRole("heading", { level: 1, name: "Prática" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Voltar para Aprender" }));
    expect(screen.getByRole("heading", { level: 1, name: "Como funciona o RAG" })).toBeInTheDocument();
  });

  it("mantém a timeline em uma lista ordenada de etapas", () => {
    renderApp();

    const timeline = screen.getByRole("region", { name: "Etapas da aula" });

    expect(within(timeline).getAllByRole("button")).toHaveLength(10);
  });
});
