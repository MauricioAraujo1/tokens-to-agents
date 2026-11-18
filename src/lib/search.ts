import type { LessonLocation } from "./course";
import { normalizeText } from "./utils";

export const MAX_SEARCH_RESULTS = 8;

export function searchLessons(
  entries: LessonLocation[],
  query: string,
  limit: number = MAX_SEARCH_RESULTS,
): LessonLocation[] {
  const terms = normalizeText(query).split(/\s+/).filter(Boolean);

  if (terms.length === 0) {
    return [];
  }

  return entries
    .filter(({ module, lesson }) => {
      const haystack = normalizeText(`${module.number} ${module.title} ${lesson.title} ${lesson.description}`);
      return terms.every((term) => haystack.includes(term));
    })
    .slice(0, limit);
}
