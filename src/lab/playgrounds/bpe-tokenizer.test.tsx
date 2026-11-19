import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { applyMerges, mergePair, trainBpe, type Merge } from "../bpe";
import { BpeTokenizerPlayground } from "./bpe-tokenizer";

// Corpus fixo com os merges calculados à mão:
// pares em "banana bandana": an 4, na 3, ba 2, nd 1, da 1 → 1º merge a+n;
// depois b+an 2 e an+a 2 empatam, e vence o que aparece primeiro → 2º b+an; 3º an+a.
const CORPUS = "banana bandana";
const MERGES: Merge[] = [
  ["a", "n"],
  ["b", "an"],
  ["an", "a"],
];

describe("BPE (lógica)", () => {
  it("aprende os merges esperados do corpus fixo, com empate para o par que aparece primeiro", () => {
    expect(trainBpe(CORPUS, 3)).toEqual(MERGES);
  });

  it("para quando nenhum par se repete", () => {
    expect(trainBpe(CORPUS, 10)).toEqual(MERGES);
  });

  it("junta o par da esquerda para a direita, sem sobreposição", () => {
    expect(mergePair(["a", "a", "a"], ["a", "a"])).toEqual(["aa", "a"]);
  });

  it("aplica os merges passo a passo e conta as ocorrências no texto", () => {
    expect(applyMerges(CORPUS, MERGES, 0).words).toEqual([[..."banana"], [..."bandana"]]);
    expect(applyMerges(CORPUS, MERGES, 1).words).toEqual([
      ["b", "an", "an", "a"],
      ["b", "an", "d", "an", "a"],
    ]);
    const all = applyMerges(CORPUS, MERGES);
    expect(all.words).toEqual([
      ["ban", "ana"],
      ["ban", "d", "ana"],
    ]);
    expect(all.steps.map((step) => [step.token, step.occurrences])).toEqual([
      ["an", 4],
      ["ban", 2],
      ["ana", 2],
    ]);
  });
});

describe("BpeTokenizerPlayground (LAB-01.1)", () => {
  function renderPlayground() {
    const view = render(<BpeTokenizerPlayground merges={MERGES} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Texto" }), { target: { value: CORPUS } });
    return view;
  }

  const tokens = (container: HTMLElement) =>
    [...container.querySelectorAll("[data-token]")].map((token) => token.textContent);
  const setSteps = (value: number) =>
    fireEvent.change(screen.getByRole("slider", { name: "Merges aplicados" }), { target: { value: String(value) } });

  it("com todos os merges, o texto fixo vira os tokens esperados", () => {
    const { container } = renderPlayground();

    expect(tokens(container)).toEqual(["ban", "ana", "▁ban", "d", "ana"]);
    expect(screen.getByText("13 caracteres → 5 tokens")).toBeInTheDocument();
    const steps = within(screen.getByRole("list", { name: "Merges, na ordem do vocabulário" })).getAllByRole("listitem");
    expect(steps.map((step) => step.textContent)).toEqual([
      "1. a + n → an · 4× no texto",
      "2. b + an → ban · 2× no texto",
      "3. an + a → ana · 2× no texto",
    ]);
  });

  it("o slider volta e avança os merges um a um, destacando o token do último merge", () => {
    const { container } = renderPlayground();

    setSteps(0);
    expect(tokens(container)).toEqual(["b", "a", "n", "a", "n", "a", "▁b", "a", "n", "d", "a", "n", "a"]);
    expect(screen.getByText("Nenhum merge aplicado: cada caractere é um token.")).toBeInTheDocument();

    setSteps(1);
    expect(tokens(container)).toEqual(["b", "an", "an", "a", "▁b", "an", "d", "an", "a"]);
    const keys = [...container.querySelectorAll("[data-token][data-role='key']")].map((token) => token.getAttribute("data-token"));
    expect(keys).toEqual(["1", "2", "5", "7"]);
  });

  it("um merge que não aparece no texto fica listado como ausente", () => {
    render(<BpeTokenizerPlayground merges={MERGES} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Texto" }), { target: { value: "bd" } });

    expect(screen.getByText("1. a + n → an · não aparece no texto")).toBeInTheDocument();
  });

  it("texto vazio pede um texto em vez de desenhar a cena", () => {
    render(<BpeTokenizerPlayground merges={MERGES} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Texto" }), { target: { value: "   " } });

    expect(screen.getByRole("alert")).toHaveTextContent("Digite um texto para tokenizar.");
  });
});
