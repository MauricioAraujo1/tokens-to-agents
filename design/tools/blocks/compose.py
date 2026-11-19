from iso import Iso, Scene, pill, fmt
from blocks import ACTIVE_LABEL, celular, servidor, agente, ferramenta, banco_relacional, draw_active

CHAIN = [(celular, "celular"), (servidor, "api"), (agente, "agente"), (ferramenta, "tool"), (banco_relacional, "sql")]
EDGES = ["pergunta", "requisição", "tool call", "consulta"]


def compose(theme, width=1312, height=330, hop=135, base_y=214, ox=120):
    sc = Scene(theme, width, height)
    t = sc.t
    floor = Iso(sc, ox, base_y)
    lift = 26
    for n, label in enumerate(EDGES):
        i0, j0 = n * hop, -n * hop
        s = floor.p(i0 + 52, j0, lift)
        c = floor.p(i0 + hop, j0, lift)
        e = floor.p(i0 + hop, j0 - hop + 52, lift)
        r = 12
        d1 = ((c[0] - s[0]), (c[1] - s[1]))
        l1 = (d1[0] ** 2 + d1[1] ** 2) ** 0.5
        d1 = (d1[0] / l1, d1[1] / l1)
        d2 = ((e[0] - c[0]), (e[1] - c[1]))
        l2 = (d2[0] ** 2 + d2[1] ** 2) ** 0.5
        d2 = (d2[0] / l2, d2[1] / l2)
        a = (c[0] - d1[0] * r, c[1] - d1[1] * r)
        b = (c[0] + d2[0] * r, c[1] + d2[1] * r)
        tip = e
        back = (tip[0] - d2[0] * 8.5, tip[1] - d2[1] * 8.5)
        sc.path(f"M{fmt(s[0])} {fmt(s[1])}L{fmt(a[0])} {fmt(a[1])}Q{fmt(c[0])} {fmt(c[1])} {fmt(b[0])} {fmt(b[1])}L{fmt(back[0])} {fmt(back[1])}",
                stroke=t["ink"], sw=1.8)
        px, py = -d2[1], d2[0]
        sc.path(f"M{fmt(tip[0])} {fmt(tip[1])}L{fmt(back[0] + px * 4.5)} {fmt(back[1] + py * 4.5)}L{fmt(back[0] - px * 4.5)} {fmt(back[1] - py * 4.5)}Z",
                fill=t["ink"], stroke=t["ink"], sw=1.2)
        m = ((s[0] + c[0]) / 2, (s[1] + c[1]) / 2)
        pill(sc, m[0], m[1] + 2, label)
    for n, (fn, label) in enumerate(CHAIN):
        x, y = floor.p(n * hop, -n * hop, 0)
        o = Iso(sc, x, y)
        top = draw_active(o, fn) if fn is agente else fn(o)
        pill(sc, x, y - top - 40, ACTIVE_LABEL if fn is agente else label, tone="success" if fn is agente else "neutral")
    return sc.svg()
