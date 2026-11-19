import { useEffect } from "react";

interface AppShortcutsOptions {
  isNavigationEnabled: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onTogglePlay: () => void;
  onRestart: () => void;
  onOpenSearch: () => void;
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
        event.preventDefault();
        onOpenSearch();
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

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onPrevious();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        onNext();
      } else if (event.key === " " && !isInteractiveTarget(event.target)) {
        event.preventDefault();
        onTogglePlay();
      } else if (event.key.toLowerCase() === "r" && !event.shiftKey) {
        event.preventDefault();
        onRestart();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isNavigationEnabled, onPrevious, onNext, onTogglePlay, onRestart, onOpenSearch]);
}
