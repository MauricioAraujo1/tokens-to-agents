import type { MessageKey } from "../i18n/messages/pt-BR";
import type { AppSection } from "../types/app";

export interface AppSectionDefinition {
  id: AppSection;
  labelKey: MessageKey;
  descriptionKey: MessageKey;
}

export const APP_SECTIONS: AppSectionDefinition[] = [
  { id: "aprender", labelKey: "sections.aprender.label", descriptionKey: "sections.aprender.description" },
  { id: "pratica", labelKey: "sections.pratica.label", descriptionKey: "sections.pratica.description" },
  { id: "laboratorio", labelKey: "sections.laboratorio.label", descriptionKey: "sections.laboratorio.description" },
  { id: "resumos", labelKey: "sections.resumos.label", descriptionKey: "sections.resumos.description" },
];
