import type { GlossaryEntry } from "./glossary";

// O glossário (778 termos) fica fora do bundle inicial (PERF-01.1): o módulo `./glossary` só entra por
// import dinâmico, quando a busca abre ou quando a narração tem um [[termo|id]]. Ao ser avaliado, ele se
// registra aqui; quem importa `./glossary` direto (validação de conteúdo, testes) já o deixa registrado.

let loaded: readonly GlossaryEntry[] | null = null;
let pending: Promise<readonly GlossaryEntry[]> | undefined;
const listeners = new Set<() => void>();

/** Chamado pelo próprio `./glossary` quando é avaliado. */
export function registerGlossary(entries: readonly GlossaryEntry[]): void {
  if (loaded === entries) return;
  loaded = entries;
  for (const listener of listeners) listener();
}

/** O glossário, se já carregado; `null` até o import dinâmico terminar. */
export function getLoadedGlossary(): readonly GlossaryEntry[] | null {
  return loaded;
}

/**
 * Carrega o glossário sob demanda, uma vez só. Se o import falhar (rede, deploy novo), a promessa
 * rejeita e a próxima chamada tenta de novo.
 */
export function loadGlossary(): Promise<readonly GlossaryEntry[]> {
  if (loaded) return Promise.resolve(loaded);
  pending ??= import("./glossary").then(
    (module) => {
      registerGlossary(module.glossary);
      return module.glossary;
    },
    (error: unknown) => {
      pending = undefined;
      throw error;
    },
  );
  return pending;
}

/** Avisa quando o glossário chega; devolve a função que cancela o aviso. */
export function subscribeGlossary(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
