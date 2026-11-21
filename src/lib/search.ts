import { catalog as defaultCatalog } from "../content/catalog";
import type { GlossaryEntry } from "../content/glossary";
import { getLoadedGlossary, loadGlossary } from "../content/glossaryStore";
import type { LessonContent, LessonMeta, ModuleMeta } from "../types/content";
import { flattenLessons, type LessonLocation } from "./course";
import { normalizeText } from "./utils";

export const MAX_SEARCH_RESULTS = 10;
export const MIN_QUERY_LENGTH = 2;

export type SearchGroup = "lesson" | "concept" | "glossary";

export const SEARCH_GROUPS: readonly SearchGroup[] = ["lesson", "concept", "glossary"];

export interface SearchResult {
  group: SearchGroup;
  /** Chave única dentro do índice. */
  key: string;
  /** Texto encontrado: título da aula, título do passo ou termo do glossário. */
  label: string;
  /** Explicação curta, só nos termos do glossário. */
  explanation?: string;
  /** Aula que o resultado abre. */
  module: ModuleMeta;
  lesson: LessonMeta;
}

interface SearchEntry {
  result: SearchResult;
  haystack: string;
}

export type SearchIndex = Record<SearchGroup, SearchEntry[]>;

interface SearchSources {
  catalog: ModuleMeta[];
  glossary: readonly GlossaryEntry[];
  /** Aulas já carregadas; os títulos dos passos viram conceitos. */
  lessons?: LessonContent[];
}

function termsOf(query: string): string[] {
  return normalizeText(query).split(/\s+/).filter(Boolean);
}

function matchesAll(terms: string[], haystack: string): boolean {
  return terms.every((term) => haystack.includes(term));
}

export function searchLessons(
  entries: LessonLocation[],
  query: string,
  limit: number = MAX_SEARCH_RESULTS,
): LessonLocation[] {
  const terms = termsOf(query);

  if (terms.length === 0) {
    return [];
  }

  return entries
    .filter(({ module, lesson }) => matchesAll(terms, normalizeText(`${module.id} ${module.title} ${lesson.title}`)))
    .slice(0, limit);
}

export function buildSearchIndex({ catalog, glossary, lessons = [] }: SearchSources): SearchIndex {
  const locations = flattenLessons(catalog);
  const locationById = new Map(locations.map((location) => [location.lesson.id as string, location]));

  const lessonEntries = locations.map(({ module, lesson }) => ({
    result: { group: "lesson" as const, key: `lesson:${lesson.id}`, label: lesson.title, module, lesson },
    haystack: normalizeText(`${module.id} ${module.title} ${lesson.title}`),
  }));

  const conceptEntries = lessons.flatMap((content) => {
    const location = locationById.get(content.id);
    if (!location) return [];
    return content.steps.map((step) => ({
      result: {
        group: "concept" as const,
        key: `concept:${content.id}:${step.id}`,
        label: step.title,
        module: location.module,
        lesson: location.lesson,
      },
      haystack: normalizeText(`${step.shortTitle} ${step.title}`),
    }));
  });

  const glossaryEntries = glossary.flatMap((entry) => {
    const location = locationById.get(entry.lesson);
    if (!location) return [];
    return [
      {
        result: {
          group: "glossary" as const,
          key: `glossary:${entry.id}`,
          label: entry.term,
          explanation: entry.explanation,
          module: location.module,
          lesson: location.lesson,
        },
        haystack: normalizeText(`${entry.term} ${entry.explanation}`),
      },
    ];
  });

  return { lesson: lessonEntries, concept: conceptEntries, glossary: glossaryEntries };
}

/**
 * Busca em aulas, conceitos e glossário, sem acento e sem diferenciar maiúsculas.
 * Os grupos dividem o limite em rodízio, para que nenhum grupo encontrado fique de fora;
 * o resultado sai agrupado na ordem aula, conceito, glossário.
 */
export function searchAll(
  query: string,
  index: SearchIndex = currentSearchIndex(),
  limit: number = MAX_SEARCH_RESULTS,
): SearchResult[] {
  const terms = termsOf(query);

  if (terms.join("").length < MIN_QUERY_LENGTH) {
    return [];
  }

  const matches = SEARCH_GROUPS.map((group) =>
    index[group].filter(({ haystack }) => matchesAll(terms, haystack)).map(({ result }) => result),
  );
  const taken = SEARCH_GROUPS.map(() => 0);
  let total = 0;
  let progressed = true;

  while (total < limit && progressed) {
    progressed = false;
    for (let group = 0; group < matches.length && total < limit; group += 1) {
      if (taken[group] < matches[group].length) {
        taken[group] += 1;
        total += 1;
        progressed = true;
      }
    }
  }

  return matches.flatMap((results, group) => results.slice(0, taken[group]));
}

/** Carrega as aulas de um módulo; os títulos dos passos viram conceitos. */
export type ConceptModuleLoader = () => Promise<{ default: LessonContent[] }>;

interface SearchIndexSources {
  catalog: ModuleMeta[];
  /** Glossário já carregado, se houver (síncrono). */
  loadedGlossary: () => readonly GlossaryEntry[] | null;
  /** Carrega o glossário sob demanda. */
  loadGlossary: () => Promise<readonly GlossaryEntry[]>;
  /** Um carregador por módulo, pelo id do módulo ("00"…"17"). */
  conceptModules: Record<string, ConceptModuleLoader>;
}

export interface SearchIndexLoader {
  /** O melhor índice com o que já chegou: aulas sempre; glossário e conceitos quando carregados. */
  current: () => SearchIndex;
  /** Carrega o glossário e devolve o índice atual; uma falha deixa o índice como estava. */
  loadGlossary: () => Promise<SearchIndex>;
  /**
   * Carrega o glossário e os conceitos, módulo a módulo; `onProgress` recebe o índice a cada módulo
   * que chega. Nunca rejeita: um módulo que falha fica de fora (e é tentado de novo na próxima
   * chamada), e a busca segue com as aulas (PERF-01.3).
   */
  loadFull: (onProgress?: (index: SearchIndex) => void) => Promise<SearchIndex>;
}

/**
 * Índice da busca montado sob demanda (PERF-01.2): o bundle inicial só tem o catálogo (aulas). O
 * glossário e os conceitos chegam por import dinâmico, e o índice com tudo carregado é o mesmo de
 * `buildSearchIndex` com todas as aulas, na mesma ordem (módulos e aulas do catálogo).
 */
export function createSearchIndexLoader({ catalog, loadedGlossary, loadGlossary: fetchGlossary, conceptModules }: SearchIndexSources): SearchIndexLoader {
  const conceptsByModule = new Map<string, LessonContent[]>();
  const pendingModules = new Map<string, Promise<void>>();
  let cached: { glossary: readonly GlossaryEntry[] | null; modules: number; index: SearchIndex } | undefined;

  const current = (): SearchIndex => {
    const glossary = loadedGlossary();
    if (cached && cached.glossary === glossary && cached.modules === conceptsByModule.size) return cached.index;
    const lessons = catalog.flatMap((module) => conceptsByModule.get(module.id) ?? []);
    const index = buildSearchIndex({ catalog, glossary: glossary ?? [], lessons });
    cached = { glossary, modules: conceptsByModule.size, index };
    return index;
  };

  const loadGlossaryIndex = () =>
    fetchGlossary().then(
      () => current(),
      () => current(),
    );

  const loadModule = (moduleId: string, load: ConceptModuleLoader): Promise<void> => {
    if (conceptsByModule.has(moduleId)) return Promise.resolve();
    let pending = pendingModules.get(moduleId);
    if (!pending) {
      pending = load().then(
        (module) => {
          conceptsByModule.set(moduleId, module.default);
        },
        () => undefined,
      );
      pending.finally(() => pendingModules.delete(moduleId));
      pendingModules.set(moduleId, pending);
    }
    return pending;
  };

  const loadFull = async (onProgress?: (index: SearchIndex) => void): Promise<SearchIndex> => {
    const glossary = loadGlossaryIndex().then((index) => onProgress?.(index));
    const modules = Object.entries(conceptModules).map(([moduleId, load]) =>
      loadModule(moduleId, load).then(() => onProgress?.(current())),
    );
    await Promise.all([glossary, ...modules]);
    return current();
  };

  return { current, loadGlossary: loadGlossaryIndex, loadFull };
}

const lessonModules = import.meta.glob<{ default: LessonContent[] }>("../content/lessons/*/index.ts");

/** `../content/lessons/08/index.ts` → `08`. */
function moduleIdOf(path: string): string {
  return /lessons\/([^/]+)\/index\.ts$/.exec(path)?.[1] ?? path;
}

const defaultLoader = createSearchIndexLoader({
  catalog: defaultCatalog,
  loadedGlossary: getLoadedGlossary,
  loadGlossary,
  conceptModules: Object.fromEntries(Object.entries(lessonModules).map(([path, load]) => [moduleIdOf(path), load])),
});

/** Índice com o que já chegou ao navegador: aulas, e glossário e conceitos quando carregados. */
export const currentSearchIndex = defaultLoader.current;

/** Carrega o glossário (não os conceitos) e devolve o índice atual. */
export const loadGlossarySearchIndex = defaultLoader.loadGlossary;

/**
 * Índice completo: acrescenta o glossário e os títulos dos passos (conceitos) das aulas, módulo a
 * módulo. Os chunks são do próprio site; se algum falhar, a busca segue com o que chegou.
 */
export const loadFullSearchIndex = defaultLoader.loadFull;
