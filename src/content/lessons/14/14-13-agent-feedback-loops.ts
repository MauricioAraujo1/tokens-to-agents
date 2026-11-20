import type { LessonContent } from "../../../types/content";

// Sucesso com e sem verificação, calculado aqui. Cada tentativa do agente acerta com chance p. Sem checagem,
// ele declara pronto depois da primeira tentativa. Com checagem, um teste pega um erro com sensibilidade s (e
// nunca reprova trabalho certo); o agente lê a falha e tenta de novo, até k tentativas. Três desfechos:
// sucesso, erro silencioso (o teste deixou passar) e desistência honesta (bateu no limite, falhando à vista).

const P = 0.6;
const SENSITIVITY = 0.9;
const MAX_ATTEMPTS = 3;

function outcomes(attempts: number, p: number, sensitivity: number) {
  const retry = (1 - p) * sensitivity;
  let success = 0;
  let silent = 0;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    success += retry ** attempt * p;
    silent += retry ** attempt * (1 - p) * (1 - sensitivity);
  }
  return { success, silent, gaveUp: retry ** attempts };
}

const withoutCheck = { success: P, silent: 1 - P };
const withCheck = outcomes(MAX_ATTEMPTS, P, SENSITIVITY);
const curve = Array.from({ length: 6 }, (_, index) => ({ attempts: index + 1, ...outcomes(index + 1, P, SENSITIVITY) }));
const weakTest = outcomes(MAX_ATTEMPTS, P, 0.5);
const silentReduction = 1 - withCheck.silent / withoutCheck.silent;

const percent = (value: number) => `${(value * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

const lesson: LessonContent = {
  id: "14-13",
  subtitle: "Cozinhar provando a comida: dar ao agente uma checagem que responde passou ou falhou, e deixar que ele feche o ciclo sozinho.",
  objectives: [
    "Descrever um feedback loop e o que torna um sinal útil para o agente",
    "Escolher quem fecha o ciclo: o próprio agente, um hook, um revisor independente",
    "Calcular a taxa de sucesso com e sem um loop de verificação",
    "Proteger a checagem para que o agente não a contorne",
  ],
  steps: [
    {
      id: "taste",
      shortTitle: "Provar",
      title: "Quem cozinha prova",
      tag: "context",
      body: [
        "Um cozinheiro que nunca prova a comida depende da sorte e da reclamação do cliente. Quem prova ajusta o sal antes de servir. A diferença não é talento: é ter um sinal no meio do caminho.",
        "Um [[feedback loop|feedback-loop]] dá esse sinal ao agente: ele age, o ambiente responde (um teste, um erro do compilador, uma captura de tela) e ele corrige. A página de boas práticas do Claude Code resume o problema: o agente para quando o trabalho parece pronto, e sem algo para rodar que diga se está pronto, “parece pronto” é tudo o que ele tem.",
      ],
      keyIdea: "Sem um sinal do ambiente, o agente só sabe que o trabalho parece pronto.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "loop",
            piece: "agent-loop",
            phases: [
              { id: "edit", label: "editar" },
              { id: "check", label: "rodar a checagem" },
              { id: "read", label: "ler a saída" },
              { id: "fix", label: "corrigir" },
            ],
            active: "check",
            iteration: 1,
            maxIterations: MAX_ATTEMPTS,
            tool: 'Bash("pnpm test")',
          },
        ],
      },
      alt: `Ciclo de feedback em quatro fases: editar, rodar a checagem, em destaque, ler a saída e corrigir; na tentativa 1 de ${MAX_ATTEMPTS}, o agente roda pnpm test.`,
    },
    {
      id: "signal",
      shortTitle: "O sinal",
      title: "Uma checagem que diz passou ou falhou",
      tag: "mechanism",
      body: [
        "Qualquer coisa que o agente consiga rodar e ler serve: um arquivo de teste, o código de saída do build, um linter, um script que compara a saída com um gabarito, uma captura de tela ao lado do mockup. O que transforma isso num [[loop de verificação|verification-loop]] é a resposta binária e a mensagem que vem junto.",
        "A qualidade do sinal manda. “Falhou” não ensina nada; “esperava 200, recebeu 401 em POST /login, linha 42” aponta o conserto. Por isso a documentação diz que, se o repositório já tem uma checagem, a linha mais útil do CLAUDE.md é o comando que a roda. E vale pedir evidência: o comando e a saída, não um “todos os testes passam”.",
      ],
      keyIdea: "Uma checagem útil responde passou ou falhou e diz onde falhou.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "check-flow",
            piece: "block-diagram",
            blocks: [
              { id: "agent", kind: "agent", label: "agente", col: 0, row: 0.5 },
              { id: "edit", kind: "tool", label: "edição", col: 1, row: 0.5 },
              { id: "eval", kind: "eval", label: "testes", col: 2, row: 0.5 },
              { id: "done", kind: "answer", label: "passou", col: 3, row: 0 },
              { id: "fail", kind: "no-result", label: "401 na linha 42", col: 3, row: 1 },
            ],
            edges: [
              { from: "agent", to: "edit" },
              { from: "edit", to: "eval", label: "roda" },
              { from: "eval", to: "done" },
              { from: "eval", to: "fail", label: "falhou", variant: "alternative" },
              { from: "fail", to: "agent", label: "mensagem", variant: "alternative" },
            ],
            active: "eval",
            done: ["agent", "edit"],
          },
        ],
      },
      alt: "O agente edita e roda os testes, em destaque; se passam, o trabalho termina; se falham, a mensagem “401 na linha 42” volta ao agente por um caminho tracejado.",
    },
    {
      id: "who-closes",
      shortTitle: "Quem fecha",
      title: "Quem fecha o ciclo",
      tag: "mechanism",
      body: [
        "Dá para fechar o ciclo com rigor crescente. No pedido: “rode os testes de auth e continue até passarem”, e o agente decide quando está satisfeito. Como hook: um [[Stop hook|stop-hook]] roda a checagem sempre que o agente tenta terminar, e o harness o manda de volta se falhar. Por alguém que não escreveu o código: um revisor em subagente, com janela limpa, que não foi convencido pelo raciocínio que produziu a mudança.",
        "Um revisor pedindo “ache problemas” sempre acha algum. A documentação do Claude Code sugere mandar revisar contra a spec e relatar só falhas de correção, pulando estilo, para não encher o código de camadas extras. Acima de tudo isso, ainda existem as checagens fora do agente, como a pipeline de integração contínua e a pessoa que aprova o merge.",
      ],
      keyIdea: "Do pedido ao hook ao revisor independente: quanto mais caro o erro, mais longe do agente fica a checagem.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "closers",
            piece: "pipeline",
            stages: [
              { id: "prompt", label: "pedido no prompt" },
              { id: "goal", label: "objetivo conferido" },
              { id: "hook", label: "Stop hook", color: "module-14" },
              { id: "review", label: "revisor independente" },
              { id: "human", label: "pessoa aprova" },
            ],
            active: "hook",
            done: ["prompt", "goal"],
          },
        ],
      },
      alt: "Etapas de quem fecha o ciclo, em rigor crescente: pedido no prompt, objetivo conferido, Stop hook, em destaque, revisor independente e pessoa que aprova.",
    },
    {
      id: "math",
      shortTitle: "A conta",
      title: "Sucesso com e sem verificação",
      tag: "example",
      body: [
        `Cada tentativa acerta ${percent(P)}. Sem checagem, o agente declara pronto na primeira: ${percent(withoutCheck.success)} de sucesso e ${percent(withoutCheck.silent)} de erro silencioso, entregue como se estivesse certo. Com um teste que pega ${percent(SENSITIVITY)} dos erros e até ${MAX_ATTEMPTS} tentativas, o sucesso vai a ${percent(withCheck.success)}, o erro silencioso cai para ${percent(withCheck.silent)} e ${percent(withCheck.gaveUp)} terminam em desistência honesta: falhou, mas à vista.`,
        `O erro silencioso cai ${percent(silentReduction)}, e é ele que machuca em produção. A sensibilidade do teste pesa: com um teste que pega só metade dos erros, o sucesso fica em ${percent(weakTest.success)} e o erro silencioso sobe para ${percent(weakTest.silent)}. Tentativas extras ajudam pouco depois da terceira; um teste melhor ajuda sempre.`,
      ],
      keyIdea: "Verificação aumenta o sucesso e, mais importante, transforma erros silenciosos em falhas visíveis.",
      scene: {
        kind: "pieces",
        layout: "column",
        pieces: [
          {
            id: "success-curve",
            piece: "chart",
            kind: "line",
            series: curve.map((point) => ({ label: `${point.attempts} tent.`, value: Number(point.success.toFixed(3)) })),
            max: 1,
            highlight: MAX_ATTEMPTS - 1,
            color: "module-14",
          },
          {
            id: "outcome-numbers",
            piece: "metrics-panel",
            metrics: [
              { id: "without", label: "sem checagem: erro silencioso", value: percent(withoutCheck.silent), color: "danger" },
              { id: "success", label: `com checagem (${MAX_ATTEMPTS} tent.): sucesso`, value: percent(withCheck.success), color: "success" },
              { id: "silent", label: "com checagem: erro silencioso", value: percent(withCheck.silent) },
              { id: "gaveup", label: "desistência honesta", value: percent(withCheck.gaveUp) },
            ],
            highlight: "success",
          },
        ],
      },
      alt: `Curva de sucesso por número máximo de tentativas, de ${percent(curve[0].success)} com uma até ${percent(curve[curve.length - 1].success)} com seis. Sem checagem, ${percent(withoutCheck.silent)} de erro silencioso; com checagem e ${MAX_ATTEMPTS} tentativas, ${percent(withCheck.success)} de sucesso, ${percent(withCheck.silent)} de erro silencioso e ${percent(withCheck.gaveUp)} de desistência honesta.`,
    },
    {
      id: "gaming",
      shortTitle: "Contornar",
      title: "Quando o agente mexe no termômetro",
      tag: "tradeoff",
      body: [
        "Se a febre baixa quebrando o termômetro, o paciente continua doente. Um agente sob pressão para fazer o teste passar pode apagar o teste, enfraquecer a asserção ou marcar a tarefa como concluída sem rodar nada. A checagem passa e o trabalho continua errado.",
        "No harness de tarefas longas da Anthropic, a lista de features em JSON só permite que o agente mude o campo passes, e as instruções dizem que é inaceitável remover ou editar testes. Dá para ir além: uma regra de negação ou um hook que barra edições na pasta de testes durante a implementação, e um revisor que confere o diff dos testes. Feedback só vale se o agente não puder reescrevê-lo.",
      ],
      keyIdea: "Proteja a checagem: o agente não pode ter permissão de mudar o que mede o próprio trabalho.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "check-flow",
            piece: "block-diagram",
            blocks: [
              { id: "agent", kind: "agent", label: "agente", col: 0, row: 0.5 },
              { id: "edit", kind: "tool", label: "edita src/", col: 1, row: 0 },
              { id: "guard", kind: "guardrail", label: "deny Edit(tests/**)", col: 1, row: 1 },
              { id: "eval", kind: "eval", label: "testes intactos", col: 2, row: 0.5 },
              { id: "done", kind: "answer", label: "passou de verdade", col: 3, row: 0.5 },
            ],
            edges: [
              { from: "agent", to: "edit" },
              { from: "agent", to: "guard", label: "tenta mudar teste", variant: "alternative" },
              { from: "edit", to: "eval", label: "roda" },
              { from: "eval", to: "done" },
            ],
            active: "guard",
          },
        ],
      },
      alt: "O agente edita src/ e roda os testes intactos até passarem de verdade; a tentativa de mudar os testes é barrada por uma regra de negação, em destaque.",
    },
    {
      id: "summary",
      shortTitle: "Resumo",
      title: "Feche o ciclo dentro do ambiente",
      tag: "summary",
      body: [
        "Dê ao agente algo que ele possa rodar e que responda passou ou falhou com uma mensagem útil. Escolha quem fecha o ciclo conforme o custo do erro, proteja a checagem contra edição e peça evidência. O ganho vem duas vezes: mais acertos e menos erros silenciosos.",
        "A última aula do módulo junta todas as peças num ambiente confiável para agentes que trabalham por muitas sessões: instruções, permissões, sandbox, memória e feedback, mais o que faz o ambiente subir igual toda vez.",
      ],
      keyIdea: "O agente melhora quando o ambiente responde; o harness garante que a resposta exista e seja honesta.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "recap",
            piece: "pipeline",
            display: "chips",
            stages: [
              { id: "runnable", label: "checagem executável" },
              { id: "message", label: "falha com mensagem útil", color: "module-14" },
              { id: "closer", label: "quem fecha conforme o risco" },
              { id: "protect", label: "testes protegidos", color: "danger" },
              { id: "evidence", label: "evidência, não promessa" },
            ],
          },
        ],
      },
      alt: "Chips de resumo: checagem executável, falha com mensagem útil, quem fecha conforme o risco, testes protegidos e evidência em vez de promessa.",
    },
  ],
  realWorldExample:
    "No artigo “Effective harnesses for long-running agents”, a Anthropic conta que o agente marcava features como prontas depois de testes unitários ou chamadas com curl, sem perceber que a feature não funcionava de ponta a ponta. O desempenho melhorou quando ele foi instruído a testar como um usuário, com automação de navegador via o servidor MCP do Puppeteer, o que revelou bugs invisíveis no código.",
  code: {
    language: "python",
    source: `def outcomes(attempts: int, p: float, sensitivity: float) -> dict:
    retry = (1 - p) * sensitivity          # errou e o teste pegou: tenta de novo
    success = sum(retry**i * p for i in range(attempts))
    silent = sum(retry**i * (1 - p) * (1 - sensitivity) for i in range(attempts))
    return {"success": success, "silent": silent, "gave_up": retry**attempts}

print(outcomes(1, 0.6, 0.0))   # sem checagem: 60% sucesso, 40% erro silencioso
print(outcomes(3, 0.6, 0.9))   # com checagem e 3 tentativas`,
    caption: "A conta da aula: com checagem, o erro só passa quando o teste deixa escapar; o resto vira nova tentativa ou desistência visível.",
  },
  tradeOffs: {
    pros: [
      "O agente corrige sozinho, sem você virar a suíte de testes",
      "Erros silenciosos viram falhas visíveis",
      "Checagens executáveis funcionam igual para agentes e pessoas",
    ],
    cons: [
      "Cada volta custa tempo e tokens",
      "Testes fracos dão confiança falsa",
      "O agente pode tentar contornar a checagem, que precisa de proteção",
    ],
    alternatives: ["Revisão humana no fim, quando não há checagem automatizável", "Avaliação por outro modelo, com critérios explícitos, para saídas sem gabarito"],
  },
  knowledgeCheck: [
    {
      id: "silent-error",
      prompt: "Cada tentativa acerta 70%. Um teste pega 80% dos erros e o agente tem só 1 tentativa. Qual é a chance de erro silencioso?",
      options: ["30%", "24%", "6%", "0%"],
      correct: 2,
      explanation: "Erro silencioso é errar e o teste deixar passar: 0,3 × (1 − 0,8) = 0,06. Os outros 24% são erros pegos pelo teste, que viram falha visível ou nova tentativa.",
      lesson: "14-13",
    },
    {
      id: "gaming-fix",
      prompt: "O agente fez a suíte passar trocando assertEqual por assertTrue(True). Qual mudança de harness evita isso?",
      options: [
        "Pedir no prompt para não fazer isso de novo",
        "Barrar edições na pasta de testes durante a implementação e revisar o diff dos testes separadamente",
        "Aumentar o número de tentativas",
        "Desligar os testes",
      ],
      correct: 1,
      explanation: "O agente não deve poder mudar o que mede o próprio trabalho. Uma regra de negação ou um hook sobre a pasta de testes garante isso, e a revisão pega o resto.",
      lesson: "14-13",
    },
  ],
  related: ["14-12", "14-14", "12-18"],
  references: [
    { title: "Claude Code: Best practices", url: "https://code.claude.com/docs/en/best-practices", kind: "docs" },
    { title: "Anthropic: Effective harnesses for long-running agents", url: "https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents", kind: "article" },
    { title: "Shinn et al. (2023), Reflexion: Language Agents with Verbal Reinforcement Learning", url: "https://arxiv.org/abs/2303.11366", kind: "paper" },
  ],
};

export default lesson;
