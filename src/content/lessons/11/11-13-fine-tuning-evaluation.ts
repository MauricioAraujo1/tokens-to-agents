import type { BlockDiagramSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Avaliação de um ajuste com as contas no arquivo. Os vereditos de 40 comparações às cegas entre o modelo base e o
// ajustado, os 7 que mudam quando a ordem das respostas é trocada e as notas da matriz de regressões são de brinquedo,
// declarados no texto. As contas: win rate com empate valendo meio ponto, o intervalo de Wilson de 95% e o número de
// prompts para uma margem de ±5 pontos, n = z² · p · (1 − p) / E², com p = 0,5 no pior caso.

const fixed = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const percent = (value: number, digits = 1) => `${fixed(value * 100, digits)}%`;

interface Verdicts {
  wins: number;
  ties: number;
  losses: number;
}
const total = (v: Verdicts) => v.wins + v.ties + v.losses;
const winRate = (v: Verdicts) => (v.wins + v.ties / 2) / total(v);

const firstOrder: Verdicts = { wins: 26, ties: 2, losses: 12 };
const FLIPPED_WINS = 6;
const FLIPPED_LOSSES = 1;
const flipped = FLIPPED_WINS + FLIPPED_LOSSES;
const consistent: Verdicts = {
  wins: firstOrder.wins - FLIPPED_WINS,
  ties: firstOrder.ties + flipped,
  losses: firstOrder.losses - FLIPPED_LOSSES,
};
const PROMPTS = total(firstOrder);
const naiveRate = winRate(firstOrder);
const fairRate = winRate(consistent);

const Z = 1.96;
const wilson = (p: number, n: number) => {
  const center = p + (Z * Z) / (2 * n);
  const margin = Z * Math.sqrt((p * (1 - p)) / n + (Z * Z) / (4 * n * n));
  const denominator = 1 + (Z * Z) / n;
  return [(center - margin) / denominator, (center + margin) / denominator];
};
const [low, high] = wilson(fairRate, PROMPTS);
const MARGIN = 0.05;
const neededPrompts = Math.ceil((Z * Z * 0.25) / (MARGIN * MARGIN));

const regressionRows = ["base", "ajustado"];
const regressionCols = ["tarefa", "JSON válido", "conhecimento", "recusa certa"];
const scores = [
  [58, 71, 64, 92],
  [86, 99, 61, 84],
];
const deltas = regressionCols.map((label, index) => ({ label, delta: scores[1][index] - scores[0][index] }));
const worst = deltas.reduce((min, item) => (item.delta < min.delta ? item : min));
const signed = (value: number) => (value >= 0 ? `+${value}` : `−${Math.abs(value)}`);

const tasting = (active: string): BlockDiagramSpec => ({
  id: "tasting",
  piece: "block-diagram",
  blocks: [
    { id: "prompts", kind: "documents", label: `${PROMPTS} prompts`, col: 0, row: 0.5 },
    { id: "base", kind: "llm", label: "base", col: 1, row: 0 },
    { id: "tuned", kind: "llm", label: "ajustado", col: 1, row: 1 },
    { id: "judge", kind: "eval", label: "juiz às cegas", col: 2, row: 0.5 },
    { id: "verdict", kind: "answer", label: "a, b ou empate", col: 3, row: 0.5 },
  ],
  edges: [
    { from: "prompts", to: "base" },
    { from: "prompts", to: "tuned" },
    { from: "base", to: "judge", label: "resposta a" },
    { from: "tuned", to: "judge", label: "resposta b" },
    { from: "judge", to: "verdict" },
  ],
  active,
});

const lesson: LessonContent = {
  id: "11-13",
  subtitle: "Como saber se o ajuste melhorou o modelo: comparações às cegas, win rate, viés de posição, intervalo de confiança e as regressões que a métrica da tarefa esconde.",
  objectives: [
    "Calcular o win rate de comparações às cegas entre o modelo base e o ajustado",
    "Corrigir o viés de posição trocando a ordem das respostas",
    "Calcular o intervalo de confiança e o número de prompts necessário",
    "Montar uma bateria de regressões para o que o ajuste pode ter piorado",
  ],
  steps: [
    {
      id: "blind",
      shortTitle: "Às cegas",
      title: "Degustação às cegas",
      tag: "context",
      body: [
        "Para saber se a receita nova do bolo é melhor, você não pergunta ao confeiteiro: serve fatias das duas receitas, sem dizer qual é qual, para várias pessoas, e conta as preferências. A comparação é direta, às cegas e com o mesmo prato.",
        "Avaliar um ajuste é igual. Os mesmos prompts de teste, separados antes do treino, vão para o modelo base e para o ajustado; um juiz, humano ou um LLM com critérios escritos, vê as duas respostas sem saber a origem e escolhe a melhor ou empate. O [[conjunto de teste|golden-dataset]] precisa ser o mesmo para os dois e nunca ter entrado no treino.",
      ],
      keyIdea: "Mesmos prompts, duas respostas, juiz que não sabe qual é qual.",
      scene: { kind: "pieces", layout: "single", pieces: [tasting("judge")] },
      alt: `${PROMPTS} prompts de teste vão para o modelo base e para o ajustado; o juiz às cegas, em destaque, compara a resposta a e a b e decide a, b ou empate.`,
    },
    {
      id: "win-rate",
      shortTitle: "Win rate",
      title: "Contar vitórias, empates e derrotas",
      tag: "mechanism",
      body: [
        `Nos ${PROMPTS} prompts do exemplo, com a resposta do ajustado sempre na segunda posição, o juiz deu ${firstOrder.wins} vitórias ao ajustado, ${firstOrder.ties} empates e ${firstOrder.losses} derrotas. O [[win rate|win-rate]] conta o empate como meio ponto: (${firstOrder.wins} + ${firstOrder.ties} / 2) / ${PROMPTS} = ${percent(naiveRate)}.`,
        "O win rate responde a pergunta certa, “qual das duas respostas é melhor?”, mas depende de quem julga. Juízes LLM são rápidos e baratos, e concordam bastante com pessoas em tarefas abertas, mas têm vieses conhecidos: preferem respostas mais longas, as próprias respostas e a resposta numa posição fixa.",
      ],
      keyIdea: "Win rate = (vitórias + empates / 2) / comparações.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "verdicts",
            piece: "chart",
            kind: "bar",
            series: [
              { label: "vitórias", value: firstOrder.wins },
              { label: "empates", value: firstOrder.ties },
              { label: "derrotas", value: firstOrder.losses },
            ],
            max: PROMPTS,
            highlight: 0,
            color: "module-11",
          },
        ],
      },
      alt: `Vereditos com o ajustado sempre na segunda posição: ${firstOrder.wins} vitórias, ${firstOrder.ties} empates e ${firstOrder.losses} derrotas, um win rate de ${percent(naiveRate)}.`,
    },
    {
      id: "position",
      shortTitle: "Posição",
      title: "Trocar a ordem e julgar de novo",
      tag: "mechanism",
      body: [
        `Para medir o viés de posição, o mesmo juiz avalia cada par de novo com as respostas trocadas. No exemplo, ${flipped} dos ${PROMPTS} vereditos mudam de lado: ${FLIPPED_WINS} vitórias e ${FLIPPED_LOSSES} derrota só existiam por causa da posição. Um veredito que muda com a ordem não é preferência: vira empate.`,
        `Com os vereditos consistentes, ficam ${consistent.wins} vitórias, ${consistent.ties} empates e ${consistent.losses} derrotas, e o win rate cai de ${percent(naiveRate)} para ${percent(fairRate)}. Julgar nas duas ordens dobra o custo do juiz, mas é a correção mais barata para um viés que, sem ela, entra direto no resultado.`,
      ],
      keyIdea: "Julgue nas duas ordens e conte como empate o que muda com a posição.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "swap",
            piece: "block-diagram",
            blocks: [
              { id: "pair", kind: "context", label: "par de respostas", col: 0, row: 0.5 },
              { id: "ab", kind: "eval", label: "ordem a, b", col: 1, row: 0 },
              { id: "ba", kind: "eval", label: "ordem b, a", col: 1, row: 1 },
              { id: "agree", kind: "guardrail", label: "concordam?", col: 2, row: 0.5 },
              { id: "keep", kind: "answer", label: "veredito", col: 3, row: 0 },
              { id: "tie", kind: "no-result", label: "empate", col: 3, row: 1 },
            ],
            edges: [
              { from: "pair", to: "ab" },
              { from: "pair", to: "ba" },
              { from: "ab", to: "agree" },
              { from: "ba", to: "agree" },
              { from: "agree", to: "keep", label: "sim" },
              { from: "agree", to: "tie", label: `não: ${flipped}`, variant: "alternative" },
            ],
            active: "agree",
          },
        ],
      },
      alt: `Cada par é julgado nas ordens a, b e b, a; se os vereditos concordam, em destaque, valem; se não, ${flipped} casos no exemplo, viram empate.`,
    },
    {
      id: "uncertainty",
      shortTitle: "Incerteza",
      title: `${PROMPTS} prompts dizem pouco`,
      tag: "example",
      body: [
        `Um win rate de ${percent(fairRate)} com ${PROMPTS} prompts parece uma vitória clara. O intervalo de Wilson de 95% diz outra coisa: vai de ${percent(low)} a ${percent(high)}, e inclui 50%, o empate técnico. Com essa amostra, não dá para afirmar que o ajustado é melhor.`,
        `Para uma margem de ±${Math.round(MARGIN * 100)} pontos no pior caso, são precisos z² · 0,25 / ${fixed(MARGIN, 2)}² ≈ ${neededPrompts} prompts. Monte o conjunto de teste com esse tamanho em mente, estratificado pelas intenções do produto, e reporte sempre o intervalo junto do número.`,
      ],
      keyIdea: "Um win rate sem intervalo de confiança pode ser só ruído.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "interval",
            piece: "metrics-panel",
            metrics: [
              { id: "rate", label: "win rate consistente", value: percent(fairRate) },
              { id: "ci", label: "intervalo de 95% (Wilson)", value: `${percent(low)} a ${percent(high)}`, color: "danger" },
              { id: "needed", label: `prompts para ±${Math.round(MARGIN * 100)} pontos`, value: `${neededPrompts}`, color: "module-11" },
            ],
            highlight: "ci",
          },
        ],
      },
      alt: `Win rate de ${percent(fairRate)} com intervalo de 95% de ${percent(low)} a ${percent(high)}, que inclui 50%. Para uma margem de ±${Math.round(MARGIN * 100)} pontos, são precisos ${neededPrompts} prompts.`,
    },
    {
      id: "regressions",
      shortTitle: "Regressões",
      title: "O que melhorou e o que piorou",
      tag: "tradeoff",
      body: [
        `A comparação mede a tarefa. Falta medir o resto. Na matriz do exemplo, o ajustado sobe ${deltas[0].delta} pontos na tarefa e ${deltas[1].delta} em JSON válido, mas cai ${Math.abs(deltas[2].delta)} em conhecimento geral e ${Math.abs(worst.delta)} em recusas corretas a pedidos perigosos. Sem uma bateria de regressões, essa piora iria para produção junto com a melhora.`,
        "Essa piora é o [[alignment tax|alignment-tax]], nome que o paper do InstructGPT deu às perdas em benchmarks públicos depois do ajuste, e um parente do [[esquecimento catastrófico|catastrophic-forgetting]]. A bateria mínima tem a métrica da tarefa, o formato, alguns [[benchmarks|benchmark]] gerais e casos de segurança, rodados no base e no ajustado com o mesmo [[eval|eval]].",
      ],
      keyIdea: "Avalie a tarefa e também o que o ajuste pode ter estragado: conhecimento geral e segurança.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "scores",
            piece: "matrix",
            rows: regressionRows,
            cols: regressionCols,
            values: scores,
            scale: { min: 50, max: 100 },
            highlight: { row: 1, col: regressionCols.indexOf(worst.label) },
            showValues: true,
            color: "module-11",
          },
        ],
      },
      alt: `Notas do base e do ajustado: ${deltas.map((item, index) => `${item.label} de ${scores[0][index]} para ${scores[1][index]} (${signed(item.delta)})`).join(", ")}. A queda em ${worst.label} está em destaque.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "A bateria de avaliação",
      tag: "summary",
      body: [
        "Compare base e ajustado às cegas nos mesmos prompts de teste, julgue nas duas ordens, calcule o win rate com intervalo de confiança e rode a bateria de regressões. Só promova o ajuste quando ele vence a tarefa com margem e não piora o que importa.",
        "Aprovado na avaliação, o modelo vai para produção. A última aula do módulo trata do deploy: fundir ou não o adaptador, servir vários adaptadores numa base e voltar atrás com segurança.",
      ],
      keyIdea: "Às cegas → duas ordens → win rate com intervalo → regressões → decisão.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "battery",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "blind", label: "comparação às cegas" },
              { id: "swap", label: "duas ordens" },
              { id: "rate", label: "win rate + intervalo", color: "module-11" },
              { id: "regressions", label: "regressões: geral e segurança" },
              { id: "decide", label: "promover ou não" },
            ],
          },
        ],
      },
      alt: "Chips da bateria: comparação às cegas, duas ordens, win rate com intervalo, em destaque, regressões de conhecimento geral e segurança, e a decisão de promover ou não.",
    },
  ],
  realWorldExample:
    "No MT-Bench, Zheng et al. (2023) compararam juízes LLM com preferências humanas: o GPT-4 como juiz concordou com as pessoas em mais de 80% dos casos, o mesmo nível de concordância entre duas pessoas, e o paper documentou os vieses de posição, de tamanho e de autopreferência, com a troca de ordem como mitigação.",
  code: {
    language: "python",
    source: `from math import sqrt

def win_rate(wins, ties, losses):
    return (wins + ties / 2) / (wins + ties + losses)

def wilson(p, n, z=1.96):
    center = p + z * z / (2 * n)
    margin = z * sqrt(p * (1 - p) / n + z * z / (4 * n * n))
    return (center - margin) / (1 + z * z / n), (center + margin) / (1 + z * z / n)

p = win_rate(20, 9, 11)
print(p, wilson(p, 40))`,
    caption: "Win rate com empates valendo meio ponto e intervalo de Wilson de 95%, com os vereditos consistentes do exemplo.",
  },
  tradeOffs: {
    pros: [
      "Comparação direta responde a pergunta que importa: o ajuste ficou melhor?",
      "Juízes LLM permitem avaliar centenas de prompts a cada versão",
      "A bateria de regressões pega o que a métrica da tarefa esconde",
    ],
    cons: [
      "Juízes LLM têm vieses de posição, tamanho e autopreferência",
      "Amostras pequenas dão intervalos largos e conclusões falsas",
      "Avaliação humana é lenta e cara",
    ],
    alternatives: ["Métricas automáticas exatas, quando a tarefa tem resposta certa", "Teste A/B com usuários em produção"],
  },
  knowledgeCheck: [
    {
      id: "ties",
      prompt: "Em 100 comparações, o ajustado venceu 45, empatou 20 e perdeu 35. Qual o win rate?",
      options: ["45%", "55%", "65%", "56%"],
      correct: 1,
      explanation: "(45 + 20 / 2) / 100 = 55 / 100 = 55%.",
      lesson: "11-13",
    },
    {
      id: "safety-drop",
      prompt: "O ajustado vence com folga na tarefa, mas a taxa de recusa a pedidos perigosos caiu de 95% para 80%. O que fazer?",
      options: [
        "Promover, porque a tarefa melhorou",
        "Não promover: incluir exemplos de recusa nos dados de ajuste, treinar de novo e repetir a bateria",
        "Remover os testes de segurança",
        "Aumentar a temperatura em produção",
      ],
      correct: 1,
      explanation: "É uma regressão de segurança causada pelo ajuste. Colocar exemplos de recusa na mistura e reavaliar ataca a causa; promover leva o problema para produção.",
      lesson: "11-13",
    },
  ],
  related: ["08-15", "11-12", "16-06"],
  references: [
    { title: "Zheng et al. (2023), Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena", url: "https://arxiv.org/abs/2306.05685", kind: "paper" },
    { title: "Ouyang et al. (2022), Training language models to follow instructions with human feedback", url: "https://arxiv.org/abs/2203.02155", kind: "paper" },
    { title: "Hugging Face TRL", url: "https://huggingface.co/docs/trl/index", kind: "docs" },
  ],
};

export default lesson;
