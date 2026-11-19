export interface TokenCandidate {
  token: string;
  logit: number;
}

export interface SamplingParams {
  temperature: number;
  topK: number;
  topP: number;
}

export type SamplingCut = "top-k" | "top-p";

export interface TokenProbability {
  token: string;
  probability: number;
  cumulative: number;
  isKept: boolean;
  isLastKept: boolean;
  cutBy?: SamplingCut;
}

export function computeDistribution(candidates: TokenCandidate[], params: SamplingParams): TokenProbability[] {
  if (candidates.length === 0) {
    return [];
  }

  const ordered = [...candidates].sort((left, right) => right.logit - left.logit);
  const probabilities = computeProbabilities(ordered, params.temperature);
  let cumulative = 0;
  let lastKeptIndex = -1;

  const distribution = ordered.map((candidate, index): TokenProbability => {
    const cumulativeBefore = cumulative;
    cumulative += probabilities[index];
    const cutBy: SamplingCut | undefined =
      index >= params.topK ? "top-k" : index > 0 && cumulativeBefore >= params.topP ? "top-p" : undefined;

    if (!cutBy) {
      lastKeptIndex = index;
    }

    return {
      token: candidate.token,
      probability: probabilities[index],
      cumulative,
      isKept: cutBy === undefined,
      isLastKept: false,
      cutBy,
    };
  });

  return distribution.map((entry, index) => (index === lastKeptIndex ? { ...entry, isLastKept: true } : entry));
}

function computeProbabilities(ordered: TokenCandidate[], temperature: number): number[] {
  if (temperature <= 0) {
    return ordered.map((_, index) => (index === 0 ? 1 : 0));
  }

  const maxLogit = ordered[0].logit;
  const weights = ordered.map((candidate) => Math.exp((candidate.logit - maxLogit) / temperature));
  const total = weights.reduce((sum, weight) => sum + weight, 0);

  return weights.map((weight) => weight / total);
}

export function sampleToken(distribution: TokenProbability[], random: number): string | undefined {
  const kept = distribution.filter((entry) => entry.isKept);
  const keptTotal = kept.reduce((sum, entry) => sum + entry.probability, 0);

  if (kept.length === 0 || keptTotal === 0) {
    return undefined;
  }

  let threshold = Math.min(Math.max(random, 0), 0.999999) * keptTotal;

  for (const entry of kept) {
    threshold -= entry.probability;

    if (threshold < 0) {
      return entry.token;
    }
  }

  return kept[kept.length - 1].token;
}
