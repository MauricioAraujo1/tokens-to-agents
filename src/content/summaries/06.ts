import { catalog } from "../catalog";
import type { LessonId, SummaryContent } from "../../types/content";

// Cheat sheet do módulo 06 (SUM-01.1). O diagrama é desenhado pelo <Scene> num passo único, e a folha
// tem estilo de impressão em A4 (SUM-01.2). As aulas linkadas saem do catálogo: as 12 do módulo, em ordem.

const lessons: LessonId[] = (catalog.find((module) => module.id === "06")?.lessons ?? []).map((lesson) => lesson.id);

const summary: SummaryContent = {
  module: "06",
  concepts: [
    "Embedding: um vetor denso de d números que representa o sentido de um texto. Textos parecidos ficam próximos, mesmo sem palavras em comum; detalhes como negação e números podem se perder.",
    "Modelo de embedding: encoder Transformer + pooling (média dos tokens, [CLS] ou último token) + normalização. Aprende com treino contrastivo em pares, usando os outros pares do lote como negativos (perda InfoNCE).",
    "Bi-encoder: pergunta e documento são codificados separados, e os documentos uma vez só. Siga o formato de entrada do modelo (prefixos como query: e passage:) e o limite de tokens; o excesso é cortado em silêncio.",
    "Espaço de embeddings: relativo ao modelo. Vetores de modelos diferentes não se comparam; trocar o modelo exige reindexar. Projeções 2D servem para olhar, e a anisotropia torna limiares fixos frágeis.",
    "Custo: memória = N × d × bytes. Dimensão e precisão (float32, float16, int8, binário) são as alavancas; embeddings Matryoshka podem ser cortados e precisam de renormalização.",
    "Métricas: cosseno (direção), produto escalar (direção × tamanho) e euclidiana (linha reta). Com vetores normalizados, as três dão o mesmo ranking. Use a métrica do treino do modelo.",
    "Busca exata: N produtos escalares e um heap de tamanho k; basta para bases pequenas e é o gabarito. Índices aproximados (IVF com nprobe, PQ com códigos de 1 byte, HNSW com ef_search) trocam recall por velocidade e memória.",
    "Banco vetorial: coleções, registros com id, vetor e payload, upsert, log de escrita, shards e réplicas. Filtros por metadados: pós-filtro (pode devolver menos que k), pré-filtro ou filtro dentro do índice; o filtro de tenant vem do servidor.",
  ],
  formulas: [
    "cos(a, b) = a · b ÷ (|a| × |b|); distância de cosseno = 1 − cos",
    "|a − b|² = 2 − 2·cos(a, b), para vetores normalizados",
    "a · b = |a| × |b| × cos(a, b)",
    "Memória = N × d × bytes por número",
    "InfoNCE = −ln [e^(sim(q, p⁺)/τ) ÷ Σ_j e^(sim(q, p_j)/τ)]",
    "recall@k = |top-k aproximado ∩ top-k exato| ÷ k",
    "Pós-filtro: candidatos ≈ k ÷ seletividade",
  ],
  pitfalls: [
    "Indexar com um modelo e consultar com outro: as distâncias perdem o sentido, e nada avisa.",
    "Mandar um documento inteiro para um modelo de limite curto: o fim é cortado e o vetor fica diluído.",
    "Usar um limiar fixo de cosseno copiado de outro modelo: o mesmo número quer dizer coisas diferentes.",
    "Configurar o índice com uma métrica diferente da usada no treino, sem normalizar os vetores.",
    "Pós-filtrar com um filtro seletivo e receber menos resultados que o pedido.",
    "Ajustar o índice sem medir recall contra a força bruta, ou medir só no dia da criação.",
  ],
  diagram: {
    kind: "pieces",
    layout: "single",
    pieces: [
      {
        id: "module-06",
        piece: "block-diagram",
        blocks: [
          { id: "docs", kind: "documents", label: "documentos", col: 0, row: 0 },
          { id: "model", kind: "llm", label: "modelo de embedding", col: 1, row: 0 },
          { id: "vectors", kind: "embedding", label: "vetores", col: 2, row: 0 },
          { id: "db", kind: "vector-db", label: "banco + índice", col: 3, row: 0 },
          { id: "user", kind: "user", label: "consulta", col: 1, row: 1 },
          { id: "search", kind: "retrieval", label: "filtro + top-k", col: 3, row: 1 },
        ],
        edges: [
          { from: "docs", to: "model" },
          { from: "model", to: "vectors", label: "mesmo modelo" },
          { from: "vectors", to: "db", label: "upsert" },
          { from: "user", to: "search", label: "vetor" },
          { from: "db", to: "search", label: "ANN" },
        ],
        active: "search",
      },
    ],
  },
  lessons,
};

export default summary;
