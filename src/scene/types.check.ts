// Checagem de tipos, sem execução: o `tsc -b` do build compila este arquivo.
// Cada `@ts-expect-error` prova que uma cena inválida não compila (SCN-01.6). Se o
// tipo passar a aceitar a cena errada, a diretiva fica sem uso e o build quebra.

import type { SceneSpec } from "./types";

export const validScenes: SceneSpec[] = [
  { kind: "custom", id: "rag-flow" },
  {
    kind: "pieces",
    layout: "overlay",
    pieces: [
      { piece: "token-stream", tokens: ["O", "gato", "sentou"], query: 1, arcs: [{ from: 1, to: 0, weight: 0.7 }] },
      { piece: "metrics-panel", metrics: [{ id: "loss", label: "loss", value: "0.42" }], highlight: "loss" },
    ],
  },
];

export const invalidScenes: SceneSpec[] = [
  // @ts-expect-error campo com nome errado: `token` em vez de `tokens`.
  { kind: "pieces", layout: "single", pieces: [{ piece: "token-stream", token: ["O"] }] },
  // @ts-expect-error peça que não existe.
  { kind: "pieces", layout: "single", pieces: [{ piece: "pie-chart", series: [] }] },
  // @ts-expect-error layout que não existe.
  { kind: "pieces", layout: "diagonal", pieces: [] },
  // @ts-expect-error tipo errado: peso do arco como texto.
  { kind: "pieces", layout: "single", pieces: [{ piece: "token-stream", tokens: ["O"], arcs: [{ from: 0, to: 0, weight: "alto" }] }] },
  // @ts-expect-error cena custom inexistente.
  { kind: "custom", id: "no-such-scene" },
  // @ts-expect-error cor fora do tema.
  { kind: "pieces", layout: "single", pieces: [{ piece: "chart", kind: "bar", series: [], color: "#ff0000" }] },
];
