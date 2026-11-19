import type { ComponentType } from "react";
import type { SceneSpec } from "../types";

export interface CustomSceneProps {
  steps: ReadonlyArray<{ id: string; scene: SceneSpec }>;
  stepIndex: number;
  paused: boolean;
  onSelectStep?: (stepIndex: number) => void;
}

export interface CustomSceneDefinition {
  component: ComponentType<CustomSceneProps>;
  /** Descrição acessível da cena quando o passo não traz `alt` (SCN-01.7). */
  description: string;
}
