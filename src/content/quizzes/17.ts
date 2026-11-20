import type { QuizContent } from "../../types/content";

// Quiz do módulo 17 (PRAC-01.1). Cada questão aponta para a aula que ensina o assunto (PRAC-01.4) e cobra uma
// aplicação do conteúdo, com as contas feitas a partir dos números do enunciado.

const quiz: QuizContent = {
  module: "17",
  questions: [
    {
      id: "key-in-app",
      prompt: "Um time quer chamar a API do modelo direto do app mobile, com a chave embutida, para economizar um backend. Qual é o problema principal?",
      options: [
        "A latência sobe muito",
        "Qualquer um que extrair a chave do app gasta em nome da empresa; a chave precisa ficar num servidor",
        "O provedor não aceita chamadas de celular",
        "O streaming não funciona no celular",
      ],
      correct: 1,
      explanation: "A chave identifica a conta e a cobrança. Embutida no app, ela pode ser extraída. O backend (ou um gateway) guarda a chave, aplica limites por usuário e registra o uso.",
      lesson: "17-01",
    },
    {
      id: "tpm-binding",
      prompt: "A conta tem 2.000 RPM e 400.000 TPM. Um prompt de RAG cresce de 1.000 para 5.000 tokens por pedido, com 300 de resposta. O que acontece com o limite efetivo?",
      options: [
        "Continua em 2.000 pedidos por minuto",
        "Cai de cerca de 307 para cerca de 75 pedidos por minuto, limitado pelo TPM",
        "Sobe, porque há menos pedidos",
        "Cai para 400 pedidos por minuto",
      ],
      correct: 1,
      explanation: "Antes, 400.000 ÷ 1.300 ≈ 307 por minuto; depois, 400.000 ÷ 5.300 ≈ 75. O TPM já limitava antes do RPM, e prompts maiores gastam a cota em tokens.",
      lesson: "17-02",
    },
    {
      id: "break-even-ops",
      prompt: "Duas GPUs custam US$ 3.600 por mês e a operação mais US$ 2.400. A API equivalente cobra US$ 0,60 por milhão de tokens. A partir de quantos tokens por mês o servidor próprio sai mais barato?",
      options: ["6 bilhões", "10 bilhões", "4 bilhões", "600 milhões"],
      correct: 1,
      explanation: "O custo fixo é US$ 6.000. Equilíbrio = 6.000 ÷ 0,60 = 10.000 milhões de tokens, ou 10 bilhões por mês. Esquecer a operação levaria a 6 bilhões, um erro de 40%.",
      lesson: "17-03",
    },
    {
      id: "gpus-for-qps",
      prompt: "A meta é 20 pedidos por segundo com 500 tokens de saída. Cada réplica, com 2 GPUs, entregou 2.500 tokens por segundo no teste de carga. A 80% de utilização e com uma réplica de reserva, quantas GPUs?",
      options: ["8", "10", "12", "14"],
      correct: 2,
      explanation: "Demanda = 20 × 500 = 10.000 tokens por segundo. Réplicas = ⌈10.000 ÷ (2.500 × 0,8)⌉ = 5, mais 1 de reserva = 6, ou 12 GPUs. Arredondando para nós de 8 GPUs, 2 nós com 4 GPUs livres.",
      lesson: "17-04",
    },
    {
      id: "startup-probe",
      prompt: "Um pod do vLLM leva 155 s para carregar os pesos. O startup probe roda a cada 10 s. Qual é o menor failureThreshold que não mata o pod durante a carga?",
      options: ["3", "10", "15", "16"],
      correct: 3,
      explanation: "O prazo é periodSeconds × failureThreshold. Com 15, são 150 s, antes de a carga terminar; com 16, 160 s. Na prática, use bem mais, porque um nó novo pode baixar a imagem mais devagar.",
      lesson: "17-06",
    },
    {
      id: "drift-decision",
      prompt: "O plano diário do Terraform acusa que o pool de GPU tem 6 nós na nuvem e 4 no código. Alguém aumentou no console durante um pico real que vai continuar. O que fazer?",
      options: [
        "Aplicar o plano e voltar para 4 nós",
        "Atualizar o código para 6 nós (ou para um autoscaler) por pull request, e aí o plano fica limpo",
        "Apagar o state",
        "Ignorar o alerta para sempre",
      ],
      correct: 1,
      explanation: "O drift diz que código e nuvem divergem, não qual está certo. Se o pico é real, o certo é mudar o código e revisar; aplicar o plano derrubaria capacidade em pleno pico.",
      lesson: "17-08",
    },
    {
      id: "hpa-down",
      prompt: "São 8 réplicas com 6 pedidos em andamento cada, e o alvo é 16 por réplica, com mínimo de 2. Quantas réplicas o HPA quer?",
      options: ["2", "3", "6", "8"],
      correct: 1,
      explanation: "⌈8 × 6 ÷ 16⌉ = ⌈3⌉ = 3, acima do mínimo de 2. A janela de estabilização faz a descida esperar alguns minutos para não desligar réplicas num vale curto.",
      lesson: "17-09",
    },
    {
      id: "region-reserve",
      prompt: "O pico pede 18 réplicas e o serviço precisa aguentar a perda de uma região. Quantas réplicas no total com 3 regiões, e quanto acima do pico?",
      options: ["18, 0%", "27, 50%", "36, 100%", "24, 33%"],
      correct: 1,
      explanation: "Cada região precisa de 18 ÷ (3 − 1) = 9 réplicas, 27 no total, 50% acima do pico. Com 2 regiões, seriam 36, o dobro.",
      lesson: "17-11",
    },
    {
      id: "slo-burn",
      prompt: "O SLO é 99,9% em 30 dias. Um bug deixa 0,5% dos pedidos com erro e ninguém percebe. Em quantos dias o error budget acaba?",
      options: ["30 dias", "15 dias", "6 dias", "1 dia"],
      correct: 2,
      explanation: "Taxa de queima = 0,005 ÷ 0,001 = 5×. O orçamento de 30 dias some em 30 ÷ 5 = 6 dias. Um alerta por queima pegaria isso; um limiar fixo de 1% de erro, não.",
      lesson: "17-12",
    },
    {
      id: "canary-gate",
      prompt: "Um novo prompt passou no eval gate de 150 casos com 1 ponto de queda, dentro da tolerância de 2. Em produção, o canary a 5% mostra o dobro de tokens de saída por pedido. O que fazer?",
      options: [
        "Promover: o eval gate já aprovou",
        "Parar e fazer rollback do canary: o custo por pedido dobrou, e o gate não media isso",
        "Promover direto para 100% para medir melhor",
        "Aumentar o orçamento",
      ],
      correct: 1,
      explanation: "O gate mede qualidade num conjunto pequeno; o canary compara métricas reais, como tokens por pedido e custo. Uma piora em qualquer métrica de análise é motivo para não avançar.",
      lesson: "17-14",
    },
  ],
};

export default quiz;
