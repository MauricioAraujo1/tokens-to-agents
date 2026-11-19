import { useI18n } from "../../i18n/useI18n";

/** Página da referência que inspirou o formato das aulas (spec, Problem Statement). */
export const INSPIRATION_URL = "https://designed-to-scale.vercel.app";
/** Licenças do projeto (AD-006): MIT para o código e CC BY-SA 4.0 para o conteúdo. */
export const CODE_LICENSE_URL = "https://opensource.org/license/mit";
export const CONTENT_LICENSE_URL = "https://creativecommons.org/licenses/by-sa/4.0/";

const LINK_CLASS =
  "rounded underline-offset-2 hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-line-strong";

/** Rodapé com o crédito à inspiração e as licenças (OPS-01.5, OPS-01.6). */
export function SiteFooter() {
  const { t } = useI18n();
  const links = [
    { href: INSPIRATION_URL, label: t("siteFooter.inspiredBy", { name: "designed-to-scale" }) },
    { href: CODE_LICENSE_URL, label: t("siteFooter.codeLicense") },
    { href: CONTENT_LICENSE_URL, label: t("siteFooter.contentLicense") },
  ];

  return (
    <footer>
      <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-muted">
        {links.map((link) => (
          <li key={link.href} className="flex items-center gap-3 after:content-['·']">
            <a href={link.href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
              {link.label}
              <span className="sr-only"> {t("footer.newTab")}</span>
            </a>
          </li>
        ))}
        <li>{t("siteFooter.privacy")}</li>
      </ul>
    </footer>
  );
}
