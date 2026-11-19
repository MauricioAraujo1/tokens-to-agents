import type { ModuleSummary } from "../types/practice";

export const MODULE_SUMMARIES: ModuleSummary[] = [
  {
    moduleId: "module-03",
    pipeline: [
      { kind: "box", box: { label: "texto", tone: "default" } },
      { kind: "box", box: { label: "tokens (BPE)", tone: "default" } },
      { kind: "box", box: { label: "embedding + posição", tone: "default" } },
      {
        kind: "repeat",
        boxes: [
          { label: "multi-head attention", tone: "module" },
          { label: "FFN", tone: "default" },
        ],
        repeatLabel: "× N",
      },
      { kind: "box", box: { label: "logits → próximo token", tone: "brand" } },
    ],
    concepts: [
      "Token: pedaço de texto que o modelo enxerga. O BPE junta os pares mais frequentes até fechar o vocabulário.",
      "Embedding: vetor que representa um token. A posição entra somada ou rotacionada.",
      "Self-attention: cada token mistura informação dos outros, com pesos calculados a partir de Q e K.",
      "Multi-head: várias atenções em paralelo, cada uma num subespaço de dimensão d_model / h.",
      "Decoder: máscara causal, só olha para o passado. Encoder: vê a sequência toda.",
    ],
    formulas: [
      { expression: "Attention(Q,K,V) = softmax(Q·Kᵀ / √d_k) · V", note: "custo da atenção ∝ n² · d   (n = tokens)" },
    ],
    pitfalls: [
      "Dividir por √d_k não normaliza nada: só evita que o softmax sature.",
      "Mais cabeças não multiplica o custo, porque cada uma trabalha com d_model / h.",
      "Dobrar o contexto quadruplica a conta da atenção.",
    ],
    lessonIds: ["03-01", "03-02", "03-03"],
  },
  {
    moduleId: "module-08",
    pipeline: [
      { kind: "box", box: { label: "pergunta", tone: "default" } },
      { kind: "box", box: { label: "embedding", tone: "default" } },
      {
        kind: "repeat",
        boxes: [
          { label: "busca vetorial", tone: "module" },
          { label: "top-k", tone: "default" },
        ],
        repeatLabel: "+ filtros",
      },
      { kind: "box", box: { label: "contexto", tone: "default" } },
      { kind: "box", box: { label: "LLM → resposta com fontes", tone: "brand" } },
    ],
    concepts: [
      "RAG: recupera trechos da sua base e os injeta no prompt, sem re-treinar o modelo.",
      "Chunking: divide documentos em trechos com sentido próprio, com sobreposição para não cortar ideias.",
      "Busca vetorial: compara o vetor da pergunta com os vetores dos chunks, em geral por cosseno.",
      "Top-k e limiar: definem quantos trechos entram e o score mínimo para entrar.",
      "Grounding: a resposta cita as fontes usadas para o usuário poder verificar.",
    ],
    formulas: [
      { expression: "cos(q, d) = (q · d) / (‖q‖ · ‖d‖)", note: "1 = mesma direção · 0 = sem relação" },
      { expression: "tokens do prompt = instruções + pergunta + k · tamanho do chunk", note: "precisa caber na janela de contexto" },
    ],
    pitfalls: [
      "Trocar o modelo de embedding exige reindexar a base inteira.",
      "K alto não é sinônimo de resposta melhor: aumenta ruído e custo.",
      "Grounding reduz, mas não elimina, alucinações.",
    ],
    lessonIds: ["08-01", "08-02", "08-03", "08-04", "08-05", "08-06", "08-07", "08-08"],
  },
];
