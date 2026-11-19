import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { setReducedMotionPreference } from "../test/reducedMotion";
import { STEP_DURATION_MS, useLessonNavigation } from "./useLessonNavigation";

describe("useLessonNavigation", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("avança e volta sem ultrapassar os limites da aula", () => {
    const { result } = renderHook(() => useLessonNavigation("lesson-a", 3));

    act(() => result.current.previous());
    expect(result.current.stepIndex).toBe(0);
    expect(result.current.isFirstStep).toBe(true);

    act(() => result.current.next());
    act(() => result.current.next());
    act(() => result.current.next());
    expect(result.current.stepIndex).toBe(2);
    expect(result.current.isLastStep).toBe(true);
  });

  it("goTo limita o índice ao intervalo de etapas válidas", () => {
    const { result } = renderHook(() => useLessonNavigation("lesson-a", 4));

    act(() => result.current.goTo(10));
    expect(result.current.stepIndex).toBe(3);

    act(() => result.current.goTo(-2));
    expect(result.current.stepIndex).toBe(0);
  });

  it("restart volta ao primeiro passo e retoma a reprodução", () => {
    const { result } = renderHook(() => useLessonNavigation("lesson-a", 5));

    act(() => result.current.goTo(3));
    act(() => result.current.togglePlay());
    act(() => result.current.restart());

    expect(result.current.stepIndex).toBe(0);
    expect(result.current.isPlaying).toBe(true);
  });

  it("volta ao primeiro passo ao trocar de aula", () => {
    const { result, rerender } = renderHook(({ lessonId }) => useLessonNavigation(lessonId, 5), {
      initialProps: { lessonId: "lesson-a" },
    });

    act(() => result.current.goTo(4));
    rerender({ lessonId: "lesson-b" });

    expect(result.current.stepIndex).toBe(0);
  });

  it("avança sozinho durante a demonstração e para no último passo", () => {
    setReducedMotionPreference(false);
    vi.useFakeTimers();
    const { result } = renderHook(() => useLessonNavigation("lesson-a", 3));

    expect(result.current.isPlaying).toBe(true);

    act(() => vi.advanceTimersByTime(STEP_DURATION_MS));
    expect(result.current.stepIndex).toBe(1);

    act(() => vi.advanceTimersByTime(STEP_DURATION_MS));
    expect(result.current.stepIndex).toBe(2);
    expect(result.current.isPlaying).toBe(true);

    act(() => vi.advanceTimersByTime(STEP_DURATION_MS));
    expect(result.current.stepIndex).toBe(2);
    expect(result.current.isPlaying).toBe(false);
  });

  it("togglePlay pausa e retoma a demonstração automática", () => {
    setReducedMotionPreference(false);
    vi.useFakeTimers();
    const { result } = renderHook(() => useLessonNavigation("lesson-a", 4));

    act(() => result.current.togglePlay());
    act(() => vi.advanceTimersByTime(STEP_DURATION_MS * 2));

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.stepIndex).toBe(0);
  });

  it("não inicia a demonstração automática quando o usuário prefere movimento reduzido", () => {
    const { result } = renderHook(() => useLessonNavigation("lesson-a", 4));

    expect(result.current.isPlaying).toBe(false);
  });

  it("abre uma aula diretamente no passo de entrada informado, dentro dos limites", () => {
    const { result, rerender } = renderHook(
      ({ lessonId, entry }) => useLessonNavigation(lessonId, 10, entry),
      { initialProps: { lessonId: "lesson-a", entry: 0 } },
    );

    rerender({ lessonId: "lesson-b", entry: 3 });
    expect(result.current.stepIndex).toBe(3);

    rerender({ lessonId: "lesson-c", entry: 42 });
    expect(result.current.stepIndex).toBe(9);
  });

  it("não avança sozinho enquanto a reprodução automática está desabilitada", () => {
    setReducedMotionPreference(false);
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ isEnabled }) => useLessonNavigation("lesson-a", 4, 0, isEnabled), {
      initialProps: { isEnabled: false },
    });

    act(() => vi.advanceTimersByTime(STEP_DURATION_MS * 2));
    expect(result.current.stepIndex).toBe(0);

    rerender({ isEnabled: true });
    act(() => vi.advanceTimersByTime(STEP_DURATION_MS));
    expect(result.current.stepIndex).toBe(1);
  });
});
