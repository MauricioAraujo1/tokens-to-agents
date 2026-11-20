import type { LessonContent } from "../../../types/content";

// Templates de prompt com contas no arquivo: o template é renderizado aqui com dados de dois clientes, os
// tokens de cada seção são estimados a 4 caracteres por token, e o prefixo comum entre as duas requisições
// é medido com as variáveis no fim e no começo do template.

const estimateTokens = (text: string) => Math.ceil(text.length / 4);
const percent = (value: number) => `${Math.round(value * 100)}%`;
const integer = (value: number) => value.toLocaleString("pt-BR");

const PLACEHOLDER = /\{\{(\w+)\}\}/g;

type Variables = Record<string, string>;

const placeholdersOf = (template: string) => [...template.matchAll(PLACEHOLDER)].map((match) => match[1]);
const missingIn = (template: string, variables: Variables) => placeholdersOf(template).filter((name) => !(name in variables));
const render = (template: string, variables: Variables) => template.replace(PLACEHOLDER, (_, name: string) => variables[name] ?? "");

const sections = [
  { id: "role", label: "papel", text: "Você é o assistente de suporte da Loja Exemplo. Responda em português, em até três frases, com tom cordial." },
  {
    id: "policy",
    label: "política",
    text: "Política de trocas: o cliente pode trocar ou devolver em até 7 dias após a entrega. Produtos com defeito têm 30 dias. Pedidos com mais de 10 dias de atraso podem ser cancelados com reembolso integral.",
  },
  {
    id: "rules",
    label: "regras",
    text: "Não prometa prazos de entrega. Se a pergunta não for sobre pedidos, trocas ou devoluções, diga que só pode ajudar com esses assuntos.",
  },
  {
    id: "example",
    label: "exemplo",
    text: "Exemplo: o cliente pergunta se pode devolver um tênis usado. Resposta: pode devolver em até 7 dias após a entrega, desde que sem sinais de uso.",
  },
  { id: "customer", label: "cliente", text: "Cliente: {{nome}} | Pedido: {{pedido}}" },
  { id: "question", label: "pergunta", text: "Pergunta: {{pergunta}}" },
];
const VARIABLE_SECTIONS = ["customer", "question"];

const join = (ids: string[]) => ids.map((id) => sections.find((section) => section.id === id)?.text ?? "").join("\n");
const FIXED_FIRST = join(["role", "policy", "rules", "example", "customer", "question"]);
const VARIABLES_FIRST = join(["customer", "role", "policy", "rules", "example", "question"]);

const ana: Variables = { nome: "Ana", pedido: "4821", pergunta: "Meu pedido atrasou 12 dias, posso cancelar?" };
const bruno: Variables = { nome: "Bruno", pedido: "5310", pergunta: "Como troco o tamanho de uma camiseta?" };

const placeholders = placeholdersOf(FIXED_FIRST);
const renderedAna = render(FIXED_FIRST, ana);
const sectionTokens = sections.map((section) => estimateTokens(render(section.text, ana)));
const fixedTokens = sections
  .filter((section) => !VARIABLE_SECTIONS.includes(section.id))
  .reduce((sum, section) => sum + estimateTokens(section.text), 0);
const totalTokens = estimateTokens(renderedAna);
const variableTokens = totalTokens - fixedTokens;
const largestSection = Math.max(...sectionTokens);

// Passo 4: prefixo comum entre as requisições de Ana e Bruno.
const commonPrefix = (a: string, b: string) => {
  let length = 0;
  while (length < a.length && length < b.length && a[length] === b[length]) length += 1;
  return a.slice(0, length);
};
const goodPrefix = estimateTokens(commonPrefix(render(FIXED_FIRST, ana), render(FIXED_FIRST, bruno)));
const badPrefix = estimateTokens(commonPrefix(render(VARIABLES_FIRST, ana), render(VARIABLES_FIRST, bruno)));
const REQUESTS = 10_000;
const reusable = goodPrefix * REQUESTS;

// Passo 5: o render recusa variáveis faltando.
const missingExample = missingIn(FIXED_FIRST, { nome: "Carla", pergunta: "Posso trocar?" });

// Passo 2: o template como sequência de trechos fixos e lacunas.
const stream = ["Você é o suporte…", "Política…", "Regras…", "Exemplo…", "{{nome}}", "{{pedido}}", "{{pergunta}}"];
const slotIndices = stream.flatMap((token, index) => (token.startsWith("{{") ? [index] : []));

const lesson: LessonContent = {
  id: "05-09",
  subtitle: "Separar o texto fixo do prompt dos dados que mudam a cada requisição, e tratar o template como código: versionado, testado e barato de reutilizar.",
  objectives: [
    "Escrever um template com variáveis nomeadas e renderizá-lo com segurança",
    "Calcular quanto do prompt é fixo e quanto é variável",
    "Ordenar o template para maximizar o prefixo comum entre requisições",
    "Versionar e testar templates como código, sem deixar o usuário controlar o template",
  ],
  steps: [
    {
      id: "form-letter",
      shortTitle: "Lacunas",
      title: "Um formulário com lacunas",
      tag: "context",
      body: [
        "Uma carta de banco começa sempre igual (“Prezado(a) ___, seu cartão final ___...”) e só os nomes e números mudam. Ninguém reescreve a carta para cada cliente: existe um modelo com lacunas. Um [[prompt template|prompt-template]] é o mesmo para LLMs: o texto fixo com lacunas nomeadas, preenchidas pelo código a cada requisição.",
        "Num app real, o prompt raramente é escrito à mão na hora. O código pega o template, busca os dados (nome do cliente, pedido, pergunta) e renderiza o prompt final. Separar o fixo do variável permite revisar, versionar e testar o fixo, e mudar o variável à vontade.",
      ],
      keyIdea: "Template = texto fixo e testado + lacunas nomeadas que o código preenche.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "template", kind: "documents", label: "template v3", col: 0, row: 0 },
              { id: "db", kind: "sql-db", label: "dados do pedido", col: 0, row: 1 },
              { id: "user", kind: "phone", label: "pergunta", col: 1, row: 1 },
              { id: "app", kind: "app", label: "render", col: 1, row: 0 },
              { id: "prompt", kind: "context", label: "prompt final", col: 2, row: 0 },
              { id: "llm", kind: "llm", label: "llm", col: 3, row: 0 },
            ],
            edges: [
              { from: "template", to: "app" },
              { from: "db", to: "app", label: "nome, pedido" },
              { from: "user", to: "app" },
              { from: "app", to: "prompt" },
              { from: "prompt", to: "llm" },
            ],
            active: "app",
          },
        ],
      },
      alt: "O template v3, os dados do pedido e a pergunta do cliente entram no render, em destaque, que produz o prompt final enviado ao LLM.",
    },
    {
      id: "slots",
      shortTitle: "Variáveis",
      title: "Trechos fixos e lacunas",
      tag: "mechanism",
      body: [
        `O template da aula tem ${placeholders.length} variáveis: ${placeholders.map((name) => `{{${name}}}`).join(", ")}. Tudo o que não está entre chaves duplas é fixo. Renderizar é trocar cada lacuna pelo valor; o código da aula faz isso com uma expressão regular, e bibliotecas como Jinja fazem o mesmo com mais recursos.`,
        "Duas regras evitam bugs. Primeiro, variável faltando é erro, não texto vazio: um prompt com “Cliente: | Pedido:” em branco gera respostas estranhas sem nenhum alerta. Segundo, dado do usuário entra só como valor de variável, delimitado, nunca como parte do template, porque o template é código.",
      ],
      keyIdea: "Variável faltando deve falhar alto; dado do usuário entra como valor, nunca como template.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "template",
            piece: "token-stream",
            tokens: stream,
            keys: slotIndices,
            bars: stream.map((_, index) => (slotIndices.includes(index) ? 1 : 0.3)),
            color: "module-05",
          },
        ],
      },
      alt: `O template como sequência: quatro trechos fixos (papel, política, regras e exemplo) e as lacunas ${placeholders.map((name) => `{{${name}}}`).join(", ")}, em destaque no fim.`,
    },
    {
      id: "count",
      shortTitle: "Tokens",
      title: "Quanto pesa cada seção",
      tag: "example",
      body: [
        `Renderizado para a cliente Ana, o prompt tem cerca de ${totalTokens} tokens. As seções fixas somam ${fixedTokens} (${percent(fixedTokens / totalTokens)}) e as variáveis, ${variableTokens}. A maior seção é a política, com ${largestSection} tokens.`,
        "Saber isso muda decisões. Se o template é quase todo fixo, encurtar a política em 20% economiza mais do que qualquer ajuste na pergunta, e esse ganho vale para toda requisição. Medir por seção também ajuda a ver quando um template cresceu demais com regras acrescentadas uma de cada vez.",
      ],
      keyIdea: "Num template, o fixo costuma dominar os tokens; é ali que estão a economia e o risco de inchaço.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "sections",
            piece: "chart",
            kind: "bar",
            series: sections.map((section, index) => ({ label: section.label, value: sectionTokens[index] })),
            highlight: sectionTokens.indexOf(largestSection),
            color: "module-05",
          },
        ],
      },
      alt: `Tokens por seção do prompt renderizado: ${sections.map((section, index) => `${section.label} ${sectionTokens[index]}`).join(", ")}. As fixas somam ${fixedTokens} de ${totalTokens}.`,
    },
    {
      id: "prefix",
      shortTitle: "Prefixo",
      title: "Fixo primeiro, variável no fim",
      tag: "mechanism",
      body: [
        `Compare as requisições de Ana e Bruno. Com as seções fixas primeiro, as duas compartilham os primeiros ${goodPrefix} tokens. Com o bloco “Cliente | Pedido” no topo, o prefixo comum cai para ${badPrefix}: o texto diverge já no nome.`,
        `O prefixo comum importa porque os provedores oferecem prompt caching: o trecho inicial idêntico entre requisições é processado uma vez e reaproveitado, com desconto e menos latência. O tema é do módulo de inferência, mas a regra vale desde já: em ${integer(REQUESTS)} requisições, a boa ordem deixa ${integer(reusable)} tokens de prefixo reaproveitáveis.`,
      ],
      keyIdea: "Ordene o template do mais estável para o mais variável: o prefixo comum vira cache.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "prefix",
            piece: "metrics-panel",
            metrics: [
              { id: "good", label: "fixo primeiro: prefixo comum", value: `${goodPrefix} tokens`, color: "success" },
              { id: "bad", label: "variável primeiro: prefixo comum", value: `${badPrefix} tokens`, color: "danger" },
              { id: "share", label: "do prompt de Ana", value: percent(goodPrefix / totalTokens) },
            ],
            highlight: "good",
          },
        ],
      },
      alt: `Prefixo comum entre as requisições de Ana e Bruno: ${goodPrefix} tokens com as seções fixas primeiro e ${badPrefix} tokens com as variáveis primeiro.`,
    },
    {
      id: "as-code",
      shortTitle: "É código",
      title: "Template é código",
      tag: "tradeoff",
      body: [
        `Templates vivem no repositório, com versão, revisão e eval. Uma mudança no template muda o comportamento de todas as requisições, então ela passa pelos mesmos casos de teste antes de ir para produção. O render também falha cedo: sem a variável pedido, o código da aula acusa ${missingExample.map((name) => `{{${name}}}`).join(", ")} antes de chamar o modelo.`,
        "O risco de segurança é deixar o usuário escrever o template. Motores como Jinja executam expressões, e um template controlado por terceiros vira server-side template injection: o atacante roda código no servidor. O usuário controla valores de variáveis, que entram delimitados; o template, nunca.",
      ],
      keyIdea: "Versione e teste o template como código; o usuário preenche valores, nunca escreve o template.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "repo", kind: "documents", label: "templates no repo", col: 0, row: 0 },
              { id: "eval", kind: "eval", label: "eval por versão", col: 1, row: 0 },
              { id: "app", kind: "server", label: "render", col: 2, row: 0 },
              { id: "user", kind: "user", label: "usuário", col: 1, row: 1 },
              { id: "llm", kind: "llm", label: "llm", col: 3, row: 0 },
            ],
            edges: [
              { from: "repo", to: "eval" },
              { from: "eval", to: "app", label: "aprovado" },
              { from: "user", to: "app", label: "só valores" },
              { from: "app", to: "llm" },
              { from: "user", to: "repo", label: "template: nunca", variant: "alternative" },
            ],
            active: "eval",
          },
        ],
      },
      alt: "Os templates saem do repositório, passam pelo eval de cada versão, em destaque, e só então vão para o render; o usuário manda só valores de variáveis, e o caminho tracejado do usuário para o template é proibido.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "O ciclo de vida de um template",
      tag: "summary",
      body: [
        "Um template separa o texto fixo das variáveis, falha quando falta uma variável, coloca o estável antes do variável e vive no repositório com versão e eval. O resultado é um prompt que pode ser revisado como qualquer código.",
        "Até aqui o modelo só produziu texto. Na próxima aula ele passa a pedir ações: o template ganha a descrição de ferramentas, e o modelo responde com chamadas de função que o app executa.",
      ],
      keyIdea: "Escrever, testar, versionar, renderizar: o template é o código-fonte do prompt.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "lifecycle",
            piece: "pipeline",
            stages: [
              { id: "write", label: "escrever template" },
              { id: "test", label: "eval" },
              { id: "version", label: "versionar" },
              { id: "render", label: "renderizar", color: "module-05" },
              { id: "send", label: "enviar" },
            ],
            active: "render",
            done: ["write", "test", "version"],
          },
        ],
      },
      alt: "Pipeline do template: escrever, eval, versionar, renderizar, em destaque, e enviar.",
    },
  ],
  realWorldExample:
    "No Hugging Face Transformers, o chat template de cada modelo é um template Jinja guardado na configuração do tokenizador, e apply_chat_template renderiza a lista de mensagens com os tokens especiais certos. É o mesmo padrão da aula, aplicado à estrutura da conversa: o formato fica versionado junto do modelo, e o código só fornece as mensagens.",
  code: {
    language: "python",
    source: `from jinja2 import Environment, StrictUndefined

env = Environment(undefined=StrictUndefined)
template = env.from_string(open("prompts/suporte_v3.j2", encoding="utf-8").read())

prompt = template.render(
    nome="Ana",
    pedido="4821",
    pergunta="Meu pedido atrasou 12 dias, posso cancelar?",
)`,
    caption: "Template Jinja versionado em arquivo; com StrictUndefined, uma variável faltando levanta erro em vez de virar texto vazio.",
  },
  tradeOffs: {
    pros: [
      "O texto fixo é revisado, versionado e testado uma vez",
      "Variáveis nomeadas deixam claro o que muda por requisição",
      "Uma ordem estável maximiza o prefixo comum e o reaproveitamento por cache",
    ],
    cons: [
      "Mais uma camada para manter em sincronia com o código que preenche",
      "Um template ruim erra em todas as requisições ao mesmo tempo",
      "Motores de template expressivos abrem risco de injeção se o template não for confiável",
    ],
    alternatives: ["Strings simples com format, para prompts pequenos", "Bibliotecas que geram e otimizam prompts a partir de exemplos, como DSPy"],
  },
  knowledgeCheck: [
    {
      id: "missing-variable",
      prompt: "Um bug faz a variável {{politica}} chegar vazia. O modelo continua respondendo, mas inventa prazos. Que mudança evitaria isso?",
      options: [
        "Aumentar o limite de tokens",
        "Fazer o render falhar quando uma variável estiver faltando ou vazia",
        "Trocar de modelo",
        "Colocar a política no fim do prompt",
      ],
      correct: 1,
      explanation: "Variável faltando deve ser erro. Falhar no render pega o bug antes de chamar o modelo, em vez de gerar respostas erradas sem alerta.",
      lesson: "05-09",
    },
    {
      id: "order-for-cache",
      prompt: "Um template começa com “Data e hora: {{agora}}” e depois traz 2.000 tokens de regras fixas. Qual é o problema?",
      options: [
        "Nenhum",
        "O prefixo muda a cada requisição, então as regras fixas não aproveitam o cache de prefixo",
        "O modelo não entende datas",
        "Templates não podem ter datas",
      ],
      correct: 1,
      explanation: "Caches de prompt reaproveitam o prefixo idêntico. Uma variável no topo quebra o prefixo; mova-a para depois das regras fixas.",
      lesson: "05-09",
    },
  ],
  related: ["05-02", "05-10", "10-06"],
  references: [
    { title: "Hugging Face: Chat templates", url: "https://huggingface.co/docs/transformers/main/en/chat_templating", kind: "docs" },
    { title: "Jinja: template engine documentation", url: "https://jinja.palletsprojects.com/", kind: "docs" },
    { title: "Khattab et al. (2023), DSPy: Compiling Declarative Language Model Calls into Self-Improving Pipelines", url: "https://arxiv.org/abs/2310.03714", kind: "paper" },
  ],
};

export default lesson;
