/** `stepNodeIds[i]` é o nó do diagrama que o passo i destaca. */
export function stepIndexForNode(
  stepNodeIds: ReadonlyArray<string | undefined>,
  nodeId: string,
  currentIndex: number,
): number {
  if (stepNodeIds[currentIndex] === nodeId) {
    return currentIndex;
  }

  return stepNodeIds.indexOf(nodeId);
}
