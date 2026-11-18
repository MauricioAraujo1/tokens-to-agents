import type { Lesson, LessonDifficulty, LessonStatus, LessonStep } from "../../types/course";

export interface GenericLessonInput {
  id: string;
  title: string;
  description: string;
  duration: number;
  difficulty: LessonDifficulty;
  status: LessonStatus;
}

export function createGenericLesson(input: GenericLessonInput): Lesson {
  return {
    id: input.id,
    title: input.title,
    description: input.description,
    duration: input.duration,
    difficulty: input.difficulty,
    status: input.status,
    steps: createGenericSteps(input.description),
  };
}

function createGenericSteps(description: string): LessonStep[] {
  return [
    {
      id: "concept",
      title: "Ideia central",
      shortTitle: "Conceito",
      description,
      badge: "concept",
      changes: ["O objetivo da aula foi apresentado."],
    },
    {
      id: "mechanism",
      title: "Como funciona",
      shortTitle: "Funcionamento",
      description:
        "Esta etapa detalha o mecanismo em ordem: entrada, processamento e saída. O diagrama desta aula ainda está em preparação.",
      badge: "solution",
      changes: ["O funcionamento passo a passo foi descrito."],
    },
    {
      id: "trade-offs",
      title: "Vantagens e limites",
      shortTitle: "Trade-offs",
      description:
        "Toda técnica tem custos. Aqui você compara vantagens, limitações e alternativas antes de escolher uma abordagem.",
      badge: "warning",
      tip: "Compare sempre com a alternativa mais simples antes de adotar uma técnica mais complexa.",
      changes: ["Limites e alternativas foram listados."],
    },
  ];
}
