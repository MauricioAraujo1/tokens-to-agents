import { catalog as defaultCatalog, projectCatalog, type ProjectMeta } from "../src/content/catalog";
import { glossary } from "../src/content/glossary";
import {
  validateLesson,
  validateProject,
  validateQuiz,
  validateSummary,
  type ValidationIssue,
} from "../src/content/validate";
import type { LessonContent, ModuleMeta, ProjectContent, QuizContent, SummaryContent } from "../src/types/content";

// Validação de release (`npm run validate:content`, gate Release): o conteúdo publicado precisa estar
// completo (as 237 aulas, os 18 quizzes, os 18 resumos e os 5 projetos), com links internos válidos e
// referências externas no ar. Roda pelo módulo runner do Vite (scripts/run-validate-content.mjs),
// que entende o `import.meta.glob` usado aqui.

/** Arquivos de conteúdo, pelo caminho relativo a `src/content/`. */
export interface ContentFiles {
  lessons: Record<string, LessonContent>;
  quizzes: Record<string, QuizContent>;
  summaries: Record<string, SummaryContent>;
  projects: Record<string, ProjectContent>;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

interface ValidateContentOptions {
  files?: ContentFiles;
  catalog?: ModuleMeta[];
  projects?: ProjectMeta[];
  glossaryIds?: ReadonlySet<string>;
  fetch?: FetchLike;
  log?: (line: string) => void;
  /** Quantas referências externas são conferidas ao mesmo tempo. */
  concurrency?: number;
}

const CONTENT_ROOT = "../src/content/";

function relative<T>(files: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(files).map(([path, value]) => [path.replace(CONTENT_ROOT, ""), value]));
}

/** Os mesmos diretórios que o registry carrega em produção. */
export function loadContentFiles(): ContentFiles {
  return {
    lessons: relative(
      import.meta.glob<LessonContent>(["../src/content/lessons/*/*.ts", "!../src/content/lessons/*/index.ts"], {
        eager: true,
        import: "default",
      }),
    ),
    quizzes: relative(import.meta.glob<QuizContent>("../src/content/quizzes/*.ts", { eager: true, import: "default" })),
    summaries: relative(import.meta.glob<SummaryContent>("../src/content/summaries/*.ts", { eager: true, import: "default" })),
    projects: relative(import.meta.glob<ProjectContent>("../src/content/projects/*.ts", { eager: true, import: "default" })),
  };
}

function formatIssue({ file, step, field, message }: ValidationIssue): string {
  return `${file}${step ? ` › passo "${step}"` : ""} › ${field}: ${message}`;
}

function count(value: number, one: string, other: string): string {
  return `${value} ${value === 1 ? one : other}`;
}

/** Conteúdo faltando em relação ao catálogo (CNT-01.1) e problemas de cada arquivo, inclusive links internos (CNT-01.5). */
function structuralIssues(files: ContentFiles, catalog: ModuleMeta[], projects: ProjectMeta[], glossaryIds: ReadonlySet<string>): string[] {
  const issues: string[] = [];
  const lessonIds = new Set(Object.values(files.lessons).map((lesson) => lesson.id));
  const quizModules = new Set(Object.values(files.quizzes).map((quiz) => quiz.module));
  const summaryModules = new Set(Object.values(files.summaries).map((summary) => summary.module));
  const projectIds = new Set(Object.values(files.projects).map((project) => project.id));

  for (const module of catalog) {
    for (const lesson of module.lessons) {
      if (!lessonIds.has(lesson.id)) issues.push(`aula faltando: ${lesson.number} ${lesson.title} (${lesson.id})`);
    }
  }
  for (const module of catalog) {
    if (!quizModules.has(module.id)) issues.push(`quiz faltando: módulo ${module.id} ${module.title}`);
  }
  for (const module of catalog) {
    if (!summaryModules.has(module.id)) issues.push(`resumo faltando: módulo ${module.id} ${module.title}`);
  }
  for (const project of projects) {
    if (!projectIds.has(project.id)) issues.push(`projeto faltando: ${project.id} ${project.title}`);
  }

  const fileIssues: ValidationIssue[] = [
    ...Object.entries(files.lessons).flatMap(([file, lesson]) => validateLesson(lesson, { file, catalog, glossaryIds })),
    ...Object.entries(files.quizzes).flatMap(([file, quiz]) => validateQuiz(quiz, { file, catalog })),
    ...Object.entries(files.summaries).flatMap(([file, summary]) => validateSummary(summary, { file, catalog })),
    ...Object.entries(files.projects).flatMap(([file, project]) => validateProject(project, { file, catalog })),
  ];

  return [...issues, ...fileIssues.map(formatIssue)];
}

/** Cada URL externa uma vez, com os arquivos que a citam. */
function externalReferences(files: ContentFiles): Map<string, string[]> {
  const sources = new Map<string, string[]>();
  for (const [file, lesson] of Object.entries(files.lessons)) {
    for (const reference of lesson.references) {
      sources.set(reference.url, [...(sources.get(reference.url) ?? []), file]);
    }
  }
  return sources;
}

/** Status HTTP da URL. HEAD primeiro; servidor que recusa HEAD (405 ou 501) é conferido com GET. */
async function statusOf(url: string, fetchImpl: FetchLike): Promise<number> {
  const head = await fetchImpl(url, { method: "HEAD", redirect: "follow" });
  if (head.status !== 405 && head.status !== 501) return head.status;
  const get = await fetchImpl(url, { method: "GET", redirect: "follow" });
  return get.status;
}

/** Referências externas fora do ar (CNT-01.3). */
async function referenceIssues(references: Map<string, string[]>, fetchImpl: FetchLike, concurrency: number): Promise<string[]> {
  const entries = [...references];
  const results: Array<string | null> = new Array(entries.length).fill(null);
  let next = 0;

  async function worker() {
    while (next < entries.length) {
      const index = next++;
      const [url, files] = entries[index];
      const where = files.join(", ");
      try {
        const status = await statusOf(url, fetchImpl);
        if (status >= 400) results[index] = `referência fora do ar (HTTP ${status}): ${url} em ${where}`;
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        results[index] = `referência inacessível: ${url} em ${where} (${reason})`;
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, entries.length) }, worker));
  return results.filter((result): result is string => result !== null);
}

/** Roda a validação de release e devolve o código de saída: 0 sem problemas, 1 com a lista impressa. */
export async function validateContent({
  files = loadContentFiles(),
  catalog = defaultCatalog,
  projects = projectCatalog,
  glossaryIds = new Set(glossary.map((entry) => entry.id)),
  fetch: fetchImpl = (input, init) => fetch(input, init),
  log = (line) => console.log(line),
  concurrency = 8,
}: ValidateContentOptions = {}): Promise<number> {
  const totals = [
    count(Object.keys(files.lessons).length, "aula", "aulas"),
    count(Object.keys(files.quizzes).length, "quiz", "quizzes"),
    count(Object.keys(files.summaries).length, "resumo", "resumos"),
  ].join(", ");
  log(`validate:content: ${totals} e ${count(Object.keys(files.projects).length, "projeto", "projetos")}`);

  const issues = [
    ...structuralIssues(files, catalog, projects, glossaryIds),
    ...(await referenceIssues(externalReferences(files), fetchImpl, concurrency)),
  ];

  if (issues.length === 0) {
    log("validate:content: conteúdo completo, links internos válidos e referências no ar.");
    return 0;
  }

  log(`validate:content: ${count(issues.length, "problema", "problemas")}:`);
  for (const issue of issues) log(`  - ${issue}`);
  return 1;
}
