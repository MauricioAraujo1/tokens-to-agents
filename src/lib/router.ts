import { catalog } from "../content/catalog";
import type { ModuleMeta } from "../types/content";

// Router próprio sobre a History API, sem biblioteca (AD-008).

export type Route =
  | { name: "home" }
  | { name: "lesson"; lessonId: string; step: number | null }
  | { name: "practice"; moduleId?: string }
  | { name: "lab"; playgroundId?: string; projectId?: string }
  | { name: "summaries"; moduleId?: string }
  | { name: "not-found" };

const NOT_FOUND: Route = { name: "not-found" };

/** `step` da URL: só inteiros ≥ 1 valem; ausente, 0, negativo ou não numérico vira `null`. */
function parseStep(search: string): number | null {
  const raw = new URLSearchParams(search).get("step");
  if (raw === null || !/^\d+$/.test(raw)) {
    return null;
  }
  const step = Number(raw);
  return step >= 1 ? step : null;
}

function decodeSegment(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

export function parseRoute(pathname: string, search: string, modules: ModuleMeta[] = catalog): Route {
  const segments = pathname.split("/").filter(Boolean).map(decodeSegment);
  if (segments.some((segment) => segment === null)) {
    return NOT_FOUND;
  }
  const [section, first, second, ...rest] = segments as string[];
  const hasModule = (id: string) => modules.some((module) => module.id === id);
  const hasLesson = (id: string) => modules.some((module) => module.lessons.some((lesson) => lesson.id === id));

  if (section === undefined) {
    return { name: "home" };
  }

  switch (section) {
    case "learn":
      if (first !== undefined && second === undefined && hasLesson(first)) {
        return { name: "lesson", lessonId: first, step: parseStep(search) };
      }
      return NOT_FOUND;
    case "practice":
    case "summaries":
      if (first === undefined) {
        return { name: section };
      }
      if (second === undefined && hasModule(first)) {
        return { name: section, moduleId: first };
      }
      return NOT_FOUND;
    case "lab":
      if (first === undefined) {
        return { name: "lab" };
      }
      if (second !== undefined && rest.length === 0) {
        if (first === "playground") {
          return { name: "lab", playgroundId: second };
        }
        if (first === "project") {
          return { name: "lab", projectId: second };
        }
      }
      return NOT_FOUND;
    default:
      return NOT_FOUND;
  }
}

export function buildPath(route: Route): string {
  switch (route.name) {
    case "home":
      return "/";
    case "lesson": {
      const path = `/learn/${encodeURIComponent(route.lessonId)}`;
      return route.step === null ? path : `${path}?step=${route.step}`;
    }
    case "practice":
    case "summaries":
      return route.moduleId === undefined
        ? `/${route.name}`
        : `/${route.name}/${encodeURIComponent(route.moduleId)}`;
    case "lab":
      if (route.playgroundId !== undefined) {
        return `/lab/playground/${encodeURIComponent(route.playgroundId)}`;
      }
      if (route.projectId !== undefined) {
        return `/lab/project/${encodeURIComponent(route.projectId)}`;
      }
      return "/lab";
    case "not-found":
      return "/404";
  }
}

/** Passo efetivo (1-based) de uma aula com `stepCount` passos: fora de 1..N abre o passo 1 (LES-01.11). */
export function resolveStep(step: number | null, stepCount: number): number {
  return step !== null && step <= stepCount ? step : 1;
}
