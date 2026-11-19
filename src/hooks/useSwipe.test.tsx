import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSwipe } from "./useSwipe";

function Surface({ rtl = false, onNext, onPrevious }: { rtl?: boolean; onNext: () => void; onPrevious: () => void }) {
  const handlers = useSwipe({ onNext, onPrevious, rtl });
  return <div role="img" aria-label="cena" {...handlers} />;
}

function setup(rtl = false) {
  const onNext = vi.fn();
  const onPrevious = vi.fn();
  render(<Surface rtl={rtl} onNext={onNext} onPrevious={onPrevious} />);
  const scene = screen.getByRole("img", { name: "cena" });

  function swipe(from: [number, number], to: [number, number]) {
    fireEvent.touchStart(scene, { touches: [{ clientX: from[0], clientY: from[1] }] });
    fireEvent.touchEnd(scene, { touches: [], changedTouches: [{ clientX: to[0], clientY: to[1] }] });
  }

  return { onNext, onPrevious, swipe, scene };
}

describe("useSwipe (RSP-01.4)", () => {
  it("arrastar para a esquerda avança um passo", () => {
    const { onNext, onPrevious, swipe } = setup();

    swipe([200, 100], [140, 110]);

    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrevious).not.toHaveBeenCalled();
  });

  it("arrastar para a direita volta um passo", () => {
    const { onNext, onPrevious, swipe } = setup();

    swipe([100, 100], [160, 90]);

    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onNext).not.toHaveBeenCalled();
  });

  it("gesto de exatamente 50 px já conta", () => {
    const { onNext, swipe } = setup();

    swipe([200, 100], [150, 100]);

    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("gesto curto (menos de 50 px) não faz nada", () => {
    const { onNext, onPrevious, swipe } = setup();

    swipe([200, 100], [151, 100]);
    swipe([100, 100], [149, 100]);

    expect(onNext).not.toHaveBeenCalled();
    expect(onPrevious).not.toHaveBeenCalled();
  });

  it("gesto mais vertical que horizontal (rolagem) não faz nada", () => {
    const { onNext, onPrevious, swipe } = setup();

    swipe([200, 100], [130, 200]);
    swipe([100, 300], [170, 230]);

    expect(onNext).not.toHaveBeenCalled();
    expect(onPrevious).not.toHaveBeenCalled();
  });

  it("em RTL o sentido inverte: esquerda volta e direita avança", () => {
    const { onNext, onPrevious, swipe } = setup(true);

    swipe([200, 100], [140, 100]);
    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onNext).not.toHaveBeenCalled();

    swipe([100, 100], [160, 100]);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("gesto com dois dedos (pinça) ou cancelado não faz nada", () => {
    const { onNext, onPrevious, scene } = setup();

    fireEvent.touchStart(scene, { touches: [{ clientX: 200, clientY: 100 }, { clientX: 220, clientY: 100 }] });
    fireEvent.touchEnd(scene, { touches: [], changedTouches: [{ clientX: 100, clientY: 100 }] });

    fireEvent.touchStart(scene, { touches: [{ clientX: 200, clientY: 100 }] });
    fireEvent.touchCancel(scene);
    fireEvent.touchEnd(scene, { touches: [], changedTouches: [{ clientX: 100, clientY: 100 }] });

    expect(onNext).not.toHaveBeenCalled();
    expect(onPrevious).not.toHaveBeenCalled();
  });
});
