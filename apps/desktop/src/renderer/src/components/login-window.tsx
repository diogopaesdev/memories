import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { checkSession } from "@/lib/api"
import { electronAPI } from "@/lib/electron"

export function LoginWindow() {
  const [loading, setLoading]   = useState(false)
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
    setTimeout(() => { clearInterval(interval); setLoading(false) }, 300_000)
  }

  if (checking) {
    return (
      <div style={{
        height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#0a0a0a",
      }}>
        <Loader2 size={20} color="rgba(255,255,255,0.2)" className="animate-spin" />
      </div>
    )
  }

  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "#0a0a0a", padding: 28,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
      userSelect: "none",
    }}>
      {/* Logo mark */}
      <div style={{ marginBottom: 24, position: "relative", width: 52, height: 52 }}>
        {/* Rounded square bg */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: 14,
          background: "#161616", border: "1px solid rgba(255,255,255,0.06)",
        }} />
        {/* Outer ring */}
        <div style={{
          position: "absolute",
          top: "50%", left: "50%",
          width: 34, height: 34,
          transform: "translate(-50%,-50%)",
          borderRadius: "50%",
          border: "1px solid rgba(255,255,255,0.2)",
        }} />
        {/* Middle ring */}
        <div style={{
          position: "absolute",
          top: "50%", left: "50%",
          width: 20, height: 20,
          transform: "translate(-50%,-50%)",
          borderRadius: "50%",
          border: "1px solid rgba(255,255,255,0.35)",
        }} />
        {/* Center dot */}
        <div style={{
          position: "absolute",
          top: "50%", left: "50%",
          width: 7, height: 7,
          transform: "translate(-50%,-50%)",
          borderRadius: "50%",
          background: "rgba(255,255,255,0.7)",
        }} />
      </div>

      <h1 style={{ fontSize: 17, fontWeight: 700, color: "#d0d0ce", marginBottom: 4, letterSpacing: "-0.01em" }}>
        Memories
      </h1>
      <p style={{ fontSize: 11, color: "#333", marginBottom: 28 }}>
        Captura por voz
      </p>

      {/* Card */}
      <div style={{
        width: "100%", maxWidth: 240,
        background: "#111", borderRadius: 14,
        border: "1px solid #1e1e1e", padding: 18,
      }}>
        <p style={{ fontSize: 12, color: "#555", lineHeight: 1.6, marginBottom: 14 }}>
          Seu browser será aberto para fazer login com Google. Retorne ao app após entrar.
        </p>

        <button
          onClick={handleOpenBrowser}
          disabled={loading}
          style={{
            width: "100%", padding: "9px 12px", borderRadius: 9,
            border: "1px solid rgba(255,255,255,.08)",
            background: loading ? "#161616" : "rgba(255,255,255,.05)",
            color: loading ? "#444" : "#888", fontSize: 12, cursor: loading ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "background .15s, color .15s",
          }}
          onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = "rgba(255,255,255,.09)"; e.currentTarget.style.color = "#d0d0ce" }}}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,.05)"; e.currentTarget.style.color = "#888" }}
        >
          {loading
            ? <Loader2 size={13} className="animate-spin" />
            : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            )
          }
          {loading ? "Aguardando login..." : "Abrir browser para login"}
        </button>

        {loading && (
          <p style={{ fontSize: 10, color: "#2a2a2a", marginTop: 10, textAlign: "center", lineHeight: 1.5 }}>
            Após fazer login no browser, o app<br />será atualizado automaticamente.
          </p>
        )}
      </div>

      <p style={{ fontSize: 10, color: "#222", marginTop: 20, textAlign: "center", lineHeight: 1.6 }}>
        Painel em <span style={{ fontFamily: "monospace" }}>{webAppUrl}</span>
      </p>
    </div>
  )
}
