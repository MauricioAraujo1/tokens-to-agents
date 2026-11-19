import { getLocale, type LocaleTag } from "./locales";
import ptBR, { type MessageKey, type Messages } from "./messages/pt-BR";
import { isPluralMessage } from "./plural";

export type MessageParams = Record<string, string | number>;
export type Translate = (key: MessageKey, params?: MessageParams) => string;
export type MessagesLoader = (locale: LocaleTag) => Promise<Messages | null>;

// O pt-BR vai no bundle inicial (é o fallback); cada outro idioma vira um chunk carregado sob demanda.
const loaders = import.meta.glob<{ default: Messages }>(["./messages/*.ts", "!./messages/pt-BR.ts"]);

/** `null` quando o idioma ainda não tem arquivo de mensagens: a interface segue em pt-BR. */
export const loadMessages: MessagesLoader = async (locale) => {
  if (locale === "pt-BR") return ptBR;
  const loader = loaders[`./messages/${locale}.ts`];
  return loader ? (await loader()).default : null;
};

/** `messagesLocale` é o idioma das mensagens, que decide as categorias de plural do `Intl.PluralRules`. */
export function translate(
  messages: Messages,
  messagesLocale: LocaleTag,
  key: MessageKey,
  params?: MessageParams,
): string {
  const value = messages[key];
  let text: string;
  if (isPluralMessage(value)) {
    const category = new Intl.PluralRules(messagesLocale).select(Number(params?.count ?? 0));
    text = value[category] ?? value.other;
  } else {
    text = value;
  }
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in params ? String(params[name]) : placeholder,
  );
}

/** `<html lang dir>`: o navegador escolhe fontes e hifenização pelo `lang`, e o `dir` espelha o layout (I18N-01.4). */
export function applyLocale(locale: LocaleTag, root: HTMLElement = document.documentElement) {
  root.lang = locale;
  root.dir = getLocale(locale).dir;
}

export const DEFAULT_TRANSLATE: Translate = (key, params) => translate(ptBR, "pt-BR", key, params);
