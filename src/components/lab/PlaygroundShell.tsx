import { useId, useMemo, useState, type ComponentType, type CSSProperties, type ReactNode } from "react";
import { useI18n } from "../../i18n/useI18n";
import { cn } from "../../lib/utils";
import { describeScene } from "../../scene/describe";
import { pieceComponents } from "../../scene/pieces";
import type { PieceProps, PieceSpec } from "../../scene/types";

/** Valores dos controles de um playground, pelo id do controle. */
export type PlaygroundValues = Record<string, number | string>;

interface ControlBase<V extends PlaygroundValues> {
  id: Extract<keyof V, string>;
  label: string;
  /** Explicação curta abaixo do controle. */
  hint?: string;
}

export type PlaygroundControl<V extends PlaygroundValues = PlaygroundValues> =
  | (ControlBase<V> & { kind: "slider"; min: number; max: number; step: number })
  | (ControlBase<V> & { kind: "select"; options: ReadonlyArray<{ value: string; label: string }> })
  | (ControlBase<V> & { kind: "text"; maxLength?: number });

/** O que o playground mostra para os valores atuais: as peças da cena e o texto em volta. */
export interface PlaygroundView {
  pieces: PieceSpec[];
  /** Rótulo curto acima de cada peça, na mesma ordem (por exemplo, quando há gráficos lado a lado). */
  labels?: string[];
  /** `row` põe as peças lado a lado a partir de 640 px; `column` (padrão) empilha. */
  layout?: "column" | "row";
  /** Legenda acima da cena. */
  caption?: string;
  /** Resultado em texto abaixo da cena (contagens, sorteios, rankings). */
  details?: ReactNode;
  /** Combinação de parâmetros inválida: a mensagem aparece em `role="alert"`. */
  error?: string;
}

interface PlaygroundShellProps<V extends PlaygroundValues> {
  title: string;
  /** Texto do quadro "O que observar". */
  observe: string;
  controls: ReadonlyArray<PlaygroundControl<V>>;
  initialValues: V;
  /** Função pura dos valores para a cena. Precisa ser estável entre renders (módulo ou `useCallback`). */
  derive: (values: V) => PlaygroundView;
  /** Botões abaixo dos controles (sortear, próximo passo). */
  actions?: (values: V) => ReactNode;
}

// SPEC_DEVIATION: a T81 previa reaproveitar o `<Scene>`; a moldura desenha as peças direto, sem transição.
// Reason: o `<Scene>` anima 450 ms a cada troca de cena, e o LAB-01.2 pede a cena atualizada em menos de
// 100 ms enquanto o aluno arrasta o controle. As peças e o `describeScene` são os mesmos do motor.
/**
 * Moldura comum dos playgrounds (LAB-01.1, .2 e .4): os controles alteram os valores, `derive` gera as
 * peças na mesma renderização, sem efeito nem `await`, e nada sai do navegador.
 */
export function PlaygroundShell<V extends PlaygroundValues>({
  title,
  observe,
  controls,
  initialValues,
  derive,
  actions,
}: PlaygroundShellProps<V>) {
  const { t, locale } = useI18n();
  const baseId = useId();
  const [values, setValues] = useState<V>(initialValues);
  const view = useMemo(() => derive(values), [derive, values]);
  const label = useMemo(
    () => describeScene({ kind: "pieces", layout: "column", pieces: view.pieces }, { t, locale }),
    [view.pieces, t, locale],
  );

  const setValue = (id: Extract<keyof V, string>, value: number | string) =>
    setValues((current) => ({ ...current, [id]: value }));

  return (
    <div className="grid min-w-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section
        aria-labelledby={`${baseId}-title`}
        className="flex min-w-0 flex-col gap-3 rounded-lg border border-line bg-surface px-4 py-5 sm:px-6"
      >
        <p className="text-[11px] text-muted">{t("sections.laboratorio.label")}</p>
        <h1 id={`${baseId}-title`} className="text-2xl font-bold leading-[31px] text-ink">
          {title}
        </h1>

        {view.caption && <p className="text-[11px] text-muted">{view.caption}</p>}

        {view.error && (
          <p role="alert" className="animate-fade-in rounded-md border border-danger px-3 py-2 text-xs text-danger-ink">
            {view.error}
          </p>
        )}

        {view.pieces.length > 0 && (
          <figure
            aria-label={label}
            className={cn(
              "scene m-0 grid min-w-0 grid-cols-1 gap-4",
              view.layout === "row" && "sm:grid-flow-col sm:auto-cols-fr",
            )}
          >
            {view.pieces.map((piece, index) => {
              const Piece = pieceComponents[piece.piece] as ComponentType<PieceProps<PieceSpec>>;
              return (
                <div key={piece.id ?? index} data-piece={piece.piece} className="scene-piece min-h-0 min-w-0">
                  {view.labels?.[index] && (
                    <p aria-hidden="true" className="mb-1 text-[11px] font-semibold text-muted">
                      {view.labels[index]}
                    </p>
                  )}
                  <Piece spec={piece} transition={{ from: null, animate: false }} reducedMotion />
                </div>
              );
            })}
          </figure>
        )}

        {view.details && <div className="min-w-0 text-xs text-ink">{view.details}</div>}

        <section
          aria-labelledby={`${baseId}-observe`}
          className="flex flex-col gap-1.5 rounded-md border border-info bg-info-soft px-3.5 py-3"
        >
          <h2 id={`${baseId}-observe`} className="text-[10px] font-bold uppercase leading-[13px] tracking-[1px] text-info-ink">
            <span aria-hidden="true">✦ </span>
            {t("lab.observe")}
          </h2>
          <p className="text-xs leading-[1.55] text-ink">{observe}</p>
        </section>
      </section>

      <aside
        aria-labelledby={`${baseId}-parameters`}
        className="flex min-w-0 flex-col gap-[18px] rounded-lg border border-line bg-surface p-[18px]"
      >
        <h2 id={`${baseId}-parameters`} className="text-[11px] font-bold uppercase tracking-[1px] text-ink">
          {t("lab.parameters")}
        </h2>

        {controls.map((control) => {
          const inputId = `${baseId}-${control.id}`;
          const hintId = control.hint ? `${inputId}-hint` : undefined;
          const value = values[control.id];

          return (
            <div key={control.id} className="flex flex-col gap-2" data-control={control.id}>
              <div className="flex items-center justify-between gap-2 text-[13px]">
                <label htmlFor={inputId} className="font-semibold text-ink">
                  {control.label}
                </label>
                {control.kind === "slider" && (
                  <output htmlFor={inputId} className="font-bold text-info-ink">
                    {value}
                  </output>
                )}
              </div>

              {control.kind === "slider" && (
                <input
                  id={inputId}
                  type="range"
                  min={control.min}
                  max={control.max}
                  step={control.step}
                  value={value}
                  aria-describedby={hintId}
                  onChange={(event) => setValue(control.id, Number(event.target.value))}
                  className="range-track w-full"
                  style={
                    {
                      "--range-progress": `${((Number(value) - control.min) / (control.max - control.min || 1)) * 100}%`,
                      "--range-fill": "var(--state-info)",
                    } as CSSProperties
                  }
                />
              )}
              {control.kind === "select" && (
                <select
                  id={inputId}
                  value={value}
                  aria-describedby={hintId}
                  onChange={(event) => setValue(control.id, event.target.value)}
                  className="rounded-md border-[1.5px] border-line-strong bg-surface px-2 py-1.5 text-xs text-ink"
                >
                  {control.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
              {control.kind === "text" && (
                <input
                  id={inputId}
                  type="text"
                  value={value}
                  maxLength={control.maxLength}
                  aria-describedby={hintId}
                  onChange={(event) => setValue(control.id, event.target.value)}
                  className="rounded-md border-[1.5px] border-line-strong bg-surface px-2 py-1.5 text-xs text-ink"
                />
              )}

              {control.hint && (
                <p id={hintId} className="text-[10.5px] text-muted">
                  {control.hint}
                </p>
              )}
            </div>
          );
        })}

        {actions?.(values)}

        <p className="text-[10.5px] leading-[14px] text-muted">{t("lab.offline")}</p>
      </aside>
    </div>
  );
}
