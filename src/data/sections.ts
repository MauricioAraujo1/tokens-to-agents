import type { AppSection } from "../types/app";

export interface AppSectionDefinition {
  id: AppSection;
  label: string;
  description: string;
}

export const APP_SECTIONS: AppSectionDefinition[] = [
  {
    id: "aprender",
    label: "Aprender",
    description: "Trilha de aulas com diagramas interativos e passos guiados.",
  },
  {
    id: "pratica",
    label: "Prática",
    description: "Exercícios e mini-projetos para aplicar cada conceito.",
  },
  {
    id: "laboratorio",
    label: "Laboratório",
    description: "Experimentos com modelos, embeddings e bases vetoriais.",
  },
  {
    id: "resumos",
    label: "Resumos",
    description: "Revisões rápidas dos conceitos de cada módulo.",
  },
];
