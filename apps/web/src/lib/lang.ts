import { cookies } from "next/headers"
import { translations, type Lang, type TranslationKey } from "./i18n"

export type { Lang, TranslationKey }

export async function getServerLang(): Promise<Lang> {
  try {
    const jar = await cookies()
    const lang = jar.get("mem-lang")?.value
    return lang === "en" ? "en" : "pt"
  } catch {
    return "pt"
  }
}

export function serverT(lang: Lang) {
  return (key: TranslationKey): string => {
    return (translations[lang] as Record<string, string>)[key as string]
      ?? (translations.pt as Record<string, string>)[key as string]
      ?? key
  }
}
