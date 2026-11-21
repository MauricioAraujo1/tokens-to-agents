import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { MOBILE_QUERY, useMediaQuery } from "../../hooks/useMediaQuery";
import { useSvgTextScale } from "../../hooks/useSvgTextScale";
import { useI18n } from "../../i18n/useI18n";
import { cn } from "../../lib/utils";
import { sceneColor } from "../colors";
import { solveSceneFont } from "../textScale";
import type { PieceProps, TokenStreamSpec } from "../types";
import { TOKEN_FONT, TOKEN_SHADOW_OFFSET, layoutTokenStream, tokenLabelFont } from "./tokenStreamLayout";

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
  /** A lista também é medida: com espaço de novo, a peça volta ao SVG. */
  listRef?: (element: Element | null) => void;
}

/** Espaço entre as linhas da lista (`gap-2`), em px. */
const LIST_ROW_GAP = 8;
/** Largura mínima da célula para a lista ir para duas colunas: abaixo disso, o chip trunca demais (375). */
const TWO_COLUMN_MIN_WIDTH = 480;

/**
 * A lista em uma coluna passa da célula da cena (layout em coluna, a altura da célula é fixa): numa
 * célula larga, ela vai para duas colunas (10-06#5 passava 19 px). A altura de uma coluna é a soma das
 * linhas, que não muda com o número de colunas, então a escolha não oscila. Sem ResizeObserver, uma coluna.
 */
function useListColumns(ref: RefObject<HTMLUListElement | null>, enabled: boolean, rowCount: number): boolean {
  const [twoColumns, setTwoColumns] = useState(false);

  useLayoutEffect(() => {
    const list = ref.current;
    const cell = list?.parentElement;
    if (!enabled || !list || !cell || typeof ResizeObserver === "undefined") return;
    const check = () => {
      const rows = [...list.children].filter((child): child is HTMLElement => child instanceof HTMLElement);
      const oneColumn = rows.reduce((sum, row) => sum + row.offsetHeight, 0) + LIST_ROW_GAP * Math.max(0, rows.length - 1);
      setTwoColumns(cell.clientWidth >= TWO_COLUMN_MIN_WIDTH && cell.clientHeight > 0 && oneColumn > cell.clientHeight + 1);
    };
    check();
    const observer = new ResizeObserver(check);
    observer.observe(cell);
    return () => observer.disconnect();
  }, [ref, enabled, rowCount]);

  return twoColumns;
}

/**
 * Layout de celular do preview 06: uma linha por token, com o chip, a barra e o valor, da maior para a
 * menor. A cena em SVG encolhida deixava os rótulos com ~5 px a 375 px (T138). Sem barras nem arcos,
 * os tokens viram chips que quebram linha.
 */
function TokenStreamList({ spec, accent, roleOf, listRef }: TokenStreamListProps) {
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
  const listElement = useRef<HTMLUListElement | null>(null);
  const twoColumns = useListColumns(listElement, hasValues, rows.length);
  const setListRef = (element: HTMLUListElement | null) => {
    listElement.current = element;
    listRef?.(element);
  };
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
      <ul ref={setListRef} aria-hidden="true" data-variant="list" className="m-0 flex list-none flex-wrap gap-2 p-0">
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
    <ul
      ref={setListRef}
      aria-hidden="true"
      data-variant="list"
      data-columns={twoColumns ? 2 : 1}
      className={cn("m-0 list-none p-0", twoColumns ? "columns-2 gap-x-6" : "flex flex-col gap-2")}
    >
      {sorted.map((row) => (
        <li
          key={row.index}
          data-token={row.index}
          data-role={row.role}
          className={cn("grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-center gap-3", twoColumns && "mb-2 break-inside-avoid")}
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
  const ref = useRef<Element | null>(null);
  const setRef = (element: Element | null) => {
    ref.current = element;
  };
  const sizeAt = (candidate: number) => layoutTokenStream(spec, candidate);
  // A fila não amplia além do desenho de referência: com poucos tokens, ela fica no centro do quadro.
  const { font, maxWidth, box } = useSvgTextScale(ref, sizeAt, TOKEN_FONT, undefined, TOKEN_FONT);
  // Fila longa demais para a largura com as marcas em 11 px (tokens em 13): vira a lista, como no celular.
  const widthOnly = box && solveSceneFont({ width: box.width, maxHeight: Number.POSITIVE_INFINITY }, sizeAt, TOKEN_FONT);
  const fitsWidth = !widthOnly || widthOnly.font * widthOnly.scale >= TOKEN_FONT - 0.05;
  const labelFont = tokenLabelFont(font);
  const layout = layoutTokenStream(spec, font);
  const accent = sceneColor(spec.color ?? "brand");
  const keys = new Set(spec.keys ?? []);
  const animate = transition.animate ? "scene-animate" : undefined;
  const roleOf = (index: number): TokenRole => (index === spec.query ? "query" : keys.has(index) ? "key" : "token");

  if (isMobile || !fitsWidth) return <TokenStreamList spec={spec} accent={accent} roleOf={roleOf} listRef={setRef} />;
  const firstToken = layout.tokens[0];
  const lastToken = layout.tokens[layout.tokens.length - 1];

  return (
    <svg
      ref={setRef}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      aria-hidden="true"
      className="mx-auto block h-full max-h-full w-full"
      style={maxWidth === undefined ? undefined : { maxWidth }}
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
                className="font-mono font-bold"
                style={{ fontSize: labelFont, fill: roleOf(arc.to) === "key" ? "var(--surface-raised)" : "var(--ink-primary)" }}
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
              className={cn("font-mono", role === "token" ? "font-semibold" : "font-bold")}
              style={{ fontSize: font, fill: role === "query" ? "var(--accent-on-brand)" : "var(--ink-primary)" }}
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
              className="font-mono font-bold"
              style={{ fontSize: labelFont, fill: role === "key" ? KEY_INK : "var(--ink-primary)" }}
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
