import type { LocaleTag } from "../i18n/locales";
import type { Translate } from "../i18n/runtime";
import { customScenes } from "./custom";
import type { PieceSpec, SceneSpec } from "./types";

interface DescribeOptions {
  t: Translate;
  locale: LocaleTag;
}

function describePiece(piece: PieceSpec, { t, locale }: DescribeOptions): string {
  const list = (items: string[]) => new Intl.ListFormat(locale, { type: "conjunction" }).format(items);
  const withHighlight = (description: string, item: string | undefined) =>
    item === undefined || item === "" ? description : t("scene.highlight", { description, item });

  switch (piece.piece) {
    case "token-stream":
      return withHighlight(
        t("scene.piece.token-stream", { items: list(piece.tokens) }),
        piece.query === undefined ? undefined : piece.tokens[piece.query],
      );
    case "matrix":
      return withHighlight(
        t("scene.piece.matrix", { rows: piece.rows.length, cols: piece.cols.length }),
        piece.highlight && `${piece.rows[piece.highlight.row]} × ${piece.cols[piece.highlight.col]}`,
      );
    case "vector-space":
      return withHighlight(
        t("scene.piece.vector-space", { items: list(piece.points.map((point) => point.label)) }),
        piece.points.find((point) => point.id === piece.query)?.label,
      );
    case "graph": {
      const highlighted = piece.nodes.filter((node) => piece.highlight?.includes(node.id)).map((node) => node.label);
      return withHighlight(
        t("scene.piece.graph", { items: list(piece.nodes.map((node) => node.label)) }),
        highlighted.length > 0 ? list(highlighted) : undefined,
      );
    }
    case "pipeline":
      return withHighlight(
        t("scene.piece.pipeline", { items: list(piece.stages.map((stage) => stage.label)) }),
        [...piece.stages, ...(piece.branch ? [piece.branch] : [])].find((stage) => stage.id === piece.active)?.label,
      );
    case "agent-loop":
      return withHighlight(
        t("scene.piece.agent-loop", { items: list(piece.phases.map((phase) => phase.label)) }),
        piece.phases.find((phase) => phase.id === piece.active)?.label,
      );
    case "client-server":
      return withHighlight(
        t("scene.piece.client-server", { items: list(piece.nodes.map((node) => node.label)) }),
        piece.active === undefined ? undefined : piece.messages[piece.active]?.label,
      );
    case "chart":
      return withHighlight(
        t("scene.piece.chart", { items: list(piece.series.map((point) => point.label)) }),
        piece.highlight === undefined ? undefined : piece.series[piece.highlight]?.label,
      );
    case "metrics-panel":
      return withHighlight(
        t("scene.piece.metrics-panel", { items: list(piece.metrics.map((metric) => `${metric.label} ${metric.value}`)) }),
        piece.metrics.find((metric) => metric.id === piece.highlight)?.label,
      );
    case "block-diagram":
      return withHighlight(
        t("scene.piece.block-diagram", { items: list(piece.blocks.map((block) => block.label)) }),
        piece.blocks.find((block) => block.id === piece.active)?.label,
      );
  }
}

/** Texto do `aria-label` da cena (SCN-01.7), montado a partir dos dados do passo. */
export function describeScene(spec: SceneSpec, options: DescribeOptions): string {
  if (spec.kind === "custom") return customScenes[spec.id].description;
  return spec.pieces.map((piece) => describePiece(piece, options)).join("; ");
}
