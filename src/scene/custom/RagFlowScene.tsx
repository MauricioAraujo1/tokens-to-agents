import { RagDiagram } from "../../components/diagrams/RagDiagram";
import type { CustomSceneProps } from "./types";

/** Adapta o diagrama RAG à interface de cena custom (SCN-01.3). */
export function RagFlowScene({ steps, stepIndex, paused, onSelectStep }: CustomSceneProps) {
  return (
    <RagDiagram steps={steps} activeStepIndex={stepIndex} isPaused={paused} onSelectStep={onSelectStep ?? (() => {})} />
  );
}
