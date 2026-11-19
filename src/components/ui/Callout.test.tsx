import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Callout } from "./Callout";

describe("Callout", () => {
  it("exposes a region named by its title, with the body inside it", () => {
    render(<Callout title="Ideia-chave">Uma analogia curta que fixa o conceito do passo.</Callout>);
    const region = screen.getByRole("region", { name: "Ideia-chave" });

    expect(region).toHaveTextContent("Ideia-chave");
    expect(region).toHaveTextContent("Uma analogia curta que fixa o conceito do passo.");
  });
});
