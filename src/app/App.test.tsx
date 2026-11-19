import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";

function renderApp() {
  render(<App />);

  return { user: userEvent.setup() };
}

async function renderLesson() {
  const context = renderApp();
  await context.user.click(screen.getByRole("button", { name: /Continuar: Como funciona o RAG/ }));

  return context;
}

describe("App", () => {
  it("abre na Home com a chamada para continuar, o progresso e os 18 módulos", () => {
    renderApp();

    expect(screen.getByRole("heading", { level: 1, name: "Dos tokens aos agentes em produção." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continuar: Como funciona o RAG/ })).toBeInTheDocument();
    expect(screen.getByText("6 / 59 · 10%")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "18 módulos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aprender" })).toHaveAttribute("aria-current", "page");
  });

  it("continua a aula RAG com o primeiro passo, a timeline e o painel explicativo", async () => {
    await renderLesson();

    expect(screen.getByRole("heading", { level: 1, name: "Como funciona o RAG" })).toBeInTheDocument();
    expect(screen.getByText("Passo 1 / 10")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "A aplicação recebe a pergunta" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Próximo: Embedding" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Voltar" })).toBeDisabled();
    expect(screen.getByRole("heading", { level: 3, name: "Você vai aprender" })).toBeInTheDocument();
  });

  it("avança para o próximo passo atualizando painel, timeline, diagrama e objetivos juntos", async () => {
    const { user } = await renderLesson();

    await user.click(screen.getByRole("button", { name: "Próximo: Embedding" }));
    await user.click(screen.getByRole("button", { name: "Próximo: Busca" }));

    expect(screen.getByRole("heading", { level: 2, name: "O banco vetorial recebe a consulta" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Passo 3: Busca" })).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("button", { name: "Banco vetorial" })).toHaveAttribute("aria-current", "step");
    expect(screen.getByText(/Transformar a pergunta em um vetor/)).toHaveTextContent("(concluído)");
    expect(screen.getByRole("button", { name: "Voltar" })).toBeEnabled();
  });

  it("volta ao passo anterior e repete a demonstração pelo botão e pela tecla R", async () => {
    const { user } = await renderLesson();

    await user.click(screen.getByRole("button", { name: "Próximo: Embedding" }));
    await user.click(screen.getByRole("button", { name: "Voltar" }));
    expect(screen.getByText("Passo 1 / 10")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Próximo: Embedding" }));
    await user.click(screen.getByRole("button", { name: "Repetir" }));
    expect(screen.getByText("Passo 1 / 10")).toBeInTheDocument();

    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(screen.getByText("Passo 3 / 10")).toBeInTheDocument();
    await user.keyboard("r");
    expect(screen.getByText("Passo 1 / 10")).toBeInTheDocument();
  });

  it("seleciona uma etapa pela timeline e pelo nó do diagrama", async () => {
    const { user } = await renderLesson();

    await user.click(screen.getByRole("button", { name: "Passo 7: Contexto" }));
    expect(screen.getByText("Passo 7 / 10")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "LLM" }));
    expect(screen.getByText("Passo 9 / 10")).toBeInTheDocument();
  });

  it("navega com as setas e pausa com Space, mas não captura teclas durante a digitação", async () => {
    const { user } = await renderLesson();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByText("Passo 2 / 10")).toBeInTheDocument();

    await user.keyboard(" ");
    expect(screen.getByRole("button", { name: "Pausar" })).toBeInTheDocument();

    await user.keyboard("{Control>}k{/Control}");
    const searchInput = screen.getByRole("searchbox", { name: "Buscar aulas e conceitos" });
    await user.type(searchInput, " r");
    expect(searchInput).toHaveValue(" r");
    expect(screen.getByRole("button", { name: "Pausar" })).toBeInTheDocument();
  });

  it("abre a busca com Ctrl+K a partir da Home e leva até a aula escolhida", async () => {
    const { user } = renderApp();

    await user.keyboard("{Control>}k{/Control}");
    await user.type(screen.getByRole("searchbox", { name: "Buscar aulas e conceitos" }), "chunking");
    const dialog = screen.getByRole("dialog", { name: "Buscar aulas" });
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

  it("abre o seletor de idioma com o português ativo e os demais em breve", async () => {
    const { user } = renderApp();

    await user.click(screen.getByRole("button", { name: "Idioma da interface: PT" }));
    const menu = screen.getByRole("dialog", { name: "Idioma da interface" });

    expect(within(menu).getByRole("button", { name: /Português/ })).toHaveAttribute("aria-pressed", "true");
    expect(within(menu).getByRole("button", { name: /English/ })).toBeDisabled();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Idioma da interface" })).not.toBeInTheDocument();
  });

  it("abre uma aula genérica pela sidebar e marca a aula como em andamento", async () => {
    const { user } = await renderLesson();

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
    const { user } = await renderLesson();

    await user.click(screen.getByRole("button", { name: "Passo 10: Resposta" }));
    await user.click(screen.getByRole("button", { name: "Concluir aula" }));

    expect(screen.getByRole("button", { name: "Aula concluída" })).toBeDisabled();
    expect(screen.getByText("7 / 59")).toBeInTheDocument();
  });

  it("zera e importa o progresso pela Home", async () => {
    const { user } = renderApp();

    await user.click(screen.getByRole("button", { name: "Zerar" }));
    expect(screen.getByText("0 / 59 · 0%")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Progresso zerado.");

    const file = new File([JSON.stringify({ version: 1, statuses: { "00-01": "completed" } })], "progresso.json", {
      type: "application/json",
    });
    await user.upload(screen.getByLabelText("Arquivo de progresso"), file);

    expect(await screen.findByText("Progresso importado.")).toBeInTheDocument();
    expect(screen.getByText("1 / 59 · 2%")).toBeInTheDocument();
  });

  it("abre o módulo pela Home na primeira aula ainda não concluída", async () => {
    const { user } = renderApp();

    await user.click(screen.getByRole("button", { name: /^03 Arquitetura Transformers/ }));

    expect(screen.getByRole("heading", { level: 1, name: "Tokenização" })).toBeInTheDocument();
  });

  it("responde o quiz, mostra a explicação e revisa o passo indicado na aula de Self-Attention", async () => {
    const { user } = renderApp();

    await user.click(screen.getByRole("button", { name: "Prática" }));
    expect(screen.getByRole("heading", { level: 1, name: "Quiz · 03. Arquitetura Transformers" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Junta repetidamente/ }));
    expect(screen.getByText("correta")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Próxima questão/ }));

    await user.click(screen.getByRole("button", { name: /De três tabelas/ }));
    expect(screen.getByText("sua resposta")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Por que C" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Próxima questão/ }));

    await user.click(screen.getByRole("button", { name: /Para garantir que a soma/ }));
    await user.click(screen.getByRole("button", { name: /Revisar: 03\.02 Self-Attention, passo 4/ }));

    expect(screen.getByRole("heading", { level: 1, name: "Self-Attention" })).toBeInTheDocument();
    expect(screen.getByText("Passo 4 / 10")).toBeInTheDocument();
    expect(screen.getByText("pontuação = q_ele · k_x / √64")).toBeInTheDocument();
  });

  it("mostra o resultado final do quiz e a melhor nota na lista", async () => {
    const { user } = renderApp();

    await user.click(screen.getByRole("button", { name: "Prática" }));
    await user.click(screen.getByRole("button", { name: /08 RAG Architecture/ }));

    for (const option of [/Porque modelos diferentes/, /Entra mais ruído/, /O fluxo alternativo/]) {
      await user.click(screen.getByRole("button", { name: option }));
      await user.click(screen.getByRole("button", { name: /Próxima questão|Ver resultado/ }));
    }

    expect(screen.getByRole("heading", { level: 2, name: "Você acertou 3 de 3." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /08 RAG Architecture\s*3\/3 ★/ })).toBeInTheDocument();
  });

  it("recalcula a distribuição no laboratório e sorteia um token", async () => {
    const { user } = renderApp();

    await user.click(screen.getByRole("button", { name: "Laboratório" }));
    expect(screen.getByRole("heading", { level: 1, name: "Temperatura e amostragem" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Top-k"), { target: { value: "2" } });
    expect(screen.getAllByText("cortado pelo top-k")).toHaveLength(7);

    await user.click(screen.getByRole("button", { name: "Sortear um token" }));
    expect(screen.getByText(/^Sorteados:/)).toHaveTextContent(/^Sorteados: (azul|nublado)$/);
  });

  it("mostra o resumo do módulo e abre uma aula pelos links", async () => {
    const { user } = renderApp();

    await user.click(screen.getByRole("button", { name: "Resumos" }));
    expect(screen.getByRole("heading", { level: 2, name: "Arquitetura Transformers" })).toBeInTheDocument();
    expect(screen.getByText("Attention(Q,K,V) = softmax(Q·Kᵀ / √d_k) · V")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "03.01 Tokenização" }));
    expect(screen.getByRole("heading", { level: 1, name: "Tokenização" })).toBeInTheDocument();
  });

  it("volta para a Home pela marca no cabeçalho", async () => {
    const { user } = await renderLesson();

    await user.click(screen.getByRole("button", { name: "Tokens to Agents, página inicial" }));

    expect(screen.getByRole("heading", { level: 1, name: "Dos tokens aos agentes em produção." })).toBeInTheDocument();
  });

  it("mantém a timeline em uma lista ordenada de etapas", async () => {
    await renderLesson();

    const timeline = screen.getByRole("region", { name: "Etapas da aula" });

    expect(within(timeline).getAllByRole("button")).toHaveLength(10);
  });
});
