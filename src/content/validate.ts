import type {
  LessonContent,
  ModuleMeta,
  ProjectContent,
  QuizContent,
  QuizQuestion,
  SummaryContent,
} from "../types/content";
import type { GlossaryEntry } from "./glossary";

export interface ValidationIssue {
  /** Arquivo de conteúdo que tem o problema. */
  file: string;
  /** Id do passo, quando o problema está dentro de um passo. */
  step?: string;
  /** Caminho do campo, por exemplo "related[0]" ou "steps[2].id". */
  field: string;
  message: string;
}

export interface ValidationContext {
  file: string;
  catalog: ModuleMeta[];
  /** Ids do glossário aceitos em [[termo|id]]. */
  glossaryIds: ReadonlySet<string>;
}

const GLOSSARY_TERM = /\[\[([^|\]]+)\|([^\]]+)\]\]/g;

function lessonIdsOf(catalog: ModuleMeta[]): Set<string> {
  return new Set(catalog.flatMap((module) => module.lessons.map((lesson) => lesson.id)));
}

function moduleIdsOf(catalog: ModuleMeta[]): Set<string> {
  return new Set(catalog.map((module) => module.id));
}

function isHttpsUrl(value: string): boolean {
  if (!value.startsWith("https://")) return false;
  try {
    return new URL(value).hostname.length > 0;
  } catch {
    return false;
  }
}

function validateQuestions(
  questions: QuizQuestion[],
  fieldPrefix: string,
  file: string,
  lessonIds: Set<string>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Set<string>();

  questions.forEach((question, index) => {
    const field = `${fieldPrefix}[${index}]`;

    if (seen.has(question.id)) {
      issues.push({ file, field: `${field}.id`, message: `id de questão repetido: "${question.id}"` });
    }
    seen.add(question.id);

    if (!Number.isInteger(question.correct) || question.correct < 0 || question.correct >= question.options.length) {
      issues.push({
        file,
        field: `${field}.correct`,
        message: `resposta correta ${question.correct} fora das opções (0..${question.options.length - 1})`,
      });
    }
    if (!lessonIds.has(question.lesson)) {
      issues.push({ file, field: `${field}.lesson`, message: `aula "${question.lesson}" não existe no catálogo` });
    }
  });

  return issues;
}

export function validateLesson(lesson: LessonContent, context: ValidationContext): ValidationIssue[] {
  const { file, catalog, glossaryIds } = context;
  const lessonIds = lessonIdsOf(catalog);
  const issues: ValidationIssue[] = [];
  const add = (field: string, message: string, step?: string) =>
    issues.push(step === undefined ? { file, field, message } : { file, step, field, message });

  if (!lessonIds.has(lesson.id)) add("id", `aula "${lesson.id}" não existe no catálogo`);
  if (lesson.subtitle.trim() === "") add("subtitle", "subtítulo vazio");
  if (lesson.objectives.length === 0) add("objectives", "a aula precisa de pelo menos 1 objetivo");

  // Passos: ≥1, ids únicos, texto presente e termos do glossário existentes.
  if (lesson.steps.length === 0) add("steps", "a aula precisa de pelo menos 1 passo");

  const stepIds = new Set<string>();
  lesson.steps.forEach((step, index) => {
    const field = `steps[${index}]`;

    if (stepIds.has(step.id)) add(`${field}.id`, `id de passo repetido: "${step.id}"`, step.id);
    stepIds.add(step.id);

    if (step.body.length === 0 || step.body.some((paragraph) => paragraph.trim() === "")) {
      add(`${field}.body`, "o passo precisa de pelo menos 1 parágrafo e nenhum parágrafo vazio", step.id);
    }

    const texts: Array<[string, string]> = step.body.map((paragraph, paragraphIndex) => [
      `${field}.body[${paragraphIndex}]`,
      paragraph,
    ]);
    if (step.keyIdea !== undefined) texts.push([`${field}.keyIdea`, step.keyIdea]);

    for (const [textField, text] of texts) {
      for (const [, , glossaryId] of text.matchAll(GLOSSARY_TERM)) {
        if (!glossaryIds.has(glossaryId)) add(textField, `termo "${glossaryId}" não existe no glossário`, step.id);
      }
    }
  });

  // As 9 seções do padrão de aula (LES-01.12), distribuídas entre passos e rodapé.
  if (!lesson.steps.some((step) => step.tag === "context")) {
    add("steps", 'falta a seção Concept: nenhum passo com tag "context"');
  }
  if (!lesson.steps.some((step) => step.tag === "mechanism")) {
    add("steps", 'falta a seção How it works: nenhum passo com tag "mechanism"');
  }
  // Visual explanation: cada passo tem `scene`, garantido pelo tipo StepContent.
  if (lesson.realWorldExample.trim() === "") add("realWorldExample", "falta a seção Real-world example");
  if (lesson.code && (lesson.code.source.trim() === "" || lesson.code.caption.trim() === "")) {
    add("code", "a seção Code example está declarada, mas sem código ou legenda");
  }
  if (lesson.tradeOffs.pros.length === 0 || lesson.tradeOffs.cons.length === 0) {
    add("tradeOffs", "falta a seção Trade-offs: são necessárias vantagens e limitações");
  }
  if (lesson.knowledgeCheck.length === 0) add("knowledgeCheck", "falta a seção Knowledge check");
  if (lesson.related.length === 0) add("related", "falta a seção Related concepts");
  if (lesson.references.length === 0) add("references", "falta a seção References");

  // Links internos (CNT-01.4, CNT-01.5): origem e destino na mensagem.
  lesson.related.forEach((target, index) => {
    if (!lessonIds.has(target)) add(`related[${index}]`, `a aula ${lesson.id} aponta para a aula inexistente ${target}`);
  });

  // Referências (CNT-01.3).
  lesson.references.forEach((reference, index) => {
    if (!isHttpsUrl(reference.url)) add(`references[${index}].url`, `URL precisa ser https://: "${reference.url}"`);
  });

  issues.push(...validateQuestions(lesson.knowledgeCheck, "knowledgeCheck", file, lessonIds));

  return issues;
}

export function validateQuiz(quiz: QuizContent, context: Omit<ValidationContext, "glossaryIds">): ValidationIssue[] {
  const { file, catalog } = context;
  const issues: ValidationIssue[] = [];

  if (!moduleIdsOf(catalog).has(quiz.module)) {
    issues.push({ file, field: "module", message: `módulo "${quiz.module}" não existe no catálogo` });
  }
  if (quiz.questions.length === 0) {
    issues.push({ file, field: "questions", message: "o quiz precisa de pelo menos 1 questão" });
  }
  issues.push(...validateQuestions(quiz.questions, "questions", file, lessonIdsOf(catalog)));

  return issues;
}

export function validateGlossary(
  glossary: GlossaryEntry[],
  context: Omit<ValidationContext, "glossaryIds">,
): ValidationIssue[] {
  const { file, catalog } = context;
  const lessonIds = lessonIdsOf(catalog);
  const issues: ValidationIssue[] = [];
  const seen = new Set<string>();

  glossary.forEach((entry, index) => {
    if (seen.has(entry.id)) {
      issues.push({ file, field: `[${index}].id`, message: `id de termo repetido: "${entry.id}"` });
    }
    seen.add(entry.id);

    if (!lessonIds.has(entry.lesson)) {
      issues.push({
        file,
        field: `[${index}].lesson`,
        message: `o termo "${entry.id}" aponta para a aula inexistente ${entry.lesson}`,
      });
    }
  });

  return issues;
}

export function validateSummary(
  summary: SummaryContent,
  context: Omit<ValidationContext, "glossaryIds">,
): ValidationIssue[] {
  const { file, catalog } = context;
  const lessonIds = lessonIdsOf(catalog);
  const issues: ValidationIssue[] = [];

  if (!moduleIdsOf(catalog).has(summary.module)) {
    issues.push({ file, field: "module", message: `módulo "${summary.module}" não existe no catálogo` });
  }
  if (summary.concepts.length === 0) {
    issues.push({ file, field: "concepts", message: "o resumo precisa de pelo menos 1 conceito-chave" });
  }
  if (summary.lessons.length === 0) {
    issues.push({ file, field: "lessons", message: "o resumo precisa linkar pelo menos 1 aula" });
  }
  summary.lessons.forEach((lessonId, index) => {
    if (!lessonIds.has(lessonId)) {
      issues.push({ file, field: `lessons[${index}]`, message: `aula "${lessonId}" não existe no catálogo` });
    }
  });

  return issues;
}

/** Projeto guiado (LAB-01.3): objetivo, etapas, conceitos com links válidos (CNT-01.5) e código de referência. */
export function validateProject(
  project: ProjectContent,
  context: Omit<ValidationContext, "glossaryIds">,
): ValidationIssue[] {
  const { file, catalog } = context;
  const lessonIds = lessonIdsOf(catalog);
  const issues: ValidationIssue[] = [];
  const add = (field: string, message: string) => issues.push({ file, field, message });

  if (project.goal.trim() === "") add("goal", "o projeto precisa de um objetivo");
  if (project.steps.length === 0) add("steps", "o projeto precisa de pelo menos 1 etapa");
  if (project.concepts.length === 0) add("concepts", "o projeto precisa linkar pelo menos 1 aula");
  if (project.code.length === 0) add("code", "o projeto precisa de código de referência");

  project.concepts.forEach((target, index) => {
    if (!lessonIds.has(target)) add(`concepts[${index}]`, `o projeto ${project.id} aponta para a aula inexistente ${target}`);
  });

  return issues;
}
