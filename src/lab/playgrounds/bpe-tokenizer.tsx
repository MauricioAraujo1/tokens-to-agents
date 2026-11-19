import { useCallback, useMemo } from "react";
import { PlaygroundShell, type PlaygroundControl, type PlaygroundView } from "../../components/lab/PlaygroundShell";
import { bpeTokenizerContent as content } from "../../content/playgrounds/bpe-tokenizer";
import type { TokenStreamSpec } from "../../scene/types";
import { applyMerges, trainBpe, type Merge } from "../bpe";

type Values = { text: string; steps: number };

/** Marca o início de cada palavra depois da primeira, como o `▁` do SentencePiece. */
const WORD_START = "▁";

const DEFAULT_MERGES = trainBpe(content.corpus, content.mergeCount);

interface BpeTokenizerPlaygroundProps {
  /** Vocabulário (merges em ordem). Sem ele, os merges aprendidos no corpus de exemplo. */
  merges?: readonly Merge[];
}

/** O aluno digita um texto e vê os merges BPE do vocabulário de exemplo aplicados passo a passo (LAB-01.1). */
export function BpeTokenizerPlayground({ merges = DEFAULT_MERGES }: BpeTokenizerPlaygroundProps) {
  const controls = useMemo<ReadonlyArray<PlaygroundControl<Values>>>(
    () => [
      { kind: "text", id: "text", label: content.textLabel, hint: content.textHint, maxLength: content.maxLength },
      { kind: "slider", id: "steps", label: content.mergesLabel, hint: content.mergesHint, min: 0, max: merges.length, step: 1 },
    ],
    [merges],
  );

  const derive = useCallback(
    ({ text, steps }: Values): PlaygroundView => {
      const result = applyMerges(text, merges, steps);
      if (result.words.length === 0) return { pieces: [], error: content.emptyText };

      const tokens = result.words.flatMap((word, wordIndex) =>
        word.map((token, index) => (wordIndex > 0 && index === 0 ? WORD_START + token : token)),
      );
      const last = result.steps.at(-1);
      const keys =
        last && last.occurrences > 0
          ? result.words
              .flat()
              .flatMap((token, index) => (token === last.token ? [index] : []))
          : [];
      const stream: TokenStreamSpec = { piece: "token-stream", tokens, keys };
      const chars = result.words.reduce((total, word) => total + [...word.join("")].length, 0);

      return {
        pieces: [stream],
        caption: content.caption(chars, tokens.length),
        details:
          result.steps.length === 0 ? (
            <p>{content.noMerges}</p>
          ) : (
            <ol aria-label={content.stepsTitle} className="columns-1 gap-6 sm:columns-2">
              {result.steps.map((step, index) => (
                <li key={step.token + index} data-merge={index + 1} className={step.occurrences > 0 ? undefined : "text-ink-muted"}>
                  {content.step(index + 1, `${step.merge[0]} + ${step.merge[1]}`, step.token, step.occurrences)}
                </li>
              ))}
            </ol>
          ),
      };
    },
    [merges],
  );

  return (
    <PlaygroundShell
      title={content.title}
      observe={content.observe}
      controls={controls}
      initialValues={{ text: content.defaultText, steps: merges.length }}
      derive={derive}
    />
  );
}
