import { describe, expect, it } from "vitest";
import { emptyProgress, type ProgressV1 } from "./schema";
import { exportProgress, MAX_IMPORT_BYTES, parseImport } from "./transfer";

const progress: ProgressV1 = {
  schemaVersion: 1,
  completed: { "03-01": true, "03-02": true },
  objectives: { "03-01": [1] },
  quizBest: { "03": { correct: 4, total: 5 } },
  locale: "pt-BR",
};

function jsonFile(content: string, name = "progress.json", type = "application/json") {
  return new File([content], name, { type });
}

describe("exportProgress", () => {
  it("exports a JSON file with schema version, lessons, checklist, quiz and locale (PRG-01.4)", async () => {
    const blob = exportProgress(progress);

    expect(blob.type).toBe("application/json");
    const exported = JSON.parse(await blob.text());
    expect(exported).toEqual(progress);
    expect(exported.schemaVersion).toBe(1);
  });

  it("round-trips through parseImport", async () => {
    const blob = exportProgress(progress);

    expect(await parseImport(new File([blob], "progress.json", { type: blob.type }))).toEqual({
      ok: true,
      value: progress,
    });
  });
});

describe("parseImport", () => {
  it("imports a valid progress file (PRG-01.5)", async () => {
    expect(await parseImport(jsonFile(JSON.stringify(progress)))).toEqual({ ok: true, value: progress });
  });

  it("accepts a .json file even when the browser reports no MIME type", async () => {
    const result = await parseImport(jsonFile(JSON.stringify(emptyProgress()), "backup.json", ""));

    expect(result).toEqual({ ok: true, value: emptyProgress() });
  });

  it("rejects a .txt file as not JSON (PRG-01.6)", async () => {
    expect(await parseImport(jsonFile("concluí 2 aulas", "progress.txt", "text/plain"))).toEqual({
      ok: false,
      error: "not-json",
    });
  });

  it("rejects a .json file whose content is not JSON (PRG-01.6)", async () => {
    expect(await parseImport(jsonFile("{ not json"))).toEqual({ ok: false, error: "not-json" });
  });

  it("rejects JSON with an unknown schema (PRG-01.6)", async () => {
    expect(await parseImport(jsonFile(JSON.stringify({ ...progress, schemaVersion: 2 })))).toEqual({
      ok: false,
      error: "unknown-schema",
    });
    expect(await parseImport(jsonFile("{}"))).toEqual({ ok: false, error: "unknown-schema" });
    expect(await parseImport(jsonFile('{"name": "outro app"}'))).toEqual({ ok: false, error: "unknown-schema" });
    expect(await parseImport(jsonFile("[1, 2]"))).toEqual({ ok: false, error: "unknown-schema" });
  });

  it("rejects a file larger than 1 MB (PRG-01.6)", async () => {
    expect(MAX_IMPORT_BYTES).toBe(1024 * 1024);
    const padding = " ".repeat(MAX_IMPORT_BYTES);
    const tooLarge = jsonFile(`${JSON.stringify(progress)}${padding}`);

    expect(tooLarge.size).toBeGreaterThan(MAX_IMPORT_BYTES);
    expect(await parseImport(tooLarge)).toEqual({ ok: false, error: "too-large" });
  });

  it("accepts a file of exactly 1 MB", async () => {
    const content = JSON.stringify(progress);
    const exact = jsonFile(content + " ".repeat(MAX_IMPORT_BYTES - content.length));

    expect(exact.size).toBe(MAX_IMPORT_BYTES);
    expect(await parseImport(exact)).toEqual({ ok: true, value: progress });
  });
});
