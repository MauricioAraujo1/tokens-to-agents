import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { I18nProvider } from "../../i18n/I18nProvider";
import { LOCALES } from "../../i18n/locales";
import { createProgressStore } from "../../lib/progress/store";
import { createSafeStorage } from "../../lib/storage";
import { LanguageMenu } from "./LanguageMenu";

function setup() {
  const store = createProgressStore(createSafeStorage(() => undefined));
  const user = userEvent.setup();
  render(
    <I18nProvider store={store} languages={["pt-BR"]} loadMessages={async () => null}>
      <LanguageMenu />
      <button type="button">fora</button>
    </I18nProvider>,
  );
  return { store, user, trigger: screen.getByRole("button", { name: "Idioma" }) };
}

const item = (name: RegExp) => screen.getByRole("menuitemradio", { name });

afterEach(() => {
  document.documentElement.removeAttribute("lang");
  document.documentElement.removeAttribute("dir");
});

describe("LanguageMenu", () => {
  it("lists the 21 languages in two columns with native name and name in the current language (I18N-01.1)", async () => {
    const { user, trigger } = setup();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveTextContent("PT");

    await user.click(trigger);

    const menu = screen.getByRole("menu", { name: "Idioma da interface" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const items = within(menu).getAllByRole("menuitemradio");
    expect(items).toHaveLength(21);
    expect(items.map((element) => element.dataset.locale)).toEqual(LOCALES.map((locale) => locale.tag));

    const [left, right] = within(menu).getAllByRole("group");
    expect(within(left).getAllByRole("menuitemradio")).toHaveLength(11);
    expect(within(right).getAllByRole("menuitemradio")).toHaveLength(10);
    expect(within(right).getAllByRole("menuitemradio")[0]).toHaveAttribute("data-locale", "el");

    expect(item(/English/)).toHaveTextContent(/English.*Inglês/);
    expect(item(/日本語/)).toHaveTextContent(/日本語.*Japonês/);
    expect(item(/العربية/)).toHaveTextContent(/العربية.*Árabe/);
  });

  it("highlights and focuses the current language when it opens", async () => {
    const { user, trigger } = setup();

    await user.click(trigger);

    const current = item(/Português/);
    expect(current).toHaveAttribute("aria-checked", "true");
    expect(current).toHaveFocus();
    expect(screen.getAllByRole("menuitemradio", { checked: true })).toEqual([current]);
  });

  it("switches the language, saves it and closes when a language is chosen (I18N-01.2)", async () => {
    const { store, user, trigger } = setup();

    await user.click(trigger);
    await user.click(item(/English/));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveTextContent("EN");
    expect(store.getSnapshot().locale).toBe("en");
    expect(document.documentElement).toHaveAttribute("lang", "en");

    // O nome no idioma atual acompanha a troca.
    await user.click(trigger);
    expect(item(/日本語/)).toHaveTextContent(/日本語.*Japanese/);
    expect(item(/English/)).toHaveAttribute("aria-checked", "true");
  });

  it("closes with Escape and gives the focus back to the trigger", async () => {
    const { store, user, trigger } = setup();

    await user.click(trigger);
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(store.getSnapshot().locale).toBeUndefined();
  });

  it("moves through the languages with the arrow keys, Home and End, and picks one with Enter", async () => {
    const { store, user, trigger } = setup();
    await user.click(trigger);

    await user.keyboard("{ArrowDown}");
    expect(item(/Français/)).toHaveFocus();
    await user.keyboard("{ArrowUp}{ArrowUp}");
    expect(item(/Español/)).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(item(/Українська/)).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(item(/Español/)).toHaveFocus();
    await user.keyboard("{End}");
    expect(item(/עברית/)).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(item(/English/)).toHaveFocus();
    await user.keyboard("{Home}{ArrowDown}{Enter}");

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(store.getSnapshot().locale).toBe("es");
  });

  it("follows the mirrored columns with the arrow keys in RTL (I18N-01.4)", async () => {
    const { user, trigger } = setup();
    await user.click(trigger);
    await user.click(item(/العربية/));
    expect(document.documentElement).toHaveAttribute("dir", "rtl");

    await user.click(trigger);
    await user.keyboard("{Home}{ArrowRight}");
    expect(item(/English/)).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(item(/Ελληνικά/)).toHaveFocus();
  });

  it("closes without changing the language on a click outside", async () => {
    const { store, user, trigger } = setup();

    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "fora" }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(store.getSnapshot().locale).toBeUndefined();
  });

  it("draws every language code at 11 px or more (UI-01.3)", async () => {
    const { user, trigger } = setup();

    await user.click(trigger);

    const badges = screen.getAllByRole("menuitemradio").map((element) => element.firstElementChild as HTMLElement);
    expect(badges).toHaveLength(21);
    for (const badge of badges) {
      const size = /(?:^|\s)text-\[(\d+(?:\.\d+)?)px\]/.exec(badge.className);
      expect(size, badge.className).not.toBeNull();
      expect(Number(size?.[1])).toBeGreaterThanOrEqual(11);
    }
    expect(item(/English/).firstElementChild).toHaveTextContent("EN");
  });

  it("is pinned to the screen edges below 640 px so it never spills sideways (RSP-01.5)", async () => {
    const { user, trigger } = setup();

    await user.click(trigger);

    const menu = screen.getByRole("menu", { name: "Idioma da interface" });
    expect(menu).toHaveClass("max-sm:fixed", "max-sm:inset-x-4", "max-sm:w-auto");
    for (const column of within(menu).getAllByRole("group")) {
      expect(column).toHaveClass("min-w-0");
    }
  });
});
