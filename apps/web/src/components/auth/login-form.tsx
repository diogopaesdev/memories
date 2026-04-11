"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { signIn } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useI18n } from "@/components/providers/i18n-provider"
import { useTheme } from "@/components/providers/theme-provider"
import { Moon, Sun } from "lucide-react"

export function LoginForm() {
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") ?? "/projects"
  const { t, lang, setLang } = useI18n()
  const { resolved, setTheme } = useTheme()

  async function handleGoogleLogin() {
    setLoading(true)
    await signIn("google", { callbackUrl })
  }

  return (
    <div className="space-y-4">
      <Card
        className="shadow-sm border"
        style={{ background: "var(--mem-surface)", borderColor: "var(--mem-border)" }}
      >
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-lg" style={{ color: "var(--mem-ink)" }}>
            {t("login.card-title")}
          </CardTitle>
          <CardDescription style={{ color: "var(--mem-ink-2)" }}>
            {t("login.card-desc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full"
            size="lg"
            variant="outline"
            style={{ borderColor: "var(--mem-border)", color: "var(--mem-ink)" }}
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            {loading ? t("login.signing-in") : t("login.button")}
          </Button>

          <p className="text-center text-xs" style={{ color: "var(--mem-ink-3)" }}>
            {t("login.terms")}
          </p>
        </CardContent>
      </Card>

      {/* Language + Theme toggles */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setLang(lang === "pt" ? "en" : "pt")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{
            color: "var(--mem-ink-2)",
            border: "1px solid var(--mem-border)",
            background: "var(--mem-surface)",
          }}
        >
          <span>{lang === "pt" ? "🇧🇷" : "🇺🇸"}</span>
          <span>{lang === "pt" ? "PT" : "EN"}</span>
          <span style={{ color: "var(--mem-ink-3)" }}>→</span>
          <span>{lang === "pt" ? "EN" : "PT"}</span>
        </button>

        <button
          onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{
            color: "var(--mem-ink-2)",
            border: "1px solid var(--mem-border)",
            background: "var(--mem-surface)",
          }}
        >
          {resolved === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          <span>{resolved === "dark" ? t("theme.light") : t("theme.dark")}</span>
        </button>
      </div>
    </div>
  )
}
