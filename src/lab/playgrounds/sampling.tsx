import { Dices, Scissors } from "lucide-react";
import { useCallback, useState } from "react";
import { PlaygroundShell, type PlaygroundControl, type PlaygroundView } from "../../components/lab/PlaygroundShell";
import { Button } from "../../components/ui/Button";
import { samplingContent as content } from "../../content/playgrounds/sampling";
import { cn } from "../../lib/utils";
import { sampleToken, samplingDistribution, type SampledToken } from "../sampling";

type Values = { temperature: number; topK: number; topP: number };

const CONTROLS: ReadonlyArray<PlaygroundControl<Values>> = [
  { kind: "slider", id: "temperature", label: content.temperatureLabel, hint: content.temperatureHint, min: 0, max: 2, step: 0.1 },
  { kind: "slider", id: "topK", label: content.topKLabel, hint: content.topKHint, min: 1, max: content.topKMax, step: 1 },
  { kind: "slider", id: "topP", label: content.topPLabel, hint: content.topPHint, min: 0.05, max: 1, step: 0.05 },
];

/** Cor das barras do preview 09; os tokens cortados ficam em ink-subtle (só a barra, que não é texto). */
const BAR_COLOR = "var(--module-04)";
const ROW_STAGGER_MS = 35;
const BAR_TRACK_SHARE = 0.58;
const EPSILON = 1e-9;

const distributionFor = ({ temperature, topK, topP }: Values) =>
  samplingDistribution(content.distribution, { temperature, topK, topP });

const format = (value: number) => value.toFixed(2);

/** O acumulado de cada token que entra; no último que entra, o aviso de que ele fecha o top-p. */
function describeRow(row: SampledToken, isLastKept: boolean, topP: number): string {
  if (row.cut === "top-k") return content.cutTopK;
  if (row.cut === "top-p") return content.cutTopP;
  const cumulative = content.cumulative(format(row.cumulative));
  return isLastKept && topP < 1 && row.cumulative >= topP - EPSILON ? `${cumulative}  ${content.lastKept(topP)}` : cumulative;
}

interface SamplingPlaygroundProps {
  /** Gerador em [0, 1) usado no sorteio; os testes passam um com seed. */
  random?: () => number;
}

/** Temperatura, top-k e top-p sobre uma distribuição fixa, com o sorteio do próximo token (LAB-01.1, LAB-01.2). */
export function SamplingPlayground({ random = Math.random }: SamplingPlaygroundProps) {
  const [drawn, setDrawn] = useState<string[]>([]);
  const lastDrawn = drawn.at(-1);

  const derive = useCallback(
    (values: Values): PlaygroundView => {
      const rows = distributionFor(values);
      const max = Math.max(...rows.map((row) => row.probability), EPSILON);
      const lastKeptIndex = rows.findLastIndex((row) => row.cut === null);

      return {
        // Preview 09: a caixa do prompt e uma barra horizontal por token, com o chip, o valor e o acumulado.
        // A legenda vai entre o prompt e as barras, como no preview, e não acima de tudo.
        pieces: [],
        details: (
          <div className="flex flex-col gap-3">
            <p className="flex items-center gap-2 rounded-md border border-line-strong bg-paper px-3 py-2.5 font-mono">
              <span className="text-xs font-bold text-muted">
                {content.promptLabel} <span aria-hidden="true">›</span>
              </span>
              <span data-prompt="true" className="text-[13px] font-semibold text-ink">
                {content.prompt} <span aria-hidden="true">▁</span>
              </span>
            </p>
            <p className="text-[11px] text-muted">{content.caption(values.temperature, values.topK, values.topP)}</p>
            <ul aria-label={content.tableLabel} className="m-0 flex list-none flex-col gap-3 p-0">
              {rows.map((row, index) => {
                const isKept = row.cut === null;
                const isTop = index === 0 && isKept;
                const width = (row.probability / max) * 100;

                return (
                  <li
                    key={row.token}
                    data-token-row={row.token}
                    data-cut={row.cut ?? undefined}
                    data-series={index}
                    data-width={width.toFixed(2)}
                    data-faded={isKept ? undefined : "true"}
                    data-highlight={row.token === lastDrawn ? "true" : undefined}
                    className="flex animate-step-in items-center gap-2.5"
                    style={{ animationDelay: `${index * ROW_STAGGER_MS}ms` }}
                  >
                    <span
                      className={cn(
                        "w-24 shrink-0 truncate rounded-[5px] border-[1.5px] px-2 py-[5px] text-xs transition-colors duration-300",
                        isTop
                          ? "border-line-strong bg-brand font-bold text-on-brand"
                          : isKept
                            ? "border-line-strong bg-surface font-semibold text-ink"
                            : "border-line bg-surface font-semibold text-muted",
                        row.token === lastDrawn && "shadow-press-sm",
                      )}
                    >
                      {row.token}
                    </span>
                    <span className="flex min-w-0 flex-1 items-center gap-2.5">
                      {/* A barra mais provável ocupa 58% da linha; o valor e o acumulado vêm logo depois dela. */}
                      <span
                        aria-hidden="true"
                        className="block h-4 shrink-0 rounded-[2px] border border-line-strong transition-[width,background-color] duration-500 ease-out"
                        style={{
                          width: `${(Math.max(width, 1) * BAR_TRACK_SHARE).toFixed(2)}%`,
                          backgroundColor: isKept ? BAR_COLOR : "var(--ink-subtle)",
                        }}
                      />
                      <span data-value="true" className={cn("shrink-0 text-xs font-bold", isKept ? "text-ink" : "text-muted")}>
                        {format(row.probability)}
                      </span>
                      <span
                        data-cumulative="true"
                        className="hidden min-w-0 items-center gap-1 truncate whitespace-pre text-[10.5px] text-muted sm:flex"
                      >
                        {!isKept && <Scissors size={11} aria-hidden="true" className="shrink-0" />}
                        {describeRow(row, index === lastKeptIndex, values.topP)}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ),
      };
    },
    [lastDrawn],
  );

  const actions = (values: Values) => (
    <div className="flex flex-col gap-2">
      <Button
        variant="secondary"
        className="w-full"
        onClick={() => {
          const token = sampleToken(distributionFor(values), random);
          setDrawn((current) => [...current, token].slice(-content.drawnLimit));
        }}
      >
        <Dices size={15} aria-hidden="true" />
        <span className="font-bold">{content.draw}</span>
      </Button>
      <p className="text-[11px] leading-[14px] text-muted" aria-live="polite">
        {content.drawnTitle}:{" "}
        <span key={drawn.length} data-drawn="true" className={drawn.length > 0 ? "animate-fade-in" : undefined}>
          {drawn.length > 0 ? drawn.join(" · ") : content.drawnEmpty}
        </span>
      </p>
    </div>
  );

  return (
    <PlaygroundShell
      title={content.title}
      observe={content.observe}
      controls={CONTROLS}
      initialValues={content.initial}
      derive={derive}
      actions={actions}
    />
  );
}
