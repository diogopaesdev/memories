import { useState, useEffect, useCallback } from "react"
import { Mic, Menu, Settings, ArrowLeft, Key, CheckCircle2, ChevronDown, ExternalLink, LogOut, LogIn, Radio, Zap } from "lucide-react"
import { useContinuousListener } from "@/hooks/use-voice-recorder"
import { electronAPI } from "@/lib/electron"
import type { Session, VoiceResult } from "@/lib/api"

/* ─── tamanhos ─────────────────────────────── */
const ORB_W = 88
const ORB_H = 88
const PANEL_W = 300
const PANEL_H = 390

/* ─── voz ──────────────────────────────────── */
function speak(text: string) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = "pt-BR"
  u.rate = 1.05
  window.speechSynthesis.speak(u)
}

/* ─── estilos ──────────────────────────────── */
const S = {
  btn: {
    width: "100%", padding: "9px 12px", borderRadius: 8,
    border: "1px solid #2a2a2a", background: "#1a1a1a",
    color: "#f0f0f0", fontSize: 12, cursor: "pointer",
    display: "flex", alignItems: "center", gap: 8,
  } satisfies React.CSSProperties,
  btnPrimary: {
    width: "100%", padding: "9px 12px", borderRadius: 8,
    border: "none", background: "#2563eb",
    color: "#fff", fontSize: 12, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    fontWeight: 600,
  } satisfies React.CSSProperties,
  input: {
    width: "100%", padding: "8px 10px", borderRadius: 7,
    border: "1px solid #2a2a2a", background: "#1a1a1a",
    color: "#f0f0f0", fontSize: 12, outline: "none",
    fontFamily: "inherit", boxSizing: "border-box" as const,
  } satisfies React.CSSProperties,
  label: {
    fontSize: 10, color: "#555", letterSpacing: "0.08em",
    textTransform: "uppercase" as const, marginBottom: 4, display: "block",
  } satisfies React.CSSProperties,
}

/* ─── Orb ──────────────────────────────────── */
function OrbButton({ size, listenerState, onClick }: {
  size: number
  listenerState: "passive" | "active" | "saving" | "error"
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)

  const isActive = listenerState === "active"
  const isSaving = listenerState === "saving"
  const color = isActive ? "rgba(40,200,80,.9)" : "rgba(0,212,255,.9)"
  const borderColor = isActive ? "rgba(40,200,80,.5)" : "rgba(0,212,255,.35)"
  const bg = isActive
    ? "radial-gradient(circle at 38% 34%, #001a06 0%, #000802 100%)"
    : "radial-gradient(circle at 38% 34%, #001830 0%, #000810 60%, #000408 100%)"

  const iconSize = size * 0.34

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative", width: size, height: size,
        borderRadius: "50%",
        border: `1.5px solid ${hovered ? "rgba(255,255,255,.25)" : borderColor}`,
        background: hovered ? "radial-gradient(circle at 38% 34%, #0a1020 0%, #050a12 100%)" : bg,
        cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, transition: "border-color .2s, background .2s",
      }}
      className={!hovered && isActive ? "orb-record" : !hovered ? "orb-breathe" : ""}
    >
      {!hovered && (
        <>
          <div className="arc-cw" style={{
            position: "absolute", inset: -6, borderRadius: "50%",
            border: "1.5px solid transparent",
            borderTopColor: color,
            borderRightColor: isActive ? "rgba(40,200,80,.15)" : "rgba(0,212,255,.12)",
            pointerEvents: "none",
          }} />
          <div className="arc-ccw" style={{
            position: "absolute", inset: -3, borderRadius: "50%",
            border: "1px solid transparent",
            borderBottomColor: color,
            borderLeftColor: isActive ? "rgba(40,200,80,.1)" : "rgba(0,212,255,.08)",
            pointerEvents: "none",
          }} />
        </>
      )}

      {hovered ? (
        <Menu style={{ width: iconSize, height: iconSize, color: "#ccc" }} />
      ) : isSaving ? (
        <div style={{
          width: size * 0.28, height: size * 0.28, borderRadius: "50%",
          border: "2px solid rgba(0,212,255,.3)", borderTopColor: "rgba(0,212,255,.9)",
          animation: "arc-cw 0.7s linear infinite",
        }} />
      ) : isActive ? (
        <Zap style={{ width: iconSize, height: iconSize, color, position: "relative", zIndex: 1 }} />
      ) : (
        <Mic style={{ width: iconSize, height: iconSize, color, position: "relative", zIndex: 1 }} />
      )}
    </button>
  )
}

/* ─── Main ─────────────────────────────────── */
export function RecorderWindow() {
  const [session, setSession] = useState<Session | null | "loading">("loading")
  const [openaiKey, setOpenaiKey] = useState("")
  const [savedKey, setSavedKey] = useState<string | null>(null)
  const [triggerWord, setTriggerWord] = useState<string | null>(null)
  const [triggerInput, setTriggerInput] = useState("")
  const [result, setResult] = useState<VoiceResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [view, setView] = useState<"home" | "settings">("home")
  const [teams, setTeams] = useState<{ id: string; name: string; isPersonal: boolean }[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const isAuthed = session !== null && session !== "loading"

  const handleCommand = useCallback(async (command: string) => {
    setError(null)
    try {
      const res = await electronAPI().processVoice(command, savedKey)
      setResult(res)
      speak(`Feito. Salvo em ${res.projectName}`)
      setTimeout(() => setResult(null), 5000)
    } catch (e: unknown) {
      const msg = (e as { message?: string }).message ?? "Erro ao salvar"
      setError(msg)
      speak("Erro ao salvar")
    }
  }, [savedKey])

  const { listenerState, interimText, capturedText, lastError, debugLog, startListening, stopListening } =
    useContinuousListener(triggerWord, savedKey, handleCommand)

  const loadSession = useCallback(async () => {
    const data = await electronAPI().checkSession()
    setSession(data ? { user: data.user } : null)
  }, [])

  useEffect(() => {
    loadSession()
    Promise.all([
      window.electron.store.get("openaiApiKey"),
      window.electron.store.get("triggerWord"),
      window.electron.store.get("selectedTeamId"),
    ]).then(([key, word, teamId]) => {
      if (key) setSavedKey(key)
      if (word) setTriggerWord(word)
      if (teamId) setSelectedTeamId(teamId)
    })
    return electronAPI().onAuthChanged(loadSession)
  }, [loadSession])

  // Buscar times via IPC (evita CORS do renderer)
  useEffect(() => {
    if (!isAuthed) return
    electronAPI().listTeams().then((data) => {
      if (!data?.length) return
      setTeams(data)
      setSelectedTeamId((prev) => {
        if (prev) return prev
        const personal = data.find((t) => t.isPersonal) ?? data[0]
        window.electron.store.set("selectedTeamId", personal.id)
        return personal.id
      })
    }).catch(() => {})
  }, [isAuthed])

  // Auto-start: só precisa de API key + gatilho para escutar.
  // Auth só é necessária na hora de salvar (processVoice).
  // startListening() já ignora chamadas duplicadas (activeRef guard).
  useEffect(() => {
    if (triggerWord && savedKey) {
      startListening()
    }
  }, [triggerWord, savedKey, startListening])

  async function togglePanel() {
    if (panelOpen) {
      setPanelOpen(false)
      setView("home")
      await electronAPI().window.setSize(ORB_W, ORB_H)
    } else {
      await electronAPI().window.setSize(PANEL_W, PANEL_H + ORB_H)
      setPanelOpen(true)
    }
  }

  async function saveTriggerWord() {
    const word = triggerInput.trim() || null
    await window.electron.store.set("triggerWord", word)
    setTriggerWord(word)
    setTriggerInput("")
    if (word && isAuthed && savedKey) startListening()
  }

  async function saveApiKey() {
    const key = openaiKey.trim() || null
    await window.electron.store.set("openaiApiKey", key)
    setSavedKey(key)
    setOpenaiKey("")
  }

  const setupMissing = !isAuthed || !triggerWord || !savedKey
  const isRunning = listenerState !== "error"

  return (
    <div
      style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#020b14" }}
      onContextMenu={() => electronAPI().window.contextMenu()}
    >

      {/* ── Painel (abre com clique na orb) ── */}
      {panelOpen && (
        <div style={{
          flex: 1, background: "#111", border: "1px solid #222",
          borderRadius: "14px 14px 0 0", display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", padding: "10px 12px", borderBottom: "1px solid #1a1a1a", gap: 8 }}>
            {view === "settings" ? (
              <button onClick={() => setView("home")} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", padding: 0, display: "flex" }}>
                <ArrowLeft size={14} />
              </button>
            ) : (
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: listenerState === "active" ? "#22c55e" : listenerState === "passive" ? "#2563eb" : "#555" }} />
            )}
            <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "#f0f0f0" }}>
              {view === "settings" ? "Configurações" : "ProjectsReport"}
            </span>
            {view === "home" && (
              <button onClick={() => setView("settings")} style={{ background: "none", border: "none", color: "#444", cursor: "pointer", padding: 4, display: "flex" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#888")}
                onMouseLeave={e => (e.currentTarget.style.color = "#444")}
              >
                <Settings size={13} />
              </button>
            )}
            <button onClick={togglePanel} style={{ background: "none", border: "none", color: "#333", cursor: "pointer", padding: 4, display: "flex" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#666")}
              onMouseLeave={e => (e.currentTarget.style.color = "#333")}
            >
              <ChevronDown size={14} />
            </button>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: "auto" }}>

            {/* ── HOME ── */}
            {view === "home" && (
              <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: 10 }}>

                {setupMissing && (
                  <div style={{ padding: "10px 12px", background: "#1a1a1a", borderRadius: 8, border: "1px solid rgba(245,158,11,.2)" }}>
                    <p style={{ fontSize: 11, color: "#f59e0b", marginBottom: 6, fontWeight: 600 }}>Configure para ativar</p>
                    {!isAuthed && <p style={{ fontSize: 10, color: "#666" }}>• Conectar conta</p>}
                    {!savedKey && <p style={{ fontSize: 10, color: "#666" }}>• Chave OpenAI</p>}
                    {!triggerWord && <p style={{ fontSize: 10, color: "#666" }}>• Palavra-gatilho</p>}
                    <button onClick={() => setView("settings")} style={{ ...S.btnPrimary, marginTop: 8, fontSize: 11 }}>
                      Configurar agora
                    </button>
                  </div>
                )}

                {!setupMissing && (
                  <div style={{ padding: "10px 12px", background: "#1a1a1a", borderRadius: 8, border: "1px solid #222" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <Radio size={10} color={listenerState === "active" ? "#22c55e" : listenerState === "saving" ? "#3b82f6" : "#3b82f6"} />
                      <span style={{ fontSize: 10, fontWeight: 600, color: listenerState === "active" ? "#22c55e" : listenerState === "saving" ? "#3b82f6" : "#3b82f6" }}>
                        {listenerState === "saving" ? "SALVANDO..." : listenerState === "active" ? "CAPTURANDO" : "AGUARDANDO"}
                      </span>
                      {triggerWord && listenerState === "passive" && (
                        <span style={{ fontSize: 9, color: "#333", marginLeft: "auto" }}>
                          gatilho: <span style={{ color: "#555" }}>{triggerWord}</span>
                        </span>
                      )}
                    </div>
                    {listenerState === "active" && (capturedText || interimText) ? (
                      <p style={{ fontSize: 11, color: "#ccc", lineHeight: 1.5, maxHeight: 70, overflow: "hidden" }}>
                        {capturedText}
                        {interimText && <span style={{ color: "#555" }}> {interimText}</span>}
                      </p>
                    ) : (
                      <p style={{ fontSize: 11, color: "#333" }}>
                        {listenerState === "passive" && triggerWord
                          ? `Diga "${triggerWord} [seu comando]"`
                          : listenerState === "saving" ? "Processando..." : "..."}
                      </p>
                    )}
                  </div>
                )}

                {(error || lastError) && (
                  <p style={{ fontSize: 11, color: "#ef4444", padding: "6px 10px", background: "rgba(239,68,68,.08)", borderRadius: 8, border: "1px solid rgba(239,68,68,.2)" }}>
                    {error || lastError}
                  </p>
                )}

                {result && (
                  <div style={{ padding: "10px 12px", background: "#1a1a1a", borderRadius: 8, border: "1px solid rgba(34,197,94,.2)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#22c55e", marginBottom: 4 }}>
                      <CheckCircle2 size={12} />
                      <span style={{ fontSize: 10, fontWeight: 600 }}>Salvo</span>
                    </div>
                    <p style={{ fontSize: 12, color: "#f0f0f0", fontWeight: 500 }}>{result.title}</p>
                    <p style={{ fontSize: 10, color: "#555", marginTop: 2 }}>em <span style={{ color: "#888" }}>{result.projectName}</span></p>
                    <button
                      onClick={() => electronAPI().openWeb(`/memories/${result!.projectId}`)}
                      style={{ ...S.btn, marginTop: 8, fontSize: 10, color: "#2563eb", padding: "4px 8px" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#222")}
                      onMouseLeave={e => (e.currentTarget.style.background = "#1a1a1a")}
                    >
                      <ExternalLink size={10} /> Ver no painel
                    </button>
                  </div>
                )}

                {!setupMissing && (
                  <button
                    onClick={isRunning ? stopListening : startListening}
                    style={{ ...S.btn, justifyContent: "center", color: isRunning ? "#ef4444" : "#22c55e" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#222")}
                    onMouseLeave={e => (e.currentTarget.style.background = "#1a1a1a")}
                  >
                    <Mic size={13} /> {isRunning ? "Pausar escuta" : "Retomar escuta"}
                  </button>
                )}

                <button
                  onClick={() => electronAPI().openWeb("/memories")}
                  style={{ ...S.btn, fontSize: 11, color: "#555" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#222")}
                  onMouseLeave={e => (e.currentTarget.style.background = "#1a1a1a")}
                >
                  <ExternalLink size={12} /> Abrir painel web
                </button>

                {debugLog.length > 0 && (
                  <div style={{ padding: "8px 10px", background: "#0a0a0a", borderRadius: 8, border: "1px solid #1a1a1a" }}>
                    {debugLog.map((line, i) => (
                      <p key={i} style={{ fontSize: 9, color: "#444", fontFamily: "monospace", margin: "1px 0", lineHeight: 1.4 }}>{line}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── SETTINGS ── */}
            {view === "settings" && (
              <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: 14 }}>

                <div>
                  <span style={S.label}>Palavra-gatilho</span>
                  <p style={{ fontSize: 10, color: "#444", lineHeight: 1.5, marginBottom: 6 }}>
                    Diga ela seguida do comando para salvar.<br />
                    {triggerWord && <span style={{ color: "#555" }}>Ex: "{triggerWord}, hoje corrigi o bug de login"</span>}
                  </p>
                  <input
                    style={S.input}
                    placeholder={triggerWord ?? "Ex: Jarvis, Hey, Salvar..."}
                    value={triggerInput}
                    onChange={e => setTriggerInput(e.target.value)}
                    onFocus={e => (e.target.style.borderColor = "#2563eb")}
                    onBlur={e => (e.target.style.borderColor = "#2a2a2a")}
                  />
                  <button onClick={saveTriggerWord} style={{ ...S.btnPrimary, marginTop: 6, fontSize: 11 }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#1d4ed8")}
                    onMouseLeave={e => (e.currentTarget.style.background = "#2563eb")}
                  >
                    <Key size={11} /> Salvar palavra
                  </button>
                </div>

                <div>
                  <span style={S.label}>Chave OpenAI</span>
                  <input
                    style={{ ...S.input, fontFamily: "monospace" }}
                    type="password"
                    placeholder={savedKey ? "••••••••••••" : "sk-..."}
                    value={openaiKey}
                    onChange={e => setOpenaiKey(e.target.value)}
                    onFocus={e => (e.target.style.borderColor = "#2563eb")}
                    onBlur={e => (e.target.style.borderColor = "#2a2a2a")}
                  />
                  <button onClick={saveApiKey} style={{ ...S.btnPrimary, marginTop: 6, fontSize: 11 }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#1d4ed8")}
                    onMouseLeave={e => (e.currentTarget.style.background = "#2563eb")}
                  >
                    <Key size={11} /> Salvar chave
                  </button>
                </div>

                {isAuthed && teams.length > 0 && (
                  <div>
                    <span style={S.label}>Time destino</span>
                    <select
                      value={selectedTeamId ?? ""}
                      onChange={async (e) => {
                        const id = e.target.value
                        setSelectedTeamId(id)
                        await window.electron.store.set("selectedTeamId", id)
                      }}
                      style={{ ...S.input, cursor: "pointer" }}
                    >
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}{t.isPersonal ? " (pessoal)" : ""}</option>
                      ))}
                    </select>
                    <p style={{ fontSize: 10, color: "#444", marginTop: 4 }}>
                      Memórias salvas neste time via voz
                    </p>
                  </div>
                )}

                <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: 12 }}>
                  {isAuthed ? (
                    <>
                      <p style={{ fontSize: 11, color: "#888", marginBottom: 8 }}>
                        {(session as Session).user.name}
                        <span style={{ color: "#555", fontSize: 10 }}> · {(session as Session).user.email}</span>
                      </p>
                      <button
                        onClick={async () => {
                          stopListening()
                          await window.electron.store.set("token", null)
                          await window.electron.store.set("userId", null)
                          setSession(null)
                        }}
                        style={{ ...S.btn, color: "#dc2626", fontSize: 11 }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#222")}
                        onMouseLeave={e => (e.currentTarget.style.background = "#1a1a1a")}
                      >
                        <LogOut size={12} /> Sair da conta
                      </button>
                    </>
                  ) : (
                    <button onClick={() => electronAPI().window.openLogin()} style={{ ...S.btnPrimary, fontSize: 11 }}>
                      <LogIn size={12} /> Conectar conta
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Orb fixa ── */}
      <div style={{
        height: ORB_H, flexShrink: 0,
        display: "flex", alignItems: "center",
        justifyContent: panelOpen ? "flex-end" : "center",
        paddingRight: panelOpen ? 13 : 0,
        background: "#020b14",
      }}>
        <OrbButton size={62} listenerState={listenerState} onClick={togglePanel} />
      </div>
    </div>
  )
}
