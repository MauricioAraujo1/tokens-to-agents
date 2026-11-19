import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { catalog } from "../content/catalog";
import { createProgressStore } from "../lib/progress/store";
import { createSafeStorage } from "../lib/storage";
import type { LessonId } from "../types/content";
import { HomePage } from "./HomePage";

function memoryStore() {
  return createProgressStore(createSafeStorage(() => undefined));
}

function renderHome(store = memoryStore()) {
  const onNavigate = vi.fn();
  render(<HomePage onNavigate={onNavigate} store={store} />);
  return { store, onNavigate, user: userEvent.setup() };
}

const moduleCards = () => within(screen.getByRole("region", { name: "18 módulos" })).getAllByRole("link");

describe("HomePage (NAV-01.6)", () => {
  it("mostra os 18 módulos na ordem 00 a 17, cada um com título e progresso", () => {
    const store = memoryStore();
    for (const id of ["03-01", "03-02", "03-03"] as LessonId[]) store.completeLesson(id);
    for (const lesson of catalog[0].lessons) store.completeLesson(lesson.id);
    renderHome(store);

    const cards = moduleCards();
    expect(cards).toHaveLength(18);
    expect(cards.map((card) => card.closest("li")?.dataset.module)).toEqual(catalog.map((module) => module.id));

    expect(cards[0]).toHaveTextContent("Introduction to AI");
    expect(cards[0]).toHaveTextContent("8/8 aulas");
    expect(cards[0]).toHaveTextContent("Concluído");
    expect(cards[3]).toHaveTextContent("Transformers");
    expect(cards[3]).toHaveTextContent("3/15 aulas");
    expect(cards[3]).toHaveTextContent("Em andamento");
    expect(cards[17]).toHaveTextContent("0/14 aulas");
    expect(cards[17]).toHaveTextContent("Não iniciado");
  });

  it("o card do módulo leva à primeira aula ainda não concluída", async () => {
    const store = memoryStore();
    store.completeLesson("03-01");
    const { onNavigate, user } = renderHome(store);

    expect(moduleCards()[3]).toHaveAttribute("href", "/learn/03-02");
    await user.click(moduleCards()[3]);

    expect(onNavigate).toHaveBeenCalledWith({ name: "lesson", lessonId: "03-02", step: null });
  });

  it('"continuar" leva à última aula aberta, no passo em que o aluno parou', async () => {
    const store = memoryStore();
    store.setLastVisited("03-08", 4);
    const { onNavigate, user } = renderHome(store);

    const continueLink = screen.getByRole("link", { name: "Continuar: Self-Attention" });
    expect(continueLink).toHaveAttribute("href", "/learn/03-08?step=4");
    expect(screen.getByText("Última aula aberta: 03.08 Self-Attention · passo 4")).toBeInTheDocument();

    await user.click(continueLink);
    expect(onNavigate).toHaveBeenCalledWith({ name: "lesson", lessonId: "03-08", step: 4 });
  });

  it('sem histórico, "continuar" leva à aula 00.01', async () => {
    const { onNavigate, user } = renderHome();

    const continueLink = screen.getByRole("link", { name: `Continuar: ${catalog[0].lessons[0].title}` });
    expect(continueLink).toHaveAttribute("href", "/learn/00-01");
    expect(screen.getByText("Você ainda não abriu nenhuma aula. Comece pela primeira da trilha.")).toBeInTheDocument();

    await user.click(continueLink);
    expect(onNavigate).toHaveBeenCalledWith({ name: "lesson", lessonId: "00-01", step: null });
  });

  it("o card de progresso mostra o total e o percentual e tem o menu de progresso (PRG-01.4, .5, .10)", () => {
    const store = memoryStore();
    for (const lesson of catalog[0].lessons) store.completeLesson(lesson.id);
    renderHome(store);

    const card = screen.getByRole("region", { name: "Seu progresso" });
    // 8 de 237 = 3,4 %, arredondado para 3.
    expect(card).toHaveTextContent("8 / 237 · 3%");
    expect(within(card).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "8");
    const menu = within(card).getByRole("group", { name: "Gerenciar progresso" });
    for (const name of ["Exportar progresso", "Importar progresso", "Zerar progresso"]) {
      expect(within(menu).getByRole("button", { name })).toBeInTheDocument();
    }
  });

  it("os contadores acompanham o progresso quando ele muda (PRG-01.8)", () => {
    const store = memoryStore();
    renderHome(store);
    expect(moduleCards()[0]).toHaveTextContent("0/8 aulas");

    act(() => store.completeLesson("00-01"));

    expect(moduleCards()[0]).toHaveTextContent("1/8 aulas");
    expect(screen.getByRole("region", { name: "Seu progresso" })).toHaveTextContent("1 / 237 · 0%");
  });

  it("mostra a faixa dos 5 projetos com link para o Laboratório", async () => {
    const { onNavigate, user } = renderHome();

    const projects = within(screen.getByRole("region", { name: "5 projetos" })).getAllByRole("link");
    expect(projects.map((link) => link.getAttribute("href"))).toEqual([
      "/lab/project/01",
      "/lab/project/02",
      "/lab/project/03",
      "/lab/project/04",
      "/lab/project/05",
    ]);
    expect(projects[1]).toHaveTextContent("RAG Knowledge Assistant");

    await user.click(projects[1]);
    expect(onNavigate).toHaveBeenCalledWith({ name: "lab", projectId: "02" });
  });

  it("termina com o rodapé de crédito e licenças (OPS-01.6)", () => {
    renderHome();

    expect(screen.getByRole("link", { name: /^Inspirado em designed-to-scale/ })).toBeInTheDocument();
  });
});
