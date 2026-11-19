import type { PieceSpec, SceneSpec } from "./types";

/** A peça equivalente no passo anterior: mesmo id ou, sem id, mesma posição, e sempre o mesmo tipo. */
export function findPreviousPiece(previous: SceneSpec | null, piece: PieceSpec, index: number): PieceSpec | null {
  if (previous?.kind !== "pieces") return null;
  const candidate =
    piece.id === undefined ? previous.pieces[index] : previous.pieces.find((other) => other.id === piece.id);
  return candidate?.piece === piece.piece ? candidate : null;
}
