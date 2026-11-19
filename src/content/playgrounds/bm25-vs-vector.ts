// Conteúdo do playground BM25 vs. busca vetorial. Conteúdo didático em PT-BR (AD-003).
// Os "embeddings" são de brinquedo: cada palavra conhecida soma um vetor de conceito com 5 dimensões
// [veículo, manutenção, pneu, comida, economia]. Palavras fora do dicionário não contam na busca vetorial.

export const bm25VsVectorContent = {
  title: "BM25 vs. busca vetorial",
  observe:
    "O BM25 só pontua palavras idênticas às da consulta, então “trocar” não acha “troca”, e “carro” não acha “automóvel”. A busca vetorial compara significados e acha os sinônimos, mas pode trazer documentos só vagamente parecidos. O RRF soma 1 / (k + posição) de cada ranking: quem aparece bem nos dois sobe, sem precisar comparar pontuações de escalas diferentes.",
  queryLabel: "Consulta",
  queryHint: "palavras sem acento e sem stopwords",
  kLabel: "k do RRF",
  kHint: "quanto maior, menos peso para o 1º lugar",
  caption: (query: string, documents: number) => `Consulta “${query}” nos ${documents} documentos do corpus`,
  labels: { bm25: "BM25", vector: "Vetorial (cosseno)", rrf: "Fusão RRF" },
  tableLabel: "Rankings lado a lado",
  columns: { document: "Documento", bm25: "BM25", vector: "Vetorial", rrf: "RRF" },
  notRetrieved: "—",
  emptyQuery: "Digite uma consulta com pelo menos uma palavra que não seja stopword.",
  initial: { query: "trocar óleo do carro", k: 60 },
  maxLength: 60,
  stopwords: ["a", "as", "o", "os", "e", "de", "do", "da", "dos", "das", "no", "na", "em", "para", "como", "nao", "um", "uma", "que", "com"],
  documents: [
    "Como trocar o pneu do carro",
    "Manual de manutenção do automóvel e troca de óleo",
    "Receita de bolo de cenoura",
    "Carro elétrico não precisa de troca de óleo",
    "Dicas para economizar combustível no veículo",
  ],
  dims: 5,
  concepts: {
    carro: [1, 0, 0, 0, 0],
    automovel: [1, 0, 0, 0, 0],
    veiculo: [1, 0, 0, 0, 0],
    eletrico: [0.6, 0, 0, 0, 0.4],
    trocar: [0, 1, 0, 0, 0],
    troca: [0, 1, 0, 0, 0],
    oleo: [0, 1, 0, 0, 0],
    manutencao: [0, 1, 0, 0, 0],
    manual: [0, 0.3, 0, 0, 0],
    pneu: [0.3, 0, 1, 0, 0],
    receita: [0, 0, 0, 1, 0],
    bolo: [0, 0, 0, 1, 0],
    cenoura: [0, 0, 0, 1, 0],
    economizar: [0, 0, 0, 0, 1],
    combustivel: [0, 0, 0, 0, 1],
    economico: [0, 0, 0, 0, 1],
  } as Record<string, number[]>,
};
