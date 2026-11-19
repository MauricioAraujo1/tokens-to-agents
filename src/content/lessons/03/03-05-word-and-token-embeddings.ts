import type { VectorPoint } from "../../../scene/types";
import type { LessonContent } from "../../../types/content";

// Os espaços desta aula são ilustrações em 2D, com coordenadas escolhidas à mão. As distâncias,
// os cossenos e a analogia são calculados a partir dessas coordenadas.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

type Coords2 = [number, number];

const cosine = (a: Coords2, b: Coords2) => (a[0] * b[0] + a[1] * b[1]) / (Math.hypot(...a) * Math.hypot(...b));
const distance = (a: Coords2, b: Coords2) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// Passos 1 e 2: one-hot e tabela de embeddings com d = 4.
const tableTokens = ["gato", "cachorro", "carro"];
const oneHot = tableTokens.map((_, row) => [0, 1, 2, 3, 4, 5].map((col) => (col === row + 1 ? 1 : 0)));
const oneHotDistance = Math.SQRT2;
const embeddingTable = [
  [0.81, 0.62, -0.13, 0.05],
  [0.77, 0.7, -0.21, 0.11],
  [-0.45, 0.09, 0.88, -0.32],
];

// Passos 3 e 4: as mesmas palavras antes e depois do treino.
const trained: Record<string, Coords2> = {
  gato: [2, 1.2],
  cachorro: [1.8, 1.6],
  cavalo: [2.3, 0.5],
  carro: [-1.5, 1],
  ônibus: [-1.9, 0.4],
  banana: [0.3, -1.8],
  maçã: [0.7, -2],
};
const random: Record<string, Coords2> = {
  gato: [-1.2, -0.9],
  cachorro: [1.5, -1.6],
  cavalo: [-0.4, 1.9],
  carro: [1.9, 0.8],
  ônibus: [0.2, -0.3],
  banana: [-1.8, 1.1],
  maçã: [1.1, 2.1],
};
const pointsFrom = (coords: Record<string, Coords2>): VectorPoint[] =>
  Object.entries(coords).map(([word, xy]) => ({ id: word, label: word, coords: xy }));

const cosGatoCachorro = cosine(trained.gato, trained.cachorro);
const cosGatoCarro = cosine(trained.gato, trained.carro);
const cosGatoBanana = cosine(trained.gato, trained.banana);

// Passo 5: analogia rei − homem + mulher.
const analogy: Record<string, Coords2> = {
  homem: [1, 0.5],
  mulher: [1, 2],
  rei: [3, 0.8],
  rainha: [3.1, 2.2],
};
const predicted: Coords2 = [
  analogy.rei[0] - analogy.homem[0] + analogy.mulher[0],
  analogy.rei[1] - analogy.homem[1] + analogy.mulher[1],
];
const analogyError = distance(predicted, analogy.rainha);

// Passo 6: "banco" com um vetor só para dois sentidos.
const senses: Record<string, Coords2> = {
  dinheiro: [2.5, -0.5],
  conta: [2.2, -1],
  praça: [-0.5, 2.5],
  sentar: [-1, 2.2],
  banco: [0.9, 0.8],
};

// Passo 7: dimensão d publicada de cada modelo.
const dimensions = [
  { label: "w2v", name: "word2vec (Google News)", d: 300 },
  { label: "BERT", name: "BERT base", d: 768 },
  { label: "GPT-2", name: "GPT-2 small", d: 768 },
  { label: "L3-8B", name: "Llama 3 8B", d: 4096 },
  { label: "GPT-3", name: "GPT-3 175B", d: 12_288 },
];

const lesson: LessonContent = {
  id: "03-05",
  subtitle:
    "Como um id vira um vetor que o modelo consegue usar, por que palavras parecidas acabam perto umas das outras e o que esses vetores ainda não sabem.",
  objectives: [
    "Explicar a camada de embedding como uma busca de linha numa matriz |V| × d",
    "Descrever como o treino aproxima tokens usados em contextos parecidos",
    "Medir semelhança entre vetores com a similaridade de cosseno",
    "Diferenciar embeddings estáticos de palavra (word2vec) dos embeddings de token de um Transformer",
  ],
  steps: [
    {
      id: "ids-are-not-meaning",
      shortTitle: "One-hot",
      title: "Ids e vetores one-hot não dizem nada sobre o significado",
      tag: "context",
      body: [
        "O tokenizador entrega ids. Um id é um endereço arbitrário: “gato” pode ser 412 e “cachorro” 9.031, e nada nesses números diz que os dois são animais. Uma rede neural também não pode tratar o id como quantidade, porque 9.031 não é “maior” que 412 em nenhum sentido útil.",
        `A representação ingênua é o vetor [[one-hot|one-hot]]: um vetor do tamanho do vocabulário, com 1 na posição do token e 0 no resto. Ele é honesto, mas inútil para medir semelhança: quaisquer dois tokens diferentes ficam à mesma distância, √2 ≈ ${fixed(oneHotDistance)}. Para o one-hot, “gato” está tão longe de “cachorro” quanto de “carro”.`,
      ],
      keyIdea: "Precisamos de vetores em que a distância signifique alguma coisa. Ids e one-hot não oferecem isso.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "table",
            piece: "matrix",
            rows: tableTokens,
            cols: ["0", "1", "2", "3", "4", "5"],
            values: oneHot,
            scale: { min: 0, max: 1 },
            showValues: true,
          },
        ],
      },
      alt: "Três vetores one-hot: gato, cachorro e carro, cada um com um único 1 numa posição diferente.",
    },
    {
      id: "lookup-table",
      shortTitle: "Tabela",
      title: "A camada de embedding é uma tabela: o id escolhe uma linha",
      tag: "mechanism",
      body: [
        "A primeira camada de um Transformer é uma matriz E com |V| linhas e d colunas. Cada linha é o [[embedding|embedding]] de um token: d números reais. Para um id i, a camada devolve a linha i. Nenhuma multiplicação é feita na prática; é só uma busca.",
        "Matematicamente, a busca é o one-hot multiplicado por E: o 1 seleciona uma linha e os zeros apagam as outras. Por isso a camada é diferenciável e pode ser treinada como qualquer outro peso da rede. Na cena, d = 4; em modelos reais, d vai de centenas a dezenas de milhares.",
      ],
      keyIdea: "Um embedding de token é uma linha de uma matriz de parâmetros. O id só diz qual linha pegar.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "table",
            piece: "matrix",
            rows: tableTokens,
            cols: ["d1", "d2", "d3", "d4"],
            values: embeddingTable,
            scale: { min: -1, max: 1 },
            highlight: { row: 0, col: 0 },
            showValues: true,
          },
        ],
      },
      alt: `Tabela de embeddings com d = 4. A linha de gato é ${embeddingTable[0].map((value) => fixed(value)).join(", ")}.`,
    },
    {
      id: "random-start",
      shortTitle: "Início",
      title: "No começo do treino, os vetores são aleatórios",
      tag: "mechanism",
      body: [
        "A matriz começa com números aleatórios pequenos. Nesse ponto, a posição de cada palavra não tem relação com o significado: na projeção 2D da cena, “gato” está longe de “cachorro” e perto de nada em especial.",
        "O treino do modelo de linguagem ajusta essas linhas junto com o resto da rede. A cada erro de previsão do próximo token, o gradiente empurra os vetores dos tokens envolvidos na direção que teria diminuído o erro.",
      ],
      keyIdea: "Ninguém escreve os embeddings. Eles são parâmetros aprendidos pelo mesmo treino que aprende a prever o próximo token.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [{ id: "space", piece: "vector-space", points: pointsFrom(random) }],
      },
      alt: "Projeção 2D com as palavras espalhadas ao acaso, antes do treino.",
    },
    {
      id: "trained-space",
      shortTitle: "Depois",
      title: "Depois do treino, contextos parecidos viram vizinhos",
      tag: "mechanism",
      body: [
        "“gato” e “cachorro” aparecem nos mesmos contextos: depois de “o meu”, antes de “dormiu” e “comeu a ração”. Para prever bem o que vem depois dos dois, o modelo ganha com vetores parecidos para eles, e o gradiente vai aproximando as duas linhas da matriz.",
        "É a hipótese distribucional da linguística: palavras que aparecem em contextos parecidos têm significados parecidos. A cena mostra o resultado numa projeção 2D ilustrativa: animais de um lado, veículos de outro, frutas embaixo.",
      ],
      keyIdea: "A geometria do espaço não foi pedida: ela é o efeito colateral de prever o próximo token.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [{ id: "space", piece: "vector-space", points: pointsFrom(trained), query: "gato", neighbors: 2 }],
      },
      alt: "Projeção 2D depois do treino: gato, cachorro e cavalo juntos; carro e ônibus juntos; banana e maçã juntas. Os vizinhos de gato estão em destaque.",
    },
    {
      id: "cosine",
      shortTitle: "Cosseno",
      title: "Semelhança é medida pelo ângulo entre os vetores",
      tag: "mechanism",
      body: [
        "A medida mais usada é a [[Cosine Similarity|cosine-similarity]] (similaridade de cosseno): o produto escalar dos dois vetores dividido pelo produto dos seus comprimentos. Ela vai de −1 (direções opostas) a 1 (mesma direção) e ignora o tamanho do vetor, que costuma refletir mais a frequência do token do que o seu sentido.",
        `Com os vetores da cena: cos(gato, cachorro) = ${fixed(cosGatoCachorro)}, cos(gato, carro) = ${fixed(cosGatoCarro)} e cos(gato, banana) = ${fixed(cosGatoBanana)}. O ângulo pequeno entre gato e cachorro vira um cosseno perto de 1.`,
      ],
      keyIdea: "Perto no espaço de embeddings quer dizer ângulo pequeno: cosseno perto de 1.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "space",
            piece: "vector-space",
            points: pointsFrom(trained),
            query: "gato",
            vectors: [{ to: "gato" }, { to: "cachorro" }, { to: "carro" }, { to: "banana" }],
          },
          {
            id: "cosines",
            piece: "metrics-panel",
            metrics: [
              { id: "cachorro", label: "cos(gato, cachorro)", value: fixed(cosGatoCachorro), color: "success" },
              { id: "carro", label: "cos(gato, carro)", value: fixed(cosGatoCarro) },
              { id: "banana", label: "cos(gato, banana)", value: fixed(cosGatoBanana) },
            ],
            highlight: "cachorro",
          },
        ],
      },
      alt: `Vetores da origem até gato, cachorro, carro e banana. Cossenos com gato: cachorro ${fixed(cosGatoCachorro)}, carro ${fixed(cosGatoCarro)}, banana ${fixed(cosGatoBanana)}.`,
    },
    {
      id: "directions",
      shortTitle: "Direções",
      title: "Algumas direções do espaço viram relações",
      tag: "mechanism",
      body: [
        "Mikolov e coautores (2013) treinaram o [[word2vec|word2vec]], que aprende um vetor por palavra prevendo as palavras vizinhas a partir da palavra central (ou o contrário), e notaram que diferenças entre vetores capturam relações. O deslocamento de “homem” para “mulher” é parecido com o de “rei” para “rainha”.",
        `Na cena, rei − homem + mulher cai a ${fixed(analogyError)} de “rainha”. Nos vetores reais, o vizinho mais próximo dessa conta é “queen”, mas só quando as palavras da própria pergunta (king, man, woman) são excluídas da busca. As analogias funcionam bem para algumas relações e mal para outras, então trate-as como ilustração, não como regra.`,
      ],
      keyIdea: "Relações aparecem como deslocamentos parecidos no espaço, mas de forma aproximada e irregular.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "space",
            piece: "vector-space",
            points: [
              ...pointsFrom(analogy),
              { id: "predicted", label: "rei − homem + mulher", coords: predicted, color: "brand" },
            ],
            vectors: [
              { from: "homem", to: "mulher" },
              { from: "rei", to: "rainha" },
            ],
            distance: { from: "predicted", to: "rainha", label: fixed(analogyError) },
          },
        ],
      },
      alt: `Os vetores de homem para mulher e de rei para rainha são quase paralelos. O ponto rei − homem + mulher fica a ${fixed(analogyError)} de rainha.`,
    },
    {
      id: "static-vs-contextual",
      shortTitle: "Estático",
      title: "Um vetor por token: o sentido ainda não depende do contexto",
      tag: "tradeoff",
      body: [
        "No word2vec e no GloVe, cada palavra tem um único vetor. “banco” de praça e “banco” de dinheiro dividem a mesma linha, que acaba no meio do caminho entre os dois sentidos. Na cena, os dois vizinhos mais próximos de “banco” são um de cada sentido.",
        "No Transformer, os embeddings de entrada são de tokens (subpalavras, não palavras inteiras) e também são estáticos: o mesmo id sempre busca a mesma linha. A diferença é o que vem depois. As camadas de attention misturam cada vetor com o dos vizinhos, e na saída do bloco o vetor de “banco” já depende da frase. Esses vetores de saída são chamados de contextuais.",
      ],
      keyIdea: "A tabela de embeddings dá o ponto de partida. O sentido em contexto é construído pelas camadas seguintes.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [{ id: "space", piece: "vector-space", points: pointsFrom(senses), query: "banco", neighbors: 2 }],
      },
      alt: "Projeção 2D com banco entre dois grupos: dinheiro e conta de um lado, praça e sentar do outro. Os vizinhos de banco vêm um de cada grupo.",
    },
    {
      id: "dimensions",
      shortTitle: "Dimensões",
      title: "Quantas dimensões tem um vetor de token",
      tag: "example",
      body: [
        "O word2vec publicado pelo Google tem 300 dimensões. No Transformer, d (também chamado d_model) é a largura do modelo inteiro: 768 no BERT base e no GPT-2 small, 4.096 no Llama 3 8B e 12.288 no GPT-3. O vetor de cada token mantém essa largura em todas as camadas.",
        "As dimensões não têm nome. Não existe a coluna “é animal” ou “é feminino”: as propriedades ficam espalhadas por combinações de muitas dimensões. As projeções em 2D, como as desta aula, perdem quase toda a informação e servem só para intuição.",
      ],
      keyIdea: "d é um hiperparâmetro de largura do modelo. Mais dimensões guardam mais distinções, a um custo de memória e computação.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "dims",
            piece: "chart",
            kind: "bar",
            series: dimensions.map((model) => ({ label: model.label, value: model.d })),
            highlight: 3,
          },
          {
            id: "dims-metrics",
            piece: "metrics-panel",
            metrics: dimensions.map((model) => ({
              id: model.label,
              label: model.name,
              value: model.d.toLocaleString("pt-BR"),
            })),
          },
        ],
      },
      alt: `Dimensão dos vetores por modelo: ${dimensions.map((model) => `${model.name} ${model.d}`).join(", ")}.`,
    },
    {
      id: "limits",
      shortTitle: "Limites",
      title: "O espaço aprende também o que não devia",
      tag: "tradeoff",
      body: [
        "Os vetores refletem os dados de treino, incluindo os seus vieses. Bolukbasi e coautores (2016) mostraram que, em vetores word2vec treinados com notícias, a mesma conta de analogia associa “homem” a “programador” e “mulher” a “dona de casa”. Um sistema que usa esses vetores herda essas associações.",
        "Tokens raros recebem poucos ajustes no treino e acabam com vetores pouco confiáveis. E a tabela custa |V| × d parâmetros: 38,6 milhões no GPT-2 small, uma fatia grande de um modelo de 124 milhões.",
      ],
      keyIdea: "Embeddings comprimem estatísticas do corpus. Vieses do corpus viram geometria.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [{ id: "space", piece: "vector-space", points: pointsFrom(analogy), vectors: [{ from: "homem", to: "mulher" }] }],
      },
      alt: "O vetor de homem para mulher, a mesma direção que carrega tanto relações legítimas quanto estereótipos do corpus.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "De id a vetor com significado",
      tag: "summary",
      body: [
        "A camada de embedding troca cada id por uma linha de uma matriz |V| × d aprendida no treino. Tokens usados em contextos parecidos terminam com vetores parecidos, e a similaridade de cosseno mede essa proximidade.",
        "O vetor de entrada é o mesmo para um token em qualquer frase. Ele ainda não sabe a posição do token, assunto da próxima aula, nem o contexto, que entra pelas camadas de attention.",
      ],
      keyIdea: "Embedding de token: uma linha aprendida por id, com geometria que reflete o uso das palavras.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [{ id: "space", piece: "vector-space", points: pointsFrom(trained), query: "gato", neighbors: 2 }],
      },
      alt: "Resumo: o espaço treinado, com gato e os seus dois vizinhos mais próximos em destaque.",
    },
  ],
  realWorldExample:
    "Um time de e-commerce usa as linhas da tabela de embeddings de um modelo pequeno para agrupar termos de busca. Consultas como “tênis corrida” e “calçado esportivo” têm tokens com vetores próximos e caem no mesmo grupo, o que melhora as sugestões de busca. O mesmo time descobre o limite do método com “manga”: a fruta e a manga da camisa têm o mesmo vetor de token, e as sugestões misturam os dois. Para separar sentidos, ele passa a usar um modelo de embedding de texto, que lê a frase inteira e produz um vetor contextual. Esse é o assunto do módulo 06.",
  code: {
    language: "python",
    caption:
      "A camada nn.Embedding do PyTorch é uma matriz |V| × d. Passar ids busca as linhas, o que equivale a multiplicar o one-hot pela matriz.",
    source: `import torch
import torch.nn as nn
import torch.nn.functional as F

vocab_size, d_model = 50_257, 768
embedding = nn.Embedding(vocab_size, d_model)  # matriz |V| × d, inicializada aleatoriamente
print(embedding.weight.shape)                   # torch.Size([50257, 768])

ids = torch.tensor([[17, 412, 9031]])           # um lote com 3 ids de token
vectors = embedding(ids)                        # busca as linhas 17, 412 e 9031
print(vectors.shape)                            # torch.Size([1, 3, 768])

# A busca é o mesmo que multiplicar o one-hot pela matriz, sem materializar o one-hot.
one_hot = F.one_hot(ids, vocab_size).float()
assert torch.allclose(one_hot @ embedding.weight, vectors)

# Semelhança entre dois tokens: cosseno entre as suas linhas.
print(F.cosine_similarity(vectors[0, 1], vectors[0, 2], dim=0))`,
  },
  tradeOffs: {
    pros: [
      "Vetores densos generalizam: o que o modelo aprende sobre um token vale em parte para os vizinhos",
      "A busca de linha é barata, mesmo com vocabulários grandes",
      "A geometria aprendida permite medir semelhança com operações simples, como o cosseno",
    ],
    cons: [
      "O vetor de entrada é estático: palavras com vários sentidos dividem uma linha só",
      "Os vetores herdam vieses e lacunas do corpus de treino",
      "A tabela custa |V| × d parâmetros, e tokens raros ficam mal treinados",
    ],
    alternatives: [
      "Vetores contextuais, tirados das camadas internas de um Transformer",
      "Modelos de embedding de texto, que produzem um vetor por frase ou documento (módulo 06)",
    ],
  },
  knowledgeCheck: [
    {
      id: "embedding-lookup",
      prompt: "O que a camada de embedding faz com o id 412?",
      options: [
        "Converte 412 em binário",
        "Devolve a linha 412 da matriz de embeddings, um vetor de d números",
        "Divide 412 pelo tamanho do vocabulário",
        "Procura o token mais parecido com 412",
      ],
      correct: 1,
      explanation:
        "A camada é uma tabela |V| × d. O id seleciona uma linha, que é o vetor do token. Equivale a multiplicar o one-hot pela matriz.",
      lesson: "03-05",
    },
    {
      id: "why-close",
      prompt: "Por que “gato” e “cachorro” terminam com vetores próximos?",
      options: [
        "Porque alguém os rotulou como animais",
        "Porque têm ids próximos",
        "Porque aparecem em contextos parecidos, e o treino de previsão aproxima os seus vetores",
        "Porque têm o mesmo número de letras",
      ],
      correct: 2,
      explanation:
        "Os vetores são ajustados para prever bem o próximo token. Tokens que aparecem em contextos parecidos recebem ajustes parecidos.",
      lesson: "03-05",
    },
    {
      id: "static-banco",
      prompt: "Na entrada de um Transformer, “banco” em “sentei no banco” e em “abri conta no banco” tem:",
      options: [
        "O mesmo vetor, porque a camada de embedding só olha o id",
        "Vetores diferentes, porque a camada de embedding lê a frase",
        "Nenhum vetor, porque é uma palavra ambígua",
        "Um vetor sorteado a cada frase",
      ],
      correct: 0,
      explanation:
        "O embedding de entrada é estático. A diferença entre os sentidos aparece depois, quando as camadas de attention misturam o vetor com o contexto.",
      lesson: "03-05",
    },
  ],
  related: ["03-03", "03-06", "03-08", "06-01", "06-06"],
  references: [
    {
      title: "Mikolov et al. (2013), Efficient Estimation of Word Representations in Vector Space",
      url: "https://arxiv.org/abs/1301.3781",
      kind: "paper",
    },
    {
      title: "Mikolov et al. (2013), Distributed Representations of Words and Phrases and their Compositionality",
      url: "https://arxiv.org/abs/1310.4546",
      kind: "paper",
    },
    {
      title: "Pennington, Socher e Manning (2014), GloVe: Global Vectors for Word Representation",
      url: "https://aclanthology.org/D14-1162/",
      kind: "paper",
    },
    {
      title: "Bolukbasi et al. (2016), Man is to Computer Programmer as Woman is to Homemaker?",
      url: "https://arxiv.org/abs/1607.06520",
      kind: "paper",
    },
    {
      title: "PyTorch: torch.nn.Embedding",
      url: "https://pytorch.org/docs/stable/generated/torch.nn.Embedding.html",
      kind: "docs",
    },
  ],
};

export default lesson;
