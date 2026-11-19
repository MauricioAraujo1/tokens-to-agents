import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useProgress } from "../hooks/useProgress";
import { progressStore, type ProgressStore } from "../lib/progress/store";
import { loadScriptFont } from "./fonts";
import { detectLocale, type LocaleTag } from "./locales";
import ptBR, { type Messages } from "./messages/pt-BR";
import { applyLocale, loadMessages as loadLocaleMessages, translate, type MessagesLoader, type Translate } from "./runtime";
import { I18nContext, type I18nValue } from "./useI18n";

interface LoadedMessages {
  /** Idioma das mensagens carregadas: é `pt-BR` quando o idioma escolhido ainda não tem arquivo. */
  locale: LocaleTag;
  messages: Messages;
}

const SOURCE_MESSAGES: LoadedMessages = { locale: "pt-BR", messages: ptBR };

interface LoadResult {
  requested: LocaleTag;
  loaded: LoadedMessages;
}

interface I18nProviderProps {
  children: ReactNode;
  /** A escolha do idioma fica no progresso (`ProgressV1.locale`) e vai junto na exportação. */
  store?: ProgressStore;
  /** Idiomas do navegador, usados só enquanto o aluno não escolheu um (I18N-01.3). */
  languages?: readonly string[];
  loadMessages?: MessagesLoader;
}

function browserLanguages(): readonly string[] {
  return typeof navigator === "undefined" ? [] : navigator.languages;
}

export function I18nProvider({
  children,
  store = progressStore,
  languages = browserLanguages(),
  loadMessages = loadLocaleMessages,
}: I18nProviderProps) {
  const { locale: savedLocale } = useProgress(store);
  const [detectedLocale] = useState(() => detectLocale(languages));
  const locale = savedLocale ?? detectedLocale;
  const [result, setResult] = useState<LoadResult | null>(null);
  // Enquanto o chunk do idioma não chega (ou se ele falhar), a interface fica em pt-BR.
  const loaded = result?.requested === locale ? result.loaded : SOURCE_MESSAGES;

  useEffect(() => {
    applyLocale(locale);
    void loadScriptFont(locale);
  }, [locale]);

  useEffect(() => {
    if (locale === "pt-BR") return;
    let isCurrent = true;
    loadMessages(locale).then(
      (messages) =>
        isCurrent && setResult({ requested: locale, loaded: messages ? { locale, messages } : SOURCE_MESSAGES }),
      () => isCurrent && setResult({ requested: locale, loaded: SOURCE_MESSAGES }),
    );
    return () => {
      isCurrent = false;
    };
  }, [locale, loadMessages]);

  const setLocale = useCallback((next: LocaleTag) => store.setLocale(next), [store]);

  const t = useCallback<Translate>(
    (key, params) => translate(loaded.messages, loaded.locale, key, params),
    [loaded],
  );

  const value = useMemo<I18nValue>(() => ({ locale, t, setLocale }), [locale, t, setLocale]);

  return <I18nContext value={value}>{children}</I18nContext>;
}
