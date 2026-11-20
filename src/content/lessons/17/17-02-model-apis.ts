import type { LessonContent } from "../../../types/content";

// APIs de modelos com as contas no arquivo. Os limites de taxa são DE EXEMPLO (cada conta e cada modelo têm os
// seus): o limite efetivo é o menor entre pedidos por minuto e tokens por minuto ÷ tokens por pedido. O backoff
// exponencial dobra a espera a cada tentativa até um teto; com "full jitter" (artigo da AWS Architecture),
// a espera é sorteada entre 0 e esse valor, então a espera média é a metade.

const fixed = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const percent = (value: number) => `${Math.round(value * 100)}%`;

// Passo 3: limites de exemplo e o tamanho de um pedido.
const RPM_LIMIT = 500;
const TPM_LIMIT = 200_000;
const INPUT_TOKENS = 1500;
const OUTPUT_TOKENS = 300;
const tokensPerRequest = INPUT_TOKENS + OUTPUT_TOKENS;
const rpmFromTokens = Math.floor(TPM_LIMIT / tokensPerRequest);
const effectiveRpm = Math.min(RPM_LIMIT, rpmFromTokens);
const bindingLimit = rpmFromTokens < RPM_LIMIT ? "tokens por minuto" : "pedidos por minuto";
const DEMAND_RPM = 180;
const rejectedShare = Math.max(0, DEMAND_RPM - effectiveRpm) / DEMAND_RPM;

// Passo 4: backoff exponencial com teto.
const BASE_S = 1;
const CAP_S = 32;
const ATTEMPTS = 6;
const waits = Array.from({ length: ATTEMPTS }, (_, attempt) => Math.min(CAP_S, BASE_S * 2 ** attempt));
const worstTotal = waits.reduce((sum, wait) => sum + wait, 0);
const meanWithJitter = worstTotal / 2;
const CLIENTS = 100;

const lesson: LessonContent = {
  id: "17-02",
  subtitle: "Usar um modelo como serviço: chave, pedido, cobrança por token, limites de taxa e como reagir a um 429 sem derrubar ninguém.",
  objectives: [
    "Descrever o caminho de uma chamada a uma API de modelo e o que volta nela",
    "Calcular o limite efetivo a partir de pedidos e tokens por minuto",
    "Tratar um 429 com backoff exponencial e jitter",
    "Reduzir a dependência de um provedor só",
  ],
  steps: [
    {
      id: "utility",
      shortTitle: "Na tomada",
      title: "Um modelo na tomada",
      tag: "context",
      body: [
        "Você não constrói uma usina para ligar a geladeira: liga na tomada e paga pelo que gastar. Uma [[API de modelo|model-api]] é a tomada dos LLMs. O provedor cuida das GPUs, do modelo, da escala e das atualizações; você manda um pedido HTTPS e paga por token de entrada e de saída.",
        "Cada pedido leva uma [[chave de API|api-key]] que identifica a sua conta e decide limites e cobrança. Ela mora no servidor, num cofre de segredos ou numa variável de ambiente, e nunca no código do app ou no repositório: quem tem a chave gasta em seu nome.",
      ],
      keyIdea: "API de modelo é capacidade de inferência alugada por token: zero GPU para operar, mas limites e preço de outra pessoa.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "api",
            piece: "block-diagram",
            blocks: [
              { id: "phone", kind: "phone", label: "app", col: 0, row: 0 },
              { id: "backend", kind: "server", label: "seu backend", col: 1, row: 0 },
              { id: "vault", kind: "guardrail", label: "cofre da chave", col: 1, row: 1 },
              { id: "provider", kind: "cloud", label: "provedor", col: 2, row: 0 },
              { id: "llm", kind: "llm", label: "modelo", col: 3, row: 0 },
            ],
            edges: [
              { from: "phone", to: "backend", label: "pergunta" },
              { from: "vault", to: "backend", label: "api key" },
              { from: "backend", to: "provider", label: "https + chave" },
              { from: "provider", to: "llm" },
            ],
            active: "provider",
          },
        ],
      },
      alt: "O app manda a pergunta ao seu backend, que lê a chave de um cofre e chama por HTTPS o provedor, em destaque, que executa o modelo.",
    },
    {
      id: "anatomy",
      shortTitle: "Anatomia",
      title: "O que vai e o que volta numa chamada",
      tag: "mechanism",
      body: [
        "O pedido leva o nome do modelo, as mensagens (system, user, assistant), o limite de tokens de saída e opções como temperatura e streaming. O provedor autentica a chave, confere os limites, põe o pedido na fila dele, gera e devolve a resposta, de uma vez ou em pedaços.",
        `A resposta traz um bloco de uso com os tokens de entrada e de saída do pedido. Guarde esse número em cada chamada: é a base da conta no fim do mês, do limite de taxa e da comparação com hospedar o próprio modelo. Um pedido de ${integer(INPUT_TOKENS)} tokens de prompt e ${OUTPUT_TOKENS} de resposta consome ${integer(tokensPerRequest)} tokens da sua cota.`,
      ],
      keyIdea: "Toda resposta diz quantos tokens custou: registre o uso por pedido desde o primeiro dia.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "anatomy",
            piece: "pipeline",
            stages: [
              { id: "build", label: "montar mensagens" },
              { id: "send", label: "POST + chave" },
              { id: "auth", label: "autenticar" },
              { id: "limit", label: "limite de taxa", color: "module-17" },
              { id: "generate", label: "gerar" },
              { id: "usage", label: "resposta + usage" },
            ],
            active: "limit",
            done: ["build", "send", "auth"],
            branch: { id: "429", label: "429", from: "limit", edgeLabel: "acima do limite", color: "danger" },
          },
        ],
      },
      alt: "Pipeline da chamada: montar mensagens, POST com a chave, autenticar, limite de taxa (em destaque), gerar e a resposta com o uso de tokens. Um ramo tracejado sai do limite para o erro 429.",
    },
    {
      id: "limits",
      shortTitle: "Limites",
      title: "Pedidos por minuto e tokens por minuto",
      tag: "mechanism",
      body: [
        `O provedor divide a capacidade entre todos os clientes com um [[limite de taxa|rate-limit]], em geral por pedidos por minuto (RPM) e tokens por minuto (TPM). Com limites de exemplo de ${integer(RPM_LIMIT)} RPM e ${integer(TPM_LIMIT)} TPM, e pedidos de ${integer(tokensPerRequest)} tokens, o TPM permite só ${rpmFromTokens} pedidos por minuto. O limite que manda é o de ${bindingLimit}: ${effectiveRpm} pedidos por minuto.`,
        `Se o app precisa de ${DEMAND_RPM} pedidos por minuto, ${percent(rejectedShare)} voltam com HTTP 429. As saídas: prompts menores, que aumentam o RPM efetivo; uma fila no seu backend que segura o excesso em vez de repassá-lo; a [[Batch API|batch-api]] para o que não tem pressa; ou pedir um limite maior ao provedor, que costuma subir com o histórico de gasto da conta.`,
      ],
      keyIdea: "O limite efetivo é o menor entre RPM e TPM ÷ tokens por pedido: prompts longos gastam a cota em tokens.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "limits-metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "rpm", label: "limite RPM", value: integer(RPM_LIMIT) },
              { id: "tpm", label: `TPM ÷ ${integer(tokensPerRequest)}`, value: integer(rpmFromTokens) },
              { id: "effective", label: "efetivo", value: `${effectiveRpm}/min`, color: "module-17" },
              { id: "rejected", label: `com ${DEMAND_RPM}/min`, value: `${percent(rejectedShare)} em 429`, color: "danger" },
            ],
            highlight: "effective",
          },
          {
            id: "limits-flow",
            piece: "client-server",
            nodes: [
              { id: "app", label: `${DEMAND_RPM} pedidos/min`, role: "client" },
              { id: "queue", label: "fila do backend", role: "queue", size: DEMAND_RPM - effectiveRpm },
              { id: "provider", label: "provedor", role: "model", utilization: 1 },
            ],
            messages: [
              { from: "app", to: "queue", label: "pedidos" },
              { from: "queue", to: "provider", label: `${effectiveRpm}/min` },
            ],
            active: 1,
          },
        ],
      },
      alt: `Limites de exemplo: ${integer(RPM_LIMIT)} RPM e ${integer(TPM_LIMIT)} TPM, que com ${integer(tokensPerRequest)} tokens por pedido dão ${effectiveRpm} pedidos por minuto. Com ${DEMAND_RPM} por minuto, ${percent(rejectedShare)} voltariam em 429; uma fila no backend segura o excesso.`,
    },
    {
      id: "backoff",
      shortTitle: "Backoff",
      title: "Recebeu 429: espere, e espere diferente dos outros",
      tag: "example",
      body: [
        `Repetir na hora piora tudo: o provedor já disse que você passou do limite. O [[retry|retry]] com [[backoff exponencial|exponential-backoff]] dobra a espera a cada tentativa: ${waits.map((wait) => `${wait} s`).join(", ")}, com teto de ${CAP_S} s. Somadas, as ${ATTEMPTS} esperas chegam a ${worstTotal} s no pior caso. Se o provedor mandar o cabeçalho retry-after, ele tem prioridade.`,
        `Agora imagine ${CLIENTS} instâncias recebendo 429 no mesmo segundo. Sem variação, todas voltam juntas em 1 s, depois juntas em 2 s, e batem no limite outra vez. O [[jitter|jitter]] sorteia a espera entre 0 e o valor da vez: as voltas se espalham, e a espera média cai para ${fixed(meanWithJitter)} s. Por fim, só repita o que pode ser repetido: erros 429 e 5xx, nunca um 400 de prompt inválido.`,
      ],
      keyIdea: "Backoff exponencial com jitter espalha as novas tentativas e evita que todos os clientes voltem juntos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "backoff",
            piece: "chart",
            kind: "bar",
            series: waits.map((wait, attempt) => ({ label: `tentativa ${attempt + 1}`, value: wait })),
            cutoff: { mode: "threshold", value: CAP_S, label: `teto ${CAP_S} s` },
            highlight: waits.length - 1,
            color: "module-17",
          },
        ],
      },
      alt: `Espera máxima antes de cada tentativa, em segundos, dobrando até o teto: ${waits.join(", ")}. Somam ${worstTotal} s no pior caso; com jitter, a média fica em ${fixed(meanWithJitter)} s.`,
    },
    {
      id: "lock-in",
      shortTitle: "Dependência",
      title: "Um provedor só é um ponto único de falha",
      tag: "tradeoff",
      body: [
        "A API é o caminho mais rápido para produção: nada de GPU, modelos de fronteira no primeiro dia e preço que cai com o tempo. O outro lado: o provedor muda limites, preços e versões de modelo no calendário dele, e uma indisponibilidade dele vira a sua.",
        "Duas defesas baratas. Primeiro, isolar a chamada atrás de uma interface sua ou de um gateway, de preferência no formato de API que vários provedores e servidores próprios aceitam, como o da OpenAI. Segundo, fixar a versão do modelo no pedido e só trocar depois de rodar o seu [[eval|eval]]: um alias que aponta para a versão mais nova pode mudar o comportamento do app sem nenhum deploy seu.",
      ],
      keyIdea: "Isole a chamada atrás de uma interface sua e fixe a versão do modelo: trocar de provedor vira configuração.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "providers",
            piece: "block-diagram",
            blocks: [
              { id: "backend", kind: "app", label: "backend", col: 0, row: 0 },
              { id: "gateway", kind: "server", label: "interface única", col: 1, row: 0 },
              { id: "a", kind: "cloud", label: "provedor a", col: 2.5, row: 0 },
              { id: "b", kind: "cloud", label: "provedor b", col: 2.5, row: 1 },
              { id: "eval", kind: "eval", label: "eval antes", col: 1, row: 1 },
            ],
            edges: [
              { from: "backend", to: "gateway" },
              { from: "gateway", to: "a", label: "modelo fixado" },
              { from: "gateway", to: "b", label: "troca por config", variant: "alternative" },
              { from: "eval", to: "gateway", label: "aprova versão" },
            ],
            active: "gateway",
          },
        ],
      },
      alt: "O backend chama uma interface única, em destaque, que fala com o provedor A numa versão fixada e pode trocar para o provedor B por configuração; um eval aprova cada versão antes da troca.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Usar a API como um profissional",
      tag: "summary",
      body: [
        "Chave no servidor, uso de tokens registrado por pedido, limite efetivo calculado pelo menor entre RPM e TPM, fila para segurar o excesso, backoff exponencial com jitter nos 429 e versão do modelo fixada atrás de uma interface sua.",
        "A API cobra por token para sempre. Quando o volume cresce, os dados não podem sair da empresa ou o modelo certo é aberto, entra a outra opção: hospedar o modelo você mesmo, assunto da próxima aula.",
      ],
      keyIdea: "Trate a API de modelo como qualquer dependência externa: limites medidos, falhas esperadas, versão fixada.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "checklist",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "key", label: "chave no servidor" },
              { id: "usage", label: "registrar usage" },
              { id: "limit", label: "limite efetivo", color: "module-17" },
              { id: "queue", label: "fila no backend" },
              { id: "backoff", label: "backoff + jitter", color: "module-17" },
              { id: "pin", label: "versão fixada" },
            ],
          },
        ],
      },
      alt: "Checklist em chips: chave no servidor, registrar o uso, limite efetivo, fila no backend, backoff com jitter e versão fixada.",
    },
  ],
  realWorldExample:
    "A documentação de limites da Anthropic descreve limites por pedidos por minuto e por tokens de entrada e de saída por minuto, aplicados com o algoritmo token bucket, e devolve o cabeçalho retry-after junto do erro 429. A OpenAI documenta limites em RPM e TPM por modelo e recomenda backoff exponencial aleatório para tratar os 429.",
  code: {
    language: "python",
    source: `import random
import time

from openai import OpenAI, RateLimitError

client = OpenAI(max_retries=0, timeout=30)

def ask(messages: list[dict], attempts: int = 6, base: float = 1.0, cap: float = 32.0) -> str:
    for attempt in range(attempts):
        try:
            response = client.chat.completions.create(model="gpt-4o-mini", messages=messages, max_tokens=300)
            print("tokens:", response.usage.prompt_tokens, response.usage.completion_tokens)
            return response.choices[0].message.content
        except RateLimitError:
            time.sleep(random.uniform(0, min(cap, base * 2**attempt)))
    raise RuntimeError("limite de taxa persistente")`,
    caption: "Chamada com o uso de tokens registrado e backoff exponencial com full jitter nos 429. A chave vem da variável de ambiente OPENAI_API_KEY.",
  },
  tradeOffs: {
    pros: [
      "Nenhuma GPU, driver ou motor de inferência para operar",
      "Modelos de fronteira e novas versões no dia do lançamento",
      "Custo zero com tráfego zero: paga só o que usa",
    ],
    cons: [
      "Limites de taxa e preços definidos pelo provedor",
      "Os dados saem da sua infraestrutura a cada pedido",
      "Mudanças de versão e indisponibilidades do provedor viram problemas seus",
    ],
    alternatives: [
      "Modelo próprio com pesos abertos, quando volume, privacidade ou customização pedem",
      "A mesma API servida por uma nuvem que você já usa, com os limites e contratos dela",
    ],
  },
  knowledgeCheck: [
    {
      id: "binding-limit",
      prompt: "Sua conta tem 1.000 RPM e 100.000 TPM. Cada pedido usa 4.000 tokens. Quantos pedidos por minuto você consegue de fato?",
      options: ["1.000", "250", "25", "100"],
      correct: 2,
      explanation: "O TPM permite 100.000 ÷ 4.000 = 25 pedidos por minuto, bem abaixo dos 1.000 RPM. O limite efetivo é o menor dos dois.",
      lesson: "17-02",
    },
    {
      id: "retry-storm",
      prompt: "Depois de um pico, 200 instâncias recebem 429 e todas tentam de novo exatamente 1 s, 2 s e 4 s depois. O que corrige o problema?",
      options: [
        "Tentar de novo imediatamente",
        "Sortear a espera de cada tentativa (jitter) para espalhar as voltas",
        "Diminuir o timeout",
        "Repetir também os erros 400",
      ],
      correct: 1,
      explanation: "Sem jitter, as instâncias voltam sincronizadas e batem no limite juntas de novo. Sortear a espera entre 0 e o teto da vez espalha a carga.",
      lesson: "17-02",
    },
  ],
  related: ["17-01", "17-03", "10-14"],
  references: [
    { title: "Anthropic: Rate limits", url: "https://docs.anthropic.com/en/api/rate-limits", kind: "docs" },
    { title: "OpenAI: Rate limits", url: "https://platform.openai.com/docs/guides/rate-limits", kind: "docs" },
    { title: "AWS Architecture Blog: Exponential Backoff And Jitter", url: "https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/", kind: "article" },
  ],
};

export default lesson;
