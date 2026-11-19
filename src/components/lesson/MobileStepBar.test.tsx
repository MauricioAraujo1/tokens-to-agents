import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLessonNavigation } from "../../hooks/useLessonNavigation";
import type { Route } from "../../lib/router";
import { MOBILE_QUERY, MobileStepBar } from "./MobileStepBar";

const STEP_TITLES = ["Pergunta", "Busca", "Contexto", "Resposta"];

function mockViewport({ mobile }: { mobile: boolean }) {
  window.matchMedia = vi.fn((query: string) => ({
    matches: mobile && query === MOBILE_QUERY,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

function Harness({ onNavigate, stepCount = 4 }: { onNavigate: (route: Route) => void; stepCount?: number }) {
  const navigation = useLessonNavigation("08-02", stepCount);
  return (
    <MobileStepBar
      navigation={navigation}
      nextStepTitle={STEP_TITLES[navigation.stepIndex + 1]}
      onNavigate={onNavigate}
    />
  );
}

function setup(stepCount?: number) {
  const onNavigate = vi.fn();
  const user = userEvent.setup();
  render(<Harness onNavigate={onNavigate} stepCount={stepCount} />);
  return { onNavigate, user };
}

const dots = () => screen.getAllByRole("listitem");
const states = () => dots().map((dot) => dot.dataset.state);

beforeEach(() => mockViewport({ mobile: true }));

describe("MobileStepBar (RSP-01.3)", () => {
  it("abaixo de 768 px mostra um ponto por passo, com o passo atual em destaque", () => {
    setup();

    expect(screen.getByRole("list", { name: "Passo 1 de 4" })).toBeInTheDocument();
    expect(states()).toEqual(["current", "upcoming", "upcoming", "upcoming"]);
    expect(dots()[0]).toHaveAttribute("aria-current", "step");
  });

  it("os botões navegam e os pontos acompanham o passo", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: "Próximo: Busca" }));
    await user.click(screen.getByRole("button", { name: "Próximo: Contexto" }));

    expect(screen.getByRole("list", { name: "Passo 3 de 4" })).toBeInTheDocument();
    expect(states()).toEqual(["done", "done", "current", "upcoming"]);

    await user.click(screen.getByRole("button", { name: "Voltar" }));
    expect(states()).toEqual(["done", "current", "upcoming", "upcoming"]);
  });

  it("no primeiro passo Voltar fica desabilitado (LES-01.4)", () => {
    setup();

    expect(screen.getByRole("button", { name: "Voltar" })).toBeDisabled();
  });

  it("no último passo Próximo vira Próxima aula e leva à aula seguinte (LES-01.5)", async () => {
    const { onNavigate, user } = setup();

    for (const title of ["Busca", "Contexto", "Resposta"]) {
      await user.click(screen.getByRole("button", { name: `Próximo: ${title}` }));
    }

    expect(states()).toEqual(["done", "done", "done", "current"]);
    expect(screen.queryByRole("button", { name: /^Próximo:/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Próxima aula" }));
    expect(onNavigate).toHaveBeenCalledWith({ name: "lesson", lessonId: "08-03", step: null });
  });

  it("aula de 1 passo segue as regras de primeiro e último passo ao mesmo tempo", () => {
    setup(1);

    expect(states()).toEqual(["current"]);
    expect(screen.getByRole("button", { name: "Voltar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Próxima aula" })).toBeEnabled();
  });

  it("fica sem as dicas de teclado e é fixa no rodapé", () => {
    setup();

    expect(screen.queryByText("navegar")).not.toBeInTheDocument();
    const bar = screen.getByRole("list", { name: "Passo 1 de 4" }).parentElement!;
    expect(bar).toHaveClass("fixed", "inset-x-0", "bottom-0");
  });

  it("a partir de 768 px não aparece: a navegação fica no painel", () => {
    mockViewport({ mobile: false });
    setup();

    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Voltar" })).not.toBeInTheDocument();
  });
});
