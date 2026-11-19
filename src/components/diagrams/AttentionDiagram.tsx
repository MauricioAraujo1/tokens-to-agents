import { cn } from "../../lib/utils";
import type { AttentionView } from "../../types/course";
import {
  ATTENTION_BARS_CAPTION,
  ATTENTION_BAR_BASELINE,
  ATTENTION_BAR_MAX_HEIGHT,
  ATTENTION_BAR_WIDTH,
  ATTENTION_FORMULA,
  ATTENTION_QUERY_INDEX,
  ATTENTION_TOKENS,
  ATTENTION_TOKEN_HEIGHT,
  ATTENTION_TOKEN_TOP,
  ATTENTION_VALUE_VIEWS,
  ATTENTION_VIEWBOX,
  findTopKeyIndex,
  formatAttentionValue,
  getArcOpacity,
  getArcStrokeWidth,
  getAttentionArc,
  getAttentionValues,
  getEmbeddingPreview,
  isMaskedToken,
  layoutAttentionTokens,
  type PositionedAttentionToken,
} from "./attentionDiagramLayout";

interface AttentionDiagramProps {
  view: AttentionView;
}

type TokenRole = "default" | "query" | "top-key";

const TOKEN_FILL_CLASS: Record<TokenRole, string> = {
  default: "fill-surface",
  query: "fill-brand",
  "top-key": "fill-info-soft",
};

const FORMULA_CHAR_WIDTH = 7.8;
const FORMULA_PADDING = 28;
const FORMULA_HEIGHT = 34;
const FORMULA_CENTER_Y = 26;
const SCORE_PILL_WIDTH = 34;
const SCORE_PILL_HEIGHT = 19;
const LABEL_OFFSET_Y = 16;
const BARS_CAPTION_Y = 392;
const ARC_STAGGER_MS = 45;
const PILL_DELAY_MS = 260;
const MIN_BAR_RATIO = 0.025;
const MASKED_OPACITY = 0.3;
const VECTOR_CELL_WIDTH = 6;
const VECTOR_CELL_GAP = 2;
const VECTOR_MAX_HEIGHT = 26;
const VECTOR_OFFSET_Y = 14;
const VECTOR_COLORS = ["var(--module-03)", "var(--module-04)", "var(--module-02)", "var(--module-05)"];

const positionedTokens = layoutAttentionTokens(ATTENTION_TOKENS);
const queryToken = positionedTokens[ATTENTION_QUERY_INDEX];

export function AttentionDiagram({ view }: AttentionDiagramProps) {
  const values = getAttentionValues(ATTENTION_TOKENS, view);
  const maxValue = Math.max(...values);
  const showsQuery = view !== "tokens" && view !== "vectors";
  const showsValues = ATTENTION_VALUE_VIEWS.has(view);
  const topKeyIndex = showsValues ? findTopKeyIndex(values, ATTENTION_QUERY_INDEX) : -1;
  const formula = ATTENTION_FORMULA[view];
  const barsCaption = ATTENTION_BARS_CAPTION[view];

  function getRole(token: PositionedAttentionToken): TokenRole {
    if (showsQuery && token.index === ATTENTION_QUERY_INDEX) {
      return "query";
    }

    return token.index === topKeyIndex ? "top-key" : "default";
  }

  return (
    <figure className="flex min-h-0 flex-1 flex-col">
      <div className="relative min-h-[300px] flex-1">
        <div className="no-scrollbar absolute inset-0 overflow-x-auto">
          <svg
            viewBox={`0 0 ${ATTENTION_VIEWBOX.width} ${ATTENTION_VIEWBOX.height}`}
            role="img"
            aria-labelledby="attention-diagram-title"
            aria-describedby="attention-diagram-description"
            className="mx-auto block h-full w-full min-w-[560px]"
          >
            <title id="attention-diagram-title">Atenção do token “ele” sobre a frase</title>
            <desc id="attention-diagram-description">
              A frase “O gato subiu no muro porque ele estava com medo” aparece como uma fila de tokens. Arcos ligam o
              token “ele” a cada outro token, mais grossos quanto maior a pontuação; “gato” recebe a maior.
            </desc>

            {formula && (
              <g key={formula} className="svg-anim-center animate-pop-in">
                <FormulaPill text={formula} />
              </g>
            )}

            {showsValues &&
              positionedTokens
                .filter((token) => token.index !== ATTENTION_QUERY_INDEX)
                .map((token) => {
                  const arc = getAttentionArc(token.centerX, queryToken.centerX);
                  const isTopKey = token.index === topKeyIndex;

                  return (
                    <path
                      key={`arc-${token.text}-${token.index}`}
                      d={arc.path}
                      fill="none"
                      pathLength={1}
                      strokeLinecap="round"
                      className={cn(
                        "animate-draw transition-[stroke,stroke-width,opacity] duration-500",
                        isTopKey ? "stroke-info" : "stroke-muted",
                      )}
                      style={{
                        strokeDasharray: 1,
                        strokeDashoffset: 0,
                        strokeWidth: getArcStrokeWidth(values[token.index], maxValue),
                        opacity: isMaskedToken(token.index, view)
                          ? 0
                          : isTopKey
                            ? 1
                            : getArcOpacity(values[token.index], maxValue),
                        animationDelay: `${token.index * ARC_STAGGER_MS}ms`,
                      }}
                    />
                  );
                })}

            {showsValues &&
              positionedTokens
                .filter((token) => token.index !== ATTENTION_QUERY_INDEX && !isMaskedToken(token.index, view))
                .map((token) => {
                  const { labelPoint } = getAttentionArc(token.centerX, queryToken.centerX);

                  return (
                    <g
                      key={`score-${view}-${token.index}`}
                      className="svg-anim-center animate-pop-in"
                      style={{ animationDelay: `${PILL_DELAY_MS + token.index * ARC_STAGGER_MS}ms` }}
                    >
                      <ScorePill
                        x={labelPoint.x}
                        y={labelPoint.y}
                        text={formatAttentionValue(values[token.index], view)}
                        isTopKey={token.index === topKeyIndex}
                      />
                    </g>
                  );
                })}

            {positionedTokens.map((token) => (
              <TokenBox
                key={`token-${token.text}-${token.index}`}
                token={token}
                role={getRole(token)}
                isMasked={isMaskedToken(token.index, view)}
              />
            ))}

            {view === "vectors" &&
              positionedTokens.map((token) => <EmbeddingPreview key={`vector-${token.text}-${token.index}`} token={token} />)}

            {showsQuery && (
              <text
                x={queryToken.centerX}
                y={ATTENTION_TOKEN_TOP + ATTENTION_TOKEN_HEIGHT + LABEL_OFFSET_Y}
                textAnchor="middle"
                className="animate-fade-in fill-ink font-mono text-[10px] font-bold"
              >
                ↑ query
              </text>
            )}

            {topKeyIndex >= 0 && (
              <text
                x={positionedTokens[topKeyIndex].centerX}
                y={ATTENTION_TOKEN_TOP + ATTENTION_TOKEN_HEIGHT + LABEL_OFFSET_Y}
                textAnchor="middle"
                className="animate-fade-in fill-info font-mono text-[10px] font-bold"
                style={{ animationDelay: `${PILL_DELAY_MS}ms` }}
              >
                ↑ key mais parecida
              </text>
            )}

            {showsValues && (
              <g>
                {positionedTokens.map((token) => {
                  const ratio = Math.max(MIN_BAR_RATIO, values[token.index] / maxValue);
                  const fillClass =
                    token.index === ATTENTION_QUERY_INDEX
                      ? "fill-brand"
                      : token.index === topKeyIndex
                        ? "fill-info"
                        : "fill-subtle";

                  return (
                    <rect
                      key={`bar-${token.text}-${token.index}`}
                      x={token.centerX - ATTENTION_BAR_WIDTH / 2}
                      y={ATTENTION_BAR_BASELINE - ATTENTION_BAR_MAX_HEIGHT}
                      width={ATTENTION_BAR_WIDTH}
                      height={ATTENTION_BAR_MAX_HEIGHT}
                      rx={3}
                      vectorEffect="non-scaling-stroke"
                      className={cn(
                        fillClass,
                        "svg-anim-bottom animate-grow stroke-line-strong transition-[fill,transform] duration-500",
                      )}
                      strokeWidth={1}
                      style={{
                        transform: `scaleY(${ratio})`,
                        animationDelay: `${token.index * ARC_STAGGER_MS}ms`,
                      }}
                    />
                  );
                })}
                <line
                  x1={positionedTokens[0].x - 10}
                  x2={positionedTokens[positionedTokens.length - 1].x + positionedTokens[positionedTokens.length - 1].width + 10}
                  y1={ATTENTION_BAR_BASELINE}
                  y2={ATTENTION_BAR_BASELINE}
                  className="stroke-line-strong"
                  strokeWidth={1}
                />
                {barsCaption && (
                  <text
                    key={barsCaption}
                    x={positionedTokens[0].x - 10}
                    y={BARS_CAPTION_Y}
                    className="animate-fade-in fill-muted font-mono text-[10px]"
                  >
                    {barsCaption}
                  </text>
                )}
              </g>
            )}
          </svg>
        </div>
      </div>

      <figcaption className="flex min-h-[28px] flex-wrap items-center gap-x-4 gap-y-2 px-4 pb-3 pt-1 text-[10px] text-muted">
        {showsQuery && (
          <span className="inline-flex animate-fade-in items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 border border-line-strong bg-brand" />
            query (“ele”)
          </span>
        )}
        {showsValues && (
          <>
            <span className="inline-flex animate-fade-in items-center gap-1.5 text-info">
              <span aria-hidden="true" className="size-2.5 border border-line-strong bg-info" />
              key com maior pontuação
            </span>
            <span key={view} className="animate-fade-in">
              ⌒ espessura = {view === "scores" ? "pontuação" : "peso"}
            </span>
          </>
        )}
      </figcaption>
    </figure>
  );
}

function FormulaPill({ text }: { text: string }) {
  const width = text.length * FORMULA_CHAR_WIDTH + FORMULA_PADDING;
  const left = ATTENTION_VIEWBOX.width / 2 - width / 2;
  const top = FORMULA_CENTER_Y - FORMULA_HEIGHT / 2;

  return (
    <g>
      <rect x={left + 2} y={top + 2} width={width} height={FORMULA_HEIGHT} rx={16} style={{ fill: "var(--shadow-hard)" }} />
      <rect x={left} y={top} width={width} height={FORMULA_HEIGHT} rx={16} className="fill-surface stroke-line-strong" strokeWidth={1.5} />
      <text
        x={ATTENTION_VIEWBOX.width / 2}
        y={FORMULA_CENTER_Y + 0.5}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-ink font-mono text-[13px] font-semibold"
      >
        {text}
      </text>
    </g>
  );
}

function ScorePill({ x, y, text, isTopKey }: { x: number; y: number; text: string; isTopKey: boolean }) {
  return (
    <g>
      <rect
        x={x - SCORE_PILL_WIDTH / 2}
        y={y - SCORE_PILL_HEIGHT / 2}
        width={SCORE_PILL_WIDTH}
        height={SCORE_PILL_HEIGHT}
        rx={8}
        className={cn(isTopKey ? "fill-info" : "fill-surface", "stroke-line-strong")}
        strokeWidth={1}
      />
      <text
        x={x}
        y={y + 0.5}
        textAnchor="middle"
        dominantBaseline="central"
        className={cn(isTopKey ? "fill-surface" : "fill-ink", "font-mono text-[10px] font-bold")}
      >
        {text}
      </text>
    </g>
  );
}

function EmbeddingPreview({ token }: { token: PositionedAttentionToken }) {
  const dimensions = getEmbeddingPreview(token.text);
  const totalWidth = dimensions.length * VECTOR_CELL_WIDTH + (dimensions.length - 1) * VECTOR_CELL_GAP;
  const left = token.centerX - totalWidth / 2;
  const baseline = ATTENTION_TOKEN_TOP + ATTENTION_TOKEN_HEIGHT + VECTOR_OFFSET_Y + VECTOR_MAX_HEIGHT;

  return (
    <g aria-hidden="true">
      {dimensions.map((value, dimension) => (
        <rect
          key={dimension}
          x={left + dimension * (VECTOR_CELL_WIDTH + VECTOR_CELL_GAP)}
          y={baseline - VECTOR_MAX_HEIGHT}
          width={VECTOR_CELL_WIDTH}
          height={VECTOR_MAX_HEIGHT}
          rx={1.5}
          vectorEffect="non-scaling-stroke"
          className="svg-anim-bottom animate-grow stroke-line-strong"
          strokeWidth={1}
          style={{
            fill: VECTOR_COLORS[dimension % VECTOR_COLORS.length],
            transform: `scaleY(${value})`,
            animationDelay: `${token.index * ARC_STAGGER_MS + dimension * 40}ms`,
          }}
        />
      ))}
    </g>
  );
}

function TokenBox({ token, role, isMasked }: { token: PositionedAttentionToken; role: TokenRole; isMasked: boolean }) {
  const isEmphasized = role !== "default";

  return (
    <g className="transition-opacity duration-500" style={{ opacity: isMasked ? MASKED_OPACITY : 1 }}>
      <rect
        x={token.x + 3}
        y={ATTENTION_TOKEN_TOP + 3}
        width={token.width}
        height={ATTENTION_TOKEN_HEIGHT}
        rx={6}
        style={{ fill: "var(--shadow-hard)" }}
      />
      <rect
        x={token.x}
        y={ATTENTION_TOKEN_TOP}
        width={token.width}
        height={ATTENTION_TOKEN_HEIGHT}
        rx={6}
        className={cn(TOKEN_FILL_CLASS[role], "stroke-line-strong transition-[fill,stroke-width] duration-300")}
        style={{ strokeWidth: role === "query" ? 2 : 1.5 }}
      />
      <text
        x={token.centerX}
        y={ATTENTION_TOKEN_TOP + ATTENTION_TOKEN_HEIGHT / 2 + 0.5}
        textAnchor="middle"
        dominantBaseline="central"
        className={cn(
          role === "query" ? "fill-on-brand" : "fill-ink",
          "font-mono text-[13px] transition-[fill] duration-300",
          isEmphasized ? "font-bold" : "font-semibold",
        )}
      >
        {token.text}
      </text>
    </g>
  );
}
