import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { SCENE_TEXT_PX, solveSceneFont, type SvgBox, type ViewBoxSize } from "../scene/textScale";

/**
 * Largura do SVG e a maior altura que ele pode ocupar. Sem altura definida pelo contêiner, o SVG
 * segue a proporção da viewBox até o `max-height` do CSS; quando o contêiner o deixa mais baixo que
 * isso, a altura medida é o limite.
 */
export function measureSvgBox(element: Element): SvgBox | null {
  const rect = element.getBoundingClientRect();
  if (!(rect.width > 0)) return null;
  const cssMax = Number.parseFloat(getComputedStyle(element).maxHeight);
  const maxHeight = Number.isFinite(cssMax) && cssMax > 0 ? cssMax : Number.POSITIVE_INFINITY;
  if (!(element instanceof SVGSVGElement)) return { width: rect.width, maxHeight };
  const viewBox = element.viewBox?.baseVal;
  const aspectHeight = viewBox && viewBox.width > 0 ? (rect.width * viewBox.height) / viewBox.width : rect.height;
  const constrained = rect.height > 0 && rect.height + 1 < Math.min(aspectHeight, maxHeight);
  return { width: rect.width, maxHeight: constrained ? rect.height : maxHeight };
}

const MIN_FONT_SLACK = 0.1;

function sameBox(a: SvgBox | null, b: SvgBox | null): boolean {
  if (a === null || b === null) return a === b;
  const close = (x: number, y: number) => x === y || Math.abs(x - y) < 0.5;
  return close(a.width, b.width) && close(a.maxHeight, b.maxHeight);
}

/**
 * Escala real do SVG (px de tela por unidade da viewBox) e o font-size, em unidades da viewBox, que
 * deixa o texto com 11–14 px na tela (LEG-01.1). Recalcula quando o ResizeObserver avisa que o SVG
 * mudou de tamanho (LEG-01.2). `sizeAt` devolve a viewBox da peça para um font-size; peças de viewBox
 * fixa devolvem sempre a mesma. Sem ResizeObserver, a escala é 1.
 */
export function useSvgTextScale(
  ref: RefObject<Element | null>,
  sizeAt: (font: number) => ViewBoxSize,
  target: number = SCENE_TEXT_PX.target,
  maxFont?: number,
  minFont?: number,
): { scale: number; font: number; box: SvgBox | null; maxWidth?: number } {
  const [box, setBox] = useState<SvgBox | null>(null);
  const observed = useRef<{ element: Element; observer: ResizeObserver } | null>(null);

  // Sem lista de dependências: a peça pode trocar o elemento medido (o Pipeline alterna SVG e chips).
  useLayoutEffect(() => {
    const element = ref.current;
    if (observed.current?.element === element) return;
    observed.current?.observer.disconnect();
    observed.current = null;
    if (!element || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const next = measureSvgBox(element);
      setBox((current) => (sameBox(current, next) ? current : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    observed.current = { element, observer };
  });

  // Com outro teto (`fitToFrame`, T22), a peça troca a própria largura mínima logo depois de medir o
  // quadro: mede de novo, sem esperar o ResizeObserver. O estado só muda quando a caixa muda.
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const next = measureSvgBox(element);
    setBox((current) => (sameBox(current, next) ? current : next));
  }, [ref, maxFont]);

  useEffect(
    () => () => {
      observed.current?.observer.disconnect();
      observed.current = null;
    },
    [],
  );

  const solved = solveSceneFont(box, sizeAt, target, maxFont);
  // Com `minFont`, a peça não amplia o desenho além do tamanho de referência: a fonte para no mínimo
  // e o SVG fica estreito o bastante para o texto dar `target` px (o resto do quadro fica livre).
  // A folga mantém o limite quando o SVG já está estreito e a fonte calculada é o próprio mínimo.
  if (box && minFont !== undefined && solved.font < minFont + MIN_FONT_SLACK) {
    const scale = target / minFont;
    return { font: minFont, scale, box, maxWidth: sizeAt(minFont).width * scale };
  }
  return { ...solved, box };
}
