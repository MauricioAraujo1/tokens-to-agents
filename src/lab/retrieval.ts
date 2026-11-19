// Busca lexical (BM25), busca vetorial (cosseno) e a fusão das duas por Reciprocal Rank Fusion.
import { normalizeText } from "../lib/utils";
import { cosineSimilarity } from "./embeddings";

/** Palavras sem acento e em minúsculas, sem as stopwords. */
export function tokenize(text: string, stopwords: ReadonlySet<string> = new Set()): string[] {
  return normalizeText(text)
    .split(/[^a-z0-9]+/)
    .filter((word) => word !== "" && !stopwords.has(word));
}

export interface Bm25Params {
  k1: number;
  b: number;
}

export const BM25_DEFAULTS: Bm25Params = { k1: 1.2, b: 0.75 };

/**
 * BM25 de cada documento para a consulta:
 * Σ IDF(q) · f(q, D) · (k1 + 1) / (f(q, D) + k1 · (1 − b + b · |D| / avgdl)),
 * com IDF(q) = ln((N − n(q) + 0.5) / (n(q) + 0.5) + 1), a variante do Lucene, que nunca fica negativa.
 */
export function bm25Scores(
  documents: ReadonlyArray<readonly string[]>,
  query: readonly string[],
  { k1, b }: Bm25Params = BM25_DEFAULTS,
): number[] {
  const total = documents.length;
  const avgdl = documents.reduce((sum, document) => sum + document.length, 0) / Math.max(1, total);
  const terms = [...new Set(query)];

  return documents.map((document) =>
    terms.reduce((score, term) => {
      const frequency = document.filter((word) => word === term).length;
      if (frequency === 0) return score;
      const containing = documents.filter((other) => other.includes(term)).length;
      const idf = Math.log((total - containing + 0.5) / (containing + 0.5) + 1);
      const norm = 1 - b + (b * document.length) / avgdl;
      return score + (idf * frequency * (k1 + 1)) / (frequency + k1 * norm);
    }, 0),
  );
}

/** Embedding de brinquedo: soma dos vetores de conceito das palavras conhecidas. */
export function embed(words: readonly string[], concepts: Readonly<Record<string, readonly number[]>>, dims: number): number[] {
  const vector = new Array<number>(dims).fill(0);
  for (const word of words) concepts[word]?.forEach((value, dim) => (vector[dim] += value));
  return vector;
}

export function vectorScores(documentVectors: ReadonlyArray<readonly number[]>, queryVector: readonly number[]): number[] {
  return documentVectors.map((vector) => cosineSimilarity(vector, queryVector));
}

/** Índices dos documentos recuperados (pontuação > 0), do maior para o menor; empate fica na ordem do corpus. */
export function rankByScore(scores: readonly number[]): number[] {
  return scores
    .map((score, index) => ({ score, index }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.index);
}

export interface FusedResult {
  document: number;
  score: number;
}

/**
 * Reciprocal Rank Fusion (Cormack et al., 2009): cada ranking soma 1 / (k + posição), com posição a partir
 * de 1. Documento fora de um ranking não ganha nada dele. Resultado do maior para o menor.
 */
export function reciprocalRankFusion(rankings: ReadonlyArray<readonly number[]>, k: number): FusedResult[] {
  const scores = new Map<number, number>();
  for (const ranking of rankings) {
    ranking.forEach((document, position) => scores.set(document, (scores.get(document) ?? 0) + 1 / (k + position + 1)));
  }
  return [...scores.entries()]
    .map(([document, score]) => ({ document, score }))
    .sort((a, b) => b.score - a.score || a.document - b.document);
}
