import { softmax } from "../../../lab/attention";
import type { PipelineSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// O Transformer montado. As contas da cena (normalização, softmax dos logits e contagem de parâmetros
// do GPT-2 small a partir da configuração publicada) são feitas aqui. Os vetores de brinquedo do fluxo
// residual e os logits são escritos à mão.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const vector = (values: number[]) => `[${values.map((value) => fixed(value)).join("; ")}]`;
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const millions = (value: number) => fixed(value / 1e6, 1);

const add = (a: number[], b: number[]) => a.map((value, index) => value + b[index]);
const mean = (values: number[]) => values.reduce((total, value) => total + value, 0) / values.length;
const std = (values: number[]) => Math.sqrt(mean(values.map((value) => (value - mean(values)) ** 2)));
const layerNorm = (values: number[], epsilon = 1e-5) => {
  const mu = mean(values);
  const sigma = Math.sqrt(mean(values.map((value) => (value - mu) ** 2)) + epsilon);
  return values.map((value) => (value - mu) / sigma);
};
const rmsNorm = (values: number[], epsilon = 1e-5) => {
  const rms = Math.sqrt(mean(values.map((value) => value ** 2)) + epsilon);
  return values.map((value) => value / rms);
};

// Fluxo residual de "gato" num bloco: cada subcamada soma uma correção ao vetor. Traços [vivo, ação, lugar].
const streamFeatures = ["vivo", "ação", "lugar"];
const x0 = [1, 0, 0.1];
const attentionDelta = [0.05, 0.1, 0.3];
const x1 = add(x0, attentionDelta);
const ffnDelta = [0.2, 0, -0.05];
const x2 = add(x1, ffnDelta);

// Normalização de um vetor com 6 dimensões.
const dims = ["d1", "d2", "d3", "d4", "d5", "d6"];
const raw = [2, -1, 0.5, 3.5, -0.5, 1.5];
const normalized = layerNorm(raw);
const rmsNormalized = rmsNorm(raw);

// Logits do último token de "O gato dormiu no" para 6 candidatos (num modelo real, para o vocabulário inteiro).
const candidates = ["sofá", "chão", "telhado", "carro", "banco", "mar"];
const logits = [3.1, 2.4, 1.7, 0.9, 0.6, -0.5];
const probabilities = softmax(logits);

// GPT-2 small: 12 camadas, d_model = 768, d_ff = 3.072, vocabulário de 50.257 tokens e 1.024 posições.
const LAYERS = 12;
const D = 768;
const D_FF = 4 * D;
const VOCAB = 50_257;
const CONTEXT = 1024;
const attentionPerLayer = 4 * D * D + 4 * D;
const ffnPerLayer = 2 * D * D_FF + D_FF + D;
const normsPerLayer = 2 * 2 * D;
const tokenTable = VOCAB * D;
const positionTable = CONTEXT * D;
const finalNorm = 2 * D;
const breakdown = [
  { label: "vetores", value: tokenTable + positionTable },
  { label: "attn", value: LAYERS * attentionPerLayer },
  { label: "FFN", value: LAYERS * ffnPerLayer },
  { label: "normas", value: LAYERS * normsPerLayer + finalNorm },
];
const total = breakdown.reduce((sum, part) => sum + part.value, 0);
const blockParams = attentionPerLayer + ffnPerLayer + normsPerLayer;

// Tamanhos publicados da família GPT-2 (camadas, d_model) e a aproximação 12 · L · d² para os blocos.
const family = [
  { label: "small", layers: 12, d: 768 },
  { label: "medium", layers: 24, d: 1024 },
  { label: "large", layers: 36, d: 1280 },
  { label: "XL", layers: 48, d: 1600 },
];
const approxParams = ({ layers, d }: { layers: number; d: number }) => 12 * layers * d * d + (VOCAB + CONTEXT) * d;

const fullModel = (activeStage: string, done: string[]): PipelineSpec => ({
  id: "model",
  piece: "pipeline",
  stages: [
    { id: "tokens", label: "ids dos tokens" },
    { id: "input", label: "vetor + posição" },
    { id: "blocks", label: "N blocos", color: "module-03" },
    { id: "norm", label: "norma final" },
    { id: "logits", label: "logits" },
    { id: "softmax", label: "softmax" },
  ],
  active: activeStage,
  done,
});

const preNormBlock = (activeStage: string, done: string[]): PipelineSpec => ({
  id: "block",
  piece: "pipeline",
  stages: [
    { id: "x", label: "x" },
    { id: "norm-1", label: "norma" },
    { id: "attention", label: "self-attention" },
    { id: "add-1", label: "+ x" },
    { id: "norm-2", label: "norma" },
    { id: "ffn", label: "feed-forward" },
    { id: "add-2", label: "+ x" },
  ],
  active: activeStage,
  done,
});

const lesson: LessonContent = {
  id: "03-13",
  subtitle:
    "Como as peças das aulas anteriores se encaixam num modelo completo: entrada, pilha de blocos com conexões residuais e normalização, e a saída que vira probabilidade do próximo token.",
  objectives: [
    "Montar o caminho completo de um Transformer decoder-only, do id do token à probabilidade do próximo",
    "Explicar a conexão residual e o fluxo residual que atravessa os blocos",
    "Calcular uma normalização de camada e comparar pós-norma e pré-norma",
    "Contar os parâmetros do GPT-2 small a partir da sua configuração",
    "Relacionar profundidade, largura e número de parâmetros",
  ],
  steps: [
    {
      id: "context",
      shortTitle: "Contexto",
      title: "Juntando as peças do módulo",
      tag: "context",
      body: [
        "As aulas anteriores trataram as peças uma a uma: tokens, vetores de entrada, codificação de posição, self-attention com Q, K e V, várias cabeças e a rede feed-forward. O [[Transformer|transformer]] é o arranjo delas: uma entrada que transforma ids em vetores, uma pilha de N blocos iguais e uma saída que transforma o último vetor numa distribuição sobre o vocabulário.",
        "Esta aula segue o caminho de um modelo decoder-only, como o GPT-2, o formato dos LLMs atuais. O caminho é o da cena: ids dos tokens, vetor de cada token somado à posição, N blocos, uma normalização final, logits e softmax.",
      ],
      keyIdea: "Um Transformer é entrada, pilha de blocos idênticos e saída. Quase toda a capacidade está nos blocos.",
      scene: { kind: "pieces", layout: "single", pieces: [fullModel("blocks", ["tokens", "input"])] },
      alt: "Pipeline do modelo completo: ids dos tokens, vetor + posição, N blocos (em destaque), norma final, logits e softmax.",
    },
    {
      id: "block",
      shortTitle: "Bloco",
      title: "Dentro de um bloco: duas subcamadas e dois atalhos",
      tag: "mechanism",
      body: [
        "Cada bloco tem duas subcamadas: a self-attention com máscara causal e a feed-forward. Em volta de cada uma há uma normalização e uma [[conexão residual|residual-connection]]: a saída da subcamada é somada ao vetor que entrou nela. Num modelo de pré-norma, como o da cena, o bloco faz x = x + Attention(Norma(x)) e depois x = x + FFN(Norma(x)).",
        "Todos os blocos têm a mesma forma, mas cada um tem os seus próprios pesos. O GPT-2 small empilha 12 blocos; modelos grandes empilham dezenas. A entrada e a saída de cada bloco têm o mesmo tamanho, d_model, e é isso que permite empilhar quantos se quiser.",
      ],
      keyIdea: "Bloco = attention e FFN, cada uma com normalização antes e soma residual depois. A forma não muda de bloco para bloco; os pesos mudam.",
      scene: { kind: "pieces", layout: "single", pieces: [preNormBlock("attention", ["x", "norm-1"])] },
      alt: "Pipeline de um bloco de pré-norma: x, norma, self-attention (em destaque), soma com x, norma, feed-forward e soma com x.",
    },
    {
      id: "residual",
      shortTitle: "Residual",
      title: "A conexão residual soma em vez de substituir",
      tag: "mechanism",
      body: [
        `A conexão residual faz saída = x + subcamada(x). A subcamada não precisa reescrever o vetor inteiro, só calcular uma correção. Na cena, “gato” entra com ${vector(x0)}. A attention soma ${vector(attentionDelta)}, sobretudo “lugar”, vindo de “sofá”. A FFN soma ${vector(ffnDelta)}. O vetor sai com ${vector(x2)}: o que ele tinha continua lá, mais o que cada subcamada acrescentou.`,
        "Essa soma também resolve o treino de redes fundas. A derivada de x + f(x) em relação a x é 1 + f′(x): sempre há um caminho, a identidade, por onde o gradiente volta da saída até os primeiros blocos sem ser multiplicado por camada nenhuma. Sem os atalhos, um Transformer com dezenas de blocos mal treina. A ideia vem das ResNets de visão, de 2015.",
      ],
      keyIdea: "Os blocos leem e escrevem num mesmo vetor, o fluxo residual. Cada subcamada só soma a sua contribuição, e o gradiente tem um atalho direto.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "stream",
            piece: "matrix",
            rows: ["entrada x", "+ attention", "= depois da attention", "+ FFN", "= saída do bloco"],
            cols: streamFeatures,
            values: [x0, attentionDelta, x1, ffnDelta, x2],
            scale: { min: -0.5, max: 1.2 },
            highlight: { row: 4, col: 2 },
            showValues: true,
            color: "module-03",
          },
        ],
      },
      alt: `Fluxo residual de gato num bloco: entrada ${vector(x0)}, mais a correção da attention ${vector(attentionDelta)}, dá ${vector(x1)}; mais a correção da FFN ${vector(ffnDelta)}, dá ${vector(x2)}.`,
    },
    {
      id: "layer-norm",
      shortTitle: "Norma",
      title: "Normalização de camada: cada vetor na mesma escala",
      tag: "mechanism",
      body: [
        `Somar correções bloco após bloco faz a escala dos vetores variar. A [[Layer Normalization|layer-norm]] recoloca cada vetor numa escala fixa: subtrai a média dos seus d_model números, divide pelo desvio padrão e depois aplica um ganho γ e um deslocamento β aprendidos. A conta é feita token a token, sem misturar tokens.`,
        `Na cena, o vetor ${vector(raw)} tem média ${fixed(mean(raw))} e desvio ${fixed(std(raw))}. Normalizado (com γ = 1 e β = 0), vira ${vector(normalized)}, com média ${fixed(Math.abs(mean(normalized)))} e desvio ${fixed(std(normalized))}. O Llama usa a RMSNorm, que pula a subtração da média e só divide pela raiz da média dos quadrados: ${vector(rmsNormalized)}. Ela é mais barata e funciona tão bem quanto.`,
      ],
      keyIdea: "A normalização de camada põe cada vetor com média 0 e desvio 1 antes de cada subcamada, o que mantém as contas estáveis em qualquer profundidade.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "mean-before", label: "média antes", value: fixed(mean(raw)) },
              { id: "std-before", label: "desvio antes", value: fixed(std(raw)) },
              { id: "mean-after", label: "média depois", value: fixed(Math.abs(mean(normalized))) },
              { id: "std-after", label: "desvio depois", value: fixed(std(normalized)) },
            ],
            highlight: "std-after",
          },
          { id: "norm", piece: "matrix", rows: ["antes", "LayerNorm", "RMSNorm"], cols: dims, values: [raw, normalized, rmsNormalized], scale: { min: -2, max: 3.5 }, showValues: true, color: "info" },
        ],
      },
      alt: `Um vetor de 6 números antes e depois da normalização. Antes: ${vector(raw)}, média ${fixed(mean(raw))} e desvio ${fixed(std(raw))}. Depois da LayerNorm: ${vector(normalized)}, média 0 e desvio 1. Depois da RMSNorm: ${vector(rmsNormalized)}.`,
    },
    {
      id: "pre-norm",
      shortTitle: "Pré-norma",
      title: "Onde fica a normalização: antes ou depois da soma",
      tag: "mechanism",
      body: [
        "O Transformer original usa pós-norma: x = Norma(x + subcamada(x)). A normalização fica no caminho principal, e o gradiente que volta pelos atalhos passa por ela em todo bloco. Com muitos blocos, esse arranjo exige um aquecimento cuidadoso da taxa de aprendizado para não divergir no começo do treino.",
        "O GPT-2 e quase todos os LLMs atuais usam pré-norma: x = x + subcamada(Norma(x)). A normalização vai para dentro do ramo, e o atalho fica limpo, só com somas, da entrada até a saída. O treino fica mais estável em modelos fundos. Por isso a pré-norma pede uma normalização final, depois do último bloco, antes da saída.",
      ],
      keyIdea: "Pré-norma deixa o atalho residual sem nenhuma operação além da soma. É o padrão dos LLMs atuais porque treina de forma mais estável.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "post",
            piece: "pipeline",
            stages: [
              { id: "x", label: "x" },
              { id: "sub", label: "subcamada" },
              { id: "add", label: "+ x" },
              { id: "norm", label: "norma", color: "danger" },
            ],
            active: "norm",
            done: ["x", "sub", "add"],
          },
          {
            id: "block",
            piece: "pipeline",
            stages: [
              { id: "x", label: "x" },
              { id: "norm", label: "norma", color: "success" },
              { id: "sub", label: "subcamada" },
              { id: "add", label: "+ x" },
            ],
            active: "norm",
            done: ["x"],
          },
        ],
      },
      alt: "Dois arranjos da subcamada. Em cima, pós-norma: x, subcamada, soma com x e norma no caminho principal. Embaixo, pré-norma: x, norma, subcamada e soma com x, com o atalho livre.",
    },
    {
      id: "input",
      shortTitle: "Entrada",
      title: "Na entrada, cada id vira um vetor com posição",
      tag: "mechanism",
      body: [
        `O texto chega como ids de tokens (aula 03.03). Cada id escolhe uma linha de uma tabela aprendida com uma linha por token do vocabulário. No GPT-2 small, a tabela tem ${integer(VOCAB)} × ${D} = ${integer(tokenTable)} números. A essa linha soma-se a codificação da posição (aula 03.06); no GPT-2, outra tabela aprendida, com ${integer(CONTEXT)} posições, ${integer(positionTable)} números.`,
        "O resultado é a matriz de entrada X, com n linhas de d_model números, que entra no primeiro bloco. A partir daí, todos os blocos recebem e devolvem matrizes desse mesmo tamanho.",
      ],
      keyIdea: "A entrada é uma consulta de tabela: o id escolhe uma linha, e a posição é somada a ela.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "vocab", label: "vocabulário", value: integer(VOCAB) },
              { id: "d", label: "d_model", value: String(D) },
              { id: "table", label: "tabela de tokens", value: `${millions(tokenTable)} mi` },
              { id: "positions", label: "tabela de posições", value: `${millions(positionTable)} mi` },
            ],
            highlight: "table",
          },
          fullModel("input", ["tokens"]),
        ],
      },
      alt: `Entrada do GPT-2 small: tabela de ${integer(VOCAB)} tokens por ${D} dimensões (${integer(tokenTable)} números) mais tabela de ${integer(CONTEXT)} posições (${integer(positionTable)} números).`,
    },
    {
      id: "output",
      shortTitle: "Saída",
      title: "Na saída, o último vetor vira probabilidades",
      tag: "mechanism",
      body: [
        `Depois do último bloco e da normalização final, o vetor de cada posição é multiplicado por uma matriz de d_model × vocabulário. O resultado são os [[logits|logit]]: uma pontuação para cada um dos ${integer(VOCAB)} tokens. O softmax os transforma em probabilidades do próximo token. No GPT-2, essa matriz é a própria tabela de entrada, transposta: os pesos são compartilhados.`,
        `A cena mostra 6 candidatos para continuar “O gato dormiu no”. Com os logits da cena, “${candidates[0]}” fica com ${fixed(probabilities[0])}, “${candidates[1]}” com ${fixed(probabilities[1])} e “${candidates[2]}” com ${fixed(probabilities[2])}. Como cada posição prevê a seguinte, uma única passada pelo modelo dá uma distribuição para cada posição do texto, e é isso que o treino usa.`,
      ],
      keyIdea: "A saída projeta o vetor final sobre o vocabulário e aplica o softmax: o resultado é a probabilidade de cada token vir a seguir.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          { id: "probabilities", piece: "chart", kind: "bar", series: candidates.map((label, index) => ({ label, value: probabilities[index] })), max: 1, highlight: 0, color: "module-03" },
          fullModel("softmax", ["tokens", "input", "blocks", "norm", "logits"]),
        ],
      },
      alt: `Probabilidades do próximo token depois de “O gato dormiu no”: ${candidates.map((token, index) => `${token} ${fixed(probabilities[index])}`).join(", ")}.`,
    },
    {
      id: "parameters",
      shortTitle: "Parâmetros",
      title: "Contando os parâmetros do GPT-2 small",
      tag: "example",
      body: [
        `Com a configuração publicada (${LAYERS} blocos, d_model = ${D}, d_ff = ${integer(D_FF)}), cada bloco tem ${integer(attentionPerLayer)} parâmetros de attention, ${integer(ffnPerLayer)} de FFN e ${integer(normsPerLayer)} das duas normalizações: ${integer(blockParams)} por bloco.`,
        `Os ${LAYERS} blocos somam ${integer(LAYERS * blockParams)}. As tabelas de tokens e de posições, ${integer(tokenTable + positionTable)}. Com a normalização final, o total dá ${integer(total)}, os “124 milhões” do GPT-2 small. A matriz de saída não conta à parte porque é a tabela de entrada compartilhada. Num modelo pequeno, a tabela de tokens pesa quase um terço do total; num modelo grande, quase nada.`,
      ],
      keyIdea: "Os parâmetros de um Transformer saem diretamente da configuração. No GPT-2 small, a conta fecha em 124 milhões.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          { id: "metrics", piece: "metrics-panel", metrics: [{ id: "total", label: "GPT-2 small", value: integer(total) }], highlight: "total" },
          { id: "breakdown", piece: "chart", kind: "bar", series: breakdown.map((part) => ({ label: part.label, value: part.value / 1e6 })), highlight: 2, color: "module-03" },
        ],
      },
      alt: `Parâmetros do GPT-2 small, em milhões: ${breakdown.map((part) => `${part.label} ${fixed(part.value / 1e6)}`).join(", ")}. Total: ${integer(total)}.`,
    },
    {
      id: "scale",
      shortTitle: "Escala",
      title: "Mais fundo e mais largo: como o modelo cresce",
      tag: "tradeoff",
      body: [
        `Cada bloco tem cerca de 12 · d² parâmetros: 4 · d² na attention e 8 · d² na FFN, com d_ff = 4 · d. Um modelo com L blocos tem, então, cerca de 12 · L · d², mais as tabelas de entrada. A família GPT-2 cresce nas duas direções: ${family.map((model) => `${model.label} com ${model.layers} blocos e d = ${integer(model.d)}`).join(", ")}. A aproximação dá ${family.map((model) => `${millions(approxParams(model))} milhões`).join(", ")}.`,
        "Largura e profundidade custam diferente. Dobrar d quadruplica os parâmetros de cada bloco; dobrar L só dobra. Para gerar um token, o modelo faz cerca de 2 operações por parâmetro, então o custo de inferência acompanha o tamanho. A attention acrescenta um custo que cresce com o contexto, e a FFN, não.",
      ],
      keyIdea: "Parâmetros ≈ 12 · L · d². Largura pesa ao quadrado, profundidade pesa em linha reta.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          { id: "family", piece: "chart", kind: "bar", series: family.map((model) => ({ label: model.label, value: approxParams(model) / 1e6 })), highlight: family.length - 1, color: "module-03" },
        ],
      },
      alt: `Parâmetros estimados por 12 · L · d² mais as tabelas de entrada, em milhões: ${family.map((model) => `${model.label} ${millions(approxParams(model))}`).join(", ")}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "O Transformer em uma linha",
      tag: "summary",
      body: [
        "ids → tabela de tokens + posição → N × [x = x + Attention(Norma(x)); x = x + FFN(Norma(x))] → norma final → logits → softmax. A attention move informação entre tokens, a FFN processa cada token, as conexões residuais mantêm um fluxo que todos os blocos leem e escrevem, e a normalização mantém a escala.",
        "Os parâmetros saem da configuração: cerca de 12 · L · d² nos blocos, mais as tabelas. Falta uma coisa para o modelo funcionar: os pesos. A próxima aula mostra como um Transformer é treinado para prever o próximo token.",
      ],
      keyIdea: "Uma pilha de blocos iguais, ligados por um fluxo residual, entre uma tabela de entrada e uma projeção sobre o vocabulário.",
      scene: { kind: "pieces", layout: "single", pieces: [fullModel("softmax", ["tokens", "input", "blocks", "norm", "logits"])] },
      alt: "Pipeline do modelo completo com todas as etapas concluídas: ids, vetor + posição, N blocos, norma final, logits e softmax.",
    },
  ],
  realWorldExample: `O nanoGPT, de Andrej Karpathy, implementa um GPT-2 completo em cerca de 300 linhas de PyTorch, e cada peça desta aula aparece nele: a tabela de tokens, a de posições, os blocos com LayerNorm antes da attention e da FFN, as duas somas residuais, a normalização final e a cabeça de saída com os pesos compartilhados. Somando todos os tensores dos pesos publicados do GPT-2 small, o total dá os mesmos ${integer(total)} desta aula. Quem lê o config.json de um modelo no Hugging Face encontra os mesmos números com outros nomes, como num_hidden_layers, hidden_size, intermediate_size e vocab_size, e consegue estimar o tamanho do modelo antes de baixá-lo.`,
  code: {
    language: "python",
    caption:
      "Um bloco de pré-norma em PyTorch, com as dimensões do GPT-2 small. A contagem de parâmetros bate com a da aula: 7.087.872 por bloco.",
    source: `import torch
from torch import nn

class Block(nn.Module):
    def __init__(self, d_model=768, n_heads=12, d_ff=3072):
        super().__init__()
        self.ln1 = nn.LayerNorm(d_model)
        self.attn = nn.MultiheadAttention(d_model, n_heads, batch_first=True)
        self.ln2 = nn.LayerNorm(d_model)
        self.ffn = nn.Sequential(nn.Linear(d_model, d_ff), nn.GELU(), nn.Linear(d_ff, d_model))

    def forward(self, x):
        n = x.size(1)
        future = torch.triu(torch.ones(n, n, dtype=torch.bool), diagonal=1)  # True = posição futura
        h = self.ln1(x)
        x = x + self.attn(h, h, h, attn_mask=future, need_weights=False)[0]  # soma residual 1
        x = x + self.ffn(self.ln2(x))                                         # soma residual 2
        return x

block = Block()
print(sum(p.numel() for p in block.parameters()))  # 7087872
x = torch.randn(1, 10, 768)                          # 1 texto, 10 tokens
print(block(x).shape)                                # torch.Size([1, 10, 768])`,
  },
  tradeOffs: {
    pros: [
      "Blocos idênticos e de tamanho fixo: empilhar mais é só mudar um número da configuração",
      "Conexões residuais e pré-norma permitem treinar pilhas com dezenas de blocos",
      "Tudo é multiplicação de matriz, o que aproveita bem as GPUs no treino",
    ],
    cons: [
      "A attention cresce com o quadrado do contexto",
      "A geração é sequencial: cada token novo exige uma passada por todos os blocos",
      "O número de parâmetros cresce com o quadrado da largura, e com ele a memória e o custo por token",
    ],
    alternatives: [
      "Modelos de espaço de estados (Mamba), com custo linear no contexto",
      "Arquiteturas híbridas, que alternam blocos de attention com blocos recorrentes ou de espaço de estados",
    ],
  },
  knowledgeCheck: [
    {
      id: "residual",
      prompt: "O que a conexão residual faz em cada subcamada?",
      options: [
        "Substitui o vetor pela saída da subcamada",
        "Soma a saída da subcamada ao vetor que entrou nela: x + subcamada(x)",
        "Multiplica o vetor pela saída da subcamada",
        "Apaga os tokens futuros",
      ],
      correct: 1,
      explanation:
        "Com x + subcamada(x), a subcamada só calcula uma correção, e o gradiente tem um caminho direto, a identidade, até os primeiros blocos.",
      lesson: "03-13",
    },
    {
      id: "pre-norm",
      prompt: "Num bloco de pré-norma, onde fica a normalização?",
      options: [
        "Depois da soma residual, no caminho principal",
        "Antes de cada subcamada, dentro do ramo: x + subcamada(Norma(x))",
        "Só na entrada do modelo",
        "Não há normalização",
      ],
      correct: 1,
      explanation:
        "Na pré-norma, a normalização entra no ramo da subcamada, e o atalho residual fica só com somas. Por isso os modelos de pré-norma precisam de uma normalização final depois do último bloco.",
      lesson: "03-13",
    },
    {
      id: "output",
      prompt: "O que transforma o vetor final de uma posição na probabilidade do próximo token?",
      options: [
        "A codificação de posição",
        "Uma projeção para o tamanho do vocabulário, que gera os logits, seguida de softmax",
        "A máscara causal",
        "A FFN do último bloco",
      ],
      correct: 1,
      explanation:
        "A matriz de saída dá uma pontuação (logit) para cada token do vocabulário, e o softmax transforma as pontuações em probabilidades.",
      lesson: "03-13",
    },
  ],
  related: ["03-06", "03-10", "03-11", "03-12", "03-14", "04-04"],
  references: [
    {
      title: "Vaswani et al. (2017), Attention Is All You Need",
      url: "https://arxiv.org/abs/1706.03762",
      kind: "paper",
    },
    {
      title: "He et al. (2015), Deep Residual Learning for Image Recognition",
      url: "https://arxiv.org/abs/1512.03385",
      kind: "paper",
    },
    {
      title: "Ba, Kiros e Hinton (2016), Layer Normalization",
      url: "https://arxiv.org/abs/1607.06450",
      kind: "paper",
    },
    {
      title: "Xiong et al. (2020), On Layer Normalization in the Transformer Architecture",
      url: "https://arxiv.org/abs/2002.04745",
      kind: "paper",
    },
    {
      title: "Zhang e Sennrich (2019), Root Mean Square Layer Normalization",
      url: "https://arxiv.org/abs/1910.07467",
      kind: "paper",
    },
    {
      title: "Andrej Karpathy, nanoGPT",
      url: "https://github.com/karpathy/nanoGPT",
      kind: "repo",
    },
  ],
};

export default lesson;
