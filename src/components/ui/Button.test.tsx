import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

const HARD_SHADOW = "shadow-press";

describe("Button", () => {
  it("renders the primary variant with the brand accent, strong border and hard shadow", () => {
    render(<Button variant="primary">Próximo</Button>);
    const button = screen.getByRole("button", { name: "Próximo" });

    expect(button).toHaveClass("bg-brand", "text-on-brand", "border-line-strong", HARD_SHADOW);
  });

  it("renders the secondary variant on the raised surface with the hard shadow", () => {
    render(<Button variant="secondary">Voltar</Button>);
    const button = screen.getByRole("button", { name: "Voltar" });

    expect(button).toHaveClass("bg-surface", "text-ink", "border-line-strong", HARD_SHADOW);
    expect(button).not.toHaveClass("bg-brand");
  });

  it("uses the secondary variant and the regular size by default", () => {
    render(<Button>Voltar</Button>);
    const button = screen.getByRole("button", { name: "Voltar" });

    expect(button).toHaveClass("bg-surface", "py-2.5", "text-[13px]");
    expect(button).toHaveAttribute("type", "button");
  });

  it("renders the small size with a shorter height and smaller text", () => {
    render(<Button size="sm">Repetir</Button>);
    const button = screen.getByRole("button", { name: "Repetir" });

    expect(button).toHaveClass("py-1.5", "text-xs");
    expect(button).not.toHaveClass("py-2.5");
  });

  it("marks the active tab as current with the soft accent and hard shadow", () => {
    render(
      <>
        <Button variant="tab" active>
          Aprender
        </Button>
        <Button variant="tab">Prática</Button>
      </>,
    );
    const active = screen.getByRole("button", { name: "Aprender" });
    const inactive = screen.getByRole("button", { name: "Prática" });

    expect(active).toHaveAttribute("aria-current", "page");
    expect(active).toHaveClass("bg-brand-soft", "border-line-strong", HARD_SHADOW);
    expect(inactive).not.toHaveAttribute("aria-current");
    expect(inactive).toHaveClass("bg-transparent", "border-transparent");
    expect(inactive).not.toHaveClass(HARD_SHADOW);
  });

  it("does not fire clicks and exposes aria-disabled when disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button variant="primary" disabled onClick={onClick}>
        Desabilitado
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Desabilitado" });

    await user.click(button);

    expect(onClick).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveClass("disabled:bg-sunken", "disabled:text-subtle", "disabled:shadow-none");
  });

  it("fires clicks and has no aria-disabled when enabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Voltar</Button>);
    const button = screen.getByRole("button", { name: "Voltar" });

    await user.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(button).not.toHaveAttribute("aria-disabled");
  });

  it("receives keyboard focus and shows a visible focus outline", async () => {
    const user = userEvent.setup();
    render(<Button>Voltar</Button>);
    const button = screen.getByRole("button", { name: "Voltar" });

    await user.tab();

    expect(button).toHaveFocus();
    expect(button).toHaveClass(
      "focus-visible:outline-2",
      "focus-visible:outline-offset-2",
      "focus-visible:outline-line-strong",
    );
  });
});
