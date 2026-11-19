import type { MessageKey } from "../../i18n/messages/pt-BR";

export type ModuleStatus = "completed" | "in-progress" | "not-started";

export const STATUS_LABEL: Record<ModuleStatus, MessageKey> = {
  completed: "home.status.completed",
  "in-progress": "home.status.inProgress",
  "not-started": "home.status.notStarted",
};

/** Glifos de status do preview 07: concluído, em andamento e não iniciado. */
export const STATUS_GLYPH: Record<ModuleStatus, string> = {
  completed: "●",
  "in-progress": "◐",
  "not-started": "○",
};

export const STATUS_CLASS: Record<ModuleStatus, string> = {
  completed: "text-success",
  "in-progress": "text-brand",
  "not-started": "text-muted",
};

export function moduleStatus(completed: number, total: number): ModuleStatus {
  if (completed === 0) return "not-started";
  return completed >= total ? "completed" : "in-progress";
}
