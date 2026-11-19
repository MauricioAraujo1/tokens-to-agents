import { useCallback, useSyncExternalStore } from "react";

/** Abaixo de 768 px (o `md` do Tailwind): barra de passos fixa e cenas no layout de celular (RSP-01.3). */
export const MOBILE_QUERY = "(max-width: 767.98px)";

/** Se a media query casa agora; acompanha as mudanças. Sem `matchMedia`, nunca casa. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window.matchMedia !== "function") return () => {};
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => typeof window.matchMedia === "function" && window.matchMedia(query).matches,
    () => false,
  );
}
