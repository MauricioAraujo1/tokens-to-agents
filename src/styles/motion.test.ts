/// <reference types="node" />
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// O Vitest não processa CSS (`?raw` volta vazio), então o arquivo é lido do disco.
const globalsCss = readFileSync(resolve(import.meta.dirname, "globals.css"), "utf8");

/** Corpo do bloco `@media (prefers-reduced-motion: reduce)`, com as chaves aninhadas. */
function reducedMotionBlock(): string {
  const start = globalsCss.indexOf("@media (prefers-reduced-motion: reduce)");
  if (start < 0) throw new Error("globals.css não tem o bloco prefers-reduced-motion");
  const open = globalsCss.indexOf("{", start);
  let depth = 0;
  for (let index = open; index < globalsCss.length; index += 1) {
    if (globalsCss[index] === "{") depth += 1;
    if (globalsCss[index] === "}") depth -= 1;
    if (depth === 0) return globalsCss.slice(open + 1, index);
  }
  throw new Error("bloco prefers-reduced-motion sem fechamento");
}

describe("motion do app (SCN-01.4)", () => {
  it("define as animações de passo, de entrada de cartões e de destaque de nós", () => {
    for (const name of ["fade-in", "step-in", "rise", "pop-in", "zone-in"]) {
      expect(globalsCss).toMatch(new RegExp(`--animate-${name}: ${name} \\d+ms var\\(--ease-(smooth|spring)\\) both;`));
      expect(globalsCss).toContain(`@keyframes ${name} {`);
    }
  });

  it("com reduced motion, nenhuma animação nem transição roda em elemento algum", () => {
    const block = reducedMotionBlock();
    const universal = block.match(/\*,\s*\*::before,\s*\*::after\s*\{([^}]*)\}/)?.[1] ?? "";

    expect(universal).toContain("animation-duration: 0.01ms !important;");
    expect(universal).toContain("animation-delay: 0ms !important;");
    expect(universal).toContain("transition-duration: 0.01ms !important;");
  });

  it("com reduced motion, os pontos de fluxo e a troca de passo da cena param", () => {
    const block = reducedMotionBlock();

    expect(block).toMatch(/\.flow-dot,\s*\.scene-transition \.scene-piece\s*\{\s*animation: none;\s*\}/);
  });
});
