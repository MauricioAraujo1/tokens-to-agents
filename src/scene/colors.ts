import type { SceneColor } from "./types";

// Cada cor de cena é uma variável CSS do tema: trocar o tema troca a cena junto (THM-01.4).
const TOKEN_VARIABLE: Record<Exclude<SceneColor, `module-${string}`>, string> = {
  ink: "var(--ink-primary)",
  muted: "var(--ink-muted)",
  brand: "var(--accent-brand)",
  success: "var(--state-success)",
  info: "var(--state-info)",
  danger: "var(--state-danger)",
};

/**
 * Opacidade de um elemento esmaecido que leva texto (etapa ou nó futuro). Abaixo disso o rótulo
 * em ink-primary cai de 4,5:1 sobre a grade no tema claro; `contrast.test.ts` confere (T136).
 */
export const FADED_TEXT_OPACITY = 0.7;

export function sceneColor(color: SceneColor): string {
  return color.startsWith("module-") ? `var(--${color})` : TOKEN_VARIABLE[color as keyof typeof TOKEN_VARIABLE];
}
