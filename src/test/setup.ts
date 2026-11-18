import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { setReducedMotionPreference } from "./reducedMotion";

setReducedMotionPreference(true);

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.theme;
  setReducedMotionPreference(true);
});
