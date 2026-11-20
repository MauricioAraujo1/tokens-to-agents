import type { BlockDiagramSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Avaliação de LLM com as contas no arquivo: 10 casos de um assistente de suporte, aprovados ou reprovados
// em duas versões do prompt (resultados de brinquedo, declarados no texto); a taxa de acerto de cada versão,
// as melhorias e regressões caso a caso, e a meia largura do intervalo de 95% pela aproximação normal,
// 1,96 · √(p · (1 − p) / n), para tamanhos de amostra de 10 a 800 casos.

const fixed = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const percent = (value: number, digits = 0) => `${fixed(value * 100, digits)}%`;
const points = (value: number) => `±${fixed(value * 100, 0)} pontos`;
const listing = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`);

// Passo 3: os mesmos 10 casos nas versões A e B do prompt (1 = aprovado pelo critério do caso).
const cases = ["senha", "boleto", "troca", "prazo", "cancelar", "nota fiscal", "endereço", "cupom", "frete", "garantia"];
const versionA = [1, 1, 0, 1, 0, 1, 1, 0, 1, 0];
const versionB = [1, 1, 1, 1, 1, 0, 1, 1, 1, 0];
const passRate = (results: number[]) => results.reduce((total, value) => total + value, 0) / results.length;
const rateA = passRate(versionA);
const rateB = passRate(versionB);
const improved = cases.filter((_, index) => versionA[index] === 0 && versionB[index] === 1);
const regressed = cases.filter((_, index) => versionA[index] === 1 && versionB[index] === 0);
const REGRESSED_INDEX = cases.indexOf(regressed[0]);

// Passo 4: meia largura do intervalo de 95% conforme o tamanho da amostra.
const Z = 1.96;
const halfWidth = (p: number, n: number) => Z * Math.sqrt((p * (1 - p)) / n);
const halfA = halfWidth(rateA, cases.length);
const halfB = halfWidth(rateB, cases.length);
const sizes = [10, 25, 50, 100, 200, 400, 800];
const widthSeries = sizes.map((n) => ({ label: `n = ${n}`, value: Number((halfWidth(rateB, n) * 100).toFixed(1)) }));
const TARGET = 0.05;
const neededCases = Math.ceil((Z * Z * rateB * (1 - rateB)) / (TARGET * TARGET));
const QUADRUPLE = 4;

const loop = (active: string, done?: string[]): BlockDiagramSpec => ({
  id: "loop",
  piece: "block-diagram",
  blocks: [
    { id: "cases", kind: "documents", label: "casos de teste", col: 0, row: 0.5 },
    { id: "app", kind: "app", label: "assistente", col: 1, row: 0.5 },
    { id: "answer", kind: "answer", label: "respostas", col: 2, row: 0.5 },
    { id: "eval", kind: "eval", label: "critério + nota", col: 3, row: 0.5 },
  ],
  edges: [
    { from: "cases", to: "app", label: "entradas" },
    { from: "app", to: "answer" },
    { from: "answer", to: "eval", label: "confere" },
  ],
  active,
  done,
});

const lesson: LessonContent = {
  id: "16-01",
  subtitle: "Por que testar alguns exemplos na mão não basta, e como casos, critérios e notas transformam a qualidade de um app com LLM num número que dá para comparar.",
  objectives: [
    "Explicar por que saídas abertas e não determinísticas exigem avaliação sistemática",
    "Montar um eval com casos, critério de acerto e nota agregada",
    "Comparar duas versões caso a caso e achar regressões escondidas na média",
    "Estimar a incerteza de uma nota pelo tamanho da amostra e diferenciar avaliação offline e online",
  ],
  steps: [
    {
      id: "vibes",
      shortTitle: "No olho",
      title: "Provar uma colherada não é inspeção sanitária",
      tag: "context",
      body: [
        "Um cozinheiro prova o molho e acha que está bom. Um restaurante com mil pratos por dia precisa de outra coisa: uma lista do que conferir, aplicada sempre do mesmo jeito. Quem muda o prompt de um assistente e testa três perguntas no chat está provando uma colherada. A mudança pode ter consertado essas três e quebrado outras dez.",
        "[[Avaliação de LLM|llm-evaluation]] é medir a qualidade de um modelo ou de um app com LLM de forma repetível. O problema é mais difícil que testar código comum: a mesma entrada pode gerar respostas diferentes a cada chamada, e muitas respostas certas são escritas de jeitos diferentes. Por isso o teste não compara strings: aplica um critério de acerto a cada caso e agrega o resultado numa nota.",
      ],
      keyIdea: "Sem um conjunto fixo de casos e um critério, cada mudança no prompt é um palpite.",
      scene: { kind: "pieces", layout: "single", pieces: [loop("app")] },
      alt: "Casos de teste entram no assistente, em destaque, que produz respostas; um critério confere cada uma e dá uma nota.",
    },
    {
      id: "anatomy",
      shortTitle: "Anatomia",
      title: "Três peças: casos, critério e nota",
      tag: "mechanism",
      body: [
        "Todo [[eval|eval]] tem as mesmas três peças. Os casos são entradas reais do produto, escolhidas para cobrir as intenções que importam, incluindo as difíceis. O critério diz o que é acerto em cada caso: a resposta contém o prazo certo, o JSON é válido, a política foi citada. A nota agrega os acertos, como uma taxa de aprovação.",
        "Quando os casos têm resposta de referência conferida por pessoas, o conjunto vira um [[golden dataset|golden-dataset]]. O critério pode ser uma regra no código, uma métrica de texto (próxima aula) ou outro LLM com uma rubrica (aula 16.06). O que não muda: os mesmos casos e o mesmo critério para todas as versões, senão a comparação não vale.",
      ],
      keyIdea: "Eval = casos fixos + critério explícito + nota agregada, iguais para todas as versões.",
      scene: { kind: "pieces", layout: "single", pieces: [loop("eval", ["cases", "app", "answer"])] },
      alt: "O mesmo fluxo com o critério e a nota em destaque: cada resposta é conferida contra o critério do seu caso.",
    },
    {
      id: "compare",
      shortTitle: "A contra B",
      title: "A média subiu, mas um caso quebrou",
      tag: "example",
      body: [
        `Os ${cases.length} casos da cena rodaram em duas versões do prompt (resultados de brinquedo). A versão A acerta ${percent(rateA)}; a B, ${percent(rateB)}. Olhando só a média, a B é melhor e pronto.`,
        `Caso a caso, a história é outra: a B consertou ${listing(improved)}, mas quebrou “${listing(regressed)}”, que a A acertava. Se esse caso for uma pergunta sobre um documento fiscal, a regressão pode custar mais que as ${improved.length} melhorias juntas. Por isso o relatório de um eval mostra a nota e a lista do que mudou de lado, como um diff de testes.`,
      ],
      keyIdea: "Compare versões caso a caso: a média esconde regressões.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "scores",
            piece: "metrics-panel",
            metrics: [
              { id: "a", label: "versão A", value: percent(rateA) },
              { id: "b", label: "versão B", value: percent(rateB), color: "success" },
              { id: "regressed", label: "regressões", value: String(regressed.length), color: "danger" },
            ],
            highlight: "regressed",
          },
          {
            id: "results",
            piece: "matrix",
            rows: ["versão A", "versão B"],
            cols: cases,
            values: [versionA, versionB],
            scale: { min: 0, max: 1 },
            highlight: { row: 1, col: REGRESSED_INDEX },
            showValues: true,
            color: "module-16",
          },
        ],
      },
      alt: `Matriz de aprovação dos ${cases.length} casos nas versões A (${percent(rateA)}) e B (${percent(rateB)}). A B conserta ${listing(improved)} e quebra ${listing(regressed)}, em destaque.`,
    },
    {
      id: "sample-size",
      shortTitle: "Quantos casos",
      title: "Dez casos dizem pouco",
      tag: "mechanism",
      body: [
        `Uma nota medida em poucos casos tem muita incerteza. O [[intervalo de confiança|confidence-interval]] de 95% de uma taxa p medida em n casos tem meia largura de cerca de 1,96 · √(p · (1 − p) / n). Com n = ${cases.length}, a B fica em ${percent(rateB)} ${points(halfB)} e a A em ${percent(rateA)} ${points(halfA)}: os intervalos se sobrepõem, e a vitória da B pode ser sorte.`,
        `A curva mostra o preço da precisão: a largura cai com √n, então dividir a incerteza por 2 pede ${QUADRUPLE} vezes mais casos. Para ${points(TARGET)} com p perto de ${percent(rateB)}, são ${neededCases} casos. Com amostras pequenas ou taxas perto de 0% ou 100%, use o intervalo de Wilson (aula 11.13), que não sai da faixa de 0 a 1.`,
      ],
      keyIdea: "Reporte a nota com o intervalo: metade da incerteza custa quatro vezes mais casos.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "width",
            piece: "metrics-panel",
            metrics: [
              { id: "n10", label: `meia largura com n = ${cases.length}`, value: points(halfB), color: "danger" },
              { id: "needed", label: `casos para ${points(TARGET)}`, value: String(neededCases), color: "success" },
            ],
            highlight: "n10",
          },
          {
            id: "curve",
            piece: "chart",
            kind: "line",
            series: widthSeries,
            highlight: 0,
            color: "module-16",
          },
        ],
      },
      alt: `Meia largura do intervalo de 95% para uma taxa de ${percent(rateB)}, em pontos percentuais: ${widthSeries.map((item) => `${item.label} ${fixed(item.value)}`).join(", ")}. Para ${points(TARGET)} são precisos ${neededCases} casos.`,
    },
    {
      id: "offline-online",
      shortTitle: "Offline e online",
      title: "Antes do deploy e depois dele",
      tag: "tradeoff",
      body: [
        "O eval dos passos anteriores é uma [[avaliação offline|offline-evaluation]]: roda casos fixos antes de a versão chegar ao usuário, como um teste de regressão no CI. É barata, repetível e bloqueia a versão ruim, mas só sabe o que está nos casos. Perguntas que ninguém previu não estão lá.",
        "A [[avaliação online|online-evaluation]] mede o sistema com tráfego real: amostras de conversas notadas por um juiz, cliques em “não ajudou”, testes A/B entre versões. Ela vê o mundo de verdade, mas chega depois do deploy e mistura muitas causas. As duas se alimentam: falhas vistas em produção viram casos novos no conjunto offline.",
      ],
      keyIdea: "Offline barra regressões conhecidas; online descobre as desconhecidas e alimenta o offline.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "cycle",
            piece: "block-diagram",
            blocks: [
              { id: "cases", kind: "documents", label: "casos fixos", col: 0, row: 0 },
              { id: "offline", kind: "eval", label: "eval offline", col: 1, row: 0 },
              { id: "app", kind: "app", label: "nova versão", col: 2, row: 0 },
              { id: "prod", kind: "server", label: "produção", col: 3, row: 0 },
              { id: "users", kind: "phone", label: "usuários", col: 3, row: 1 },
              { id: "online", kind: "eval", label: "eval online", col: 2, row: 1 },
            ],
            edges: [
              { from: "cases", to: "offline" },
              { from: "offline", to: "app", label: "aprova" },
              { from: "app", to: "prod", label: "deploy" },
              { from: "users", to: "prod" },
              { from: "prod", to: "online", label: "amostra" },
              { from: "online", to: "cases", label: "falhas viram casos", variant: "alternative" },
            ],
            active: "online",
          },
        ],
      },
      alt: "Casos fixos alimentam o eval offline, que aprova a nova versão para produção; usuários usam a produção, uma amostra vai para o eval online, em destaque, e as falhas encontradas voltam como casos fixos.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Do palpite ao número",
      tag: "summary",
      body: [
        "Avaliar um app com LLM é trocar “parece melhor” por um número que dá para comparar: casos que representam o produto, um critério de acerto por caso, uma nota agregada com intervalo de confiança e a lista de regressões. Offline antes do deploy, online depois.",
        "A próxima aula abre a caixa do critério: as métricas que comparam a resposta com uma referência, como exact match, F1, BLEU e BERTScore, e as que dispensam referência.",
      ],
      keyIdea: "Avaliação é engenharia de testes para sistemas que não respondem sempre igual.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "steps",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "cases", label: "casos reais" },
              { id: "criteria", label: "critério por caso" },
              { id: "score", label: "nota agregada" },
              { id: "interval", label: "intervalo de confiança", color: "module-16" },
              { id: "diff", label: "regressões caso a caso", color: "danger" },
              { id: "online", label: "eval online", color: "brand" },
            ],
          },
        ],
      },
      alt: "Fluxo em chips: casos reais, critério por caso, nota agregada, intervalo de confiança, regressões caso a caso e eval online.",
    },
  ],
  realWorldExample:
    "O OpenAI Evals é um framework de código aberto em que cada eval é um arquivo de casos (JSONL) com um critério de acerto, de comparação exata a um modelo como juiz, e o resultado é uma nota agregada por versão do modelo ou do prompt. Equipes de produto costumam rodar um conjunto assim no CI a cada mudança de prompt, como um teste de regressão, e bloqueiam o merge quando a nota cai ou quando um caso crítico muda de aprovado para reprovado.",
  code: {
    language: "python",
    source: `import math

def evaluate(cases, run, check):
    results = [check(case, run(case["input"])) for case in cases]
    p, n = sum(results) / len(results), len(results)
    half = 1.96 * math.sqrt(p * (1 - p) / n)
    return {"pass_rate": p, "ci95": (p - half, p + half), "results": results}

def regressions(old, new, cases):
    return [c["id"] for c, a, b in zip(cases, old["results"], new["results"]) if a and not b]`,
    caption: "Um eval mínimo: taxa de acerto com intervalo de 95% e a lista de casos que a versão nova quebrou.",
  },
  tradeOffs: {
    pros: [
      "Transforma mudanças de prompt, modelo ou recuperação em decisões medidas",
      "Pega regressões antes do usuário, rodando no CI como qualquer teste",
      "Cria uma linguagem comum entre produto e engenharia: o que é acerto fica escrito",
    ],
    cons: [
      "Montar e manter bons casos custa horas de especialistas",
      "Casos fixos envelhecem: o tráfego real muda e o conjunto deixa de representá-lo",
      "Amostras pequenas dão notas ruidosas que parecem precisas",
    ],
    alternatives: [
      "Revisão humana de amostras, quando o volume é pequeno e o critério ainda não está claro",
      "Testes A/B em produção, quando há tráfego suficiente para medir o efeito real",
    ],
  },
  knowledgeCheck: [
    {
      id: "regression-hidden",
      prompt: "Uma versão nova do prompt sobe a taxa de acerto de 70% para 74% em 50 casos, mas 3 casos que passavam agora falham. O que fazer antes do deploy?",
      options: [
        "Publicar: a média subiu",
        "Olhar os 3 casos que quebraram e decidir se a regressão é aceitável, porque a média esconde quais casos mudaram",
        "Descartar a versão, porque qualquer regressão invalida o eval",
        "Rodar de novo até os 3 casos passarem por sorte",
      ],
      correct: 1,
      explanation: "A média junta melhorias e regressões. Os casos que mudaram de lado dizem o que a versão quebrou; se forem críticos, a melhoria média pode não compensar.",
      lesson: "16-01",
    },
    {
      id: "sample-size",
      prompt: "Um eval de 100 casos tem intervalo de ±8 pontos. Para chegar a cerca de ±4 pontos, de quantos casos você precisa?",
      options: ["Cerca de 200", "Cerca de 400", "Cerca de 800", "Cerca de 150"],
      correct: 1,
      explanation: "A largura cai com √n. Dividir a incerteza por 2 pede 2² = 4 vezes mais casos: cerca de 400.",
      lesson: "16-01",
    },
  ],
  related: ["00-07", "16-02", "11-13"],
  references: [
    { title: "OpenAI Evals", url: "https://github.com/openai/evals", kind: "repo" },
    { title: "Miller (2024), Adding Error Bars to Evals: A Statistical Approach to Language Model Evaluations", url: "https://arxiv.org/abs/2411.00640", kind: "paper" },
    { title: "Liang et al. (2022), Holistic Evaluation of Language Models (HELM)", url: "https://arxiv.org/abs/2211.09110", kind: "paper" },
  ],
};

export default lesson;
