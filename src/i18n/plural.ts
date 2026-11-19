/**
 * Mensagem com plural: uma forma por categoria do `Intl.PluralRules` do idioma.
 * `other` é obrigatória; cada idioma declara só as categorias que usa (o russo usa `few` e `many`, o japonês só `other`).
 */
export type PluralMessage = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };

/** Marca a chave como plural no `pt-BR.ts`, para que `Messages = typeof ptBR` aceite outras categorias nos idiomas. */
export function plural(forms: PluralMessage): PluralMessage {
  return forms;
}

export function isPluralMessage(value: unknown): value is PluralMessage {
  return typeof value === "object" && value !== null && typeof (value as PluralMessage).other === "string";
}
