import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyProgress, type ProgressV1 } from "../../lib/progress/schema";
import { createProgressStore } from "../../lib/progress/store";
import { MAX_IMPORT_BYTES, PROGRESS_FILE_NAME } from "../../lib/progress/transfer";
import { createSafeStorage } from "../../lib/storage";
import { ProgressMenu } from "./ProgressMenu";

const current: ProgressV1 = { ...emptyProgress(), completed: { "01-01": true } };
const imported: ProgressV1 = {
  ...emptyProgress(),
  completed: { "03-01": true, "03-02": true },
  objectives: { "03-01": [0] },
  quizBest: { "03": { correct: 3, total: 5 } },
};

function setup(initial: ProgressV1 = current) {
  const store = createProgressStore(createSafeStorage(() => undefined));
  store.replace(initial);
  // applyAccept: false deixa o teste enviar um arquivo que o seletor do navegador filtraria.
  const user = userEvent.setup({ applyAccept: false });
  render(<ProgressMenu store={store} />);
  return { store, user };
}

function file(content: string, name = "progress.json", type = "application/json") {
  return new File([content], name, { type });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ProgressMenu", () => {
  it("downloads the current progress as a JSON file (PRG-01.4)", async () => {
    const { user } = setup();
    let exported: Blob | undefined;
    let downloadName: string | undefined;
    const createObjectURL = vi.fn((blob: Blob) => {
      exported = blob;
      return "blob:progress";
    });
    const revokeObjectURL = vi.fn();
    // O jsdom não implementa createObjectURL: o URL global é trocado só neste teste.
    vi.stubGlobal(
      "URL",
      class extends URL {
        static createObjectURL = createObjectURL;
        static revokeObjectURL = revokeObjectURL;
      },
    );
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      downloadName = this.download;
    });

    await user.click(screen.getByRole("button", { name: "Exportar progresso" }));

    expect(downloadName).toBe(PROGRESS_FILE_NAME);
    expect(exported?.type).toBe("application/json");
    expect(JSON.parse((await exported?.text()) ?? "null")).toEqual(current);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:progress");
  });

  it("asks for confirmation before replacing progress with an imported file (PRG-01.5)", async () => {
    const { store, user } = setup();

    await user.upload(screen.getByLabelText("Arquivo de progresso"), file(JSON.stringify(imported)));

    const dialog = await screen.findByRole("alertdialog", { name: "Substituir o progresso atual pelo do arquivo?" });
    expect(store.getSnapshot()).toEqual(current);
    expect(screen.getByRole("button", { name: "Substituir" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Substituir" }));

    expect(store.getSnapshot()).toEqual(imported);
    expect(dialog).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Progresso importado.");
  });

  it("keeps the current progress when the import is cancelled", async () => {
    const { store, user } = setup();

    await user.upload(screen.getByLabelText("Arquivo de progresso"), file(JSON.stringify(imported)));
    await user.click(await screen.findByRole("button", { name: "Cancelar" }));

    expect(store.getSnapshot()).toEqual(current);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it.each([
    ["a .txt file", file("concluí 2 aulas", "progress.txt", "text/plain"), "O arquivo não é um JSON."],
    [
      "an unknown schema",
      file(JSON.stringify({ ...imported, schemaVersion: 2 })),
      "O arquivo não tem um formato de progresso conhecido.",
    ],
    ["a file over 1 MB", file(" ".repeat(MAX_IMPORT_BYTES + 1)), "O arquivo passa de 1 MB e não foi importado."],
  ])("shows the error and keeps the progress for %s (PRG-01.6)", async (_label, invalid, message) => {
    const { store, user } = setup();

    await user.upload(screen.getByLabelText("Arquivo de progresso"), invalid);

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(store.getSnapshot()).toEqual(current);
  });

  it("asks for confirmation before resetting progress (PRG-01.10)", async () => {
    const { store, user } = setup();

    await user.click(screen.getByRole("button", { name: "Zerar progresso" }));
    expect(screen.getByRole("alertdialog", { name: /Apagar todo o progresso salvo\?/ })).toBeInTheDocument();
    expect(store.getSnapshot()).toEqual(current);

    await user.click(screen.getByRole("button", { name: "Zerar" }));

    expect(store.getSnapshot()).toEqual(emptyProgress());
    expect(screen.getByRole("status")).toHaveTextContent("Progresso zerado.");
  });

  it("keeps the progress when the reset is cancelled", async () => {
    const { store, user } = setup();

    await user.click(screen.getByRole("button", { name: "Zerar progresso" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(store.getSnapshot()).toEqual(current);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
