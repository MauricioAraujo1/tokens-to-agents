import { describe, expect, it } from "vitest";
import { getPillSize } from "../../components/diagrams/ragDiagramLayout";
import mcpSecurity from "../../content/lessons/13/13-11-mcp-security";
import { chunkingContent } from "../../content/playgrounds/chunking";
import type { PipelineSpec } from "../types";
import { layoutPipeline, pipelineDisplay, wrapStageLabel } from "./pipelineLayout";

/** Avanço real de um caractere da Geist Mono, em em. */
const MONO_ADVANCE_EM = 0.6;

function pipelineOf(step: number): PipelineSpec {
  const scene = mcpSecurity.steps[step - 1].scene;
  if (scene.kind !== "pieces" || scene.pieces[0].piece !== "pipeline") throw new Error("cena sem pipeline");
  return scene.pieces[0];
}

/** Cada linha do rótulo, na largura da fonte mono, fica dentro da caixa, e as linhas cabem na altura. */
function expectLabelsInsideBoxes(spec: PipelineSpec, font: number) {
  for (const stage of layoutPipeline(spec, font).stages) {
    for (const line of stage.lines) {
      expect(line.length * MONO_ADVANCE_EM * font, `${stage.stage.label} @${font}`).toBeLessThan(2 * stage.half.width);
    }
    expect(stage.lines.length * 1.2 * font).toBeLessThan(2 * stage.half.height);
    expect(stage.lines.join(" ")).toBe(stage.stage.label);
  }
}

describe("layoutPipeline", () => {
  it("13-11 passo 4: os rótulos longos ficam dentro da caixa, em qualquer fonte (COL-01.1)", () => {
    const spec = pipelineOf(4);

    for (const font of [12, 16, 20, 28]) expectLabelsInsideBoxes(spec, font);
    const first = layoutPipeline(spec).stages.find((stage) => stage.stage.id === "401");
    expect(first?.lines).toEqual(["401 +", "resource_metadata"]);
    const token = layoutPipeline(spec).stages.find((stage) => stage.stage.id === "token");
    expect(token?.lines.length).toBe(2);
  });

  it("rótulo maior que uma linha quebra em 2, no ponto mais equilibrado", () => {
    expect(wrapStageLabel("comparar com a política")).toEqual(["comparar com", "a política"]);
    expect(wrapStageLabel("embed")).toEqual(["embed"]);
    expect(wrapStageLabel("uma_palavra_longa_demais_para_caber")).toBeNull();
  });

  it("a segunda linha não começa com separador: ele fica no fim da primeira", () => {
    expect(wrapStageLabel("Chunker · 20/5")).toEqual(["Chunker ·", "20/5"]);
    expect(wrapStageLabel("Documento · 60 palavras")).toEqual(["Documento ·", "60 palavras"]);
    // Sem outra quebra que caiba, o separador pode abrir a linha.
    expect(wrapStageLabel("abcdefghijklmnopq · x")).toEqual(["abcdefghijklmnopq", "· x"]);
  });

  it("playground de chunking: “Documento · 60 palavras” e o chunker ficam dentro da caixa (PLAY-01.2)", () => {
    const { stages } = chunkingContent;
    const spec: PipelineSpec = {
      piece: "pipeline",
      stages: [
        { id: "document", label: stages.document(60) },
        { id: "splitter", label: stages.splitter(40, 20) },
        { id: "chunks", label: stages.chunks(60) },
        { id: "embeddings", label: stages.embeddings },
      ],
    };

    expect(pipelineDisplay(spec)).toBe("scene");
    for (const font of [8, 12, 16, 20]) expectLabelsInsideBoxes(spec, font);
  });

  it("o espaço entre etapas acompanha a largura das caixas: nenhuma caixa encosta na vizinha", () => {
    const spec: PipelineSpec = {
      piece: "pipeline",
      stages: [
        { id: "a", label: "extrair cláusulas" },
        { id: "b", label: "comparar com a política" },
        { id: "c", label: "ok" },
      ],
    };

    for (const font of [12, 22]) {
      const { stages } = layoutPipeline(spec, font);
      stages.slice(1).forEach((stage, index) => {
        const previous = stages[index];
        expect(stage.center.x - stage.half.width - (previous.center.x + previous.half.width)).toBeGreaterThanOrEqual(24);
      });
    }
  });

  it("cada seta entre etapas mostra pelo menos 24 px de linha, fora das caixas (GEO-01.1)", () => {
    const spec: PipelineSpec = {
      piece: "pipeline",
      stages: [
        { id: "a", label: "extrair cláusulas" },
        { id: "b", label: "validar JSON" },
        { id: "c", label: "revisar" },
      ],
    };

    for (const font of [12, 24, 36]) {
      const { stages, connections } = layoutPipeline(spec, font);
      connections.forEach((connection, index) => {
        const { start, end } = connection.geometry;
        expect(Math.hypot(end.x - start.x, end.y - start.y)).toBeGreaterThanOrEqual(24 * Math.max(1, font / 12));
        expect(start.x).toBeGreaterThan(stages[index].center.x + stages[index].half.width);
        expect(end.x).toBeLessThan(stages[index + 1].center.x - stages[index + 1].half.width);
      });
    }
  });

  it("o ramo tem pelo menos 24 unidades de linha visível fora da pílula do rótulo (GEO-01.1)", () => {
    const spec: PipelineSpec = {
      piece: "pipeline",
      stages: [
        { id: "embed", label: "embed" },
        { id: "search", label: "search" },
        { id: "answer", label: "answer" },
      ],
      branch: { id: "fallback", label: "fallback", from: "search", edgeLabel: "audiência errada" },
    };

    for (const font of [12, 18, 26]) {
      const layout = layoutPipeline(spec, font);
      const branch = layout.connections.find((connection) => connection.variant === "alternative");
      if (!branch?.label || branch.labelFont === undefined) throw new Error("ramo sem rótulo");
      const pill = getPillSize(branch.label, branch.labelFont);
      const { start, end, labelPoint } = branch.geometry;
      const samples = 400;
      let outside = 0;
      for (let index = 0; index < samples; index += 1) {
        const x = start.x + ((end.x - start.x) * (index + 0.5)) / samples;
        const y = start.y + ((end.y - start.y) * (index + 0.5)) / samples;
        if (Math.abs(x - labelPoint.x) > pill.width / 2 || Math.abs(y - labelPoint.y) > pill.height / 2) outside += 1;
      }
      const length = Math.hypot(end.x - start.x, end.y - start.y);

      // 24 px de tela: com a fonte acima de 12 unidades, cada px vale font / 12 unidades.
      expect((outside / samples) * length, `fonte ${font}`).toBeGreaterThanOrEqual(24 * Math.max(1, font / 12));
      // A pílula não encosta nas caixas da origem e do ramo.
      for (const stage of layout.stages) {
        const overlapX = Math.abs(stage.center.x - labelPoint.x) < stage.half.width + pill.width / 2;
        const overlapY = Math.abs(stage.center.y - labelPoint.y) < stage.half.height + pill.height / 2;
        expect(overlapX && overlapY, `${stage.stage.id} @${font}`).toBe(false);
      }
    }
  });
});

describe("pipelineDisplay", () => {
  const stages = (count: number) => Array.from({ length: count }, (_, index) => ({ id: `s${index}`, label: `etapa ${index}` }));

  it("até 5 etapas que cabem em 2 linhas, desenha a cena", () => {
    expect(pipelineDisplay({ piece: "pipeline", stages: stages(5) })).toBe("scene");
  });

  it("com 6 ou mais etapas, usa chips (COL-01.2)", () => {
    expect(pipelineDisplay({ piece: "pipeline", stages: stages(6) })).toBe("chips");
    expect(pipelineDisplay(pipelineOf(4))).toBe("chips");
  });

  it("com um rótulo que não cabe nem em 2 linhas, usa chips (COL-01.2)", () => {
    const spec: PipelineSpec = {
      piece: "pipeline",
      stages: [...stages(2), { id: "long", label: "uma etapa com um rótulo comprido demais para duas linhas" }],
    };

    expect(pipelineDisplay(spec)).toBe("chips");
  });
});
