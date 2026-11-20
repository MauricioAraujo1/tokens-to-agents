import { catalog } from "../catalog";
import type { LessonId, SummaryContent } from "../../types/content";

// Cheat sheet do módulo 09 (SUM-01.1). O diagrama é desenhado pelo <Scene> num passo único, e a folha
// tem estilo de impressão em A4 (SUM-01.2). As aulas linkadas saem do catálogo: as 11 do módulo, em ordem.

const lessons: LessonId[] = (catalog.find((module) => module.id === "09")?.lessons ?? []).map((lesson) => lesson.id);

const summary: SummaryContent = {
  module: "09",
  concepts: [
    "Base de conhecimento: conhecimento curado, com dono, fonte e data de revisão. O formato decide onde guardar: texto num índice, valores em tabelas, relações num grafo.",
    "Grafo de conhecimento: fatos como triplas (sujeito, predicado, objeto), entidades como nós e relações como arestas. Perguntas compostas viram caminhos; regras de inferência derivam fatos; a ontologia valida domínio e imagem de cada relação.",
    "Bancos de grafos guardam a adjacência junto do nó e andam uma aresta seguindo um ponteiro. Grafo de propriedades (Cypher, GQL) põe atributos em nós e arestas; RDF (SPARQL) reduz tudo a triplas com nomes globais.",
    "Vocabulário de grafos: direção, peso, grau, lista e matriz de adjacência. Busca em largura acha o caminho com menos saltos; Dijkstra, o de menor custo.",
    "GraphRAG: extrair entidades e relações de cada chunk com um LLM, fundir num grafo, agrupar em comunidades com Leiden, resumir cada comunidade e responder perguntas sobre o todo em map-reduce (busca global) ou a partir das entidades (busca local).",
    "Recuperação por grafo: entity linking acha o nó de partida, a travessia tipada segue as relações pedidas e o subgrafo vai para o contexto com os chunks de origem. Resolve a entidade ponte que a similaridade não acha; PPR ranqueia a vizinhança.",
    "Gestão de conhecimento: cada conhecimento no seu lugar (ferramenta para o volátil, grafo para relações, prompt para o pequeno e estável, pesos para comportamento em volume, índice para o resto), com ciclo de vida, permissões na busca e fonte única da verdade.",
    "Wiki mantida por LLM e conhecimento persistente: síntese na ingestão em vez de na consulta, fontes brutas imutáveis, log append-only, consolidação com regra explícita, e manutenção com prazo por tipo de fato, validade temporal, proveniência e invalidação em vez de remoção.",
  ],
  formulas: [
    "Soma dos graus = 2 × arestas (grafo não dirigido)",
    "Modularidade Q = Σ (Lc / m − (dc / 2m)²), com Lc arestas internas, dc soma dos graus da comunidade e m arestas no total",
    "Chamadas de LLM na busca global do GraphRAG = comunidades + 1 (map + reduce)",
    "Empate wiki × RAG = ⌈custo da ingestão / (tokens por pergunta no RAG − tokens por pergunta na wiki)⌉",
    "Fato vencido quando: hoje − data da conferência > prazo do tipo de fato",
  ],
  pitfalls: [
    "Ler a ausência de uma tripla como negação: no mundo aberto, só quer dizer que ninguém registrou o fato.",
    "Confiar na ontologia como prova de verdade: ela barra erros de tipo, não fatos falsos bem tipados.",
    "Usar top-k para perguntas sobre o corpus inteiro: ele traz no máximo k trechos e uma visão parcial.",
    "Travessias sem filtro de tipo nem limite de saltos: hubs fazem a vizinhança explodir e estourar a janela de contexto.",
    "Wiki sem citação por afirmação: um erro escrito pelo LLM vira fato para as consultas seguintes.",
    "Apagar fatos substituídos: perde-se o histórico e a capacidade de responder o que valia numa data.",
  ],
  diagram: {
    kind: "pieces",
    layout: "single",
    pieces: [
      {
        id: "module-09",
        piece: "block-diagram",
        blocks: [
          { id: "docs", kind: "documents", label: "fontes", col: 0, row: 0 },
          { id: "extract", kind: "llm", label: "extração", col: 1, row: 0 },
          { id: "graph", kind: "nosql-db", label: "grafo + wiki", col: 2, row: 0 },
          { id: "retrieval", kind: "retrieval", label: "travessia", col: 2, row: 1 },
          { id: "context", kind: "context", label: "subgrafo + fontes", col: 1, row: 1 },
          { id: "answer", kind: "answer", label: "resposta citada", col: 0, row: 1 },
        ],
        edges: [
          { from: "docs", to: "extract", label: "ingestão" },
          { from: "extract", to: "graph", label: "triplas" },
          { from: "graph", to: "retrieval", label: "pergunta" },
          { from: "retrieval", to: "context" },
          { from: "context", to: "answer" },
        ],
        active: "graph",
      },
    ],
  },
  lessons,
};

export default summary;
