import type { LessonStatus } from "../types/course";
import type { LessonStatusMap } from "./course";

export const PROGRESS_STORAGE_KEY = "tokens-to-agents:progress";
export const PROGRESS_FORMAT_VERSION = 1;
export const PROGRESS_EXPORT_FILE_NAME = "tokens-to-agents-progresso.json";

const LESSON_STATUSES: readonly LessonStatus[] = ["not-started", "in-progress", "completed"];

export interface ProgressSnapshot {
  version: typeof PROGRESS_FORMAT_VERSION;
  statuses: LessonStatusMap;
}

function isLessonStatus(value: unknown): value is LessonStatus {
  return typeof value === "string" && (LESSON_STATUSES as readonly string[]).includes(value);
}

export function serializeProgress(statuses: LessonStatusMap): string {
  const snapshot: ProgressSnapshot = { version: PROGRESS_FORMAT_VERSION, statuses };

  return JSON.stringify(snapshot);
}

export function parseProgress(raw: string, baseStatuses: LessonStatusMap): LessonStatusMap | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }

  const { version, statuses } = parsed as Partial<ProgressSnapshot>;

  if (version !== PROGRESS_FORMAT_VERSION || typeof statuses !== "object" || statuses === null) {
    return null;
  }

  const merged: LessonStatusMap = { ...baseStatuses };

  for (const [lessonId, status] of Object.entries(statuses)) {
    if (lessonId in baseStatuses && isLessonStatus(status)) {
      merged[lessonId] = status;
    }
  }

  return merged;
}

export function createEmptyProgress(baseStatuses: LessonStatusMap): LessonStatusMap {
  return Object.fromEntries(Object.keys(baseStatuses).map((lessonId) => [lessonId, "not-started" as const]));
}

export function readStoredProgress(baseStatuses: LessonStatusMap): LessonStatusMap {
  try {
    const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY);

    return (raw && parseProgress(raw, baseStatuses)) || baseStatuses;
  } catch {
    return baseStatuses;
  }
}

export function writeStoredProgress(statuses: LessonStatusMap): void {
  try {
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, serializeProgress(statuses));
  } catch {
    return;
  }
}
