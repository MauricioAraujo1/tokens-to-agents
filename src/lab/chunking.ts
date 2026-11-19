// Divisão de um texto em chunks de tamanho fixo com overlap, contados em palavras.

export interface Chunk {
  /** Índice da primeira palavra do chunk no texto. */
  start: number;
  words: string[];
  /** Quantas palavras do começo do chunk repetem o fim do chunk anterior. */
  overlap: number;
}

export type ChunkingResult = { ok: true; chunks: Chunk[] } | { ok: false; error: "overlap-not-smaller-than-size" };

export function splitIntoWords(text: string): string[] {
  return text.split(/\s+/).filter((word) => word !== "");
}

/**
 * Janela deslizante: cada chunk tem até `size` palavras e começa `size - overlap` palavras depois do anterior.
 * Para no chunk que chega ao fim do texto. Overlap igual ou maior que o tamanho não anda, então é rejeitado.
 */
export function chunkWords(words: readonly string[], size: number, overlap: number): ChunkingResult {
  if (overlap >= size) return { ok: false, error: "overlap-not-smaller-than-size" };

  const stride = size - overlap;
  const chunks: Chunk[] = [];
  for (let start = 0; start < words.length; start += stride) {
    chunks.push({ start, words: words.slice(start, start + size), overlap: start === 0 ? 0 : overlap });
    if (start + size >= words.length) break;
  }
  return { ok: true, chunks };
}
