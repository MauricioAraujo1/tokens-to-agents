import { softmax } from "../../../lab/attention";
import type { LessonContent } from "../../../types/content";

// Zero-shot com contas no arquivo: a distribuição sobre os rótulos para uma avaliação ambígua (logits
// escritos à mão), a matriz de confusão e a acurácia de um classificador zero-shot sobre oito avaliações
// com respostas de exemplo escritas à mão, e o custo em tokens contra a versão com exemplos.

const percent = (value: number) => `${Math.round(value * 100)}%`;
const estimateTokens = (text: string) => Math.ceil(text.length / 4);

const LABELS = ["positivo", "negativo", "neutro"] as const;
type Label = (typeof LABELS)[number];

// Passo 3: uma avaliação que mistura elogio e reclamação.
const MIXED = "Bom, mas a entrega atrasou dez dias.";
const mixedTokens = ["positivo", "negativo", "neutro", "O", "Bom"];
const mixedProbabilities = softmax([1.6, 1.9, 1.7, 0.3, 0.5]);
const mixedTop = mixedProbabilities.indexOf(Math.max(...mixedProbabilities));

// Passo 4: oito avaliações, o rótulo certo e a resposta zero-shot.
const reviews: Array<{ text: string; label: Label; predicted: Label }> = [
  { text: "Chegou rápido e funciona perfeitamente.", label: "positivo", predicted: "positivo" },
  { text: "Quebrou na primeira semana.", label: "negativo", predicted: "negativo" },
  { text: "É um carregador. Carrega.", label: "neutro", predicted: "positivo" },
  { text: MIXED, label: "neutro", predicted: "negativo" },
  { text: "Péssimo atendimento, não recomendo.", label: "negativo", predicted: "negativo" },
  { text: "Superou minhas expectativas.", label: "positivo", predicted: "positivo" },
  { text: "Veio conforme a descrição.", label: "neutro", predicted: "neutro" },
  { text: "Não decepciona, compraria de novo.", label: "positivo", predicted: "positivo" },
];

const confusion = LABELS.map((real) =>
  LABELS.map((guess) => reviews.filter((review) => review.label === real && review.predicted === guess).length),
);
const correct = reviews.filter((review) => review.label === review.predicted).length;
const accuracy = correct / reviews.length;
const errorsByLabel = LABELS.map((label) => reviews.filter((review) => review.label === label && review.predicted !== label).length);
const worstLabel = LABELS[errorsByLabel.indexOf(Math.max(...errorsByLabel))];
const NEUTRAL = LABELS.indexOf("neutro");

// Passo 5: custo do prompt zero-shot contra um few-shot com um exemplo por rótulo.
const ZERO_SHOT = "Classifique o sentimento da avaliação como positivo, negativo ou neutro. Responda só com o rótulo.\nAvaliação: ";
const EXAMPLE_BLOCK = "Avaliação: Chegou rápido e funciona.\nSentimento: positivo\n";
const zeroShotTokens = estimateTokens(ZERO_SHOT);
const fewShotTokens = zeroShotTokens + LABELS.length * estimateTokens(EXAMPLE_BLOCK);

const lesson: LessonContent = {
  id: "05-05",
  subtitle: "Pedir uma tarefa só com a instrução, sem exemplos: por que funciona em modelos ajustados para instruções e onde costuma falhar.",
  objectives: [
    "Definir zero-shot prompting e quando ele é o ponto de partida certo",
    "Explicar por que um modelo instruct segue instruções e um modelo base só continua texto",
    "Ler uma matriz de confusão para achar onde o zero-shot erra",
    "Decidir quando passar de zero-shot para few-shot",
  ],
  steps: [
    {
      id: "only-instruction",
      shortTitle: "Só instrução",
      title: "Só a instrução, nenhum exemplo",
      tag: "context",
      body: [
        "Você pede a um colega experiente: “separa essas avaliações em positivas, negativas e neutras”. Ele não precisa ver exemplos, porque já sabe o que é uma avaliação positiva. Isso é [[zero-shot|zero-shot]]: a tarefa vai descrita, sem nenhum caso resolvido no prompt.",
        "É o jeito mais barato e o primeiro a testar. O prompt tem só a instrução e a entrada, e um [[LLM|llm]] atual resolve assim muitas tarefas comuns: classificar, resumir, traduzir, extrair um campo. O termo vem do artigo do GPT-3 (Brown et al., 2020), que comparou zero-shot, one-shot e few-shot no mesmo modelo.",
      ],
      keyIdea: "Zero-shot = instrução + entrada, sem exemplos. É o ponto de partida mais barato.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "avaliação", col: 0, row: 0 },
              { id: "prompt", kind: "context", label: "instrução + texto", col: 1, row: 0 },
              { id: "llm", kind: "llm", label: "llm instruct", col: 2, row: 0 },
              { id: "answer", kind: "answer", label: "“positivo”", col: 3, row: 0 },
            ],
            edges: [
              { from: "user", to: "prompt" },
              { from: "prompt", to: "llm", label: "0 exemplos" },
              { from: "llm", to: "answer" },
            ],
            active: "llm",
          },
        ],
      },
      alt: "Uma avaliação entra num prompt só com instrução e texto, sem exemplos, e o LLM instruct, em destaque, responde “positivo”.",
    },
    {
      id: "base-vs-instruct",
      shortTitle: "Base x instruct",
      title: "Por que um modelo segue instruções",
      tag: "mechanism",
      body: [
        "Mande a mesma instrução para um [[modelo base|base-model]], só pré-treinado, e ele pode continuar o texto como se fosse uma lista de exercícios: escreve outra avaliação, outra pergunta, outro enunciado. Ele aprendeu a continuar textos da internet, não a obedecer.",
        "O zero-shot funciona porque os modelos de chat passaram por [[ajuste fino supervisionado|supervised-fine-tuning]] com milhares de tarefas escritas como instrução e resposta, e depois por ajuste de preferências. O FLAN (Wei et al., 2021) mostrou o efeito: ajustar com instruções em muitas tarefas melhorou o zero-shot em tarefas que o modelo nunca viu no ajuste.",
      ],
      keyIdea: "Seguir instruções é um comportamento treinado: o zero-shot depende de um modelo ajustado para instruções.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "prompt", kind: "context", label: "mesma instrução", col: 0, row: 0.5 },
              { id: "base", kind: "llm", label: "modelo base", col: 1, row: 0 },
              { id: "instruct", kind: "llm", label: "modelo instruct", col: 1, row: 1 },
              { id: "more", kind: "no-result", label: "continua a lista", col: 2, row: 0 },
              { id: "answer", kind: "answer", label: "“positivo”", col: 2, row: 1 },
            ],
            edges: [
              { from: "prompt", to: "base" },
              { from: "prompt", to: "instruct" },
              { from: "base", to: "more", label: "só continua", variant: "alternative" },
              { from: "instruct", to: "answer", label: "obedece" },
            ],
            active: "instruct",
          },
        ],
      },
      alt: "A mesma instrução vai para dois modelos: o modelo base só continua a lista de exercícios, pelo caminho tracejado; o modelo instruct, em destaque, obedece e responde “positivo”.",
    },
    {
      id: "label-distribution",
      shortTitle: "Rótulos",
      title: "A resposta é uma aposta entre rótulos",
      tag: "mechanism",
      body: [
        `Na classificação zero-shot, o que importa é a probabilidade do primeiro token entre os rótulos. Para “${MIXED}”, os logits escritos à mão da cena dão ${mixedTokens.map((token, index) => `${token} ${percent(mixedProbabilities[index])}`).slice(0, 3).join(", ")}: o modelo fica dividido, e “${mixedTokens[mixedTop]}” vence por pouco.`,
        "O modelo está certo em ficar dividido: a instrução nunca disse o que fazer com elogio e reclamação juntos. Zero-shot depende de o modelo adivinhar a sua definição de cada rótulo. Duas correções baratas: listar os rótulos fechados, para que a resposta não seja “misto” ou “depende”, e definir a fronteira na instrução (“neutro: elogio e reclamação na mesma avaliação”).",
      ],
      keyIdea: "Em zero-shot, o modelo usa a definição de rótulo que ele imagina; se a sua é outra, escreva-a na instrução.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "labels",
            piece: "chart",
            kind: "bar",
            series: mixedTokens.map((label, index) => ({ label, value: Number(mixedProbabilities[index].toFixed(3)) })),
            max: 1,
            highlight: NEUTRAL,
            color: "module-05",
          },
        ],
      },
      alt: `Probabilidade do primeiro token para a avaliação “${MIXED}”: ${mixedTokens.map((token, index) => `${token} ${percent(mixedProbabilities[index])}`).join(", ")}. Os três rótulos ficam próximos.`,
    },
    {
      id: "confusion",
      shortTitle: "Confusão",
      title: `Oito avaliações: ${correct} acertos`,
      tag: "example",
      body: [
        `As respostas zero-shot da cena foram escritas à mão para a aula. Nas linhas está o rótulo certo; nas colunas, o que o modelo respondeu. A diagonal são os acertos: ${correct} de ${reviews.length}, acurácia de ${percent(accuracy)}.`,
        `Os erros não estão espalhados: os ${errorsByLabel[NEUTRAL]} erros são de avaliações “${worstLabel}”. “É um carregador. Carrega.” virou positivo e a avaliação mista virou negativo. A [[matriz de confusão|confusion-matrix]] mostra que o problema não é o modelo “ser ruim em sentimento”, e sim a fronteira do neutro, que é exatamente o que a instrução não definiu.`,
      ],
      keyIdea: "A matriz de confusão diz onde o zero-shot erra; erros concentrados num rótulo indicam uma definição faltando.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "confusion",
            piece: "matrix",
            rows: LABELS.map((label) => `real: ${label}`),
            cols: LABELS.map((label) => `prev.: ${label}`),
            values: confusion,
            scale: { min: 0, max: Math.max(...confusion.flat()) },
            highlight: { row: NEUTRAL, col: 1 },
            showValues: true,
            color: "module-05",
          },
        ],
      },
      alt: `Matriz de confusão 3 por 3: ${LABELS.map((real, row) => `real ${real}: ${LABELS.map((guess, col) => `${guess} ${confusion[row][col]}`).join(", ")}`).join("; ")}. Acurácia ${percent(accuracy)}, com os erros no neutro.`,
    },
    {
      id: "when-enough",
      shortTitle: "Quando basta",
      title: "Quando zero-shot basta",
      tag: "tradeoff",
      body: [
        `O prompt zero-shot tem cerca de ${zeroShotTokens} tokens. Acrescentar um exemplo por rótulo leva a cerca de ${fewShotTokens}, ${(fewShotTokens / zeroShotTokens).toFixed(1).replace(".", ",")} vezes mais, pagos em toda requisição. Se a acurácia já atende e os erros são aceitáveis, zero-shot é a escolha certa: mais barato, mais curto e sem exemplos para manter.`,
        "Zero-shot começa a falhar quando o formato é peculiar, quando os rótulos têm definições próprias da sua empresa ou quando a tarefa é rara na internet. Aí, antes de escrever parágrafos de instrução, vale testar alguns exemplos: mostrar costuma ser mais curto que explicar.",
      ],
      keyIdea: "Use zero-shot enquanto o eval aprovar; quando os erros forem de definição ou formato, teste exemplos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "cost",
            piece: "metrics-panel",
            metrics: [
              { id: "accuracy", label: "acurácia zero-shot", value: percent(accuracy), color: "success" },
              { id: "neutral", label: "erros no neutro", value: `${errorsByLabel[NEUTRAL]} de ${reviews.length - correct}`, color: "danger" },
              { id: "zero", label: "tokens: zero-shot", value: `≈ ${zeroShotTokens}` },
              { id: "few", label: "tokens: 3 exemplos", value: `≈ ${fewShotTokens}` },
            ],
            highlight: "neutral",
          },
        ],
      },
      alt: `Painel: acurácia zero-shot de ${percent(accuracy)}, ${errorsByLabel[NEUTRAL]} dos ${reviews.length - correct} erros no neutro, prompt zero-shot com cerca de ${zeroShotTokens} tokens contra cerca de ${fewShotTokens} com três exemplos.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "O caminho a partir do zero-shot",
      tag: "summary",
      body: [
        "Zero-shot é instrução sem exemplos, e funciona porque os modelos de chat foram ajustados para seguir instruções. Rótulos fechados e definições explícitas resolvem boa parte dos erros; a matriz de confusão mostra o que sobrou.",
        "Quando o que falta é mostrar o formato ou a fronteira entre rótulos, o próximo passo é colocar exemplos no prompt. É o assunto da próxima aula: few-shot prompting.",
      ],
      keyIdea: "Comece por zero-shot, meça, defina os rótulos e só então acrescente exemplos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "path",
            piece: "pipeline",
            stages: [
              { id: "instruction", label: "instrução clara" },
              { id: "labels", label: "rótulos fechados" },
              { id: "define", label: "definir fronteiras" },
              { id: "eval", label: "medir", color: "module-05" },
            ],
            active: "eval",
            done: ["instruction", "labels", "define"],
            branch: { id: "few", label: "few-shot", from: "eval", edgeLabel: "ainda erra", color: "info" },
          },
        ],
      },
      alt: "Pipeline: instrução clara, rótulos fechados, definir fronteiras e medir, em destaque; se ainda erra, um ramo tracejado leva ao few-shot.",
    },
  ],
  realWorldExample:
    "No artigo do FLAN (Wei et al., 2021), um modelo de 137 bilhões de parâmetros ajustado com instruções em mais de 60 conjuntos de dados superou o GPT-3 de 175 bilhões em zero-shot em 20 dos 25 conjuntos avaliados, todos de tipos de tarefa que ele não tinha visto no ajuste. É a base de por que os modelos de chat de hoje resolvem tantas tarefas só com a instrução.",
  code: {
    language: "python",
    source: `LABELS = {"positivo", "negativo", "neutro"}

PROMPT = """Classifique o sentimento da avaliação.
Rótulos: positivo, negativo ou neutro.
neutro: avaliação sem opinião, ou com elogio e reclamação juntos.
Responda só com o rótulo.

Avaliação: {review}"""

def classify(review: str, call_model) -> str:
    answer = call_model(PROMPT.format(review=review)).strip().lower()
    return answer if answer in LABELS else "revisar"`,
    caption: "Classificação zero-shot com rótulos fechados, a fronteira do neutro definida na instrução e uma saída de segurança para respostas fora da lista.",
  },
  tradeOffs: {
    pros: [
      "Prompt mais curto e barato",
      "Nenhum exemplo para escolher, rotular e manter",
      "Bom ponto de partida para medir antes de complicar",
    ],
    cons: [
      "Depende de o modelo adivinhar a sua definição de cada rótulo",
      "Formatos peculiares são difíceis de descrever só com palavras",
      "Funciona mal em modelos base, sem ajuste para instruções",
    ],
    alternatives: ["Few-shot, quando mostrar é mais fácil que explicar", "Um classificador treinado, quando o volume é enorme e os rótulos são estáveis"],
  },
  knowledgeCheck: [
    {
      id: "base-model-continues",
      prompt: "Você manda “Traduza para o inglês: bom dia” para um modelo só pré-treinado e ele responde “Traduza para o inglês: boa noite”. Por quê?",
      options: [
        "O modelo não sabe inglês",
        "Um modelo base continua o padrão do texto; seguir instruções vem do ajuste fino",
        "Faltou aumentar a temperatura",
        "A janela de contexto é pequena demais",
      ],
      correct: 1,
      explanation: "O modelo base aprendeu a continuar textos, e uma lista de exercícios continua com outro exercício. Zero-shot pressupõe um modelo ajustado para instruções.",
      lesson: "05-05",
    },
    {
      id: "concentrated-errors",
      prompt: "No eval zero-shot, quase todos os erros são avaliações neutras classificadas como positivas. Qual é o próximo passo mais barato?",
      options: [
        "Trocar de modelo",
        "Definir na instrução o que é neutro, e se não bastar, mostrar exemplos de neutro",
        "Remover o rótulo neutro do eval",
        "Pedir a resposta em letras maiúsculas",
      ],
      correct: 1,
      explanation: "Erros concentrados num rótulo indicam uma fronteira mal definida. Definir o rótulo custa poucos tokens; exemplos são o passo seguinte.",
      lesson: "05-05",
    },
  ],
  related: ["04-11", "05-04", "05-06"],
  references: [
    { title: "Wei et al. (2021), Finetuned Language Models Are Zero-Shot Learners (FLAN)", url: "https://arxiv.org/abs/2109.01652", kind: "paper" },
    { title: "Brown et al. (2020), Language Models are Few-Shot Learners", url: "https://arxiv.org/abs/2005.14165", kind: "paper" },
    { title: "Ouyang et al. (2022), Training language models to follow instructions with human feedback", url: "https://arxiv.org/abs/2203.02155", kind: "paper" },
  ],
};

export default lesson;
