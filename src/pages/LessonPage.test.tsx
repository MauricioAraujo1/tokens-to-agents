import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ContentNotFound } from "../content/registry";
import ragLesson from "../content/lessons/08/08-02-rag-architecture";
import { createProgressStore } from "../lib/progress/store";
import { createSafeStorage } from "../lib/storage";
import type { LessonContent } from "../types/content";
import { LessonPage } from "./LessonPage";

function memoryStore() {
  return createProgressStore(createSafeStorage(() => undefined));
}

function renderPage(props: Partial<Parameters<typeof LessonPage>[0]> = {}) {
  const store = props.store ?? memoryStore();
  const onStepChange = vi.fn();
  const onNavigate = vi.fn();
  render(
    <LessonPage
      lessonId="08-02"
      step={null}
      onStepChange={onStepChange}
      onNavigate={onNavigate}
      shortcutsEnabled
      store={store}
      {...props}
    />,
  );
  return { store, onStepChange, onNavigate, user: userEvent.setup() };
}

async function waitForLesson() {
  await screen.findByRole("region", { name: "Nesta lição" });
}

describe("LessonPage (LES-01.1, PRG-01.1, NAV-01.3)", () => {
  it("monta cabeçalho, cena, stepper, narração e checklist, sem o rodapé de conteúdo (AD-011)", async () => {
    renderPage();
    await waitForLesson();

    expect(screen.getByRole("heading", { level: 1, name: "RAG Architecture" })).toBeInTheDocument();
    expect(within(screen.getByRole("navigation", { name: "Breadcrumb" })).getByText("Lição 2 de 16")).toBeInTheDocument();
    expect(screen.getByText("10 passos")).toBeInTheDocument();
    expect(screen.getAllByRole("figure").map((figure) => figure.dataset.custom)).toContain("rag-flow");
    expect(screen.getByRole("heading", { level: 2, name: ragLesson.steps[0].title })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Você vai aprender" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Nesta lição" })).toBeInTheDocument();
    // A aula termina no stepper, como na versão publicada (decisão do usuário em 2026-11-19).
    for (const name of [
      "Teste seu conhecimento",
      "Exemplo real",
      "Exemplo de código",
      "Trade-offs",
      "Conceitos relacionados",
      "Referências",
    ]) {
      expect(screen.queryByRole("region", { name })).not.toBeInTheDocument();
    }
  });

  it("na coluna da narração ficam o Próximo em duas linhas, os atalhos e o 'Você vai aprender' (preview 01)", async () => {
    renderPage();
    await waitForLesson();
    const panel = screen.getByRole("complementary", { name: "Explicação da etapa" });
    const next = within(panel).getByRole("button", { name: `Próximo: ${ragLesson.steps[1].shortTitle}` });

    expect(next).toHaveTextContent(`Próximo:${ragLesson.steps[1].shortTitle}`);
    expect(panel).toHaveTextContent("[←] [→] navegar · [R] repetir · [Space] pausar");
    expect(within(panel).getByRole("region", { name: "Você vai aprender" })).toBeInTheDocument();
  });

  it("abre /learn/08-02?step=4 no passo 4", async () => {
    const { onStepChange } = renderPage({ step: 4 });
    await waitForLesson();

    expect(screen.getByText("Passo 4 / 10")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: ragLesson.steps[3].title })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `Passo 4: ${ragLesson.steps[3].shortTitle}` })).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(onStepChange).toHaveBeenLastCalledWith(4);
  });

  it("chegar ao último passo conclui a aula", async () => {
    const { store, user } = renderPage();
    await waitForLesson();

    await user.keyboard("{ArrowRight}");
    expect(store.getSnapshot().completed["08-02"]).toBeUndefined();

    await user.click(screen.getByRole("button", { name: `Passo 10: ${ragLesson.steps[9].shortTitle}` }));

    expect(store.getSnapshot().completed["08-02"]).toBe(true);
    expect(screen.getByText("Você concluiu todas as etapas desta aula.")).toBeInTheDocument();
  });

  it("arrastar sobre a cena avança e volta um passo (RSP-01.4)", async () => {
    renderPage();
    await waitForLesson();
    const scene = screen.getAllByRole("figure")[0];
    const swipe = (fromX: number, toX: number) => {
      fireEvent.touchStart(scene, { touches: [{ clientX: fromX, clientY: 200 }] });
      fireEvent.touchEnd(scene, { touches: [], changedTouches: [{ clientX: toX, clientY: 205 }] });
    };

    swipe(300, 200);
    expect(screen.getByText("Passo 2 / 10")).toBeInTheDocument();

    swipe(100, 220);
    expect(screen.getByText("Passo 1 / 10")).toBeInTheDocument();
  });

  it("guarda a aula aberta e o passo atual como última visita, para o continuar da home (NAV-01.6)", async () => {
    const { store, user } = renderPage({ step: 3 });
    await waitForLesson();
    expect(store.getSnapshot().lastVisited).toEqual({ lessonId: "08-02", step: 3 });

    await user.keyboard("{ArrowRight}");
    expect(store.getSnapshot().lastVisited).toEqual({ lessonId: "08-02", step: 4 });
  });

  it("abrir direto no último passo também conclui a aula", async () => {
    const { store } = renderPage({ step: 10 });
    await waitForLesson();

    expect(store.getSnapshot().completed["08-02"]).toBe(true);
  });

  it("falha de import mostra o botão de tentar de novo, que recarrega a aula", async () => {
    const load = vi
      .fn<(id: string) => Promise<LessonContent>>()
      .mockRejectedValueOnce(new TypeError("Failed to fetch dynamically imported module"))
      .mockResolvedValueOnce(ragLesson);
    const { user } = renderPage({ load });

    const retry = await screen.findByRole("button", { name: "Tentar de novo" });
    expect(screen.getByText("Não foi possível carregar a aula")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "RAG Architecture" })).toBeInTheDocument();

    await user.click(retry);

    await waitForLesson();
    expect(load).toHaveBeenCalledTimes(2);
    expect(screen.queryByText("Não foi possível carregar a aula")).not.toBeInTheDocument();
  });

  it("aula do catálogo sem conteúdo mostra 'em preparação', sem tentar de novo", async () => {
    const load = vi.fn(async (id: string): Promise<LessonContent> => {
      throw new ContentNotFound("lesson", id);
    });
    renderPage({ lessonId: "01-02", load });

    expect(await screen.findByText("Aula em preparação")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Supervised Learning" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tentar de novo" })).not.toBeInTheDocument();
  });

  it("erro ao renderizar o conteúdo cai no error boundary com tentar de novo", async () => {
    // Conteúdo quebrado que só falha ao renderizar uma seção da aula.
    const broken = { ...ragLesson, objectives: null } as unknown as LessonContent;
    const load = vi
      .fn<(id: string) => Promise<LessonContent>>()
      .mockResolvedValueOnce(broken)
      .mockResolvedValueOnce(ragLesson);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { user } = renderPage({ load });

    await user.click(await screen.findByRole("button", { name: "Tentar de novo" }));
    expect(consoleError).toHaveBeenCalled();

    await waitForLesson();
    expect(load).toHaveBeenCalledTimes(2);
    consoleError.mockRestore();
  });
});
