import math

THEMES = {
    "claro": {
        "paper": "#F4EEE2", "grid": "#E6DDCB", "surface": "#FBF8F2", "sunken": "#EFE7D8",
        "ink": "#1B1916", "muted": "#6E675C", "subtle": "#9A9284", "line": "#DDD3C1",
        "shadow": "#29281F",
        "green": "#B9D99B", "blue": "#8DB9DE", "purple": "#B8A2D8", "orange": "#EFB47D",
        "red": "#D96B65", "yellow": "#E9D58B", "gray": "#9AA5B1",
    },
    "escuro": {
        "paper": "#15130F", "grid": "#24211B", "surface": "#1E1B16", "sunken": "#1A1813",
        "ink": "#E9E1D2", "muted": "#A69F91", "subtle": "#7A7366", "line": "#34302A",
        "shadow": "#5C5549",
        "green": "#9CC27C", "blue": "#7AA6CC", "purple": "#A78ECB", "orange": "#D99A64",
        "red": "#E07F78", "yellow": "#D7C16E", "gray": "#AEB8C3",
    },
}


def hex2rgb(h):
    h = h.lstrip("#")
    return [int(h[i:i + 2], 16) for i in (0, 2, 4)]


def rgb2hex(c):
    return "#" + "".join(f"{max(0, min(255, round(v))):02X}" for v in c)


def mix(a, b, t):
    ca, cb = hex2rgb(a), hex2rgb(b)
    return rgb2hex([ca[i] * t + cb[i] * (1 - t) for i in range(3)])


def fmt(v):
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return "0" if s == "-0" else s


class Scene:
    def __init__(self, theme, width=232, height=180, grid=True):
        self.t = THEMES[theme]
        self.theme = theme
        self.w, self.h = width, height
        self.defs = []
        self.body = []
        self.uid = 0
        self.sw = 2.0
        self.grid = grid
        self.glow = None

    def shades(self, color):
        t = self.t
        c = t[color] if color in t else color
        base = mix(c, t["surface"], 0.62)
        return {
            "c": c,
            "base": base,
            "top": mix(t["surface"], base, 0.42),
            "right": mix(c, base, 0.45),
            "soft": mix(c, t["surface"], 0.30),
            "deep": mix(c, t["ink"], 0.78) if self.theme == "claro" else mix(c, "#000000", 0.7),
        }

    def nid(self, p):
        self.uid += 1
        return f"{p}{self.uid}"

    def add(self, s):
        self.body.append(s)

    def open_group(self, shadow=True, glow=None, opacity=None, name=None):
        glow = glow or self.glow
        attrs = []
        if name:
            attrs.append(f'id="{name}"')
        if shadow or glow:
            fid = self.nid("f")
            parts = []
            if shadow:
                parts.append(
                    f'<feDropShadow dx="0" dy="9" stdDeviation="3.5" flood-color="{self.t["shadow"]}" flood-opacity="0.2"/>')
            if glow:
                parts.append(f'<feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="{glow}" flood-opacity="1"/>')
            self.defs.append(f'<filter id="{fid}" x="-50%" y="-50%" width="200%" height="200%">{"".join(parts)}</filter>')
            attrs.append(f'filter="url(#{fid})"')
        if opacity is not None:
            attrs.append(f'opacity="{opacity}"')
        self.add(f'<g {" ".join(attrs)}>')

    def close_group(self):
        self.add("</g>")

    def path(self, d, fill="none", stroke=None, sw=None, opacity=None, extra=""):
        a = [f'd="{d}"', f'fill="{fill}"']
        if stroke:
            a.append(f'stroke="{stroke}" stroke-width="{fmt(sw if sw is not None else self.sw)}" stroke-linejoin="round" stroke-linecap="round"')
        if opacity is not None:
            a.append(f'opacity="{opacity}"')
        if extra:
            a.append(extra)
        self.add(f'<path {" ".join(a)}/>')

    def text(self, x, y, s, size=11, weight=500, fill=None, anchor="middle"):
        fill = fill or self.t["ink"]
        self.add(
            f'<text x="{fmt(x)}" y="{fmt(y)}" font-family="Geist Mono" font-size="{size}" font-weight="{weight}" '
            f'fill="{fill}" text-anchor="{anchor}" dominant-baseline="central">{s}</text>')

    def grid_lines(self):
        if not self.grid:
            return ""
        lines = []
        w, h = self.w, self.h
        step = 15
        for k in range(-60, 60):
            c = k * step
            for slope in (0.5, -0.5):
                pts = []
                for x in (0, w):
                    y = slope * x + c
                    if 0 <= y <= h:
                        pts.append((x, y))
                for y in (0, h):
                    x = (y - c) / slope
                    if 0 <= x <= w:
                        pts.append((x, y))
                pts = sorted(set((round(px, 2), round(py, 2)) for px, py in pts))
                if len(pts) >= 2:
                    (x1, y1), (x2, y2) = pts[0], pts[-1]
                    if abs(x1 - x2) + abs(y1 - y2) > 1:
                        lines.append(f"M{fmt(x1)} {fmt(y1)}L{fmt(x2)} {fmt(y2)}")
        return f'<path d="{"".join(lines)}" fill="none" stroke="{self.t["grid"]}" stroke-width="1"/>'

    def svg(self):
        return (
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.w}" height="{self.h}" viewBox="0 0 {self.w} {self.h}">'
            f'<defs>{"".join(self.defs)}</defs>{self.grid_lines()}{"".join(self.body)}</svg>')


def rounded_poly(points, r):
    out = []
    n = len(points)
    for idx, v in enumerate(points):
        prev = points[(idx - 1) % n]
        nxt = points[(idx + 1) % n]
        e = toward(v, prev, r)
        x = toward(v, nxt, r)
        out.append(f'{"M" if idx == 0 else "L"}{fmt(e[0])} {fmt(e[1])}Q{fmt(v[0])} {fmt(v[1])} {fmt(x[0])} {fmt(x[1])}')
    return "".join(out) + "Z"


def toward(o, t, d):
    ln = math.hypot(t[0] - o[0], t[1] - o[1])
    ratio = 0 if ln == 0 else min(d, ln / 2) / ln
    return (o[0] + (t[0] - o[0]) * ratio, o[1] + (t[1] - o[1]) * ratio)


def poly(points):
    return "M" + "L".join(f"{fmt(x)} {fmt(y)}" for x, y in points) + "Z"


K = 0.5523


def local_rrect(u0, w0, u1, w1, r):
    r = min(r, abs(u1 - u0) / 2, abs(w1 - w0) / 2)
    k = r * (1 - K)
    return [
        ("M", (u0 + r, w1)), ("L", (u1 - r, w1)),
        ("C", (u1 - k, w1), (u1, w1 - k), (u1, w1 - r)),
        ("L", (u1, w0 + r)),
        ("C", (u1, w0 + k), (u1 - k, w0), (u1 - r, w0)),
        ("L", (u0 + r, w0)),
        ("C", (u0 + k, w0), (u0, w0 + k), (u0, w0 + r)),
        ("L", (u0, w1 - r)),
        ("C", (u0, w1 - k), (u0 + k, w1), (u0 + r, w1)),
        ("Z",),
    ]


def local_circle(cu, cw, r, rw=None):
    rw = rw if rw is not None else r
    a, b = r * K, rw * K
    return [
        ("M", (cu + r, cw)),
        ("C", (cu + r, cw + b), (cu + a, cw + rw), (cu, cw + rw)),
        ("C", (cu - a, cw + rw), (cu - r, cw + b), (cu - r, cw)),
        ("C", (cu - r, cw - b), (cu - a, cw - rw), (cu, cw - rw)),
        ("C", (cu + a, cw - rw), (cu + r, cw - b), (cu + r, cw)),
        ("Z",),
    ]


def local_poly(points):
    segs = [("M", points[0])] + [("L", p) for p in points[1:]] + [("Z",)]
    return segs


def local_line(points):
    return [("M", points[0])] + [("L", p) for p in points[1:]]


def rotate(segs, ang, cu, cw):
    c, s = math.cos(math.radians(ang)), math.sin(math.radians(ang))
    out = []
    for seg in segs:
        pts = [(cu + (p[0] - cu) * c - (p[1] - cw) * s, cw + (p[0] - cu) * s + (p[1] - cw) * c) for p in seg[1:]]
        out.append((seg[0], *pts))
    return out


def to_d(segs, fn):
    d = []
    for seg in segs:
        if seg[0] == "Z":
            d.append("Z")
            continue
        pts = [fn(*p) for p in seg[1:]]
        d.append(seg[0] + " ".join(f"{fmt(x)} {fmt(y)}" for x, y in pts))
    return "".join(d)


class Iso:

    def __init__(self, sc, ox, oy):
        self.sc, self.ox, self.oy = sc, ox, oy

    def p(self, i, j, k=0.0):
        return (self.ox + i - j, self.oy + (i + j) / 2 - k)

    def left(self, j):
        return lambda u, w: self.p(u, j, w)

    def right(self, i):
        return lambda u, w: self.p(i, -u, w)

    def top(self, k):
        return lambda u, v: self.p(u, v, k)

    def screen(self, x0, y0):
        return lambda u, w: (x0 + u, y0 - w)

    def draw(self, segs, fn, fill="none", stroke=None, sw=None, opacity=None):
        self.sc.path(to_d(segs, fn), fill=fill, stroke=stroke, sw=sw, opacity=opacity)

    def box(self, i0, i1, j0, j1, k0, k1, color, r=6, stroke=True, sw=None, faces=None):
        sc = self.sc
        sh = sc.shades(color) if faces is None else faces
        p = self.p
        outline = [p(i0, j0, k1), p(i1, j0, k1), p(i1, j0, k0), p(i1, j1, k0), p(i0, j1, k0), p(i0, j1, k1)]
        top = [p(i0, j0, k1), p(i1, j0, k1), p(i1, j1, k1), p(i0, j1, k1)]
        right = [p(i1, j0, k1), p(i1, j1, k1), p(i1, j1, k0), p(i1, j0, k0)]
        d_out = rounded_poly(outline, r) if r else poly(outline)
        cid = sc.nid("c")
        sc.defs.append(f'<clipPath id="{cid}"><path d="{d_out}"/></clipPath>')
        sc.path(d_out, fill=sh["base"])
        sc.add(f'<g clip-path="url(#{cid})">')
        sc.path(poly(top), fill=sh["top"])
        sc.path(poly(right), fill=sh["right"])
        sc.add("</g>")
        if stroke:
            sc.path(d_out, stroke=sc.t["ink"], sw=sw)
        return sh

    def ellipse_d(self, cx, cy, rx, ry):
        return to_d(local_circle(cx, cy, rx, ry), lambda a, b: (a, b))

    def cylinder(self, i, j, rx, k0, k1, color, bands=(), top_fill=None, sw=None):
        sc = self.sc
        sh = sc.shades(color)
        ry = rx / 2
        x, yb = self.p(i, j, k0)
        _, yt = self.p(i, j, k1)
        a, b = rx * K, ry * K
        body = (f"M{fmt(x - rx)} {fmt(yt)}L{fmt(x - rx)} {fmt(yb)}"
                f"C{fmt(x - rx)} {fmt(yb + b)} {fmt(x - a)} {fmt(yb + ry)} {fmt(x)} {fmt(yb + ry)}"
                f"C{fmt(x + a)} {fmt(yb + ry)} {fmt(x + rx)} {fmt(yb + b)} {fmt(x + rx)} {fmt(yb)}"
                f"L{fmt(x + rx)} {fmt(yt)}Z")
        cid = sc.nid("c")
        sc.defs.append(f'<clipPath id="{cid}"><path d="{body}"/></clipPath>')
        sc.path(body, fill=sh["base"])
        sc.add(f'<g clip-path="url(#{cid})">')
        sc.path(f"M{fmt(x)} {fmt(yt - 40)}L{fmt(x + rx + 4)} {fmt(yt - 40)}L{fmt(x + rx + 4)} {fmt(yb + ry + 4)}L{fmt(x)} {fmt(yb + ry + 4)}Z",
                fill=sh["c"], opacity=0.32)
        sc.add("</g>")
        sc.path(body, stroke=sc.t["ink"], sw=sw)
        for kb in bands:
            _, yy = self.p(i, j, kb)
            sc.path(f"M{fmt(x - rx)} {fmt(yy)}C{fmt(x - rx)} {fmt(yy + b)} {fmt(x - a)} {fmt(yy + ry)} {fmt(x)} {fmt(yy + ry)}"
                    f"C{fmt(x + a)} {fmt(yy + ry)} {fmt(x + rx)} {fmt(yy + b)} {fmt(x + rx)} {fmt(yy)}",
                    stroke=sc.t["ink"], sw=1.6)
        sc.path(self.ellipse_d(x, yt, rx, ry), fill=top_fill or sh["soft"], stroke=sc.t["ink"], sw=sw)
        return (x, yt, rx, ry, sh)

    def slab_diamond(self, cx, cy, half, fill, r=14, sw=None):
        pts = [(cx, cy - half / 2), (cx + half, cy), (cx, cy + half / 2), (cx - half, cy)]
        self.sc.path(rounded_poly(pts, r), fill=fill, stroke=self.sc.t["ink"], sw=sw)

    def extrude(self, segs, fn_front, fn_back, color, steps=6, front_fill=None):
        sc = self.sc
        sh = sc.shades(color)
        self.draw(segs, fn_back, fill=sh["right"], stroke=sc.t["ink"])
        for s in range(1, steps):
            t = s / steps

            def fn(u, w, t=t):
                bx, by = fn_back(u, w)
                fx, fy = fn_front(u, w)
                return (bx + (fx - bx) * t, by + (fy - by) * t)
            self.draw(segs, fn, fill=sh["right"])
        self.draw(segs, fn_front, fill=front_fill or sh["base"], stroke=sc.t["ink"])
        return sh


def pill(sc, x, y, text, tone="neutral", icon_space=False):
    t = sc.t
    w = len(text) * 6.6 + 22
    h = 22
    fill = {"neutral": t["surface"], "success": mix(t["green"], t["surface"], 0.45),
            "danger": mix(t["red"], t["surface"], 0.28)}[tone]
    left, top = x - w / 2, y - h / 2
    sc.add(f'<rect x="{fmt(left)}" y="{fmt(top + 2.5)}" width="{fmt(w)}" height="{h}" rx="11" fill="{t["ink"]}"/>')
    sc.add(f'<rect x="{fmt(left)}" y="{fmt(top)}" width="{fmt(w)}" height="{h}" rx="11" fill="{fill}" stroke="{t["ink"]}" stroke-width="1.6"/>')
    sc.text(x, y + 0.5, text, size=11, weight=500)


def ground_zone(iso, i, j, half=90):
    sc = iso.sc
    x, y = iso.p(i, j, 0)
    pts = [(x, y - half / 2), (x + half, y), (x, y + half / 2), (x - half, y)]
    sc.path(rounded_poly(pts, 10), fill=mix(sc.t["green"], sc.t["paper"], 0.22), stroke=sc.t["green"], sw=2.5)
