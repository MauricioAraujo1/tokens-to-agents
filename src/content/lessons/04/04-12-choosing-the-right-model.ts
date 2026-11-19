import type { LessonContent } from "../../../types/content";

// Escolher um modelo com contas no arquivo. Os cinco modelos (A a E), os resultados da avaliação e os
// preços são de exemplo, escritos aqui, e não de provedores reais: o que importa é o método. Acurácia,
// custo mensal, corte por orçamento e o custo de uma cascata saem das contas abaixo.

const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const money = (value: number) => `US$ ${integer(value)}`;
const listing = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`);

interface Candidate {
  id: string;
  description: string;
  /** Preços de exemplo, em dólares por milhão de tokens de entrada e de saída. */
  priceIn: number;
  priceOut: number;
  /** 1 = passou no caso de teste, 0 = falhou. */
  results: number[];
}

const cases = ["extrai CPF", "data BR", "valor total", "nota sem CNPJ", "itens em tabela", "foto torta", "dois idiomas", "campo vazio"];
const candidates: Candidate[] = [
  { id: "A", description: "grande, fechado", priceIn: 3, priceOut: 15, results: [1, 1, 1, 1, 1, 1, 1, 1] },
  { id: "B", description: "médio, fechado", priceIn: 1, priceOut: 4, results: [1, 1, 1, 1, 1, 0, 1, 1] },
  { id: "C", description: "aberto, 70B", priceIn: 0.6, priceOut: 0.8, results: [1, 1, 1, 1, 1, 1, 0, 1] },
  { id: "D", description: "aberto, 8B", priceIn: 0.15, priceOut: 0.2, results: [1, 1, 1, 0, 1, 0, 0, 1] },
  { id: "E", description: "pequeno, 3B", priceIn: 0.05, priceOut: 0.1, results: [1, 1, 0, 0, 0, 0, 0, 1] },
];
const passes = (candidate: Candidate) => candidate.results.reduce((sum, value) => sum + value, 0);
const MIN_PASSES = 7;

// Carga de exemplo: pedidos por mês e tokens por pedido.
const REQUESTS = 300_000;
const TOKENS_IN = 1500;
const TOKENS_OUT = 300;
const monthlyCost = (candidate: Candidate) =>
  (REQUESTS * (TOKENS_IN * candidate.priceIn + TOKENS_OUT * candidate.priceOut)) / 1e6;
const BUDGET = 500;

const qualified = candidates.filter((candidate) => passes(candidate) >= MIN_PASSES);
const affordable = qualified.filter((candidate) => monthlyCost(candidate) < BUDGET);
const chosen = affordable.reduce((best, candidate) => (monthlyCost(candidate) < monthlyCost(best) ? candidate : best));
const overBudget = candidates.filter((candidate) => monthlyCost(candidate) >= BUDGET).map((candidate) => candidate.id);

// Cascata: todo pedido vai primeiro ao D; os que falham na validação vão ao modelo escolhido.
const cheap = candidates[3];
const FALLBACK_SHARE = 0.3;
const cascadeCost = monthlyCost(cheap) + FALLBACK_SHARE * monthlyCost(chosen);

const lesson: LessonContent = {
  id: "04-12",
  subtitle: "Um método para escolher o modelo de um produto: restrições primeiro, depois testes com os seus casos, custo para o seu volume e uma revisão periódica.",
  objectives: [
    "Transformar requisitos do produto em restrições que eliminam modelos",
    "Montar uma avaliação pequena com casos do seu domínio e ler o resultado",
    "Calcular o custo mensal de cada candidato para o seu volume",
    "Combinar modelos numa cascata para equilibrar qualidade e custo",
  ],
  steps: [
    {
      id: "hiring",
      shortTitle: "Contratar",
      title: "Escolher um modelo é como contratar",
      tag: "context",
      body: [
        "Ninguém contrata “o melhor profissional do mundo”: contrata quem resolve aquela vaga, com aquele salário, naquela cidade. Com modelos é igual. O modelo do topo de um ranking pode ser lento, caro ou proibido para os seus dados, e um modelo menor pode resolver a sua tarefa melhor.",
        "O método tem quatro passos: listar as restrições que não se negociam, testar os candidatos que sobram com casos reais do seu produto, calcular o custo para o seu volume e escolher o mais barato que passa nos testes. O exemplo da aula extrai dados de notas fiscais, com cinco modelos de exemplo, A a E.",
      ],
      keyIdea: "Não existe o melhor modelo; existe o modelo que passa nos seus testes, dentro das suas restrições, pelo menor custo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "reqs", kind: "documents", label: "requisitos", col: 0, row: 0.5 },
              { id: "cloud", kind: "cloud", label: "apis", col: 1, row: 0 },
              { id: "server", kind: "server", label: "modelos abertos", col: 1, row: 1 },
              { id: "eval", kind: "eval", label: "seus testes", col: 2, row: 0.5 },
              { id: "llm", kind: "llm", label: "escolhido", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "reqs", to: "cloud", label: "filtra" },
              { from: "reqs", to: "server", label: "filtra" },
              { from: "cloud", to: "eval" },
              { from: "server", to: "eval" },
              { from: "eval", to: "llm", label: "passa e cabe" },
            ],
            active: "eval",
          },
        ],
      },
      alt: "Os requisitos filtram candidatos entre APIs e modelos abertos; os que sobram passam pelos seus testes, em destaque, e sai o modelo escolhido.",
    },
    {
      id: "constraints",
      shortTitle: "Restrições",
      title: "Restrições primeiro",
      tag: "mechanism",
      body: [
        "Algumas perguntas eliminam opções antes de qualquer teste. Os dados podem sair da sua rede? Se não, só modelos abertos hospedados por você ou nuvens com contrato. A tarefa tem imagem? Então só modelos multimodais. A resposta precisa sair em menos de um segundo? Modelos muito grandes ficam de fora. A licença permite o seu uso?",
        "Depois vêm requisitos de capacidade: tamanho da [[janela de contexto|context-window]] para os seus documentos, idiomas, saída estruturada em JSON, chamada de ferramentas. Um [[benchmark|benchmark]] público ajuda a montar a lista curta, mas mede tarefas genéricas, não a sua.",
      ],
      keyIdea: "Privacidade, modalidade, latência e licença cortam a lista antes de qualquer teste de qualidade.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "tree",
            piece: "graph",
            nodes: [
              { id: "start", label: "tarefa", x: 0.08, y: 0.5 },
              { id: "privacy", label: "dados podem sair?", x: 0.32, y: 0.5, color: "module-04" },
              { id: "open", label: "só abertos na sua rede", x: 0.62, y: 0.15 },
              { id: "modality", label: "tem imagem?", x: 0.62, y: 0.8 },
              { id: "multimodal", label: "só multimodais", x: 0.92, y: 0.6 },
              { id: "any", label: "qualquer modelo de texto", x: 0.92, y: 0.95 },
            ],
            edges: [
              { from: "start", to: "privacy" },
              { from: "privacy", to: "open", label: "não" },
              { from: "privacy", to: "modality", label: "sim" },
              { from: "modality", to: "multimodal", label: "sim" },
              { from: "modality", to: "any", label: "não" },
            ],
            path: ["start", "privacy", "modality", "multimodal"],
          },
        ],
      },
      alt: "Árvore de decisão: se os dados não podem sair, só modelos abertos na sua rede; se podem e a tarefa tem imagem, só modelos multimodais; sem imagem, qualquer modelo de texto. O caminho com imagem está destacado.",
    },
    {
      id: "eval",
      shortTitle: "Seus testes",
      title: "Testar com os seus casos",
      tag: "mechanism",
      body: [
        `Monte um conjunto de casos reais, com a resposta certa conhecida, incluindo os difíceis: nota sem CNPJ, foto torta, campo vazio. A matriz da cena mostra o resultado dos cinco candidatos em ${cases.length} casos: ${candidates.map((candidate) => `${candidate.id} passou em ${passes(candidate)}`).join(", ")}.`,
        `Com a exigência de passar em pelo menos ${MIN_PASSES} de ${cases.length}, sobram ${listing(qualified.map((candidate) => candidate.id))}. Oito casos é pouco para decidir; na prática, use dezenas a centenas e rode de novo a cada troca de modelo ou de prompt. O conjunto de testes vira um ativo do produto.`,
      ],
      keyIdea: "Benchmarks públicos fazem a lista curta; os seus casos de teste fazem a escolha.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "results",
            piece: "matrix",
            rows: candidates.map((candidate) => `${candidate.id} (${passes(candidate)}/${cases.length})`),
            cols: cases,
            values: candidates.map((candidate) => candidate.results),
            scale: { min: 0, max: 1 },
            highlight: { row: candidates.indexOf(chosen), col: cases.indexOf("dois idiomas") },
            color: "module-04",
          },
        ],
      },
      alt: `Matriz de resultados com ${candidates.length} modelos e ${cases.length} casos de teste: ${candidates.map((candidate) => `${candidate.id} passou em ${passes(candidate)}`).join(", ")}. Com mínimo de ${MIN_PASSES}, sobram ${listing(qualified.map((candidate) => candidate.id))}.`,
    },
    {
      id: "cost",
      shortTitle: "Custo",
      title: "O custo no seu volume",
      tag: "example",
      body: [
        `Com preços de exemplo e uma carga de ${integer(REQUESTS)} pedidos por mês, cada um com ${integer(TOKENS_IN)} tokens de entrada e ${TOKENS_OUT} de saída, o custo mensal é pedidos × (tokens de entrada × preço de entrada + tokens de saída × preço de saída). ${candidates.map((candidate) => `${candidate.id}: ${money(monthlyCost(candidate))}`).join("; ")}.`,
        `Com orçamento de ${money(BUDGET)}, as barras acesas, ${listing(overBudget)}, estouram. Entre os que passaram nos testes, sobra ${chosen.id} (${chosen.description}), por ${money(monthlyCost(chosen))}. Repare que o preço de saída costuma ser maior que o de entrada: respostas longas pesam na conta.`,
      ],
      keyIdea: "Custo mensal = pedidos × (entrada × preço + saída × preço). Escolha o mais barato que passa nos testes.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "budget", label: "orçamento", value: money(BUDGET) },
              { id: "chosen", label: "escolhido", value: `${chosen.id}: ${money(monthlyCost(chosen))}`, color: "module-04" },
              { id: "passes", label: "testes do escolhido", value: `${passes(chosen)}/${cases.length}` },
            ],
            highlight: "chosen",
          },
          {
            id: "cost",
            piece: "chart",
            kind: "bar",
            series: candidates.map((candidate) => ({ label: candidate.id, value: Math.round(monthlyCost(candidate)) })),
            cutoff: { mode: "threshold", value: BUDGET, label: money(BUDGET) },
            highlight: candidates.indexOf(chosen),
            color: "module-04",
          },
        ],
      },
      alt: `Custo mensal de exemplo: ${candidates.map((candidate) => `${candidate.id} ${money(monthlyCost(candidate))}`).join(", ")}. A linha de ${money(BUDGET)} deixa ${listing(overBudget)} acima do orçamento. O escolhido é ${chosen.id}, por ${money(monthlyCost(chosen))}.`,
    },
    {
      id: "cascade",
      shortTitle: "Cascata",
      title: "Dois modelos podem custar menos que um",
      tag: "tradeoff",
      body: [
        `O modelo ${cheap.id} falhou em ${cases.length - passes(cheap)} casos, mas custa ${money(monthlyCost(cheap))}. Numa cascata, todo pedido vai primeiro para ele; uma validação confere a saída (o JSON é válido? o CNPJ tem dígito verificador certo?) e só o que falha vai para ${chosen.id}. Se ${Math.round(FALLBACK_SHARE * 100)}% falharem, o custo fica em ${money(cascadeCost)} por mês, contra ${money(monthlyCost(chosen))}.`,
        "A cascata depende de uma validação confiável: se ela deixa passar um erro do modelo barato, a qualidade cai. Também aumenta a latência dos pedidos que caem no segundo modelo e dá mais trabalho para manter. A taxa de falha real sai dos seus testes, não de suposição.",
      ],
      keyIdea: "Uma cascata usa o modelo barato quando dá e o melhor quando precisa, se você consegue validar a saída.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "budget", label: `só ${chosen.id}`, value: money(monthlyCost(chosen)) },
              { id: "chosen", label: `cascata ${cheap.id} → ${chosen.id}`, value: money(cascadeCost), color: "success" },
              { id: "passes", label: "caem no 2º modelo", value: `${Math.round(FALLBACK_SHARE * 100)}%` },
            ],
            highlight: "chosen",
          },
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "app", kind: "app", label: "app", col: 0, row: 0 },
              { id: "cheap", kind: "llm", label: `modelo ${cheap.id}`, col: 1, row: 0 },
              { id: "check", kind: "guardrail", label: "validação", col: 2, row: 0 },
              { id: "answer", kind: "answer", label: "resposta", col: 3, row: 0 },
              { id: "strong", kind: "llm", label: `modelo ${chosen.id}`, col: 2, row: 1 },
            ],
            edges: [
              { from: "app", to: "cheap" },
              { from: "cheap", to: "check" },
              { from: "check", to: "answer", label: "válida" },
              { from: "check", to: "strong", label: "falhou", variant: "alternative" },
              { from: "strong", to: "answer" },
            ],
            active: "check",
          },
        ],
      },
      alt: `Cascata: o app chama o modelo ${cheap.id}; a validação, em destaque, aprova a resposta ou manda o pedido, pelo caminho tracejado, ao modelo ${chosen.id}. Com ${Math.round(FALLBACK_SHARE * 100)}% de falhas, custa ${money(cascadeCost)} por mês contra ${money(monthlyCost(chosen))}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Um processo, não uma escolha única",
      tag: "summary",
      body: [
        "Restrições cortam a lista, os seus testes medem a qualidade, a conta de custo usa o seu volume, e a decisão fica com o mais barato que passa. Cascatas e roteamento combinam modelos quando um só não fecha a conta.",
        "Modelos novos saem a cada poucos meses e preços mudam: com o conjunto de testes pronto, reavaliar é rodar de novo. A última aula do módulo mostra como as preferências humanas moldam o comportamento desses modelos: RLHF e DPO.",
      ],
      keyIdea: "Restrições → testes próprios → custo no seu volume → escolha → reavaliação periódica.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "method",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "constraints", label: "restrições" },
              { id: "shortlist", label: "lista curta" },
              { id: "tests", label: "seus testes", color: "module-04" },
              { id: "cost", label: "custo no seu volume" },
              { id: "choice", label: "escolha", color: "brand" },
              { id: "review", label: "reavaliar" },
            ],
          },
        ],
      },
      alt: "Fluxo em chips: restrições, lista curta, seus testes, custo no seu volume, escolha e reavaliar.",
    },
  ],
  realWorldExample:
    "Rankings públicos como o Chatbot Arena, que compara modelos por votos de pessoas em respostas lado a lado, e o HELM, que avalia muitos cenários e métricas, ajudam a montar a lista curta. Equipes de produto completam com conjuntos de teste próprios e com ferramentas como o OpenAI Evals ou o promptfoo, que rodam os mesmos casos em vários modelos e comparam acurácia, custo e latência.",
  code: {
    language: "python",
    source: `def monthly_cost(requests, tokens_in, tokens_out, price_in, price_out):
    """Preços em dólares por milhão de tokens."""
    return requests * (tokens_in * price_in + tokens_out * price_out) / 1e6

def pick(candidates, min_passes, budget):
    ok = [c for c in candidates if c["passes"] >= min_passes and c["cost"] < budget]
    return min(ok, key=lambda c: c["cost"]) if ok else None

print(monthly_cost(300_000, 1500, 300, price_in=0.6, price_out=0.8))  # 342.0`,
    caption: "A conta de custo e a regra de escolha da aula: o mais barato entre os que passam nos testes e cabem no orçamento.",
  },
  tradeOffs: {
    pros: [
      "Testes próprios medem o que importa para o seu produto",
      "A conta de custo evita surpresas quando o volume cresce",
      "Cascatas e roteamento reduzem custo sem abrir mão da qualidade nos casos difíceis",
    ],
    cons: [
      "Montar e manter um bom conjunto de testes dá trabalho",
      "Poucos casos de teste dão resultados instáveis",
      "Mais de um modelo em produção aumenta a complexidade de operação",
    ],
    alternatives: ["Começar com o modelo mais capaz e reduzir depois de ter testes", "Ajustar um modelo pequeno para a tarefa quando o volume justificar"],
  },
  knowledgeCheck: [
    {
      id: "leaderboard",
      prompt: "O modelo em primeiro lugar num ranking público falhou em vários casos do seu conjunto de testes. O que fazer?",
      options: [
        "Usá-lo mesmo assim, porque o ranking é mais confiável",
        "Confiar nos seus testes: eles medem a sua tarefa, e o ranking mede tarefas genéricas",
        "Apagar os casos em que ele falhou",
        "Trocar o tokenizador",
      ],
      correct: 1,
      explanation: "Benchmarks públicos servem para a lista curta. A decisão sai dos casos do seu domínio, que são o que o produto vai enfrentar.",
      lesson: "04-12",
    },
    {
      id: "output-heavy",
      prompt: "Um modelo cobra US$ 1 por milhão de tokens de entrada e US$ 4 por milhão de saída. Um pedido usa 1.000 de entrada e 1.000 de saída. Qual parte pesa mais no custo?",
      options: ["A entrada", "A saída, quatro vezes mais que a entrada", "As duas iguais", "Nenhuma, o custo é por pedido"],
      correct: 1,
      explanation: "Com o mesmo número de tokens, a saída custa 4 vezes mais por token. Limitar o tamanho da resposta é uma das alavancas de custo.",
      lesson: "04-12",
    },
  ],
  related: ["04-07", "04-08", "16-03"],
  references: [
    { title: "Liang et al. (2022), Holistic Evaluation of Language Models (HELM)", url: "https://arxiv.org/abs/2211.09110", kind: "paper" },
    { title: "Chiang et al. (2024), Chatbot Arena: An Open Platform for Evaluating LLMs by Human Preference", url: "https://arxiv.org/abs/2403.04132", kind: "paper" },
    { title: "OpenAI Evals", url: "https://github.com/openai/evals", kind: "repo" },
  ],
};

export default lesson;
