import { useLayoutEffect, useState, type RefObject } from "react";

/**
 * Largura interna (`clientWidth`) do pai do elemento, em px, recalculada quando o pai muda de tamanho.
 * O pai de uma peça larga é o quadro que rola (`SceneScroll`): a largura dele não depende do desenho.
 * Sem ResizeObserver ou sem medida (jsdom), `null`.
 */
export function useParentWidth(ref: RefObject<Element | null>): number | null {
  const [width, setWidth] = useState<number | null>(null);

  useLayoutEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const next = parent.clientWidth;
      setWidth(next > 0 ? next : null);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(parent);
    return () => observer.disconnect();
  }, [ref]);

  return width;
}
