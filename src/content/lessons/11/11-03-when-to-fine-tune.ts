import type { GraphSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Quando fazer fine-tuning, com uma árvore de decisão e uma conta de tokens. O prompt longo tem 600 tokens de
// instruções e 8 exemplos de 150 tokens (few-shot); o modelo ajustado precisa só de 150. O ajuste usa 2 mil
// exemplos de 450 tokens por 3 épocas. Todos esses tamanhos são suposições do exemplo, declaradas no texto, e a
// conta compara tokens processados, não preço: o preço por token de treino e de inferência varia por provedor.

const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const fixed = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const INSTRUCTION_TOKENS = 600;
const SHOTS = 8;
const TOKENS_PER_SHOT = 150;
const longPrompt = INSTRUCTION_TOKENS + SHOTS * TOKENS_PER_SHOT;
const SHORT_PROMPT = 150;
const savedPerRequest = longPrompt - SHORT_PROMPT;

const TRAIN_EXAMPLES = 2_000;
const TOKENS_PER_EXAMPLE = 450;
const EPOCHS = 3;
const trainingTokens = TRAIN_EXAMPLES * TOKENS_PER_EXAMPLE * EPOCHS;
const breakEven = Math.ceil(trainingTokens / savedPerRequest);
const DAILY_REQUESTS = 50_000;
const savedPerDay = DAILY_REQUESTS * savedPerRequest;
const shrink = longPrompt / SHORT_PROMPT;

const decision = (path: string[], highlight: string[]): GraphSpec => ({
  id: "tree",
  piece: "graph",
  nodes: [
    { id: "q-prompt", label: "o prompt resolve?", x: 0.5, y: 0.08 },
    { id: "prompt", label: "fique no prompt", x: 0.15, y: 0.38, color: "success" },
    { id: "q-gap", label: "o que falta?", x: 0.62, y: 0.38 },
    { id: "rag", label: "RAG", x: 0.32, y: 0.7, color: "info" },
    { id: "q-data", label: "tem bons exemplos?", x: 0.82, y: 0.66 },
    { id: "ft", label: "fine-tuning", x: 0.66, y: 0.94, color: "module-11" },
    { id: "collect", label: "colete dados", x: 0.96, y: 0.94, color: "muted" },
  ],
  edges: [
    { from: "q-prompt", to: "prompt", label: "sim" },
    { from: "q-prompt", to: "q-gap", label: "não" },
    { from: "q-gap", to: "rag", label: "fatos" },
    { from: "q-gap", to: "q-data", label: "comportamento" },
    { from: "q-data", to: "ft", label: "sim" },
    { from: "q-data", to: "collect", label: "não" },
  ],
  path,
  highlight,
});

const lesson: LessonContent = {
  id: "11-03",
  subtitle: "Prompt, RAG ou fine-tuning: como separar falta de conhecimento de falta de comportamento, e quando a conta do prompt longo paga o ajuste.",
  objectives: [
    "Distinguir problemas de conhecimento de problemas de comportamento",
    "Montar um baseline e um conjunto de testes antes de decidir",
    "Calcular quando o ajuste se paga em tokens de prompt economizados",
    "Listar os custos que o fine-tuning deixa para depois",
  ],
  steps: [
    {
      id: "tools",
      shortTitle: "Ferramentas",
      title: "Três jeitos de mudar a resposta",
      tag: "context",
      body: [
        "Pense num funcionário novo. Se ele erra porque não sabe o horário da loja, você entrega o manual. Se erra porque fala de um jeito grosseiro, o manual não ajuda: ele precisa de treino. Se só não entendeu o pedido, basta explicar melhor. Cada problema tem um remédio diferente.",
        "Com um LLM é igual. O [[prompt|prompt]] explica a tarefa a cada chamada. O [[RAG|rag]] entrega os documentos certos na hora da pergunta. O [[fine-tuning|fine-tuning]] muda os pesos, para o comportamento sair sem precisar ser explicado. Os três se combinam: um modelo ajustado também recebe prompt e contexto.",
      ],
      keyIdea: "Prompt explica, RAG informa, fine-tuning treina: cada um resolve um tipo de falha.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "tools",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "pergunta", col: 0, row: 0.5 },
              { id: "prompt", kind: "context", label: "prompt", col: 1, row: 0 },
              { id: "rag", kind: "vector-db", label: "rag", col: 1, row: 1 },
              { id: "llm", kind: "llm", label: "modelo", col: 2, row: 0.5 },
              { id: "data", kind: "documents", label: "exemplos", col: 3, row: 0 },
              { id: "answer", kind: "answer", label: "resposta", col: 3, row: 1 },
            ],
            edges: [
              { from: "user", to: "prompt" },
              { from: "user", to: "rag" },
              { from: "prompt", to: "llm", label: "explica" },
              { from: "rag", to: "llm", label: "informa" },
              { from: "data", to: "llm", label: "treina" },
              { from: "llm", to: "answer" },
            ],
            active: "llm",
          },
        ],
      },
      alt: "A pergunta passa pelo prompt, que explica a tarefa, e pelo RAG, que traz documentos; os exemplos treinam o modelo, em destaque, que gera a resposta.",
    },
    {
      id: "gap",
      shortTitle: "O que falta",
      title: "Falta conhecimento ou falta comportamento?",
      tag: "mechanism",
      body: [
        "A primeira pergunta é se um prompt bem escrito já resolve. Se resolve, pare ali: é a opção mais barata de manter. Se não resolve, olhe os erros. Respostas com fatos errados ou desatualizados pedem RAG: o modelo precisa de fonte, não de treino.",
        "Respostas com fatos certos e forma errada pedem ajuste: JSON fora do schema, tom fora da marca, um classificador que não respeita os seus rótulos, um modelo pequeno que precisa imitar um grande. Mesmo assim, o ajuste só vale com bons exemplos; sem eles, o primeiro trabalho é coletar dados.",
      ],
      keyIdea: "Fatos errados pedem RAG; forma, estilo e tarefa estreita pedem fine-tuning.",
      scene: { kind: "pieces", layout: "single", pieces: [decision(["q-prompt", "q-gap", "q-data", "ft"], ["ft"])] },
      alt: "Árvore de decisão: o prompt resolve? Se sim, fique no prompt. Se não, o que falta? Fatos levam ao RAG; comportamento leva a tem bons exemplos?, que leva ao fine-tuning, em destaque, ou a coletar dados.",
    },
    {
      id: "baseline",
      shortTitle: "Baseline",
      title: "Meça antes de treinar",
      tag: "mechanism",
      body: [
        "Sem medida, a decisão vira opinião. Antes de qualquer ajuste, monte um [[conjunto de casos de teste|eval]] com exemplos reais e o critério de acerto de cada um. Rode a solução mais simples e anote o resultado: esse é o [[baseline|baseline]] que o ajuste precisa vencer.",
        "Suba um degrau por vez e meça de novo: prompt, few-shot, RAG. Muitas vezes o problema some antes do fine-tuning. Quando não some, você já tem o conjunto de testes que vai avaliar o modelo ajustado na aula 11.13, e os casos que falharam viram ideias de exemplos de treino.",
      ],
      keyIdea: "O baseline e o conjunto de testes vêm antes do ajuste, não depois.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "ladder",
            piece: "pipeline",
            stages: [
              { id: "eval", label: "casos de teste" },
              { id: "prompt", label: "prompt" },
              { id: "few-shot", label: "few-shot" },
              { id: "rag", label: "RAG" },
              { id: "ft", label: "fine-tuning", color: "module-11" },
            ],
            active: "few-shot",
            done: ["eval", "prompt"],
            branch: { id: "stop", label: "bom o bastante: pare", from: "few-shot", edgeLabel: "passou", color: "success" },
          },
        ],
      },
      alt: "Pipeline de decisão: casos de teste e prompt concluídos, few-shot em destaque, com um ramo que sai dele quando o resultado passa: bom o bastante, pare. RAG e fine-tuning vêm depois.",
    },
    {
      id: "tokens",
      shortTitle: "A conta",
      title: "Quando o prompt longo paga o ajuste",
      tag: "example",
      body: [
        `Um motivo comum para ajustar é custo. Suponha um prompt com ${INSTRUCTION_TOKENS} tokens de instruções e ${SHOTS} exemplos de ${TOKENS_PER_SHOT} tokens: ${integer(longPrompt)} tokens em toda chamada. O modelo ajustado aprendeu o formato e precisa de ${SHORT_PROMPT}: ${fixed(shrink)} vezes menos, e um tempo até o primeiro token menor, porque há menos prompt para processar.`,
        `O ajuste com ${integer(TRAIN_EXAMPLES)} exemplos de ${TOKENS_PER_EXAMPLE} tokens por ${EPOCHS} épocas processa ${fixed(trainingTokens / 1e6)} milhões de tokens. Cada chamada economiza ${integer(savedPerRequest)}, então em tokens o ajuste se paga depois de ${integer(breakEven)} chamadas. Com ${integer(DAILY_REQUESTS)} chamadas por dia, são ${fixed(savedPerDay / 1e6)} milhões de tokens a menos por dia. Antes de decidir, troque tokens por preço: treino e inferência têm preços diferentes.`,
      ],
      keyIdea: "Com volume alto, encurtar o prompt de toda chamada paga um ajuste em pouco tempo.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "saved", label: "tokens economizados por chamada", value: integer(savedPerRequest) },
              { id: "break-even", label: "chamadas para pagar o ajuste", value: integer(breakEven), color: "module-11" },
              { id: "daily", label: `por dia (${integer(DAILY_REQUESTS)} chamadas)`, value: `${fixed(savedPerDay / 1e6)} mi tokens` },
            ],
            highlight: "break-even",
          },
          {
            id: "prompt-size",
            piece: "chart",
            kind: "bar",
            series: [
              { label: "instruções", value: INSTRUCTION_TOKENS },
              { label: "exemplos", value: SHOTS * TOKENS_PER_SHOT },
              { label: "prompt longo", value: longPrompt },
              { label: "ajustado", value: SHORT_PROMPT },
            ],
            highlight: 3,
            color: "module-11",
          },
        ],
      },
      alt: `Tokens por chamada: ${INSTRUCTION_TOKENS} de instruções e ${SHOTS * TOKENS_PER_SHOT} de exemplos somam ${integer(longPrompt)} no prompt longo, contra ${SHORT_PROMPT} no modelo ajustado. O ajuste se paga em ${integer(breakEven)} chamadas.`,
    },
    {
      id: "upkeep",
      shortTitle: "Manutenção",
      title: "O custo que fica depois do treino",
      tag: "tradeoff",
      body: [
        "Um prompt muda num commit. Um modelo ajustado tem ciclo próprio: o dataset precisa de dono, cada mudança de política pede exemplos novos, e cada versão nova do modelo base pede refazer o ajuste e avaliar de novo, porque um adaptador treinado numa base não serve em outra.",
        "Há também o risco: o ajuste pode piorar o que não estava nos dados, como recusas de segurança ou outros idiomas. Por isso a decisão inclui a pergunta “quem vai manter isto daqui a seis meses?”. Se ninguém, um prompt mais longo pode ser a escolha mais barata de verdade.",
      ],
      keyIdea: "Fine-tuning é um compromisso de manutenção, não um evento único.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "upkeep",
            piece: "block-diagram",
            blocks: [
              { id: "new-base", kind: "llm", label: "base nova", col: 0, row: 0 },
              { id: "data", kind: "documents", label: "dataset", col: 0, row: 1 },
              { id: "train", kind: "server", label: "refazer ajuste", col: 1, row: 0.5 },
              { id: "eval", kind: "eval", label: "avaliar de novo", col: 2, row: 0.5 },
              { id: "deploy", kind: "app", label: "produção", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "new-base", to: "train" },
              { from: "data", to: "train", label: "atualizado" },
              { from: "train", to: "eval" },
              { from: "eval", to: "deploy", label: "passou" },
              { from: "eval", to: "data", label: "falhou", variant: "alternative" },
            ],
            active: "eval",
          },
        ],
      },
      alt: "Uma base nova e o dataset atualizado alimentam um novo ajuste, que passa pela avaliação, em destaque: se passa, vai para produção; se falha, volta, tracejado, para o dataset.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Uma decisão com medida",
      tag: "summary",
      body: [
        "Comece pelo prompt e por um conjunto de testes. Se faltam fatos, use RAG. Se falta comportamento e você tem bons exemplos, ajuste. Faça a conta do volume: prompts longos em muitas chamadas pagam o treino. E planeje quem mantém o dataset e refaz o ajuste quando a base mudar.",
        "Decidido o ajuste, o trabalho de verdade começa nos dados. A próxima aula mostra como montar o dataset.",
      ],
      keyIdea: "Prompt primeiro, RAG para fatos, fine-tuning para comportamento com dados e volume.",
      scene: { kind: "pieces", layout: "single", pieces: [decision([], ["prompt", "rag", "ft", "collect"])] },
      alt: "A mesma árvore de decisão com os quatro destinos em destaque: ficar no prompt, RAG, fine-tuning ou coletar dados.",
    },
  ],
  realWorldExample:
    "A documentação de fine-tuning da OpenAI lista como casos típicos definir estilo e tom, deixar a saída mais confiável num formato e trocar um modelo grande com prompt longo por um modelo menor ajustado, e recomenda tentar antes prompt engineering, porque a iteração é muito mais rápida.",
  tradeOffs: {
    pros: [
      "Comportamento consistente sem depender de instruções longas",
      "Prompts curtos: menos tokens e menor tempo até o primeiro token",
      "Um modelo menor ajustado pode substituir um maior numa tarefa estreita",
    ],
    cons: [
      "Exige dataset, avaliação e manutenção a cada mudança",
      "Precisa ser refeito quando o modelo base muda",
      "Não resolve falta de conhecimento atualizado",
    ],
    alternatives: ["Prompt e few-shot com cache de prompt, quando o volume é baixo", "RAG, para fatos que mudam"],
  },
  knowledgeCheck: [
    {
      id: "json-errors",
      prompt: "O assistente acerta os dados do cliente, mas 1 em cada 10 respostas sai com um JSON fora do schema, mesmo com instruções claras. O que tentar?",
      options: [
        "RAG com mais documentos",
        "Saída estruturada com schema e, se ainda falhar no volume, fine-tuning com exemplos no formato certo",
        "Aumentar a temperatura",
        "Pré-treinar um modelo do zero",
      ],
      correct: 1,
      explanation: "Os fatos estão certos: o problema é de formato, um comportamento. Primeiro as ferramentas de prompt e decodificação; o ajuste com exemplos no formato certo é o passo seguinte.",
      lesson: "11-03",
    },
    {
      id: "low-volume",
      prompt: "Uma ferramenta interna recebe 30 chamadas por dia e funciona bem com um prompt de 2 mil tokens. Vale ajustar um modelo para encurtar o prompt?",
      options: [
        "Sim, todo prompt longo deve virar fine-tuning",
        "Provavelmente não: com volume baixo, a economia de tokens demora a pagar o treino e a manutenção",
        "Sim, porque o ajuste elimina alucinações",
        "Não, porque modelos ajustados não aceitam prompt",
      ],
      correct: 1,
      explanation: "A conta de tokens depende do volume. Com 30 chamadas por dia, o prompt longo custa pouco, e o ajuste traz manutenção sem retorno claro.",
      lesson: "11-03",
    },
  ],
  related: ["05-06", "08-01", "11-04"],
  references: [
    { title: "OpenAI: Fine-tuning guide", url: "https://platform.openai.com/docs/guides/fine-tuning", kind: "docs" },
    { title: "OpenAI: Prompt engineering guide", url: "https://platform.openai.com/docs/guides/prompt-engineering", kind: "docs" },
    { title: "Lewis et al. (2020), Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks", url: "https://arxiv.org/abs/2005.11401", kind: "paper" },
  ],
};

export default lesson;
