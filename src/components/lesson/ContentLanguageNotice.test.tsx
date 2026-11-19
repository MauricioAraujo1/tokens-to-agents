import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { I18nProvider } from "../../i18n/I18nProvider";
import type { LocaleTag } from "../../i18n/locales";
import ptBR, { type Messages } from "../../i18n/messages/pt-BR";
import { createProgressStore } from "../../lib/progress/store";
import { createSafeStorage } from "../../lib/storage";
import { ContentLanguageNotice } from "./ContentLanguageNotice";

// Fixture: o ja.ts real chega com a T46.
const JA_NOTICE = "このコンテンツはポルトガル語で提供されています。";
const ja: Messages = { ...ptBR, "contentNotice.message": JA_NOTICE };

function renderIn(locale: LocaleTag) {
  const store = createProgressStore(createSafeStorage(() => undefined));
  render(
    <I18nProvider store={store} languages={[locale]} loadMessages={async (tag) => (tag === "ja" ? ja : null)}>
      <ContentLanguageNotice />
    </I18nProvider>,
  );
}

afterEach(() => {
  document.documentElement.removeAttribute("lang");
  document.documentElement.removeAttribute("dir");
});

describe("ContentLanguageNotice (I18N-01.5)", () => {
  it("does not appear when the interface is in Portuguese", () => {
    renderIn("pt-BR");
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("appears in Japanese with the translated text", async () => {
    renderIn("ja");
    expect(await screen.findByRole("note")).toHaveTextContent(JA_NOTICE);
  });
});
