import type { GlossaryEntry } from "../glossary";

// Termos do módulo 04: LLM Fundamentals.

const entries: GlossaryEntry[] = [
  {
    id: "greedy-decoding",
    term: "Greedy Decoding",
    explanation: "Regra de geração que escolhe sempre o token mais provável. É determinística: o mesmo prompt dá a mesma resposta.",
    lesson: "04-02",
  },
  {
    id: "eos-token",
    term: "End-of-Sequence Token (EOS)",
    explanation: "Token especial que marca o fim de um texto; quando o modelo o gera, a geração para.",
    lesson: "04-02",
  },
  {
    id: "next-token-prediction",
    term: "Next Token Prediction",
    explanation: "Objetivo do pré-treino de um LLM: dado o texto até aqui, dar a maior probabilidade ao token que vem de fato em seguida.",
    lesson: "04-03",
  },
  {
    id: "quantization",
    term: "Quantization",
    explanation: "Guardar os pesos com menos bits, como 8 ou 4 em vez de 16, para o modelo ocupar menos memória e rodar mais rápido.",
    lesson: "10-09",
  },
  {
    id: "lost-in-the-middle",
    term: "Lost in the Middle",
    explanation: "Efeito em que o modelo usa melhor a informação do começo e do fim de um contexto longo do que a do meio.",
    lesson: "04-05",
  },
  {
    id: "temperature",
    term: "Temperature",
    explanation: "Divisor dos logits antes do softmax: abaixo de 1 concentra a probabilidade no favorito, acima de 1 espalha.",
    lesson: "04-06",
  },
  {
    id: "top-p",
    term: "Top-p (Nucleus Sampling)",
    explanation: "Corte que mantém o menor grupo de tokens mais prováveis cuja soma chega a p e sorteia só entre eles.",
    lesson: "04-06",
  },
  {
    id: "slm",
    term: "Small Language Model (SLM)",
    explanation: "Modelo de linguagem de poucos bilhões de parâmetros, pequeno o bastante para rodar num notebook ou celular.",
    lesson: "04-07",
  },
  {
    id: "knowledge-distillation",
    term: "Knowledge Distillation",
    explanation: "Treino em que um modelo pequeno (aluno) aprende a imitar as respostas ou as probabilidades de um modelo maior (professor).",
    lesson: "04-07",
  },
  {
    id: "model-routing",
    term: "Model Routing",
    explanation: "Mandar cada pedido para o modelo mais adequado, por exemplo um pequeno para tarefas simples e um grande para as difíceis.",
    lesson: "10-15",
  },
  {
    id: "vision-transformer",
    term: "Vision Transformer (ViT)",
    explanation: "Transformer que corta a imagem em patches e trata cada patch como um token.",
    lesson: "04-09",
  },
  {
    id: "clip",
    term: "CLIP",
    explanation: "Modelo treinado com pares de imagem e legenda para pôr imagens e textos que combinam perto um do outro no mesmo espaço de vetores.",
    lesson: "04-09",
  },
  {
    id: "base-model",
    term: "Base Model",
    explanation: "Modelo só pré-treinado: continua textos de forma provável, mas ainda não foi ajustado para seguir instruções.",
    lesson: "04-11",
  },
  {
    id: "supervised-fine-tuning",
    term: "Supervised Fine-Tuning (SFT)",
    explanation: "Ajuste de um modelo pré-treinado com exemplos de instrução e resposta escritos por pessoas, com a mesma perda de próximo token.",
    lesson: "04-11",
  },
  {
    id: "benchmark",
    term: "Benchmark",
    explanation: "Conjunto padronizado de tarefas e respostas usado para comparar modelos com a mesma régua.",
    lesson: "16-07",
  },
  {
    id: "rlhf",
    term: "RLHF (Reinforcement Learning from Human Feedback)",
    explanation: "Ajuste em que um modelo de recompensa, treinado com preferências humanas, dá nota às respostas e o LLM é otimizado para aumentá-la.",
    lesson: "04-13",
  },
  {
    id: "reward-model",
    term: "Reward Model",
    explanation: "Modelo que dá uma nota a uma resposta; é treinado para que a resposta preferida pelas pessoas tenha nota maior que a rejeitada.",
    lesson: "04-13",
  },
  {
    id: "ppo",
    term: "PPO (Proximal Policy Optimization)",
    explanation: "Algoritmo de aprendizado por reforço que atualiza a política em passos limitados; é o mais usado no RLHF.",
    lesson: "04-13",
  },
  {
    id: "kl-divergence",
    term: "KL Divergence",
    explanation: "Medida de quanto uma distribuição de probabilidade se afasta de outra; no RLHF, penaliza o modelo que se afasta do original.",
    lesson: "04-13",
  },
  {
    id: "dpo",
    term: "DPO (Direct Preference Optimization)",
    explanation: "Ajuste por preferências sem modelo de recompensa: aumenta a probabilidade da resposta escolhida e diminui a da rejeitada, relativo a uma referência.",
    lesson: "04-13",
  },
];

export default entries;
