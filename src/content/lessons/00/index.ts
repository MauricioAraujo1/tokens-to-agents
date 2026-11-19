import type { LessonContent } from "../../../types/content";

// Reúne as aulas do módulo num único chunk, carregado sob demanda pelo registry.
const files = import.meta.glob<LessonContent>(["./*.ts", "!./index.ts"], { eager: true, import: "default" });

export default Object.values(files);
