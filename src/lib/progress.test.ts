import { afterEach, describe, expect, it } from "vitest";
import {
  PROGRESS_STORAGE_KEY,
  createEmptyProgress,
  parseProgress,
  readStoredProgress,
  serializeProgress,
  writeStoredProgress,
} from "./progress";
import type { LessonStatusMap } from "./course";

const baseStatuses: LessonStatusMap = { a1: "completed", a2: "not-started", b1: "in-progress" };

afterEach(() => {
  window.localStorage.clear();
});

describe("progresso salvo no navegador", () => {
  it("serializa e lê de volta o mesmo mapa de status", () => {
    const statuses: LessonStatusMap = { a1: "completed", a2: "completed", b1: "not-started" };

    expect(parseProgress(serializeProgress(statuses), baseStatuses)).toEqual(statuses);
  });

  it("ignora aulas desconhecidas e status inválidos, mantendo a base", () => {
    const raw = JSON.stringify({ version: 1, statuses: { a2: "completed", zz: "completed", b1: "feito" } });

    expect(parseProgress(raw, baseStatuses)).toEqual({ a1: "completed", a2: "completed", b1: "in-progress" });
  });

  it("rejeita JSON inválido ou de outra versão", () => {
    expect(parseProgress("{", baseStatuses)).toBeNull();
    expect(parseProgress(JSON.stringify({ version: 99, statuses: {} }), baseStatuses)).toBeNull();
    expect(parseProgress("null", baseStatuses)).toBeNull();
  });

  it("zera todas as aulas para não iniciadas", () => {
    expect(createEmptyProgress(baseStatuses)).toEqual({ a1: "not-started", a2: "not-started", b1: "not-started" });
  });

  it("persiste no localStorage e usa a base quando não há nada salvo", () => {
    expect(readStoredProgress(baseStatuses)).toBe(baseStatuses);

    writeStoredProgress({ ...baseStatuses, a2: "completed" });

    expect(window.localStorage.getItem(PROGRESS_STORAGE_KEY)).not.toBeNull();
    expect(readStoredProgress(baseStatuses)).toEqual({ ...baseStatuses, a2: "completed" });
  });
});
