import type { LessonContent } from "../../../types/content";

// Um eval de brinquedo, calculado aqui: 10 casos de teste rodados contra 4 versões do prompt de um
// assistente. "1" é caso aprovado, "0" é reprovado. As taxas de aprovação e os casos que uma versão
// quebrou saem das contas abaixo.

const CASES = 10;
const versions = [
  { label: "v1", results: "1010110010" },
  { label: "v2", results: "1110110110" },
  { label: "v3", results: "1011101100" },
  { label: "v4", results: "1111111101" },
];
const passed = (results: string) => [...results].filter((result) => result === "1").length;
const passRates = versions.map((version) => ({ label: version.label, value: passed(version.results) / CASES }));
const bestVersion = passRates.reduce((best, item, index) => (item.value > passRates[best].value ? index : best), 0);

const [, second, third] = versions;
const brokenByThird = [...third.results].filter((result, index) => result === "0" && second.results[index] === "1").length;
const fixedByThird = [...third.results].filter((result, index) => result === "1" && second.results[index] === "0").length;

const percent = (value: number) => `${Math.round(value * 100)}%`;

const lesson: LessonContent = {
  id: "00-07",
  subtitle: "Treinar o modelo ou construir em cima de um modelo pronto: dois ofícios, duas ordens de trabalho e o que cada um mede.",
  objectives: [
    "Diferenciar ML engineering de AI engineering pelo ponto de partida",
    "Listar as etapas de um projeto clássico de machine learning",
    "Medir a qualidade de um sistema com evals a cada mudança",
    "Decidir quando vale treinar ou ajustar um modelo próprio",
  ],
  steps: [
    {
      id: "two-crafts",
      shortTitle: "Dois ofícios",
      title: "Fazer o motor ou fazer o carro",
      tag: "context",
      body: [
        "Uma montadora pode projetar o próprio motor ou comprar um motor pronto e caprichar no carro em volta. A [[ML engineering|ml-engineering]] é o primeiro caminho: coletar dados, treinar e operar um modelo próprio. A [[AI engineering|ai-engineering]] é o segundo: pegar um [[foundation model|foundation-model]] pronto e construir o produto em volta dele.",
        "A diferença muda a ordem do trabalho. Na ML engineering, os dados vêm primeiro, porque sem eles não há modelo. Na AI engineering, o produto vem primeiro: em poucas horas existe um protótipo, e os dados aparecem depois, para avaliar e melhorar.",
      ],
      keyIdea: "ML engineering constrói o modelo; AI engineering constrói com o modelo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "data", kind: "documents", label: "dados", col: 0, row: 0 },
              { id: "train", kind: "eval", label: "treino", col: 1, row: 0 },
              { id: "own", kind: "llm", label: "modelo próprio", col: 2, row: 0 },
              { id: "api", kind: "cloud", label: "modelo pronto", col: 1, row: 1 },
              { id: "context", kind: "context", label: "prompt e contexto", col: 2, row: 1 },
              { id: "product", kind: "app", label: "produto", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "data", to: "train" },
              { from: "train", to: "own" },
              { from: "own", to: "product", label: "ML eng." },
              { from: "api", to: "context" },
              { from: "context", to: "product", label: "AI eng." },
            ],
            active: "product",
          },
        ],
      },
      alt: "Dois caminhos até o mesmo produto: em cima, dados, treino e modelo próprio; embaixo, um modelo pronto com prompt e contexto.",
    },
    {
      id: "ml-lifecycle",
      shortTitle: "ML eng.",
      title: "ML engineering: o modelo é o produto",
      tag: "mechanism",
      body: [
        "Num projeto de ML clássico, como prever atraso de entregas, o trabalho segue uma linha: coletar dados, [[rotular|label]], escolher [[features|feature]], treinar, validar no [[conjunto de teste|test-set]] e colocar em produção. O ciclo de treinar e validar se repete até o modelo ficar bom o suficiente.",
        "Depois do deploy, o mundo muda e o modelo envelhece. Monitorar, retreinar e versionar dados e modelos é o trabalho do [[MLOps|mlops]]. A métrica principal é do modelo: acurácia, erro médio, AUC.",
      ],
      keyIdea: "Na ML engineering, a qualidade nasce dos dados e do treino, e se mede no modelo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "lifecycle",
            piece: "pipeline",
            stages: [
              { id: "collect", label: "coletar" },
              { id: "label", label: "rotular" },
              { id: "features", label: "features" },
              { id: "train", label: "treinar", color: "module-00" },
              { id: "validate", label: "validar" },
              { id: "deploy", label: "deploy" },
              { id: "monitor", label: "monitorar" },
            ],
            active: "train",
            done: ["collect", "label", "features"],
            repeat: { from: "train", to: "validate", label: "× N" },
          },
        ],
      },
      alt: "Pipeline de ML: coletar, rotular, features, treinar em destaque, validar, deploy e monitorar, com treinar e validar dentro de um laço repetido.",
    },
    {
      id: "ai-product",
      shortTitle: "AI eng.",
      title: "AI engineering: o modelo é um componente",
      tag: "mechanism",
      body: [
        "Na AI engineering, o modelo chega pronto por uma API. O trabalho é decidir o que entra nele: as instruções do [[prompt|prompt]], os documentos certos, as ferramentas que ele pode chamar, o formato da saída. Quase toda melhoria acontece no contexto, não nos pesos.",
        "Sem treino, não há acurácia de treino para olhar. A qualidade passa a ser medida com [[evals|eval]]: uma lista de casos reais com o resultado esperado, rodada contra o sistema inteiro a cada mudança de prompt, de modelo ou de busca.",
      ],
      keyIdea: "Na AI engineering, o que você ajusta é o contexto, e o que você mede é o sistema inteiro.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "usuários", col: 0, row: 0.5 },
              { id: "product", kind: "app", label: "produto", col: 1, row: 0.5 },
              { id: "context", kind: "context", label: "prompt e contexto", col: 2, row: 0 },
              { id: "api", kind: "cloud", label: "modelo pronto", col: 3, row: 0 },
              { id: "evals", kind: "eval", label: "evals", col: 2, row: 1 },
            ],
            edges: [
              { from: "user", to: "product" },
              { from: "product", to: "context" },
              { from: "context", to: "api", label: "API" },
              { from: "product", to: "evals", label: "casos reais" },
            ],
            active: "context",
          },
        ],
      },
      alt: "Usuários usam o produto, que monta o prompt e o contexto, em destaque, e chama o modelo pronto por API; casos reais alimentam os evals.",
    },
    {
      id: "evals",
      shortTitle: "Evals",
      title: "Cada mudança passa pelos evals",
      tag: "example",
      body: [
        `Um assistente tem ${CASES} casos de teste. A cena mostra a taxa de aprovação de 4 versões do prompt. A v2 sobe para ${percent(passRates[1].value)}. A v3 corrige ${fixedByThird} casos, mas quebra ${brokenByThird} que já passavam, e cai para ${percent(passRates[2].value)}.`,
        `Sem o eval, a v3 iria para produção porque “parecia melhor” nos exemplos que alguém testou à mão. Com ele, a regressão aparece na hora, e a ${versions[bestVersion].label}, com ${percent(passRates[bestVersion].value)}, é a que sobe. Evals são os testes automatizados da AI engineering.`,
      ],
      keyIdea: "Um prompt melhor num caso pode ser pior em outros. Só um conjunto fixo de casos mostra isso.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "pass-rate",
            piece: "chart",
            kind: "bar",
            series: passRates,
            max: 1,
            cutoff: { mode: "threshold", value: 0.8, label: "meta 80%" },
            highlight: bestVersion,
            color: "module-00",
          },
        ],
      },
      alt: `Barras com a taxa de aprovação de cada versão do prompt; a v3 cai em relação à v2, e a ${versions[bestVersion].label} passa da meta de 80% com ${percent(passRates[bestVersion].value)}.`,
    },
    {
      id: "own-model",
      shortTitle: "Treinar?",
      title: "Quando vale ter um modelo próprio",
      tag: "tradeoff",
      body: [
        "Começar pela API é quase sempre o mais rápido. Vale descer para o modelo próprio quando um motivo concreto aparece: volume tão alto que o custo por chamada pesa, latência que a rede não permite, dados que não podem sair da empresa, ou uma tarefa estreita que um modelo pequeno ajustado resolve tão bem quanto um grande.",
        "Nesse ponto, as duas profissões se encontram: o [[fine-tuning|fine-tuning]] de um modelo aberto usa as ferramentas da ML engineering, como dados rotulados, treino e validação, e os evals que a AI engineering já tinha construído.",
      ],
      keyIdea: "Comece com um modelo pronto; treine o seu só quando custo, latência, privacidade ou qualidade exigirem.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "product", kind: "app", label: "produto", col: 0, row: 0.5 },
              { id: "evals", kind: "eval", label: "evals", col: 1, row: 0.5 },
              { id: "api", kind: "cloud", label: "modelo pronto", col: 2, row: 0 },
              { id: "own", kind: "server", label: "modelo ajustado", col: 2, row: 1 },
              { id: "data", kind: "documents", label: "dados rotulados", col: 3, row: 1 },
            ],
            edges: [
              { from: "product", to: "evals" },
              { from: "evals", to: "api", label: "padrão" },
              { from: "evals", to: "own", label: "custo, latência", variant: "alternative" },
              { from: "data", to: "own", label: "fine-tuning" },
            ],
            active: "evals",
          },
        ],
      },
      alt: "O produto passa pelos evals, em destaque, que levam ao modelo pronto por padrão; o caminho alternativo leva a um modelo ajustado com dados rotulados.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "A escada do AI engineer",
      tag: "summary",
      body: [
        "A ordem prática é uma escada: escreva um bom prompt, traga o contexto certo, meça com evals, e só então considere fine-tuning ou um modelo próprio. Cada degrau custa mais que o anterior, e os evals dizem se o degrau valeu.",
        "As duas carreiras convivem: empresas que treinam modelos precisam de ML engineers; quase todas as outras constroem com modelos prontos. Na próxima aula, você vê quem fornece esses modelos e as ferramentas em volta deles.",
      ],
      keyIdea: "Prompt, contexto, evals, fine-tuning, modelo próprio: suba um degrau só quando o anterior não bastar.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "ladder",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "prompt", label: "prompt" },
              { id: "context", label: "contexto e RAG" },
              { id: "evals", label: "evals", color: "module-00" },
              { id: "finetune", label: "fine-tuning" },
              { id: "own", label: "modelo próprio", color: "brand" },
            ],
          },
        ],
      },
      alt: "Chips em sequência: prompt, contexto e RAG, evals em destaque, fine-tuning e modelo próprio.",
    },
  ],
  realWorldExample:
    "O GitHub Copilot foi lançado sobre o Codex, um modelo da OpenAI descrito no artigo “Evaluating Large Language Models Trained on Code”. O trabalho do produto foi de AI engineering: escolher que código do editor entra no prompt, como mostrar a sugestão e como medir se ela ajuda.",
  code: {
    language: "python",
    source: `cases = [
    {"pergunta": "qual é o prazo de troca?", "deve_conter": "30 dias"},
    {"pergunta": "vocês entregam no domingo?", "deve_conter": "não"},
]

def run_eval(answer):
    passed = sum(case["deve_conter"] in answer(case["pergunta"]) for case in cases)
    return passed / len(cases)

# rode a cada mudança de prompt, modelo ou busca, e compare com a versão anterior
print(run_eval(lambda pergunta: "A troca pode ser feita em até 30 dias."))  # 0.5`,
    caption: "Um eval mínimo: casos fixos, um critério de aprovação e uma taxa que dá para comparar entre versões.",
  },
  tradeOffs: {
    pros: [
      "AI engineering: protótipo em horas, sem coletar dados nem treinar",
      "AI engineering: o produto melhora junto com cada modelo novo do provedor",
      "ML engineering: controle total de custo, latência e dados, com modelos pequenos e especializados",
    ],
    cons: [
      "AI engineering: depende de um provedor, do preço dele e das mudanças de modelo",
      "AI engineering: saídas variáveis exigem evals para saber se algo melhorou",
      "ML engineering: precisa de dados rotulados, infraestrutura de treino e tempo",
    ],
    alternatives: ["Modelos abertos hospedados por você: o fluxo da AI engineering com o controle da ML engineering"],
  },
  knowledgeCheck: [
    {
      id: "first-step",
      prompt: "Uma startup quer um assistente que responde dúvidas sobre os próprios contratos. Não há dados rotulados. Qual é o primeiro passo sensato?",
      options: [
        "Treinar um modelo de linguagem do zero com os contratos",
        "Usar um modelo pronto com os trechos dos contratos no contexto e montar um eval com perguntas reais",
        "Contratar uma equipe para rotular um milhão de exemplos",
        "Esperar ter dados suficientes",
      ],
      correct: 1,
      explanation: "AI engineering começa pelo produto: um modelo pronto mais o contexto certo resolve rápido, e o eval mostra se está bom e onde falha.",
      lesson: "00-07",
    },
    {
      id: "regression",
      prompt: "Um novo prompt resolveu o caso que o cliente reclamou. O que fazer antes de publicar?",
      options: [
        "Publicar, porque o caso foi resolvido",
        "Rodar o eval completo para ver se outros casos pioraram",
        "Treinar o modelo de novo",
        "Aumentar a temperatura",
      ],
      correct: 1,
      explanation: "Mudar o prompt mexe em todos os casos ao mesmo tempo. Só o eval completo mostra se a correção quebrou o que já funcionava.",
      lesson: "00-07",
    },
  ],
  related: ["00-06", "00-08", "01-08"],
  references: [
    { title: "Google: Rules of Machine Learning", url: "https://developers.google.com/machine-learning/guides/rules-of-ml", kind: "article" },
    { title: "Google Cloud: MLOps, continuous delivery and automation pipelines in machine learning", url: "https://cloud.google.com/architecture/mlops-continuous-delivery-and-automation-pipelines-in-machine-learning", kind: "docs" },
    { title: "Evaluating Large Language Models Trained on Code (Codex)", url: "https://arxiv.org/abs/2107.03374", kind: "paper" },
  ],
};

export default lesson;
