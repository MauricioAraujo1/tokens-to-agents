import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { countCompletedLessons } from "../lib/course";
import { emptyProgress } from "../lib/progress/schema";
import { createProgressStore } from "../lib/progress/store";
import { createSafeStorage } from "../lib/storage";
import type { ModuleMeta } from "../types/content";
import { useCourseProgress } from "./useCourseProgress";
import { useProgress } from "./useProgress";

const KEY = "t2a:progress:test";

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

// O jsdom mantém o localStorage entre os testes.
beforeEach(() => {
  window.localStorage.clear();
});

function createStore() {
  return createProgressStore(
    createSafeStorage(() => window.localStorage),
    KEY,
  );
}

/** Simula outra aba: ela grava no localStorage e o navegador dispara `storage` nesta. */
function writeFromOtherTab(key: string | null, value?: string) {
  if (key !== null && value !== undefined) window.localStorage.setItem(key, value);
  act(() => {
    window.dispatchEvent(new StorageEvent("storage", { key, newValue: value ?? null }));
  });
}

describe("useProgress", () => {
  it("re-renders with the new progress after a local update", () => {
    const store = createStore();
    const { result } = renderHook(() => useProgress(store));
    expect(result.current).toEqual(emptyProgress());

    act(() => store.completeLesson("01-01"));

    expect(result.current.completed).toEqual({ "01-01": true });
  });

  it("updates when another tab saves new progress (PRG-01.8)", () => {
    const store = createStore();
    const { result } = renderHook(() => useProgress(store));

    writeFromOtherTab(KEY, JSON.stringify({ ...emptyProgress(), completed: { "01-01": true, "01-02": true } }));

    expect(result.current.completed).toEqual({ "01-01": true, "01-02": true });
  });

  it("ignores storage events for other keys", () => {
    const store = createStore();
    const { result } = renderHook(() => useProgress(store));
    const before = result.current;

    window.localStorage.setItem(KEY, JSON.stringify({ ...emptyProgress(), completed: { "01-01": true } }));
    writeFromOtherTab("t2a:theme", "dark");

    expect(result.current).toBe(before);
  });

  it("returns to empty progress when another tab clears the storage", () => {
    const store = createStore();
    act(() => store.completeLesson("01-01"));
    const { result } = renderHook(() => useProgress(store));

    window.localStorage.clear();
    writeFromOtherTab(null);

    expect(result.current).toEqual(emptyProgress());
  });

  it("stops listening to other tabs after unmount", () => {
    const store = createStore();
    const { unmount } = renderHook(() => useProgress(store));
    unmount();

    writeFromOtherTab(KEY, JSON.stringify({ ...emptyProgress(), completed: { "01-01": true } }));

    // Sem listener, o store não relê o storage.
    expect(store.getSnapshot()).toEqual(emptyProgress());
  });
});

describe("useCourseProgress over the progress store", () => {
  it("updates the completed counter when another tab completes a lesson (PRG-01.8)", () => {
    const store = createStore();
    const { result } = renderHook(() => useCourseProgress(modules, store));
    expect(countCompletedLessons(modules, result.current.statuses)).toBe(0);

    writeFromOtherTab(KEY, JSON.stringify({ ...emptyProgress(), completed: { "01-02": true } }));

    expect(result.current.statuses["01-02"]).toBe("completed");
    expect(countCompletedLessons(modules, result.current.statuses)).toBe(1);
  });

  it("persists completed lessons through the store (PRG-01.1)", () => {
    const store = createStore();
    const { result } = renderHook(() => useCourseProgress(modules, store));

    act(() => result.current.completeLesson("01-01"));

    expect(result.current.statuses["01-01"]).toBe("completed");
    expect(JSON.parse(window.localStorage.getItem(KEY) ?? "null").completed).toEqual({ "01-01": true });
  });
});
