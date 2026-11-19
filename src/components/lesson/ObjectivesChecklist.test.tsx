import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { createProgressStore } from "../../lib/progress/store";
import { createSafeStorage } from "../../lib/storage";
import { ObjectivesChecklist } from "./ObjectivesChecklist";

const KEY = "t2a:test:objectives";
const objectives = ["Descrever o pipeline", "Explicar o embedding", "Escolher o K"];

/** Um store novo sobre o mesmo localStorage equivale a recarregar a página. */
function openStore() {
  return createProgressStore(createSafeStorage(() => window.localStorage), KEY);
}

afterEach(() => {
  window.localStorage.removeItem(KEY);
});

describe('ObjectivesChecklist: "Você vai aprender" (LES-01.1, PRG-01.3)', () => {
  it('lista os objetivos da aula sob o título "Você vai aprender", todos desmarcados no início', () => {
    render(<ObjectivesChecklist lessonId="08-02" objectives={objectives} store={openStore()} />);

    const checklist = screen.getByRole("region", { name: "Você vai aprender" });
    expect(checklist).toBeInTheDocument();
    for (const objective of objectives) {
      expect(screen.getByRole("checkbox", { name: objective })).not.toBeChecked();
    }
  });

  it("marcar salva o item no progresso da aula", async () => {
    const store = openStore();
    render(<ObjectivesChecklist lessonId="08-02" objectives={objectives} store={store} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("checkbox", { name: "Explicar o embedding" }));

    expect(screen.getByRole("checkbox", { name: "Explicar o embedding" })).toBeChecked();
    expect(store.getSnapshot().objectives["08-02"]).toEqual([1]);
    expect(JSON.parse(window.localStorage.getItem(KEY) ?? "{}").objectives).toEqual({ "08-02": [1] });
  });

  it("o estado marcado volta ao reabrir a aula", async () => {
    const { unmount } = render(<ObjectivesChecklist lessonId="08-02" objectives={objectives} store={openStore()} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("checkbox", { name: "Descrever o pipeline" }));
    await user.click(screen.getByRole("checkbox", { name: "Escolher o K" }));
    unmount();

    render(<ObjectivesChecklist lessonId="08-02" objectives={objectives} store={openStore()} />);

    expect(screen.getByRole("checkbox", { name: "Descrever o pipeline" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Explicar o embedding" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Escolher o K" })).toBeChecked();
  });

  it("desmarcar tira o item do progresso", async () => {
    const store = openStore();
    render(<ObjectivesChecklist lessonId="08-02" objectives={objectives} store={store} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("checkbox", { name: "Escolher o K" }));
    await user.click(screen.getByRole("checkbox", { name: "Escolher o K" }));

    expect(screen.getByRole("checkbox", { name: "Escolher o K" })).not.toBeChecked();
    expect(store.getSnapshot().objectives["08-02"]).toBeUndefined();
  });

  it("o checklist de uma aula não marca os itens de outra", async () => {
    const store = openStore();
    const { unmount } = render(<ObjectivesChecklist lessonId="08-02" objectives={objectives} store={store} />);
    await userEvent.setup().click(screen.getByRole("checkbox", { name: "Descrever o pipeline" }));
    unmount();

    render(<ObjectivesChecklist lessonId="08-03" objectives={objectives} store={store} />);

    expect(screen.getByRole("checkbox", { name: "Descrever o pipeline" })).not.toBeChecked();
  });
});
