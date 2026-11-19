import json
import os
import subprocess
import tempfile

CLI = os.environ.get("FIGCRAFT_CLI", r"C:\Program Files\FigCraft\figcraft-cli.exe")


def render_file(source, target, scale=1.0, page=None):
    args = [CLI, "render", source, "-o", target, "--scale", str(scale)]
    if page:
        args += ["--page", page]
    subprocess.run(args, check=True, capture_output=True)


def export_frames(source, out_dir, page, scale):
    subprocess.run([CLI, "export", source, "-o", out_dir, "--format", "png", "--page", page, "--scale", str(scale)],
                   check=True, capture_output=True)


def info(source):
    result = subprocess.run([CLI, "info", source, "--json"], check=True, capture_output=True, text=True, encoding="utf-8")
    return json.loads(result.stdout)


def run(source, commands):
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as fh:
        json.dump(commands, fh, ensure_ascii=False)
        script = fh.name
    try:
        result = subprocess.run([CLI, "run", script, "--in", source, "--out", source],
                                capture_output=True, text=True, encoding="utf-8")
    finally:
        os.remove(script)
    steps = [json.loads(line) for line in result.stdout.splitlines() if line.startswith("{")]
    failed = [step for step in steps if not step.get("ok")]
    if failed or len(steps) != len(commands):
        raise RuntimeError(f"figcraft run failed: {failed or result.stderr[-2000:]}")
    return [step["result"] for step in steps]
