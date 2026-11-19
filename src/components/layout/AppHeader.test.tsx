import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../i18n/I18nProvider";
import { createProgressStore } from "../../lib/progress/store";
import { createSafeStorage } from "../../lib/storage";
import { AppHeader } from "./AppHeader";

function setup() {
  const store = createProgressStore(createSafeStorage(() => undefined));
  const onSectionChange = vi.fn();
  render(
    <I18nProvider store={store} languages={["pt-BR"]} loadMessages={async () => null}>
      <AppHeader
        activeSection="aprender"
        onSectionChange={onSectionChange}
        theme="light"
        onToggleTheme={() => undefined}
        onOpenSearch={() => undefined}
        isSidebarOpen={false}
        onToggleSidebar={() => undefined}
      />
    </I18nProvider>,
  );
  return { onSectionChange, user: userEvent.setup() };
}

describe("AppHeader", () => {
  it("shows the Tokens to Agents brand and no longer the old AI Engineering name (NAV-01.5)", () => {
    setup();
    const header = screen.getByRole("banner");

    expect(header).toHaveTextContent("Tokens to Agents");
    expect(header).toHaveTextContent("t→a");
    expect(header).not.toHaveTextContent("AI Engineering");
  });

  it("keeps each section tab named by its label, with the current one marked and the others selectable", async () => {
    const { onSectionChange, user } = setup();

    expect(screen.getByRole("button", { name: "Aprender" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Prática" })).not.toHaveAttribute("aria-current");

    await user.click(screen.getByRole("button", { name: "Laboratório" }));

    expect(onSectionChange).toHaveBeenCalledWith("laboratorio");
  });
});
