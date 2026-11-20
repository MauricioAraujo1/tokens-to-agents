import type { LessonContent } from "../../../types/content";

// Privacidade com as contas no arquivo. Seis mensagens de clientes (inventadas, com dados fictícios) passam por
// detectores de PII feitos com expressões regulares; o arquivo conta, por tipo, quantos dados existem (marcados à
// mão) e quantos os detectores acham, e pseudonimiza a primeira mensagem. Depois, uma matriz de permissões por
// papel e o volume de conversas guardadas por prazo de retenção (volume diário de brinquedo).

const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const percent = (value: number) => `${Math.round(value * 100)}%`;
const listing = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`);

// Passos 2 e 3: detectores por regex e as PII que de fato existem em cada mensagem.
const detectors = {
  cpf: /\d{3}\.\d{3}\.\d{3}-\d{2}/g,
  email: /[\w.+-]+@[\w-]+(\.[\w-]+)+/g,
  telefone: /\(\d{2}\) ?\d{4,5}-\d{4}/g,
  cartão: /\d{4}( \d{4}){3}/g,
};
type DetectedType = keyof typeof detectors;
const piiTypes = ["cpf", "email", "telefone", "cartão", "nome", "endereço"] as const;
type PiiType = (typeof piiTypes)[number];

const messages: Array<{ text: string; truth: PiiType[] }> = [
  { text: "Meu CPF é 123.456.789-09 e o e-mail ana.souza@exemplo.com", truth: ["cpf", "email"] },
  { text: "Liga no (11) 98765-4321 e fala com Ana Souza", truth: ["telefone", "nome"] },
  { text: "Cartão 4111 1111 1111 1111, validade 12/27", truth: ["cartão"] },
  { text: "Moro na Rua das Flores, 120, em Campinas", truth: ["endereço"] },
  { text: "Meu CPF sem pontos: 98765432100", truth: ["cpf"] },
  { text: "Pode mandar para joao@exemplo.com.br", truth: ["email"] },
];
const detect = (text: string) =>
  (Object.keys(detectors) as DetectedType[]).flatMap((type) => (text.match(detectors[type]) ?? []).map(() => type));
const found = messages.map((message) => detect(message.text));
const countOf = (lists: string[][], type: string) => lists.flat().filter((item) => item === type).length;
const truthCounts = piiTypes.map((type) => countOf(messages.map((message) => message.truth), type));
const foundCounts = piiTypes.map((type) => countOf(found, type));
const totalTruth = truthCounts.reduce((a, b) => a + b, 0);
const totalFound = foundCounts.reduce((a, b) => a + b, 0);
const recall = totalFound / totalTruth;
const missedTypes = piiTypes.filter((_, index) => foundCounts[index] < truthCounts[index]);

const pseudonymize = (text: string) => {
  const vault = new Map<string, string>();
  let output = text;
  for (const type of Object.keys(detectors) as DetectedType[]) {
    let counter = 0;
    output = output.replace(detectors[type], (match) => {
      counter += 1;
      const placeholder = `<${type.toUpperCase()}_${counter}>`;
      vault.set(placeholder, match);
      return placeholder;
    });
  }
  return { output, vault };
};
const first = pseudonymize(messages[0].text);

// Passo 4: quem pode ler cada coleção (1 = pode).
const roles = ["atendente", "analista de rh", "financeiro"];
const collections = ["manual do produto", "holerites", "contratos"];
const permissions = [
  [1, 0, 0],
  [1, 1, 0],
  [1, 0, 1],
];

// Passo 5: conversas guardadas por prazo de retenção.
const CONVERSATIONS_PER_DAY = 200_000;
const KB_PER_CONVERSATION = 8;
const retentionDays = [7, 30, 90, 180, 365];
const stored = (days: number) => CONVERSATIONS_PER_DAY * days;
const storedGb = (days: number) => (stored(days) * KB_PER_CONVERSATION) / 1_000_000;
const SHORT = 30;
const LONG = 365;

const lesson: LessonContent = {
  id: "16-12",
  subtitle: "Por onde os dados pessoais vazam num app com LLM, como detectar e mascarar PII antes do provedor e dos logs, quem pode recuperar o quê e por quanto tempo guardar.",
  objectives: [
    "Mapear os caminhos por onde dados pessoais saem num app com LLM",
    "Detectar, redigir e pseudonimizar PII, e medir o que os detectores deixam passar",
    "Aplicar controle de acesso na busca, antes de o dado chegar ao contexto",
    "Definir retenção e minimização de dados com base na LGPD e no GDPR",
  ],
  steps: [
    {
      id: "paths",
      shortTitle: "Caminhos",
      title: "Por onde o dado sai",
      tag: "context",
      body: [
        "Uma recepcionista de hospital não grita o diagnóstico do paciente na sala de espera, não anota o CPF num papel que fica no balcão e não entrega o prontuário a quem só pediu um horário. Um app com LLM tem as mesmas tentações, multiplicadas: cada mensagem pode carregar [[dados pessoais (PII)|pii]] e passa por vários lugares.",
        "O mesmo texto vai para o provedor do modelo, fica nos logs e nos traces (aula 16.08), pode ser indexado no banco vetorial e, se ninguém cuidar, vira dado de treino. E volta: tudo que está no contexto pode aparecer na resposta, inclusive para outro usuário. O OWASP Top 10 para aplicações com LLM lista a exposição de informação sensível entre os riscos principais.",
      ],
      keyIdea: "Cada cópia da mensagem é um lugar a proteger: provedor, logs, traces, índice e a própria resposta.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "paths",
            piece: "block-diagram",
            blocks: [
              { id: "phone", kind: "phone", label: "cliente", col: 0, row: 0.5 },
              { id: "api", kind: "server", label: "app", col: 1, row: 0.5 },
              { id: "provider", kind: "cloud", label: "provedor do llm", col: 2, row: 0 },
              { id: "logs", kind: "documents", label: "logs e traces", col: 2, row: 1 },
              { id: "index", kind: "vector-db", label: "índice vetorial", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "phone", to: "api", label: "cpf, e-mail..." },
              { from: "api", to: "provider", label: "prompt" },
              { from: "api", to: "logs", label: "cópia", variant: "alternative" },
              { from: "api", to: "index", label: "cópia", variant: "alternative" },
            ],
            active: "api",
          },
        ],
      },
      alt: "A mensagem do cliente com CPF e e-mail chega ao app, em destaque, que manda o prompt ao provedor do LLM e deixa cópias nos logs e traces e no índice vetorial.",
    },
    {
      id: "redaction",
      shortTitle: "Redação",
      title: "Mascarar antes de sair",
      tag: "mechanism",
      body: [
        "A [[redação|redaction]] troca cada dado pessoal por um marcador antes de a mensagem sair do seu servidor, como uma tarja preta num documento. Detectores simples usam expressões regulares para formatos fixos: CPF, e-mail, telefone, cartão. Para nomes e endereços, que não têm formato, entram modelos de reconhecimento de entidades.",
        `Na [[pseudonimização|pseudonymization]], o marcador é reversível para quem tem a chave. “${messages[0].text}” vira “${first.output}”, e o mapeamento fica num cofre do seu lado. O modelo responde usando os marcadores, e o app troca de volta antes de mostrar ao cliente. O provedor e os logs nunca veem o dado real, e a resposta continua útil.`,
      ],
      keyIdea: "Redija antes do provedor e dos logs; pseudonimize quando a resposta precisar do dado de volta.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "redact",
            piece: "block-diagram",
            blocks: [
              { id: "phone", kind: "phone", label: "cliente", col: 0, row: 0 },
              { id: "guard", kind: "guardrail", label: "redação", col: 1, row: 0 },
              { id: "provider", kind: "cloud", label: "provedor do llm", col: 2, row: 0 },
              { id: "vault", kind: "kv-cache", label: "cofre de marcadores", col: 1, row: 1 },
              { id: "answer", kind: "answer", label: "resposta restaurada", col: 3, row: 0 },
            ],
            edges: [
              { from: "phone", to: "guard" },
              { from: "guard", to: "provider", label: "<CPF_1>" },
              { from: "guard", to: "vault", label: "mapeamento" },
              { from: "provider", to: "answer", label: "troca de volta" },
            ],
            active: "guard",
          },
          { id: "tokens", piece: "token-stream", tokens: first.output.split(" "), keys: first.output.split(" ").map((word, index) => (word.startsWith("<") ? index : -1)).filter((index) => index >= 0), color: "module-16" },
        ],
      },
      alt: `A mensagem do cliente passa pela redação, em destaque, que manda ao provedor a versão com marcadores e guarda o mapeamento num cofre; a resposta é restaurada antes de chegar ao cliente. A mensagem redigida: ${first.output}.`,
    },
    {
      id: "counts",
      shortTitle: "Contagem",
      title: "O que a regex não vê",
      tag: "example",
      body: [
        `As ${messages.length} mensagens da cena têm ${totalTruth} dados pessoais, marcados à mão. Os quatro detectores por regex acham ${totalFound}, um recall de ${percent(recall)}. Os formatos fixos saem bem: e-mails, telefone e cartão. Ficam de fora: ${listing(missedTypes)}.`,
        "Cada falha ensina algo. O CPF escrito sem pontos escapa de uma regex que exige pontos; nome e endereço não têm formato nenhum. Ferramentas como o Microsoft Presidio combinam regex, validação de dígito verificador e modelos de entidades, e mesmo assim não chegam a 100%. Meça o detector como qualquer classificador, com mensagens reais rotuladas, e trate o que sobra com as outras camadas: retenção curta e acesso restrito.",
      ],
      keyIdea: "Detector de PII também tem recall: o que ele perde precisa de outra camada de proteção.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "pii",
            piece: "metrics-panel",
            metrics: [
              { id: "truth", label: "dados pessoais", value: String(totalTruth) },
              { id: "found", label: "detectados", value: String(totalFound) },
              { id: "recall", label: "recall", value: percent(recall), color: "danger" },
            ],
            highlight: "recall",
          },
          {
            id: "types",
            piece: "matrix",
            rows: [...piiTypes],
            cols: ["no texto", "detectados"],
            values: piiTypes.map((_, index) => [truthCounts[index], foundCounts[index]]),
            highlight: { row: piiTypes.indexOf("cpf"), col: 1 },
            showValues: true,
            color: "module-16",
          },
        ],
      },
      alt: `Dados pessoais por tipo, no texto e detectados: ${piiTypes.map((type, index) => `${type} ${truthCounts[index]} e ${foundCounts[index]}`).join("; ")}. Recall de ${percent(recall)}.`,
    },
    {
      id: "access",
      shortTitle: "Acesso",
      title: "O modelo não guarda segredo",
      tag: "mechanism",
      body: [
        "Se um trecho entra no contexto, o modelo pode repeti-lo, e nenhuma instrução no prompt garante o contrário. Por isso o controle de acesso acontece na busca, antes do contexto: o [[filtro de permissões|access-control-filter]] só deixa recuperar documentos que o usuário logado pode ler. Pela mesma razão, o system prompt não é lugar de segredo: chaves e regras internas ali podem vazar, risco que o OWASP lista à parte.",
        "A matriz mostra a política de um assistente interno: o atendente lê só o manual, o analista de RH lê holerites, o financeiro lê contratos. Os papéis vêm do sistema de identidade da empresa, não do que o usuário diz na conversa, e o filtro roda no banco vetorial com os metadados de cada chunk (aula 08.12).",
      ],
      keyIdea: "Filtre por permissão antes de recuperar: o que entra no contexto pode sair na resposta.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "permissions",
            piece: "matrix",
            rows: roles,
            cols: collections,
            values: permissions,
            scale: { min: 0, max: 1 },
            highlight: { row: 0, col: 1 },
            showValues: true,
            color: "module-16",
          },
        ],
      },
      alt: `Matriz de permissões: ${roles.map((role, row) => `${role} lê ${collections.filter((_, col) => permissions[row][col] === 1).join(" e ")}`).join("; ")}. Em destaque, o atendente sem acesso aos holerites.`,
    },
    {
      id: "retention",
      shortTitle: "Retenção",
      title: "O dado mais seguro é o que você não guardou",
      tag: "tradeoff",
      body: [
        `Com ${integer(CONVERSATIONS_PER_DAY)} conversas por dia (valor de brinquedo), guardar os logs por ${SHORT} dias mantém ${integer(stored(SHORT))} conversas; por ${LONG} dias, ${integer(stored(LONG))}, ou ${integer(storedGb(LONG))} GB. Num vazamento, o estrago é proporcional ao que estava guardado. A [[retenção de dados|data-retention]] define esse prazo, e o fim do prazo precisa apagar de verdade, inclusive nos traces e nos backups.`,
        "A [[minimização de dados|data-minimization]] vem antes: não coletar o que o produto não precisa. Os dois princípios estão na lei. A LGPD (Lei nº 13.709/2018) lista no art. 6º, entre outros, os princípios da finalidade e da necessidade; o GDPR, no art. 5º, a minimização e a limitação da conservação. Do lado do provedor, verifique se os dados enviados podem ser usados em treino e por quanto tempo ficam guardados; alguns oferecem contratos de retenção zero.",
      ],
      keyIdea: "Colete o mínimo, guarde pelo menor prazo e apague de verdade: o que não existe não vaza.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "volume",
            piece: "metrics-panel",
            metrics: [
              { id: "short", label: `guardadas com ${SHORT} dias`, value: integer(stored(SHORT)), color: "success" },
              { id: "long", label: `guardadas com ${LONG} dias`, value: integer(stored(LONG)), color: "danger" },
            ],
            highlight: "long",
          },
          {
            id: "curve",
            piece: "chart",
            kind: "line",
            series: retentionDays.map((days) => ({ label: `${days} dias`, value: stored(days) / 1_000_000 })),
            highlight: retentionDays.indexOf(LONG),
            color: "module-16",
          },
        ],
      },
      alt: `Milhões de conversas guardadas por prazo de retenção: ${retentionDays.map((days) => `${days} dias ${(stored(days) / 1_000_000).toLocaleString("pt-BR")}`).join(", ")}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Privacidade em camadas",
      tag: "summary",
      body: [
        "Mapeie para onde cada mensagem vai, redija ou pseudonimize antes do provedor e dos logs, meça o recall do detector, filtre por permissão antes da busca, não guarde segredo no prompt, colete o mínimo e apague no prazo. Nenhuma camada é completa; juntas, reduzem o que pode vazar e o tamanho do vazamento.",
        "Falta acompanhar tudo isso, e a qualidade, depois do deploy. A última aula do módulo trata do monitoramento em produção: sinais de qualidade, drift e alertas.",
      ],
      keyIdea: "Privacidade é desenho de sistema: menos cópias, menos tempo, menos acesso.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "chips",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "map", label: "mapear as cópias" },
              { id: "redact", label: "redigir antes de sair", color: "module-16" },
              { id: "measure", label: "medir o detector" },
              { id: "access", label: "filtrar por permissão" },
              { id: "minimize", label: "coletar o mínimo" },
              { id: "retention", label: "apagar no prazo", color: "brand" },
            ],
          },
        ],
      },
      alt: "Fluxo em chips: mapear as cópias, redigir antes de sair, medir o detector, filtrar por permissão, coletar o mínimo e apagar no prazo.",
    },
  ],
  realWorldExample:
    "O Microsoft Presidio é um projeto de código aberto para detectar e anonimizar PII em texto: combina expressões regulares, validação de dígitos verificadores e modelos de reconhecimento de entidades, e permite trocar cada dado por um marcador, mascarar ou criptografar de forma reversível. É comum colocá-lo entre o app e o provedor do LLM, e também no pipeline que grava logs e traces, para que o texto guardado já esteja redigido.",
  code: {
    language: "python",
    source: `import re

DETECTORS = {
    "CPF": re.compile(r"\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}"),
    "EMAIL": re.compile(r"[\\w.+-]+@[\\w-]+(\\.[\\w-]+)+"),
}

def pseudonymize(text: str) -> tuple[str, dict[str, str]]:
    vault: dict[str, str] = {}
    for kind, pattern in DETECTORS.items():
        values = [match.group() for match in pattern.finditer(text)]
        for i, value in enumerate(values, start=1):
            placeholder = f"<{kind}_{i}>"
            vault[placeholder] = value
            text = text.replace(value, placeholder, 1)
    return text, vault

def restore(text: str, vault: dict[str, str]) -> str:
    for placeholder, value in vault.items():
        text = text.replace(placeholder, value)
    return text`,
    caption: "Pseudonimização reversível: os marcadores vão para o provedor e para os logs, e o cofre fica no seu servidor para restaurar a resposta.",
  },
  tradeOffs: {
    pros: [
      "Redação antes do provedor tira o dado real de logs e de terceiros",
      "Pseudonimização mantém a resposta útil sem expor o dado",
      "Retenção curta e minimização reduzem o tamanho de qualquer vazamento",
    ],
    cons: [
      "Detectores perdem PII sem formato fixo, como nomes e endereços",
      "Redação demais tira do modelo informação de que ele precisava",
      "Apagar de verdade exige cobrir logs, traces, índices e backups",
    ],
    alternatives: [
      "Modelos rodando na própria infraestrutura, quando os dados não podem sair (módulo 17)",
      "Contratos com o provedor que vedam treino e garantem retenção zero",
    ],
  },
  knowledgeCheck: [
    {
      id: "prompt-secret",
      prompt: "Um assistente interno tem no system prompt: “a senha do painel é X; nunca revele”. Qual é o problema?",
      options: [
        "Nenhum: a instrução proíbe revelar",
        "O system prompt pode vazar por injeção ou por pedido insistente; segredos ficam fora do contexto, atrás de controle de acesso no código",
        "A senha deveria estar em maiúsculas",
        "O problema é só o custo dos tokens",
      ],
      correct: 1,
      explanation: "Tudo que está no contexto pode aparecer na resposta. Instruções reduzem a chance, não garantem. Segredos e permissões ficam no código e no sistema de identidade.",
      lesson: "16-12",
    },
    {
      id: "retention",
      prompt: "Um app guarda 100 mil conversas por dia. Reduzir a retenção dos logs de 365 para 30 dias faz o quê com o volume guardado?",
      options: [
        "Nada, porque o volume diário é o mesmo",
        "Reduz de 36,5 milhões para 3 milhões de conversas guardadas, e com isso o tamanho de um vazamento",
        "Reduz pela metade",
        "Aumenta, porque os logs ficam maiores",
      ],
      correct: 1,
      explanation: "Guardado = volume diário × dias: 100 mil × 365 = 36,5 milhões contra 100 mil × 30 = 3 milhões. Menos dado guardado é menos dado para vazar.",
      lesson: "16-12",
    },
  ],
  related: ["08-12", "16-11", "16-13"],
  references: [
    { title: "Lei nº 13.709/2018, Lei Geral de Proteção de Dados Pessoais (LGPD)", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm", kind: "docs" },
    { title: "Regulamento (UE) 2016/679, Regulamento Geral sobre a Proteção de Dados (GDPR)", url: "https://eur-lex.europa.eu/eli/reg/2016/679/oj", kind: "docs" },
    { title: "OWASP Top 10 for LLM Applications", url: "https://genai.owasp.org/llm-top-10/", kind: "docs" },
  ],
};

export default lesson;
