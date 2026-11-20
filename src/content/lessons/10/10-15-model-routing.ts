import type { LessonContent } from "../../../types/content";

// Roteamento de modelos com as contas no arquivo. 10 pedidos de brinquedo, cada um com a nota de
// dificuldade que um roteador previu e com o que cada modelo acertou de fato. O roteador manda para o
// modelo grande quem tem nota ≥ limiar. Os preços são DE EXEMPLO. A cascata tenta o pequeno primeiro e
// escala quando um verificador reprova a resposta; o verificador do brinquedo erra uma vez (alarme falso).

const money = (value: number, digits = 4) =>
  `US$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const percent = (value: number) => `${Math.round(value * 100)}%`;
const MILLION = 1e6;

interface Request {
  text: string;
  /** Dificuldade prevista pelo roteador, de 0 a 1. */
  score: number;
  smallOk: boolean;
  largeOk: boolean;
  /** O verificador da cascata reprova a resposta do modelo pequeno. */
  flagged: boolean;
}

const requests: Request[] = [
  { text: "traduzir “obrigado”", score: 0.05, smallOk: true, largeOk: true, flagged: false },
  { text: "resumir e-mail curto", score: 0.12, smallOk: true, largeOk: true, flagged: false },
  { text: "classificar sentimento", score: 0.18, smallOk: true, largeOk: true, flagged: false },
  { text: "extrair data da fatura", score: 0.22, smallOk: true, largeOk: true, flagged: false },
  { text: "prazo de contrato", score: 0.3, smallOk: false, largeOk: true, flagged: true },
  { text: "explicar erro de SQL", score: 0.38, smallOk: true, largeOk: true, flagged: false },
  { text: "comparar duas cláusulas", score: 0.55, smallOk: true, largeOk: true, flagged: true },
  { text: "plano de migração", score: 0.68, smallOk: false, largeOk: true, flagged: true },
  { text: "prova matemática", score: 0.81, smallOk: false, largeOk: true, flagged: true },
  { text: "condição de corrida", score: 0.92, smallOk: false, largeOk: false, flagged: true },
];

// Preços de exemplo por milhão de tokens, e o tamanho de um pedido típico.
const LARGE = { input: 3, output: 15 };
const SMALL = { input: 0.25, output: 1.25 };
const INPUT_TOKENS = 1000;
const OUTPUT_TOKENS = 300;
const callCost = (price: { input: number; output: number }) => (INPUT_TOKENS * price.input + OUTPUT_TOKENS * price.output) / MILLION;
const largeCost = callCost(LARGE);
const smallCost = callCost(SMALL);
const priceRatio = largeCost / smallCost;

const route = (threshold: number) => {
  const toLarge = requests.filter((request) => request.score >= threshold);
  const correct = requests.filter((request) => (request.score >= threshold ? request.largeOk : request.smallOk)).length;
  const cost = toLarge.length * largeCost + (requests.length - toLarge.length) * smallCost;
  return { threshold, toLarge: toLarge.length, correct, cost };
};
const allLarge = route(0);
const allSmall = route(Number.POSITIVE_INFINITY);
const THRESHOLD = 0.5;
const chosen = route(THRESHOLD);
const chosenSaving = 1 - chosen.cost / allLarge.cost;
const routerMiss = requests.find((request) => request.score < THRESHOLD && !request.smallOk);

const thresholds = [0, 0.25, 0.35, 0.5, 0.7, 1];
const sweep = thresholds.map(route);
const lowThreshold = route(0.25);

// Passo 5: cascata. Todos passam pelo pequeno; os reprovados pelo verificador vão para o grande.
const escalated = requests.filter((request) => request.flagged);
const cascadeCorrect = requests.filter((request) => (request.flagged ? request.largeOk : request.smallOk)).length;
const cascadeCost = requests.length * smallCost + escalated.length * largeCost;
const cascadeSaving = 1 - cascadeCost / allLarge.cost;
const falseAlarms = requests.filter((request) => request.flagged && request.smallOk).length;

const lesson: LessonContent = {
  id: "10-15",
  subtitle: "Mandar cada pedido para o modelo certo: um pequeno e barato para o fácil, um grande para o difícil, e medir o que se ganha e o que se perde.",
  objectives: [
    "Explicar como um roteador decide o modelo de cada pedido",
    "Calcular o custo e o acerto de um mix de modelos para um limiar",
    "Escolher o limiar olhando custo e qualidade juntos",
    "Comparar roteamento antecipado com uma cascata que escala",
  ],
  steps: [
    {
      id: "triage",
      shortTitle: "Triagem",
      title: "Nem todo pedido precisa do especialista",
      tag: "context",
      body: [
        "No pronto-socorro, a triagem decide quem vai para o clínico e quem vai direto para o cirurgião. Mandar todo mundo para o cirurgião resolveria, mas a fila e a conta seriam enormes. Num produto com LLM, “traduza obrigado” e “prove este teorema” chegam pela mesma API, e o modelo mais caro não precisa responder os dois.",
        `[[Model routing|model-routing]] é essa triagem: um roteador olha o pedido e escolhe entre um [[modelo pequeno|slm]] e um [[LLM|llm]] grande. Nos preços de exemplo desta aula, uma chamada típica custa ${money(smallCost)} no pequeno e ${money(largeCost)} no grande, ${fixed(priceRatio, 0)} vezes mais.`,
      ],
      keyIdea: "Rotear é decidir, pedido a pedido, se o modelo barato basta.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "router",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "pedidos", col: 0, row: 0.5 },
              { id: "router", kind: "app", label: "roteador", col: 1, row: 0.5 },
              { id: "small", kind: "llm", label: "modelo pequeno", col: 2, row: 0 },
              { id: "large", kind: "llm", label: "modelo grande", col: 2, row: 1 },
              { id: "answer", kind: "answer", label: "resposta", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "user", to: "router" },
              { from: "router", to: "small", label: "fácil" },
              { from: "router", to: "large", label: "difícil" },
              { from: "small", to: "answer" },
              { from: "large", to: "answer" },
            ],
            active: "router",
          },
        ],
      },
      alt: "Os pedidos chegam ao roteador, em destaque, que manda os fáceis para o modelo pequeno e os difíceis para o modelo grande; os dois devolvem a resposta.",
    },
    {
      id: "score",
      shortTitle: "Nota",
      title: "O roteador dá uma nota de dificuldade",
      tag: "mechanism",
      body: [
        "O roteador mais comum é um classificador barato: um modelo pequeno ou um embedding com uma camada treinada, que lê o pedido e devolve uma nota de 0 a 1 para “precisa do modelo grande”. Ele foi treinado com pedidos em que se sabe qual modelo acertou, ou com preferências de pessoas entre as duas respostas.",
        `Na cena, os ${requests.length} pedidos de brinquedo estão em ordem de nota, e o limiar de ${fixed(THRESHOLD, 1)} manda ${chosen.toLarge} para o grande. A nota é uma previsão e erra: “${routerMiss?.text ?? ""}” recebeu ${fixed(routerMiss?.score ?? 0)}, foi para o pequeno, e o pequeno errou.`,
      ],
      keyIdea: "O limiar transforma a nota do roteador numa decisão; a nota erra, e o erro vira resposta pior ou conta maior.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "scores",
            piece: "chart",
            kind: "bar",
            series: requests.map((request) => ({ label: request.text, value: request.score })),
            max: 1,
            cutoff: { mode: "threshold", value: THRESHOLD, label: `limiar ${fixed(THRESHOLD, 1)}: grande` },
            highlight: requests.findIndex((request) => request === routerMiss),
            color: "module-10",
          },
        ],
      },
      alt: `Barras com a nota de dificuldade dos ${requests.length} pedidos; os ${chosen.toLarge} com nota a partir de ${fixed(THRESHOLD, 1)} vão para o modelo grande. Em destaque, ${routerMiss?.text ?? ""}, com nota ${fixed(routerMiss?.score ?? 0)}, que o modelo pequeno errou.`,
    },
    {
      id: "mix",
      shortTitle: "Mix",
      title: "O custo e o acerto do mix",
      tag: "mechanism",
      body: [
        `Tudo no grande: ${allLarge.correct} acertos em ${requests.length} e ${money(allLarge.cost)} pelos ${requests.length} pedidos. Tudo no pequeno: ${allSmall.correct} acertos e ${money(allSmall.cost)}. Com o limiar de ${fixed(THRESHOLD, 1)}: ${chosen.correct} acertos e ${money(chosen.cost)}, ${percent(chosenSaving)} mais barato que tudo no grande.`,
        `O custo do mix é a média ponderada: fração no pequeno × preço do pequeno + fração no grande × preço do grande. Como o grande custa ${fixed(priceRatio, 0)} vezes mais, quase toda a conta vem dos ${chosen.toLarge} pedidos que vão para ele. A economia é real, mas custou ${allLarge.correct - chosen.correct} acerto neste conjunto: o roteamento sempre se decide nessa troca.`,
      ],
      keyIdea: "Custo do mix = Σ fração × preço; o modelo caro domina a conta mesmo com poucos pedidos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "mix",
            piece: "metrics-panel",
            metrics: [
              { id: "large", label: "tudo no grande", value: `${allLarge.correct}/${requests.length} · ${money(allLarge.cost)}` },
              { id: "small", label: "tudo no pequeno", value: `${allSmall.correct}/${requests.length} · ${money(allSmall.cost)}`, color: "danger" },
              { id: "mix", label: `limiar ${fixed(THRESHOLD, 1)}`, value: `${chosen.correct}/${requests.length} · ${money(chosen.cost)}`, color: "module-10" },
              { id: "saving", label: "economia do mix", value: percent(chosenSaving), color: "success" },
            ],
            highlight: "mix",
          },
        ],
      },
      alt: `Acertos e custo para os ${requests.length} pedidos: tudo no grande, ${allLarge.correct} e ${money(allLarge.cost)}; tudo no pequeno, ${allSmall.correct} e ${money(allSmall.cost)}; com limiar ${fixed(THRESHOLD, 1)}, ${chosen.correct} e ${money(chosen.cost)}, ${percent(chosenSaving)} de economia.`,
    },
    {
      id: "sweep",
      shortTitle: "Limiar",
      title: "Escolher o limiar com a avaliação",
      tag: "example",
      body: [
        `O limiar é um botão entre custo e qualidade. A cena mostra o custo de cada limiar em porcentagem do “tudo no grande”. Baixando o limiar para ${fixed(0.25)}, o pedido difícil mal avaliado também vai para o grande: ${lowThreshold.correct} acertos, como o grande sozinho, por ${percent(lowThreshold.cost / allLarge.cost)} do custo.`,
        `Os acertos de cada limiar foram ${sweep.map((point) => `${point.correct} com ${fixed(point.threshold)}`).join(", ")}. Num produto real, a escolha sai de um conjunto de avaliação com pedidos reais: escolha o limiar mais alto cuja qualidade medida ainda fica dentro da meta, e refaça a conta quando o tráfego mudar.`,
      ],
      keyIdea: "O limiar certo é o mais barato que ainda passa na sua avaliação de qualidade.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "sweep",
            piece: "chart",
            kind: "line",
            series: sweep.map((point) => ({ label: `limiar ${fixed(point.threshold)}`, value: Math.round((100 * point.cost) / allLarge.cost) })),
            max: 100,
            highlight: thresholds.indexOf(0.25),
            color: "module-10",
          },
        ],
      },
      alt: `Custo de cada limiar em porcentagem de mandar tudo ao modelo grande: ${sweep.map((point) => `limiar ${fixed(point.threshold)}, ${percent(point.cost / allLarge.cost)} do custo e ${point.correct} acertos`).join("; ")}.`,
    },
    {
      id: "cascade",
      shortTitle: "Cascata",
      title: "Cascata: tentar o barato e escalar",
      tag: "tradeoff",
      body: [
        `Outra estratégia é a [[cascata de modelos|model-cascade]]: todo pedido vai primeiro ao pequeno, e um verificador (regras, um teste, uma nota de confiança ou um modelo juiz) decide se a resposta serve. Se não serve, o pedido escala para o grande. No brinquedo, o verificador reprova ${escalated.length} respostas, ${falseAlarms} delas boas (um alarme falso): ${cascadeCorrect} acertos por ${money(cascadeCost)}, ${percent(cascadeSaving)} mais barato que tudo no grande.`,
        "A cascata não depende de prever a dificuldade, só de reconhecer uma resposta ruim, o que é mais fácil em tarefas checáveis como JSON, código com testes ou extração. O preço é latência: o pedido escalado paga duas chamadas em sequência. E, como o prompt caching é por modelo, cada troca de modelo perde o cache do outro.",
      ],
      keyIdea: "Roteador prevê antes; cascata confere depois. A cascata gasta latência para errar menos a escolha.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "router",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "pedidos", col: 0, row: 0.5 },
              { id: "small", kind: "llm", label: "modelo pequeno", col: 1, row: 0.5 },
              { id: "check", kind: "eval", label: "verificador", col: 2, row: 0.5 },
              { id: "answer", kind: "answer", label: "resposta", col: 3, row: 0 },
              { id: "large", kind: "llm", label: "modelo grande", col: 3, row: 1 },
            ],
            edges: [
              { from: "user", to: "small" },
              { from: "small", to: "check" },
              { from: "check", to: "answer", label: "aprovada" },
              { from: "check", to: "large", label: `escala ${escalated.length}`, variant: "alternative" },
            ],
            active: "check",
          },
        ],
      },
      alt: `Cascata: todos os pedidos vão ao modelo pequeno e a um verificador, em destaque; as respostas aprovadas seguem, e ${escalated.length} reprovadas escalam pelo caminho tracejado para o modelo grande.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Cada pedido no modelo que basta",
      tag: "summary",
      body: [
        "Roteamento manda cada pedido para o modelo mais barato que resolve: um roteador dá uma nota de dificuldade e um limiar decide, ou uma cascata tenta o barato e escala o que o verificador reprova. Os dois vivem da mesma troca entre custo e acerto, e o ponto certo sai de uma avaliação com tráfego real.",
        "Roteador, modelos e caches precisam rodar em algum lugar. A próxima aula fecha o módulo abrindo o motor que faz tudo isso numa GPU: o vLLM e os outros motores de inferência.",
      ],
      keyIdea: "Rotear bem = nota ou verificação + limiar escolhido pela avaliação + custo medido.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "loop",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "eval-set", label: "conjunto de avaliação" },
              { id: "score", label: "nota do roteador" },
              { id: "threshold", label: "escolher o limiar", color: "module-10" },
              { id: "cascade", label: "escalar o que falhar" },
              { id: "monitor", label: "medir custo e acerto", color: "brand" },
            ],
          },
        ],
      },
      alt: "Fluxo em chips: conjunto de avaliação, nota do roteador, escolher o limiar, escalar o que falhar e medir custo e acerto.",
    },
  ],
  realWorldExample:
    "O FrugalGPT (Chen, Zaharia e Zou, 2023) montou cascatas de APIs de LLM e relatou igualar o desempenho do melhor modelo individual com até 98% menos custo nos conjuntos testados. O RouteLLM (Ong et al., 2024) treinou roteadores entre um modelo forte e um fraco com dados de preferência humana do Chatbot Arena e relatou cortes de custo de mais de 2 vezes em alguns casos sem perder qualidade nas respostas.",
  code: {
    language: "python",
    source: `def route(prompt: str, router, threshold: float = 0.5) -> str:
    """Devolve o modelo que vai responder o pedido."""
    score = router.predict_proba([prompt])[0][1]  # chance de precisar do grande
    return "modelo-grande" if score >= threshold else "modelo-pequeno"

def cascade(prompt: str, small, large, verify) -> str:
    answer = small(prompt)
    return answer if verify(prompt, answer) else large(prompt)`,
    caption: "Roteador por limiar e cascata com verificador, as duas estratégias da aula, em poucas linhas.",
  },
  tradeOffs: {
    pros: [
      "Corta a conta de forma grande quando a maior parte do tráfego é fácil",
      "Pedidos fáceis respondem mais rápido no modelo pequeno",
      "O limiar dá um botão explícito entre custo e qualidade",
    ],
    cons: [
      "O roteador erra, e cada erro vira resposta pior ou custo maior",
      "Na cascata, o pedido escalado paga duas chamadas e mais latência",
      "Mais modelos para avaliar, versionar e monitorar, e caches que não se compartilham entre eles",
    ],
    alternatives: [
      "Um modelo só, com menos esforço de raciocínio nos pedidos simples",
      "Cache semântico para pedidos repetidos, que nem chega a chamar modelo",
    ],
  },
  knowledgeCheck: [
    {
      id: "threshold-direction",
      prompt: "Com o limiar do roteador em 0,5, a qualidade medida ficou abaixo da meta. O que acontece ao baixar o limiar para 0,3?",
      options: [
        "Mais pedidos vão para o modelo pequeno; o custo cai e a qualidade cai",
        "Mais pedidos vão para o modelo grande; o custo sobe e a qualidade tende a subir",
        "Nada muda, o limiar só afeta a latência",
        "O roteador passa a acertar todas as notas",
      ],
      correct: 1,
      explanation: "Vai para o grande quem tem nota ≥ limiar. Limiar menor manda mais pedidos ao grande: mais custo e, em geral, mais acerto. Confira no conjunto de avaliação.",
      lesson: "10-15",
    },
    {
      id: "cascade-fit",
      prompt: "Um serviço gera JSON que precisa passar num schema, e é fácil validar a saída. Que estratégia aproveita melhor isso?",
      options: [
        "Mandar tudo para o modelo grande",
        "Cascata: o modelo pequeno tenta, a validação do schema verifica, e só o que falhar vai para o grande",
        "Aumentar a temperatura do modelo pequeno",
        "Rotear por sorteio",
      ],
      correct: 1,
      explanation: "Quando conferir a resposta é barato e confiável, a cascata escala só o que falhou, sem depender de prever a dificuldade antes.",
      lesson: "10-15",
    },
  ],
  related: ["10-14", "10-16", "04-12"],
  references: [
    { title: "Chen, Zaharia e Zou (2023), FrugalGPT", url: "https://arxiv.org/abs/2305.05176", kind: "paper" },
    { title: "Ong et al. (2024), RouteLLM: Learning to Route LLMs with Preference Data", url: "https://arxiv.org/abs/2406.18665", kind: "paper" },
  ],
};

export default lesson;
