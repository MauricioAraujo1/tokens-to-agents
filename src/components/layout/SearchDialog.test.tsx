import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { courseModules } from "../../data/course";
import { flattenLessons } from "../../lib/course";
import { SearchDialog } from "./SearchDialog";

const entries = flattenLessons(courseModules);

function renderDialog() {
  const onSelectLesson = vi.fn();
  const onClose = vi.fn();
  render(<SearchDialog entries={entries} onSelectLesson={onSelectLesson} onClose={onClose} />);

  return { onSelectLesson, onClose, user: userEvent.setup() };
}

describe("SearchDialog", () => {
  it("orienta o usuário enquanto a busca está vazia", () => {
    renderDialog();

    expect(screen.getByText("Digite para encontrar aulas por título, módulo ou descrição.")).toBeInTheDocument();
  });

  it("filtra as aulas mockadas e seleciona uma ao clicar", async () => {
    const { user, onSelectLesson } = renderDialog();

    await user.type(screen.getByRole("searchbox", { name: "Buscar lições e conceitos" }), "chunking");
    await user.click(screen.getByRole("button", { name: /Chunking Strategies/ }));

    expect(onSelectLesson).toHaveBeenCalledWith("08-04");
  });

  it("seleciona o primeiro resultado ao pressionar Enter", async () => {
    const { user, onSelectLesson } = renderDialog();

    await user.type(screen.getByRole("searchbox", { name: "Buscar lições e conceitos" }), "bm25{Enter}");

    expect(onSelectLesson).toHaveBeenCalledWith("07-02");
  });

  it("mostra estado vazio quando nada corresponde à busca", async () => {
    const { user } = renderDialog();

    await user.type(screen.getByRole("searchbox", { name: "Buscar lições e conceitos" }), "xyzabc");

    expect(screen.getByText("Nenhuma aula encontrada para “xyzabc”.")).toBeInTheDocument();
  });

  it("fecha ao pressionar Escape", async () => {
    const { user, onClose } = renderDialog();

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
