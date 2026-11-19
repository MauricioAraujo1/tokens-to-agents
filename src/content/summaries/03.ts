import { catalog } from "../catalog";
import type { LessonId, SummaryContent } from "../../types/content";

// Cheat sheet do módulo 03 (SUM-01.1). O diagrama é desenhado pelo <Scene> num passo único, e a folha
// tem estilo de impressão em A4 (SUM-01.2). As aulas linkadas saem do catálogo: as 15 do módulo, em ordem.

const lessons: LessonId[] = (catalog.find((module) => module.id === "03")?.lessons ?? []).map((lesson) => lesson.id);

const summary: SummaryContent = {
  module: "03",
  concepts: [
    "Modelo de linguagem: estima a probabilidade do próximo token dados os anteriores. Do n-gram à RNN, e da RNN ao Transformer, que troca a leitura sequencial por attention em paralelo.",
    "Tokenização por subpalavras (BPE): junta, rodada a rodada, o par de símbolos mais frequente. Palavras comuns viram um token; raras, vários pedaços. O modelo só conhece os ids do seu vocabulário.",
    "Entrada: cada id escolhe uma linha de uma tabela aprendida (d_model números), e a posição é somada (senoidal ou aprendida) ou aplicada como rotação em query e key (RoPE).",
    "Attention é uma busca suave: a query é comparada com as keys, o softmax transforma as pontuações em pesos que somam 1, e a saída é a média dos values ponderada por esses pesos.",
    "Self-attention: Q, K e V saem do mesmo vetor por W_Q, W_K e W_V. Query e key separadas permitem relações assimétricas; key e value separados desacoplam o critério de busca do conteúdo.",
    "Multi-head: h cabeças em paralelo, cada uma com o seu softmax e d_k = d_model / h, concatenadas e misturadas por W_O. GQA e MQA compartilham keys e values para encolher o KV cache.",
    "Feed-forward: duas camadas densas com uma não linearidade, aplicadas a cada token sozinho. Concentra cerca de 2/3 dos parâmetros do bloco; MoE troca a FFN única por experts com roteador.",
    "Bloco de pré-norma: x = x + Attention(Norma(x)) e x = x + FFN(Norma(x)). O fluxo residual atravessa todos os blocos e dá ao gradiente um caminho direto.",
    "Encoder (sem máscara, BERT) para entender; decoder (máscara causal, GPT, Llama) para gerar; encoder-decoder (T5, BART) ligado por cross-attention para transformar um texto em outro.",
    "Treino: cada posição prevê a seguinte, com cross-entropy, gradiente p − y, AdamW e taxa de aprendizado com aquecimento e decaimento. Custo ≈ 6 · N · D; ótimo de Chinchilla ≈ 20 tokens por parâmetro.",
    "Hugging Face: o Hub guarda modelos e datasets como repositórios git; from_pretrained lê o config.json e carrega pesos e tokenizador do mesmo repositório.",
  ],
  formulas: [
    "Attention(Q, K, V) = softmax(Q · Kᵀ / √d_k) · V",
    "MultiHead(X) = Concat(cabeça₁, …, cabeça_h) · W_O, com d_k = d_model / h",
    "FFN(x) = max(0, x · W₁ + b₁) · W₂ + b₂, com d_ff ≈ 4 · d_model",
    "PE(pos, 2i) = sen(pos / 10000^(2i/d)) e PE(pos, 2i+1) = cos(pos / 10000^(2i/d))",
    "Perda = −log p(token certo); perplexidade = e^perda",
    "Parâmetros ≈ 12 · L · d²; custo de treino ≈ 6 · N · D",
  ],
  pitfalls: [
    "Usar o tokenizador de outro modelo: os ids não batem e a saída vira lixo, sem erro nenhum.",
    "Tirar a divisão por √d_k: as pontuações crescem com a dimensão, o softmax satura e o gradiente some.",
    "Achar que mais cabeças significa mais parâmetros: com d_model fixo, cada cabeça fica com d_k menor.",
    "Achar que a FFN mistura tokens: ela processa cada posição sozinha; quem troca informação é a attention.",
    "Esquecer que a attention cresce com n²: dobrar o contexto quadruplica as pontuações por cabeça e por camada.",
    "O KV cache guarda keys e values, não queries: a query só serve ao token que a fez.",
    "Comparar perplexidade entre modelos com tokenizadores diferentes: o número depende de como o texto foi cortado.",
  ],
  diagram: {
    kind: "pieces",
    layout: "single",
    pieces: [
      {
        id: "module-03",
        piece: "pipeline",
        // Chips do preview 10: os blocos (attention e FFN) repetem N vezes; a saída vem em âmbar.
        display: "chips",
        stages: [
          { id: "text", label: "texto" },
          { id: "tokens", label: "tokens (BPE)" },
          { id: "input", label: "embedding + posição" },
          { id: "attention", label: "multi-head attention", color: "module-03" },
          { id: "ffn", label: "FFN" },
          { id: "next", label: "logits → próximo token", color: "brand" },
        ],
        repeat: { from: "attention", to: "ffn", label: "× N" },
      },
    ],
  },
  lessons,
};

export default summary;
