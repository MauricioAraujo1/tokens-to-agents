import type { LessonContent } from "../../../types/content";

// Modelos organizados pelo que entra e pelo que sai. Cada saída tem uma conta de brinquedo aqui:
// softmax sobre pontuações de um classificador de fotos, mínimos quadrados para um aluguel e vizinhos
// num espaço de embeddings 2D escrito à mão. O mapa do resumo sai da lista de exemplos abaixo.

const scenes = ["praia", "montanha", "cidade", "floresta", "neve"];
const logits = [3.1, 1.2, 0.4, 0.9, -0.5];
const exps = logits.map(Math.exp);
const expTotal = exps.reduce((sum, value) => sum + value, 0);
const sceneProbabilities = exps.map((value) => value / expTotal);
const topScene = sceneProbabilities.indexOf(Math.max(...sceneProbabilities));

const flats = [
  { area: 30, rent: 1500 },
  { area: 45, rent: 2000 },
  { area: 60, rent: 2600 },
  { area: 75, rent: 3100 },
  { area: 90, rent: 3700 },
  { area: 110, rent: 4400 },
];
const meanOf = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
const meanArea = meanOf(flats.map((flat) => flat.area));
const meanRent = meanOf(flats.map((flat) => flat.rent));
const slope =
  flats.reduce((sum, flat) => sum + (flat.area - meanArea) * (flat.rent - meanRent), 0) /
  flats.reduce((sum, flat) => sum + (flat.area - meanArea) ** 2, 0);
const intercept = meanRent - slope * meanArea;
const NEW_AREA = 70;
const predictedRent = intercept + slope * NEW_AREA;

const sentences = [
  { id: "q", label: "cachorro barulhento", coords: [1.1, 3.9] as [number, number] },
  { id: "bark", label: "meu cachorro late", coords: [1, 4.3] as [number, number] },
  { id: "dog", label: "o cão latiu", coords: [1.5, 3.6] as [number, number] },
  { id: "puppy", label: "filhote de cachorro", coords: [0.6, 3.1] as [number, number] },
  { id: "cake", label: "receita de bolo", coords: [3.2, 4.4] as [number, number] },
  { id: "dollar", label: "preço do dólar", coords: [4, 1] as [number, number] },
  { id: "stocks", label: "a bolsa caiu", coords: [4.5, 1.5] as [number, number] },
];
const NEIGHBORS = 2;
const query = sentences[0];
const nearest = sentences
  .slice(1)
  .map((sentence) => ({ label: sentence.label, distance: Math.hypot(sentence.coords[0] - query.coords[0], sentence.coords[1] - query.coords[1]) }))
  .sort((a, b) => a.distance - b.distance)
  .slice(0, NEIGHBORS);

const inputs = ["tabela", "texto", "imagem", "áudio"];
const outputs = ["classe", "número", "vetor", "texto", "imagem"];
const examples: Array<{ input: string; output: string; model: string }> = [
  { input: "tabela", output: "classe", model: "árvore de decisão" },
  { input: "tabela", output: "número", model: "regressão linear" },
  { input: "texto", output: "classe", model: "classificador de sentimento" },
  { input: "texto", output: "vetor", model: "modelo de embedding" },
  { input: "texto", output: "texto", model: "LLM" },
  { input: "texto", output: "imagem", model: "modelo de difusão" },
  { input: "imagem", output: "classe", model: "classificador de imagens" },
  { input: "imagem", output: "vetor", model: "CLIP" },
  { input: "imagem", output: "texto", model: "modelo multimodal" },
  { input: "áudio", output: "classe", model: "detector de palavra-chave" },
  { input: "áudio", output: "texto", model: "Whisper" },
];
const typeMap = inputs.map((input) =>
  outputs.map((output) => (examples.some((example) => example.input === input && example.output === output) ? 1 : 0)),
);

const percent = (value: number) => `${Math.round(value * 100)}%`;
const money = (value: number) => `R$ ${Math.round(value).toLocaleString("pt-BR")}`;

const lesson: LessonContent = {
  id: "00-05",
  subtitle: "Um jeito simples de organizar o zoológico de modelos: olhe o que entra e o que sai.",
  objectives: [
    "Classificar um modelo pelo tipo de entrada e de saída",
    "Diferenciar classificação, regressão, embedding e geração pelo formato da saída",
    "Reconhecer modelos multimodais e de difusão",
    "Escolher o tipo de modelo certo para uma tarefa de produto",
  ],
  steps: [
    {
      id: "one-app",
      shortTitle: "Um app",
      title: "Um app, vários modelos",
      tag: "context",
      body: [
        "Um app de fotos parece uma coisa só. Por trás, cada recurso usa um modelo diferente: um diz se a foto é de praia, outro transforma cada foto em números para você buscar por “cachorro na neve”, outro escreve a legenda.",
        "Para organizar tantos modelos, faça duas perguntas: o que entra (tabela, texto, imagem, áudio) e o que sai (uma classe, um número, um vetor, um conteúdo novo). Essas duas respostas dizem quase tudo sobre como treinar, avaliar e usar o modelo.",
      ],
      keyIdea: "O tipo de um modelo é definido pelo formato da entrada e da saída, não pela marca.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "phone", kind: "phone", label: "app de fotos", col: 0, row: 0.5 },
              { id: "api", kind: "server", label: "api", col: 1, row: 0.5 },
              { id: "classifier", kind: "llm", label: "classificador", col: 2, row: 0 },
              { id: "label", kind: "answer", label: "praia", col: 3, row: 0 },
              { id: "embed", kind: "embedding", label: "embeddings", col: 2, row: 1 },
              { id: "search", kind: "vector-db", label: "busca", col: 3, row: 1 },
            ],
            edges: [
              { from: "phone", to: "api", label: "foto" },
              { from: "api", to: "classifier" },
              { from: "classifier", to: "label", label: "classe" },
              { from: "api", to: "embed" },
              { from: "embed", to: "search", label: "vetor" },
            ],
            active: "api",
          },
        ],
      },
      alt: "Um app de fotos manda a foto para uma api, que usa um classificador para dizer praia e um modelo de embeddings para alimentar a busca.",
    },
    {
      id: "class",
      shortTitle: "Classe",
      title: "Sai uma classe",
      tag: "mechanism",
      body: [
        `Um modelo de [[visão computacional|computer-vision]] recebe a foto e dá uma pontuação para cada cena. O [[softmax|softmax]] transforma as pontuações em chances que somam 100%. Na cena, “${scenes[topScene]}” fica com ${percent(sceneProbabilities[topScene])}.`,
        "Isso é [[classificação|classification]]: a saída é uma escolha entre opções fixas, conhecidas no treino. Filtro de spam, detecção de fraude e análise de sentimento são do mesmo tipo. O modelo nunca responde uma classe que não estava na lista.",
      ],
      keyIdea: "Classificação devolve uma distribuição sobre uma lista fixa de classes.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "scenes",
            piece: "chart",
            kind: "bar",
            series: scenes.map((label, index) => ({ label, value: Number(sceneProbabilities[index].toFixed(3)) })),
            max: 1,
            highlight: topScene,
            color: "module-00",
          },
        ],
      },
      alt: `Barras com a chance de cada cena; ${scenes[topScene]} lidera com ${percent(sceneProbabilities[topScene])}.`,
    },
    {
      id: "number",
      shortTitle: "Número",
      title: "Sai um número",
      tag: "mechanism",
      body: [
        `Agora a pergunta é “quanto?”. Com ${flats.length} apartamentos de brinquedo, a [[regressão linear|linear-regression]] acha a reta que melhor passa pelos pontos: cerca de ${money(slope)} por m², mais uma base de ${money(intercept)}. Para ${NEW_AREA} m², ela prevê ${money(predictedRent)}.`,
        "Isso é [[regressão|regression]]: a saída é um número contínuo, não uma opção da lista. Previsão de demanda, tempo de entrega e preço de imóvel são regressões. Muitas rodam sobre dados de tabela, com modelos pequenos.",
      ],
      keyIdea: "Regressão devolve um número; o erro se mede pela distância até o valor real.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "rent",
            piece: "metrics-panel",
            metrics: [
              { id: "slope", label: "por m²", value: money(slope) },
              { id: "base", label: "base", value: money(intercept) },
              { id: "prediction", label: `previsão para ${NEW_AREA} m²`, value: money(predictedRent), color: "success" },
            ],
            highlight: "prediction",
          },
        ],
      },
      alt: `Painel da regressão: ${money(slope)} por m², base de ${money(intercept)} e previsão de ${money(predictedRent)} para ${NEW_AREA} m².`,
    },
    {
      id: "vector",
      shortTitle: "Vetor",
      title: "Sai um vetor",
      tag: "mechanism",
      body: [
        `Um [[modelo de embedding|embedding-model]] transforma uma frase em uma lista de números, um ponto num espaço. Frases com o mesmo sentido caem perto. Na cena, os ${NEIGHBORS} vizinhos de “${query.label}” são “${nearest[0].label}” e “${nearest[1].label}”: a segunda não tem nenhuma palavra em comum com a busca.`,
        `O espaço da cena tem 2 dimensões para caber na tela; os [[embeddings|embedding]] reais têm centenas ou milhares. A saída não é uma resposta para a pessoa: é uma representação que outro sistema usa, para buscar, agrupar ou recomendar.`,
      ],
      keyIdea: "Um embedding transforma significado em distância: perto quer dizer parecido.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "space",
            piece: "vector-space",
            points: sentences.map((sentence) => ({ ...sentence, color: sentence.id === "q" ? ("brand" as const) : undefined })),
            query: query.id,
            neighbors: NEIGHBORS,
          },
        ],
      },
      alt: `Frases como pontos num plano; “${query.label}” fica perto de ${nearest.map((item) => item.label).join(" e ")}, e longe de preço do dólar.`,
    },
    {
      id: "generate",
      shortTitle: "Conteúdo",
      title: "Sai conteúdo novo",
      tag: "example",
      body: [
        "Os modelos generativos devolvem uma sequência: texto, código, áudio, imagem. Um LLM gera texto token a token. Um [[modelo de difusão|diffusion-model]] gera imagem partindo de ruído e tirando um pouco dele a cada passo, guiado pelo texto do prompt.",
        "Um [[modelo multimodal|multimodal-model]] mistura tipos de entrada: recebe a foto e a pergunta “o que tem nesta imagem?” e responde em texto. Ele junta, num mesmo modelo, o que antes eram um classificador de imagens e um modelo de texto separados.",
      ],
      keyIdea: "Generativos devolvem sequências; multimodais aceitam mais de um tipo de entrada ao mesmo tempo.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "question", kind: "tokens", label: "pergunta", col: 0, row: 0 },
              { id: "photo", kind: "documents", label: "foto", col: 0, row: 1 },
              { id: "mm", kind: "llm", label: "multimodal", col: 1.5, row: 0.5 },
              { id: "caption", kind: "answer", label: "legenda", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "question", to: "mm", label: "texto" },
              { from: "photo", to: "mm", label: "imagem" },
              { from: "mm", to: "caption", label: "texto" },
            ],
            active: "mm",
          },
        ],
      },
      alt: "Uma pergunta em texto e uma foto entram juntas num modelo multimodal, em destaque, que responde com uma legenda em texto.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "O mapa entrada × saída",
      tag: "summary",
      body: [
        `A tabela da cena junta ${examples.length} tipos comuns: cada linha é uma entrada e cada coluna uma saída. Texto para texto é o LLM, em destaque; áudio para texto é um transcritor como o Whisper; texto para imagem é um modelo de difusão; imagem para vetor é um modelo como o CLIP.`,
        "Diante de uma tarefa nova, comece por aí: que dado eu tenho, que formato de resposta eu quero? A próxima aula junta vários desses modelos num sistema completo, do pedido do usuário até a resposta.",
      ],
      keyIdea: "Escolher o modelo começa por duas perguntas: o que entra e o que precisa sair.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "map",
            piece: "matrix",
            rows: inputs,
            cols: outputs,
            values: typeMap,
            scale: { min: 0, max: 1 },
            highlight: { row: inputs.indexOf("texto"), col: outputs.indexOf("texto") },
            color: "module-00",
          },
        ],
      },
      alt: `Grade com entradas nas linhas (${inputs.join(", ")}) e saídas nas colunas (${outputs.join(", ")}); as células acesas têm um tipo de modelo comum, e texto para texto, o LLM, está em destaque.`,
    },
  ],
  realWorldExample:
    "O Whisper, da OpenAI, é um modelo de áudio para texto publicado com pesos abertos. Segundo o artigo que o apresenta, foi treinado com 680 mil horas de áudio rotulado coletado da web e transcreve e traduz dezenas de idiomas.",
  code: {
    language: "python",
    source: `from transformers import pipeline

classify = pipeline("text-classification")              # texto → classe
embed = pipeline("feature-extraction")                  # texto → vetores
generate = pipeline("text-generation")                  # texto → texto
transcribe = pipeline("automatic-speech-recognition")   # áudio → texto

print(classify("I loved this movie!"))`,
    caption: "Na biblioteca transformers, o nome da tarefa do pipeline já diz o tipo de entrada e de saída do modelo.",
  },
  tradeOffs: {
    pros: [
      "Pensar em entrada e saída deixa claro como avaliar: acerto para classe, erro para número, vizinhos para vetor",
      "Modelos especializados (classificador, embedding) são pequenos, rápidos e baratos",
      "Modelos multimodais e generativos cobrem muitas tarefas com um só modelo",
    ],
    cons: [
      "Um classificador não responde nada fora da lista de classes que aprendeu",
      "Uma regressão simples erra quando a relação não é uma reta",
      "Modelos generativos são os mais caros por chamada e os mais difíceis de avaliar",
    ],
    alternatives: ["Combinar tipos: um embedding para buscar, um LLM para responder com o que foi achado"],
  },
  knowledgeCheck: [
    {
      id: "pick-type",
      prompt: "Você quer estimar em quantos minutos um pedido chega à casa do cliente. Que tipo de modelo é esse?",
      options: ["Classificação", "Regressão", "Embedding", "Modelo de difusão"],
      correct: 1,
      explanation: "A saída é um número contínuo, minutos. Isso é regressão, avaliada pela distância entre o tempo previsto e o real.",
      lesson: "00-05",
    },
    {
      id: "search-by-meaning",
      prompt: "Uma loja quer que a busca por “tênis para correr” encontre “calçado de corrida”, sem palavras em comum. Qual modelo resolve?",
      options: [
        "Um classificador com uma classe para cada produto",
        "Um modelo de embedding: frases de sentido parecido viram vetores próximos",
        "Uma regressão de preço",
        "Um modelo de difusão",
      ],
      correct: 1,
      explanation: "O embedding transforma sentido em distância. Busca por vizinhos acha textos parecidos mesmo sem palavras em comum.",
      lesson: "00-05",
    },
  ],
  related: ["00-04", "00-06", "04-09"],
  references: [
    { title: "Hugging Face: Tasks", url: "https://huggingface.co/tasks", kind: "docs" },
    { title: "Hugging Face Transformers: Pipelines", url: "https://huggingface.co/docs/transformers/main_classes/pipelines", kind: "docs" },
    { title: "Robust Speech Recognition via Large-Scale Weak Supervision (Whisper)", url: "https://arxiv.org/abs/2212.04356", kind: "paper" },
  ],
};

export default lesson;
