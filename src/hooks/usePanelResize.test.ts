import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RESIZE_KEYBOARD_STEP, usePanelResize } from "./usePanelResize";

function keyEvent(key: string) {
  return { key, preventDefault: () => undefined } as unknown as Parameters<
    ReturnType<typeof usePanelResize>["separatorProps"]["onKeyDown"]
  >[0];
}

describe("usePanelResize", () => {
  it("aumenta e diminui a largura com as setas no sentido do painel", () => {
    const { result } = renderHook(() =>
      usePanelResize({ initialWidth: 240, minWidth: 200, maxWidth: 380, direction: 1 }),
    );

    act(() => result.current.separatorProps.onKeyDown(keyEvent("ArrowRight")));
    expect(result.current.width).toBe(240 + RESIZE_KEYBOARD_STEP);

    act(() => result.current.separatorProps.onKeyDown(keyEvent("ArrowLeft")));
    act(() => result.current.separatorProps.onKeyDown(keyEvent("ArrowLeft")));
    expect(result.current.width).toBe(240 - RESIZE_KEYBOARD_STEP);
  });

  it("inverte a direção quando o separador fica na borda esquerda", () => {
    const { result } = renderHook(() =>
      usePanelResize({ initialWidth: 300, minWidth: 260, maxWidth: 440, direction: -1 }),
    );

    act(() => result.current.separatorProps.onKeyDown(keyEvent("ArrowLeft")));
    expect(result.current.width).toBe(300 + RESIZE_KEYBOARD_STEP);
  });

  it("nunca ultrapassa os limites mínimo e máximo", () => {
    const { result } = renderHook(() =>
      usePanelResize({ initialWidth: 200, minWidth: 200, maxWidth: 210, direction: 1 }),
    );

    act(() => result.current.separatorProps.onKeyDown(keyEvent("ArrowLeft")));
    expect(result.current.width).toBe(200);

    act(() => result.current.separatorProps.onKeyDown(keyEvent("ArrowRight")));
    act(() => result.current.separatorProps.onKeyDown(keyEvent("ArrowRight")));
    expect(result.current.width).toBe(210);
  });

  it("ignora teclas que não controlam o redimensionamento", () => {
    const { result } = renderHook(() =>
      usePanelResize({ initialWidth: 240, minWidth: 200, maxWidth: 380, direction: 1 }),
    );

    act(() => result.current.separatorProps.onKeyDown(keyEvent("Enter")));
    expect(result.current.width).toBe(240);
  });
});
