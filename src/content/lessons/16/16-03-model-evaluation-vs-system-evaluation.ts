import type { LessonContent } from "../../../types/content";

// Modelo contra sistema, com as contas no arquivo. Dois modelos com notas de brinquedo num benchmark e em cada
// peça de um assistente RAG; a taxa de sucesso fim a fim é o produto das taxas das peças (supondo falhas
// independentes). Depois, 40 conversas que falharam, rotuladas pela peça que causou a falha (contagens de
// brinquedo, declaradas no texto).

const fixed = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const percent = (value: number, digits = 1) => `${fixed(value * 100, digits)}%`;

// Passo 3: notas de cada modelo no benchmark e nas peças do sistema.
const RETRIEVAL_RECALL = 0.85;
const NO_FALSE_BLOCK = 0.98;
const models = [
  { label: "modelo A", benchmark: 0.82, json: 0.9, correct: 0.88 },
  { label: "modelo B", benchmark: 0.76, json: 0.99, correct: 0.84 },
].map((model) => ({ ...model, endToEnd: RETRIEVAL_RECALL * model.json * model.correct * NO_FALSE_BLOCK }));
const [modelA, modelB] = models;
const benchmarkGap = modelA.benchmark - modelB.benchmark;
const systemGap = modelB.endToEnd - modelA.endToEnd;
const columns = ["benchmark", "recall da busca", "JSON válido", "resposta certa", "sem bloqueio indevido", "fim a fim"];

// Passo 4: 40 conversas que falharam, pela peça culpada.
const failures = [
  { label: "busca", count: 14 },
  { label: "geração", count: 9 },
  { label: "ferramenta", count: 7 },
  { label: "formato", count: 6 },
  { label: "guardrail", count: 4 },
];
const totalFailures = failures.reduce((total, item) => total + item.count, 0);
const modelFailures = failures.filter((item) => item.label === "geração" || item.label === "formato").reduce((total, item) => total + item.count, 0);
const outsideModel = totalFailures - modelFailures;
const top = failures[0];

const lesson: LessonContent = {
  id: "16-03",
  subtitle: "Por que o modelo com a maior nota no benchmark pode perder dentro do seu produto, e como avaliar o sistema inteiro e cada peça dele.",
  objectives: [
    "Diferenciar avaliação do modelo isolado e avaliação do sistema",
    "Calcular a taxa de sucesso fim a fim a partir das peças do pipeline",
    "Usar análise de erros para atribuir falhas a cada componente",
    "Decidir quando usar benchmark público, eval do sistema e evals por componente",
  ],
  steps: [
    {
      id: "engine",
      shortTitle: "O motor",
      title: "O motor no banco de testes",
      tag: "context",
      body: [
        "Um motor pode render muito no dinamômetro e ainda assim o carro ser ruim: câmbio mal escolhido, pneus errados, peso demais. Ninguém compra carro pela potência do motor medida na bancada, e sim pelo que ele faz na estrada.",
        "Avaliar o modelo é a bancada: o LLM sozinho, num conjunto de tarefas padronizado, com o mesmo prompt para todos. Responde perguntas como “qual modelo sabe mais matemática?”. É o que os [[benchmarks|benchmark]] públicos medem, e serve para comparar modelos entre si, não para prever como eles vão se sair no seu produto.",
      ],
      keyIdea: "Avaliar o modelo mede a peça; o usuário só vê o sistema montado.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "bench",
            piece: "block-diagram",
            blocks: [
              { id: "tasks", kind: "documents", label: "benchmark", col: 0, row: 0 },
              { id: "llm", kind: "llm", label: "modelo isolado", col: 1, row: 0 },
              { id: "eval", kind: "eval", label: "nota do modelo", col: 2, row: 0 },
            ],
            edges: [
              { from: "tasks", to: "llm", label: "prompt fixo" },
              { from: "llm", to: "eval", label: "respostas" },
            ],
            active: "llm",
          },
        ],
      },
      alt: "As tarefas do benchmark vão com um prompt fixo para o modelo isolado, em destaque, e as respostas viram a nota do modelo.",
    },
    {
      id: "system",
      shortTitle: "O sistema",
      title: "O usuário conversa com o pipeline inteiro",
      tag: "mechanism",
      body: [
        "No produto, a pergunta passa por um guardrail de entrada, uma busca nos documentos, a montagem do contexto, o modelo, talvez uma ferramenta, e a validação do formato. Cada peça pode falhar, e as falhas se multiplicam: se a busca traz o trecho certo em 85% das vezes e o modelo acerta 88% quando tem o trecho, o sistema acerta no máximo 0,85 × 0,88 ≈ 75%.",
        "A [[avaliação do sistema|system-evaluation]] roda casos reais do produto pelo pipeline completo e confere só o que o usuário recebe. A [[avaliação por componente|component-evaluation]] isola uma peça com um critério próprio: recall@k para a busca, faithfulness para a geração, argumentos válidos para a ferramenta. A primeira diz se está bom; a segunda diz onde consertar.",
      ],
      keyIdea: "Sucesso fim a fim ≈ produto das taxas de sucesso das peças.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "pipeline",
            piece: "block-diagram",
            blocks: [
              { id: "phone", kind: "phone", label: "pergunta", col: 0, row: 0 },
              { id: "guard", kind: "guardrail", label: "guardrail", col: 1, row: 0 },
              { id: "search", kind: "retrieval", label: "busca", col: 2, row: 0 },
              { id: "llm", kind: "llm", label: "modelo", col: 3, row: 0 },
              { id: "tool", kind: "tool", label: "ferramenta", col: 3, row: 1 },
              { id: "eval", kind: "eval", label: "fim a fim", col: 2, row: 1 },
            ],
            edges: [
              { from: "phone", to: "guard" },
              { from: "guard", to: "search" },
              { from: "search", to: "llm", label: "trechos" },
              { from: "llm", to: "tool", label: "chamada" },
              { from: "tool", to: "eval", label: "resposta final" },
            ],
            active: "eval",
            done: ["phone", "guard", "search", "llm", "tool"],
          },
        ],
      },
      alt: "A pergunta passa por guardrail, busca, modelo e ferramenta; o eval fim a fim, em destaque, confere só a resposta final que sai do pipeline.",
    },
    {
      id: "swap",
      shortTitle: "A ou B",
      title: "O campeão da bancada perde na estrada",
      tag: "example",
      body: [
        `Dois modelos candidatos (notas de brinquedo). O modelo A tem ${fixed(benchmarkGap * 100, 0)} pontos a mais no benchmark: ${percent(modelA.benchmark, 0)} contra ${percent(modelB.benchmark, 0)}. No sistema, a busca é a mesma para os dois (recall ${percent(RETRIEVAL_RECALL, 0)}) e o guardrail deixa passar ${percent(NO_FALSE_BLOCK, 0)} das perguntas legítimas. Muda o resto: o A responde melhor quando tem o trecho, mas quebra o JSON em ${percent(1 - modelA.json, 0)} das respostas.`,
        `Multiplicando as peças, o A acerta ${percent(modelA.endToEnd)} fim a fim e o B, ${percent(modelB.endToEnd)}: ${fixed(systemGap * 100)} pontos a favor do modelo com nota menor. O benchmark não mede seguir o seu formato, nem lidar com os seus trechos. Só o eval do sistema, com os seus casos, decide a troca.`,
      ],
      keyIdea: "Escolha o modelo pelo eval do sistema; o benchmark só monta a lista de candidatos.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "e2e",
            piece: "metrics-panel",
            metrics: [
              { id: "a", label: "A fim a fim", value: percent(modelA.endToEnd) },
              { id: "b", label: "B fim a fim", value: percent(modelB.endToEnd), color: "success" },
              { id: "bench", label: "vantagem do A no benchmark", value: `${fixed(benchmarkGap * 100, 0)} pontos`, color: "danger" },
            ],
            highlight: "b",
          },
          {
            id: "table",
            piece: "matrix",
            rows: models.map((model) => model.label),
            cols: columns,
            values: models.map((model) => [model.benchmark, RETRIEVAL_RECALL, model.json, model.correct, NO_FALSE_BLOCK, model.endToEnd].map((value) => Number(value.toFixed(2)))),
            scale: { min: 0.6, max: 1 },
            highlight: { row: 1, col: columns.length - 1 },
            showValues: true,
            color: "module-16",
          },
        ],
      },
      alt: `Notas dos dois modelos: ${models.map((model) => `${model.label}: benchmark ${percent(model.benchmark, 0)}, JSON válido ${percent(model.json, 0)}, resposta certa ${percent(model.correct, 0)}, fim a fim ${percent(model.endToEnd)}`).join("; ")}. O B vence no sistema.`,
    },
    {
      id: "errors",
      shortTitle: "Erros",
      title: "Ler as falhas antes de trocar o modelo",
      tag: "mechanism",
      body: [
        `Quando a nota do sistema decepciona, o reflexo é trocar de modelo. Antes, faça [[análise de erros|error-analysis]]: leia as conversas que falharam e anote a peça culpada de cada uma. Nas ${totalFailures} falhas do exemplo (contagens de brinquedo), a ${top.label} lidera com ${top.count}.`,
        `Só ${modelFailures} das ${totalFailures} falhas são do modelo (geração e formato). As outras ${outsideModel} estão na busca, nas ferramentas e no guardrail, e continuariam lá com qualquer modelo. É o mesmo raciocínio do diagnóstico de RAG da aula 08.15, estendido ao pipeline inteiro: a contagem por peça diz onde investir a próxima semana.`,
      ],
      keyIdea: "Conte as falhas por peça: o maior grupo é o próximo conserto.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "failures",
            piece: "chart",
            kind: "bar",
            series: failures.map((item) => ({ label: item.label, value: item.count })),
            highlight: 0,
            color: "module-16",
          },
        ],
      },
      alt: `${totalFailures} conversas que falharam, pela peça culpada: ${failures.map((item) => `${item.label} ${item.count}`).join(", ")}. Só ${modelFailures} são do modelo.`,
    },
    {
      id: "layers",
      shortTitle: "Camadas",
      title: "Um eval para cada peça e um para o todo",
      tag: "tradeoff",
      body: [
        "Os três níveis custam e respondem coisas diferentes. Benchmarks públicos são de graça e servem para montar a lista curta de modelos. Evals por componente são rápidos, baratos e apontam a peça quebrada, mas uma peça boa sozinha não garante o todo. O eval fim a fim é o mais caro e o mais lento, e é o único que mede o que o usuário vê.",
        "Na prática, os evals por componente rodam a cada mudança na peça, como testes unitários, e o eval fim a fim roda antes de cada versão, como um teste de integração. Quando um componente melhora e o fim a fim não se mexe, o gargalo está em outra peça.",
      ],
      keyIdea: "Componente é teste unitário; fim a fim é teste de integração. Você precisa dos dois.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "layers",
            piece: "block-diagram",
            blocks: [
              { id: "search", kind: "retrieval", label: "busca", col: 0, row: 0 },
              { id: "llm", kind: "llm", label: "modelo", col: 1, row: 0 },
              { id: "answer", kind: "answer", label: "resposta", col: 2, row: 0 },
              { id: "eval-search", kind: "eval", label: "recall@k", col: 0, row: 1 },
              { id: "eval-llm", kind: "eval", label: "faithfulness", col: 1, row: 1 },
              { id: "eval-e2e", kind: "eval", label: "fim a fim", col: 2, row: 1 },
            ],
            edges: [
              { from: "search", to: "llm" },
              { from: "llm", to: "answer" },
              { from: "search", to: "eval-search" },
              { from: "llm", to: "eval-llm" },
              { from: "answer", to: "eval-e2e" },
            ],
            active: "eval-e2e",
          },
        ],
      },
      alt: "Busca, modelo e resposta em linha; embaixo de cada um, o seu eval: recall@k para a busca, faithfulness para o modelo e o eval fim a fim, em destaque, para a resposta.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Da lista curta à decisão",
      tag: "summary",
      body: [
        "Benchmark público para montar a lista de candidatos; eval do sistema, com os seus casos, para decidir; análise de erros e evals por componente para saber o que consertar. O modelo é só uma das peças, e muitas vezes não é a que mais falha.",
        "A próxima aula aplica essa visão em camadas ao RAG: como avaliar busca e geração em escala, com citações, perguntas sintéticas e amostras do tráfego de produção.",
      ],
      keyIdea: "Benchmark seleciona, eval do sistema decide, análise de erros direciona.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "bench", label: "benchmark público" },
              { id: "shortlist", label: "lista curta" },
              { id: "system", label: "eval do sistema", color: "module-16" },
              { id: "errors", label: "análise de erros" },
              { id: "components", label: "evals por componente" },
              { id: "decision", label: "decisão", color: "brand" },
            ],
          },
        ],
      },
      alt: "Fluxo em chips: benchmark público, lista curta, eval do sistema, análise de erros, evals por componente e decisão.",
    },
  ],
  realWorldExample:
    "No SWE-bench, que mede se um agente resolve issues reais de repositórios Python, o mesmo modelo de base tira notas bem diferentes conforme o sistema em volta dele: o artigo do SWE-agent (Yang et al., 2024) mostrou que só redesenhar as ferramentas e os comandos que o modelo usa para ler e editar arquivos muda a taxa de resolução. Por isso o leaderboard do SWE-bench lista o sistema submetido, e não só o nome do modelo.",
  code: {
    language: "python",
    source: `from collections import Counter

def end_to_end(stages: dict[str, float]) -> float:
    rate = 1.0
    for success in stages.values():
        rate *= success
    return rate

print(end_to_end({"busca": 0.85, "json": 0.99, "resposta": 0.84, "guardrail": 0.98}))  # 0.69

failed = [{"id": 1, "culpa": "busca"}, {"id": 2, "culpa": "ferramenta"}, {"id": 3, "culpa": "busca"}]
print(Counter(item["culpa"] for item in failed).most_common())`,
    caption: "A taxa fim a fim como produto das peças, e a contagem de falhas por componente a partir das conversas rotuladas.",
  },
  tradeOffs: {
    pros: [
      "O eval do sistema mede o que o usuário realmente recebe",
      "Evals por componente apontam a peça quebrada e rodam rápido",
      "Análise de erros evita trocar de modelo quando o problema está em outra peça",
    ],
    cons: [
      "O eval fim a fim é caro, lento e muda sempre que qualquer peça muda",
      "Rotular a peça culpada de cada falha exige ler conversas, uma a uma",
      "Peças boas isoladamente podem falhar juntas, por interações que nenhum eval por componente vê",
    ],
    alternatives: [
      "Benchmarks públicos, para uma primeira seleção barata de modelos",
      "Testes A/B em produção, quando o tráfego permite medir o efeito real da troca",
    ],
  },
  knowledgeCheck: [
    {
      id: "product",
      prompt: "A busca traz o trecho certo em 90% das perguntas, o modelo acerta 80% quando tem o trecho e o formato é válido em 95%. Qual é, no máximo, a taxa de sucesso fim a fim?",
      options: ["Cerca de 80%", "Cerca de 68%", "Cerca de 90%", "Cerca de 88%"],
      correct: 1,
      explanation: "Supondo falhas independentes, 0,90 × 0,80 × 0,95 ≈ 0,68. O sistema nunca é melhor que o produto das peças.",
      lesson: "16-03",
    },
    {
      id: "attribution",
      prompt: "Das 50 falhas analisadas, 30 vieram da busca e 8 do modelo. A equipe quer trocar o modelo por um maior. O que a análise sugere?",
      options: [
        "Trocar o modelo, porque resolve as 50 falhas",
        "Investir primeiro na busca: trocar o modelo atacaria no máximo 8 das 50 falhas",
        "Trocar o guardrail",
        "Ignorar a análise e olhar o benchmark",
      ],
      correct: 1,
      explanation: "A troca de modelo só mexe nas falhas do modelo. As 30 falhas da busca continuariam lá, e são o maior grupo.",
      lesson: "16-03",
    },
  ],
  related: ["04-12", "16-02", "16-04"],
  references: [
    { title: "Liang et al. (2022), Holistic Evaluation of Language Models (HELM)", url: "https://arxiv.org/abs/2211.09110", kind: "paper" },
    { title: "Yang et al. (2024), SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering", url: "https://arxiv.org/abs/2405.15793", kind: "paper" },
    { title: "Hamel Husain, Your AI Product Needs Evals", url: "https://hamel.dev/blog/posts/evals/", kind: "article" },
  ],
};

export default lesson;
