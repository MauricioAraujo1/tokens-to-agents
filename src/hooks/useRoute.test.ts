import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useRoute } from "./useRoute";

describe("useRoute", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("lê a rota da URL atual ao montar", () => {
    window.history.replaceState(null, "", "/learn/03-08?step=4");

    const { result } = renderHook(() => useRoute());

    expect(result.current.route).toEqual({ name: "lesson", lessonId: "03-08", step: 4 });
  });

  it("navigate cria uma entrada nova no histórico e atualiza a rota", () => {
    const { result } = renderHook(() => useRoute());
    const lengthBefore = window.history.length;

    act(() => result.current.navigate({ name: "lesson", lessonId: "08-02", step: 3 }));

    expect(window.location.pathname).toBe("/learn/08-02");
    expect(window.location.search).toBe("?step=3");
    expect(window.history.length).toBe(lengthBefore + 1);
    expect(result.current.route).toEqual({ name: "lesson", lessonId: "08-02", step: 3 });
  });

  it("navigate com replace substitui a entrada atual sem criar outra", () => {
    const { result } = renderHook(() => useRoute());
    act(() => result.current.navigate({ name: "practice" }));
    const lengthBefore = window.history.length;

    act(() => result.current.navigate({ name: "summaries" }, { replace: true }));

    expect(window.location.pathname).toBe("/summaries");
    expect(window.history.length).toBe(lengthBefore);
    expect(result.current.route).toEqual({ name: "summaries" });
  });

  it("voltar do navegador atualiza a rota", async () => {
    const { result } = renderHook(() => useRoute());
    act(() => result.current.navigate({ name: "lab" }));
    act(() => result.current.navigate({ name: "lesson", lessonId: "08-02", step: null }));

    act(() => window.history.back());

    await waitFor(() => expect(result.current.route).toEqual({ name: "lab" }));
    expect(window.location.pathname).toBe("/lab");
  });
});
