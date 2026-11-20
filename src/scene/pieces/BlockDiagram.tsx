import { useId, type CSSProperties } from "react";
import { GroundZone, SOFT_SHADOW } from "../../components/diagrams/DiagramNode";
import { DiagramPill } from "../../components/diagrams/DiagramPill";
import { IsoBlockArt } from "../../components/diagrams/IsoBlock";
import { ISO_BLOCK_PILL_OFFSET, isoBlockColor } from "../../components/diagrams/isoBlocks";
import { cn } from "../../lib/utils";
import { FADED_TEXT_OPACITY } from "../colors";
import type { BlockDiagramSpec, PieceProps } from "../types";
import { layoutBlockDiagram, type BlockLayout } from "./blockDiagramLayout";
import { ConnectionMarkers, PipelineConnection } from "./Pipeline";

/** Atraso entre a entrada de um bloco e a do próximo, para a cena se montar em sequência. */
const POP_IN_STAGGER_MS = 70;

interface BlockProps {
  item: BlockLayout;
  uid: string;
  order: number;
  isNew: boolean;
  animate: boolean;
}

function DiagramBlockShape({ item, uid, order, isNew, animate }: BlockProps) {
  const { block, base, state } = item;
  const isActive = state === "active";
  const filter = isActive ? `${SOFT_SHADOW} drop-shadow(0 0 12px ${isoBlockColor(block.kind)})` : SOFT_SHADOW;

  return (
    <g
      data-block={block.id}
      data-kind={block.kind}
      data-state={state}
      data-x={base.x}
      data-y={base.y}
      className={animate ? "scene-animate" : undefined}
      style={{ transform: `translate(${base.x}px, ${base.y}px)`, opacity: state === "upcoming" ? FADED_TEXT_OPACITY : 1 }}
    >
      <g
        className={cn(animate && isNew && "svg-anim-center animate-pop-in")}
        style={animate && isNew ? ({ animationDelay: `${order * POP_IN_STAGGER_MS}ms` } as CSSProperties) : undefined}
      >
        {isActive && <GroundZone x={0} y={0} />}
        <g className={cn(isActive && animate && "iso-float")}>
          <g className="rag-node-body" style={{ filter }}>
            <IsoBlockArt kind={block.kind} x={0} y={0} uid={`${uid}-${block.id}`} isActive={isActive} />
          </g>
          <DiagramPill x={0} y={-ISO_BLOCK_PILL_OFFSET[block.kind]} text={block.label} tone={isActive ? "success" : "neutral"} />
        </g>
      </g>
    </g>
  );
}

/** Blocos isométricos ligados por setas, com o bloco do passo em destaque (página 05 do FigCraft). */
export function BlockDiagram({ spec, transition }: PieceProps<BlockDiagramSpec>) {
  const uid = useId().replace(/:/g, "");
  const markerId = `block-diagram-arrow-${uid}`;
  const { width, height, blocks, connections } = layoutBlockDiagram(spec);
  const previousIds = new Set(transition.from?.blocks.map((block) => block.id) ?? []);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="block h-full max-h-full w-full">
      <ConnectionMarkers id={markerId} />
      {connections.map((connection) => (
        <PipelineConnection key={connection.id} connection={connection} markerId={markerId} animate={transition.animate} />
      ))}
      {blocks.map((item, order) => (
        <DiagramBlockShape
          key={item.block.id}
          item={item}
          uid={uid}
          order={order}
          isNew={!previousIds.has(item.block.id)}
          animate={transition.animate}
        />
      ))}
    </svg>
  );
}
