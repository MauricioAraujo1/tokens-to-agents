import type { InterfaceLanguage } from "../types/practice";

export const CURRENT_LANGUAGE_CODE = "PT";

export const INTERFACE_LANGUAGES: InterfaceLanguage[] = [
  { code: "EN", nativeName: "English", portugueseName: "Inglês", isAvailable: false },
  { code: "ES", nativeName: "Español", portugueseName: "Espanhol", isAvailable: false },
  { code: "PT", nativeName: "Português", portugueseName: "Português", isAvailable: true },
  { code: "FR", nativeName: "Français", portugueseName: "Francês", isAvailable: false },
  { code: "IT", nativeName: "Italiano", portugueseName: "Italiano", isAvailable: false },
  { code: "DE", nativeName: "Deutsch", portugueseName: "Alemão", isAvailable: false },
  { code: "NL", nativeName: "Nederlands", portugueseName: "Holandês", isAvailable: false },
  { code: "PL", nativeName: "Polski", portugueseName: "Polonês", isAvailable: false },
  { code: "TR", nativeName: "Türkçe", portugueseName: "Turco", isAvailable: false },
  { code: "ID", nativeName: "Bahasa Indonesia", portugueseName: "Indonésio", isAvailable: false },
  { code: "VI", nativeName: "Tiếng Việt", portugueseName: "Vietnamita", isAvailable: false },
  { code: "EL", nativeName: "Ελληνικά", portugueseName: "Grego", isAvailable: false },
  { code: "UK", nativeName: "Українська", portugueseName: "Ucraniano", isAvailable: false },
  { code: "RU", nativeName: "Русский", portugueseName: "Russo", isAvailable: false },
  { code: "简", nativeName: "简体中文", portugueseName: "Chinês (simplificado)", isAvailable: false },
  { code: "繁", nativeName: "繁體中文", portugueseName: "Chinês (tradicional)", isAvailable: false },
  { code: "JA", nativeName: "日本語", portugueseName: "Japonês", isAvailable: false },
  { code: "KO", nativeName: "한국어", portugueseName: "Coreano", isAvailable: false },
  { code: "HI", nativeName: "हिन्दी", portugueseName: "Hindi", isAvailable: false },
  { code: "AR", nativeName: "العربية", portugueseName: "Árabe", isAvailable: false },
  { code: "HE", nativeName: "עברית", portugueseName: "Hebraico", isAvailable: false },
];
