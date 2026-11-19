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
import { DiagramPill } from "./DiagramPill";
import {
  RAG_BLOCK_HALF_HEIGHT,
  RAG_BLOCK_HALF_WIDTH,
  RAG_CATEGORY_COLOR,
  getRoundedPolygonPath,
  type DiagramNodeState,
  type RagNodeDefinition,
  type RagNodeId,
} from "./ragDiagramLayout";

interface DiagramNodeProps {
  node: RagNodeDefinition;
  state: DiagramNodeState;
  activeStepNumber?: number;
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

const SOFT_SHADOW = "drop-shadow(0 9px 7px rgb(41 40 32 / 0.2))";
const PERSON_COLORS = ["var(--diagram-purple)", "var(--diagram-blue)", "var(--diagram-orange)", "var(--diagram-green)", "var(--diagram-yellow)"];
const PERSON_POSITIONS = [
  { x: 0, y: -26 },
  { x: -30, y: -11 },
  { x: 30, y: -11 },
  { x: -60, y: 4 },
  { x: 0, y: 4 },
  { x: 60, y: 4 },
  { x: -30, y: 19 },
  { x: 30, y: 19 },
  { x: 0, y: 34 },
];

export function DiagramNode({ node, state, activeStepNumber, onSelect }: DiagramNodeProps) {
  const { x, y, label, shape } = node;
  const color = RAG_CATEGORY_COLOR[node.category];
  const isInteractive = onSelect !== undefined;
  const isActive = state === "active";
  const pillY = shape === "cylinder" ? y - 100 : y - RAG_BLOCK_HALF_HEIGHT - 24;

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
      opacity={state === "upcoming" ? 0.55 : 1}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
    >
      <title>{label}</title>
      {isActive && <GroundZone x={x} y={y} />}
      <g style={{ filter: isActive ? `${SOFT_SHADOW} drop-shadow(0 0 12px ${color})` : SOFT_SHADOW }}>
        {shape === "platform" && <PlatformShape x={x} y={y} />}
        {shape === "cylinder" && <CylinderShape x={x} y={y} color={color} isActive={isActive} />}
        {shape === "block" && <BlockShape nodeId={node.id} x={x} y={y} color={color} isActive={isActive} />}
      </g>
      <NodeContent node={node} />
      {isActive && activeStepNumber !== undefined && (
        <DiagramPill x={x} y={pillY} text={`passo ${activeStepNumber}`} icon={NODE_ICON[node.id]} tone="success" />
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

function GroundZone({ x, y }: ShapeProps) {
  const path = getRoundedPolygonPath(
    [
      { x, y: y - 28 },
      { x: x + 132, y: y + 38 },
      { x, y: y + 104 },
      { x: x - 132, y: y + 38 },
    ],
    10,
  );

  return (
    <path
      d={path}
      strokeWidth={2.5}
      style={{ fill: "color-mix(in srgb, var(--diagram-green) 22%, transparent)", stroke: "var(--diagram-green)" }}
    />
  );
}

function BlockShape({ nodeId, x, y, color, isActive }: ColoredShapeProps & { nodeId: RagNodeId }) {
  const halfWidth = RAG_BLOCK_HALF_WIDTH;
  const halfHeight = RAG_BLOCK_HALF_HEIGHT;
  const clipId = `rag-block-clip-${nodeId}`;
  const outline = getRoundedPolygonPath(
    [
      { x, y: y - halfHeight },
      { x: x + halfWidth, y: y - halfHeight / 2 },
      { x: x + halfWidth, y: y + halfHeight / 2 },
      { x, y: y + halfHeight },
      { x: x - halfWidth, y: y + halfHeight / 2 },
      { x: x - halfWidth, y: y - halfHeight / 2 },
    ],
    16,
  );
  const topFace = `M ${x - halfWidth} ${y - halfHeight / 2} L ${x} ${y - halfHeight} L ${x + halfWidth} ${y - halfHeight / 2} L ${x} ${y} Z`;
  const rightFace = `M ${x} ${y} L ${x + halfWidth} ${y - halfHeight / 2} L ${x + halfWidth} ${y + halfHeight / 2} L ${x} ${y + halfHeight} Z`;

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
      <path d={outline} fill="none" className="stroke-ink" strokeWidth={isActive ? 2.8 : 2} strokeLinejoin="round" />
    </g>
  );
}

function CylinderShape({ x, y, color, isActive }: ColoredShapeProps) {
  const radiusX = 52;
  const radiusY = 20;
  const top = y - 34;
  const bottom = y + 34;
  const body = `M ${x - radiusX} ${top} L ${x - radiusX} ${bottom} A ${radiusX} ${radiusY} 0 0 0 ${x + radiusX} ${bottom} L ${x + radiusX} ${top} Z`;
  const strokeWidth = isActive ? 2.8 : 2;

  return (
    <g>
      <path d={body} className="stroke-ink" strokeWidth={strokeWidth} strokeLinejoin="round" style={{ fill: `color-mix(in srgb, ${color} 62%, var(--surface-raised))` }} />
      <ellipse cx={x} cy={top} rx={radiusX} ry={radiusY} className="stroke-ink" strokeWidth={strokeWidth} style={{ fill: `color-mix(in srgb, ${color} 30%, var(--surface-raised))` }} />
    </g>
  );
}

function PlatformShape({ x, y }: ShapeProps) {
  const createSlab = (offsetY: number) =>
    getRoundedPolygonPath(
      [
        { x, y: y - 52 + offsetY },
        { x: x + 104, y: y + offsetY },
        { x, y: y + 52 + offsetY },
        { x: x - 104, y: y + offsetY },
      ],
      14,
    );

  return (
    <g>
      <path d={createSlab(14)} className="fill-sunken stroke-ink" strokeWidth={2} />
      <path d={createSlab(0)} className="fill-surface stroke-ink" strokeWidth={2} />
      {PERSON_POSITIONS.map((position, index) => (
        <g key={`${position.x}-${position.y}`}>
          <rect
            x={x + position.x - 7}
            y={y + position.y - 20}
            width={14}
            height={24}
            rx={7}
            className="stroke-ink"
            strokeWidth={1.6}
            style={{ fill: PERSON_COLORS[index % PERSON_COLORS.length] }}
          />
          <circle cx={x + position.x} cy={y + position.y - 25} r={6} className="fill-surface stroke-ink" strokeWidth={1.6} />
        </g>
      ))}
    </g>
  );
}

function NodeContent({ node }: { node: RagNodeDefinition }) {
  const { x, y, label, shape } = node;
  const Icon = NODE_ICON[node.id];

  if (shape === "platform") {
    return <DiagramPill x={x} y={y - 76} text={label.toLowerCase()} icon={Icon} />;
  }

  if (shape === "cylinder") {
    return (
      <g>
        <Icon x={x - 12} y={y - 4} width={24} height={24} strokeWidth={2} className="text-ink" aria-hidden="true" />
        <DiagramPill x={x} y={y - 72} text={label.toLowerCase()} />
      </g>
    );
  }

  return (
    <g>
      <Icon x={x - 12} y={y - 30} width={24} height={24} strokeWidth={2} className="text-ink" aria-hidden="true" />
      <text x={x} y={y + 14} textAnchor="middle" dominantBaseline="central" className="fill-ink font-mono text-[13px] font-bold">
        {label}
      </text>
    </g>
  );
}
