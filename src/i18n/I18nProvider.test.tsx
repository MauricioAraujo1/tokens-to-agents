import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createProgressStore } from "../lib/progress/store";
import { createSafeStorage } from "../lib/storage";
import { I18nProvider } from "./I18nProvider";
import type { LocaleTag } from "./locales";
import ptBR, { type Messages } from "./messages/pt-BR";
import type { MessagesLoader } from "./runtime";
import { useI18n } from "./useI18n";

// Fixtures: as traduções reais chegam nas Phases 6 e 7.
const en: Messages = {
  ...ptBR,
  "header.language": "Language",
  "sidebar.lessonCount": { one: "{count} lesson", other: "{count} lessons" },
};
const ru: Messages = {
  ...ptBR,
  "header.language": "Язык",
  "sidebar.lessonCount": { one: "{count} урок", few: "{count} урока", many: "{count} уроков", other: "{count} урока" },
};
const FIXTURES: Partial<Record<LocaleTag, Messages>> = { en, ru };

const loadFixture: MessagesLoader = async (locale) => FIXTURES[locale] ?? null;

function createMemoryStore() {
  return createProgressStore(createSafeStorage(() => undefined));
}

function Probe() {
  const { locale, t, setLocale } = useI18n();
  const [clicks, setClicks] = useState(0);
  return (
    <div>
      <p data-testid="locale">{locale}</p>
      <p data-testid="language">{t("header.language")}</p>
      <p data-testid="position">{t("lesson.position", { current: 2, total: 15 })}</p>
      <p data-testid="one">{t("sidebar.lessonCount", { count: 1 })}</p>
      <p data-testid="few">{t("sidebar.lessonCount", { count: 3 })}</p>
      <p data-testid="many">{t("sidebar.lessonCount", { count: 237 })}</p>
      <p data-testid="clicks">{clicks}</p>
      <button type="button" onClick={() => setClicks((count) => count + 1)}>
        count
      </button>
      {(["pt-BR", "en", "ru", "ar", "he", "ja"] as const).map((tag) => (
        <button key={tag} type="button" onClick={() => setLocale(tag)}>
          {`use ${tag}`}
        </button>
      ))}
    </div>
  );
}

function setup({ store = createMemoryStore(), languages = ["pt-BR"], loadMessages = loadFixture } = {}) {
  const user = userEvent.setup();
  const view = render(
    <I18nProvider store={store} languages={languages} loadMessages={loadMessages}>
      <Probe />
    </I18nProvider>,
  );
  return { store, user, view };
}

const text = (id: string) => screen.getByTestId(id).textContent;

afterEach(() => {
  document.documentElement.removeAttribute("lang");
  document.documentElement.removeAttribute("dir");
});

describe("I18nProvider", () => {
  it("switches every text to the chosen language without remounting the page (I18N-01.2)", async () => {
    const { user } = setup();
    expect(text("language")).toBe("Idioma");

    await user.click(screen.getByRole("button", { name: "count" }));
    await user.click(screen.getByRole("button", { name: "use en" }));

    expect(await screen.findByText("Language")).toBeInTheDocument();
    expect(text("many")).toBe("237 lessons");
    expect(text("clicks")).toBe("1");
    expect(document.documentElement).toHaveAttribute("lang", "en");
  });

  it("saves the choice and uses it over the browser languages on the next visit (I18N-01.2)", async () => {
    const { store, user, view } = setup();

    await user.click(screen.getByRole("button", { name: "use en" }));
    expect(store.getSnapshot().locale).toBe("en");

    view.unmount();
    setup({ store, languages: ["ru-RU"] });

    expect(await screen.findByText("Language")).toBeInTheDocument();
    expect(text("locale")).toBe("en");
  });

  it("starts in the first supported browser language without saving it (I18N-01.3)", async () => {
    const { store } = setup({ languages: ["xx", "ru-RU", "en"] });

    expect(await screen.findByText("Язык")).toBeInTheDocument();
    expect(text("locale")).toBe("ru");
    expect(store.getSnapshot().locale).toBeUndefined();
  });

  it.each(["ar", "he"] as const)("applies dir=rtl and lang for %s, and ltr again for pt-BR (I18N-01.4)", async (tag) => {
    const { user } = setup();
    expect(document.documentElement).toHaveAttribute("dir", "ltr");

    await user.click(screen.getByRole("button", { name: `use ${tag}` }));
    expect(document.documentElement).toHaveAttribute("dir", "rtl");
    expect(document.documentElement).toHaveAttribute("lang", tag);

    await user.click(screen.getByRole("button", { name: "use pt-BR" }));
    expect(document.documentElement).toHaveAttribute("dir", "ltr");
    expect(document.documentElement).toHaveAttribute("lang", "pt-BR");
  });

  it("interpolates placeholders and picks the plural form of the language (Intl.PluralRules)", async () => {
    const { user } = setup();
    expect(text("position")).toBe("Lição 2 de 15");
    expect(text("one")).toBe("1 lição");
    expect(text("many")).toBe("237 lições");

    await user.click(screen.getByRole("button", { name: "use ru" }));

    expect(await screen.findByText("Язык")).toBeInTheDocument();
    expect(text("one")).toBe("1 урок");
    expect(text("few")).toBe("3 урока");
    expect(text("many")).toBe("237 уроков");
  });

  it("keeps the interface in pt-BR when the language has no messages yet or the chunk fails", async () => {
    const failing = vi.fn<MessagesLoader>(async (locale) => {
      if (locale === "en") throw new Error("chunk failed");
      return locale === "ru" ? ru : null;
    });
    const { user } = setup({ loadMessages: failing });

    await user.click(screen.getByRole("button", { name: "use ru" }));
    expect(await screen.findByText("Язык")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "use ja" }));
    expect(await screen.findByText("Idioma")).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute("lang", "ja");

    await user.click(screen.getByRole("button", { name: "use ru" }));
    expect(await screen.findByText("Язык")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "use en" }));
    expect(await screen.findByText("Idioma")).toBeInTheDocument();
    expect(failing).toHaveBeenCalledWith("en");
  });
});
