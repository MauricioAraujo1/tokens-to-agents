import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LocaleTag } from "./locales";

const PACKAGES = [
  "noto-sans",
  "noto-sans-arabic",
  "noto-sans-hebrew",
  "noto-sans-devanagari",
  "noto-sans-sc",
  "noto-sans-tc",
  "noto-sans-jp",
  "noto-sans-kr",
];

let imported: string[] = [];
let failing = new Set<string>();

/**
 * Carrega `fonts.ts` do zero, com cada pacote de fonte trocado por um módulo falso que registra
 * quando foi importado. `resetModules` + `doMock` evitam o cache de módulos entre um teste e outro.
 */
async function loadFor(locale: LocaleTag) {
  vi.resetModules();
  for (const name of PACKAGES) {
    vi.doMock(`@fontsource-variable/${name}`, () => {
      if (failing.has(name)) throw new Error(`falha de rede ao baixar ${name}`);
      imported.push(name);
      return {};
    });
  }
  const { loadScriptFont } = await import("./fonts");
  return loadScriptFont(locale);
}

beforeEach(() => {
  imported = [];
  failing = new Set();
});

describe("loadScriptFont (I18N-01.6)", () => {
  it.each([
    ["ar", "noto-sans-arabic"],
    ["he", "noto-sans-hebrew"],
    ["hi", "noto-sans-devanagari"],
    ["zh-Hans", "noto-sans-sc"],
    ["zh-Hant", "noto-sans-tc"],
    ["ja", "noto-sans-jp"],
    ["ko", "noto-sans-kr"],
    ["el", "noto-sans"],
    ["uk", "noto-sans"],
    ["ru", "noto-sans"],
  ] as const)("%s imports exactly %s", async (locale, pkg) => {
    await loadFor(locale);
    expect(imported).toEqual([pkg]);
  });

  it.each(["pt-BR", "en", "es", "fr", "it", "de", "nl", "pl", "tr", "id", "vi"] as const)(
    "%s (Latin script) imports no font",
    async (locale) => {
      await loadFor(locale);
      expect(imported).toEqual([]);
    },
  );

  it("resolves without throwing when the font import fails", async () => {
    failing.add("noto-sans-jp");
    await expect(loadFor("ja")).resolves.toBeUndefined();
    expect(imported).toEqual([]);
  });
});
