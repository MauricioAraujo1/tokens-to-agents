// Conteúdo do playground de temperatura e amostragem. Conteúdo didático em PT-BR (AD-003).

export const samplingContent = {
  title: "Temperatura e amostragem",
  observe:
    "Temperatura baixa concentra a probabilidade no token mais provável e temperatura alta espalha a distribuição. Com temperatura 0, o modelo escolhe sempre o primeiro. O top-k fica só com os k tokens mais prováveis; o top-p fica com o menor grupo de tokens cuja soma acumulada chega a p e descarta o resto. O sorteio acontece entre os que sobraram.",
  /** Caixa "prompt ›" acima das barras, como no preview 09. */
  promptLabel: "prompt",
  prompt: "O céu hoje está",
  caption: (temperature: number, topK: number, topP: number) =>
    `Probabilidade do próximo token (temperatura ${temperature}, top-k ${topK}, top-p ${topP})`,
  temperatureLabel: "Temperatura",
  temperatureHint: "0 = determinístico · 2 = muito aleatório",
  topKLabel: "Top-k",
  topKHint: "considera só os k tokens mais prováveis",
  topPLabel: "Top-p",
  topPHint: "menor grupo com soma ≥ p",
  draw: "Sortear um token",
  drawnTitle: "Sorteados",
  drawnEmpty: "Nenhum token sorteado ainda.",
  tableLabel: "Distribuição do próximo token",
  /** Texto ao lado do valor de cada barra: o acumulado, e no último que entra, o porquê. */
  cumulative: (value: string) => `acum. ${value}`,
  lastKept: (topP: number) => `← passa de ${topP}: último que entra`,
  cutTopK: "cortado pelo top-k",
  cutTopP: "cortado pelo top-p",
  /** Quantos sorteios a lista guarda. */
  drawnLimit: 12,
  /** Distribuição-base do próximo token (temperatura 1). Soma 1. */
  distribution: [
    { token: "azul", probability: 0.4 },
    { token: "nublado", probability: 0.2 },
    { token: "limpo", probability: 0.12 },
    { token: "escuro", probability: 0.08 },
    { token: "lindo", probability: 0.06 },
    { token: "cinza", probability: 0.05 },
    { token: "claro", probability: 0.04 },
    { token: "chuvoso", probability: 0.03 },
    { token: "frio", probability: 0.01 },
    { token: "quente", probability: 0.01 },
  ],
  /** Valores iniciais do preview 09: top-k 40, o padrão comum das bibliotecas, não corta nenhum dos 10. */
  initial: { temperature: 0.8, topK: 40, topP: 0.95 },
  /** Teto do slider de top-k: acima do número de tokens, para o valor padrão caber. */
  topKMax: 100,
};
