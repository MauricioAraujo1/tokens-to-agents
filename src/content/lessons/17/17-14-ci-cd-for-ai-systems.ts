import type { BlockDiagramSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// CI/CD para sistemas de IA com as contas no arquivo. O eval gate compara a taxa de acerto do candidato com
// a da versão em produção; a margem de 95% da diferença entre duas proporções independentes é
// 1,96 · √(2 · p · (1 − p) / n), e o número de casos para uma margem m é 2 · p · (1 − p) · (1,96 / m)².
// O canary segue estágios de tráfego com a mesma duração; o tráfego, os estágios e os preços são DE EXEMPLO.

const money = (value: number) => `US$ ${Math.round(value).toLocaleString("pt-BR")}`;
const fixed = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const percent = (value: number) => `${Math.round(value * 100)}%`;
const points = (value: number) => `${fixed(value * 100)} pontos`;

// Passo 2: eval gate.
const CASES = 200;
const BASELINE_PASSED = 182;
const CANDIDATE_PASSED = 176;
const TOLERANCE = 0.02;
const Z = 1.96;
const baselineRate = BASELINE_PASSED / CASES;
const candidateRate = CANDIDATE_PASSED / CASES;
const drop = baselineRate - candidateRate;
const margin = Z * Math.sqrt((2 * baselineRate * (1 - baselineRate)) / CASES);
const casesForTolerance = Math.ceil(2 * baselineRate * (1 - baselineRate) * (Z / TOLERANCE) ** 2);

// Passo 4: canary.
const RATE_PER_S = 50;
const STAGE_MINUTES = 30;
const stages = [0.01, 0.05, 0.25, 0.5, 1];
const perStage = stages.map((share) => share * RATE_PER_S * STAGE_MINUTES * 60);
const cumulative = perStage.map((_, index) => perStage.slice(0, index + 1).reduce((sum, value) => sum + value, 0));
const exposureSeries = stages.map((share, index) => ({ label: percent(share), value: Math.round(cumulative[index] / 1000) }));
const bigBang = RATE_PER_S * STAGE_MINUTES * 60;
const CAUGHT_AT = 1;
const exposedIfCaught = cumulative[CAUGHT_AT];
const reduction = bigBang / exposedIfCaught;
const rolloutHours = (stages.length * STAGE_MINUTES) / 60;

// Passo 5: blue-green com GPUs de exemplo.
const GPUS = 8;
const GPU_HOURLY = 4;
const SWITCH_HOURS = 2;
const blueGreenExtra = GPUS * GPU_HOURLY * SWITCH_HOURS;

const pipelineDiagram = (active: string, done?: string[]): BlockDiagramSpec => ({
  id: "cd",
  piece: "block-diagram",
  blocks: [
    { id: "laptop", kind: "laptop", label: "código + prompt", col: 0, row: 0.5 },
    { id: "tests", kind: "tool", label: "testes", col: 1, row: 0 },
    { id: "eval", kind: "eval", label: "eval gate", col: 1, row: 1 },
    { id: "registry", kind: "documents", label: "release versionada", col: 2, row: 0.5 },
    { id: "canary", kind: "server", label: "canary", col: 3, row: 0 },
    { id: "prod", kind: "cloud", label: "produção", col: 3, row: 1 },
  ],
  edges: [
    { from: "laptop", to: "tests" },
    { from: "tests", to: "eval" },
    { from: "eval", to: "registry", label: "aprovado" },
    { from: "registry", to: "canary", label: `${percent(stages[0])}` },
    { from: "canary", to: "prod", label: "métricas ok" },
  ],
  active,
  ...(done ? { done } : {}),
});

const lesson: LessonContent = {
  id: "17-14",
  subtitle: "Levar cada mudança de código, prompt ou modelo até produção com segurança: eval gate, release versionada, canary, blue-green e rollback automático.",
  objectives: [
    "Listar o que muda num sistema de IA e precisa passar pelo pipeline",
    "Montar um eval gate e calcular se o conjunto de casos detecta a regressão",
    "Calcular a exposição de um canary em estágios",
    "Escolher entre canary e blue-green e planejar o rollback",
  ],
  steps: [
    {
      id: "what-changes",
      shortTitle: "O que muda",
      title: "Num app de IA, o prompt também é código",
      tag: "context",
      body: [
        "Num restaurante, mudar o fornecedor do tomate muda o prato tanto quanto mudar a receita. Num sistema de IA, uma release não é só código: é o código, a imagem, a versão do modelo, o prompt, a configuração de busca e o índice. Qualquer um deles muda as respostas, e todos precisam passar pelo mesmo caminho até produção.",
        "A [[integração contínua|continuous-integration]] roda os testes de sempre a cada commit. O [[deploy contínuo|continuous-deployment]] continua o caminho: um [[eval gate|eval-gate]] mede a qualidade das respostas, a release aprovada vira um pacote versionado (imagem, modelo e prompt juntos) e sobe aos poucos para produção, com volta automática se as métricas piorarem.",
      ],
      keyIdea: "Release de IA = código + imagem + modelo + prompt + configuração, versionados e liberados juntos.",
      scene: { kind: "pieces", layout: "single", pieces: [pipelineDiagram("eval")] },
      alt: "Uma mudança de código e prompt passa pelos testes e pelo eval gate, em destaque; aprovada, vira uma release versionada que vai primeiro para o canary e, com métricas boas, para a produção.",
    },
    {
      id: "gate",
      shortTitle: "Eval gate",
      title: "Barrar a regressão, e saber se ela é real",
      tag: "mechanism",
      body: [
        `O gate roda o conjunto de [[eval|eval]] na versão de produção e na candidata. Em ${CASES} casos, a produção acerta ${BASELINE_PASSED} (${fixed(baselineRate * 100)}%) e a candidata ${CANDIDATE_PASSED} (${fixed(candidateRate * 100)}%): queda de ${points(drop)}, acima da tolerância de ${points(TOLERANCE)}. Pela regra simples, o deploy para.`,
        `O detalhe que separa um gate útil de um gate barulhento: com ${CASES} casos, a margem de 95% para a diferença entre as duas taxas é de ±${points(margin)} (um [[intervalo de confiança|confidence-interval]]). A queda de ${points(drop)} cabe no ruído. Para enxergar ${points(TOLERANCE)} com essa confiança, seriam cerca de ${integer(casesForTolerance)} casos. Gates pequenos pegam regressões grandes; para as sutis, aumente o conjunto ou compare as duas versões nos mesmos casos, caso a caso.`,
      ],
      keyIdea: "O eval gate barra regressões, mas só as maiores que a margem de erro do conjunto de casos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "gate",
            piece: "metrics-panel",
            metrics: [
              { id: "baseline", label: "produção", value: `${fixed(baselineRate * 100)}%` },
              { id: "candidate", label: "candidata", value: `${fixed(candidateRate * 100)}%`, color: "danger" },
              { id: "drop", label: "queda", value: points(drop) },
              { id: "margin", label: `margem com ${CASES} casos`, value: `±${points(margin)}`, color: "module-17" },
              { id: "needed", label: `casos para ±${points(TOLERANCE)}`, value: integer(casesForTolerance) },
            ],
            highlight: "margin",
          },
        ],
      },
      alt: `Eval gate: produção com ${fixed(baselineRate * 100)}% e candidata com ${fixed(candidateRate * 100)}%, queda de ${points(drop)}; com ${CASES} casos a margem é ±${points(margin)}, e seriam ${integer(casesForTolerance)} casos para enxergar ${points(TOLERANCE)}.`,
    },
    {
      id: "pipeline",
      shortTitle: "O caminho",
      title: "Do commit à produção, com volta pronta",
      tag: "mechanism",
      body: [
        "O pipeline em ordem: testes rápidos, build da imagem, eval gate, release versionada no registry, deploy do canary, análise das métricas, promoção gradual e, se algo piorar em qualquer ponto, [[rollback|rollback]]. Cada etapa só roda se a anterior passou, e o mesmo artefato testado é o que chega a produção.",
        "O rollback precisa ser chato de tão simples: reaplicar a release anterior, com a mesma tupla de imagem, modelo e prompt. Se o prompt mora num painel editável fora do pipeline, ou o modelo é um alias que o provedor atualiza sozinho, não existe versão anterior para voltar. Por isso tudo o que muda as respostas entra na release e no git.",
      ],
      keyIdea: "Rollback é reaplicar a release anterior: só funciona se modelo e prompt também forem versionados.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "stages",
            piece: "pipeline",
            stages: [
              { id: "test", label: "testes" },
              { id: "build", label: "build da imagem" },
              { id: "eval", label: "eval gate" },
              { id: "release", label: "release" },
              { id: "canary", label: "canary", color: "module-17" },
              { id: "analysis", label: "análise" },
              { id: "promote", label: "promover" },
            ],
            active: "analysis",
            done: ["test", "build", "eval", "release", "canary"],
            branch: { id: "rollback", label: "rollback", from: "analysis", edgeLabel: "métrica piorou", color: "danger" },
          },
        ],
      },
      alt: "Pipeline: testes, build da imagem, eval gate, release, canary, análise (em destaque) e promover. Um ramo tracejado sai da análise para o rollback quando uma métrica piora.",
    },
    {
      id: "canary",
      shortTitle: "Canary",
      title: "Liberar para 1% antes de liberar para todos",
      tag: "example",
      body: [
        `Num [[canary release|canary-release]], a versão nova recebe uma fatia pequena do tráfego e cresce em estágios: ${stages.map(percent).join(", ")}, ${STAGE_MINUTES} minutos cada, num serviço de ${RATE_PER_S} pedidos por segundo. Cada estágio compara erros, latência, tokens por pedido e sinais de qualidade do canary com os da versão antiga, e só avança se não houver piora.`,
        `Se a versão nova tem um problema que a análise pega no fim do estágio de ${percent(stages[CAUGHT_AT])}, ela atendeu ${integer(exposedIfCaught)} pedidos. Um deploy de uma vez para 100% teria exposto ${integer(bigBang)} nos mesmos ${STAGE_MINUTES} minutos: ${fixed(reduction)} vezes mais. O preço é tempo: o rollout completo leva ${fixed(rolloutHours)} horas, e o canary precisa de tráfego suficiente para a comparação significar algo.`,
      ],
      keyIdea: "Canary limita o estrago de uma versão ruim à fatia de tráfego que ela recebeu até ser pega.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "exposure",
            piece: "chart",
            kind: "bar",
            series: exposureSeries,
            highlight: CAUGHT_AT,
            color: "module-17",
          },
        ],
      },
      alt: `Pedidos acumulados atendidos pela versão nova ao fim de cada estágio, em milhares: ${exposureSeries.map((point) => `${point.label} ${point.value} mil`).join(", ")}. Pega no estágio de ${percent(stages[CAUGHT_AT])}, ela atendeu ${integer(exposedIfCaught)} pedidos.`,
    },
    {
      id: "blue-green",
      shortTitle: "Blue-green",
      title: "Dois ambientes e um interruptor",
      tag: "tradeoff",
      body: [
        `No [[blue-green deployment|blue-green-deployment]], a versão nova (green) sobe inteira ao lado da antiga (blue), recebe testes de fumaça e, num clique, o balanceador troca todo o tráfego. O rollback é o mesmo clique ao contrário, em segundos. O custo, com LLM, é dobrar as GPUs durante a troca: ${GPUS} GPUs extras por ${SWITCH_HOURS} horas custam ${money(blueGreenExtra)} a ${money(GPU_HOURLY)} por hora (preço de exemplo), e a cota precisa caber o dobro.`,
        "O canary gasta menos GPU, porque cresce aos poucos, e expõe menos usuários a uma versão ruim, mas demora e exige roteamento por porcentagem. O blue-green troca tudo de uma vez: é ótimo para mudanças que não convivem bem com duas versões ao mesmo tempo, e ruim quando o problema só aparece com tráfego real. Muitos times usam canary para modelos e prompts, e blue-green para mudanças de infraestrutura.",
      ],
      keyIdea: "Blue-green dá rollback instantâneo a custo de GPU em dobro; canary gasta menos e expõe menos, mas demora.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "blue-green",
            piece: "block-diagram",
            blocks: [
              { id: "users", kind: "user", label: "usuários", col: 0, row: 0.5 },
              { id: "lb", kind: "server", label: "balanceador", col: 1, row: 0.5 },
              { id: "blue", kind: "llm", label: "blue: v13", col: 2.5, row: 0 },
              { id: "green", kind: "llm", label: "green: v14", col: 2.5, row: 1 },
            ],
            edges: [
              { from: "users", to: "lb" },
              { from: "lb", to: "green", label: "100% após a troca" },
              { from: "lb", to: "blue", label: "rollback: 1 clique", variant: "alternative" },
            ],
            active: "green",
          },
        ],
      },
      alt: `Usuários chegam ao balanceador, que manda 100% do tráfego para o ambiente green com a versão 14, em destaque; o ambiente blue com a versão 13 continua de pé para um rollback de um clique, ao custo de ${GPUS} GPUs extras durante a troca.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Mudar sempre, com rede de proteção",
      tag: "summary",
      body: [
        "Em sistemas de IA, código, imagem, modelo e prompt formam a release. O pipeline testa, passa pelo eval gate com um conjunto grande o bastante para a regressão que importa, publica a release versionada, sobe em canary ou blue-green e volta sozinho quando o error budget ou a análise acusam piora.",
        "Este módulo levou o modelo do notebook à produção: arquitetura, APIs e modelos próprios, GPUs, containers, Kubernetes, nuvem, IaC, escala, balanceamento, distribuição, monitoração, custo e deploy contínuo. Com essas peças, o projeto final, uma plataforma de IA em produção, é a soma delas.",
      ],
      keyIdea: "CD de IA = release completa versionada + eval gate com poder estatístico + liberação gradual + rollback.",
      scene: { kind: "pieces", layout: "single", pieces: [pipelineDiagram("prod", ["laptop", "tests", "eval", "registry", "canary"])] },
      alt: "O pipeline completo: código e prompt, testes, eval gate, release versionada e canary já percorridos, e a produção em destaque.",
    },
  ],
  realWorldExample:
    "O workbook de SRE do Google dedica um capítulo a canary releases, com a comparação entre o grupo canary e o de controle a cada estágio. O Argo Rollouts, projeto da CNCF, implementa canary e blue-green no Kubernetes, com análise automática de métricas do Prometheus para promover ou reverter a versão.",
  code: {
    language: "python",
    source: `import json
import math
import sys

def pass_rate(path: str) -> tuple[float, int]:
    with open(path, encoding="utf-8") as file:
        results = [json.loads(line) for line in file]
    return sum(result["passed"] for result in results) / len(results), len(results)

baseline, cases = pass_rate("evals/baseline.jsonl")
candidate, _ = pass_rate("evals/candidate.jsonl")
margin = 1.96 * math.sqrt(2 * baseline * (1 - baseline) / cases)
print(f"produção {baseline:.1%}  candidata {candidate:.1%}  margem ±{margin:.1%}")

if candidate < baseline - max(0.02, margin):
    sys.exit("eval gate: regressão acima da tolerância e da margem de erro")`,
    caption: "Um eval gate no CI: compara a candidata com a produção e só barra a queda maior que a tolerância e que a margem de erro do conjunto.",
  },
  tradeOffs: {
    pros: [
      "Eval gate impede que um prompt ou modelo pior chegue a produção",
      "Canary limita o número de usuários expostos a uma versão ruim",
      "Release versionada torna o rollback uma operação de segundos",
    ],
    cons: [
      "Conjuntos de eval pequenos não enxergam regressões sutis",
      "Canary demora horas e precisa de tráfego para a comparação valer",
      "Blue-green dobra as GPUs durante a troca",
    ],
    alternatives: [
      "Shadow deployment: a versão nova recebe uma cópia do tráfego e suas respostas não vão para o usuário",
      "Feature flags por cliente, para liberar a mudança a grupos escolhidos",
    ],
  },
  knowledgeCheck: [
    {
      id: "gate-noise",
      prompt: "Um eval gate com 100 casos barra qualquer queda acima de 1 ponto, e o time reclama que ele bloqueia e libera a mesma versão em execuções seguidas. Por quê?",
      options: [
        "O modelo está quebrado",
        "Com 100 casos, a margem de erro da diferença é de vários pontos: quedas de 1 ponto são ruído",
        "Faltam GPUs no CI",
        "O gate deveria usar a latência",
      ],
      correct: 1,
      explanation: "Com p ≈ 0,9 e 100 casos, a margem de 95% da diferença é 1,96 × √(2 × 0,09 / 100) ≈ 8 pontos. Para enxergar 1 ponto é preciso um conjunto muito maior ou comparar caso a caso.",
      lesson: "17-14",
    },
    {
      id: "canary-exposure",
      prompt: "Um serviço recebe 20 pedidos por segundo. O canary fica em 2% por 1 hora e uma regressão é pega no fim dessa hora. Quantos pedidos a versão nova atendeu?",
      options: ["40", "1.440", "72.000", "720"],
      correct: 1,
      explanation: "20 × 0,02 = 0,4 pedido por segundo × 3.600 s = 1.440 pedidos. Um deploy direto para 100% teria exposto 72.000 na mesma hora.",
      lesson: "17-14",
    },
  ],
  related: ["17-13", "15-10", "16-01"],
  references: [
    { title: "Google SRE Workbook: Canarying Releases", url: "https://sre.google/workbook/canarying-releases/", kind: "article" },
    { title: "Martin Fowler: BlueGreenDeployment", url: "https://martinfowler.com/bliki/BlueGreenDeployment.html", kind: "article" },
    { title: "Argo Rollouts: documentação", url: "https://argoproj.github.io/argo-rollouts/", kind: "docs" },
  ],
};

export default lesson;
