import { getLocale, type LocaleTag, type ScriptFamily } from "./locales";

// Um import dinâmico por escrita: o Vite gera um chunk de CSS para cada um, e o navegador
// só baixa os arquivos de fonte cujo `unicode-range` aparece na tela. A família de cada escrita
// entra na pilha de fontes por `:lang()` em `globals.css`.
const SCRIPT_FONTS: Record<Exclude<ScriptFamily, "latin">, () => Promise<unknown>> = {
  "greek-cyrillic": () => import("@fontsource-variable/noto-sans"),
  arabic: () => import("@fontsource-variable/noto-sans-arabic"),
  hebrew: () => import("@fontsource-variable/noto-sans-hebrew"),
  devanagari: () => import("@fontsource-variable/noto-sans-devanagari"),
  sc: () => import("@fontsource-variable/noto-sans-sc"),
  tc: () => import("@fontsource-variable/noto-sans-tc"),
  jp: () => import("@fontsource-variable/noto-sans-jp"),
  kr: () => import("@fontsource-variable/noto-sans-kr"),
};

/** Carrega a Noto da escrita do idioma. A escrita latina usa a Geist Mono, que já vem no bundle. */
export async function loadScriptFont(locale: LocaleTag): Promise<void> {
  const { script } = getLocale(locale);
  if (script === "latin") return;
  try {
    await SCRIPT_FONTS[script]();
  } catch {
    // Sem a fonte, a pilha cai na fonte do sistema: o texto aparece, só em outra fonte.
  }
}
