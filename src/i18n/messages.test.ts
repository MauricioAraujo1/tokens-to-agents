import { describe, expect, it } from "vitest";
import { isLocaleTag } from "./locales";
import ptBR from "./messages/pt-BR";
import { plural } from "./plural";

type MessageValue = string | Record<string, string | undefined>;
type MessageTable = Record<string, MessageValue>;

// Todos os arquivos de idioma, inclusive os que as Phases 6 e 7 vão criar.
const files = import.meta.glob<{ default: MessageTable }>("./messages/*.ts", { eager: true });

const locales = Object.entries(files).map(([path, module]) => ({
  tag: path.replace("./messages/", "").replace(/\.ts$/, ""),
  messages: module.default,
}));

function placeholders(value: MessageValue | undefined): string[] {
  if (value === undefined) return [];
  const texts = typeof value === "string" ? [value] : Object.values(value);
  const names = new Set<string>();
  for (const text of texts) for (const match of (text ?? "").matchAll(/\{(\w+)\}/g)) names.add(match[1]);
  return [...names].sort();
}

function forms(value: MessageValue): Array<[string, string | undefined]> {
  return typeof value === "string" ? [["", value]] : Object.entries(value);
}

/** Uma linha por problema, com o idioma e a chave, para o erro apontar onde corrigir (I18N-01.7). */
function findIssues(tag: string, messages: MessageTable, source: MessageTable = ptBR): string[] {
  const issues: string[] = [];
  for (const key of Object.keys(source)) {
    const value = messages[key];
    if (value === undefined) {
      issues.push(`${tag}: ${key} faltando`);
      continue;
    }
    for (const [form, text] of forms(value)) {
      if (!text?.trim()) issues.push(`${tag}: ${key}${form && `.${form}`} vazia`);
    }
    const expected = placeholders(source[key]).join(",");
    const actual = placeholders(value).join(",");
    if (actual !== expected) issues.push(`${tag}: ${key} placeholders {${actual}} ≠ pt-BR {${expected}}`);
  }
  return issues;
}

describe("findIssues", () => {
  const source = { greeting: "Olá, {name}", count: plural({ one: "{count} aula", other: "{count} aulas" }) };

  it("reports empty strings and empty plural forms with locale and key", () => {
    expect(findIssues("de", { greeting: " ", count: { one: "{count} Lektion", other: "" } }, source)).toEqual([
      "de: greeting vazia",
      "de: greeting placeholders {} ≠ pt-BR {name}",
      "de: count.other vazia",
    ]);
  });

  it("reports a placeholder that differs from pt-BR", () => {
    expect(findIssues("de", { greeting: "Hallo, {nome}", count: { other: "{n} Lektionen" } }, source)).toEqual([
      "de: greeting placeholders {nome} ≠ pt-BR {name}",
      "de: count placeholders {n} ≠ pt-BR {count}",
    ]);
  });

  it("accepts a locale that uses other plural categories than pt-BR", () => {
    const ru = { greeting: "Привет, {name}", count: { one: "{count} урок", few: "{count} урока", many: "{count} уроков", other: "{count} урока" } };
    expect(findIssues("ru", ru, source)).toEqual([]);
  });
});

describe("message files (I18N-01.7)", () => {
  it("includes the pt-BR source", () => {
    expect(locales.map((locale) => locale.tag)).toContain("pt-BR");
  });

  it.each(locales)("$tag is named after one of the 21 locale tags", ({ tag }) => {
    expect(isLocaleTag(tag)).toBe(true);
  });

  it.each(locales)("$tag has no empty string and the same placeholders as pt-BR", ({ tag, messages }) => {
    expect(findIssues(tag, messages)).toEqual([]);
  });
});
