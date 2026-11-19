import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AttentionDiagram } from "./AttentionDiagram";

describe("AttentionDiagram", () => {
  it("mostra só a fila de tokens no passo de contexto", () => {
    render(<AttentionDiagram view="tokens" />);

    expect(screen.getByRole("img", { name: "Atenção do token “ele” sobre a frase" })).toBeInTheDocument();
    expect(screen.getByText("gato")).toBeInTheDocument();
    expect(screen.queryByText("↑ query")).not.toBeInTheDocument();
    expect(screen.queryByText("3.1")).not.toBeInTheDocument();
  });

  it("destaca a query e a key mais parecida com as pontuações brutas", () => {
    render(<AttentionDiagram view="scores" />);

    expect(screen.getByText("pontuação = q_ele · k_x / √64")).toBeInTheDocument();
    expect(screen.getByText("↑ query")).toBeInTheDocument();
    expect(screen.getByText("↑ key mais parecida")).toBeInTheDocument();
    expect(screen.getByText("3.1")).toBeInTheDocument();
  });

  it("troca as pontuações pelos pesos do softmax", () => {
    render(<AttentionDiagram view="weights" />);

    expect(screen.getByText("0.55")).toBeInTheDocument();
    expect(screen.getByText("⌒ espessura = peso")).toBeInTheDocument();
  });

  it("mostra a fórmula do embedding no passo dos vetores, ainda sem query", () => {
    render(<AttentionDiagram view="vectors" />);

    expect(screen.getByText("token → embedding + posição")).toBeInTheDocument();
    expect(screen.queryByText("↑ query")).not.toBeInTheDocument();
  });

  it("aplica a máscara causal redistribuindo o peso só entre os tokens do passado", () => {
    render(<AttentionDiagram view="masked" />);

    expect(screen.getByText("pontuação do futuro = −∞")).toBeInTheDocument();
    expect(screen.getByText("com a máscara causal, “ele” só distribui atenção pelo passado")).toBeInTheDocument();
    expect(screen.getByText("⌒ espessura = peso")).toBeInTheDocument();
  });
});
