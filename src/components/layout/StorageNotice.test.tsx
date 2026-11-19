import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createSafeStorage } from "../../lib/storage";
import { StorageNotice } from "./StorageNotice";

const unavailable = { available: false };
const available = { available: true };

function freshSession() {
  return createSafeStorage(() => undefined);
}

describe("StorageNotice", () => {
  it("appears when storage is unavailable (PRG-01.7)", () => {
    render(<StorageNotice storage={unavailable} session={freshSession()} />);

    expect(screen.getByRole("status", { name: "Aviso de armazenamento" })).toHaveTextContent(
      "Este navegador não permite salvar dados.",
    );
  });

  it("does not appear when storage works", () => {
    render(<StorageNotice storage={available} session={freshSession()} />);

    expect(screen.queryByRole("status", { name: "Aviso de armazenamento" })).not.toBeInTheDocument();
  });

  it("disappears when closed and does not come back in the same session (PRG-01.7)", async () => {
    const user = userEvent.setup();
    const session = freshSession();
    const { unmount } = render(<StorageNotice storage={unavailable} session={session} />);

    await user.click(screen.getByRole("button", { name: "Fechar aviso" }));
    expect(screen.queryByRole("status", { name: "Aviso de armazenamento" })).not.toBeInTheDocument();

    unmount();
    render(<StorageNotice storage={unavailable} session={session} />);
    expect(screen.queryByRole("status", { name: "Aviso de armazenamento" })).not.toBeInTheDocument();
  });
});
