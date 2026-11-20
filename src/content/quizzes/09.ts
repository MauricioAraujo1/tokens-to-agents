import type { QuizContent } from "../../types/content";

// Quiz do módulo 09 (PRAC-01.1). Cada questão aponta para a aula que ensina o assunto (PRAC-01.4) e
// cobra uma aplicação do conteúdo, não as mesmas perguntas do knowledge check de cada aula.

const quiz: QuizContent = {
  module: "09",
  questions: [
    {
      id: "ontology-domain",
      prompt:
        "A ontologia diz que trabalha_em liga Pessoa a Empresa. A extração produziu (Pernambuco, trabalha_em, Acme). O que deve acontecer?",
      options: [
        "Entra no grafo, porque veio do texto",
        "É rejeitada: Pernambuco é um Estado, fora do domínio Pessoa da relação",
        "Vira (Acme, trabalha_em, Pernambuco)",
        "Entra e é corrigida depois pelo LLM na consulta",
      ],
      correct: 1,
      explanation:
        "A checagem de domínio e imagem é barata e barra erros de tipo antes que entrem no grafo. Ela não garante que um fato bem tipado seja verdadeiro, mas pega o absurdo.",
      lesson: "09-02",
    },
    {
      id: "edge-property",
      prompt:
        "Você precisa guardar “Ana conhece Bia desde 2021”, com o ano como atributo da própria ligação. Qual modelo faz isso de forma direta?",
      options: [
        "RDF puro, com uma tripla (Ana, conhece, Bia)",
        "Grafo de propriedades: a aresta CONHECE tem a propriedade desde = 2021",
        "Uma matriz de adjacência",
        "Um índice invertido",
      ],
      correct: 1,
      explanation:
        "No grafo de propriedades, arestas têm propriedades. Em RDF, a tripla não carrega atributos: é preciso reificação ou a extensão RDF-star.",
      lesson: "09-03",
    },
    {
      id: "bfs-vs-weighted",
      prompt:
        "Num mapa de metrô com o tempo de cada trecho, você quer a rota com menos minutos. A busca em largura serve?",
      options: [
        "Sim, a busca em largura sempre acha a rota mais rápida",
        "Não: ela minimiza o número de trechos; para somar minutos, use um algoritmo com pesos, como o Dijkstra",
        "Sim, desde que o grafo seja dirigido",
        "Não, porque metrô não é um grafo",
      ],
      correct: 1,
      explanation:
        "A busca em largura conta arestas. Com pesos diferentes, a rota com menos trechos pode ser mais lenta, e o Dijkstra, que soma os pesos, acha a mais rápida.",
      lesson: "09-04",
    },
    {
      id: "modularity-zero",
      prompt: "Uma divisão de um grafo em comunidades tem modularidade perto de 0. O que isso indica?",
      options: [
        "Que as comunidades são perfeitas",
        "Que há tantas arestas dentro dos grupos quanto se esperaria ao acaso: a divisão não captura estrutura",
        "Que o grafo não tem arestas",
        "Que o Leiden falhou ao rodar",
      ],
      correct: 1,
      explanation:
        "A modularidade compara a fração de arestas internas com a esperada ao acaso. Perto de 0, os grupos não têm mais ligações internas que um sorteio, e os resumos de comunidade misturariam temas.",
      lesson: "09-05",
    },
    {
      id: "entity-linking-ambiguity",
      prompt:
        "A empresa tem duas pessoas chamadas Ana, e a recuperação por grafo respondeu sobre a Ana errada. Onde está a falha e como corrigir?",
      options: [
        "Na geração: aumentar a temperatura",
        "No entity linking: usar o contexto da pergunta e identificadores únicos para escolher o nó certo, ou perguntar ao usuário qual Ana",
        "Na ontologia: proibir nomes repetidos",
        "No banco de grafos: trocar por um banco relacional",
      ],
      correct: 1,
      explanation:
        "A travessia só é tão boa quanto o nó de partida. Desambiguar a menção, pelo contexto ou pedindo esclarecimento, evita uma resposta errada e confiante.",
      lesson: "09-06",
    },
    {
      id: "where-tone",
      prompt:
        "As regras de tom do assistente têm 600 tokens e mudam a cada trimestre por decisão de produto. Onde elas devem morar?",
      options: [
        "Nos pesos, com fine-tuning a cada trimestre",
        "No prompt, num arquivo de contexto versionado: pequeno, estável e necessário em toda chamada",
        "No índice do RAG, para serem buscadas quando relevantes",
        "Numa ferramenta chamada a cada mensagem",
      ],
      correct: 1,
      explanation:
        "É pouco texto, vale em toda conversa e muda raramente. No prompt, a mudança é uma edição de arquivo; no fine-tuning, seria um novo treino a cada trimestre.",
      lesson: "09-07",
    },
    {
      id: "wiki-contradiction",
      prompt:
        "O lint da LLM Wiki encontrou duas páginas que dão datas diferentes para o mesmo evento. Qual é o procedimento certo?",
      options: [
        "Apagar as duas páginas",
        "O LLM relê as fontes brutas citadas, corrige a página errada com a citação certa e registra a correção no log",
        "Manter as duas e deixar o leitor escolher",
        "Editar a fonte bruta para concordar com a wiki",
      ],
      correct: 1,
      explanation:
        "As fontes brutas são imutáveis e servem de referência. A wiki é derivada: a correção acontece nela, com citação, e o log guarda o que mudou e quando.",
      lesson: "09-08",
    },
    {
      id: "idempotent-write-back",
      prompt:
        "O write-back falhou no meio e foi repetido, gravando o mesmo fato duas vezes no log. O que evita esse problema?",
      options: [
        "Gravar o estado direto, sem log",
        "Dar a cada gravação um id derivado do fato e da sessão, para que repetir a operação não crie um evento novo",
        "Não repetir operações que falham",
        "Deixar a consolidação ignorar o log",
      ],
      correct: 1,
      explanation:
        "Com id idempotente, a segunda tentativa encontra o evento já gravado e não duplica. A consolidação também ignora repetições, mas o log fica limpo e auditável.",
      lesson: "09-09",
    },
    {
      id: "wiki-or-rag",
      prompt:
        "Um time de pesquisa tem 40 artigos estáveis sobre um tema e faz, toda semana, dezenas de perguntas que pedem comparar o que todos dizem. RAG puro ou wiki mantida por LLM?",
      options: [
        "RAG puro: buscar chunks dos 40 artigos a cada pergunta é sempre mais barato",
        "Wiki: a síntese é feita uma vez por artigo na ingestão e reaproveitada nas muitas perguntas, com as fontes brutas para conferir",
        "Nenhum: colocar os 40 artigos inteiros no prompt",
        "Fine-tuning com os 40 artigos",
      ],
      correct: 1,
      explanation:
        "Corpus estável e muitas perguntas que pedem a mesma síntese é o caso em que pagar a ingestão adiantado compensa. O RAG refaria a integração dos 40 artigos a cada pergunta.",
      lesson: "09-10",
    },
    {
      id: "as-of-query",
      prompt:
        "O grafo tem (Ana, lidera, Atlas) de 2023-05 a 2025-08 e (Bruno, lidera, Atlas) desde 2025-08. Quem liderava o Atlas em janeiro de 2024, e como o grafo sabe?",
      options: [
        "Bruno, porque é o fato mais recente",
        "Ana: a consulta filtra os fatos cujo intervalo de validade contém a data pedida",
        "Ninguém, porque o fato da Ana foi apagado",
        "Os dois, porque há duas arestas",
      ],
      correct: 1,
      explanation:
        "Com validade temporal, a pergunta leva uma data. Janeiro de 2024 está entre 2023-05 e 2025-08, então vale o fato da Ana, que foi invalidado, não apagado.",
      lesson: "09-11",
    },
  ],
};

export default quiz;
