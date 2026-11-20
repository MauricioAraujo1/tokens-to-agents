import type { PipelineSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Ciclo de vida do treino de um LLM. Os tamanhos de dados são os publicados: o Llama 2 com 2 trilhões de
// tokens de pré-treino e 27.540 exemplos de SFT (Touvron et al., 2023), e os prompts de SFT, do modelo de
// recompensa e do PPO do InstructGPT (Ouyang et al., 2022). O custo usa 6 · N · D, e a comparação de
// tokens supõe 500 tokens por exemplo de SFT, uma suposição declarada no texto.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
/** Notação científica legível: 8,40 × 10²². */
const scientific = (value: number) => {
  const exponent = Math.floor(Math.log10(value));
  const superscript = String(exponent)
    .split("")
    .map((digit) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(digit)])
    .join("");
  return `${fixed(value / 10 ** exponent)} × 10${superscript}`;
};

const PARAMS = 7e9;
const PRETRAIN_TOKENS = 2e12;
const pretrainFlops = 6 * PARAMS * PRETRAIN_TOKENS;

const SFT_EXAMPLES = 27_540;
/** Suposição do exemplo: tamanho médio de um par instrução e resposta. */
const TOKENS_PER_EXAMPLE = 500;
const sftTokens = SFT_EXAMPLES * TOKENS_PER_EXAMPLE;
const dataRatio = PRETRAIN_TOKENS / sftTokens;
const sftFlops = 6 * PARAMS * sftTokens;
const ratioThousands = integer(dataRatio / 1000);

const instructGpt = [
  { label: "SFT", prompts: 13_000 },
  { label: "recompensa", prompts: 33_000 },
  { label: "PPO", prompts: 31_000 },
];

const lifecycle = (active: string, done: string[]): PipelineSpec => ({
  id: "life",
  piece: "pipeline",
  stages: [
    { id: "data", label: "dados" },
    { id: "pretrain", label: "pré-treino" },
    { id: "sft", label: "SFT" },
    { id: "prefs", label: "preferências" },
    { id: "eval", label: "avaliação" },
    { id: "deploy", label: "deploy", color: "module-04" },
  ],
  active,
  done,
  branch: { id: "feedback", label: "novos dados", from: "deploy", edgeLabel: "feedback", color: "muted" },
});

const basePrompt = ["Qual", "a", "capital", "da", "França", "?"];
const baseContinuation = ["Qual", "a", "capital", "da", "Itália", "?"];
const instructContinuation = ["A", "capital", "é", "Paris", "."];

const lesson: LessonContent = {
  id: "04-11",
  subtitle: "As etapas que levam um Transformer de pesos aleatórios a um assistente em produção: dados, pré-treino, ajuste com instruções, preferências, avaliação e deploy.",
  objectives: [
    "Ordenar as etapas do ciclo de vida de um LLM e o que cada uma produz",
    "Diferenciar modelo base e modelo ajustado para instruções",
    "Comparar a escala de dados e de cálculo do pré-treino e do ajuste fino",
    "Explicar por que avaliação e feedback fecham o ciclo",
  ],
  steps: [
    {
      id: "school",
      shortTitle: "As etapas",
      title: "Da escola ao primeiro emprego",
      tag: "context",
      body: [
        "Pense na formação de um profissional: anos de leitura ampla na escola, um estágio em que alguém mostra como o trabalho é feito, avaliações de desempenho e, por fim, o trabalho de verdade, com feedback que vira aprendizado. Um LLM passa por etapas parecidas.",
        "Primeiro vêm os dados e o [[pré-treino|pre-training]], que produzem o modelo base. Depois, o [[ajuste fino supervisionado|supervised-fine-tuning]] ensina o formato de assistente, e o ajuste por preferências refina o que as pessoas consideram uma boa resposta. Por fim, avaliação, deploy e o feedback dos usuários, que alimenta a próxima versão.",
      ],
      keyIdea: "Um assistente é o resultado de várias etapas de treino, cada uma com dados e objetivo próprios.",
      scene: { kind: "pieces", layout: "single", pieces: [lifecycle("data", [])] },
      alt: "Ciclo de vida em pipeline: dados (em destaque), pré-treino, SFT, preferências, avaliação e deploy, com um ramo de feedback que gera novos dados.",
    },
    {
      id: "pretrain",
      shortTitle: "Pré-treino",
      title: "Pré-treino: ler quase tudo, uma vez",
      tag: "mechanism",
      body: [
        "A primeira etapa é a mais cara: o modelo lê trilhões de tokens de texto da web, livros e código, prevendo o próximo token. Antes disso, os dados passam por filtros de qualidade, remoção de duplicatas e de informação pessoal. A qualidade desse corpus define boa parte do que o modelo vai saber.",
        `O Llama 2 7B foi pré-treinado com 2 trilhões de tokens. Pela regra de cerca de 6 FLOPs por parâmetro por token, são 6 × 7 × 10⁹ × 2 × 10¹² ≈ ${scientific(pretrainFlops)} operações. O resultado é um [[modelo base|base-model]]: sabe muito sobre linguagem e o mundo, mas ainda não sabe conversar.`,
      ],
      keyIdea: "O pré-treino concentra quase todo o custo e quase todo o conhecimento do modelo.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "tokens", label: "tokens (Llama 2)", value: "2 tri" },
              { id: "params", label: "parâmetros", value: "7 bi" },
              { id: "flops", label: "custo ≈ 6 · N · D", value: `${scientific(pretrainFlops)} FLOPs`, color: "module-04" },
            ],
            highlight: "flops",
          },
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "web", kind: "documents", label: "web, livros, código", col: 0, row: 0 },
              { id: "filter", kind: "guardrail", label: "filtros", col: 1, row: 0 },
              { id: "tokens", kind: "tokens", label: "2 tri tokens", col: 2, row: 0 },
              { id: "base", kind: "llm", label: "modelo base", col: 3, row: 0 },
            ],
            edges: [
              { from: "web", to: "filter" },
              { from: "filter", to: "tokens", label: "limpos" },
              { from: "tokens", to: "base", label: "próximo token" },
            ],
            active: "base",
            done: ["web", "filter", "tokens"],
          },
        ],
      },
      alt: `Texto da web, livros e código passam por filtros e viram 2 trilhões de tokens, que treinam o modelo base, em destaque. Custo estimado de ${scientific(pretrainFlops)} FLOPs para o Llama 2 7B.`,
    },
    {
      id: "base-vs-chat",
      shortTitle: "Base e chat",
      title: "O modelo base completa; o ajustado responde",
      tag: "mechanism",
      body: [
        "Dê a pergunta “Qual a capital da França?” a um modelo base e ele pode continuar com outra pergunta, “Qual a capital da Itália?”, porque na web perguntas aparecem em listas. Ele está fazendo exatamente o que aprendeu: continuar o texto de forma provável.",
        `O SFT treina o mesmo modelo, com a mesma perda de próximo token, em exemplos de instrução e resposta escritos por pessoas. O Llama 2 usou ${integer(SFT_EXAMPLES)} exemplos nessa etapa. Poucos dados bastam porque o conhecimento já está nos pesos: o SFT ensina o formato, não os fatos.`,
      ],
      keyIdea: "O SFT não ensina o que o modelo sabe; ensina como ele deve responder.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          { id: "base", piece: "token-stream", tokens: [...basePrompt, ...baseContinuation], query: basePrompt.length, color: "muted" },
          { id: "chat", piece: "token-stream", tokens: [...basePrompt, ...instructContinuation], query: basePrompt.length + 3, color: "module-04" },
        ],
      },
      alt: "Em cima, o modelo base continua a pergunta com outra pergunta, sobre a capital da Itália. Embaixo, o modelo ajustado responde: a capital é Paris.",
    },
    {
      id: "preferences",
      shortTitle: "Preferências",
      title: "Preferências: o que é uma resposta melhor",
      tag: "mechanism",
      body: [
        "Depois do SFT, o modelo responde, mas nem sempre do jeito mais útil, honesto ou seguro. Na etapa de preferências, pessoas comparam duas respostas para o mesmo prompt e escolhem a melhor. Essas comparações treinam o modelo a preferir o tipo de resposta escolhido, com RLHF ou DPO, tema da aula 04.13.",
        `O InstructGPT mostra a escala dessas etapas: cerca de ${instructGpt.map((stage) => `${integer(stage.prompts)} prompts para ${stage.label}`).join(", ")}. No paper, as pessoas preferiram as respostas do InstructGPT de 1,3 bilhão de parâmetros às do GPT-3 de 175 bilhões: o ajuste pesou mais que o tamanho.`,
      ],
      keyIdea: "Dezenas de milhares de exemplos e comparações transformam um modelo base num assistente.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "instructgpt",
            piece: "chart",
            kind: "bar",
            series: instructGpt.map((stage) => ({ label: stage.label, value: stage.prompts })),
            highlight: 1,
            color: "module-04",
          },
        ],
      },
      alt: `Prompts usados em cada etapa do InstructGPT: ${instructGpt.map((stage) => `${stage.label} ${integer(stage.prompts)}`).join(", ")}.`,
    },
    {
      id: "deploy",
      shortTitle: "Deploy",
      title: "Avaliação, deploy e o ciclo que recomeça",
      tag: "example",
      body: [
        "Antes de ir para produção, o modelo passa por [[avaliações|eval]]: benchmarks públicos, testes de segurança com tentativas de induzir respostas perigosas e avaliações humanas. Uma versão nova só substitui a anterior se melhora no que importa sem piorar o resto.",
        "Em produção, o modelo é servido, monitorado e gera sinais: respostas com joinha para cima ou para baixo, erros reportados, conversas que falham. Esses sinais, filtrados e com consentimento, viram dados para a próxima rodada de ajuste. O ciclo não termina no deploy.",
      ],
      keyIdea: "Deploy é uma etapa do ciclo, não o fim: o uso real produz os dados da próxima versão.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "model", kind: "llm", label: "modelo ajustado", col: 0, row: 0 },
              { id: "eval", kind: "eval", label: "avaliação", col: 1, row: 0 },
              { id: "server", kind: "server", label: "deploy", col: 2, row: 0 },
              { id: "users", kind: "user", label: "usuários", col: 3, row: 0 },
              { id: "data", kind: "documents", label: "feedback", col: 2, row: 1 },
            ],
            edges: [
              { from: "model", to: "eval" },
              { from: "eval", to: "server", label: "aprovado" },
              { from: "server", to: "users" },
              { from: "users", to: "data", label: "sinais" },
              { from: "data", to: "model", label: "próxima rodada", variant: "alternative" },
            ],
            active: "eval",
          },
        ],
      },
      alt: "O modelo ajustado passa pela avaliação, em destaque, e, aprovado, vai para o deploy; os usuários geram sinais de feedback, que voltam, pelo caminho tracejado, para a próxima rodada de ajuste.",
    },
    {
      id: "scale",
      shortTitle: "Escala",
      title: "Onde está o custo",
      tag: "tradeoff",
      body: [
        `Supondo ${TOKENS_PER_EXAMPLE} tokens por exemplo, os ${integer(SFT_EXAMPLES)} exemplos de SFT do Llama 2 somam cerca de ${fixed(sftTokens / 1e6, 1)} milhões de tokens: o pré-treino leu cerca de ${ratioThousands} mil vezes mais. Na mesma conta de 6 · N · D, o SFT custa ${scientific(sftFlops)} FLOPs, uma fração mínima do pré-treino.`,
        "Por isso quase ninguém pré-treina: empresas e equipes partem de um modelo base ou já ajustado e fazem só as etapas finais, com os seus dados. O custo baixo do ajuste tem outro lado: dados ruins de SFT ou de preferências estragam o comportamento rápido, e o modelo pode esquecer habilidades que tinha.",
      ],
      keyIdea: "Pré-treino: caro e raro. Ajuste: barato e frequente, mas sensível à qualidade dos dados.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "tokens", label: "pré-treino", value: "2 tri tokens" },
              { id: "params", label: `SFT (${TOKENS_PER_EXAMPLE} tokens/exemplo)`, value: `${fixed(sftTokens / 1e6, 1)} mi tokens` },
              { id: "flops", label: "razão de dados", value: `≈ ${ratioThousands} mil ×`, color: "module-04" },
              { id: "sft-flops", label: "custo do SFT", value: `${scientific(sftFlops)} FLOPs` },
            ],
            highlight: "flops",
          },
        ],
      },
      alt: `Pré-treino com 2 trilhões de tokens contra cerca de ${fixed(sftTokens / 1e6, 1)} milhões de tokens de SFT: uma razão de cerca de ${ratioThousands} mil vezes. O SFT custa ${scientific(sftFlops)} FLOPs.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "O ciclo inteiro",
      tag: "summary",
      body: [
        "Dados limpos alimentam o pré-treino, que produz o modelo base. O SFT ensina o formato de assistente, as preferências refinam a qualidade, a avaliação decide se a versão sai e o deploy gera o feedback da próxima rodada.",
        "Na sua equipe, o trabalho quase sempre começa do meio do ciclo: escolher um modelo pronto, talvez ajustá-lo e avaliá-lo com os seus casos. A próxima aula trata dessa escolha.",
      ],
      keyIdea: "Dados → pré-treino → SFT → preferências → avaliação → deploy → feedback.",
      scene: { kind: "pieces", layout: "single", pieces: [lifecycle("deploy", ["data", "pretrain", "sft", "prefs", "eval"])] },
      alt: "O mesmo pipeline com dados, pré-treino, SFT, preferências e avaliação concluídos e o deploy em destaque, com o ramo de feedback gerando novos dados.",
    },
  ],
  realWorldExample:
    "A Meta publicou o Llama 2 em duas formas: o modelo base, só pré-treinado, e o Llama 2-Chat, que passou por SFT e por RLHF com mais de um milhão de comparações humanas. Os dois têm a mesma arquitetura e o mesmo pré-treino; a diferença de comportamento vem toda das etapas finais.",
  code: {
    language: "python",
    source: `from transformers import pipeline

base = pipeline("text-generation", model="meta-llama/Llama-2-7b-hf")
chat = pipeline("text-generation", model="meta-llama/Llama-2-7b-chat-hf")

prompt = "Qual a capital da França?"
print(base(prompt, max_new_tokens=20)[0]["generated_text"])
print(chat([{"role": "user", "content": prompt}], max_new_tokens=20)[0]["generated_text"])`,
    caption: "O mesmo pré-treino em duas versões: o modelo base continua o texto, e o chat, ajustado com SFT e RLHF, responde. Os repositórios do Llama 2 exigem aceitar a licença no Hub.",
  },
  tradeOffs: {
    pros: [
      "Separar as etapas permite reaproveitar um pré-treino caro em muitos ajustes baratos",
      "Poucos milhares de bons exemplos mudam bastante o comportamento do modelo",
      "O feedback de produção alimenta melhorias contínuas",
    ],
    cons: [
      "O pré-treino custa tanto que poucas organizações conseguem fazê-lo",
      "Dados ruins de ajuste estragam o comportamento rápido",
      "Ajustes podem fazer o modelo esquecer habilidades do pré-treino",
    ],
    alternatives: ["Usar um modelo já ajustado e só mudar o prompt", "Ajuste com LoRA, que treina poucos parâmetros sobre um modelo pronto"],
  },
  knowledgeCheck: [
    {
      id: "base-behavior",
      prompt: "Você manda “Escreva um e-mail de desculpas” para um modelo base e ele devolve uma lista de títulos de e-mails. Por quê?",
      options: [
        "O modelo está com defeito",
        "O modelo base só aprendeu a continuar texto provável; seguir instruções vem do SFT",
        "A temperatura estava alta demais",
        "Faltou contexto sobre a empresa",
      ],
      correct: 1,
      explanation: "O modelo base continua o texto como na web, onde pedidos assim aparecem em listas. O SFT treina o formato de instrução e resposta.",
      lesson: "04-11",
    },
    {
      id: "where-to-start",
      prompt: "Uma equipe quer um assistente para o seu domínio, com orçamento pequeno. Por onde começar no ciclo?",
      options: [
        "Pré-treinar um modelo do zero com os dados da empresa",
        "Partir de um modelo pronto e, se precisar, ajustar com SFT e avaliar com casos do domínio",
        "Pular a avaliação para economizar",
        "Coletar trilhões de tokens antes de qualquer teste",
      ],
      correct: 1,
      explanation: "O pré-treino é a etapa mais cara do ciclo. Começar de um modelo pronto e fazer só as etapas finais cabe em orçamentos pequenos.",
      lesson: "04-11",
    },
  ],
  related: ["03-14", "04-13", "11-02"],
  references: [
    { title: "Ouyang et al. (2022), Training language models to follow instructions with human feedback", url: "https://arxiv.org/abs/2203.02155", kind: "paper" },
    { title: "Touvron et al. (2023), Llama 2: Open Foundation and Fine-Tuned Chat Models", url: "https://arxiv.org/abs/2307.09288", kind: "paper" },
    { title: "Hugging Face TRL: SFT Trainer", url: "https://huggingface.co/docs/trl/sft_trainer", kind: "docs" },
  ],
};

export default lesson;
