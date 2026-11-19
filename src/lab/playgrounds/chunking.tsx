import { PlaygroundShell, type PlaygroundControl, type PlaygroundView } from "../../components/lab/PlaygroundShell";
import { chunkingContent as content } from "../../content/playgrounds/chunking";
import type { PipelineSpec } from "../../scene/types";
import { chunkWords, splitIntoWords } from "../chunking";

type Values = { size: number; overlap: number };

const WORDS = splitIntoWords(content.text);

const CONTROLS: ReadonlyArray<PlaygroundControl<Values>> = [
  { kind: "slider", id: "size", label: content.sizeLabel, hint: content.sizeHint, step: 1, ...content.limits.size },
  { kind: "slider", id: "overlap", label: content.overlapLabel, hint: content.overlapHint, step: 1, ...content.limits.overlap },
];

function derive({ size, overlap }: Values): PlaygroundView {
  const result = chunkWords(WORDS, size, overlap);
  if (!result.ok) return { pieces: [], error: content.overlapError };

  const { chunks } = result;
  const pipeline: PipelineSpec = {
    piece: "pipeline",
    stages: [
      { id: "document", label: content.stages.document(WORDS.length) },
      { id: "splitter", label: content.stages.splitter(size, overlap) },
      { id: "chunks", label: content.stages.chunks(chunks.length) },
      { id: "embeddings", label: content.stages.embeddings },
    ],
    active: "chunks",
    done: ["document", "splitter"],
  };

  return {
    pieces: [pipeline],
    caption: content.caption(WORDS.length, chunks.length, size, overlap),
    details: (
      <ol aria-label={content.chunksLabel} className="flex flex-col gap-2">
        {chunks.map((chunk, index) => (
          <li key={chunk.start} data-chunk={index + 1} className="rounded-md border border-line-soft px-3 py-2">
            <p className="text-[11px] text-ink-muted">
              {content.chunk(index + 1, chunk.start + 1, chunk.start + chunk.words.length)}
            </p>
            <p className="font-sans text-sm">
              {chunk.overlap > 0 && (
                <mark data-overlap="true" className="bg-accent-brand-soft text-ink-primary">
                  {chunk.words.slice(0, chunk.overlap).join(" ")}
                </mark>
              )}
              {chunk.overlap > 0 && " "}
              {chunk.words.slice(chunk.overlap).join(" ")}
            </p>
          </li>
        ))}
      </ol>
    ),
  };
}

/** Texto de exemplo dividido em chunks pelo tamanho e pelo overlap, com a contagem (LAB-01.1). */
export function ChunkingPlayground() {
  return (
    <PlaygroundShell
      title={content.title}
      observe={content.observe}
      controls={CONTROLS}
      initialValues={content.initial}
      derive={derive}
    />
  );
}
