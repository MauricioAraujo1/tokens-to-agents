import { vi } from "vitest";

export function setReducedMotionPreference(prefersReduced: boolean): void {
  window.matchMedia = vi.fn((query: string) => ({
    matches: prefersReduced && query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}
