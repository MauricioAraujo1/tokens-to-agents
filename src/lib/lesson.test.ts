import { describe, expect, it } from "vitest";
import { ragHowItWorksLesson } from "../data/lessons/rag";
import { isObjectiveReached, stepIndexForNode } from "./lesson";

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

describe("isObjectiveReached", () => {
  const objective = { label: "Gerar o vetor da pergunta", stepId: "embedding" };

  it("considera o objetivo alcançado depois que o passo dele foi superado", () => {
    expect(isObjectiveReached(objective, steps, 2)).toBe(true);
  });

  it("não considera alcançado enquanto o passo do objetivo está ativo ou à frente", () => {
    expect(isObjectiveReached(objective, steps, 1)).toBe(false);
    expect(isObjectiveReached(objective, steps, 0)).toBe(false);
  });

  it("ignora objetivos ligados a um passo inexistente", () => {
    expect(isObjectiveReached({ label: "x", stepId: "nao-existe" }, steps, 9)).toBe(false);
  });
});
