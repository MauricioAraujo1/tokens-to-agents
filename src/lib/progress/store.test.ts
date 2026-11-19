import { describe, expect, it, vi } from "vitest";
import { createSafeStorage } from "../storage";
import { emptyProgress } from "./schema";
import { createProgressStore, PROGRESS_BACKUP_KEY, PROGRESS_STORAGE_KEY } from "./store";

function createBackend(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    key: (index: number) => [...data.keys()][index] ?? null,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}

function setup(saved?: string) {
  const backend = createBackend();
  if (saved !== undefined) backend.setItem(PROGRESS_STORAGE_KEY, saved);
  const storage = createSafeStorage(() => backend);
  return { backend, storage, store: createProgressStore(storage) };
}

function savedProgress(backend: Storage) {
  return JSON.parse(backend.getItem(PROGRESS_STORAGE_KEY) ?? "null");
}

describe("createProgressStore", () => {
  it("starts empty when nothing is saved", () => {
    expect(setup().store.getSnapshot()).toEqual(emptyProgress());
  });

  it("loads the saved progress", () => {
    const { store } = setup(JSON.stringify({ ...emptyProgress(), completed: { "03-01": true } }));

    expect(store.getSnapshot().completed).toEqual({ "03-01": true });
  });

  it("backs up unreadable progress and starts from zero", () => {
    const { backend, store } = setup('{"schemaVersion": 9}');

    expect(store.getSnapshot()).toEqual(emptyProgress());
    expect(backend.getItem(PROGRESS_BACKUP_KEY)).toBe('{"schemaVersion": 9}');
  });

  it("completes a lesson and persists it (PRG-01.1)", () => {
    const { backend, store } = setup();

    store.completeLesson("03-01");

    expect(store.getSnapshot().completed).toEqual({ "03-01": true });
    expect(savedProgress(backend).completed).toEqual({ "03-01": true });
  });

  it("keeps a single record when the same lesson is completed twice (PRG-01.2)", () => {
    const { backend, store } = setup();
    const listener = vi.fn();
    store.subscribe(listener);

    store.completeLesson("03-01");
    const afterFirst = store.getSnapshot();
    store.completeLesson("03-01");

    expect(Object.keys(store.getSnapshot().completed)).toEqual(["03-01"]);
    expect(store.getSnapshot()).toBe(afterFirst);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(Object.keys(savedProgress(backend).completed)).toEqual(["03-01"]);
  });

  it("toggles a checklist item on and off and saves it (PRG-01.3)", () => {
    const { backend, store } = setup();

    store.toggleObjective("03-01", 2);
    store.toggleObjective("03-01", 0);
    expect(store.getSnapshot().objectives).toEqual({ "03-01": [0, 2] });
    expect(savedProgress(backend).objectives).toEqual({ "03-01": [0, 2] });

    store.toggleObjective("03-01", 2);
    expect(store.getSnapshot().objectives).toEqual({ "03-01": [0] });

    store.toggleObjective("03-01", 0);
    expect(store.getSnapshot().objectives).toEqual({});
  });

  it("keeps the best quiz score (PRAC-01.3)", () => {
    const { backend, store } = setup();

    store.recordQuiz("03", { correct: 3, total: 5 });
    store.recordQuiz("03", { correct: 2, total: 5 });
    expect(store.getSnapshot().quizBest["03"]).toEqual({ correct: 3, total: 5 });

    store.recordQuiz("03", { correct: 5, total: 5 });
    expect(store.getSnapshot().quizBest["03"]).toEqual({ correct: 5, total: 5 });
    expect(savedProgress(backend).quizBest["03"]).toEqual({ correct: 5, total: 5 });
  });

  it("remembers the last visited lesson and step", () => {
    const { backend, store } = setup();

    store.setLastVisited("08-02", 4);

    expect(store.getSnapshot().lastVisited).toEqual({ lessonId: "08-02", step: 4 });
    expect(savedProgress(backend).lastVisited).toEqual({ lessonId: "08-02", step: 4 });
  });

  it("saves the chosen interface language without touching the rest (I18N-01.2)", () => {
    const { backend, store } = setup();
    store.completeLesson("01-01");
    const listener = vi.fn();
    store.subscribe(listener);

    store.setLocale("ja");
    store.setLocale("ja");

    expect(store.getSnapshot()).toEqual({ ...emptyProgress(), completed: { "01-01": true }, locale: "ja" });
    expect(savedProgress(backend).locale).toBe("ja");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("replaces the whole progress and persists it (PRG-01.5)", () => {
    const { backend, store } = setup();
    store.completeLesson("01-01");
    const imported = { ...emptyProgress(), completed: { "03-01": true as const }, locale: "en" as const };

    store.replace(imported);

    expect(store.getSnapshot()).toEqual(imported);
    expect(savedProgress(backend)).toEqual(imported);
  });

  it("reset clears the saved progress (PRG-01.10)", () => {
    const { backend, store } = setup('{"schemaVersion": 9}');
    store.completeLesson("03-01");
    store.toggleObjective("03-01", 1);
    const listener = vi.fn();
    store.subscribe(listener);

    store.reset();

    expect(store.getSnapshot()).toEqual(emptyProgress());
    expect(backend.getItem(PROGRESS_STORAGE_KEY)).toBeNull();
    expect(backend.getItem(PROGRESS_BACKUP_KEY)).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("stops notifying after unsubscribe", () => {
    const { store } = setup();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    unsubscribe();
    store.completeLesson("03-01");

    expect(listener).not.toHaveBeenCalled();
  });

  it("works in memory when storage is unavailable (PRG-01.7)", () => {
    const storage = createSafeStorage(() => undefined);
    const store = createProgressStore(storage);

    store.completeLesson("03-01");
    store.recordQuiz("03", { correct: 1, total: 2 });

    expect(storage.available).toBe(false);
    expect(store.getSnapshot().completed).toEqual({ "03-01": true });
    expect(store.getSnapshot().quizBest["03"]).toEqual({ correct: 1, total: 2 });
  });
});
