import { X } from "lucide-react";
import { useState } from "react";
import { useI18n } from "../../i18n/useI18n";
import { createSafeStorage, safeStorage, type SafeStorage } from "../../lib/storage";

export const STORAGE_NOTICE_DISMISSED_KEY = "t2a:storage-notice-dismissed";

// Sem localStorage, o sessionStorage costuma falhar também: aí o flag fica em memória até recarregar a página.
const sessionFlags = createSafeStorage(() => globalThis.sessionStorage);

interface StorageNoticeProps {
  storage?: Pick<SafeStorage, "available">;
  session?: SafeStorage;
}

/** Aviso discreto, uma vez por sessão, de que o progresso não será salvo (PRG-01.7). */
export function StorageNotice({ storage = safeStorage, session = sessionFlags }: StorageNoticeProps) {
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState(() => session.get(STORAGE_NOTICE_DISMISSED_KEY) === "1");

  if (storage.available || dismissed) return null;

  function dismiss() {
    session.set(STORAGE_NOTICE_DISMISSED_KEY, "1");
    setDismissed(true);
  }

  return (
    <div
      role="status"
      aria-label={t("storageNotice.label")}
      className="fixed bottom-4 right-4 z-50 flex max-w-sm items-start gap-3 rounded-md border border-line-strong bg-surface-raised p-3 text-xs text-ink-primary shadow-[2px_2px_0_0_var(--shadow-hard)]"
    >
      <p>{t("storageNotice.message")}</p>
      <button
        type="button"
        aria-label={t("storageNotice.close")}
        onClick={dismiss}
        className="shrink-0 rounded text-ink-muted hover:text-ink-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-line-strong"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}
