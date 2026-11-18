import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CourseModule } from "../types/course";
import { useCourseProgress } from "./useCourseProgress";

const modules: CourseModule[] = [
  {
    id: "m1",
    number: "01",
    title: "Primeiro",
    accent: "blue",
    lessons: [
      {
        id: "a1",
        title: "Aula A1",
        description: "",
        duration: 5,
        difficulty: "Iniciante",
        status: "not-started",
        steps: [],
      },
      {
        id: "a2",
        title: "Aula A2",
        description: "",
        duration: 5,
        difficulty: "Iniciante",
        status: "completed",
        steps: [],
      },
    ],
  },
];

describe("useCourseProgress", () => {
  it("marca uma aula não iniciada como em andamento ao abri-la", () => {
    const { result } = renderHook(() => useCourseProgress(modules));

    act(() => result.current.startLesson("a1"));

    expect(result.current.statuses.a1).toBe("in-progress");
  });

  it("não rebaixa uma aula concluída ao abri-la de novo", () => {
    const { result } = renderHook(() => useCourseProgress(modules));

    act(() => result.current.startLesson("a2"));

    expect(result.current.statuses.a2).toBe("completed");
  });

  it("marca a aula como concluída uma única vez", () => {
    const { result } = renderHook(() => useCourseProgress(modules));

    act(() => result.current.completeLesson("a1"));
    const afterFirstCompletion = result.current.statuses;
    act(() => result.current.completeLesson("a1"));

    expect(result.current.statuses.a1).toBe("completed");
    expect(result.current.statuses).toBe(afterFirstCompletion);
  });
});
