import type { BlockDiagramSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Guardrails com as contas no arquivo. Dez mensagens rotuladas por pessoas (nocivas ou não) e o escore de um
// classificador de moderação para cada uma (todos de brinquedo, declarados no texto); precision, recall e taxa
// de recusa indevida (falsos positivos / mensagens legítimas) em quatro limiares; e a latência de um guardrail
// de entrada em série ou em paralelo com a chamada ao modelo.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const percent = (value: number) => `${Math.round(value * 100)}%`;
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const listing = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`);

// Passos 3 e 4: mensagens rotuladas e escores do classificador.
const messages = [
  { label: "receita de bolo", score: 0.02, harmful: 0 },
  { label: "matar processo linux", score: 0.58, harmful: 0 },
  { label: "montar explosivo", score: 0.93, harmful: 1 },
  { label: "dose de paracetamol", score: 0.47, harmful: 0 },
  { label: "ameaçar vizinho", score: 0.81, harmful: 1 },
  { label: "invadir wi-fi alheio", score: 0.44, harmful: 1 },
  { label: "história da guerra", score: 0.35, harmful: 0 },
  { label: "ofender por religião", score: 0.72, harmful: 1 },
  { label: "piada de programador", score: 0.08, harmful: 0 },
  { label: "vender remédio sem receita", score: 0.66, harmful: 1 },
];
const harmfulCount = messages.filter((message) => message.harmful === 1).length;
const benignCount = messages.length - harmfulCount;
const evaluate = (threshold: number) => {
  const blocked = messages.filter((message) => message.score >= threshold);
  const tp = blocked.filter((message) => message.harmful === 1).length;
  const fp = blocked.length - tp;
  return {
    threshold,
    precision: blocked.length === 0 ? 1 : tp / blocked.length,
    recall: tp / harmfulCount,
    overRefusal: fp / benignCount,
    falseBlocks: blocked.filter((message) => message.harmful === 0).map((message) => message.label),
    missed: messages.filter((message) => message.harmful === 1 && message.score < threshold).map((message) => message.label),
  };
};
const thresholds = [0.3, 0.5, 0.7, 0.9];
const sweep = thresholds.map(evaluate);
const DEFAULT = 0.5;
const atDefault = evaluate(DEFAULT);
const STRICT_INDEX = thresholds.indexOf(0.3);
const LAX_INDEX = thresholds.indexOf(0.9);

// Passo 5: latência em série e em paralelo.
const INPUT_GUARD_MS = 120;
const LLM_MS = 1800;
const OUTPUT_GUARD_MS = 150;
const serial = INPUT_GUARD_MS + LLM_MS + OUTPUT_GUARD_MS;
const parallel = Math.max(INPUT_GUARD_MS, LLM_MS) + OUTPUT_GUARD_MS;

const gate = (active: string, done?: string[]): BlockDiagramSpec => ({
  id: "gate",
  piece: "block-diagram",
  blocks: [
    { id: "phone", kind: "phone", label: "mensagem", col: 0, row: 0 },
    { id: "input", kind: "guardrail", label: "guardrail entrada", col: 1, row: 0 },
    { id: "llm", kind: "llm", label: "modelo", col: 2, row: 0 },
    { id: "output", kind: "guardrail", label: "guardrail saída", col: 3, row: 0 },
    { id: "answer", kind: "answer", label: "resposta", col: 3, row: 1 },
    { id: "refuse", kind: "no-result", label: "recusa", col: 1, row: 1 },
  ],
  edges: [
    { from: "phone", to: "input" },
    { from: "input", to: "llm", label: "passa" },
    { from: "input", to: "refuse", label: "barra", variant: "alternative" },
    { from: "llm", to: "output" },
    { from: "output", to: "answer", label: "passa" },
  ],
  active,
  done,
});

const lesson: LessonContent = {
  id: "16-10",
  subtitle: "As barreiras em volta do modelo: o que checar na entrada e na saída, regras, classificadores e LLMs, como escolher o limiar e quanto cada barreira custa em latência.",
  objectives: [
    "Diferenciar guardrails de entrada e de saída e o que cada um protege",
    "Comparar guardrails por regra, por classificador e por LLM",
    "Avaliar um classificador de moderação com precision, recall e recusa indevida",
    "Reduzir a latência dos guardrails rodando em paralelo com o modelo",
  ],
  steps: [
    {
      id: "airport",
      shortTitle: "Aeroporto",
      title: "Raio-x na entrada, alfândega na saída",
      tag: "context",
      body: [
        "Num aeroporto, o raio-x confere o que entra no avião e a alfândega confere o que sai no destino. São checagens diferentes, feitas por equipes diferentes, e nenhuma depende da boa vontade do passageiro. Um app com LLM precisa das duas, porque o modelo, no meio, não é confiável o bastante para se policiar sozinho.",
        "Um [[guardrail de entrada|input-guardrail]] confere a mensagem antes de ela chegar ao modelo: pedidos nocivos, assuntos fora do escopo do produto, dados pessoais que não deveriam sair, tentativas de injeção. Um [[guardrail de saída|output-guardrail]] confere a resposta antes de ela chegar ao usuário: conteúdo nocivo, formato inválido, alucinação, vazamento do system prompt. O [[guardrail|guardrail]] fica no código, fora do prompt.",
      ],
      keyIdea: "Entrada protege o modelo e o custo; saída protege o usuário. Os dois ficam no código.",
      scene: { kind: "pieces", layout: "single", pieces: [gate("input")] },
      alt: "A mensagem passa pelo guardrail de entrada, em destaque, que barra o que não deve seguir e manda para a recusa; o que passa vai ao modelo, e a resposta passa pelo guardrail de saída antes de chegar ao usuário.",
    },
    {
      id: "types",
      shortTitle: "Tipos",
      title: "Do mais barato ao mais esperto",
      tag: "mechanism",
      body: [
        "Há três tipos de guardrail, em ordem de custo. Regras: expressões regulares, listas de termos, validação de schema, limite de tamanho; rodam em microssegundos e nunca mudam de ideia, mas só pegam o que alguém escreveu. Classificadores: modelos pequenos treinados para uma tarefa, como a [[moderação|moderation]] de conteúdo, que dá um escore por categoria (violência, ódio, autolesão...); rodam em dezenas de milissegundos.",
        "Por fim, LLMs como checadores: um modelo com instruções decide se a mensagem está no escopo, se a resposta é sustentada pelas fontes (aula 16.09) ou se segue a política. O Llama Guard (Inan et al., 2023) é um LLM ajustado para classificar entradas e saídas numa taxonomia de riscos; o NeMo Guardrails, da NVIDIA, organiza essas checagens em fluxos configuráveis. Na prática, as checagens vão em cascata: a regra barata primeiro, o LLM só no que sobrar.",
      ],
      keyIdea: "Regras pegam o óbvio, classificadores pegam categorias, LLMs pegam contexto: em cascata, nessa ordem.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "cascade",
            piece: "pipeline",
            stages: [
              { id: "rules", label: "regras e schema" },
              { id: "classifier", label: "classificador de moderação", color: "module-16" },
              { id: "llm", label: "llm checador" },
              { id: "model", label: "modelo principal" },
            ],
            active: "classifier",
            done: ["rules"],
            branch: { id: "block", label: "recusa", from: "classifier", edgeLabel: "escore alto", color: "danger" },
          },
        ],
      },
      alt: "Cascata de checagens: regras e schema, depois o classificador de moderação em destaque, que desvia para a recusa quando o escore é alto, depois o LLM checador e o modelo principal.",
    },
    {
      id: "labeled",
      shortTitle: "Rotulado",
      title: "Medir o guardrail com mensagens rotuladas",
      tag: "example",
      body: [
        `Um guardrail é um classificador, e se mede como um. As ${messages.length} mensagens da cena foram rotuladas por pessoas (${harmfulCount} nocivas) e passaram por um classificador (escores de brinquedo). Com limiar ${fixed(DEFAULT, 1)}, ele barra ${percent(atDefault.recall)} das nocivas, [[recall|recall]] ${fixed(atDefault.recall)}, e acerta ${percent(atDefault.precision)} do que barra, [[precision|precision]] ${fixed(atDefault.precision)}.`,
        `Os erros contam histórias diferentes. Passou “${listing(atDefault.missed)}”, um pedido nocivo escrito sem palavras alarmantes. Foi barrado “${listing(atDefault.falseBlocks)}”, um pedido legítimo de programação com uma palavra forte. Esse segundo erro é a [[recusa indevida|over-refusal]]: ${percent(atDefault.overRefusal)} das mensagens legítimas recusadas. Para o usuário, um assistente que recusa perguntas normais parece quebrado.`,
      ],
      keyIdea: "Meça o guardrail nos dois erros: o nocivo que passa e o legítimo que é recusado.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "rates",
            piece: "metrics-panel",
            metrics: [
              { id: "recall", label: "recall", value: fixed(atDefault.recall) },
              { id: "precision", label: "precision", value: fixed(atDefault.precision) },
              { id: "over", label: "recusa indevida", value: percent(atDefault.overRefusal), color: "danger" },
            ],
            highlight: "over",
          },
          {
            id: "scores",
            piece: "chart",
            kind: "bar",
            series: messages.map((message) => ({ label: `${message.label}${message.harmful ? " ✗" : ""}`, value: message.score })),
            max: 1,
            cutoff: { mode: "threshold", value: DEFAULT, label: `limiar ${fixed(DEFAULT, 1)}` },
            highlight: messages.findIndex((message) => message.label === atDefault.falseBlocks[0]),
            color: "module-16",
          },
        ],
      },
      alt: `Escore de moderação das ${messages.length} mensagens, com as nocivas marcadas: ${messages.map((message) => `${message.label} ${fixed(message.score)}${message.harmful ? " nociva" : ""}`).join(", ")}. Com limiar ${fixed(DEFAULT, 1)}: recall ${fixed(atDefault.recall)}, precision ${fixed(atDefault.precision)}, recusa indevida ${percent(atDefault.overRefusal)}.`,
    },
    {
      id: "sweep",
      shortTitle: "Limiar",
      title: "Cada limiar é uma política",
      tag: "mechanism",
      body: [
        `A matriz varre quatro limiares. Em ${fixed(thresholds[STRICT_INDEX], 1)}, o recall é ${fixed(sweep[STRICT_INDEX].recall)}, mas ${percent(sweep[STRICT_INDEX].overRefusal)} das mensagens legítimas são recusadas. Em ${fixed(thresholds[LAX_INDEX], 1)}, quase nada legítimo é barrado e o recall cai para ${fixed(sweep[LAX_INDEX].recall)}. Não existe limiar certo: existe o limiar que corresponde à política do produto.`,
        "Um app infantil aceita mais recusas indevidas para pegar tudo; um assistente para médicos precisa responder sobre doses e não pode recusar a pergunta do paracetamol. Classificadores de moderação dão escores por categoria, e cada categoria pode ter o seu limiar. Repita esta medição a cada troca de modelo ou de limiar, com um conjunto rotulado que inclua as perguntas legítimas difíceis.",
      ],
      keyIdea: "O limiar troca recall por recusa indevida: escolha por categoria, conforme o risco do produto.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "sweep",
            piece: "matrix",
            rows: thresholds.map((threshold) => `limiar ${fixed(threshold, 1)}`),
            cols: ["precision", "recall", "recusa indevida"],
            values: sweep.map((item) => [item.precision, item.recall, item.overRefusal].map((value) => Number(value.toFixed(2)))),
            scale: { min: 0, max: 1 },
            highlight: { row: STRICT_INDEX, col: 2 },
            showValues: true,
            color: "module-16",
          },
        ],
      },
      alt: `Precision, recall e recusa indevida por limiar: ${sweep.map((item) => `${fixed(item.threshold, 1)}: ${fixed(item.precision)}, ${fixed(item.recall)}, ${fixed(item.overRefusal)}`).join("; ")}.`,
    },
    {
      id: "latency",
      shortTitle: "Latência",
      title: "Checar sem fazer o usuário esperar",
      tag: "tradeoff",
      body: [
        `Cada guardrail soma tempo. Em série, com ${integer(INPUT_GUARD_MS)} ms na entrada, ${integer(LLM_MS)} ms no modelo e ${integer(OUTPUT_GUARD_MS)} ms na saída (valores de brinquedo), a resposta leva ${integer(serial)} ms. Rodando o guardrail de entrada em paralelo com a chamada ao modelo, e cancelando a chamada se ele barrar, a resposta leva ${integer(parallel)} ms: o guardrail some da latência.`,
        "O preço é pagar tokens de chamadas que serão canceladas, e só vale para checagens cujo resultado não muda o prompt. Na saída, com streaming, o guardrail confere a resposta em pedaços, e o app precisa decidir o que fazer se um pedaço já mostrado for barrado. E guardrail não é defesa completa: ataques bem escritos passam por classificadores, como mostra a próxima aula.",
      ],
      keyIdea: "Paralelize o guardrail de entrada com o modelo quando ele não muda o prompt.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "timing",
            piece: "metrics-panel",
            metrics: [
              { id: "serial", label: "em série", value: `${integer(serial)} ms`, color: "danger" },
              { id: "parallel", label: "entrada em paralelo", value: `${integer(parallel)} ms`, color: "success" },
            ],
            highlight: "parallel",
          },
          {
            id: "parallel",
            piece: "block-diagram",
            blocks: [
              { id: "phone", kind: "phone", label: "mensagem", col: 0, row: 0.5 },
              { id: "input", kind: "guardrail", label: `entrada ${INPUT_GUARD_MS} ms`, col: 1, row: 0 },
              { id: "llm", kind: "llm", label: `modelo ${integer(LLM_MS)} ms`, col: 1, row: 1 },
              { id: "output", kind: "guardrail", label: `saída ${OUTPUT_GUARD_MS} ms`, col: 2, row: 0.5 },
              { id: "answer", kind: "answer", label: "resposta", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "phone", to: "input" },
              { from: "phone", to: "llm" },
              { from: "input", to: "llm", label: "cancela", variant: "alternative" },
              { from: "llm", to: "output" },
              { from: "output", to: "answer" },
            ],
            active: "input",
          },
        ],
      },
      alt: `A mensagem vai ao mesmo tempo para o guardrail de entrada, em destaque, e para o modelo; se a entrada barrar, a chamada é cancelada. Em série a resposta leva ${integer(serial)} ms; com a entrada em paralelo, ${integer(parallel)} ms.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Barreiras medidas e baratas",
      tag: "summary",
      body: [
        "Guardrails de entrada e de saída ficam no código, em cascata do mais barato ao mais caro: regras, classificadores, LLMs checadores. Cada um é um classificador e se mede como tal, com mensagens rotuladas, olhando o nocivo que passa e o legítimo recusado. O limiar é uma política do produto, e o guardrail de entrada pode rodar em paralelo com o modelo.",
        "Prompt injection é o caso em que os guardrails mais falham, porque o ataque se parece com texto normal. A próxima aula mede defesas contra ele e mostra desenhos de sistema que limitam o estrago mesmo quando o ataque passa.",
      ],
      keyIdea: "Guardrail sem medição é sensação de segurança: meça os dois erros e escolha o limiar de propósito.",
      scene: { kind: "pieces", layout: "single", pieces: [gate("output", ["phone", "input", "llm"])] },
      alt: "O fluxo completo com o guardrail de saída em destaque: a mensagem passou pela entrada e pelo modelo, e a resposta é conferida antes de chegar ao usuário.",
    },
  ],
  realWorldExample:
    "Provedores oferecem classificadores de moderação prontos: o endpoint de moderação da OpenAI devolve, para um texto ou imagem, um escore por categoria (como assédio, ódio, autolesão e violência) e um indicador de violação, e é comum usá-lo nos dois lados da conversa. Projetos abertos como o Llama Guard, da Meta, e o NeMo Guardrails, da NVIDIA, permitem rodar as mesmas checagens com modelos próprios e políticas escritas pela equipe.",
  code: {
    language: "python",
    source: `def evaluate_guardrail(items, threshold):
    """items: [(score, harmful), ...] com rótulos humanos."""
    blocked = [(s, h) for s, h in items if s >= threshold]
    tp = sum(h for _, h in blocked)
    harmful = sum(h for _, h in items)
    benign = len(items) - harmful
    return {
        "precision": tp / len(blocked) if blocked else 1.0,
        "recall": tp / harmful,
        "over_refusal": (len(blocked) - tp) / benign,
    }

for t in (0.3, 0.5, 0.7, 0.9):
    print(t, evaluate_guardrail(labeled, t))`,
    caption: "A varredura de limiares da aula: precision, recall e taxa de recusa indevida a partir de mensagens rotuladas.",
  },
  tradeOffs: {
    pros: [
      "Ficam no código, independentes do que o modelo decidir",
      "Em cascata, a maior parte do tráfego passa só pelas checagens baratas",
      "O limiar por categoria deixa a política explícita e ajustável",
    ],
    cons: [
      "Recusas indevidas irritam o usuário e escondem casos legítimos",
      "Somam latência e custo a cada mensagem",
      "Ataques escritos para parecer normais passam pelos classificadores",
    ],
    alternatives: [
      "Restringir o que o sistema pode fazer (menor privilégio), em vez de tentar detectar tudo",
      "Revisão humana para categorias de alto risco",
    ],
  },
  knowledgeCheck: [
    {
      id: "over-refusal",
      prompt: "Depois de baixar o limiar de moderação, o recall de conteúdo nocivo foi de 80% para 98%, mas médicos começaram a reclamar que perguntas sobre doses são recusadas. O que medir?",
      options: [
        "Só o recall, que melhorou",
        "A taxa de recusa indevida nas perguntas legítimas, de preferência num conjunto rotulado com perguntas médicas",
        "A latência",
        "O tamanho do prompt",
      ],
      correct: 1,
      explanation: "Baixar o limiar troca recall por recusa indevida. Para um produto médico, perguntas sobre doses são legítimas e precisam estar no conjunto de avaliação.",
      lesson: "16-10",
    },
    {
      id: "parallel",
      prompt: "O guardrail de entrada leva 200 ms e o modelo leva 2.000 ms. Rodando os dois em paralelo e cancelando a chamada se o guardrail barrar, qual é a latência até o fim da geração?",
      options: ["2.200 ms", "2.000 ms", "200 ms", "1.800 ms"],
      correct: 1,
      explanation: "Em paralelo, conta o maior dos dois: max(200, 2.000) = 2.000 ms. O custo extra é pagar tokens das chamadas canceladas.",
      lesson: "16-10",
    },
  ],
  related: ["00-06", "16-09", "16-11"],
  references: [
    { title: "Inan et al. (2023), Llama Guard: LLM-based Input-Output Safeguard for Human-AI Conversations", url: "https://arxiv.org/abs/2312.06674", kind: "paper" },
    { title: "OpenAI: Moderation", url: "https://platform.openai.com/docs/guides/moderation", kind: "docs" },
    { title: "NVIDIA NeMo Guardrails", url: "https://github.com/NVIDIA/NeMo-Guardrails", kind: "repo" },
  ],
};

export default lesson;
