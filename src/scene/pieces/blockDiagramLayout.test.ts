import { describe, expect, it } from "vitest";
import type { BlockDiagramSpec } from "../types";
import {
  ARROW_HEAD,
  BLOCK_COLUMN_SPACING,
  BLOCK_MARGIN_BOTTOM,
  BLOCK_MARGIN_TOP,
  BLOCK_MARGIN_X,
  BLOCK_ROW_SPACING,
  blockState,
  layoutBlockDiagram,
  pathPoint,
  pathPoints,
  rectCrossesPolyline,
  rectsOverlap,
  rectToPolyline,
  tailOf,
} from "./blockDiagramLayout";

const chat: BlockDiagramSpec = {
  piece: "block-diagram",
  blocks: [
    { id: "phone", kind: "phone", label: "celular", col: 0, row: 0 },
    { id: "api", kind: "server", label: "api", col: 1, row: 0 },
    { id: "agent", kind: "agent", label: "agente", col: 2, row: 0 },
    { id: "db", kind: "sql-db", label: "sql", col: 2, row: 1 },
  ],
  edges: [
    { from: "phone", to: "api", label: "pergunta" },
    { from: "api", to: "agent" },
    { from: "agent", to: "db", label: "consulta" },
    { from: "agent", to: "ghost" },
  ],
  active: "agent",
};

describe("layoutBlockDiagram", () => {
  it("põe cada bloco na grade: colunas para a direita, linhas para baixo", () => {
    const { blocks } = layoutBlockDiagram(chat);
    const base = (id: string) => blocks.find((item) => item.block.id === id)?.base;

    expect(base("phone")).toEqual({ x: BLOCK_MARGIN_X, y: BLOCK_MARGIN_TOP });
    expect(base("api")).toEqual({ x: BLOCK_MARGIN_X + BLOCK_COLUMN_SPACING, y: BLOCK_MARGIN_TOP });
    expect(base("db")).toEqual({ x: BLOCK_MARGIN_X + 2 * BLOCK_COLUMN_SPACING, y: BLOCK_MARGIN_TOP + BLOCK_ROW_SPACING });
  });

  it("o tamanho da cena cobre a grade com as margens", () => {
    const { width, height } = layoutBlockDiagram(chat);

    expect(width).toBe(2 * BLOCK_MARGIN_X + 2 * BLOCK_COLUMN_SPACING);
    expect(height).toBe(BLOCK_MARGIN_TOP + BLOCK_ROW_SPACING + BLOCK_MARGIN_BOTTOM);
  });

  it("desenha de trás para a frente: linhas de cima primeiro", () => {
    const order = layoutBlockDiagram(chat).blocks.map((item) => item.block.id);

    expect(order).toEqual(["phone", "api", "agent", "db"]);
  });

  it("aceita coordenadas negativas e meio passo, deslocando a grade para caber", () => {
    const { blocks } = layoutBlockDiagram({
      ...chat,
      blocks: [
        { id: "a", kind: "user", label: "a", col: -1, row: 0.5 },
        { id: "b", kind: "llm", label: "b", col: 0, row: 0 },
      ],
    });

    expect(blocks.find((item) => item.block.id === "a")?.base.x).toBe(BLOCK_MARGIN_X);
    expect(blocks.find((item) => item.block.id === "a")?.base.y).toBe(BLOCK_MARGIN_TOP + BLOCK_ROW_SPACING / 2);
  });

  it("liga só os blocos que existem e faz fluir as setas que chegam no bloco ativo", () => {
    const { connections } = layoutBlockDiagram(chat);

    expect(connections.map((connection) => connection.id)).toEqual(["phone-api-0", "api-agent-1", "agent-db-2"]);
    expect(connections.filter((connection) => connection.flowing).map((connection) => connection.id)).toEqual(["api-agent-1"]);
    expect(connections[0].label).toBe("pergunta");
  });

  // Casos da auditoria de 2026-11-20 (scratchpad/audit), com a fonte que cada um terá na tela.
  const auditCases: Record<string, BlockDiagramSpec> = {
    "00-01#6": {
      piece: "block-diagram",
      blocks: [
        { id: "data", kind: "documents", label: "exemplos", col: 0, row: 0 },
        { id: "train", kind: "eval", label: "treino", col: 1, row: 0 },
        { id: "llm", kind: "llm", label: "modelo", col: 2, row: 0 },
        { id: "api", kind: "server", label: "servidor", col: 3, row: 0 },
        { id: "phone", kind: "phone", label: "app", col: 3, row: 1 },
      ],
      edges: [
        { from: "data", to: "train" },
        { from: "train", to: "llm", label: "pesos" },
        { from: "llm", to: "api" },
        { from: "api", to: "phone", label: "resposta" },
      ],
      active: "phone",
      done: ["data", "train", "llm", "api"],
    },
    "12-13#5": {
      piece: "block-diagram",
      blocks: [
        { id: "boss", kind: "agent", label: "supervisor", col: 0, row: 0.5 },
        { id: "writer", kind: "llm", label: "redator gera", col: 1, row: 0.5 },
        { id: "eval", kind: "eval", label: "avaliador ≥ 0,8", col: 2, row: 0.5 },
        { id: "answer", kind: "answer", label: "relatório", col: 3, row: 0.5 },
      ],
      edges: [
        { from: "boss", to: "writer", label: "escrever" },
        { from: "writer", to: "eval", label: "rascunho" },
        { from: "eval", to: "writer", label: "crítica", variant: "alternative" },
        { from: "eval", to: "answer", label: "rodada 3" },
      ],
      active: "eval",
      done: ["boss", "writer"],
    },
    "01-10#5": {
      piece: "block-diagram",
      blocks: [
        { id: "model", kind: "llm", label: "detector", col: 0, row: 0.5 },
        { id: "tp", kind: "guardrail", label: "fraude barrada: 7", col: 1, row: 0 },
        { id: "fn", kind: "no-result", label: "fraude passou: 3", col: 1, row: 1 },
        { id: "fp", kind: "user", label: "falso alarme: 18", col: 2, row: 0.5 },
        { id: "cost", kind: "eval", label: "custo total", col: 3, row: 0.5 },
      ],
      edges: [
        { from: "model", to: "tp" },
        { from: "model", to: "fn", label: "FN", variant: "alternative" },
        { from: "model", to: "fp", label: "FP", variant: "alternative" },
        { from: "fn", to: "cost", label: "prejuízo" },
        { from: "fp", to: "cost", label: "atrito" },
      ],
      active: "cost",
    },
  };

  it.each(Object.keys(auditCases))("%s: nenhuma pílula cobre outra pílula, em qualquer fonte (COL-01.3, COL-01.4)", (name) => {
    for (const font of [12, 16, 19, 24]) {
      const { pills } = layoutBlockDiagram(auditCases[name], font);
      pills.forEach((pill, index) => {
        for (const other of pills.slice(index + 1)) {
          expect(rectsOverlap(pill.rect, other.rect), `${name} @${font}: ${pill.id} × ${other.id}`).toBe(false);
        }
      });
    }
  });

  it("seta vertical: o rótulo fica ao lado e a seta para antes da pílula do bloco de destino (COL-01.4)", () => {
    for (const font of [12, 19]) {
      const layout = layoutBlockDiagram(auditCases["00-01#6"], font);
      const edge = layout.connections.find((connection) => connection.id.startsWith("api-phone"));
      const target = layout.pills.find((pill) => pill.id === "block:phone")?.rect;
      const label = layout.pills.find((pill) => pill.id.startsWith("edge:api-phone"))?.rect;
      if (!edge || !target || !label) throw new Error("caso incompleto");

      expect(edge.geometry.end.y).toBeLessThan(target.top);
      expect(edge.geometry.end.y - edge.geometry.start.y).toBeGreaterThanOrEqual(24 * Math.max(1, font / 12));
      expect(label.left > edge.geometry.start.x || label.right < edge.geometry.start.x).toBe(true);
    }
  });

  it("setas opostas entre o mesmo par viram retas paralelas, cada rótulo do seu lado (COL-01.3)", () => {
    const { connections } = layoutBlockDiagram(auditCases["12-13#5"], 16);
    const forward = connections.find((connection) => connection.id.startsWith("writer-eval"));
    const back = connections.find((connection) => connection.id.startsWith("eval-writer"));
    if (!forward || !back) throw new Error("caso incompleto");

    expect(forward.geometry.start.y).toBeCloseTo(forward.geometry.end.y, 6);
    expect(back.geometry.start.y).toBeCloseTo(back.geometry.end.y, 6);
    expect(Math.abs(forward.geometry.start.y - back.geometry.start.y)).toBeGreaterThan(8);
    const sideOf = (connection: typeof forward) => Math.sign(connection.geometry.labelPoint.y - connection.geometry.start.y);
    expect(sideOf(forward)).not.toBe(sideOf(back));
  });

  it("estado do bloco: ativo, concluído, futuro e, sem `done`, neutro", () => {
    expect(blockState("agent", chat)).toBe("active");
    expect(blockState("api", chat)).toBe("idle");
    expect(blockState("api", { ...chat, done: ["phone", "api"] })).toBe("done");
    expect(blockState("db", { ...chat, done: ["phone", "api"] })).toBe("upcoming");
  });
});

describe("layoutBlockDiagram: pílulas que sobravam na varredura de T18", () => {
  // Fonte 24, a do teto, com que os dois passos aparecem a 1440 (quadro que rola).
  const FONT = 24;
  const pillsOf = (spec: BlockDiagramSpec) => layoutBlockDiagram(spec, FONT).pills;

  it("12-08#3: com conflitos em eixos diferentes, as colunas também crescem e a pílula longa sai de cima do bloco", () => {
    const context: BlockDiagramSpec = {
      piece: "block-diagram",
      blocks: [
        { id: "context", kind: "context", label: "histórico 52 mil", col: 0, row: 0.5 },
        { id: "llm", kind: "llm", label: "resumidor", col: 1, row: 0.5 },
        { id: "summary", kind: "documents", label: "resumo 2 mil", col: 2, row: 0.5 },
        { id: "agent", kind: "agent", label: "janela nova", col: 3, row: 0.5 },
        { id: "trash", kind: "no-result", label: "obs. antigas", col: 1, row: 1 },
      ],
      edges: [
        { from: "context", to: "llm", label: "80% cheio" },
        { from: "llm", to: "summary", label: "decisões + pendências" },
        { from: "summary", to: "agent" },
        { from: "context", to: "trash", label: "limpar", variant: "alternative" },
      ],
      active: "llm",
      done: ["context"],
    };
    const { blocks, pills } = layoutBlockDiagram(context, FONT);
    const summary = blocks.find((item) => item.block.id === "summary");
    const long = pills.find((pill) => pill.id.startsWith("edge:llm-summary"));
    if (!summary || !long) throw new Error("caso incompleto");

    // A silhueta do bloco de documentos começa 48 unidades à esquerda da base; o texto da pílula (recuo
    // de 22 unidades na fonte 22) termina antes dela, com folga.
    expect(long.rect.right - 22).toBeLessThan(summary.base.x - 48);
  });

  it("15-08#1: a seta longa que passa sobre outra com rótulo leva o rótulo para longe, sem encostar em pílula", () => {
    const testing: BlockDiagramSpec = {
      piece: "block-diagram",
      blocks: [
        { id: "code", kind: "app", label: "código", col: 0, row: 0.5 },
        { id: "agent", kind: "agent", label: "agente", col: 1, row: 0.5 },
        { id: "tests", kind: "eval", label: "testes gerados", col: 2, row: 0.5 },
        { id: "green", kind: "answer", label: "sempre verde", col: 3, row: 0.5 },
      ],
      edges: [
        { from: "code", to: "agent", label: "lê a saída" },
        { from: "agent", to: "tests", label: "copia no esperado" },
        { from: "tests", to: "green", label: "passa" },
        { from: "tests", to: "code", label: "confere contra si", variant: "alternative" },
      ],
      active: "tests",
    };
    const pills = pillsOf(testing);

    for (const [index, pill] of pills.entries()) {
      for (const other of pills.slice(index + 1)) expect(rectsOverlap(pill.rect, other.rect)).toBe(false);
    }
  });
});

describe("layoutBlockDiagram: pontas das setas e cabimento a 1440 (T22)", () => {
  // 00-01#1: setas curtas entre quatro blocos, com pílulas maiores que a própria seta.
  const question: BlockDiagramSpec = {
    piece: "block-diagram",
    blocks: [
      { id: "user", kind: "user", label: "você", col: 0, row: 0 },
      { id: "phone", kind: "phone", label: "app", col: 1, row: 0 },
      { id: "api", kind: "server", label: "servidor", col: 2, row: 0 },
      { id: "llm", kind: "llm", label: "modelo", col: 3, row: 0 },
    ],
    edges: [
      { from: "user", to: "phone", label: "pergunta" },
      { from: "phone", to: "api", label: "requisição" },
      { from: "api", to: "llm", label: "texto" },
    ],
    active: "llm",
  };
  // 06-08#6: setas que convergem e uma vertical com rótulo, no bloco ativo.
  const evaluation: BlockDiagramSpec = {
    piece: "block-diagram",
    blocks: [
      { id: "queries", kind: "user", label: "consultas teste", col: 0, row: 0.5 },
      { id: "flat", kind: "vector-db", label: "força bruta", col: 1, row: 0 },
      { id: "index", kind: "retrieval", label: "índice rápido", col: 1, row: 1 },
      { id: "eval", kind: "eval", label: "comparar listas", col: 2, row: 0.5 },
      { id: "decide", kind: "server", label: "produção", col: 3, row: 0.5 },
    ],
    edges: [
      { from: "queries", to: "flat" },
      { from: "queries", to: "index" },
      { from: "flat", to: "eval", label: "gabarito" },
      { from: "index", to: "eval", label: "resultado" },
      { from: "eval", to: "decide", label: "aprovado" },
    ],
    active: "eval",
  };
  // 15-08#1: a seta de volta pularia o bloco do meio e riscaria os rótulos das outras setas.
  const testing: BlockDiagramSpec = {
    piece: "block-diagram",
    blocks: [
      { id: "code", kind: "app", label: "código", col: 0, row: 0.5 },
      { id: "agent", kind: "agent", label: "agente", col: 1, row: 0.5 },
      { id: "tests", kind: "eval", label: "testes gerados", col: 2, row: 0.5 },
      { id: "green", kind: "answer", label: "sempre verde", col: 3, row: 0.5 },
    ],
    edges: [
      { from: "code", to: "agent", label: "lê a saída" },
      { from: "agent", to: "tests", label: "copia no esperado" },
      { from: "tests", to: "green", label: "passa" },
      { from: "tests", to: "code", label: "confere contra si", variant: "alternative" },
    ],
    active: "tests",
  };

  it.each([
    ["00-01#1", question],
    ["06-08#6", evaluation],
    ["15-08#1", testing],
  ])("%s: nenhuma pílula cobre os 24 px finais nem a ponta de uma seta, em qualquer fonte (GEO-01.1)", (name, spec) => {
    for (const font of [12, 16, 19, 24, 28, 32]) {
      const layout = layoutBlockDiagram(spec, font);
      const px = Math.max(1, font / 12);
      for (const connection of layout.connections) {
        const tail = tailOf(pathPoints(connection), 24 * px + ARROW_HEAD);
        for (const pill of layout.pills) {
          expect(rectCrossesPolyline(pill.rect, tail), `${name} @${font}: ${pill.id} sobre a ponta de ${connection.id}`).toBe(false);
        }
      }
    }
  });

  it("15-08#1: a seta que pula o bloco do meio passa por baixo dos blocos, e nenhuma linha atravessa um rótulo", () => {
    for (const font of [12, 19, 24]) {
      const layout = layoutBlockDiagram(testing, font);
      const back = layout.connections.find((connection) => connection.id.startsWith("tests-code"));
      const agent = layout.blocks.find((item) => item.block.id === "agent");
      if (!back || !agent) throw new Error("caso incompleto");

      expect(back.curve, `@${font}`).toBeDefined();
      // O ponto mais baixo da curva fica abaixo da base do bloco do meio.
      expect(pathPoint(back, 0.5).y).toBeGreaterThan(agent.base.y);
      for (const connection of layout.connections) {
        for (const pill of layout.pills.filter((candidate) => candidate.id !== `edge:${connection.id}`)) {
          expect(rectCrossesPolyline(pill.rect, pathPoints(connection)), `@${font}: ${connection.id} × ${pill.id}`).toBe(false);
        }
      }
    }
  });

  it("15-08#1 e 00-01#1 cabem no quadro de 655 px com 11 px de pílula, sem rolar", () => {
    for (const spec of [testing, question]) expect((layoutBlockDiagram(spec, 24).width * 12) / 24).toBeLessThanOrEqual(655);
  });

  it("só cresce o vão que precisa: o vão sem rótulo fica com o espaçamento padrão", () => {
    const pairs: BlockDiagramSpec = {
      piece: "block-diagram",
      blocks: [
        { id: "pairs", kind: "documents", label: "pedido e resposta", col: 0, row: 0 },
        { id: "tokens", kind: "tokens", label: "chat template", col: 1, row: 0 },
        { id: "llm", kind: "llm", label: "modelo", col: 2, row: 0 },
        { id: "loss", kind: "eval", label: "perda na resposta", col: 3, row: 0 },
      ],
      edges: [
        { from: "pairs", to: "tokens" },
        { from: "tokens", to: "llm", label: "sequência" },
        { from: "llm", to: "loss", label: "probabilidades" },
        { from: "loss", to: "llm", label: "gradiente", variant: "alternative" },
      ],
    };
    const { blocks } = layoutBlockDiagram(pairs, 24);
    const x = (id: string) => blocks.find((item) => item.block.id === id)?.base.x ?? Number.NaN;

    expect(x("tokens") - x("pairs")).toBe(BLOCK_COLUMN_SPACING);
    expect(x("loss") - x("llm")).toBeGreaterThan(x("tokens") - x("pairs"));
  });
});

describe("layoutBlockDiagram: cada rótulo junto da sua seta (T23)", () => {
  // 11-07#1: par oposto com rótulos longos; a 30 e a 32 os rótulos iam para o lado da outra seta.
  const training: BlockDiagramSpec = {
    piece: "block-diagram",
    blocks: [
      { id: "pairs", kind: "documents", label: "pedido e resposta", col: 0, row: 0 },
      { id: "tokens", kind: "tokens", label: "chat template", col: 1, row: 0 },
      { id: "llm", kind: "llm", label: "modelo", col: 2, row: 0 },
      { id: "loss", kind: "eval", label: "perda na resposta", col: 3, row: 0 },
    ],
    edges: [
      { from: "pairs", to: "tokens" },
      { from: "tokens", to: "llm", label: "sequência" },
      { from: "llm", to: "loss", label: "probabilidades" },
      { from: "loss", to: "llm", label: "gradiente", variant: "alternative" },
    ],
    active: "loss",
  };
  // 14-08#6: duas setas convergem no mesmo bloco, cada uma com o seu rótulo.
  const leastPrivilege: BlockDiagramSpec = {
    piece: "block-diagram",
    blocks: [
      { id: "main", kind: "agent", label: "agente principal", col: 0, row: 0.5 },
      { id: "reviewer", kind: "agent", label: "revisor: só leitura", col: 1, row: 0 },
      { id: "writer", kind: "agent", label: "editor: src/", col: 1, row: 1 },
      { id: "repo", kind: "documents", label: "repositório", col: 2, row: 0.5 },
      { id: "prod", kind: "server", label: "produção", col: 3, row: 0.5 },
    ],
    edges: [
      { from: "main", to: "reviewer" },
      { from: "main", to: "writer" },
      { from: "reviewer", to: "repo", label: "Read, Grep" },
      { from: "writer", to: "repo", label: "Edit(src/**)" },
      { from: "repo", to: "prod", label: "sem acesso", variant: "alternative" },
    ],
    active: "reviewer",
  };
  // 19,58 e 29,58 são as fontes com que 14-08#6 e 11-07#1 aparecem no quadro de 655 px a 1440.
  const fonts = [12, 16, 19, 19.58, 24, 26, 28, 29.58, 30, 31, 32];

  it.each([
    ["11-07#1", training],
    ["14-08#6", leastPrivilege],
  ])("%s: o rótulo fica mais perto da sua seta que de qualquer outra, em qualquer fonte", (name, spec) => {
    for (const font of fonts) {
      const layout = layoutBlockDiagram(spec, font);
      for (const connection of layout.connections.filter((candidate) => candidate.label)) {
        const label = layout.pills.find((pill) => pill.id === `edge:${connection.id}`)?.rect;
        if (!label) throw new Error("caso incompleto");
        const own = rectToPolyline(label, pathPoints(connection));
        for (const other of layout.connections.filter((candidate) => candidate !== connection)) {
          expect(own, `${name} @${font}: ${connection.label} mais perto de ${other.id}`).toBeLessThan(rectToPolyline(label, pathPoints(other)));
        }
      }
    }
  });

  it("11-07#1: no par oposto, cada rótulo fica do lado de fora da sua reta, nunca entre as duas", () => {
    for (const font of fonts) {
      const { connections } = layoutBlockDiagram(training, font);
      const forward = connections.find((connection) => connection.id.startsWith("llm-loss"));
      const back = connections.find((connection) => connection.id.startsWith("loss-llm"));
      if (!forward || !back) throw new Error("caso incompleto");
      const [upper, lower] = forward.geometry.start.y < back.geometry.start.y ? [forward, back] : [back, forward];

      expect(upper.geometry.labelPoint.y, `@${font}`).toBeLessThan(upper.geometry.start.y);
      expect(lower.geometry.labelPoint.y, `@${font}`).toBeGreaterThan(lower.geometry.start.y);
    }
  });

  it("as garantias de T22 continuam: nenhum rótulo cobre a ponta de uma seta nem outra pílula", () => {
    for (const spec of [training, leastPrivilege]) {
      for (const font of fonts) {
        const layout = layoutBlockDiagram(spec, font);
        const px = Math.max(1, font / 12);
        for (const connection of layout.connections) {
          const tail = tailOf(pathPoints(connection), 24 * px + ARROW_HEAD);
          for (const pill of layout.pills) expect(rectCrossesPolyline(pill.rect, tail), `@${font}: ${pill.id} × ${connection.id}`).toBe(false);
        }
        layout.pills.forEach((pill, index) => {
          for (const other of layout.pills.slice(index + 1)) expect(rectsOverlap(pill.rect, other.rect), `@${font}: ${pill.id} × ${other.id}`).toBe(false);
        });
      }
    }
  });

  it("rectToPolyline: 0 quando a linha cruza o retângulo; senão, a menor distância até ele", () => {
    const rect = { left: 0, top: 0, right: 10, bottom: 10 };

    expect(rectToPolyline(rect, [{ x: -5, y: 5 }, { x: 15, y: 5 }])).toBe(0);
    expect(rectToPolyline(rect, [{ x: -5, y: 13 }, { x: 15, y: 13 }])).toBe(3);
    expect(rectToPolyline(rect, [{ x: 13, y: 14 }, { x: 20, y: 30 }])).toBe(5);
    // A reta inclinada passa mais perto de um canto do que de qualquer ponta.
    expect(rectToPolyline(rect, [{ x: 20, y: 0 }, { x: 0, y: 20 }])).toBeCloseTo(0, 6);
    expect(rectToPolyline(rect, [{ x: 30, y: 0 }, { x: 0, y: 30 }])).toBeCloseTo(10 / Math.SQRT2, 6);
  });
});
