import { useState, useEffect, useRef } from "react"
import { Loader2, ExternalLink, ArrowRight } from "lucide-react"
import { checkSession, exchangeCode } from "@/lib/api"
import { electronAPI } from "@/lib/electron"

type Step = "checking" | "idle" | "browser-opened" | "connecting" | "error"

export function LoginWindow() {
  const [step, setStep]         = useState<Step>("checking")
  const [code, setCode]         = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  const [webAppUrl, setWebAppUrl] = useState("")
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    async function init() {
      const url = await window.electron.store.get("webAppUrl")
      setWebAppUrl(url ?? "")
      const session = await checkSession()
      if (session?.user) {
        // Já autenticado via token salvo — fechar direto
        electronAPI().window.closeLogin()
        return
      }
      setStep("idle")
    }
    init()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  function openBrowser() {
    electronAPI().openWeb("/connect-desktop")
    setStep("browser-opened")
    setErrorMsg("")
  }

  async function handleConnect() {
    const trimmed = code.trim().toUpperCase().replace(/\s/g, "")
    if (trimmed.length < 6) {
      setErrorMsg("Digite o código de 6 caracteres exibido no site.")
      return
    }
    setStep("connecting")
    setErrorMsg("")
    try {
      const { token, userId } = await exchangeCode(trimmed)
      await window.electron.store.set("token", token)
      await window.electron.store.set("userId", userId)
      await electronAPI().notify("Conectado!", "Bem-vindo ao Memories.")
      electronAPI().window.closeLogin()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao conectar"
      setErrorMsg(msg)
      setStep("browser-opened")
    }
  }

  /* ── render ── */

  if (step === "checking") {
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
      {/* Logo */}
      <div style={{ marginBottom: 24, position: "relative", width: 52, height: 52 }}>
        <div style={{
          position: "absolute", inset: 0, borderRadius: 14,
          background: "#161616", border: "1px solid rgba(255,255,255,0.06)",
        }} />
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          width: 34, height: 34, transform: "translate(-50%,-50%)",
          borderRadius: "50%", border: "1px solid rgba(255,255,255,0.2)",
        }} />
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          width: 20, height: 20, transform: "translate(-50%,-50%)",
          borderRadius: "50%", border: "1px solid rgba(255,255,255,0.35)",
        }} />
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          width: 7, height: 7, transform: "translate(-50%,-50%)",
          borderRadius: "50%", background: "rgba(255,255,255,0.7)",
        }} />
      </div>

      <h1 style={{ fontSize: 17, fontWeight: 700, color: "#d0d0ce", marginBottom: 4, letterSpacing: "-0.01em" }}>
        Memories
      </h1>
      <p style={{ fontSize: 11, color: "#333", marginBottom: 28 }}>
        Captura por voz
      </p>

      <div style={{
        width: "100%", maxWidth: 240,
        background: "#111", borderRadius: 14,
        border: "1px solid #1e1e1e", padding: 18,
        display: "flex", flexDirection: "column", gap: 14,
      }}>

        {/* Passo 1 — abrir browser */}
        <div>
          <p style={{ fontSize: 10, color: "#555", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 8, textTransform: "uppercase" }}>
            1. Fazer login
          </p>
          <button
            onClick={openBrowser}
            style={{
              width: "100%", padding: "9px 12px", borderRadius: 9,
              border: "1px solid rgba(255,255,255,.08)",
              background: step === "browser-opened" ? "#161616" : "rgba(255,255,255,.05)",
              color: step === "browser-opened" ? "#555" : "#888",
              fontSize: 12, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "background .15s, color .15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,.09)"; e.currentTarget.style.color = "#d0d0ce" }}
            onMouseLeave={e => {
              e.currentTarget.style.background = step === "browser-opened" ? "#161616" : "rgba(255,255,255,.05)"
              e.currentTarget.style.color = step === "browser-opened" ? "#555" : "#888"
            }}
          >
            <ExternalLink size={12} />
            {step === "browser-opened" ? "Browser aberto ✓" : "Abrir browser para login"}
          </button>
        </div>

        {/* Passo 2 — inserir código */}
        <div style={{ opacity: step === "idle" ? 0.35 : 1, transition: "opacity .2s" }}>
          <p style={{ fontSize: 10, color: "#555", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 8, textTransform: "uppercase" }}>
            2. Inserir código de ativação
          </p>
          <input
            disabled={step === "idle" || step === "connecting"}
            placeholder="Ex: AB3X7Z"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
            onKeyDown={e => { if (e.key === "Enter") handleConnect() }}
            style={{
              width: "100%", padding: "9px 10px", borderRadius: 7,
              border: "1px solid #242424", background: "#0f0f0f",
              color: "#f0f0ee", fontSize: 16, fontWeight: 700,
              fontFamily: "monospace", letterSpacing: "0.25em",
              outline: "none", boxSizing: "border-box",
              textAlign: "center", textTransform: "uppercase",
              transition: "border-color .15s",
            }}
            onFocus={e => (e.target.style.borderColor = "rgba(255,255,255,.2)")}
            onBlur={e => (e.target.style.borderColor = "#242424")}
          />

          <button
            onClick={handleConnect}
            disabled={step === "idle" || step === "connecting" || code.length < 6}
            style={{
              width: "100%", marginTop: 8, padding: "9px 12px", borderRadius: 9,
              border: "1px solid rgba(255,255,255,.12)",
              background: (step === "idle" || code.length < 6) ? "#161616" : "rgba(255,255,255,.06)",
              color: (step === "idle" || code.length < 6) ? "#333" : "#f0f0ee",
              fontSize: 12, fontWeight: 600, cursor: (step === "idle" || code.length < 6) ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "background .15s, color .15s",
            }}
            onMouseEnter={e => { if (step !== "idle" && code.length >= 6) e.currentTarget.style.background = "rgba(255,255,255,.1)" }}
            onMouseLeave={e => { e.currentTarget.style.background = (step === "idle" || code.length < 6) ? "#161616" : "rgba(255,255,255,.06)" }}
          >
            {step === "connecting"
              ? <Loader2 size={13} className="animate-spin" />
              : <ArrowRight size={13} />
            }
            {step === "connecting" ? "Conectando..." : "Conectar"}
          </button>
        </div>

        {errorMsg && (
          <p style={{ fontSize: 11, color: "#c0392b", lineHeight: 1.5, textAlign: "center" }}>
            {errorMsg}
          </p>
        )}
      </div>

      {webAppUrl && (
        <p style={{ fontSize: 10, color: "#1e1e1e", marginTop: 20, textAlign: "center", fontFamily: "monospace" }}>
          {webAppUrl}
        </p>
      )}
    </div>
  )
}
