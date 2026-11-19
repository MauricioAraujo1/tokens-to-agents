// Motor de cenas (AD-002): cada passo declara a sua cena como dados. O tipo é o
// contrato: uma cena com campo errado não compila, e o build falha (SCN-01.6).

import type { ModuleId } from "../types/content";

/** Cenas feitas sob medida, renderizadas no lugar das peças (SCN-01.3). */
export type CustomSceneId = "rag-flow";

/**
 * Cores que uma cena pode usar. Cada uma vira uma variável CSS do tema atual
 * (THM-01.4), nunca uma cor fixa: veja `sceneColor` em `colors.ts`.
 */
export type SceneColor =
  | "ink"
  | "muted"
  | "brand"
  | "success"
  | "info"
  | "danger"
  | `module-${ModuleId}`;

/**
 * Como o runtime posiciona as peças:
 * - `single`: uma peça ocupa a cena;
 * - `row` / `column`: peças lado a lado ou empilhadas;
 * - `grid`: grade de duas colunas;
 * - `overlay`: a primeira peça ocupa a cena e as outras ficam por cima, no canto.
 */
export type SceneLayout = "single" | "row" | "column" | "grid" | "overlay";

interface PieceBase {
  /** Identidade da peça entre passos: a transição anima a peça de mesmo id. Sem id, vale a posição. */
  id?: string;
}

/** Fila de tokens com query e keys em destaque, arcos ponderados e barras opcionais. */
export interface TokenStreamSpec extends PieceBase {
  piece: "token-stream";
  tokens: string[];
  /** Índice do token que pergunta (query). */
  query?: number;
  /** Índices dos tokens comparados (keys). */
  keys?: number[];
  /** Arcos entre tokens; `weight` de 0 a 1 define a espessura. */
  arcs?: Array<{ from: number; to: number; weight: number; label?: string }>;
  /** Uma barra por token, de 0 a 1. */
  bars?: number[];
  color?: SceneColor;
}

/** Matriz ou heatmap com rótulos, escala de cor e célula em destaque. */
export interface MatrixSpec extends PieceBase {
  piece: "matrix";
  rows: string[];
  cols: string[];
  /** `values[linha][coluna]`. */
  values: number[][];
  /** Faixa da escala de cor; sem ela, usa o menor e o maior valor. */
  scale?: { min: number; max: number };
  highlight?: { row: number; col: number };
  /** Apaga as células acima da diagonal (atenção causal). */
  causalMask?: boolean;
  showValues?: boolean;
  color?: SceneColor;
}

export interface VectorPoint {
  id: string;
  label: string;
  /** 2 coordenadas, ou 3 com projeção isométrica. */
  coords: [number, number] | [number, number, number];
  color?: SceneColor;
}

/** Pontos em 2D ou 3D, vetores, distância e vizinhos mais próximos. */
export interface VectorSpaceSpec extends PieceBase {
  piece: "vector-space";
  points: VectorPoint[];
  /** Setas da origem até o ponto `to`, ou de `from` até `to`. */
  vectors?: Array<{ from?: string; to: string }>;
  /** Ponto de consulta, base dos vizinhos. */
  query?: string;
  /** Quantos vizinhos mais próximos da query destacar. */
  neighbors?: number;
  distance?: { from: string; to: string; label: string };
}

export interface GraphNode {
  id: string;
  label: string;
  /** Posição relativa, de 0 a 1. */
  x: number;
  y: number;
  color?: SceneColor;
}

/** Grafo de nós e arestas, com caminho em destaque e travessia passo a passo. */
export interface GraphSpec extends PieceBase {
  piece: "graph";
  nodes: GraphNode[];
  /** `weight` de 0 a 1 define a espessura da aresta. */
  edges: Array<{ from: string; to: string; label?: string; weight?: number }>;
  /** Nós em foco no passo (por exemplo, o nó sendo visitado). */
  highlight?: string[];
  /** Caminho ativo, em ordem: as arestas entre nós consecutivos ficam em destaque. */
  path?: string[];
  /** Nós já visitados na travessia. Declarado, os outros nós aparecem como não visitados. */
  visited?: string[];
}

export interface PipelineStage {
  id: string;
  label: string;
  color?: SceneColor;
}

/** Pipeline de etapas, com a etapa atual, as concluídas e um ramo alternativo opcional. */
export interface PipelineSpec extends PieceBase {
  piece: "pipeline";
  stages: PipelineStage[];
  /** Etapa atual: o dado flui pela conexão que chega nela. Pode ser a etapa do ramo. */
  active?: string;
  done?: string[];
  /** Ramo alternativo (por exemplo, um fallback) que sai da etapa `from`, tracejado. */
  branch?: PipelineStage & { from: string; edgeLabel?: string };
  /**
   * `chips`: etapas como chips de texto em linha, que quebram com a largura, como o fluxo do resumo
   * no preview 10. Sem ele, a cena em SVG com caixas e conexões.
   */
  display?: "scene" | "chips";
  /** Trecho de etapas repetido (de `from` a `to`, inclusive) numa caixa tracejada com `label`, como "× N". */
  repeat?: { from: string; to: string; label: string };
}

/** Loop de agente: pensar, agir, observar, com a ferramenta chamada e o contador de iterações. */
export interface AgentLoopSpec extends PieceBase {
  piece: "agent-loop";
  phases: Array<{ id: string; label: string }>;
  active?: string;
  /** Iteração atual, a partir de 1. */
  iteration?: number;
  /** Limite de iterações do agente, exibido junto do contador. */
  maxIterations?: number;
  /** Ferramenta chamada no passo, por exemplo `search("RAG")`. */
  tool?: string;
}

export interface ClientServerNode {
  id: string;
  label: string;
  role: "client" | "queue" | "server" | "database" | "cache" | "model";
  /** Itens esperando na fila (papel `queue`). */
  size?: number;
  /** Utilização de 0 a 1, desenhada como barra abaixo do nó. */
  utilization?: number;
}

/** Clientes, filas e servidores em vista isométrica, com requisições em trânsito e utilização. */
export interface ClientServerSpec extends PieceBase {
  piece: "client-server";
  nodes: ClientServerNode[];
  messages: Array<{ from: string; to: string; label: string }>;
  /** Índice da mensagem em trânsito. */
  active?: number;
}

/** Gráfico de barras ou linhas para distribuições e métricas. */
export interface ChartSpec extends PieceBase {
  piece: "chart";
  kind: "bar" | "line";
  series: Array<{ label: string; value: number }>;
  /** Topo do eixo; sem ele, o maior valor. */
  max?: number;
  /**
   * Linha de corte: `top-p` mantém as barras de maior valor até a soma chegar a `value`;
   * `threshold` mantém as barras com valor maior ou igual a `value`. As outras ficam esmaecidas.
   */
  cutoff?: { mode: "top-p" | "threshold"; value: number; label?: string };
  highlight?: number;
  color?: SceneColor;
}

/** Cards de métrica ao vivo sobre a cena, com um em destaque. */
export interface MetricsPanelSpec extends PieceBase {
  piece: "metrics-panel";
  metrics: Array<{ id: string; label: string; value: string; color?: SceneColor }>;
  highlight?: string;
}

/** As 9 peças do motor (SCN-01.2), discriminadas por `piece`. */
export type PieceSpec =
  | TokenStreamSpec
  | VectorSpaceSpec
  | MatrixSpec
  | GraphSpec
  | PipelineSpec
  | AgentLoopSpec
  | ClientServerSpec
  | ChartSpec
  | MetricsPanelSpec;

export type PieceKind = PieceSpec["piece"];

export type SceneSpec =
  | { kind: "pieces"; layout: SceneLayout; pieces: PieceSpec[] }
  | { kind: "custom"; id: CustomSceneId };

/** Estado de transição que o runtime entrega a cada peça (SCN-01.4, SCN-01.5). */
export interface TransitionState<T extends PieceSpec = PieceSpec> {
  /** A mesma peça no passo anterior, quando existe. */
  from: T | null;
  /** `false` com movimento reduzido: a peça mostra direto o estado final. */
  animate: boolean;
}

export interface PieceProps<T extends PieceSpec> {
  spec: T;
  transition: TransitionState<T>;
  reducedMotion: boolean;
}
