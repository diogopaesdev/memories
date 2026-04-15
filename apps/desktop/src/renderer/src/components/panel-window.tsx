import { useState, useEffect, useRef } from "react"
import { Settings, ArrowLeft, Key, CheckCircle2, ChevronDown, ExternalLink, LogOut, LogIn, Mic, Radio } from "lucide-react"
import { electronAPI } from "@/lib/electron"
import type { Session, VoiceResult } from "@/lib/api"

/* ─── styles ─────────────────────────────────── */
const S = {
  btn: {
    width: "100%", padding: "8px 12px", borderRadius: 8,
    border: "1px solid #242424", background: "#1a1a1a",
    color: "#aaa", fontSize: 12, cursor: "pointer",
    display: "flex", alignItems: "center", gap: 8,
    transition: "background .15s, color .15s",
  } satisfies React.CSSProperties,
  btnPrimary: {
    width: "100%", padding: "8px 12px", borderRadius: 8,
    border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.06)",
    color: "#f0f0ee", fontSize: 12, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    fontWeight: 600, transition: "background .15s",
  } satisfies React.CSSProperties,
  input: {
    width: "100%", padding: "8px 10px", borderRadius: 7,
    border: "1px solid #242424", background: "#0f0f0f",
    color: "#f0f0ee", fontSize: 12, outline: "none",
    fontFamily: "inherit", boxSizing: "border-box" as const,
    transition: "border-color .15s",
  } satisfies React.CSSProperties,
  label: {
    fontSize: 10, color: "#444", letterSpacing: "0.1em",
    textTransform: "uppercase" as const, marginBottom: 5, display: "block",
    fontWeight: 600,
  } satisfies React.CSSProperties,
}

interface OrbState {
  listenerState: "passive" | "active" | "saving" | "error"
  capturedText: string
  interimText: string
  result: VoiceResult | null
  error: string | null
  lastError: string | null
  debugLog: string[]
  isAuthed: boolean
  session: Session | null
  triggerWord: string | null
  savedKey: string | null
  teams: { id: string; name: string; isPersonal: boolean }[]
  selectedTeamId: string | null
}

const DEFAULT_STATE: OrbState = {
  listenerState: "passive",
  capturedText: "", interimText: "",
  result: null, error: null, lastError: null,
  debugLog: [], isAuthed: false, session: null,
  triggerWord: null, savedKey: null,
  teams: [], selectedTeamId: null,
}

export function PanelWindow() {
  const [state, setState] = useState<OrbState>(DEFAULT_STATE)
  const [view, setView] = useState<"home" | "settings">("home")
  const [triggerInput, setTriggerInput] = useState("")
  const [openaiKey, setOpenaiKey] = useState("")
  const bcRef = useRef<BroadcastChannel | null>(null)

  const send = (msg: Record<string, unknown>) => bcRef.current?.postMessage(msg)

  useEffect(() => {
    const bc = new BroadcastChannel("mem-orb")
    bcRef.current = bc

    bc.onmessage = (e) => {
      if (e.data.type === "state") {
        setState({ ...e.data })
      }
    }

    // Ask orb for current state
    bc.postMessage({ type: "requestState" })

    return () => bc.close()
  }, [])

  function close() {
    send({ type: "panelClosed" })
  }

  const { listenerState, capturedText, interimText, result, error, lastError,
    debugLog, isAuthed, session, triggerWord, savedKey, teams, selectedTeamId } = state

  const setupMissing = !isAuthed || !triggerWord || !savedKey
  const isRunning    = listenerState !== "error"

  const dotColor = listenerState === "active"
    ? "rgba(255,255,255,0.85)"
    : listenerState === "passive"
      ? "rgba(255,255,255,0.3)"
      : "rgba(255,255,255,0.1)"

  return (
    <div style={{
      width: "100%", height: "100%",
      background: "#111",
      display: "flex", flexDirection: "column",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
      userSelect: "none",
      overflow: "hidden",
    }}
      onContextMenu={() => electronAPI().window.contextMenu()}
    >
      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center",
        padding: "10px 12px", gap: 8,
        borderBottom: "1px solid #1a1a1a",
        flexShrink: 0,
      }}>
        {view === "settings" ? (
          <button
            onClick={() => setView("home")}
            style={{ background: "none", border: "none", color: "#444", cursor: "pointer", padding: 0, display: "flex" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#888")}
            onMouseLeave={e => (e.currentTarget.style.color = "#444")}
          >
            <ArrowLeft size={14} />
          </button>
        ) : (
          /* Mini logo icon */
          <div style={{ position: "relative", width: 14, height: 14, flexShrink: 0 }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1px solid ${dotColor}`, transition: "border-color .3s" }} />
            <div style={{ position: "absolute", inset: 3, borderRadius: "50%", border: `1px solid ${dotColor}`, opacity: 0.7, transition: "border-color .3s" }} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 3, height: 3, borderRadius: "50%", background: dotColor }} />
            </div>
          </div>
        )}

        <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "#d0d0ce", letterSpacing: "0.01em" }}>
          {view === "settings" ? "Configurações" : "Memories"}
        </span>

        {view === "home" && (
          <button
            onClick={() => setView("settings")}
            style={{ background: "none", border: "none", color: "#333", cursor: "pointer", padding: 4, display: "flex" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#666")}
            onMouseLeave={e => (e.currentTarget.style.color = "#333")}
          >
            <Settings size={12} />
          </button>
        )}
        <button
          onClick={close}
          style={{ background: "none", border: "none", color: "#2a2a2a", cursor: "pointer", padding: 4, display: "flex" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#555")}
          onMouseLeave={e => (e.currentTarget.style.color = "#2a2a2a")}
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflowY: "auto" }}>

        {/* HOME */}
        {view === "home" && (
          <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: 8 }}>

            {setupMissing && (
              <div style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.06)", background: "#161616" }}>
                <p style={{ fontSize: 11, color: "#888", marginBottom: 6, fontWeight: 600 }}>Configure para ativar</p>
                {!isAuthed    && <p style={{ fontSize: 10, color: "#444", marginBottom: 2 }}>· Conectar conta</p>}
                {!savedKey    && <p style={{ fontSize: 10, color: "#444", marginBottom: 2 }}>· Chave OpenAI</p>}
                {!triggerWord && <p style={{ fontSize: 10, color: "#444", marginBottom: 2 }}>· Palavra-gatilho</p>}
                <button
                  onClick={() => setView("settings")}
                  style={{ ...S.btnPrimary, marginTop: 8, fontSize: 11 }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.1)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,.06)")}
                >
                  Configurar agora
                </button>
              </div>
            )}

            {!setupMissing && (
              <div style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #1e1e1e", background: "#161616" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <Radio size={10} color={dotColor} />
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
                    color: listenerState === "active" ? "rgba(255,255,255,.8)"
                      : listenerState === "saving" ? "rgba(255,255,255,.5)"
                      : "rgba(255,255,255,.25)",
                  }}>
                    {listenerState === "saving" ? "SALVANDO..." : listenerState === "active" ? "CAPTURANDO" : "AGUARDANDO"}
                  </span>
                  {triggerWord && listenerState === "passive" && (
                    <span style={{ fontSize: 9, color: "#2e2e2e", marginLeft: "auto" }}>
                      gatilho: <span style={{ color: "#404040" }}>{triggerWord}</span>
                    </span>
                  )}
                </div>
                {listenerState === "active" && (capturedText || interimText) ? (
                  <p style={{ fontSize: 11, color: "#888", lineHeight: 1.6, maxHeight: 70, overflow: "hidden" }}>
                    {capturedText}
                    {interimText && <span style={{ color: "#444" }}> {interimText}</span>}
                  </p>
                ) : (
                  <p style={{ fontSize: 11, color: "#2e2e2e" }}>
                    {listenerState === "passive" && triggerWord
                      ? `"${triggerWord}, [seu comando]"`
                      : listenerState === "saving" ? "Processando..." : "···"}
                  </p>
                )}
              </div>
            )}

            {(error || lastError) && (
              <p style={{ fontSize: 11, color: "#888", padding: "8px 10px", borderRadius: 8, background: "#161616", border: "1px solid #2a2a2a" }}>
                {error || lastError}
              </p>
            )}

            {result && (
              <div style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.08)", background: "#161616" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#888", marginBottom: 4 }}>
                  <CheckCircle2 size={12} />
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em" }}>SALVO</span>
                </div>
                <p style={{ fontSize: 12, color: "#d0d0ce", fontWeight: 500 }}>{result.title}</p>
                <p style={{ fontSize: 10, color: "#444", marginTop: 2 }}>
                  em <span style={{ color: "#666" }}>{result.projectName}</span>
                </p>
                <button
                  onClick={() => electronAPI().openWeb(`/memories/${result!.projectId}`)}
                  style={{ ...S.btn, marginTop: 8, fontSize: 10, padding: "5px 8px" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#222")}
                  onMouseLeave={e => (e.currentTarget.style.background = "#1a1a1a")}
                >
                  <ExternalLink size={10} /> Ver no painel
                </button>
              </div>
            )}

            {!setupMissing && (
              <button
                onClick={() => send({ type: isRunning ? "stopListening" : "startListening" })}
                style={{ ...S.btn, justifyContent: "center" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#222"; e.currentTarget.style.color = "#d0d0ce" }}
                onMouseLeave={e => { e.currentTarget.style.background = "#1a1a1a"; e.currentTarget.style.color = "#aaa" }}
              >
                <Mic size={12} />
                {isRunning ? "Pausar escuta" : "Retomar escuta"}
              </button>
            )}

            <button
              onClick={() => electronAPI().openWeb("/memories")}
              style={{ ...S.btn, fontSize: 11, color: "#333" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#1e1e1e"; e.currentTarget.style.color = "#666" }}
              onMouseLeave={e => { e.currentTarget.style.background = "#1a1a1a"; e.currentTarget.style.color = "#333" }}
            >
              <ExternalLink size={11} /> Abrir painel web
            </button>

            {debugLog.length > 0 && (
              <div style={{ padding: "8px 10px", borderRadius: 8, background: "#0d0d0d", border: "1px solid #1a1a1a" }}>
                {debugLog.map((line, i) => (
                  <p key={i} style={{ fontSize: 9, color: "#2e2e2e", fontFamily: "monospace", margin: "1px 0", lineHeight: 1.5 }}>
                    {line}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SETTINGS */}
        {view === "settings" && (
          <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: 14 }}>

            <div>
              <span style={S.label}>Palavra-gatilho</span>
              <p style={{ fontSize: 10, color: "#333", lineHeight: 1.6, marginBottom: 6 }}>
                Diga seguida do comando para salvar.
                {triggerWord && <><br /><span style={{ color: "#444" }}>Ex: "{triggerWord}, hoje corrigi o bug de login"</span></>}
              </p>
              <input
                style={S.input}
                placeholder={triggerWord ?? "Ex: Jarvis, Hey, Salvar..."}
                value={triggerInput}
                onChange={e => setTriggerInput(e.target.value)}
                onFocus={e => (e.target.style.borderColor = "rgba(255,255,255,.2)")}
                onBlur={e => (e.target.style.borderColor = "#242424")}
              />
              <button
                onClick={() => { send({ type: "saveTriggerWord", word: triggerInput }); setTriggerInput("") }}
                style={{ ...S.btnPrimary, marginTop: 6, fontSize: 11 }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.1)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,.06)")}
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
                onFocus={e => (e.target.style.borderColor = "rgba(255,255,255,.2)")}
                onBlur={e => (e.target.style.borderColor = "#242424")}
              />
              <button
                onClick={() => { send({ type: "saveApiKey", key: openaiKey }); setOpenaiKey("") }}
                style={{ ...S.btnPrimary, marginTop: 6, fontSize: 11 }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.1)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,.06)")}
              >
                <Key size={11} /> Salvar chave
              </button>
            </div>

            {isAuthed && teams.length > 0 && (
              <div>
                <span style={S.label}>Time destino</span>
                <select
                  value={selectedTeamId ?? ""}
                  onChange={e => send({ type: "selectTeam", teamId: e.target.value })}
                  style={{ ...S.input, cursor: "pointer" }}
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}{t.isPersonal ? " (pessoal)" : ""}</option>
                  ))}
                </select>
                <p style={{ fontSize: 10, color: "#2e2e2e", marginTop: 4 }}>Memórias salvas neste time por voz</p>
              </div>
            )}

            <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: 12 }}>
              {isAuthed ? (
                <>
                  <p style={{ fontSize: 11, color: "#555", marginBottom: 8 }}>
                    {(session as Session).user.name}
                    <span style={{ color: "#333", fontSize: 10 }}> · {(session as Session).user.email}</span>
                  </p>
                  <button
                    onClick={() => send({ type: "signOut" })}
                    style={{ ...S.btn, fontSize: 11 }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#1e1e1e"; e.currentTarget.style.color = "#d0d0ce" }}
                    onMouseLeave={e => { e.currentTarget.style.background = "#1a1a1a"; e.currentTarget.style.color = "#aaa" }}
                  >
                    <LogOut size={12} /> Sair da conta
                  </button>
                </>
              ) : (
                <button
                  onClick={() => electronAPI().window.openLogin()}
                  style={{ ...S.btnPrimary, fontSize: 11 }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.1)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,.06)")}
                >
                  <LogIn size={12} /> Conectar conta
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
