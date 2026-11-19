import { isLocaleTag, type LocaleTag } from "../../i18n/locales";
import type { LessonId, ModuleId } from "../../types/content";

export const PROGRESS_SCHEMA_VERSION = 1;

export interface QuizScore {
  correct: number;
  total: number;
}

/** Melhor nota como "certas/total", ou "—" quando o aluno ainda não terminou o quiz (PRAC-01.3). */
export function formatScore(score: QuizScore | undefined): string {
  return score ? `${score.correct}/${score.total}` : "—";
}

// SPEC_DEVIATION: o design lista `theme?` no ProgressV1; o campo saiu.
// Reason: o tema já é salvo em `t2a:theme` pelo useTheme (T4, THM-01) e PRG-01.4 não exporta tema.
// Duas fontes para o mesmo dado divergiriam.
export interface ProgressV1 {
  schemaVersion: 1;
  completed: Record<LessonId, true>;
  /** Índices marcados no checklist "Você vai aprender", por aula. */
  objectives: Record<LessonId, number[]>;
  quizBest: Partial<Record<ModuleId, QuizScore>>;
  lastVisited?: { lessonId: LessonId; step: number };
  /** Idioma da interface escolhido pelo aluno (I18N-01.2). */
  locale?: LocaleTag;
}

const LESSON_ID = /^\d{2}-\d{2}$/;
const MODULE_ID = /^(0\d|1[0-7])$/;
const V0_STATUSES = new Set(["not-started", "in-progress", "completed"]);

export function emptyProgress(): ProgressV1 {
  return { schemaVersion: 1, completed: {}, objectives: {}, quizBest: {} };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

function parseV1(raw: Record<string, unknown>): ProgressV1 | null {
  const { completed, objectives, quizBest, lastVisited, locale } = raw;
  if (!isRecord(completed) || !isRecord(objectives) || !isRecord(quizBest)) return null;

  const progress = emptyProgress();

  for (const [id, done] of Object.entries(completed)) {
    if (!LESSON_ID.test(id) || done !== true) return null;
    progress.completed[id as LessonId] = true;
  }

  for (const [id, indexes] of Object.entries(objectives)) {
    if (!LESSON_ID.test(id) || !Array.isArray(indexes) || !indexes.every(isCount)) return null;
    progress.objectives[id as LessonId] = [...indexes];
  }

  for (const [id, score] of Object.entries(quizBest)) {
    if (!MODULE_ID.test(id) || !isRecord(score)) return null;
    const { correct, total } = score;
    if (!isCount(correct) || !isCount(total) || correct > total) return null;
    progress.quizBest[id as ModuleId] = { correct, total };
  }

  if (lastVisited !== undefined) {
    if (!isRecord(lastVisited)) return null;
    const { lessonId, step } = lastVisited;
    if (typeof lessonId !== "string" || !LESSON_ID.test(lessonId) || !isCount(step) || step < 1) return null;
    progress.lastVisited = { lessonId: lessonId as LessonId, step };
  }

  if (locale !== undefined) {
    if (typeof locale !== "string") return null;
    // Idioma fora dos 21 não invalida o progresso: só o idioma é descartado e volta a ser detectado.
    if (isLocaleTag(locale)) progress.locale = locale;
  }

  return progress;
}

/** v0: o mapa de status em memória do `useCourseProgress`, sem `schemaVersion`. */
function parseV0(raw: Record<string, unknown>): ProgressV1 | null {
  const progress = emptyProgress();
  for (const [id, status] of Object.entries(raw)) {
    if (!LESSON_ID.test(id) || typeof status !== "string" || !V0_STATUSES.has(status)) return null;
    if (status === "completed") progress.completed[id as LessonId] = true;
  }
  return progress;
}

/** Aceita o JSON salvo (string) ou o valor já lido. Devolve `null` para lixo ou versão futura. */
export function migrate(raw: unknown): ProgressV1 | null {
  let value = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  if (!isRecord(value)) return null;
  if (!("schemaVersion" in value)) return parseV0(value);
  if (value.schemaVersion === PROGRESS_SCHEMA_VERSION) return parseV1(value);
  return null;
}
