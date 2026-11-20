import type { LessonContent } from "../../../types/content";

// Few-shot com contas no arquivo: a conformidade de formato de respostas zero-shot e few-shot (respostas
// de exemplo escritas à mão, checadas por regex), a escolha dos exemplos mais próximos num espaço de
// embeddings de brinquedo em 2D, e o custo do prompt em tokens conforme o número de exemplos.

const integer = (value: number) => value.toLocaleString("pt-BR");
const estimateTokens = (text: string) => Math.ceil(text.length / 4);

// Passo 2: o prompt few-shot como sequência.
const fewShotStream = ["5/1/24", "→", "2024-01-05", "3 fev 2024", "→", "2024-02-03", "12/03/2024", "→"];
const LAST = fewShotStream.length - 1;
const demoOutputs = [2, 5];

// Passo 3: normalizar datas para AAAA-MM-DD.
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const dates = [
  { input: "5/1/24", expected: "2024-01-05", zeroShot: "05/01/2024", fewShot: "2024-01-05" },
  { input: "3 de fevereiro de 2024", expected: "2024-02-03", zeroShot: "2024-02-03", fewShot: "2024-02-03" },
  { input: "12/03/2024", expected: "2024-03-12", zeroShot: "12 de março de 2024", fewShot: "2024-03-12" },
  { input: "7/4/2024", expected: "2024-04-07", zeroShot: "A data é 2024-04-07.", fewShot: "2024-07-04" },
  { input: "2024.05.20", expected: "2024-05-20", zeroShot: "2024-05-20", fewShot: "2024-05-20" },
  { input: "30 jun 2024", expected: "2024-06-30", zeroShot: "30/06/2024", fewShot: "2024-06-30" },
];
const zeroFormat = dates.filter((date) => ISO_DATE.test(date.zeroShot)).length;
const fewFormat = dates.filter((date) => ISO_DATE.test(date.fewShot)).length;
const zeroCorrect = dates.filter((date) => date.zeroShot === date.expected).length;
const fewCorrect = dates.filter((date) => date.fewShot === date.expected).length;
const fewMiss = dates.find((date) => date.fewShot !== date.expected);

// Passo 4: banco de exemplos rotulados em um espaço de embeddings de brinquedo.
const bank = [
  { id: "e1", label: "cobrança dupla", coords: [0.9, 0.8] as [number, number] },
  { id: "e2", label: "estorno", coords: [1.1, 1.1] as [number, number] },
  { id: "e3", label: "boleto vencido", coords: [0.6, 1.3] as [number, number] },
  { id: "e4", label: "senha", coords: [-1.0, 0.9] as [number, number] },
  { id: "e5", label: "app trava", coords: [-1.2, 0.3] as [number, number] },
  { id: "e6", label: "cancelar plano", coords: [0.6, -0.6] as [number, number] },
  { id: "e7", label: "mudar endereço", coords: [-0.6, -1.1] as [number, number] },
];
const query = { id: "q", label: "cobrado após cancelar", coords: [0.8, 0.2] as [number, number] };
const K = 3;
const nearest = [...bank]
  .map((example) => ({ ...example, distance: Math.hypot(example.coords[0] - query.coords[0], example.coords[1] - query.coords[1]) }))
  .sort((a, b) => a.distance - b.distance)
  .slice(0, K);

// Passo 5: custo do prompt com k exemplos.
const INSTRUCTION = "Converta a data para o formato AAAA-MM-DD. Datas com barra estão em dia/mês/ano.\n";
const EXAMPLE = "Entrada: 3 de fevereiro de 2024\nSaída: 2024-02-03\n";
const instructionTokens = estimateTokens(INSTRUCTION);
const exampleTokens = estimateTokens(EXAMPLE);
const shots = [0, 1, 2, 4, 8, 16, 32];
const promptTokens = shots.map((k) => instructionTokens + k * exampleTokens);
const REQUESTS_PER_DAY = 100_000;
const dailyExtra = (promptTokens[shots.indexOf(8)] - promptTokens[0]) * REQUESTS_PER_DAY;

const lesson: LessonContent = {
  id: "05-06",
  subtitle: "Colocar exemplos resolvidos no prompt para mostrar a tarefa e o formato, como escolher esses exemplos e quanto eles custam.",
  objectives: [
    "Definir few-shot prompting e in-context learning",
    "Mostrar por que exemplos corrigem o formato melhor que instruções longas",
    "Escolher exemplos por semelhança com a entrada",
    "Calcular o custo em tokens de cada exemplo e reconhecer os vieses de ordem e de rótulo",
  ],
  steps: [
    {
      id: "show",
      shortTitle: "Mostrar",
      title: "Mostrar em vez de explicar",
      tag: "context",
      body: [
        "No primeiro dia de um emprego, ninguém lê um manual de 20 páginas sobre como preencher o formulário. Alguém mostra três formulários já preenchidos, e você copia o jeito. [[Few-shot|few-shot]] é isso: antes da entrada nova, o prompt traz alguns exemplos resolvidos de entrada e saída.",
        "Os exemplos ensinam o que a instrução tem dificuldade de descrever: o formato exato, o tamanho, o tom, onde fica a fronteira entre dois rótulos. O artigo do GPT-3 (Brown et al., 2020), intitulado “Language Models are Few-Shot Learners”, mostrou que um modelo grande o bastante melhora em muitas tarefas só com exemplos no prompt.",
      ],
      keyIdea: "Few-shot = instrução + alguns exemplos resolvidos + a entrada nova.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "examples", kind: "tokens", label: "3 exemplos", col: 0, row: 0 },
              { id: "user", kind: "user", label: "entrada nova", col: 0, row: 1 },
              { id: "prompt", kind: "context", label: "prompt few-shot", col: 1, row: 0.5 },
              { id: "llm", kind: "llm", label: "llm", col: 2, row: 0.5 },
              { id: "answer", kind: "answer", label: "mesmo formato", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "examples", to: "prompt", label: "entrada → saída" },
              { from: "user", to: "prompt" },
              { from: "prompt", to: "llm" },
              { from: "llm", to: "answer" },
            ],
            active: "examples",
          },
        ],
      },
      alt: "Três exemplos de entrada e saída, em destaque, e a entrada nova formam o prompt few-shot; o LLM responde no mesmo formato dos exemplos.",
    },
    {
      id: "in-context",
      shortTitle: "No contexto",
      title: "Aprender sem mudar nenhum peso",
      tag: "mechanism",
      body: [
        "Nada é treinado. Os pesos continuam os mesmos; o “aprendizado” acontece dentro de uma única passada, no contexto. Por isso o nome [[in-context learning|in-context-learning]]: o modelo reconhece o padrão entrada → saída nos exemplos e o aplica à entrada nova.",
        "Na cena, o último “→” é onde a resposta vai começar. A [[atenção|attention]] dele olha para as saídas dos exemplos e para a data nova. Olsson et al. (2022) descreveram as induction heads, cabeças de atenção que acham um padrão anterior e copiam o que veio depois dele, como um mecanismo central desse comportamento.",
      ],
      keyIdea: "In-context learning: o modelo copia o padrão dos exemplos numa passada, sem atualizar pesos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "pattern",
            piece: "token-stream",
            tokens: fewShotStream,
            query: LAST,
            keys: [...demoOutputs, LAST - 1],
            arcs: [
              ...demoOutputs.map((index) => ({ from: LAST, to: index, weight: 0.8, label: "padrão" })),
              { from: LAST, to: LAST - 1, weight: 1, label: "entrada" },
            ],
            color: "module-05",
          },
        ],
      },
      alt: "Dois exemplos, 5/1/24 → 2024-01-05 e 3 fev 2024 → 2024-02-03, e a entrada nova 12/03/2024 →. A seta final, em destaque, olha para as saídas dos exemplos e para a data nova.",
    },
    {
      id: "format",
      shortTitle: "Formato",
      title: "Exemplos consertam o formato",
      tag: "example",
      body: [
        `Tarefa: converter ${dates.length} datas para AAAA-MM-DD, checadas por expressão regular. As respostas foram escritas à mão para a aula. Em zero-shot, só ${zeroFormat} de ${dates.length} saem no formato: vêm “05/01/2024”, “12 de março de 2024” e até “A data é 2024-04-07.”. Com dois exemplos, ${fewFormat} de ${dates.length} saem no formato.`,
        `O formato ficou perfeito, mas os acertos foram ${fewCorrect} de ${dates.length}: “${fewMiss?.input}” virou “${fewMiss?.fewShot}”, lido como mês/dia. Nenhum exemplo mostrava uma data ambígua. Exemplos ensinam o que mostram, e só isso: a correção é incluir um exemplo com dia menor que 13 ou dizer na instrução que a barra é dia/mês/ano.`,
      ],
      keyIdea: "Exemplos fixam o formato; ambiguidades que os exemplos não cobrem continuam erradas.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "compliance",
            piece: "metrics-panel",
            metrics: [
              { id: "zero-format", label: "zero-shot no formato", value: `${zeroFormat} de ${dates.length}`, color: "danger" },
              { id: "few-format", label: "few-shot no formato", value: `${fewFormat} de ${dates.length}`, color: "success" },
              { id: "zero-correct", label: "zero-shot certas", value: `${zeroCorrect} de ${dates.length}` },
              { id: "few-correct", label: "few-shot certas", value: `${fewCorrect} de ${dates.length}` },
            ],
            highlight: "few-format",
          },
          {
            id: "outputs",
            piece: "token-stream",
            tokens: dates.map((date) => date.zeroShot),
            bars: dates.map((date) => (ISO_DATE.test(date.zeroShot) ? 1 : 0.1)),
            color: "danger",
          },
        ],
      },
      alt: `Painel: zero-shot com ${zeroFormat} de ${dates.length} respostas no formato e ${zeroCorrect} certas; few-shot com ${fewFormat} no formato e ${fewCorrect} certas. Abaixo, as respostas zero-shot: ${dates.map((date) => date.zeroShot).join(", ")}, com barra alta só nas que seguem AAAA-MM-DD.`,
    },
    {
      id: "selection",
      shortTitle: "Quais",
      title: "Escolher exemplos parecidos com a entrada",
      tag: "mechanism",
      body: [
        `Com um banco de exemplos rotulados, você não precisa usar sempre os mesmos. Para cada entrada nova, calcule o [[embedding|embedding]] e pegue os ${K} exemplos mais próximos. Na cena, num espaço de brinquedo em 2D, “${query.label}” puxa ${nearest.map((example) => `“${example.label}”`).join(", ")}.`,
        "Liu et al. (2021) mostraram que escolher exemplos semanticamente próximos da entrada supera exemplos aleatórios em várias tarefas. Min et al. (2022) acharam algo surpreendente: trocar os rótulos dos exemplos por rótulos aleatórios piora pouco. O que mais pesa é mostrar o formato, o espaço de rótulos e o tipo de texto de entrada.",
      ],
      keyIdea: "Exemplos próximos da entrada ensinam mais; o formato e o tipo de entrada importam mais que o rótulo de cada exemplo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "bank",
            piece: "vector-space",
            points: [
              ...bank.map((example) => ({ id: example.id, label: example.label, coords: example.coords })),
              { id: query.id, label: query.label, coords: query.coords, color: "module-05" as const },
            ],
            query: query.id,
            neighbors: K,
          },
        ],
      },
      alt: `Espaço 2D com ${bank.length} exemplos rotulados e a mensagem nova “${query.label}”; os ${K} vizinhos mais próximos são ${nearest.map((example) => example.label).join(", ")}.`,
    },
    {
      id: "cost",
      shortTitle: "Custo",
      title: "Cada exemplo custa tokens, sempre",
      tag: "tradeoff",
      body: [
        `Cada exemplo da tarefa de datas tem cerca de ${exampleTokens} tokens. Com ${shots[shots.length - 1]} exemplos, o prompt passa de ${promptTokens[0]} para ${integer(promptTokens[promptTokens.length - 1])} tokens, e isso é pago em toda requisição. Com ${integer(REQUESTS_PER_DAY)} requisições por dia, ir de 0 para 8 exemplos soma ${integer(dailyExtra)} tokens de entrada diários.`,
        "Há também vieses. Zhao et al. (2021) mostraram que o modelo tende ao rótulo mais frequente nos exemplos e ao rótulo do último exemplo; Lu et al. (2021) mostraram que só mudar a ordem dos mesmos exemplos altera bastante a acurácia. Por isso: equilibre os rótulos, varie a ordem no eval e pare de acrescentar exemplos quando o ganho parar.",
      ],
      keyIdea: "O custo cresce em linha reta com o número de exemplos; o ganho não. Equilibre rótulos e teste ordens.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "tokens",
            piece: "chart",
            kind: "line",
            series: shots.map((k, index) => ({ label: `${k}`, value: promptTokens[index] })),
            highlight: shots.indexOf(8),
            color: "module-05",
          },
        ],
      },
      alt: `Tokens do prompt por número de exemplos: ${shots.map((k, index) => `${k} ${k === 1 ? "exemplo" : "exemplos"} ${integer(promptTokens[index])}`).join(", ")}. Cresce em linha reta.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Few-shot dinâmico",
      tag: "summary",
      body: [
        `Few-shot mostra a tarefa com exemplos, e o modelo aprende no contexto, sem mudar pesos. Exemplos fixam formato e fronteiras, custam tokens em toda requisição e trazem vieses de ordem e de rótulo. Em produção, o padrão é guardar um banco de exemplos e buscar os ${K} mais parecidos com cada entrada, como na cena.`,
        "A próxima aula leva os exemplos um passo além: em vez de mostrar só a resposta, mostrar o raciocínio que leva até ela. É o chain of thought.",
      ],
      keyIdea: "Poucos exemplos, parecidos com a entrada, equilibrados e cobrindo as ambiguidades.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "phone", label: "entrada", col: 0, row: 0 },
              { id: "bank", kind: "vector-db", label: "banco de exemplos", col: 0, row: 1 },
              { id: "search", kind: "retrieval", label: `top-${K} parecidos`, col: 1, row: 1 },
              { id: "prompt", kind: "context", label: "prompt few-shot", col: 2, row: 0.5 },
              { id: "llm", kind: "llm", label: "llm", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "user", to: "search", label: "embedding" },
              { from: "bank", to: "search" },
              { from: "search", to: "prompt", label: `${K} exemplos` },
              { from: "user", to: "prompt" },
              { from: "prompt", to: "llm" },
            ],
            active: "search",
            done: ["user", "bank"],
          },
        ],
      },
      alt: `A entrada vira embedding e busca, no banco de exemplos, os ${K} mais parecidos, em destaque; os exemplos e a entrada formam o prompt few-shot que vai para o LLM.`,
    },
  ],
  realWorldExample:
    "O artigo do GPT-3 (Brown et al., 2020) avaliou o mesmo modelo de 175 bilhões de parâmetros em zero-shot, one-shot e few-shot, sem nenhuma atualização de pesos, e encontrou ganhos com exemplos em tarefas como tradução, perguntas e respostas e aritmética simples. Esse resultado deu nome à técnica e mudou o jeito de usar modelos de linguagem: de treinar um modelo por tarefa para descrever e mostrar a tarefa no prompt.",
  code: {
    language: "python",
    source: `def few_shot_prompt(instruction: str, examples: list[tuple[str, str]], new_input: str) -> str:
    shots = "\\n\\n".join(f"Entrada: {x}\\nSaída: {y}" for x, y in examples)
    return f"{instruction}\\n\\n{shots}\\n\\nEntrada: {new_input}\\nSaída:"

prompt = few_shot_prompt(
    "Converta a data para AAAA-MM-DD. Datas com barra estão em dia/mês/ano.",
    [("5/1/24", "2024-01-05"), ("3 de fevereiro de 2024", "2024-02-03"), ("7/4/2024", "2024-04-07")],
    "12/03/2024",
)`,
    caption: "Prompt few-shot: instrução, exemplos no mesmo formato (incluindo uma data ambígua) e a entrada nova terminando em “Saída:”, onde a resposta começa.",
  },
  tradeOffs: {
    pros: [
      "Fixa formato, tom e fronteiras de rótulo com poucos tokens de exemplo",
      "Não exige treino nem dados em grande quantidade",
      "Exemplos podem ser trocados a cada requisição, por semelhança",
    ],
    cons: [
      "Cada exemplo é pago em toda requisição",
      "Viés para o rótulo mais frequente e para o último exemplo",
      "A acurácia muda com a ordem dos exemplos",
    ],
    alternatives: ["Zero-shot com definições melhores, quando o formato é simples", "Saída estruturada com schema, quando o problema é só formato", "Fine-tuning, quando centenas de exemplos seriam necessários"],
  },
  knowledgeCheck: [
    {
      id: "label-imbalance",
      prompt: "Os 6 exemplos de um prompt têm 5 rótulos “aprovado” e 1 “recusado”. O modelo passa a aprovar quase tudo. O que fazer?",
      options: [
        "Remover a instrução",
        "Equilibrar os rótulos nos exemplos e variar a ordem no eval",
        "Aumentar a temperatura",
        "Colocar o exemplo “recusado” sempre em primeiro",
      ],
      correct: 1,
      explanation: "Modelos tendem ao rótulo mais frequente nos exemplos. Exemplos equilibrados e testes com ordens diferentes reduzem o viés.",
      lesson: "05-06",
    },
    {
      id: "example-cost",
      prompt: "Um prompt tem 50 tokens de instrução e 10 exemplos de 40 tokens. Quantos tokens de entrada, antes da mensagem do usuário, cada requisição paga?",
      options: ["50", "90", "450", "4.000"],
      correct: 2,
      explanation: "50 + 10 × 40 = 450 tokens, pagos em toda requisição. Por isso vale medir se cada exemplo a mais ainda traz ganho.",
      lesson: "05-06",
    },
  ],
  related: ["05-05", "05-07", "06-08"],
  references: [
    { title: "Brown et al. (2020), Language Models are Few-Shot Learners", url: "https://arxiv.org/abs/2005.14165", kind: "paper" },
    { title: "Min et al. (2022), Rethinking the Role of Demonstrations: What Makes In-Context Learning Work?", url: "https://arxiv.org/abs/2202.12837", kind: "paper" },
    { title: "Zhao et al. (2021), Calibrate Before Use: Improving Few-Shot Performance of Language Models", url: "https://arxiv.org/abs/2102.09690", kind: "paper" },
  ],
};

export default lesson;
