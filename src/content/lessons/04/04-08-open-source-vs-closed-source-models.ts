import type { LessonContent } from "../../../types/content";

// Modelos abertos e fechados. A conta de custo usa preços de exemplo, escritos aqui e não de um provedor
// real: uma API que cobra por token contra um servidor próprio com custo fixo por hora. O ponto de
// equilíbrio e as barras da cena saem dessas contas.

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const money = (value: number) => `US$ ${integer(value)}`;

/** Preço de exemplo da API, em dólares por milhão de tokens. */
const API_PRICE_PER_MILLION = 1;
/** Custo de exemplo de um servidor com GPU, em dólares por hora, ligado o mês inteiro. */
const SERVER_PRICE_PER_HOUR = 2;
const HOURS_PER_MONTH = 730;
const serverMonthly = SERVER_PRICE_PER_HOUR * HOURS_PER_MONTH;
const breakEvenMillions = serverMonthly / API_PRICE_PER_MILLION;

const volumes = [100, 500, 1000, 2000, 5000];
const apiMonthly = (millions: number) => millions * API_PRICE_PER_MILLION;
const cheaperOnServer = volumes.filter((millions) => apiMonthly(millions) >= serverMonthly);
const volumeLabel = (millions: number) => (millions >= 1000 ? `${fixed(millions / 1000, 0)} bi` : `${millions} mi`);

const lesson: LessonContent = {
  id: "04-08",
  subtitle: "A diferença entre baixar os pesos de um modelo e alugar o acesso a ele por uma API, e o que muda em custo, controle, licença e privacidade.",
  objectives: [
    "Diferenciar modelo fechado, modelo de pesos abertos e modelo open source",
    "Ler o que a licença de um modelo permite antes de usá-lo num produto",
    "Calcular o ponto de equilíbrio entre pagar por token e manter um servidor",
    "Listar os custos escondidos de hospedar um modelo aberto",
  ],
  steps: [
    {
      id: "two-paths",
      shortTitle: "Dois caminhos",
      title: "Restaurante ou receita",
      tag: "context",
      body: [
        "Num restaurante, você pede o prato e paga por ele, sem ver a cozinha. Com a receita, você cozinha em casa: dá mais trabalho, mas você controla tudo. Modelos fechados, como os da OpenAI, da Anthropic e do Google, são o restaurante: você usa por API e paga por token. Modelos de [[pesos abertos|open-weights]], como Llama, Mistral e Qwen, são a receita: você baixa os pesos e roda onde quiser.",
        "No caminho fechado, o provedor cuida das GPUs, das atualizações e da escala, e o seu dado sai da sua infraestrutura. No caminho aberto, o dado fica com você, o modelo não muda sem você querer, e a operação inteira passa a ser sua.",
      ],
      keyIdea: "Fechado: você aluga o acesso. Aberto: você recebe os pesos e assume a operação.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "laptop", kind: "laptop", label: "seu app", col: 0, row: 0.5 },
              { id: "cloud", kind: "cloud", label: "api fechada", col: 1, row: 0 },
              { id: "closed", kind: "llm", label: "modelo fechado", col: 2, row: 0 },
              { id: "server", kind: "server", label: "seu servidor", col: 1, row: 1 },
              { id: "open", kind: "llm", label: "pesos abertos", col: 2, row: 1 },
            ],
            edges: [
              { from: "laptop", to: "cloud", label: "paga por token" },
              { from: "cloud", to: "closed" },
              { from: "laptop", to: "server", label: "roda local" },
              { from: "server", to: "open" },
            ],
            active: "open",
          },
        ],
      },
      alt: "Seu app tem dois caminhos: uma API fechada que serve um modelo fechado, pago por token, ou seu próprio servidor rodando um modelo de pesos abertos, em destaque.",
    },
    {
      id: "download",
      shortTitle: "O download",
      title: "Pesos abertos não é o mesmo que open source",
      tag: "mechanism",
      body: [
        "Quando um modelo é publicado no Hugging Face Hub, em geral vêm os pesos, o config.json, o tokenizador, o [[model card|model-card]] e a licença. Isso basta para rodar e ajustar o modelo. Quase nunca vêm os dados de treino completos nem todo o código do treino.",
        "Por isso a Open Source Initiative publicou, em 2024, a Open Source AI Definition: para ser open source, um sistema de IA precisa oferecer os pesos, o código e informação suficiente sobre os dados para alguém reproduzir algo equivalente, sob termos que permitam usar, estudar, modificar e compartilhar. A maioria dos modelos chamados de “abertos” é, mais precisamente, de pesos abertos.",
      ],
      keyIdea: "Pesos abertos deixam você rodar e ajustar; open source de verdade deixa você também estudar e refazer.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "release",
            piece: "graph",
            nodes: [
              { id: "model", label: "modelo publicado", x: 0.5, y: 0.5, color: "module-04" },
              { id: "weights", label: "pesos", x: 0.15, y: 0.15, color: "success" },
              { id: "config", label: "config e tokenizador", x: 0.5, y: 0.08, color: "success" },
              { id: "card", label: "model card e licença", x: 0.85, y: 0.15, color: "success" },
              { id: "code", label: "código de treino", x: 0.2, y: 0.88, color: "muted" },
              { id: "data", label: "dados de treino", x: 0.8, y: 0.88, color: "muted" },
            ],
            edges: [
              { from: "model", to: "weights" },
              { from: "model", to: "config" },
              { from: "model", to: "card" },
              { from: "model", to: "code", label: "raro" },
              { from: "model", to: "data", label: "raro" },
            ],
            highlight: ["weights", "config", "card"],
          },
        ],
      },
      alt: "Um modelo publicado ligado ao que costuma vir junto, em destaque (pesos, config e tokenizador, model card e licença), e ao que raramente vem (código de treino e dados de treino).",
    },
    {
      id: "license",
      shortTitle: "Licença",
      title: "A licença decide o que você pode fazer",
      tag: "mechanism",
      body: [
        "Baixar é fácil; usar num produto depende da licença. O Mistral 7B foi publicado sob Apache 2.0, que permite uso comercial, modificação e redistribuição. A licença comunitária do Llama 2 permite uso comercial, mas exige uma licença à parte de empresas com mais de 700 milhões de usuários ativos por mês e traz uma política de uso aceitável.",
        "Antes de escolher um modelo aberto, leia a licença e o model card: se o uso comercial é permitido, se há restrição de área, se você pode usar as saídas para treinar outros modelos e o que precisa ser citado. Nos modelos fechados, a mesma pergunta se responde nos termos de uso da API.",
      ],
      keyIdea: "“Aberto” não quer dizer “sem regras”: cada licença traz condições de uso.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "weights", kind: "documents", label: "pesos + licença", col: 0, row: 0.5 },
              { id: "terms", kind: "guardrail", label: "condições", col: 1, row: 0.5 },
              { id: "product", kind: "app", label: "seu produto", col: 2, row: 0 },
              { id: "blocked", kind: "no-result", label: "uso proibido", col: 2, row: 1 },
            ],
            edges: [
              { from: "weights", to: "terms", label: "leia antes" },
              { from: "terms", to: "product", label: "permitido" },
              { from: "terms", to: "blocked", label: "fora dos termos", variant: "alternative" },
            ],
            active: "terms",
          },
        ],
      },
      alt: "Os pesos vêm com uma licença; as condições, em destaque, decidem se o uso no seu produto é permitido ou, pelo caminho tracejado, proibido.",
    },
    {
      id: "break-even",
      shortTitle: "Custo",
      title: "Quando hospedar sai mais barato",
      tag: "example",
      body: [
        `Com preços de exemplo, não de um provedor real: uma API a US$ ${API_PRICE_PER_MILLION} por milhão de tokens e um servidor com GPU a US$ ${SERVER_PRICE_PER_HOUR} por hora, ligado ${HOURS_PER_MONTH} horas por mês. O servidor custa ${money(serverMonthly)} por mês, use ou não.`,
        `O equilíbrio fica em ${money(serverMonthly)} ÷ US$ ${API_PRICE_PER_MILLION} = ${integer(breakEvenMillions)} milhões de tokens por mês. Abaixo disso, a API é mais barata; acima, o servidor ganha, nas barras acesas (${cheaperOnServer.map(volumeLabel).join(" e ")}). A conta supõe que um servidor dá conta do volume e ignora o custo de pessoas para operá-lo.`,
      ],
      keyIdea: "API: custo proporcional ao uso. Servidor próprio: custo fixo. O volume decide qual ganha.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "metrics",
            piece: "metrics-panel",
            metrics: [
              { id: "server", label: "servidor por mês", value: money(serverMonthly) },
              { id: "even", label: "equilíbrio", value: `${integer(breakEvenMillions)} mi tokens`, color: "module-04" },
            ],
            highlight: "even",
          },
          {
            id: "api-cost",
            piece: "chart",
            kind: "bar",
            series: volumes.map((millions) => ({ label: volumeLabel(millions), value: apiMonthly(millions) })),
            cutoff: { mode: "threshold", value: serverMonthly, label: money(serverMonthly) },
            highlight: volumes.indexOf(cheaperOnServer[0]),
            color: "module-04",
          },
        ],
      },
      alt: `Custo mensal da API por volume de tokens, com preços de exemplo: ${volumes.map((millions) => `${volumeLabel(millions)} de tokens ${money(apiMonthly(millions))}`).join(", ")}. A linha marca os ${money(serverMonthly)} do servidor; acima dela, hospedar sai mais barato.`,
    },
    {
      id: "operations",
      shortTitle: "Operação",
      title: "O que vem junto com os pesos",
      tag: "tradeoff",
      body: [
        "Hospedar um modelo aberto é mais que baixar um arquivo. É preciso servir com um motor de inferência como o vLLM, monitorar latência e erros, escalar quando o uso cresce, aplicar filtros de segurança e atualizar quando sair uma versão melhor. Tudo isso é trabalho de engenharia contínuo.",
        "Em troca, você ganha controle: o dado sensível não sai da sua rede, a versão do modelo só muda quando você decide, e dá para ajustar o modelo com os seus dados. Com APIs fechadas, o modelo pode ser atualizado ou descontinuado pelo provedor, e a resposta de amanhã pode não ser igual à de hoje.",
      ],
      keyIdea: "Pesos abertos trocam conveniência por controle: o provedor deixa de operar, e você passa a operar.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "ops",
            piece: "pipeline",
            stages: [
              { id: "download", label: "baixar pesos" },
              { id: "serve", label: "servir (vLLM)" },
              { id: "guard", label: "guardrails" },
              { id: "monitor", label: "monitorar", color: "module-04" },
              { id: "update", label: "atualizar" },
            ],
            active: "monitor",
            done: ["download", "serve", "guard"],
            branch: { id: "scale", label: "escalar GPUs", from: "monitor", edgeLabel: "pico de uso", color: "danger" },
          },
        ],
      },
      alt: "Pipeline de operação de um modelo aberto: baixar pesos, servir com vLLM, guardrails, monitorar (em destaque) e atualizar, com um ramo para escalar GPUs num pico de uso.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Muitos produtos usam os dois",
      tag: "summary",
      body: [
        "A escolha não precisa ser única. Um desenho comum manda dados sensíveis para um modelo aberto hospedado na própria rede e o resto para uma API fechada, mais capaz ou mais barata de começar. A decisão olha para volume, privacidade, licença, qualidade medida e equipe disponível.",
        "A próxima aula sai do texto: modelos que leem imagens e áudio e como eles transformam tudo em tokens.",
      ],
      keyIdea: "Fechado para começar rápido, aberto para controle e volume; dá para combinar os dois.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "flow",
            piece: "block-diagram",
            blocks: [
              { id: "app", kind: "app", label: "seu app", col: 0, row: 0.5 },
              { id: "guard", kind: "guardrail", label: "roteia por dado", col: 1, row: 0.5 },
              { id: "open", kind: "server", label: "modelo aberto", col: 2, row: 0 },
              { id: "cloud", kind: "cloud", label: "api fechada", col: 2, row: 1 },
              { id: "answer", kind: "answer", label: "resposta", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "app", to: "guard" },
              { from: "guard", to: "open", label: "sensível" },
              { from: "guard", to: "cloud", label: "geral" },
              { from: "open", to: "answer" },
              { from: "cloud", to: "answer" },
            ],
            active: "guard",
          },
        ],
      },
      alt: "O app passa por uma camada que roteia pelo tipo de dado, em destaque: dados sensíveis vão para um modelo aberto no seu servidor e o resto para uma API fechada; os dois devolvem a resposta.",
    },
  ],
  realWorldExample:
    "O Mistral 7B foi publicado em 2023 sob a licença Apache 2.0, com os pesos no Hugging Face Hub, e qualquer empresa pode rodá-lo nos próprios servidores. A família Llama 2 saiu no mesmo ano com uma licença própria, que permite uso comercial com condições. Enquanto isso, modelos como GPT-4, Claude e Gemini só são acessíveis por API, sem acesso aos pesos.",
  code: {
    language: "bash",
    source: `# Servir um modelo de pesos abertos com uma API compatível com a da OpenAI
pip install vllm
vllm serve mistralai/Mistral-7B-Instruct-v0.3

# Do lado do app, a chamada muda só o endereço
curl http://localhost:8000/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -d '{"model": "mistralai/Mistral-7B-Instruct-v0.3", "messages": [{"role": "user", "content": "Olá!"}]}'`,
    caption: "O vLLM serve um modelo aberto com uma API no formato da OpenAI: trocar de modelo fechado para aberto pode ser só trocar o endereço da chamada.",
  },
  tradeOffs: {
    pros: [
      "Pesos abertos: dados ficam na sua rede, versão sob controle e ajuste fino possível",
      "API fechada: nenhuma operação de GPU, escala imediata e acesso aos modelos mais capazes do provedor",
      "Com volume alto e estável, hospedar pode custar menos por token",
    ],
    cons: [
      "Pesos abertos: operação, monitoramento e escala viram responsabilidade sua",
      "API fechada: dados saem da sua infraestrutura e o modelo pode mudar ou ser descontinuado",
      "Licenças de pesos abertos variam e podem restringir usos",
    ],
    alternatives: ["Modelos abertos servidos por provedores de inferência, pagos por token", "Modelos fechados em nuvem privada, com contrato de não retenção de dados"],
  },
  knowledgeCheck: [
    {
      id: "weights-vs-oss",
      prompt: "Uma empresa publica os pesos de um modelo, mas não os dados nem o código de treino. Como classificar esse modelo com precisão?",
      options: [
        "Open source completo",
        "Modelo de pesos abertos",
        "Modelo fechado",
        "Domínio público",
      ],
      correct: 1,
      explanation: "Os pesos permitem rodar e ajustar, mas sem informação dos dados e sem o código ninguém consegue estudar ou refazer o treino. Pela definição da OSI, isso é pesos abertos, não open source.",
      lesson: "04-08",
    },
    {
      id: "low-volume",
      prompt: "Uma startup vai processar poucos milhões de tokens por mês, sem dados sensíveis, e precisa lançar rápido. O que costuma fazer mais sentido?",
      options: [
        "Alugar GPUs e hospedar um modelo de 70B",
        "Usar uma API e reavaliar quando o volume ou os requisitos mudarem",
        "Treinar um modelo próprio do zero",
        "Esperar um modelo open source completo",
      ],
      correct: 1,
      explanation: "Com volume baixo, o custo fixo de um servidor não se paga, e a API dispensa operação. Se o volume crescer ou surgir dado sensível, a conta muda.",
      lesson: "04-08",
    },
  ],
  related: ["03-15", "04-12", "17-03"],
  references: [
    { title: "Open Source Initiative: The Open Source AI Definition", url: "https://opensource.org/ai/open-source-ai-definition", kind: "docs" },
    { title: "Jiang et al. (2023), Mistral 7B", url: "https://arxiv.org/abs/2310.06825", kind: "paper" },
    { title: "Meta Llama 2: repositório e licença", url: "https://github.com/meta-llama/llama", kind: "repo" },
  ],
};

export default lesson;
