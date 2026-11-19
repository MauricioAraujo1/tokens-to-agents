import { describe, expect, it } from "vitest";
import { buildPath, parseRoute, resolveStep, type Route } from "./router";

function parseUrl(url: string): Route {
  const { pathname, search } = new URL(url, "https://example.test");
  return parseRoute(pathname, search);
}

describe("parseRoute e buildPath", () => {
  const routes: [Route, string][] = [
    [{ name: "home" }, "/"],
    [{ name: "lesson", lessonId: "08-02", step: null }, "/learn/08-02"],
    [{ name: "lesson", lessonId: "03-08", step: 4 }, "/learn/03-08?step=4"],
    [{ name: "practice" }, "/practice"],
    [{ name: "practice", moduleId: "03" }, "/practice/03"],
    [{ name: "lab" }, "/lab"],
    [{ name: "lab", playgroundId: "bpe" }, "/lab/playground/bpe"],
    [{ name: "lab", projectId: "01" }, "/lab/project/01"],
    [{ name: "summaries" }, "/summaries"],
    [{ name: "summaries", moduleId: "17" }, "/summaries/17"],
    [{ name: "not-found" }, "/404"],
  ];

  it.each(routes)("faz ida e volta de %o", (route, path) => {
    expect(buildPath(route)).toBe(path);
    expect(parseUrl(path)).toEqual(route);
  });

  it("aceita barra final no caminho", () => {
    expect(parseUrl("/learn/06-05/")).toEqual({ name: "lesson", lessonId: "06-05", step: null });
  });

  it.each([
    "/learn/99-99",
    "/learn/99/x",
    "/learn",
    "/learn/08-02/extra",
    "/practice/99",
    "/summaries/18",
    "/lab/playground",
    "/lab/outro/x",
    "/rota-qualquer",
    "/learn/%E0%A4%A",
  ])("devolve not-found para %s (NAV-01.4)", (path) => {
    expect(parseUrl(path)).toEqual({ name: "not-found" });
  });
});

describe("step da aula (LES-01.10, LES-01.11)", () => {
  it("lê o passo pedido na URL", () => {
    expect(parseUrl("/learn/03-08?step=4")).toEqual({ name: "lesson", lessonId: "03-08", step: 4 });
    expect(resolveStep(4, 10)).toBe(4);
    expect(resolveStep(10, 10)).toBe(10);
  });

  it.each(["", "?step=", "?step=0", "?step=-2", "?step=abc", "?step=1.5", "?step=2x"])(
    "abre o passo 1 quando a query é %j",
    (search) => {
      const route = parseUrl(`/learn/08-02${search}`);
      expect(route).toEqual({ name: "lesson", lessonId: "08-02", step: null });
      expect(resolveStep(route.name === "lesson" ? route.step : 99, 10)).toBe(1);
    },
  );

  it("abre o passo 1 quando o passo pedido passa do total de passos", () => {
    const route = parseUrl("/learn/08-02?step=11");
    expect(route).toEqual({ name: "lesson", lessonId: "08-02", step: 11 });
    expect(resolveStep(11, 10)).toBe(1);
  });
});
