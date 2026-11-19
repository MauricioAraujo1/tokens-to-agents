import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AgentLoopSpec } from "../types";
import { AgentLoop } from "./AgentLoop";

const loop: AgentLoopSpec = {
  piece: "agent-loop",
  phases: [
    { id: "think", label: "pensar" },
    { id: "act", label: "agir" },
    { id: "observe", label: "observar" },
  ],
  active: "act",
  iteration: 2,
  maxIterations: 5,
  tool: 'search("RAG")',
};

function renderPiece(spec: AgentLoopSpec, animate = false) {
  const { container } = render(<AgentLoop spec={spec} transition={{ from: null, animate }} reducedMotion={!animate} />);
  const stage = (id: string) => container.querySelector(`[data-stage="${id}"]`) as Element;
  return { container, stage };
}

describe("AgentLoop", () => {
  it("desenha as fases em ciclo: cada uma liga à seguinte e a última volta à primeira", () => {
    const { container } = renderPiece(loop);

    expect([...container.querySelectorAll("[data-stage]")].map((element) => element.textContent)).toEqual(["pensar", "agir", "observar"]);
    expect([...container.querySelectorAll("[data-connection]")].map((element) => element.getAttribute("data-connection"))).toEqual([
      "think-act",
      "act-observe",
      "observe-think",
    ]);
  });

  it("marca a fase ativa e faz o fluxo chegar nela", () => {
    const { container, stage } = renderPiece(loop);

    expect(stage("act")).toHaveAttribute("data-state", "active");
    expect(stage("act")).toHaveAttribute("aria-current", "step");
    expect(stage("think")).not.toHaveAttribute("data-state", "active");
    expect(stage("observe")).not.toHaveAttribute("data-state", "active");
    expect(
      [...container.querySelectorAll('[data-connection][data-flowing="true"]')].map((element) => element.getAttribute("data-connection")),
    ).toEqual(["think-act"]);
  });

  it("exibe a ferramenta chamada", () => {
    const { container } = renderPiece(loop);

    expect(container.querySelector("[data-tool]")).toHaveTextContent('search("RAG")');
  });

  it("exibe o contador de iterações junto do limite", () => {
    const { container } = renderPiece(loop);
    const counter = container.querySelector("[data-iteration]") as Element;

    expect(counter).toHaveTextContent("2 / 5");
    expect(counter).not.toHaveAttribute("data-limit-reached");
  });

  it("ao chegar no limite, o contador fica em alerta", () => {
    const { container } = renderPiece({ ...loop, iteration: 5 });
    const counter = container.querySelector("[data-iteration]") as Element;

    expect(counter).toHaveTextContent("5 / 5");
    expect(counter).toHaveAttribute("data-limit-reached", "true");
  });

  it("sem limite, o contador mostra só a iteração; sem ferramenta e sem iteração, nada aparece", () => {
    expect(renderPiece({ ...loop, maxIterations: undefined }).container.querySelector("[data-iteration]")?.textContent).toBe("↻ 2");

    const { container } = renderPiece({ ...loop, iteration: undefined, maxIterations: undefined, tool: undefined });
    expect(container.querySelector("[data-iteration]")).toBeNull();
    expect(container.querySelector("[data-tool]")).toBeNull();
  });

  it("marca os elementos para a transição só quando há animação", () => {
    expect(renderPiece(loop, true).container.querySelectorAll(".scene-animate").length).toBeGreaterThan(0);
    expect(renderPiece(loop).container.querySelectorAll(".scene-animate")).toHaveLength(0);
  });
});
