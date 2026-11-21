import { useId, useRef, type CSSProperties } from "react";
import { useParentWidth } from "../../hooks/useParentWidth";
import { useSvgTextScale } from "../../hooks/useSvgTextScale";
import { useI18n } from "../../i18n/useI18n";
import { GroundZone, SOFT_SHADOW } from "../../components/diagrams/DiagramNode";
import { DiagramPill } from "../../components/diagrams/DiagramPill";
import { IsoBlockArt } from "../../components/diagrams/IsoBlock";
import { ISO_BLOCK_PILL_OFFSET, isoBlockColor } from "../../components/diagrams/isoBlocks";
import { cn } from "../../lib/utils";
import { FADED_TEXT_OPACITY } from "../colors";
import { describeScene } from "../describe";
import { SceneScroll } from "../SceneScroll";
import { fitToFrame, isWideFrame } from "../textScale";
import type { BlockDiagramSpec, PieceProps } from "../types";
import { layoutBlockDiagram, type BlockLayout } from "./blockDiagramLayout";
import { ConnectionLabel, ConnectionMarkers, PipelineConnection } from "./Pipeline";

/**
 * Fonte máxima, em unidades: o dobro da referência. Os blocos não crescem com o texto; acima disso o
 * desenho ficaria pequeno demais na tela para o texto chegar a 12 px.
 */
const BLOCK_MAX_FONT = 24;
/** Teto no quadro largo, quando a peça não cabe com o teto normal: os blocos ficam com 3/4 do tamanho. */
const BLOCK_FIT_MAX_FONT = 32;

/** Atraso entre a entrada de um bloco e a do próximo, para a cena se montar em sequência. */
const POP_IN_STAGGER_MS = 70;

interface BlockProps {
  item: BlockLayout;
  uid: string;
  order: number;
  isNew: boolean;
  animate: boolean;
  pillFont: number;
}

function DiagramBlockShape({ item, uid, order, isNew, animate, pillFont }: BlockProps) {
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
          <DiagramPill x={0} y={-ISO_BLOCK_PILL_OFFSET[block.kind]} text={block.label} tone={isActive ? "success" : "neutral"} fontSize={pillFont} />
        </g>
      </g>
    </g>
  );
}

/** Blocos isométricos ligados por setas, com o bloco do passo em destaque (página 05 do FigCraft). */
export function BlockDiagram({ spec, transition }: PieceProps<BlockDiagramSpec>) {
  const uid = useId().replace(/:/g, "");
  const markerId = `block-diagram-arrow-${uid}`;
  const ref = useRef<SVGSVGElement>(null);
  const { t, locale } = useI18n();
  const sizeAt = (candidate: number) => layoutBlockDiagram(spec, candidate);
  // Num quadro estreito (375), o desenho mantém a largura do texto em 11 px e o quadro rola (LEG-01.4).
  // No quadro largo (1440), a peça cabe: os blocos encolhem um pouco, e o texto fica em 11 px.
  const frameWidth = useParentWidth(ref);
  const { maxFont, minWidth } = fitToFrame(sizeAt, BLOCK_MAX_FONT, frameWidth, BLOCK_FIT_MAX_FONT);
  // No quadro largo, a célula baixa (cena em coluna, 16-12#2) também pode encolher os blocos até o teto alto.
  const { font } = useSvgTextScale(ref, sizeAt, undefined, isWideFrame(frameWidth) ? BLOCK_FIT_MAX_FONT : maxFont);
  const { width, height, blocks, connections, pillFont } = layoutBlockDiagram(spec, font);
  const previousIds = new Set(transition.from?.blocks.map((block) => block.id) ?? []);

  return (
    <SceneScroll label={describeScene({ kind: "pieces", layout: "single", pieces: [spec] }, { t, locale })} className="h-full" contentWidth={minWidth}>
      <svg ref={ref} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="block h-full max-h-full w-full" style={{ minWidth }}>
        <ConnectionMarkers id={markerId} />
        {connections.map((connection) => (
          <PipelineConnection key={connection.id} connection={connection} markerId={markerId} animate={transition.animate} withLabel={false} />
        ))}
        {/* Os rótulos vêm depois de todas as linhas: nenhuma linha risca o texto de outra seta. */}
        {connections.map((connection) => (
          <ConnectionLabel key={connection.id} connection={connection} />
        ))}
        {blocks.map((item, order) => (
          <DiagramBlockShape
            key={item.block.id}
            item={item}
            uid={uid}
            order={order}
            isNew={!previousIds.has(item.block.id)}
            animate={transition.animate}
            pillFont={pillFont}
          />
        ))}
      </svg>
    </SceneScroll>
  );
}
