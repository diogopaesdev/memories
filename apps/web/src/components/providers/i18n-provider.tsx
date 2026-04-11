"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { translations, type Lang, type TranslationKey } from "@/lib/i18n"

interface I18nContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: TranslationKey) => string
}

const I18nContext = createContext<I18nContextValue>({
  lang: "pt",
  setLang: () => {},
  t: (k) => k,
})

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("pt")

  useEffect(() => {
    const stored = localStorage.getItem("mem-lang") as Lang | null
    if (stored === "pt" || stored === "en") {
      setLangState(stored)
    } else {
      setLangState(navigator.language.startsWith("pt") ? "pt" : "en")
    }
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem("mem-lang", l)
  }

  function t(key: TranslationKey): string {
    return (translations[lang] as Record<string, string>)[key] ??
      (translations.pt as Record<string, string>)[key] ??
      key
  }

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export const useI18n = () => useContext(I18nContext)
