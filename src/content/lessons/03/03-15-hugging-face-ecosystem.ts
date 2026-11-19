import { applyMerges, trainBpe } from "../../../lab/bpe";
import type { GraphSpec, PipelineSpec } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";
import { bpeTokenizerContent } from "../../playgrounds/bpe-tokenizer";

// O ecossistema Hugging Face. Os números da cena são calculados aqui: os dois tokenizadores de brinquedo
// (o BPE do Laboratório treinado em dois corpus), os parâmetros do Llama 2 7B a partir da configuração
// publicada, o tamanho dos pesos por precisão e os parâmetros treináveis de uma LoRA.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");

// Passo 5: o mesmo texto em dois tokenizadores, um treinado em português e outro em inglês.
const MERGES = bpeTokenizerContent.mergeCount;
const englishCorpus = [
  "the tokenizer splits the text into tokens and the model reads the tokens",
  "models learn from text and the tokenizer turns text into numbers",
  "a model only sees token ids from the tokenizer it was trained with",
].join(" ");
const text = "os modelos tokenizam textos";
function tokenizer(corpus: string) {
  const merges = trainBpe(corpus, MERGES);
  const vocabulary = [...[...new Set(corpus.replace(/\s+/g, ""))].sort(), ...merges.map(([left, right]) => left + right)];
  const tokens = applyMerges(text, merges).words.flat();
  return { tokens, ids: tokens.map((token) => vocabulary.indexOf(token)), idOf: (token: string) => vocabulary.indexOf(token) };
}
const portuguese = tokenizer(bpeTokenizerContent.corpus);
const english = tokenizer(englishCorpus);
const SAME_TOKEN = "m";
const listing = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`);

// Passo 7 e 9: Llama 2 7B pela configuração publicada (vocabulário 32.000, d = 4.096, 32 camadas, d_ff = 11.008).
const VOCAB = 32_000;
const D = 4096;
const LAYERS = 32;
const D_FF = 11_008;
const perLayer = 4 * D * D + 3 * D * D_FF + 2 * D;
const llamaParams = LAYERS * perLayer + 2 * VOCAB * D + D;
// LoRA de posto 8 em q_proj e v_proj: duas matrizes A (d × r) e B (r × d) por projeção.
const RANK = 8;
const loraParams = LAYERS * 2 * RANK * (D + D);
const loraShare = (100 * loraParams) / (llamaParams + loraParams);

const precisions = [
  { label: "fp32", bytes: 4 },
  { label: "16 bits", bytes: 2 },
  { label: "int8", bytes: 1 },
  { label: "4 bits", bytes: 0.5 },
];
const gib = (bytes: number) => (llamaParams * bytes) / 2 ** 30;
const GPU_GIB = 24;
const fits = precisions.filter((precision) => gib(precision.bytes) < GPU_GIB).map((precision) => precision.label);

const ecosystem = (highlight: string[], path?: string[]): GraphSpec => ({
  id: "ecosystem",
  piece: "graph",
  nodes: [
    { id: "models", label: "modelos", x: 0.15, y: 0.05 },
    { id: "datasets", label: "datasets", x: 0.85, y: 0.05 },
    { id: "hub", label: "Hub", x: 0.5, y: 0.4, color: "module-03" },
    { id: "spaces", label: "Spaces", x: 0.95, y: 0.6 },
    { id: "tokenizers", label: "tokenizers", x: 0.05, y: 0.6 },
    { id: "transformers", label: "transformers", x: 0.35, y: 0.95 },
    { id: "peft", label: "PEFT", x: 0.8, y: 0.95 },
  ],
  edges: [
    { from: "models", to: "hub" },
    { from: "datasets", to: "hub" },
    { from: "spaces", to: "hub" },
    { from: "hub", to: "transformers", label: "from_pretrained" },
    { from: "tokenizers", to: "transformers" },
    { from: "transformers", to: "peft" },
  ],
  highlight,
  path,
});

const loading: PipelineSpec = {
  id: "loading",
  piece: "pipeline",
  stages: [
    { id: "name", label: "nome do repo" },
    { id: "config", label: "config.json" },
    { id: "class", label: "classe certa" },
    { id: "weights", label: "pesos" },
    { id: "model", label: "modelo pronto", color: "module-03" },
  ],
  active: "class",
  done: ["name", "config"],
};

const lesson: LessonContent = {
  id: "03-15",
  subtitle:
    "Onde encontrar modelos já treinados e as bibliotecas que carregam, rodam e ajustam esses modelos com poucas linhas de código.",
  objectives: [
    "Descrever o Hub como um conjunto de repositórios de modelos, datasets e Spaces",
    "Carregar modelo e tokenizador com as classes Auto e from_pretrained",
    "Explicar por que o tokenizador precisa ser o do próprio modelo",
    "Ler um model card, a licença e o formato dos pesos antes de usar um modelo",
    "Estimar a memória dos pesos e os parâmetros treináveis de uma LoRA",
  ],
  steps: [
    {
      id: "context",
      shortTitle: "Contexto",
      title: "Modelos treinados, prontos para baixar",
      tag: "context",
      body: [
        "A aula anterior mostrou quanto custa pré-treinar um Transformer. Quase ninguém faz isso do zero: parte-se de um modelo que alguém já treinou e publicou. O [[Hugging Face|hugging-face]] é o lugar mais usado para isso. O Hub hospeda modelos, datasets e Spaces (aplicações de demonstração), e as bibliotecas abertas da empresa carregam esses arquivos com uma linha de código.",
        "As peças do ecossistema aparecem na cena. A biblioteca transformers implementa as arquiteturas deste módulo e baixa os pesos do Hub. A tokenizers faz a tokenização da aula 03.02, rápida, em Rust. A datasets carrega e prepara dados de treino. A PEFT ajusta modelos grandes treinando poucos parâmetros.",
      ],
      keyIdea: "O Hub guarda os arquivos; as bibliotecas sabem o que fazer com eles. Juntos, trocam semanas de pré-treino por um download.",
      scene: { kind: "pieces", layout: "single", pieces: [ecosystem(["hub"])] },
      alt: "Grafo do ecossistema: modelos, datasets e Spaces ligados ao Hub; o Hub ligado à biblioteca transformers por from_pretrained; tokenizers ligada a transformers; transformers ligada a PEFT.",
    },
    {
      id: "hub",
      shortTitle: "Hub",
      title: "Cada modelo é um repositório git",
      tag: "mechanism",
      body: [
        "No Hub, cada modelo é um repositório git com nome no formato organização/modelo, como openai-community/gpt2 ou meta-llama/Llama-2-7b-hf. Dentro dele estão o config.json, com a arquitetura e os tamanhos (camadas, d_model, cabeças, vocabulário); os pesos, em geral em arquivos .safetensors; os arquivos do tokenizador; e o README, que é o [[model card|model-card]].",
        "Como é git, há histórico e versões: um commit fixa exatamente quais pesos você usou. Na primeira vez, a biblioteca baixa os arquivos para um cache local (por padrão em ~/.cache/huggingface/hub); nas seguintes, lê do disco.",
      ],
      keyIdea: "Um modelo publicado é uma pasta versionada: configuração, pesos, tokenizador e documentação, no mesmo repositório.",
      scene: { kind: "pieces", layout: "single", pieces: [ecosystem(["hub", "models"], ["models", "hub"])] },
      alt: "Grafo do ecossistema com o caminho de modelos até o Hub em destaque.",
    },
    {
      id: "auto-classes",
      shortTitle: "Auto",
      title: "from_pretrained lê a configuração e monta o modelo",
      tag: "mechanism",
      body: [
        "Na transformers, você não precisa saber qual classe implementa cada modelo. AutoTokenizer.from_pretrained(nome) e AutoModelForCausalLM.from_pretrained(nome) leem o config.json, descobrem a arquitetura (GPT-2, Llama, Mistral…), criam a classe certa com os tamanhos da configuração e carregam os pesos nela.",
        "O sufixo da classe Auto escolhe a cabeça de saída: ForCausalLM para gerar texto com um decoder, ForSequenceClassification para classificar com um encoder, ForSeq2SeqLM para modelos como o T5. É a divisão encoder, decoder e encoder-decoder da aula 03.12, com nome de classe.",
      ],
      keyIdea: "O nome do repositório basta: a configuração diz a arquitetura, e from_pretrained monta o modelo e carrega os pesos.",
      scene: { kind: "pieces", layout: "single", pieces: [loading] },
      alt: "Pipeline do from_pretrained: nome do repositório, config.json, escolha da classe certa (em destaque), pesos e modelo pronto.",
    },
    {
      id: "pipeline",
      shortTitle: "pipeline()",
      title: "Uma tarefa inteira em uma chamada",
      tag: "mechanism",
      body: [
        "Para tarefas comuns, a função pipeline() junta tudo. pipeline(\"sentiment-analysis\") escolhe um modelo padrão para a tarefa, e chamar o resultado com um texto faz as quatro etapas da cena: tokenizar, rodar o modelo, transformar os logits em resposta e devolver algo legível, como o rótulo POSITIVE com pontuação 0,99.",
        "Há pipelines para geração de texto, tradução, resumo, perguntas e respostas, reconhecimento de fala, classificação de imagens e outras tarefas. Na prática, é bom fixar o modelo com o argumento model=, em vez de depender do padrão, que pode mudar entre versões.",
      ],
      keyIdea: "pipeline() é o atalho: tokenizador, modelo e pós-processamento escolhidos e ligados para uma tarefa.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "loading",
            piece: "pipeline",
            stages: [
              { id: "text", label: "texto" },
              { id: "tokenize", label: "tokenizador" },
              { id: "model", label: "modelo", color: "module-03" },
              { id: "post", label: "pós-processo" },
              { id: "result", label: "resposta" },
            ],
            active: "model",
            done: ["text", "tokenize"],
          },
        ],
      },
      alt: "Pipeline da função pipeline(): texto, tokenizador, modelo (em destaque), pós-processamento e resposta.",
    },
    {
      id: "tokenizer",
      shortTitle: "Tokenizador",
      title: "O tokenizador viaja junto com o modelo",
      tag: "mechanism",
      body: [
        `O modelo só entende os ids do vocabulário com que foi treinado. A cena treina o BPE do Laboratório em dois corpus diferentes, com ${MERGES} merges cada, e tokeniza o mesmo texto, “${text}”. O tokenizador treinado em português gera ${portuguese.tokens.length} tokens; o treinado em inglês, ${english.tokens.length}.`,
        `Os ids também não batem. Até o token “${SAME_TOKEN}”, que aparece nas duas saídas, tem o id ${portuguese.idOf(SAME_TOKEN)} num vocabulário e ${english.idOf(SAME_TOKEN)} no outro. Mandar para um modelo os ids de outro tokenizador produz lixo, sem erro nenhum. Por isso o tokenizador é publicado no mesmo repositório do modelo e carregado pelo mesmo nome.`,
      ],
      keyIdea: "Modelo e tokenizador são um par: o mesmo texto vira tokens e ids diferentes em cada vocabulário.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          { id: "portuguese", piece: "token-stream", tokens: portuguese.tokens, color: "module-03" },
          { id: "english", piece: "token-stream", tokens: english.tokens, color: "danger" },
        ],
      },
      alt: `O texto ${text} em dois tokenizadores. Treinado em português: ${portuguese.tokens.join(" | ")} (${portuguese.tokens.length} tokens, ids ${portuguese.ids.join(", ")}). Treinado em inglês: ${english.tokens.join(" | ")} (${english.tokens.length} tokens, ids ${english.ids.join(", ")}).`,
    },
    {
      id: "datasets",
      shortTitle: "datasets",
      title: "Dados de treino com a biblioteca datasets",
      tag: "mechanism",
      body: [
        "load_dataset(nome) baixa um dataset do Hub, ou lê arquivos locais, e o guarda no formato Apache Arrow, mapeado da memória para o disco: um dataset maior que a RAM pode ser lido sem ser carregado inteiro. Com streaming=True, os exemplos chegam sob demanda, sem baixar tudo antes.",
        "O passo seguinte costuma ser dataset.map(tokenizar, batched=True), que aplica o tokenizador do modelo a todos os exemplos e guarda o resultado em cache. Daí os dados vão em lotes para o laço de treino da aula 03.14, que a classe Trainer da transformers já implementa: alvos, perda, gradiente, otimizador e cronograma de taxa de aprendizado.",
      ],
      keyIdea: "datasets carrega e transforma dados em escala; o Trainer executa o laço de treino da aula anterior sobre eles.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "loading",
            piece: "pipeline",
            stages: [
              { id: "load", label: "load_dataset" },
              { id: "map", label: "map(tokenizar)" },
              { id: "batches", label: "lotes" },
              { id: "trainer", label: "Trainer", color: "module-03" },
            ],
            active: "map",
            done: ["load"],
          },
        ],
      },
      alt: "Pipeline de dados: load_dataset, map com o tokenizador (em destaque), lotes e Trainer.",
    },
    {
      id: "peft",
      shortTitle: "PEFT",
      title: "Ajustar um modelo grande treinando poucos parâmetros",
      tag: "example",
      body: [
        `Ajustar todos os pesos de um modelo de 7 bilhões exige guardar gradientes e estados do otimizador para cada um. A biblioteca PEFT oferece alternativas, e a mais usada é a [[LoRA|lora]]: os pesos originais ficam congelados, e cada matriz escolhida ganha um desvio de posto baixo, B · A, com A de d × r e B de r × d.`,
        `Com r = ${RANK} nas projeções de query e de value do Llama 2 7B, são ${LAYERS} camadas × 2 projeções × ${RANK} × (${integer(D)} + ${integer(D)}) = ${integer(loraParams)} parâmetros treináveis, ${fixed(loraShare)}% dos ${integer(llamaParams + loraParams)} do modelo com a LoRA. O arquivo da LoRA tem poucos megabytes, e várias delas podem ser trocadas sobre o mesmo modelo base. O módulo 11 detalha a técnica.`,
      ],
      keyIdea: "Com LoRA, ajustar um modelo de bilhões de parâmetros significa treinar alguns milhões e guardar só esse desvio.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "base", label: "parâmetros do Llama 2 7B", value: integer(llamaParams) },
              { id: "lora", label: `treináveis com LoRA (r = ${RANK})`, value: integer(loraParams) },
              { id: "share", label: "fração treinável", value: `${fixed(loraShare)}%` },
            ],
            highlight: "lora",
          },
          ecosystem(["peft"], ["hub", "transformers", "peft"]),
        ],
      },
      alt: `LoRA no Llama 2 7B: ${integer(loraParams)} parâmetros treináveis, ${fixed(loraShare)}% do total, sobre ${integer(llamaParams)} parâmetros congelados. Abaixo, o grafo do ecossistema com o caminho Hub, transformers e PEFT em destaque.`,
    },
    {
      id: "model-card",
      shortTitle: "Model card",
      title: "Antes de usar: model card, licença e formato dos pesos",
      tag: "tradeoff",
      body: [
        "O model card diz para que o modelo foi treinado, com quais dados, como foi avaliado, quais as limitações conhecidas e sob qual licença ele pode ser usado. As licenças variam: Apache 2.0 e MIT permitem uso comercial amplo; outras, como a licença comunitária do Llama 2, têm condições próprias, e alguns repositórios são fechados até você aceitar os termos.",
        "O formato dos pesos também importa. Os arquivos .bin antigos do PyTorch usam pickle, e carregar um pickle pode executar código arbitrário. O [[safetensors|safetensors]] guarda só os tensores e um cabeçalho, sem código, e ainda carrega mais rápido, por mapeamento de memória. Prefira repositórios com .safetensors e, para código remoto (trust_remote_code), leia o código antes.",
      ],
      keyIdea: "Ler o model card e a licença é parte do trabalho, e safetensors evita executar código de terceiros ao carregar pesos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "loading",
            piece: "pipeline",
            stages: [
              { id: "card", label: "model card" },
              { id: "license", label: "licença" },
              { id: "format", label: ".safetensors", color: "success" },
              { id: "use", label: "usar" },
            ],
            active: "format",
            done: ["card", "license"],
            branch: { id: "pickle", label: ".bin (pickle)", from: "license", edgeLabel: "evite", color: "danger" },
          },
        ],
      },
      alt: "Checklist antes de usar um modelo: model card, licença, pesos em .safetensors (em destaque) e uso; um ramo tracejado para .bin com pickle, marcado como evite.",
    },
    {
      id: "memory",
      shortTitle: "Memória",
      title: "Quanto de memória os pesos ocupam",
      tag: "tradeoff",
      body: [
        `Antes de baixar, dá para estimar a memória dos pesos: parâmetros × bytes por parâmetro. A configuração do Llama 2 7B dá ${integer(llamaParams)} parâmetros. Em fp32, são ${fixed(gib(4), 1)} GiB; em 16 bits (fp16 ou bf16), o formato em que costuma ser publicado, ${fixed(gib(2), 1)} GiB; quantizado em 8 bits, ${fixed(gib(1), 1)} GiB; em 4 bits, ${fixed(gib(0.5), 1)} GiB.`,
        `Numa GPU de ${GPU_GIB} GiB, só cabem as versões ${listing(fits)}, e ainda é preciso sobrar espaço para o KV cache e as ativações. Por isso a transformers aceita torch_dtype para escolher a precisão e integra bibliotecas de quantização no from_pretrained. A quantização em si é tema do módulo 10.`,
      ],
      keyIdea: "Memória dos pesos = parâmetros × bytes por parâmetro. A precisão decide se o modelo cabe na sua GPU.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          { id: "memory", piece: "chart", kind: "bar", series: precisions.map((precision) => ({ label: precision.label, value: gib(precision.bytes) })), highlight: 1, color: "module-03" },
        ],
      },
      alt: `Memória dos pesos do Llama 2 7B por precisão: ${precisions.map((precision) => `${precision.label} ${fixed(gib(precision.bytes), 1)} GiB`).join(", ")}. Numa GPU de ${GPU_GIB} GiB, cabem ${listing(fits)}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "O ecossistema Hugging Face em uma linha",
      tag: "summary",
      body: [
        "O Hub guarda modelos, datasets e Spaces como repositórios git. A transformers lê o config.json e monta o modelo com from_pretrained; o tokenizador vem do mesmo repositório; a datasets prepara dados; o Trainer roda o laço de treino; a PEFT ajusta modelos grandes com poucos parâmetros.",
        "Antes de usar um modelo, leia o model card e a licença, prefira safetensors e estime a memória pela contagem de parâmetros. Com isso, o módulo 03 fecha: da tokenização ao Transformer completo, treinado e pronto para baixar. O módulo 04 parte daqui para os LLMs.",
      ],
      keyIdea: "Hub para encontrar, transformers para carregar e rodar, datasets e PEFT para treinar e ajustar.",
      scene: { kind: "pieces", layout: "single", pieces: [ecosystem(["hub", "transformers"], ["models", "hub", "transformers", "peft"])] },
      alt: "Grafo do ecossistema com o caminho modelos, Hub, transformers e PEFT em destaque.",
    },
  ],
  realWorldExample: `Um caso comum numa empresa: classificar tickets de suporte por assunto. Em vez de treinar um modelo do zero, a equipe procura no Hub um encoder pequeno, já pré-treinado em português, carrega com AutoModelForSequenceClassification, prepara os tickets antigos com datasets e ajusta o modelo com o Trainer em algumas horas numa única GPU. Para um assistente interno, a equipe parte de um decoder-only aberto, confere a licença no model card, carrega em bf16 ou em 4 bits conforme a GPU disponível e treina uma LoRA com a PEFT sobre os documentos da empresa. Nos dois casos, fixar a revisão (o commit) do repositório garante que o modelo em produção é exatamente o que foi testado.`,
  code: {
    language: "python",
    caption:
      "As duas formas de usar um modelo do Hub com a transformers: a função pipeline() para uma tarefa pronta e as classes Auto para controlar tokenizador e geração. A contagem final bate com a da aula 03.13.",
    source: `from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline

# 1. Uma tarefa pronta em uma linha (fixe o modelo com model= em produção)
classifier = pipeline("sentiment-analysis")
print(classifier("I love this course!"))   # [{'label': 'POSITIVE', 'score': 0.99...}]

# 2. Tokenizador e modelo pelo nome do repositório no Hub
name = "openai-community/gpt2"
tokenizer = AutoTokenizer.from_pretrained(name)
model = AutoModelForCausalLM.from_pretrained(name)

inputs = tokenizer("The Transformer architecture", return_tensors="pt")
print(inputs["input_ids"])                          # ids do vocabulário do GPT-2
output = model.generate(**inputs, max_new_tokens=20, do_sample=False)
print(tokenizer.decode(output[0], skip_special_tokens=True))

print(sum(p.numel() for p in model.parameters()))   # 124439808`,
  },
  tradeOffs: {
    pros: [
      "Modelos pré-treinados de graça, com pesos versionados e documentação no mesmo lugar",
      "Uma interface comum (from_pretrained, pipeline) para centenas de arquiteturas",
      "Ferramentas para todo o ciclo: dados, treino, ajuste com poucos parâmetros e demonstração",
    ],
    cons: [
      "Qualidade e documentação variam muito entre repositórios; o model card pode estar incompleto",
      "Licenças diferentes exigem conferência antes de uso comercial",
      "Carregar pesos em pickle ou com trust_remote_code executa código de terceiros",
    ],
    alternatives: [
      "APIs de modelos fechados, sem acesso aos pesos",
      "Outros repositórios e runtimes de modelos abertos, como os do PyTorch Hub e os formatos GGUF do llama.cpp",
    ],
  },
  knowledgeCheck: [
    {
      id: "from-pretrained",
      prompt: "Como AutoModelForCausalLM.from_pretrained(nome) sabe qual arquitetura montar?",
      options: [
        "Pelo tamanho do arquivo de pesos",
        "Lendo o config.json do repositório, que descreve a arquitetura e os tamanhos",
        "Pela extensão do nome do modelo",
        "Sempre monta um GPT-2",
      ],
      correct: 1,
      explanation:
        "O config.json traz o tipo do modelo e os seus tamanhos. A classe Auto usa essa informação para criar a classe certa e carregar os pesos nela.",
      lesson: "03-15",
    },
    {
      id: "tokenizer-pair",
      prompt: "O que acontece se você usar o tokenizador de um modelo com outro modelo?",
      options: [
        "Funciona igual, porque todos os tokenizadores são iguais",
        "O modelo recebe ids de outro vocabulário e produz respostas sem sentido, em geral sem erro",
        "O modelo fica mais rápido",
        "O tokenizador se adapta sozinho",
      ],
      correct: 1,
      explanation:
        "Cada tokenizador corta o texto e numera os tokens do seu jeito. O modelo só conhece os ids do vocabulário com que foi treinado.",
      lesson: "03-15",
    },
    {
      id: "safetensors",
      prompt: "Por que preferir pesos em .safetensors a arquivos .bin com pickle?",
      options: [
        "Porque safetensors comprime os pesos pela metade",
        "Porque carregar um pickle pode executar código arbitrário, e safetensors guarda só tensores",
        "Porque o .bin não funciona em GPU",
        "Porque safetensors melhora a qualidade do modelo",
      ],
      correct: 1,
      explanation:
        "O pickle pode reconstruir objetos Python e executar código ao carregar. O safetensors tem só um cabeçalho e os dados dos tensores, e ainda carrega mais rápido.",
      lesson: "03-15",
    },
  ],
  related: ["03-02", "03-12", "03-13", "03-14", "10-09", "11-08"],
  references: [
    {
      title: "Wolf et al. (2019), HuggingFace's Transformers: State-of-the-art Natural Language Processing",
      url: "https://arxiv.org/abs/1910.03771",
      kind: "paper",
    },
    {
      title: "Lhoest et al. (2021), Datasets: A Community Library for Natural Language Processing",
      url: "https://arxiv.org/abs/2109.02846",
      kind: "paper",
    },
    {
      title: "Hu et al. (2021), LoRA: Low-Rank Adaptation of Large Language Models",
      url: "https://arxiv.org/abs/2106.09685",
      kind: "paper",
    },
    {
      title: "Hugging Face: documentação da biblioteca Transformers",
      url: "https://huggingface.co/docs/transformers/index",
      kind: "docs",
    },
    {
      title: "Hugging Face: documentação do Hub",
      url: "https://huggingface.co/docs/hub/index",
      kind: "docs",
    },
    {
      title: "Hugging Face: documentação do safetensors",
      url: "https://huggingface.co/docs/safetensors/index",
      kind: "docs",
    },
  ],
};

export default lesson;
