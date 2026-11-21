import { useLayoutEffect, useState, type RefObject } from "react";

/** Sobra, em px, abaixo da qual a diferença entre conteúdo e quadro é arredondamento, não rolagem. */
const OVERFLOW_SLACK = 1;

/**
 * Se o conteúdo passa da largura do elemento, que então rola na horizontal. Recalcula quando o
 * elemento ou um filho muda de tamanho. Sem ResizeObserver (jsdom), não há rolagem.
 */
export function useHorizontalOverflow(ref: RefObject<HTMLElement | null>, contentWidth?: number): boolean {
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const check = () => setOverflows(element.scrollWidth - element.clientWidth > OVERFLOW_SLACK);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(element);
    for (const child of element.children) observer.observe(child);
    return () => observer.disconnect();
  }, [ref]);

  // Quando a peça troca a própria largura mínima (`contentWidth`) depois de medir o quadro (T22,
  // `fitToFrame`), confere de novo, sem esperar o ResizeObserver.
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    setOverflows(element.scrollWidth - element.clientWidth > OVERFLOW_SLACK);
  }, [ref, contentWidth]);

  return overflows;
}
