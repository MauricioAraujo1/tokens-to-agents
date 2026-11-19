import { createContext, useContext } from "react";
import { DEFAULT_LOCALE, type LocaleTag } from "./locales";
import { DEFAULT_TRANSLATE, type Translate } from "./runtime";

export interface I18nValue {
  /** Idioma escolhido (ou detectado) para a interface. */
  locale: LocaleTag;
  t: Translate;
  setLocale: (locale: LocaleTag) => void;
}

// Fora do provider (testes de componente isolado), a interface fica em pt-BR.
export const I18nContext = createContext<I18nValue>({
  locale: DEFAULT_LOCALE,
  t: DEFAULT_TRANSLATE,
  setLocale: () => {},
});

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}
