/// <reference types="node" />
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// O Vitest não processa CSS (`?raw` volta vazio), então o arquivo é lido do disco.
const globalsCss = readFileSync(resolve(import.meta.dirname, "globals.css"), "utf8");

describe("cena da aula", () => {
  it("o SVG de cada peça tem teto de altura: matriz, espaço vetorial e diagrama cabem na tela", () => {
    expect(globalsCss).toMatch(/\.scene-piece > svg\s*\{\s*max-height: 58vh;\s*\}/);
  });
});
