import { tokenize } from "../../../lab/retrieval";
import type { LessonContent } from "../../../types/content";

// Geração ancorada com contas no arquivo. O contexto tem 3 fontes do manual de RH, uma delas revogada. A resposta
// do modelo foi quebrada em 4 afirmações, cada uma com a fonte que ela cita. A verificação de brinquedo mede a
// cobertura: a fração das palavras da afirmação (sem acento e sem stopwords) que aparece na fonte citada.
// Acima de 60%, a afirmação conta como sustentada. É uma conta crua de propósito; na prática, quem julga é um
// modelo de NLI ou um LLM juiz. O conflito entre as fontes se resolve pela data, e a pergunta sem base vira abstenção.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const percent = (value: number) => `${Math.round(value * 100)}%`;
const listing = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`);

const stopwords = new Set(["o", "a", "e", "de", "do", "da", "por", "para", "em", "no", "na", "os", "as", "um", "uma", "com", "que", "ate", "voce", "r", "ser"]);
const words = (text: string) => tokenize(text, stopwords);

interface Source {
  id: number;
  title: string;
  year: number;
  text: string;
}

const sources: Source[] = [
  { id: 1, title: "Política de home office", year: 2025, text: "Funcionários CLT podem fazer home office até 3 dias por semana, combinados com o gestor." },
  { id: 2, title: "Política de reembolso", year: 2025, text: "O reembolso de internet é de até R$ 100 por mês para quem faz home office." },
  { id: 3, title: "Política de home office", year: 2023, text: "O home office é permitido até 2 dias por semana." },
];
const sourceById = new Map(sources.map((source) => [source.id, source]));

const QUESTION = "Quantos dias de home office posso fazer e a empresa paga a internet?";

interface Claim {
  id: string;
  text: string;
  cites: number;
}

const claims: Claim[] = [
  { id: "a1", text: "Você pode fazer home office até 3 dias por semana.", cites: 1 },
  { id: "a2", text: "Os dias são combinados com o gestor.", cites: 1 },
  { id: "a3", text: "O reembolso de internet é de até R$ 100 por mês.", cites: 2 },
  { id: "a4", text: "A energia elétrica também é reembolsada.", cites: 2 },
];

const MIN_COVERAGE = 0.6;
/** Fração das palavras da afirmação que aparece na fonte citada. */
const coverage = (claim: Claim) => {
  const claimWords = words(claim.text);
  const sourceWords = new Set(words((sourceById.get(claim.cites) as Source).text));
  return claimWords.filter((word) => sourceWords.has(word)).length / claimWords.length;
};
const checked = claims.map((claim) => ({ ...claim, coverage: coverage(claim), supported: coverage(claim) >= MIN_COVERAGE }));
const supported = checked.filter((claim) => claim.supported);
const unsupported = checked.filter((claim) => !claim.supported);
const faithfulness = supported.length / claims.length;
const firstUnsupported = unsupported[0];

// Passo 2: o prompt em seções, com o tamanho de cada uma em palavras.
const INSTRUCTIONS =
  "Responda só com as fontes abaixo. Cite a fonte de cada afirmação como [n]. Se as fontes divergirem, use a mais recente e avise. Se nenhuma fonte responder, diga que não encontrou.";
const promptSections = [
  { label: "instruções", text: INSTRUCTIONS },
  ...sources.map((source) => ({ label: `[${source.id}] ${source.year}`, text: source.text })),
  { label: "pergunta", text: QUESTION },
];
const sectionWords = promptSections.map((section) => section.text.split(/\s+/).length);
const largestSection = Math.max(...sectionWords);

// Passo 5: as duas versões da política de home office divergem; vale a mais recente.
const homeOfficeSources = sources.filter((source) => source.title === "Política de home office");
const current = homeOfficeSources.reduce((latest, source) => (source.year > latest.year ? source : latest));
const outdated = homeOfficeSources.find((source) => source !== current) as Source;
const daysIn = (source: Source) => Number(source.text.match(/(\d+) dias/)?.[1] ?? 0);

// Passo 6: pergunta sem base no contexto.
const NO_BASIS_QUESTION = "Posso fazer home office do exterior?";
const KEY_TERM = "exterior";
const contextWords = new Set(sources.flatMap((source) => words(source.text)));
const keyTermFound = contextWords.has(KEY_TERM);

const lesson: LessonContent = {
  id: "08-11",
  subtitle: "Como fazer o modelo responder só com o contexto, citar a fonte de cada frase, resolver fontes que divergem e dizer quando não sabe.",
  objectives: [
    "Escrever instruções que ancoram a resposta no contexto recuperado",
    "Pedir citações por afirmação e conferir se a fonte citada sustenta cada uma",
    "Resolver fontes que divergem com metadados de data",
    "Tratar a abstenção como resposta correta quando o contexto não basta",
  ],
  steps: [
    {
      id: "page",
      shortTitle: "Com a página",
      title: "Responder com o número da página",
      tag: "context",
      body: [
        "Um bom advogado não diz só “o senhor tem direito”: diz “tem direito, segundo o artigo 7º, inciso III”. Quem lê pode abrir a lei e conferir. No RAG, o modelo recebe os trechos e deve responder do mesmo jeito: cada afirmação apoiada numa fonte que o usuário pode abrir.",
        `[[Grounding|grounding]] é isso: ancorar a geração no contexto recuperado, em vez de deixar o modelo completar com o que lembra do treino. O contexto da aula tem ${sources.length} fontes do manual de RH, e a pergunta é “${QUESTION}”. A geração é o passo em que um bom contexto ainda pode virar uma resposta ruim, por isso ela também é verificada.`,
      ],
      keyIdea: "Resposta ancorada é resposta conferível: cada frase aponta para o trecho que a sustenta.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "context", kind: "context", label: `${sources.length} fontes [1-${sources.length}]`, col: 0, row: 0 },
              { id: "llm", kind: "llm", label: "llm", col: 1, row: 0 },
              { id: "answer", kind: "answer", label: "resposta + [n]", col: 2, row: 0 },
              { id: "check", kind: "eval", label: "conferir", col: 3, row: 0 },
              { id: "user", kind: "user", label: "usuário", col: 3, row: 1 },
            ],
            edges: [
              { from: "context", to: "llm", label: "só isto" },
              { from: "llm", to: "answer" },
              { from: "answer", to: "check", label: "citações" },
              { from: "check", to: "user" },
            ],
            active: "llm",
          },
        ],
      },
      alt: `As ${sources.length} fontes numeradas vão para o LLM, em destaque, que gera uma resposta com citações; a resposta é conferida antes de chegar ao usuário.`,
    },
    {
      id: "instructions",
      shortTitle: "Instruções",
      title: "As regras do jogo ficam no prompt",
      tag: "mechanism",
      body: [
        "Sem regras, o modelo trata o contexto como sugestão: se lembra de algo do treino, mistura. As instruções deixam o combinado explícito, como o enunciado de uma prova com consulta: use só o material, diga a página, e escreva “não sei” se o material não cobrir.",
        `As instruções da cena, no [[prompt de sistema|system-prompt]], pedem quatro coisas: responder só com as fontes, citar cada afirmação como [n], preferir a fonte mais recente quando houver divergência e fazer [[abstenção|abstention]] quando nada responder. Elas ocupam ${sectionWords[0]} palavras; cada fonte entra com o id, o ano e o texto. Sem o ano na fonte, a regra de divergência não teria como ser cumprida.`,
      ],
      keyIdea: "Grounding começa nas instruções: só o contexto, cite [n], prefira o mais recente, abstenha-se se faltar base.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "prompt",
            piece: "token-stream",
            tokens: promptSections.map((section) => section.label),
            bars: sectionWords.map((count) => count / largestSection),
            query: promptSections.length - 1,
            keys: [0],
            color: "module-08",
          },
        ],
      },
      alt: `O prompt em seções, com barras do tamanho em palavras: ${promptSections.map((section, index) => `${section.label} ${sectionWords[index]}`).join(", ")}. A pergunta e as instruções estão em destaque.`,
    },
    {
      id: "citations",
      shortTitle: "Citações",
      title: "Cada afirmação aponta para uma fonte",
      tag: "mechanism",
      body: [
        `O modelo respondeu com ${claims.length} afirmações, cada uma com uma [[citação|citation]]. Uma citação é uma promessa: “isto está escrito ali”. Quebrar a resposta em afirmações e ligar cada uma à fonte é o que permite cobrar a promessa.`,
        `No grafo, as setas vão das afirmações para as fontes citadas, e a espessura é a cobertura: a fração das palavras da afirmação que aparece na fonte. “${firstUnsupported.text}” cita a fonte [${firstUnsupported.cites}], mas ${firstUnsupported.coverage === 0 ? "nenhuma das suas palavras aparece lá" : `só ${percent(firstUnsupported.coverage)} das suas palavras aparecem lá`}: o trecho fala de internet, não de energia. É uma [[alucinação|hallucination]] com cara de fato documentado, o tipo mais perigoso.`,
      ],
      keyIdea: "Uma citação não prova nada sozinha: é preciso conferir se a fonte diz o que a frase afirma.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "claims",
            piece: "graph",
            nodes: [
              ...checked.map((claim, index) => ({
                id: claim.id,
                label: `afirmação ${index + 1}`,
                x: 0.15,
                y: 0.12 + index * 0.25,
                color: claim.supported ? ("module-08" as const) : ("danger" as const),
              })),
              ...sources.map((source, index) => ({
                id: `s${source.id}`,
                label: `[${source.id}] ${source.year}`,
                x: 0.85,
                y: 0.2 + index * 0.3,
                color: "info" as const,
              })),
            ],
            edges: checked.map((claim) => ({ from: claim.id, to: `s${claim.cites}`, weight: Math.max(0.1, claim.coverage) })),
            highlight: unsupported.map((claim) => claim.id),
          },
        ],
      },
      alt: `Grafo com ${claims.length} afirmações ligadas às fontes que citam; a espessura da ligação é a cobertura. ${listing(unsupported.map((claim) => `A afirmação “${claim.text}”`))} cita a fonte [${firstUnsupported.cites}] com cobertura de ${percent(firstUnsupported.coverage)} e está em destaque.`,
    },
    {
      id: "verify",
      shortTitle: "Conferir",
      title: "Contar o que o contexto sustenta",
      tag: "example",
      body: [
        "Conferir é como o professor que corrige uma redação com as fontes abertas: frase por frase, marca o que está no texto e o que foi inventado. A nota é a fração de frases marcadas como certas.",
        `Com o corte de ${percent(MIN_COVERAGE)} de cobertura, ${supported.length} das ${claims.length} afirmações são sustentadas: ${listing(supported.map((claim) => percent(claim.coverage)))} de cobertura. A fração, ${fixed(faithfulness)}, é a [[faithfulness|faithfulness]] da resposta, a métrica da aula 08.15. A aplicação pode remover a afirmação sem base, marcá-la para o usuário ou pedir uma nova geração. Sobreposição de palavras é uma régua grosseira, que erra com sinônimos e negações; em produção, a checagem usa um modelo de inferência textual ou um LLM juiz, e a régua de brinquedo só mostra a forma da conta.`,
      ],
      keyIdea: "Faithfulness = afirmações sustentadas ÷ afirmações. Abaixo de 1, alguma frase foi inventada.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "score",
            piece: "metrics-panel",
            metrics: [
              { id: "claims", label: "afirmações", value: String(claims.length) },
              { id: "supported", label: "sustentadas", value: String(supported.length), color: "success" },
              { id: "faithfulness", label: "faithfulness", value: fixed(faithfulness), color: "danger" },
              { id: "worst", label: "menor cobertura", value: percent(firstUnsupported.coverage) },
            ],
            highlight: "faithfulness",
          },
          {
            id: "claims",
            piece: "graph",
            nodes: [
              ...checked.map((claim, index) => ({
                id: claim.id,
                label: claim.supported ? `afirmação ${index + 1} ✓` : `afirmação ${index + 1} ✗`,
                x: 0.15,
                y: 0.12 + index * 0.25,
                color: claim.supported ? ("success" as const) : ("danger" as const),
              })),
              ...sources.map((source, index) => ({
                id: `s${source.id}`,
                label: `[${source.id}] ${source.year}`,
                x: 0.85,
                y: 0.2 + index * 0.3,
                color: "info" as const,
              })),
            ],
            edges: checked.map((claim) => ({ from: claim.id, to: `s${claim.cites}`, weight: Math.max(0.1, claim.coverage) })),
            highlight: unsupported.map((claim) => claim.id),
          },
        ],
      },
      alt: `${supported.length} de ${claims.length} afirmações sustentadas pela fonte citada, faithfulness ${fixed(faithfulness)}. A afirmação sem base tem cobertura de ${percent(firstUnsupported.coverage)}.`,
    },
    {
      id: "conflict",
      shortTitle: "Conflito",
      title: "Quando duas fontes dizem coisas diferentes",
      tag: "tradeoff",
      body: [
        `A base guarda a política de home office de ${outdated.year} (${daysIn(outdated)} dias por semana) e a de ${current.year} (${daysIn(current)} dias). As duas falam do mesmo assunto, então as duas são recuperadas. Sem mais nada, o modelo escolhe uma, ou faz a média, e qualquer escolha pode estar errada.`,
        `Com o ano em cada fonte e a regra “use a mais recente e avise”, a resposta fica “${daysIn(current)} dias por semana, segundo a política de ${current.year} [1]”. A solução mais robusta fica antes do prompt: marcar a versão antiga como revogada na ingestão ou filtrar por vigência na busca. Resolver no prompt depende de o modelo seguir a regra; resolver nos metadados não depende.`,
      ],
      keyIdea: "Divergência entre fontes se resolve com metadados: data, versão e vigência, de preferência antes do prompt.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "new", kind: "documents", label: `política ${current.year}`, col: 0, row: 0 },
              { id: "old", kind: "documents", label: `política ${outdated.year}`, col: 0, row: 1 },
              { id: "context", kind: "context", label: "fontes com ano", col: 1, row: 0.5 },
              { id: "llm", kind: "llm", label: "mais recente", col: 2, row: 0.5 },
              { id: "answer", kind: "answer", label: `${daysIn(current)} dias [1]`, col: 3, row: 0.5 },
            ],
            edges: [
              { from: "new", to: "context", label: `${daysIn(current)} dias` },
              { from: "old", to: "context", label: "revogada", variant: "alternative" },
              { from: "context", to: "llm" },
              { from: "llm", to: "answer" },
            ],
            active: "llm",
          },
        ],
      },
      alt: `As políticas de ${current.year} e de ${outdated.year} chegam ao contexto, a antiga pelo caminho tracejado de revogada; o LLM, em destaque, usa a mais recente e responde ${daysIn(current)} dias com a citação [1].`,
    },
    {
      id: "abstain",
      shortTitle: "Não sei",
      title: "“Não encontrei” também é uma resposta ancorada",
      tag: "tradeoff",
      body: [
        `Alguém pergunta “${NO_BASIS_QUESTION}”. As fontes falam de home office, mas nenhuma fala de trabalhar de fora do país. O modelo tem a tentação de completar: “sim, desde que combinado com o gestor” soa plausível e cita uma fonte de verdade.`,
        `A conta da cena é simples: a palavra que decide a pergunta, “${KEY_TERM}”, ${keyTermFound ? "aparece em alguma" : "não aparece em nenhuma"} das ${sources.length} fontes. A instrução de abstenção leva o modelo a responder que a política não trata do assunto e a indicar o RH. Um sistema que sempre responde parece mais útil numa demonstração e é menos confiável em produção; medir quantas vezes ele se abstém quando devia é parte da avaliação.`,
      ],
      keyIdea: "Sem base no contexto, a resposta certa é dizer que não encontrou, e onde procurar.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "do exterior?", col: 0, row: 0 },
              { id: "context", kind: "context", label: `${sources.length} fontes`, col: 1, row: 0 },
              { id: "llm", kind: "llm", label: "llm", col: 2, row: 0 },
              { id: "invent", kind: "answer", label: "sim, com o gestor", col: 3, row: 0 },
              { id: "abstain", kind: "no-result", label: "não encontrei", col: 3, row: 1 },
            ],
            edges: [
              { from: "user", to: "context" },
              { from: "context", to: "llm", label: `“${KEY_TERM}”: 0` },
              { from: "llm", to: "invent", label: "inventar", variant: "alternative" },
              { from: "llm", to: "abstain", label: "abster-se" },
            ],
            active: "abstain",
          },
        ],
      },
      alt: `A pergunta sobre home office do exterior chega a um contexto em que a palavra ${KEY_TERM} não aparece; o caminho tracejado leva a uma resposta inventada, e o caminho certo, em destaque, leva a “não encontrei”.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Gerar, citar, conferir",
      tag: "summary",
      body: [
        "A geração ancorada junta instruções claras, fontes numeradas e com data, uma citação por afirmação e uma verificação depois da resposta. Quando as fontes divergem, vale a mais recente; quando não cobrem a pergunta, vale a abstenção.",
        "Até aqui as fontes vieram só pelo significado. A próxima aula usa os metadados de cada chunk, como data, departamento e permissão, para filtrar a busca antes mesmo de o modelo ver qualquer trecho.",
      ],
      keyIdea: "Grounding é um contrato: só o contexto, cada frase com fonte, e “não sei” quando faltar base.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "steps",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "rules", label: "instruções" },
              { id: "sources", label: "fontes [n] com data" },
              { id: "generate", label: "gerar", color: "module-08" },
              { id: "cite", label: "citar por afirmação" },
              { id: "check", label: "conferir", color: "module-08" },
              { id: "answer", label: "resposta ou “não sei”", color: "brand" },
            ],
          },
        ],
      },
      alt: "Fluxo em chips: instruções, fontes numeradas com data, gerar, citar por afirmação, conferir e responder ou dizer que não sabe.",
    },
  ],
  realWorldExample:
    "A API da Anthropic tem um recurso de citações: os documentos vão na requisição com as citações habilitadas, e a resposta vem dividida em blocos de texto, cada um com os trechos exatos dos documentos que o sustentam. Assim a aplicação mostra a fonte de cada frase sem pedir ao modelo um formato de citação no prompt, e consegue conferir o trecho citado contra o documento original.",
  code: {
    language: "python",
    source: `import re
import unicodedata

STOPWORDS = {"o", "a", "e", "de", "do", "da", "por", "para", "em", "no", "na", "com", "que", "ate"}

def words(text):
    plain = unicodedata.normalize("NFD", text.lower())
    plain = "".join(c for c in plain if unicodedata.category(c) != "Mn")
    return [w for w in re.split(r"[^a-z0-9]+", plain) if w and w not in STOPWORDS]

def coverage(claim, source):
    claim_words, source_words = words(claim), set(words(source))
    return sum(w in source_words for w in claim_words) / len(claim_words)

def faithfulness(claims, sources, min_coverage=0.6):
    supported = [c for c in claims if coverage(c["text"], sources[c["cites"]]) >= min_coverage]
    return len(supported) / len(claims)`,
    caption: "A verificação de brinquedo da aula: cobertura de palavras de cada afirmação na fonte citada e a fração sustentada. Em produção, troque coverage por um modelo de NLI ou um LLM juiz.",
  },
  tradeOffs: {
    pros: [
      "Citações por afirmação deixam o usuário conferir a resposta",
      "A verificação pega a frase inventada antes de ela chegar ao usuário",
      "A abstenção troca respostas erradas por um “não encontrei” honesto",
    ],
    cons: [
      "Instruções reduzem, mas não garantem, que o modelo fique só no contexto",
      "Verificar cada afirmação custa tempo e, com um LLM juiz, mais uma chamada",
      "Abstenção demais deixa o sistema inútil; é preciso calibrar",
    ],
    alternatives: [
      "APIs com citações nativas, que devolvem o trecho exato de cada afirmação",
      "Resolver conflitos e versões na ingestão, com metadados de vigência",
      "Respostas extrativas, que copiam o trecho em vez de reescrevê-lo, quando a exatidão importa mais que a fluência",
    ],
  },
  knowledgeCheck: [
    {
      id: "wrong-citation",
      prompt: "A resposta diz “o reembolso cobre internet e energia [2]”, e a fonte [2] só fala de internet. O que a verificação deve concluir?",
      options: [
        "Tudo certo, porque a frase tem citação",
        "A parte sobre energia não é sustentada pela fonte citada: a faithfulness cai e a afirmação deve ser removida ou sinalizada",
        "A fonte [2] está desatualizada e deve ser apagada",
        "O modelo precisa de temperatura maior",
      ],
      correct: 1,
      explanation: "Citação é uma promessa de que a fonte diz aquilo. Aqui a fonte só sustenta metade da frase; a outra metade é alucinação com cara de documentada.",
      lesson: "08-11",
    },
    {
      id: "conflicting-versions",
      prompt: "A base tem duas versões da política de férias, de 2022 e de 2025, e as duas são recuperadas. Qual é a correção mais robusta?",
      options: [
        "Pedir ao modelo que faça a média das duas",
        "Aumentar o top-k para trazer mais versões",
        "Guardar a vigência nos metadados e filtrar ou marcar a versão revogada antes de montar o prompt",
        "Remover as datas das fontes para o modelo não se confundir",
      ],
      correct: 2,
      explanation: "Uma regra no prompt depende de o modelo obedecer. Metadados de vigência resolvem antes: a versão antiga nem chega, ou chega marcada.",
      lesson: "08-11",
    },
  ],
  related: ["08-10", "08-12", "04-10"],
  references: [
    { title: "Gao et al. (2023), Enabling Large Language Models to Generate Text with Citations (ALCE)", url: "https://arxiv.org/abs/2305.14627", kind: "paper" },
    { title: "Anthropic: Citations", url: "https://docs.anthropic.com/en/docs/build-with-claude/citations", kind: "docs" },
    { title: "Lewis et al. (2020), Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks", url: "https://arxiv.org/abs/2005.11401", kind: "paper" },
  ],
};

export default lesson;
