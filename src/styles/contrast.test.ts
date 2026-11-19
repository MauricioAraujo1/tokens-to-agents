/// <reference types="node" />
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { FADED_TEXT_OPACITY } from "../scene/colors";

// O Vitest não processa CSS (`?raw` volta vazio), então os arquivos são lidos do disco.
const readStyle = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");
const globalsCss = readStyle("./globals.css");
const tokensCss = readStyle("./tokens.css");

type Theme = "light" | "dark";

const THEME_SELECTORS: Record<Theme, string> = {
  light: ":root",
  dark: ':root[data-theme="dark"]',
};

function readThemeTokens(theme: Theme): Record<string, string> {
  const selector = THEME_SELECTORS[theme].replace(/[[\]().*+?^$|\\]/g, "\\$&");
  const block = tokensCss.match(new RegExp(`(?:^|\\n)${selector}\\s*\\{([^}]*)\\}`));
  if (!block) throw new Error(`Bloco ${THEME_SELECTORS[theme]} não encontrado em tokens.css`);

  const tokens: Record<string, string> = {};
  for (const [, name, value] of block[1].matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    tokens[name] = value.trim();
  }
  return tokens;
}

function channel(hex: string, offset: number): number {
  const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error(`Cor fora do formato #RRGGBB: ${hex}`);
  return 0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5);
}

/** Cor `foreground` com opacidade `alpha` composta sobre `background`, em #RRGGBB. */
function composite(foreground: string, background: string, alpha: number): string {
  const mixed = [1, 3, 5].map((offset) => {
    const value = parseInt(foreground.slice(offset, offset + 2), 16) * alpha + parseInt(background.slice(offset, offset + 2), 16) * (1 - alpha);
    return Math.round(value).toString(16).padStart(2, "0");
  });
  return `#${mixed.join("")}`;
}

function contrastRatio(foreground: string, background: string): number {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("contraste WCAG AA dos tokens (THM-01.3)", () => {
  const texts = ["ink-primary", "ink-muted"];
  const backgrounds = ["bg-paper", "surface-raised"];

  for (const theme of ["light", "dark"] as const) {
    const tokens = readThemeTokens(theme);

    for (const text of texts) {
      for (const background of backgrounds) {
        it(`${text} sobre ${background} no tema ${theme} tem contraste >= 4.5:1`, () => {
          expect(tokens[text]).toBeDefined();
          expect(tokens[background]).toBeDefined();
          expect(contrastRatio(tokens[text], tokens[background])).toBeGreaterThanOrEqual(4.5);
        });
      }
    }
  }

  for (const theme of ["light", "dark"] as const) {
    it(`accent-on-brand sobre accent-brand no tema ${theme} tem contraste >= 4.5:1`, () => {
      const tokens = readThemeTokens(theme);
      expect(contrastRatio(tokens["accent-on-brand"], tokens["accent-brand"])).toBeGreaterThanOrEqual(4.5);
    });
  }

  // Texto em cor de estado (T136): cada *-ink sobre as superfícies e o próprio fundo suave.
  const STATE_TEXT_BACKGROUNDS: Record<string, string[]> = {
    "state-success-ink": ["surface-raised", "bg-paper", "surface-sunken", "state-success-soft"],
    "state-info-ink": ["surface-raised", "bg-paper", "surface-sunken", "state-info-soft"],
    "state-danger-ink": ["surface-raised", "bg-paper", "surface-sunken"],
  };

  for (const theme of ["light", "dark"] as const) {
    const tokens = readThemeTokens(theme);

    for (const [text, backgrounds] of Object.entries(STATE_TEXT_BACKGROUNDS)) {
      for (const background of backgrounds) {
        it(`${text} sobre ${background} no tema ${theme} tem contraste >= 4.5:1`, () => {
          expect(tokens[text]).toMatch(/^#[0-9a-f]{6}$/i);
          expect(contrastRatio(tokens[text], tokens[background])).toBeGreaterThanOrEqual(4.5);
        });
      }
    }

    // A pílula de pontuação da key (TokenStream) é texto surface-raised sobre state-info-ink.
    it(`surface-raised sobre state-info-ink no tema ${theme} tem contraste >= 4.5:1`, () => {
      expect(contrastRatio(tokens["surface-raised"], tokens["state-info-ink"])).toBeGreaterThanOrEqual(4.5);
    });

    // "Maior pontuação" e os textos sobre o destaque da marca usam ink-primary.
    it(`ink-primary sobre accent-brand-soft no tema ${theme} tem contraste >= 4.5:1`, () => {
      expect(contrastRatio(tokens["ink-primary"], tokens["accent-brand-soft"])).toBeGreaterThanOrEqual(4.5);
    });
  }

  // Rótulo de uma etapa ou nó esmaecido: o grupo inteiro (caixa em surface-raised e texto em
  // ink-primary) recebe a opacidade e é composto sobre o fundo da cena (paper ou a linha da grade).
  for (const theme of ["light", "dark"] as const) {
    const tokens = readThemeTokens(theme);

    for (const background of ["bg-paper", "bg-grid"]) {
      it(`texto esmaecido a ${FADED_TEXT_OPACITY} sobre ${background} no tema ${theme} tem contraste >= 4.5:1`, () => {
        const box = composite(tokens["surface-raised"], tokens[background], FADED_TEXT_OPACITY);
        const text = composite(tokens["ink-primary"], box, FADED_TEXT_OPACITY);
        expect(contrastRatio(text, box)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  it("o cálculo de contraste segue a fórmula WCAG (preto sobre branco = 21:1)", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#FFFFFF")).toBeLessThan(4.5);
  });
});

describe("ink-subtle fica para bordas e ícones (T136)", () => {
  // ink-subtle tem 2,9:1 no claro e 3,7:1 no escuro: não serve para texto legível. Só o estado
  // desabilitado (isento pelo WCAG 1.4.3) continua com ele.
  const sourceRoot = resolve(import.meta.dirname, "..");
  const sources = (readdirSync(sourceRoot, { recursive: true }) as string[])
    .map((file) => file.replace(/\\/g, "/"))
    .filter((file) => /\.tsx?$/.test(file) && !/\.(test|check)\.tsx?$/.test(file));

  it("nenhum componente usa ink-subtle como cor de texto", () => {
    expect(sources.length).toBeGreaterThan(50);
    const offenders = sources.flatMap((file) => {
      const source = readFileSync(resolve(sourceRoot, file), "utf8");
      const matches = source.match(/(?<![\w-])(?:[\w-]+:)*(?:text|fill)-(?:ink-)?subtle\b/g) ?? [];
      return matches.filter((match) => match !== "disabled:text-subtle").map((match) => `${file}: ${match}`);
    });
    expect(offenders).toEqual([]);
  });
});

describe("tokens do FigCraft aplicados em globals.css", () => {
  it("globals.css importa tokens.css", () => {
    expect(globalsCss).toMatch(/@import\s+["']\.\/tokens\.css["'];/);
  });

  it("globals.css não declara cor fixa fora dos tokens", () => {
    expect(globalsCss).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(globalsCss).not.toMatch(/\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/i);
  });

  it("tokens.css define as 18 cores de módulo nos dois temas", () => {
    for (const theme of ["light", "dark"] as const) {
      const tokens = readThemeTokens(theme);
      for (let index = 0; index < 18; index += 1) {
        expect(tokens[`module-${String(index).padStart(2, "0")}`]).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  it("@theme expõe os utilitários do design system ligados aos tokens dos dois temas", () => {
    const utilities: Record<string, string> = {
      paper: "bg-paper",
      grid: "bg-grid",
      surface: "surface-raised",
      sunken: "surface-sunken",
      ink: "ink-primary",
      muted: "ink-muted",
      subtle: "ink-subtle",
      line: "line-soft",
      "line-strong": "line-strong",
      brand: "accent-brand",
      "brand-soft": "accent-brand-soft",
      "on-brand": "accent-on-brand",
      success: "state-success",
      "success-soft": "state-success-soft",
      info: "state-info",
      "info-soft": "state-info-soft",
      danger: "state-danger",
      "success-ink": "state-success-ink",
      "info-ink": "state-info-ink",
      "danger-ink": "state-danger-ink",
      "diagram-green": "diagram-green",
      "diagram-blue": "diagram-blue",
      "diagram-purple": "diagram-purple",
      "diagram-orange": "diagram-orange",
      "diagram-red": "diagram-red",
      "diagram-yellow": "diagram-yellow",
    };
    const themes = [readThemeTokens("light"), readThemeTokens("dark")];

    for (const [utility, token] of Object.entries(utilities)) {
      const declarations = [...globalsCss.matchAll(new RegExp(`--color-${utility}:\\s*([^;]+);`, "g"))];
      expect(declarations.map(([, value]) => value.trim())).toEqual([`var(--${token})`]);
      for (const tokens of themes) expect(tokens[token]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("@theme define as sombras duras de 1.5, 2 e 3 px em shadow-hard, sem blur", () => {
    expect(globalsCss).toContain("--shadow-press-sm: 1.5px 1.5px 0 var(--shadow-hard);");
    expect(globalsCss).toContain("--shadow-press: 2px 2px 0 var(--shadow-hard);");
    expect(globalsCss).toContain("--shadow-press-lg: 3px 3px 0 var(--shadow-hard);");
  });

  it("a grade da cena usa linhas de 1 px em bg-grid a cada 24 px", () => {
    const block = globalsCss.match(/\.scene-grid\s*\{([^}]*)\}/);
    expect(block?.[1]).toContain("linear-gradient(var(--bg-grid) 1px, transparent 1px)");
    expect(block?.[1]).toContain("linear-gradient(90deg, var(--bg-grid) 1px, transparent 1px)");
    expect(block?.[1]).toContain("background-size: 24px 24px");
  });

  it("@theme expõe as 18 cores de módulo como utilitários do Tailwind", () => {
    for (let index = 0; index < 18; index += 1) {
      const id = String(index).padStart(2, "0");
      expect(globalsCss).toContain(`--color-module-${id}: var(--module-${id});`);
    }
  });
});
