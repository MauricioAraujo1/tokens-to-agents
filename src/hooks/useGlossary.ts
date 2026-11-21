import { useEffect, useSyncExternalStore } from "react";
import type { GlossaryEntry } from "../content/glossary";
import { getLoadedGlossary, loadGlossary, subscribeGlossary } from "../content/glossaryStore";

/**
 * O glossário carregado sob demanda (PERF-01.1). Com `needed`, dispara o carregamento; até ele chegar,
 * devolve `null`. Uma falha de rede deixa `null`, e quem usa segue sem o glossário, sem erro.
 */
export function useGlossary(needed: boolean = true): readonly GlossaryEntry[] | null {
  const glossary = useSyncExternalStore(subscribeGlossary, getLoadedGlossary, getLoadedGlossary);

  useEffect(() => {
    if (!needed || glossary) return;
    loadGlossary().catch(() => undefined);
  }, [needed, glossary]);

  return glossary;
}
