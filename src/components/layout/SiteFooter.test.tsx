import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteFooter } from "./SiteFooter";

describe("SiteFooter", () => {
  it("credita a inspiração em designed-to-scale (OPS-01.6)", () => {
    render(<SiteFooter />);

    const credit = screen.getByRole("link", { name: /^Inspirado em designed-to-scale/ });
    expect(credit).toHaveAttribute("href", "https://designed-to-scale.vercel.app");
  });

  it("tem os links das licenças MIT (código) e CC BY-SA 4.0 (conteúdo) (OPS-01.5)", () => {
    render(<SiteFooter />);

    expect(screen.getByRole("link", { name: /^código MIT/ })).toHaveAttribute("href", "https://opensource.org/license/mit");
    expect(screen.getByRole("link", { name: /^conteúdo CC BY-SA 4\.0/ })).toHaveAttribute(
      "href",
      "https://creativecommons.org/licenses/by-sa/4.0/",
    );
  });

  it("os links externos abrem em nova aba sem expor a página de origem", () => {
    render(<SiteFooter />);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(3);
    for (const link of links) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
      expect(link).toHaveAccessibleName(/\(abre em nova aba\)$/);
    }
  });
});
