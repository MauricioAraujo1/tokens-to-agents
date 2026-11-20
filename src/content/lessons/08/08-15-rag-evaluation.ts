import { cosineSimilarity } from "../../../lab/embeddings";
import { embed, tokenize } from "../../../lab/retrieval";
import type { LessonContent } from "../../../types/content";

// Avaliação de RAG com as métricas do RAGAS calculadas aqui, numa pergunta do assistente de RH:
// faithfulness (afirmações sustentadas / total), context precision (média da precisão@k nas posições
// relevantes), context recall (afirmações da referência cobertas pelos chunks) e answer relevance (cosseno
// médio entre perguntas geradas a partir da resposta e a pergunta original, com embeddings de brinquedo de
// 5 traços [home office, estagiário, dias, reembolso, férias]). Depois, um golden dataset de 5 perguntas.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const mean = (values: number[]) => values.reduce((total, value) => total + value, 0) / Math.max(1, values.length);

const QUESTION = "Quantos dias de home office um estagiário pode fazer?";

// Faithfulness: as afirmações da resposta gerada e se algum chunk recuperado sustenta cada uma.
const answerClaims = [
  { label: "até 2 dias", supported: true },
  { label: "1º mês presencial", supported: true },
  { label: "pedir ao gestor", supported: true },
  { label: "ajuda de internet", supported: true },
  { label: "extra: aprova o rh", supported: false },
];
const supportedCount = answerClaims.filter((claim) => claim.supported).length;
const faithfulness = supportedCount / answerClaims.length;
const unsupported = answerClaims.filter((claim) => !claim.supported).map((claim) => claim.label);

// Context precision: relevância dos chunks na ordem em que vieram (1 = relevante).
const retrieved = ["estagiários", "férias", "1º mês", "viagem"];
const relevance = [1, 0, 1, 0];
const contextPrecision = (flags: number[]) => {
  let hits = 0;
  let total = 0;
  flags.forEach((flag, index) => {
    if (flag === 1) {
      hits += 1;
      total += hits / (index + 1);
    }
  });
  return hits === 0 ? 0 : total / hits;
};
const precisionAsRetrieved = contextPrecision(relevance);
const precisionReordered = contextPrecision([...relevance].sort((a, b) => b - a));

// Context recall: cada afirmação da resposta de referência, e quais chunks a sustentam.
const referenceClaims = ["até 2 dias/semana", "1º mês presencial", "extra: diretor aprova"];
const support = [
  [1, 0, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 0],
];
const coveredClaims = support.filter((row) => row.some((cell) => cell === 1)).length;
const contextRecall = coveredClaims / referenceClaims.length;
const missingReference = referenceClaims.filter((_, index) => support[index].every((cell) => cell === 0));

// Answer relevance: perguntas que um LLM escreveria a partir da resposta, comparadas com a original.
const DIMS = 5;
const concepts: Record<string, number[]> = {
  office: [1, 0, 0, 0, 0],
  presencial: [0.6, 0, 0, 0, 0],
  estagiario: [0, 1, 0, 0, 0],
  dias: [0, 0, 1, 0, 0],
  semana: [0, 0, 0.6, 0, 0],
  mes: [0, 0, 0.5, 0, 0],
  internet: [0.3, 0, 0, 0.8, 0],
  reembolso: [0, 0, 0, 1, 0],
  ferias: [0, 0, 0, 0, 1],
};
const vectorOf = (text: string) => embed(tokenize(text), concepts, DIMS);
const generatedQuestions = [
  { label: "dias por semana", text: "Quantos dias por semana um estagiário pode ficar em home office?" },
  { label: "1º mês", text: "Estagiário trabalha presencial no primeiro mês?" },
  { label: "internet", text: "A empresa paga a internet de quem faz home office?" },
];
const questionVector = vectorOf(QUESTION);
const relevanceScores = generatedQuestions.map((item) => cosineSimilarity(vectorOf(item.text), questionVector));
const answerRelevance = mean(relevanceScores);
const weakest = generatedQuestions[relevanceScores.indexOf(Math.min(...relevanceScores))];

// Golden dataset: contagens por pergunta e o diagnóstico pela regra da aula.
const RECALL_MIN = 0.7;
const FAITHFULNESS_MIN = 0.9;
const golden = [
  { label: "home office", claims: answerClaims.length, supported: supportedCount, reference: referenceClaims.length, covered: coveredClaims },
  { label: "férias", claims: 3, supported: 3, reference: 2, covered: 2 },
  { label: "reembolso", claims: 4, supported: 2, reference: 3, covered: 3 },
  { label: "viagem", claims: 2, supported: 2, reference: 3, covered: 1 },
  { label: "plano de saúde", claims: 3, supported: 3, reference: 2, covered: 2 },
].map((item) => {
  const recall = item.covered / item.reference;
  const faith = item.supported / item.claims;
  const diagnosis = recall < RECALL_MIN ? "recuperação" : faith < FAITHFULNESS_MIN ? "geração" : "ok";
  return { ...item, recall, faith, diagnosis };
});
const byDiagnosis = (diagnosis: string) => golden.filter((item) => item.diagnosis === diagnosis).map((item) => item.label);
const retrievalFailures = byDiagnosis("recuperação");
const generationFailures = byDiagnosis("geração");
const healthy = byDiagnosis("ok");
const listing = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`);

const lesson: LessonContent = {
  id: "08-15",
  subtitle: "Como medir separadamente se a busca trouxe os trechos certos e se a resposta ficou fiel a eles, com as métricas do RAGAS calculadas passo a passo.",
  objectives: [
    "Montar um golden dataset com perguntas, respostas de referência e fontes",
    "Calcular faithfulness, context precision e context recall numa pergunta real",
    "Explicar como o RAGAS estima a answer relevance",
    "Diagnosticar se uma falha é da recuperação ou da geração",
  ],
  steps: [
    {
      id: "two-grades",
      shortTitle: "Duas notas",
      title: "A pesquisa e a redação ganham notas separadas",
      tag: "context",
      body: [
        "Um professor que corrige um trabalho escolar dá duas notas: as fontes eram boas? O texto é fiel a elas? Um aluno pode ter achado o livro certo e copiado errado, ou escrito bem a partir de uma fonte ruim. Uma nota só, “a resposta está certa?”, não diz qual dos dois consertar.",
        "Avaliar RAG começa por um [[golden dataset|golden-dataset]]: perguntas reais, com a resposta de referência e as fontes conferidas por pessoas. Cada pergunta passa pelo sistema, e um [[eval|eval]] mede a recuperação (os chunks) e a geração (a resposta) com métricas diferentes. O RAGAS (Es et al., 2023) definiu as quatro mais usadas, que esta aula calcula.",
      ],
      keyIdea: "Avalie a recuperação e a geração separadamente: só assim você sabe qual peça consertar.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "golden", kind: "documents", label: "golden dataset", col: 0, row: 0.5 },
              { id: "app", kind: "app", label: "assistente rag", col: 1, row: 0.5 },
              { id: "chunks", kind: "context", label: "chunks", col: 2, row: 0 },
              { id: "answer", kind: "answer", label: "resposta", col: 2, row: 1 },
              { id: "eval", kind: "eval", label: "métricas", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "golden", to: "app", label: "perguntas" },
              { from: "app", to: "chunks" },
              { from: "app", to: "answer" },
              { from: "chunks", to: "eval", label: "recuperação" },
              { from: "answer", to: "eval", label: "geração" },
            ],
            active: "eval",
          },
        ],
      },
      alt: "As perguntas do golden dataset passam pelo assistente RAG, que produz chunks e uma resposta; as métricas, em destaque, avaliam a recuperação e a geração por caminhos separados.",
    },
    {
      id: "faithfulness",
      shortTitle: "Fidelidade",
      title: "Faithfulness: o que a resposta afirma está nos trechos?",
      tag: "mechanism",
      body: [
        `A pergunta é “${QUESTION}”. A resposta gerada foi quebrada em ${answerClaims.length} afirmações, e cada uma foi conferida contra os chunks recuperados, como um revisor que marca com um visto o que tem fonte. ${supportedCount} têm visto; “${listing(unsupported)}” não aparece em nenhum trecho.`,
        `[[Faithfulness|faithfulness]] = afirmações sustentadas / total = ${supportedCount} / ${answerClaims.length} = ${fixed(faithfulness)}. No RAGAS, um LLM faz as duas partes: extrai as afirmações da resposta e decide, para cada uma, se o contexto a sustenta. Note o que a métrica não mede: se a afirmação é verdadeira no mundo. Ela mede se veio do contexto, que é a definição de uma resposta com [[grounding|grounding]].`,
      ],
      keyIdea: "Faithfulness pune o que foi inventado, mesmo que soe plausível: afirmação sem fonte conta como erro.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "scores",
            piece: "metrics-panel",
            metrics: [
              { id: "faithfulness", label: "faithfulness", value: fixed(faithfulness), color: "danger" },
              { id: "supported", label: "afirmações sustentadas", value: `${supportedCount} de ${answerClaims.length}` },
            ],
            highlight: "faithfulness",
          },
          {
            id: "claims",
            piece: "token-stream",
            tokens: answerClaims.map((claim) => claim.label),
            keys: answerClaims.map((claim, index) => (claim.supported ? index : -1)).filter((index) => index >= 0),
            color: "module-08",
          },
        ],
      },
      alt: `As ${answerClaims.length} afirmações da resposta, com as ${supportedCount} sustentadas pelo contexto em destaque; ${listing(unsupported)} não tem fonte. Faithfulness ${fixed(faithfulness)}.`,
    },
    {
      id: "context",
      shortTitle: "Contexto",
      title: "Context precision e recall: a busca trouxe o necessário?",
      tag: "mechanism",
      body: [
        `Agora a nota da pesquisa. Os chunks vieram nesta ordem: ${retrieved.join(", ")}, e só o 1º e o 3º são relevantes. [[Context precision|context-precision]] pergunta se o que importa está no topo: a média da precisão@k nas posições relevantes, (1/1 + 2/3) / 2 = ${fixed(precisionAsRetrieved)}. Se os relevantes viessem primeiro, seria ${fixed(precisionReordered)}.`,
        `[[Context recall|context-recall]] pergunta se nada faltou: cada afirmação da resposta de referência precisa aparecer em algum chunk. Na matriz, ${coveredClaims} das ${referenceClaims.length} estão cobertas, recall = ${fixed(contextRecall)}. A que falta, “${listing(missingReference)}”, explica a afirmação inventada do passo anterior: sem o trecho, o modelo completou a lacuna sozinho.`,
      ],
      keyIdea: "Precision diz se o ruído atrapalha o topo; recall diz se faltou o trecho que a resposta precisava.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "scores",
            piece: "metrics-panel",
            metrics: [
              { id: "precision", label: "context precision", value: fixed(precisionAsRetrieved) },
              { id: "recall", label: "context recall", value: fixed(contextRecall), color: "danger" },
            ],
            highlight: "recall",
          },
          {
            id: "support",
            piece: "matrix",
            rows: referenceClaims,
            cols: retrieved,
            values: support,
            scale: { min: 0, max: 1 },
            highlight: { row: 2, col: 0 },
            showValues: true,
            color: "module-08",
          },
        ],
      },
      alt: `Matriz das ${referenceClaims.length} afirmações de referência contra os ${retrieved.length} chunks recuperados (${retrieved.join(", ")}); ${coveredClaims} afirmações têm um chunk que as sustenta, e ${listing(missingReference)} não tem nenhum. Context precision ${fixed(precisionAsRetrieved)} e context recall ${fixed(contextRecall)}.`,
    },
    {
      id: "relevance",
      shortTitle: "Relevância",
      title: "Answer relevance: a resposta respondeu à pergunta?",
      tag: "mechanism",
      body: [
        "Uma resposta pode ser fiel aos trechos e ainda fugir do assunto. O truque do RAGAS é fazer o caminho de volta: se a resposta é boa, dá para adivinhar a pergunta só lendo ela. É como um jogo de “qual era a pergunta?”.",
        `Um LLM gera ${generatedQuestions.length} perguntas a partir da resposta, e a [[answer relevance|answer-relevance]] é o cosseno médio entre os embeddings delas e o da pergunta original. Com os embeddings de brinquedo da aula: ${generatedQuestions.map((item, index) => `“${item.label}” ${fixed(relevanceScores[index])}`).join(", ")}, média ${fixed(answerRelevance)}. A mais fraca, “${weakest.label}”, vem de uma parte da resposta que ninguém perguntou.`,
      ],
      keyIdea: "Answer relevance cai quando a resposta enche linguiça ou foge do que foi perguntado.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "relevance",
            piece: "chart",
            kind: "bar",
            series: generatedQuestions.map((item, index) => ({ label: item.label, value: Number(relevanceScores[index].toFixed(2)) })),
            max: 1,
            cutoff: { mode: "threshold", value: Number(answerRelevance.toFixed(2)), label: `média ${fixed(answerRelevance)}` },
            highlight: generatedQuestions.indexOf(weakest),
            color: "module-08",
          },
        ],
      },
      alt: `Cosseno entre cada pergunta gerada a partir da resposta e a pergunta original: ${generatedQuestions.map((item, index) => `${item.label} ${fixed(relevanceScores[index])}`).join(", ")}. A média, ${fixed(answerRelevance)}, é a answer relevance.`,
    },
    {
      id: "golden",
      shortTitle: "Diagnóstico",
      title: "Cinco perguntas, dois tipos de falha",
      tag: "example",
      body: [
        `Uma pergunta não diz nada; o golden dataset diz. Com ${golden.length} perguntas e a regra “recall abaixo de ${fixed(RECALL_MIN, 1)} é falha da recuperação; senão, faithfulness abaixo de ${fixed(FAITHFULNESS_MIN, 1)} é falha da geração”, o painel separa os casos como um médico separa sintomas.`,
        `Falham na recuperação: ${listing(retrievalFailures)}. O conserto está no chunking, nos metadados ou na busca. Falha na geração: ${listing(generationFailures)}, com todos os trechos certos e metade das afirmações sem fonte: o conserto está no prompt, no formato de citação ou no modelo. Passam: ${listing(healthy)}. Consertar a geração de uma pergunta que falha na busca não adianta nada.`,
      ],
      keyIdea: "Recall baixo: conserte a busca. Recall alto e faithfulness baixo: conserte a geração.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "diagnosis",
            piece: "metrics-panel",
            metrics: [
              { id: "retrieval", label: "falha na recuperação", value: String(retrievalFailures.length), color: "danger" },
              { id: "generation", label: "falha na geração", value: String(generationFailures.length), color: "danger" },
              { id: "ok", label: "passam", value: String(healthy.length), color: "success" },
            ],
            highlight: "retrieval",
          },
          {
            id: "recall",
            piece: "chart",
            kind: "bar",
            series: golden.map((item) => ({ label: item.label, value: Number(item.recall.toFixed(2)) })),
            max: 1,
            cutoff: { mode: "threshold", value: RECALL_MIN, label: `recall ${fixed(RECALL_MIN, 1)}` },
            color: "module-08",
          },
        ],
      },
      alt: `Context recall das ${golden.length} perguntas do golden dataset: ${golden.map((item) => `${item.label} ${fixed(item.recall)}`).join(", ")}. Abaixo de ${fixed(RECALL_MIN, 1)} ficam ${listing(retrievalFailures)}, falhas da recuperação; ${listing(generationFailures)} tem recall alto e faithfulness baixo, falha da geração.`,
    },
    {
      id: "judge",
      shortTitle: "O juiz",
      title: "Quem avalia também erra",
      tag: "tradeoff",
      body: [
        "Essas métricas usam um LLM como corretor, e corretor também tem dia ruim: pode julgar diferente a mesma resposta em duas rodadas, ou preferir respostas longas. Por isso a nota do juiz precisa ser conferida contra uma amostra corrigida por pessoas antes de virar regra.",
        "Na prática, o golden dataset roda a cada mudança de chunking, de prompt ou de modelo, como um teste de regressão, e uma queda de faithfulness ou de recall barra a mudança. O ARES (Saad-Falcon et al., 2023) treina juízes menores e usa um pequeno conjunto anotado por pessoas para dar intervalos de confiança às notas. O módulo 16 aprofunda LLM-as-a-judge e o monitoramento em produção.",
      ],
      keyIdea: "Métrica automática é um instrumento: calibre com pessoas e rode a cada mudança, como teste.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "golden", kind: "documents", label: "golden dataset", col: 0, row: 0.5 },
              { id: "app", kind: "app", label: "nova versão", col: 1, row: 0.5 },
              { id: "eval", kind: "eval", label: "llm juiz", col: 2, row: 0.5 },
              { id: "human", kind: "user", label: "amostra humana", col: 2, row: 1 },
              { id: "gate", kind: "guardrail", label: "barra regressão", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "golden", to: "app" },
              { from: "app", to: "eval", label: "respostas" },
              { from: "human", to: "eval", label: "calibra", variant: "alternative" },
              { from: "eval", to: "gate", label: "notas" },
            ],
            active: "eval",
            done: ["golden", "app"],
          },
        ],
      },
      alt: "Cada nova versão roda o golden dataset; o LLM juiz, em destaque, dá as notas, calibrado por uma amostra corrigida por pessoas, e uma barreira bloqueia a versão se as métricas caírem.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Quatro números, duas perguntas",
      tag: "summary",
      body: [
        "Context precision e context recall avaliam a busca: o certo veio, e veio no topo? Faithfulness e answer relevance avaliam a geração: a resposta é fiel aos trechos e responde ao que foi perguntado? Juntas, elas apontam a peça quebrada.",
        "Com a avaliação montada, dá para otimizar com segurança. A próxima aula mede uma mudança antes e depois e mostra como cortar custo e latência sem perder qualidade.",
      ],
      keyIdea: "Sem golden dataset, cada mudança no RAG é um palpite.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "metrics",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "golden", label: "golden dataset" },
              { id: "precision", label: "context precision" },
              { id: "recall", label: "context recall", color: "module-08" },
              { id: "faithfulness", label: "faithfulness" },
              { id: "relevance", label: "answer relevance" },
              { id: "diagnosis", label: "diagnóstico", color: "brand" },
            ],
          },
        ],
      },
      alt: "Fluxo em chips: golden dataset, context precision, context recall, faithfulness, answer relevance e diagnóstico.",
    },
  ],
  realWorldExample:
    "O RAGAS é uma biblioteca de código aberto que implementa essas métricas: você passa a pergunta, os chunks recuperados, a resposta e a referência, e ela devolve faithfulness, answer relevancy, context precision e context recall, usando um LLM e um modelo de embedding como juízes. Ferramentas de observabilidade de LLM costumam rodar avaliações desse tipo sobre amostras do tráfego de produção.",
  code: {
    language: "python",
    source: `def context_precision(relevant):
    """Média da precisão@k nas posições relevantes, como no RAGAS."""
    hits, total = 0, 0.0
    for k, is_relevant in enumerate(relevant, start=1):
        if is_relevant:
            hits += 1
            total += hits / k
    return total / hits if hits else 0.0

print(context_precision([1, 0, 1, 0]))  # 0.83
print(context_precision([1, 1, 0, 0]))  # 1.0`,
    caption: "A context precision da cena: os mesmos chunks valem mais quando os relevantes vêm no topo.",
  },
  tradeOffs: {
    pros: [
      "Separa falhas da busca e da geração, o que aponta o que consertar",
      "Roda automático a cada mudança, como um teste de regressão",
      "Faithfulness mede alucinação em relação ao contexto sem precisar de outra fonte",
    ],
    cons: [
      "O golden dataset custa horas de especialistas e envelhece com os documentos",
      "Juízes LLM variam entre rodadas e têm vieses, como preferir respostas longas",
      "Cada pergunta avaliada gasta várias chamadas de LLM",
    ],
    alternatives: [
      "Métricas de busca clássicas, como recall@k e MRR, quando há rótulos de relevância (módulo 07)",
      "Avaliação humana por amostragem, para calibrar e auditar os juízes",
    ],
  },
  knowledgeCheck: [
    {
      id: "which-fix",
      prompt: "Uma pergunta tem context recall 1,0 e faithfulness 0,4. Onde está o problema?",
      options: [
        "Na busca: faltaram chunks",
        "Na geração: os trechos certos chegaram, mas a resposta afirma coisas que eles não dizem",
        "No modelo de embedding",
        "No golden dataset, que está errado com certeza",
      ],
      correct: 1,
      explanation: "Recall 1,0 diz que o contexto tinha tudo o que a referência precisa. Faithfulness baixa diz que a resposta foi além dele: o conserto está no prompt, nas citações ou no modelo.",
      lesson: "08-15",
    },
    {
      id: "precision-order",
      prompt: "Os chunks relevantes são os mesmos, mas passam das posições 3 e 4 para as posições 1 e 2. O que muda?",
      options: [
        "Context recall sobe",
        "Context precision sobe, porque o que importa ficou no topo",
        "Faithfulness cai",
        "Nada: a ordem não entra nas métricas",
      ],
      correct: 1,
      explanation: "Context precision é a média da precisão@k nas posições relevantes: (1/3 + 2/4) / 2 ≈ 0,42 vira (1/1 + 2/2) / 2 = 1. O recall não muda, porque os mesmos trechos continuam lá.",
      lesson: "08-15",
    },
  ],
  related: ["08-11", "08-16", "16-04"],
  references: [
    { title: "Es et al. (2023), RAGAS: Automated Evaluation of Retrieval Augmented Generation", url: "https://arxiv.org/abs/2309.15217", kind: "paper" },
    { title: "Ragas: documentação", url: "https://docs.ragas.io/", kind: "docs" },
    { title: "Saad-Falcon et al. (2023), ARES: An Automated Evaluation Framework for Retrieval-Augmented Generation Systems", url: "https://arxiv.org/abs/2311.09476", kind: "paper" },
  ],
};

export default lesson;
