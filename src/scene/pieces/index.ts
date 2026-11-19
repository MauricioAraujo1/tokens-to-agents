import type { ComponentType } from "react";
import type { PieceKind, PieceProps, PieceSpec } from "../types";
import { AgentLoop } from "./AgentLoop";
import { Chart } from "./Chart";
import { ClientServer } from "./ClientServer";
import { Graph } from "./Graph";
import { Matrix } from "./Matrix";
import { MetricsPanel } from "./MetricsPanel";
import { Pipeline } from "./Pipeline";
import { TokenStream } from "./TokenStream";
import { VectorSpace } from "./VectorSpace";

export type PieceComponent<K extends PieceKind> = ComponentType<PieceProps<Extract<PieceSpec, { piece: K }>>>;

/** Componente de cada uma das 9 peças (SCN-01.2). O tipo exige todas: peça nova sem componente não compila. */
export const pieceComponents: { [K in PieceKind]: PieceComponent<K> } = {
  "token-stream": TokenStream,
  matrix: Matrix,
  "vector-space": VectorSpace,
  graph: Graph,
  pipeline: Pipeline,
  "agent-loop": AgentLoop,
  "client-server": ClientServer,
  chart: Chart,
  "metrics-panel": MetricsPanel,
};
