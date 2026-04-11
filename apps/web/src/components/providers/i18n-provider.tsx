"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { translations } from "@/lib/i18n"

export type Lang = "pt" | "en"

export type TranslationKey = keyof typeof translations.pt

interface I18nContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: TranslationKey) => string
}

// Safe default: always returns the Portuguese string, never the raw key
function makeT(lang: Lang): (key: TranslationKey) => string {
  return (key) => {
    const dict = lang === "en" ? translations.en : translations.pt
    return (dict as Record<string, string>)[key as string] ?? key
  }
}

const I18nContext = createContext<I18nContextValue>({
  lang: "pt",
  setLang: () => {},
  t: makeT("pt"),
})

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("pt")

  useEffect(() => {
    try {
      const stored = localStorage.getItem("mem-lang")
      if (stored === "pt" || stored === "en") {
        setLangState(stored)
      } else {
        const browser = navigator.language.toLowerCase().startsWith("pt") ? "pt" : "en"
        setLangState(browser)
      }
    } catch {
      // localStorage blocked in some browser contexts
    }
  }, [])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try { localStorage.setItem("mem-lang", l) } catch {}
    // Cookie for server components (readable by Next.js cookies())
    try { document.cookie = `mem-lang=${l};path=/;max-age=31536000;SameSite=lax` } catch {}
  }, [])

  const t = useMemo(() => makeT(lang), [lang])

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export const useI18n = () => useContext(I18nContext)
