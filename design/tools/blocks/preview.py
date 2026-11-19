import os
import re
import sys
import tempfile

from blocks import BLOCKS, render
from compose import compose
from figcraft import render_file
from iso import THEMES

COLUMNS = 6
CELL_WIDTH, CELL_HEIGHT, GAP = 232, 180, 12


def sheet(theme, only=None):
    t = THEMES[theme]
    parts, defs = [], []
    count = 0
    for items in BLOCKS.values():
        for _, _, _, fn, oy, label in items:
            if only and fn.__name__ not in only:
                continue
            svg = render(fn, theme, oy, label)
            svg = re.sub(r'(id="|url\(#)([a-z])(\d+)', lambda m: f"{m.group(1)}s{count}{m.group(2)}{m.group(3)}", svg)
            inner = re.search(r"<svg[^>]*>(.*)</svg>", svg, re.S).group(1)
            defs.append(re.search(r"<defs>(.*?)</defs>", inner, re.S).group(1))
            inner = re.sub(r"<defs>.*?</defs>", "", inner, flags=re.S)
            x = (count % COLUMNS) * (CELL_WIDTH + GAP)
            y = (count // COLUMNS) * (CELL_HEIGHT + GAP)
            parts.append(f'<g transform="translate({x} {y})"><rect width="{CELL_WIDTH}" height="{CELL_HEIGHT}" rx="6" '
                         f'fill="{t["paper"]}" stroke="{t["line"]}"/>{inner}</g>')
            count += 1
    width = COLUMNS * (CELL_WIDTH + GAP)
    height = ((count + COLUMNS - 1) // COLUMNS) * (CELL_HEIGHT + GAP)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">'
            f'<defs>{"".join(defs)}</defs><rect width="{width}" height="{height}" fill="{t["surface"]}"/>{"".join(parts)}</svg>')


def main():
    only = sys.argv[1].split(",") if len(sys.argv) > 1 and sys.argv[1] else None
    out_dir = sys.argv[2] if len(sys.argv) > 2 else tempfile.mkdtemp(prefix="blocks-preview-")
    os.makedirs(out_dir, exist_ok=True)
    for theme in THEMES:
        for name, svg in ((f"sheet-{theme}", sheet(theme, only)), (f"composicao-{theme}", compose(theme))):
            path = os.path.join(out_dir, f"{name}.svg")
            with open(path, "w", encoding="utf-8") as fh:
                fh.write(svg)
            render_file(path, path[:-4] + ".png", scale=1.5)
            print(path[:-4] + ".png")


if __name__ == "__main__":
    main()
