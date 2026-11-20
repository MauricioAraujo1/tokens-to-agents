import type { BlockDiagramSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// LoRA com as contas no arquivo. Uma matriz d_out × d_in congelada recebe o desvio (α / r) · B · A, com B de d_out × r
// e A de r × d_in: r · (d_in + d_out) parâmetros treináveis contra d_in · d_out. O Llama 2 7B é contado pela
// configuração publicada (d = 4096, 32 camadas, FFN de 11008, vocabulário de 32000), que dá os 6.738.415.616
// parâmetros do modelo. Os números do GPT-3 (10 mil vezes menos parâmetros treináveis, 3 vezes menos memória de GPU,
// checkpoint de 350 GB para 35 MB) e a recomendação de adaptar todas as camadas lineares são dos papers do LoRA
// (Hu et al., 2021) e do QLoRA (Dettmers et al., 2023).

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const share = (value: number, digits = 2) => `${fixed(value * 100, digits)}%`;

const loraParams = (rank: number, dIn: number, dOut: number) => rank * (dIn + dOut);

// Brinquedo: ΔW de 4 × 4 com posto 1.
const B = [0.5, -1, 0.25, 2];
const A = [0.4, -0.2, 0.6, 0.1];
const deltaW = B.map((b) => A.map((a) => Number((b * a).toFixed(2))));
const toyFull = B.length * A.length;
const toyLora = B.length + A.length;

// Uma projeção de attention do Llama 2 7B.
const D = 4096;
const FFN = 11008;
const LAYERS = 32;
const VOCAB = 32_000;
const fullMatrix = D * D;
const ranks = [1, 2, 4, 8, 16, 32, 64];
const RANK = 8;
const perMatrix = loraParams(RANK, D, D);

// Modelo inteiro.
const totalParams = LAYERS * (4 * D * D + 3 * D * FFN + 2 * D) + D + 2 * VOCAB * D;
const qvParams = LAYERS * 2 * loraParams(RANK, D, D);
const ALL_RANK = 16;
const allLinearParams = LAYERS * (4 * loraParams(ALL_RANK, D, D) + 3 * loraParams(ALL_RANK, D, FFN));
const BYTES_BF16 = 2;
const qvMb = (qvParams * BYTES_BF16) / 1e6;
const allLinearMb = (allLinearParams * BYTES_BF16) / 1e6;
const fullGb = (totalParams * BYTES_BF16) / 1e9;

const ALPHA = 16;
const scaling = ALPHA / RANK;

const adapterPath = (active: string, labels: { a: string; b: string; out: string }): BlockDiagramSpec => ({
  id: "lora",
  piece: "block-diagram",
  blocks: [
    { id: "x", kind: "tokens", label: "entrada x", col: 0, row: 0.5 },
    { id: "w", kind: "llm", label: "W congelado", col: 1, row: 0 },
    { id: "a", kind: "embedding", label: labels.a, col: 1, row: 1 },
    { id: "b", kind: "embedding", label: labels.b, col: 2, row: 1 },
    { id: "h", kind: "answer", label: labels.out, col: 3, row: 0.5 },
  ],
  edges: [
    { from: "x", to: "w" },
    { from: "x", to: "a" },
    { from: "a", to: "b", label: `${RANK} números` },
    { from: "w", to: "h", label: "W · x" },
    { from: "b", to: "h", label: `× α / r = ${fixed(scaling, 0)}` },
  ],
  active,
});

const lesson: LessonContent = {
  id: "11-08",
  subtitle: "Congelar os pesos do modelo e treinar só um desvio de posto baixo, B · A, em algumas matrizes: a conta dos parâmetros, o papel do α e por que o treino começa do modelo original.",
  objectives: [
    "Explicar por que um desvio de posto baixo basta para adaptar um modelo",
    "Calcular os parâmetros treináveis do LoRA: r · (d_in + d_out) por matriz",
    "Comparar adaptar só query e value com adaptar todas as camadas lineares",
    "Entender a escala α / r e a inicialização com B = 0",
  ],
  steps: [
    {
      id: "overlay",
      shortTitle: "Transparência",
      title: "Desenhar numa transparência sobre o mapa",
      tag: "context",
      body: [
        "Para marcar uma rota num mapa impresso, você não redesenha o mapa: põe uma folha transparente por cima e risca só o caminho. O mapa original continua intacto, a folha é leve, e você pode trocar de folha para outra viagem.",
        "O [[LoRA|lora]] faz isso com cada matriz de pesos W escolhida. W fica congelada, e um caminho paralelo passa a entrada por duas matrizes finas, A e B, cujo produto é o desvio somado à saída: h = W · x + (α / r) · B · A · x. Só A e B treinam. O par forma um [[adaptador|adapter]], salvo separado do modelo.",
      ],
      keyIdea: "LoRA deixa W intacta e aprende só um desvio fino ao lado dela.",
      scene: { kind: "pieces", layout: "single", pieces: [adapterPath("b", { a: "A: r × d", b: "B: d × r", out: "W·x + ΔW·x" })] },
      alt: `A entrada x passa por W congelado e, em paralelo, por A, que reduz para ${RANK} números, e por B, em destaque, que volta à dimensão original; as duas saídas se somam, com o desvio multiplicado por α / r.`,
    },
    {
      id: "rank",
      shortTitle: "Posto baixo",
      title: "Muitos números a partir de poucos",
      tag: "mechanism",
      body: [
        `A cena mostra um desvio ΔW de ${B.length} × ${A.length} com [[posto|lora-rank]] 1: cada linha é a mesma linha A multiplicada por um número de B. São ${toyFull} números gerados por ${toyLora}. Com posto r, ΔW é a soma de r desses padrões, e cabe em r · (d_in + d_out) números em vez de d_in · d_out.`,
        "A aposta do paper é que a mudança que um ajuste precisa tem posto intrínseco baixo: o modelo já sabe quase tudo, e especializá-lo é mover os pesos em poucas direções. Por isso r = 8 ou 16 costuma bastar, mesmo com matrizes de milhares de linhas.",
      ],
      keyIdea: "Um ΔW de posto r é descrito por r · (d_in + d_out) números, não por d_in · d_out.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "delta",
            piece: "matrix",
            rows: B.map((value) => `b=${fixed(value)}`),
            cols: A.map((value) => `a=${fixed(value)}`),
            values: deltaW,
            scale: { min: -1.2, max: 1.2 },
            highlight: { row: 3, col: 2 },
            showValues: true,
            color: "module-11",
          },
        ],
      },
      alt: `Matriz ΔW de 4 × 4 gerada pelo produto de uma coluna B e uma linha A: ${toyFull} valores a partir de ${toyLora} números. Em destaque, o maior valor, ${fixed(deltaW[3][2])}.`,
    },
    {
      id: "per-matrix",
      shortTitle: "Por matriz",
      title: "A conta numa projeção de 4096 × 4096",
      tag: "mechanism",
      body: [
        `Uma projeção de query do Llama 2 7B tem ${D} × ${D} = ${integer(fullMatrix)} pesos. Com r = ${RANK}, o LoRA treina ${RANK} × (${D} + ${D}) = ${integer(perMatrix)}, ${share(perMatrix / fullMatrix)} da matriz. A cena mostra a fração para cada posto: ela dobra quando r dobra, e mesmo r = 64 fica em ${share(loraParams(64, D, D) / fullMatrix)}.`,
        "Menos parâmetros treináveis quer dizer menos gradientes e menos estado do otimizador: o [[Adam|adam]] guarda dois números por parâmetro treinado, e no LoRA eles existem só para A e B. Os pesos congelados ainda ocupam memória, mas não recebem atualização.",
      ],
      keyIdea: "O custo do LoRA cresce linearmente com r e com a soma das dimensões, não com o produto delas.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "fraction",
            piece: "chart",
            kind: "bar",
            series: ranks.map((rank) => ({ label: `r=${rank}`, value: Number(((loraParams(rank, D, D) / fullMatrix) * 100).toFixed(2)) })),
            highlight: ranks.indexOf(RANK),
            color: "module-11",
          },
        ],
      },
      alt: `Porcentagem dos pesos de uma matriz de ${D} × ${D} treinada pelo LoRA para cada posto: ${ranks.map((rank) => `r=${rank} ${share(loraParams(rank, D, D) / fullMatrix)}`).join(", ")}.`,
    },
    {
      id: "llama",
      shortTitle: "Llama 2 7B",
      title: "O modelo inteiro: só q e v, ou todas as lineares",
      tag: "example",
      body: [
        `Contando pela configuração, o Llama 2 7B tem ${integer(totalParams)} parâmetros. Com r = ${RANK} só em q_proj e v_proj, nas ${LAYERS} camadas, o LoRA treina ${integer(qvParams)}: ${share(qvParams / totalParams, 3)} do modelo, um arquivo de ${fixed(qvMb, 1)} MB em 16 bits contra ${fixed(fullGb, 1)} GB do modelo.`,
        `Os [[target modules|target-modules]] importam mais que o posto. O paper do QLoRA concluiu que, para chegar perto do ajuste completo, é preciso adaptar todas as camadas lineares do bloco. Com r = ${ALL_RANK} nas 7 lineares (q, k, v, o, gate, up e down), são ${integer(allLinearParams)} parâmetros, ${share(allLinearParams / totalParams)} do modelo e ${integer(allLinearMb)} MB: ainda pequeno.`,
      ],
      keyIdea: "Adaptar todas as lineares com r = 16 ainda treina menos de 1% do modelo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "llama",
            piece: "metrics-panel",
            metrics: [
              { id: "total", label: "Llama 2 7B", value: `${integer(totalParams / 1e6)} mi` },
              { id: "qv", label: `q, v com r = ${RANK}`, value: `${fixed(qvParams / 1e6)} mi (${share(qvParams / totalParams, 3)})` },
              { id: "all", label: `7 lineares com r = ${ALL_RANK}`, value: `${fixed(allLinearParams / 1e6, 1)} mi (${share(allLinearParams / totalParams)})`, color: "module-11" },
              { id: "file", label: "arquivo do adaptador", value: `${fixed(qvMb, 1)} a ${integer(allLinearMb)} MB` },
            ],
            highlight: "all",
          },
        ],
      },
      alt: `Llama 2 7B com ${integer(totalParams)} parâmetros. LoRA em q e v com r = ${RANK}: ${integer(qvParams)} treináveis; nas 7 lineares com r = ${ALL_RANK}: ${integer(allLinearParams)}, ${share(allLinearParams / totalParams)} do modelo.`,
    },
    {
      id: "alpha",
      shortTitle: "α e início",
      title: "Começar do modelo original, com escala α / r",
      tag: "mechanism",
      body: [
        "No início do treino, A recebe valores aleatórios pequenos e B começa com zeros. Então B · A = 0, e o modelo com LoRA é exatamente o modelo original no passo zero: o ajuste parte do comportamento que já funcionava, sem um salto aleatório na primeira resposta.",
        `O desvio é multiplicado por [[α|lora-alpha]] / r. Com α = ${ALPHA} e r = ${RANK}, a escala é ${fixed(scaling, 0)}. A ideia é poder mudar r sem refazer a busca da taxa de aprendizado: aumentar r espalha o desvio em mais direções, e a divisão por r compensa. Um α comum é o dobro de r; a variante rsLoRA divide por √r em vez de r, para postos altos.`,
      ],
      keyIdea: "B = 0 no início faz o LoRA partir do modelo original; α / r controla o tamanho do desvio.",
      scene: { kind: "pieces", layout: "single", pieces: [adapterPath("a", { a: "A aleatório", b: "B = 0", out: "igual ao original" })] },
      alt: `No passo zero, A é aleatório, em destaque, e B começa com zeros, então a saída é igual à do modelo original; o desvio é escalado por α / r = ${fixed(scaling, 0)}.`,
    },
    {
      id: "paper",
      shortTitle: "No paper",
      title: "O que o LoRA mostrou no GPT-3",
      tag: "tradeoff",
      body: [
        "No GPT-3 de 175 bilhões de parâmetros, o paper relata 10 mil vezes menos parâmetros treináveis e 3 vezes menos memória de GPU que o ajuste completo, com qualidade parecida ou melhor nas tarefas testadas. Com r = 4 em query e value, o checkpoint cai de 350 GB para 35 MB. E, depois do treino, B · A pode ser somado a W: sem custo extra na inferência.",
        `Os limites: os pesos congelados ainda ocupam memória (${fixed(fullGb, 1)} GB em 16 bits no Llama 2 7B), o LoRA pode aprender menos que o ajuste completo em tarefas muito distantes do pré-treino, como um idioma novo, e um adaptador vale só para a base em que foi treinado. A próxima aula ataca o primeiro limite, com a base em 4 bits.`,
      ],
      keyIdea: "Muito menos parâmetros, checkpoints de megabytes e nenhum custo de inferência depois de somar a W.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "gpt3",
            piece: "metrics-panel",
            metrics: [
              { id: "params", label: "parâmetros treináveis", value: "10.000 × menos", color: "module-11" },
              { id: "memory", label: "memória de GPU no treino", value: "3 × menos" },
              { id: "checkpoint", label: "checkpoint (r = 4, q e v)", value: "350 GB → 35 MB" },
              { id: "latency", label: "custo extra na inferência", value: "zero, somando a W" },
            ],
            highlight: "params",
          },
        ],
      },
      alt: "Resultados do LoRA no GPT-3 175B: 10 mil vezes menos parâmetros treináveis, 3 vezes menos memória de GPU, checkpoint de 350 GB para 35 MB e nenhum custo extra na inferência depois de somar o desvio a W.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Uma base, muitas transparências",
      tag: "summary",
      body: [
        "LoRA congela W e treina B · A, com r · (d_in + d_out) parâmetros por matriz, escala α / r e B = 0 no início. Adaptar todas as lineares com r baixo treina menos de 1% do modelo e gera adaptadores de megabytes, um por tarefa, sobre a mesma base.",
        "A base congelada ainda ocupa 16 bits por peso. Na próxima aula, o QLoRA guarda essa base em 4 bits e treina os adaptadores por cima.",
      ],
      keyIdea: "h = W · x + (α / r) · B · A · x, com W congelado e só A e B treinando.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "adapters",
            piece: "block-diagram",
            blocks: [
              { id: "base", kind: "llm", label: "base congelada", col: 0, row: 0.5 },
              { id: "support", kind: "memory", label: "lora suporte", col: 1, row: 0 },
              { id: "sql", kind: "memory", label: "lora sql", col: 1, row: 1 },
              { id: "server", kind: "server", label: "servidor", col: 2, row: 0.5 },
              { id: "answer", kind: "answer", label: "respostas", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "base", to: "support" },
              { from: "base", to: "sql" },
              { from: "support", to: "server", label: `${fixed(qvMb, 1)} MB` },
              { from: "sql", to: "server", label: `${fixed(qvMb, 1)} MB` },
              { from: "server", to: "answer" },
            ],
            active: "base",
          },
        ],
      },
      alt: `Uma base congelada, em destaque, com dois adaptadores LoRA de ${fixed(qvMb, 1)} MB cada, de suporte e de SQL, servidos pelo mesmo servidor.`,
    },
  ],
  realWorldExample:
    "A biblioteca PEFT do Hugging Face implementa o LoRA para os modelos do Transformers: um LoraConfig com r, lora_alpha e target_modules transforma o modelo, e print_trainable_parameters mostra a fração treinável. O Hub tem milhares de adaptadores LoRA publicados, que pesam megabytes e apontam para o modelo base em que foram treinados.",
  code: {
    language: "python",
    source: `from transformers import AutoModelForCausalLM
from peft import LoraConfig, get_peft_model

model = AutoModelForCausalLM.from_pretrained("meta-llama/Llama-2-7b-hf")
config = LoraConfig(
    r=16,
    lora_alpha=32,
    lora_dropout=0.05,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    task_type="CAUSAL_LM",
)
model = get_peft_model(model, config)
model.print_trainable_parameters()`,
    caption: "LoRA com r = 16 e α = 32 nas 7 camadas lineares do Llama 2 7B: cerca de 40 milhões de parâmetros treináveis, 0,59% do modelo.",
  },
  tradeOffs: {
    pros: [
      "Treina menos de 1% dos parâmetros, com muito menos memória de gradiente e otimizador",
      "Adaptadores de megabytes, um por tarefa, sobre a mesma base",
      "Sem custo extra na inferência depois de somar B · A a W",
    ],
    cons: [
      "A base congelada ainda ocupa memória em 16 bits",
      "Pode aprender menos que o ajuste completo em tarefas muito distantes do pré-treino",
      "Um adaptador só serve para a base exata em que foi treinado",
    ],
    alternatives: ["QLoRA, com a base em 4 bits", "Ajuste completo, quando há memória e a tarefa está longe do pré-treino"],
  },
  knowledgeCheck: [
    {
      id: "count-params",
      prompt: "Quantos parâmetros treináveis o LoRA com r = 4 acrescenta a uma matriz de 1024 × 4096?",
      options: ["4.194.304", "20.480", "16.384", "8.192"],
      correct: 1,
      explanation: "r · (d_in + d_out) = 4 × (1024 + 4096) = 20.480, contra 1024 × 4096 = 4.194.304 da matriz inteira.",
      lesson: "11-08",
    },
    {
      id: "b-zero",
      prompt: "Por que o LoRA inicializa B com zeros e A com valores aleatórios?",
      options: [
        "Para economizar memória",
        "Para B · A começar em zero: no passo zero o modelo é idêntico ao original, e o gradiente ainda flui porque A não é zero",
        "Porque matrizes zeradas treinam mais rápido",
        "Para o adaptador ficar menor no disco",
      ],
      correct: 1,
      explanation: "Com B = 0, o desvio começa nulo e o ajuste parte do modelo que já funciona. Se A também fosse zero, o gradiente de B seria zero e nada treinaria.",
      lesson: "11-08",
    },
  ],
  related: ["02-07", "04-04", "11-09"],
  references: [
    { title: "Hu et al. (2021), LoRA: Low-Rank Adaptation of Large Language Models", url: "https://arxiv.org/abs/2106.09685", kind: "paper" },
    { title: "Dettmers et al. (2023), QLoRA: Efficient Finetuning of Quantized LLMs", url: "https://arxiv.org/abs/2305.14314", kind: "paper" },
    { title: "Hugging Face PEFT", url: "https://huggingface.co/docs/peft/index", kind: "docs" },
  ],
};

export default lesson;
