import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, detectLocale, isLocaleTag, LOCALES } from "./locales";

describe("LOCALES", () => {
  it("lists the 21 interface languages with BCP 47 tags (I18N-01.1)", () => {
    expect(LOCALES.map((locale) => locale.tag)).toEqual([
      "en",
      "es",
      "pt-BR",
      "fr",
      "it",
      "de",
      "nl",
      "pl",
      "tr",
      "id",
      "vi",
      "el",
      "uk",
      "ru",
      "zh-Hans",
      "zh-Hant",
      "ja",
      "ko",
      "hi",
      "ar",
      "he",
    ]);
  });

  it("gives every language a native name", () => {
    for (const locale of LOCALES) expect(locale.nativeName.trim()).not.toBe("");
    expect(LOCALES.find((locale) => locale.tag === "ja")?.nativeName).toBe("日本語");
  });

  it("marks only Arabic and Hebrew as right-to-left (I18N-01.4)", () => {
    const rtl = LOCALES.filter((locale) => locale.dir === "rtl").map((locale) => locale.tag);
    expect(rtl).toEqual(["ar", "he"]);
  });

  it("assigns each non-Latin script its own font family (I18N-01.6)", () => {
    const scriptOf = Object.fromEntries(LOCALES.map((locale) => [locale.tag, locale.script]));
    expect(scriptOf).toMatchObject({
      en: "latin",
      vi: "latin",
      el: "greek-cyrillic",
      uk: "greek-cyrillic",
      ru: "greek-cyrillic",
      "zh-Hans": "sc",
      "zh-Hant": "tc",
      ja: "jp",
      ko: "kr",
      hi: "devanagari",
      ar: "arabic",
      he: "hebrew",
    });
  });
});

describe("isLocaleTag", () => {
  it("accepts only the 21 supported tags", () => {
    expect(isLocaleTag("uk")).toBe(true);
    expect(isLocaleTag("pt-BR")).toBe(true);
    expect(isLocaleTag("ua")).toBe(false);
    expect(isLocaleTag("pt")).toBe(false);
  });
});

describe("detectLocale (I18N-01.3)", () => {
  it("maps a regional variant to its supported language", () => {
    expect(detectLocale(["es-MX"])).toBe("es");
  });

  it("detects Ukrainian as uk", () => {
    expect(detectLocale(["uk-UA"])).toBe("uk");
  });

  it("falls back to pt-BR when no language is supported", () => {
    expect(detectLocale(["xx"])).toBe("pt-BR");
    expect(detectLocale([])).toBe("pt-BR");
    expect(DEFAULT_LOCALE).toBe("pt-BR");
  });

  it("uses the first supported language of the list", () => {
    expect(detectLocale(["xx", "not a tag!", "fr-CA", "de"])).toBe("fr");
  });

  it("maps any Portuguese variant to pt-BR", () => {
    expect(detectLocale(["pt-PT"])).toBe("pt-BR");
    expect(detectLocale(["pt"])).toBe("pt-BR");
  });

  it("picks the Chinese script from the region or script subtag", () => {
    expect(detectLocale(["zh-CN"])).toBe("zh-Hans");
    expect(detectLocale(["zh"])).toBe("zh-Hans");
    expect(detectLocale(["zh-TW"])).toBe("zh-Hant");
    expect(detectLocale(["zh-HK"])).toBe("zh-Hant");
    expect(detectLocale(["zh-Hant"])).toBe("zh-Hant");
  });
});
