import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { setReducedMotionPreference } from "../test/reducedMotion";
import { COLUMN_SCENE_HEIGHT, Scene, type SceneStep } from "./Scene";
import { MIN_SCENE_ROOM, OVERLAY_GAP, sceneRoom } from "./useSceneRoom";
import { findPreviousPiece } from "./transition";
import type { PieceSpec, SceneSpec } from "./types";

const tokens: PieceSpec = { piece: "token-stream", id: "tokens", tokens: ["O", "gato", "sentou"], query: 1 };
const metrics: PieceSpec = { piece: "metrics-panel", metrics: [{ id: "loss", label: "loss", value: "0.42" }] };

const steps: SceneStep[] = [
  { id: "one", scene: { kind: "pieces", layout: "row", pieces: [tokens, metrics] } },
  {
    id: "two",
    scene: { kind: "pieces", layout: "row", pieces: [{ ...tokens, query: 2 }, metrics] },
  },
  {
    id: "three",
    scene: { kind: "pieces", layout: "single", pieces: [tokens] },
    alt: "Descrição escrita pelo autor",
  },
];

function renderScene(stepIndex: number) {
  const result = render(<Scene steps={steps} stepIndex={stepIndex} paused={false} />);
  const rerender = (nextIndex: number) =>
    result.rerender(<Scene steps={steps} stepIndex={nextIndex} paused={false} />);
  return { rerender };
}

function scene() {
  return screen.getByRole("figure");
}

describe("Scene", () => {
  it("mantém a cena da esquerda para a direita mesmo com a interface em RTL (preview 05)", () => {
    document.documentElement.dir = "rtl";
    renderScene(0);

    expect(scene()).toHaveAttribute("dir", "ltr");
    document.documentElement.removeAttribute("dir");
  });

  it("renderiza as peças da spec, na ordem e no layout declarados (SCN-01.1)", () => {
    renderScene(0);

    expect(scene()).toHaveAttribute("data-layout", "row");
    expect([...scene().querySelectorAll("[data-piece]")].map((element) => element.getAttribute("data-piece"))).toEqual([
      "token-stream",
      "metrics-panel",
    ]);
  });

  it("trocar o passo aplica a classe de transição (SCN-01.4)", () => {
    setReducedMotionPreference(false);
    const { rerender } = renderScene(0);
    expect(scene()).not.toHaveClass("scene-transition");

    rerender(1);

    expect(scene()).toHaveClass("scene-transition");
    expect(scene()).toHaveAttribute("data-motion", "full");
  });

  it("com movimento reduzido, trocar o passo não gera transição (SCN-01.5)", () => {
    setReducedMotionPreference(true);
    const { rerender } = renderScene(0);

    rerender(1);

    expect(scene()).not.toHaveClass("scene-transition");
    expect(scene()).toHaveAttribute("data-motion", "reduced");
  });

  it("descreve a cena no aria-label a partir dos dados do passo (SCN-01.7)", () => {
    const { rerender } = renderScene(0);

    expect(scene()).toHaveAccessibleName("Fluxo de tokens: O, gato e sentou (destaque: gato); Métricas: loss 0.42");

    rerender(1);
    expect(scene()).toHaveAccessibleName("Fluxo de tokens: O, gato e sentou (destaque: sentou); Métricas: loss 0.42");
  });

  it("em coluna, divide a altura de uma peça entre as linhas, sem passar da dobra (GEO-01.3)", () => {
    render(
      <Scene
        steps={[{ id: "col", scene: { kind: "pieces", layout: "column", pieces: [tokens, { ...tokens, id: "other" }] } }]}
        stepIndex={0}
        paused={false}
      />,
    );

    expect(scene()).toHaveAttribute("data-layout", "column");
    // O jsdom normaliza `minmax(0, 1fr)` para `minmax(0px, 1fr)`.
    expect(scene().style.gridTemplateRows).toBe("minmax(0px, 1fr) minmax(0px, 1fr)");
    // A altura é a de uma peça sozinha (58vh) mais o padding; o jsdom reordena os termos do calc.
    expect(COLUMN_SCENE_HEIGHT).toBe("calc(58vh + 2rem)");
    expect(scene().style.height).toBe("calc(2rem + 58vh)");
  });

  it("em coluna, o painel de métricas fica com a altura própria e as peças em SVG dividem o resto", () => {
    render(
      <Scene steps={[{ id: "col", scene: { kind: "pieces", layout: "column", pieces: [tokens, metrics] } }]} stepIndex={0} paused={false} />,
    );

    expect(scene().style.gridTemplateRows).toBe("minmax(0px, 1fr) auto");
  });

  it("fora da coluna, a cena não fixa linhas nem altura", () => {
    renderScene(0);

    expect(scene().style.gridTemplateRows).toBe("");
    expect(scene().style.height).toBe("");
  });

  it("usa a descrição do autor (alt) no lugar da gerada", () => {
    renderScene(2);

    expect(scene()).toHaveAccessibleName("Descrição escrita pelo autor");
  });
});

describe("Scene na altura que sobra na tela (GEO-01.3)", () => {
  // 06-07#1 a 1440 × 900: a área que rola (`main`) vai de 76 a 884 px, e o título em 3 linhas leva o
  // topo da cena a 349 px. Com 58vh (522 px) mais o padding, a cena terminava em 903 px.
  const layoutAt = ({ sceneTop = 349, overlayBottom = 0 } = {}) => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
    vi.stubGlobal("innerHeight", 900);
    const rect = vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
      if (this.tagName === "FIGURE") return { top: sceneTop, bottom: sceneTop + 554 } as DOMRect;
      if (this.classList.contains("absolute")) return { top: sceneTop + 12, bottom: overlayBottom } as DOMRect;
      if (this.classList.contains("scene-piece")) return { top: sceneTop + 16, bottom: sceneTop + 538 } as DOMRect;
      if (this.getAttribute("data-testid") === "port") return { top: 76, bottom: 884 } as DOMRect;
      return { top: 0, bottom: 0 } as DOMRect;
    });
    const client = vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(808);
    return () => {
      rect.mockRestore();
      client.mockRestore();
      vi.unstubAllGlobals();
    };
  };
  const inPort = (node: ReactNode) => (
    <div data-testid="port" style={{ overflowY: "auto" }}>
      {node}
    </div>
  );

  it("a altura é a do topo da cena até o fim da área visível, com um piso", () => {
    expect(sceneRoom(349, 884)).toBe(535);
    expect(sceneRoom(800, 884)).toBe(MIN_SCENE_ROOM);
  });

  it("na aula, a cena mede o espaço e troca o teto de 58vh por ele", () => {
    const restore = layoutAt();
    try {
      render(inPort(<Scene steps={[steps[2]]} stepIndex={0} paused={false} fitToScreen />));

      expect(scene()).toHaveAttribute("data-fit", "room");
      expect(scene().style.getPropertyValue("--scene-room")).toBe("535px");
    } finally {
      restore();
    }
  });

  it("em coluna, a cena ocupa a altura medida, e não 58vh mais o padding", () => {
    const restore = layoutAt();
    try {
      render(
        inPort(
          <Scene
            steps={[{ id: "col", scene: { kind: "pieces", layout: "column", pieces: [tokens, metrics] } }]}
            stepIndex={0}
            paused={false}
            fitToScreen
          />,
        ),
      );

      expect(scene().style.height).toBe("535px");
      expect(scene().style.gridTemplateRows).toBe("minmax(0px, 1fr) auto");
    } finally {
      restore();
    }
  });

  it("fora da aula (resumo), a cena não mede nada e fica com o teto de 58vh", () => {
    const restore = layoutAt();
    try {
      render(inPort(<Scene steps={[steps[2]]} stepIndex={0} paused={false} />));

      expect(scene()).not.toHaveAttribute("data-fit");
      expect(scene().style.getPropertyValue("--scene-room")).toBe("");
    } finally {
      restore();
    }
  });

  it("no overlay, a peça de baixo desce até abaixo do painel sobreposto (06-06#2)", () => {
    // O painel termina 140 px abaixo do topo da cena; a peça de baixo começa no padding, a 16 px.
    const restore = layoutAt({ overlayBottom: 349 + 140 });
    try {
      const { container } = render(
        inPort(
          <Scene
            steps={[{ id: "over", scene: { kind: "pieces", layout: "overlay", pieces: [tokens, metrics] } }]}
            stepIndex={0}
            paused={false}
            fitToScreen
          />,
        ),
      );
      const base = container.querySelector('[data-piece="token-stream"]') as HTMLElement;

      expect(base.style.paddingTop).toBe(`${140 - 16 + OVERLAY_GAP}px`);
      expect(base.style.getPropertyValue("--scene-offset")).toBe(`${140 - 16 + OVERLAY_GAP}px`);
      expect(container.querySelector('[data-piece="metrics-panel"]')).not.toHaveAttribute("style");
    } finally {
      restore();
    }
  });

  it("sem medida (jsdom puro), o overlay não recua a peça", () => {
    const { container } = render(
      <Scene steps={[{ id: "over", scene: { kind: "pieces", layout: "overlay", pieces: [tokens, metrics] } }]} stepIndex={0} paused={false} />,
    );

    expect(container.querySelector('[data-piece="token-stream"]')).not.toHaveAttribute("style");
  });
});

describe("findPreviousPiece", () => {
  const previous: SceneSpec = { kind: "pieces", layout: "row", pieces: [metrics, tokens] };

  it("acha a peça anterior pelo id, mesmo em outra posição", () => {
    expect(findPreviousPiece(previous, { ...tokens, query: 2 }, 0)).toBe(tokens);
  });

  it("sem id, usa a mesma posição, desde que o tipo seja o mesmo", () => {
    expect(findPreviousPiece(previous, { ...metrics, highlight: "loss" }, 0)).toBe(metrics);
    expect(findPreviousPiece(previous, { piece: "chart", kind: "bar", series: [] }, 0)).toBeNull();
  });

  it("não há peça anterior no primeiro passo nem vinda de uma cena custom", () => {
    expect(findPreviousPiece(null, tokens, 0)).toBeNull();
    expect(findPreviousPiece({ kind: "custom", id: "rag-flow" }, tokens, 0)).toBeNull();
  });
});
