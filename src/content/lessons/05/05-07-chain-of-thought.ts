import type { LessonContent } from "../../../types/content";

// Chain of thought com contas no arquivo: o problema da cantina do artigo de Wei et al. (2022) resolvido
// passo a passo, e o custo de raciocinar em tokens de saída (estimados a 4 caracteres por token) para três
// problemas, com a resposta direta e com o raciocínio escrito.

const estimateTokens = (text: string) => Math.ceil(text.length / 4);
const fixed = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

// O problema da Figura 1 de Wei et al. (2022), traduzido.
const START = 23;
const USED = 20;
const BOUGHT = 6;
const afterLunch = START - USED;
const finalApples = afterLunch + BOUGHT;
/** A resposta errada que o modelo deu sem raciocínio, na mesma figura. */
const WRONG_DIRECT = 27;

const chainSteps = [
  `${START} maçãs`,
  `usou ${USED}`,
  `${START} − ${USED} = ${afterLunch}`,
  `comprou ${BOUGHT}`,
  `${afterLunch} + ${BOUGHT} = ${finalApples}`,
  `resposta: ${finalApples}`,
];
const SUBTRACT = 2;
const ADD = 4;

// Passo 4: três problemas, resposta direta contra raciocínio escrito.
const ROGER_START = 5;
const CANS = 2;
const PER_CAN = 3;
const rogerTotal = ROGER_START + CANS * PER_CAN;
const DEPART = 14 * 60 + 10;
const DURATION = 2 * 60 + 55;
const arrival = DEPART + DURATION;
const clock = (minutes: number) => `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")}`;

const problems = [
  {
    label: "cantina",
    direct: `A resposta é ${finalApples}.`,
    chain: `A cantina tinha ${START} maçãs. Usou ${USED} no almoço: ${START} − ${USED} = ${afterLunch}. Comprou mais ${BOUGHT}: ${afterLunch} + ${BOUGHT} = ${finalApples}. A resposta é ${finalApples}.`,
  },
  {
    label: "bolas",
    direct: `A resposta é ${rogerTotal}.`,
    chain: `Roger começou com ${ROGER_START} bolas. ${CANS} latas de ${PER_CAN} bolas são ${CANS} × ${PER_CAN} = ${CANS * PER_CAN}. ${ROGER_START} + ${CANS * PER_CAN} = ${rogerTotal}. A resposta é ${rogerTotal}.`,
  },
  {
    label: "trem",
    direct: `Chega às ${clock(arrival)}.`,
    chain: `Sai às ${clock(DEPART)}. Mais 2h dá ${clock(DEPART + 120)}. Mais 55 minutos dá ${clock(arrival)}. A resposta é ${clock(arrival)}.`,
  },
];
const directTokens = problems.map((problem) => estimateTokens(problem.direct));
const chainTokens = problems.map((problem) => estimateTokens(problem.chain));
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const ratio = sum(chainTokens) / sum(directTokens);

// Kojima et al. (2022): MultiArith com InstructGPT (text-davinci-002), zero-shot contra zero-shot CoT.
const KOJIMA_BEFORE = 17.7;
const KOJIMA_AFTER = 78.7;

const lesson: LessonContent = {
  id: "05-07",
  subtitle: "Pedir ao modelo que escreva o raciocínio antes da resposta: por que mais tokens viram mais computação e quando isso compensa.",
  objectives: [
    "Explicar por que escrever passos intermediários melhora problemas de vários passos",
    "Usar chain of thought few-shot e zero-shot (“vamos pensar passo a passo”)",
    "Calcular o custo extra de tokens de saída",
    "Saber quando não usar: tarefas simples, modelos de raciocínio e raciocínio não fiel",
  ],
  steps: [
    {
      id: "paper",
      shortTitle: "No papel",
      title: "Fazer a conta no papel",
      tag: "context",
      body: [
        `Faça de cabeça: “a cantina tinha ${START} maçãs, usou ${USED} no almoço e comprou mais ${BOUGHT}; quantas tem?”. Fácil. Agora imagine dez passos assim, sem papel. A gente erra não por falta de saber subtrair, mas por tentar guardar tudo de uma vez. No artigo de Wei et al. (2022), o modelo respondeu direto “${WRONG_DIRECT}” a esse problema.`,
        `Com [[chain of thought|chain-of-thought]], o modelo escreve os passos antes da resposta: “${START} − ${USED} = ${afterLunch}; ${afterLunch} + ${BOUGHT} = ${finalApples}”. No mesmo artigo, o modelo que recebeu exemplos com o raciocínio escrito acertou: ${finalApples}. O texto gerado vira o papel de rascunho do modelo.`,
      ],
      keyIdea: "Chain of thought: escrever os passos intermediários antes da resposta, como fazer a conta no papel.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "problema", col: 0, row: 0.5 },
              { id: "llm", kind: "llm", label: "llm", col: 1, row: 0.5 },
              { id: "direct", kind: "no-result", label: `direto: ${WRONG_DIRECT}`, col: 2, row: 0 },
              { id: "scratch", kind: "context", label: "rascunho", col: 2, row: 1 },
              { id: "answer", kind: "answer", label: `${finalApples}`, col: 3, row: 1 },
            ],
            edges: [
              { from: "user", to: "llm" },
              { from: "llm", to: "direct", label: "sem passos", variant: "alternative" },
              { from: "llm", to: "scratch", label: "passo a passo" },
              { from: "scratch", to: "answer" },
            ],
            active: "scratch",
          },
        ],
      },
      alt: `O problema chega ao LLM. Respondendo direto, pelo caminho tracejado, ele erra com ${WRONG_DIRECT}. Escrevendo um rascunho, em destaque, chega à resposta ${finalApples}.`,
    },
    {
      id: "compute",
      shortTitle: "Por quê",
      title: "Cada token é mais uma passada",
      tag: "mechanism",
      body: [
        "Lembre do módulo 04: o modelo gera um token por passada, e cada passada faz uma quantidade fixa de contas. Responder direto obriga o modelo a resolver o problema inteiro dentro das poucas passadas que geram o número. Escrever os passos dá a ele mais passadas, e cada uma pode se apoiar no resultado já escrito.",
        `Na cena, “${chainSteps[ADD]}” usa o “${afterLunch}” que o próprio modelo escreveu em “${chainSteps[SUBTRACT]}”. O resultado intermediário não precisa ficar escondido nas ativações: ele está no contexto, e a [[atenção|attention]] o lê de volta. Os tokens de raciocínio funcionam como memória de trabalho.`,
      ],
      keyIdea: "Mais tokens de saída = mais passadas de computação, e os resultados intermediários ficam no contexto para serem lidos de volta.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "chain",
            piece: "token-stream",
            tokens: chainSteps,
            query: ADD,
            keys: [SUBTRACT, ADD - 1],
            arcs: [
              { from: SUBTRACT, to: 0, weight: 0.6 },
              { from: SUBTRACT, to: 1, weight: 0.6 },
              { from: ADD, to: SUBTRACT, weight: 1, label: `${afterLunch}` },
              { from: ADD, to: ADD - 1, weight: 0.8 },
              { from: chainSteps.length - 1, to: ADD, weight: 0.8 },
            ],
            color: "module-05",
          },
        ],
      },
      alt: `Os passos do raciocínio: ${chainSteps.join(", ")}. O passo ${chainSteps[ADD]}, em destaque, lê o ${afterLunch} escrito antes, e a resposta lê o último passo.`,
    },
    {
      id: "two-ways",
      shortTitle: "Como pedir",
      title: "Com exemplos ou com uma frase",
      tag: "mechanism",
      body: [
        "Há dois jeitos de pedir. No CoT few-shot, de Wei et al. (2022), os exemplos do prompt mostram o raciocínio, não só a resposta, e o modelo imita o formato. No CoT zero-shot, de Kojima et al. (2022), basta acrescentar “Vamos pensar passo a passo” depois da pergunta.",
        `O CoT zero-shot de Kojima usa duas chamadas: a primeira gera o raciocínio; a segunda acrescenta “Portanto, a resposta (em número) é” para extrair só o resultado, que o código consegue ler. Com o InstructGPT (text-davinci-002), essa frase levou a acurácia no MultiArith de ${fixed(KOJIMA_BEFORE)}% para ${fixed(KOJIMA_AFTER)}%.`,
      ],
      keyIdea: "CoT few-shot mostra raciocínios nos exemplos; CoT zero-shot pede “passo a passo” e extrai a resposta numa segunda etapa.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "kojima",
            piece: "pipeline",
            stages: [
              { id: "question", label: "pergunta" },
              { id: "trigger", label: "“passo a passo”", color: "module-05" },
              { id: "reasoning", label: "raciocínio" },
              { id: "extract", label: "“a resposta é”" },
              { id: "number", label: `${finalApples}`, color: "success" },
            ],
            active: "reasoning",
            done: ["question", "trigger"],
          },
        ],
      },
      alt: `CoT zero-shot em etapas: pergunta, a frase “passo a passo”, o raciocínio, em destaque, a extração com “a resposta é” e o número ${finalApples}.`,
    },
    {
      id: "cost",
      shortTitle: "Custo",
      title: "Quanto custa pensar",
      tag: "example",
      body: [
        `Para três problemas curtos, a resposta direta tem ${directTokens.join(", ")} tokens e a resposta com raciocínio tem ${chainTokens.join(", ")}. No total, o raciocínio gasta ${fixed(ratio)} vezes mais tokens de saída, e tokens de saída costumam ser os mais caros e os mais lentos, porque são gerados um por vez.`,
        "Em problemas de vários passos, o custo compensa: um erro custa mais que uns tokens a mais. Em tarefas de um passo só (classificar uma frase, extrair um campo), o raciocínio só gasta tempo e dinheiro, e pode até piorar: Wei et al. observaram que o ganho aparece em modelos grandes, e que modelos pequenos escrevem raciocínios fluentes e errados.",
      ],
      keyIdea: "Raciocinar multiplica os tokens de saída; vale a pena em problemas de vários passos, não em tarefas de um passo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "cost",
            piece: "metrics-panel",
            metrics: [
              ...problems.map((problem, index) => ({
                id: problem.label,
                label: `${problem.label}: direto → passos`,
                value: `${directTokens[index]} → ${chainTokens[index]}`,
              })),
              { id: "ratio", label: "tokens de saída", value: `× ${fixed(ratio)}`, color: "danger" as const },
            ],
            highlight: "ratio",
          },
        ],
      },
      alt: `Tokens de saída por problema, direto e com passos: ${problems.map((problem, index) => `${problem.label} ${directTokens[index]} e ${chainTokens[index]}`).join("; ")}. No total, ${fixed(ratio)} vezes mais.`,
    },
    {
      id: "reasoning-models",
      shortTitle: "Cuidados",
      title: "Modelos de raciocínio e raciocínio não fiel",
      tag: "tradeoff",
      body: [
        "Os modelos de raciocínio, como a série o da OpenAI e os modelos com extended thinking da Anthropic, foram treinados para gerar o raciocínio sozinhos, antes da resposta, e cobram esses tokens. Com eles, o guia da OpenAI recomenda não pedir “pense passo a passo”: o modelo já faz isso, e a instrução extra não ajuda.",
        "Outro cuidado: o raciocínio escrito não é necessariamente o motivo real da resposta. Turpin et al. (2023) mostraram modelos que mudam a resposta por um viés escondido no prompt e escrevem uma justificativa plausível que nunca menciona esse viés. Use o CoT para melhorar a resposta e verifique o resultado, não a explicação.",
      ],
      keyIdea: "Modelos de raciocínio já pensam sozinhos; e o raciocínio escrito pode não ser fiel ao que de fato decidiu a resposta.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "problema", col: 0, row: 0 },
              { id: "llm", kind: "llm", label: "modelo de raciocínio", col: 1, row: 0 },
              { id: "thinking", kind: "memory", label: "raciocínio interno", col: 1, row: 1 },
              { id: "answer", kind: "answer", label: "resposta", col: 2, row: 0 },
              { id: "check", kind: "eval", label: "verificar resultado", col: 3, row: 0 },
            ],
            edges: [
              { from: "user", to: "llm" },
              { from: "llm", to: "thinking", label: "tokens pagos" },
              { from: "thinking", to: "llm" },
              { from: "llm", to: "answer" },
              { from: "answer", to: "check" },
            ],
            active: "thinking",
          },
        ],
      },
      alt: "O problema vai para um modelo de raciocínio, que gera um raciocínio interno, em destaque, com tokens pagos, antes da resposta; a resposta é verificada no fim.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "O raciocínio como caminho",
      tag: "summary",
      body: [
        `Chain of thought troca tokens por acerto: cada passo escrito é mais computação e fica no contexto para o passo seguinte. A cena mostra o caminho do problema da cantina: ${START}, menos ${USED}, ${afterLunch}, mais ${BOUGHT}, ${finalApples}.`,
        "Se o raciocínio vai ser lido por código, ele precisa de estrutura: a resposta final num campo separado, num formato que não dependa de adivinhação. A próxima aula trata disso: saídas estruturadas e JSON.",
      ],
      keyIdea: "CoT = mais tokens, mais passos, menos erros em problemas de vários passos; verifique a resposta, não a explicação.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "path",
            piece: "graph",
            nodes: [
              { id: "start", label: `${START} maçãs`, x: 0.08, y: 0.5 },
              { id: "minus", label: `− ${USED}`, x: 0.3, y: 0.25 },
              { id: "partial", label: `${afterLunch}`, x: 0.52, y: 0.5, color: "module-05" },
              { id: "plus", label: `+ ${BOUGHT}`, x: 0.72, y: 0.25 },
              { id: "end", label: `${finalApples}`, x: 0.92, y: 0.5, color: "success" },
              { id: "wrong", label: `${WRONG_DIRECT} (direto)`, x: 0.5, y: 0.88, color: "danger" },
            ],
            edges: [
              { from: "start", to: "minus" },
              { from: "minus", to: "partial" },
              { from: "partial", to: "plus" },
              { from: "plus", to: "end" },
              { from: "start", to: "wrong", label: "pulo" },
            ],
            path: ["start", "minus", "partial", "plus", "end"],
          },
        ],
      },
      alt: `Caminho do raciocínio: ${START} maçãs, menos ${USED}, ${afterLunch}, mais ${BOUGHT}, ${finalApples}. Fora do caminho, o pulo direto leva a ${WRONG_DIRECT}.`,
    },
  ],
  realWorldExample: `Kojima et al. (2022) mostraram que acrescentar “Let's think step by step” à pergunta, sem nenhum exemplo, levou o InstructGPT (text-davinci-002) de ${fixed(KOJIMA_BEFORE)}% para ${fixed(KOJIMA_AFTER)}% de acurácia no MultiArith e de 10,4% para 40,7% no GSM8K. Wei et al. (2022) chegaram ao estado da arte da época no GSM8K com o PaLM de 540 bilhões de parâmetros e só oito exemplos com raciocínio escrito.`,
  code: {
    language: "python",
    source: `def zero_shot_cot(question: str, call_model) -> str:
    prompt = f"P: {question}\\nR: Vamos pensar passo a passo."
    reasoning = call_model(prompt)
    answer = call_model(f"{prompt} {reasoning}\\nPortanto, a resposta (em número) é")
    return answer.strip()`,
    caption: "CoT zero-shot em duas chamadas, como em Kojima et al.: a primeira gera o raciocínio e a segunda extrai só o número.",
  },
  tradeOffs: {
    pros: [
      "Melhora problemas de vários passos: contas, lógica, planejamento",
      "Funciona só com uma frase ou com exemplos, sem treino",
      "O raciocínio escrito ajuda a depurar onde o modelo errou",
    ],
    cons: [
      "Multiplica os tokens de saída, os mais caros e lentos",
      "Não ajuda, ou atrapalha, em tarefas de um passo e em modelos pequenos",
      "A explicação pode não ser o motivo real da resposta",
    ],
    alternatives: ["Modelos de raciocínio, que já pensam antes de responder", "Ferramentas determinísticas (calculadora, código) para contas exatas", "Self-consistency, que vota entre vários raciocínios"],
  },
  knowledgeCheck: [
    {
      id: "when-cot",
      prompt: "Em qual destas tarefas chain of thought tem mais chance de ajudar?",
      options: [
        "Classificar o idioma de uma frase",
        "Calcular o troco de uma compra com desconto progressivo e frete por faixa de peso",
        "Extrair o e-mail de uma assinatura",
        "Traduzir “bom dia”",
      ],
      correct: 1,
      explanation: "CoT ajuda em problemas com vários passos que dependem uns dos outros. Tarefas de um passo só pagam o custo extra sem ganho.",
      lesson: "05-07",
    },
    {
      id: "parse-answer",
      prompt: "O app precisa do número final, mas o modelo com CoT devolve três parágrafos. O que fazer?",
      options: [
        "Desligar o CoT",
        "Pedir a resposta final num lugar fixo (por exemplo, numa segunda etapa ou num campo JSON) separado do raciocínio",
        "Pegar o primeiro número do texto",
        "Aumentar a temperatura",
      ],
      correct: 1,
      explanation: "O raciocínio é para o modelo; a resposta é para o código. Separar os dois, como na extração em duas etapas de Kojima ou num campo estruturado, mantém o ganho e a leitura confiável.",
      lesson: "05-07",
    },
  ],
  related: ["04-02", "05-08", "05-12"],
  references: [
    { title: "Wei et al. (2022), Chain-of-Thought Prompting Elicits Reasoning in Large Language Models", url: "https://arxiv.org/abs/2201.11903", kind: "paper" },
    { title: "Kojima et al. (2022), Large Language Models are Zero-Shot Reasoners", url: "https://arxiv.org/abs/2205.11916", kind: "paper" },
    { title: "Turpin et al. (2023), Language Models Don't Always Say What They Think", url: "https://arxiv.org/abs/2305.04388", kind: "paper" },
  ],
};

export default lesson;
