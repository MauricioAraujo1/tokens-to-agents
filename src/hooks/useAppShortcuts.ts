import { useEffect } from "react";

// O App registra só a busca (Ctrl/Cmd K); a LessonPage registra os atalhos de passo.
interface AppShortcutsOptions {
  isNavigationEnabled: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  onTogglePlay?: () => void;
  /** R: repete a animação do passo atual (LES-01.7). */
  onRestart?: () => void;
  onOpenSearch?: () => void;
}

const TYPING_TARGET_SELECTOR = "input, textarea, select, [contenteditable='true']";
const INTERACTIVE_TARGET_SELECTOR = "button, a[href], [role='button']";

function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(TYPING_TARGET_SELECTOR) !== null;
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(INTERACTIVE_TARGET_SELECTOR) !== null;
}

export function useAppShortcuts({
  isNavigationEnabled,
  onPrevious,
  onNext,
  onTogglePlay,
  onRestart,
  onOpenSearch,
}: AppShortcutsOptions): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        if (onOpenSearch) {
          event.preventDefault();
          onOpenSearch();
        }
        return;
      }

      if (
        !isNavigationEnabled ||
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        isTypingTarget(event.target)
      ) {
        return;
      }

      // Em RTL o layout espelha: → aponta para o passo anterior e ← para o próximo, como o swipe
      // (`useSwipe`) e os ícones espelhados dos botões. O `dir` vem do <html>, que o I18nProvider mantém.
      const isRtl = document.documentElement.dir === "rtl";
      const previousKey = isRtl ? "ArrowRight" : "ArrowLeft";
      const nextKey = isRtl ? "ArrowLeft" : "ArrowRight";

      if (event.key === previousKey && onPrevious) {
        event.preventDefault();
        onPrevious();
      } else if (event.key === nextKey && onNext) {
        event.preventDefault();
        onNext();
      } else if (event.key === " " && onTogglePlay && !isInteractiveTarget(event.target)) {
        event.preventDefault();
        onTogglePlay();
      } else if (event.key.toLowerCase() === "r" && onRestart && !event.shiftKey) {
        event.preventDefault();
        onRestart();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isNavigationEnabled, onPrevious, onNext, onTogglePlay, onRestart, onOpenSearch]);
}
