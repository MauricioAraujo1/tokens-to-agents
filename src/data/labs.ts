import type { TokenCandidate } from "../lib/sampling";
import type { GuidedProject, PlaygroundDefinition, PlaygroundId } from "../types/practice";

export const DEFAULT_PLAYGROUND_ID: PlaygroundId = "sampling";

export const PLAYGROUNDS: PlaygroundDefinition[] = [
  { id: "bpe-tokenizer", title: "Tokenizador BPE", isAvailable: false },
  { id: "sampling", title: "Temperatura e amostragem", isAvailable: true },
  { id: "attention-weights", title: "Pesos de attention", isAvailable: false },
  { id: "embedding-space", title: "Espaço de embeddings", isAvailable: false },
  { id: "chunking", title: "Chunk size e overlap", isAvailable: false },
  { id: "bm25-vs-vector", title: "BM25 vs. busca vetorial", isAvailable: false },
  { id: "kv-cache", title: "KV cache e latência", isAvailable: false },
  { id: "agent-loop", title: "Loop de agente", isAvailable: false },
];

export const GUIDED_PROJECTS: GuidedProject[] = [
  { number: "01", title: "AI Chat Application" },
  { number: "02", title: "RAG Knowledge Assistant" },
  { number: "03", title: "Multi-Agent System" },
  { number: "04", title: "Fine-tuned LLM" },
  { number: "05", title: "Production AI Platform" },
];

export const SAMPLING_LESSON_ID = "04-02";

export const SAMPLING_PROMPT = "O céu hoje está";

export const SAMPLING_CANDIDATES: TokenCandidate[] = [
  { token: "azul", logit: 0 },
  { token: "nublado", logit: -0.59 },
  { token: "limpo", logit: -1.075 },
  { token: "escuro", logit: -1.4 },
  { token: "lindo", logit: -1.776 },
  { token: "cinza", logit: -1.954 },
  { token: "quente", logit: -2.739 },
  { token: "frio", logit: -3.063 },
  { token: "chuvoso", logit: -3.618 },
];

export const SAMPLING_DEFAULTS = { temperature: 0.8, topK: 40, topP: 0.95 } as const;

export const SAMPLING_LIMITS = {
  temperature: { min: 0, max: 2, step: 0.1 },
  topK: { min: 1, max: 100, step: 1 },
  topP: { min: 0.05, max: 1, step: 0.01 },
} as const;

export const SAMPLING_HISTORY_LIMIT = 8;
