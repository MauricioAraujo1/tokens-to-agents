// Conteúdo do playground do tokenizador BPE. É conteúdo didático, não interface: fica em PT-BR (AD-003).

export const bpeTokenizerContent = {
  title: "Tokenizador BPE",
  observe:
    "Com zero merges, cada caractere é um token. A cada merge, o par de símbolos mais frequente no corpus de exemplo vira um token só. Palavras comuns no corpus acabam em poucos tokens; palavras raras continuam picadas em pedaços.",
  textLabel: "Texto",
  textHint: "cada palavra é tokenizada separadamente",
  mergesLabel: "Merges aplicados",
  mergesHint: "aprendidos, em ordem, no corpus de exemplo",
  caption: (chars: number, tokens: number) => `${chars} caracteres → ${tokens} tokens`,
  stepsTitle: "Merges, na ordem do vocabulário",
  step: (n: number, pair: string, token: string, count: number) =>
    count > 0 ? `${n}. ${pair} → ${token} · ${count}× no texto` : `${n}. ${pair} → ${token} · não aparece no texto`,
  noMerges: "Nenhum merge aplicado: cada caractere é um token.",
  emptyText: "Digite um texto para tokenizar.",
  defaultText: "os modelos tokenizam textos",
  maxLength: 40,
  /** Quantos merges aprender no corpus. */
  mergeCount: 30,
  corpus: [
    "o modelo lê o texto e o tokenizador divide o texto em tokens",
    "os modelos leem textos e os tokenizadores dividem textos em tokens",
    "tokens frequentes viram um token só e palavras raras viram vários tokens",
    "o modelo aprende com textos e os modelos aprendem com muitos textos",
  ].join(" "),
};
