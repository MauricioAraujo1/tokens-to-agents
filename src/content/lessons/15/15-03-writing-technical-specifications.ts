import type { LessonContent } from "../../../types/content";

// Escrever uma spec, com contas no arquivo. Um "lint de spec" de brinquedo marca as frases que usam
// palavras vagas (rápido, fácil, adequado...) e conta quantas sobram em cada versão do rascunho. Os números
// do exemplo real saem de .specs/features/learning-platform/spec.md: histórias, critérios, itens fora de
// escopo e premissas contados no arquivo.

const percent = (value: number) => `${(value * 100).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`;

const VAGUE_WORDS = ["rápida", "rápido", "fácil", "adequado", "intuitiva", "etc", "bom", "bons", "moderno", "seguro"];
const words = (sentence: string) => sentence.toLowerCase().replace(/[.,]/g, "").split(" ");
const isVague = (sentence: string) => words(sentence).some((word) => VAGUE_WORDS.includes(word));
const vagueCount = (draft: string[]) => draft.filter(isVague).length;

const drafts: Array<{ label: string; sentences: string[] }> = [
  {
    label: "v1",
    sentences: [
      "a busca deve ser rápida e fácil de usar",
      "os resultados devem ser bons",
      "a interface deve ser intuitiva",
      "deve funcionar offline",
      "deve aceitar acentos etc",
      "o modal deve abrir com atalho",
    ],
  },
  {
    label: "v2",
    sentences: [
      "a busca abre com Ctrl K",
      "os resultados devem ser bons",
      "a interface deve ser intuitiva",
      "funciona sem rede",
      "ignora acentos e maiúsculas",
      "o modal deve abrir com atalho",
    ],
  },
  {
    label: "v3",
    sentences: [
      "WHEN Ctrl K THEN abre o modal com foco no campo",
      "WHEN 2 ou mais caracteres THEN até 10 resultados",
      "WHEN Esc THEN fecha e devolve o foco",
      "funciona sem rede",
      "ignora acentos e maiúsculas",
      "IF nada corresponde THEN mostra nenhum resultado",
    ],
  },
];
const vagueSeries = drafts.map((draft) => ({ label: draft.label, value: vagueCount(draft.sentences) }));
const firstDraft = drafts[0];
const lastDraft = drafts[drafts.length - 1];

const SAMPLE = firstDraft.sentences[0];
const sampleTokens = words(SAMPLE);
const sampleVague = sampleTokens.flatMap((word, index) => (VAGUE_WORDS.includes(word) ? [index] : []));

// Contagens do spec.md da plataforma.
const STORIES = 13;
const CRITERIA = 79;
const OUT_OF_SCOPE = 8;
const ASSUMPTIONS = 21;
const CONFIRMED = 14;
const OPEN_QUESTIONS = 0;

const sections = [
  { id: "problem", label: "problema" },
  { id: "goals", label: "objetivos" },
  { id: "non-goals", label: "fora de escopo" },
  { id: "assumptions", label: "premissas e dúvidas" },
  { id: "stories", label: "histórias e critérios" },
  { id: "edges", label: "casos de borda" },
  { id: "success", label: "critérios de sucesso" },
];

const lesson: LessonContent = {
  id: "15-03",
  subtitle: "As seções de uma especificação técnica, o nível de detalhe que um agente precisa e as palavras que não podem aparecer nela.",
  objectives: [
    "Montar uma especificação com problema, objetivos, fora de escopo, premissas e critérios",
    "Trocar palavras vagas por comportamentos que um teste consegue conferir",
    "Usar o agente para entrevistar você antes de escrever a spec",
    "Separar o que vai na spec do que vai no design",
  ],
  steps: [
    {
      id: "interview",
      shortTitle: "Entrevista",
      title: "Uma spec começa com perguntas",
      tag: "context",
      body: [
        "Um bom arquiteto não começa desenhando. Ele pergunta quantas pessoas moram na casa, se alguém trabalha de casa, se vai ter cachorro. A planta sai das respostas. Uma [[especificação técnica|technical-specification]] é a mesma coisa para software: o documento que registra o que o sistema deve fazer, para quem, e como saber se ficou pronto.",
        "Com agentes, dá para inverter o trabalho: em vez de escrever a spec sozinho, você pede ao agente que entreviste você. A documentação do Claude Code sugere exatamente isso: pedir “me entreviste até conseguir escrever a spec e grave em SPEC.md”, e depois abrir uma sessão nova para construir a partir dela, com o contexto limpo e uma definição escrita de pronto.",
      ],
      keyIdea: "A spec é a resposta escrita às perguntas que o agente faria no meio do código, feitas antes dele.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "dev", kind: "user", label: "você", col: 0, row: 0.5 },
              { id: "interviewer", kind: "agent", label: "entrevistador", col: 1, row: 0 },
              { id: "spec", kind: "documents", label: "SPEC.md", col: 2, row: 0.5 },
              { id: "builder", kind: "agent", label: "sessão nova", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "interviewer", to: "dev", label: "perguntas" },
              { from: "dev", to: "spec", label: "respostas" },
              { from: "spec", to: "builder", label: "contexto limpo" },
            ],
            active: "spec",
          },
        ],
      },
      alt: "Um agente entrevistador faz perguntas a você; as respostas viram o arquivo SPEC.md, em destaque, que é entregue a uma sessão nova do agente, com o contexto limpo, para construir.",
    },
    {
      id: "sections",
      shortTitle: "Seções",
      title: "As seções que fecham as decisões",
      tag: "mechanism",
      body: [
        "Cada seção responde uma pergunta. Problema: por que isso existe? Objetivos: o que precisa ser verdade no fim? Fora de escopo: o que não vamos fazer, de propósito? Premissas e dúvidas: o que assumimos sem confirmar? Histórias e critérios: o que cada usuário consegue fazer, e como conferir? Casos de borda e critérios de sucesso fecham o resto.",
        "A seção mais subestimada é a dos [[non-goals|non-goal]]. Um agente tende a ser prestativo: se a spec não diz que login está fora, ele pode criar um. Escrever “sem backend, sem login” corta caminhos inteiros. A spec também não escolhe tecnologia: “React ou Vue” vai no design. A spec diz o quê; o design diz como.",
      ],
      keyIdea: "Uma spec boa diz o que fazer, o que não fazer, o que foi assumido e como conferir.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "sections",
            piece: "pipeline",
            display: "chips",
            stages: sections.map((section) =>
              section.id === "non-goals" ? { ...section, color: "module-15" as const } : section,
            ),
            active: "non-goals",
          },
        ],
      },
      alt: `As seções de uma spec, em ordem: ${sections.map((section) => section.label).join(", ")}. Fora de escopo está em destaque.`,
    },
    {
      id: "vague",
      shortTitle: "Palavras vagas",
      title: "“Rápida” não é um requisito",
      tag: "mechanism",
      body: [
        `“${SAMPLE}.” Rápida quanto? Fácil para quem? Duas pessoas leem isso e imaginam sistemas diferentes, e um agente vai imaginar um terceiro. Pior: nenhum teste consegue dizer se a frase foi cumprida.`,
        "A regra prática é trocar cada adjetivo por um comportamento observável. A spec deste site tem uma história chamada “Busca rápida”, mas os critérios dela não usam a palavra: abre com Ctrl K e foco no campo; a partir de 2 caracteres lista até 10 resultados; ignora acentos e maiúsculas; funciona sem rede. Cada frase vira um teste.",
      ],
      keyIdea: "Se um teste não consegue dizer se a frase foi cumprida, a frase não é requisito: é desejo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "sentence",
            piece: "token-stream",
            tokens: sampleTokens,
            keys: sampleVague,
            bars: sampleTokens.map((word) => (VAGUE_WORDS.includes(word) ? 1 : 0.1)),
            color: "danger",
          },
        ],
      },
      alt: `A frase “${SAMPLE}” palavra por palavra, com ${sampleVague.map((index) => sampleTokens[index]).join(" e ")} marcadas como vagas.`,
    },
    {
      id: "real-spec",
      shortTitle: "Spec real",
      title: "A spec deste site em números",
      tag: "example",
      body: [
        `A spec da plataforma Tokens to Agents tem ${STORIES} histórias de usuário e ${CRITERIA} critérios de aceite numerados. A seção fora de escopo lista ${OUT_OF_SCOPE} itens, cada um com o motivo: login, backend, chamada a LLM real no Laboratório, aulas em outros idiomas.`,
        `A tabela de premissas tem ${ASSUMPTIONS} linhas: ${CONFIRMED} confirmadas pelo usuário e ${ASSUMPTIONS - CONFIRMED} com um valor padrão escolhido e marcado como não confirmado. No fim, ${OPEN_QUESTIONS} perguntas abertas, porque a regra do processo diz que a spec só é confirmada sem nenhuma. Marcar o que foi só assumido é o que permite a alguém discordar antes do código, e não depois.`,
      ],
      keyIdea: "Premissa escrita pode ser corrigida em minutos; premissa escondida vira retrabalho.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "real",
            piece: "metrics-panel",
            metrics: [
              { id: "stories", label: "histórias", value: String(STORIES) },
              { id: "criteria", label: "critérios", value: String(CRITERIA), color: "module-15" },
              { id: "non-goals", label: "fora de escopo", value: String(OUT_OF_SCOPE) },
              { id: "assumptions", label: "premissas confirmadas", value: `${CONFIRMED} de ${ASSUMPTIONS}` },
              { id: "open", label: "perguntas abertas", value: String(OPEN_QUESTIONS), color: "success" },
            ],
            highlight: "criteria",
          },
        ],
      },
      alt: `A spec da plataforma: ${STORIES} histórias, ${CRITERIA} critérios de aceite, ${OUT_OF_SCOPE} itens fora de escopo, ${CONFIRMED} de ${ASSUMPTIONS} premissas confirmadas e ${OPEN_QUESTIONS} perguntas abertas.`,
    },
    {
      id: "revisions",
      shortTitle: "Revisões",
      title: "Revisar até não sobrar adjetivo",
      tag: "tradeoff",
      body: [
        `Um lint de spec pode ser bem simples: uma lista de palavras proibidas. No rascunho ${firstDraft.label} da cena, ${vagueCount(firstDraft.sentences)} das ${firstDraft.sentences.length} frases usam alguma (${percent(vagueCount(firstDraft.sentences) / firstDraft.sentences.length)}). Na ${lastDraft.label}, reescrita com gatilho e resultado, sobram ${vagueCount(lastDraft.sentences)}. Um agente revisor faz esse papel bem, inclusive apontando o que a lista não pega.`,
        "O limite é o tamanho. A spec é lida pelo agente a cada sessão e disputa espaço na [[janela de contexto|context-window]] com o código. Detalhe que não muda o comportamento (cor do botão, nome de variável) atrapalha mais do que ajuda. Escreva os [[casos de borda|edge-case]] que mudam o resultado, e deixe o resto para o design e para o código.",
      ],
      keyIdea: "Detalhe na spec só se ele mudar o que o sistema faz; o resto é ruído no contexto do agente.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "revisions",
            piece: "chart",
            kind: "bar",
            series: vagueSeries,
            max: firstDraft.sentences.length,
            highlight: vagueSeries.length - 1,
            color: "module-15",
          },
        ],
      },
      alt: `Frases com palavras vagas em cada versão do rascunho, de ${firstDraft.sentences.length} frases: ${vagueSeries.map((item) => `${item.label}, ${item.value}`).join("; ")}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Da conversa ao documento que o agente lê",
      tag: "summary",
      body: [
        "Uma especificação técnica fecha decisões por escrito: problema, objetivos, o que fica de fora, o que foi assumido e critérios que um teste confere. Escreva com o agente entrevistando você, revise até não sobrar adjetivo e entregue a uma sessão nova.",
        "O coração da spec são os critérios de aceite. A próxima aula mostra como escrevê-los num formato que vira teste quase sozinho.",
      ],
      keyIdea: "Spec técnica = decisões fechadas + o que fica de fora + critérios verificáveis.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "dev", kind: "user", label: "você", col: 0, row: 0.5 },
              { id: "interviewer", kind: "agent", label: "entrevistador", col: 1, row: 0 },
              { id: "lint", kind: "guardrail", label: "lint de spec", col: 1, row: 1 },
              { id: "spec", kind: "documents", label: "SPEC.md", col: 2, row: 0.5 },
              { id: "builder", kind: "agent", label: "sessão nova", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "interviewer", to: "dev", label: "perguntas" },
              { from: "dev", to: "spec", label: "respostas" },
              { from: "lint", to: "spec", label: "sem adjetivos" },
              { from: "spec", to: "builder", label: "contexto limpo" },
            ],
            active: "builder",
            done: ["dev", "interviewer", "lint", "spec"],
          },
        ],
      },
      alt: "O fluxo completo: o entrevistador pergunta, suas respostas viram o SPEC.md, um lint tira as palavras vagas, e a sessão nova do agente, em destaque, constrói a partir da spec.",
    },
  ],
  realWorldExample:
    "O Google usa design docs há anos como etapa antes do código: um documento informal com contexto, objetivos e non-goals, o desenho proposto e as alternativas consideradas, revisado por outras pessoas antes da implementação. Malte Ubl descreveu a prática no texto “Design Docs at Google”, e a seção de non-goals é uma das que ele destaca: dizer o que o sistema não vai fazer evita que o escopo cresça sozinho.",
  code: {
    language: "typescript",
    source: `const VAGUE = ["rápido", "rápida", "fácil", "adequado", "intuitiva", "etc"];

export function lintSpec(lines: string[]): string[] {
  return lines.filter((line) =>
    line.toLowerCase().split(/[^\\p{L}]+/u).some((word) => VAGUE.includes(word)),
  );
}

lintSpec(["A busca deve ser rápida", "WHEN Esc THEN fecha o modal"]);
// ["A busca deve ser rápida"]`,
    caption: "Um lint de spec mínimo: devolve as frases com palavras que nenhum teste consegue conferir. Rode antes de entregar a spec ao agente.",
  },
  tradeOffs: {
    pros: [
      "Decisões fechadas por escrito, revisáveis por quem não lê código",
      "Non-goals cortam escopo que o agente criaria por iniciativa própria",
      "Premissas marcadas como não confirmadas convidam a discordar antes do código",
    ],
    cons: [
      "Escrever bem custa tempo, e spec longa demais vira ruído na janela de contexto",
      "Especificar cedo demais trava decisões que só ficam claras com um protótipo",
      "Spec que ninguém atualiza passa a mentir",
    ],
    alternatives: [
      "Protótipo descartável primeiro, spec depois, a partir do que funcionou",
      "RFC curta para decisões que afetam várias equipes",
    ],
  },
  knowledgeCheck: [
    {
      id: "rewrite-vague",
      prompt: "Qual destas frases é um requisito que um teste consegue conferir?",
      options: [
        "O cadastro deve ser simples e rápido",
        "WHEN o e-mail já existe THEN o sistema SHALL exibir “e-mail já cadastrado” sem criar a conta",
        "O cadastro deve seguir boas práticas",
        "O cadastro deve funcionar bem no celular",
      ],
      correct: 1,
      explanation: "Só a segunda tem gatilho e resultado observáveis. As outras dependem de quem lê: “simples”, “boas práticas” e “bem” não têm como ser conferidos.",
      lesson: "15-03",
    },
    {
      id: "non-goal",
      prompt: "A spec de um app de notas não fala de sincronização. O agente cria um backend de sync “para ajudar”. O que teria evitado isso?",
      options: [
        "Um modelo maior",
        "Uma linha em fora de escopo: “sem backend; notas só no dispositivo”",
        "Mais exemplos de código no prompt",
        "Temperatura zero",
      ],
      correct: 1,
      explanation: "O que a spec não proíbe, o agente pode decidir fazer. Non-goals explícitos cortam caminhos inteiros antes do código.",
      lesson: "15-03",
    },
  ],
  related: ["15-02", "15-04", "05-04"],
  references: [
    { title: "Malte Ubl, Design Docs at Google", url: "https://www.industrialempathy.com/posts/design-docs-at-google/", kind: "article" },
    { title: "Claude Code: Best practices", url: "https://code.claude.com/docs/en/best-practices", kind: "docs" },
    { title: "GitHub Spec Kit", url: "https://github.com/github/spec-kit", kind: "repo" },
  ],
};

export default lesson;
