import { ragFlowContent } from "../../content/scenes/rag-flow";
import type { CustomSceneId } from "../types";
import { RagFlowScene } from "./RagFlowScene";
import type { CustomSceneDefinition } from "./types";

export type { CustomSceneDefinition, CustomSceneProps } from "./types";

/** Cenas custom, pelo id declarado em `{ kind: "custom", id }` (SCN-01.3). */
export const customScenes: Record<CustomSceneId, CustomSceneDefinition> = {
  "rag-flow": { component: RagFlowScene, description: ragFlowContent.description },
};
