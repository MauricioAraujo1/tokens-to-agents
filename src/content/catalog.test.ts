/// <reference types="node" />
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { catalog, projectCatalog } from "./catalog";

// O roadmap é a fonte da verdade dos números e títulos (CNT-01.1).
// `new URL("../../docs/...", import.meta.url)` vira URL de asset no Vite; por isso o caminho vem do dirname.
const roadmap = readFileSync(resolve(import.meta.dirname, "../../docs/ai-engineering-roadmap.md"), "utf8");

interface RoadmapModule {
  id: string;
  title: string;
  lessons: { number: string; title: string }[];
}

function parseRoadmap(markdown: string): RoadmapModule[] {
  // Só a grade curricular: a seção de projetos também tem cabeçalhos "## 01 — ...".
  const start = markdown.indexOf("# Grade curricular");
  const end = markdown.indexOf("# Projetos práticos");
  if (start === -1 || end === -1) throw new Error("Seções da grade curricular não encontradas no roadmap");

  const modules: RoadmapModule[] = [];
  for (const line of markdown.slice(start, end).split(/\r?\n/)) {
    const moduleMatch = line.match(/^## (\d{2}) — (.+)$/);
    if (moduleMatch) {
      modules.push({ id: moduleMatch[1], title: moduleMatch[2].trim(), lessons: [] });
      continue;
    }

    const lessonMatch = line.match(/^- \[ \] (\d{2}\.\d{2}) — (.+)$/);
    if (lessonMatch) {
      modules.at(-1)?.lessons.push({ number: lessonMatch[1], title: lessonMatch[2].trim() });
    }
  }
  return modules;
}

const roadmapModules = parseRoadmap(roadmap);
const lessons = catalog.flatMap((module) => module.lessons);

describe("catalog", () => {
  it("tem os 18 módulos do roadmap, de 00 a 17, com os mesmos títulos", () => {
    expect(roadmapModules).toHaveLength(18);
    expect(catalog.map(({ id, title }) => ({ id, title }))).toEqual(
      roadmapModules.map(({ id, title }) => ({ id, title })),
    );
    expect(catalog.map((module) => module.id)).toEqual(
      Array.from({ length: 18 }, (_, index) => String(index).padStart(2, "0")),
    );
  });

  it("tem as 237 aulas do roadmap, com os mesmos números e títulos, na mesma ordem", () => {
    const roadmapLessons = roadmapModules.flatMap((module) => module.lessons);

    expect(roadmapLessons).toHaveLength(237);
    expect(lessons).toHaveLength(237);
    expect(lessons.map(({ number, title }) => ({ number, title }))).toEqual(roadmapLessons);
  });

  it("deriva o id NN-MM do número e liga cada aula ao seu módulo", () => {
    catalog.forEach((module) =>
      module.lessons.forEach((lesson) => {
        expect(lesson.id).toBe(lesson.number.replace(".", "-"));
        expect(lesson.module).toBe(module.id);
        expect(lesson.id.startsWith(`${module.id}-`)).toBe(true);
      }),
    );
  });

  it("não repete ids de aula", () => {
    const ids = lessons.map((lesson) => lesson.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("mantém KV Cache (10.05) e Prompt Caching (10.06) como aulas separadas (CNT-01.6)", () => {
    const kvCache = lessons.find((lesson) => lesson.id === "10-05");
    const promptCaching = lessons.find((lesson) => lesson.id === "10-06");

    expect(kvCache?.title).toBe("KV Cache");
    expect(promptCaching?.title).toBe("Prompt Caching");
  });

  it("tem os 5 projetos práticos do roadmap, com os mesmos números e títulos", () => {
    const section = roadmap.slice(roadmap.indexOf("# Projetos práticos"));
    const roadmapProjects = [...section.matchAll(/^## (\d{2}) — (.+)$/gm)].map(([, id, title]) => ({
      id,
      title: title.trim(),
    }));

    expect(roadmapProjects).toHaveLength(5);
    expect(projectCatalog).toEqual(roadmapProjects);
  });
});
