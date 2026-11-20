import type { QuizContent } from "../../types/content";

// Quiz do módulo 11 (PRAC-01.1). Cada questão aponta para a aula que ensina o assunto (PRAC-01.4) e cobra uma
// aplicação do conteúdo, não as mesmas perguntas do knowledge check de cada aula.

const quiz: QuizContent = {
  module: "11",
  questions: [
    {
      id: "pretrain-lr",
      prompt:
        "Uma equipe ajusta um modelo pronto usando a mesma taxa de aprendizado do pré-treino, 15 vezes maior que a de um SFT típico. O que é mais provável?",
      options: [
        "O ajuste fica mais rápido e sem efeitos colaterais",
        "Passos grandes afastam o modelo do que ele sabia: perda instável e esquecimento de habilidades gerais",
        "O modelo passa a aprender fatos novos melhor que com RAG",
        "Nada muda, porque a taxa não afeta o fine-tuning",
      ],
      correct: 1,
      explanation:
        "O modelo pronto já está num bom lugar. Taxas de pré-treino empurram os pesos para longe dele, e o resultado costuma ser instabilidade e esquecimento catastrófico.",
      lesson: "11-02",
    },
    {
      id: "new-products",
      prompt:
        "O assistente ajustado com conversas de suporte responde no tom certo, mas inventa especificações dos produtos lançados depois do ajuste. Qual a correção?",
      options: [
        "Refazer o ajuste a cada lançamento",
        "Manter o ajuste para o tom e usar RAG com o catálogo atual para as especificações",
        "Aumentar o número de épocas",
        "Trocar o ajuste por um prompt mais longo",
      ],
      correct: 1,
      explanation:
        "Tom é comportamento, e o ajuste cuida dele. Especificações novas são fatos que mudam: precisam de fonte na hora da pergunta, com RAG.",
      lesson: "11-03",
    },
    {
      id: "minhash-scale",
      prompt: "Você precisa achar quase duplicatas em 20 milhões de exemplos. Por que não comparar todos os pares com Jaccard?",
      options: [
        "Porque Jaccard só funciona com textos curtos",
        "Porque são cerca de 2 × 10¹⁴ pares; MinHash com LSH encontra candidatos sem comparar todos",
        "Porque o hash exato já pega as quase duplicatas",
        "Porque quase duplicatas não atrapalham o treino",
      ],
      correct: 1,
      explanation:
        "Comparar todos os pares é O(n²): com 2 × 10⁷ exemplos, são n(n − 1)/2 ≈ 2 × 10¹⁴ comparações. MinHash resume cada texto em assinaturas e só compara os que colidem.",
      lesson: "11-05",
    },
    {
      id: "synthetic-mix",
      prompt:
        "Um time quer trocar todos os dados humanos do próximo ajuste por dados gerados pelo modelo da versão anterior, porque é mais barato. Qual o risco principal?",
      options: [
        "O arquivo de treino fica grande demais",
        "Perda de diversidade: os casos raros somem a cada geração (colapso de modelo)",
        "O modelo para de seguir o chat template",
        "Nenhum, se os dados passarem num filtro de ROUGE-L",
      ],
      correct: 1,
      explanation:
        "Treinar só com saídas de modelos estreita a distribuição a cada geração. Dados humanos na mistura e filtros de diversidade reduzem o colapso.",
      lesson: "11-06",
    },
    {
      id: "labels-masking",
      prompt: "No SFT com PyTorch, como fazer a cross-entropy ignorar os tokens do prompt?",
      options: [
        "Apagar os tokens do prompt da sequência",
        "Colocar −100 nos rótulos das posições do prompt, o índice que a cross-entropy ignora por padrão",
        "Multiplicar os logits do prompt por zero",
        "Usar uma taxa de aprendizado menor para o prompt",
      ],
      correct: 1,
      explanation:
        "O prompt continua na entrada, como contexto. Só os rótulos dessas posições viram −100 (ignore_index), e a perda fica nos tokens da resposta.",
      lesson: "11-07",
    },
    {
      id: "lora-down-proj",
      prompt: "Quantos parâmetros o LoRA com r = 16 acrescenta à down_proj do Llama 2 7B, uma matriz que leva 11008 dimensões para 4096?",
      options: ["45.088.768", "241.664", "131.072", "176.128"],
      correct: 1,
      explanation: "r · (d_in + d_out) = 16 × (11008 + 4096) = 16 × 15104 = 241.664, contra 45.088.768 da matriz inteira.",
      lesson: "11-08",
    },
    {
      id: "qlora-13b",
      prompt: "Quanto ocupam, aproximadamente, os pesos de um modelo de 13B guardados em 4 bits no QLoRA, sem contar escalas, adaptadores e ativações?",
      options: ["26 GB", "6,5 GB", "13 GB", "3,25 GB"],
      correct: 1,
      explanation: "4 bits são meio byte por peso: 13 × 10⁹ × 0,5 byte = 6,5 GB. Em bf16 seriam 26 GB.",
      lesson: "11-09",
    },
    {
      id: "fp16-overflow",
      prompt: "Um treino em fp16 gera perda NaN quando algumas ativações passam de 70 mil. Qual formato resolve sem mudar o número de bits?",
      options: [
        "int8, que tem mais faixa",
        "bf16, que tem 8 bits de expoente como o fp32 e vai muito além de 65.504",
        "fp16 com mais mantissa",
        "int4 com escala por bloco",
      ],
      correct: 1,
      explanation:
        "O maior valor do fp16 é 65.504. O bf16 usa os mesmos 16 bits com 8 de expoente: tem a faixa do fp32, ao custo de menos precisão.",
      lesson: "11-11",
    },
    {
      id: "small-eval",
      prompt:
        "Com 30 prompts, o ajustado tem win rate de 60% contra o modelo base. O gerente quer anunciar a melhora. O que dizer?",
      options: [
        "Que a melhora está comprovada, porque passou de 50%",
        "Que o intervalo de confiança com 30 prompts é largo e inclui 50%; é preciso avaliar com centenas de prompts",
        "Que win rate não serve para comparar modelos",
        "Que basta repetir a mesma avaliação para confirmar",
      ],
      correct: 1,
      explanation:
        "Com n = 30 e p = 0,6, o intervalo de 95% vai de cerca de 42% a 75%. Para uma margem de ±5 pontos, são precisos uns 385 prompts.",
      lesson: "11-13",
    },
    {
      id: "rollback",
      prompt: "No canário, o adaptador novo aumenta as reclamações. Com multi-LoRA no servidor, qual é o rollback mais rápido?",
      options: [
        "Retreinar o adaptador anterior",
        "Voltar a mandar as requisições para o nome do adaptador anterior, que continua carregado sobre a mesma base",
        "Fundir o adaptador novo na base",
        "Desligar o servidor",
      ],
      correct: 1,
      explanation:
        "Com multi-LoRA, a versão é um nome na requisição. Apontar de volta para o adaptador anterior desfaz o rollout sem recarregar a base.",
      lesson: "11-14",
    },
  ],
};

export default quiz;
