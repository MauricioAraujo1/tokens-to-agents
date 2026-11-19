import { describe, expect, it } from "vitest";
import { createSafeStorage } from "./storage";

function createMemoryStorage(options: { failSetFor?: (key: string) => boolean } = {}): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    key: (index: number) => [...data.keys()][index] ?? null,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (options.failSetFor?.(key)) {
        throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
      }
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}

describe("createSafeStorage", () => {
  it("persists to localStorage when storage works", () => {
    const backend = createMemoryStorage();
    const storage = createSafeStorage(() => backend);

    expect(storage.available).toBe(true);
    expect(storage.set("t2a:theme", "dark")).toBe(true);
    expect(storage.get("t2a:theme")).toBe("dark");
    expect(backend.getItem("t2a:theme")).toBe("dark");

    storage.remove("t2a:theme");
    expect(storage.get("t2a:theme")).toBeNull();
    expect(backend.getItem("t2a:theme")).toBeNull();
  });

  it("reads values that were already saved", () => {
    const backend = createMemoryStorage();
    backend.setItem("t2a:theme", "light");

    expect(createSafeStorage(() => backend).get("t2a:theme")).toBe("light");
  });

  it("falls back to memory when accessing localStorage throws", () => {
    const storage = createSafeStorage(() => {
      throw new DOMException("Access denied", "SecurityError");
    });

    expect(storage.available).toBe(false);
    expect(storage.get("t2a:theme")).toBeNull();
    expect(storage.set("t2a:theme", "dark")).toBe(false);
    expect(storage.get("t2a:theme")).toBe("dark");
    storage.remove("t2a:theme");
    expect(storage.get("t2a:theme")).toBeNull();
  });

  it("falls back to memory when every storage method throws", () => {
    const throwing = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    } as unknown as Storage;
    const storage = createSafeStorage(() => throwing);

    expect(storage.available).toBe(false);
    expect(storage.get("t2a:theme")).toBeNull();
    expect(storage.set("t2a:theme", "dark")).toBe(false);
    expect(storage.get("t2a:theme")).toBe("dark");
    expect(() => storage.remove("t2a:theme")).not.toThrow();
    expect(storage.get("t2a:theme")).toBeNull();
  });

  it("keeps the value in memory and reports unavailable when the quota is full", () => {
    const backend = createMemoryStorage({ failSetFor: (key) => key === "t2a:progress" });
    const storage = createSafeStorage(() => backend);
    expect(storage.available).toBe(true);

    expect(storage.set("t2a:progress", "{}")).toBe(false);
    expect(storage.available).toBe(false);
    expect(storage.get("t2a:progress")).toBe("{}");
    expect(backend.getItem("t2a:progress")).toBeNull();
  });

  it("works in memory when localStorage does not exist", () => {
    const storage = createSafeStorage(() => undefined);

    expect(storage.available).toBe(false);
    expect(storage.set("t2a:theme", "dark")).toBe(false);
    expect(storage.get("t2a:theme")).toBe("dark");
    storage.remove("t2a:theme");
    expect(storage.get("t2a:theme")).toBeNull();
  });
});
