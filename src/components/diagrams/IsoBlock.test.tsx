import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { IsoBlockArt } from "./IsoBlock";
import { ISO_BLOCK_COLOR, ISO_BLOCK_KINDS, ISO_BLOCK_PILL_OFFSET, isoBlockColor } from "./isoBlocks";

function renderArt(kind: (typeof ISO_BLOCK_KINDS)[number], isActive = false, uid = "a") {
  const { container } = render(
    <svg>
      <IsoBlockArt kind={kind} x={100} y={150} uid={uid} isActive={isActive} />
    </svg>,
  );
  return container;
}

describe("IsoBlockArt", () => {
  it("tem os 24 blocos da página 05, cada um com cor e posição de pílula", () => {
    expect(ISO_BLOCK_KINDS).toHaveLength(24);
    for (const kind of ISO_BLOCK_KINDS) {
      expect(ISO_BLOCK_PILL_OFFSET[kind]).toBeGreaterThan(0);
      expect(ISO_BLOCK_COLOR[kind]).toBeDefined();
    }
  });

  it.each(ISO_BLOCK_KINDS)("desenha o bloco %s com formas e contorno", (kind) => {
    const container = renderArt(kind);
    const shapes = container.querySelectorAll("path, rect, circle");

    expect(shapes.length).toBeGreaterThan(3);
    expect([...shapes].some((shape) => (shape as SVGElement).style.stroke === "var(--line-strong)")).toBe(true);
  });

  it("as cores vêm do tema, nunca de um valor fixo", () => {
    const container = renderArt("agent");
    const fills = [...container.querySelectorAll<SVGElement>("path, rect, circle")].map((shape) => shape.style.fill);

    expect(fills.filter((fill) => fill.startsWith("#"))).toEqual([]);
    expect(isoBlockColor("phone")).toBe("var(--module-00)");
    expect(isoBlockColor("llm")).toBe("var(--diagram-orange)");
  });

  it("o bloco ativo tem o contorno mais grosso (2.8px)", () => {
    const widths = (container: Element) =>
      new Set([...container.querySelectorAll("path")].map((path) => path.getAttribute("stroke-width")).filter(Boolean));

    expect(widths(renderArt("server", true))).toContain("2.8");
    expect(widths(renderArt("server", false))).not.toContain("2.8");
  });

  it("dois blocos iguais no mesmo documento não repetem os ids dos recortes", () => {
    const { container } = render(
      <svg>
        <IsoBlockArt kind="vector-db" x={0} y={0} uid="one" isActive={false} />
        <IsoBlockArt kind="vector-db" x={200} y={0} uid="two" isActive={false} />
      </svg>,
    );
    const ids = [...container.querySelectorAll("clipPath")].map((clip) => clip.id);

    expect(ids.length).toBeGreaterThan(1);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("os robôs e a lupa têm as partes animadas", () => {
    expect(renderArt("llm").querySelector(".iso-blink")).not.toBeNull();
    expect(renderArt("agent").querySelector(".iso-wrench")).not.toBeNull();
    expect(renderArt("no-result").querySelector(".iso-search")).not.toBeNull();
  });
});
