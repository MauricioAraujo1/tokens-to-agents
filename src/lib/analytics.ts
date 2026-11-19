import { inject, type BeforeSendEvent } from "@vercel/analytics";

// API conferida no pacote instalado (@vercel/analytics 2.0.1, dist/index.d.ts): `inject(props)` com
// `mode` e `beforeSend`, que pode alterar ou cancelar (retornando null) cada evento antes do envio.

interface AnalyticsOptions {
  /** Só o build de produção mede visitas. */
  isProduction?: boolean;
  injectScript?: typeof inject;
}

/**
 * Filtro de todo evento (OPS-01.3): só a visualização de página sai, e só com a origem e o caminho.
 * A query (por exemplo `?step=4`) e o hash ficam no navegador; eventos customizados são descartados.
 * O progresso do aluno nunca é lido aqui.
 */
export function sanitizeEvent(event: BeforeSendEvent): BeforeSendEvent | null {
  if (event.type !== "pageview") return null;
  const url = new URL(event.url);
  return { type: "pageview", url: `${url.origin}${url.pathname}` };
}

/**
 * Liga o Vercel Web Analytics (agregado e sem cookies) no build de produção. O script entra com
 * `defer` e nada espera por ele; se o inject falhar ou o script for bloqueado, o app segue (OPS-01.4).
 * Devolve `true` quando o script foi injetado.
 */
export function initAnalytics({ isProduction = import.meta.env.PROD, injectScript = inject }: AnalyticsOptions = {}): boolean {
  if (!isProduction) return false;
  try {
    injectScript({ mode: "production", beforeSend: sanitizeEvent });
    return true;
  } catch {
    return false;
  }
}
