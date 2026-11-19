/** Família de fonte da escrita; `latin` usa a Geist Mono, as outras carregam uma Noto sob demanda (I18N-01.6). */
export type ScriptFamily =
  | "latin"
  | "greek-cyrillic"
  | "arabic"
  | "hebrew"
  | "devanagari"
  | "sc"
  | "tc"
  | "jp"
  | "kr";

/** `code` é o rótulo curto do seletor (EN, PT, 简…), como no print de referência. */
export const LOCALES = [
  { tag: "en", code: "EN", nativeName: "English", dir: "ltr", script: "latin" },
  { tag: "es", code: "ES", nativeName: "Español", dir: "ltr", script: "latin" },
  { tag: "pt-BR", code: "PT", nativeName: "Português (Brasil)", dir: "ltr", script: "latin" },
  { tag: "fr", code: "FR", nativeName: "Français", dir: "ltr", script: "latin" },
  { tag: "it", code: "IT", nativeName: "Italiano", dir: "ltr", script: "latin" },
  { tag: "de", code: "DE", nativeName: "Deutsch", dir: "ltr", script: "latin" },
  { tag: "nl", code: "NL", nativeName: "Nederlands", dir: "ltr", script: "latin" },
  { tag: "pl", code: "PL", nativeName: "Polski", dir: "ltr", script: "latin" },
  { tag: "tr", code: "TR", nativeName: "Türkçe", dir: "ltr", script: "latin" },
  { tag: "id", code: "ID", nativeName: "Bahasa Indonesia", dir: "ltr", script: "latin" },
  { tag: "vi", code: "VI", nativeName: "Tiếng Việt", dir: "ltr", script: "latin" },
  { tag: "el", code: "EL", nativeName: "Ελληνικά", dir: "ltr", script: "greek-cyrillic" },
  { tag: "uk", code: "UK", nativeName: "Українська", dir: "ltr", script: "greek-cyrillic" },
  { tag: "ru", code: "RU", nativeName: "Русский", dir: "ltr", script: "greek-cyrillic" },
  { tag: "zh-Hans", code: "简", nativeName: "简体中文", dir: "ltr", script: "sc" },
  { tag: "zh-Hant", code: "繁", nativeName: "繁體中文", dir: "ltr", script: "tc" },
  { tag: "ja", code: "JA", nativeName: "日本語", dir: "ltr", script: "jp" },
  { tag: "ko", code: "KO", nativeName: "한국어", dir: "ltr", script: "kr" },
  { tag: "hi", code: "HI", nativeName: "हिन्दी", dir: "ltr", script: "devanagari" },
  { tag: "ar", code: "AR", nativeName: "العربية", dir: "rtl", script: "arabic" },
  { tag: "he", code: "HE", nativeName: "עברית", dir: "rtl", script: "hebrew" },
] as const satisfies readonly {
  tag: string;
  code: string;
  nativeName: string;
  dir: "ltr" | "rtl";
  script: ScriptFamily;
}[];

export type LocaleDefinition = (typeof LOCALES)[number];
export type LocaleTag = LocaleDefinition["tag"];

/** O público principal é brasileiro e o conteúdo é PT-BR. */
export const DEFAULT_LOCALE: LocaleTag = "pt-BR";

const LOCALE_BY_TAG: ReadonlyMap<string, LocaleDefinition> = new Map(LOCALES.map((locale) => [locale.tag, locale]));

export function isLocaleTag(value: unknown): value is LocaleTag {
  return typeof value === "string" && LOCALE_BY_TAG.has(value);
}

export function getLocale(tag: LocaleTag): LocaleDefinition {
  // Toda `LocaleTag` está no mapa: o tipo vem da própria lista.
  return LOCALE_BY_TAG.get(tag) as LocaleDefinition;
}

function matchLocale(languageTag: string): LocaleTag | null {
  let locale: Intl.Locale;
  try {
    locale = new Intl.Locale(languageTag);
  } catch {
    return null;
  }

  switch (locale.language) {
    case "pt":
      return "pt-BR";
    case "zh":
      // zh-TW, zh-HK e zh-Hant viram Hant ao maximizar; zh e zh-CN viram Hans.
      return locale.maximize().script === "Hant" ? "zh-Hant" : "zh-Hans";
    default:
      return isLocaleTag(locale.language) ? locale.language : null;
  }
}

/** Primeiro idioma de `navigator.languages` que está entre os 21; senão PT-BR (I18N-01.3). */
export function detectLocale(navigatorLanguages: readonly string[]): LocaleTag {
  for (const languageTag of navigatorLanguages) {
    const match = matchLocale(languageTag);
    if (match) return match;
  }
  return DEFAULT_LOCALE;
}
