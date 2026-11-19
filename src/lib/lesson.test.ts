import { describe, expect, it } from "vitest";
import { getRagStepNodeIds } from "../components/diagrams/ragDiagramLayout";
import ragLesson from "../content/lessons/08/08-02-rag-architecture";
import { stepIndexForNode } from "./lesson";

const stepNodeIds = getRagStepNodeIds(ragLesson.steps);

describe("stepIndexForNode", () => {
  it("mantém o passo atual quando ele já corresponde ao nó clicado", () => {
    expect(stepIndexForNode(stepNodeIds, "vectordb", 3)).toBe(3);
  });

  it("escolhe o primeiro passo do nó quando o passo atual é outro", () => {
    expect(stepIndexForNode(stepNodeIds, "vectordb", 0)).toBe(2);
  });

  it("retorna -1 para um nó que não pertence a nenhuma etapa", () => {
    expect(stepIndexForNode(stepNodeIds, "user", 0)).toBe(-1);
  });
});
