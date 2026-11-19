// Byte Pair Encoding (Sennrich et al., 2016) em versão didática: os símbolos são caracteres Unicode,
// e cada palavra (separada por espaço) é tokenizada sozinha.

/** Par de símbolos que vira um token só. */
export type Merge = readonly [string, string];

export function splitWords(text: string): string[] {
  return text.split(/\s+/).filter((word) => word !== "");
}

/** Junta, da esquerda para a direita e sem sobreposição, toda ocorrência do par na palavra. */
export function mergePair(symbols: readonly string[], [left, right]: Merge): string[] {
  const merged: string[] = [];
  for (let index = 0; index < symbols.length; index += 1) {
    if (symbols[index] === left && symbols[index + 1] === right) {
      merged.push(left + right);
      index += 1;
    } else {
      merged.push(symbols[index]);
    }
  }
  return merged;
}

/**
 * Aprende até `count` merges no corpus: a cada rodada, o par vizinho mais frequente vira um token.
 * Empate fica com o par que aparece primeiro no corpus. Para quando nenhum par se repete.
 */
export function trainBpe(corpus: string, count: number): Merge[] {
  let words = splitWords(corpus).map((word) => [...word]);
  const merges: Merge[] = [];

  while (merges.length < count) {
    const counts = new Map<string, { pair: Merge; total: number }>();
    for (const word of words) {
      for (let index = 0; index < word.length - 1; index += 1) {
        const key = `${word[index]}\u0000${word[index + 1]}`;
        const entry = counts.get(key);
        if (entry) entry.total += 1;
        else counts.set(key, { pair: [word[index], word[index + 1]], total: 1 });
      }
    }

    let best: { pair: Merge; total: number } | undefined;
    for (const entry of counts.values()) if (!best || entry.total > best.total) best = entry;
    if (!best || best.total < 2) break;

    const pair = best.pair;
    merges.push(pair);
    words = words.map((word) => mergePair(word, pair));
  }

  return merges;
}

export interface BpeStep {
  merge: Merge;
  token: string;
  /** Quantas vezes o merge juntou símbolos no texto do aluno. */
  occurrences: number;
}

export interface BpeResult {
  /** Tokens de cada palavra depois dos merges aplicados. */
  words: string[][];
  steps: BpeStep[];
}

/** Aplica os `steps` primeiros merges, na ordem em que foram aprendidos, ao texto. */
export function applyMerges(text: string, merges: readonly Merge[], steps = merges.length): BpeResult {
  let words = splitWords(text).map((word) => [...word]);
  const applied: BpeStep[] = [];

  for (const merge of merges.slice(0, Math.max(0, steps))) {
    const before = words.reduce((total, word) => total + word.length, 0);
    words = words.map((word) => mergePair(word, merge));
    const after = words.reduce((total, word) => total + word.length, 0);
    applied.push({ merge, token: merge[0] + merge[1], occurrences: before - after });
  }

  return { words, steps: applied };
}
