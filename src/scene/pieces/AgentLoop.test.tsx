import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { stubSceneFrame, svgTextOnScreen } from "../../test/sceneFrame";
import type { AgentLoopSpec } from "../types";
import { AgentLoop } from "./AgentLoop";
import { layoutAgentLoop, stageRect } from "./agentLoopLayout";

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

  const fourPhases: AgentLoopSpec = {
    piece: "agent-loop",
    phases: [
      { id: "think", label: "pensar" },
      { id: "act", label: "chamar ferramenta" },
      { id: "observe", label: "resultado como tool" },
      { id: "answer", label: "responder" },
    ],
    active: "act",
    iteration: 1,
    maxIterations: 8,
    tool: 'search(repo: "acme/api", query: "timeout")',
  };

  it("com 4 fases, cada seta mostra pelo menos 24 px de linha, fora das caixas (GEO-01.1)", () => {
    for (const font of [8, 12, 20]) {
      const layout = layoutAgentLoop(fourPhases, font);

      expect(layout.connections).toHaveLength(4);
      for (const { geometry } of layout.connections) {
        const visible = Math.hypot(geometry.end.x - geometry.start.x, geometry.end.y - geometry.start.y);
        expect(visible, `fonte ${font}`).toBeGreaterThanOrEqual(24 * Math.max(1, font / 12));
        for (const stage of layout.stages) {
          const rect = stageRect(stage);
          for (const point of [geometry.start, geometry.end]) {
            const inside = point.x > rect.left && point.x < rect.right && point.y > rect.top && point.y < rect.bottom;
            expect(inside).toBe(false);
          }
        }
      }
    }
  });

  it("a pílula da ferramenta não cobre nenhuma caixa, nem com chamada longa (GEO-01.4)", () => {
    for (const spec of [fourPhases, loop]) {
      for (const font of [8, 12, 20]) {
        const layout = layoutAgentLoop(spec, font);
        const tool = layout.tool;
        if (!tool) throw new Error("sem ferramenta");
        for (const stage of layout.stages) {
          const rect = stageRect(stage);
          const overlap = tool.rect.left < rect.right && rect.left < tool.rect.right && tool.rect.top < rect.bottom && rect.top < tool.rect.bottom;
          expect(overlap, `${stage.stage.id} @${font}`).toBe(false);
        }
        expect(tool.rect.left).toBeGreaterThanOrEqual(0);
        expect(tool.rect.right).toBeLessThanOrEqual(layout.width);
      }
    }
  });

  it("o texto das fases cabe na caixa, quebrando em 2 linhas quando é longo (COL-01.1)", () => {
    const layout = layoutAgentLoop(fourPhases, 12);
    const observe = layout.stages.find((stage) => stage.stage.id === "observe");

    expect(observe?.lines).toEqual(["resultado", "como tool"]);
    for (const stage of layout.stages) {
      for (const line of stage.lines) expect(line.length * 0.6 * 12).toBeLessThan(2 * stage.half.width);
    }
  });

  it("marca os elementos para a transição só quando há animação", () => {
    expect(renderPiece(loop, true).container.querySelectorAll(".scene-animate").length).toBeGreaterThan(0);
    expect(renderPiece(loop).container.querySelectorAll(".scene-animate")).toHaveLength(0);
  });
});

describe("AgentLoop em tela estreita (LEG-01.4)", () => {
  // 14-13#1: quatro fases e a pílula da ferramenta; a 375 (quadro de 309 px) o texto caía para 8,6 px.
  const feedback: AgentLoopSpec = {
    piece: "agent-loop",
    phases: [
      { id: "edit", label: "editar" },
      { id: "check", label: "rodar a checagem" },
      { id: "read", label: "ler a saída" },
      { id: "fix", label: "corrigir" },
    ],
    active: "check",
    iteration: 1,
    maxIterations: 3,
    tool: 'Bash("pnpm test")',
  };

  it("a 375, o ciclo mantém o texto, a pílula e o contador com 11 px ou mais, e o quadro rola", () => {
    const restore = stubSceneFrame(309);
    try {
      const { container } = renderPiece(feedback);
      const svg = container.querySelector("svg") as SVGSVGElement;
      const sizes = svgTextOnScreen(container);

      expect(Number.parseFloat(svg.style.minWidth)).toBeGreaterThan(309);
      expect(container.querySelector(".scene-scroll")).toHaveAttribute("data-scene-scroll", "scroll");
      expect(screen.getByRole("group", { name: /^Loop de agente/ })).toHaveAttribute("tabindex", "0");
      expect(container.querySelector("[data-tool] text")).not.toBeNull();
      for (const size of sizes) expect(size).toBeGreaterThanOrEqual(10.95);
    } finally {
      restore();
    }
  });

  it("a 1440, o ciclo cabe no quadro: não rola nem entra no Tab", () => {
    const restore = stubSceneFrame(655);
    try {
      const { container } = renderPiece(feedback);
      const frame = container.querySelector(".scene-scroll") as HTMLElement;

      expect(frame).toHaveAttribute("data-scene-scroll", "fit");
      expect(frame).not.toHaveAttribute("tabindex");
    } finally {
      restore();
    }
  });
});

describe("AgentLoop com pílula de ferramenta longa (13-10#3, T22)", () => {
  const mcp: AgentLoopSpec = {
    piece: "agent-loop",
    phases: [
      { id: "ask", label: "modelo pede" },
      { id: "route", label: "host roteia" },
      { id: "call", label: "tools/call" },
      { id: "result", label: "tool result" },
    ],
    active: "call",
    iteration: 1,
    maxIterations: 8,
    tool: 'search(repo: "acme/api", query: "timeout")',
  };

  it("o ciclo alarga só na horizontal: fica mais baixo que largo, e a pílula não toca nenhuma fase", () => {
    for (const font of [12, 16, 20]) {
      const layout = layoutAgentLoop(mcp, font);
      const tool = layout.tool?.rect;
      if (!tool) throw new Error("caso incompleto");
      const center = (id: string) => layout.stages.find((stage) => stage.stage.id === id)?.center ?? { x: Number.NaN, y: Number.NaN };

      expect(center("call").y - center("ask").y, `@${font}`).toBeLessThan(center("route").x - center("result").x);
      for (const stage of layout.stages) {
        const box = stageRect(stage);
        expect(box.right < tool.left || box.left > tool.right || box.bottom < tool.top || box.top > tool.bottom, `@${font}: ${stage.stage.id}`).toBe(true);
      }
    }
  });
});
