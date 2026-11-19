import { Check, Copy, ExternalLink } from "lucide-react";
import { useId, useState, type MouseEvent, type ReactNode } from "react";
import { catalog } from "../../content/catalog";
import type { MessageKey } from "../../i18n/messages/pt-BR";
import { useI18n } from "../../i18n/useI18n";
import { findLessonLocation } from "../../lib/course";
import { buildPath, type Route } from "../../lib/router";
import type { LessonContent, ModuleMeta, Reference } from "../../types/content";
import { Badge, type BadgeTone } from "../ui/Badge";
import { Button } from "../ui/Button";

const REFERENCE_KIND_KEY: Record<Reference["kind"], MessageKey> = {
  paper: "reference.paper",
  docs: "reference.docs",
  repo: "reference.repo",
  article: "reference.article",
};

const REFERENCE_KIND_TONE: Record<Reference["kind"], BadgeTone> = {
  paper: "info",
  docs: "brand",
  repo: "success",
  article: "neutral",
};

interface LessonFooterSectionsProps {
  lesson: LessonContent;
  modules?: ModuleMeta[];
  /** Navegação da SPA para os conceitos relacionados; sem ela, o link recarrega a página no destino. */
  onNavigate?: (route: Route) => void;
  /** Entra depois dos trade-offs, na ordem das seções do padrão (o knowledge check). */
  children?: ReactNode;
}

function FooterSection({ title, children }: { title: string; children: ReactNode }) {
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-2 rounded-lg border border-line bg-surface p-4">
      <h2 id={titleId} className="text-[11px] font-bold uppercase leading-[14px] tracking-[1px] text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

function BulletList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-ink">{title}</h3>
      <ul dir="ltr" className="mt-1 list-disc ps-5 text-sm leading-relaxed text-muted">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/** Bloco de código com legenda e botão copiar; também usado no código de referência dos projetos guiados. */
export function CodeBlock({ code }: { code: { source: string; caption: string; language?: string } }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code.source);
      setCopied(true);
    } catch {
      // Sem permissão de clipboard: o botão continua disponível e o código pode ser selecionado.
      setCopied(false);
    }
  }

  return (
    <figure className="m-0 flex min-w-0 flex-col gap-2">
      {/* Legendas com nomes longos (torch.nn.functional…) quebram em qualquer ponto; o Copiar não sai da largura. */}
      <div className="flex min-w-0 items-start justify-between gap-2">
        <figcaption dir="ltr" className="min-w-0 text-sm text-muted wrap-anywhere">
          {code.caption}
        </figcaption>
        <Button size="sm" onClick={copy}>
          {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
          {copied ? t("footer.copied") : t("footer.copy")}
        </Button>
      </div>
      <pre dir="ltr" className="overflow-x-auto rounded-md border border-line bg-sunken p-3 font-mono text-xs leading-relaxed text-ink">
        <code data-language={code.language}>{code.source}</code>
      </pre>
    </figure>
  );
}

/** Rodapé da aula com as seções do padrão que não vivem nos passos (LES-01.12, AD-010). */
export function LessonFooterSections({ lesson, modules = catalog, onNavigate, children }: LessonFooterSectionsProps) {
  const { t } = useI18n();
  const { tradeOffs } = lesson;

  function navigateTo(route: Route) {
    return (event: MouseEvent<HTMLAnchorElement>) => {
      if (!onNavigate) return;
      event.preventDefault();
      onNavigate(route);
    };
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <FooterSection title={t("footer.realWorld")}>
        {/* O conteúdo do rodapé é PT (AD-003): isolado em LTR dentro do RTL; os títulos das seções seguem o idioma. */}
        <p dir="ltr" className="text-sm leading-relaxed text-muted">
          {lesson.realWorldExample}
        </p>
      </FooterSection>

      {lesson.code && (
        <FooterSection title={t("footer.code")}>
          <CodeBlock code={lesson.code} />
        </FooterSection>
      )}

      <FooterSection title={t("footer.tradeOffs")}>
        <div className="grid gap-3 sm:grid-cols-2">
          <BulletList title={t("footer.pros")} items={tradeOffs.pros} />
          <BulletList title={t("footer.cons")} items={tradeOffs.cons} />
        </div>
        {tradeOffs.alternatives && tradeOffs.alternatives.length > 0 && (
          <BulletList title={t("footer.alternatives")} items={tradeOffs.alternatives} />
        )}
      </FooterSection>

      {children}

      {lesson.related.length > 0 && (
        <FooterSection title={t("footer.related")}>
          <ul className="flex flex-wrap gap-2">
            {lesson.related.map((lessonId) => {
              const location = findLessonLocation(modules, lessonId);
              const route: Route = { name: "lesson", lessonId, step: null };
              return (
                <li key={lessonId}>
                  <a
                    href={buildPath(route)}
                    onClick={navigateTo(route)}
                    className="inline-flex items-center gap-1.5 rounded-[14px] border border-line-strong bg-surface px-3 py-[7px] text-xs font-medium text-ink transition-[background-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-sunken hover:shadow-press-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-line-strong"
                  >
                    <span className="text-[11px] text-muted">{location?.lesson.number ?? lessonId}</span>
                    <bdi dir="ltr">{location?.lesson.title ?? lessonId}</bdi>
                  </a>
                </li>
              );
            })}
          </ul>
        </FooterSection>
      )}

      <FooterSection title={t("footer.references")}>
        <ul className="flex flex-col gap-1.5">
          {lesson.references.map((reference) => (
            <li key={reference.url} className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
              <Badge tone={REFERENCE_KIND_TONE[reference.kind]}>{t(REFERENCE_KIND_KEY[reference.kind])}</Badge>
              {/* Título longo quebra dentro da largura; o ícone segue a última linha. */}
              <a
                href={reference.url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 text-ink underline underline-offset-2 wrap-anywhere"
              >
                <bdi dir="ltr">{reference.title}</bdi>{" "}
                <ExternalLink size={12} aria-hidden="true" className="inline align-[-1px]" />
                <span className="sr-only">{t("footer.newTab")}</span>
              </a>
            </li>
          ))}
        </ul>
      </FooterSection>
    </div>
  );
}
