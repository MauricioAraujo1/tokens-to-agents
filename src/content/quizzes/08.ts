import type { QuizContent } from "../../types/content";

// Quiz do módulo 08 (PRAC-01.1). Uma questão por aula, cada uma apontando para a aula que ensina o assunto
// (PRAC-01.4) e cobrando uma aplicação do conteúdo, não as mesmas perguntas do knowledge check de cada aula.

const quiz: QuizContent = {
  module: "08",
  questions: [
    {
      id: "rag-vs-fine-tuning",
      prompt:
        "A política de reembolso da empresa muda todo trimestre, e o assistente precisa responder com a versão vigente. Qual abordagem faz mais sentido?",
      options: [
        "Fazer fine-tuning do modelo a cada mudança",
        "RAG: reindexar a política nova e buscar o trecho certo a cada pergunta",
        "Aumentar a temperatura para o modelo variar a resposta",
        "Confiar no que o modelo aprendeu no pré-treino",
      ],
      correct: 1,
      explanation:
        "O fato muda e precisa de fonte. No RAG, atualizar o conhecimento é reindexar documentos, sem treinar de novo, e a resposta pode citar a versão usada.",
      lesson: "08-01",
    },
    {
      id: "rag-query-path",
      prompt: "Na consulta de um pipeline RAG, qual é a ordem certa das etapas?",
      options: [
        "LLM → busca no banco vetorial → embedding da pergunta → resposta",
        "Embedding da pergunta → busca no banco vetorial → top-k chunks no prompt → LLM gera a resposta",
        "Chunking da pergunta → fine-tuning → resposta",
        "Busca na web → embedding da resposta → banco vetorial",
      ],
      correct: 1,
      explanation:
        "A pergunta vira vetor com o mesmo modelo de embedding da indexação, o banco devolve os vizinhos mais próximos, os melhores trechos entram no prompt e só então o LLM gera.",
      lesson: "08-02",
    },
    {
      id: "ingestion-deleted-doc",
      prompt:
        "Um documento foi apagado da wiki, mas o assistente continua citando o conteúdo dele. Qual etapa da ingestão falhou?",
      options: [
        "O chunking, que deixou chunks grandes demais",
        "A sincronização incremental, que não removeu do índice os chunks do documento apagado",
        "O modelo de embedding, que ficou desatualizado",
        "A temperatura do LLM",
      ],
      correct: 1,
      explanation:
        "Ingestão incremental precisa tratar três casos: novo, alterado e apagado. Se a remoção não chega ao índice, os vetores antigos continuam sendo recuperados.",
      lesson: "08-03",
    },
    {
      id: "parsing-scanned-pdf",
      prompt:
        "Um contrato em PDF escaneado é indexado, mas nenhuma busca encontra trechos dele. Qual é a causa mais provável?",
      options: [
        "O PDF é só imagem: sem OCR, a extração devolve texto vazio e nada vira chunk",
        "O top-k está pequeno demais",
        "O banco vetorial não aceita PDFs",
        "O contrato é longo demais para a janela de contexto",
      ],
      correct: 0,
      explanation:
        "Um escaneado não tem camada de texto. O parser precisa detectar isso e mandar a página para OCR; senão o documento entra no índice vazio.",
      lesson: "08-04",
    },
    {
      id: "chunking-markdown-headers",
      prompt:
        "A base é um manual em Markdown, com seções curtas sob títulos ## bem definidos. Qual estratégia de chunking tende a funcionar melhor?",
      options: [
        "Janela fixa de N caracteres, ignorando a estrutura",
        "Dividir pela estrutura (títulos e parágrafos) e só quebrar mais quando uma seção passar do limite",
        "Um chunk por documento inteiro",
        "Um chunk por palavra",
      ],
      correct: 1,
      explanation:
        "A estrutura do autor já marca onde o assunto muda. A divisão recursiva respeita títulos e parágrafos e só desce para separadores menores quando precisa.",
      lesson: "08-05",
    },
    {
      id: "overlap-count",
      prompt:
        "Um texto de 100 palavras é dividido em chunks de 20 palavras com overlap de 10. Quantos chunks saem pela janela deslizante?",
      options: ["5", "9", "10", "20"],
      correct: 1,
      explanation:
        "O passo é 20 − 10 = 10. Os chunks começam nas palavras 0, 10, …, 80, e o que começa em 80 já chega ao fim: são 9 chunks, quase o dobro dos 5 sem overlap.",
      lesson: "08-06",
    },
    {
      id: "embedding-model-swap",
      prompt:
        "O time trocou o modelo de embedding das perguntas por um mais novo, sem mexer no índice. O que acontece?",
      options: [
        "A busca melhora na hora",
        "Os scores deixam de ter sentido: os vetores das perguntas e dos chunks estão em espaços diferentes, e é preciso reindexar tudo",
        "Nada muda, porque o banco vetorial converte os vetores",
        "Só a latência aumenta",
      ],
      correct: 1,
      explanation:
        "Cada modelo de embedding cria o seu próprio espaço. Trocar o modelo exige gerar de novo os embeddings de todos os chunks com o modelo novo.",
      lesson: "08-07",
    },
    {
      id: "threshold-out-of-scope",
      prompt:
        "Alguém pergunta ao assistente de RH sobre a receita de um bolo. O top-3 volta com scores 0,21, 0,18 e 0,15, e o limiar é 0,5. O que o retriever deve devolver?",
      options: [
        "Os 3 chunks, porque o top-k é sempre preenchido",
        "Só o primeiro, por ter o maior score",
        "Nenhum chunk, para o sistema seguir o caminho de “não encontrei”",
        "Chunks aleatórios",
      ],
      correct: 2,
      explanation:
        "O top-k sempre acha os K mais próximos, mesmo quando nada é relevante. O limiar de similaridade corta trechos fracos e evita uma resposta sem base.",
      lesson: "08-08",
    },
    {
      id: "context-budget",
      prompt:
        "Sobram 1.000 tokens para contexto. Os chunks recuperados, já ordenados por score, têm 400, 350, 300 e 250 tokens. Com empacotamento guloso por score, quais entram?",
      options: [
        "Os 4, porque todos são relevantes",
        "O 1º, o 2º e o 4º, somando 1.000 tokens: o 3º estouraria o orçamento",
        "Só o primeiro",
        "Os 2 menores, para caber mais texto",
      ],
      correct: 1,
      explanation:
        "400 + 350 = 750. O de 300 levaria a 1.050 e fica de fora; o de 250 leva a 1.000 e cabe. O guloso por score pula o que não cabe e tenta o próximo.",
      lesson: "08-09",
    },
    {
      id: "follow-up-rewrite",
      prompt:
        "No meio da conversa sobre home office, o usuário escreve só “e para estagiários?”. Por que reescrever a pergunta antes de buscar?",
      options: [
        "Para gastar menos tokens no prompt",
        "Porque, sozinha, a frase não diz o assunto: reescrita como pergunta completa, o embedding dela encontra a política certa",
        "Porque o banco vetorial não aceita perguntas curtas",
        "Para traduzir a pergunta para o inglês",
      ],
      correct: 1,
      explanation:
        "A busca só vê a mensagem atual. A query rewriting usa o histórico para montar uma pergunta autônoma, como “Quantos dias de home office estagiários podem fazer?”.",
      lesson: "08-10",
    },
    {
      id: "grounded-abstention",
      prompt:
        "O contexto traz a política de férias, mas a pergunta é sobre plano de saúde. Qual resposta mostra um bom grounding?",
      options: [
        "Uma resposta sobre plano de saúde com o que o modelo sabe em geral",
        "“Não encontrei essa informação nos documentos disponíveis”, sugerindo o canal de RH",
        "Uma resposta sobre férias, que é o que está no contexto",
        "Uma resposta inventada com citação [1]",
      ],
      correct: 1,
      explanation:
        "Grounding é responder só com o que as fontes sustentam. Quando o contexto não cobre a pergunta, a saída certa é se abster, não completar com conhecimento sem fonte.",
      lesson: "08-11",
    },
    {
      id: "post-filter-shortfall",
      prompt:
        "O retriever pega o top-5 por similaridade e só depois aplica o filtro departamento = jurídico. Só 1 dos 5 é do jurídico. Qual é o problema e a correção?",
      options: [
        "Nenhum problema: 1 resultado basta",
        "O pós-filtro devolve menos que K; filtrar antes (ou junto) da busca vetorial devolve os 5 melhores do jurídico",
        "O modelo de embedding precisa ser trocado",
        "Aumentar a temperatura do LLM",
      ],
      correct: 1,
      explanation:
        "Filtrar depois do top-k joga fora resultados e pode zerar a lista. Com o filtro aplicado na busca, os K vizinhos já saem só entre os chunks que passam no filtro.",
      lesson: "08-12",
    },
    {
      id: "parent-child-fit",
      prompt:
        "Chunks pequenos acertam a busca, mas o trecho sozinho não tem contexto para responder. Qual técnica resolve as duas coisas?",
      options: [
        "Aumentar todos os chunks para 4.000 tokens",
        "Parent-child retrieval: buscar pelos filhos pequenos e mandar ao modelo o pai maior de onde vieram",
        "Diminuir o top-k para 1",
        "Tirar o overlap",
      ],
      correct: 1,
      explanation:
        "O filho pequeno dá um embedding focado, que casa bem com a pergunta; o pai traz o contexto completo para a geração. Pais repetidos entram uma vez só.",
      lesson: "08-13",
    },
    {
      id: "agentic-multi-hop",
      prompt:
        "“Qual é o limite de reembolso do cargo do gestor da Ana?” Por que um pipeline fixo de uma busca costuma falhar aqui?",
      options: [
        "Porque a pergunta é longa demais",
        "Porque é multi-hop: é preciso descobrir o gestor e o cargo antes de saber qual política buscar",
        "Porque o banco vetorial não guarda nomes",
        "Porque o LLM não sabe fazer contas",
      ],
      correct: 1,
      explanation:
        "A segunda busca depende da resposta da primeira. Um agente encadeia as buscas, decide a próxima com o que observou e para quando tem o suficiente.",
      lesson: "08-14",
    },
    {
      id: "diagnose-low-recall",
      prompt:
        "Na avaliação, o context recall está em 0,4 e a faithfulness em 0,95. Onde está o problema principal?",
      options: [
        "Na geração: o modelo inventa fatos",
        "Na recuperação: o modelo é fiel ao contexto, mas o contexto não traz o que a resposta de referência precisa",
        "No tamanho da janela de contexto",
        "Em nenhum lugar: as métricas estão boas",
      ],
      correct: 1,
      explanation:
        "Faithfulness alta diz que a resposta segue o contexto. Recall baixo diz que o contexto não tem os fatos. A correção vem na busca: chunking, embeddings, filtros ou consulta.",
      lesson: "08-15",
    },
    {
      id: "optimize-one-change",
      prompt:
        "Para melhorar o RAG, o time quer mudar ao mesmo tempo o chunk size, o modelo de embedding e o prompt. Qual é o risco?",
      options: [
        "Nenhum, é mais rápido",
        "Sem medir cada mudança contra o mesmo conjunto de avaliação, não dá para saber qual ajudou e qual piorou",
        "O banco vetorial não aceita três mudanças",
        "O LLM fica mais lento",
      ],
      correct: 1,
      explanation:
        "Otimizar é medir, mudar uma coisa e medir de novo no mesmo conjunto. Várias mudanças juntas podem se anular e esconder a causa do ganho ou da perda.",
      lesson: "08-16",
    },
  ],
};

export default quiz;
