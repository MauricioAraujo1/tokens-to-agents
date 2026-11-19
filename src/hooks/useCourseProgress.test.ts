import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ModuleMeta } from "../types/content";
import { useCourseProgress } from "./useCourseProgress";

const modules: ModuleMeta[] = [
  {
    id: "01",
    title: "Primeiro",
    lessons: [
      { id: "01-01", module: "01", number: "01.01", title: "Aula A1", durationMin: 5, level: "beginner" },
      { id: "01-02", module: "01", number: "01.02", title: "Aula A2", durationMin: 5, level: "beginner" },
    ],
  },
];

describe("useCourseProgress", () => {
  it("marca uma aula não iniciada como em andamento ao abri-la", () => {
    const { result } = renderHook(() => useCourseProgress(modules));

    act(() => result.current.startLesson("01-01"));

    expect(result.current.statuses["01-01"]).toBe("in-progress");
  });

  it("não rebaixa uma aula concluída ao abri-la de novo", () => {
    const { result } = renderHook(() => useCourseProgress(modules));

    act(() => result.current.completeLesson("01-02"));
    act(() => result.current.startLesson("01-02"));

    expect(result.current.statuses["01-02"]).toBe("completed");
  });

  it("marca a aula como concluída uma única vez", () => {
    const { result } = renderHook(() => useCourseProgress(modules));

    act(() => result.current.completeLesson("01-01"));
    const afterFirstCompletion = result.current.statuses;
    act(() => result.current.completeLesson("01-01"));

    expect(result.current.statuses["01-01"]).toBe("completed");
    expect(result.current.statuses).toBe(afterFirstCompletion);
  });
});
