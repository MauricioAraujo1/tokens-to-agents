/// <reference types="node" />
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// O Vitest não processa CSS, então o arquivo é lido do disco.
const globalsCss = readFileSync(resolve(import.meta.dirname, "globals.css"), "utf8");

/** Regras fora de `@layer`: só elas vencem os utilitários do Tailwind, que ficam em `@layer utilities`. */
function unlayeredRules(css: string): string {
  let depth = 0;
  let layerDepth: number | null = null;
  let output = "";
  for (let index = 0; index < css.length; index += 1) {
    const char = css[index];
    if (char === "{") {
      const head = css.slice(css.lastIndexOf("}", index) + 1, index);
      if (layerDepth === null && /@(?:layer|theme)\b/.test(head)) layerDepth = depth;
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (layerDepth !== null && depth === layerDepth) {
        layerDepth = null;
        continue;
      }
    }
    if (layerDepth === null) output += char;
  }
  return output;
}

describe("rótulos em caixa alta nas escritas sem caixa (I18N-01.6, T140)", () => {
  const css = unlayeredRules(globalsCss);
  const rule = css.match(/\.uppercase:is\(((?::lang\([\w-]+\),?\s*)+)\)\s*\{([^}]*)\}/);

  it("existe uma regra fora de camada para .uppercase em :lang() das escritas sem caixa", () => {
    expect(rule).not.toBeNull();
  });

  it.each(["ar", "he", "hi", "zh", "ja", "ko"])("a regra vale para :lang(%s)", (lang) => {
    expect(rule?.[1]).toContain(`:lang(${lang})`);
  });

  it("a regra desliga a caixa alta e o letter-spacing", () => {
    expect(rule?.[2]).toMatch(/text-transform:\s*none;/);
    expect(rule?.[2]).toMatch(/letter-spacing:\s*normal;/);
  });
});
