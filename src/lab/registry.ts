import type { ComponentType } from "react";
import { agentLoopContent } from "../content/playgrounds/agent-loop";
import { attentionWeightsContent } from "../content/playgrounds/attention-weights";
import { bm25VsVectorContent } from "../content/playgrounds/bm25-vs-vector";
import { bpeTokenizerContent } from "../content/playgrounds/bpe-tokenizer";
import { chunkingContent } from "../content/playgrounds/chunking";
import { embeddingSpaceContent } from "../content/playgrounds/embedding-space";
import { kvCacheContent } from "../content/playgrounds/kv-cache";
import { samplingContent } from "../content/playgrounds/sampling";
import { AgentLoopPlayground } from "./playgrounds/agent-loop";
import { AttentionWeightsPlayground } from "./playgrounds/attention-weights";
import { Bm25VsVectorPlayground } from "./playgrounds/bm25-vs-vector";
import { BpeTokenizerPlayground } from "./playgrounds/bpe-tokenizer";
import { ChunkingPlayground } from "./playgrounds/chunking";
import { EmbeddingSpacePlayground } from "./playgrounds/embedding-space";
import { KvCachePlayground } from "./playgrounds/kv-cache";
import { SamplingPlayground } from "./playgrounds/sampling";

export interface PlaygroundEntry {
  /** Segmento de `/lab/playground/:id`. */
  id: string;
  title: string;
  Component: ComponentType;
}

/** Os playgrounds do Laboratório (LAB-01.1), na ordem da lista. */
export const playgrounds: PlaygroundEntry[] = [
  { id: "bpe-tokenizer", title: bpeTokenizerContent.title, Component: BpeTokenizerPlayground },
  { id: "sampling", title: samplingContent.title, Component: SamplingPlayground },
  { id: "attention-weights", title: attentionWeightsContent.title, Component: AttentionWeightsPlayground },
  { id: "embedding-space", title: embeddingSpaceContent.title, Component: EmbeddingSpacePlayground },
  { id: "chunking", title: chunkingContent.title, Component: ChunkingPlayground },
  { id: "bm25-vs-vector", title: bm25VsVectorContent.title, Component: Bm25VsVectorPlayground },
  { id: "kv-cache", title: kvCacheContent.title, Component: KvCachePlayground },
  { id: "agent-loop", title: agentLoopContent.title, Component: AgentLoopPlayground },
];
