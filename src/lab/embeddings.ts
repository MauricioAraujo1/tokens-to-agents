// Similaridade de cosseno e vizinhos mais próximos num espaço de embeddings.

export type Embedding = readonly number[];

/** cos(a, b) = a · b / (|a| |b|): 1 = mesma direção, 0 = ortogonais, −1 = opostos. Vetor nulo dá 0. */
export function cosineSimilarity(a: Embedding, b: Embedding): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  a.forEach((value, index) => {
    dot += value * (b[index] ?? 0);
    normA += value * value;
    normB += (b[index] ?? 0) ** 2;
  });
  if (normA === 0 || normB === 0) return 0;
  return dot / Math.sqrt(normA * normB);
}

export interface Neighbor {
  id: string;
  similarity: number;
}

/** Os k pontos mais parecidos com a query pelo cosseno, do mais parecido para o menos; a query fica de fora. */
export function nearestByCosine(
  points: ReadonlyArray<{ id: string; vector: Embedding }>,
  queryId: string,
  k: number,
): Neighbor[] {
  const query = points.find((point) => point.id === queryId);
  if (!query) return [];
  return points
    .filter((point) => point.id !== queryId)
    .map((point) => ({ id: point.id, similarity: cosineSimilarity(query.vector, point.vector) }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, Math.max(0, k));
}
