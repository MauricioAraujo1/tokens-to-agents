import math

from iso import (Iso, Scene, local_circle, local_line, local_poly, local_rrect, mix, pill, rotate, rounded_poly, fmt,
                 ground_zone)

PERSON_POSITIONS = [(0, -2), (-2, -1), (2, -1), (-4, 0), (0, 0), (4, 0), (-2, 1), (2, 1), (0, 2)]


def usuario(o):
    sc = o.sc
    t = sc.t
    x, y = o.p(0, 0, 0)
    sc.open_group()
    o.slab_diamond(x, y, 90, t["sunken"])
    top = y - 14
    o.slab_diamond(x, top, 90, t["surface"])
    colors = ["purple", "blue", "orange", "green", "yellow"]
    for n, (px, py) in enumerate(PERSON_POSITIONS):
        cx, cy = x + px * 15, top + py * 15
        sc.add(f'<rect x="{fmt(cx - 7)}" y="{fmt(cy - 24)}" width="14" height="24" rx="7" fill="{t[colors[n % 5]]}" stroke="{t["ink"]}" stroke-width="1.6"/>')
        sc.add(f'<circle cx="{fmt(cx)}" cy="{fmt(cy - 29)}" r="6" fill="{t["surface"]}" stroke="{t["ink"]}" stroke-width="1.6"/>')
    sc.close_group()
    return 22


def aplicacao(o):
    sc = o.sc
    t = sc.t
    sc.open_group()
    sh = o.box(-36, 36, -36, 36, 0, 12, "blue", r=10)
    o.box(-32, 32, -8, 0, 12, 76, "blue", r=7)
    f = o.left(0)
    o.draw(local_rrect(-28, 16, 28, 72, 4), f, fill=t["surface"], stroke=t["ink"], sw=1.4)
    o.draw(local_rrect(-28, 63, 28, 72, 3), f, fill=sh["c"], stroke=t["ink"], sw=1.4)
    for n in range(3):
        o.draw(local_circle(-23 + n * 5, 67.5, 1.7), f, fill=t["surface"])
    o.draw(local_rrect(-25, 20, -14, 59, 2), f, fill=sh["soft"])
    o.draw(local_rrect(-11, 53, 22, 56, 1.5), f, fill=t["ink"], opacity=0.75)
    o.draw(local_rrect(-11, 47, 12, 50, 1.5), f, fill=t["ink"], opacity=0.45)
    o.draw(local_rrect(-11, 22, 25, 42, 2.5), f, fill=sh["base"], stroke=t["ink"], sw=1.2)
    o.draw(local_rrect(-7, 26, 6, 29, 1.5), f, fill=t["surface"])
    o.draw(local_rrect(9, 26, 21, 38, 2), f, fill=t["surface"])
    sc.close_group()
    return 12


def embedding(o):
    sc = o.sc
    sc.open_group()
    o.box(-40, 40, -40, 40, 0, 10, "blue", r=10)
    heights = [[30, 52, 18, 40], [46, 22, 60, 28], [20, 38, 26, 50]]
    cells = []
    for row, j in enumerate((-22, 0, 22)):
        for col, i in enumerate((-27, -9, 9, 27)):
            cells.append((i + j, i, j, heights[row][col]))
    for _, i, j, h in sorted(cells):
        tone = "orange" if h == 60 else "blue"
        o.box(i - 6, i + 6, j - 6, j + 6, 10, 10 + h, tone, r=2.5, sw=1.6)
    sc.close_group()
    return 10


def banco_vetorial(o):
    sc = o.sc
    t = sc.t
    sc.open_group()
    x, yt, rx, ry, sh = o.cylinder(0, 0, 48, 0, 66, "purple", bands=(22, 44))
    f = o.top(66)
    pts = [(16, -10), (-12, -18), (6, 18), (-20, 6), (22, 12), (-4, -26), (14, 26), (-22, -4), (24, -18)]
    for (u, v) in pts[:3]:
        o.draw(local_line([(0, 0), (u, v)]), f, stroke=t["ink"], sw=1.6)
    for n, (u, v) in enumerate(pts):
        o.draw(local_circle(u, v, 3.2 if n < 3 else 2.4), f, fill=sh["c"] if n >= 3 else t["orange"], stroke=t["ink"], sw=1.2)
    o.draw(local_circle(0, 0, 2.6), f, fill=t["ink"])
    sc.close_group()
    return 66


def recuperacao(o):
    sc = o.sc
    t = sc.t
    sh = sc.shades("purple")
    sc.open_group()
    o.box(-10, 10, -10, 10, 0, 10, "green", r=3, sw=1.6)
    x, ys = o.p(0, 0, 14)
    _, ytop = o.p(0, 0, 64)
    rs, rt = 10, 50
    body = (f"M{fmt(x - rt)} {fmt(ytop)}L{fmt(x - rs)} {fmt(ys)}L{fmt(x - rs)} {fmt(ys + 10)}"
            f"C{fmt(x - rs)} {fmt(ys + 13)} {fmt(x - 5)} {fmt(ys + 15)} {fmt(x)} {fmt(ys + 15)}"
            f"C{fmt(x + 5)} {fmt(ys + 15)} {fmt(x + rs)} {fmt(ys + 13)} {fmt(x + rs)} {fmt(ys + 10)}"
            f"L{fmt(x + rs)} {fmt(ys)}L{fmt(x + rt)} {fmt(ytop)}Z")
    cid = sc.nid("c")
    sc.defs.append(f'<clipPath id="{cid}"><path d="{body}"/></clipPath>')
    sc.path(body, fill=sh["base"])
    sc.add(f'<g clip-path="url(#{cid})">')
    sc.path(f"M{fmt(x)} {fmt(ytop - 60)}H{fmt(x + 80)}V{fmt(ys + 30)}H{fmt(x)}Z", fill=sh["c"], opacity=0.32)
    sc.add("</g>")
    sc.path(body, stroke=t["ink"])
    sc.path(o.ellipse_d(x, ytop, rt, rt / 2), fill=sh["soft"], stroke=t["ink"])
    sc.path(o.ellipse_d(x, ytop + 2, rt - 8, (rt - 8) / 2), fill=mix(sh["c"], t["ink"], 0.55) if sc.theme == "claro" else mix(sh["c"], "#000000", 0.45))
    chunks = [(-30, -6, 80, "purple"), (-8, -22, 90, "green"), (10, 6, 84, "purple"), (26, -14, 74, "purple")]
    for i, j, k, c in sorted(chunks, key=lambda a: a[0] + a[1]):
        o.box(i - 6, i + 6, j - 6, j + 6, k, k + 10, c, r=2, sw=1.6)
    sc.close_group()
    return 100


def contexto(o):
    sc = o.sc
    t = sc.t
    sh = sc.shades("yellow")
    sc.open_group()
    sheets = [(-6, 4, 0), (3, -3, 7), (0, 0, 14)]
    for n, (di, dj, k) in enumerate(sheets):
        last = n == len(sheets) - 1
        faces = None
        if last:
            faces = dict(sh)
            faces["top"] = t["surface"]
        o.box(-30 + di, 30 + di, -42 + dj, 42 + dj, k, k + 4, "yellow", r=4, sw=1.6, faces=faces)
    f = o.top(18)
    o.draw(local_poly([(-14, -34), (-14, 30), (-6, 30), (-6, -34)]), f, fill=sh["c"], stroke=t["ink"], sw=1.2)
    o.draw(local_poly([(8, -34), (8, 30), (16, 30), (16, -34)]), f, fill=sh["c"], stroke=t["ink"], sw=1.2)
    lines = [(-22, 56), (-10, 60), (2, 40), (12, 52), (22, 30)]
    for i, ln in lines:
        o.draw(local_poly([(i - 1.4, -34), (i - 1.4, -34 + ln), (i + 1.4, -34 + ln), (i + 1.4, -34)]), f,
               fill=t["ink"], opacity=0.6)
    sc.close_group()
    return 18


def llm(o):
    sc = o.sc
    t = sc.t
    sc.open_group()
    o.box(-40, 40, -40, 40, 0, 10, "gray", r=10)
    f = o.top(10)
    for n in range(5):
        u = -24 + n * 12
        o.draw(local_poly([(u - 2, 33), (u + 2, 33), (u + 2, 39), (u - 2, 39)]), f, fill=t["ink"], opacity=0.7)
        o.draw(local_poly([(33, u - 2), (39, u - 2), (39, u + 2), (33, u + 2)]), f, fill=t["ink"], opacity=0.7)
    o.box(-14, 14, -14, 14, 10, 22, "orange", r=4, sw=1.6)
    sh = o.box(-32, 32, -32, 32, 22, 78, "orange", r=14)
    x, y = o.p(0, 0, 78)
    sc.path(f"M{fmt(x)} {fmt(y)}L{fmt(x)} {fmt(y - 20)}", stroke=t["ink"])
    sc.add(f'<circle cx="{fmt(x)}" cy="{fmt(y - 25)}" r="5.5" fill="{t["orange"]}" stroke="{t["ink"]}" stroke-width="2"/>')
    f = o.left(32)
    o.draw(local_rrect(-24, 34, 24, 68, 8), f, fill=t["surface"], stroke=t["ink"], sw=1.6)
    for u in (-11, 11):
        o.draw(local_circle(u, 55, 5.2), f, fill=sh["c"], stroke=t["ink"], sw=1.6)
        o.draw(local_circle(u + 1, 56, 2), f, fill=t["ink"])
    o.draw(local_line([(-8, 42), (-4, 39), (4, 39), (8, 42)]), f, stroke=t["ink"], sw=1.8)
    r = o.right(32)
    o.draw(local_circle(0, 52, 7), r, fill=sh["base"], stroke=t["ink"], sw=1.6)
    o.draw(local_circle(0, 52, 2.6), r, fill=t["ink"])
    sc.close_group()
    return 103


def resposta(o):
    sc = o.sc
    t = sc.t
    sc.open_group()
    tail = [(-30, 30), (-14, 30), (-36, 10)]
    o.extrude(local_poly(tail), o.left(4), o.left(-6), "green", steps=4)
    o.box(-40, 34, -6, 4, 26, 84, "green", r=12)
    f = o.left(4)
    o.draw(local_rrect(-30, 66, 22, 71, 2.5), f, fill=t["ink"], opacity=0.75)
    o.draw(local_rrect(-30, 56, 14, 61, 2.5), f, fill=t["ink"], opacity=0.5)
    o.draw(local_rrect(-30, 46, 24, 51, 2.5), f, fill=t["ink"], opacity=0.5)
    o.draw(local_rrect(-30, 36, 2, 41, 2.5), f, fill=t["ink"], opacity=0.5)
    o.draw(local_circle(16, 38.5, 5), f, fill=t["surface"], stroke=t["ink"], sw=1.4)
    o.draw(local_line([(13.5, 38.5), (15.5, 36.5), (19, 40.5)]), f, stroke=t["ink"], sw=1.4)
    sc.close_group()
    return 84


def sem_resultado(o):
    sc = o.sc
    t = sc.t
    sh = sc.shades("red")
    p = o.p
    i0, i1, j0, j1, k0, k1 = -34, 34, -34, 34, 0, 40
    sc.open_group()
    outline = [p(i0, j0, k1), p(i1, j0, k1), p(i1, j0, k0), p(i1, j1, k0), p(i0, j1, k0), p(i0, j1, k1)]
    d_out = rounded_poly(outline, 8)
    sc.path(d_out, fill=sh["base"])
    cid = sc.nid("c")
    sc.defs.append(f'<clipPath id="{cid}"><path d="{d_out}"/></clipPath>')
    sc.add(f'<g clip-path="url(#{cid})">')
    sc.path(rounded_poly([p(i1, j0, k1), p(i1, j1, k1), p(i1, j1, k0), p(i1, j0, k0)], 0), fill=sh["right"])
    inner_dark = mix(sh["c"], t["ink"], 0.55) if sc.theme == "claro" else mix(sh["c"], "#000000", 0.4)
    w = 4
    opening = [p(i0 + w, j0 + w, k1), p(i1 - w, j0 + w, k1), p(i1 - w, j1 - w, k1), p(i0 + w, j1 - w, k1)]
    sc.path(rounded_poly([p(i0, j0, k1), p(i1, j0, k1), p(i1, j1, k1), p(i0, j1, k1)], 0), fill=sh["top"])
    sc.add("</g>")
    sc.path(rounded_poly(opening, 3), fill=inner_dark)
    cid2 = sc.nid("c")
    sc.defs.append(f'<clipPath id="{cid2}"><path d="{rounded_poly(opening, 3)}"/></clipPath>')
    sc.add(f'<g clip-path="url(#{cid2})">')
    sc.path(rounded_poly([p(i0 + w, j0 + w, k1), p(i1 - w, j0 + w, k1), p(i1 - w, j0 + w, k1 - 34), p(i0 + w, j0 + w, k1 - 34)], 0), fill=sh["base"])
    sc.path(rounded_poly([p(i0 + w, j0 + w, k1), p(i0 + w, j1 - w, k1), p(i0 + w, j1 - w, k1 - 34), p(i0 + w, j0 + w, k1 - 34)], 0), fill=sh["right"])
    sc.add("</g>")
    sc.path(rounded_poly(opening, 3), stroke=t["ink"], sw=1.4)
    sc.path(d_out, stroke=t["ink"])
    sc.close_group()
    x, y = p(18, -30, 78)
    sc.open_group()
    sc.add(f'<circle cx="{fmt(x)}" cy="{fmt(y)}" r="13" fill="{t["surface"]}" stroke="{t["ink"]}" stroke-width="2.4"/>')
    sc.path(f"M{fmt(x + 9.5)} {fmt(y + 9.5)}L{fmt(x + 20)} {fmt(y + 20)}", stroke=t["ink"], sw=4)
    sc.path(f"M{fmt(x - 5)} {fmt(y - 5)}L{fmt(x + 5)} {fmt(y + 5)}M{fmt(x + 5)} {fmt(y - 5)}L{fmt(x - 5)} {fmt(y + 5)}", stroke=t["red"], sw=2.6)
    sc.close_group()
    return 92


def banco_relacional(o):
    sc = o.sc
    t = sc.t
    sc.open_group()

    def table(ci, cj, hi, hj, rows):
        sh = o.box(ci - hi, ci + hi, cj - hj, cj + hj, 0, 16, "blue", r=6)
        f = o.top(16)
        u0, u1, v0, v1 = ci - hi + 5, ci + hi - 5, cj - hj + 5, cj + hj - 5
        o.draw(local_poly([(u0, v0), (u1, v0), (u1, v1), (u0, v1)]), f, fill=t["surface"], stroke=t["ink"], sw=1.2)
        o.draw(local_poly([(u0, v0), (u0 + 9, v0), (u0 + 9, v1), (u0, v1)]), f, fill=sh["c"], stroke=t["ink"], sw=1.2)
        step = (u1 - u0 - 9) / rows
        for n in range(1, rows):
            u = u0 + 9 + n * step
            o.draw(local_line([(u, v0), (u, v1)]), f, stroke=t["ink"], sw=1, opacity=0.6)
        for frac in (0.34, 0.67):
            v = v0 + (v1 - v0) * frac
            o.draw(local_line([(u0, v), (u1, v)]), f, stroke=t["ink"], sw=1, opacity=0.6)
        o.draw(local_circle(u0 + 4.5, v0 + 6, 1.8), f, fill=t["yellow"], stroke=t["ink"], sw=1)
        return f

    table(-26, -10, 22, 30, 4)
    table(28, 18, 18, 24, 3)
    a = o.p(-4, 12, 16)
    b = o.p(10, 12, 16)
    sc.path(f"M{fmt(a[0])} {fmt(a[1])}L{fmt(b[0])} {fmt(b[1])}", stroke=t["ink"], sw=2)
    sc.add(f'<circle cx="{fmt(a[0])}" cy="{fmt(a[1])}" r="3" fill="{t["yellow"]}" stroke="{t["ink"]}" stroke-width="1.4"/>')
    sc.add(f'<circle cx="{fmt(b[0])}" cy="{fmt(b[1])}" r="3" fill="{t["yellow"]}" stroke="{t["ink"]}" stroke-width="1.4"/>')
    sc.close_group()
    return 40


def banco_nosql(o):
    sc = o.sc
    t = sc.t
    sc.open_group()
    sh = o.box(-44, 44, -26, 26, 0, 10, "green", r=8)
    cards = [(-24, -12), (-4, 0), (16, 12)]
    for n, (ci, cj) in enumerate(cards):
        faces = dict(sh)
        faces["base"] = t["surface"]
        faces["top"] = sh["soft"]
        faces["right"] = sh["soft"]
        o.box(ci - 20, ci + 20, cj - 2, cj + 2, 10, 70 - n * 6, "green", r=4, sw=1.6, faces=faces)
        f = o.left(cj + 2)
        top = 64 - n * 6
        o.draw(local_rrect(ci - 16, top - 6, ci + 16, top - 1, 2), f, fill=sh["c"], stroke=t["ink"], sw=1)
        if n == 2:
            rows = [(0, 14), (6, 18), (6, 10), (6, 16), (0, 6)]
            for r_, (ind, ln) in enumerate(rows):
                w = top - 13 - r_ * 7
                o.draw(local_rrect(ci - 15 + ind, w, ci - 15 + ind + ln * 0.9, w + 3, 1.4), f, fill=t["ink"], opacity=0.6)
                if 0 < r_ < 4:
                    o.draw(local_rrect(ci - 15 + ind + ln * 0.9 + 2, w, ci + 14, w + 3, 1.4), f, fill=sh["c"])
            o.draw(local_line([(ci - 17.5, top - 12), (ci - 19, top - 12), (ci - 19, top - 41), (ci - 17.5, top - 41)]), f, stroke=t["ink"], sw=1.2)
    sc.close_group()
    return 70


def cache(o):
    sc = o.sc
    t = sc.t
    sc.open_group()
    sh = o.box(-28, 28, -28, 28, 0, 76, "yellow", r=8)
    f = o.left(28)
    for w0 in (52, 28, 4):
        o.draw(local_rrect(-23, w0, 23, w0 + 20, 3), f, fill=sh["top"], stroke=t["ink"], sw=1.4)
        o.draw(local_rrect(-19, w0 + 12, -5, w0 + 17, 1.5), f, fill=t["surface"], stroke=t["ink"], sw=1)
        o.draw(local_rrect(4, w0 + 8, 16, w0 + 11, 1.5), f, fill=t["ink"])
    r = o.right(28)
    bolt = [(3, 64), (-9, 38), (-1, 38), (-5, 14), (9, 44), (1, 44), (7, 64)]
    o.draw(local_poly(bolt), r, fill=t["orange"], stroke=t["ink"], sw=1.6)
    sc.close_group()
    return 76


def documentos(o):
    sc = o.sc
    t = sc.t
    sc.open_group()
    sh = sc.shades("yellow")
    o.box(-36, 36, -14, -8, 0, 62, "yellow", r=6)
    o.draw(local_poly([(-34, 58), (-14, 58), (-10, 68), (-34, 68)]), o.left(-11), fill=sh["base"], stroke=t["ink"], sw=1.6)
    for n, (di, k1) in enumerate([(-6, 76), (4, 70), (-2, 82)]):
        faces = dict(sh)
        faces["base"] = t["surface"]
        faces["top"] = t["surface"]
        faces["right"] = mix(t["surface"], t["grid"], 0.4)
        o.box(-28 + di, 28 + di, -7 + n * 2, -5 + n * 2, 6, k1, "yellow", r=3, sw=1.4, faces=faces)
    o.box(-36, 36, 2, 8, 0, 48, "yellow", r=6)
    f = o.left(8)
    o.draw(local_rrect(-12, 30, 12, 38, 3), f, fill=t["surface"], stroke=t["ink"], sw=1.2)
    o.draw(local_rrect(-8, 33, 8, 35, 1), f, fill=t["ink"], opacity=0.6)
    sc.close_group()
    return 82


def celular(o):
    sc = o.sc
    t = sc.t
    sc.open_group()
    o.box(-32, 32, -18, 18, 0, 6, "gray", r=8)
    o.box(-22, 22, -6, 2, 6, 98, "gray", r=10)
    f = o.left(2)
    o.draw(local_rrect(-18.5, 11, 18.5, 93, 6), f, fill=t["surface"], stroke=t["ink"], sw=1.4)
    o.draw(local_rrect(-6, 86, 6, 89.5, 1.75), f, fill=t["ink"])
    o.draw(local_rrect(-2, 68, 15, 78, 4), f, fill=t["blue"], stroke=t["ink"], sw=1.2)
    o.draw(local_rrect(-15, 52, 6, 64, 4), f, fill=t["grid"], stroke=t["ink"], sw=1.2)
    o.draw(local_rrect(-12, 57, 2, 59, 1), f, fill=t["ink"], opacity=0.6)
    o.draw(local_rrect(-4, 38, 15, 48, 4), f, fill=t["blue"], stroke=t["ink"], sw=1.2)
    o.draw(local_rrect(-15, 16, 15, 24, 4), f, fill=t["surface"], stroke=t["ink"], sw=1.2)
    o.draw(local_circle(10.5, 20, 2.4), f, fill=t["green"], stroke=t["ink"], sw=1)
    sc.close_group()
    return 98


def notebook(o):
    sc = o.sc
    t = sc.t
    sc.open_group()
    o.box(-44, 44, -30, -24, 6, 70, "gray", r=7)
    f = o.left(-24)
    o.draw(local_rrect(-40, 11, 40, 66, 4), f, fill=t["surface"], stroke=t["ink"], sw=1.4)
    o.draw(local_rrect(-40, 58, 40, 66, 3), f, fill=t["purple"], stroke=t["ink"], sw=1.2)
    for n in range(3):
        o.draw(local_circle(-35 + n * 4.5, 62, 1.4), f, fill=t["surface"])
    o.draw(local_rrect(-34, 40, -4, 52, 4), f, fill=t["grid"], stroke=t["ink"], sw=1.1)
    o.draw(local_rrect(4, 26, 34, 38, 4), f, fill=t["orange"], stroke=t["ink"], sw=1.1)
    o.draw(local_rrect(-34, 14, 34, 21, 3), f, fill=t["surface"], stroke=t["ink"], sw=1.1)
    o.box(-44, 44, -24, 30, 0, 6, "gray", r=7)
    k = o.top(6)
    for row in range(3):
        for col in range(9):
            u = -38 + col * 8.6
            v = -18 + row * 8
            o.draw(local_poly([(u, v), (u + 6.6, v), (u + 6.6, v + 6), (u, v + 6)]), k, fill=t["surface"], stroke=t["ink"], sw=0.8)
    o.draw(local_poly([(-14, 10), (14, 10), (14, 24), (-14, 24)]), k, fill=t["surface"], stroke=t["ink"], sw=1)
    sc.close_group()
    return 70


def servidor(o):
    sc = o.sc
    t = sc.t
    sc.open_group()
    sh = o.box(-26, 26, -26, 26, 0, 92, "gray", r=8)
    f = o.left(26)
    for w0 in (64, 36, 8):
        o.draw(local_rrect(-21, w0, 21, w0 + 22, 3), f, fill=sh["top"], stroke=t["ink"], sw=1.4)
        o.draw(local_circle(-15, w0 + 11, 2.4), f, fill=t["green"], stroke=t["ink"], sw=1)
        o.draw(local_circle(-8, w0 + 11, 2.4), f, fill=t["yellow"] if w0 != 36 else t["green"], stroke=t["ink"], sw=1)
        for n in range(4):
            o.draw(local_rrect(0 + n * 4.5, w0 + 5, 2.4 + n * 4.5, w0 + 17, 1.2), f, fill=t["ink"], opacity=0.55)
    r = o.right(26)
    for n in range(6):
        o.draw(local_rrect(-18, 74 - n * 6, 18, 76 - n * 6, 1), r, fill=t["ink"], opacity=0.35)
    sc.close_group()
    return 92


def nuvem(o):
    sc = o.sc
    t = sc.t
    sc.open_group()
    o.box(-10, 10, -10, 10, 0, 34, "gray", r=3, sw=1.6)
    x0, y0 = o.p(0, 0, 40)
    d = (f"M{fmt(x0 - 44)} {fmt(y0)}H{fmt(x0 + 44)}"
         f"A16 16 0 0 0 {fmt(x0 + 40)} {fmt(y0 - 30)}A24 24 0 0 0 {fmt(x0 + 2)} {fmt(y0 - 46)}"
         f"A19 19 0 0 0 {fmt(x0 - 30)} {fmt(y0 - 32)}A16 16 0 0 0 {fmt(x0 - 44)} {fmt(y0)}Z")
    sh = sc.shades("blue")
    for s in range(7, -1, -1):
        dx, dy = s * 1.4, -s * 0.7
        sc.add(f'<path d="{d}" transform="translate({fmt(dx)} {fmt(dy)})" fill="{sh["right"] if s else sh["base"]}"'
               + (f' stroke="{t["ink"]}" stroke-width="2" stroke-linejoin="round"' if s in (7, 0) else "") + "/>")
    sc.path(f"M{fmt(x0 - 20)} {fmt(y0 - 16)}h12M{fmt(x0 - 2)} {fmt(y0 - 16)}h22M{fmt(x0 - 20)} {fmt(y0 - 8)}h30",
            stroke=t["ink"], sw=2.2, opacity=0.6)
    sc.close_group()
    return 92


def fila(o):
    sc = o.sc
    t = sc.t
    sc.open_group()
    o.box(-44, -36, -6, 6, 0, 12, "gray", r=2, sw=1.6)
    o.box(36, 44, -6, 6, 0, 12, "gray", r=2, sw=1.6)
    o.box(-56, 56, -14, 14, 12, 20, "gray", r=6)
    f = o.left(14)
    for n in range(8):
        o.draw(local_circle(-48 + n * 13.5, 16, 2), f, fill=t["ink"], opacity=0.55)
    for i, c in [(-36, "blue"), (-6, "purple"), (24, "green")]:
        o.box(i - 9, i + 9, -9, 9, 20, 36, c, r=3, sw=1.6)
        k = o.top(36)
        o.draw(local_line([(i - 9, -9), (i, 0), (i - 9, 9)]), k, stroke=t["ink"], sw=1.2)
    a = o.p(48, 0, 30)
    b = o.p(64, 0, 30)
    sc.path(f"M{fmt(a[0])} {fmt(a[1])}L{fmt(b[0])} {fmt(b[1])}", stroke=t["ink"], sw=2)
    sc.path(f"M{fmt(b[0] - 7)} {fmt(b[1] - 7)}L{fmt(b[0] + 1)} {fmt(b[1] + 0.5)}L{fmt(b[0] - 9.5)} {fmt(b[1] + 2)}", stroke=t["ink"], sw=2)
    sc.close_group()
    return 36


def agente(o):
    sc = o.sc
    t = sc.t
    sc.open_group()
    o.cylinder(0, 0, 34, 0, 8, "gray")
    o.box(-16, 16, -16, 16, 8, 50, "orange", r=8)
    f = o.left(16)
    o.draw(local_rrect(-10, 18, 10, 38, 4), f, fill=t["surface"], stroke=t["ink"], sw=1.2)
    for n, c in enumerate(("green", "yellow", "blue")):
        o.draw(local_circle(-5 + n * 5, 28, 1.8), f, fill=t[c], stroke=t["ink"], sw=0.8)
    sh = o.box(-22, 22, -22, 22, 52, 90, "orange", r=10)
    x, y = o.p(0, 0, 90)
    sc.path(f"M{fmt(x)} {fmt(y)}L{fmt(x)} {fmt(y - 14)}", stroke=t["ink"])
    sc.add(f'<circle cx="{fmt(x)}" cy="{fmt(y - 18)}" r="4.5" fill="{t["orange"]}" stroke="{t["ink"]}" stroke-width="2"/>')
    f = o.left(22)
    o.draw(local_rrect(-16, 60, 16, 84, 6), f, fill=t["surface"], stroke=t["ink"], sw=1.4)
    for u in (-7, 7):
        o.draw(local_circle(u, 74, 3.6), f, fill=sh["c"], stroke=t["ink"], sw=1.4)
    o.draw(local_line([(-5, 66), (5, 66)]), f, stroke=t["ink"], sw=1.8)
    o.box(16, 32, -5, 5, 34, 44, "orange", r=3, sw=1.6)
    hx, hy = o.p(36, 0, 39)
    stroke = f'stroke="{t["ink"]}" stroke-width="1.8" stroke-linejoin="round"'
    sc.add(f'<g transform="translate({fmt(hx)} {fmt(hy)}) rotate(32)">'
           f'<rect x="-4.5" y="-12" width="9" height="38" rx="4.5" fill="{t["gray"]}" {stroke}/>'
           f'<circle cx="0" cy="20" r="2.2" fill="{t["surface"]}" stroke="{t["ink"]}" stroke-width="1.2"/>'
           f'<path d="M-4.5 -32.04L-4.5 -22L4.5 -22L4.5 -32.04A12.5 12.5 0 1 1 -4.5 -32.04Z" fill="{t["gray"]}" {stroke}/>'
           f'<circle cx="0" cy="0" r="6.5" fill="{sh["base"]}" {stroke}/>'
           "</g>")
    sc.close_group()
    return 108


def ferramenta(o):
    sc = o.sc
    t = sc.t
    sc.open_group()
    sh = o.box(-42, 42, -22, 22, 0, 40, "yellow", r=8)
    o.box(-18, -13, -3, 3, 40, 56, "gray", r=1.5, sw=1.6)
    o.box(13, 18, -3, 3, 40, 56, "gray", r=1.5, sw=1.6)
    o.box(-18, 18, -3, 3, 52, 58, "gray", r=2, sw=1.6)
    f = o.left(22)
    o.draw(local_line([(-42, 30), (42, 30)]), f, stroke=t["ink"], sw=1.4)
    o.draw(local_rrect(-6, 25, 6, 34, 2), f, fill=t["gray"], stroke=t["ink"], sw=1.2)
    wr = local_rrect(-20, 6, -16, 26, 2)
    o.draw(rotate(wr, -40, -18, 16), f, fill=t["surface"], stroke=t["ink"], sw=1.2)
    gear = []
    for n in range(16):
        a = math.radians(n * 22.5)
        rr = 9 if n % 2 == 0 else 7
        gear.append((18 + rr * math.cos(a), 15 + rr * math.sin(a)))
    o.draw(local_poly(gear), f, fill=t["surface"], stroke=t["ink"], sw=1.2)
    o.draw(local_circle(18, 15, 3), f, fill=sh["base"], stroke=t["ink"], sw=1.2)
    sc.close_group()
    return 58


def memoria(o):
    sc = o.sc
    t = sc.t
    sc.open_group()
    o.box(-58, 58, -12, 12, 0, 10, "gray", r=5)
    sh = o.box(-52, 52, -3, 3, 10, 48, "green", r=4)
    f = o.left(3)
    for n in range(4):
        u = -44 + n * 23
        o.draw(local_rrect(u, 22, u + 17, 40, 2), f, fill=t["ink"] if sc.theme == "claro" else "#0C0B09", opacity=0.85)
    for n in range(20):
        u = -48 + n * 5
        o.draw(local_poly([(u, 11.5), (u + 2.6, 11.5), (u + 2.6, 17), (u, 17)]), f, fill=t["yellow"], stroke=t["ink"], sw=0.6)
    o.draw(local_poly([(-6, 10), (-2, 10), (-2, 14), (-6, 14)]), f, fill=sh["base"])
    sc.close_group()
    return 48


def guardrail(o):
    sc = o.sc
    t = sc.t
    sc.open_group()
    o.box(-36, 36, -20, 20, 0, 10, "gray", r=8)
    shield = [("M", (-26, 92)), ("L", (26, 92)), ("L", (26, 58)),
              ("C", (26, 34), (8, 20), (0, 14)), ("C", (-8, 20), (-26, 34), (-26, 58)), ("Z",)]
    sh = o.extrude(shield, o.left(6), o.left(-6), "green", steps=6)
    f = o.left(6)
    inner = [("M", (-19, 85)), ("L", (19, 85)), ("L", (19, 58)),
             ("C", (19, 40), (6, 28), (0, 23)), ("C", (-6, 28), (-19, 40), (-19, 58)), ("Z",)]
    o.draw(inner, f, fill=sh["soft"], stroke=t["ink"], sw=1.2)
    o.draw(local_line([(-10, 58), (-2, 49), (12, 68)]), f, stroke=t["ink"], sw=4)
    sc.close_group()
    return 92


def avaliacao(o):
    sc = o.sc
    t = sc.t
    sc.open_group()
    o.box(-34, 34, -16, 16, 0, 8, "gray", r=6)
    o.box(-28, 28, -4, 2, 8, 96, "purple", r=7)
    f = o.left(2)
    o.draw(local_rrect(-23, 13, 23, 86, 3), f, fill=t["surface"], stroke=t["ink"], sw=1.2)
    o.box(-12, 12, -6, 4, 88, 100, "gray", r=3, sw=1.6)
    rows = [(70, "ok"), (54, "ok"), (38, "bad"), (22, "ok")]
    for w, state in rows:
        o.draw(local_rrect(-18, w, -8, w + 10, 2), f, fill=t["green"] if state == "ok" else t["red"], stroke=t["ink"], sw=1.2)
        if state == "ok":
            o.draw(local_line([(-16, w + 5), (-13.5, w + 2.5), (-9.5, w + 7.5)]), f, stroke=t["ink"], sw=1.4)
        else:
            o.draw(local_line([(-15.5, w + 2.5), (-10.5, w + 7.5)]), f, stroke=t["ink"], sw=1.4)
            o.draw(local_line([(-10.5, w + 2.5), (-15.5, w + 7.5)]), f, stroke=t["ink"], sw=1.4)
        o.draw(local_rrect(-4, w + 3.5, 18 - (w % 3) * 3, w + 6.5, 1.5), f, fill=t["ink"], opacity=0.55)
    sc.close_group()
    return 100


def tokens(o):
    sc = o.sc
    t = sc.t
    sc.open_group()
    tiles = [(-45, "blue", 26), (-15, "purple", 26), (15, "orange", 26), (45, "green", 26)]
    for i, c, h in tiles:
        o.box(i - 12, i + 12, -12, 12, 0, h, c, r=4)
    sc.close_group()
    for n, (i, c, h) in enumerate(tiles):
        x, y = o.p(i, 12, h / 2)
        ids = ["Tok", "en", "iz", "ar"][n]
        sc.add(f'<text transform="matrix(1 0.5 0 1 {fmt(x)} {fmt(y)})" x="0" y="4" font-family="Geist Mono" font-size="11" '
               f'font-weight="700" fill="{t["ink"]}" text-anchor="middle">{ids}</text>')
    return 26


BLOCKS = {
    "rag": [
        ("Usuário", "plataforma · Requisição", "mantido: já tem silhueta própria", usuario, 140, "usuário"),
        ("Aplicação", "bloco · Requisição e processamento", "janela do app em pé sobre a base", aplicacao, 150, "aplicação"),
        ("Embedding", "bloco · Requisição e processamento", "colunas = dimensões do vetor", embedding, 142, "embedding"),
        ("Banco vetorial", "cilindro · Recuperação", "pontos e vetores no topo do cilindro", banco_vetorial, 150, "banco vetorial"),
        ("Recuperação", "funil · Recuperação", "trechos caem no funil, sai o top-k", recuperacao, 150, "top-k"),
        ("Contexto", "folhas · Contexto", "pilha de folhas com os trechos marcados", contexto, 128, "contexto"),
        ("LLM", "robô · Geração", "cabeça de robô sobre um chip", llm, 150, "llm"),
        ("Resposta", "balão · Resposta", "balão de fala com o texto gerado", resposta, 146, "resposta"),
        ("Sem resultado", "caixa vazia · Erro", "caixa aberta e vazia, lupa com X", sem_resultado, 150, "sem resultado"),
    ],
    "dados": [
        ("Banco relacional", "tabelas · Dados", "duas tabelas ligadas por chave (SQL)", banco_relacional, 136, "sql"),
        ("Banco NoSQL", "documentos · Dados", "documentos JSON em pé num rack", banco_nosql, 140, "nosql"),
        ("Cache chave-valor", "gaveteiro · Dados", "gavetas com rótulo e raio de velocidade", cache, 150, "chave → valor"),
        ("Documentos", "pasta · Base de conhecimento", "pasta com arquivos para ingestão", documentos, 150, "documentos"),
    ],
    "dispositivos": [
        ("Celular", "dispositivo · Cliente", "app de chat na tela", celular, 152, "celular"),
        ("Notebook", "dispositivo · Cliente", "tela com o app e teclado", notebook, 140, "notebook"),
        ("Servidor / API", "rack · Infraestrutura", "três unidades com LEDs", servidor, 150, "api"),
        ("Nuvem", "nuvem · Serviço externo", "provedor de modelo ou API externa", nuvem, 156, "provedor"),
        ("Fila", "esteira · Mensageria", "mensagens em fila assíncrona", fila, 120, "fila"),
    ],
    "agentes": [
        ("Agente", "robô com ferramenta · Agentes", "corpo, braço e chave inglesa", agente, 156, "agente"),
        ("Ferramenta", "caixa · Tool calling", "caixa de ferramentas com engrenagem", ferramenta, 134, "tool"),
        ("Memória", "pente de RAM · Estado", "memória de curto e longo prazo", memoria, 126, "memória"),
        ("Guardrail", "escudo · Segurança", "validação de entrada e saída", guardrail, 150, "guardrail"),
        ("Avaliação", "prancheta · Evals", "casos de teste aprovados e reprovados", avaliacao, 152, "eval"),
        ("Tokens", "peças · Tokenização", "texto quebrado em tokens", tokens, 120, "tokens"),
    ],
}


COLOR = {usuario: "blue", aplicacao: "blue", embedding: "blue", banco_vetorial: "purple", recuperacao: "purple",
         contexto: "yellow", llm: "orange", resposta: "green", sem_resultado: "red", banco_relacional: "blue",
         banco_nosql: "green", cache: "yellow", documentos: "yellow", celular: "gray", notebook: "gray",
         servidor: "gray", nuvem: "blue", fila: "gray", agente: "orange", ferramenta: "yellow", memoria: "green",
         guardrail: "green", avaliacao: "purple", tokens: "blue"}


def draw_active(o, fn):
    sc = o.sc
    ground_zone(o, 0, 0)
    sc.sw = 2.8
    sc.glow = sc.t[COLOR[fn]]
    top = fn(o)
    sc.sw = 2.0
    sc.glow = None
    return top


PILL_Y = 18
ACTIVE_LABEL = "passo 3"


def render(fn, theme, oy, label, active=False, width=232, height=180):
    sc = Scene(theme, width, height)
    o = Iso(sc, width / 2, oy)
    if active:
        draw_active(o, fn)
    else:
        fn(o)
    if active:
        pill(sc, width / 2, PILL_Y, ACTIVE_LABEL, tone="success")
    else:
        pill(sc, width / 2, PILL_Y, label)
    return sc.svg()
