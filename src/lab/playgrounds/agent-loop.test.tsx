import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { agentLoopContent } from "../../content/playgrounds/agent-loop";
import { runAgent } from "../agentLoop";
import { AgentLoopPlayground } from "./agent-loop";

const script = agentLoopContent.script;

describe("loop de agente (lógica)", () => {
  it("com folga no limite, segue o roteiro até a resposta em 3 iterações", () => {
    const events = runAgent(script, 5);

    expect(events.map((event) => `${event.iteration}:${event.kind}`)).toEqual([
      "1:think",
      "1:act",
      "1:observe",
      "2:think",
      "2:act",
      "2:observe",
      "3:think",
      "3:answer",
    ]);
    expect(events[1]).toMatchObject({ text: 'cotacao("USD/BRL")' });
    expect(events.at(-1)).toMatchObject({ kind: "answer", text: "3 cafés custam R$ 30,60." });
  });

  it("limite igual às iterações necessárias ainda chega à resposta", () => {
    expect(runAgent(script, 3).at(-1)?.kind).toBe("answer");
  });

  it("limite menor que o necessário para depois de completar as iterações permitidas, sem resposta", () => {
    const events = runAgent(script, 2);

    expect(events.map((event) => event.kind)).toEqual(["think", "act", "observe", "think", "act", "observe", "limit"]);
    expect(events.at(-1)).toEqual({ kind: "limit", iteration: 2 });
    expect(events.some((event) => event.kind === "answer")).toBe(false);
  });
});

describe("AgentLoopPlayground (LAB-01.1)", () => {
  const next = () => fireEvent.click(screen.getByRole("button", { name: "Próximo passo" }));
  const log = () =>
    within(screen.getByRole("list", { name: "Passos do agente" }))
      .getAllByRole("listitem")
      .map((item) => item.textContent);

  it("avança passo a passo pelo ciclo pensar → agir → observar, com a ferramenta chamada", () => {
    const { container } = render(<AgentLoopPlayground />);

    expect(container.querySelector("[data-stage='think']")).toHaveAttribute("data-state", "active");
    expect(log()).toEqual(["1. Pensamento: Preciso saber quanto vale o dólar em reais hoje."]);

    next();
    expect(container.querySelector("[data-stage='act']")).toHaveAttribute("data-state", "active");
    expect(container.querySelector("[data-tool]")).toHaveAttribute("data-tool", 'cotacao("USD/BRL")');

    next();
    expect(container.querySelector("[data-stage='observe']")).toHaveAttribute("data-state", "active");
    expect(container.querySelector("[data-tool]")).toBeNull();
    expect(log().at(-1)).toBe("1. Observação: 1 USD = 5.10 BRL");
  });

  it("atinge a resposta com o roteiro fixo e não deixa avançar depois dela", () => {
    const { container } = render(<AgentLoopPlayground />);

    for (let step = 0; step < 7; step += 1) next();

    expect(log()).toHaveLength(8);
    expect(log().at(-1)).toBe("3. Resposta: 3 cafés custam R$ 30,60.");
    expect(container.querySelector("[data-iteration]")).toHaveAttribute("data-iteration", "3");
    expect(container.querySelector("[data-iteration]")).not.toHaveAttribute("data-limit-reached");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Próximo passo" })).toBeDisabled();
  });

  it("para no limite de iterações com aviso", () => {
    const { container } = render(<AgentLoopPlayground />);

    fireEvent.change(screen.getByRole("slider", { name: "Limite de iterações" }), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Executar até o fim" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Limite de 2 iterações atingido sem resposta: o agente parou.");
    expect(log()).toHaveLength(6);
    expect(log().some((entry) => entry?.includes("Resposta"))).toBe(false);
    expect(container.querySelector("[data-iteration]")).toHaveAttribute("data-limit-reached", "true");
    expect(container.querySelector("[data-iteration]")).toHaveTextContent("↻ 2 / 2");
    expect(screen.getByRole("button", { name: "Próximo passo" })).toBeDisabled();
  });

  it("reiniciar volta ao primeiro passo", () => {
    render(<AgentLoopPlayground />);

    next();
    next();
    fireEvent.click(screen.getByRole("button", { name: "Reiniciar" }));

    expect(log()).toHaveLength(1);
  });
});
