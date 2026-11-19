import {
  AppWindow,
  Binary,
  BrainCircuit,
  Database,
  FileText,
  Layers,
  MessageSquareText,
  SearchX,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { KeyboardEvent } from "react";
import { cn } from "../../lib/utils";
import { FADED_TEXT_OPACITY } from "../../scene/colors";
import { DiagramPill } from "./DiagramPill";
import {
  ISO_CELL,
  RAG_BLOCK_HALF_WIDTH,
  RAG_BLOCK_HEIGHT,
  RAG_CATEGORY_COLOR,
  RAG_CYLINDER_HEIGHT,
  RAG_CYLINDER_RADIUS_X,
  RAG_CYLINDER_RADIUS_Y,
  RAG_GROUND_ZONE_HALF_WIDTH,
  RAG_PLATFORM_HALF_WIDTH,
  RAG_PLATFORM_THICKNESS,
  getIsoDiamond,
  getRoundedPolygonPath,
  type DiagramNodeShape,
  type DiagramNodeState,
  type RagNodeDefinition,
  type RagNodeId,
} from "./ragDiagramLayout";

interface DiagramNodeProps {
  node: RagNodeDefinition;
  state: DiagramNodeState;
  /** Texto da pílula do nó ativo, por exemplo "passo 3". */
  stepLabel?: string;
  onSelect?: () => void;
}

const NODE_ICON: Record<RagNodeId, LucideIcon> = {
  user: Users,
  app: AppWindow,
  embedding: Binary,
  vectordb: Database,
  retrieval: Layers,
  context: FileText,
  llm: BrainCircuit,
  answer: MessageSquareText,
  fallback: SearchX,
};

// Regras da página "04 · Blocos do diagrama" (FigCraft).
// Sombra suave do design (0 9px 7px a 20%), na cor de sombra do tema para valer também no escuro.
export const SOFT_SHADOW = "drop-shadow(0 9px 7px color-mix(in srgb, var(--shadow-hard) 20%, transparent))";
const PERSON_COLORS = [
  "var(--diagram-purple)",
  "var(--diagram-blue)",
  "var(--diagram-orange)",
  "var(--diagram-green)",
  "var(--diagram-yellow)",
];
/** Nove pessoas nos vértices da grade sobre a laje de cima. */
const PERSON_POSITIONS = [
  { x: 0, y: -2 * ISO_CELL },
  { x: -2 * ISO_CELL, y: -ISO_CELL },
  { x: 2 * ISO_CELL, y: -ISO_CELL },
  { x: -4 * ISO_CELL, y: 0 },
  { x: 0, y: 0 },
  { x: 4 * ISO_CELL, y: 0 },
  { x: -2 * ISO_CELL, y: ISO_CELL },
  { x: 2 * ISO_CELL, y: ISO_CELL },
  { x: 0, y: 2 * ISO_CELL },
];
const BLOCK_CORNER_RADIUS = 14;
const UPCOMING_OPACITY = FADED_TEXT_OPACITY;

const LABEL_PILL_OFFSET: Record<DiagramNodeShape, number> = {
  block: 0,
  cylinder: RAG_CYLINDER_HEIGHT + RAG_CYLINDER_RADIUS_Y + 18,
  platform: RAG_PLATFORM_THICKNESS + RAG_PLATFORM_HALF_WIDTH / 2 + 32,
};

const ACTIVE_PILL_OFFSET: Record<DiagramNodeShape, number> = {
  block: RAG_BLOCK_HEIGHT + RAG_BLOCK_HALF_WIDTH / 2 + 22,
  cylinder: LABEL_PILL_OFFSET.cylinder + 28,
  platform: LABEL_PILL_OFFSET.platform + 28,
};

export function DiagramNode({ node, state, stepLabel, onSelect }: DiagramNodeProps) {
  const { x, y, label, shape } = node;
  const color = RAG_CATEGORY_COLOR[node.category];
  const isInteractive = onSelect !== undefined;
  const isActive = state === "active";

  function handleKeyDown(event: KeyboardEvent<SVGGElement>) {
    if (!onSelect) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect();
    }
  }

  return (
    <g
      className={cn("rag-node", isInteractive && "cursor-pointer")}
      role={isInteractive ? "button" : "img"}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={label}
      aria-current={isActive ? "step" : undefined}
      style={{ opacity: state === "upcoming" ? UPCOMING_OPACITY : 1 }}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
    >
      <title>{label}</title>
      {isActive && <GroundZone x={x} y={y} />}
      <g
        className="rag-node-body"
        style={{ filter: isActive ? `${SOFT_SHADOW} drop-shadow(0 0 12px ${color})` : SOFT_SHADOW }}
      >
        {shape === "platform" && <PlatformShape x={x} y={y} />}
        {shape === "cylinder" && <CylinderShape x={x} y={y} color={color} isActive={isActive} />}
        {shape === "block" && <BlockShape nodeId={node.id} x={x} y={y} color={color} isActive={isActive} />}
      </g>
      <NodeContent node={node} />
      {isActive && stepLabel !== undefined && (
        <g key={stepLabel} className="svg-anim-center animate-pop-in">
          <DiagramPill x={x} y={y - ACTIVE_PILL_OFFSET[shape]} text={stepLabel} icon={NODE_ICON[node.id]} tone="success" />
        </g>
      )}
    </g>
  );
}

interface ShapeProps {
  x: number;
  y: number;
}

interface ColoredShapeProps extends ShapeProps {
  color: string;
  isActive: boolean;
}

/** Zona verde no chão do bloco ativo: 180 × 90. */
export function GroundZone({ x, y }: ShapeProps) {
  const path = getRoundedPolygonPath(getIsoDiamond({ x, y }, RAG_GROUND_ZONE_HALF_WIDTH), 10);

  return (
    <path
      d={path}
      strokeWidth={2.5}
      className="svg-anim-center animate-zone-in"
      style={{
        fill: "color-mix(in srgb, var(--diagram-green) 22%, transparent)",
        stroke: "var(--diagram-green)",
      }}
    />
  );
}

/**
 * Bloco isométrico com base 120 × 60 e 54 px de altura; `(x, y)` é o centro da base.
 * Também usado pela peça ClientServer. `nodeId` precisa ser único no documento (id do clipPath).
 */
export function BlockShape({ nodeId, x, y, color, isActive }: ColoredShapeProps & { nodeId: string }) {
  const halfWidth = RAG_BLOCK_HALF_WIDTH;
  const height = RAG_BLOCK_HEIGHT;
  const quarter = halfWidth / 2;
  const clipId = `rag-block-clip-${nodeId}`;
  const outline = getRoundedPolygonPath(
    [
      { x, y: y - quarter - height },
      { x: x + halfWidth, y: y - height },
      { x: x + halfWidth, y },
      { x, y: y + quarter },
      { x: x - halfWidth, y },
      { x: x - halfWidth, y: y - height },
    ],
    BLOCK_CORNER_RADIUS,
  );
  const topFace = `M ${x - halfWidth} ${y - height} L ${x} ${y - quarter - height} L ${x + halfWidth} ${y - height} L ${x} ${y + quarter - height} Z`;
  const rightFace = `M ${x} ${y + quarter - height} L ${x + halfWidth} ${y - height} L ${x + halfWidth} ${y} L ${x} ${y + quarter} Z`;

  return (
    <g>
      <clipPath id={clipId}>
        <path d={outline} />
      </clipPath>
      <path d={outline} style={{ fill: `color-mix(in srgb, ${color} 62%, var(--surface-raised))` }} />
      <g clipPath={`url(#${clipId})`}>
        <path d={topFace} style={{ fill: "var(--surface-raised)", opacity: 0.42 }} />
        <path d={rightFace} style={{ fill: color, opacity: 0.45 }} />
      </g>
      <path
        d={outline}
        fill="none"
        className="rag-node-outline stroke-ink"
        strokeLinejoin="round"
        strokeWidth={isActive ? 2.8 : 2}
      />
    </g>
  );
}

/** Cilindro: elipse 96 × 48 no chão, corpo de 68 px, topo com 30% da cor e corpo com 62%. */
function CylinderShape({ x, y, color, isActive }: ColoredShapeProps) {
  const radiusX = RAG_CYLINDER_RADIUS_X;
  const radiusY = RAG_CYLINDER_RADIUS_Y;
  const top = y - RAG_CYLINDER_HEIGHT;
  const body = `M ${x - radiusX} ${top} L ${x - radiusX} ${y} A ${radiusX} ${radiusY} 0 0 0 ${x + radiusX} ${y} L ${x + radiusX} ${top} Z`;
  const strokeWidth = isActive ? 2.8 : 2;

  return (
    <g>
      <path
        d={body}
        className="rag-node-outline stroke-ink"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
        style={{ fill: `color-mix(in srgb, ${color} 62%, var(--surface-raised))` }}
      />
      <ellipse
        cx={x}
        cy={top}
        rx={radiusX}
        ry={radiusY}
        className="rag-node-outline stroke-ink"
        strokeWidth={strokeWidth}
        style={{ fill: `color-mix(in srgb, ${color} 30%, var(--surface-raised))` }}
      />
    </g>
  );
}

/**
 * Plataforma: duas lajes 180 × 90 deslocadas 14 px, com nove pessoas nos vértices da grade.
 * `(x, y)` é o centro da laje de baixo. Também usada pela peça ClientServer para os clientes.
 */
export function PlatformShape({ x, y }: ShapeProps) {
  const topCenter = y - RAG_PLATFORM_THICKNESS;
  const createSlab = (centerY: number) =>
    getRoundedPolygonPath(getIsoDiamond({ x, y: centerY }, RAG_PLATFORM_HALF_WIDTH), 14);

  return (
    <g>
      <path d={createSlab(y)} className="fill-sunken stroke-ink" strokeWidth={2} />
      <path d={createSlab(topCenter)} className="fill-surface stroke-ink" strokeWidth={2} />
      {PERSON_POSITIONS.map((position, index) => (
        <g key={`${position.x}-${position.y}`}>
          <rect
            x={x + position.x - 7}
            y={topCenter + position.y - 24}
            width={14}
            height={24}
            rx={7}
            className="stroke-ink"
            strokeWidth={1.6}
            style={{ fill: PERSON_COLORS[index % PERSON_COLORS.length] }}
          />
          <circle
            cx={x + position.x}
            cy={topCenter + position.y - 29}
            r={6}
            className="fill-surface stroke-ink"
            strokeWidth={1.6}
          />
        </g>
      ))}
    </g>
  );
}

function NodeContent({ node }: { node: RagNodeDefinition }) {
  const { x, y, label, shape } = node;
  const Icon = NODE_ICON[node.id];

  if (shape === "platform") {
    return <DiagramPill x={x} y={y - LABEL_PILL_OFFSET.platform} text={label.toLowerCase()} icon={Icon} />;
  }

  if (shape === "cylinder") {
    const bodyCenter = y - RAG_CYLINDER_HEIGHT / 2;

    return (
      <g>
        <Icon x={x - 12} y={bodyCenter - 6} width={24} height={24} strokeWidth={2} className="text-ink" aria-hidden="true" />
        <DiagramPill x={x} y={y - LABEL_PILL_OFFSET.cylinder} text={label.toLowerCase()} />
      </g>
    );
  }

  const center = y - RAG_BLOCK_HEIGHT / 2;

  return (
    <g>
      <Icon x={x - 12} y={center - 30} width={24} height={24} strokeWidth={2} className="text-ink" aria-hidden="true" />
      <text
        x={x}
        y={center + 14}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-ink font-mono text-[13px] font-bold"
      >
        {label}
      </text>
    </g>
  );
}
