import type { ProjectContent } from "../../types/content";

const project: ProjectContent = {
  id: "01",
  title: "AI Chat Application",
  goal: "Você vai construir um chatbot de terminal em Python que conversa com o Claude pela API oficial, guarda o histórico e cabe sempre num orçamento de contexto. Cada resposta sai num formato estruturado e validado, pronto para uma interface usar. No fim, você vai saber explicar como os papéis system, user e assistant formam a conversa, por que o histórico precisa ser resumido e como um schema garante a forma da resposta.",
  steps: [
    {
      title: "Prepare o ambiente",
      body: "Crie um ambiente virtual com Python 3.11 ou mais novo e instale anthropic e pydantic. Exporte a chave na variável ANTHROPIC_API_KEY: o SDK lê a variável sozinho, e a chave nunca entra no código nem no Git. Como saber que deu certo: um client.messages.create com uma pergunta curta devolve texto e stop_reason igual a end_turn.",
    },
    {
      title: "Defina o contrato da resposta",
      body: "Em schema.py, a classe Reply descreve o que a interface espera: o texto, até 3 sugestões de continuação e um nível de confiança fechado num Literal. Passe a classe em output_format no client.messages.parse: a API restringe a geração ao schema e o SDK devolve um objeto já validado em parsed_output. Como saber que deu certo: 20 perguntas seguidas produzem 20 objetos Reply, sem nenhum json.loads no seu código.",
    },
    {
      title: "Monte os papéis da conversa",
      body: "O system fixa persona, tom e políticas e não muda durante a sessão. Cada turno acrescenta uma mensagem user e, depois da resposta, uma assistant, sempre no fim da lista: a API não guarda estado, então o histórico inteiro vai em toda chamada. Como saber que deu certo: diga seu nome no primeiro turno e pergunte por ele no terceiro; o assistente responde certo.",
    },
    {
      title: "Controle o tamanho do contexto",
      body: "Cada turno deixa o prompt maior, e custo e latência crescem junto. Conversation lê o usage da resposta e, quando o próximo prompt passaria do orçamento, pede ao modelo um resumo, zera o histórico e começa o turno seguinte com o resumo mais a nova mensagem. Resumir em vez de apagar turnos do meio mantém o histórico só com acréscimos, o formato que a API e o cache esperam. Como saber que deu certo: com o orçamento em 3.000 tokens, uma conversa de 15 turnos resume pelo menos uma vez e ainda lembra o nome do usuário.",
    },
    {
      title: "Reaproveite o prefixo com cache",
      body: "O system vai com cache_control, então a partir da segunda chamada o prefixo igual é lido do cache, mais barato e mais rápido. O cache só existe quando o prefixo passa do mínimo de tokens do modelo e quando nada muda antes do ponto marcado: data, hora ou id de requisição no system zeram o ganho. Como saber que deu certo: depois que o system passa desse mínimo, cache_read_input_tokens fica acima de zero do segundo turno em diante.",
    },
    {
      title: "Trate as falhas",
      body: "O SDK já repete 2 vezes os erros 429, 5xx e de conexão, e o timeout de 60 segundos impede uma chamada presa para sempre. O app trata as exceções tipadas da mais específica para a mais geral, tira do histórico a mensagem que falhou e confere se stop_reason é refusal antes de ler a resposta. Como saber que deu certo: com uma chave inválida, o terminal mostra uma mensagem clara em vez de um traceback, e a conversa continua íntegra depois de um erro de rede.",
    },
    {
      title: "Avalie antes de chamar de pronto",
      body: "Escreva 10 conversas de teste com respostas conhecidas (frete, troca, prazo) e algumas perguntas fora das políticas. Rode todas e confira três números: respostas que citam a política certa, confiança baixa quando a política não cobre o caso e tokens de entrada por turno. Como saber que deu certo: os tokens de entrada sobem, caem no resumo e nunca passam do orçamento, em vez de crescer sem limite.",
    },
  ],
  concepts: ["04-05", "05-03", "05-08", "10-06", "12-08", "17-02"],
  code: [
    {
      path: "chat/schema.py",
      source: `from typing import Literal

from pydantic import BaseModel, Field

SYSTEM_PROMPT = """Você é o assistente da Livraria Aurora, uma loja online de livros.
Responda em português do Brasil, com frases curtas e tom cordial.
Use só as informações da conversa e as políticas abaixo. Se não souber, diga que não sabe.

Políticas:
- Frete grátis em pedidos acima de R$ 150.
- Trocas em até 30 dias, com o livro sem marcas de uso.
- Entrega em 3 a 7 dias úteis nas capitais.
"""


class Reply(BaseModel):
    answer: str = Field(description="Resposta ao usuário, em até 120 palavras.")
    follow_ups: list[str] = Field(
        description="De 0 a 3 perguntas curtas que o usuário pode fazer em seguida."
    )
    confidence: Literal["alta", "media", "baixa"] = Field(
        description="Alta só quando a resposta vem das políticas ou da conversa."
    )`,
    },
    {
      path: "chat/context.py",
      source: `import anthropic
from anthropic.types import MessageParam, TextBlockParam, Usage

MODEL = "claude-opus-5-5"
PROMPT_BUDGET_TOKENS = 30_000
SUMMARY_REQUEST = (
    "Resuma a conversa até aqui para continuar o atendimento depois. "
    "Guarde nomes, pedidos, números citados, decisões e perguntas em aberto. "
    "Responda só com o resumo, em até 200 palavras."
)


def prompt_tokens(usage: Usage) -> int:
    return (
        usage.input_tokens
        + (usage.cache_creation_input_tokens or 0)
        + (usage.cache_read_input_tokens or 0)
    )


class Conversation:
    def __init__(
        self,
        client: anthropic.Anthropic,
        system: list[TextBlockParam],
        budget: int = PROMPT_BUDGET_TOKENS,
    ) -> None:
        self.client = client
        self.system = system
        self.budget = budget
        self.messages: list[MessageParam] = []
        self.summary: str | None = None

    def add_user(self, text: str) -> None:
        if self.summary and not self.messages:
            text = f"Resumo da conversa anterior:\\n{self.summary}\\n\\nNova mensagem: {text}"
        self.messages.append({"role": "user", "content": text})

    def add_assistant(self, text: str) -> None:
        self.messages.append({"role": "assistant", "content": text})

    def compact_if_needed(self, usage: Usage) -> bool:
        if prompt_tokens(usage) + usage.output_tokens <= self.budget:
            return False
        response = self.client.beta.messages.create(
            model=MODEL,
            max_tokens=16_000,
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
            system=self.system,
            messages=[*self.messages, {"role": "user", "content": SUMMARY_REQUEST}],
        )
        self.summary = "".join(block.text for block in response.content if block.type == "text")
        self.messages = []
        return True`,
    },
    {
      path: "chat/app.py",
      source: `import anthropic

from chat.context import MODEL, Conversation, prompt_tokens
from chat.schema import SYSTEM_PROMPT, Reply

SYSTEM = [{"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}]

client = anthropic.Anthropic(timeout=60.0, max_retries=2)


def ask(conversation: Conversation, text: str) -> Reply | None:
    conversation.add_user(text)
    try:
        response = client.messages.parse(
            model=MODEL,
            max_tokens=16_000,
            system=conversation.system,
            messages=conversation.messages,
            output_format=Reply,
        )
    except anthropic.APIError:
        conversation.messages.pop()
        raise
    if response.stop_reason == "refusal" or response.parsed_output is None:
        conversation.messages.pop()
        return None

    reply = response.parsed_output
    conversation.add_assistant(reply.model_dump_json())
    usage = response.usage
    print(f"[tokens] prompt={prompt_tokens(usage)} cache={usage.cache_read_input_tokens or 0} saída={usage.output_tokens}")
    if conversation.compact_if_needed(usage):
        print("[contexto] histórico resumido para caber no orçamento")
    return reply


def main() -> None:
    conversation = Conversation(client, SYSTEM)
    print("Chat da Livraria Aurora. Digite 'sair' para encerrar.")
    while (text := input("você> ").strip()) not in {"", "sair"}:
        try:
            reply = ask(conversation, text)
        except anthropic.AuthenticationError:
            print("Chave inválida: confira a variável ANTHROPIC_API_KEY.")
            return
        except anthropic.RateLimitError:
            print("Limite de requisições atingido. Espere alguns segundos e repita.")
            continue
        except anthropic.APIStatusError as error:
            print(f"Erro {error.status_code} da API. Repita em instantes.")
            continue
        except anthropic.APIConnectionError:
            print("Sem conexão com a API. Confira a rede e repita.")
            continue
        if reply is None:
            print("assistente> Não posso ajudar com esse pedido.")
            continue
        print(f"assistente> {reply.answer} (confiança: {reply.confidence})")
        for question in reply.follow_ups:
            print(f"  · {question}")


if __name__ == "__main__":
    main()`,
    },
  ],
};

export default project;
