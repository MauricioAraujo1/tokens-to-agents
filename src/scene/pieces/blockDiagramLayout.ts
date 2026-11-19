import { getRagEdgeGeometry, type Point } from "../../components/diagrams/ragDiagramLayout";
import type { BlockDiagramSpec, DiagramBlock } from "../types";
import type { ConnectionLayout } from "./pipelineLayout";

export const BLOCK_COLUMN_SPACING = 270;
export const BLOCK_ROW_SPACING = 210;
/** Meia largura da zona verde do bloco ativo (90) mais folga. */
export const BLOCK_MARGIN_X = 110;
/** Espaço acima da base para o bloco mais alto e a pílula do rótulo. */
export const BLOCK_MARGIN_TOP = 156;
export const BLOCK_MARGIN_BOTTOM = 66;
/** As setas ligam o meio do volume dos blocos, não a base no chão. */
export const BLOCK_EDGE_LIFT = 40;

export type BlockState = "active" | "done" | "upcoming" | "idle";

export interface BlockLayout {
  block: DiagramBlock;
  /** Centro da base do bloco, na tela. */
  base: Point;
  state: BlockState;
}

export function blockState(id: string, spec: Pick<BlockDiagramSpec, "active" | "done">): BlockState {
  if (id === spec.active) return "active";
  if (spec.done === undefined) return "idle";
  return spec.done.includes(id) ? "done" : "upcoming";
}

/**
 * Blocos na grade (colunas para a direita, linhas para baixo), desenhados de trás para a frente,
 * e as setas entre eles. A seta que chega no bloco ativo é a que mostra o dado fluindo.
 */
export function layoutBlockDiagram(spec: BlockDiagramSpec): {
  width: number;
  height: number;
  blocks: BlockLayout[];
  connections: ConnectionLayout[];
} {
  const cols = spec.blocks.map((block) => block.col);
  const rows = spec.blocks.map((block) => block.row);
  const minCol = Math.min(...cols, 0);
  const minRow = Math.min(...rows, 0);
  const maxCol = Math.max(...cols, minCol);
  const maxRow = Math.max(...rows, minRow);

  const blocks = spec.blocks
    .map((block) => ({
      block,
      base: {
        x: BLOCK_MARGIN_X + (block.col - minCol) * BLOCK_COLUMN_SPACING,
        y: BLOCK_MARGIN_TOP + (block.row - minRow) * BLOCK_ROW_SPACING,
      },
      state: blockState(block.id, spec),
    }))
    .sort((a, b) => a.base.y - b.base.y || a.base.x - b.base.x);

  const byId = new Map(blocks.map((item) => [item.block.id, item]));
  const lifted = (point: Point) => ({ x: point.x, y: point.y - BLOCK_EDGE_LIFT });
  const connections = (spec.edges ?? []).flatMap((edge, index): ConnectionLayout[] => {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from || !to) return [];
    return [
      {
        id: `${edge.from}-${edge.to}-${index}`,
        geometry: getRagEdgeGeometry(lifted(from.base), lifted(to.base)),
        variant: edge.variant ?? "main",
        label: edge.label,
        flowing: spec.active !== undefined && edge.to === spec.active,
      },
    ];
  });

  return {
    width: BLOCK_MARGIN_X * 2 + (maxCol - minCol) * BLOCK_COLUMN_SPACING,
    height: BLOCK_MARGIN_TOP + (maxRow - minRow) * BLOCK_ROW_SPACING + BLOCK_MARGIN_BOTTOM,
    blocks,
    connections,
  };
}
