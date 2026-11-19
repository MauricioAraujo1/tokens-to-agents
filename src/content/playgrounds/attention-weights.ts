// Conteúdo do playground de pesos de attention. Conteúdo didático em PT-BR (AD-003).
// Vetores feitos à mão, com 3 dimensões: [animal, ação, palavra de função]. Os valores V são os
// próprios vetores K, para a soma ponderada ficar legível.

export const attentionWeightsContent = {
  title: "Pesos de attention",
  observe:
    "A query compara o seu vetor com a key de cada token (produto escalar dividido por √d). O softmax transforma essas pontuações em pesos que somam 1, e a saída é a soma dos valores ponderada por esses pesos. Escolha “fugiu” e veja qual animal recebe mais peso: é assim que o modelo resolve quem fugiu.",
  queryLabel: "Token de query",
  queryHint: "o token que pergunta",
  caption: (token: string) => `Pesos de attention da query “${token}” sobre a frase`,
  tableLabel: (token: string) => `Pontuações e pesos da query “${token}”`,
  columns: { key: "Key", score: "q·k/√d", weight: "Peso" },
  weightSum: (sum: string) => `Soma dos pesos: ${sum}`,
  output: (vector: string) => `Saída (soma ponderada dos valores): [${vector}]`,
  initialQuery: 6,
  tokens: [
    { token: "a", q: [1, 0, 0.3], k: [0, 0, 1] },
    { token: "gata", q: [0.2, 1.2, 0.5], k: [1.5, 0, 0.2] },
    { token: "viu", q: [1.4, 0, 0], k: [0, 1.5, 0] },
    { token: "um", q: [1, 0, 0.2], k: [0, 0, 1] },
    { token: "rato", q: [0.2, 1.2, 0.4], k: [1.6, 0.2, 0.2] },
    { token: "e", q: [0, 1, 0.3], k: [0, 0.3, 0.6] },
    { token: "fugiu", q: [1.3, 0.3, 0], k: [0.2, 1.4, 0] },
  ],
};
