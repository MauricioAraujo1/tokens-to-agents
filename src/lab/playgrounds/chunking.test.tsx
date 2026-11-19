import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { chunkingContent } from "../../content/playgrounds/chunking";
import { chunkWords, splitIntoWords } from "../chunking";
import { ChunkingPlayground } from "./chunking";

const twenty = Array.from({ length: 20 }, (_, index) => `w${index + 1}`);

describe("chunking (lógica)", () => {
  it("tamanho 8 e overlap 2 em 20 palavras: passo 6, chunks começando em 1, 7 e 13", () => {
    const result = chunkWords(twenty, 8, 2);

    expect(result.ok && result.chunks.map((chunk) => [chunk.start, chunk.words.length, chunk.overlap])).toEqual([
      [0, 8, 0],
      [6, 8, 2],
      [12, 8, 2],
    ]);
    expect(result.ok && result.chunks[1].words.slice(0, 2)).toEqual(["w7", "w8"]);
  });

  it.each([
    [5, 0, 4],
    [5, 4, 16],
    [6, 0, 4],
    [25, 3, 1],
  ])("tamanho %i e overlap %i em 20 palavras geram %i chunks", (size, overlap, count) => {
    const result = chunkWords(twenty, size, overlap);
    expect(result.ok && result.chunks.length).toBe(count);
  });

  it("o último chunk pode ser menor e termina na última palavra", () => {
    const result = chunkWords(twenty, 6, 0);
    expect(result.ok && result.chunks.at(-1)?.words).toEqual(["w19", "w20"]);
  });

  it.each([
    [5, 5],
    [5, 9],
  ])("tamanho %i com overlap %i é rejeitado (overlap ≥ tamanho)", (size, overlap) => {
    expect(chunkWords(twenty, size, overlap)).toEqual({ ok: false, error: "overlap-not-smaller-than-size" });
  });
});

describe("ChunkingPlayground (LAB-01.1)", () => {
  const setSlider = (name: string, value: number) =>
    fireEvent.change(screen.getByRole("slider", { name }), { target: { value: String(value) } });
  const chunkCount = (container: HTMLElement) => container.querySelectorAll("[data-chunk]").length;

  it("o texto de exemplo tem 60 palavras", () => {
    expect(splitIntoWords(chunkingContent.text)).toHaveLength(60);
  });

  it("tamanho e overlap geram a contagem esperada no texto de exemplo", () => {
    const { container } = render(<ChunkingPlayground />);

    // 20/5: passo 15, começos 1, 16, 31 e 46.
    expect(chunkCount(container)).toBe(4);
    expect(screen.getByText("60 palavras → 4 chunks de até 20 palavras, com 5 de overlap")).toBeInTheDocument();
    expect(container.querySelector("[data-stage='chunks']")).toHaveTextContent("4 chunks");
    expect(container.querySelector("[data-stage='chunks']")).toHaveAttribute("data-state", "active");

    setSlider("Overlap", 0);
    setSlider("Tamanho do chunk", 10);
    expect(chunkCount(container)).toBe(6);

    setSlider("Overlap", 5);
    expect(chunkCount(container)).toBe(11);
    expect(container.querySelector("[data-stage='chunks']")).toHaveTextContent("11 chunks");
    // O começo do chunk 2 repete as 5 últimas palavras do chunk 1.
    expect(container.querySelector("[data-chunk='2'] [data-overlap]")?.textContent).toBe(
      splitIntoWords(chunkingContent.text).slice(5, 10).join(" "),
    );
  });

  it("overlap ≥ tamanho é rejeitado com mensagem e sem cena", () => {
    const { container } = render(<ChunkingPlayground />);

    setSlider("Tamanho do chunk", 8);
    setSlider("Overlap", 8);

    expect(screen.getByRole("alert")).toHaveTextContent("O overlap precisa ser menor que o tamanho do chunk.");
    expect(chunkCount(container)).toBe(0);
    expect(screen.queryByRole("figure")).not.toBeInTheDocument();

    setSlider("Overlap", 7);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(chunkCount(container)).toBe(53);
  });
});
