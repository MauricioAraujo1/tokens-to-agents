/** Os 24 blocos da página "05 · Blocos · Exploração" (FigCraft). */
export type IsoBlockKind =
  | "user"
  | "app"
  | "embedding"
  | "vector-db"
  | "retrieval"
  | "context"
  | "llm"
  | "answer"
  | "no-result"
  | "sql-db"
  | "nosql-db"
  | "kv-cache"
  | "documents"
  | "phone"
  | "laptop"
  | "server"
  | "cloud"
  | "queue"
  | "agent"
  | "tool"
  | "memory"
  | "guardrail"
  | "eval"
  | "tokens";

export type IsoBlockColor = "green" | "blue" | "purple" | "orange" | "red" | "yellow" | "gray";

export const COLOR_VARIABLE: Record<IsoBlockColor, string> = {
  green: "var(--diagram-green)",
  blue: "var(--diagram-blue)",
  purple: "var(--diagram-purple)",
  orange: "var(--diagram-orange)",
  red: "var(--diagram-red)",
  yellow: "var(--diagram-yellow)",
  gray: "var(--module-00)",
};

/** Cor da categoria de cada bloco: dispositivos e infraestrutura usam o cinza do módulo 00 (regras da página 05). */
export const ISO_BLOCK_COLOR: Record<IsoBlockKind, IsoBlockColor> = {
  user: "blue",
  app: "blue",
  embedding: "blue",
  "vector-db": "purple",
  retrieval: "purple",
  context: "yellow",
  llm: "orange",
  answer: "green",
  "no-result": "red",
  "sql-db": "blue",
  "nosql-db": "green",
  "kv-cache": "yellow",
  documents: "yellow",
  phone: "gray",
  laptop: "gray",
  server: "gray",
  cloud: "blue",
  queue: "gray",
  agent: "orange",
  tool: "yellow",
  memory: "green",
  guardrail: "green",
  eval: "purple",
  tokens: "blue",
};

/** Distância da base do bloco até o centro da pílula do rótulo, medida no desenho de cada bloco. */
export const ISO_BLOCK_PILL_OFFSET: Record<IsoBlockKind, number> = {
  user: 122,
  app: 132,
  embedding: 124,
  "vector-db": 132,
  retrieval: 132,
  context: 110,
  llm: 132,
  answer: 128,
  "no-result": 132,
  "sql-db": 118,
  "nosql-db": 122,
  "kv-cache": 132,
  documents: 132,
  phone: 134,
  laptop: 122,
  server: 132,
  cloud: 138,
  queue: 102,
  agent: 138,
  tool: 116,
  memory: 108,
  guardrail: 132,
  eval: 134,
  tokens: 102,
};

export const ISO_BLOCK_KINDS = Object.keys(ISO_BLOCK_COLOR) as IsoBlockKind[];

export function isoBlockColor(kind: IsoBlockKind): string {
  return COLOR_VARIABLE[ISO_BLOCK_COLOR[kind]];
}
