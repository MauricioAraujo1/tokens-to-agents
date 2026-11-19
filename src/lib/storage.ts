export interface SafeStorage {
  /** `false` quando o localStorage não existe, lança erro ou ficou sem quota: os dados ficam só em memória. */
  readonly available: boolean;
  get(key: string): string | null;
  /** Devolve `true` só quando o valor foi gravado no localStorage. */
  set(key: string, value: string): boolean;
  remove(key: string): void;
}

const PROBE_KEY = "t2a:probe";

function resolveStorage(resolve: () => Storage | null | undefined): Storage | null {
  try {
    const storage = resolve();
    if (!storage) return null;
    storage.setItem(PROBE_KEY, PROBE_KEY);
    storage.removeItem(PROBE_KEY);
    return storage;
  } catch {
    return null;
  }
}

export function createSafeStorage(resolve: () => Storage | null | undefined): SafeStorage {
  const backend = resolveStorage(resolve);
  const memory = new Map<string, string>();
  let available = backend !== null;

  return {
    get available() {
      return available;
    },
    get(key) {
      if (memory.has(key)) return memory.get(key) ?? null;
      if (!backend) return null;
      try {
        return backend.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      if (backend && available) {
        try {
          backend.setItem(key, value);
          memory.delete(key);
          return true;
        } catch {
          // Quota cheia: a partir daqui as gravações ficam só em memória.
          available = false;
        }
      }
      memory.set(key, value);
      return false;
    },
    remove(key) {
      memory.delete(key);
      if (!backend) return;
      try {
        backend.removeItem(key);
      } catch {
        // O valor em memória já saiu; o storage com falha é ignorado.
      }
    },
  };
}

export const safeStorage: SafeStorage = createSafeStorage(() => globalThis.localStorage);
