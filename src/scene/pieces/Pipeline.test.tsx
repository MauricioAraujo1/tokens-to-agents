import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { setReducedMotionPreference } from "../../test/reducedMotion";
import { FADED_TEXT_OPACITY } from "../colors";
import { Scene } from "../Scene";
import type { PipelineSpec } from "../types";
import { Pipeline } from "./Pipeline";

const pipeline: PipelineSpec = {
  piece: "pipeline",
  stages: [
    { id: "embed", label: "embed" },
    { id: "search", label: "search" },
    { id: "rerank", label: "rerank" },
    { id: "answer", label: "answer" },
  ],
  done: ["embed", "search"],
  active: "rerank",
};

function renderPiece(spec: PipelineSpec, animate = true) {
  const { container } = render(<Pipeline spec={spec} transition={{ from: null, animate }} reducedMotion={!animate} />);
  const states = () =>
    Object.fromEntries(
      [...container.querySelectorAll("[data-stage]")].map((element) => [element.getAttribute("data-stage"), element.getAttribute("data-state")]),
    );
  const flowing = () =>
    [...container.querySelectorAll('[data-connection][data-flowing="true"]')].map((element) => element.getAttribute("data-connection"));
  return { container, states, flowing };
}

describe("Pipeline", () => {
  it("desenha as etapas em sequência, na ordem declarada, ligadas uma à seguinte", () => {
    const { container } = renderPiece(pipeline);

    expect([...container.querySelectorAll("[data-stage]")].map((element) => element.textContent)).toEqual([
      "embed",
      "search",
      "rerank",
      "answer",
    ]);
    const xs = [...container.querySelectorAll("[data-stage]")].map((element) => Number(element.getAttribute("data-x")));
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    expect([...container.querySelectorAll("[data-connection]")].map((element) => element.getAttribute("data-connection"))).toEqual([
      "embed-search",
      "search-rerank",
      "rerank-answer",
    ]);
  });

  it("separa a etapa ativa, as concluídas e as futuras", () => {
    const { states } = renderPiece(pipeline);

    expect(states()).toEqual({ embed: "done", search: "done", rerank: "active", answer: "upcoming" });
  });

  it("a etapa futura aparece esmaecida e a ativa marcada com aria-current", () => {
    const { container } = renderPiece(pipeline);
    const stage = (id: string) => container.querySelector(`[data-stage="${id}"]`) as Element;

    expect(Number(stage("answer").getAttribute("opacity"))).toBeLessThan(Number(stage("search").getAttribute("opacity")));
    expect(stage("rerank")).toHaveAttribute("aria-current", "step");
    expect(container.querySelectorAll("[aria-current]")).toHaveLength(1);
  });

  it("a etapa futura esmaece só até a opacidade em que o rótulo passa de 4,5:1 (T136)", () => {
    const { container } = renderPiece(pipeline);

    expect(Number(container.querySelector('[data-stage="answer"]')?.getAttribute("opacity"))).toBe(FADED_TEXT_OPACITY);
  });

  it("em chips, desenha as etapas como texto em linha, com o trecho repetido na caixa tracejada (preview 10, T138)", () => {
    const { container } = renderPiece({
      piece: "pipeline",
      display: "chips",
      stages: [
        { id: "text", label: "texto" },
        { id: "attention", label: "multi-head attention", color: "module-03" },
        { id: "ffn", label: "FFN" },
        { id: "next", label: "logits → próximo token", color: "brand" },
      ],
      repeat: { from: "attention", to: "ffn", label: "× N" },
    });

    expect(container.querySelector("svg:not([class*='lucide'])")).toBeNull();
    const chips = [...container.querySelectorAll("[data-stage]")] as HTMLElement[];
    expect(chips.map((chip) => chip.textContent)).toEqual(["texto", "multi-head attention", "FFN", "logits → próximo token"]);
    const repeat = container.querySelector('[data-repeat="× N"]') as HTMLElement;
    expect(repeat).toHaveClass("border-dashed");
    expect([...repeat.querySelectorAll("[data-stage]")].map((chip) => chip.getAttribute("data-stage"))).toEqual(["attention", "ffn"]);
    expect(repeat).toHaveTextContent("× N");
    expect(chips[1].style.backgroundColor).toBe("var(--module-03)");
    expect(chips[3].style.backgroundColor).toBe("var(--accent-brand)");
    expect(chips[1].style.color).toBe("var(--accent-on-brand)");
  });

  it("o dado flui só pela conexão que chega na etapa ativa", () => {
    const { container, flowing } = renderPiece(pipeline);

    expect(flowing()).toEqual(["search-rerank"]);
    expect(container.querySelector('[data-connection="search-rerank"]')?.querySelectorAll(".flow-dot").length).toBeGreaterThan(0);
    expect(container.querySelectorAll(".flow-dot").length).toBe(
      container.querySelector('[data-connection="search-rerank"]')?.querySelectorAll(".flow-dot").length,
    );
  });

  it("desenha o ramo alternativo tracejado, saindo da etapa declarada, com o rótulo", () => {
    const { container, states, flowing } = renderPiece({
      ...pipeline,
      active: "fallback",
      done: ["embed", "search"],
      branch: { id: "fallback", label: "fallback", from: "search", edgeLabel: "sem resultado" },
    });
    const connection = container.querySelector('[data-connection="search-fallback"]') as Element;

    expect(connection).toHaveAttribute("data-variant", "alternative");
    expect(connection.querySelector("path")).toHaveAttribute("stroke-dasharray");
    expect(connection).toHaveTextContent("sem resultado");
    expect(states().fallback).toBe("active");
    expect(flowing()).toEqual(["search-fallback"]);
  });

  it("a descrição da cena cita a etapa do ramo quando ela é a ativa (SCN-01.7)", () => {
    const spec: PipelineSpec = { ...pipeline, active: "fallback", branch: { id: "fallback", label: "fallback", from: "search" } };
    render(<Scene steps={[{ id: "one", scene: { kind: "pieces", layout: "single", pieces: [spec] } }]} stepIndex={0} paused={false} />);

    expect(screen.getByRole("figure")).toHaveAccessibleName(
      "Pipeline com as etapas embed, search, rerank e answer (destaque: fallback)",
    );
  });

  it("com movimento reduzido, o fluxo não anima", () => {
    const { container, flowing } = renderPiece(pipeline, false);

    expect(flowing()).toEqual(["search-rerank"]);
    expect(container.querySelectorAll(".flow-dot")).toHaveLength(0);
    expect(container.querySelectorAll(".scene-animate")).toHaveLength(0);
  });

  it("com a cena pausada, o fluxo para: a cena marca is-paused e o CSS pausa os pontos", () => {
    setReducedMotionPreference(false);
    render(<Scene steps={[{ id: "one", scene: { kind: "pieces", layout: "single", pieces: [pipeline] } }]} stepIndex={0} paused />);
    const css = readFileSync(resolve(import.meta.dirname, "../../styles/globals.css"), "utf8");

    expect(screen.getByRole("figure")).toHaveClass("is-paused");
    expect(screen.getByRole("figure").querySelectorAll(".flow-dot").length).toBeGreaterThan(0);
    expect(css).toMatch(/\.is-paused \.flow-dot\s*\{\s*animation-play-state:\s*paused;/);
  });
});
