import type { LessonContent } from "../../../types/content";

// Ferramentas vistas pelo agente, com contas no arquivo: um agente de viagem chama três ferramentas
// independentes. Em sequência, são uma chamada ao modelo por ferramenta; em paralelo, uma só. As latências
// são de brinquedo. O custo das definições sai do JSON das próprias ferramentas (4 caracteres por token),
// multiplicado pelo número de ferramentas oferecidas.

const estimateTokens = (text: string) => Math.ceil(text.length / 4);
const integer = (value: number) => Math.round(value).toLocaleString("pt-BR");
const seconds = (value: number) => `${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} s`;

const TASK = "Planeje 2 dias em Lisboa de 14 a 16 de maio: voo saindo de São Paulo, hotel no centro e a previsão do tempo.";

interface Tool {
  name: string;
  description: string;
  params: Record<string, string>;
  /** Latência de brinquedo da ferramenta, em segundos. */
  latency: number;
}

const tools: Tool[] = [
  {
    name: "viagem_buscar_voos",
    description: "Lista voos entre dois aeroportos numa data (AAAA-MM-DD), com horário, duração e preço. Use antes de reservar.",
    params: { origem: "Código IATA, ex.: GRU", destino: "Código IATA, ex.: LIS", data: "Data AAAA-MM-DD" },
    latency: 1.2,
  },
  {
    name: "viagem_buscar_hoteis",
    description: "Lista hotéis num bairro, com preço por noite e nota. Use depois de saber as datas.",
    params: { cidade: "Nome da cidade", bairro: "Nome do bairro", entrada: "Data AAAA-MM-DD", saida: "Data AAAA-MM-DD" },
    latency: 0.9,
  },
  {
    name: "viagem_previsao_tempo",
    description: "Previsão diária de máxima, mínima e chuva para uma cidade, até 10 dias à frente.",
    params: { cidade: "Nome da cidade", data: "Data AAAA-MM-DD" },
    latency: 0.4,
  },
];
const definitionJson = (tool: Tool) =>
  JSON.stringify({
    name: tool.name,
    description: tool.description,
    input_schema: {
      type: "object",
      properties: Object.fromEntries(Object.entries(tool.params).map(([key, description]) => [key, { type: "string", description }])),
      required: Object.keys(tool.params),
    },
  });
const definitionTokens = tools.map((tool) => estimateTokens(definitionJson(tool)));
const averageDefinition = definitionTokens.reduce((sum, value) => sum + value, 0) / tools.length;
const toolCounts = [3, 10, 20, 40, 60];
const definitionSeries = toolCounts.map((count) => ({ label: `${count} tools`, value: Math.round(count * averageDefinition) }));

// Sequencial: uma chamada ao modelo por ferramenta, mais a resposta. Paralelo: uma chamada com as três, mais a resposta.
const MODEL_LATENCY = 1.5;
const sequentialCalls = tools.length + 1;
const parallelCalls = 2;
const sequentialLatency = sequentialCalls * MODEL_LATENCY + tools.reduce((sum, tool) => sum + tool.latency, 0);
const parallelLatency = parallelCalls * MODEL_LATENCY + Math.max(...tools.map((tool) => tool.latency));

// A troca de mensagens: o id da chamada liga o pedido ao resultado.
const CALL_ID = "toolu_01";
const exchange = ["tool_use", `id: ${CALL_ID}`, tools[0].name, '{"destino": "LIS"}', "tool_result", `tool_use_id: ${CALL_ID}`, "3 voos"];
const ID_INDEX = 1;
const RESULT_ID_INDEX = 5;

// Erro acionável: a primeira chamada veio com a data em texto livre.
const badCall = `${tools[0].name}(data: "14 de maio")`;
const errorText = "data inválida: use AAAA-MM-DD, ex.: 2026-05-14";
const fixedCall = `${tools[0].name}(data: "2026-05-14")`;

const lesson: LessonContent = {
  id: "12-05",
  subtitle: "As ferramentas do ponto de vista do agente: como descrevê-las, como devolver resultados e erros, chamadas em paralelo e quantas ferramentas oferecer.",
  objectives: [
    "Seguir o par chamada e resultado ligado pelo id nas APIs da Anthropic e da OpenAI",
    "Usar chamadas paralelas para ferramentas independentes e calcular o ganho de latência",
    "Devolver erros como observações acionáveis que o agente consegue corrigir",
    "Dimensionar o conjunto de ferramentas: descrições, nomes e custo em tokens",
  ],
  steps: [
    {
      id: "toolbox",
      shortTitle: "As gavetas",
      title: "Uma caixa de ferramentas bem etiquetada",
      tag: "context",
      body: [
        "Dê a um funcionário novo uma caixa com gavetas sem etiqueta e ele vai abrir todas antes de achar a chave certa. Etiquete cada gaveta com o que tem e quando usar, e ele acerta de primeira. Para um agente, a etiqueta é tudo o que ele vê: o nome, a descrição e os parâmetros.",
        `No [[tool calling|tool-calling]], o agente escolhe a ferramenta lendo essas etiquetas. As três da tarefa “${TASK}” têm nomes com o mesmo prefixo (viagem_), descrições que dizem quando usar e um formato explícito para cada argumento no [[JSON Schema|json-schema]]. A Anthropic chama esse cuidado de interface agente-computador: projetar ferramentas para o modelo com o mesmo cuidado de uma interface para pessoas.`,
      ],
      keyIdea: "O agente só conhece a ferramenta pela etiqueta: nome, descrição e schema são o prompt dela.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "tools",
            piece: "block-diagram",
            blocks: [
              { id: "user", kind: "user", label: "pedido", col: 0, row: 0.5 },
              { id: "agent", kind: "agent", label: "agente", col: 1, row: 0.5 },
              { id: "flights", kind: "tool", label: "buscar_voos", col: 2, row: 0 },
              { id: "hotels", kind: "tool", label: "buscar_hoteis", col: 2, row: 1 },
              { id: "weather", kind: "cloud", label: "previsao_tempo", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "user", to: "agent" },
              { from: "agent", to: "flights", label: "lê a etiqueta" },
              { from: "agent", to: "hotels" },
              { from: "agent", to: "weather" },
            ],
            active: "agent",
          },
        ],
      },
      alt: "O pedido de viagem chega ao agente, em destaque, que escolhe entre três ferramentas etiquetadas: buscar voos, buscar hotéis e previsão do tempo.",
    },
    {
      id: "ids",
      shortTitle: "O id",
      title: "Chamada e resultado, ligados pelo id",
      tag: "mechanism",
      body: [
        "Num balcão de lavanderia, você deixa a roupa e recebe um tíquete com um número; para retirar, mostra o mesmo número. Com ferramentas é igual: cada chamada do modelo vem com um id, e o resultado precisa voltar com esse id, senão o modelo não sabe a que pedido ele responde.",
        `Na Anthropic, o modelo devolve um bloco tool_use com id, nome e input; o app responde com um [[tool result|tool-result]] que repete o id em tool_use_id. Na OpenAI, a chamada traz call_id e os argumentos como uma string JSON, e o resultado volta num item function_call_output com o mesmo call_id. Na cena, ${CALL_ID} aparece nas duas pontas.`,
      ],
      keyIdea: "Todo resultado de ferramenta volta com o id da chamada que o pediu.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "exchange",
            piece: "token-stream",
            tokens: exchange,
            keys: [ID_INDEX, RESULT_ID_INDEX],
            arcs: [{ from: ID_INDEX, to: RESULT_ID_INDEX, weight: 1, label: "mesmo id" }],
            color: "module-12",
          },
        ],
      },
      alt: `A troca em partes: ${exchange.join(", ")}. Um arco liga o id da chamada, ${CALL_ID}, ao tool_use_id do resultado.`,
    },
    {
      id: "parallel",
      shortTitle: "Em paralelo",
      title: "Três ferramentas na mesma volta",
      tag: "mechanism",
      body: [
        "Se você precisa de pão, leite e jornal, não volta para casa entre uma compra e outra: faz as três no mesmo passeio. Voos, hotéis e previsão do tempo não dependem um do outro, então o agente pode pedir os três de uma vez.",
        `São as [[chamadas paralelas|parallel-tool-calls]]: uma resposta do modelo com vários blocos de chamada, executados juntos pelo app e devolvidos juntos. Em sequência, a tarefa faz ${sequentialCalls} chamadas ao modelo e leva cerca de ${seconds(sequentialLatency)} com as latências de brinquedo; em paralelo, ${parallelCalls} chamadas e ${seconds(parallelLatency)}, porque a espera das ferramentas vira a da mais lenta. O parâmetro parallel_tool_calls, na OpenAI, e disable_parallel_tool_use, na Anthropic, desligam isso quando a ordem importa.`,
      ],
      keyIdea: "Ferramentas independentes na mesma volta: menos chamadas ao modelo e a espera da mais lenta, não a soma.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "latency",
            piece: "metrics-panel",
            metrics: [
              { id: "sequential", label: "em sequência", value: `${sequentialCalls} chamadas, ${seconds(sequentialLatency)}`, color: "danger" },
              { id: "parallel", label: "em paralelo", value: `${parallelCalls} chamadas, ${seconds(parallelLatency)}`, color: "success" },
            ],
            highlight: "parallel",
          },
          {
            id: "tools",
            piece: "block-diagram",
            blocks: [
              { id: "agent", kind: "agent", label: "1 resposta", col: 0, row: 0.5 },
              { id: "flights", kind: "tool", label: "buscar_voos", col: 1, row: 0 },
              { id: "hotels", kind: "tool", label: "buscar_hoteis", col: 1, row: 1 },
              { id: "weather", kind: "cloud", label: "previsao_tempo", col: 2, row: 0.5 },
              { id: "results", kind: "context", label: "3 resultados", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "agent", to: "flights" },
              { from: "agent", to: "hotels" },
              { from: "agent", to: "weather" },
              { from: "flights", to: "results" },
              { from: "hotels", to: "results" },
              { from: "weather", to: "results" },
            ],
            active: "results",
            done: ["agent", "flights", "hotels", "weather"],
          },
        ],
      },
      alt: `Uma única resposta do agente dispara as três ferramentas ao mesmo tempo, e os três resultados voltam juntos ao contexto. Em sequência: ${sequentialCalls} chamadas e ${seconds(sequentialLatency)}; em paralelo: ${parallelCalls} chamadas e ${seconds(parallelLatency)}.`,
    },
    {
      id: "errors",
      shortTitle: "Erros",
      title: "Um erro também é uma observação",
      tag: "example",
      body: [
        `Na primeira tentativa, o modelo chama ${badCall}. Se a ferramenta só devolver “erro 400”, o agente não sabe o que corrigir e tenta qualquer coisa. Se devolver “${errorText}”, ele corrige na volta seguinte: ${fixedCall}.`,
        "Na Anthropic, o tool_result tem um campo is_error para marcar a falha; em qualquer API, o conteúdo do erro é texto que o modelo lê. A Anthropic recomenda mensagens de erro acionáveis e resultados com informação útil (nomes em vez de ids opacos), com paginação ou truncamento quando a saída é grande. E lembre: o resultado de uma ferramenta é texto de fora, que pode carregar uma [[injeção indireta|indirect-prompt-injection]].",
      ],
      keyIdea: "Um erro bem escrito ensina o agente a se corrigir; um erro vago o faz chutar.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "retry",
            piece: "agent-loop",
            phases: [
              { id: "think", label: "pensar" },
              { id: "act", label: "chamar" },
              { id: "observe", label: "ler resultado" },
            ],
            active: "act",
            iteration: 2,
            maxIterations: 6,
            tool: fixedCall,
          },
        ],
      },
      alt: `Loop do agente na iteração 2 de 6, na fase de chamar, refazendo a chamada como ${fixedCall} depois de ler o erro “${errorText}”.`,
    },
    {
      id: "how-many",
      shortTitle: "Quantas",
      title: "Cada ferramenta custa contexto",
      tag: "tradeoff",
      body: [
        "Uma caixa com 60 chaves parecidas não ajuda o funcionário: ele demora para achar a certa e erra mais. Para o agente, cada ferramenta é mais uma etiqueta para ler em toda volta, e ferramentas parecidas competem entre si.",
        `As definições da aula têm em média ${integer(averageDefinition)} tokens. Como vão em toda chamada, ${toolCounts.map((count, index) => `${count} ferramentas somam ${integer(definitionSeries[index].value)}`).join(", ")} tokens por volta. A Anthropic recomenda menos ferramentas, que cubram fluxos inteiros, em vez de uma por endpoint da API. O [[tool choice|tool-choice]] completa o controle: auto (o modelo decide), forçar uma ferramenta específica, exigir alguma ferramenta ou desligar todas.`,
      ],
      keyIdea: "Ofereça poucas ferramentas, consolidadas e com nomes distintos: cada uma custa tokens e atenção em toda volta.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "definitions",
            piece: "chart",
            kind: "bar",
            series: definitionSeries,
            highlight: 0,
            color: "module-12",
          },
        ],
      },
      alt: `Tokens das definições por volta, conforme o número de ferramentas: ${definitionSeries.map((item) => `${item.label}, ${integer(item.value)}`).join("; ")}.`,
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Ferramentas que o agente usa bem",
      tag: "summary",
      body: [
        "Uma boa ferramenta para agentes tem nome distinto, descrição que diz quando usar, schema estrito, resultado com informação útil e erros que explicam como corrigir. Ferramentas independentes podem ir juntas na mesma volta.",
        "Com ferramentas e loop, o agente age passo a passo. Mas tarefas longas pedem mais: decidir a ordem dos passos antes de sair agindo. A próxima aula trata de planejamento e raciocínio.",
      ],
      keyIdea: "Etiqueta clara, schema estrito, resultado útil, erro acionável, paralelo quando independente.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "checklist",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "name", label: "nome distinto" },
              { id: "description", label: "descrição: quando usar" },
              { id: "schema", label: "schema estrito", color: "module-12" },
              { id: "result", label: "resultado útil" },
              { id: "error", label: "erro acionável" },
              { id: "parallel", label: "paralelo se independente", color: "brand" },
            ],
          },
        ],
      },
      alt: "Lista em chips: nome distinto, descrição que diz quando usar, schema estrito, resultado útil, erro acionável e chamadas em paralelo quando independentes.",
    },
  ],
  realWorldExample:
    "No texto “Writing effective tools for agents” (2025), a Anthropic recomenda agrupar ferramentas por prefixo de serviço (como asana_search e jira_search), devolver informação de alto sinal em vez de identificadores opacos e trocar várias ferramentas de baixo nível por uma que cubra o fluxo, como uma única ferramenta de agendamento no lugar de listar usuários, listar eventos e criar evento.",
  code: {
    language: "json",
    source: `{
  "role": "user",
  "content": [
    {
      "type": "tool_result",
      "tool_use_id": "toolu_01",
      "content": "3 voos GRU→LIS em 2026-05-14: 16h05, 11h20 de voo, R$ 4.180; ..."
    },
    {
      "type": "tool_result",
      "tool_use_id": "toolu_02",
      "is_error": true,
      "content": "data inválida: use AAAA-MM-DD, ex.: 2026-05-14"
    }
  ]
}`,
    caption: "Dois resultados de chamadas paralelas na API da Anthropic, cada um com o id da sua chamada; o segundo marca um erro com uma mensagem que o agente consegue corrigir.",
  },
  tradeOffs: {
    pros: [
      "Chamadas paralelas cortam idas ao modelo e tempo de espera",
      "Erros acionáveis deixam o agente se corrigir sem ajuda",
      "Poucas ferramentas bem descritas reduzem escolhas erradas e tokens",
    ],
    cons: [
      "Cada ferramenta oferecida custa tokens em toda volta",
      "Resultados grandes enchem o contexto se não forem paginados ou truncados",
      "Resultados de ferramentas são texto externo e podem carregar injeção de prompt",
    ],
    alternatives: [
      "Carregar ferramentas sob demanda, com uma busca de ferramentas, quando há muitas",
      "Expor ferramentas por um servidor MCP, tema do módulo 13",
    ],
  },
  knowledgeCheck: [
    {
      id: "parallel-or-not",
      prompt: "Um agente precisa (1) achar o id do cliente pelo e-mail e (2) listar os pedidos desse id. Vale pedir as duas chamadas em paralelo?",
      options: [
        "Sim: paralelo é sempre mais rápido",
        "Não: a segunda chamada depende do resultado da primeira, então elas precisam ir em voltas separadas",
        "Sim, desde que o tool_choice seja auto",
        "Não, porque a API não aceita duas ferramentas",
      ],
      correct: 1,
      explanation: "Chamadas paralelas servem para ferramentas independentes. Quando uma precisa do resultado da outra, a ordem importa e cada uma vai numa volta.",
      lesson: "12-05",
    },
    {
      id: "error-message",
      prompt: "A ferramenta buscar_pedidos devolve “Erro” quando o número vem com letras, e o agente repete a mesma chamada até o limite. Qual correção resolve melhor?",
      options: [
        "Aumentar o limite de iterações",
        "Devolver um erro acionável, como “número inválido: use só dígitos, ex.: 4821”, e marcar o resultado como erro",
        "Remover a ferramenta",
        "Esconder o erro e devolver uma lista vazia",
      ],
      correct: 1,
      explanation: "O agente só sabe o que o resultado diz. Um erro que explica o formato certo vira uma observação útil, e o agente corrige na volta seguinte.",
      lesson: "12-05",
    },
  ],
  related: ["05-10", "12-04", "13-05"],
  references: [
    { title: "Anthropic: Tool use with Claude", url: "https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview", kind: "docs" },
    { title: "OpenAI: Function calling", url: "https://developers.openai.com/api/docs/guides/function-calling", kind: "docs" },
    { title: "Anthropic: Writing effective tools for agents", url: "https://www.anthropic.com/engineering/writing-tools-for-agents", kind: "article" },
  ],
};

export default lesson;
