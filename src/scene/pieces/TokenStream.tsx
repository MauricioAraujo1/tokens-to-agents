import { MOBILE_QUERY, useMediaQuery } from "../../hooks/useMediaQuery";
import { useI18n } from "../../i18n/useI18n";
import { cn } from "../../lib/utils";
import { sceneColor } from "../colors";
import type { PieceProps, TokenStreamSpec } from "../types";
import { TOKEN_SHADOW_OFFSET, layoutTokenStream } from "./tokenStreamLayout";

type TokenRole = "query" | "key" | "token";

// Linguagem da cena de self-attention do preview 01: caixas com sombra dura, query na cor da
// peça, keys em `info`, arcos cinza (os que chegam numa key em `info`) e pílulas de pontuação.
const KEY_COLOR = "var(--state-info)";
// Texto em `info` e a pílula com texto claro usam o tom de texto (T136), que passa de 4,5:1.
const KEY_INK = "var(--state-info-ink)";
const TOKEN_FILL: Record<Exclude<TokenRole, "query">, string> = {
  key: "var(--state-info-soft)",
  token: "var(--surface-raised)",
};

const BAR_FILL: Record<TokenRole, (accent: string) => string> = {
  query: (accent) => accent,
  key: () => KEY_COLOR,
  token: () => "var(--ink-subtle)",
};

// Os números da cena são conteúdo em PT (AD-003), como os rótulos dos arcos.
const formatValue = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

interface TokenStreamListProps {
  spec: TokenStreamSpec;
  accent: string;
  roleOf: (index: number) => TokenRole;
}

/**
 * Layout de celular do preview 06: uma linha por token, com o chip, a barra e o valor, da maior para a
 * menor. A cena em SVG encolhida deixava os rótulos com ~5 px a 375 px (T138). Sem barras nem arcos,
 * os tokens viram chips que quebram linha.
 */
function TokenStreamList({ spec, accent, roleOf }: TokenStreamListProps) {
  const arcTo = (index: number) =>
    spec.arcs?.find((arc) => arc.to === index && arc.from === spec.query) ?? spec.arcs?.find((arc) => arc.to === index);
  // O número da linha é o rótulo do arco (por exemplo, a pontuação). Só quando a cena não rotula
  // nenhum arco a barra mostra o próprio valor: misturar as duas escalas confundiria a leitura.
  const hasArcLabels = spec.arcs?.some((arc) => arc.label !== undefined) ?? false;
  const rows = spec.tokens.map((text, index) => {
    const arc = arcTo(index);
    const bar = spec.bars?.[index];
    const value = bar ?? arc?.weight;
    const label = hasArcLabels ? arc?.label : bar === undefined ? undefined : formatValue(bar);
    return { text, index, role: roleOf(index), value, label };
  });
  const hasValues = rows.some((row) => row.value !== undefined);
  const chipStyle = (role: TokenRole) => ({
    backgroundColor: role === "query" ? accent : TOKEN_FILL[role],
    color: role === "query" ? "var(--accent-on-brand)" : "var(--ink-primary)",
  });
  const chipClass = (role: TokenRole) =>
    cn(
      "min-w-0 truncate rounded-[5px] border-[1.5px] border-line-strong px-2.5 py-1.5 font-mono text-[13px] leading-[18px]",
      role === "token" ? "font-semibold" : "font-bold",
    );

  if (!hasValues) {
    return (
      <ul aria-hidden="true" data-variant="list" className="m-0 flex list-none flex-wrap gap-2 p-0">
        {rows.map((row) => (
          <li key={row.index} data-token={row.index} data-role={row.role} className={chipClass(row.role)} style={chipStyle(row.role)}>
            {row.text}
          </li>
        ))}
      </ul>
    );
  }

  const max = Math.max(...rows.map((row) => row.value ?? 0), Number.EPSILON);
  const sorted = [...rows].sort((left, right) => (right.value ?? 0) - (left.value ?? 0));

  return (
    <ul aria-hidden="true" data-variant="list" className="m-0 flex list-none flex-col gap-2 p-0">
      {sorted.map((row) => (
        <li
          key={row.index}
          data-token={row.index}
          data-role={row.role}
          className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-center gap-3"
        >
          <span className={chipClass(row.role)} style={chipStyle(row.role)}>
            {row.text}
          </span>
          <span className="flex min-w-0 items-center gap-2">
            <span
              data-bar={row.index}
              className="h-3 shrink-0 rounded-[3px] border border-line-strong"
              style={{ width: `max(2px, ${(((row.value ?? 0) / max) * 75).toFixed(1)}%)`, backgroundColor: BAR_FILL[row.role](accent) }}
            />
            {row.label && <span className="font-mono text-[13px] font-bold text-ink">{row.label}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Fila de tokens com query e keys em destaque, arcos ponderados e barras opcionais (SCN-01.2). */
export function TokenStream({ spec, transition }: PieceProps<TokenStreamSpec>) {
  const { t } = useI18n();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const layout = layoutTokenStream(spec);
  const accent = sceneColor(spec.color ?? "brand");
  const keys = new Set(spec.keys ?? []);
  const animate = transition.animate ? "scene-animate" : undefined;
  const roleOf = (index: number): TokenRole => (index === spec.query ? "query" : keys.has(index) ? "key" : "token");

  if (isMobile) return <TokenStreamList spec={spec} accent={accent} roleOf={roleOf} />;
  const firstToken = layout.tokens[0];
  const lastToken = layout.tokens[layout.tokens.length - 1];

  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      aria-hidden="true"
      className="block h-full max-h-full w-full"
    >
      {layout.arcs.map((arc) => {
        const toKey = roleOf(arc.to) === "key";

        return (
          <path
            key={`arc-${arc.from}-${arc.to}`}
            d={arc.path}
            fill="none"
            strokeLinecap="round"
            data-arc={`${arc.from}-${arc.to}`}
            data-weight={arc.weight}
            className={animate}
            style={{
              stroke: toKey ? KEY_COLOR : "var(--ink-muted)",
              strokeWidth: arc.strokeWidth,
              strokeOpacity: toKey ? 1 : 0.35 + arc.weight * 0.65,
            }}
          />
        );
      })}

      {layout.arcs.map(
        (arc) =>
          arc.label && (
            <g key={`label-${arc.from}-${arc.to}`} data-arc-label={`${arc.from}-${arc.to}`}>
              <rect
                x={arc.label.box.x}
                y={arc.label.box.y}
                width={arc.label.box.width}
                height={arc.label.box.height}
                rx={8}
                strokeWidth={1}
                style={{
                  fill: roleOf(arc.to) === "key" ? KEY_INK : "var(--surface-raised)",
                  stroke: "var(--line-strong)",
                }}
              />
              <text
                x={arc.label.x}
                y={arc.label.y + 0.5}
                textAnchor="middle"
                dominantBaseline="central"
                className="font-mono text-[10px] font-bold"
                style={{ fill: roleOf(arc.to) === "key" ? "var(--surface-raised)" : "var(--ink-primary)" }}
              >
                {arc.label.text}
              </text>
            </g>
          ),
      )}

      {layout.tokens.map((token) => {
        const role = roleOf(token.index);

        return (
          <g key={token.index} data-token={token.index} data-role={role}>
            <rect
              x={token.box.x + TOKEN_SHADOW_OFFSET}
              y={token.box.y + TOKEN_SHADOW_OFFSET}
              width={token.box.width}
              height={token.box.height}
              rx={6}
              style={{ fill: "var(--shadow-hard)" }}
            />
            <rect
              x={token.box.x}
              y={token.box.y}
              width={token.box.width}
              height={token.box.height}
              rx={6}
              className={animate}
              style={{
                fill: role === "query" ? accent : TOKEN_FILL[role],
                stroke: "var(--line-strong)",
                strokeWidth: role === "query" ? 2 : 1.5,
              }}
            />
            <text
              x={token.centerX}
              y={token.box.y + token.box.height / 2 + 0.5}
              textAnchor="middle"
              dominantBaseline="central"
              className={cn("font-mono text-[13px]", role === "token" ? "font-semibold" : "font-bold")}
              style={{ fill: role === "query" ? "var(--accent-on-brand)" : "var(--ink-primary)" }}
            >
              {token.text}
            </text>
          </g>
        );
      })}

      {layout.tokens.map((token) => {
        const role = roleOf(token.index);

        return (
          role !== "token" && (
            <text
              key={`mark-${token.index}`}
              data-mark={role}
              x={token.centerX}
              y={layout.markY}
              textAnchor="middle"
              dominantBaseline="central"
              className="font-mono text-[10px] font-bold"
              style={{ fill: role === "key" ? KEY_INK : "var(--ink-primary)" }}
            >
              {`↑ ${t(role === "query" ? "scene.tokenStream.query" : "scene.tokenStream.key")}`}
            </text>
          )
        );
      })}

      {layout.bars.length > 0 && firstToken && lastToken && (
        <g>
          {layout.bars.map((bar) => {
            const role = roleOf(bar.index);

            return (
              <rect
                key={`bar-${bar.index}`}
                data-bar={bar.index}
                x={bar.box.x}
                y={bar.box.y}
                width={bar.box.width}
                height={bar.box.height}
                rx={3}
                strokeWidth={1}
                className={animate}
                style={{
                  fill: role === "query" ? accent : role === "key" ? KEY_COLOR : "var(--ink-subtle)",
                  stroke: "var(--line-strong)",
                }}
              />
            );
          })}
          <line
            x1={firstToken.box.x - 10}
            x2={lastToken.box.x + lastToken.box.width + 10}
            y1={layout.barBaseline}
            y2={layout.barBaseline}
            strokeWidth={1}
            style={{ stroke: "var(--line-strong)" }}
          />
        </g>
      )}
    </svg>
  );
}
