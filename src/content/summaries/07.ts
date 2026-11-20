import { catalog } from "../catalog";
import type { LessonId, SummaryContent } from "../../types/content";

// Cheat sheet do módulo 07 (SUM-01.1). O diagrama é desenhado pelo <Scene> num passo único, e a folha
// tem estilo de impressão em A4 (SUM-01.2). As aulas linkadas saem do catálogo: as 12 do módulo, em ordem.

const lessons: LessonId[] = (catalog.find((module) => module.id === "07")?.lessons ?? []).map((lesson) => lesson.id);

const summary: SummaryContent = {
  module: "07",
  concepts: [
    "Recuperação de informação: achar, numa coleção grande, os documentos que atendem a uma necessidade e ordená-los. A consulta é só uma pista da necessidade, e a relevância é julgada por pessoas.",
    "Busca lexical: o mesmo analisador (minúsculas, acentos, stopwords, radical) na indexação e na consulta, e casamento exato de termos. Forte em códigos e nomes; cega para sinônimos.",
    "Índice invertido: para cada termo, a posting list ordenada dos documentos. E é a interseção das listas, OU é a união; o custo acompanha o tamanho das listas, não o da coleção. No Lucene, segmentos imutáveis e refresh.",
    "TF-IDF e BM25: frequência no documento vezes raridade na coleção. O BM25 satura a frequência com k1 (teto k1 + 1) e desconta documentos longos com b; padrões k1 = 1,2 e b = 0,75.",
    "Busca semântica: um bi-encoder codifica os documentos antes e a consulta na hora; o cosseno ordena. Acha paráfrases, mas sempre devolve k itens e erra em termos exatos.",
    "Busca híbrida: BM25 e vetorial em paralelo, fundidos por pontuação normalizada com peso α, ou por posição com RRF, que soma 1 / (k + posição) com k = 60 e dispensa normalizar.",
    "Duas etapas: a 1ª etapa, barata, busca recall com dezenas ou centenas de candidatos; o reranker, um cross-encoder que lê consulta e documento juntos, decide a ordem do topo. O recall da 1ª etapa é o teto da 2ª.",
    "Avaliação: consultas reais, julgamentos graduados e métricas no top-k. Precision@k e recall@k para o conteúdo do topo, MRR para o primeiro acerto, nDCG para a ordem com notas.",
  ],
  formulas: [
    "tf-idf(t, d) = tf(t, d) · log(N / df(t))",
    "BM25(q, D) = Σ IDF(t) · f · (k1 + 1) / (f + k1 · (1 − b + b · |D| / avgdl)), com IDF(t) = ln((N − n + 0,5) / (n + 0,5) + 1)",
    "Híbrida por pontuação = α · minmax(BM25) + (1 − α) · minmax(cosseno)",
    "RRF(d) = Σ 1 / (k + posição de d em cada lista), k = 60",
    "P@k = relevantes no top-k / k; R@k = relevantes no top-k / total de relevantes",
    "MRR = média de 1 / posição do primeiro relevante; nDCG@k = Σ nota / log2(posição + 1), dividido pelo valor do ranking ideal",
  ],
  pitfalls: [
    "Usar analisadores diferentes na indexação e na consulta: termos deixam de casar sem erro nenhum.",
    "Somar a pontuação BM25 com o cosseno direto: a escala maior manda sozinha.",
    "Trocar o modelo de embedding sem recodificar a coleção: vetores de modelos diferentes não se comparam.",
    "Gastar num reranker melhor quando o documento certo nem chega aos candidatos: o problema é o recall da 1ª etapa.",
    "Decidir com um gabarito de poucas consultas, ou com consultas inventadas pela equipe em vez de tiradas do tráfego real.",
    "Tratar documento não julgado como irrelevante ao comparar um sistema novo, que pode estar achando coisas boas que ninguém julgou.",
  ],
  diagram: {
    kind: "pieces",
    layout: "single",
    pieces: [
      {
        id: "module-07",
        piece: "block-diagram",
        blocks: [
          { id: "query", kind: "laptop", label: "consulta", col: 0, row: 0.5 },
          { id: "lexical", kind: "kv-cache", label: "bm25", col: 1, row: 0 },
          { id: "semantic", kind: "vector-db", label: "vetorial", col: 1, row: 1 },
          { id: "fusion", kind: "retrieval", label: "rrf", col: 2, row: 0.5 },
          { id: "reranker", kind: "llm", label: "cross-encoder", col: 3, row: 0 },
          { id: "eval", kind: "eval", label: "p@k · mrr · ndcg", col: 3, row: 1 },
        ],
        edges: [
          { from: "query", to: "lexical", label: "termos" },
          { from: "query", to: "semantic", label: "vetor" },
          { from: "lexical", to: "fusion" },
          { from: "semantic", to: "fusion" },
          { from: "fusion", to: "reranker", label: "candidatos" },
          { from: "reranker", to: "eval", label: "top-k" },
        ],
        active: "fusion",
      },
    ],
  },
  lessons,
};

export default summary;
