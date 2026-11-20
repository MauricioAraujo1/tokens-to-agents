import { catalog } from "../catalog";
import type { LessonId, SummaryContent } from "../../types/content";

// Cheat sheet do módulo 13 (SUM-01.1). O diagrama é desenhado pelo <Scene> num passo único, e a folha
// tem estilo de impressão em A4 (SUM-01.2). As aulas linkadas saem do catálogo: as 14 do módulo, em ordem.
// Detalhes versionados seguem a revisão 2026-07-28 da especificação do MCP.

const lessons: LessonId[] = (catalog.find((module) => module.id === "13")?.lessons ?? []).map((lesson) => lesson.id);

const summary: SummaryContent = {
  module: "13",
  concepts: [
    "MCP = protocolo aberto que padroniza como apps de IA descobrem e usam ferramentas, dados e prompts de programas externos. Troca o custo N × M de conectores sob medida por N clientes + M servidores.",
    "Participantes: o host (app de IA) cria um cliente por servidor; cada cliente mantém uma conexão dedicada. O host concentra contexto, consentimento e roteamento; o modelo nunca fala direto com o servidor.",
    "Camadas: dados (JSON-RPC 2.0 com pedidos, respostas e notificações; descoberta; primitivas) e transporte (stdio para servidores locais, Streamable HTTP para remotos, com autorização OAuth).",
    "Primitivas do servidor: tools (o modelo decide), resources por URI (a aplicação decide) e prompts (o usuário escolhe). Do cliente: elicitação em modo formulário ou URL; sampling e roots estão deprecated em 2026-07-28.",
    "Ciclo de vida: até 2025-11-25, handshake initialize → resposta → notifications/initialized; em 2026-07-28, sem handshake nem sessão, com versão e capacidades no _meta de todo pedido e server/discover opcional.",
    "Descoberta e execução: tools/list (paginado, com ttlMs), prefixo do servidor contra colisões, tradução para a tool da API do modelo, tools/call com timeout e isError para erros de execução; input_required pede mais dados e o cliente repete o pedido.",
    "Segurança: descrições, anotações e resultados de servidores não confiáveis são dados suspeitos (tool poisoning, rug pull, injeção indireta). Tokens só com o servidor como audiência, sem passthrough; proxies com consentimento por cliente; servidores locais em sandbox.",
    "Com agentes: o runtime é o host; política de aprovação antes de cada chamada; descoberta progressiva para catálogos grandes; programmatic tool calling para mover dados sem passá-los pelo modelo. Function calling continua sendo como o modelo pede; MCP é como o host alcança as ferramentas.",
  ],
  formulas: [
    "Integrações sem padrão = N apps × M ferramentas; com MCP = N + M",
    "Clientes MCP = Σ (servidores conectados em cada host)",
    "Tokens de catálogo por chamada ≈ servidores × ferramentas por servidor × tokens por definição",
    "Descoberta progressiva vale quando tokens de catálogo > 1% a 5% da janela de contexto",
    "Bytes de _meta numa tarefa (2026-07-28) = pedidos × tamanho do _meta",
  ],
  pitfalls: [
    "Escrever no stdout de um servidor stdio: qualquer print quebra o protocolo; logs vão para o stderr.",
    "Confiar em anotações e descrições de servidores de terceiros: readOnlyHint não libera nada, e ferramentas sem anotação contam como destrutivas.",
    "Repassar ao servidor de uma API o token que o cliente mandou (token passthrough) ou aceitar tokens emitidos para outro serviço.",
    "Conectar servidores demais e mandar todas as definições em toda chamada, sem cache, prefixos ou descoberta progressiva.",
    "Devolver resultados sem teto ou recursos sem validar caminhos: contexto estourado e travessia de diretório.",
    "Expor um servidor HTTP local em 0.0.0.0 sem validar Origin nem autenticar: alvo fácil de DNS rebinding.",
  ],
  diagram: {
    kind: "pieces",
    layout: "single",
    pieces: [
      {
        id: "module-13",
        piece: "block-diagram",
        blocks: [
          { id: "user", kind: "user", label: "usuário", col: 0, row: 0.5 },
          { id: "llm", kind: "llm", label: "modelo", col: 1, row: 0 },
          { id: "host", kind: "laptop", label: "host + clientes", col: 1, row: 1 },
          { id: "gate", kind: "guardrail", label: "aprovação", col: 2, row: 1 },
          { id: "local", kind: "tool", label: "servidor stdio", col: 3, row: 0 },
          { id: "remote", kind: "cloud", label: "servidor http", col: 3, row: 1 },
        ],
        edges: [
          { from: "user", to: "host" },
          { from: "llm", to: "host", label: "tool_use" },
          { from: "host", to: "gate", label: "tools/call" },
          { from: "gate", to: "local", label: "stdio" },
          { from: "gate", to: "remote", label: "https + oauth" },
        ],
        active: "host",
      },
    ],
  },
  lessons,
};

export default summary;
