import { softmax } from "../../../lab/attention";
import type { LessonContent } from "../../../types/content";

// Compressão de modelos com as contas no arquivo: uma matriz de pesos 4 × 4 podada de três jeitos
// (os 50% menores do total, o padrão 2:4 em cada grupo de 4 e a remoção da linha de menor norma), com o
// erro relativo da saída para uma entrada fixa; os soft targets de um professor com temperatura 1 e 3
// (softmax dos logits / T, de Hinton et al.); e o tamanho de um professor de 13B destilado para 7B e
// quantizado em int4 com escalas por grupo de 128.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).replace("-", "−");
const percent = (value: number) => `${Math.round(value * 100)}%`;

type Matrix = number[][];

const W: Matrix = [
  [0.8, -0.1, 0.05, 0.6],
  [-0.2, 0.9, -0.7, 0.55],
  [0.03, 0.4, 0.5, -0.9],
  [0.35, 0.02, -0.3, 0.15],
];
const x = [1, 0.5, -0.5, 1];
const SIZE = W.length;
const multiply = (matrix: Matrix, vector: number[]) => matrix.map((row) => row.reduce((sum, weight, col) => sum + weight * vector[col], 0));
const norm = (vector: number[]) => Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
const y = multiply(W, x);
const relativeError = (pruned: Matrix) => norm(multiply(pruned, x).map((value, index) => value - y[index])) / norm(y);
const zeros = (matrix: Matrix) => matrix.flat().filter((weight) => weight === 0).length;
const round2 = (matrix: Matrix) => matrix.map((row) => row.map((value) => Number(value.toFixed(2))));

// Passo 2: poda por magnitude sem estrutura: zera os 50% menores |w| da matriz inteira.
const SPARSITY = 0.5;
const ranked = W.flat()
  .map((weight, index) => ({ index, size: Math.abs(weight) }))
  .sort((a, b) => a.size - b.size);
const prunedIndexes = new Set(ranked.slice(0, Math.round(SIZE * SIZE * SPARSITY)).map((item) => item.index));
const unstructured = W.map((row, r) => row.map((weight, c) => (prunedIndexes.has(r * SIZE + c) ? 0 : weight)));
const keptPerRow = unstructured.map((row) => row.filter((weight) => weight !== 0).length);
const unstructuredError = relativeError(unstructured);

// Passo 3: 2:4, em cada grupo de 4 pesos seguidos ficam os 2 maiores.
const twoFour = W.map((row) => {
  const keep = new Set(
    row
      .map((weight, col) => ({ col, size: Math.abs(weight) }))
      .sort((a, b) => b.size - a.size)
      .slice(0, 2)
      .map((item) => item.col),
  );
  return row.map((weight, col) => (keep.has(col) ? weight : 0));
});
const twoFourError = relativeError(twoFour);

// Poda estruturada: remove o neurônio de saída (linha) de menor norma; a matriz fica 3 × 4 de verdade.
const rowNorms = W.map(norm);
const weakestRow = rowNorms.indexOf(Math.min(...rowNorms));
const structured = W.map((row, r) => (r === weakestRow ? row.map(() => 0) : row));
const structuredError = relativeError(structured);

// Passo 4: soft targets de um professor para o próximo token de “A capital da França é”.
const candidates = ["Paris", "Lyon", "França", "Roma", "banana"];
const teacherLogits = [6, 3.5, 3, 2, -1];
const T_HOT = 1;
const T_SOFT = 3;
const withTemperature = (temperature: number) => softmax(teacherLogits.map((logit) => logit / temperature));
const hard = withTemperature(T_HOT);
const soft = withTemperature(T_SOFT);
const LYON = 1;
const BANANA = 4;

// Passo 5: tamanhos dos pesos. Int4 por grupo de 128 com escala de 16 bits: 4 + 16 / 128 bits por peso.
const GB = 1e9;
const INT4_BITS = 4 + 16 / 128;
const sizes = [
  { label: "professor 13B fp16", gb: (13e9 * 16) / 8 / GB },
  { label: "aluno 7B fp16", gb: (7e9 * 16) / 8 / GB },
  { label: "aluno 7B int4", gb: (7e9 * INT4_BITS) / 8 / GB },
];
const ratio = sizes[0].gb / sizes[2].gb;

const H100_DENSE_TFLOPS = 989;
const H100_SPARSE_TFLOPS = 1979;

const lesson: LessonContent = {
  id: "10-10",
  subtitle: "Poda, esparsidade 2:4 e destilação: as técnicas que, junto com a quantização, deixam um modelo menor e mais barato de servir.",
  objectives: [
    "Aplicar a poda por magnitude e medir o erro que ela causa na saída",
    "Explicar por que a esparsidade 2:4 e a poda estruturada aceleram e a poda solta não",
    "Calcular os soft targets de um professor com temperatura",
    "Combinar destilação, poda e quantização e estimar o tamanho final",
  ],
  steps: [
    {
      id: "three",
      shortTitle: "Três técnicas",
      title: "Três jeitos de encolher um modelo",
      tag: "context",
      body: [
        "Para levar uma enciclopédia numa viagem, dá para escrever um resumo (destilar), arrancar as páginas que ninguém lê (podar) ou imprimir com letra menor (quantizar). As três coisas se somam, e cada uma perde um pouco de informação de um jeito diferente.",
        "[[Model compression|model-compression]] é o nome desse conjunto. A [[quantização|quantization]] da aula anterior reduz os bits de cada peso. A [[poda|pruning]] zera ou remove pesos. A [[destilação|knowledge-distillation]] treina um modelo menor, o aluno, para imitar um maior, o professor.",
      ],
      keyIdea: "Destilar, podar e quantizar atacam partes diferentes do tamanho e se combinam.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "teacher", kind: "llm", label: "professor 13b", col: 0, row: 0 },
              { id: "student", kind: "llm", label: "aluno 7b", col: 1, row: 0 },
              { id: "prune", kind: "tool", label: "poda 2:4", col: 2, row: 0 },
              { id: "quant", kind: "memory", label: "int4", col: 2, row: 1 },
              { id: "device", kind: "laptop", label: "gpu de consumo", col: 3, row: 1 },
            ],
            edges: [
              { from: "teacher", to: "student", label: "destilação" },
              { from: "student", to: "prune" },
              { from: "prune", to: "quant", label: "quantização" },
              { from: "quant", to: "device" },
            ],
            active: "student",
          },
        ],
      },
      alt: "Um professor de 13B ensina um aluno de 7B, em destaque, por destilação; o aluno passa pela poda 2:4 e pela quantização em int4 e roda numa GPU de consumo.",
    },
    {
      id: "magnitude",
      shortTitle: "Poda",
      title: "Zerar os pesos pequenos",
      tag: "mechanism",
      body: [
        `A poda mais simples é por magnitude: pesos perto de zero contribuem pouco para a saída, então viram zero. Na matriz 4 × 4 da cena, zerar os ${percent(SPARSITY)} menores em valor absoluto deixa ${zeros(unstructured)} zeros, e a saída para a entrada x = [${x.map((value) => fixed(value, 1)).join("; ")}] muda ${percent(unstructuredError)} (erro relativo da norma).`,
        `O problema é onde os zeros caem: as linhas ficaram com ${keptPerRow.join(", ")} pesos, e o neurônio n${keptPerRow.indexOf(0) + 1} sumiu inteiro. Uma GPU multiplica a matriz densa do mesmo jeito, com ou sem zeros, então essa poda solta economiza memória só com formatos esparsos e quase nunca acelera. Para virar velocidade, os zeros precisam de um padrão que o hardware saiba pular.`,
      ],
      keyIdea: "Poda sem estrutura zera pesos, mas a GPU continua multiplicando os zeros.",
      scene: {
        kind: "pieces",
        layout: "row",
        pieces: [
          { id: "original", piece: "matrix", rows: ["n1", "n2", "n3", "n4"], cols: ["x1", "x2", "x3", "x4"], values: round2(W), showValues: true, color: "module-10" },
          { id: "weights", piece: "matrix", rows: ["n1", "n2", "n3", "n4"], cols: ["x1", "x2", "x3", "x4"], values: round2(unstructured), showValues: true, color: "module-10" },
        ],
      },
      alt: `À esquerda, a matriz de pesos original; à direita, a mesma matriz com os ${percent(SPARSITY)} menores pesos zerados. As linhas ficam com ${keptPerRow.join(", ")} pesos, e a saída muda ${percent(unstructuredError)}.`,
    },
    {
      id: "two-four",
      shortTitle: "2:4",
      title: "Um padrão que a GPU sabe pular",
      tag: "mechanism",
      body: [
        `Na [[esparsidade 2:4|semi-structured-sparsity]], cada grupo de 4 pesos seguidos mantém os 2 maiores. É a mesma fração de zeros, mas sempre no mesmo padrão. As [[tensor cores|tensor-core]] das GPUs NVIDIA desde a Ampere guardam só os 2 valores e um índice e pulam o resto: na H100, o datasheet lista ${H100_SPARSE_TFLOPS.toLocaleString("pt-BR")} TFLOPS em BF16 com esparsidade, contra ${H100_DENSE_TFLOPS} sem. Aqui, a saída muda ${percent(twoFourError)}, menos que na poda solta (${percent(unstructuredError)}): lá, o neurônio n${keptPerRow.indexOf(0) + 1} perdeu todos os pesos, e o 2:4 obriga cada linha a manter os seus 2 maiores.`,
        `A [[poda estruturada|structured-pruning]] vai além: remove linhas, cabeças de attention ou camadas inteiras, e a matriz encolhe de verdade em qualquer hardware. Tirar o neurônio n${weakestRow + 1}, o de menor norma, muda a saída ${percent(structuredError)}. Neste exemplo pequeno, a poda solta teve o azar de apagar um neurônio inteiro; em modelos reais, na mesma esparsidade, padrões mais rígidos costumam custar mais qualidade. Por isso a poda costuma vir com um treino curto de recuperação.`,
      ],
      keyIdea: "Estrutura nos zeros vira velocidade: 2:4 nas tensor cores, linhas removidas em qualquer GPU.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "errors",
            piece: "metrics-panel",
            metrics: [
              { id: "loose", label: "poda solta 50%", value: `erro ${percent(unstructuredError)}` },
              { id: "twofour", label: "esparsidade 2:4", value: `erro ${percent(twoFourError)}`, color: "success" },
              { id: "row", label: `remover n${weakestRow + 1}`, value: `erro ${percent(structuredError)}`, color: "danger" },
            ],
            highlight: "twofour",
          },
          { id: "weights", piece: "matrix", rows: ["n1", "n2", "n3", "n4"], cols: ["x1", "x2", "x3", "x4"], values: round2(twoFour), showValues: true, color: "module-10" },
        ],
      },
      alt: `A matriz com o padrão 2:4: cada linha guarda os 2 maiores pesos de 4. Erro na saída: ${percent(unstructuredError)} na poda solta, ${percent(twoFourError)} no 2:4 e ${percent(structuredError)} removendo o neurônio n${weakestRow + 1}.`,
    },
    {
      id: "distill",
      shortTitle: "Destilar",
      title: "O aluno aprende com as dúvidas do professor",
      tag: "example",
      body: [
        `Para “A capital da França é”, o rótulo do texto diz só “Paris”. O professor diz mais: com temperatura ${T_HOT}, dá ${percent(hard[0])} a Paris, ${percent(hard[LYON])} a Lyon e ${fixed(hard[BANANA] * 100, 2)}% a banana. Isso ensina que Lyon é um erro razoável e banana não, uma informação que o rótulo não tem.`,
        `Na [[destilação|knowledge-distillation]] de Hinton et al., os [[logits|logit]] do professor são divididos por uma [[temperatura|temperature]] maior que 1 antes do [[softmax|softmax]], para essas diferenças aparecerem. Com T = ${T_SOFT}, Paris cai para ${percent(soft[0])} e Lyon sobe para ${percent(soft[LYON])}, como na cena. O aluno treina para reproduzir essa distribuição. Foi assim que o DistilBERT ficou 40% menor e 60% mais rápido que o BERT, mantendo 97% da compreensão de linguagem, segundo o paper.`,
      ],
      keyIdea: "Soft targets ensinam o que o professor acha quase certo, não só a resposta certa.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "soft",
            piece: "chart",
            kind: "bar",
            series: candidates.map((label, index) => ({ label, value: Number(soft[index].toFixed(3)) })),
            max: 1,
            highlight: LYON,
            color: "module-10",
          },
        ],
      },
      alt: `Probabilidades do professor com temperatura ${T_SOFT}: ${candidates.map((label, index) => `${label} ${percent(soft[index])}`).join(", ")}. Lyon, em destaque, aparece como um erro razoável.`,
    },
    {
      id: "stack",
      shortTitle: "Combinar",
      title: "Somando as técnicas",
      tag: "tradeoff",
      body: [
        `As técnicas se somam. Um professor de 13B em fp16 ocupa ${fixed(sizes[0].gb, 0)} GB. Destilado para 7B, ${fixed(sizes[1].gb, 0)} GB. Quantizado em int4 com escalas por grupo, ${fixed(sizes[2].gb, 1)} GB: ${fixed(ratio, 1)} vezes menos, pequeno o bastante para uma GPU de consumo.`,
        "Cada passo cobra um preço diferente. A destilação exige um treino de verdade, com GPU e dados, e o aluno raramente alcança o professor nas tarefas difíceis. A poda pede um treino de recuperação; o SparseGPT mostrou que modelos de 175B podem chegar a 50% de esparsidade numa passada, sem retreino, com pouca perda. A quantização é a mais barata de aplicar. Em todos os casos, a decisão vem da sua avaliação, não da taxa de compressão.",
      ],
      keyIdea: "Comprimir é empilhar perdas pequenas; meça a qualidade a cada degrau.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "teacher", kind: "llm", label: `professor ${fixed(sizes[0].gb, 0)} gb`, col: 0, row: 0 },
              { id: "student", kind: "llm", label: `aluno ${fixed(sizes[1].gb, 0)} gb`, col: 1, row: 0 },
              { id: "prune", kind: "tool", label: "poda 2:4", col: 2, row: 0 },
              { id: "quant", kind: "memory", label: `int4 ${fixed(sizes[2].gb, 1)} gb`, col: 2, row: 1 },
              { id: "device", kind: "laptop", label: "gpu de consumo", col: 3, row: 1 },
              { id: "eval", kind: "eval", label: "avaliação", col: 1, row: 1 },
            ],
            edges: [
              { from: "teacher", to: "student", label: "destilação" },
              { from: "student", to: "prune" },
              { from: "prune", to: "quant", label: "quantização" },
              { from: "quant", to: "device" },
              { from: "quant", to: "eval", label: "medir", variant: "alternative" },
            ],
            active: "device",
            done: ["teacher", "student", "prune", "quant"],
          },
        ],
      },
      alt: `De ${fixed(sizes[0].gb, 0)} GB no professor para ${fixed(sizes[1].gb, 0)} GB no aluno e ${fixed(sizes[2].gb, 1)} GB em int4, que roda numa GPU de consumo, em destaque; um caminho tracejado leva o modelo comprimido para a avaliação.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Menor por três caminhos",
      tag: "summary",
      body: [
        "Destilação treina um modelo menor com os soft targets de um maior. Poda zera pesos: solta, economiza pouco; em 2:4, usa as tensor cores esparsas; estruturada, encolhe as matrizes. Quantização reduz os bits de cada peso. Juntas, levam um modelo de dezenas de GB para poucos GB, e cada degrau precisa de avaliação.",
        "Um modelo menor deixa mais memória livre na GPU. A próxima aula mostra como os motores de inferência gastam essa memória: o orçamento da GPU, o KV cache em páginas e o que fazer quando ela acaba.",
      ],
      keyIdea: "Compressão boa é a que encolhe o modelo sem mudar o resultado da sua avaliação.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "sizes",
            piece: "chart",
            kind: "bar",
            series: sizes.map((size) => ({ label: size.label, value: Number(size.gb.toFixed(1)) })),
            highlight: sizes.length - 1,
            color: "module-10",
          },
        ],
      },
      alt: `Tamanho dos pesos: ${sizes.map((size) => `${size.label} ${fixed(size.gb, 1)} GB`).join(", ")}.`,
    },
  ],
  realWorldExample:
    "O DistilBERT, da Hugging Face, foi treinado por destilação a partir do BERT e, segundo o paper, ficou 40% menor e 60% mais rápido mantendo 97% da compreensão de linguagem. Do lado da poda, o SparseGPT podou modelos das famílias OPT e BLOOM, com até 176 bilhões de parâmetros, para 50% de esparsidade numa única passada, sem retreino, com pouca perda de perplexidade.",
  code: {
    language: "python",
    source: `import numpy as np

W = np.array([[0.8, -0.1, 0.05, 0.6],
              [-0.2, 0.9, -0.7, 0.55],
              [0.03, 0.4, 0.5, -0.9],
              [0.35, 0.02, -0.3, 0.15]])

# 2:4: em cada grupo de 4 pesos, zera os 2 menores em valor absoluto
groups = W.reshape(-1, 4)
smallest = np.argsort(np.abs(groups), axis=1)[:, :2]
np.put_along_axis(groups, smallest, 0.0, axis=1)
print(groups.reshape(W.shape))`,
    caption: "O padrão 2:4 da cena: em cada grupo de 4 pesos seguidos, ficam os 2 maiores.",
  },
  tradeOffs: {
    pros: [
      "Destilação entrega um modelo menor que imita o maior nas tarefas que importam",
      "Esparsidade 2:4 e poda estruturada aceleram de verdade em hardware que as suporta",
      "As técnicas se somam à quantização e multiplicam a economia",
    ],
    cons: [
      "Destilar exige treino, dados e GPU; o aluno perde nas tarefas mais difíceis",
      "Poda solta raramente acelera, e a estruturada pede treino de recuperação",
      "Cada degrau de compressão precisa de uma avaliação nova",
    ],
    alternatives: ["Só quantizar, quando a memória é o único problema", "Usar um modelo pequeno já treinado (SLM) em vez de comprimir um grande"],
  },
  knowledgeCheck: [
    {
      id: "loose-no-speedup",
      prompt: "Um time podou 60% dos pesos de um modelo, zerando os menores em qualquer posição, e o decode na GPU não ficou mais rápido. Por quê?",
      options: [
        "Porque a poda não muda nenhum peso",
        "Porque a GPU multiplica a matriz densa do mesmo jeito; zeros espalhados sem padrão não são pulados",
        "Porque faltou aumentar a temperatura",
        "Porque o KV cache ficou maior",
      ],
      correct: 1,
      explanation: "Sem estrutura, os zeros continuam na matriz densa. Para acelerar, é preciso um padrão suportado pelo hardware (como 2:4) ou poda estruturada, que remove linhas, cabeças ou camadas.",
      lesson: "10-10",
    },
    {
      id: "soft-targets",
      prompt: "Na destilação, por que usar uma temperatura maior que 1 nas probabilidades do professor?",
      options: [
        "Para o aluno gerar textos mais criativos",
        "Para espalhar a distribuição e mostrar ao aluno quais respostas erradas são quase certas",
        "Para o treino usar menos memória",
        "Para o professor ficar mais preciso",
      ],
      correct: 1,
      explanation: "Com T > 1, as probabilidades pequenas crescem e o aluno aprende a estrutura das alternativas (Lyon é razoável, banana não), informação que o rótulo único não tem.",
      lesson: "10-10",
    },
  ],
  related: ["10-09", "10-11", "04-07"],
  references: [
    { title: "Hinton, Vinyals e Dean (2015), Distilling the Knowledge in a Neural Network", url: "https://arxiv.org/abs/1503.02531", kind: "paper" },
    { title: "Sanh et al. (2019), DistilBERT, a distilled version of BERT", url: "https://arxiv.org/abs/1910.01108", kind: "paper" },
    { title: "Frantar e Alistarh (2023), SparseGPT: Massive Language Models Can Be Accurately Pruned in One-Shot", url: "https://arxiv.org/abs/2301.00774", kind: "paper" },
  ],
};

export default lesson;
