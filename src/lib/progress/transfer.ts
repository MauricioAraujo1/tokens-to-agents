import { migrate, type ProgressV1 } from "./schema";

export const MAX_IMPORT_BYTES = 1024 * 1024;
export const PROGRESS_FILE_NAME = "tokens-to-agents-progress.json";

export type ImportError = "not-json" | "too-large" | "unknown-schema";

export type ImportResult = { ok: true; value: ProgressV1 } | { ok: false; error: ImportError };

/** Arquivo JSON com `schemaVersion`, concluídas, checklist, quiz e idioma (PRG-01.4). */
export function exportProgress(state: ProgressV1): Blob {
  return new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
}

function looksLikeJsonFile(file: File): boolean {
  return file.type === "application/json" || file.name.toLowerCase().endsWith(".json");
}

/** Valida tipo, tamanho e schema; o estado atual só muda se o chamador aplicar o `value`. */
export async function parseImport(file: File): Promise<ImportResult> {
  if (!looksLikeJsonFile(file)) return { ok: false, error: "not-json" };
  if (file.size > MAX_IMPORT_BYTES) return { ok: false, error: "too-large" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    return { ok: false, error: "not-json" };
  }

  // Um arquivo exportado sempre tem `schemaVersion`; sem ele o schema é desconhecido.
  const hasVersion = typeof parsed === "object" && parsed !== null && "schemaVersion" in parsed;
  const value = hasVersion ? migrate(parsed) : null;
  return value ? { ok: true, value } : { ok: false, error: "unknown-schema" };
}
