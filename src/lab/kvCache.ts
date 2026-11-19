// Custo da geração autorregressiva com e sem KV cache, em operações simuladas.
// Unidades: projetar K e V de um token = 1 operação; comparar uma query com uma key = 1 operação.
// O prefill do prompt custa o mesmo nos dois casos e fica de fora: conta só a geração.

/**
 * Operações para gerar um token com `context` tokens na sequência.
 * Sem cache, o modelo reprocessa a sequência inteira: projeta os `L` tokens e compara as `L` queries com as
 * `L` keys (L + L²). Com cache, projeta só o token novo e compara a query dele com as `L` keys guardadas (1 + L).
 */
export function opsPerToken(context: number, cached: boolean): number {
  return cached ? 1 + context : context + context * context;
}

export interface GenerationCost {
  /** Operações de cada token gerado, do 1º ao último. */
  perToken: number[];
  total: number;
}

/** O token gerado no passo t (a partir de 1) vê `prompt + t` tokens na sequência. */
export function generationCost(prompt: number, generated: number, cached: boolean): GenerationCost {
  const perToken = Array.from({ length: generated }, (_, index) => opsPerToken(prompt + index + 1, cached));
  return { perToken, total: perToken.reduce((sum, ops) => sum + ops, 0) };
}

/** Vetores guardados no cache ao fim da geração: uma key e um value por token, por camada. */
export function cacheEntries(prompt: number, generated: number): number {
  return 2 * (prompt + generated);
}
