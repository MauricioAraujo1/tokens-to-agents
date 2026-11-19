import type { BeforeSendEvent, inject } from "@vercel/analytics";
import { describe, expect, it, vi } from "vitest";
import { initAnalytics, sanitizeEvent } from "./analytics";
import { createProgressStore } from "./progress/store";
import { createSafeStorage } from "./storage";

type InjectProps = Parameters<typeof inject>[0];

function injectSpy() {
  return vi.fn<(props?: InjectProps) => void>();
}

describe("initAnalytics (OPS-01.3, OPS-01.4)", () => {
  it("fora de produção não injeta o script", () => {
    const injectScript = injectSpy();

    expect(initAnalytics({ isProduction: false, injectScript })).toBe(false);
    expect(injectScript).not.toHaveBeenCalled();
  });

  it("no teste (build de desenvolvimento) o padrão também não injeta", () => {
    const injectScript = injectSpy();

    expect(initAnalytics({ injectScript })).toBe(false);
    expect(injectScript).not.toHaveBeenCalled();
  });

  it("em produção injeta o Vercel Web Analytics no modo production, com o filtro de eventos", () => {
    const injectScript = injectSpy();

    expect(initAnalytics({ isProduction: true, injectScript })).toBe(true);
    expect(injectScript).toHaveBeenCalledTimes(1);
    expect(injectScript.mock.calls[0][0]).toEqual({ mode: "production", beforeSend: sanitizeEvent });
  });

  it("um erro no inject não quebra o app", () => {
    const injectScript = injectSpy().mockImplementation(() => {
      throw new Error("bloqueado pelo navegador");
    });

    expect(() => initAnalytics({ isProduction: true, injectScript })).not.toThrow();
    expect(initAnalytics({ isProduction: true, injectScript })).toBe(false);
  });

  it("nenhum payload leva dados do ProgressStore", () => {
    const store = createProgressStore(createSafeStorage(() => undefined));
    store.completeLesson("03-08");
    store.setLastVisited("03-08", 4);
    store.recordQuiz("03", { correct: 7, total: 8 });
    const injectScript = injectSpy();

    initAnalytics({ isProduction: true, injectScript });
    const props = injectScript.mock.calls[0][0]!;
    const pageview = props.beforeSend!({ type: "pageview", url: "https://tokens-to-agents.vercel.app/learn/03-08?step=4" });

    expect(Object.keys(props).sort()).toEqual(["beforeSend", "mode"]);
    expect(pageview).toEqual({ type: "pageview", url: "https://tokens-to-agents.vercel.app/learn/03-08" });
    expect(JSON.stringify(pageview)).not.toMatch(/step|completed|quizBest|lastVisited|7\/8/);
  });
});

describe("sanitizeEvent", () => {
  it("manda só a origem e o caminho da página, sem query nem hash", () => {
    const event: BeforeSendEvent = { type: "pageview", url: "https://example.com/practice/03?step=2&x=1#top" };

    expect(sanitizeEvent(event)).toEqual({ type: "pageview", url: "https://example.com/practice/03" });
  });

  it("descarta eventos customizados: só a visualização de página é medida", () => {
    expect(sanitizeEvent({ type: "event", url: "https://example.com/" })).toBeNull();
  });
});
