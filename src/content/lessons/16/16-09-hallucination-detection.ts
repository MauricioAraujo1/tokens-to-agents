import type { BlockDiagramSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Detecção de alucinação com as contas no arquivo e vereditos de brinquedo declarados no texto: groundedness
// frase a frase com rótulos de inferência textual (entailment, neutral, contradiction); o escore de
// inconsistência do SelfCheckGPT, 1 − fração das amostras que sustentam a frase; a entropia ingênua (sobre as
// strings) e a entropia semântica (sobre grupos de mesmo significado) de seis respostas sorteadas, em nats; e
// precision e recall de um detector em dois limiares, sobre oito frases rotuladas.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const listing = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`);

// Passo 2: frases da resposta contra a política de garantia.
type Verdict = "entailment" | "neutral" | "contradiction";
const claims: Array<{ label: string; verdict: Verdict }> = [
  { label: "garantia de 12 meses", verdict: "entailment" },
  { label: "cobre defeito de fábrica", verdict: "entailment" },
  { label: "cobre quedas", verdict: "contradiction" },
  { label: "troca em 48 h", verdict: "neutral" },
  { label: "assistência nas capitais", verdict: "entailment" },
];
const countVerdict = (verdict: Verdict) => claims.filter((claim) => claim.verdict === verdict).length;
const entailed = countVerdict("entailment");
const groundedness = entailed / claims.length;
const contradicted = claims.filter((claim) => claim.verdict === "contradiction").map((claim) => claim.label);
const unsupported = claims.filter((claim) => claim.verdict === "neutral").map((claim) => claim.label);

// Passo 3: SelfCheckGPT, cada frase da resposta principal contra 5 amostras (1 = a amostra sustenta a frase).
const bioSentences = ["nasceu em 1952", "era físico", "prêmio em 1998", "lecionou em Coimbra"];
const support = [
  [1, 1, 1, 1, 1],
  [1, 1, 1, 0, 1],
  [0, 1, 0, 0, 0],
  [1, 0, 1, 1, 0],
];
const SAMPLES = support[0].length;
const inconsistency = support.map((row) => 1 - row.reduce((total, value) => total + value, 0) / row.length);
const MOST_SUSPECT = inconsistency.indexOf(Math.max(...inconsistency));

// Passo 4: entropia ingênua e semântica de 6 respostas sorteadas.
const entropy = (counts: number[]) => {
  const n = counts.reduce((total, value) => total + value, 0);
  return Math.abs(counts.reduce((total, count) => total + (count / n) * Math.log(count / n), 0));
};
const sampledAnswers = ["1998", "em 1998", "no ano de 1998", "2001", "1998.", "2003"];
const meaningOf = (answer: string) => answer.match(/\d{4}/)?.[0] ?? answer;
const clusterCounts = (answers: string[]) => {
  const map = new Map<string, number>();
  for (const answer of answers) map.set(meaningOf(answer), (map.get(meaningOf(answer)) ?? 0) + 1);
  return map;
};
const clusters = clusterCounts(sampledAnswers);
const naiveUncertain = entropy(sampledAnswers.map(() => 1));
const semanticUncertain = entropy([...clusters.values()]);
const paraphrases = ["1952", "em 1952", "no ano de 1952", "1952.", "foi em 1952", "nasceu em 1952"];
const naiveParaphrases = entropy(paraphrases.map(() => 1));
const semanticParaphrases = entropy([...clusterCounts(paraphrases).values()]);
const clusterSeries = [...clusters.entries()].map(([label, count]) => ({ label, value: Number((count / sampledAnswers.length).toFixed(2)) }));

// Passo 5: detector sobre 8 frases rotuladas (1 = alucinada).
const scores = [0.05, 0.62, 0.2, 0.85, 0.4, 0.1, 0.55, 0.35];
const hallucinated = [0, 1, 0, 1, 1, 0, 0, 0];
const detector = (threshold: number) => {
  const flagged = scores.map((score) => score >= threshold);
  const tp = flagged.filter((flag, index) => flag && hallucinated[index] === 1).length;
  const fp = flagged.filter((flag, index) => flag && hallucinated[index] === 0).length;
  const fn = flagged.filter((flag, index) => !flag && hallucinated[index] === 1).length;
  return { tp, fp, fn, precision: tp / (tp + fp), recall: tp / (tp + fn) };
};
const STRICT = 0.5;
const LOOSE = 0.3;
const strict = detector(STRICT);
const loose = detector(LOOSE);

const check = (active: string, done?: string[]): BlockDiagramSpec => ({
  id: "check",
  piece: "block-diagram",
  blocks: [
    { id: "sources", kind: "documents", label: "fontes", col: 0, row: 0 },
    { id: "llm", kind: "llm", label: "gerador", col: 0, row: 1 },
    { id: "answer", kind: "answer", label: "resposta", col: 1, row: 1 },
    { id: "detector", kind: "eval", label: "detector", col: 2, row: 0.5 },
    { id: "ok", kind: "phone", label: "entrega", col: 3, row: 0 },
    { id: "flag", kind: "guardrail", label: "abstém ou revisa", col: 3, row: 1 },
  ],
  edges: [
    { from: "llm", to: "answer" },
    { from: "sources", to: "detector", label: "contexto" },
    { from: "answer", to: "detector", label: "frases" },
    { from: "detector", to: "ok", label: "sustentada" },
    { from: "detector", to: "flag", label: "suspeita", variant: "alternative" },
  ],
  active,
  done,
});

const lesson: LessonContent = {
  id: "16-09",
  subtitle: "Como descobrir, frase a frase, se uma resposta inventou algo: conferir contra as fontes, perguntar de novo e medir a consistência, e avaliar o próprio detector.",
  objectives: [
    "Medir groundedness frase a frase com inferência textual contra as fontes",
    "Aplicar a ideia do SelfCheckGPT quando não há fonte para conferir",
    "Calcular a entropia semântica e explicar por que ela supera a entropia das strings",
    "Avaliar um detector com precision e recall e escolher o limiar",
  ],
  steps: [
    {
      id: "witness",
      shortTitle: "Testemunha",
      title: "Perguntar de novo, conferir os papéis",
      tag: "context",
      body: [
        "Um delegado tem dois jeitos de checar um depoimento. Se há documentos, confere cada afirmação contra eles. Se não há, faz a mesma pergunta de jeitos diferentes, em horários diferentes: quem lembra de verdade conta a mesma história; quem inventa muda os detalhes a cada vez.",
        "[[Detecção de alucinação|hallucination-detection]] usa as duas estratégias, depois que a resposta foi gerada. A aula 04.10 explicou por que o modelo inventa e como a abstenção por limiar reduz o problema. Aqui o foco é o detector: um componente que lê a resposta pronta, frase a frase, marca as suspeitas e decide se a resposta é entregue, revisada ou trocada por uma abstenção.",
      ],
      keyIdea: "Com fontes, confira contra elas; sem fontes, pergunte de novo e veja se a história muda.",
      scene: { kind: "pieces", layout: "single", pieces: [check("detector")] },
      alt: "O gerador produz a resposta; o detector, em destaque, compara as frases com as fontes e entrega as sustentadas, desviando as suspeitas para abstenção ou revisão.",
    },
    {
      id: "groundedness",
      shortTitle: "Com fontes",
      title: "Cada frase contra as fontes",
      tag: "mechanism",
      body: [
        `A pergunta é sobre a garantia de um notebook, e a política está no contexto. A resposta foi quebrada em ${claims.length} afirmações, e um verificador de [[inferência textual|natural-language-inference]] (NLI) classifica cada par fonte e afirmação: entailment (a fonte implica a afirmação), contradiction (a fonte diz o contrário) ou neutral (a fonte não diz nada). O verificador pode ser um modelo NLI pequeno ou um LLM com instruções.`,
        `${entailed} das ${claims.length} afirmações são sustentadas: [[groundedness|groundedness]] de ${fixed(groundedness)}. “${listing(contradicted)}” contradiz a fonte, e “${listing(unsupported)}” não aparece nela. As duas são problemas diferentes: a contradição é erro certo; a neutra pode ser verdade, mas a resposta não tem como provar. É a mesma conta da [[faithfulness|faithfulness]] do RAGAS, usada aqui como checagem em produção, antes de a resposta chegar ao usuário.`,
      ],
      keyIdea: "Groundedness: cada frase precisa ser implicada pela fonte. Contradição é erro; neutro é sem prova.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "nli",
            piece: "metrics-panel",
            metrics: [
              { id: "entail", label: "entailment", value: String(entailed), color: "success" },
              { id: "neutral", label: "neutral", value: String(countVerdict("neutral")) },
              { id: "contra", label: "contradiction", value: String(countVerdict("contradiction")), color: "danger" },
              { id: "score", label: "groundedness", value: fixed(groundedness), color: "module-16" },
            ],
            highlight: "contra",
          },
          {
            id: "claims",
            piece: "token-stream",
            tokens: claims.map((claim) => claim.label),
            keys: claims.map((claim, index) => (claim.verdict === "entailment" ? index : -1)).filter((index) => index >= 0),
            query: claims.findIndex((claim) => claim.verdict === "contradiction"),
            color: "module-16",
          },
        ],
      },
      alt: `As ${claims.length} afirmações da resposta: ${claims.map((claim) => `${claim.label}, ${claim.verdict}`).join("; ")}. Groundedness ${fixed(groundedness)}.`,
    },
    {
      id: "selfcheck",
      shortTitle: "Sem fontes",
      title: "Perguntar cinco vezes",
      tag: "mechanism",
      body: [
        `Sem fontes, o SelfCheckGPT (Manakul et al., 2023) usa a testemunha: gera mais ${SAMPLES} respostas para a mesma pergunta, com temperatura acima de zero, e confere cada frase da resposta principal contra cada amostra. A pergunta é a biografia de um pesquisador fictício. Uma [[autochecagem|self-check]] assim dispensa fonte externa e acesso aos logits do modelo.`,
        `O escore de inconsistência de uma frase é 1 menos a fração das amostras que a sustentam. “${bioSentences[0]}” aparece em todas: ${fixed(inconsistency[0])}. “${bioSentences[MOST_SUSPECT]}” aparece em uma das ${SAMPLES}: ${fixed(inconsistency[MOST_SUSPECT])}, a mais suspeita. O custo é alto: ${SAMPLES} gerações a mais e uma checagem por frase e amostra. E um erro que o modelo repete com convicção passa, porque é consistente.`,
      ],
      keyIdea: "Fatos que o modelo sabe se repetem entre amostras; invenções mudam a cada vez.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "samples",
            piece: "matrix",
            rows: bioSentences.map((sentence, index) => `${sentence} (${fixed(inconsistency[index])})`),
            cols: Array.from({ length: SAMPLES }, (_, index) => `amostra ${index + 1}`),
            values: support,
            scale: { min: 0, max: 1 },
            highlight: { row: MOST_SUSPECT, col: 1 },
            showValues: true,
            color: "module-16",
          },
        ],
      },
      alt: `Matriz das ${bioSentences.length} frases da resposta principal contra ${SAMPLES} amostras: ${bioSentences.map((sentence, index) => `${sentence}, inconsistência ${fixed(inconsistency[index])}`).join("; ")}.`,
    },
    {
      id: "semantic-entropy",
      shortTitle: "Entropia",
      title: "Paráfrase não é dúvida",
      tag: "mechanism",
      body: [
        `Outra medida de dúvida é a entropia das respostas sorteadas. A ingênua conta strings diferentes: as ${sampledAnswers.length} respostas “${sampledAnswers.join("”, “")}” são todas distintas, entropia ln ${sampledAnswers.length} = ${fixed(naiveUncertain)} nats. Mas seis paráfrases de “1952” também são strings distintas e dão os mesmos ${fixed(naiveParaphrases)}, embora o modelo não tenha dúvida nenhuma.`,
        `A [[entropia semântica|semantic-entropy]] (Kuhn et al., 2023) agrupa as respostas por significado antes de contar, em geral com um modelo NLI que testa se uma implica a outra nos dois sentidos. As ${sampledAnswers.length} respostas viram ${clusters.size} grupos, ${[...clusters.entries()].map(([meaning, count]) => `${meaning} × ${count}`).join(", ")}, e a entropia cai para ${fixed(semanticUncertain)}. As paráfrases de 1952 viram um grupo só: ${fixed(semanticParaphrases)}. Alta entropia semântica indica que o modelo está chutando.`,
      ],
      keyIdea: "Agrupe as amostras por significado antes de medir a entropia: só divergência de sentido é dúvida.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "entropy",
            piece: "metrics-panel",
            metrics: [
              { id: "naive", label: "entropia das strings", value: `${fixed(naiveUncertain)} nats` },
              { id: "semantic", label: "entropia semântica", value: `${fixed(semanticUncertain)} nats`, color: "danger" },
              { id: "para", label: "paráfrases, semântica", value: `${fixed(semanticParaphrases)} nats`, color: "success" },
            ],
            highlight: "semantic",
          },
          {
            id: "clusters",
            piece: "chart",
            kind: "bar",
            series: clusterSeries,
            max: 1,
            highlight: 0,
            color: "module-16",
          },
        ],
      },
      alt: `As ${sampledAnswers.length} respostas sorteadas agrupadas por significado: ${clusterSeries.map((item) => `${item.label} ${fixed(item.value)}`).join(", ")}. Entropia das strings ${fixed(naiveUncertain)} nats, semântica ${fixed(semanticUncertain)}; seis paráfrases da mesma resposta dão ${fixed(semanticParaphrases)}.`,
    },
    {
      id: "threshold",
      shortTitle: "Limiar",
      title: "O detector também precisa de nota",
      tag: "example",
      body: [
        `Um detector é um classificador, e se avalia como um: com frases rotuladas por pessoas. Nas ${scores.length} frases da cena, ${hallucinated.filter((value) => value === 1).length} são alucinações. Com limiar ${fixed(STRICT, 1)}, o detector marca ${strict.tp + strict.fp} frases: [[precision|precision]] ${fixed(strict.precision)} e [[recall|recall]] ${fixed(strict.recall)}. Uma alucinação passa.`,
        `Baixando o limiar para ${fixed(LOOSE, 1)}, o recall vai a ${fixed(loose.recall)} e a precision cai para ${fixed(loose.precision)}: pega todas, com ${loose.fp} alarmes falsos. A escolha depende do custo de cada erro, como na aula 01.10: num assistente médico, perder uma alucinação custa mais que revisar duas frases boas; num chat de receitas, o contrário.`,
      ],
      keyIdea: "Escolha o limiar do detector pelo custo de deixar passar contra o custo de alarmes falsos.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "detector",
            piece: "metrics-panel",
            metrics: [
              { id: "p-strict", label: `precision em ${fixed(STRICT, 1)}`, value: fixed(strict.precision) },
              { id: "r-strict", label: `recall em ${fixed(STRICT, 1)}`, value: fixed(strict.recall), color: "danger" },
              { id: "p-loose", label: `precision em ${fixed(LOOSE, 1)}`, value: fixed(loose.precision) },
              { id: "r-loose", label: `recall em ${fixed(LOOSE, 1)}`, value: fixed(loose.recall), color: "success" },
            ],
            highlight: "r-strict",
          },
          {
            id: "scores",
            piece: "chart",
            kind: "bar",
            series: scores.map((score, index) => ({ label: `frase ${index + 1}${hallucinated[index] ? " ✗" : ""}`, value: score })),
            max: 1,
            cutoff: { mode: "threshold", value: STRICT, label: `limiar ${fixed(STRICT, 1)}` },
            highlight: hallucinated.findIndex((value, index) => value === 1 && scores[index] < STRICT),
            color: "module-16",
          },
        ],
      },
      alt: `Escore do detector para ${scores.length} frases, com as alucinadas marcadas: ${scores.map((score, index) => `frase ${index + 1} ${fixed(score)}${hallucinated[index] ? " alucinada" : ""}`).join(", ")}. Com limiar ${fixed(STRICT, 1)}, precision ${fixed(strict.precision)} e recall ${fixed(strict.recall)}; com ${fixed(LOOSE, 1)}, ${fixed(loose.precision)} e ${fixed(loose.recall)}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Detectar antes de entregar",
      tag: "summary",
      body: [
        "Com fontes no contexto, a checagem de groundedness frase a frase é barata e direta. Sem fontes, a consistência entre amostras (SelfCheckGPT) e a entropia semântica estimam a dúvida do modelo, a um custo de várias gerações. Nos dois casos, o detector é avaliado com frases rotuladas e o limiar sai do custo de cada erro.",
        "O que fazer com a frase suspeita é decisão do sistema: remover, pedir citação, abster-se ou mandar para revisão. Esse “barrar ou deixar passar” é o trabalho dos guardrails, tema da próxima aula.",
      ],
      keyIdea: "Detector de alucinação é um classificador: escolha o método pelas fontes disponíveis e o limiar pelo risco.",
      scene: { kind: "pieces", layout: "single", pieces: [check("flag", ["sources", "llm", "answer", "detector"])] },
      alt: "O mesmo fluxo com a saída para abstenção ou revisão em destaque: frases suspeitas não chegam ao usuário como estão.",
    },
  ],
  realWorldExample:
    "Provedores de nuvem oferecem checagens de groundedness prontas, que recebem a resposta e os documentos de referência e devolvem os trechos sem suporte, como a detecção de groundedness do Azure AI Content Safety e as checagens de grounding contextual do Amazon Bedrock Guardrails. Em pesquisa, Farquhar et al. (2024) publicaram na Nature que a entropia semântica detecta respostas inventadas em perguntas e respostas e em biografias melhor que medidas baseadas só nas strings.",
  code: {
    language: "python",
    source: `import math
from collections import Counter

def semantic_entropy(answers: list[str], same_meaning) -> float:
    clusters: list[list[str]] = []
    for answer in answers:
        for cluster in clusters:
            if same_meaning(answer, cluster[0]):
                cluster.append(answer)
                break
        else:
            clusters.append([answer])
    n = len(answers)
    return -sum(len(c) / n * math.log(len(c) / n) for c in clusters)

year = lambda a, b: a.strip(".").split()[-1] == b.strip(".").split()[-1]
print(round(semantic_entropy(["1998", "em 1998", "2001", "1998.", "2003", "no ano de 1998"], year), 2))  # 0.87`,
    caption: "Entropia semântica: agrupe as respostas por significado (aqui, pelo ano; na prática, com um modelo NLI nos dois sentidos) e calcule a entropia dos grupos.",
  },
  tradeOffs: {
    pros: [
      "Groundedness frase a frase aponta exatamente o que não tem fonte",
      "SelfCheckGPT e entropia semântica funcionam sem fonte e sem acesso aos logits",
      "Um limiar ajustável troca recall por alarmes falsos conforme o risco",
    ],
    cons: [
      "Métodos por amostragem custam várias gerações por resposta",
      "Erros que o modelo repete com convicção passam pelos testes de consistência",
      "O verificador NLI também erra, principalmente com números e negações",
    ],
    alternatives: [
      "Exigir citações e conferir cada uma (aula 16.04)",
      "Abstenção por limiar de confiança do próprio modelo (aula 04.10)",
    ],
  },
  knowledgeCheck: [
    {
      id: "which-method",
      prompt: "Um assistente responde sobre a política de reembolso com a política inteira no contexto. Qual detector faz mais sentido?",
      options: [
        "SelfCheckGPT com 10 amostras",
        "Checagem de groundedness frase a frase contra a política, com um verificador NLI",
        "Entropia das strings",
        "Nenhum: com a fonte no contexto, o modelo não alucina",
      ],
      correct: 1,
      explanation: "Com a fonte disponível, conferir cada frase contra ela é mais barato e mais direto que sortear amostras. E o modelo pode, sim, contradizer a fonte que está no contexto.",
      lesson: "16-09",
    },
    {
      id: "semantic",
      prompt: "Cinco amostras dizem “Lisboa”, “é Lisboa”, “a capital é Lisboa”, “Lisboa.” e “cidade de Lisboa”. O que acontece com a entropia das strings e a semântica?",
      options: [
        "As duas são altas",
        "A das strings é alta (cinco strings diferentes) e a semântica é zero (um só significado)",
        "As duas são zero",
        "A semântica é maior que a das strings",
      ],
      correct: 1,
      explanation: "São cinco strings distintas, entropia ln 5, mas um único grupo de significado, entropia 0. Paráfrase não é dúvida.",
      lesson: "16-09",
    },
  ],
  related: ["04-10", "16-04", "16-10"],
  references: [
    { title: "Manakul et al. (2023), SelfCheckGPT: Zero-Resource Black-Box Hallucination Detection for Generative Large Language Models", url: "https://arxiv.org/abs/2303.08896", kind: "paper" },
    { title: "Kuhn et al. (2023), Semantic Uncertainty: Linguistic Invariances for Uncertainty Estimation in Natural Language Generation", url: "https://arxiv.org/abs/2302.09664", kind: "paper" },
    { title: "Farquhar et al. (2024), Detecting hallucinations in large language models using semantic entropy (Nature)", url: "https://www.nature.com/articles/s41586-024-07421-0", kind: "paper" },
  ],
};

export default lesson;
