import { seededRandom } from "../../../lab/sampling";
import type { LessonContent } from "../../../types/content";

// Um robô num corredor de 6 casas aprende a chegar à saída só com recompensas. Os valores V(s) saem da
// equação de Bellman, e a tabela Q sai de Q-learning de verdade, com ε-greedy e semente fixa.

const CELLS = 6;
const GOAL = CELLS - 1;
const LEFT = 0;
const RIGHT = 1;
const GAMMA = 0.9;
const ALPHA = 0.5;
const EPSILON = 0.2;
const EPISODES = 30;
const BLOCK = 5;
const MAX_STEPS = 200;
const GOAL_REWARD = 1;

const fixed = (value: number, digits = 2) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const move = (cell: number, action: number) => Math.min(GOAL, Math.max(0, cell + (action === RIGHT ? 1 : -1)));
const rewardOf = (next: number) => (next === GOAL ? GOAL_REWARD : 0);

// Iteração de valor: V(s) = max sobre as ações de [recompensa + γ · V(próxima)], com V(saída) = 0.
const values = Array.from({ length: CELLS }, () => 0);
for (let sweep = 0; sweep < CELLS * 2; sweep += 1) {
  for (let cell = 0; cell < GOAL; cell += 1) {
    values[cell] = Math.max(
      ...[LEFT, RIGHT].map((action) => {
        const next = move(cell, action);
        return rewardOf(next) + (next === GOAL ? 0 : GAMMA * values[next]);
      }),
    );
  }
}
const cellValues = values.slice(0, GOAL);

// Q-learning: Q(s, a) ← Q(s, a) + α · [r + γ · max Q(s', ·) − Q(s, a)].
const random = seededRandom(7);
const q = Array.from({ length: CELLS }, () => [0, 0]);
const stepsPerEpisode: number[] = [];
const chooseAction = (cell: number) => {
  const [left, right] = q[cell];
  if (random() < EPSILON || left === right) return random() < 0.5 ? LEFT : RIGHT;
  return right > left ? RIGHT : LEFT;
};
for (let episode = 0; episode < EPISODES; episode += 1) {
  let cell = 0;
  let steps = 0;
  while (cell !== GOAL && steps < MAX_STEPS) {
    const action = chooseAction(cell);
    const next = move(cell, action);
    const target = rewardOf(next) + (next === GOAL ? 0 : GAMMA * Math.max(...q[next]));
    q[cell][action] += ALPHA * (target - q[cell][action]);
    cell = next;
    steps += 1;
  }
  stepsPerEpisode.push(steps);
}
const qTable = q.slice(0, GOAL);
const policyIsRight = qTable.every(([left, right]) => right > left);
const blocks = Array.from({ length: EPISODES / BLOCK }, (_, index) => {
  const slice = stepsPerEpisode.slice(index * BLOCK, (index + 1) * BLOCK);
  return { label: `${index * BLOCK + 1}-${(index + 1) * BLOCK}`, value: slice.reduce((sum, value) => sum + value, 0) / slice.length };
});
const firstBlock = blocks[0];
const lastBlock = blocks[blocks.length - 1];
const SHORTEST = GOAL;
const firstUpdate = ALPHA * GOAL_REWARD;

const lesson: LessonContent = {
  id: "01-04",
  subtitle: "Ninguém mostra a resposta certa: um agente tenta, recebe recompensas e aprende quais ações levam ao melhor resultado.",
  objectives: [
    "Descrever o ciclo agente, ação, ambiente e recompensa",
    "Calcular o valor de um estado com o fator de desconto",
    "Acompanhar o Q-learning preenchendo uma tabela de valores",
    "Entender o dilema entre explorar e aproveitar, e a ligação com o RLHF",
  ],
  steps: [
    {
      id: "loop",
      shortTitle: "Tentativa",
      title: "Aprender por tentativa e erro",
      tag: "context",
      body: [
        "Um cachorro aprende a sentar sem ler instruções: tenta coisas, e quando acerta ganha um petisco. [[Aprendizado por reforço|reinforcement-learning]] funciona assim. Um agente observa o estado do mundo, escolhe uma ação, recebe uma [[recompensa|reward]] e repete, milhares de vezes.",
        "A diferença para o supervisionado é profunda: ninguém diz qual era a ação certa, só o quanto o resultado foi bom, e muitas vezes bem depois. Num jogo de xadrez, a recompensa (vitória ou derrota) chega no fim, e o agente precisa descobrir quais das 40 jogadas mereceram o crédito.",
      ],
      keyIdea: "Reforço: sem gabarito, só recompensas, e o agente aprende a escolher ações que somam mais recompensa.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "rl-loop",
            piece: "agent-loop",
            phases: [
              { id: "observe", label: "observar estado" },
              { id: "act", label: "escolher ação" },
              { id: "reward", label: "receber recompensa" },
              { id: "learn", label: "atualizar" },
            ],
            active: "act",
            iteration: 1,
            maxIterations: EPISODES,
            tool: "mover(→)",
          },
        ],
      },
      alt: "Ciclo de quatro fases: observar o estado, escolher a ação, em destaque, receber a recompensa e atualizar; a ação do passo é mover para a direita.",
    },
    {
      id: "corridor",
      shortTitle: "Ambiente",
      title: "O agente e o corredor",
      tag: "mechanism",
      body: [
        `Nosso ambiente é um corredor de ${CELLS} casas. O robô começa na casa 0 e a saída fica na casa ${GOAL}. A cada passo ele vai para a esquerda ou para a direita. Chegar à saída vale +${GOAL_REWARD}; qualquer outro passo vale 0.`,
        "O agente não conhece o mapa: só vê em que casa está e qual recompensa recebeu. O que ele aprende é uma [[política|policy]], uma regra que diz qual ação tomar em cada casa. A política ótima aqui é óbvia para nós (sempre para a direita), e o interessante é ver o agente descobrir isso sozinho.",
      ],
      keyIdea: "O ambiente devolve estado e recompensa; o agente aprende uma política: estado → ação.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "world",
            piece: "block-diagram",
            blocks: [
              { id: "agent", kind: "agent", label: "robô (agente)", col: 0, row: 0 },
              { id: "env", kind: "app", label: `corredor ${CELLS} casas`, col: 2, row: 0 },
              { id: "goal", kind: "answer", label: `saída: +${GOAL_REWARD}`, col: 3, row: 0 },
              { id: "signal", kind: "eval", label: "recompensa", col: 2, row: 1 },
              { id: "memory", kind: "memory", label: "tabela Q", col: 0, row: 1 },
            ],
            edges: [
              { from: "agent", to: "env", label: "ação ← ou →" },
              { from: "env", to: "goal" },
              { from: "env", to: "signal" },
              { from: "signal", to: "memory", label: "atualiza" },
              { from: "memory", to: "agent", label: "política" },
            ],
            active: "env",
          },
        ],
      },
      alt: `O robô manda ações ao corredor de ${CELLS} casas, em destaque; a saída vale +${GOAL_REWARD}, o corredor devolve o estado e a recompensa, que atualizam a tabela Q, e a tabela dita a política do robô.`,
    },
    {
      id: "discount",
      shortTitle: "Desconto",
      title: "Uma recompensa longe vale menos",
      tag: "mechanism",
      body: [
        `Se a recompensa só chega na saída, como a casa 0 sabe que é boa? Pelo valor V(s): a recompensa futura que se espera a partir de cada casa. Cada passo de distância multiplica a recompensa pelo [[fator de desconto|discount-factor]] γ = ${fixed(GAMMA, 1)}.`,
        `A equação de Bellman diz que V(s) = max sobre as ações de [r + γ · V(próxima casa)]. Resolvendo, a casa ${GOAL - 1}, vizinha da saída, vale ${fixed(cellValues[GOAL - 1])}, e a casa 0 vale ${fixed(GAMMA, 1)}^${GOAL - 1} = ${fixed(cellValues[0])}. Com γ perto de 1, o agente é paciente; com γ perto de 0, só pensa no próximo passo.`,
      ],
      keyIdea: "O valor de um estado é a recompensa futura descontada: γ^k para uma recompensa a k passos.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "values",
            piece: "chart",
            kind: "bar",
            series: cellValues.map((value, cell) => ({ label: `casa ${cell}`, value: Number(value.toFixed(2)) })),
            max: 1,
            highlight: 0,
            color: "module-01",
          },
        ],
      },
      alt: `Barras com o valor de cada casa, crescendo em direção à saída: ${cellValues.map((value, cell) => `casa ${cell} vale ${fixed(value)}`).join(", ")}.`,
    },
    {
      id: "q-table",
      shortTitle: "Q-learning",
      title: "A tabela Q aprende com a experiência",
      tag: "example",
      body: [
        `O [[Q-learning|q-learning]] guarda Q(casa, ação), o quanto cada ação vale em cada casa, e começa com tudo em zero. Depois de cada passo, puxa o valor na direção de r + γ · max Q(próxima casa), com taxa α = ${fixed(ALPHA, 1)}. A primeira vez que o robô chega à saída pela casa ${GOAL - 1}, Q(${GOAL - 1}, →) vira 0 + ${fixed(ALPHA, 1)} · (${GOAL_REWARD} − 0) = ${fixed(firstUpdate, 1)}.`,
        `Episódio a episódio, o valor da saída escorre para trás pelo corredor. Depois de ${EPISODES} episódios, a tabela da cena ${policyIsRight ? "já prefere → em todas as casas" : "ainda não prefere → em todas as casas"}, e os números da coluna → se aproximam dos valores da equação de Bellman. O agente nunca recebeu o mapa: aprendeu só com as recompensas.`,
      ],
      keyIdea: "Q-learning: Q(s, a) ← Q(s, a) + α · [r + γ · max Q(s′, ·) − Q(s, a)].",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "q",
            piece: "matrix",
            rows: qTable.map((_, cell) => `casa ${cell}`),
            cols: ["←", "→"],
            values: qTable.map((row) => row.map((value) => Number(value.toFixed(2)))),
            scale: { min: 0, max: 1 },
            showValues: true,
            highlight: { row: GOAL - 1, col: RIGHT },
            color: "module-01",
          },
        ],
      },
      alt: `Tabela Q depois de ${EPISODES} episódios, com uma linha por casa e as colunas esquerda e direita; a coluna da direita tem os valores maiores e cresce perto da saída.`,
    },
    {
      id: "explore",
      shortTitle: "Explorar",
      title: "Explorar ou aproveitar",
      tag: "tradeoff",
      body: [
        `Se o robô sempre fizer a melhor ação que conhece, pode nunca descobrir uma melhor. Com [[ε-greedy|epsilon-greedy]], ele faz uma ação aleatória em ${Math.round(EPSILON * 100)}% das vezes e a melhor conhecida no resto. No começo, anda a esmo: ${fixed(firstBlock.value, 1)} passos em média nos episódios ${firstBlock.label}. No fim, ${fixed(lastBlock.value, 1)} passos nos episódios ${lastBlock.label}, perto do mínimo de ${SHORTEST}.`,
        "O preço do reforço é a quantidade de tentativas. Um corredor pede dezenas de episódios; um jogo de Atari, milhões de quadros. Errar de propósito é barato num simulador e caro num carro de verdade. E uma recompensa mal definida é explorada ao pé da letra: o agente acha atalhos que ninguém queria.",
      ],
      keyIdea: "Explorar custa recompensa agora para achar recompensa maior depois.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "episodes",
            piece: "chart",
            kind: "line",
            series: blocks.map((block) => ({ label: block.label, value: Number(block.value.toFixed(1)) })),
            highlight: blocks.length - 1,
            color: "module-01",
          },
        ],
      },
      alt: `Curva de passos por episódio, em médias de ${BLOCK} episódios: começa em ${fixed(firstBlock.value, 1)} passos e termina em ${fixed(lastBlock.value, 1)}, perto do mínimo de ${SHORTEST}.`,
    },
    {
      id: "rlhf",
      shortTitle: "Resumo",
      title: "Do corredor ao RLHF",
      tag: "summary",
      body: [
        "Juntando: agente, ambiente, recompensa, política, valor descontado e exploração. Com uma rede neural no lugar da tabela, o mesmo Q-learning aprendeu a jogar Atari olhando só os pixels da tela (DQN, DeepMind, 2013).",
        "Nos LLMs, o reforço entra no ajuste final. Pessoas comparam respostas, um modelo de recompensa aprende essas preferências e o LLM (a política) é otimizado para receber nota alta: é o RLHF, assunto da aula 04-13. Na próxima aula, voltamos ao supervisionado para ver de perto a classificação.",
      ],
      keyIdea: "Trocar a tabela por uma rede e o corredor por conversas leva do Q-learning ao RLHF.",
      scene: {
        kind: "pieces",
        layout: "single",
        pieces: [
          {
            id: "rlhf",
            piece: "block-diagram",
            blocks: [
              { id: "llm", kind: "llm", label: "LLM (política)", col: 0, row: 0.5 },
              { id: "answers", kind: "answer", label: "respostas", col: 1, row: 0 },
              { id: "people", kind: "user", label: "pessoas comparam", col: 2, row: 0 },
              { id: "reward", kind: "eval", label: "recompensa (RM)", col: 2, row: 1 },
            ],
            edges: [
              { from: "llm", to: "answers" },
              { from: "answers", to: "people" },
              { from: "people", to: "reward", label: "preferências" },
              { from: "reward", to: "llm", label: "recompensa" },
            ],
            active: "reward",
          },
        ],
      },
      alt: "O LLM, que faz o papel da política, gera respostas; pessoas comparam as respostas, um modelo de recompensa aprende as preferências e devolve a recompensa ao LLM.",
    },
  ],
  realWorldExample:
    "O AlphaGo, da DeepMind, venceu o campeão Lee Sedol por 4 a 1 em 2016. Ele começou imitando partidas de humanos (supervisionado) e depois melhorou jogando milhões de partidas contra si mesmo, com a vitória como recompensa.",
  code: {
    language: "python",
    source: `import random

CELLS, GOAL = 6, 5
ALPHA, GAMMA, EPSILON = 0.5, 0.9, 0.2
q = [[0.0, 0.0] for _ in range(CELLS)]  # [esquerda, direita]

for episode in range(30):
    s = 0
    while s != GOAL:
        explore = random.random() < EPSILON or q[s][0] == q[s][1]
        a = random.randrange(2) if explore else q[s].index(max(q[s]))
        s2 = min(GOAL, max(0, s + (1 if a == 1 else -1)))
        r = 1.0 if s2 == GOAL else 0.0
        target = r + (0.0 if s2 == GOAL else GAMMA * max(q[s2]))
        q[s][a] += ALPHA * (target - q[s][a])
        s = s2`,
    caption: "O Q-learning da aula: o corredor, o ε-greedy e a atualização da tabela em poucas linhas.",
  },
  tradeOffs: {
    pros: [
      "Aprende sem gabarito, só com um sinal de recompensa",
      "Resolve decisões em sequência, em que o efeito de uma ação aparece depois",
      "Pode superar os exemplos humanos, como no Go",
    ],
    cons: [
      "Precisa de muitas tentativas, quase sempre num simulador",
      "Recompensa mal definida gera comportamentos indesejados",
      "Treino instável e sensível a hiperparâmetros como γ, α e ε",
    ],
    alternatives: [
      "Aprendizado por imitação, copiando demonstrações de especialistas",
      "DPO, que otimiza preferências sem um modelo de recompensa separado",
    ],
  },
  knowledgeCheck: [
    {
      id: "gamma-zero",
      prompt: "No corredor da aula, o fator de desconto γ vai para 0. O que acontece com o valor da casa 0?",
      options: [
        "Continua igual",
        "Vai a 0: o agente só valoriza a recompensa do próximo passo, e a saída está a 5 passos",
        "Vai a 1",
        "Fica negativo",
      ],
      correct: 1,
      explanation: "Com γ = 0, V(s) = r imediato. Só a casa vizinha da saída recebe algo; as outras valem 0 e o agente não tem motivo para andar.",
      lesson: "01-04",
    },
    {
      id: "no-exploration",
      prompt: "Um agente com ε = 0 encontrou um caminho que dá recompensa 3 e nunca testa outro. Qual o risco?",
      options: [
        "Nenhum: ele já aprendeu",
        "Ficar preso num caminho pior, sem descobrir um que dá recompensa 10",
        "A tabela Q ficar negativa",
        "O ambiente parar de dar recompensas",
      ],
      correct: 1,
      explanation: "Sem exploração, o agente só aproveita o que conhece. Ações nunca testadas mantêm o valor inicial e nunca têm chance de se mostrar melhores.",
      lesson: "01-04",
    },
  ],
  related: ["01-03", "01-05", "04-13"],
  references: [
    { title: "Playing Atari with Deep Reinforcement Learning (DQN)", url: "https://arxiv.org/abs/1312.5602", kind: "paper" },
    { title: "OpenAI Spinning Up in Deep RL", url: "https://spinningup.openai.com/", kind: "docs" },
    { title: "Gymnasium: ambientes de reforço", url: "https://gymnasium.farama.org/", kind: "docs" },
  ],
};

export default lesson;
