// Atenção de produto escalar com escala (Vaswani et al., 2017), para uma query:
// pontuação = q · k / √d, pesos = softmax das pontuações, saída = Σ peso × v.

export type Vector = readonly number[];

export function dot(a: Vector, b: Vector): number {
  return a.reduce((total, value, index) => total + value * (b[index] ?? 0), 0);
}

export function softmax(values: readonly number[]): number[] {
  const max = Math.max(...values);
  const exps = values.map((value) => Math.exp(value - max));
  const sum = exps.reduce((total, value) => total + value, 0);
  return exps.map((value) => value / sum);
}

export interface AttentionRow {
  /** q · k / √d para cada key. */
  scores: number[];
  /** Softmax das pontuações: somam 1. */
  weights: number[];
  /** Soma dos valores ponderada pelos pesos. */
  output: number[];
}

export function attentionRow(query: Vector, keys: readonly Vector[], values: readonly Vector[]): AttentionRow {
  const scale = Math.sqrt(query.length);
  const scores = keys.map((key) => dot(query, key) / scale);
  const weights = softmax(scores);
  const output = (values[0] ?? []).map((_, dim) =>
    values.reduce((total, value, index) => total + weights[index] * value[dim], 0),
  );
  return { scores, weights, output };
}
