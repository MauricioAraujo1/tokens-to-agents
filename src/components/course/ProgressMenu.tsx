import { Download, RotateCcw, Upload } from "lucide-react";
import { useEffect, useId, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import type { MessageKey } from "../../i18n/messages/pt-BR";
import { useI18n } from "../../i18n/useI18n";
import type { ProgressV1 } from "../../lib/progress/schema";
import { progressStore, type ProgressStore } from "../../lib/progress/store";
import { exportProgress, parseImport, PROGRESS_FILE_NAME, type ImportError } from "../../lib/progress/transfer";
import { cn } from "../../lib/utils";
import { Button } from "../ui/Button";

const IMPORT_ERRORS: Record<ImportError, MessageKey> = {
  "not-json": "progressMenu.errorNotJson",
  "too-large": "progressMenu.errorTooLarge",
  "unknown-schema": "progressMenu.errorUnknownSchema",
};

type Pending = { kind: "import"; progress: ProgressV1 } | { kind: "reset" };

interface ProgressMenuProps {
  store?: ProgressStore;
  /** Moldura do bloco; o padrão é o rodapé da sidebar. A home usa o menu dentro do card de progresso. */
  className?: string;
  /** Ações numa linha de links de texto, como no card de progresso do preview 07; `leading` abre a linha. */
  inline?: boolean;
  leading?: ReactNode;
}

const INLINE_ACTION_CLASS =
  "inline-flex items-center gap-1 rounded-sm text-[11px] font-medium leading-3.5 text-ink underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-line-strong";

function MenuAction({ inline, onClick, children }: { inline: boolean; onClick: () => void; children: ReactNode }) {
  if (inline) {
    return (
      <button type="button" className={INLINE_ACTION_CLASS} onClick={onClick}>
        {children}
      </button>
    );
  }
  return (
    <Button variant="ghost" size="sm" className="justify-start px-1" onClick={onClick}>
      {children}
    </Button>
  );
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function ProgressMenu({
  store = progressStore,
  className = "border-t border-line px-4 py-3",
  inline = false,
  leading,
}: ProgressMenuProps) {
  const iconSize = inline ? 12 : 14;
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const dialogTitleId = useId();
  const [pending, setPending] = useState<Pending | null>(null);
  const { t } = useI18n();
  // Guardam a chave, não o texto: trocar de idioma traduz também o aviso que já está na tela.
  const [error, setError] = useState<MessageKey | null>(null);
  const [notice, setNotice] = useState<MessageKey | null>(null);

  useEffect(() => {
    if (pending) dialogRef.current?.querySelector("button")?.focus();
  }, [pending]);

  function handleExport() {
    downloadBlob(exportProgress(store.getSnapshot()), PROGRESS_FILE_NAME);
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setNotice(null);
    const result = await parseImport(file);
    if (!result.ok) {
      setPending(null);
      setError(IMPORT_ERRORS[result.error]);
      return;
    }
    setError(null);
    setPending({ kind: "import", progress: result.value });
  }

  function confirm() {
    if (!pending) return;
    if (pending.kind === "import") {
      store.replace(pending.progress);
      setNotice("progressMenu.imported");
    } else {
      store.reset();
      setNotice("progressMenu.resetDone");
    }
    setPending(null);
  }

  function requestReset() {
    setError(null);
    setNotice(null);
    setPending({ kind: "reset" });
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div
        role="group"
        aria-label={t("progressMenu.group")}
        className={
          inline
            ? "flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] leading-3.5"
            : "flex flex-col items-stretch gap-0.5"
        }
      >
        {leading}
        <MenuAction inline={inline} onClick={handleExport}>
          <Download size={iconSize} aria-hidden="true" />
          {t("progressMenu.export")}
        </MenuAction>
        <MenuAction inline={inline} onClick={() => inputRef.current?.click()}>
          <Upload size={iconSize} aria-hidden="true" />
          {t("progressMenu.import")}
        </MenuAction>
        <MenuAction inline={inline} onClick={requestReset}>
          <RotateCcw size={iconSize} aria-hidden="true" />
          {t("progressMenu.reset")}
        </MenuAction>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        aria-label={t("progressMenu.file")}
        className="hidden"
        onChange={handleFile}
      />

      {pending && (
        <div
          ref={dialogRef}
          role="alertdialog"
          aria-labelledby={dialogTitleId}
          className="mt-1 flex flex-col gap-2 rounded-md border border-line-strong bg-surface-raised p-2.5"
        >
          <p id={dialogTitleId} className="text-xs text-ink-primary">
            {pending.kind === "import" ? t("progressMenu.confirmImport") : t("progressMenu.confirmReset")}
          </p>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={confirm}>
              {pending.kind === "import" ? t("progressMenu.replace") : t("progressMenu.resetConfirm")}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setPending(null)}>
              {t("progressMenu.cancel")}
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs text-state-danger-ink">
          {t(error)}
        </p>
      )}
      <p role="status" className="text-xs text-ink-muted">
        {notice && t(notice)}
      </p>
    </div>
  );
}
