import { catalog } from "../catalog";
import type { LessonId, SummaryContent } from "../../types/content";

// Cheat sheet do módulo 05 (SUM-01.1). O diagrama é desenhado pelo <Scene> num passo único, e a folha
// tem estilo de impressão em A4 (SUM-01.2). As aulas linkadas saem do catálogo: as 12 do módulo, em ordem.

const lessons: LessonId[] = (catalog.find((module) => module.id === "05")?.lessons ?? []).map((lesson) => lesson.id);

const summary: SummaryContent = {
  module: "05",
  concepts: [
    "Prompt engineering: o prompt condiciona P(próximo token | prompt) sem mudar os pesos. Defina o critério de acerto e os casos de teste antes de escrever, e itere medindo com um eval.",
    "Anatomia: papel, tarefa, contexto, exemplos, entrada, formato e restrições, com delimitadores (tags XML, ###) separando instrução de dado.",
    "Papéis: system ou developer (regras de quem constrói o app), user, assistant e tool. Um chat template transforma as mensagens em tokens especiais, e a API sem estado reenvia o histórico a cada turno.",
    "Instrução diz o que fazer; contexto dá o material. Documentos longos primeiro, pergunta e lembrete das regras no fim. Erro de forma pede instrução; erro de fato pede contexto.",
    "Zero-shot (só instrução) funciona em modelos ajustados para instruções; few-shot (exemplos resolvidos) fixa formato e fronteiras por in-context learning, com custo linear em tokens e vieses de ordem e de rótulo.",
    "Chain of thought: escrever os passos dá mais passadas de computação e deixa os resultados intermediários no contexto. Vale em problemas de vários passos; modelos de raciocínio já fazem isso sozinhos.",
    "Saída estruturada: prompt pede, JSON mode garante sintaxe, schema estrito com decodificação restrita garante a forma. Campo de raciocínio antes da resposta; validação de negócio sempre.",
    "Templates, ferramentas e segurança: templates versionados com o fixo primeiro; tool calling em que o modelo pede e o app executa com permissões; defesa em camadas contra prompt injection; técnicas de várias chamadas (self-consistency, cadeias, ReAct, árvore) só quando o eval paga o custo.",
  ],
  formulas: [
    "Tokens do prompt few-shot = instrução + k × tokens por exemplo",
    "Entrada no turno t ≈ system + (t − 1) × (user + assistant) + user; total da conversa cresce com t²",
    "Decodificação restrita: p'(token) = p(token) / Σ p(permitidos), e 0 para tokens fora do schema",
    "P(maioria de n certa) = Σ_{k > n/2} C(n, k) · p^k · (1 − p)^(n − k)",
    "Chamadas de uma árvore sem poda = b + b² + … + b^d",
  ],
  pitfalls: [
    "Ajustar o prompt olhando duas respostas, sem um eval com casos fixos.",
    "Colocar segredos ou permissões no system prompt, como se ele fosse uma barreira de segurança.",
    "Tentar corrigir um fato errado reescrevendo a instrução, em vez de colocar a informação no contexto.",
    "Pedir JSON só no prompt e confiar no JSON.parse em produção.",
    "Achar que um filtro de frases ou um aviso no prompt impede prompt injection.",
    "Empilhar exemplos, amostras e etapas sem medir se o ganho paga os tokens e a latência.",
  ],
  diagram: {
    kind: "pieces",
    layout: "single",
    pieces: [
      {
        id: "module-05",
        piece: "block-diagram",
        blocks: [
          { id: "user", kind: "user", label: "user", col: 0, row: 0 },
          { id: "template", kind: "context", label: "system + template", col: 0, row: 1 },
          { id: "guard", kind: "guardrail", label: "isola conteúdo", col: 1, row: 0.5 },
          { id: "llm", kind: "llm", label: "llm", col: 2, row: 0.5 },
          { id: "tool", kind: "tool", label: "tool calling", col: 3, row: 0 },
          { id: "json", kind: "eval", label: "json + eval", col: 3, row: 1 },
        ],
        edges: [
          { from: "user", to: "guard", label: "pergunta" },
          { from: "template", to: "guard", label: "regras e exemplos" },
          { from: "guard", to: "llm" },
          { from: "llm", to: "tool", label: "tool_call" },
          { from: "llm", to: "json", label: "saída" },
        ],
        active: "llm",
      },
    ],
  },
  lessons,
};

export default summary;
