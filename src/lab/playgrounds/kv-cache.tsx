import { PlaygroundShell, type PlaygroundControl, type PlaygroundView } from "../../components/lab/PlaygroundShell";
import { kvCacheContent as content } from "../../content/playgrounds/kv-cache";
import type { ChartSpec, MetricsPanelSpec } from "../../scene/types";
import { cacheEntries, generationCost } from "../kvCache";

type Values = { prompt: number; generated: number };

const CONTROLS: ReadonlyArray<PlaygroundControl<Values>> = [
  { kind: "slider", id: "prompt", label: content.promptLabel, hint: content.promptHint, step: 1, ...content.limits.prompt },
  { kind: "slider", id: "generated", label: content.generatedLabel, hint: content.generatedHint, step: 1, ...content.limits.generated },
];

const formatOps = (ops: number) => String(ops);
const formatMs = (ops: number) => `${(ops * content.msPerOp).toFixed(1)} ms`;

function derive({ prompt, generated }: Values): PlaygroundView {
  const uncached = generationCost(prompt, generated, false);
  const cached = generationCost(prompt, generated, true);
  // Mesma escala nos dois gráficos, para a diferença de custo aparecer na altura das barras.
  const max = Math.max(...uncached.perToken);
  const series = (perToken: number[]) => perToken.map((value, index) => ({ label: String(index + 1), value }));

  const uncachedChart: ChartSpec = { piece: "chart", id: "uncached", kind: "line", series: series(uncached.perToken), max, color: "danger" };
  const cachedChart: ChartSpec = { piece: "chart", id: "cached", kind: "line", series: series(cached.perToken), max, color: "success" };
  const metrics: MetricsPanelSpec = {
    piece: "metrics-panel",
    id: "metrics",
    metrics: [
      { id: "uncached-total", label: content.metrics.uncachedTotal, value: formatOps(uncached.total), color: "danger" },
      { id: "cached-total", label: content.metrics.cachedTotal, value: formatOps(cached.total), color: "success" },
      { id: "uncached-time", label: content.metrics.uncachedTime, value: formatMs(uncached.total) },
      { id: "cached-time", label: content.metrics.cachedTime, value: formatMs(cached.total) },
      { id: "speedup", label: content.metrics.speedup, value: `${(uncached.total / cached.total).toFixed(1)}×` },
      { id: "memory", label: content.metrics.memory, value: String(cacheEntries(prompt, generated)) },
    ],
    highlight: "speedup",
  };

  return {
    pieces: [uncachedChart, cachedChart, metrics],
    labels: [content.labels.uncached, content.labels.cached],
    caption: content.caption(prompt, generated),
  };
}

/** Geração com e sem KV cache: operações por token e tempo simulado (LAB-01.1). */
export function KvCachePlayground() {
  return (
    <PlaygroundShell
      title={content.title}
      observe={content.observe}
      controls={CONTROLS}
      initialValues={content.initial}
      derive={derive}
    />
  );
}
