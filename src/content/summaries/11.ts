import { catalog } from "../catalog";
import type { LessonId, SummaryContent } from "../../types/content";

// Cheat sheet do módulo 11 (SUM-01.1). O diagrama é desenhado pelo <Scene> num passo único, e a folha
// tem estilo de impressão em A4 (SUM-01.2). As aulas linkadas saem do catálogo: as 14 do módulo, em ordem.

const lessons: LessonId[] = (catalog.find((module) => module.id === "11")?.lessons ?? []).map((lesson) => lesson.id);

const summary: SummaryContent = {
  module: "11",
  concepts: [
    "Fine-tuning continua o treino de um modelo pronto com milhares de exemplos, a mesma perda de próximo token e taxa de aprendizado bem menor que a do pré-treino. Ensina comportamento (formato, tom, tarefa estreita); fatos que mudam ficam com o RAG.",
    "Decida com medida: um conjunto de testes e um baseline com prompt antes de treinar. O ajuste compensa quando o comportamento não sai com prompt, há bons exemplos e o volume paga o treino e a manutenção.",
    "Dataset: conversas com papéis em JSONL, renderizadas pelo chat template do modelo, com tokens contados, divisão por grupo (atendimento, cliente, data) e cobertura de todas as intenções, inclusive recusas.",
    "Limpeza: duplicatas exatas por hash do texto normalizado, quase duplicatas por Jaccard de n-gramas (MinHash em escala), filtros de qualidade e checagem de contaminação por n-gramas do teste. Dados sintéticos (Self-Instruct) precisam de filtro de novidade, verificador e dados humanos na mistura.",
    "SFT: cross-entropy só nos tokens da resposta (rótulos −100 no prompt), packing das sequências, lote efetivo pela acumulação de gradiente e poucas épocas.",
    "LoRA congela W e treina B · A, com r · (d_in + d_out) parâmetros por matriz, escala α / r e B = 0 no início. Nas 7 lineares do Llama 2 7B com r = 16, são cerca de 40 milhões de parâmetros, 0,59% do modelo.",
    "QLoRA guarda a base em NF4 (níveis pelos quantis da normal), calcula em bf16, quantiza as escalas (double quantization) e pagina o otimizador. Um 7B cabe em cerca de 4,5 GB sem ativações; um 65B, numa GPU de 48 GB.",
    "Treino, avaliação e deploy: early stopping pela perda de validação, win rate às cegas nas duas ordens com intervalo de confiança, bateria de regressões, e no deploy fundir o adaptador ou servir vários sobre uma base, com canário e rollback.",
  ],
  formulas: [
    "LoRA: h = W · x + (α / r) · B · A · x; parâmetros por matriz = r · (d_in + d_out)",
    "Fusão: W' = W + (α / r) · B · A",
    "Ajuste completo com Adam em precisão mista ≈ 16 bytes por parâmetro (sem ativações)",
    "Absmax: s = q_max / max|w|, q = round(w · s), w' = q / s",
    "Double quantization: 8 / 64 + 32 / (64 · 256) ≈ 0,127 bit por peso, contra 32 / 64 = 0,5",
    "Win rate = (vitórias + empates / 2) / comparações; margem ±E pede n ≈ z² · p · (1 − p) / E²",
  ],
  pitfalls: [
    "Usar fine-tuning para ensinar fatos que mudam: o modelo inventa com confiança quando o fato muda.",
    "Treinar e servir com chat templates diferentes: o ajuste se perde em silêncio.",
    "Dividir treino e teste por linha quando há paráfrases ou o mesmo cliente: a avaliação vaza e fica otimista.",
    "Calcular a perda em todos os tokens: o modelo aprende a escrever as falas do usuário.",
    "Ficar com o último checkpoint em vez do melhor na validação: o overfitting vai para produção.",
    "Anunciar win rate de poucas dezenas de prompts sem intervalo, ou sem rodar regressões de segurança e conhecimento geral.",
  ],
  diagram: {
    kind: "pieces",
    layout: "single",
    pieces: [
      {
        id: "module-11",
        piece: "block-diagram",
        blocks: [
          { id: "data", kind: "documents", label: "dataset limpo", col: 0, row: 0 },
          { id: "base", kind: "llm", label: "base nf4", col: 0, row: 1 },
          { id: "train", kind: "memory", label: "lora / qlora", col: 1, row: 0.5 },
          { id: "eval", kind: "eval", label: "validação e win rate", col: 2, row: 0.5 },
          { id: "serve", kind: "server", label: "base + adaptadores", col: 3, row: 0.5 },
        ],
        edges: [
          { from: "data", to: "train", label: "sft" },
          { from: "base", to: "train", label: "congelada" },
          { from: "train", to: "eval", label: "melhor checkpoint" },
          { from: "eval", to: "serve", label: "aprovado" },
        ],
        active: "train",
      },
    ],
  },
  lessons,
};

export default summary;
