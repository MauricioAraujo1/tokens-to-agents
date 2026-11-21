import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Cada teste pega um store novo: o glossário só existe depois do import dinâmico (PERF-01.1).
type Store = typeof import("./glossaryStore");

async function freshStore(): Promise<Store> {
  vi.resetModules();
  return import("./glossaryStore");
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.doUnmock("./glossary");
});

describe("glossaryStore", () => {
  it("começa sem glossário e o carrega sob demanda, uma vez só, avisando quem espera", async () => {
    const store = await freshStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribeGlossary(listener);

    expect(store.getLoadedGlossary()).toBeNull();

    const [first, second] = await Promise.all([store.loadGlossary(), store.loadGlossary()]);

    expect(first).toBe(second);
    expect(first.length).toBeGreaterThan(700);
    expect(first.find((entry) => entry.id === "embedding")).toMatchObject({ term: "Embedding", lesson: "03-05" });
    expect(store.getLoadedGlossary()).toBe(first);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(await store.loadGlossary()).toBe(first);

    unsubscribe();
  }, 20_000);

  it("uma falha no import rejeita, e a próxima chamada tenta de novo", async () => {
    vi.doMock("./glossary", () => {
      throw new TypeError("Failed to fetch dynamically imported module");
    });
    const store = await freshStore();

    await expect(store.loadGlossary()).rejects.toThrow();
    expect(store.getLoadedGlossary()).toBeNull();

    vi.doUnmock("./glossary");
    const entries = await store.loadGlossary();
    expect(entries.length).toBeGreaterThan(700);
    expect(store.getLoadedGlossary()).toBe(entries);
  }, 20_000);
});
