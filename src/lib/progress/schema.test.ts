import { describe, expect, it } from "vitest";
import { emptyProgress, migrate, PROGRESS_SCHEMA_VERSION, type ProgressV1 } from "./schema";

const validV1: ProgressV1 = {
  schemaVersion: 1,
  completed: { "03-01": true, "08-02": true },
  objectives: { "03-01": [0, 2] },
  quizBest: { "03": { correct: 4, total: 5 } },
  lastVisited: { lessonId: "08-02", step: 3 },
  locale: "pt-BR",
};

describe("emptyProgress", () => {
  it("starts at the current schema version with nothing recorded", () => {
    expect(emptyProgress()).toEqual({ schemaVersion: 1, completed: {}, objectives: {}, quizBest: {} });
    expect(PROGRESS_SCHEMA_VERSION).toBe(1);
  });
});

describe("migrate", () => {
  it("accepts a valid v1 object as is", () => {
    expect(migrate(validV1)).toEqual(validV1);
  });

  it("accepts a valid v1 JSON string", () => {
    expect(migrate(JSON.stringify(validV1))).toEqual(validV1);
  });

  it("converts the v0 status map (useCourseProgress) without losing completed lessons (PRG-01.9)", () => {
    const v0 = { "01-01": "completed", "01-02": "in-progress", "01-03": "not-started", "02-01": "completed" };

    expect(migrate(v0)).toEqual({
      schemaVersion: 1,
      completed: { "01-01": true, "02-01": true },
      objectives: {},
      quizBest: {},
    });
    expect(migrate(JSON.stringify(v0))?.completed).toEqual({ "01-01": true, "02-01": true });
  });

  it("returns null for a future schema version", () => {
    expect(migrate({ ...validV1, schemaVersion: 2 })).toBeNull();
    expect(migrate(JSON.stringify({ ...validV1, schemaVersion: 2 }))).toBeNull();
  });

  it("returns null for corrupted JSON", () => {
    expect(migrate('{"schemaVersion": 1, "completed": ')).toBeNull();
    expect(migrate("not json")).toBeNull();
  });

  it("returns null for values that are not a progress record", () => {
    expect(migrate(null)).toBeNull();
    expect(migrate(42)).toBeNull();
    expect(migrate([])).toBeNull();
    expect(migrate("[]")).toBeNull();
    expect(migrate({ "01-01": "done" })).toBeNull();
    expect(migrate({ schemaVersion: "1" })).toBeNull();
    expect(migrate({ schemaVersion: 0 })).toBeNull();
  });

  it("returns null for a v1 record with malformed fields", () => {
    expect(migrate({ ...validV1, completed: { "03-01": false } })).toBeNull();
    expect(migrate({ ...validV1, completed: { lesson: true } })).toBeNull();
    expect(migrate({ ...validV1, objectives: { "03-01": [-1] } })).toBeNull();
    expect(migrate({ ...validV1, objectives: { "03-01": "0" } })).toBeNull();
    expect(migrate({ ...validV1, quizBest: { "03": { correct: 6, total: 5 } } })).toBeNull();
    expect(migrate({ ...validV1, quizBest: { "99": { correct: 1, total: 5 } } })).toBeNull();
    expect(migrate({ ...validV1, lastVisited: { lessonId: "08-02", step: 0 } })).toBeNull();
    expect(migrate({ ...validV1, locale: 7 })).toBeNull();
    expect(migrate({ schemaVersion: 1, objectives: {}, quizBest: {} })).toBeNull();
  });

  it("drops fields that are not part of the schema", () => {
    expect(migrate({ ...validV1, theme: "dark", extra: 1 })).toEqual(validV1);
  });

  it("keeps the progress but drops a locale outside the 21 supported tags", () => {
    const { locale: _locale, ...withoutLocale } = validV1;
    expect(migrate({ ...validV1, locale: "xx" })).toEqual(withoutLocale);
  });
});
