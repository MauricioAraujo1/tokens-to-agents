import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { I18nProvider } from "../i18n/I18nProvider";
import ptBR, { type Messages } from "../i18n/messages/pt-BR";
import { progressStore } from "../lib/progress/store";
import { App } from "./App";

// Pseudo-idioma: cada texto vira a própria chave, com os placeholders preservados. Assim, qualquer
// texto de interface que ainda esteja fixo no componente continua em pt-BR e aparece no teste.
function pseudo(key: string, text: string): string {
  const params = [...text.matchAll(/\{\w+\}/g)].map(([placeholder]) => placeholder);
  return [`⟪${key}⟫`, ...params].join(" ");
}

const PSEUDO_MESSAGES = Object.fromEntries(
  Object.entries(ptBR).map(([key, value]) => [
    key,
    typeof value === "string"
      ? pseudo(key, value)
      : Object.fromEntries(Object.entries(value).map(([form, text]) => [form, pseudo(key, text ?? "")])),
  ]),
) as Messages;

/** Textos e atributos acessíveis que o aluno vê ou ouve. */
function interfaceTexts(): Set<string> {
  const texts = new Set<string>();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent?.trim();
    if (text) texts.add(text);
  }
  for (const element of document.body.querySelectorAll("[aria-label], [title], [placeholder]")) {
    for (const name of ["aria-label", "title", "placeholder"]) {
      const value = element.getAttribute(name);
      if (value) texts.add(value);
    }
  }
  return texts;
}

// O jsdom mantém a URL e o localStorage entre os testes: cada teste começa na home, sem progresso.
beforeEach(() => {
  window.history.replaceState(null, "", "/");
  act(() => progressStore.reset());
});

// O conteúdo da aula vem do registry de forma lazy: cada teste espera a aula 08.02 carregar.
// Desde a Home (T77), "/" mostra a visão da trilha; a aula 08.02 abre pela própria URL.
async function renderApp() {
  window.history.replaceState(null, "", "/learn/08-02");
  render(<App />);
  await screen.findByRole("heading", { level: 1, name: "RAG Architecture" });

  return { user: userEvent.setup() };
}

describe("App", () => {
  it("abre na aula RAG com o primeiro passo, a timeline e o painel explicativo", async () => {
    await renderApp();

    expect(screen.getByRole("heading", { level: 1, name: "RAG Architecture" })).toBeInTheDocument();
    expect(screen.getByText("Passo 1 / 10")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "A aplicação recebe a pergunta" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Próximo: Embedding" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Voltar" })).toBeDisabled();
  });

  it("avança para o próximo passo atualizando painel, timeline e diagrama juntos", async () => {
    const { user } = await renderApp();

    await user.click(screen.getByRole("button", { name: "Próximo: Embedding" }));

    expect(screen.getByRole("heading", { level: 2, name: "O modelo de embedding gera um vetor" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Passo 2: Embedding" })).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("button", { name: "Embedding" })).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("button", { name: "Voltar" })).toBeEnabled();
  });

  it("volta ao passo anterior, e Repetir refaz a animação do passo atual sem sair dele (LES-01.7)", async () => {
    const { user } = await renderApp();

    await user.click(screen.getByRole("button", { name: "Próximo: Embedding" }));
    await user.click(screen.getByRole("button", { name: "Voltar" }));
    expect(screen.getByText("Passo 1 / 10")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Próximo: Embedding" }));
    await user.click(screen.getByRole("button", { name: "Próximo: Busca" }));
    await user.click(screen.getByRole("button", { name: "Repetir" }));
    expect(screen.getByText("Passo 3 / 10")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pausar" })).toBeInTheDocument();
  });

  it("R repete a animação do passo atual, mas não durante a digitação (LES-01.7, LES-01.9)", async () => {
    const { user } = await renderApp();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: "Continuar" })).toBeInTheDocument();

    await user.keyboard("{Control>}k{/Control}");
    await user.type(screen.getByRole("searchbox", { name: "Buscar lições e conceitos" }), "r");
    expect(screen.getByRole("button", { name: "Continuar" })).toBeInTheDocument();
    await user.keyboard("{Escape}");

    await user.keyboard("r");
    expect(screen.getByText("Passo 2 / 10")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pausar" })).toBeInTheDocument();
  });

  it("abre /learn/08-02?step=4 no passo 4, e a URL acompanha o passo atual (LES-01.10)", async () => {
    window.history.replaceState(null, "", "/learn/08-02?step=4");
    render(<App />);
    await screen.findByRole("heading", { level: 1, name: "RAG Architecture" });
    const user = userEvent.setup();

    expect(screen.getByText("Passo 4 / 10")).toBeInTheDocument();
    expect(window.location.search).toBe("?step=4");

    await user.keyboard("{ArrowRight}");
    expect(screen.getByText("Passo 5 / 10")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/learn/08-02");
    expect(window.location.search).toBe("?step=5");
  });

  it.each(["?step=99", "?step=0", "?step=abc", ""])(
    "/learn/08-02%s abre o passo 1 e a URL passa a pedir o passo 1 (LES-01.11)",
    async (search) => {
      window.history.replaceState(null, "", `/learn/08-02${search}`);
      render(<App />);
      await screen.findByRole("heading", { level: 1, name: "RAG Architecture" });

      expect(screen.getByText("Passo 1 / 10")).toBeInTheDocument();
      // A URL é corrigida num efeito, logo depois da aula carregar.
      await waitFor(() => expect(window.location.search).toBe("?step=1"));
    },
  );

  it("no último passo, Próximo vira Próxima aula e leva à aula seguinte do roadmap (LES-01.5)", async () => {
    window.history.replaceState(null, "", "/learn/08-02?step=10");
    render(<App />);
    await screen.findByRole("heading", { level: 1, name: "RAG Architecture" });
    const user = userEvent.setup();

    expect(screen.queryByRole("button", { name: /^Próximo:/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Próxima aula" }));

    expect(window.location.pathname).toBe("/learn/08-03");
    expect(await screen.findByRole("heading", { level: 1, name: "Data Ingestion" })).toBeInTheDocument();
  });

  it("seleciona uma etapa pela timeline e pelo nó do diagrama", async () => {
    const { user } = await renderApp();

    await user.click(screen.getByRole("button", { name: "Passo 7: Contexto" }));
    expect(screen.getByText("Passo 7 / 10")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "LLM" }));
    expect(screen.getByText("Passo 9 / 10")).toBeInTheDocument();
  });

  it("← volta um passo na aula e atualiza a URL (LES-01.3, LES-01.10)", async () => {
    const { user } = await renderApp();

    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(screen.getByText("Passo 3 / 10")).toBeInTheDocument();

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByText("Passo 2 / 10")).toBeInTheDocument();
    expect(window.location.search).toBe("?step=2");
  });

  it("navega com as setas e pausa com Space, mas não captura teclas durante a digitação", async () => {
    const { user } = await renderApp();

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
    const { user } = await renderApp();

    await user.keyboard("{Control>}k{/Control}");
    await user.type(screen.getByRole("searchbox", { name: "Buscar lições e conceitos" }), "chunking");
    const dialog = screen.getByRole("dialog", { name: "Buscar lições" });
    await user.click(within(within(dialog).getByRole("list", { name: "Aulas" })).getByRole("button", { name: /Chunking Strategies/ }));

    expect(await screen.findByRole("heading", { level: 1, name: "Chunking Strategies" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("abre a busca com Cmd+K (macOS) com o foco no campo (SRCH-01.1)", async () => {
    const { user } = await renderApp();

    await user.keyboard("{Meta>}k{/Meta}");

    expect(screen.getByRole("dialog", { name: "Buscar lições" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Buscar lições e conceitos" })).toHaveFocus();
  });

  it("alterna o tema claro e escuro pelo cabeçalho", async () => {
    const { user } = await renderApp();

    await user.click(screen.getByRole("button", { name: "Ativar tema escuro" }));
    expect(document.documentElement.dataset.theme).toBe("dark");

    await user.click(screen.getByRole("button", { name: "Ativar tema claro" }));
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("abre pela sidebar uma aula de outro módulo e marca a aula como em andamento", async () => {
    const { user } = await renderApp();

    await user.click(screen.getByRole("button", { name: /^17\. AI Infrastructure & Deployment/ }));
    await user.click(screen.getByRole("button", { name: /^AI Application Architecture/ }));

    expect(await screen.findByRole("heading", { level: 1, name: "AI Application Architecture" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^AI Application Architecture.*Em andamento/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByText("0 / 237")).toBeInTheDocument();
  });

  it("marca a aula como concluída ao chegar ao último passo (PRG-01.1)", async () => {
    const { user } = await renderApp();

    expect(screen.getByText("0 / 237")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Passo 10: Resposta" }));

    expect(screen.getByText("Você concluiu todas as etapas desta aula.")).toBeInTheDocument();
    expect(screen.getByText("1 / 237")).toBeInTheDocument();
  });

  it("mostra a página dos Resumos e volta para Aprender", async () => {
    const { user } = await renderApp();

    // Prática (T80), Laboratório (T91) e Resumos (T94) têm página própria; o placeholder das seções saiu.
    await user.click(screen.getByRole("button", { name: "Resumos" }));
    expect(screen.getByRole("heading", { level: 1, name: "Resumos" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /^\d{2} / })).toHaveLength(18);

    await user.click(screen.getByRole("button", { name: "Aprender" }));
    // Aprender leva à home (NAV-01.6), que oferece continuar na última aula aberta.
    expect(window.location.pathname).toBe("/");
    expect(screen.getByRole("heading", { level: 1, name: "Dos tokens aos agentes em produção." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continuar: RAG Architecture" })).toBeInTheDocument();
  });

  it("abre na home com a trilha, e continuar volta à última aula no passo em que parou (NAV-01.6)", async () => {
    const { user } = await renderApp();
    await user.click(screen.getByRole("button", { name: "Próximo: Embedding" }));
    await user.click(screen.getByRole("button", { name: "Aprender" }));

    expect(window.location.pathname).toBe("/");
    expect(screen.getByRole("button", { name: "Aprender" })).toHaveAttribute("aria-current", "page");
    expect(within(screen.getByRole("region", { name: "18 módulos" })).getAllByRole("link")).toHaveLength(18);

    await user.click(screen.getByRole("link", { name: "Continuar: RAG Architecture" }));

    expect(await screen.findByRole("heading", { level: 1, name: "RAG Architecture" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/learn/08-02");
    expect(screen.getByText("Passo 2 / 10")).toBeInTheDocument();
  });

  it("na primeira visita, a home leva à aula 00.01", async () => {
    render(<App />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("link", { name: /^Continuar: / }));

    expect(window.location.pathname).toBe("/learn/00-01");
    expect(await screen.findByRole("navigation", { name: "Breadcrumb" })).toHaveTextContent("Lição 1 de 8");
  });

  it("abre /learn/08-02 direto na aula, com o breadcrumb do módulo e a posição da aula", async () => {
    window.history.replaceState(null, "", "/learn/08-02");
    render(<App />);

    expect(await screen.findByRole("heading", { level: 1, name: "RAG Architecture" })).toBeInTheDocument();
    const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(breadcrumb).getByText("08. RAG Architecture")).toBeInTheDocument();
    expect(within(breadcrumb).getByText("Lição 2 de 16")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aprender" })).toHaveAttribute("aria-current", "page");
  });

  it("abre pela URL uma aula diferente da aula inicial", async () => {
    window.history.replaceState(null, "", "/learn/06-06");
    render(<App />);

    const breadcrumb = await screen.findByRole("navigation", { name: "Breadcrumb" });
    expect(screen.getByRole("heading", { level: 1, name: "Cosine Similarity" })).toBeInTheDocument();
    expect(within(breadcrumb).getByText("06. Embeddings & Vector Databases")).toBeInTheDocument();
    expect(within(breadcrumb).getByText("Lição 6 de 12")).toBeInTheDocument();
  });

  it("clicar numa aba muda a URL e destaca a aba", async () => {
    const { user } = await renderApp();

    await user.click(screen.getByRole("button", { name: "Prática" }));
    expect(window.location.pathname).toBe("/practice");
    expect(screen.getByRole("heading", { level: 1, name: "Quiz por módulo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Prática" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Aprender" })).not.toHaveAttribute("aria-current");

    await user.click(screen.getByRole("button", { name: "Laboratório" }));
    expect(window.location.pathname).toBe("/lab");
    expect(screen.getByRole("heading", { level: 1, name: "Laboratório" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Laboratório" })).toHaveAttribute("aria-current", "page");

    await user.click(screen.getByRole("button", { name: "Resumos" }));
    expect(window.location.pathname).toBe("/summaries");
    expect(screen.getByRole("button", { name: "Resumos" })).toHaveAttribute("aria-current", "page");

    await user.click(screen.getByRole("button", { name: "Aprender" }));
    expect(window.location.pathname).toBe("/");
    expect(screen.getByRole("button", { name: "Aprender" })).toHaveAttribute("aria-current", "page");
  });

  it("abre pela URL um playground do Laboratório, e escolher um projeto na lista muda a URL (LAB-01.1, LAB-01.3)", async () => {
    window.history.replaceState(null, "", "/lab/playground/sampling");
    render(<App />);
    const user = userEvent.setup();

    expect(screen.getByRole("heading", { level: 1, name: "Temperatura e amostragem" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Laboratório" })).toHaveAttribute("aria-current", "page");

    await user.click(screen.getByRole("link", { name: /^02 RAG Knowledge Assistant/ }));
    expect(window.location.pathname).toBe("/lab/project/02");
  });

  it("escolher uma aula na árvore muda a URL, e voltar do navegador restaura a aula anterior", async () => {
    window.history.replaceState(null, "", "/learn/08-02");
    render(<App />);
    await screen.findByRole("heading", { level: 1, name: "RAG Architecture" });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /^01\. Machine Learning/ }));
    await user.click(screen.getByRole("button", { name: /^Supervised Learning/ }));
    expect(window.location.pathname).toBe("/learn/01-02");
    expect(await screen.findByRole("heading", { level: 1, name: "Supervised Learning" })).toBeInTheDocument();

    act(() => window.history.back());
    expect(await screen.findByRole("heading", { level: 1, name: "RAG Architecture" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/learn/08-02");
  });

  it.each(["/", "/practice/03", "/lab", "/lab/playground/sampling", "/summaries/03"])(
    "%s ocupa a largura toda, sem a trilha nem o botão da trilha (NAV-01, previews 07–10)",
    async (path) => {
      window.history.replaceState(null, "", path);
      render(<App />);
      await screen.findAllByRole("heading", { level: 1 });

      expect(document.getElementById("course-sidebar")).toBeNull();
      expect(screen.queryByRole("button", { name: "Abrir menu do curso" })).not.toBeInTheDocument();
    },
  );

  it("na aula, a trilha continua com o botão que a abre", async () => {
    await renderApp();

    expect(document.getElementById("course-sidebar")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Abrir menu do curso" })).toHaveAttribute("aria-controls", "course-sidebar");
  });

  it("mantém a timeline em uma lista ordenada de etapas", async () => {
    await renderApp();

    const timeline = screen.getByRole("region", { name: "Nesta lição" });

    expect(within(timeline).getAllByRole("button")).toHaveLength(10);
  });
});

describe("App com I18nProvider", () => {
  it("troca todos os textos da interface sem recarregar e mantém a aula e o passo (I18N-01.2)", async () => {
    window.history.replaceState(null, "", "/learn/08-02");
    render(
      <I18nProvider languages={["pt-BR"]} loadMessages={async (locale) => (locale === "en" ? PSEUDO_MESSAGES : null)}>
        <App />
      </I18nProvider>,
    );
    await screen.findByRole("heading", { level: 1, name: "RAG Architecture" });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Próximo: Embedding" }));

    await user.click(screen.getByRole("button", { name: "Idioma" }));
    await user.click(screen.getByRole("menuitemradio", { name: /English/ }));
    await screen.findByRole("button", { name: "⟪header.language⟫" });

    const texts = interfaceTexts();
    const untranslated = Object.values(ptBR).filter(
      (value): value is string => typeof value === "string" && !value.includes("{") && texts.has(value),
    );
    expect(untranslated).toEqual([]);
    expect(screen.getByRole("button", { name: "⟪sections.aprender.label⟫" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("⟪sidebar.lessonCount⟫ 237")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "⟪workspace.label⟫" })).getByRole("note")).toHaveTextContent(
      "⟪contentNotice.message⟫",
    );

    // Só a interface muda: a aula, o passo e o conteúdo em PT-BR ficam (AD-003).
    expect(window.location.pathname).toBe("/learn/08-02");
    expect(screen.getByRole("heading", { level: 1, name: "RAG Architecture" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "O modelo de embedding gera um vetor" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "⟪timeline.step⟫ 2 Embedding" })).toHaveAttribute("aria-current", "step");
    expect(progressStore.getSnapshot().locale).toBe("en");
  });
});
