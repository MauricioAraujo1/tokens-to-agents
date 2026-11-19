// Conteúdo do playground de KV cache e latência. Conteúdo didático em PT-BR (AD-003).

export const kvCacheContent = {
  title: "KV cache e latência",
  observe:
    "Sem cache, cada token novo obriga o modelo a reprocessar a sequência inteira: o custo por token cresce com o quadrado do contexto. Com o KV cache, as keys e os values dos tokens anteriores ficam guardados, e o token novo só calcula a própria projeção e compara a sua query com as keys guardadas: o custo por token cresce em linha reta. O preço é memória, que cresce com o tamanho da sequência.",
  promptLabel: "Tokens do prompt",
  promptHint: "contexto antes da geração",
  generatedLabel: "Tokens gerados",
  generatedHint: "quantos tokens o modelo escreve",
  caption: (prompt: number, generated: number) =>
    `Operações por token gerado, com ${prompt} tokens de prompt e ${generated} gerados (prefill fora da conta)`,
  labels: { uncached: "Sem KV cache", cached: "Com KV cache" },
  metrics: {
    uncachedTotal: "Ops sem cache",
    cachedTotal: "Ops com cache",
    uncachedTime: "Tempo sem cache",
    cachedTime: "Tempo com cache",
    speedup: "Aceleração",
    memory: "Vetores no cache",
  },
  /** Tempo simulado de uma operação, em milissegundos. */
  msPerOp: 0.02,
  initial: { prompt: 16, generated: 16 },
  limits: { prompt: { min: 1, max: 64 }, generated: { min: 1, max: 24 } },
};
