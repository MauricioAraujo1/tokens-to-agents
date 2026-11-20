import type { LessonContent } from "../../../types/content";

// Benchmarks com as contas no arquivo e notas de brinquedo declaradas no texto: um leaderboard de 5 modelos
// num benchmark de 500 questões com o intervalo de 95% de cada nota (aproximação normal) e quem empata com o
// líder; uma atualização de Elo, E = 1 / (1 + 10^((R_b − R_a) / 400)), R' = R + K · (S − E); e a nota de um
// modelo separada entre questões contaminadas e limpas.

const fixed = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const elo = (value: number) => value.toFixed(1).replace(".", ",");
const listing = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`);

// Passo 3: leaderboard com intervalo de confiança.
const QUESTIONS = 500;
const Z = 1.96;
const board = [
  { label: "modelo 1", score: 0.784 },
  { label: "modelo 2", score: 0.776 },
  { label: "modelo 3", score: 0.76 },
  { label: "modelo 4", score: 0.742 },
  { label: "modelo 5", score: 0.7 },
].map((model) => ({ ...model, half: Z * Math.sqrt((model.score * (1 - model.score)) / QUESTIONS) }));
const leader = board[0];
const leaderLow = leader.score - leader.half;
const tiedWithLeader = board.filter((model) => model !== leader && model.score + model.half >= leaderLow).map((model) => model.label);
const separated = board.filter((model) => model.score + model.half < leaderLow).map((model) => model.label);
const tieCutoff = leaderLow - leader.half;

// Passo 4: uma partida da arena.
const K = 32;
const ratingA = 1000;
const ratingB = 1100;
const expectedA = 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
const newA = ratingA + K * (1 - expectedA);
const newB = ratingB + K * (0 - (1 - expectedA));
const expectedAIfEqual = 1 / (1 + 10 ** 0);

// Passo 5: contaminação.
const contaminated = { total: 30, correct: 27 };
const clean = { total: 170, correct: 119 };
const rate = (part: { total: number; correct: number }) => part.correct / part.total;
const overall = (contaminated.correct + clean.correct) / (contaminated.total + clean.total);
const inflation = overall - rate(clean);

const lesson: LessonContent = {
  id: "16-07",
  subtitle: "O que um benchmark mede de verdade, por que modelos vizinhos num leaderboard muitas vezes empatam, como funciona o Elo de uma arena e como a contaminação infla as notas.",
  objectives: [
    "Explicar o que fixa a nota de um benchmark: questões, protocolo e métrica",
    "Ler um leaderboard com intervalos de confiança e achar os empates",
    "Calcular uma atualização de Elo numa comparação aos pares",
    "Reconhecer contaminação e saturação e o que fazer com elas",
  ],
  steps: [
    {
      id: "same-exam",
      shortTitle: "Mesma prova",
      title: "A mesma prova para todos os candidatos",
      tag: "context",
      body: [
        "O vestibular aplica a mesma prova, no mesmo dia, com a mesma correção, para todos. A nota não diz se o aluno vai ser um bom engenheiro, mas permite comparar milhares de candidatos com a mesma régua. Um [[benchmark|benchmark]] é essa prova para modelos.",
        "O resultado vai para um [[leaderboard|leaderboard]], a tabela de classificação. MMLU (conhecimento em 57 matérias, Hendrycks et al., 2020), HumanEval (código) e GPQA (perguntas de nível de pós-graduação) são exemplos. A aula 16.03 mostrou o limite: o benchmark mede o modelo isolado. Esta aula mostra como ler a tabela sem se enganar.",
      ],
      keyIdea: "Benchmark é uma prova padronizada: compara modelos entre si, não prevê o seu produto.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "exam",
            piece: "block-diagram",
            blocks: [
              { id: "bench", kind: "documents", label: "benchmark", col: 0, row: 0.5 },
              { id: "m1", kind: "llm", label: "modelo 1", col: 1, row: 0 },
              { id: "m2", kind: "llm", label: "modelo 2", col: 1, row: 1 },
              { id: "eval", kind: "eval", label: "mesma correção", col: 2, row: 0.5 },
              { id: "board", kind: "answer", label: "leaderboard", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "bench", to: "m1", label: "mesmo prompt" },
              { from: "bench", to: "m2", label: "mesmo prompt" },
              { from: "m1", to: "eval" },
              { from: "m2", to: "eval" },
              { from: "eval", to: "board" },
            ],
            active: "eval",
          },
        ],
      },
      alt: "As questões do benchmark vão com o mesmo prompt para dois modelos; a mesma correção, em destaque, dá as notas que formam o leaderboard.",
    },
    {
      id: "protocol",
      shortTitle: "Protocolo",
      title: "A nota depende do protocolo",
      tag: "mechanism",
      body: [
        "Uma nota de benchmark não é só “o modelo X fez 78”. Ela depende das questões, do formato do prompt, de quantos exemplos vão no prompt (zero-shot ou 5-shot), de como a resposta é extraída do texto gerado, da métrica e dos parâmetros de geração. Mudar qualquer um desses mexe na nota, às vezes mais que a diferença entre dois modelos.",
        "Por isso, compare só notas medidas com o mesmo protocolo, de preferência pela mesma ferramenta. O HELM (Liang et al., 2022) foi além: avalia cada modelo em muitos cenários e com várias métricas ao mesmo tempo (acurácia, calibração, robustez, viés, toxicidade, eficiência), com prompts padronizados e publicados, porque um único número esconde quase tudo.",
      ],
      keyIdea: "Mesmas questões, mesmo prompt, mesma extração, mesma métrica: só assim as notas se comparam.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "protocol",
            piece: "pipeline",
            stages: [
              { id: "questions", label: "questões" },
              { id: "prompt", label: "prompt e n-shot" },
              { id: "model", label: "modelo" },
              { id: "extract", label: "extração da resposta", color: "danger" },
              { id: "metric", label: "métrica" },
              { id: "score", label: "nota", color: "module-16" },
            ],
            active: "extract",
            done: ["questions", "prompt", "model"],
          },
        ],
      },
      alt: "Pipeline do protocolo de um benchmark: questões, prompt e número de exemplos, modelo, extração da resposta em destaque, métrica e nota.",
    },
    {
      id: "ties",
      shortTitle: "Empates",
      title: "Primeiro lugar, empatado com três",
      tag: "example",
      body: [
        `Cinco modelos num benchmark de ${QUESTIONS} questões (notas de brinquedo). O modelo 1 lidera com ${fixed(leader.score * 100)}%. Com ${QUESTIONS} questões, cada nota tem um intervalo de 95% de cerca de ±${fixed(leader.half * 100)} pontos, a mesma conta da aula 16.01.`,
        `Os intervalos de ${listing(tiedWithLeader)} se sobrepõem ao do líder: com essa prova, não dá para dizer qual deles é melhor. Só o ${listing(separated)} fica claramente atrás. Leaderboards que não mostram intervalo transformam diferenças de ruído em posições. Leia a tabela em grupos, não em lugares.`,
      ],
      keyIdea: "Diferenças menores que o intervalo são empates, por mais que a tabela mostre posições.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "noise",
            piece: "metrics-panel",
            metrics: [
              { id: "half", label: `intervalo com ${QUESTIONS} questões`, value: `±${fixed(leader.half * 100)} pontos` },
              { id: "tied", label: "empatados com o líder", value: String(tiedWithLeader.length), color: "danger" },
            ],
            highlight: "tied",
          },
          {
            id: "board",
            piece: "chart",
            kind: "bar",
            series: board.map((model) => ({ label: model.label, value: Number((model.score * 100).toFixed(1)) })),
            max: 100,
            cutoff: { mode: "threshold", value: Number((tieCutoff * 100).toFixed(1)), label: "empata com o líder" },
            highlight: 0,
            color: "module-16",
          },
        ],
      },
      alt: `Notas dos cinco modelos: ${board.map((model) => `${model.label} ${fixed(model.score * 100)}% ±${fixed(model.half * 100)}`).join(", ")}. Empatam com o líder: ${listing(tiedWithLeader)}; fica atrás: ${listing(separated)}.`,
    },
    {
      id: "arena",
      shortTitle: "Arena",
      title: "Arena: pessoas votam, o Elo conta",
      tag: "mechanism",
      body: [
        "O Chatbot Arena (Chiang et al., 2024) troca a prova fixa por votos: uma pessoa escreve uma pergunta, dois modelos anônimos respondem, e ela escolhe a melhor. As perguntas são do mundo real e mudam todo dia, o que dificulta decorar a prova. Os votos viram uma pontuação no estilo do [[Elo|elo-rating]] do xadrez.",
        `No Elo, a vitória esperada de A contra B é 1 / (1 + 10^((R_B − R_A) / 400)). Com A em ${ratingA} e B em ${ratingB}, A tinha ${fixed(expectedA * 100, 0)}% de chance; entre iguais seria ${fixed(expectedAIfEqual * 100, 0)}%. A venceu: com K = ${K}, sobe ${elo(newA - ratingA)} pontos, para ${elo(newA)}, e B cai para ${elo(newB)}. Vencer o favorito vale mais que vencer o azarão. A arena hoje ajusta todos os votos de uma vez com o modelo de Bradley-Terry, a versão estatística da mesma ideia.`,
      ],
      keyIdea: "Elo transforma comparações aos pares em pontuação: ganhar do favorito rende mais.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "elo",
            piece: "metrics-panel",
            metrics: [
              { id: "expected", label: "chance esperada de A", value: `${fixed(expectedA * 100, 0)}%` },
              { id: "a", label: "A depois de vencer", value: elo(newA), color: "success" },
              { id: "b", label: "B depois de perder", value: elo(newB), color: "danger" },
            ],
            highlight: "a",
          },
          {
            id: "arena",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "pessoa", col: 0, row: 0.5 },
              { id: "a", kind: "llm", label: "modelo anônimo a", col: 1, row: 0 },
              { id: "b", kind: "llm", label: "modelo anônimo b", col: 1, row: 1 },
              { id: "vote", kind: "eval", label: "voto", col: 2, row: 0.5 },
              { id: "elo", kind: "answer", label: "pontuação", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "user", to: "a", label: "pergunta" },
              { from: "user", to: "b", label: "pergunta" },
              { from: "a", to: "vote" },
              { from: "b", to: "vote" },
              { from: "vote", to: "elo", label: "a venceu" },
            ],
            active: "vote",
          },
        ],
      },
      alt: `Uma pessoa manda a pergunta a dois modelos anônimos e vota, em destaque; a pontuação é atualizada. A, com ${ratingA}, tinha ${fixed(expectedA * 100, 0)}% de chance contra B, com ${ratingB}; ao vencer, vai a ${elo(newA)} e B cai a ${elo(newB)}.`,
    },
    {
      id: "contamination",
      shortTitle: "Contaminação",
      title: "Quando o aluno já viu a prova",
      tag: "tradeoff",
      body: [
        `Benchmarks públicos ficam na internet, e a internet vira dado de treino. Isso é [[contaminação|data-contamination]]: o modelo pode ter visto as questões, e às vezes as respostas. Uma checagem comum procura sequências longas de palavras da questão nos dados de treino; o artigo do GPT-3 usou sobreposições de 13 palavras. No exemplo (dados de brinquedo), ${contaminated.total} das ${contaminated.total + clean.total} questões aparecem no treino.`,
        `O modelo acerta ${fixed(rate(contaminated) * 100, 0)}% das contaminadas e ${fixed(rate(clean) * 100, 0)}% das limpas. A nota geral, ${fixed(overall * 100, 1)}%, fica ${fixed(inflation * 100, 1)} pontos acima da nota limpa. O outro problema é a [[saturação|benchmark-saturation]]: quando os melhores modelos passam perto do teto, a prova deixa de separar quem é melhor. As saídas são conjuntos privados, questões novas a cada rodada e reportar a nota só das questões limpas.`,
      ],
      keyIdea: "Nota em benchmark público pode medir memória da prova: separe as questões limpas.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "contamination",
            piece: "chart",
            kind: "bar",
            series: [
              { label: "contaminadas", value: Number((rate(contaminated) * 100).toFixed(1)) },
              { label: "limpas", value: Number((rate(clean) * 100).toFixed(1)) },
              { label: "nota geral", value: Number((overall * 100).toFixed(1)) },
            ],
            max: 100,
            highlight: 0,
            color: "danger",
          },
        ],
      },
      alt: `Acerto do modelo: ${fixed(rate(contaminated) * 100, 0)}% nas questões contaminadas, ${fixed(rate(clean) * 100, 0)}% nas limpas e ${fixed(overall * 100, 1)}% na nota geral, ${fixed(inflation * 100, 1)} pontos inflada.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Ler um leaderboard sem se enganar",
      tag: "summary",
      body: [
        "Um benchmark compara modelos com a mesma régua, desde que o protocolo seja o mesmo. Leia o leaderboard em grupos que o intervalo de confiança separa, desconfie de notas perto do teto e de provas públicas antigas, e prefira arenas e conjuntos privados para diferenças pequenas. No fim, o benchmark monta a lista curta e o eval do seu sistema decide.",
        "Com a régua montada, falta ver o que acontece dentro de cada requisição. A próxima aula abre a caixa preta com rastreamento: traces, spans e as convenções do OpenTelemetry para IA generativa.",
      ],
      keyIdea: "Benchmark seleciona candidatos; intervalo, protocolo e contaminação dizem quanto confiar.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "chips",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "protocol", label: "mesmo protocolo" },
              { id: "ci", label: "intervalo de confiança", color: "module-16" },
              { id: "arena", label: "arena aos pares" },
              { id: "clean", label: "questões limpas", color: "danger" },
              { id: "shortlist", label: "lista curta" },
              { id: "system", label: "eval do sistema", color: "brand" },
            ],
          },
        ],
      },
      alt: "Fluxo em chips: mesmo protocolo, intervalo de confiança, arena aos pares, questões limpas, lista curta e eval do sistema.",
    },
  ],
  realWorldExample:
    "O MMLU (Hendrycks et al., 2020) reuniu questões de múltipla escolha de 57 matérias e virou por anos a nota mais citada de LLMs, até os melhores modelos se aproximarem do teto e a prova perder poder de separação. A resposta da comunidade foram versões mais difíceis e revisadas, benchmarks com questões novas a cada rodada e arenas de votos como o Chatbot Arena, que publica a pontuação de cada modelo com o intervalo de confiança ao lado.",
  code: {
    language: "python",
    source: `def elo_update(r_a: float, r_b: float, a_won: bool, k: float = 32) -> tuple[float, float]:
    expected_a = 1 / (1 + 10 ** ((r_b - r_a) / 400))
    delta = k * ((1.0 if a_won else 0.0) - expected_a)
    return r_a + delta, r_b - delta

print(elo_update(1000, 1100, a_won=True))  # (1020.5, 1079.5)`,
    caption: "Uma atualização de Elo: o azarão que vence ganha mais pontos do que ganharia contra um igual.",
  },
  tradeOffs: {
    pros: [
      "Compara muitos modelos com a mesma régua, de graça",
      "Protocolos publicados, como no HELM, permitem reproduzir as notas",
      "Arenas de votos usam perguntas reais e difíceis de decorar",
    ],
    cons: [
      "Contaminação infla notas de benchmarks públicos",
      "Benchmarks saturados deixam de separar os melhores modelos",
      "A nota mede o modelo isolado, não o seu sistema com os seus dados",
    ],
    alternatives: [
      "Eval próprio do sistema, com casos reais do produto (aula 16.03)",
      "Conjuntos privados ou renovados a cada rodada, que não vazam para o treino",
    ],
  },
  knowledgeCheck: [
    {
      id: "tie",
      prompt: "Num benchmark de 400 questões, o modelo A fez 81% e o B fez 80%. O intervalo de 95% de cada nota é de cerca de ±4 pontos. O que dá para concluir?",
      options: [
        "A é melhor que B",
        "Os dois empatam nessa prova: a diferença é menor que o ruído",
        "B é melhor, porque o intervalo dele é maior",
        "A prova está errada",
      ],
      correct: 1,
      explanation: "Os intervalos se sobrepõem quase por inteiro. Um ponto de diferença com ±4 de incerteza é ruído; seria preciso muito mais questões para separar os dois.",
      lesson: "16-07",
    },
    {
      id: "contamination",
      prompt: "Um modelo novo acerta 95% de um benchmark público de 2021, mas só 62% de uma versão com questões escritas este ano, do mesmo tipo e dificuldade. Qual é a explicação mais provável?",
      options: [
        "As questões novas são mais fáceis",
        "Contaminação: as questões antigas provavelmente estavam nos dados de treino",
        "O modelo esquece com o tempo",
        "A métrica mudou",
      ],
      correct: 1,
      explanation: "Com dificuldade parecida, a queda grande nas questões novas sugere que o modelo viu as antigas no treino. A nota de 95% mede em parte memória da prova.",
      lesson: "16-07",
    },
  ],
  related: ["04-12", "16-03", "16-08"],
  references: [
    { title: "Liang et al. (2022), Holistic Evaluation of Language Models (HELM)", url: "https://arxiv.org/abs/2211.09110", kind: "paper" },
    { title: "Chiang et al. (2024), Chatbot Arena: An Open Platform for Evaluating LLMs by Human Preference", url: "https://arxiv.org/abs/2403.04132", kind: "paper" },
    { title: "Hendrycks et al. (2020), Measuring Massive Multitask Language Understanding (MMLU)", url: "https://arxiv.org/abs/2009.03300", kind: "paper" },
  ],
};

export default lesson;
