import { softmax } from "../../../lab/attention";
import type { LessonContent } from "../../../types/content";

// Saídas estruturadas com contas no arquivo: seis respostas de exemplo escritas à mão passam por
// JSON.parse e por uma checagem do schema; a fração de tokens que o schema força numa resposta; e a
// decodificação restrita, que zera os tokens fora do enum e renormaliza os que sobram (logits à mão).

const percent = (value: number) => `${Math.round(value * 100)}%`;

const SENTIMENTS = ["positivo", "negativo", "neutro"];

interface Review {
  sentimento: string;
  nota: number;
  resumo: string;
}

const tryParse = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

const followsSchema = (value: unknown): value is Review => {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.sentimento === "string" &&
    SENTIMENTS.includes(record.sentimento) &&
    Number.isInteger(record.nota) &&
    typeof record.resumo === "string"
  );
};

// Passo 2: seis saídas pedidas “em JSON” só no prompt.
const outputs = [
  { label: "certo", text: '{"sentimento": "positivo", "nota": 5, "resumo": "Entrega rápida"}' },
  { label: "cerca ```", text: '```json\n{"sentimento": "negativo", "nota": 1, "resumo": "Quebrou"}\n```' },
  { label: "texto antes", text: 'Claro! Aqui está: {"sentimento": "neutro", "nota": 3, "resumo": "Ok"}' },
  { label: "vírgula final", text: '{"sentimento": "positivo", "nota": 4, "resumo": "Bom",}' },
  { label: "fora do enum", text: '{"sentimento": "misto", "nota": 3, "resumo": "Bom, mas atrasou"}' },
  { label: "nota em texto", text: '{"sentimento": "negativo", "nota": "2", "resumo": "Demorou"}' },
];
const parsed = outputs.map((output) => tryParse(output.text));
const parseOk = parsed.filter((value) => value !== undefined).length;
const schemaOk = parsed.filter(followsSchema).length;

// Passo 3: numa resposta com schema, quase todos os tokens são forçados.
const generated = ['{"', "sentimento", '":"', "positivo", '","', "nota", '":', "5", "}"];
const freeIndices = [3, 7];
const forcedShare = (generated.length - freeIndices.length) / generated.length;

// Passo 4: depois de {"sentimento":", o próximo token.
const candidates = ["positivo", "negativo", "neutro", "misto", "Positivo", "bom"];
const before = softmax([2.2, 0.4, 1.5, 1.9, 1.0, 0.8]);
const allowed = candidates.map((token) => SENTIMENTS.includes(token));
const allowedMass = before.reduce((sum, value, index) => (allowed[index] ? sum + value : sum), 0);
const after = before.map((value, index) => (allowed[index] ? value / allowedMass : 0));
const MISTO = candidates.indexOf("misto");

const lesson: LessonContent = {
  id: "05-08",
  subtitle: "Como fazer o modelo devolver JSON que o código consegue ler sempre, do pedido no prompt até a decodificação restrita por schema.",
  objectives: [
    "Explicar por que pedir “responda em JSON” não basta para produção",
    "Descrever uma saída com JSON Schema: tipos, enum e campos obrigatórios",
    "Entender como a decodificação restrita garante o formato token a token",
    "Ordenar campos para não perder qualidade e tratar recusas e validação",
  ],
  steps: [
    {
      id: "for-code",
      shortTitle: "Para código",
      title: "Texto para pessoas, JSON para código",
      tag: "context",
      body: [
        "Uma pessoa entende “Achei positivo, nota 5, a entrega foi rápida”. Um programa, não: ele precisa de um campo sentimento, um número nota e um texto resumo, sempre com os mesmos nomes. Quando a saída do modelo vai para um banco de dados, uma fila ou uma tela, ela é uma interface entre sistemas, e interfaces precisam de contrato.",
        "Uma [[saída estruturada|structured-output]] é esse contrato: o modelo devolve um JSON que segue uma forma combinada. Se uma resposta em mil vem fora da forma, o código quebra uma vez em mil, e em produção isso acontece todo dia.",
      ],
      keyIdea: "Quando a saída do modelo é lida por código, o formato é um contrato, não uma sugestão.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "llm", kind: "llm", label: "llm", col: 0, row: 0.5 },
              { id: "json", kind: "nosql-db", label: "json", col: 1, row: 0 },
              { id: "text", kind: "no-result", label: "texto solto", col: 1, row: 1 },
              { id: "app", kind: "app", label: "app: parse", col: 2, row: 0 },
              { id: "db", kind: "sql-db", label: "banco", col: 3, row: 0 },
            ],
            edges: [
              { from: "llm", to: "json", label: "contrato" },
              { from: "llm", to: "text", label: "sem contrato", variant: "alternative" },
              { from: "json", to: "app" },
              { from: "app", to: "db", label: "campos" },
            ],
            active: "json",
          },
        ],
      },
      alt: "O LLM devolve JSON, em destaque, que o app lê e grava em campos no banco; sem contrato, pelo caminho tracejado, sai texto solto que o código não consegue ler.",
    },
    {
      id: "just-asking",
      shortTitle: "Só pedir",
      title: "Pedir “responda em JSON” não basta",
      tag: "example",
      body: [
        `As seis respostas da cena foram escritas à mão, mas cada uma é um tipo de falha real de quem só pede JSON no prompt. O código passou todas por JSON.parse: ${parseOk} de ${outputs.length} são JSON válido. A cerca \`\`\`json, o “Claro! Aqui está:” e a vírgula final quebram o parse.`,
        `Depois, a checagem do schema aprova só ${schemaOk} de ${outputs.length}: as outras não têm os campos certos com os tipos certos. “misto” não é um sentimento permitido, e “2” entre aspas é texto, não número. Pedir no prompt melhora a chance; não garante a forma.`,
      ],
      keyIdea: "JSON pedido só no prompt falha de dois jeitos: não ser JSON válido, ou ser JSON com a forma errada.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "checks",
            piece: "metrics-panel",
            metrics: [
              { id: "parse", label: "JSON válido", value: `${parseOk} de ${outputs.length}`, color: "info" },
              { id: "schema", label: "segue o schema", value: `${schemaOk} de ${outputs.length}`, color: "danger" },
            ],
            highlight: "schema",
          },
          {
            id: "outputs",
            piece: "token-stream",
            tokens: outputs.map((output) => output.label),
            bars: parsed.map((value) => (followsSchema(value) ? 1 : value !== undefined ? 0.5 : 0.1)),
            color: "module-05",
          },
        ],
      },
      alt: `Seis respostas pedidas em JSON: ${outputs.map((output) => output.label).join(", ")}. ${parseOk} são JSON válido e ${schemaOk} segue o schema; as barras mostram quem passou no parse e no schema.`,
    },
    {
      id: "schema",
      shortTitle: "Schema",
      title: "O schema descreve a forma",
      tag: "mechanism",
      body: [
        `Um [[JSON Schema|json-schema]] declara o contrato: sentimento é string com enum ${SENTIMENTS.join(", ")}; nota é inteiro; resumo é string; os três são obrigatórios e nenhum outro campo é aceito. Os provedores aceitam o schema na requisição, e o mesmo schema valida a resposta no seu código.`,
        `Repare na resposta da cena: dos ${generated.length} tokens, só ${freeIndices.length} são escolhas de verdade (o sentimento e a nota). Os outros, ${percent(forcedShare)}, são chaves, aspas e dois-pontos que o schema já determina. Quando o schema é conhecido na geração, essa estrutura não precisa ser adivinhada: ela pode ser imposta.`,
      ],
      keyIdea: "Com um schema, a estrutura do JSON é determinada; o modelo só escolhe os valores.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "forced",
            piece: "token-stream",
            tokens: generated,
            keys: freeIndices,
            bars: generated.map((_, index) => (freeIndices.includes(index) ? 1 : 0.2)),
            color: "module-05",
          },
        ],
      },
      alt: `Os ${generated.length} tokens de uma resposta JSON; só ${freeIndices.length}, “positivo” e “5”, são escolhas livres, com barras altas; os outros ${percent(forcedShare)} são estrutura determinada pelo schema.`,
    },
    {
      id: "constrained",
      shortTitle: "Restrita",
      title: "Decodificação restrita: zerar o proibido",
      tag: "mechanism",
      body: [
        `Na [[decodificação restrita|constrained-decoding]], o servidor acompanha o schema enquanto o modelo gera. Depois de {"sentimento": ", o modelo daria ${percent(before[MISTO])} de chance a “misto”. Mas “misto” não está no enum, então recebe probabilidade zero, assim como “Positivo” com maiúscula e “bom”.`,
        `A massa que sobra, ${percent(allowedMass)}, é renormalizada entre os três permitidos: “positivo” fica com ${percent(after[0])}. Willard e Louf (2023) mostraram como fazer isso de forma eficiente, transformando a gramática num autômato que diz, a cada estado, quais tokens do vocabulário são válidos. Com isso, a resposta segue o schema por construção.`,
      ],
      keyIdea: "A cada passo, tokens que quebrariam o schema recebem probabilidade zero; o sorteio acontece só entre os válidos.",
      scene: {
        kind: "pieces",
        layout: "row",
        pieces: [
          {
            id: "before",
            piece: "chart",
            kind: "bar",
            series: candidates.map((label, index) => ({ label, value: Number(before[index].toFixed(3)) })),
            max: 1,
            highlight: MISTO,
            color: "danger",
          },
          {
            id: "after",
            piece: "chart",
            kind: "bar",
            series: candidates.map((label, index) => ({ label, value: Number(after[index].toFixed(3)) })),
            max: 1,
            highlight: 0,
            color: "success",
          },
        ],
      },
      alt: `Antes da restrição: ${candidates.map((token, index) => `${token} ${percent(before[index])}`).join(", ")}. Depois, só o enum sobra: ${candidates.filter((_, index) => allowed[index]).map((token) => `${token} ${percent(after[candidates.indexOf(token)])}`).join(", ")}.`,
    },
    {
      id: "pitfalls",
      shortTitle: "Cuidados",
      title: "Formato garantido, conteúdo não",
      tag: "tradeoff",
      body: [
        "O schema garante a forma, não a verdade: o modelo pode devolver um JSON perfeito com o sentimento errado. E a ordem dos campos importa, porque o modelo gera da esquerda para a direita. Se a resposta vem antes de um campo de raciocínio, ela é decidida sem raciocínio. Coloque um campo como “justificativa” antes do campo de resposta.",
        "Tam et al. (2024) observaram queda de qualidade em tarefas de raciocínio quando o formato é muito restrito. E há casos fora do caminho feliz: o modelo pode recusar o pedido, e a API sinaliza a recusa à parte, ou a resposta pode ser cortada pelo limite de tokens. O código precisa tratar recusa, corte e validação de regras de negócio.",
      ],
      keyIdea: "Schema garante forma; raciocínio antes da resposta, validação de negócio e tratamento de recusa garantem o resto.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "llm", kind: "llm", label: "llm + schema", col: 0, row: 0.5 },
              { id: "json", kind: "nosql-db", label: "justificativa → resposta", col: 1, row: 0.5 },
              { id: "guard", kind: "guardrail", label: "regras de negócio", col: 2, row: 0.5 },
              { id: "db", kind: "sql-db", label: "banco", col: 3, row: 0 },
              { id: "refusal", kind: "no-result", label: "recusa ou corte", col: 3, row: 1 },
            ],
            edges: [
              { from: "llm", to: "json" },
              { from: "json", to: "guard" },
              { from: "guard", to: "db", label: "válido" },
              { from: "guard", to: "refusal", label: "tratar", variant: "alternative" },
            ],
            active: "guard",
          },
        ],
      },
      alt: "O LLM com schema gera um JSON com a justificativa antes da resposta; uma validação de regras de negócio, em destaque, manda o válido para o banco e, pelo caminho tracejado, trata recusas e respostas cortadas.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Três níveis de garantia",
      tag: "summary",
      body: [
        "Há três níveis. Pedir JSON no prompt aumenta a chance. O modo JSON garante JSON válido, mas não a sua forma. O schema estrito, com decodificação restrita, garante a forma por construção. Em todos, o conteúdo continua sendo responsabilidade de quem valida.",
        "Um prompt que pede JSON com schema, exemplos e regras já é um pedaço de software. A próxima aula trata o prompt como código: templates com variáveis, versionados e testados.",
      ],
      keyIdea: "Prompt pede, JSON mode garante sintaxe, schema estrito garante forma; validação garante o negócio.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "levels",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "ask", label: "pedir no prompt: talvez" },
              { id: "mode", label: "JSON mode: sintaxe válida" },
              { id: "strict", label: "schema estrito: forma garantida", color: "module-05" },
              { id: "validate", label: "validar o negócio", color: "success" },
            ],
          },
        ],
      },
      alt: "Fluxo em chips: pedir no prompt, que talvez funcione; JSON mode, que garante sintaxe válida; schema estrito, que garante a forma; e validar as regras de negócio.",
    },
  ],
  realWorldExample:
    "Em agosto de 2024, a OpenAI lançou Structured Outputs: com strict: true, a resposta segue o JSON Schema enviado, por meio de decodificação restrita, e uma recusa do modelo chega num campo próprio. Bibliotecas abertas como Outlines e o modo de gramáticas do llama.cpp fazem o mesmo em modelos que você hospeda.",
  code: {
    language: "json",
    source: `{
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "avaliacao",
      "strict": true,
      "schema": {
        "type": "object",
        "properties": {
          "justificativa": { "type": "string" },
          "sentimento": { "type": "string", "enum": ["positivo", "negativo", "neutro"] },
          "nota": { "type": "integer" },
          "resumo": { "type": "string" }
        },
        "required": ["justificativa", "sentimento", "nota", "resumo"],
        "additionalProperties": false
      }
    }
  }
}`,
    caption: "Trecho de requisição com schema estrito: enum para o sentimento, inteiro para a nota, todos os campos obrigatórios e a justificativa antes da resposta.",
  },
  tradeOffs: {
    pros: [
      "O código lê a saída sem regex nem adivinhação",
      "Schema estrito elimina erros de sintaxe e de forma",
      "O mesmo schema documenta o contrato e valida a resposta",
    ],
    cons: [
      "Forma garantida não é conteúdo certo",
      "Formatos muito restritos podem piorar tarefas de raciocínio",
      "Nem todo recurso de JSON Schema é aceito por todo provedor",
    ],
    alternatives: ["Tool calling, quando a saída é uma ação com argumentos", "Validação com retry, em provedores sem schema estrito"],
  },
  knowledgeCheck: [
    {
      id: "json-mode-limit",
      prompt: "Com o modo JSON ligado, o modelo devolve {\"sentiment\": \"positive\"} e o código espera {\"sentimento\": \"positivo\"}. O que faltou?",
      options: [
        "Nada, o modo JSON garante os nomes dos campos",
        "Um schema estrito com os nomes dos campos e o enum dos valores",
        "Temperatura zero",
        "Um modelo maior",
      ],
      correct: 1,
      explanation: "O modo JSON só garante JSON válido. Nomes de campos, tipos e valores permitidos precisam de um schema, de preferência imposto na geração.",
      lesson: "05-08",
    },
    {
      id: "field-order",
      prompt: "O schema tem os campos {\"resposta\", \"raciocinio\"}, nessa ordem. Por que isso pode piorar a qualidade?",
      options: [
        "JSON não aceita dois campos de texto",
        "O modelo gera da esquerda para a direita: a resposta é decidida antes de o raciocínio ser escrito",
        "O raciocínio fica cortado sempre",
        "Não piora, a ordem dos campos é irrelevante",
      ],
      correct: 1,
      explanation: "A geração é sequencial. Com o raciocínio depois, a resposta não se beneficia dele; coloque o campo de raciocínio antes.",
      lesson: "05-08",
    },
  ],
  related: ["05-07", "05-09", "05-10"],
  references: [
    { title: "OpenAI: Structured Outputs", url: "https://platform.openai.com/docs/guides/structured-outputs", kind: "docs" },
    { title: "JSON Schema", url: "https://json-schema.org/", kind: "docs" },
    { title: "Willard & Louf (2023), Efficient Guided Generation for Large Language Models", url: "https://arxiv.org/abs/2307.09702", kind: "paper" },
  ],
};

export default lesson;
