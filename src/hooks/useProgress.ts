import { useCallback, useSyncExternalStore } from "react";
import type { ProgressV1 } from "../lib/progress/schema";
import { progressStore, type ProgressStore } from "../lib/progress/store";

/** Progresso atual; re-renderiza a cada mudança local ou de outra aba (PRG-01.8). */
export function useProgress(store: ProgressStore = progressStore): ProgressV1 {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const unsubscribe = store.subscribe(onChange);
      const onStorage = (event: StorageEvent) => {
        // `key === null` quando outra aba limpou o storage inteiro.
        if (event.key === store.key || event.key === null) store.reload();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        unsubscribe();
        window.removeEventListener("storage", onStorage);
      };
    },
    [store],
  );

  return useSyncExternalStore(subscribe, store.getSnapshot, store.getSnapshot);
}
