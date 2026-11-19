import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { THEME_STORAGE_KEY, useTheme } from "./useTheme";

function setSystemColorScheme(scheme: "light" | "dark"): void {
  window.matchMedia = vi.fn((query: string) => ({
    matches: query.includes("prefers-color-scheme: dark") && scheme === "dark",
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe("useTheme", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("follows a dark system preference when no choice is saved", () => {
    setSystemColorScheme("dark");

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("follows a light system preference when no choice is saved", () => {
    setSystemColorScheme("light");

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("gives the saved choice priority over the system preference", () => {
    setSystemColorScheme("dark");
    window.localStorage.setItem(THEME_STORAGE_KEY, "light");

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("ignores an unknown saved value and follows the system", () => {
    setSystemColorScheme("dark");
    window.localStorage.setItem(THEME_STORAGE_KEY, "sepia");

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("dark");
  });

  it("toggles the theme and saves the choice", () => {
    setSystemColorScheme("light");
    const { result, unmount } = renderHook(() => useTheme());

    act(() => result.current.toggleTheme());

    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");

    unmount();
    const reopened = renderHook(() => useTheme());
    expect(reopened.result.current.theme).toBe("dark");

    act(() => reopened.result.current.toggleTheme());
    expect(reopened.result.current.theme).toBe("light");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });
});
