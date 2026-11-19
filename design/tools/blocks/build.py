import base64
import os
import shutil
import sys
import tempfile

from blocks import BLOCKS, COLOR, agente, banco_relacional, celular, llm, render
from compose import compose
from figcraft import export_frames, info, run
from iso import THEMES

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_FILE = os.path.join(HERE, "..", "..", "tokens-to-agents.figcraft")
PREVIEWS_DIR = os.path.join(HERE, "..", "..", "previews")
PREVIEW_SCALE = 0.5
PREVIEW_FILES = {"Claro": "13-blocos-exploracao-claro.png", "Escuro": "14-blocos-exploracao-escuro.png"}

PAGE_NAME = "05 · Blocos · Exploração"
SOURCE_PAGE = "04 · Blocos do diagrama"
THEME_FRAMES = {"claro": ("Blocos · Exploração · Claro", 0), "escuro": ("Blocos · Exploração · Escuro", 1540)}
THEME_COLLECTION, DARK_MODE = "Theme", "Dark"
FONT = "Geist Mono"
FRAME_WIDTH, CARD_WIDTH, SCENE_HEIGHT, COMPOSITION_HEIGHT = 1440, 256, 180, 362

V_PAPER, V_SURFACE, V_INK, V_MUTED, V_SUBTLE, V_LINE = (f"VariableID:{n}" for n in (1, 3, 5, 6, 7, 9))
INK_PRIMARY = {"claro": THEMES["claro"]["ink"], "escuro": "#F3EDE1"}

TITLE = "Tokens to Agents · Blocos · Exploração"
SUBTITLE = ("Exploração de blocos novos e redesenhados: cada peça com uma silhueta que conta o que ela faz. "
            "Nada desta página está no código ainda.")

SECTIONS = [
    ("rag", "BLOCOS DO RAG · REDESENHADOS",
     "Os mesmos 9 blocos da aula de RAG, agora cada um com silhueta própria. A cor continua vindo da categoria; "
     "a forma conta o que o bloco faz."),
    ("dados", "DADOS",
     "Cada tipo de banco tem uma forma: tabelas ligadas (relacional), documentos JSON (NoSQL), gaveteiro (chave-valor), "
     "cilindro com vetores (vetorial) e pasta (arquivos)."),
    ("dispositivos", "DISPOSITIVOS E INFRAESTRUTURA",
     "Clientes e serviços para mostrar uma aplicação sendo consumida: celular, notebook, servidor, nuvem e fila."),
    ("agentes", "AGENTES E IA",
     "Peças para as aulas de agentes, tool calling, memória, guardrails, avaliação e tokenização."),
    ("ativo", "ESTADO ATIVO",
     "Os blocos novos seguem a regra do passo atual: zona verde no chão, brilho na cor da categoria, contorno 2.8px "
     "e pílula \"passo N\"."),
    ("composicao", "EXEMPLO DE COMPOSIÇÃO",
     "Um app no celular conversando com um agente que chama uma ferramenta e consulta um banco relacional "
     "(agente no passo ativo)."),
    ("regras", "REGRAS", None),
]

ACTIVE = [("LLM", "robô · Geração", llm, 150), ("Celular", "dispositivo · Cliente", celular, 152),
          ("Banco relacional", "tabelas · Dados", banco_relacional, 136),
          ("Agente", "robô com ferramenta · Agentes", agente, 156)]

RULES = [
    "▪ Mesma base da página 04: grade isométrica 2:1 (célula 30 × 15), contorno ink 2px, corpo com 62% da cor sobre "
    "surface, topo com 42% de surface, lateral direita com 45% da cor e sombra 0 9px 7px a 20%.",
    "▪ Cada bloco tem uma silhueta própria que diz o que ele faz. A cor continua marcando a categoria; dispositivos e "
    "infraestrutura usam o cinza do módulo 00.",
    "▪ Em aberto: os bancos (relacional, NoSQL, chave-valor) reaproveitam as cores das categorias atuais. Uma categoria "
    "própria para dados, com token novo, é uma opção a decidir antes do código.",
    "▪ O nome sai de dentro do bloco e vai para a pílula, como já acontece com o usuário e o banco vetorial. O desenho "
    "fica livre para mostrar o conceito.",
    "▪ Detalhes nas faces (telas, gavetas, rótulos, tabelas) seguem o plano da face em que estão, como se estivessem "
    "impressos nela.",
    "▪ Estado ativo igual ao atual: zona verde 180 × 90 no chão, brilho na cor da categoria, contorno 2.8px e pílula "
    "\"passo N\".",
    "▪ Nada desta página está no código ainda. Depois da escolha, cada desenho vira uma forma em "
    "src/components/diagrams com os tokens do tema. Os desenhos saem de design/tools/blocks.",
]


def token(fn):
    color = COLOR[fn]
    return "--module-00" if color == "gray" else f"--diagram-{color}"


def text(parent, chars, size, style, theme, variable, fill_width=False, spacing=None):
    color = {V_INK: INK_PRIMARY[theme], V_MUTED: THEMES[theme]["muted"], V_SUBTLE: THEMES[theme]["subtle"]}[variable]
    props = {"fontFamily": FONT, "fontStyle": style, "fontSize": size, "fill": color}
    if spacing is not None:
        props["letterSpacing"] = spacing
    if fill_width:
        props["sizingH"] = "fill"
        props["textAutoResize"] = "height"
    return {"command": "node.create",
            "params": {"type": "text", "parent": parent, "text": chars, "select": False, "props": props}}


def frame(parent, name, props, x=None, y=None, width=None, height=None):
    params = {"type": "frame", "name": name, "select": False, "props": props}
    for key, value in (("parent", parent), ("x", x), ("y", y), ("width", width), ("height", height)):
        if value is not None:
            params[key] = value
    return {"command": "node.create", "params": params}


def scene_props(theme, padding=0):
    t = THEMES[theme]
    return {"layout": "horizontal", "mainAlign": "center", "crossAlign": "center", "padding": padding,
            "sizingH": "fill", "sizingV": "fixed", "cornerRadius": 6, "fill": t["paper"], "stroke": t["line"],
            "strokeWeight": 1, "strokeAlign": "inside", "clip": True}


def card_props(theme):
    t = THEMES[theme]
    return {"layout": "vertical", "gap": 8, "padding": [12, 12, 14, 12], "sizingH": "fixed", "sizingV": "hug",
            "crossAlign": "min", "cornerRadius": 8, "fill": t["surface"], "stroke": t["line"], "strokeWeight": 1,
            "strokeAlign": "inside", "clip": True}


def bind(node_id, field, variable):
    return {"command": "variable.bind", "params": {"ids": [node_id], "field": field, "variable": variable}}


def child(node, name):
    return next(c for c in node.get("children", []) if c["name"] == name)


def page_counts(source):
    return {page["name"]: page["nodes"] for page in info(source)["pages"] if page["name"] != PAGE_NAME}


def source_headers(work):
    page = next(p for p in info(work)["pages"] if p["name"] == SOURCE_PAGE)
    frames = run(work, [{"command": "node.get", "params": {"id": f["id"]}} for f in page["frames"]])
    by_theme = {}
    for node in frames:
        theme = "escuro" if node["name"].endswith("Escuro") else "claro"
        by_theme[theme] = child(node, "Header")["id"]
    return by_theme


def reset_page(work):
    pages = run(work, [{"command": "page.list", "params": {}}])[0]
    existing = [p for p in pages if p["name"] == PAGE_NAME]
    if not existing:
        return
    other = next(p for p in pages if p["name"] != PAGE_NAME)
    run(work, [{"command": "page.select", "params": {"id": other["id"]}}] +
        [{"command": "page.delete", "params": {"id": p["id"]}} for p in existing])


def card_specs():
    specs = []
    for theme in THEMES:
        for key, items in BLOCKS.items():
            for name, kind, note, fn, oy, label in items:
                specs.append((theme, key, name, kind, f"{note} · {token(fn)}", render(fn, theme, oy, label)))
        for name, kind, fn, oy in ACTIVE:
            specs.append((theme, "ativo", name, kind, f"ativo · zona verde + brilho {token(fn)}",
                          render(fn, theme, oy, "", active=True)))
    return specs


def build(work):
    reset_page(work)
    headers = source_headers(work)
    themes = list(THEMES)
    commands = [{"command": "page.add", "params": {"name": PAGE_NAME}}]
    for theme in themes:
        name, x = THEME_FRAMES[theme]
        commands.append(frame(None, name, {"layout": "vertical", "padding": [40, 48, 56, 48], "gap": 28, "sizingV": "hug",
                                           "crossAlign": "min", "fill": THEMES[theme]["paper"]},
                              x=x, y=0, width=FRAME_WIDTH, height=200))
    for theme in themes:
        commands.append({"command": "edit.duplicate", "params": {"ids": [headers[theme]], "dx": 0, "dy": 0}})
    result = run(work, commands)
    page = result[0]["id"]
    root = {theme: result[1 + n]["id"] for n, theme in enumerate(themes)}
    header = {theme: result[1 + len(themes) + n]["ids"][0] for n, theme in enumerate(themes)}

    commands, keys = [], []
    for theme in themes:
        commands.append({"command": "node.reparent", "params": {"ids": [header[theme]], "parent": root[theme]}})
        keys.append(None)
        for key, title, _ in SECTIONS:
            commands.append(frame(root[theme], title, {"layout": "vertical", "gap": 8 if key == "regras" else 10,
                                                       "padding": 0, "sizingH": "fill", "sizingV": "hug",
                                                       "crossAlign": "min", "fill": "none"}))
            keys.append((theme, key))
        commands.append(bind(root[theme], "fill", V_PAPER))
        keys.append(None)
    commands.append({"command": "variable.setMode",
                     "params": {"ids": [root["escuro"]], "collection": THEME_COLLECTION, "mode": DARK_MODE}})
    keys.append(None)
    section = {key: r["id"] for key, r in zip(keys, run(work, commands)) if key}

    commands, keys = [], []
    for theme in themes:
        titles = child(run(work, [{"command": "node.get", "params": {"id": header[theme]}}])[0], "Titles")
        title_id, subtitle_id = (c["id"] for c in run(work, [{"command": "node.get", "params": {"id": titles["id"]}}])[0]["children"])
        commands += [{"command": "node.set", "params": {"ids": [title_id], "characters": TITLE}},
                     {"command": "node.set", "params": {"ids": [subtitle_id], "characters": SUBTITLE}},
                     {"command": "node.reorder", "params": {"id": header[theme], "index": 0}}]
        keys += [None, None, None]
        for key, title, description in SECTIONS:
            parent = section[(theme, key)]
            commands.append(text(parent, title, 11, "SemiBold", theme, V_INK, spacing=1.2))
            keys.append(("text", V_INK))
            if description:
                commands.append(text(parent, description, 11, "Regular", theme, V_MUTED, fill_width=True))
                keys.append(("text", V_MUTED))
            if key == "regras":
                for rule in RULES:
                    commands.append(text(parent, rule, 12, "Regular", theme, V_INK, fill_width=True))
                    keys.append(("text", V_INK))
            elif key == "composicao":
                commands.append(frame(parent, "Cena", scene_props(theme, padding=16), height=COMPOSITION_HEIGHT))
                keys.append(("composition", theme))
            else:
                commands.append(frame(parent, "Grid", {"layout": "horizontal", "wrap": True, "gap": 14, "crossGap": 14,
                                                       "sizingH": "fill", "sizingV": "hug", "fill": "none"}))
                keys.append(("grid", theme, key))
    grid, composition, binds = {}, {}, []
    for key, r in zip(keys, run(work, commands)):
        if not key:
            continue
        if key[0] == "text":
            binds.append(bind(r["id"], "fill", key[1]))
        elif key[0] == "grid":
            grid[(key[1], key[2])] = r["id"]
        else:
            composition[key[1]] = r["id"]
            binds += [bind(r["id"], "fill", V_PAPER), bind(r["id"], "stroke", V_LINE)]

    specs = card_specs()
    commands = [frame(grid[(theme, key)], f"Bloco/{name}", card_props(theme), width=CARD_WIDTH, height=280)
                for theme, key, name, *_ in specs]
    cards = [r["id"] for r in run(work, commands + binds)[:len(commands)]]
    binds = [bind(c, "fill", V_SURFACE) for c in cards] + [bind(c, "stroke", V_LINE) for c in cards]

    commands, keys = [], []
    for card, (theme, _, name, kind, note, _svg) in zip(cards, specs):
        commands.append(frame(card, "Cena", scene_props(theme), height=SCENE_HEIGHT))
        keys.append(None)
        for chars, size, style, variable in ((name, 13, "Bold", V_INK), (kind, 10.5, "Regular", V_MUTED),
                                             (note, 10.5, "Regular", V_SUBTLE)):
            commands.append(text(card, chars, size, style, theme, variable, fill_width=variable != V_INK))
            keys.append(variable)
    scenes, next_binds = [], []
    for variable, r in zip(keys, run(work, commands + binds)[:len(commands)]):
        if variable is None:
            scenes.append(r["id"])
            next_binds += [bind(r["id"], "fill", V_PAPER), bind(r["id"], "stroke", V_LINE)]
        else:
            next_binds.append(bind(r["id"], "fill", variable))

    imports, targets = [], []
    for scene, (theme, key, name, _, _, svg) in zip(scenes, specs):
        imports.append(import_svg(svg, name))
        targets.append((scene, f"{name} · {'ativo' if key == 'ativo' else 'padrão'}"))
    for theme in themes:
        imports.append(import_svg(compose(theme), "composicao"))
        targets.append((composition[theme], "Composição · celular → agente"))
    imported = run(work, imports + next_binds)[:len(imports)]
    commands = []
    for r, (parent, name) in zip(imported, targets):
        commands += [{"command": "node.reparent", "params": {"ids": [r["id"]], "parent": parent}},
                     {"command": "node.set", "params": {"ids": [r["id"]], "name": name}}]
    commands.append({"command": "page.select", "params": {"id": page}})
    run(work, commands)


def import_svg(svg, name):
    return {"command": "file.import",
            "params": {"data": base64.b64encode(svg.encode()).decode(), "name": f"{name}.svg", "x": 4000, "y": 0}}


def export_previews(source):
    out_dir = tempfile.mkdtemp(prefix="blocks-previews-")
    export_frames(source, out_dir, PAGE_NAME, PREVIEW_SCALE)
    for suffix, target in PREVIEW_FILES.items():
        shutil.copyfile(os.path.join(out_dir, f"Blocos · Exploração · {suffix}.png"), os.path.join(PREVIEWS_DIR, target))
        print("preview", target)
    shutil.rmtree(out_dir)


def main():
    source = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else DEFAULT_FILE)
    work_dir = tempfile.mkdtemp(prefix="blocks-build-")
    work = os.path.join(work_dir, os.path.basename(source))
    shutil.copyfile(source, work)
    before = page_counts(work)
    build(work)
    after = page_counts(work)
    if before != after:
        shutil.rmtree(work_dir)
        raise SystemExit(f"other pages changed, nothing written: {before} -> {after}")
    shutil.copyfile(work, source)
    shutil.rmtree(work_dir)
    for name, nodes in after.items():
        print(f"{name}: {nodes} nodes (unchanged)")
    export_previews(source)


if __name__ == "__main__":
    main()
