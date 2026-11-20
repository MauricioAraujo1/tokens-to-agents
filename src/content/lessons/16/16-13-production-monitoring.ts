import type { BlockDiagramSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Monitoramento em produção com as contas no arquivo e séries de brinquedo declaradas no texto: o índice de
// estabilidade da população, PSI = Σ (a − e) · ln(a / e), entre a distribuição de assuntos de referência e a
// desta semana; a média e o desvio-padrão amostral dos 7 primeiros dias de uma nota de qualidade, os limites de
// 2σ e 3σ e o primeiro dia acima de cada um; e os alarmes falsos esperados por mês com cada limite, pelas caudas
// da normal padrão (P(Z < −2) ≈ 0,0228 e P(Z < −3) ≈ 0,00135).

const fixed = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const percent = (value: number) => `${Math.round(value * 100)}%`;

// Passo 3: drift na distribuição de assuntos.
const topics = ["pedidos", "reembolso", "produto", "conta", "outros"];
const reference = [0.4, 0.2, 0.2, 0.15, 0.05];
const thisWeek = [0.3, 0.35, 0.15, 0.12, 0.08];
const psiTerms = topics.map((_, index) => (thisWeek[index] - reference[index]) * Math.log(thisWeek[index] / reference[index]));
const psi = psiTerms.reduce((total, value) => total + value, 0);
const PSI_STABLE = 0.1;
const PSI_SHIFT = 0.25;
const biggestTerm = psiTerms.indexOf(Math.max(...psiTerms));
const psiReading = psi < PSI_STABLE ? "estável" : psi < PSI_SHIFT ? "mudança moderada" : "mudança grande";

// Passo 4: % diário de respostas sem suporte nas fontes, numa amostra avaliada por um juiz.
const daily = [9, 8, 10, 9, 7, 8, 9, 8, 9, 10, 11, 13, 14, 14];
const BASELINE_DAYS = 7;
const baseline = daily.slice(0, BASELINE_DAYS);
const mean = baseline.reduce((total, value) => total + value, 0) / baseline.length;
const sigma = Math.sqrt(baseline.reduce((total, value) => total + (value - mean) ** 2, 0) / (baseline.length - 1));
const limit = (k: number) => mean + k * sigma;
const firstAbove = (k: number) => daily.findIndex((value, index) => index >= BASELINE_DAYS && value > limit(k));
const alert3 = firstAbove(3);
const alert2 = firstAbove(2);
const FIXED_LIMIT = 15;

// Passo 5: alarmes falsos esperados por mês.
const METRICS = 5;
const DAYS = 30;
const checks = METRICS * DAYS;
const TAIL_2 = 0.0228;
const TAIL_3 = 0.00135;
const falseAlarms2 = checks * TAIL_2;
const falseAlarms3 = checks * TAIL_3;
const consecutive2 = checks * TAIL_2 * TAIL_2;

const watch = (active: string, done?: string[]): BlockDiagramSpec => ({
  id: "watch",
  piece: "block-diagram",
  blocks: [
    { id: "users", kind: "phone", label: "usuários", col: 0, row: 0.5 },
    { id: "prod", kind: "server", label: "produção", col: 1, row: 0.5 },
    { id: "sample", kind: "queue", label: "traces amostrados", col: 2, row: 0 },
    { id: "feedback", kind: "documents", label: "feedback e eventos", col: 2, row: 1 },
    { id: "monitor", kind: "eval", label: "sinais de qualidade", col: 3, row: 0.5 },
    { id: "oncall", kind: "laptop", label: "alerta", col: 3, row: 1 },
  ],
  edges: [
    { from: "users", to: "prod" },
    { from: "prod", to: "sample" },
    { from: "prod", to: "feedback" },
    { from: "sample", to: "monitor", label: "juiz" },
    { from: "feedback", to: "monitor" },
    { from: "monitor", to: "oncall", label: "limite", variant: "alternative" },
  ],
  active,
  done,
});

const lesson: LessonContent = {
  id: "16-13",
  subtitle: "Como acompanhar a qualidade de um app com LLM depois do deploy: sinais de qualidade, drift nas perguntas, limites de alerta tirados da própria série e o ciclo de volta para o eval.",
  objectives: [
    "Escolher sinais de qualidade explícitos, implícitos e de juiz para monitorar",
    "Medir drift na distribuição das entradas com o PSI",
    "Calcular limites de alerta a partir da média e do desvio de uma série de referência",
    "Equilibrar detecção e alarmes falsos e fechar o ciclo com o eval offline",
  ],
  steps: [
    {
      id: "monitor",
      shortTitle: "Monitor",
      title: "O monitor ao lado do leito",
      tag: "context",
      body: [
        "Na UTI, ninguém espera o paciente reclamar: um monitor acompanha batimentos e oxigenação o tempo todo, e o alarme toca quando um sinal sai da faixa normal daquele paciente. Depois do deploy, um app com LLM precisa do mesmo. O eval offline aprovou a versão com os casos conhecidos, mas as perguntas reais mudam, o provedor atualiza o modelo e os documentos envelhecem.",
        "[[Monitoramento em produção|production-monitoring]] é acompanhar continuamente sinais de qualidade do sistema no ar e disparar alertas quando eles saem da faixa normal. A infraestrutura de métricas, logs, dashboards e [[alertas|alerting]] é tema do módulo 17. Aqui o foco é o que só existe em apps com LLM: medir se as respostas continuam boas.",
      ],
      keyIdea: "O eval offline aprova a versão; o monitoramento descobre quando o mundo mudou depois dela.",
      scene: { kind: "pieces", layout: "single", pieces: [watch("monitor")] },
      alt: "Usuários usam a produção, que gera traces amostrados e eventos de feedback; os sinais de qualidade, em destaque, juntam os dois e disparam um alerta quando passam do limite.",
    },
    {
      id: "signals",
      shortTitle: "Sinais",
      title: "Três fontes de sinal",
      tag: "mechanism",
      body: [
        "O sinal explícito é o usuário dizendo: o polegar para baixo, a nota da conversa. É o mais claro e o mais raro, porque pouca gente clica. O [[feedback implícito|implicit-feedback]] sai do comportamento: o usuário pediu para gerar de novo, reformulou a mesma pergunta, copiou a resposta, pediu um atendente humano, abandonou a conversa. Vem em todo o tráfego, mas cada sinal tem várias causas possíveis.",
        "A terceira fonte é o juiz automático sobre uma amostra dos traces (aula 16.04): groundedness, aderência à política, taxa de abstenção. É o único que mede qualidade diretamente, a um custo por chamada. O painel junta os três e acrescenta custo por conversa. Latência e taxa de erro também entram, mas são sinais de infraestrutura, do módulo 17.",
      ],
      keyIdea: "Monitore o que o usuário diz, o que ele faz e o que o juiz mede numa amostra.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "signals",
            piece: "metrics-panel",
            metrics: [
              { id: "thumbs", label: "explícito: polegar para baixo", value: "% das conversas avaliadas" },
              { id: "regen", label: "implícito: gerar de novo", value: "% das respostas" },
              { id: "handoff", label: "implícito: pediu humano", value: "% das conversas" },
              { id: "judge", label: "juiz: groundedness", value: "% da amostra", color: "module-16" },
              { id: "cost", label: "custo por conversa", value: "US$ por conversa" },
            ],
            highlight: "judge",
          },
        ],
      },
      alt: "Painel de sinais: explícito, polegar para baixo nas conversas avaliadas; implícitos, gerar de novo e pedir atendente humano; juiz, groundedness na amostra, em destaque; e custo por conversa.",
    },
    {
      id: "drift",
      shortTitle: "Drift",
      title: "As perguntas mudaram",
      tag: "mechanism",
      body: [
        `[[Drift|drift]] é a mudança, ao longo do tempo, nos dados que chegam ao sistema ou na relação entre entrada e resposta certa. Um jeito simples de vê-lo é classificar as perguntas por assunto e comparar a distribuição desta semana com a de referência. Na cena (dados de brinquedo), “reembolso” foi de ${percent(reference[1])} para ${percent(thisWeek[1])} das perguntas: talvez uma mudança de política, talvez um problema na entrega.`,
        `O [[índice de estabilidade da população|population-stability-index]] resume a mudança num número: PSI = Σ (a − e) · ln(a / e), somado nos assuntos. Aqui dá ${fixed(psi, 3)}, e o maior termo é “${topics[biggestTerm]}”. Uma regra prática comum, herdada dos modelos de crédito, lê abaixo de ${fixed(PSI_STABLE, 2)} como estável, de ${fixed(PSI_STABLE, 2)} a ${fixed(PSI_SHIFT, 2)} como mudança moderada e acima de ${fixed(PSI_SHIFT, 2)} como mudança grande. Pela regra, ${fixed(psi, 3)} é ${psiReading}. Drift não é erro: é o aviso de que o eval offline pode não representar mais o tráfego.`,
      ],
      keyIdea: "Compare a distribuição das entradas com a referência: drift avisa que os casos de teste envelheceram.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "psi",
            piece: "metrics-panel",
            metrics: [
              { id: "psi", label: "PSI", value: fixed(psi, 3), color: "danger" },
              { id: "top", label: "maior mudança", value: topics[biggestTerm] },
            ],
            highlight: "psi",
          },
          {
            id: "topics",
            piece: "matrix",
            rows: ["referência", "esta semana"],
            cols: topics,
            values: [reference, thisWeek],
            scale: { min: 0, max: 0.4 },
            highlight: { row: 1, col: biggestTerm },
            showValues: true,
            color: "module-16",
          },
        ],
      },
      alt: `Distribuição de assuntos na referência e nesta semana: ${topics.map((topic, index) => `${topic} ${percent(reference[index])} e ${percent(thisWeek[index])}`).join("; ")}. PSI de ${fixed(psi, 3)}, puxado por ${topics[biggestTerm]}.`,
    },
    {
      id: "alert",
      shortTitle: "Alerta",
      title: "A faixa normal sai da própria série",
      tag: "example",
      body: [
        `A série é a porcentagem diária de respostas sem suporte nas fontes, numa amostra avaliada por um juiz (dados de brinquedo). Nos ${BASELINE_DAYS} primeiros dias, a média é ${fixed(mean)}% e o desvio-padrão, ${fixed(sigma, 2)} ponto. Um [[alerta de qualidade|quality-alert]] dispara quando o valor passa de um limite tirado dessa faixa normal, como num gráfico de controle: média + 3σ = ${fixed(limit(3))}%.`,
        `A piora começa devagar, e o limite de 3σ só é cruzado no dia ${alert3 + 1}, com ${daily[alert3]}%. Com 2σ (${fixed(limit(2))}%), o alerta viria no dia ${alert2 + 1}. Na cena, só os pontos acima do limite de 3σ ficam acesos. Um limite fixo de “acima de ${FIXED_LIMIT}%” nunca teria disparado: a faixa normal deste sistema é mais baixa, e só a própria série mostra quando algo mudou.`,
      ],
      keyIdea: "Tire o limite da média e do desvio da série de referência, não de um número redondo.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "limits",
            piece: "metrics-panel",
            metrics: [
              { id: "mean", label: "média de referência", value: `${fixed(mean)}%` },
              { id: "sigma", label: "desvio-padrão", value: fixed(sigma, 2) },
              { id: "limit", label: "limite média + 3σ", value: `${fixed(limit(3))}%` },
              { id: "day", label: "primeiro alerta", value: `dia ${alert3 + 1}`, color: "danger" },
            ],
            highlight: "day",
          },
          {
            id: "series",
            piece: "chart",
            kind: "line",
            series: daily.map((value, index) => ({ label: `d${index + 1}`, value })),
            cutoff: { mode: "threshold", value: Number(limit(3).toFixed(1)), label: `3σ ${fixed(limit(3))}%` },
            highlight: alert3,
            color: "module-16",
          },
        ],
      },
      alt: `Respostas sem suporte por dia, em 14 dias: ${daily.map((value, index) => `dia ${index + 1} ${value}%`).join(", ")}. Média de referência ${fixed(mean)}%, limite de média + 3σ ${fixed(limit(3))}%, cruzado no dia ${alert3 + 1}.`,
    },
    {
      id: "fatigue",
      shortTitle: "Alarme falso",
      title: "Alerta demais vira ruído",
      tag: "tradeoff",
      body: [
        `Um limite mais apertado avisa antes e erra mais. Com ${METRICS} sinais checados uma vez por dia, são ${checks} checagens por mês. Se nada mudou e o ruído for normal, um limite de 2σ dispara por acaso em cerca de ${fixed(TAIL_2 * 100, 1)}% das checagens: ${fixed(falseAlarms2)} alarmes falsos por mês. Com 3σ, ${fixed(falseAlarms3)}.`,
        `Alarmes falsos frequentes ensinam a equipe a ignorar o alerta, e o verdadeiro passa. Uma saída é exigir dois dias seguidos acima de 2σ: o alarme falso cai para cerca de ${fixed(consecutive2, 2)} por mês, e o alerta da série anterior chega no mesmo dia que o de 3σ. Todo alerta precisa de um dono e de um primeiro passo escrito: abrir os traces com nota baixa do dia.`,
      ],
      keyIdea: "Escolha o limite pelo custo de avisar tarde contra o custo de acordar alguém à toa.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "false",
            piece: "metrics-panel",
            metrics: [
              { id: "two", label: "2σ, alarmes falsos/mês", value: fixed(falseAlarms2), color: "danger" },
              { id: "three", label: "3σ, alarmes falsos/mês", value: fixed(falseAlarms3), color: "success" },
              { id: "consecutive", label: "2σ duas vezes seguidas", value: fixed(consecutive2, 2) },
            ],
            highlight: "two",
          },
          {
            id: "alarms",
            piece: "chart",
            kind: "bar",
            series: [
              { label: "2σ", value: Number(falseAlarms2.toFixed(2)) },
              { label: "3σ", value: Number(falseAlarms3.toFixed(2)) },
              { label: "2σ seguidos", value: Number(consecutive2.toFixed(2)) },
            ],
            highlight: 0,
            color: "danger",
          },
        ],
      },
      alt: `Alarmes falsos esperados por mês com ${checks} checagens: limite de 2σ ${fixed(falseAlarms2)}, 3σ ${fixed(falseAlarms3)}, 2σ em dois dias seguidos ${fixed(consecutive2, 2)}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "O ciclo fecha no eval",
      tag: "summary",
      body: [
        "Monitorar um app com LLM é juntar sinais explícitos, implícitos e de juiz, acompanhar o drift das entradas e alertar com limites tirados da própria série, sem afogar a equipe em alarmes falsos. Quando um alerta toca, os traces do dia mostram o que mudou, e as conversas ruins viram casos novos do golden dataset: o próximo eval offline já testa o problema que a produção revelou.",
        "Esse ciclo, avaliar, observar, proteger e monitorar, fecha o módulo. O módulo 17 trata da infraestrutura que sustenta tudo isso: APIs de modelo, serving, escala, logs, custos e CI/CD.",
      ],
      keyIdea: "Produção gera os casos de teste do próximo deploy: monitoramento e eval são o mesmo ciclo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "cycle",
            piece: "block-diagram",
            blocks: [
              { id: "prod", kind: "server", label: "produção", col: 0, row: 0 },
              { id: "traces", kind: "queue", label: "traces", col: 1, row: 0 },
              { id: "monitor", kind: "eval", label: "monitor + alerta", col: 2, row: 0 },
              { id: "golden", kind: "documents", label: "golden dataset", col: 3, row: 0.5 },
              { id: "offline", kind: "eval", label: "eval offline", col: 2, row: 1 },
              { id: "version", kind: "app", label: "nova versão", col: 1, row: 1 },
            ],
            edges: [
              { from: "prod", to: "traces" },
              { from: "traces", to: "monitor" },
              { from: "monitor", to: "golden", label: "falhas viram casos" },
              { from: "golden", to: "offline" },
              { from: "offline", to: "version", label: "aprova" },
              { from: "version", to: "prod", label: "deploy" },
            ],
            active: "golden",
          },
        ],
      },
      alt: "Ciclo: a produção gera traces, o monitor alerta e as falhas viram casos do golden dataset, em destaque; o eval offline aprova a nova versão, que volta para a produção.",
    },
  ],
  realWorldExample:
    "O NIST AI Risk Management Framework, publicado em 2023, organiza a gestão de risco de IA em quatro funções (governar, mapear, medir e gerenciar) e pede que sistemas em produção sejam monitorados continuamente quanto a desempenho e a mudanças no contexto de uso. Na prática, equipes de produtos com LLM fazem isso com avaliações automáticas sobre traces amostrados, painéis com feedback dos usuários e alertas que mandam o responsável abrir as conversas do dia.",
  code: {
    language: "python",
    source: `import math
import statistics

def psi(reference: list[float], current: list[float]) -> float:
    return sum((a - e) * math.log(a / e) for e, a in zip(reference, current))

def first_alert(series: list[float], baseline_days: int = 7, k: float = 3.0) -> int | None:
    base = series[:baseline_days]
    limit = statistics.mean(base) + k * statistics.stdev(base)
    return next((day for day, value in enumerate(series) if day >= baseline_days and value > limit), None)

print(round(psi([0.4, 0.2, 0.2, 0.15, 0.05], [0.3, 0.35, 0.15, 0.12, 0.08]), 3))  # 0.148`,
    caption: "O PSI entre duas distribuições de assuntos e o primeiro dia acima do limite de k desvios, como na aula.",
  },
  tradeOffs: {
    pros: [
      "Descobre problemas que o eval offline não previa, com tráfego real",
      "Limites tirados da série se adaptam à faixa normal de cada sistema",
      "Falhas encontradas em produção alimentam o golden dataset",
    ],
    cons: [
      "Sinais implícitos têm muitas causas e precisam de investigação",
      "O juiz sobre amostras custa chamadas todos os dias",
      "Limites apertados geram alarmes falsos e cansam a equipe",
    ],
    alternatives: [
      "Revisão humana semanal de uma amostra de conversas, para achar o que nenhum sinal mede",
      "Lançamentos graduais com comparação entre a versão nova e a antiga, para pegar regressões antes de todos os usuários",
    ],
  },
  knowledgeCheck: [
    {
      id: "baseline-limit",
      prompt: "A nota diária de um assistente fica entre 94% e 96%, com média 95% e desvio de 0,6 ponto. A equipe usa o alerta fixo “abaixo de 90%”. Qual é o risco?",
      options: [
        "Nenhum: 90% é um limite seguro",
        "Uma queda real para 92% fica muito fora da faixa normal (5 desvios) e não dispara alerta",
        "Vai disparar alarmes falsos todo dia",
        "O desvio-padrão está errado",
      ],
      correct: 1,
      explanation: "Média − 3σ = 95 − 1,8 = 93,2%. Uma queda para 92% é anormal para este sistema, mas o limite fixo de 90% só tocaria muito depois.",
      lesson: "16-13",
    },
    {
      id: "drift",
      prompt: "O PSI entre os assuntos desta semana e os da referência subiu para 0,35, e a nota do juiz continua estável. O que fazer?",
      options: [
        "Nada, a nota está boa",
        "Investigar o que mudou nas perguntas e atualizar o golden dataset, porque ele pode não representar mais o tráfego",
        "Trocar o modelo imediatamente",
        "Desligar o juiz",
      ],
      correct: 1,
      explanation: "PSI acima de 0,25 indica mudança grande nas entradas. A nota pode estar estável por enquanto, mas o eval offline foi montado com outra distribuição de perguntas.",
      lesson: "16-13",
    },
  ],
  related: ["16-08", "16-12", "17-12"],
  references: [
    { title: "NIST AI Risk Management Framework", url: "https://www.nist.gov/itl/ai-risk-management-framework", kind: "docs" },
    { title: "Rabanser et al. (2019), Failing Loudly: An Empirical Study of Methods for Detecting Dataset Shift", url: "https://arxiv.org/abs/1810.11953", kind: "paper" },
    { title: "Google SRE Book: Monitoring Distributed Systems", url: "https://sre.google/sre-book/monitoring-distributed-systems/", kind: "article" },
  ],
};

export default lesson;
