import { dot } from "../../../lab/attention";
import type { LessonContent } from "../../../types/content";

// Modelos multimodais com as contas no arquivo: patches de uma imagem de brinquedo, tokens por imagem
// para as configurações publicadas do ViT (224 px, patch 16) e do encoder CLIP ViT-L/14 usado no
// LLaVA-1.5 (336 px), similaridade de cosseno num espaço compartilhado de brinquedo e as posições de
// áudio do Whisper (janelas de 30 s, passo de 10 ms, convolução com stride 2).

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");

// Passo 2: uma imagem 8 × 8 em tons de cinza (um sol no canto), cortada em patches de 4 × 4.
const image = [
  [0, 0, 0, 0, 0, 0.4, 0.4, 0],
  [0, 0, 0, 0, 0.4, 1, 1, 0.4],
  [0, 0, 0, 0, 0.4, 1, 1, 0.4],
  [0, 0, 0, 0, 0, 0.4, 0.4, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2],
  [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
  [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
];
const TOY_SIZE = image.length;
const TOY_PATCH = 4;
const toyPatches = (TOY_SIZE / TOY_PATCH) ** 2;
const toyPatchValues = TOY_PATCH * TOY_PATCH;
const pixelLabels = image.map((_, index) => String(index + 1));

const patchesOf = (size: number, patch: number) => (size / patch) ** 2;
const RGB = 3;
const VIT_SIZE = 224;
const VIT_PATCH = 16;
const vitPatches = patchesOf(VIT_SIZE, VIT_PATCH);
const vitValuesPerPatch = VIT_PATCH * VIT_PATCH * RGB;

// Passo 3: espaço compartilhado de imagens e textos, em 2D, escrito à mão.
const cosine = (a: number[], b: number[]) => dot(a, b) / Math.sqrt(dot(a, a) * dot(b, b));
const space = {
  imageCat: [0.8, 0.7],
  textCat: [0.55, 0.9],
  textDog: [0.25, 0.95],
  imageCar: [-0.6, -0.5],
  textCar: [-0.7, -0.4],
};
const catCat = cosine(space.imageCat, space.textCat);
const catCar = cosine(space.imageCat, space.textCar);
const signedFixed = (value: number) => (value < 0 ? `−${fixed(Math.abs(value))}` : fixed(value));

// Passo 4: a sequência que o LLM recebe: tokens de imagem e de texto lado a lado.
const sequence = ["<img>", "p₁", "p₂", "p₃", "p₄", "</img>", "Que", "objeto", "é?"];
const imageTokenIndexes = [1, 2, 3, 4];

// Passo 5: tokens por imagem conforme a resolução e o tamanho do patch.
const resolutions = [
  { label: "224/16", size: 224, patch: 16 },
  { label: "336/14", size: 336, patch: 14 },
  { label: "448/14", size: 448, patch: 14 },
  { label: "672/14", size: 672, patch: 14 },
];
const imageTokens = resolutions.map((resolution) => patchesOf(resolution.size, resolution.patch));
const LLAVA = 1;
const CONTEXT = 4096;
const DETAIL = 2;
const imagesPerWindow = Math.floor(CONTEXT / imageTokens[DETAIL]);

// Passo 6: Whisper. 30 s com um quadro a cada 10 ms, e a segunda convolução com stride 2.
const AUDIO_SECONDS = 30;
const FRAMES_PER_SECOND = 100;
const MEL_BANDS = 80;
const audioFrames = AUDIO_SECONDS * FRAMES_PER_SECOND;
const audioPositions = audioFrames / 2;

const lesson: LessonContent = {
  id: "04-09",
  subtitle: "Como um modelo que só sabia ler tokens de texto passa a ler fotos e áudio: tudo vira uma sequência de vetores na mesma entrada do Transformer.",
  objectives: [
    "Explicar como uma imagem vira patches e cada patch vira um vetor",
    "Descrever o espaço compartilhado de imagem e texto aprendido pelo CLIP",
    "Calcular quantos tokens uma imagem ocupa conforme resolução e patch",
    "Mostrar como o áudio entra no mesmo esquema",
  ],
  steps: [
    {
      id: "photo",
      shortTitle: "Foto",
      title: "Uma foto e uma pergunta no mesmo prompt",
      tag: "context",
      body: [
        "Você tira foto de uma placa num país estrangeiro e pergunta o que está escrito. Um [[modelo multimodal|multimodal-model]] recebe a imagem e o texto juntos e responde em texto. Por fora, parece outro tipo de IA; por dentro, é o mesmo Transformer que lê tokens.",
        "O truque é converter a imagem para o formato que o LLM já entende: uma sequência de vetores. Um encoder de visão faz essa conversão, e uma pequena camada de projeção ajusta os vetores ao tamanho dos embeddings do LLM.",
      ],
      keyIdea: "Multimodal não é um modelo novo do zero: é um LLM com um conversor que transforma imagens em vetores.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "phone", kind: "phone", label: "foto + pergunta", col: 0, row: 0.5 },
              { id: "vision", kind: "embedding", label: "encoder de visão", col: 1, row: 0 },
              { id: "text", kind: "tokens", label: "tokens de texto", col: 1, row: 1 },
              { id: "llm", kind: "llm", label: "llm", col: 2, row: 0.5 },
              { id: "answer", kind: "answer", label: "resposta", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "phone", to: "vision", label: "imagem" },
              { from: "phone", to: "text", label: "texto" },
              { from: "vision", to: "llm", label: "vetores" },
              { from: "text", to: "llm" },
              { from: "llm", to: "answer" },
            ],
            active: "vision",
          },
        ],
      },
      alt: "A foto e a pergunta saem do celular: a imagem passa pelo encoder de visão, em destaque, e vira vetores; o texto vira tokens; os dois entram no LLM, que gera a resposta.",
    },
    {
      id: "patches",
      shortTitle: "Patches",
      title: "A imagem vira uma grade de quadradinhos",
      tag: "mechanism",
      body: [
        `O [[Vision Transformer|vision-transformer]] (ViT) corta a imagem em quadrados iguais, os patches, e trata cada um como um token. A imagem de brinquedo da cena tem ${TOY_SIZE} × ${TOY_SIZE} pixels; com patches de ${TOY_PATCH} × ${TOY_PATCH}, viram ${toyPatches} patches de ${toyPatchValues} números cada. O sol fica todo no patch de cima à direita.`,
        `No ViT original, uma foto de ${VIT_SIZE} × ${VIT_SIZE} com patches de ${VIT_PATCH} × ${VIT_PATCH} dá (${VIT_SIZE} ÷ ${VIT_PATCH})² = ${vitPatches} patches. Cada patch tem ${VIT_PATCH} × ${VIT_PATCH} × ${RGB} cores = ${integer(vitValuesPerPatch)} números, que uma camada linear transforma num vetor, como o [[embedding|embedding]] de um token. Depois, posição somada e attention, igual ao texto.`,
      ],
      keyIdea: "Para um Transformer, um patch de imagem é só mais um token: um vetor com uma posição.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "toy", label: "patches da cena", value: String(toyPatches) },
              { id: "vit", label: `ViT ${VIT_SIZE} px / ${VIT_PATCH}`, value: `${vitPatches} patches`, color: "module-04" },
              { id: "values", label: "números por patch", value: integer(vitValuesPerPatch) },
            ],
            highlight: "vit",
          },
          {
            id: "image",
            piece: "matrix",
            rows: pixelLabels,
            cols: pixelLabels,
            values: image,
            scale: { min: 0, max: 1 },
            highlight: { row: 1, col: 5 },
            color: "module-04",
          },
        ],
      },
      alt: `Imagem de brinquedo de ${TOY_SIZE} × ${TOY_SIZE} pixels com um sol no canto superior direito e o chão embaixo; em patches de ${TOY_PATCH} × ${TOY_PATCH}, são ${toyPatches} patches. No ViT, uma foto de ${VIT_SIZE} px vira ${vitPatches} patches de ${integer(vitValuesPerPatch)} números.`,
    },
    {
      id: "shared-space",
      shortTitle: "Espaço comum",
      title: "Imagens e textos no mesmo espaço",
      tag: "mechanism",
      body: [
        "Para o LLM entender o que um patch significa, o encoder de visão precisa produzir vetores que conversem com linguagem. O [[CLIP|clip]] treinou isso com pares de imagem e legenda: o vetor de uma foto deve ficar perto do vetor da sua legenda e longe das legendas das outras fotos do lote.",
        `No espaço de brinquedo da cena, a foto de um gato e o texto “um gato” têm [[similaridade de cosseno|cosine-similarity]] ${fixed(catCat)}; a mesma foto e o texto “um carro”, ${signedFixed(catCar)}. Modelos como o LLaVA usam um encoder do tipo CLIP e treinam só uma projeção para ligar esse espaço aos embeddings do LLM.`,
      ],
      keyIdea: "O encoder de visão é treinado para pôr imagens perto das palavras que as descrevem.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "space",
            piece: "vector-space",
            points: [
              { id: "img-cat", label: "foto: gato", coords: space.imageCat as [number, number], color: "module-04" },
              { id: "txt-cat", label: "“um gato”", coords: space.textCat as [number, number], color: "info" },
              { id: "txt-dog", label: "“um cachorro”", coords: space.textDog as [number, number], color: "info" },
              { id: "img-car", label: "foto: carro", coords: space.imageCar as [number, number], color: "module-04" },
              { id: "txt-car", label: "“um carro”", coords: space.textCar as [number, number], color: "info" },
            ],
            vectors: [{ to: "img-cat" }, { to: "txt-cat" }, { to: "txt-car" }],
            query: "img-cat",
            neighbors: 1,
            distance: { from: "img-cat", to: "txt-cat", label: `cos ${fixed(catCat)}` },
          },
        ],
      },
      alt: `Espaço 2D com fotos e textos. A foto do gato fica ao lado do texto “um gato” (cosseno ${fixed(catCat)}) e longe do texto “um carro” (cosseno ${signedFixed(catCar)}).`,
    },
    {
      id: "sequence",
      shortTitle: "Sequência",
      title: "O LLM lê imagem e texto na mesma fila",
      tag: "mechanism",
      body: [
        "Depois da projeção, os vetores dos patches entram no LLM como se fossem tokens, entre marcadores de início e fim de imagem, seguidos da pergunta. A attention funciona igual: o token “objeto” da pergunta pode olhar diretamente para os patches da imagem.",
        "A saída continua sendo texto, um token por vez. Gerar imagens pede outra peça na saída, como um modelo de difusão ou um decodificador de tokens de imagem. A maioria dos assistentes multimodais lê várias modalidades e escreve texto.",
      ],
      keyIdea: "Dentro do LLM, não existe mais “imagem” e “texto”: existe uma sequência de vetores.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "sequence",
            piece: "token-stream",
            tokens: sequence,
            query: sequence.indexOf("objeto"),
            keys: imageTokenIndexes,
            arcs: imageTokenIndexes.map((index) => ({ from: sequence.indexOf("objeto"), to: index, weight: index === 2 ? 0.9 : 0.3 })),
            color: "module-04",
          },
        ],
      },
      alt: "A sequência que o LLM recebe: marcador de imagem, quatro patches, fim da imagem e a pergunta “Que objeto é?”. O token objeto olha para os patches, com o arco mais forte no patch do sol.",
    },
    {
      id: "token-cost",
      shortTitle: "Custo",
      title: "Uma imagem custa centenas de tokens",
      tag: "tradeoff",
      body: [
        `O número de tokens cresce com o quadrado da resolução. ${resolutions.map((resolution, index) => `${resolution.size} px com patch ${resolution.patch}: ${integer(imageTokens[index])}`).join("; ")}. O LLaVA-1.5 usa o encoder CLIP ViT-L/14 em 336 px: (336 ÷ 14)² = ${imageTokens[LLAVA]} tokens por imagem.`,
        `Mais resolução enxerga letras pequenas e detalhes, mas ocupa a [[janela de contexto|context-window]]: numa janela de ${integer(CONTEXT)} tokens, cabem no máximo ${imagesPerWindow} imagens de ${resolutions[DETAIL].size} px, sem sobrar espaço para a pergunta. As APIs multimodais cobram imagens convertidas em tokens, e muitas reduzem ou cortam a imagem em blocos para controlar esse custo.`,
      ],
      keyIdea: "Resolução dobra, tokens quadruplicam: detalhe na imagem custa janela e dinheiro.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "cost",
            piece: "chart",
            kind: "bar",
            series: resolutions.map((resolution, index) => ({ label: resolution.label, value: imageTokens[index] })),
            highlight: LLAVA,
            color: "module-04",
          },
        ],
      },
      alt: `Tokens por imagem: ${resolutions.map((resolution, index) => `${resolution.size} px com patch ${resolution.patch}, ${integer(imageTokens[index])}`).join("; ")}. Em destaque, os ${imageTokens[LLAVA]} tokens do LLaVA-1.5.`,
    },
    {
      id: "audio",
      shortTitle: "Áudio",
      title: "O áudio segue o mesmo caminho",
      tag: "example",
      body: [
        `O Whisper transforma a fala em texto com a mesma receita. O áudio é cortado em janelas de ${AUDIO_SECONDS} segundos e vira um espectrograma log-Mel de ${MEL_BANDS} faixas, com um quadro a cada 10 ms: ${integer(audioFrames)} quadros. Duas convoluções, a segunda com stride 2, reduzem para ${integer(audioPositions)} posições, que entram num encoder Transformer.`,
        "Um decoder gera o texto token a token, olhando para o áudio por cross-attention. Assistentes de voz atuais usam encoders de áudio parecidos ligados a um LLM, do mesmo jeito que o encoder de visão: o áudio vira vetores, e o LLM lê vetores.",
      ],
      keyIdea: "Imagem, áudio e texto chegam ao Transformer do mesmo jeito: uma sequência de vetores com posição.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "toy", label: "janela de áudio", value: `${AUDIO_SECONDS} s` },
              { id: "vit", label: "quadros log-Mel", value: integer(audioFrames) },
              { id: "values", label: "posições no encoder", value: integer(audioPositions), color: "module-04" },
            ],
            highlight: "values",
          },
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "phone", kind: "phone", label: "áudio 30 s", col: 0, row: 0 },
              { id: "vision", kind: "embedding", label: "encoder de áudio", col: 1, row: 0 },
              { id: "llm", kind: "llm", label: "decoder", col: 2, row: 0 },
              { id: "answer", kind: "answer", label: "texto", col: 3, row: 0 },
            ],
            edges: [
              { from: "phone", to: "vision", label: "log-Mel" },
              { from: "vision", to: "llm", label: `${integer(audioPositions)} vetores` },
              { from: "llm", to: "answer", label: "token a token" },
            ],
            active: "vision",
          },
        ],
      },
      alt: `Áudio de ${AUDIO_SECONDS} segundos vira ${integer(audioFrames)} quadros log-Mel; o encoder de áudio, em destaque, produz ${integer(audioPositions)} vetores, e o decoder gera o texto token a token.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Vários sentidos, uma entrada",
      tag: "summary",
      body: [
        "Cada modalidade tem o seu conversor: o texto passa pelo tokenizador, a imagem por um encoder de visão em patches, o áudio por um encoder de espectrograma. Todos produzem vetores do mesmo tamanho, e o Transformer faz o resto com attention.",
        "O custo aparece em tokens: imagens de alta resolução e áudios longos enchem a janela. A próxima aula trata de um problema que vale para todas as modalidades: respostas fluentes e erradas.",
      ],
      keyIdea: "Conversores diferentes, mesma moeda: vetores na janela de contexto.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "modalities",
            piece: "graph",
            nodes: [
              { id: "text", label: "texto", x: 0.08, y: 0.15 },
              { id: "image", label: "imagem", x: 0.08, y: 0.5 },
              { id: "audio", label: "áudio", x: 0.08, y: 0.85 },
              { id: "tokenizer", label: "tokenizador", x: 0.4, y: 0.15 },
              { id: "vit", label: "encoder de visão", x: 0.4, y: 0.5 },
              { id: "whisper", label: "encoder de áudio", x: 0.4, y: 0.85 },
              { id: "llm", label: "LLM", x: 0.75, y: 0.5, color: "module-04" },
              { id: "out", label: "texto gerado", x: 0.95, y: 0.5 },
            ],
            edges: [
              { from: "text", to: "tokenizer" },
              { from: "image", to: "vit" },
              { from: "audio", to: "whisper" },
              { from: "tokenizer", to: "llm", label: "vetores" },
              { from: "vit", to: "llm", label: "vetores" },
              { from: "whisper", to: "llm", label: "vetores" },
              { from: "llm", to: "out" },
            ],
            path: ["image", "vit", "llm", "out"],
            highlight: ["llm"],
          },
        ],
      },
      alt: "Texto, imagem e áudio passam por tokenizador, encoder de visão e encoder de áudio; os três entregam vetores ao LLM, que gera texto. O caminho da imagem está destacado.",
    },
  ],
  realWorldExample:
    "O LLaVA, um dos primeiros assistentes de visão abertos, liga um encoder CLIP a um LLM com uma projeção treinada em pares de imagem e instrução; na versão 1.5, cada imagem de 336 × 336 pixels vira 576 tokens. Assistentes comerciais como GPT-4o, Claude e Gemini aceitam imagens no prompt e cobram por elas em tokens, calculados a partir da resolução.",
  code: {
    language: "python",
    source: `def image_tokens(width: int, height: int, patch: int) -> int:
    return (width // patch) * (height // patch)

print(image_tokens(224, 224, 16))   # 196: ViT original
print(image_tokens(336, 336, 14))   # 576: CLIP ViT-L/14 no LLaVA-1.5
print(image_tokens(672, 672, 14))   # 2304: o dobro da resolução, 4 vezes os tokens`,
    caption: "Quantos tokens uma imagem ocupa: patches por linha vezes patches por coluna.",
  },
  tradeOffs: {
    pros: [
      "Reaproveita o LLM inteiro: só o encoder e a projeção são novos",
      "Uma única conversa mistura fotos, documentos escaneados, áudio e texto",
      "A attention liga diretamente palavras da pergunta a regiões da imagem",
    ],
    cons: [
      "Imagens e áudios ocupam centenas ou milhares de tokens da janela",
      "Reduzir a resolução economiza tokens, mas perde texto pequeno e detalhes",
      "Os erros de leitura da imagem viram respostas fluentes e erradas",
    ],
    alternatives: ["OCR ou transcrição primeiro e um LLM só de texto depois", "Modelos especializados por modalidade, como um classificador de imagens"],
  },
  knowledgeCheck: [
    {
      id: "double-resolution",
      prompt: "Uma imagem passa de 336 × 336 para 672 × 672 pixels, com o mesmo patch de 14. O que acontece com o número de tokens?",
      options: ["Fica igual", "Dobra", "Quadruplica", "Cai pela metade"],
      correct: 2,
      explanation: "Tokens = (lado ÷ patch)². Com o lado duas vezes maior, são 2² = 4 vezes mais tokens: de 576 para 2.304.",
      lesson: "04-09",
    },
    {
      id: "clip-role",
      prompt: "Por que modelos de visão e linguagem usam encoders treinados como o CLIP?",
      options: [
        "Porque o CLIP gera imagens",
        "Porque ele aprendeu a pôr imagens perto dos textos que as descrevem, e esses vetores fazem sentido para um modelo de linguagem",
        "Porque ele dispensa o LLM",
        "Porque ele comprime a imagem em um único pixel",
      ],
      correct: 1,
      explanation: "O CLIP foi treinado com pares de imagem e legenda. Os vetores dele já carregam significado alinhado à linguagem, e basta uma projeção para ligá-los ao LLM.",
      lesson: "04-09",
    },
  ],
  related: ["03-05", "03-12", "04-10"],
  references: [
    { title: "Dosovitskiy et al. (2020), An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale", url: "https://arxiv.org/abs/2010.11929", kind: "paper" },
    { title: "Radford et al. (2021), Learning Transferable Visual Models From Natural Language Supervision (CLIP)", url: "https://arxiv.org/abs/2103.00020", kind: "paper" },
    { title: "Liu et al. (2023), Improved Baselines with Visual Instruction Tuning (LLaVA-1.5)", url: "https://arxiv.org/abs/2310.03744", kind: "paper" },
    { title: "Radford et al. (2022), Robust Speech Recognition via Large-Scale Weak Supervision (Whisper)", url: "https://arxiv.org/abs/2212.04356", kind: "paper" },
  ],
};

export default lesson;
