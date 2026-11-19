import { catalog as defaultCatalog } from "../content/catalog";
import { glossary as defaultGlossary, type GlossaryEntry } from "../content/glossary";
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
  glossary: GlossaryEntry[];
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

/** Índice com o que já vem no bundle: catálogo e glossário. */
export const baseSearchIndex: SearchIndex = buildSearchIndex({ catalog: defaultCatalog, glossary: defaultGlossary });

/**
 * Busca em aulas, conceitos e glossário, sem acento e sem diferenciar maiúsculas.
 * Os grupos dividem o limite em rodízio, para que nenhum grupo encontrado fique de fora;
 * o resultado sai agrupado na ordem aula, conceito, glossário.
 */
export function searchAll(
  query: string,
  index: SearchIndex = baseSearchIndex,
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

const lessonModules = import.meta.glob<{ default: LessonContent[] }>("../content/lessons/*/index.ts");
let fullIndex: Promise<SearchIndex> | undefined;

/**
 * Índice completo: acrescenta os títulos dos passos (conceitos) das aulas. Os chunks
 * das aulas são do próprio site; se algum falhar, a busca segue com o índice base.
 */
export function loadFullSearchIndex(): Promise<SearchIndex> {
  fullIndex ??= Promise.all(Object.values(lessonModules).map((load) => load().then((module) => module.default)))
    .then((modules) =>
      buildSearchIndex({ catalog: defaultCatalog, glossary: defaultGlossary, lessons: modules.flat() }),
    )
    .catch(() => {
      fullIndex = undefined;
      return baseSearchIndex;
    });
  return fullIndex;
}
