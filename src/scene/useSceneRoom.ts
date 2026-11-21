import { useLayoutEffect, useState, type RefObject } from "react";

// Altura e recuo medidos da cena (GEO-01.3): a moldura da aula diz quanto espaço sobra na tela, e o
// painel sobreposto diz quanto a peça de baixo precisa descer.

/** Menor altura da cena, em px: com o título muito alto, a cena passa da dobra em vez de sumir. */
export const MIN_SCENE_ROOM = 320;

/**
 * Altura que sobra para a cena na tela (GEO-01.3): do topo da cena, com a área que rola no início, até
 * o fim da parte visível dessa área (ou da janela). Nunca menos que `MIN_SCENE_ROOM`.
 */
export function sceneRoom(sceneTop: number, visibleBottom: number): number {
  return Math.max(MIN_SCENE_ROOM, Math.floor(visibleBottom - sceneTop));
}

function scrollParent(element: Element): HTMLElement | null {
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    const { overflowY } = getComputedStyle(parent);
    if (overflowY === "auto" || overflowY === "scroll") return parent;
  }
  return null;
}

/**
 * Altura que a cena pode ocupar sem passar da dobra, em px, ou `null` sem medida (desligado, ou sem
 * ResizeObserver, como no jsdom). O título da aula pode ter 1 a 3 linhas, então a altura é medida, e
 * não um 58vh fixo. Recalcula quando a janela, a área que rola ou o conteúdo dela mudam de tamanho; a
 * altura da própria cena não muda o seu topo, então não há laço.
 */
export function useSceneRoom(ref: RefObject<HTMLElement | null>, enabled: boolean): number | null {
  const [room, setRoom] = useState<number | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!enabled || !element || typeof ResizeObserver === "undefined") {
      setRoom(null);
      return;
    }
    const port = scrollParent(element);
    const measure = () => {
      const portTop = port ? port.getBoundingClientRect().top : 0;
      const visibleBottom = Math.min(window.innerHeight, port ? portTop + port.clientHeight : window.innerHeight);
      // O topo como se a área estivesse no início: rolar a aula não muda a altura da cena.
      const top = element.getBoundingClientRect().top + (port ? port.scrollTop : window.scrollY);
      setRoom(sceneRoom(top, visibleBottom));
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (port) {
      observer.observe(port);
      for (const child of port.children) observer.observe(child);
    }
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [ref, enabled]);

  return room;
}

/** Folga entre o painel sobreposto e a peça de baixo, em px. */
export const OVERLAY_GAP = 8;

/**
 * No layout `overlay`, quanto a peça de baixo desce para o painel HTML sobreposto não cobrir os rótulos
 * dela (o painel fica no canto de cima, e a peça não conhece a área dele). Mede o fim do painel mais
 * baixo em relação ao topo da peça de baixo; 0 sem medida. O recuo fica dentro da peça (padding), então
 * o topo dela não muda e a medida não entra em laço. `scene` refaz a medida quando as peças mudam.
 */
export function useOverlayInset(ref: RefObject<HTMLElement | null>, enabled: boolean, scene: unknown): number {
  const [inset, setInset] = useState(0);

  useLayoutEffect(() => {
    const figure = ref.current;
    if (!enabled || !figure || typeof ResizeObserver === "undefined") {
      setInset(0);
      return;
    }
    const pieces = [...figure.querySelectorAll<HTMLElement>(":scope > .scene-piece")];
    const [base, ...overlays] = pieces;
    if (!base || overlays.length === 0) return;
    const measure = () => {
      const baseTop = base.getBoundingClientRect().top;
      const bottom = Math.max(...overlays.map((overlay) => overlay.getBoundingClientRect().bottom));
      setInset(Math.max(0, Math.ceil(bottom - baseTop + OVERLAY_GAP)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    for (const overlay of overlays) observer.observe(overlay);
    return () => observer.disconnect();
  }, [ref, enabled, scene]);

  return inset;
}
