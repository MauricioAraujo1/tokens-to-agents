import type { LessonContent } from "../../../types/content";

// LLM e SLM com as contas no arquivo: memória dos pesos em 4 bits (parâmetros × 0,5 byte), custo por token
// de ≈ 2 · N FLOPs e quantas GPUs de 80 GB um modelo de 70B pede em bf16. O tamanho do Phi-3-mini (3,8B)
// e o seu uso num celular são os do relatório técnico (Abdin et al., 2024).

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const GB = 1e9;

const INT4 = 0.5;
const BF16 = 2;
const sizes = [
  { label: "1B", params: 1e9 },
  { label: "3,8B", params: 3.8e9 },
  { label: "8B", params: 8e9 },
  { label: "70B", params: 70e9 },
];
const int4GB = (params: number) => (params * INT4) / GB;
/** Orçamento hipotético de memória livre num celular para o modelo, só para a conta. */
const PHONE_BUDGET_GB = 3;
const fitsPhone = sizes.filter((size) => int4GB(size.params) < PHONE_BUDGET_GB).map((size) => size.label);

const SMALL = 3.8e9;
const LARGE = 70e9;
const flopsPerToken = (params: number) => 2 * params;
const costRatio = flopsPerToken(LARGE) / flopsPerToken(SMALL);
const GPU_GB = 80;
const largeBf16GB = (LARGE * BF16) / GB;
const largeGpus = Math.ceil(largeBf16GB / GPU_GB);
const smallBf16GB = (SMALL * BF16) / GB;

const lesson: LessonContent = {
  id: "04-07",
  subtitle: "Modelos de bilhões de parâmetros na nuvem e modelos pequenos no seu aparelho: o que cada um ganha e perde, e como combinar os dois.",
  objectives: [
    "Diferenciar LLM e SLM pelo tamanho e por onde cada um roda",
    "Calcular se um modelo cabe num aparelho a partir da memória dos pesos",
    "Explicar como a destilação deixa um modelo pequeno mais capaz",
    "Decidir quando um modelo pequeno basta e quando rotear para um grande",
  ],
  steps: [
    {
      id: "where",
      shortTitle: "Onde roda",
      title: "Caminhão ou moto: tamanho é uma escolha",
      tag: "context",
      body: [
        "Um caminhão carrega mais, mas não entra em qualquer rua; uma moto é rápida e barata, mas leva pouco. Um [[LLM|llm]] de dezenas ou centenas de bilhões de parâmetros roda em servidores com várias GPUs e é acessado por API. Um [[SLM|slm]], de alguns bilhões, cabe num notebook ou até num celular.",
        "Não existe um número oficial que separe os dois. Na prática, chamam-se de pequenos os modelos de até uns poucos bilhões de parâmetros, como o Phi-3-mini, com 3,8 bilhões. O que importa é a consequência: onde ele roda, quanto custa cada token e quem fica com os dados.",
      ],
      keyIdea: "LLM e SLM são a mesma tecnologia em tamanhos diferentes; o tamanho decide onde o modelo pode rodar.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "phone", kind: "phone", label: "celular", col: 0, row: 0 },
              { id: "slm", kind: "llm", label: "slm local", col: 1, row: 0 },
              { id: "laptop", kind: "laptop", label: "app web", col: 0, row: 1 },
              { id: "cloud", kind: "cloud", label: "api", col: 1, row: 1 },
              { id: "llm", kind: "llm", label: "llm grande", col: 2, row: 1 },
            ],
            edges: [
              { from: "phone", to: "slm", label: "sem rede" },
              { from: "laptop", to: "cloud", label: "internet" },
              { from: "cloud", to: "llm" },
            ],
            active: "slm",
          },
        ],
      },
      alt: "Em cima, um celular roda um SLM local, em destaque, sem rede. Embaixo, um app web chama pela internet uma API que serve um LLM grande.",
    },
    {
      id: "fits",
      shortTitle: "Onde cabe",
      title: "A conta que decide se cabe no aparelho",
      tag: "mechanism",
      body: [
        `Quantizados em 4 bits, cada peso ocupa meio byte. ${sizes.map((size) => `${size.label}: ${fixed(int4GB(size.params), 1)} GB`).join("; ")}. Supondo ${PHONE_BUDGET_GB} GB livres para o modelo num celular, cabem só ${fitsPhone.join(" e ")}; as barras acesas da cena passam do orçamento.`,
        `Para o Phi-3-mini, a conta dá ${fixed(int4GB(SMALL), 1)} GB; o relatório técnico cita cerca de 1,8 GB em 4 bits e o modelo rodando offline num iPhone 14. Um modelo de 70B, mesmo em 4 bits, pede ${fixed(int4GB(LARGE), 0)} GB: só em servidor.`,
      ],
      keyIdea: "Parâmetros × bytes por peso contra a memória do aparelho: essa conta separa o que roda local do que vai para a nuvem.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "memory",
            piece: "chart",
            kind: "bar",
            series: sizes.map((size) => ({ label: size.label, value: int4GB(size.params) })),
            cutoff: { mode: "threshold", value: PHONE_BUDGET_GB, label: `${PHONE_BUDGET_GB} GB` },
            highlight: 1,
            color: "module-04",
          },
        ],
      },
      alt: `Memória dos pesos em 4 bits: ${sizes.map((size) => `${size.label} ${fixed(int4GB(size.params), 1)} GB`).join(", ")}. Com ${PHONE_BUDGET_GB} GB livres, só ${fitsPhone.join(" e ")} cabem; as barras acima da linha não.`,
    },
    {
      id: "distillation",
      shortTitle: "Destilação",
      title: "Como um modelo pequeno fica bom",
      tag: "mechanism",
      body: [
        "Um modelo pequeno treinado do mesmo jeito que um grande, com o mesmo texto da web, sabe menos: tem menos parâmetros para guardar padrões. Duas técnicas diminuem essa distância. A primeira é dado melhor: a equipe do Phi treinou com texto filtrado e dados sintéticos com cara de livro didático.",
        "A segunda é a [[destilação|knowledge-distillation]]: um modelo grande, o professor, gera respostas ou distribuições de probabilidade, e o pequeno, o aluno, aprende a imitá-las. A distribuição do professor carrega mais informação que o token certo: diz também quais erros são “quase certos”.",
      ],
      keyIdea: "Um SLM bom é, muitas vezes, um aluno: aprendeu com dados selecionados e com as saídas de um modelo maior.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "teacher", kind: "llm", label: "professor 70B", col: 0, row: 0.5 },
              { id: "outputs", kind: "documents", label: "respostas", col: 1, row: 0.5 },
              { id: "student", kind: "llm", label: "aluno 3B", col: 2, row: 0.5 },
              { id: "eval", kind: "eval", label: "avaliação", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "teacher", to: "outputs", label: "gera" },
              { from: "outputs", to: "student", label: "imita" },
              { from: "student", to: "eval" },
            ],
            active: "student",
            done: ["teacher", "outputs"],
          },
        ],
      },
      alt: "Um modelo professor de 70B gera respostas; um modelo aluno de 3B, em destaque, aprende a imitá-las e passa por avaliação.",
    },
    {
      id: "cost",
      shortTitle: "Custo",
      title: "Quanto custa cada token",
      tag: "example",
      body: [
        `Cada token custa cerca de 2 FLOPs por parâmetro. Um modelo de 70B faz ${fixed(costRatio, 1)} vezes mais contas por token que um de 3,8B. Em bf16, o de 70B pede ${fixed(largeBf16GB, 0)} GB só de pesos, ${largeGpus} GPUs de ${GPU_GB} GB; o de 3,8B pede ${fixed(smallBf16GB, 1)} GB e cabe numa GPU de consumo.`,
        "Esse custo aparece em três lugares: no preço por milhão de tokens das APIs, que costuma crescer com o tamanho do modelo; na latência, porque cada token passa por mais pesos; e na sua conta de hardware, se você hospeda. Para uma tarefa simples e repetida milhões de vezes, a diferença decide o projeto.",
      ],
      keyIdea: "Quem roda milhões de chamadas paga pelo tamanho do modelo em cada token.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "cost",
            piece: "metrics-panel",
            metrics: [
              { id: "ratio", label: "contas por token, 70B ÷ 3,8B", value: `${fixed(costRatio, 1)}×`, color: "module-04" },
              { id: "large", label: "pesos 70B em bf16", value: `${fixed(largeBf16GB, 0)} GB` },
              { id: "gpus", label: `GPUs de ${GPU_GB} GB`, value: String(largeGpus) },
              { id: "small", label: "pesos 3,8B em bf16", value: `${fixed(smallBf16GB, 1)} GB` },
            ],
            highlight: "ratio",
          },
        ],
      },
      alt: `Um modelo de 70B faz ${fixed(costRatio, 1)} vezes mais contas por token que um de 3,8B; em bf16, pede ${fixed(largeBf16GB, 0)} GB e ${largeGpus} GPUs de ${GPU_GB} GB, contra ${fixed(smallBf16GB, 1)} GB do pequeno.`,
    },
    {
      id: "routing",
      shortTitle: "Decidir",
      title: "Pequeno quando dá, grande quando precisa",
      tag: "tradeoff",
      body: [
        "Modelos pequenos vão bem em tarefas estreitas e bem definidas: classificar, extrair campos, resumir textos curtos, completar código local. Perdem para os grandes em raciocínio de vários passos, conhecimento amplo e instruções longas e ambíguas.",
        "Por isso muitos sistemas combinam os dois com [[roteamento de modelos|model-routing]]: o pedido passa primeiro por uma regra ou por um classificador; o que é simples vai para o modelo pequeno, o que é difícil vai para o grande. A escolha certa sai de testes com as suas tarefas, não do tamanho no nome.",
      ],
      keyIdea: "Use o menor modelo que resolve a tarefa com a qualidade que você mediu.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "router",
            piece: "graph",
            nodes: [
              { id: "request", label: "pedido", x: 0.1, y: 0.5 },
              { id: "router", label: "roteador", x: 0.4, y: 0.5, color: "module-04" },
              { id: "slm", label: "SLM: classificar, extrair", x: 0.8, y: 0.2 },
              { id: "llm", label: "LLM: raciocinar, planejar", x: 0.8, y: 0.8 },
            ],
            edges: [
              { from: "request", to: "router" },
              { from: "router", to: "slm", label: "simples" },
              { from: "router", to: "llm", label: "difícil" },
            ],
            path: ["request", "router", "slm"],
            highlight: ["router"],
          },
        ],
      },
      alt: "Um pedido chega ao roteador, em destaque, que manda tarefas simples (classificar, extrair) para o SLM e tarefas difíceis (raciocinar, planejar) para o LLM. O caminho do pedido simples está destacado.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Os dois no mesmo produto",
      tag: "summary",
      body: [
        "LLMs trazem conhecimento amplo e raciocínio melhor, com custo, latência e dependência de servidor. SLMs trazem custo baixo, resposta rápida, privacidade e funcionamento offline, com menos capacidade. A conta de memória diz onde cada um cabe; os testes dizem qual resolve.",
        "Um desenho comum é o da cena: o app tenta o modelo local e só chama a API quando precisa. A próxima aula olha para outra escolha: modelos com pesos abertos ou fechados atrás de uma API.",
      ],
      keyIdea: "Tamanho é um trade-off de capacidade contra custo, latência e privacidade.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "phone", kind: "phone", label: "app", col: 0, row: 0.5 },
              { id: "slm", kind: "llm", label: "slm local", col: 1, row: 0 },
              { id: "answer", kind: "answer", label: "resposta", col: 2, row: 0 },
              { id: "cloud", kind: "cloud", label: "llm na api", col: 1, row: 1 },
            ],
            edges: [
              { from: "phone", to: "slm", label: "primeiro" },
              { from: "slm", to: "answer" },
              { from: "phone", to: "cloud", label: "se precisar", variant: "alternative" },
              { from: "cloud", to: "answer" },
            ],
            active: "slm",
          },
        ],
      },
      alt: "O app tenta primeiro o SLM local, em destaque, que gera a resposta; pelo caminho tracejado, chama o LLM na API quando precisa.",
    },
  ],
  realWorldExample:
    "O relatório técnico do Phi-3 mostra o Phi-3-mini, de 3,8 bilhões de parâmetros, quantizado em 4 bits e rodando offline num iPhone 14. No outro extremo, modelos de dezenas ou centenas de bilhões de parâmetros são servidos por API em servidores com várias GPUs. Muitos produtos usam os dois: o modelo pequeno no aparelho para tarefas rápidas e privadas, e a API para o que exige mais.",
  code: {
    language: "python",
    source: `def weights_gb(params: float, bits: int) -> float:
    return params * bits / 8 / 1e9

for name, params in [("3.8B", 3.8e9), ("8B", 8e9), ("70B", 70e9)]:
    print(name, round(weights_gb(params, 16), 1), "GB em bf16,",
          round(weights_gb(params, 4), 1), "GB em 4 bits")`,
    caption: "A conta de memória dos pesos, em bf16 e em 4 bits, para decidir onde cada modelo cabe.",
  },
  tradeOffs: {
    pros: [
      "SLMs rodam no aparelho: sem rede, com dados privados e latência baixa",
      "SLMs custam muito menos por token e escalam para volumes altos",
      "LLMs resolvem tarefas abertas, longas e de vários passos com mais qualidade",
    ],
    cons: [
      "SLMs erram mais em raciocínio complexo e conhecimento amplo",
      "LLMs custam mais por token, dependem de servidor e de rede",
      "Rotear entre os dois exige avaliar e manter mais de um modelo",
    ],
    alternatives: ["Ajustar um SLM com LoRA para uma tarefa específica", "Quantizar um modelo médio para caber no hardware disponível"],
  },
  knowledgeCheck: [
    {
      id: "offline-app",
      prompt: "Um app de anotações médicas precisa resumir textos curtos sem mandar dados para fora do aparelho. Qual opção encaixa melhor?",
      options: [
        "Um LLM de 70B por API",
        "Um SLM de poucos bilhões de parâmetros, quantizado e rodando no aparelho",
        "Qualquer modelo, desde que a temperatura seja 0",
        "Um modelo de 70B rodando no celular em bf16",
      ],
      correct: 1,
      explanation: "A exigência de privacidade e de rodar local pede um modelo que caiba no aparelho. Resumir textos curtos é uma tarefa estreita, boa para um SLM.",
      lesson: "04-07",
    },
    {
      id: "distill",
      prompt: "Na destilação, por que o aluno aprende mais com as probabilidades do professor do que só com o token certo?",
      options: [
        "Porque as probabilidades ocupam menos memória",
        "Porque elas mostram também quais alternativas são quase certas, uma informação que o token sozinho não dá",
        "Porque o professor nunca erra",
        "Porque o aluno passa a ter os mesmos parâmetros do professor",
      ],
      correct: 1,
      explanation: "A distribuição do professor diz quanto cada alternativa é plausível. Isso dá ao aluno mais sinal por exemplo do que um único rótulo.",
      lesson: "04-07",
    },
  ],
  related: ["04-04", "04-12", "10-15"],
  references: [
    { title: "Abdin et al. (2024), Phi-3 Technical Report: A Highly Capable Language Model Locally on Your Phone", url: "https://arxiv.org/abs/2404.14219", kind: "paper" },
    { title: "Hinton, Vinyals & Dean (2015), Distilling the Knowledge in a Neural Network", url: "https://arxiv.org/abs/1503.02531", kind: "paper" },
    { title: "Sanh et al. (2019), DistilBERT, a distilled version of BERT", url: "https://arxiv.org/abs/1910.01108", kind: "paper" },
  ],
};

export default lesson;
