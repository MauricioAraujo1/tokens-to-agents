import type { ProjectContent } from "../../types/content";

const project: ProjectContent = {
  id: "03",
  title: "Multi-Agent System",
  goal: "Você vai construir um sistema em que um agente supervisor recebe um pedido, divide o trabalho e delega cada parte a três especialistas: pesquisador, revisor e redator. Os especialistas usam um conjunto compartilhado de ferramentas, cada um com permissão só para as que precisa, e as ferramentas de leitura também saem como servidor MCP. No fim, você vai saber explicar quando vale ter vários agentes, como o supervisor coordena e como limites e permissões deixam o sistema previsível.",
  steps: [
    {
      title: "Prepare as ferramentas compartilhadas",
      body: "Em tools.py ficam três funções, search_docs, read_doc e save_report, cada uma com schema estrito (strict: true e additionalProperties: false). read_doc só aceita arquivos .md da pasta docs, e save_report limpa o título antes de usá-lo como nome de arquivo: quem escolhe os argumentos é o modelo, então o código valida tudo. Como saber que deu certo: read_doc('../.env') levanta erro em vez de ler o arquivo.",
    },
    {
      title: "Escreva o loop de agente",
      body: "run_loop chama o modelo, executa cada tool_use, devolve todos os tool_result numa única mensagem user e para quando o modelo responde sem pedir ferramenta. Chamadas paralelas rodam num pool de até 4 threads, e um erro de ferramenta volta como tool_result com is_error, para o modelo poder corrigir o rumo. O limite de 8 iterações garante que nenhum agente gira para sempre. Como saber que deu certo: o pesquisador sozinho responde uma pergunta simples em 2 ou 3 iterações.",
    },
    {
      title: "Defina os especialistas",
      body: "Cada especialista tem um system com uma responsabilidade só e uma tupla de ferramentas permitidas: o pesquisador busca e lê, o revisor só lê, o redator só salva. O redator nem recebe read_doc na lista de ferramentas, e run_tool ainda recusa com PermissionError qualquer ferramenta fora da tupla: é o menor privilégio aplicado no código, não só no prompt. Como saber que deu certo: run_tool('read_doc', {'name': 'x.md'}, allowed=('save_report',)) levanta PermissionError.",
    },
    {
      title: "Crie o supervisor",
      body: "O supervisor tem uma ferramenta só, delegate, com o nome do especialista num enum e a subtarefa em texto. Como o especialista não vê a conversa do supervisor, a subtarefa precisa ser completa: objetivo, contexto e formato esperado. O supervisor roda com effort medium, porque decide o plano, e os especialistas com low, porque executam tarefas estreitas. Como saber que deu certo: num pedido com dois temas independentes, o supervisor chama dois pesquisadores em paralelo no mesmo turno.",
    },
    {
      title: "Exponha as ferramentas por MCP",
      body: "mcp_server.py publica search_docs e read_doc com o FastMCP do SDK oficial de MCP para Python, sem save_report, porque um cliente externo não deve escrever arquivos. Qualquer host compatível, como o Claude Code ou o Claude Desktop, passa a usar a mesma base de documentos sem copiar código. Como saber que deu certo: o MCP Inspector lista as duas ferramentas, e uma chamada de search_docs devolve nomes de arquivo.",
    },
    {
      title: "Registre o rastro",
      body: "Cada delegação grava no log o especialista, o tempo e o tamanho da resposta; em produção, troque o log por spans de tracing com o mesmo id de pedido. Com o rastro, dá para ver qual especialista gasta mais tempo e onde o plano do supervisor deu voltas. Como saber que deu certo: para cada pedido, o log mostra a sequência de delegações na ordem em que aconteceram.",
    },
    {
      title: "Avalie o sistema inteiro",
      body: "Monte 10 pedidos com resposta conhecida nos documentos e rode cada um 3 vezes, porque agentes variam de uma execução para outra. Meça a taxa de relatórios corretos, as afirmações com fonte, o número de delegações e os tokens por pedido, e compare com um agente único que tem todas as ferramentas. Como saber que deu certo: o supervisor só fica se ganhar em qualidade o bastante para pagar os tokens a mais.",
    },
  ],
  concepts: ["12-05", "12-10", "12-11", "12-13", "12-18", "13-05", "14-08"],
  code: [
    {
      path: "agents/tools.py",
      source: `import json
from pathlib import Path

DOCS_DIR = Path("docs").resolve()
REPORTS_DIR = Path("reports").resolve()
MAX_CHARS = 6_000


def search_docs(query: str) -> str:
    terms = {term for term in query.lower().split() if len(term) > 2}
    hits = []
    for path in sorted(DOCS_DIR.glob("*.md")):
        text = path.read_text(encoding="utf-8").lower()
        score = sum(text.count(term) for term in terms)
        if score:
            hits.append((score, path.name))
    return json.dumps([name for _, name in sorted(hits, reverse=True)[:5]])


def read_doc(name: str) -> str:
    path = (DOCS_DIR / name).resolve()
    if path.parent != DOCS_DIR or path.suffix != ".md" or not path.is_file():
        raise ValueError(f"documento inválido: {name}")
    return path.read_text(encoding="utf-8")[:MAX_CHARS]


def save_report(title: str, body: str) -> str:
    slug = "".join(char if char.isalnum() else "-" for char in title.lower()).strip("-")[:60]
    REPORTS_DIR.mkdir(exist_ok=True)
    path = REPORTS_DIR / f"{slug or 'relatorio'}.md"
    path.write_text(f"# {title}\\n\\n{body}\\n", encoding="utf-8")
    return f"relatório salvo em {path.name}"


def object_schema(properties: dict) -> dict:
    return {
        "type": "object",
        "properties": properties,
        "required": list(properties),
        "additionalProperties": False,
    }


TOOL_SPECS = {
    "search_docs": {
        "name": "search_docs",
        "description": "Busca documentos internos por palavras-chave e devolve até 5 nomes de arquivo, do mais relevante ao menos relevante.",
        "strict": True,
        "input_schema": object_schema({"query": {"type": "string"}}),
    },
    "read_doc": {
        "name": "read_doc",
        "description": "Lê um documento interno pelo nome de arquivo devolvido por search_docs.",
        "strict": True,
        "input_schema": object_schema({"name": {"type": "string"}}),
    },
    "save_report": {
        "name": "save_report",
        "description": "Salva o relatório final em Markdown. Use uma vez, no fim do trabalho.",
        "strict": True,
        "input_schema": object_schema({"title": {"type": "string"}, "body": {"type": "string"}}),
    },
}
HANDLERS = {"search_docs": search_docs, "read_doc": read_doc, "save_report": save_report}


def run_tool(name: str, args: dict, allowed: tuple[str, ...]) -> str:
    if name not in allowed:
        raise PermissionError(f"ferramenta {name} não permitida para este agente")
    return HANDLERS[name](**args)`,
    },
    {
      path: "agents/loop.py",
      source: `from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor

import anthropic
from anthropic.types import MessageParam, ToolParam, ToolResultBlockParam, ToolUseBlock

MODEL = "claude-opus-5-5"
MAX_ITERATIONS = 8
MAX_PARALLEL_TOOLS = 4

Execute = Callable[[str, dict], str]


def tool_result(call: ToolUseBlock, execute: Execute) -> ToolResultBlockParam:
    try:
        return {"type": "tool_result", "tool_use_id": call.id, "content": execute(call.name, call.input)}
    except Exception as error:
        return {"type": "tool_result", "tool_use_id": call.id, "content": str(error), "is_error": True}


def run_loop(
    client: anthropic.Anthropic,
    system: str,
    task: str,
    tools: list[ToolParam],
    execute: Execute,
    effort: str = "low",
) -> str:
    messages: list[MessageParam] = [{"role": "user", "content": task}]
    for _ in range(MAX_ITERATIONS):
        response = client.beta.messages.create(
            model=MODEL,
            max_tokens=16_000,
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
            system=system,
            tools=tools,
            output_config={"effort": effort},
            messages=messages,
        )
        if response.stop_reason == "refusal":
            raise RuntimeError("o modelo recusou a tarefa")
        messages.append({"role": "assistant", "content": response.content})

        calls = [block for block in response.content if block.type == "tool_use"]
        if response.stop_reason != "tool_use" or not calls:
            return "".join(block.text for block in response.content if block.type == "text")

        with ThreadPoolExecutor(max_workers=MAX_PARALLEL_TOOLS) as pool:
            results = list(pool.map(lambda call: tool_result(call, execute), calls))
        messages.append({"role": "user", "content": results})
    raise RuntimeError(f"limite de {MAX_ITERATIONS} iterações atingido")`,
    },
    {
      path: "agents/supervisor.py",
      source: `import logging
import sys
import time
from dataclasses import dataclass

import anthropic

from agents.loop import run_loop
from agents.tools import TOOL_SPECS, run_tool

log = logging.getLogger("agents")


@dataclass(frozen=True)
class Specialist:
    system: str
    tools: tuple[str, ...]


SPECIALISTS = {
    "pesquisador": Specialist(
        system="Você é o pesquisador. Busque e leia os documentos internos e devolva os fatos relevantes, cada um com o arquivo de origem. Não escreva o relatório.",
        tools=("search_docs", "read_doc"),
    ),
    "revisor": Specialist(
        system="Você é o revisor. Para cada afirmação recebida, leia o documento citado e diga se ela está sustentada, corrigindo o que não estiver.",
        tools=("read_doc",),
    ),
    "redator": Specialist(
        system="Você é o redator. Escreva um relatório curto só com os fatos recebidos, mantenha as fontes e salve com save_report.",
        tools=("save_report",),
    ),
}

DELEGATE_TOOL = {
    "name": "delegate",
    "description": "Envia uma subtarefa a um especialista e devolve a resposta dele. O especialista não vê esta conversa.",
    "strict": True,
    "input_schema": {
        "type": "object",
        "properties": {
            "agent": {"type": "string", "enum": list(SPECIALISTS)},
            "task": {"type": "string", "description": "Subtarefa completa: objetivo, contexto e formato esperado."},
        },
        "required": ["agent", "task"],
        "additionalProperties": False,
    },
}

SUPERVISOR_SYSTEM = (
    "Você coordena especialistas e não lê documentos diretamente. "
    "Divida o pedido, delegue a pesquisa ao pesquisador, a checagem ao revisor e o texto final ao redator. "
    "Quando duas partes forem independentes, delegue as duas no mesmo turno. "
    "No fim, diga em poucas linhas o que foi feito e onde o relatório foi salvo."
)


def run_specialist(client: anthropic.Anthropic, name: str, task: str) -> str:
    specialist = SPECIALISTS[name]
    tools = [TOOL_SPECS[tool] for tool in specialist.tools]
    started = time.perf_counter()
    result = run_loop(
        client,
        specialist.system,
        task,
        tools,
        lambda tool, args: run_tool(tool, args, allowed=specialist.tools),
        effort="low",
    )
    log.info("delegate agent=%s seconds=%.1f chars=%d", name, time.perf_counter() - started, len(result))
    return result


def supervise(client: anthropic.Anthropic, request: str) -> str:
    def execute(tool: str, args: dict) -> str:
        if tool != "delegate":
            raise PermissionError(f"o supervisor só delega; recebeu {tool}")
        return run_specialist(client, args["agent"], args["task"])

    return run_loop(client, SUPERVISOR_SYSTEM, request, [DELEGATE_TOOL], execute, effort="medium")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
    print(supervise(anthropic.Anthropic(), " ".join(sys.argv[1:])))`,
    },
    {
      path: "agents/mcp_server.py",
      source: `from mcp.server.fastmcp import FastMCP

from agents import tools

mcp = FastMCP("docs-internos")


@mcp.tool()
def search_docs(query: str) -> str:
    """Busca documentos internos por palavras-chave e devolve até 5 nomes de arquivo."""
    return tools.search_docs(query)


@mcp.tool()
def read_doc(name: str) -> str:
    """Lê um documento interno pelo nome de arquivo devolvido por search_docs."""
    return tools.read_doc(name)


if __name__ == "__main__":
    mcp.run()`,
    },
  ],
};

export default project;
