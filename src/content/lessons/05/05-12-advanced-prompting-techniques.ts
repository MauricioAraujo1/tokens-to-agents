import type { LessonContent } from "../../../types/content";

// Técnicas avançadas com contas no arquivo: a votação de self-consistency sobre cinco respostas de exemplo
// (escritas à mão), a chance de a maioria acertar pela distribuição binomial (cada amostra acerta com
// probabilidade p, de forma independente) e o número de chamadas ao modelo de cada técnica.

const percent = (value: number) => `${Math.round(value * 100)}%`;
const fixed = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

// Passo 2: cinco raciocínios sorteados para o problema da cantina (resposta certa: 9).
const RIGHT_ANSWER = 9;
const samples = [9, 9, 27, 9, 3];
const answers = [...new Set(samples)];
const votes = answers.map((answer) => samples.filter((sample) => sample === answer).length);
const winner = answers[votes.indexOf(Math.max(...votes))];
const winnerVotes = Math.max(...votes);

// Passo 3: P(maioria certa) com n amostras independentes, cada uma certa com probabilidade p.
const choose = (n: number, k: number): number => {
  let result = 1;
  for (let i = 1; i <= k; i += 1) result = (result * (n - k + i)) / i;
  return result;
};
const majorityCorrect = (n: number, p: number) => {
  let total = 0;
  for (let k = Math.floor(n / 2) + 1; k <= n; k += 1) total += choose(n, k) * p ** k * (1 - p) ** (n - k);
  return total;
};
const P_GOOD = 0.6;
const P_BAD = 0.4;
const sampleCounts = [1, 3, 5, 7, 9, 11, 15];
const curve = sampleCounts.map((n) => majorityCorrect(n, P_GOOD));
const N = 5;
const goodAtN = majorityCorrect(N, P_GOOD);
const badAtN = majorityCorrect(N, P_BAD);

// Passo 6: chamadas ao modelo por técnica.
const CHAIN_STEPS = 4;
const REACT_ITERATIONS = 3;
const TOT_BRANCHING = 3;
const TOT_DEPTH = 3;
const totNodes = Array.from({ length: TOT_DEPTH }, (_, level) => TOT_BRANCHING ** (level + 1)).reduce((sum, value) => sum + value, 0);
const techniques = [
  { label: "prompt único", calls: 1 },
  { label: "CoT", calls: 1 },
  { label: "cadeia", calls: CHAIN_STEPS },
  { label: "ReAct", calls: REACT_ITERATIONS },
  { label: `self-consistency (${N})`, calls: N },
  { label: "árvore, sem poda", calls: totNodes },
];

// Tree of Thoughts (Yao et al., 2023), Game of 24 com GPT-4.
const TOT_COT = 4;
const TOT_RESULT = 74;

const lesson: LessonContent = {
  id: "05-12",
  subtitle: "Técnicas que combinam várias chamadas ao modelo (votação, encadeamento, ReAct e busca em árvore) e como pesar o ganho contra o custo.",
  objectives: [
    "Aplicar self-consistency e calcular quando a votação ajuda e quando atrapalha",
    "Dividir uma tarefa em etapas com prompt chaining",
    "Reconhecer o padrão ReAct e a busca de Tree of Thoughts",
    "Comparar o custo em chamadas de cada técnica",
  ],
  steps: [
    {
      id: "more-calls",
      shortTitle: "Mais chamadas",
      title: "Trocar chamadas por acerto",
      tag: "context",
      body: [
        "Se você pergunta a mesma conta difícil a cinco colegas e três dão o mesmo número, você confia mais nesse número do que na resposta de um só. As técnicas avançadas de prompting fazem algo parecido: em vez de uma chamada ao modelo, várias, combinadas por um procedimento escrito no código.",
        `A primeira é [[self-consistency|self-consistency]] (Wang et al., 2022): sorteie vários raciocínios para a mesma pergunta, com [[temperatura|temperature]] acima de zero, e fique com a resposta final mais votada. No problema da cantina, as ${samples.length} amostras deram ${samples.join(", ")}; a maioria fica com ${winner}.`,
      ],
      keyIdea: "Técnicas avançadas gastam mais chamadas ao modelo, combinadas por código, para errar menos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "pergunta", col: 0, row: 0.5 },
              { id: "llm", kind: "llm", label: `${samples.length} amostras`, col: 1, row: 0.5 },
              { id: "agree", kind: "answer", label: `${winner} · ${winner} · ${winner}`, col: 2, row: 0 },
              { id: "other", kind: "no-result", label: samples.filter((sample) => sample !== winner).join(" · "), col: 2, row: 1 },
              { id: "vote", kind: "eval", label: "maioria", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "user", to: "llm" },
              { from: "llm", to: "agree", label: "T > 0" },
              { from: "llm", to: "other", variant: "alternative" },
              { from: "agree", to: "vote" },
              { from: "other", to: "vote" },
            ],
            active: "vote",
          },
        ],
      },
      alt: `A pergunta é respondida ${samples.length} vezes pelo LLM com temperatura acima de zero; três respostas dão ${winner} e as outras dão ${samples.filter((sample) => sample !== winner).join(" e ")}; a votação, em destaque, fica com ${winner}.`,
    },
    {
      id: "vote",
      shortTitle: "Votação",
      title: "Raciocínios diferentes, mesma resposta",
      tag: "mechanism",
      body: [
        "O que se vota é só a resposta final, não o texto do raciocínio. Cada amostra pode seguir um caminho diferente: uma subtrai primeiro, outra escreve uma equação. Quando caminhos diferentes chegam ao mesmo número, é mais provável que ele esteja certo, porque os erros tendem a se espalhar em respostas diferentes.",
        `Aqui, ${winner} teve ${winnerVotes} de ${samples.length} votos, e a fração de concordância (${percent(winnerVotes / samples.length)}) é um bônus: serve como medida de confiança. Concordância baixa indica uma pergunta difícil ou ambígua, boa candidata para revisão humana. A técnica exige respostas comparáveis (um número, uma opção), por isso combina com saídas estruturadas.`,
      ],
      keyIdea: "Vote na resposta final; a fração de concordância é uma medida de confiança de brinde.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "votes",
            piece: "chart",
            kind: "bar",
            series: answers.map((answer, index) => ({ label: `${answer}`, value: votes[index] })),
            max: samples.length,
            highlight: answers.indexOf(RIGHT_ANSWER),
            color: "module-05",
          },
        ],
      },
      alt: `Votos por resposta entre ${samples.length} amostras: ${answers.map((answer, index) => `${answer} com ${votes[index]}`).join(", ")}. A resposta ${winner} vence.`,
    },
    {
      id: "binomial",
      shortTitle: "Por quê",
      title: "Quando a maioria acerta mais",
      tag: "mechanism",
      body: [
        `Um modelo simples explica o ganho: cada amostra acerta com probabilidade p, de forma independente, e vale a maioria. Com p = ${fixed(P_GOOD)}, uma amostra acerta ${percent(curve[0])}; a maioria de ${N} acerta ${percent(goodAtN)}; a de ${sampleCounts[sampleCounts.length - 1]}, ${percent(curve[curve.length - 1])}. O ganho é real, mas cada amostra a mais rende menos que a anterior.`,
        `O mesmo cálculo mostra o limite: com p = ${fixed(P_BAD)}, a maioria de ${N} acerta só ${percent(badAtN)}, pior que uma amostra. Votar amplifica o que o modelo já tende a fazer. Na prática é um pouco melhor que o cálculo, porque as respostas erradas se dividem entre vários valores e a certa vence por pluralidade; mas amostras do mesmo modelo não são independentes, então o ganho real é menor que o da conta.`,
      ],
      keyIdea: "A votação amplifica a tendência do modelo: ajuda quando cada amostra acerta mais do que erra, e atrapalha no caso contrário.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "curve",
            piece: "chart",
            kind: "line",
            series: sampleCounts.map((n, index) => ({ label: `${n}`, value: Number(curve[index].toFixed(3)) })),
            max: 1,
            highlight: sampleCounts.indexOf(N),
            color: "module-05",
          },
          {
            id: "limits",
            piece: "metrics-panel",
            metrics: [
              { id: "good", label: `p = ${fixed(P_GOOD)}, maioria de ${N}`, value: percent(goodAtN), color: "success" },
              { id: "bad", label: `p = ${fixed(P_BAD)}, maioria de ${N}`, value: percent(badAtN), color: "danger" },
            ],
            highlight: "bad",
          },
        ],
      },
      alt: `Chance de a maioria acertar com p = ${fixed(P_GOOD)}: ${sampleCounts.map((n, index) => `${n} ${n === 1 ? "amostra" : "amostras"} ${percent(curve[index])}`).join(", ")}. Com p = ${fixed(P_BAD)}, a maioria de ${N} acerta ${percent(badAtN)}.`,
    },
    {
      id: "chaining",
      shortTitle: "Encadear",
      title: "Uma tarefa grande em etapas pequenas",
      tag: "mechanism",
      body: [
        "Um prompt que pede para ler um contrato, extrair as cláusulas, comparar com a política e redigir um parecer faz quatro coisas ao mesmo tempo, e erra em qualquer uma. Com [[prompt chaining|prompt-chaining]], cada etapa é uma chamada com um prompt focado, e a saída de uma vira a entrada da seguinte.",
        "Cada etapa pode ser testada, ter o seu eval e usar o modelo adequado (um pequeno e barato para extrair, um maior para redigir). Entre as etapas, o código valida o resultado intermediário, por exemplo o JSON das cláusulas, e para a cadeia se algo vier errado. Self-Refine (Madaan et al., 2023) é uma cadeia especial: gerar, criticar a própria saída e reescrever.",
      ],
      keyIdea: "Encadear = uma etapa por prompt, com validação entre as etapas; cada uma é testável sozinha.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "chain",
            piece: "pipeline",
            stages: [
              { id: "extract", label: "extrair cláusulas" },
              { id: "validate", label: "validar JSON" },
              { id: "compare", label: "comparar com a política", color: "module-05" },
              { id: "draft", label: "redigir parecer" },
              { id: "review", label: "revisar" },
            ],
            active: "compare",
            done: ["extract", "validate"],
            branch: { id: "stop", label: "parar e alertar", from: "validate", edgeLabel: "inválido", color: "danger" },
          },
        ],
      },
      alt: "Cadeia de etapas: extrair cláusulas, validar o JSON, comparar com a política, em destaque, redigir o parecer e revisar; se o JSON for inválido, um ramo tracejado para a cadeia e alerta.",
    },
    {
      id: "react-tot",
      shortTitle: "ReAct e ToT",
      title: "Pensar, agir, observar e buscar em árvore",
      tag: "example",
      body: [
        "[[ReAct|react-prompting]] (Yao et al., 2022) intercala raciocínio e ação: o modelo escreve um pensamento, chama uma ferramenta, lê a observação e decide o próximo passo. É o que transforma o tool calling da aula 05.10 num ciclo, e é a base dos agentes do módulo 12. As observações reais corrigem o raciocínio, em vez de o modelo inventar fatos.",
        `[[Tree of Thoughts|tree-of-thoughts]] (Yao et al., 2023) vai além: em cada ponto, gera vários próximos passos candidatos, pede ao modelo para avaliar cada um e explora os melhores, voltando atrás quando um caminho morre. No Game of 24, em que é preciso combinar quatro números para chegar a 24, o GPT-4 com chain of thought resolveu ${TOT_COT}% dos problemas e com Tree of Thoughts, ${TOT_RESULT}%.`,
      ],
      keyIdea: "ReAct alterna pensamento e ferramenta; Tree of Thoughts busca entre vários caminhos e volta atrás.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "react",
            piece: "agent-loop",
            phases: [
              { id: "thought", label: "pensamento" },
              { id: "action", label: "ação" },
              { id: "observation", label: "observação" },
            ],
            active: "observation",
            iteration: 2,
            maxIterations: REACT_ITERATIONS,
            tool: 'buscar("prazo de troca")',
          },
        ],
      },
      alt: `Ciclo ReAct com pensamento, ação e observação, em destaque; na iteração 2 de ${REACT_ITERATIONS}, a ação foi buscar o prazo de troca.`,
    },
    {
      id: "cost",
      shortTitle: "Custo",
      title: "Quantas chamadas cada técnica faz",
      tag: "tradeoff",
      body: [
        `Um prompt único e um CoT fazem 1 chamada. Uma cadeia de ${CHAIN_STEPS} etapas faz ${CHAIN_STEPS}; ReAct com ${REACT_ITERATIONS} iterações, ${REACT_ITERATIONS}; self-consistency com ${N} amostras, ${N}. Uma árvore com ${TOT_BRANCHING} candidatos por nível e ${TOT_DEPTH} níveis, sem poda, gera ${totNodes} passos, e cada um ainda precisa ser avaliado.`,
        "Custo e latência crescem junto: chamadas em sequência (cadeia, ReAct) somam a latência; chamadas independentes (self-consistency) podem rodar em paralelo, mas multiplicam o preço. A regra é a do módulo inteiro: comece pelo prompt mais simples que passa no eval, e só acrescente chamadas quando o ganho medido pagar o custo.",
      ],
      keyIdea: "Cada técnica multiplica chamadas; escolha a mais barata que passa no eval.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "calls",
            piece: "chart",
            kind: "bar",
            series: techniques.map((technique) => ({ label: technique.label, value: technique.calls })),
            highlight: techniques.length - 1,
            color: "module-05",
          },
        ],
      },
      alt: `Chamadas ao modelo por técnica: ${techniques.map((technique) => `${technique.label} ${technique.calls}`).join(", ")}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "O módulo em um sistema",
      tag: "summary",
      body: [
        "O módulo inteiro cabe num sistema: um template versionado monta papéis, instrução, contexto e exemplos; o modelo raciocina, devolve JSON ou chama ferramentas; o código valida, protege contra injeção e, quando o eval pede, combina várias chamadas por votação ou encadeamento.",
        "Muitos desses passos dependem de achar o contexto certo: os exemplos parecidos, os documentos relevantes. O próximo módulo começa por aí: embeddings e bancos vetoriais, a base da busca por significado.",
      ],
      keyIdea: "Prompt engineering é engenharia de sistema: template, modelo, validação, ferramentas e eval trabalhando juntos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "template", kind: "context", label: "template + exemplos", col: 0, row: 0.5 },
              { id: "llm", kind: "llm", label: "llm", col: 1, row: 0.5 },
              { id: "tool", kind: "tool", label: "ferramentas", col: 2, row: 0 },
              { id: "guard", kind: "guardrail", label: "valida json", col: 2, row: 1 },
              { id: "eval", kind: "eval", label: "eval + votação", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "template", to: "llm" },
              { from: "llm", to: "tool", label: "tool_call" },
              { from: "llm", to: "guard", label: "saída" },
              { from: "guard", to: "eval" },
              { from: "tool", to: "eval" },
            ],
            active: "eval",
            done: ["template", "llm", "tool", "guard"],
          },
        ],
      },
      alt: "O template com exemplos alimenta o LLM, que chama ferramentas ou devolve uma saída validada como JSON; tudo termina no eval com votação, em destaque.",
    },
  ],
  realWorldExample: `No artigo de self-consistency, Wang et al. (2022) relataram ganho de 17,9 pontos percentuais no GSM8K sobre o chain of thought com uma única amostra. No artigo de Tree of Thoughts, Yao et al. (2023) mostraram o GPT-4 subindo de ${TOT_COT}% para ${TOT_RESULT}% de acerto no Game of 24 com busca em árvore, ao custo de muito mais chamadas por problema.`,
  code: {
    language: "python",
    source: `from collections import Counter

def self_consistency(question: str, call_model, n: int = 5) -> tuple[str, float]:
    answers = [
        call_model(question, temperature=0.7)["resposta"]
        for _ in range(n)
    ]
    answer, votes = Counter(answers).most_common(1)[0]
    return answer, votes / n`,
    caption: "Self-consistency: n amostras com temperatura acima de zero, voto na resposta final (um campo estruturado) e a fração de concordância como confiança.",
  },
  tradeOffs: {
    pros: [
      "Self-consistency melhora tarefas de raciocínio e dá uma medida de confiança",
      "Cadeias tornam cada etapa testável e permitem modelos diferentes por etapa",
      "ReAct ancora o raciocínio em observações reais de ferramentas",
    ],
    cons: [
      "Multiplicam chamadas, custo e, nas sequenciais, latência",
      "Votar amplifica o erro quando o modelo erra mais do que acerta",
      "Mais peças para orquestrar, depurar e monitorar",
    ],
    alternatives: ["Um modelo de raciocínio numa chamada só", "Fine-tuning, quando a tarefa é estável e o volume é alto", "Otimizadores de prompt como DSPy, que ajustam instruções e exemplos contra um eval"],
  },
  knowledgeCheck: [
    {
      id: "vote-hurts",
      prompt: "Num eval, cada amostra acerta 35% das vezes e, quando erra, quase sempre dá a mesma resposta errada. Usar self-consistency com 7 amostras tende a:",
      options: [
        "Subir a acurácia para perto de 100%",
        "Não melhorar, e pode piorar, porque a votação amplifica uma tendência que erra mais do que acerta",
        "Dar sempre 35%",
        "Zerar os erros de formato",
      ],
      correct: 1,
      explanation: "Com p abaixo de 0,5 e o erro concentrado numa resposta, a maioria tende ao erro. A votação ajuda quando cada amostra acerta mais do que erra, ou quando os erros se espalham entre muitas respostas.",
      lesson: "05-12",
    },
    {
      id: "pick-technique",
      prompt: "Um fluxo extrai dados de uma nota fiscal, confere com o pedido no ERP e escreve um e-mail ao fornecedor. Qual estrutura combina melhor?",
      options: [
        "Um prompt gigante que faz tudo de uma vez",
        "Prompt chaining: extrair (com JSON validado), consultar o ERP por ferramenta e redigir, com validação entre as etapas",
        "Self-consistency com 20 amostras do prompt gigante",
        "Tree of Thoughts",
      ],
      correct: 1,
      explanation: "São etapas diferentes com saídas verificáveis. Encadear dá um prompt focado por etapa, validação no meio e a consulta ao ERP feita por ferramenta.",
      lesson: "05-12",
    },
  ],
  related: ["05-07", "12-06", "16-06"],
  references: [
    { title: "Wang et al. (2022), Self-Consistency Improves Chain of Thought Reasoning in Language Models", url: "https://arxiv.org/abs/2203.11171", kind: "paper" },
    { title: "Yao et al. (2022), ReAct: Synergizing Reasoning and Acting in Language Models", url: "https://arxiv.org/abs/2210.03629", kind: "paper" },
    { title: "Yao et al. (2023), Tree of Thoughts: Deliberate Problem Solving with Large Language Models", url: "https://arxiv.org/abs/2305.10601", kind: "paper" },
  ],
};

export default lesson;
