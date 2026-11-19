/// <reference types="node" />
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// O Vitest não processa CSS, então os arquivos são lidos do disco.
const readStyle = (file: string) => readFileSync(resolve(import.meta.dirname, file), "utf8");
const printCss = readStyle("print.css");
const tokensCss = readStyle("tokens.css");

function declarations(block: string): Record<string, string> {
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]));
}

/** Tokens do bloco `:root` de tokens.css (tema claro). */
function lightTokens(): Record<string, string> {
  const block = tokensCss.match(/(?:^|\n):root\s*\{([^}]*)\}/);
  if (!block) throw new Error("Bloco :root não encontrado em tokens.css");
  return declarations(block[1]);
}

/** Overrides de tokens que o print.css aplica a `:root` e ao tema escuro dentro de `@media print`. */
function printOverrides(): Record<string, string> {
  const media = printCss.slice(printCss.indexOf("@media print"));
  const block = media.match(/:root,\s*:root\[data-theme="dark"\]\s*\{([^}]*)\}/);
  if (!block) throw new Error('Bloco ":root, :root[data-theme=\\"dark\\"]" não encontrado em @media print');
  return declarations(block[1]);
}

describe("diagrama do resumo na impressão (SUM-01.2, QA T141)", () => {
  it("só o SVG da cena é esticado; os ícones dos chips não", () => {
    const media = printCss.slice(printCss.indexOf("@media print"));
    const svgRules = [...media.matchAll(/([^{}]*\.summary-diagram[^{}]*\bsvg\b[^{}]*)\{([^}]*)\}/g)];

    expect(svgRules.length).toBeGreaterThan(0);
    for (const [, selector, body] of svgRules) {
      if (/width\s*:\s*100%/.test(body)) expect(selector).toContain(":not(.lucide)");
    }
  });
});

describe("impressão a partir de qualquer tema (SUM-01.2, T137)", () => {
  const overrides = printOverrides();
  const light = lightTokens();

  it("o override vale para o tema escuro e está dentro de @media print", () => {
    expect(printCss).toMatch(/@media print\s*\{[\s\S]*:root,\s*:root\[data-theme="dark"\]\s*\{/);
  });

  it.each(["state-success", "state-info", "state-danger", "state-success-ink", "state-info-ink", "state-danger-ink"])(
    "--%s volta ao valor do tema claro na impressão",
    (token) => {
      expect(light[token]).toMatch(/^#[0-9a-f]{6}$/i);
      expect(overrides[token]).toBe(light[token]);
    },
  );

  it.each(["ink-primary", "ink-muted"])("--%s vira a tinta do papel (CanvasText)", (token) => {
    expect(overrides[token]).toBe("CanvasText");
  });
});
