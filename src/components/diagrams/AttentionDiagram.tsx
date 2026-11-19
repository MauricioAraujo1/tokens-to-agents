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
  ATTENTION_VIEWBOX,
  findTopKeyIndex,
  formatAttentionValue,
  getArcOpacity,
  getArcStrokeWidth,
  getAttentionArc,
  getAttentionValues,
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

const positionedTokens = layoutAttentionTokens(ATTENTION_TOKENS);
const queryToken = positionedTokens[ATTENTION_QUERY_INDEX];

export function AttentionDiagram({ view }: AttentionDiagramProps) {
  const values = getAttentionValues(ATTENTION_TOKENS, view);
  const maxValue = Math.max(...values);
  const showsQuery = view !== "tokens";
  const showsValues = view === "scores" || view === "weights";
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

            {formula && <FormulaPill text={formula} />}

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
                      strokeLinecap="round"
                      className={isTopKey ? "stroke-info" : "stroke-muted"}
                      strokeWidth={getArcStrokeWidth(values[token.index], maxValue)}
                      opacity={isTopKey ? 1 : getArcOpacity(values[token.index], maxValue)}
                    />
                  );
                })}

            {showsValues &&
              positionedTokens
                .filter((token) => token.index !== ATTENTION_QUERY_INDEX)
                .map((token) => {
                  const { labelPoint } = getAttentionArc(token.centerX, queryToken.centerX);

                  return (
                    <ScorePill
                      key={`score-${token.text}-${token.index}`}
                      x={labelPoint.x}
                      y={labelPoint.y}
                      text={formatAttentionValue(values[token.index], view)}
                      isTopKey={token.index === topKeyIndex}
                    />
                  );
                })}

            {positionedTokens.map((token) => (
              <TokenBox key={`token-${token.text}-${token.index}`} token={token} role={getRole(token)} />
            ))}

            {showsQuery && (
              <text
                x={queryToken.centerX}
                y={ATTENTION_TOKEN_TOP + ATTENTION_TOKEN_HEIGHT + LABEL_OFFSET_Y}
                textAnchor="middle"
                className="fill-ink font-mono text-[10px] font-bold"
              >
                ↑ query
              </text>
            )}

            {topKeyIndex >= 0 && (
              <text
                x={positionedTokens[topKeyIndex].centerX}
                y={ATTENTION_TOKEN_TOP + ATTENTION_TOKEN_HEIGHT + LABEL_OFFSET_Y}
                textAnchor="middle"
                className="fill-info font-mono text-[10px] font-bold"
              >
                ↑ key mais parecida
              </text>
            )}

            {showsValues && (
              <g>
                {positionedTokens.map((token) => {
                  const height = Math.max(2, (values[token.index] / maxValue) * ATTENTION_BAR_MAX_HEIGHT);
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
                      y={ATTENTION_BAR_BASELINE - height}
                      width={ATTENTION_BAR_WIDTH}
                      height={height}
                      rx={3}
                      className={cn(fillClass, "stroke-line-strong")}
                      strokeWidth={1}
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
                  <text x={positionedTokens[0].x - 10} y={BARS_CAPTION_Y} className="fill-muted font-mono text-[10px]">
                    {barsCaption}
                  </text>
                )}
              </g>
            )}
          </svg>
        </div>
      </div>

      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 pb-3 pt-1 text-[10px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 border border-line-strong bg-brand" />
          query (“ele”)
        </span>
        <span className="inline-flex items-center gap-1.5 text-info">
          <span aria-hidden="true" className="size-2.5 border border-line-strong bg-info" />
          key com maior pontuação
        </span>
        <span>⌒ espessura = {view === "weights" ? "peso" : "pontuação"}</span>
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

function TokenBox({ token, role }: { token: PositionedAttentionToken; role: TokenRole }) {
  const isEmphasized = role !== "default";

  return (
    <g>
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
        className={cn(TOKEN_FILL_CLASS[role], "stroke-line-strong")}
        strokeWidth={role === "query" ? 2 : 1.5}
      />
      <text
        x={token.centerX}
        y={ATTENTION_TOKEN_TOP + ATTENTION_TOKEN_HEIGHT / 2 + 0.5}
        textAnchor="middle"
        dominantBaseline="central"
        className={cn(
          role === "query" ? "fill-on-brand" : "fill-ink",
          "font-mono text-[13px]",
          isEmphasized ? "font-bold" : "font-semibold",
        )}
      >
        {token.text}
      </text>
    </g>
  );
}
