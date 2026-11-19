import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { catalog } from "../content/catalog";
import { setReducedMotionPreference } from "../test/reducedMotion";
import { useLessonNavigation } from "./useLessonNavigation";

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

  it("next avança um passo e previous volta um (LES-01.2, LES-01.3)", () => {
    const { result } = renderHook(() => useLessonNavigation("lesson-a", 5));

    act(() => result.current.next());
    act(() => result.current.next());
    expect(result.current.stepIndex).toBe(2);
    expect(result.current.isFirstStep).toBe(false);

    act(() => result.current.previous());
    expect(result.current.stepIndex).toBe(1);
  });

  it("goTo limita o índice ao intervalo de etapas válidas", () => {
    const { result } = renderHook(() => useLessonNavigation("lesson-a", 4));

    act(() => result.current.goTo(10));
    expect(result.current.stepIndex).toBe(3);

    act(() => result.current.goTo(-2));
    expect(result.current.stepIndex).toBe(0);
  });

  it("restart repete a animação do passo atual sem sair dele (LES-01.7)", () => {
    const { result } = renderHook(() => useLessonNavigation("lesson-a", 5));

    act(() => result.current.goTo(3));
    act(() => result.current.togglePlay());
    const replayBefore = result.current.replayCount;
    act(() => result.current.restart());

    expect(result.current.stepIndex).toBe(3);
    expect(result.current.isPlaying).toBe(true);
    expect(result.current.replayCount).toBe(replayBefore + 1);
  });

  it("volta ao primeiro passo ao trocar de aula", () => {
    const { result, rerender } = renderHook(({ lessonId }) => useLessonNavigation(lessonId, 5), {
      initialProps: { lessonId: "lesson-a" },
    });

    act(() => result.current.goTo(4));
    rerender({ lessonId: "lesson-b" });

    expect(result.current.stepIndex).toBe(0);
  });

  it("não avança sozinho ao abrir a aula: avançar é manual (LES-01.2)", () => {
    setReducedMotionPreference(false);
    vi.useFakeTimers();
    const { result } = renderHook(() => useLessonNavigation("lesson-a", 3));

    expect(result.current.isPlaying).toBe(true);
    act(() => vi.advanceTimersByTime(60_000));

    expect(result.current.stepIndex).toBe(0);
  });

  it("togglePlay pausa e retoma a animação sem mudar de passo (LES-01.8)", () => {
    setReducedMotionPreference(false);
    const { result } = renderHook(() => useLessonNavigation("lesson-a", 4));

    act(() => result.current.goTo(2));
    act(() => result.current.togglePlay());
    expect(result.current.isPlaying).toBe(false);

    act(() => result.current.togglePlay());
    expect(result.current.isPlaying).toBe(true);
    expect(result.current.stepIndex).toBe(2);
  });

  it("não inicia a animação quando o usuário prefere movimento reduzido", () => {
    const { result } = renderHook(() => useLessonNavigation("lesson-a", 4));

    expect(result.current.isPlaying).toBe(false);
  });

  describe("sincronização com ?step", () => {
    it("abre no passo pedido pela URL e informa o passo atual a cada mudança (LES-01.10)", () => {
      const onStepChange = vi.fn();
      const { result } = renderHook(() => useLessonNavigation("lesson-a", 10, { initialStep: 4, onStepChange }));

      expect(result.current.stepIndex).toBe(3);
      expect(onStepChange).toHaveBeenLastCalledWith(4);

      act(() => result.current.next());
      expect(result.current.stepIndex).toBe(4);
      expect(onStepChange).toHaveBeenLastCalledWith(5);

      act(() => result.current.goTo(0));
      expect(onStepChange).toHaveBeenLastCalledWith(1);
    });

    it.each([
      ["acima de N", 11],
      ["ausente", null],
    ])("passo %s abre o passo 1 e a URL passa a pedir o passo 1 (LES-01.11)", (_label, initialStep) => {
      const onStepChange = vi.fn();
      const { result } = renderHook(() => useLessonNavigation("lesson-a", 10, { initialStep, onStepChange }));

      expect(result.current.stepIndex).toBe(0);
      expect(onStepChange).toHaveBeenLastCalledWith(1);
    });

    it("enquanto a aula não tem passos, não mexe na URL e guarda o passo pedido para quando carregar", () => {
      const onStepChange = vi.fn();
      const { result, rerender } = renderHook(
        ({ stepCount }) => useLessonNavigation("lesson-a", stepCount, { initialStep: 4, onStepChange }),
        { initialProps: { stepCount: 0 } },
      );

      expect(onStepChange).not.toHaveBeenCalled();

      rerender({ stepCount: 10 });
      expect(result.current.stepIndex).toBe(3);
      expect(onStepChange).toHaveBeenLastCalledWith(4);
    });
  });

  describe("próxima aula (LES-01.5)", () => {
    it("aponta para a aula seguinte do catálogo", () => {
      const { result } = renderHook(() => useLessonNavigation("08-02", 10));

      expect(result.current.nextLesson).toEqual({ name: "lesson", lessonId: "08-03", step: null });
    });

    it("na última aula de um módulo, aponta para a primeira aula do módulo seguinte", () => {
      const lastOfModule08 = catalog.find((module) => module.id === "08")!.lessons.at(-1)!.id;
      const { result } = renderHook(() => useLessonNavigation(lastOfModule08, 10));

      expect(result.current.nextLesson).toEqual({ name: "lesson", lessonId: "09-01", step: null });
    });

    it("na última aula do módulo 17, aponta para o Laboratório", () => {
      const lastLesson = catalog.at(-1)!.lessons.at(-1)!.id;
      const { result } = renderHook(() => useLessonNavigation(lastLesson, 10));

      expect(lastLesson).toBe("17-14");
      expect(result.current.nextLesson).toEqual({ name: "lab" });
    });
  });

  it("aula de 1 passo é primeiro e último passo ao mesmo tempo", () => {
    const { result } = renderHook(() => useLessonNavigation("lesson-a", 1));

    expect(result.current.isFirstStep).toBe(true);
    expect(result.current.isLastStep).toBe(true);

    act(() => result.current.next());
    act(() => result.current.previous());
    expect(result.current.stepIndex).toBe(0);
  });
});
