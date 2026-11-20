import { softmax } from "../../../lab/attention";
import type { LessonContent } from "../../../types/content";

// Alucinações com contas no arquivo: a distribuição do próximo token para um fato conhecido e para um
// fato que o modelo nunca viu (logits escritos à mão), o valor esperado de chutar ou se abster sob duas
// regras de correção, e uma política de abstenção por limiar de confiança.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const percent = (value: number) => `${Math.round(value * 100)}%`;
const signed = (value: number) => (value >= 0 ? `+${fixed(value)}` : `−${fixed(Math.abs(value))}`);

// Passo 2: fato conhecido e fato desconhecido (o livro não existe).
const knownTokens = ["Paris", "Lyon", "uma", "a", "Roma"];
const knownProbabilities = softmax([6, 2.5, 2, 1.5, 1]);
const BOOK = "O Farol de Vidro";
const unknownTokens = ["Ana", "João", "Maria", "Pedro", "Clara"];
const unknownProbabilities = softmax([1.2, 1.1, 1, 0.9, 0.8]);
const unknownTop = Math.max(...unknownProbabilities);

// Passo 3: valor esperado de chutar o favorito com confiança p.
const p = unknownTop;
const RIGHT = 1;
const WRONG_FREE = 0;
const binaryGuess = p * RIGHT + (1 - p) * WRONG_FREE;
const ABSTAIN = 0;
const WRONG_PENALTY = -1;
const penalizedGuess = p * RIGHT + (1 - p) * WRONG_PENALTY;
/** Com acerto +1, erro −1 e abstenção 0, chutar só compensa se 2p − 1 > 0. */
const breakEven = 1 / (1 - WRONG_PENALTY);

// Passo 4: confiança no favorito para seis perguntas e um limiar de abstenção.
const questions = [
  { label: "capital", logits: [6, 2.5, 2, 1.5, 1] },
  { label: "2 + 2", logits: [7, 2, 1.5, 1, 0.5] },
  { label: "autor", logits: [1.2, 1.1, 1, 0.9, 0.8] },
  { label: "ano", logits: [3, 2.2, 1.8, 1.5, 1] },
  { label: "CEP", logits: [1.5, 1.4, 1.3, 1.3, 1.2] },
  { label: "dose", logits: [2.2, 2, 1.6, 1.2, 1] },
];
const confidences = questions.map((question) => Math.max(...softmax(question.logits)));
const THRESHOLD = 0.5;
const answered = questions.filter((_, index) => confidences[index] >= THRESHOLD).map((question) => question.label);
const abstained = questions.filter((_, index) => confidences[index] < THRESHOLD).map((question) => question.label);
const listing = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`);

const lesson: LessonContent = {
  id: "04-10",
  subtitle: "Por que um LLM às vezes inventa fatos com toda a confiança, como medir esse risco e quais técnicas reduzem o problema.",
  objectives: [
    "Definir alucinação e diferenciar a intrínseca da extrínseca",
    "Explicar, pela distribuição do próximo token, por que o modelo inventa",
    "Calcular quando chutar compensa mais que se abster",
    "Escolher mitigações: fontes no contexto, citações, abstenção e verificação",
  ],
  steps: [
    {
      id: "confident",
      shortTitle: "Confiante",
      title: "Fluente, confiante e errado",
      tag: "context",
      body: [
        "Peça a um chat a biografia de alguém pouco conhecido e ele pode responder com datas, cargos e livros que nunca existiram, no mesmo tom seguro de uma resposta certa. Isso é uma [[alucinação|hallucination]]: texto fluente e plausível que não corresponde aos fatos ou à fonte.",
        "A alucinação não é um defeito raro de um modelo específico. Ela vem do próprio objetivo de treino: o modelo aprendeu a produzir o texto mais provável, e um texto provável pode ser falso. O perigo está no tom: nada na forma da resposta avisa que ela foi inventada.",
      ],
      keyIdea: "Alucinação é texto plausível e falso; o tom confiante não indica se a resposta é verdadeira.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "pergunta", col: 0, row: 0.5 },
              { id: "llm", kind: "llm", label: "llm", col: 1, row: 0.5 },
              { id: "right", kind: "answer", label: "fato real", col: 2, row: 0 },
              { id: "wrong", kind: "no-result", label: "citação inventada", col: 2, row: 1 },
            ],
            edges: [
              { from: "user", to: "llm" },
              { from: "llm", to: "right", label: "visto no treino" },
              { from: "llm", to: "wrong", label: "mesmo tom", variant: "alternative" },
            ],
            active: "wrong",
          },
        ],
      },
      alt: "Uma pergunta chega ao LLM; ele pode devolver um fato real ou, pelo caminho tracejado e no mesmo tom, uma citação inventada, em destaque.",
    },
    {
      id: "flat",
      shortTitle: "Por quê",
      title: "Quando o modelo não sabe, a distribuição fica plana",
      tag: "mechanism",
      body: [
        `Para “A capital da França é”, o favorito tem ${percent(knownProbabilities[0])}: o modelo viu esse fato milhares de vezes. Para “O autor de ${BOOK} é”, um livro que não existe, nenhum nome se destaca: o favorito fica com ${percent(unknownTop)} e os outros logo atrás.`,
        "O problema é o passo seguinte. A geração precisa escolher um token, e “não sei” não é um token que vence sozinho, a menos que o modelo tenha aprendido a escrevê-lo nesse tipo de pergunta. Ele escolhe um nome, e os tokens seguintes completam a história com coerência: sobrenome, data, editora.",
      ],
      keyIdea: "Uma distribuição plana é o modelo dizendo “não sei”, mas a geração transforma isso numa resposta.",
      scene: {
        kind: "pieces",
        layout: "row",
        pieces: [
          {
            id: "known",
            piece: "chart",
            kind: "bar",
            series: knownTokens.map((label, index) => ({ label, value: Number(knownProbabilities[index].toFixed(3)) })),
            max: 1,
            highlight: 0,
            color: "success",
          },
          {
            id: "unknown",
            piece: "chart",
            kind: "bar",
            series: unknownTokens.map((label, index) => ({ label, value: Number(unknownProbabilities[index].toFixed(3)) })),
            max: 1,
            highlight: 0,
            color: "danger",
          },
        ],
      },
      alt: `À esquerda, fato conhecido: Paris com ${percent(knownProbabilities[0])}. À direita, autor de um livro que não existe: ${unknownTokens.map((label, index) => `${label} ${percent(unknownProbabilities[index])}`).join(", ")}, uma distribuição plana.`,
    },
    {
      id: "guessing",
      shortTitle: "Chutar",
      title: "Por que chutar compensa",
      tag: "mechanism",
      body: [
        `Pense numa prova em que acerto vale 1 e erro ou “não sei” valem 0. Com ${percent(p)} de chance de acertar, chutar rende em média ${fixed(binaryGuess)} e se abster rende ${fixed(ABSTAIN)}: chutar sempre ganha. Avaliações que só contam acertos recompensam o modelo que inventa em vez de admitir dúvida.`,
        `Agora o erro custa −${Math.abs(WRONG_PENALTY)}. O mesmo chute rende ${signed(penalizedGuess)}, pior que os 0 da abstenção. Com essa regra, só vale responder quando a confiança passa de ${percent(breakEven)}. Ensinar o modelo a se abster exige treinar e avaliar com regras que punam o erro confiante.`,
      ],
      keyIdea: "Se errar não custa nada, chutar é sempre a melhor estratégia; punir o erro confiante muda o incentivo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "scores",
            piece: "metrics-panel",
            metrics: [
              { id: "p", label: "chance de acerto", value: percent(p) },
              { id: "binary", label: "chutar, erro vale 0", value: signed(binaryGuess), color: "success" },
              { id: "penalized", label: "chutar, erro vale −1", value: signed(penalizedGuess), color: "danger" },
              { id: "abstain", label: "dizer “não sei”", value: fixed(ABSTAIN) },
            ],
            highlight: "penalized",
          },
        ],
      },
      alt: `Com ${percent(p)} de chance de acerto, chutar vale ${signed(binaryGuess)} quando o erro vale 0 e ${signed(penalizedGuess)} quando o erro vale −1; dizer não sei vale 0.`,
    },
    {
      id: "threshold",
      shortTitle: "Limiar",
      title: "Responder só acima de um limiar",
      tag: "example",
      body: [
        `Uma aplicação pode usar a confiança como filtro. Na cena, cada barra é a probabilidade do favorito para uma pergunta. Com limiar de ${percent(THRESHOLD)}, o sistema responde ${listing(answered)} e devolve “não tenho certeza” para ${listing(abstained)}.`,
        "A confiança de um token ajuda, mas não basta. Uma resposta tem vários tokens e o primeiro pode ser seguro enquanto o resto é inventado; modelos ajustados para conversar também costumam ser menos calibrados que o modelo base. Na prática, o limiar é um sinal entre vários, junto com fontes e verificação.",
      ],
      keyIdea: "Abster-se quando a confiança é baixa troca respostas erradas por “não sei”; o limiar decide o equilíbrio.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "confidence",
            piece: "chart",
            kind: "bar",
            series: questions.map((question, index) => ({ label: question.label, value: Number(confidences[index].toFixed(3)) })),
            max: 1,
            cutoff: { mode: "threshold", value: THRESHOLD, label: percent(THRESHOLD) },
            highlight: questions.findIndex((question) => question.label === "dose"),
            color: "module-04",
          },
        ],
      },
      alt: `Confiança do favorito em seis perguntas: ${questions.map((question, index) => `${question.label} ${percent(confidences[index])}`).join(", ")}. Com limiar de ${percent(THRESHOLD)}, respondem ${listing(answered)}; ${listing(abstained)} ficam sem resposta.`,
    },
    {
      id: "grounding",
      shortTitle: "Fontes",
      title: "Dar a fonte em vez de pedir memória",
      tag: "mechanism",
      body: [
        "A mitigação mais eficaz é não depender da memória do modelo. Com [[RAG|rag]], o sistema busca os trechos relevantes nos seus documentos e coloca no contexto, com a instrução de responder só com base neles e citar de onde tirou cada afirmação. Isso é [[grounding|grounding]]: a resposta fica ancorada numa fonte que pode ser conferida.",
        "Grounding reduz, mas não zera, o problema. O modelo ainda pode contradizer o trecho que recebeu ou misturar fontes. Por isso sistemas sérios verificam depois: conferem se cada citação existe e se o trecho citado sustenta a frase, e escalam para uma pessoa quando não sustenta.",
      ],
      keyIdea: "Trocar memória por fonte no contexto, com citação, torna a resposta verificável.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "pergunta", col: 0, row: 0 },
              { id: "search", kind: "retrieval", label: "busca", col: 1, row: 0 },
              { id: "docs", kind: "documents", label: "seus documentos", col: 1, row: 1 },
              { id: "context", kind: "context", label: "trechos + regra", col: 2, row: 0 },
              { id: "llm", kind: "llm", label: "llm", col: 3, row: 0 },
              { id: "check", kind: "eval", label: "confere citações", col: 3, row: 1 },
            ],
            edges: [
              { from: "user", to: "search" },
              { from: "docs", to: "search" },
              { from: "search", to: "context", label: "top-k" },
              { from: "context", to: "llm" },
              { from: "llm", to: "check", label: "resposta citada" },
            ],
            active: "context",
          },
        ],
      },
      alt: "A pergunta vai para a busca nos seus documentos; os trechos entram no contexto com a regra de responder só com eles, em destaque; o LLM responde com citações, que são conferidas.",
    },
    {
      id: "kinds",
      shortTitle: "Tipos",
      title: "Dois tipos, mitigações diferentes",
      tag: "tradeoff",
      body: [
        "A literatura separa dois tipos. A alucinação intrínseca contradiz a fonte que o modelo recebeu: o documento diz 2019 e o resumo diz 2021. A extrínseca acrescenta algo que a fonte não permite confirmar nem negar: um detalhe que não está em lugar nenhum do contexto.",
        "A intrínseca se combate com verificação contra a fonte; a extrínseca, com instruções para não acrescentar nada e com abstenção. Toda mitigação tem custo: buscar e verificar aumenta latência e preço, e um limiar alto deixa o assistente dizendo “não sei” demais.",
      ],
      keyIdea: "Contradizer a fonte e inventar além dela são problemas diferentes, com defesas diferentes.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "kinds",
            piece: "graph",
            nodes: [
              { id: "h", label: "alucinação", x: 0.5, y: 0.1, color: "danger" },
              { id: "intrinsic", label: "intrínseca: contradiz a fonte", x: 0.2, y: 0.5 },
              { id: "extrinsic", label: "extrínseca: vai além da fonte", x: 0.8, y: 0.5 },
              { id: "verify", label: "verificar contra a fonte", x: 0.2, y: 0.9, color: "success" },
              { id: "abstain", label: "restringir e abster", x: 0.8, y: 0.9, color: "success" },
            ],
            edges: [
              { from: "h", to: "intrinsic" },
              { from: "h", to: "extrinsic" },
              { from: "intrinsic", to: "verify", label: "defesa" },
              { from: "extrinsic", to: "abstain", label: "defesa" },
            ],
            highlight: ["intrinsic", "extrinsic"],
          },
        ],
      },
      alt: "Alucinação se divide em intrínseca, que contradiz a fonte e se combate verificando contra ela, e extrínseca, que vai além da fonte e se combate restringindo a resposta e se abstendo.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Projetar contra a invenção",
      tag: "summary",
      body: [
        "Alucinações nascem de um objetivo que recompensa o provável e de uma geração que sempre escolhe algum token. Distribuições planas sinalizam incerteza, avaliações que não punem o erro estimulam o chute, e o tom da resposta nunca denuncia o problema.",
        "A defesa é de sistema: fontes no contexto, citações, abstenção quando a confiança é baixa e verificação depois. A próxima aula mostra as etapas de treino que ensinam o modelo a seguir instruções, inclusive a dizer “não sei”.",
      ],
      keyIdea: "Não dá para eliminar alucinações no modelo; dá para projetar o sistema para pegá-las.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "defense",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "source", label: "buscar fontes" },
              { id: "answer", label: "responder com citação", color: "module-04" },
              { id: "confidence", label: "abster se incerto" },
              { id: "verify", label: "verificar citações", color: "success" },
              { id: "human", label: "escalar para humano" },
            ],
          },
        ],
      },
      alt: "Fluxo em chips: buscar fontes, responder com citação, abster se incerto, verificar citações e escalar para humano.",
    },
  ],
  realWorldExample:
    "Em 2023, no caso Mata v. Avianca, num tribunal federal de Nova York, advogados apresentaram uma petição com decisões judiciais que não existiam, geradas pelo ChatGPT com nomes, números de processo e citações plausíveis. O juiz multou os advogados. Desde então, ferramentas jurídicas com IA respondem com base em bases de jurisprudência e mostram a fonte de cada citação.",
  code: {
    language: "python",
    source: `SYSTEM = """Responda só com base nos trechos abaixo.
Cite o id do trecho entre colchetes depois de cada afirmação, como [doc-3].
Se os trechos não trouxerem a resposta, diga: "Não encontrei isso nos documentos."
"""

def build_prompt(question: str, chunks: list[dict]) -> str:
    sources = "\\n".join(f"[{c['id']}] {c['text']}" for c in chunks)
    return f"{SYSTEM}\\nTrechos:\\n{sources}\\n\\nPergunta: {question}"`,
    caption: "Um prompt de grounding: fontes no contexto, citação obrigatória e uma saída explícita para quando a resposta não está nos trechos.",
  },
  tradeOffs: {
    pros: [
      "Fontes no contexto tornam a resposta verificável",
      "Abstenção troca erros confiantes por “não sei”, mais seguro em áreas críticas",
      "Verificar citações pega boa parte das invenções antes de chegarem ao usuário",
    ],
    cons: [
      "Busca e verificação aumentam latência e custo por pergunta",
      "Limiares altos fazem o assistente se abster demais",
      "Nenhuma técnica zera o problema: o modelo ainda pode contradizer a fonte",
    ],
    alternatives: ["Revisão humana obrigatória em respostas de alto risco", "Ferramentas determinísticas (banco de dados, calculadora) para fatos e contas exatos"],
  },
  knowledgeCheck: [
    {
      id: "intrinsic-or-extrinsic",
      prompt: "O contrato no contexto diz que o prazo é de 30 dias. O resumo do modelo diz 60 dias. Que tipo de alucinação é essa?",
      options: [
        "Extrínseca, porque o número é inventado",
        "Intrínseca, porque contradiz a fonte que o modelo recebeu",
        "Não é alucinação, porque é só um número",
        "Erro de tokenização",
      ],
      correct: 1,
      explanation: "A informação certa estava no contexto e o modelo a contradisse: é intrínseca. Verificar o resumo contra a fonte pega esse tipo de erro.",
      lesson: "04-10",
    },
    {
      id: "grading-incentive",
      prompt: "Um benchmark dá 1 ponto por acerto e 0 por erro ou por “não sei”. Que comportamento ele incentiva?",
      options: [
        "Dizer “não sei” sempre que houver dúvida",
        "Chutar sempre, porque o chute nunca rende menos que a abstenção",
        "Responder mais devagar",
        "Citar fontes",
      ],
      correct: 1,
      explanation: "Com erro e abstenção valendo 0, qualquer chance de acerto torna o chute melhor em média. Punir o erro faz a abstenção valer a pena quando a confiança é baixa.",
      lesson: "04-10",
    },
  ],
  related: ["04-03", "08-11", "16-09"],
  references: [
    { title: "Ji et al. (2022), Survey of Hallucination in Natural Language Generation", url: "https://arxiv.org/abs/2202.03629", kind: "paper" },
    { title: "Huang et al. (2023), A Survey on Hallucination in Large Language Models", url: "https://arxiv.org/abs/2311.05232", kind: "paper" },
    { title: "Lewis et al. (2020), Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks", url: "https://arxiv.org/abs/2005.11401", kind: "paper" },
  ],
};

export default lesson;
