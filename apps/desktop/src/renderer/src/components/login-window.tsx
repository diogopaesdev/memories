import { useState, useEffect } from "react"
import { ExternalLink, Loader2 } from "lucide-react"
import { checkSession } from "@/lib/api"
import { electronAPI } from "@/lib/electron"

export function LoginWindow() {
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [webAppUrl, setWebAppUrl] = useState("http://localhost:3000")

  useEffect(() => {
    async function init() {
      const url = await window.electron.store.get("webAppUrl")
      if (url) setWebAppUrl(url)

      const session = await checkSession()
      if (session?.user) {
        await window.electron.store.set("token", session.session?.token ?? "session")
        await window.electron.store.set("userId", session.user.id)
        electronAPI().window.closeLogin()
      }
      setChecking(false)
    }
    init()
  }, [])

  async function handleOpenBrowser() {
    setLoading(true)
    await electronAPI().openWeb("/login")

    // Poll for session after opening browser
    const interval = setInterval(async () => {
      const session = await checkSession()
      if (session?.user) {
        clearInterval(interval)
        await window.electron.store.set("token", session.session?.token ?? "session")
        await window.electron.store.set("userId", session.user.id)
        await electronAPI().notify("Login realizado!", `Bem-vindo, ${session.user.name}`)
        electronAPI().window.closeLogin()
      }
    }, 2000)

    // Stop polling after 5 minutes
    setTimeout(() => {
      clearInterval(interval)
      setLoading(false)
    }, 300_000)
  }

  if (checking) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
          <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">ProjectsReport</h1>
        <p className="text-sm text-slate-500 mt-2">App de captura por voz</p>
      </div>

      <div className="w-full max-w-xs bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
        <h2 className="text-base font-semibold text-slate-800 mb-1">Entrar na conta</h2>
        <p className="text-sm text-slate-500 mb-5">
          Seu browser será aberto para fazer login com Google.
          Retorne ao app após entrar.
        </p>

        <button
          onClick={handleOpenBrowser}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ExternalLink className="w-4 h-4" />
          )}
          {loading ? "Aguardando login..." : "Abrir browser para login"}
        </button>

        {loading && (
          <p className="text-center text-xs text-slate-400 mt-3">
            Após fazer login no browser, o app será atualizado automaticamente.
          </p>
        )}
      </div>

      <p className="text-xs text-slate-400 mt-6 text-center">
        Certifique-se que o painel web está rodando em<br />
        <span className="font-mono">{webAppUrl}</span>
      </p>
    </div>
  )
}
