import { useId, useRef } from "react";
import { BlockShape, PlatformShape } from "../../components/diagrams/DiagramNode";
import { DiagramPill } from "../../components/diagrams/DiagramPill";
import { RAG_BLOCK_HEIGHT, type Point } from "../../components/diagrams/ragDiagramLayout";
import { useParentWidth } from "../../hooks/useParentWidth";
import { useSvgTextScale } from "../../hooks/useSvgTextScale";
import { useI18n } from "../../i18n/useI18n";
import { sceneColor } from "../colors";
import { describeScene } from "../describe";
import { SceneScroll } from "../SceneScroll";
import { fitToFrame, isWideFrame } from "../textScale";
import type { ClientServerNode, ClientServerSpec, PieceProps, SceneColor } from "../types";
import {
  layoutClientServer,
  NODE_PILL_OFFSET,
  UTILIZATION_BAR_HEIGHT as BAR_HEIGHT,
  UTILIZATION_BAR_WIDTH as BAR_WIDTH,
  UTILIZATION_LABEL_GAP,
  UTILIZATION_TOP,
} from "./clientServerLayout";
import { ConnectionLine, ConnectionMarkers, PipelineConnection } from "./Pipeline";

/** Fonte máxima, em unidades: as formas dos nós não crescem com o texto (como os blocos, T5). */
const CLIENT_SERVER_MAX_FONT = 24;
/** Teto no quadro largo, quando a peça não cabe com o teto normal: as formas ficam com 3/4 do tamanho. */
const CLIENT_SERVER_FIT_MAX_FONT = 32;

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
const SHAPE_BASE_DROP = RAG_BLOCK_HEIGHT / 2;
const SHADOW_OFFSET = 2.5;

function QueueTray({ center, size, font }: { center: Point; size: number; font: number }) {
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
        y={top + QUEUE_HEIGHT + 4 + font}
        textAnchor="middle"
        dominantBaseline="central"
        className="font-mono font-bold"
        style={{ fontSize: font, fill: "var(--ink-primary)" }}
      >
        {size}
      </text>
    </g>
  );
}

function UtilizationBar({ center, value, animate, font }: { center: Point; value: number; animate: boolean; font: number }) {
  const clamped = Math.min(Math.max(value, 0), 1);
  const left = center.x - BAR_WIDTH / 2;
  const top = center.y + UTILIZATION_TOP;

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
        y={top + BAR_HEIGHT + UTILIZATION_LABEL_GAP + font}
        textAnchor="middle"
        dominantBaseline="central"
        className="font-mono font-semibold"
        style={{ fontSize: font, fill: "var(--ink-primary)" }}
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
  const ref = useRef<SVGSVGElement>(null);
  const { t, locale } = useI18n();
  const sizeAt = (candidate: number) => layoutClientServer(spec, candidate);
  // Num quadro estreito (375), o desenho mantém a largura do texto em 11 px e o quadro rola (LEG-01.4).
  // No quadro largo (1440), a peça cabe: as formas encolhem um pouco, e o texto fica em 11 px.
  const frameWidth = useParentWidth(ref);
  const { maxFont, minWidth } = fitToFrame(sizeAt, CLIENT_SERVER_MAX_FONT, frameWidth, CLIENT_SERVER_FIT_MAX_FONT);
  // No quadro largo, a célula baixa também pode encolher as formas até o teto alto.
  const { font } = useSvgTextScale(ref, sizeAt, undefined, isWideFrame(frameWidth) ? CLIENT_SERVER_FIT_MAX_FONT : maxFont);
  const { width, height, placed, connections, pillFont } = layoutClientServer(spec, font);

  return (
    <SceneScroll label={describeScene({ kind: "pieces", layout: "single", pieces: [spec] }, { t, locale })} className="h-full" contentWidth={minWidth}>
      <svg ref={ref} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="block h-full max-h-full w-full" style={{ minWidth }}>
        <ConnectionMarkers id={markerId} />
        {/* As linhas ficam abaixo dos nós: nenhuma passa por cima do rótulo de um nó (T22). */}
        {connections.map((connection) => (
          <ConnectionLine key={connection.id} connection={connection} markerId={markerId} />
        ))}
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
            {node.role === "queue" && <QueueTray center={center} size={node.size ?? 0} font={font} />}
            {node.role !== "client" && node.role !== "queue" && (
              <BlockShape
                nodeId={`${uid}-${node.id}`}
                x={center.x}
                y={center.y + SHAPE_BASE_DROP}
                color={sceneColor(ROLE_COLOR[node.role])}
                isActive={false}
              />
            )}
            <DiagramPill x={center.x} y={center.y - NODE_PILL_OFFSET} text={node.label} fontSize={pillFont} />
            {node.utilization !== undefined && (
              <UtilizationBar center={center} value={node.utilization} animate={transition.animate} font={pillFont} />
            )}
          </g>
        ))}
        {connections.map((connection) => (
          // Por cima de tudo, só os pontos que andam e o rótulo de cada mensagem.
          <PipelineConnection key={connection.id} connection={connection} markerId={markerId} animate={transition.animate} withLine={false} />
        ))}
      </svg>
    </SceneScroll>
  );
}
