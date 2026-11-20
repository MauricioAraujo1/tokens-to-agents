import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { SearchDialog } from "./SearchDialog";

function renderDialog() {
  const onSelectLesson = vi.fn();
  const onClose = vi.fn();
  render(<SearchDialog onSelectLesson={onSelectLesson} onClose={onClose} />);

  return { onSelectLesson, onClose, user: userEvent.setup() };
}

function searchbox() {
  return screen.getByRole("searchbox", { name: "Buscar lições e conceitos" });
}

describe("SearchDialog", () => {
  it("orienta o usuário enquanto a busca está vazia", () => {
    renderDialog();

    expect(
      screen.getByText("Digite pelo menos 2 caracteres para buscar aulas, conceitos e termos do glossário."),
    ).toBeInTheDocument();
  });

  it("abre com o foco no campo de busca (SRCH-01.1)", () => {
    renderDialog();

    expect(searchbox()).toHaveFocus();
  });

  it("com 1 caractere ainda mostra a orientação, não o estado vazio", async () => {
    const { user } = renderDialog();

    await user.type(searchbox(), "a");

    expect(
      screen.getByText("Digite pelo menos 2 caracteres para buscar aulas, conceitos e termos do glossário."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Nenhum resultado/)).not.toBeInTheDocument();
  });

  it("filtra as aulas mockadas e seleciona uma ao clicar", async () => {
    const { user, onSelectLesson } = renderDialog();

    await user.type(searchbox(), "chunking");
    await user.click(within(screen.getByRole("list", { name: "Aulas" })).getByRole("button", { name: /Chunking Strategies/ }));

    expect(onSelectLesson).toHaveBeenCalledWith("08-05");
  });

  it("seleciona o primeiro resultado ao pressionar Enter", async () => {
    const { user, onSelectLesson } = renderDialog();

    await user.type(searchbox(), "bm25{Enter}");

    expect(onSelectLesson).toHaveBeenCalledWith("07-05");
  });

  it("agrupa os resultados em aulas, conceitos e glossário (SRCH-01.2)", async () => {
    const { user } = renderDialog();

    await user.type(searchbox(), "embedding");

    const lessons = screen.getByRole("list", { name: "Aulas" });
    // Os conceitos vêm dos passos das aulas, carregados sob demanda de todos os módulos publicados.
    const concepts = await screen.findByRole("list", { name: "Conceitos" }, { timeout: 5000 });
    const glossaryTerms = screen.getByRole("list", { name: "Glossário" });

    expect(within(lessons).getByRole("button", { name: /Word & Token Embeddings/ })).toBeInTheDocument();
    const conceptButtons = within(concepts).getAllByRole("button");
    expect(conceptButtons.length).toBeGreaterThan(0);
    for (const button of conceptButtons) expect(button.textContent).toMatch(/\d{2}\.\d{2} · /);
    expect(within(glossaryTerms).getAllByRole("button", { name: /^Embedding/ })[0]).toHaveTextContent(
      "03.05 · Word & Token Embeddings",
    );
    expect(screen.getAllByRole("listitem").length).toBeLessThanOrEqual(10);
  });

  it("acha as aulas de attention digitando 'atencao' e abre a escolhida com as setas e Enter (SRCH-01.3)", async () => {
    const { user, onSelectLesson } = renderDialog();

    await user.type(searchbox(), "atencao");
    const glossaryTerms = screen.getByRole("list", { name: "Glossário" });
    expect(within(glossaryTerms).getByRole("button", { name: /Attention Mechanism/ })).toBeInTheDocument();
    expect(within(glossaryTerms).getByRole("button", { name: /Self-Attention/ })).toBeInTheDocument();

    await user.keyboard("{ArrowDown}{Enter}");

    expect(onSelectLesson).toHaveBeenCalledWith("03-08");
  });

  it("mostra no rodapé os atalhos e quantos resultados a busca achou", async () => {
    const { user } = renderDialog();
    const dialog = screen.getByRole("dialog", { name: "Buscar lições" });

    expect(dialog).toHaveTextContent("[↑↓] navegar · [Enter] abrir · [Esc] fechar");
    expect(dialog).not.toHaveTextContent("funciona offline");

    await user.type(searchbox(), "atencao");
    const count = within(screen.getByRole("region", { name: "Resultados da busca" })).getAllByRole("listitem").length;

    expect(count).toBeGreaterThan(1);
    expect(dialog).toHaveTextContent(`${count} resultados · funciona offline`);
  });

  it("mostra 'nenhum resultado' com o termo buscado quando nada corresponde (SRCH-01.5)", async () => {
    const { user } = renderDialog();

    await user.type(searchbox(), "xyzabc");

    expect(screen.getByText("Nenhum resultado para “xyzabc”.")).toBeInTheDocument();
  });

  it("fecha ao pressionar Escape", async () => {
    const { user, onClose } = renderDialog();

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ao fechar com Escape, devolve o foco ao elemento que abriu a busca (SRCH-01.4)", async () => {
    function Harness() {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setIsOpen(true)}>
            Abrir busca
          </button>
          {isOpen && <SearchDialog onSelectLesson={vi.fn()} onClose={() => setIsOpen(false)} />}
        </>
      );
    }
    render(<Harness />);
    const user = userEvent.setup();
    const opener = screen.getByRole("button", { name: "Abrir busca" });

    await user.click(opener);
    expect(searchbox()).toHaveFocus();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
