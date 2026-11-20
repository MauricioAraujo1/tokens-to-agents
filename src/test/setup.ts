import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach } from "vitest";
import { setReducedMotionPreference } from "./reducedMotion";

setReducedMotionPreference(true);

// Os módulos de conteúdo carregam sob demanda; no jsdom, alguns levam mais que o 1 s padrão do findBy.
configure({ asyncUtilTimeout: 5_000 });

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.theme;
  setReducedMotionPreference(true);
});
