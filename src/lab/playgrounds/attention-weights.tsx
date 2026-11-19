import { PlaygroundShell, type PlaygroundControl, type PlaygroundView } from "../../components/lab/PlaygroundShell";
import { attentionWeightsContent as content } from "../../content/playgrounds/attention-weights";
import type { MatrixSpec, TokenStreamSpec } from "../../scene/types";
import { attentionRow } from "../attention";

type Values = { query: string };

const TOKENS = content.tokens.map((entry) => entry.token);
const KEYS = content.tokens.map((entry) => entry.k);

const CONTROLS: ReadonlyArray<PlaygroundControl<Values>> = [
  {
    kind: "select",
    id: "query",
    label: content.queryLabel,
    hint: content.queryHint,
    options: TOKENS.map((token, index) => ({ value: String(index), label: token })),
  },
];

const format = (value: number) => value.toFixed(2);

function derive({ query }: Values): PlaygroundView {
  const index = Number(query);
  const token = TOKENS[index];
  // Os valores V são os próprios vetores K (veja o conteúdo).
  const row = attentionRow(content.tokens[index].q, KEYS, KEYS);
  const strongest = row.weights.indexOf(Math.max(...row.weights));

  const stream: TokenStreamSpec = {
    piece: "token-stream",
    id: "sentence",
    tokens: TOKENS,
    query: index,
    keys: [strongest],
    arcs: row.weights.flatMap((weight, to) => (to === index ? [] : [{ from: index, to, weight, label: format(weight) }])),
    bars: row.weights,
  };
  const matrix: MatrixSpec = {
    piece: "matrix",
    id: "weights",
    rows: [token],
    cols: TOKENS,
    values: [row.weights],
    scale: { min: 0, max: 1 },
    highlight: { row: 0, col: strongest },
    showValues: true,
  };
  const sum = row.weights.reduce((total, weight) => total + weight, 0);

  return {
    pieces: [stream, matrix],
    caption: content.caption(token),
    details: (
      <div className="flex flex-col gap-2">
        <table aria-label={content.tableLabel(token)} className="w-full max-w-sm border-collapse">
          <thead>
            <tr className="text-ink-muted">
              <th scope="col" className="py-1 text-start font-semibold">{content.columns.key}</th>
              <th scope="col" className="py-1 text-end font-semibold">{content.columns.score}</th>
              <th scope="col" className="py-1 text-end font-semibold">{content.columns.weight}</th>
            </tr>
          </thead>
          <tbody>
            {TOKENS.map((key, keyIndex) => (
              <tr key={key} data-key-row={key}>
                <th scope="row" className="py-0.5 text-start font-normal">{key}</th>
                <td className="py-0.5 text-end">{format(row.scores[keyIndex])}</td>
                <td className="py-0.5 text-end">{format(row.weights[keyIndex])}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p data-weight-sum="true">{content.weightSum(format(sum))}</p>
        <p>{content.output(row.output.map(format).join(", "))}</p>
      </div>
    ),
  };
}

/** O aluno escolhe a query e vê pontuações, softmax e soma ponderada numa frase de exemplo (LAB-01.1). */
export function AttentionWeightsPlayground() {
  return (
    <PlaygroundShell
      title={content.title}
      observe={content.observe}
      controls={CONTROLS}
      initialValues={{ query: String(content.initialQuery) }}
      derive={derive}
    />
  );
}
