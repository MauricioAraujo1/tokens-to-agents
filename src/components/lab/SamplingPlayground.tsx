import { CornerDownLeft, Dices, Scissors } from "lucide-react";
import { useMemo, useState, type CSSProperties } from "react";
import {
  SAMPLING_CANDIDATES,
  SAMPLING_DEFAULTS,
  SAMPLING_HISTORY_LIMIT,
  SAMPLING_LIMITS,
  SAMPLING_PROMPT,
} from "../../data/labs";
import { computeDistribution, sampleToken, type SamplingParams, type TokenProbability } from "../../lib/sampling";
import { cn } from "../../lib/utils";
import { Button } from "../ui/Button";
import { Callout } from "../ui/Callout";

interface SamplingPlaygroundProps {
  lessonCode: string;
  random?: () => number;
}

interface SliderProps {
  id: string;
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
}

const BAR_MAX_WIDTH_PERCENT = 100;
const BAR_COLOR = "var(--module-04)";
const ROW_STAGGER_MS = 35;

function formatProbability(value: number): string {
  return value.toFixed(2);
}

function Slider({ id, label, hint, value, min, max, step, format, onChange }: SliderProps) {
  const progress = ((value - min) / (max - min)) * 100;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-[13px]">
        <label htmlFor={id} className="font-semibold text-ink">
          {label}
        </label>
        <output htmlFor={id} className="font-bold" style={{ color: BAR_COLOR }}>
          {format(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="range-track w-full"
        style={{ "--range-progress": `${progress}%`, "--range-fill": BAR_COLOR } as CSSProperties}
      />
      <p className="text-[10.5px] text-muted">{hint}</p>
    </div>
  );
}

function describeRow(entry: TokenProbability, topP: number): string {
  if (entry.cutBy === "top-k") {
    return "cortado pelo top-k";
  }

  if (entry.cutBy === "top-p") {
    return "cortado pelo top-p";
  }

  return entry.isLastKept && entry.cumulative >= topP && topP < 1
    ? `acum. ${formatProbability(entry.cumulative)}  ← passa de ${topP}: último que entra`
    : `acum. ${formatProbability(entry.cumulative)}`;
}

export function SamplingPlayground({ lessonCode, random = Math.random }: SamplingPlaygroundProps) {
  const [params, setParams] = useState<SamplingParams>({ ...SAMPLING_DEFAULTS });
  const [history, setHistory] = useState<string[]>([]);
  const distribution = useMemo(() => computeDistribution(SAMPLING_CANDIDATES, params), [params]);
  const maxProbability = Math.max(...distribution.map((entry) => entry.probability), 0);

  function updateParam(key: keyof SamplingParams, value: number) {
    setParams((current) => ({ ...current, [key]: value }));
  }

  function handleSample() {
    const token = sampleToken(distribution, random());

    if (token) {
      setHistory((current) => [...current, token].slice(-SAMPLING_HISTORY_LIMIT));
    }
  }

  return (
    <>
      <section
        aria-labelledby="sampling-title"
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-lg border border-line bg-surface px-4 py-5 sm:px-6"
      >
        <p className="text-[11px] text-muted">Laboratório · {lessonCode}</p>
        <h1 id="sampling-title" className="text-2xl font-bold leading-[31px] text-ink">
          Temperatura e amostragem
        </h1>

        <div className="flex items-center gap-2 rounded-md border border-line-strong bg-paper px-3 py-2.5">
          <span className="text-xs font-bold text-muted">prompt ›</span>
          <span className="text-[13px] font-semibold text-ink">
            {SAMPLING_PROMPT} <span aria-hidden="true">▁</span>
          </span>
        </div>

        <p className="text-[11px] text-muted">
          Probabilidade do próximo token (temperatura {params.temperature}, top-k {params.topK}, top-p {params.topP})
        </p>

        <ul aria-label="Distribuição do próximo token" className="flex flex-col gap-3">
          {distribution.map((entry, index) => {
            const isTop = index === 0 && entry.isKept;
            const width = maxProbability === 0 ? 0 : (entry.probability / maxProbability) * BAR_MAX_WIDTH_PERCENT;

            return (
              <li
                key={entry.token}
                className={cn(
                  "flex animate-step-in items-center gap-2.5 transition-opacity duration-300",
                  !entry.isKept && "opacity-45",
                )}
                style={{ animationDelay: `${index * ROW_STAGGER_MS}ms` }}
              >
                <span
                  className={cn(
                    "w-24 shrink-0 rounded-[5px] border-[1.5px] px-2 py-[5px] text-xs",
                    "transition-colors duration-300",
                    isTop ? "border-line-strong bg-brand font-bold text-on-brand" : "border-line-strong bg-surface font-semibold text-ink",
                  )}
                >
                  {entry.token}
                </span>
                <span className="flex min-w-0 flex-1 items-center gap-2.5">
                  <span className="min-w-0 max-w-[58%] flex-1">
                    <span
                      aria-hidden="true"
                      className="block h-4 rounded-[2px] border border-line-strong transition-[width,background-color] duration-500 ease-out"
                      style={{
                        width: `${Math.max(width, 1)}%`,
                        backgroundColor: entry.isKept ? BAR_COLOR : "var(--ink-subtle)",
                      }}
                    />
                  </span>
                  <span className="shrink-0 text-xs font-bold text-ink">{formatProbability(entry.probability)}</span>
                  <span className="hidden min-w-0 items-center gap-1 truncate whitespace-pre text-[10.5px] text-muted sm:flex">
                    {!entry.isKept && <Scissors size={11} aria-hidden="true" />}
                    {describeRow(entry, params.topP)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>

        <Callout title="O que observar">
          <p>
            Temperatura baixa concentra a probabilidade no token mais provável e temperatura alta espalha a
            distribuição. O top-k fica só com os k tokens mais prováveis e o top-p com o menor grupo cuja soma acumulada
            chega a {params.topP}; o resto é descartado.
          </p>
        </Callout>
      </section>

      <aside
        aria-label="Parâmetros de amostragem"
        className="flex shrink-0 flex-col gap-[18px] rounded-lg border border-line bg-surface p-[18px] lg:w-80"
      >
        <h2 className="text-[11px] font-bold uppercase tracking-[1px] text-ink">Parâmetros</h2>
        <Slider
          id="sampling-temperature"
          label="Temperatura"
          hint="0 = determinístico · 2 = muito aleatório"
          value={params.temperature}
          {...SAMPLING_LIMITS.temperature}
          format={(value) => value.toFixed(1)}
          onChange={(value) => updateParam("temperature", value)}
        />
        <Slider
          id="sampling-top-k"
          label="Top-k"
          hint="considera só os k tokens mais prováveis"
          value={params.topK}
          {...SAMPLING_LIMITS.topK}
          format={(value) => String(value)}
          onChange={(value) => updateParam("topK", value)}
        />
        <Slider
          id="sampling-top-p"
          label="Top-p"
          hint="menor grupo com soma ≥ p"
          value={params.topP}
          {...SAMPLING_LIMITS.topP}
          format={(value) => value.toFixed(2)}
          onChange={(value) => updateParam("topP", value)}
        />

        <Button variant="secondary" className="w-full font-bold" onClick={handleSample}>
          <Dices size={15} aria-hidden="true" />
          Sortear um token
        </Button>

        <p role="status" className="flex items-start gap-1 text-[11px] leading-[14px] text-muted">
          {history.length > 0 && <CornerDownLeft size={11} aria-hidden="true" className="mt-px shrink-0" />}
          <span key={history.length} className={cn(history.length > 0 && "animate-fade-in")}>
            {history.length > 0 ? `Sorteados: ${history.join(" · ")}` : "Nenhum token sorteado ainda."}
          </span>
        </p>
        <p className="text-[10.5px] leading-[14px] text-subtle">Tudo roda no navegador, sem nenhuma chamada a API.</p>
      </aside>
    </>
  );
}
