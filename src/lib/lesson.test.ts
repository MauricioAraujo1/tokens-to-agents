import { describe, expect, it } from "vitest";
import { ragHowItWorksLesson } from "../data/lessons/rag";
import { stepIndexForNode } from "./lesson";

const steps = ragHowItWorksLesson.steps;

describe("stepIndexForNode", () => {
  it("mantém o passo atual quando ele já corresponde ao nó clicado", () => {
    expect(stepIndexForNode(steps, "vectordb", 3)).toBe(3);
  });

  it("escolhe o primeiro passo do nó quando o passo atual é outro", () => {
    expect(stepIndexForNode(steps, "vectordb", 0)).toBe(2);
  });

  it("retorna -1 para um nó que não pertence a nenhuma etapa", () => {
    expect(stepIndexForNode(steps, "user", 0)).toBe(-1);
  });
});
