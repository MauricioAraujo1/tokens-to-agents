// Amostragem do próximo token: temperatura, depois top-k, depois top-p (a ordem do `generate` do
// Hugging Face Transformers), e o sorteio sobre o que sobrou.

const EPSILON = 1e-9;

export interface SamplingParams {
  /** 0 = guloso (sempre o mais provável); acima de 1 espalha a distribuição. */
  temperature: number;
  /** Mantém só os k tokens mais prováveis. */
  topK: number;
  /** Mantém o menor grupo de tokens mais prováveis cuja soma chega a p. */
  topP: number;
}

export interface SampledToken {
  token: string;
  /** Probabilidade depois da temperatura, antes dos cortes. */
  probability: number;
  /** Soma acumulada na ordem do mais provável para o menos provável. */
  cumulative: number;
  /** Por que o token saiu do sorteio, se saiu. */
  cut: "top-k" | "top-p" | null;
  /** Probabilidade no sorteio: renormalizada entre os que ficaram, 0 nos cortados. */
  final: number;
}

/** Softmax de `logits / T`. Com T = 0, toda a massa vai para o maior logit (o primeiro, se empatar). */
export function softmaxWithTemperature(logits: readonly number[], temperature: number): number[] {
  if (temperature <= 0) {
    const top = logits.indexOf(Math.max(...logits));
    return logits.map((_, index) => (index === top ? 1 : 0));
  }
  const scaled = logits.map((logit) => logit / temperature);
  const max = Math.max(...scaled);
  const exps = scaled.map((value) => Math.exp(value - max));
  const sum = exps.reduce((total, value) => total + value, 0);
  return exps.map((value) => value / sum);
}

/**
 * Distribuição do sorteio, na ordem do mais provável para o menos provável. Os logits são `ln(p)` das
 * probabilidades-base, então com T = 1 a distribuição volta a ser a base.
 */
export function samplingDistribution(
  base: ReadonlyArray<{ token: string; probability: number }>,
  { temperature, topK, topP }: SamplingParams,
): SampledToken[] {
  const probabilities = softmaxWithTemperature(
    base.map((entry) => Math.log(entry.probability)),
    temperature,
  );
  const order = base.map((_, index) => index).sort((a, b) => probabilities[b] - probabilities[a]);

  let cumulative = 0;
  let reachedP = false;
  const rows = order.map((index, rank) => {
    const probability = probabilities[index];
    cumulative += probability;
    const cut: SampledToken["cut"] = rank >= topK ? "top-k" : reachedP ? "top-p" : null;
    // O token que faz a soma chegar a p ainda entra; os seguintes saem.
    if (cumulative >= topP - EPSILON) reachedP = true;
    return { token: base[index].token, probability, cumulative, cut, final: 0 };
  });

  const keptMass = rows.reduce((total, row) => (row.cut === null ? total + row.probability : total), 0);
  return rows.map((row) => ({ ...row, final: row.cut === null && keptMass > 0 ? row.probability / keptMass : 0 }));
}

/** Sorteia um token pela probabilidade `final`, com `random()` em [0, 1). */
export function sampleToken(distribution: readonly SampledToken[], random: () => number): string {
  const draw = random();
  let cumulative = 0;
  for (const row of distribution) {
    if (row.final === 0) continue;
    cumulative += row.final;
    if (draw < cumulative) return row.token;
  }
  // Arredondamento: a soma pode ficar um fio abaixo de 1.
  return [...distribution].reverse().find((row) => row.final > 0)?.token ?? distribution[0].token;
}

/** Gerador pseudoaleatório com seed (mulberry32): a mesma seed repete a mesma sequência. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
