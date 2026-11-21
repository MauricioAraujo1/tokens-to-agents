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

  it("na aula, o teto passa a ser a altura medida que sobra na tela, também no quadro que rola (GEO-01.3)", () => {
    expect(globalsCss).toMatch(
      /\.scene\[data-fit="room"\] \.scene-piece > svg,\s*\.scene\[data-fit="room"\] \.scene-piece > \.scene-scroll > svg\s*\{\s*max-height: calc\(var\(--scene-room\) - 2rem - var\(--scene-offset, 0px\)\);\s*\}/,
    );
  });

  it("na aula, o Pipeline em chips fica no centro da célula, como as peças SVG (T22)", () => {
    expect(globalsCss).toMatch(
      /\.scene\[data-fit="room"\] \.scene-piece > \[data-display="chips"\]\s*\{\s*height: 100%;\s*align-content: center;\s*justify-content: center;\s*\}/,
    );
  });
});
