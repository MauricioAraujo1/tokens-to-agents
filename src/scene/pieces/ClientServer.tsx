import { useId } from "react";
import { BlockShape, PlatformShape } from "../../components/diagrams/DiagramNode";
import { DiagramPill } from "../../components/diagrams/DiagramPill";
import { RAG_BLOCK_HEIGHT, type Point } from "../../components/diagrams/ragDiagramLayout";
import { sceneColor } from "../colors";
import type { ClientServerNode, ClientServerSpec, PieceProps, SceneColor } from "../types";
import { ConnectionMarkers, PipelineConnection } from "./Pipeline";
import type { ConnectionLayout } from "./pipelineLayout";

const COLUMN_SPACING = 300;
const ROW_SPACING = 180;
/** Cada coluna desce um pouco em relação à anterior, como na vista isométrica do diagrama RAG. */
const ISO_SHIFT = 40;
const MARGIN_X = 130;
const MARGIN_TOP = 110;
const MARGIN_BOTTOM = 120;
/** Distância entre o centro do nó e a ponta da seta: a plataforma do cliente é mais larga. */
const CLEARANCE: Record<ClientServerNode["role"], number> = {
  client: 112,
  queue: 80,
  server: 80,
  database: 80,
  cache: 80,
  model: 80,
};
const COLUMN: Record<ClientServerNode["role"], number> = {
  client: 0,
  queue: 1,
  server: 2,
  cache: 3,
  database: 3,
  model: 3,
};
const ROLE_COLOR: Record<Exclude<ClientServerNode["role"], "client" | "queue">, SceneColor> = {
  server: "module-04",
  database: "info",
  cache: "brand",
  model: "module-05",
};

const QUEUE_WIDTH = 132;
const QUEUE_HEIGHT = 34;
const QUEUE_ITEM_WIDTH = 12;
const QUEUE_ITEM_GAP = 4;
const QUEUE_PADDING = 6;
/** Quantos itens cabem na bandeja da fila; acima disso, só o número mostra o tamanho real. */
const QUEUE_SLOTS = Math.floor((QUEUE_WIDTH - 2 * QUEUE_PADDING + QUEUE_ITEM_GAP) / (QUEUE_ITEM_WIDTH + QUEUE_ITEM_GAP));
const BAR_WIDTH = 120;
const BAR_HEIGHT = 8;
const SHAPE_BASE_DROP = RAG_BLOCK_HEIGHT / 2;
const SHADOW_OFFSET = 2.5;

interface PlacedNode {
  node: ClientServerNode;
  center: Point;
}

/** Colunas por papel (só as usadas, em sequência) e linhas dentro de cada coluna. */
function layoutNodes(nodes: ClientServerNode[]): PlacedNode[] {
  const columns = [...new Set(nodes.map((node) => COLUMN[node.role]))].sort((a, b) => a - b);
  const rows = new Map<number, number>();
  return nodes.map((node) => {
    const column = columns.indexOf(COLUMN[node.role]);
    const row = rows.get(column) ?? 0;
    rows.set(column, row + 1);
    return {
      node,
      center: { x: MARGIN_X + column * COLUMN_SPACING, y: MARGIN_TOP + row * ROW_SPACING + column * ISO_SHIFT },
    };
  });
}

function connectionBetween(from: PlacedNode, to: PlacedNode, id: string, label: string, flowing: boolean): ConnectionLayout {
  const dx = to.center.x - from.center.x;
  const dy = to.center.y - from.center.y;
  const distance = Math.hypot(dx, dy) || 1;
  const unit = { x: dx / distance, y: dy / distance };
  const startClear = Math.min(CLEARANCE[from.node.role], distance / 2);
  const endClear = Math.min(CLEARANCE[to.node.role], distance / 2);
  return {
    id,
    variant: "main",
    label,
    flowing,
    geometry: {
      start: { x: from.center.x + unit.x * startClear, y: from.center.y + unit.y * startClear },
      end: { x: to.center.x - unit.x * endClear, y: to.center.y - unit.y * endClear },
      labelPoint: { x: (from.center.x + to.center.x) / 2, y: (from.center.y + to.center.y) / 2 },
    },
  };
}

function QueueTray({ center, size }: { center: Point; size: number }) {
  const left = center.x - QUEUE_WIDTH / 2;
  const top = center.y - QUEUE_HEIGHT / 2;
  const drawn = Math.min(size, QUEUE_SLOTS);

  return (
    <g>
      <rect
        x={left + SHADOW_OFFSET}
        y={top + SHADOW_OFFSET}
        width={QUEUE_WIDTH}
        height={QUEUE_HEIGHT}
        rx={8}
        style={{ fill: "var(--shadow-hard)" }}
      />
      <rect
        x={left}
        y={top}
        width={QUEUE_WIDTH}
        height={QUEUE_HEIGHT}
        rx={8}
        strokeWidth={2}
        style={{ fill: "var(--surface-sunken)", stroke: "var(--line-strong)" }}
      />
      {Array.from({ length: drawn }, (_, index) => (
        <rect
          key={index}
          data-queue-item={index}
          x={left + QUEUE_PADDING + index * (QUEUE_ITEM_WIDTH + QUEUE_ITEM_GAP)}
          y={top + QUEUE_PADDING}
          width={QUEUE_ITEM_WIDTH}
          height={QUEUE_HEIGHT - 2 * QUEUE_PADDING}
          rx={3}
          strokeWidth={1.2}
          style={{ fill: sceneColor("brand"), stroke: "var(--line-strong)" }}
        />
      ))}
      <text
        data-queue-count={size}
        x={center.x}
        y={top + QUEUE_HEIGHT + 16}
        textAnchor="middle"
        dominantBaseline="central"
        className="font-mono text-[12px] font-bold"
        style={{ fill: "var(--ink-primary)" }}
      >
        {size}
      </text>
    </g>
  );
}

function UtilizationBar({ center, value, animate }: { center: Point; value: number; animate: boolean }) {
  const clamped = Math.min(Math.max(value, 0), 1);
  const left = center.x - BAR_WIDTH / 2;
  const top = center.y + 74;

  return (
    <g data-utilization={value}>
      <rect
        data-track="true"
        x={left}
        y={top}
        width={BAR_WIDTH}
        height={BAR_HEIGHT}
        rx={BAR_HEIGHT / 2}
        strokeWidth={1.2}
        style={{ fill: "var(--surface-sunken)", stroke: "var(--line-strong)" }}
      />
      <rect
        data-fill="true"
        x={left}
        y={top}
        width={clamped * BAR_WIDTH}
        height={BAR_HEIGHT}
        rx={BAR_HEIGHT / 2}
        className={animate ? "scene-animate" : undefined}
        style={{ fill: sceneColor("brand") }}
      />
      <text
        x={center.x}
        y={top + BAR_HEIGHT + 14}
        textAnchor="middle"
        dominantBaseline="central"
        className="font-mono text-[11px] font-semibold"
        style={{ fill: "var(--ink-primary)" }}
      >
        {`${Math.round(clamped * 100)}%`}
      </text>
    </g>
  );
}

/** Clientes, filas e servidores isométricos, com requisições em trânsito e utilização (SCN-01.2). */
export function ClientServer({ spec, transition }: PieceProps<ClientServerSpec>) {
  const uid = useId().replace(/:/g, "");
  const markerId = `client-server-arrow-${uid}`;
  const placed = layoutNodes(spec.nodes);
  const byId = new Map(placed.map((item) => [item.node.id, item]));
  const connections = spec.messages.flatMap((message, index) => {
    const from = byId.get(message.from);
    const to = byId.get(message.to);
    if (!from || !to) return [];
    return [connectionBetween(from, to, `${message.from}-${message.to}-${index}`, message.label, index === spec.active)];
  });
  const width = MARGIN_X * 2 + Math.max(...placed.map((item) => item.center.x - MARGIN_X), 0);
  const height = Math.max(...placed.map((item) => item.center.y), MARGIN_TOP) + MARGIN_BOTTOM;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="block h-full max-h-full w-full">
      <ConnectionMarkers id={markerId} />
      {placed.map(({ node, center }) => (
        <g
          key={node.id}
          data-node={node.id}
          data-role={node.role}
          data-x={center.x}
          data-y={center.y}
          data-queue-size={node.role === "queue" ? (node.size ?? 0) : undefined}
        >
          {/* As formas do RAG apoiam a base em (x, y); a base desce meia altura para centrar o volume no nó. */}
          {node.role === "client" && <PlatformShape x={center.x} y={center.y + SHAPE_BASE_DROP} />}
          {node.role === "queue" && <QueueTray center={center} size={node.size ?? 0} />}
          {node.role !== "client" && node.role !== "queue" && (
            <BlockShape
              nodeId={`${uid}-${node.id}`}
              x={center.x}
              y={center.y + SHAPE_BASE_DROP}
              color={sceneColor(ROLE_COLOR[node.role])}
              isActive={false}
            />
          )}
          <DiagramPill x={center.x} y={center.y - 80} text={node.label} />
          {node.utilization !== undefined && <UtilizationBar center={center} value={node.utilization} animate={transition.animate} />}
        </g>
      ))}
      {connections.map((connection) => (
        <PipelineConnection key={connection.id} connection={connection} markerId={markerId} animate={transition.animate} />
      ))}
    </svg>
  );
}
