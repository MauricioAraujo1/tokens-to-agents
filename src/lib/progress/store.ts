import type { LocaleTag } from "../../i18n/locales";
import type { LessonId, ModuleId } from "../../types/content";
import { safeStorage, type SafeStorage } from "../storage";
import { emptyProgress, migrate, type ProgressV1, type QuizScore } from "./schema";

export const PROGRESS_STORAGE_KEY = "t2a:progress";
export const PROGRESS_BACKUP_KEY = "t2a:progress:backup";

export interface ProgressStore {
  /** Chave do storage; o evento `storage` de outra aba é filtrado por ela. */
  readonly key: string;
  getSnapshot(): ProgressV1;
  /** Relê o storage (outra aba gravou) e notifica só se o progresso mudou. */
  reload(): void;
  /** Idempotente: concluir de novo não muda o estado nem notifica. */
  completeLesson(lessonId: LessonId): void;
  toggleObjective(lessonId: LessonId, index: number): void;
  /** Guarda só a melhor nota (maior proporção de acertos) do módulo. */
  recordQuiz(moduleId: ModuleId, score: QuizScore): void;
  setLastVisited(lessonId: LessonId, step: number): void;
  /** Idioma da interface escolhido pelo aluno; vai junto na exportação (PRG-01.4) e some no `reset`. */
  setLocale(locale: LocaleTag): void;
  /** Troca todo o progresso (importação confirmada, PRG-01.5). */
  replace(progress: ProgressV1): void;
  reset(): void;
  subscribe(listener: () => void): () => void;
}

function ratio(score: QuizScore): number {
  return score.total === 0 ? 0 : score.correct / score.total;
}

export function createProgressStore(storage: SafeStorage, key = PROGRESS_STORAGE_KEY): ProgressStore {
  const listeners = new Set<() => void>();

  function load(): ProgressV1 {
    const raw = storage.get(key);
    if (raw === null) return emptyProgress();
    const progress = migrate(raw);
    if (progress) return progress;
    // Corrompido ou de versão futura: guarda uma cópia e começa do zero.
    storage.set(PROGRESS_BACKUP_KEY, raw);
    return emptyProgress();
  }

  let state = load();

  function commit(next: ProgressV1) {
    state = next;
    storage.set(key, JSON.stringify(next));
    for (const listener of listeners) listener();
  }

  return {
    key,
    getSnapshot: () => state,

    reload() {
      const next = load();
      if (JSON.stringify(next) === JSON.stringify(state)) return;
      state = next;
      for (const listener of listeners) listener();
    },

    completeLesson(lessonId) {
      if (state.completed[lessonId]) return;
      commit({ ...state, completed: { ...state.completed, [lessonId]: true } });
    },

    toggleObjective(lessonId, index) {
      const current = state.objectives[lessonId] ?? [];
      const next = current.includes(index)
        ? current.filter((item) => item !== index)
        : [...current, index].sort((a, b) => a - b);
      const objectives: ProgressV1["objectives"] = { ...state.objectives, [lessonId]: next };
      if (next.length === 0) delete objectives[lessonId];
      commit({ ...state, objectives });
    },

    recordQuiz(moduleId, score) {
      const best = state.quizBest[moduleId];
      if (best && ratio(best) >= ratio(score)) return;
      commit({ ...state, quizBest: { ...state.quizBest, [moduleId]: { ...score } } });
    },

    setLastVisited(lessonId, step) {
      const last = state.lastVisited;
      if (last?.lessonId === lessonId && last.step === step) return;
      commit({ ...state, lastVisited: { lessonId, step } });
    },

    setLocale(locale) {
      if (state.locale === locale) return;
      commit({ ...state, locale });
    },

    replace(progress) {
      commit(progress);
    },

    reset() {
      state = emptyProgress();
      storage.remove(key);
      storage.remove(PROGRESS_BACKUP_KEY);
      for (const listener of listeners) listener();
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export const progressStore: ProgressStore = createProgressStore(safeStorage);
