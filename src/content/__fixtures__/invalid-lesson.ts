import type { LessonContent } from "../../types/content";

// Fixture de teste: aula de estrutura válida para o tipo, mas com conteúdo inválido
// (link related para uma aula que não existe). Fica fora dos globs de produção.
const invalidLesson: LessonContent = {
  id: "08-02",
  subtitle: "Fixture inválida",
  objectives: ["Provar que conteúdo inválido quebra o teste"],
  steps: [
    {
      id: "concept",
      shortTitle: "Conceito",
      title: "Conceito",
      tag: "context",
      body: ["Texto do conceito."],
      scene: { kind: "custom", id: "rag-flow" },
    },
    {
      id: "mechanism",
      shortTitle: "Mecanismo",
      title: "Mecanismo",
      tag: "mechanism",
      body: ["Texto do mecanismo."],
      scene: { kind: "custom", id: "rag-flow" },
    },
  ],
  realWorldExample: "Exemplo real.",
  tradeOffs: { pros: ["Vantagem"], cons: ["Limitação"] },
  knowledgeCheck: [
    { id: "q1", prompt: "Pergunta?", options: ["A", "B"], correct: 0, explanation: "Porque A.", lesson: "08-02" },
  ],
  related: ["99-99"],
  references: [{ title: "Documentação", url: "https://example.org/docs", kind: "docs" }],
};

export default invalidLesson;
