import { PlaygroundShell, type PlaygroundControl, type PlaygroundView } from "../../components/lab/PlaygroundShell";
import { bm25VsVectorContent as content } from "../../content/playgrounds/bm25-vs-vector";
import type { ChartSpec, SceneColor } from "../../scene/types";
import { bm25Scores, embed, rankByScore, reciprocalRankFusion, tokenize, vectorScores } from "../retrieval";

type Values = { query: string; k: number };

const STOPWORDS = new Set(content.stopwords);
const DOCUMENT_WORDS = content.documents.map((document) => tokenize(document, STOPWORDS));
const DOCUMENT_VECTORS = DOCUMENT_WORDS.map((words) => embed(words, content.concepts, content.dims));
const DOC_LABELS = content.documents.map((_, index) => `D${index + 1}`);

const CONTROLS: ReadonlyArray<PlaygroundControl<Values>> = [
  { kind: "text", id: "query", label: content.queryLabel, hint: content.queryHint, maxLength: content.maxLength },
  { kind: "slider", id: "k", label: content.kLabel, hint: content.kHint, min: 1, max: 100, step: 1 },
];

function chart(id: string, scores: readonly number[], color: SceneColor, max?: number): ChartSpec {
  const top = rankByScore(scores)[0];
  return {
    piece: "chart",
    id,
    kind: "bar",
    series: DOC_LABELS.map((label, index) => ({ label, value: scores[index] })),
    max,
    highlight: top,
    color,
  };
}

/** Posição (a partir de 1) de cada documento no ranking; `null` se não foi recuperado. */
const positions = (ranking: readonly number[]) =>
  DOC_LABELS.map((_, index) => (ranking.includes(index) ? ranking.indexOf(index) + 1 : null));

function derive({ query, k }: Values): PlaygroundView {
  const queryWords = tokenize(query, STOPWORDS);
  if (queryWords.length === 0) return { pieces: [], error: content.emptyQuery };

  const bm25 = bm25Scores(DOCUMENT_WORDS, queryWords);
  const vector = vectorScores(DOCUMENT_VECTORS, embed(queryWords, content.concepts, content.dims));
  const bm25Ranking = rankByScore(bm25);
  const vectorRanking = rankByScore(vector);
  const fused = reciprocalRankFusion([bm25Ranking, vectorRanking], k);
  const rrf = DOC_LABELS.map((_, index) => fused.find((entry) => entry.document === index)?.score ?? 0);

  const bm25Position = positions(bm25Ranking);
  const vectorPosition = positions(vectorRanking);
  const rrfPosition = positions(fused.map((entry) => entry.document));
  const cell = (score: number, position: number | null, digits: number) =>
    position === null ? content.notRetrieved : `${score.toFixed(digits)} (#${position})`;

  return {
    pieces: [chart("bm25", bm25, "brand"), chart("vector", vector, "info", 1), chart("rrf", rrf, "success")],
    labels: [content.labels.bm25, content.labels.vector, content.labels.rrf],
    layout: "row",
    caption: content.caption(queryWords.join(" "), content.documents.length),
    details: (
      <table aria-label={content.tableLabel} className="w-full border-collapse">
        <thead>
          <tr className="text-ink-muted">
            <th scope="col" className="py-1 text-start font-semibold">{content.columns.document}</th>
            <th scope="col" className="py-1 text-end font-semibold">{content.columns.bm25}</th>
            <th scope="col" className="py-1 text-end font-semibold">{content.columns.vector}</th>
            <th scope="col" className="py-1 text-end font-semibold">{content.columns.rrf}</th>
          </tr>
        </thead>
        <tbody>
          {content.documents.map((document, index) => (
            <tr
              key={document}
              data-doc={DOC_LABELS[index]}
              data-bm25-rank={bm25Position[index] ?? undefined}
              data-vector-rank={vectorPosition[index] ?? undefined}
              data-rrf-rank={rrfPosition[index] ?? undefined}
            >
              <th scope="row" className="py-0.5 pe-3 text-start font-normal">
                {DOC_LABELS[index]} · {document}
              </th>
              <td className="py-0.5 text-end">{cell(bm25[index], bm25Position[index], 2)}</td>
              <td className="py-0.5 text-end">{cell(vector[index], vectorPosition[index], 2)}</td>
              <td className="py-0.5 text-end">{cell(rrf[index], rrfPosition[index], 4)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ),
  };
}

/** A mesma consulta num corpus de exemplo, com os rankings BM25 e vetorial lado a lado e a fusão RRF (LAB-01.1). */
export function Bm25VsVectorPlayground() {
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
