import type { LessonContent } from "../../../types/content";

// RLHF e DPO com as contas no arquivo: a probabilidade de preferência de Bradley-Terry, σ(r_A − r_B), e a
// perda do modelo de recompensa; o objetivo do RLHF com penalidade de KL, r − β · log(π / π_ref); e a perda
// do DPO, −log σ(β · [(log π_w − log π_ref,w) − (log π_l − log π_ref,l)]). As recompensas e log-probabilidades
// são de brinquedo, escritas aqui.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const percent = (value: number) => `${Math.round(value * 100)}%`;
const signed = (value: number, digits = 2) => (value >= 0 ? `+${fixed(value, digits)}` : `−${fixed(Math.abs(value), digits)}`);
const minus = (value: number) => (value < 0 ? `−${fixed(Math.abs(value), 1)}` : fixed(value, 1));

const sigmoid = (value: number) => 1 / (1 + Math.exp(-value));

// Passo 2: modelo de recompensa com Bradley-Terry.
const REWARD_A = 1.6;
const REWARD_B = 0.6;
const preferA = sigmoid(REWARD_A - REWARD_B);
const rewardLoss = -Math.log(preferA);
const deltas = [-3, -2, -1, 0, 1, 2, 3];

// Passo 3: objetivo do RLHF com penalidade de KL. log(π / π_ref) somado nos tokens da resposta.
const BETA_RLHF = 0.1;
const honest = { reward: 2, logRatio: 3 };
const hacked = { reward: 2.6, logRatio: 12 };
const objective = (response: { reward: number; logRatio: number }) => response.reward - BETA_RLHF * response.logRatio;

// Passos 4 e 5: DPO com β = 0,1.
const BETA = 0.1;
const policyChosen = -12;
const referenceChosen = -13;
const policyRejected = -14.5;
const referenceRejected = -14;
const implicitChosen = BETA * (policyChosen - referenceChosen);
const implicitRejected = BETA * (policyRejected - referenceRejected);
const margin = implicitChosen - implicitRejected;
const dpoLoss = (value: number) => -Math.log(sigmoid(value));
const gradientWeight = sigmoid(-margin);
const margins = [0, margin, 0.5, 1, 1.5, 2, 3];

// Passo 6: modelos carregados no treino, 7B em bf16 (2 bytes por parâmetro), só pesos.
const MODEL_GB = (7e9 * 2) / 1e9;
const RLHF_MODELS = 4;
const DPO_MODELS = 2;

const lesson: LessonContent = {
  id: "04-13",
  subtitle: "Como comparações humanas entre duas respostas ensinam um LLM a responder melhor: o modelo de recompensa e o RLHF com PPO, e o atalho do DPO, que dispensa os dois.",
  objectives: [
    "Explicar por que comparar respostas é mais fácil do que escrever a resposta ideal",
    "Calcular a probabilidade de preferência de Bradley-Terry e a perda do modelo de recompensa",
    "Descrever o laço do RLHF com PPO e o papel da penalidade de KL",
    "Calcular a perda do DPO e comparar o custo dos dois métodos",
  ],
  steps: [
    {
      id: "compare",
      shortTitle: "Comparar",
      title: "Mais fácil julgar que escrever",
      tag: "context",
      body: [
        "É difícil escrever o e-mail perfeito, mas é fácil olhar dois rascunhos e dizer qual está melhor. Num concurso de culinária, os jurados não cozinham: provam e comparam. Depois do SFT, o modelo já responde; o que falta é ensinar quais respostas as pessoas preferem: mais úteis, mais honestas, menos perigosas.",
        "Os dados dessa etapa são pares: para um prompt, uma resposta escolhida e uma rejeitada. Duas famílias de método usam esses pares. O [[RLHF|rlhf]] treina um juiz automático e otimiza o modelo contra ele; o [[DPO|dpo]] usa os pares direto na perda do modelo.",
      ],
      keyIdea: "Preferências são comparações entre duas respostas; elas ensinam o que é “melhor” sem exigir a resposta perfeita.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "prompt", kind: "context", label: "prompt", col: 0, row: 0.5 },
              { id: "llm", kind: "llm", label: "modelo sft", col: 1, row: 0.5 },
              { id: "a", kind: "answer", label: "resposta a", col: 2, row: 0 },
              { id: "b", kind: "answer", label: "resposta b", col: 2, row: 1 },
              { id: "human", kind: "user", label: "escolhe a", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "prompt", to: "llm" },
              { from: "llm", to: "a" },
              { from: "llm", to: "b" },
              { from: "a", to: "human", label: "escolhida" },
              { from: "b", to: "human", label: "rejeitada", variant: "alternative" },
            ],
            active: "human",
          },
        ],
      },
      alt: "O modelo ajustado com SFT gera duas respostas para o mesmo prompt; uma pessoa, em destaque, escolhe a resposta A e rejeita a B, pelo caminho tracejado.",
    },
    {
      id: "reward-model",
      shortTitle: "Recompensa",
      title: "Um juiz treinado com as comparações",
      tag: "mechanism",
      body: [
        "O [[modelo de recompensa|reward-model]] é um LLM com a última camada trocada por uma saída de um número só: a nota da resposta. Ele é treinado com o modelo de Bradley-Terry: a probabilidade de A ser preferida a B é σ(r_A − r_B), a sigmoide da diferença de notas. A cena mostra essa curva.",
        `Se o juiz dá ${fixed(REWARD_A, 1)} para A e ${fixed(REWARD_B, 1)} para B, a diferença é ${fixed(REWARD_A - REWARD_B, 1)} e P(A ≻ B) = σ(${fixed(REWARD_A - REWARD_B, 1)}) = ${percent(preferA)}. Como as pessoas escolheram A, a perda é −ln(${fixed(preferA)}) = ${fixed(rewardLoss)}. Treinar é aumentar a distância entre a nota da escolhida e a da rejeitada.`,
      ],
      keyIdea: "O modelo de recompensa só aprende diferenças de nota: σ(r_escolhida − r_rejeitada) deve ficar perto de 1.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "ra", label: "r(A)", value: fixed(REWARD_A, 1) },
              { id: "rb", label: "r(B)", value: fixed(REWARD_B, 1) },
              { id: "p", label: "P(A ≻ B)", value: percent(preferA), color: "module-04" },
              { id: "loss", label: "perda −ln σ", value: fixed(rewardLoss) },
            ],
            highlight: "p",
          },
          {
            id: "curve",
            piece: "chart",
            kind: "line",
            series: deltas.map((delta) => ({ label: minus(delta), value: Number(sigmoid(delta).toFixed(3)) })),
            max: 1,
            highlight: deltas.indexOf(Math.round(REWARD_A - REWARD_B)),
            color: "module-04",
          },
        ],
      },
      alt: `Curva σ(r_A − r_B) para diferenças de −3 a 3. Com r(A) = ${fixed(REWARD_A, 1)} e r(B) = ${fixed(REWARD_B, 1)}, P(A ≻ B) = ${percent(preferA)} e a perda é ${fixed(rewardLoss)}.`,
    },
    {
      id: "ppo",
      shortTitle: "RLHF",
      title: "RLHF: otimizar contra o juiz, sem fugir da referência",
      tag: "mechanism",
      body: [
        "No RLHF, o modelo gera respostas para prompts, o juiz dá a nota e um algoritmo de aprendizado por reforço, em geral o [[PPO|ppo]], ajusta os pesos para aumentar a nota esperada. O InstructGPT, da OpenAI, foi treinado assim, e o ChatGPT foi treinado com os mesmos métodos.",
        `Sem freio, o modelo aprende a enganar o juiz: respostas longas e bajuladoras podem tirar nota alta sem serem melhores. Por isso o objetivo subtrai β vezes a [[divergência KL|kl-divergence]] em relação ao modelo SFT congelado. Com β = ${fixed(BETA_RLHF, 1)}, uma resposta honesta com nota ${fixed(honest.reward, 1)} e desvio ${fixed(honest.logRatio, 0)} vale ${fixed(objective(honest))}; uma “hackeada”, com nota ${fixed(hacked.reward, 1)} e desvio ${fixed(hacked.logRatio, 0)}, vale ${fixed(objective(hacked))}. A penalidade faz a honesta ganhar.`,
      ],
      keyIdea: "RLHF maximiza a nota do juiz menos uma penalidade por se afastar do modelo original.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "ra", label: "honesta: r − β · KL", value: `${fixed(honest.reward, 1)} − ${fixed(BETA_RLHF * honest.logRatio, 1)} = ${fixed(objective(honest))}`, color: "success" },
              { id: "rb", label: "hackeada: r − β · KL", value: `${fixed(hacked.reward, 1)} − ${fixed(BETA_RLHF * hacked.logRatio, 1)} = ${fixed(objective(hacked))}`, color: "danger" },
            ],
            highlight: "ra",
          },
          {
            id: "loop",
            piece: "agent-loop",
            phases: [
              { id: "generate", label: "gerar resposta" },
              { id: "score", label: "nota do juiz" },
              { id: "kl", label: "penalidade KL" },
              { id: "update", label: "atualizar (PPO)" },
            ],
            active: "kl",
            iteration: 3,
            tool: "reward_model(prompt, resposta)",
          },
        ],
      },
      alt: `Laço do RLHF: gerar resposta, nota do juiz, penalidade KL (em destaque) e atualizar com PPO. A resposta honesta vale ${fixed(objective(honest))} e a hackeada ${fixed(objective(hacked))}, depois da penalidade.`,
    },
    {
      id: "dpo",
      shortTitle: "DPO",
      title: "DPO: o mesmo objetivo, sem juiz e sem PPO",
      tag: "mechanism",
      body: [
        "Rafailov et al. (2023) mostraram que o objetivo do RLHF com KL tem uma solução fechada, e que dá para reescrever a perda do modelo de recompensa em termos do próprio LLM. O resultado é o DPO: a recompensa implícita de uma resposta é β · (log π(y) − log π_ref(y)), o quanto o modelo em treino aumentou a probabilidade dela em relação à referência congelada.",
        `No par da cena, a escolhida subiu de ${minus(referenceChosen)} para ${minus(policyChosen)} em log-probabilidade, recompensa implícita ${signed(implicitChosen)}; a rejeitada caiu de ${minus(referenceRejected)} para ${minus(policyRejected)}, ${signed(implicitRejected)}. A margem é ${fixed(margin)} e a perda, −ln σ(${fixed(margin)}) = ${fixed(dpoLoss(margin))}. É só uma perda de classificação: treina com o mesmo laço do SFT.`,
      ],
      keyIdea: "DPO trata o próprio LLM como modelo de recompensa: subir a escolhida e descer a rejeitada, relativo à referência.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "ra", label: "recompensa escolhida", value: signed(implicitChosen), color: "success" },
              { id: "rb", label: "recompensa rejeitada", value: signed(implicitRejected), color: "danger" },
              { id: "p", label: "margem", value: fixed(margin) },
              { id: "loss", label: "perda DPO", value: fixed(dpoLoss(margin)), color: "module-04" },
            ],
            highlight: "loss",
          },
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "pairs", kind: "documents", label: "pares", col: 0, row: 0.5 },
              { id: "policy", kind: "llm", label: "política", col: 1, row: 0 },
              { id: "reference", kind: "llm", label: "referência fixa", col: 1, row: 1 },
              { id: "loss", kind: "eval", label: "perda dpo", col: 2, row: 0.5 },
            ],
            edges: [
              { from: "pairs", to: "policy", label: "log π" },
              { from: "pairs", to: "reference", label: "log π_ref" },
              { from: "policy", to: "loss" },
              { from: "reference", to: "loss" },
            ],
            active: "loss",
            done: ["pairs", "policy", "reference"],
          },
        ],
      },
      alt: `DPO: os pares passam pela política e pela referência fixa, e as log-probabilidades entram na perda, em destaque. Recompensa implícita da escolhida ${signed(implicitChosen)}, da rejeitada ${signed(implicitRejected)}, margem ${fixed(margin)} e perda ${fixed(dpoLoss(margin))}.`,
    },
    {
      id: "dpo-curve",
      shortTitle: "Curva",
      title: "A perda cai conforme a margem cresce",
      tag: "example",
      body: [
        `A curva mostra a perda do DPO conforme a margem aumenta: ${margins.map((value) => `${fixed(value)} → ${fixed(dpoLoss(value))}`).join(", ")}. Com margem 0, a política ainda não distingue as duas respostas e a perda é ln 2 ≈ ${fixed(dpoLoss(0))}.`,
        `O gradiente de cada par é multiplicado por σ(−margem): no par da cena, ${fixed(gradientWeight)}. Pares que o modelo já separa bem pesam pouco; pares em que ele ainda prefere a rejeitada pesam quase 1. O β controla a força: β maior pune mais o afastamento da referência, como no RLHF.`,
      ],
      keyIdea: "Cada par empurra com força σ(−margem): o DPO trabalha mais onde o modelo ainda erra a preferência.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "curve",
            piece: "chart",
            kind: "line",
            series: margins.map((value) => ({ label: fixed(value), value: Number(dpoLoss(value).toFixed(3)) })),
            highlight: 1,
            color: "module-04",
          },
        ],
      },
      alt: `Perda do DPO por margem: ${margins.map((value) => `${fixed(value)} dá ${fixed(dpoLoss(value))}`).join(", ")}. Em destaque, a margem do par da cena, ${fixed(margin)}.`,
    },
    {
      id: "tradeoff",
      shortTitle: "Comparação",
      title: "RLHF ou DPO",
      tag: "tradeoff",
      body: [
        `O RLHF com PPO carrega ${RLHF_MODELS} modelos durante o treino: a política, a referência, o modelo de recompensa e um modelo de valor que o PPO usa para estimar o retorno. O DPO carrega ${DPO_MODELS}: política e referência. Para um modelo de 7B em bf16, só os pesos são ${fixed(RLHF_MODELS * MODEL_GB, 0)} GB contra ${fixed(DPO_MODELS * MODEL_GB, 0)} GB, antes de gradientes e estados do otimizador.`,
        "O DPO é mais simples, mais estável e mais barato, e virou padrão em muitos modelos abertos. O RLHF continua útil: o modelo de recompensa pode dar nota a respostas novas, geradas durante o treino, enquanto o DPO aprende só com os pares fixos do dataset. Os dois herdam os vieses de quem julgou as respostas.",
      ],
      keyIdea: "DPO troca a flexibilidade do juiz por simplicidade: menos modelos, menos memória, treino de classificação.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "ra", label: "modelos no RLHF (PPO)", value: String(RLHF_MODELS) },
              { id: "rb", label: "modelos no DPO", value: String(DPO_MODELS), color: "success" },
              { id: "p", label: "pesos 7B bf16, RLHF", value: `${fixed(RLHF_MODELS * MODEL_GB, 0)} GB` },
              { id: "loss", label: "pesos 7B bf16, DPO", value: `${fixed(DPO_MODELS * MODEL_GB, 0)} GB`, color: "module-04" },
            ],
            highlight: "loss",
          },
        ],
      },
      alt: `RLHF com PPO carrega ${RLHF_MODELS} modelos, ${fixed(RLHF_MODELS * MODEL_GB, 0)} GB de pesos para um 7B em bf16; DPO carrega ${DPO_MODELS}, ${fixed(DPO_MODELS * MODEL_GB, 0)} GB.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Dois caminhos a partir dos mesmos pares",
      tag: "summary",
      body: [
        "Os dois métodos partem do modelo SFT e de pares de preferência. O RLHF treina um modelo de recompensa com Bradley-Terry e otimiza a política com PPO, penalizada pela KL. O DPO pula o juiz e o reforço: aplica a perda de preferência direto nas log-probabilidades da política, relativas à referência.",
        "Com isso o módulo 04 fecha: do que é um LLM às etapas que o transformam num assistente. O módulo 05 mostra como conversar bem com ele: a engenharia de prompts.",
      ],
      keyIdea: "Mesmos pares, dois caminhos: juiz + PPO (RLHF) ou perda direta (DPO).",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "paths",
            piece: "pipeline",
            stages: [
              { id: "sft", label: "modelo SFT" },
              { id: "pairs", label: "pares" },
              { id: "rm", label: "modelo de recompensa" },
              { id: "ppo", label: "PPO + KL" },
              { id: "aligned", label: "modelo alinhado", color: "module-04" },
            ],
            active: "aligned",
            done: ["sft", "pairs", "rm", "ppo"],
            branch: { id: "dpo", label: "DPO", from: "pairs", edgeLabel: "atalho", color: "success" },
          },
        ],
      },
      alt: "Pipeline: modelo SFT, pares, modelo de recompensa, PPO com KL e modelo alinhado, em destaque; dos pares sai um ramo de atalho, o DPO.",
    },
  ],
  realWorldExample:
    "O InstructGPT, da OpenAI, foi treinado com SFT, um modelo de recompensa e PPO, e o Llama 2-Chat usou RLHF com mais de um milhão de comparações humanas. Muitos modelos abertos ajustados depois de 2023, como o Zephyr, usaram DPO, que a biblioteca TRL do Hugging Face oferece pronto no DPOTrainer.",
  code: {
    language: "python",
    source: `import torch
import torch.nn.functional as F

def dpo_loss(pi_chosen, pi_rejected, ref_chosen, ref_rejected, beta=0.1):
    """Log-probabilidades somadas por resposta, para a política e a referência."""
    chosen_reward = beta * (pi_chosen - ref_chosen)
    rejected_reward = beta * (pi_rejected - ref_rejected)
    return -F.logsigmoid(chosen_reward - rejected_reward).mean()

# O par da aula: margem 0,15 e perda ≈ 0,62
print(dpo_loss(torch.tensor(-12.0), torch.tensor(-14.5), torch.tensor(-13.0), torch.tensor(-14.0)))`,
    caption: "A perda do DPO em PyTorch, com o par da aula. O DPOTrainer do TRL calcula as log-probabilidades e aplica essa perda em lotes.",
  },
  tradeOffs: {
    pros: [
      "Comparações são mais fáceis e baratas de coletar do que respostas ideais",
      "DPO dispensa o modelo de recompensa e o PPO: menos memória e treino mais estável",
      "RLHF permite dar nota a respostas novas geradas durante o treino",
    ],
    cons: [
      "Os dois herdam os vieses e as inconsistências de quem julgou",
      "RLHF é caro e instável, e o modelo pode explorar falhas do juiz",
      "DPO aprende só com os pares fixos do dataset e depende muito da qualidade deles",
    ],
    alternatives: [
      "RLAIF: preferências julgadas por outro modelo, com regras escritas",
      "Variantes como IPO e KTO, que mudam a perda de preferência",
    ],
  },
  knowledgeCheck: [
    {
      id: "kl-role",
      prompt: "No RLHF, por que o objetivo subtrai uma penalidade de KL em relação ao modelo SFT?",
      options: [
        "Para o treino rodar mais rápido",
        "Para o modelo não se afastar demais do original e não explorar falhas do modelo de recompensa",
        "Para aumentar a temperatura",
        "Para reduzir o vocabulário",
      ],
      correct: 1,
      explanation: "Sem a penalidade, a política aprende respostas que enganam o juiz. A KL mantém o modelo perto do SFT, onde a nota do juiz é confiável.",
      lesson: "04-13",
    },
    {
      id: "dpo-margin",
      prompt: "No DPO, a política aumenta a log-probabilidade da resposta rejeitada em relação à referência e mantém a escolhida igual. O que acontece com a perda?",
      options: ["Cai", "Sobe, porque a margem fica negativa", "Fica igual", "Vira zero"],
      correct: 1,
      explanation: "A recompensa implícita da rejeitada sobe e a margem (escolhida − rejeitada) diminui, podendo ficar negativa. −log σ(margem) cresce.",
      lesson: "04-13",
    },
  ],
  related: ["01-04", "04-11", "11-07"],
  references: [
    { title: "Ouyang et al. (2022), Training language models to follow instructions with human feedback", url: "https://arxiv.org/abs/2203.02155", kind: "paper" },
    { title: "Rafailov et al. (2023), Direct Preference Optimization: Your Language Model is Secretly a Reward Model", url: "https://arxiv.org/abs/2305.18290", kind: "paper" },
    { title: "Christiano et al. (2017), Deep Reinforcement Learning from Human Preferences", url: "https://arxiv.org/abs/1706.03741", kind: "paper" },
    { title: "Hugging Face TRL: DPO Trainer", url: "https://huggingface.co/docs/trl/dpo_trainer", kind: "docs" },
  ],
};

export default lesson;
