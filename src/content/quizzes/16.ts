import type { QuizContent } from "../../types/content";

// Quiz do módulo 16 (PRAC-01.1). Cada questão aponta para a aula que ensina o assunto (PRAC-01.4) e cobra uma
// aplicação do conteúdo, com as contas feitas a partir dos números do enunciado.

const quiz: QuizContent = {
  module: "16",
  questions: [
    {
      id: "small-eval",
      prompt:
        "Num eval de 50 casos, a versão nova do prompt acerta 76% e a antiga 72%. Com p perto de 0,75, a meia largura do intervalo de 95% é de cerca de 1,96 · √(0,75 · 0,25 / 50). O que dá para concluir?",
      options: [
        "A versão nova é melhor, com 4 pontos de vantagem",
        "Nada ainda: o intervalo é de cerca de ±12 pontos, muito maior que a diferença; é preciso mais casos ou olhar os casos que mudaram",
        "A versão antiga é melhor",
        "O eval está quebrado",
      ],
      correct: 1,
      explanation:
        "1,96 · √(0,1875 / 50) ≈ 0,12. Uma diferença de 4 pontos com ±12 de incerteza é ruído. Mais casos estreitam o intervalo, e a lista de casos que mudaram de lado mostra o que a versão nova quebrou.",
      lesson: "16-01",
    },
    {
      id: "token-f1",
      prompt:
        "A referência é “entrega em 5 dias úteis” e a resposta é “5 dias úteis”. Sem artigos para remover, qual é o token F1?",
      options: ["0,60", "0,75", "1,00", "0,00"],
      correct: 1,
      explanation:
        "As 3 palavras da resposta estão na referência: precision 3/3 = 1 e recall 3/5 = 0,6. F1 = 2 · 1 · 0,6 / 1,6 = 0,75. O exact match seria 0, apesar de a resposta estar certa.",
      lesson: "16-02",
    },
    {
      id: "tool-precision",
      prompt:
        "A trajetória de referência de uma tarefa tem 4 chamadas de ferramenta. O agente fez 6 chamadas, e 3 delas casam com a referência. Quanto valem precision e recall das chamadas?",
      options: ["Precision 0,75 e recall 0,50", "Precision 0,50 e recall 0,75", "As duas 0,50", "Precision 0,60 e recall 0,75"],
      correct: 1,
      explanation:
        "Precision = casadas / feitas = 3/6 = 0,5: metade das chamadas era desnecessária. Recall = casadas / esperadas = 3/4 = 0,75: faltou uma chamada da referência, que pode ser uma verificação obrigatória.",
      lesson: "16-05",
    },
    {
      id: "kappa",
      prompt:
        "Um juiz LLM e uma pessoa concordam em 80% das respostas. Pela taxa de aprovação de cada um, a concordância esperada ao acaso é 50%. Qual é o kappa de Cohen?",
      options: ["0,30", "0,60", "0,80", "0,40"],
      correct: 1,
      explanation: "κ = (p_o − p_e) / (1 − p_e) = (0,8 − 0,5) / 0,5 = 0,6. Os 80% brutos incluem a concordância que o acaso já daria.",
      lesson: "16-06",
    },
    {
      id: "cost-per-user",
      prompt:
        "A equipe quer somar o custo de LLM por cliente a partir dos traces instrumentados com OpenTelemetry. Quais atributos dos spans de chamada de modelo ela precisa somar?",
      options: [
        "A duração dos spans",
        "gen_ai.usage.input_tokens e gen_ai.usage.output_tokens, agrupados pelo cliente da requisição e multiplicados pelo preço do modelo de cada span",
        "O trace id",
        "O número de spans por trace",
      ],
      correct: 1,
      explanation:
        "As convenções gen_ai registram os tokens de entrada e de saída de cada chamada, e gen_ai.request.model diz qual preço aplicar. Duração e contagem de spans não dizem quanto foi cobrado.",
      lesson: "16-08",
    },
    {
      id: "semantic-entropy",
      prompt:
        "Para a mesma pergunta, 10 respostas sorteadas caem em dois significados, 5 e 5. Para outra pergunta, as 10 são paráfrases de um único significado. Qual delas indica que o modelo não sabe a resposta?",
      options: [
        "A segunda, porque as strings são todas diferentes",
        "A primeira: entropia semântica de ln 2 ≈ 0,69 nats, contra 0 da segunda",
        "As duas igualmente",
        "Nenhuma: entropia não mede dúvida",
      ],
      correct: 1,
      explanation:
        "Agrupadas por significado, a primeira tem dois grupos iguais, entropia −2 · 0,5 · ln 0,5 = ln 2; a segunda tem um grupo só, entropia 0. Paráfrases não são dúvida.",
      lesson: "16-09",
    },
    {
      id: "guardrail-rates",
      prompt:
        "Num conjunto rotulado com 40 mensagens nocivas e 160 legítimas, o guardrail barra 50 mensagens, 36 delas nocivas. Quanto valem recall, precision e recusa indevida?",
      options: [
        "Recall 90%, precision 72%, recusa indevida 8,75%",
        "Recall 72%, precision 90%, recusa indevida 14%",
        "Recall 90%, precision 90%, recusa indevida 0%",
        "Recall 36%, precision 50%, recusa indevida 28%",
      ],
      correct: 0,
      explanation:
        "Recall = 36/40 = 90%. Precision = 36/50 = 72%. As 14 barradas por engano são legítimas: 14/160 = 8,75% das mensagens legítimas recusadas.",
      lesson: "16-10",
    },
    {
      id: "injection-defense",
      prompt:
        "Um agente lê e-mails de clientes e pode fazer transferências. Defesa A: ataques que passam 6%, utilidade 92%. Defesa B: 0%, utilidade 80%, porque bloqueia transferências cujo destino veio de conteúdo não confiável. Qual faz mais sentido aqui?",
      options: [
        "A, porque a utilidade é maior",
        "B: com uma ferramenta que move dinheiro, o estrago de um ataque que passa justifica perder utilidade",
        "Nenhuma: é melhor um prompt mais firme",
        "As duas são equivalentes",
      ],
      correct: 1,
      explanation:
        "ASR e utilidade se pesam pelo estrago possível. Com transferências, 6% de ataques bem-sucedidos é inaceitável; a política de fluxo de dados bloqueia o caso por construção.",
      lesson: "16-11",
    },
    {
      id: "pseudonymization",
      prompt:
        "O app troca o CPF por <CPF_1> antes de mandar a mensagem ao provedor, guarda o par num cofre próprio e troca de volta na resposta. O que essa técnica garante, e o que não garante?",
      options: [
        "Garante que nenhum dado pessoal sai do servidor, inclusive nomes e endereços",
        "Tira do provedor e dos logs o CPF detectado, mantendo a resposta útil; não protege o que o detector não achou",
        "Torna o CPF ilegível também para o próprio app",
        "Dispensa controle de acesso",
      ],
      correct: 1,
      explanation:
        "Pseudonimização protege só o que foi detectado. Nomes, endereços e formatos inesperados escapam de regex e precisam de outras camadas: detecção de entidades, retenção curta e acesso restrito.",
      lesson: "16-12",
    },
    {
      id: "drift-alert",
      prompt:
        "A taxa diária de respostas sem suporte teve média 4,0% e desvio-padrão 0,5 ponto na semana de referência. Nos dias seguintes veio 4,2%, 4,8%, 5,3% e 5,8%. Com o limite média + 3σ, em que dia o alerta dispara?",
      options: ["No 2º dia", "No 3º dia", "No 4º dia", "Não dispara"],
      correct: 2,
      explanation:
        "Limite = 4,0 + 3 × 0,5 = 5,5%. Só o 4º dia, com 5,8%, passa dele. Com 2σ (5,0%), o alerta viria no 3º dia, ao preço de mais alarmes falsos.",
      lesson: "16-13",
    },
  ],
};

export default quiz;
