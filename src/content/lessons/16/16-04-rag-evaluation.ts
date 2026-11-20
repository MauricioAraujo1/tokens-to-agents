import type { BlockDiagramSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Avaliação de RAG em escala, com as contas no arquivo e dados de brinquedo declarados no texto. Citações no
// estilo do ALCE (simplificado: uma citação é precisa se o trecho citado sustenta a frase sozinho; uma frase
// tem recall se algum trecho citado a sustenta); o quadrante recall × faithfulness em 40 perguntas; o recall
// de perguntas sintéticas contra perguntas reais; e o custo e a incerteza de avaliar uma amostra do tráfego.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const percent = (value: number, digits = 0) => `${fixed(value * 100, digits)}%`;
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const money = (value: number, digits = 2) =>
  `US$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

// Passo 2: frases da resposta, os trechos que cada uma cita e quais deles a sustentam.
const sentences = [
  { label: "até 2 dias", cites: ["c1"], supportedBy: ["c1"] },
  { label: "1º mês presencial", cites: ["c3", "c2"], supportedBy: ["c3"] },
  { label: "ajuda de internet", cites: ["c4", "c1"], supportedBy: ["c1"] },
  { label: "pedir ao gestor", cites: [], supportedBy: [] },
];
const citations = sentences.flatMap((sentence) => sentence.cites.map((chunk) => sentence.supportedBy.includes(chunk)));
const citationPrecision = citations.filter(Boolean).length / citations.length;
const recalled = sentences.map((sentence) => sentence.cites.some((chunk) => sentence.supportedBy.includes(chunk)));
const citationRecall = recalled.filter(Boolean).length / sentences.length;
const uncited = sentences.filter((sentence) => sentence.cites.length === 0).map((sentence) => sentence.label);

// Passo 3: 40 perguntas no quadrante context recall × faithfulness.
const quadrant = [
  [24, 6],
  [3, 7],
];
const questions = quadrant.flat().reduce((total, value) => total + value, 0);
const [[healthy, generationOnly], [abstainedOk, invented]] = quadrant;
const failing = generationOnly + abstainedOk + invented;
const retrievalFailures = abstainedOk + invented;

// Passo 4: recall das perguntas por origem (1 = todos os trechos necessários vieram).
const sources = [
  { label: "sintéticas", hits: [1, 1, 1, 1, 1, 1, 1, 1, 0, 1] },
  { label: "reais simples", hits: [1, 0, 1, 1, 0, 1, 1, 0, 1, 1] },
  { label: "reais multi-hop", hits: [0, 1, 0, 0, 1, 0, 0, 1] },
].map((source) => ({ ...source, recall: source.hits.reduce((total, value) => total + value, 0) / source.hits.length }));
const [synthetic, realSimple, multiHop] = sources;

// Passos 5 e 6: avaliar uma amostra do tráfego de produção.
const DAILY_QUESTIONS = 50_000;
const SAMPLE_RATE = 0.02;
const CALLS_PER_QUESTION = 4;
const COST_PER_CALL = 0.002;
const sampled = DAILY_QUESTIONS * SAMPLE_RATE;
const judgeCalls = sampled * CALLS_PER_QUESTION;
const dailyCost = judgeCalls * COST_PER_CALL;
const fullCost = DAILY_QUESTIONS * CALLS_PER_QUESTION * COST_PER_CALL;
const FAITHFULNESS = 0.9;
const halfWidth = 1.96 * Math.sqrt((FAITHFULNESS * (1 - FAITHFULNESS)) / sampled);

const flow = (active: string): BlockDiagramSpec => ({
  id: "flow",
  piece: "block-diagram",
  blocks: [
    { id: "golden", kind: "documents", label: "golden dataset", col: 0, row: 0 },
    { id: "phone", kind: "phone", label: "usuários", col: 0, row: 1 },
    { id: "rag", kind: "app", label: "assistente rag", col: 1, row: 0.5 },
    { id: "sample", kind: "queue", label: `amostra ${percent(SAMPLE_RATE)}`, col: 2, row: 1 },
    { id: "eval", kind: "eval", label: "métricas", col: 3, row: 0.5 },
  ],
  edges: [
    { from: "golden", to: "rag", label: "antes do deploy" },
    { from: "phone", to: "rag", label: "tráfego real" },
    { from: "rag", to: "eval", label: "com referência" },
    { from: "rag", to: "sample" },
    { from: "sample", to: "eval", label: "sem referência" },
  ],
  active,
});

const lesson: LessonContent = {
  id: "16-04",
  subtitle: "Como levar a avaliação de RAG do laboratório para o volume de produção: citações conferidas, diagnóstico em quadrante, perguntas sintéticas que enganam e amostras do tráfego real.",
  objectives: [
    "Calcular citation precision e citation recall numa resposta com fontes",
    "Diagnosticar falhas de RAG pelo quadrante context recall × faithfulness",
    "Reconhecer o otimismo de perguntas sintéticas geradas a partir de um trecho",
    "Dimensionar a avaliação de uma amostra do tráfego: custo, incerteza e métricas que se perdem sem referência",
  ],
  steps: [
    {
      id: "two-sources",
      shortTitle: "Duas fontes",
      title: "Do golden dataset ao tráfego real",
      tag: "context",
      body: [
        "A aula 08.15 avaliou uma pergunta com as métricas do RAGAS: [[context precision|context-precision]], [[context recall|context-recall]], [[faithfulness|faithfulness]] e [[answer relevance|answer-relevance]]. É como provar a receita na cozinha de testes. Esta aula leva a avaliação para o restaurante cheio: milhares de perguntas por dia, a maioria sem resposta de referência.",
        "A avaliação de RAG tem duas fontes. O [[golden dataset|golden-dataset]] roda antes de cada deploy, com referências conferidas por pessoas, e permite todas as métricas. A amostra do tráfego de produção roda depois, sem referência, e só permite as métricas que comparam a resposta com a pergunta e com os trechos recuperados.",
      ],
      keyIdea: "Golden dataset antes do deploy, amostra do tráfego depois: cada fonte permite métricas diferentes.",
      scene: { kind: "pieces", layout: "single", pieces: [flow("rag")] },
      alt: `O golden dataset alimenta o assistente RAG, em destaque, antes do deploy; usuários mandam o tráfego real, e uma amostra de ${percent(SAMPLE_RATE)} vai para as métricas sem referência.`,
    },
    {
      id: "citations",
      shortTitle: "Citações",
      title: "Cada frase com a sua fonte",
      tag: "mechanism",
      body: [
        `Quando o assistente cita fontes, dá para conferir as [[citações|citation]] uma a uma, como um revisor que abre cada nota de rodapé. A resposta da cena tem ${sentences.length} frases e ${citations.length} citações. A [[citation recall|citation-recall]] pergunta: cada frase é sustentada por algum trecho que ela cita? ${recalled.filter(Boolean).length} de ${sentences.length}, ${fixed(citationRecall)}. “${uncited.join("")}” não cita nada.`,
        `A [[citation precision|citation-precision]] pergunta o inverso: cada citação sustenta a sua frase? ${citations.filter(Boolean).length} das ${citations.length}, ${fixed(citationPrecision)}. Citações inúteis enganam quem confere, porque a fonte parece existir. O benchmark ALCE (Gao et al., 2023) define as duas métricas com um modelo de inferência textual decidindo o suporte; a cena usa uma versão simplificada.`,
      ],
      keyIdea: "Citation recall: toda frase tem fonte. Citation precision: toda fonte sustenta a frase.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "citations",
            piece: "metrics-panel",
            metrics: [
              { id: "recall", label: "citation recall", value: fixed(citationRecall) },
              { id: "precision", label: "citation precision", value: fixed(citationPrecision), color: "danger" },
              { id: "count", label: "citações", value: String(citations.length) },
            ],
            highlight: "precision",
          },
          {
            id: "sentences",
            piece: "token-stream",
            tokens: sentences.map((sentence) => `${sentence.label} [${sentence.cites.join(", ") || "sem fonte"}]`),
            keys: recalled.map((ok, index) => (ok ? index : -1)).filter((index) => index >= 0),
            color: "module-16",
          },
        ],
      },
      alt: `As ${sentences.length} frases da resposta com os trechos citados: ${sentences.map((sentence) => `${sentence.label} cita ${sentence.cites.join(" e ") || "nada"}`).join("; ")}. Em destaque, as sustentadas. Citation recall ${fixed(citationRecall)}, citation precision ${fixed(citationPrecision)}.`,
    },
    {
      id: "quadrant",
      shortTitle: "Quadrante",
      title: "Quatro quadrantes, quatro consertos",
      tag: "mechanism",
      body: [
        `Com ${questions} perguntas do golden dataset, cruze o context recall (a busca trouxe tudo?) com a faithfulness (a resposta ficou nos trechos?). ${healthy} estão no quadrante saudável. ${generationOnly} têm recall alto e resposta infiel: o modelo tinha tudo e inventou mesmo assim, o conserto é no prompt ou no modelo.`,
        `${abstainedOk} têm recall baixo e resposta fiel: o modelo respondeu só o que tinha, talvez com uma [[abstenção|abstention]], o que é o comportamento certo para uma busca que falhou. ${invented} têm recall baixo e resposta infiel: faltou o trecho e o modelo preencheu a lacuna. Das ${failing} perguntas com problema, ${retrievalFailures} começam na busca.`,
      ],
      keyIdea: "Recall baixo é problema da busca, mesmo quando o sintoma aparece como alucinação.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "quadrant",
            piece: "matrix",
            rows: ["recall alto", "recall baixo"],
            cols: ["fiel", "infiel"],
            values: quadrant,
            highlight: { row: 1, col: 1 },
            showValues: true,
            color: "module-16",
          },
        ],
      },
      alt: `Quadrante de ${questions} perguntas: recall alto e fiel ${healthy}, recall alto e infiel ${generationOnly}, recall baixo e fiel ${abstainedOk}, recall baixo e infiel ${invented}, em destaque.`,
    },
    {
      id: "synthetic",
      shortTitle: "Sintéticas",
      title: "Perguntas geradas são fáceis demais",
      tag: "example",
      body: [
        `Escrever centenas de perguntas com referência à mão é caro, então muita gente gera o conjunto com um LLM: ele lê um trecho e escreve uma pergunta que o trecho responde. São [[dados sintéticos|synthetic-data]], e têm um vício: a pergunta usa as palavras do próprio trecho, e a busca acha esse trecho com facilidade. No exemplo (dados de brinquedo), o recall das sintéticas é ${percent(synthetic.recall)}.`,
        `Perguntas reais tiradas dos logs ficam em ${percent(realSimple.recall)}, e as reais que exigem juntar dois documentos, em ${percent(multiHop.recall)}. Um conjunto só sintético promete uma busca melhor do que ela é. A saída é misturar: perguntas reais dos logs, anonimizadas, mais sintéticas multi-hop e com vocabulário diferente do trecho, e medir cada grupo em separado.`,
      ],
      keyIdea: "Pergunta gerada a partir de um trecho já sabe onde está a resposta: misture perguntas reais.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "sources",
            piece: "chart",
            kind: "bar",
            series: sources.map((source) => ({ label: source.label, value: Number((source.recall * 100).toFixed(0)) })),
            max: 100,
            highlight: 0,
            color: "module-16",
          },
        ],
      },
      alt: `Context recall por origem das perguntas: ${sources.map((source) => `${source.label} ${percent(source.recall)}`).join(", ")}. As sintéticas parecem bem melhores que as reais.`,
    },
    {
      id: "production",
      shortTitle: "Produção",
      title: "Avaliar uma amostra do tráfego",
      tag: "mechanism",
      body: [
        `Em produção, cada pergunta já tem tudo que as métricas sem referência pedem: a pergunta, os trechos recuperados e a resposta. Um juiz avalia uma amostra: com ${integer(DAILY_QUESTIONS)} perguntas por dia e ${percent(SAMPLE_RATE)} de amostra, são ${integer(sampled)} perguntas avaliadas. Faithfulness e answer relevance funcionam; context recall não, porque ele precisa da resposta de referência que ninguém escreveu.`,
        `A incerteza vem da aula 16.01: com ${integer(sampled)} perguntas e faithfulness perto de ${fixed(FAITHFULNESS, 1)}, o intervalo diário é de cerca de ±${fixed(halfWidth * 100, 1)} pontos, o bastante para ver uma queda de 5 pontos de um dia para o outro. Para cobrir a falta de recall, acompanhe sinais indiretos: a taxa de abstenção, os cliques em “não ajudou” e as perguntas reformuladas logo em seguida.`,
      ],
      keyIdea: "Sem referência, mede-se fidelidade e relevância; o recall vira sinais indiretos.",
      scene: { kind: "pieces", layout: "single", pieces: [flow("sample")] },
      alt: `O tráfego real dos usuários passa pelo assistente, e uma amostra de ${percent(SAMPLE_RATE)}, em destaque, vai para as métricas sem referência.`,
    },
    {
      id: "cost",
      shortTitle: "Custo",
      title: "Quanto custa avaliar todo dia",
      tag: "tradeoff",
      body: [
        `As métricas do RAGAS fazem várias chamadas de LLM por pergunta: extrair afirmações, conferir cada uma, gerar perguntas de volta. Supondo ${CALLS_PER_QUESTION} chamadas por pergunta a ${money(COST_PER_CALL, 3)} cada (valores de brinquedo), a amostra custa ${integer(judgeCalls)} chamadas e ${money(dailyCost)} por dia. Avaliar 100% do tráfego custaria ${money(fullCost)} por dia, para um intervalo que já era estreito.`,
        "O juiz também é um modelo com erros. Antes de usar as notas para decidir, confira uma amostra delas contra notas humanas, como mostra a aula 16.06, e repita a conferência quando trocar o modelo juiz. O ARES (Saad-Falcon et al., 2023) faz exatamente isso: usa poucas centenas de notas humanas para corrigir o viés de juízes automáticos.",
      ],
      keyIdea: "Amostra pequena e bem medida vale mais que avaliar tudo: o intervalo já é estreito.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "cost",
            piece: "metrics-panel",
            metrics: [
              { id: "sampled", label: "perguntas avaliadas/dia", value: integer(sampled) },
              { id: "calls", label: "chamadas do juiz/dia", value: integer(judgeCalls) },
              { id: "cost", label: "custo da amostra/dia", value: money(dailyCost), color: "success" },
              { id: "full", label: "custo de avaliar tudo/dia", value: money(fullCost), color: "danger" },
              { id: "ci", label: "intervalo diário", value: `±${fixed(halfWidth * 100, 1)} pontos` },
            ],
            highlight: "cost",
          },
        ],
      },
      alt: `Avaliação diária da amostra: ${integer(sampled)} perguntas, ${integer(judgeCalls)} chamadas do juiz, ${money(dailyCost)} por dia, contra ${money(fullCost)} para avaliar tudo; intervalo diário de ±${fixed(halfWidth * 100, 1)} pontos.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "RAG avaliado antes e depois do deploy",
      tag: "summary",
      body: [
        "Antes do deploy, o golden dataset com perguntas reais e sintéticas mede tudo, inclusive recall, e o quadrante diz se o conserto é na busca ou na geração. Citações conferidas mostram se as fontes sustentam o que a resposta diz. Depois do deploy, uma amostra do tráfego mede fidelidade e relevância a um custo pequeno.",
        "Agentes adicionam um problema novo: não basta olhar a resposta, porque o caminho até ela também pode estar errado. A próxima aula avalia o resultado e a trajetória de um agente.",
      ],
      keyIdea: "Meça a busca e a geração separadas, com perguntas reais, antes e depois do deploy.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "chips",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "golden", label: "golden dataset real + sintético" },
              { id: "quadrant", label: "quadrante recall × fidelidade" },
              { id: "citations", label: "citações conferidas", color: "module-16" },
              { id: "sample", label: "amostra do tráfego" },
              { id: "signals", label: "sinais indiretos" },
              { id: "calibrate", label: "juiz calibrado", color: "brand" },
            ],
          },
        ],
      },
      alt: "Fluxo em chips: golden dataset real e sintético, quadrante recall por fidelidade, citações conferidas, amostra do tráfego, sinais indiretos e juiz calibrado.",
    },
  ],
  realWorldExample:
    "Ferramentas de observabilidade de LLM, como Langfuse e Arize Phoenix, deixam configurar avaliações automáticas que rodam sobre uma fração dos rastros de produção: o juiz recebe a pergunta, os trechos recuperados e a resposta de cada rastro amostrado e grava notas como faithfulness ao lado do rastro. Assim a equipe filtra as conversas com nota baixa e as revisa, e as que mostram um problema real viram casos novos do golden dataset.",
  code: {
    language: "python",
    source: `def citation_scores(sentences):
    """sentences: [{"cites": ["c1"], "supported_by": {"c1"}}, ...]"""
    cites = [(c in s["supported_by"]) for s in sentences for c in s["cites"]]
    recall = sum(any(c in s["supported_by"] for c in s["cites"]) for s in sentences)
    return {
        "citation_recall": recall / len(sentences),
        "citation_precision": sum(cites) / len(cites) if cites else 0.0,
    }`,
    caption: "Citation recall e precision na versão simplificada da aula; no ALCE, um modelo de inferência textual decide o suporte de cada trecho.",
  },
  tradeOffs: {
    pros: [
      "O quadrante separa falhas da busca e da geração com duas métricas",
      "Citações conferidas tornam a resposta auditável pelo usuário e pelo eval",
      "Uma amostra pequena do tráfego mede a qualidade diária a um custo baixo",
    ],
    cons: [
      "Sem referência, o context recall de produção não pode ser medido",
      "Perguntas sintéticas superestimam a busca",
      "Juízes LLM custam várias chamadas por pergunta e precisam de calibração humana",
    ],
    alternatives: [
      "Revisão humana por amostragem, para auditar os juízes e achar falhas novas",
      "Sinais implícitos dos usuários, como reformulações e cliques em “não ajudou”",
    ],
  },
  knowledgeCheck: [
    {
      id: "production-recall",
      prompt: "Uma equipe quer medir o context recall do RAG diretamente em amostras do tráfego de produção. Por que isso não funciona?",
      options: [
        "Porque o tráfego de produção é grande demais",
        "Porque context recall compara os trechos com a resposta de referência, e perguntas de produção não têm referência",
        "Porque o recall só existe em busca lexical",
        "Porque o juiz LLM não lê trechos",
      ],
      correct: 1,
      explanation: "Context recall pergunta se cada afirmação da referência está nos trechos. Sem referência escrita por alguém, não há o que comparar; em produção, use sinais indiretos.",
      lesson: "16-04",
    },
    {
      id: "citation-precision",
      prompt: "Uma resposta tem 3 frases, todas sustentadas pelas fontes citadas, mas 6 das 9 citações não sustentam a frase em que aparecem. Como ficam as métricas?",
      options: [
        "Citation recall 1,0 e citation precision cerca de 0,33",
        "Citation recall 0,33 e citation precision 1,0",
        "As duas em 1,0",
        "As duas em 0,33",
      ],
      correct: 0,
      explanation: "Toda frase tem pelo menos uma fonte que a sustenta, então o recall é 3/3. Só 3 das 9 citações sustentam a sua frase: precision 3/9 ≈ 0,33. Sobram citações decorativas.",
      lesson: "16-04",
    },
  ],
  related: ["08-15", "16-03", "16-05"],
  references: [
    { title: "Es et al. (2023), RAGAS: Automated Evaluation of Retrieval Augmented Generation", url: "https://arxiv.org/abs/2309.15217", kind: "paper" },
    { title: "Gao et al. (2023), Enabling Large Language Models to Generate Text with Citations (ALCE)", url: "https://arxiv.org/abs/2305.14627", kind: "paper" },
    { title: "Saad-Falcon et al. (2023), ARES: An Automated Evaluation Framework for Retrieval-Augmented Generation Systems", url: "https://arxiv.org/abs/2311.09476", kind: "paper" },
  ],
};

export default lesson;
