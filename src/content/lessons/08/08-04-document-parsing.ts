import type { LessonContent } from "../../../types/content";

// Parsing de documentos com contas no arquivo. Passos 2 e 3: uma página de PDF em duas colunas lida
// linha a linha atravessando a página (extração ingênua) e coluna a coluna, e a contagem de transições
// quebradas, em que a linha seguinte não continua a anterior. Passo 4: uma tabela de reembolso achatada
// em texto e serializada linha a linha. Passo 5: a distância de edição (Levenshtein) entre o texto
// real e a saída de um OCR, para calcular a taxa de erro por caractere e por palavra.

const percent = (value: number) => `${Math.round(value * 100)}%`;

// Passos 2 e 3: as duas colunas da página.
const left = ["Férias podem ser", "divididas em até", "três períodos."];
const right = ["O reembolso exige", "nota fiscal e", "aprovação do gestor."];
const readingOrder = [...left, ...right];
const naiveOrder = left.flatMap((line, index) => [line, right[index]]);
/** Transições em que a linha seguinte não é a continuação da anterior na ordem de leitura real. */
const brokenTransitions = (order: string[]) =>
  order.slice(0, -1).filter((line, index) => readingOrder[readingOrder.indexOf(line) + 1] !== order[index + 1]).length;
const naiveBroken = brokenTransitions(naiveOrder);
const fixedBroken = brokenTransitions(readingOrder);
const transitions = readingOrder.length - 1;
const rightIndexes = (order: string[]) => order.map((line, index) => (right.includes(line) ? index : -1)).filter((index) => index >= 0);

// Passo 4: a tabela de limites de reembolso.
const categories = ["táxi", "refeição", "hotel"];
const columns = ["limite (R$)", "prazo (dias)"];
const table = [
  [100, 30],
  [60, 30],
  [400, 15],
];
const HOTEL = 2;
const flattened = ["categoria", ...columns, ...categories.flatMap((category, row) => [category, ...table[row].map(String)])].join(" ");
const flattenedLastRow = [categories[HOTEL], ...table[HOTEL].map(String)].join(" ");
const serialize = (row: number) =>
  `${categories[row]}: ${columns.map((column, col) => `${column} ${table[row][col]}`).join(", ")}`;

// Passo 5: OCR de uma linha escaneada.
const TRUTH = "Reembolso até R$ 150,00";
const OCR_OUTPUT = "Reemb0lso ate R$ 15O,00";
function levenshtein(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = previous[j];
      previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return previous[b.length];
}
const edits = levenshtein(TRUTH, OCR_OUTPUT);
const cer = edits / TRUTH.length;
const truthWords = TRUTH.split(" ");
const ocrWords = OCR_OUTPUT.split(" ");
const wrongWords = truthWords.filter((word, index) => word !== ocrWords[index]);
const wer = wrongWords.length / truthWords.length;

const lesson: LessonContent = {
  id: "08-04",
  subtitle: "Como tirar texto confiável de PDFs, tabelas e páginas escaneadas, na ordem certa, antes de dividir em chunks.",
  objectives: [
    "Explicar por que um PDF guarda posições de letras, e não parágrafos",
    "Reconhecer a ordem de leitura quebrada em páginas com colunas",
    "Serializar tabelas para que cada número mantenha o seu cabeçalho",
    "Medir a qualidade de um OCR com a taxa de erro por caractere",
  ],
  steps: [
    {
      id: "not-text",
      shortTitle: "PDF ≠ texto",
      title: "Um PDF é um desenho da página",
      tag: "context",
      body: [
        "Um PDF não guarda “parágrafos”: guarda instruções do tipo “desenhe a letra F na posição x, y”. Para quem olha a tela, é uma página bonita. Para um programa, é uma sopa de letras com coordenadas, e alguém precisa reconstruir as palavras, as linhas e a ordem de leitura.",
        "Esse trabalho é o [[parsing de documentos|document-parsing]]: transformar PDF, DOCX ou HTML em texto limpo e estruturado, separando títulos, parágrafos, listas e tabelas. Tudo o que vem depois, do [[chunk|chunk]] à resposta, herda os erros desta etapa.",
      ],
      keyIdea: "Texto mal extraído vira chunk ruim, embedding ruim e resposta ruim: o parsing é a fundação do RAG.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "pdf", kind: "documents", label: "política.pdf", col: 0, row: 0 },
              { id: "parser", kind: "tool", label: "parser", col: 1, row: 0 },
              { id: "text", kind: "tokens", label: "texto e tabelas", col: 2, row: 0 },
            ],
            edges: [
              { from: "pdf", to: "parser", label: "letras + x, y" },
              { from: "parser", to: "text", label: "elementos" },
            ],
            active: "parser",
          },
        ],
      },
      alt: "Um PDF de política entra no parser, em destaque, como letras com coordenadas, e sai como texto e tabelas.",
    },
    {
      id: "naive-order",
      shortTitle: "Ordem errada",
      title: "Duas colunas lidas como uma",
      tag: "mechanism",
      body: [
        "Imagine ler um jornal atravessando a página: a primeira linha da coluna da esquerda, depois a primeira da direita, depois a segunda da esquerda. Cada frase vira uma colagem de dois assuntos. Um extrator que só ordena as linhas pela altura na página faz exatamente isso.",
        `Na página da cena, as férias estão à esquerda e o reembolso à direita. A leitura ingênua intercala as linhas, e ${naiveBroken} das ${transitions} transições ficam quebradas: nenhuma linha continua a anterior. Um chunk feito desse texto mistura férias e nota fiscal, e o embedding dele não fica perto de nenhuma das duas perguntas.`,
      ],
      keyIdea: "Ordenar linhas só pela altura destrói páginas com colunas.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "order",
            piece: "metrics-panel",
            metrics: [
              { id: "broken", label: "transições quebradas", value: `${naiveBroken} de ${transitions}`, color: "danger" },
              { id: "columns", label: "colunas na página", value: "2" },
            ],
            highlight: "broken",
          },
          { id: "page", piece: "token-stream", tokens: naiveOrder, keys: rightIndexes(naiveOrder), color: "module-08" },
        ],
      },
      alt: `As seis linhas na ordem ingênua, alternando a coluna das férias e a do reembolso, em destaque. ${naiveBroken} de ${transitions} transições ficam quebradas.`,
    },
    {
      id: "layout",
      shortTitle: "Layout",
      title: "Detectar as colunas antes de ler",
      tag: "mechanism",
      body: [
        "Quem lê jornal olha primeiro o desenho da página: onde começa cada coluna, onde está a foto, onde está a tabela. Só depois lê, coluna por coluna. Um parser com análise de layout faz o mesmo: agrupa as letras em blocos pelas coordenadas x e y e define a ordem entre os blocos.",
        `Com as colunas detectadas, a ordem vira esquerda inteira e depois direita inteira, e as transições quebradas caem de ${naiveBroken} para ${fixedBroken}. Ferramentas de layout também marcam o tipo de cada bloco (título, parágrafo, lista, tabela, rodapé), o que ajuda a descartar cabeçalhos repetidos e a cortar chunks nos títulos.`,
      ],
      keyIdea: "Primeiro o layout, depois o texto: blocos e ordem de leitura vêm antes das palavras.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "order",
            piece: "metrics-panel",
            metrics: [
              { id: "broken", label: "transições quebradas", value: `${fixedBroken} de ${transitions}`, color: "success" },
              { id: "columns", label: "colunas na página", value: "2" },
            ],
            highlight: "broken",
          },
          { id: "page", piece: "token-stream", tokens: readingOrder, keys: rightIndexes(readingOrder), color: "module-08" },
        ],
      },
      alt: "As seis linhas na ordem certa: as três das férias e depois as três do reembolso, em destaque. Nenhuma transição quebrada.",
    },
    {
      id: "tables",
      shortTitle: "Tabelas",
      title: "Uma tabela achatada perde os cabeçalhos",
      tag: "mechanism",
      body: [
        `Achatada em texto, a tabela de reembolso vira “${flattened}”. Se um chunk começar no meio, ele fica com “${flattenedLastRow}”: três palavras sem sentido. ${table[HOTEL][0]} o quê? ${table[HOTEL][1]} o quê? O cabeçalho ficou em outro chunk.`,
        `A saída é serializar cada linha com os cabeçalhos: “${serialize(HOTEL)}”. Assim qualquer linha sozinha ainda responde “qual o limite do hotel?”. Outra opção é guardar a tabela inteira em Markdown ou HTML como um único chunk, quando ela é pequena. Parsers com detecção de tabela devolvem as células já separadas, o que torna essa serialização possível.`,
      ],
      keyIdea: "Cada número precisa viajar junto do nome da linha e da coluna, senão ele não responde nada.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "table",
            piece: "matrix",
            rows: categories,
            cols: columns,
            values: table,
            highlight: { row: HOTEL, col: 0 },
            showValues: true,
            color: "module-08",
          },
        ],
      },
      alt: `Tabela de reembolso com ${categories.length} categorias e as colunas ${columns.join(" e ")}. O limite do hotel, ${table[HOTEL][0]}, está em destaque.`,
    },
    {
      id: "ocr",
      shortTitle: "Escaneado",
      title: "Página escaneada: pixels, não letras",
      tag: "example",
      body: [
        `Uma política assinada e escaneada é só uma foto: não tem nenhuma letra para extrair. O caminho é o [[OCR|ocr]], que reconhece caracteres na imagem. Ele erra como quem lê uma xerox ruim: “${TRUTH}” sai “${OCR_OUTPUT}”.`,
        `A distância de edição entre os dois é ${edits}: a taxa de erro por caractere é ${edits} / ${TRUTH.length} = ${percent(cer)}. Parece pouco, mas ${wrongWords.length} das ${truthWords.length} palavras saíram erradas (${percent(wer)} por palavra), e uma busca por “150,00” não acha mais nada. Por isso o roteamento da cena só manda para o OCR as páginas sem camada de texto, e vale medir o OCR numa amostra antes de indexar milhares de páginas.`,
      ],
      keyIdea: "Um erro pequeno por caractere vira um erro grande por palavra, e é por palavra que a busca falha.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "ocr-metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "edits", label: "edições", value: String(edits) },
              { id: "cer", label: "erro por caractere", value: percent(cer) },
              { id: "wer", label: "erro por palavra", value: percent(wer), color: "danger" },
            ],
            highlight: "wer",
          },
          {
            id: "route",
            piece: "block-diagram",
            blocks: [
              { id: "pdf", kind: "documents", label: "pdf", col: 0, row: 0.5 },
              { id: "parser", kind: "tool", label: "camada de texto", col: 1, row: 0 },
              { id: "ocr", kind: "tool", label: "ocr", col: 1, row: 1 },
              { id: "text", kind: "tokens", label: "texto", col: 2, row: 0.5 },
            ],
            edges: [
              { from: "pdf", to: "parser", label: "tem texto" },
              { from: "pdf", to: "ocr", label: "escaneado", variant: "alternative" },
              { from: "parser", to: "text" },
              { from: "ocr", to: "text" },
            ],
            active: "ocr",
          },
        ],
      },
      alt: `Painel do OCR: ${edits} edições, ${percent(cer)} de erro por caractere e ${percent(wer)} por palavra. Abaixo, o PDF vai para a camada de texto quando tem texto e, pelo caminho tracejado, para o OCR, em destaque, quando é escaneado.`,
    },
    {
      id: "choices",
      shortTitle: "Escolhas",
      title: "Rápido, com layout ou com OCR",
      tag: "tradeoff",
      body: [
        "Não dá para ler tudo com lupa: custa caro e demora. Um bom pipeline começa pela extração rápida da camada de texto, confere o resultado e só gasta mais onde precisa.",
        "A extração rápida (como a do pypdf) lê o texto em milissegundos, mas não entende colunas nem tabelas. A análise de layout usa um modelo de detecção sobre a imagem da página: acerta a estrutura, mas é bem mais lenta. O OCR é o último recurso, para páginas sem texto. Uma checagem simples entre as etapas, como página com quase nenhum caractere, decide quem segue para a etapa cara.",
      ],
      keyIdea: "Escale o parser por página: rápido por padrão, layout quando há estrutura, OCR quando não há texto.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "choices",
            piece: "pipeline",
            stages: [
              { id: "fast", label: "extração rápida" },
              { id: "check", label: "checar página" },
              { id: "layout", label: "layout e tabelas", color: "module-08" },
              { id: "elements", label: "elementos" },
            ],
            active: "layout",
            done: ["fast", "check"],
            branch: { id: "ocr", label: "ocr", from: "check", edgeLabel: "sem texto" },
          },
        ],
      },
      alt: "Pipeline: extração rápida, checar página, layout e tabelas, em destaque, e elementos. Da checagem sai um ramo tracejado para o OCR quando a página não tem texto.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Elementos limpos, prontos para o chunking",
      tag: "summary",
      body: [
        "O parser transforma cada página em elementos na ordem de leitura: títulos, parágrafos, listas e tabelas serializadas, com o número da página guardado para a citação. Páginas sem texto passam pelo OCR, e a qualidade de cada etapa é medida numa amostra.",
        "Com os elementos em mãos, falta decidir onde cortar. A próxima aula compara as estratégias de chunking: tamanho fixo, por estrutura, recursivo e semântico.",
      ],
      keyIdea: "Saída do parsing = elementos tipados, em ordem, com página e fonte.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "pdf", kind: "documents", label: "política.pdf", col: 0, row: 0 },
              { id: "parser", kind: "tool", label: "parser", col: 1, row: 0 },
              { id: "ocr", kind: "tool", label: "ocr", col: 1, row: 1 },
              { id: "text", kind: "tokens", label: "texto e tabelas", col: 2, row: 0 },
              { id: "chunks", kind: "queue", label: "para o chunking", col: 3, row: 0 },
            ],
            edges: [
              { from: "pdf", to: "parser", label: "letras + x, y" },
              { from: "pdf", to: "ocr", label: "escaneado", variant: "alternative" },
              { from: "parser", to: "text", label: "elementos" },
              { from: "ocr", to: "text" },
              { from: "text", to: "chunks" },
            ],
            active: "chunks",
            done: ["pdf", "parser", "ocr", "text"],
          },
        ],
      },
      alt: "O PDF passa pelo parser, ou pelo OCR quando é escaneado, vira texto e tabelas e segue para o chunking, em destaque.",
    },
  ],
  realWorldExample:
    "A biblioteca Unstructured divide um PDF em elementos tipados, como Title, NarrativeText, ListItem e Table, e oferece estratégias de partição: fast lê a camada de texto, hi_res usa um modelo de layout e ocr_only passa tudo pelo OCR. O Tesseract, motor de OCR de código aberto, tem modelo treinado para português.",
  code: {
    language: "python",
    source: `from pdf2image import convert_from_path
from pypdf import PdfReader
import pytesseract

def extract_pages(path: str) -> list[str]:
    pages = []
    for number, page in enumerate(PdfReader(path).pages):
        text = page.extract_text() or ""
        if not text.strip():  # página escaneada: sem camada de texto
            image = convert_from_path(path, first_page=number + 1, last_page=number + 1)[0]
            text = pytesseract.image_to_string(image, lang="por")
        pages.append(text)
    return pages`,
    caption: "Extração rápida com pypdf e OCR com Tesseract só nas páginas sem texto, como no roteamento da aula.",
  },
  tradeOffs: {
    pros: [
      "Parsing com layout preserva a ordem de leitura e as tabelas",
      "Elementos tipados permitem cortar chunks nos títulos e descartar rodapés",
      "OCR recupera conteúdo que de outro jeito ficaria invisível para a busca",
    ],
    cons: [
      "Análise de layout e OCR são muito mais lentos que a extração da camada de texto",
      "OCR introduz erros que quebram buscas por números e nomes",
      "Cada formato (PDF, DOCX, HTML, planilha) pede um parser e testes próprios",
    ],
    alternatives: [
      "Modelos multimodais que leem a imagem da página e devolvem Markdown",
      "Pedir a fonte original (DOCX, HTML) em vez do PDF exportado",
      "Indexar a página como imagem e recuperar por embeddings multimodais",
    ],
  },
  knowledgeCheck: [
    {
      id: "mixed-chunks",
      prompt: "Os chunks de um manual em duas colunas misturam frases de assuntos diferentes. Qual etapa corrigir primeiro?",
      options: [
        "Aumentar o overlap entre chunks",
        "Trocar o modelo de embedding",
        "Usar um parser com análise de layout, que lê coluna por coluna",
        "Aumentar o top-k da busca",
      ],
      correct: 2,
      explanation: "O texto já sai do parser na ordem errada. Nenhuma etapa depois conserta uma colagem de colunas; a correção é na ordem de leitura.",
      lesson: "08-04",
    },
    {
      id: "table-row",
      prompt: "A pergunta “qual o prazo do táxi?” recupera um chunk com “táxi 100 30”. O que melhora a resposta?",
      options: [
        "Serializar cada linha com os cabeçalhos: “táxi: limite (R$) 100, prazo (dias) 30”",
        "Remover os números da tabela",
        "Dividir a tabela em chunks de uma palavra",
        "Passar a tabela pelo OCR",
      ],
      correct: 0,
      explanation: "Sem os cabeçalhos, o modelo não sabe qual número é o prazo. Com cada linha serializada, o chunk responde sozinho.",
      lesson: "08-04",
    },
  ],
  related: ["08-03", "08-05", "04-09"],
  references: [
    { title: "Unstructured: documentação", url: "https://docs.unstructured.io/", kind: "docs" },
    { title: "Tesseract OCR", url: "https://github.com/tesseract-ocr/tesseract", kind: "repo" },
    { title: "pypdf: documentação", url: "https://pypdf.readthedocs.io/", kind: "docs" },
  ],
};

export default lesson;
