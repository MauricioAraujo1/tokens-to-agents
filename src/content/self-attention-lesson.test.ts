import { describe, expect, it } from "vitest";
import type { MatrixSpec, MetricsPanelSpec, PieceSpec, TokenStreamSpec } from "../scene/types";
import selfAttention from "./lessons/03/03-08-self-attention";

// T106: os números da cena da aula 03.08 são calculados (softmax real), não fixos. O teste refaz a
// conta a partir dos próprios dados da cena (X e W_Q), com um softmax independente do da aula.

function pieceOf<T extends PieceSpec>(stepId: string, pieceId: string, kind: T["piece"]): T {
  const step = selfAttention.steps.find((candidate) => candidate.id === stepId);
  if (!step || step.scene.kind !== "pieces") throw new Error(`passo "${stepId}" sem peças`);
  const piece = step.scene.pieces.find((candidate) => candidate.id === pieceId);
  if (!piece || piece.piece !== kind) throw new Error(`passo "${stepId}" sem a peça "${pieceId}" do tipo ${kind}`);
  return piece as T;
}

function referenceSoftmax(values: number[]): number[] {
  const exps = values.map((value) => Math.exp(value));
  const total = exps.reduce((sum, value) => sum + value, 0);
  return exps.map((value) => value / total);
}

const X = pieceOf<MatrixSpec>("vectors", "matrix", "matrix");
const W_Q = pieceOf<MatrixSpec>("qkv", "wq", "matrix").values;
const ELE = X.rows.indexOf("ele");
const GATO = X.rows.indexOf("gato");
const D_K = X.cols.length;

// Na aula, W_K e W_V são a identidade: keys = X. A query de "ele" é X[ele] · W_Q.
const queryEle = W_Q[0].map((_, col) => X.values[ELE].reduce((total, value, row) => total + value * W_Q[row][col], 0));
const expectedScores = X.values.map((key) => key.reduce((total, value, dim) => total + value * queryEle[dim], 0) / Math.sqrt(D_K));
const expectedWeights = referenceSoftmax(expectedScores);

describe("aula 03.08: números da cena calculados", () => {
  it("os pesos de 'ele' na cena são o softmax de q · k / √d_k sobre os vetores da própria cena", () => {
    const stream = pieceOf<TokenStreamSpec>("softmax", "sentence", "token-stream");

    expect(stream.arcs?.map((arc) => arc.weight)).toHaveLength(X.rows.length);
    stream.arcs?.forEach((arc, index) => {
      expect(arc.from).toBe(ELE);
      expect(arc.weight).toBeCloseTo(expectedWeights[index], 10);
    });
    expect(stream.bars?.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 10);
  });

  it("a maior pontuação de 'ele' é com 'gato', e o painel mostra o valor calculado", () => {
    const metrics = pieceOf<MetricsPanelSpec>("scores", "metrics", "metrics-panel");
    const top = Math.max(...expectedScores);

    expect(expectedScores.indexOf(top)).toBe(GATO);
    expect(metrics.metrics.find((metric) => metric.id === "top")?.value).toBe(
      `ele → gato ${top.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    );
  });

  it("com a máscara causal, cada linha soma 1 e nenhum token pesa posições futuras", () => {
    const masked = pieceOf<MatrixSpec>("causal-mask", "weights", "matrix");

    expect(masked.causalMask).toBe(true);
    masked.values.forEach((row, rowIndex) => {
      expect(row.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 10);
      row.slice(rowIndex + 1).forEach((value) => expect(value).toBe(0));
    });

    // A linha de "ele" é o softmax refeito só sobre as posições 0..ele.
    const visible = referenceSoftmax(expectedScores.slice(0, ELE + 1));
    visible.forEach((weight, col) => expect(masked.values[ELE][col]).toBeCloseTo(weight, 10));
  });
});
