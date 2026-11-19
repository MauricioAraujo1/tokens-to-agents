import { PlaygroundShell, type PlaygroundControl, type PlaygroundView } from "../../components/lab/PlaygroundShell";
import { embeddingSpaceContent as content } from "../../content/playgrounds/embedding-space";
import type { VectorSpaceSpec } from "../../scene/types";
import { nearestByCosine } from "../embeddings";

type Values = { query: string; k: number };

const CONTROLS: ReadonlyArray<PlaygroundControl<Values>> = [
  {
    kind: "select",
    id: "query",
    label: content.queryLabel,
    hint: content.queryHint,
    options: content.points.map((point) => ({ value: point.id, label: point.label })),
  },
  { kind: "slider", id: "k", label: content.kLabel, hint: content.kHint, min: 1, max: content.maxK, step: 1 },
];

const labelOf = (id: string) => content.points.find((point) => point.id === id)?.label ?? id;

function derive({ query, k }: Values): PlaygroundView {
  const neighbors = nearestByCosine(content.points, query, k);
  const neighborIds = new Set(neighbors.map((neighbor) => neighbor.id));
  const word = labelOf(query);

  // Os vizinhos do VectorSpace usam distância euclidiana; aqui o critério é o cosseno, então a peça
  // recebe os vizinhos já escolhidos pela cor e pelas setas a partir da origem.
  const space: VectorSpaceSpec = {
    piece: "vector-space",
    points: content.points.map((point) => ({
      id: point.id,
      label: point.label,
      coords: [point.vector[0], point.vector[1]],
      color: neighborIds.has(point.id) ? "success" : undefined,
    })),
    query,
    vectors: [{ to: query }, ...neighbors.map((neighbor) => ({ to: neighbor.id }))],
  };

  return {
    pieces: [space],
    caption: content.caption(word, k),
    details: (
      <div className="flex flex-col gap-1">
        <p>{content.self(word)}</p>
        <ol aria-label={content.neighborsLabel(word)} className="list-inside list-decimal">
          {neighbors.map((neighbor) => (
            <li key={neighbor.id} data-neighbor={neighbor.id} data-similarity={neighbor.similarity.toFixed(4)}>
              {content.neighbor(labelOf(neighbor.id), neighbor.similarity.toFixed(2))}
            </li>
          ))}
        </ol>
      </div>
    ),
  };
}

/** Pontos 2D de palavras, com a similaridade de cosseno e os k vizinhos do ponto escolhido (LAB-01.1). */
export function EmbeddingSpacePlayground() {
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
