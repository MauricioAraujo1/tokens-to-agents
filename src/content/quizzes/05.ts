import type { QuizContent } from "../../types/content";

// Quiz do módulo 05 (PRAC-01.1). Cada questão aponta para a aula que ensina o assunto (PRAC-01.4) e
// cobra uma aplicação do conteúdo, não as mesmas perguntas do knowledge check de cada aula.

const quiz: QuizContent = {
  module: "05",
  questions: [
    {
      id: "measure-first",
      prompt: "Você trocou uma frase do prompt e duas respostas que você olhou ficaram melhores. O que falta para saber se a mudança é boa?",
      options: [
        "Nada: duas respostas melhores bastam",
        "Rodar a versão nova e a antiga contra o mesmo conjunto de casos de teste e comparar",
        "Perguntar ao próprio modelo se ficou melhor",
        "Aumentar a temperatura e olhar de novo",
      ],
      correct: 1,
      explanation: "Duas respostas são uma impressão. Um eval com os mesmos casos mostra se a mudança corrigiu erros sem quebrar outros.",
      lesson: "05-01",
    },
    {
      id: "user-data-tags",
      prompt: "Um app resume tickets de suporte. Qual prompt separa melhor instrução e dado?",
      options: [
        "“Resuma: ” seguido do ticket colado direto",
        "A instrução, depois o ticket entre <ticket> e </ticket>, com a instrução se referindo a <ticket> pelo nome",
        "O ticket primeiro e a instrução misturada no meio do texto",
        "O ticket em maiúsculas",
      ],
      correct: 1,
      explanation: "Delimitadores marcam onde o dado começa e termina, e a instrução que aponta para a tag pelo nome amarra a tarefa ao dado certo.",
      lesson: "05-02",
    },
    {
      id: "secret-in-system",
      prompt: "Um desenvolvedor coloca a chave de uma API no system prompt “porque o usuário não vê o system”. Qual é o problema?",
      options: [
        "Nenhum, o system prompt é privado",
        "O modelo pode ser induzido a repetir o system prompt; segredos ficam no código do servidor, nunca no prompt",
        "O system prompt tem limite de 100 caracteres",
        "A chave deixa o modelo mais lento",
      ],
      correct: 1,
      explanation: "A prioridade do system é aprendida, não garantida, e há muitos casos de system prompts vazados. Segredos e permissões ficam no código.",
      lesson: "05-03",
    },
    {
      id: "examples-for-format",
      prompt: "Em zero-shot, o modelo acerta o conteúdo mas devolve datas em formatos variados. Qual é o próximo passo mais eficiente?",
      options: [
        "Trocar por um modelo maior",
        "Acrescentar dois ou três exemplos resolvidos no formato exato, incluindo um caso ambíguo",
        "Repetir a instrução de formato cinco vezes",
        "Fazer fine-tuning",
      ],
      correct: 1,
      explanation: "Formato é o que exemplos ensinam melhor. Incluir um caso ambíguo cobre o erro que os exemplos simples deixariam passar.",
      lesson: "05-06",
    },
    {
      id: "cot-reasoning-model",
      prompt: "Você migra para um modelo de raciocínio, que já pensa antes de responder. O que fazer com o “pense passo a passo” do prompt antigo?",
      options: [
        "Repetir a frase mais vezes",
        "Remover: o modelo já raciocina sozinho, e a instrução não ajuda",
        "Trocar por “responda sem pensar”",
        "Pedir o raciocínio em JSON",
      ],
      correct: 1,
      explanation: "Modelos de raciocínio geram o raciocínio por conta própria. Os guias dos provedores recomendam instruções diretas, sem pedir passo a passo.",
      lesson: "05-07",
    },
    {
      id: "strict-schema",
      prompt: "Um pipeline grava a saída do modelo num banco e quebra uma vez a cada mil requisições por JSON inválido. Qual solução elimina esse erro de forma?",
      options: [
        "Pedir “responda só em JSON, por favor” em maiúsculas",
        "Usar saída estruturada com schema estrito, que restringe a geração aos tokens válidos",
        "Tentar JSON.parse duas vezes",
        "Baixar a temperatura para 0",
      ],
      correct: 1,
      explanation: "Com decodificação restrita, tokens que quebrariam o schema têm probabilidade zero: a forma é garantida por construção. O conteúdo ainda precisa de validação.",
      lesson: "05-08",
    },
    {
      id: "template-order",
      prompt: "Um template põe o nome do cliente na primeira linha e 3.000 tokens de regras fixas depois. Que mudança reduz custo sem mudar o conteúdo?",
      options: [
        "Encurtar o nome do cliente",
        "Mover as regras fixas para o começo e as variáveis para o fim, para o prefixo comum ser reaproveitado por cache",
        "Duplicar as regras",
        "Trocar as chaves duplas por colchetes",
      ],
      correct: 1,
      explanation: "O cache de prompt reaproveita o prefixo idêntico entre requisições. Fixo primeiro e variável no fim maximizam esse prefixo.",
      lesson: "05-09",
    },
    {
      id: "tool-permissions",
      prompt: "O modelo pede reembolsar_pedido(\"9917\") para um cliente logado que não é dono do pedido 9917. Quem deve barrar isso?",
      options: [
        "O próprio modelo, porque o system prompt pede cuidado",
        "O código do app, que confere permissão e dono do pedido antes de executar qualquer ferramenta",
        "O provedor da API",
        "Ninguém: o modelo sabe o que faz",
      ],
      correct: 1,
      explanation: "Argumentos de ferramenta são entrada não confiável. Permissões ficam no código, que executa a ferramenta, nunca no prompt.",
      lesson: "05-10",
    },
    {
      id: "trifecta-quiz",
      prompt: "Um agente lê páginas web, tem acesso aos documentos internos e pode fazer requisições HTTP. Qual é o risco central?",
      options: [
        "Alucinação",
        "Uma página com instruções escondidas pode levá-lo a enviar documentos internos para fora: as três capacidades juntas permitem vazamento",
        "Ficar lento",
        "Gastar tokens demais com as páginas",
      ],
      correct: 1,
      explanation: "Dados privados, conteúdo não confiável e canal de saída juntos tornam uma injeção indireta um vazamento. Corte ou controle pelo menos uma das três.",
      lesson: "05-11",
    },
    {
      id: "latency-shape",
      prompt: "Self-consistency com 5 amostras e uma cadeia de 5 etapas fazem 5 chamadas cada. Qual delas soma mais latência?",
      options: [
        "As duas somam a mesma latência",
        "A cadeia: cada etapa espera a anterior, enquanto as 5 amostras podem rodar em paralelo",
        "Self-consistency, porque usa temperatura acima de zero",
        "Nenhuma das duas soma latência",
      ],
      correct: 1,
      explanation: "O custo em chamadas é igual, mas a forma muda a latência: chamadas em sequência somam o tempo de cada uma; amostras independentes rodam em paralelo e multiplicam só o preço.",
      lesson: "05-12",
    },
  ],
};

export default quiz;
