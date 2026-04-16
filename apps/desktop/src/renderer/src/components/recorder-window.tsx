import { useState, useEffect, useCallback, useRef } from "react"
import { Settings, ArrowLeft, Key, CheckCircle2, ChevronDown, ExternalLink, LogOut, Mic } from "lucide-react"
import { useContinuousListener } from "@/hooks/use-voice-recorder"
import { electronAPI } from "@/lib/electron"
import type { Session, ChatMessage } from "@/lib/api"

const ORB_W  = 180
const ORB_H  = 50
const PANEL_W = 320
const PANEL_H = 440


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
    textTransform: "uppercase" as const, marginBottom: 5, display: "block", fontWeight: 600,
  } satisfies React.CSSProperties,
}

/* ─── Logo icon (concentric circles) ──────── */
function LogoIcon({ size, listenerState, isSpeaking }: { size: number; listenerState: "passive" | "active" | "saving" | "error"; isSpeaking?: boolean }) {
  const isActive = listenerState === "active"
  const isSaving = listenerState === "saving"
  const isError  = listenerState === "error"

  const GREEN = "74, 222, 128"
  const pulseDur    = isActive ? 1.3 : 2.6
  const ringColor   = isError
    ? "rgba(255,255,255,0.08)"
    : isSpeaking
      ? `rgba(${GREEN},0.65)`
      : isActive
        ? "rgba(255,255,255,0.6)"
        : "rgba(255,255,255,0.22)"
  const dotColor    = isError
    ? "rgba(255,255,255,0.06)"
    : isSpeaking
      ? `rgba(${GREEN},0.95)`
      : isActive
        ? "rgba(255,255,255,1)"
        : "rgba(255,255,255,0.55)"
  const staticAlpha = isError ? 0.04 : isActive ? 0.22 : 0.09
  const staticColor = isSpeaking ? `rgba(${GREEN},` : "rgba(255,255,255,"

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {!isSaving ? (
        <>
          {[0, 1, 2].map((i) => (
            <div key={i} className="sonar-ring" style={{
              position: "absolute",
              inset: 0, borderRadius: "50%",
              border: `1px solid ${ringColor}`,
              animationDuration: `${pulseDur}s`,
              animationDelay: `${(i * pulseDur) / 3}s`,
            }} />
          ))}
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            border: `1px solid ${staticColor}${staticAlpha})`,
          }} />
          <div style={{
            position: "absolute",
            inset: Math.round(size * 0.18), borderRadius: "50%",
            border: `1px solid ${staticColor}${staticAlpha + 0.06})`,
          }} />
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div className={isActive ? "dot-pulse" : ""} style={{
              width: size * 0.22, height: size * 0.22, borderRadius: "50%",
              background: dotColor,
            }} />
          </div>
        </>
      ) : (
        <>
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            border: `1px solid rgba(255,255,255,${staticAlpha})`,
          }} />
          <div style={{
            position: "absolute", inset: Math.round(size * 0.18), borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.06)",
            borderTopColor: "rgba(255,255,255,0.5)",
          }} className="ring-spin" />
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{ width: size * 0.22, height: size * 0.22, borderRadius: "50%", background: "rgba(255,255,255,0.3)" }} />
          </div>
        </>
      )}
    </div>
  )
}

type MemoryHit = { title: string; projectName: string; date: string; snippet?: string; reportId?: string }
type AppMessage = ChatMessage & { action?: string; memories?: MemoryHit[] }

/* ─── Chat bubble ─── */
function Bubble({ msg }: { msg: AppMessage }) {
  const isUser = msg.role === "user"
  return (
    <div style={{
      display: "flex",
      flexDirection: isUser ? "row-reverse" : "row",
      gap: 6, marginBottom: 8, alignItems: "flex-start",
    }}>
      {!isUser && (
        <div style={{
          width: 18, height: 18, borderRadius: "50%", flexShrink: 0, marginTop: 1,
          border: "1px solid rgba(255,255,255,0.12)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(255,255,255,0.4)" }} />
        </div>
      )}
      <div style={{ maxWidth: "88%", display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{
          padding: "7px 10px",
          borderRadius: isUser ? "10px 10px 3px 10px" : "10px 10px 10px 3px",
          background: isUser ? "rgba(255,255,255,0.06)" : "#161616",
          border: isUser ? "1px solid rgba(255,255,255,0.08)" : "1px solid #1e1e1e",
          fontSize: 12, color: isUser ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.82)",
          lineHeight: 1.55,
        }}>
          {msg.content}
          {msg.action === "create" && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 5, color: "rgba(255,255,255,0.25)", fontSize: 10 }}>
              <CheckCircle2 size={9} />
              <span>salvo</span>
            </div>
          )}
        </div>
        {/* Memory cards when search returns results */}
        {msg.memories && msg.memories.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingLeft: 2 }}>
            {msg.memories.map((m, i) => (
              <div key={i} style={{
                padding: "6px 9px", borderRadius: 7,
                background: "#131313", border: "1px solid #1e1e1e",
                fontSize: 11,
              }}>
                <div style={{ color: "rgba(255,255,255,0.7)", fontWeight: 500, marginBottom: 1 }}>{m.title}</div>
                <div style={{ color: "#444", fontSize: 10 }}>
                  {m.projectName} · {m.date}
                </div>
                {m.snippet && (
                  <div style={{ color: "#333", fontSize: 10, marginTop: 3, lineHeight: 1.4 }}>
                    {m.snippet.slice(0, 120)}{m.snippet.length > 120 ? "…" : ""}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Main ─────────────────────────────────── */
export function RecorderWindow() {
  const [session, setSession]               = useState<Session | null | "loading">("loading")
  const [openaiKey, setOpenaiKey]           = useState("")
  const [savedKey, setSavedKey]             = useState<string | null>(null)
  const [triggerWord, setTriggerWord]       = useState<string | null>(null)
  const [triggerInput, setTriggerInput]     = useState("")
  const [error, setError]                   = useState<string | null>(null)
  const [panelOpen, setPanelOpen]           = useState(false)
  const [view, setView]                     = useState<"home" | "settings">("home")
  const [teams, setTeams]                   = useState<{ id: string; name: string; isPersonal: boolean }[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [isSpeaking, setIsSpeaking]         = useState(false)
  const [isRecording, setIsRecording]       = useState(false)
  const [currentRecName, setCurrentRecName] = useState<string | null>(null)
  const [messages, setMessages]             = useState<AppMessage[]>([])
  const [pcName, setPcName]                 = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [codeInput, setCodeInput]           = useState("")
  const [activeStep, setActiveStep]         = useState<"account" | "apikey" | null>(null)
  const [wantsTrigger, setWantsTrigger]     = useState(false)
  const messagesRef = useRef<AppMessage[]>([])
  const chatEndRef  = useRef<HTMLDivElement>(null)
  const panelOpenRef = useRef(false)
  const hasGreetedRef = useRef(false)
  // Persistent AudioContext at 24kHz — same rate as the recording context,
  // so both share the same WASAPI device stream on Windows without conflict
  const outputCtxRef = useRef<AudioContext | null>(null)
  const isAuthed = session !== null && session !== "loading"

  useEffect(() => {
    outputCtxRef.current = new AudioContext({ sampleRate: 24000 })
    return () => { outputCtxRef.current?.close(); outputCtxRef.current = null }
  }, [])

  const speak = useCallback(async (text: string) => {
    if (!savedKeyRef.current || !text) return
    setIsSpeaking(true)
    try {
      // TTS returns raw PCM base64 (24kHz, 16-bit, mono)
      const base64 = await electronAPI().tts(text, savedKeyRef.current)

      // Decode base64 → PCM16 Int16Array → Float32Array
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const int16 = new Int16Array(bytes.buffer)
      const float32 = new Float32Array(int16.length)
      for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768

      // Resume context if suspended (browser autoplay policy)
      const ctx = outputCtxRef.current!
      if (ctx.state === "suspended") await ctx.resume()

      // Play through AudioContext — no WASAPI conflict because same 24kHz stream
      const audioBuffer = ctx.createBuffer(1, float32.length, 24000)
      audioBuffer.copyToChannel(float32, 0)
      const source = ctx.createBufferSource()
      source.buffer = audioBuffer
      source.connect(ctx.destination)
      source.onended = () => setIsSpeaking(false)
      source.start()
    } catch (e) {
      setIsSpeaking(false)
      console.warn("TTS failed:", e)
    }
  }, []) // outputCtxRef and savedKeyRef are always current via refs

  function addMessage(msg: AppMessage) {
    messagesRef.current = [...messagesRef.current, msg]
    setMessages([...messagesRef.current])
  }

  function buildGreeting(overrides?: { authed?: boolean; hasKey?: boolean }): string {
    const name    = pcNameRef.current
    const authed  = overrides?.authed  ?? (sessionRef.current !== null && sessionRef.current !== "loading")
    const hasKey  = overrides?.hasKey  ?? Boolean(savedKeyRef.current)
    const hi      = name ? `Olá ${name}!` : "Olá!"

    if (!authed && !hasKey) return `${hi} Para começar, conecte sua conta e adicione sua chave OpenAI nas configurações.`
    if (!authed)            return `${hi} Para continuar, conecte sua conta nas configurações.`
    if (!hasKey)            return `${hi} Adicione sua chave OpenAI nas configurações para ativar a IA.`
    return `${hi} Posso salvar suas memórias de trabalho, buscar o que você registrou, abrir programas, navegar na web e automatizar tarefas com gravação de cliques. Como posso te ajudar?`
  }

  async function openPanel() {
    if (panelOpenRef.current) return
    panelOpenRef.current = true
    setPanelOpen(true)
    await electronAPI().window.setSize(PANEL_W, PANEL_H + ORB_H)
    if (!hasGreetedRef.current && savedKeyRef.current) {
      hasGreetedRef.current = true
      speak(buildGreeting()).catch(() => {})
    }
  }

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const savedKeyRef = useRef(savedKey)
  useEffect(() => { savedKeyRef.current = savedKey }, [savedKey])
  const pcNameRef = useRef(pcName)
  useEffect(() => { pcNameRef.current = pcName }, [pcName])
  const sessionRef = useRef(session)
  useEffect(() => { sessionRef.current = session }, [session])
  const currentRecNameRef = useRef(currentRecName)
  useEffect(() => { currentRecNameRef.current = currentRecName }, [currentRecName])

  const handleCommand = useCallback(async (command: string) => {
    setError(null)
    addMessage({ role: "user", content: command })
    // Open panel so user can read the response
    openPanel().catch(() => {})
    try {
      const history = messagesRef.current.slice(-10).map(m => ({ role: m.role, content: m.content }))
      const res = await electronAPI().processChat(command, history, savedKeyRef.current)
      const memories = res.action === "search" && res.data?.memories?.length
        ? (res.data.memories as MemoryHit[])
        : undefined
      addMessage({ role: "assistant", content: res.reply, action: res.action, memories })
      speak(res.reply).catch(() => {})
      if (res.screenshotAction && savedKeyRef.current) {
        const desc = await electronAPI().screenshot.analyze(savedKeyRef.current, res.screenshotPrompt ?? undefined)
        addMessage({ role: "assistant", content: desc })
        speak(desc).catch(() => {})
      }
      if (res.openUrl)     electronAPI().openWeb(res.openUrl).catch(() => {})
      if (res.openAppName) electronAPI().openApp(res.openAppName).catch(() => {})
      if (res.mouseAction) {
        const { type, x, y, scrollAmount } = res.mouseAction
        electronAPI().mouseAction(type, x, y, scrollAmount).catch(() => {})
      }
      // Recording actions
      if (res.recordingAction === "start" && res.recordingName) {
        setIsRecording(true)
        setCurrentRecName(res.recordingName)
        electronAPI().recording.start(res.recordingName).catch(() => {})
      } else if (res.recordingAction === "stop" && currentRecNameRef.current) {
        setIsRecording(false)
        electronAPI().recording.stop(currentRecNameRef.current).catch(() => {})
        setCurrentRecName(null)
      } else if (res.recordingAction === "replay" && res.recordingName) {
        electronAPI().recording.replay(res.recordingName).catch(() => {})
      }
    } catch (e: unknown) {
      const msg = (e as { message?: string }).message ?? "Erro ao processar"
      setError(msg)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const { listenerState, interimText, capturedText, lastError, debugLog, inConversationWindow, startListening, stopListening } =
    useContinuousListener(triggerWord, savedKey, handleCommand)

  const loadSession = useCallback(async () => {
    const data = await electronAPI().checkSession()
    setSession(data ? { user: data.user } : null)
  }, [])

  useEffect(() => {
    electronAPI().getUsername().then(setPcName).catch(() => {})
    Promise.all([
      loadSession(),
      Promise.all([
        window.electron.store.get("openaiApiKey"),
        window.electron.store.get("triggerWord"),
        window.electron.store.get("selectedTeamId"),
      ]).then(([key, word, teamId]) => {
        if (key) setSavedKey(key)
        if (word) setTriggerWord(word)
        if (teamId) setSelectedTeamId(teamId)
      }),
    ]).finally(() => setIsInitializing(false))
    return electronAPI().onAuthChanged(loadSession)
  }, [loadSession])

  // Auto-speak greeting once when app is ready (no need to open panel)
  useEffect(() => {
    if (isInitializing) return
    if (hasGreetedRef.current) return
    if (!savedKeyRef.current) return
    hasGreetedRef.current = true
    speak(buildGreeting()).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitializing])

  useEffect(() => {
    if (!isAuthed) return
    electronAPI().listTeams().then((data) => {
      if (!data?.length) return
      setTeams(data)
      setSelectedTeamId((prev) => {
        if (prev) return prev
        const personal = data.find((t: { isPersonal: boolean }) => t.isPersonal) ?? data[0]
        window.electron.store.set("selectedTeamId", personal.id)
        return personal.id
      })
    }).catch(() => {})
  }, [isAuthed])

  useEffect(() => {
    if (isAuthed && savedKey) startListening()
  }, [isAuthed, savedKey, startListening])

  async function togglePanel() {
    if (panelOpen) {
      panelOpenRef.current = false
      setPanelOpen(false); setView("home")
      await electronAPI().window.setSize(ORB_W, ORB_H)
    } else {
      panelOpenRef.current = true
      setPanelOpen(true)
      await electronAPI().window.setSize(PANEL_W, PANEL_H + ORB_H)
      if (!hasGreetedRef.current && savedKeyRef.current) {
        hasGreetedRef.current = true
        speak(buildGreeting()).catch(() => {})
      }
    }
  }

  async function saveTriggerWord() {
    const word = triggerInput.trim() || null
    await window.electron.store.set("triggerWord", word)
    setTriggerWord(word)
    setTriggerInput("")
    setWantsTrigger(false)
    if (isAuthed && savedKey) startListening()
  }

  async function saveApiKey() {
    const key = openaiKey.trim() || null
    await window.electron.store.set("openaiApiKey", key)
    setSavedKey(key); setOpenaiKey("")
  }

  async function handleActivateCode() {
    const code = codeInput.trim()
    if (!code) return
    try {
      const { token, userId } = await electronAPI().exchangeCode(code)
      await Promise.all([
        window.electron.store.set("token", token),
        window.electron.store.set("userId", userId),
      ])
      setCodeInput("")
      setActiveStep(null)
      await loadSession()
      hasGreetedRef.current = true
      speak(buildGreeting({ authed: true })).catch(() => {})
    } catch {
      setError("Código inválido ou expirado")
    }
  }

  async function handleSaveApiKeyStep() {
    const key = openaiKey.trim()
    if (!key) return
    await window.electron.store.set("openaiApiKey", key)
    setSavedKey(key)
    setOpenaiKey("")
    setActiveStep(null)
    hasGreetedRef.current = true
    speak(buildGreeting({ hasKey: true })).catch(() => {})
  }

  const setupMissing = !isAuthed || !savedKey
  const isRunning    = listenerState !== "error"

  // When AI is speaking, treat orb as "active" so it pulses
  const orbState = isSpeaking ? "active" : listenerState

  const dotColor = orbState === "active"
    ? "rgba(255,255,255,0.85)"
    : orbState === "passive"
      ? "rgba(255,255,255,0.3)"
      : "rgba(255,255,255,0.1)"

  return (
    <div
      style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#0f0f0f" }}
      onContextMenu={() => electronAPI().window.contextMenu()}
    >
      {/* ── Panel ── */}
      {panelOpen && (
        <div className="panel-enter" style={{
          flex: 1,
          background: "#111",
          border: "1px solid rgba(255,255,255,0.12)",
          borderBottom: "none",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", padding: "10px 12px", gap: 8, borderBottom: "1px solid #1a1a1a", flexShrink: 0 }}>
            {view === "settings" ? (
              <button onClick={() => setView("home")} style={{ background: "none", border: "none", color: "#444", cursor: "pointer", padding: 0, display: "flex" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#888")}
                onMouseLeave={e => (e.currentTarget.style.color = "#444")}
              >
                <ArrowLeft size={14} />
              </button>
            ) : (
              <div style={{ position: "relative", width: 14, height: 14, flexShrink: 0 }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1px solid ${dotColor}`, transition: "border-color .3s" }} />
                <div style={{ position: "absolute", inset: 3, borderRadius: "50%", border: `1px solid ${dotColor}`, opacity: 0.7 }} />
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 3, height: 3, borderRadius: "50%", background: dotColor }} />
                </div>
              </div>
            )}
            <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "#d0d0ce", letterSpacing: "0.01em" }}>
              {view === "settings" ? "Configurações" : "Memories"}
            </span>
            {view === "home" && isAuthed && (
              <button onClick={() => setView("settings")} style={{ background: "none", border: "none", color: "#333", cursor: "pointer", padding: 4, display: "flex" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#666")}
                onMouseLeave={e => (e.currentTarget.style.color = "#333")}
              >
                <Settings size={12} />
              </button>
            )}
            <button onClick={togglePanel} style={{ background: "none", border: "none", color: "#2a2a2a", cursor: "pointer", padding: 4, display: "flex" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#555")}
              onMouseLeave={e => (e.currentTarget.style.color = "#2a2a2a")}
            >
              <ChevronDown size={14} />
            </button>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

            {/* HOME — chat view */}
            {view === "home" && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>

                {/* nothing — onboarding is handled in messages area */}

                {/* Messages */}
                <div style={{ flex: 1, padding: "12px 12px 4px", overflowY: "auto" }}>
                  {/* Loading spinner while session+store are being fetched */}
                  {isInitializing && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 48, gap: 10 }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: "50%",
                        border: "1.5px solid rgba(255,255,255,0.08)",
                        borderTopColor: "rgba(255,255,255,0.35)",
                      }} className="ring-spin" />
                      <span style={{ fontSize: 10, color: "#333" }}>Carregando...</span>
                    </div>
                  )}

                  {/* Onboarding — step list */}
                  {!isInitializing && setupMissing && activeStep === null && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 8 }}>
                      <p style={{ fontSize: 10, color: "#333", marginBottom: 4 }}>Para começar, complete os passos:</p>
                      {[
                        { key: "account" as const, done: isAuthed,   num: "1", label: "Conectar conta", hint: "Faça login pelo navegador" },
                        ...(isAuthed ? [{ key: "apikey" as const, done: !!savedKey, num: "2", label: "Chave OpenAI", hint: "Necessária para a IA funcionar" }] : []),
                      ].map((step) => (
                        <button
                          key={step.key}
                          onClick={() => {
                            if (step.done) return
                            if (step.key === "account") electronAPI().window.openLogin()
                            setActiveStep(step.key)
                          }}
                          style={{
                            padding: "10px 12px", borderRadius: 10,
                            background: step.done ? "rgba(74,222,128,0.04)" : "#141414",
                            border: `1px solid ${step.done ? "rgba(74,222,128,0.15)" : "#242424"}`,
                            display: "flex", alignItems: "center", gap: 10,
                            cursor: step.done ? "default" : "pointer",
                            width: "100%", textAlign: "left",
                            transition: "border-color .15s, background .15s",
                          }}
                          onMouseEnter={e => { if (!step.done) e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)" }}
                          onMouseLeave={e => { if (!step.done) e.currentTarget.style.borderColor = "#242424" }}
                        >
                          <div style={{
                            width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                            background: step.done ? "rgba(74,222,128,0.15)" : "#1e1e1e",
                            border: `1px solid ${step.done ? "rgba(74,222,128,0.4)" : "#333"}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 10, color: step.done ? "rgba(74,222,128,0.9)" : "#555", fontWeight: 700,
                          }}>
                            {step.done ? "✓" : step.num}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, color: step.done ? "rgba(74,222,128,0.7)" : "#ccc", fontWeight: 600 }}>{step.label}</div>
                            <div style={{ fontSize: 10, color: "#333", marginTop: 1 }}>{step.hint}</div>
                          </div>
                          {!step.done && <div style={{ fontSize: 14, color: "#333" }}>›</div>}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Onboarding — focused: account code */}
                  {!isInitializing && setupMissing && activeStep === "account" && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 12, paddingTop: 24 }}>
                      <div style={{ fontSize: 28 }}>🔑</div>
                      <p style={{ fontSize: 11, color: "#888", textAlign: "center", lineHeight: 1.6, maxWidth: 220 }}>
                        O navegador abriu. Faça login e cole o código aqui:
                      </p>
                      <input
                        autoFocus
                        style={{ ...S.input, textAlign: "center", letterSpacing: "0.05em" }}
                        placeholder="Cole o código..."
                        value={codeInput}
                        onChange={e => setCodeInput(e.target.value)}
                        onFocus={e => (e.target.style.borderColor = "rgba(255,255,255,.2)")}
                        onBlur={e => (e.target.style.borderColor = "#242424")}
                        onKeyDown={e => e.key === "Enter" && handleActivateCode()}
                      />
                      <button onClick={handleActivateCode} disabled={!codeInput.trim()}
                        style={{ ...S.btnPrimary, opacity: codeInput.trim() ? 1 : 0.35 }}
                        onMouseEnter={e => { if (codeInput.trim()) e.currentTarget.style.background = "rgba(255,255,255,.1)" }}
                        onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,.06)")}
                      ><Key size={12} /> Ativar</button>
                      {error && <p style={{ fontSize: 10, color: "rgba(248,113,113,0.7)" }}>{error}</p>}
                      <button onClick={() => { setActiveStep(null); setCodeInput(""); setError(null) }}
                        style={{ background: "none", border: "none", fontSize: 10, color: "#333", cursor: "pointer", marginTop: 4 }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#666")}
                        onMouseLeave={e => (e.currentTarget.style.color = "#333")}
                      >← Voltar</button>
                    </div>
                  )}

                  {/* Onboarding — focused: API key */}
                  {!isInitializing && setupMissing && activeStep === "apikey" && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 12, paddingTop: 24 }}>
                      <div style={{ fontSize: 28 }}>🤖</div>
                      <p style={{ fontSize: 11, color: "#888", textAlign: "center", lineHeight: 1.6, maxWidth: 220 }}>
                        Cole sua chave OpenAI para ativar a inteligência artificial:
                      </p>
                      <input
                        autoFocus type="password"
                        style={{ ...S.input, fontFamily: "monospace" }}
                        placeholder="sk-..."
                        value={openaiKey}
                        onChange={e => setOpenaiKey(e.target.value)}
                        onFocus={e => (e.target.style.borderColor = "rgba(255,255,255,.2)")}
                        onBlur={e => (e.target.style.borderColor = "#242424")}
                        onKeyDown={e => e.key === "Enter" && handleSaveApiKeyStep()}
                      />
                      <button onClick={handleSaveApiKeyStep} disabled={!openaiKey.trim()}
                        style={{ ...S.btnPrimary, opacity: openaiKey.trim() ? 1 : 0.35 }}
                        onMouseEnter={e => { if (openaiKey.trim()) e.currentTarget.style.background = "rgba(255,255,255,.1)" }}
                        onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,.06)")}
                      ><Key size={12} /> Salvar chave</button>
                      <button onClick={() => { setActiveStep(null); setOpenaiKey("") }}
                        style={{ background: "none", border: "none", fontSize: 10, color: "#333", cursor: "pointer", marginTop: 4 }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#666")}
                        onMouseLeave={e => (e.currentTarget.style.color = "#333")}
                      >← Voltar</button>
                    </div>
                  )}

                  {/* Welcome screen — shown when ready, no messages, setup complete */}
                  {!isInitializing && messages.length === 0 && !setupMissing && (
                    <div style={{ paddingTop: 16 }}>
                      <p style={{ fontSize: 11, color: "#3a3a3a", marginBottom: 10, textAlign: "center" }}>
                        {triggerWord
                          ? <>Diga <span style={{ color: "#555", fontStyle: "italic" }}>"{triggerWord}"</span> para começar</>
                          : "Fale algo para começar"
                        }
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {[
                          { icon: "🧠", label: "Salvar memória", example: "Lembra que resolvi o bug do login hoje" },
                          { icon: "🔍", label: "Buscar memórias", example: "O que fizemos semana passada no projeto?" },
                          { icon: "🖥️", label: "Abrir programas", example: "Abre o VS Code pra mim" },
                          { icon: "🌐", label: "Navegar na web", example: "Vai para github.com" },
                          { icon: "🤖", label: "Automatizar tarefas", example: "Grava essa sequência de cliques" },
                        ].map((cap) => (
                          <div key={cap.label} style={{
                            padding: "7px 10px", borderRadius: 8,
                            background: "#141414", border: "1px solid #1e1e1e",
                            display: "flex", alignItems: "center", gap: 8,
                          }}>
                            <span style={{ fontSize: 13 }}>{cap.icon}</span>
                            <div>
                              <div style={{ fontSize: 10, color: "#555", fontWeight: 600, marginBottom: 1 }}>{cap.label}</div>
                              <div style={{ fontSize: 9, color: "#2e2e2e", fontStyle: "italic" }}>"{cap.example}"</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((msg, i) => (
                    <Bubble key={i} msg={msg} />
                  ))}

                  {/* Interim text (user is speaking) */}
                  {(listenerState === "active" || listenerState === "saving") && (capturedText || interimText) && (
                    <div style={{ display: "flex", flexDirection: "row-reverse", gap: 6, marginBottom: 8 }}>
                      <div style={{
                        maxWidth: "82%", padding: "7px 10px",
                        borderRadius: "10px 10px 3px 10px",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.05)",
                        fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.55,
                      }}>
                        {capturedText}
                        {interimText && <span style={{ color: "rgba(255,255,255,0.2)" }}> {interimText}</span>}
                        {listenerState === "saving" && <span className="blink" style={{ color: "rgba(255,255,255,0.2)" }}> ▪</span>}
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Status bar */}
                <div style={{
                  borderTop: "1px solid #1a1a1a",
                  padding: "6px 12px",
                  display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
                }}>
                  <div style={{
                    width: 5, height: 5, borderRadius: "50%",
                    background: isRecording
                      ? "rgba(248,113,113,0.85)"
                      : orbState === "active" ? "rgba(255,255,255,0.7)"
                      : orbState === "saving" ? "rgba(255,255,255,0.35)"
                      : orbState === "error" ? "rgba(255,255,255,0.1)"
                      : "rgba(255,255,255,0.15)",
                    transition: "background .3s",
                    flexShrink: 0,
                  }} className={isRecording ? "dot-pulse" : orbState === "active" ? "dot-pulse" : ""} />
                  <span style={{
                    fontSize: 9, letterSpacing: "0.08em", fontWeight: 600,
                    color: isRecording
                      ? "rgba(248,113,113,0.7)"
                      : orbState === "active" ? "rgba(255,255,255,0.4)"
                      : orbState === "saving" ? "rgba(255,255,255,0.25)"
                      : "rgba(255,255,255,0.12)",
                  }}>
                    {isRecording ? `GRAVANDO${currentRecName ? ` "${currentRecName}"` : ""}`
                      : isSpeaking ? "FALANDO"
                      : listenerState === "active" ? "OUVINDO"
                      : listenerState === "saving" ? "PROCESSANDO"
                      : listenerState === "error" ? "ERRO"
                      : inConversationWindow ? "PRONTA"
                      : triggerWord ? `AGUARDANDO "${triggerWord.toUpperCase()}"` : "PRONTA"}
                  </span>
                  {(error || lastError) && (
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", marginLeft: "auto", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {error || lastError}
                    </span>
                  )}
                  {!setupMissing && (
                    <button onClick={isRunning ? stopListening : startListening}
                      style={{ background: "none", border: "none", color: "#333", cursor: "pointer", padding: "2px 4px", marginLeft: "auto", display: "flex", alignItems: "center" }}
                      title={isRunning ? "Pausar" : "Retomar"}
                      onMouseEnter={e => (e.currentTarget.style.color = "#666")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#333")}
                    >
                      <Mic size={10} />
                    </button>
                  )}
                </div>

                {/* Debug log (compact, only if errors) */}
                {debugLog.length > 0 && listenerState === "error" && (
                  <div style={{ padding: "4px 12px 8px", borderTop: "1px solid #161616" }}>
                    {debugLog.slice(0, 3).map((line, i) => (
                      <p key={i} style={{ fontSize: 9, color: "#2a2a2a", fontFamily: "monospace", margin: "1px 0" }}>{line}</p>
                    ))}
                  </div>
                )}

                {/* Quick actions */}
                {!setupMissing && (
                  <div style={{ padding: "8px 12px", borderTop: "1px solid #161616" }}>
                    <button onClick={() => electronAPI().openWeb("/memories")}
                      style={{ ...S.btn, fontSize: 10, color: "#2e2e2e", padding: "6px 10px" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "#1e1e1e"; e.currentTarget.style.color = "#555" }}
                      onMouseLeave={e => { e.currentTarget.style.background = "#1a1a1a"; e.currentTarget.style.color = "#2e2e2e" }}
                    ><ExternalLink size={10} /> Abrir painel web</button>
                  </div>
                )}
              </div>
            )}

            {/* SETTINGS */}
            {view === "settings" && (
              <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <span style={S.label}>Modo de escuta</span>

                  {/* Always-on toggle */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <button
                      onClick={async () => {
                        const inTriggerMode = !!triggerWord || wantsTrigger
                        if (inTriggerMode) {
                          await window.electron.store.set("triggerWord", null)
                          setTriggerWord(null)
                          setWantsTrigger(false)
                          setTriggerInput("")
                          if (isAuthed && savedKey) startListening()
                        } else {
                          setWantsTrigger(true)
                        }
                      }}
                      style={{
                        position: "relative", width: 32, height: 18, borderRadius: 9,
                        background: (!triggerWord && !wantsTrigger) ? "rgba(255,255,255,0.25)" : "#1a1a1a",
                        border: "1px solid #333", cursor: "pointer", flexShrink: 0,
                        transition: "background .2s",
                      }}
                    >
                      <div style={{
                        position: "absolute", top: 2,
                        left: (!triggerWord && !wantsTrigger) ? 15 : 2,
                        width: 12, height: 12, borderRadius: "50%",
                        background: (!triggerWord && !wantsTrigger) ? "rgba(255,255,255,0.9)" : "#444",
                        transition: "left .2s, background .2s",
                      }} />
                    </button>
                    <span style={{ fontSize: 11, color: (!triggerWord && !wantsTrigger) ? "#aaa" : "#888" }}>
                      {(!triggerWord && !wantsTrigger) ? "Sempre ativa" : "Palavra-gatilho"}
                    </span>
                  </div>

                  {/* Trigger word input — shown when in trigger mode (with or without word saved) */}
                  {(triggerWord !== null || wantsTrigger) && (
                    <>
                      {triggerWord && (
                        <p style={{ fontSize: 10, color: "#333", marginBottom: 6 }}>
                          Gatilho atual: <span style={{ color: "#555" }}>"{triggerWord}"</span>
                        </p>
                      )}
                      <input
                        autoFocus={wantsTrigger && !triggerWord}
                        style={S.input}
                        placeholder={triggerWord ? "Alterar palavra-gatilho..." : "Ex: Jarvis, Hey, Memories..."}
                        value={triggerInput}
                        onChange={e => setTriggerInput(e.target.value)}
                        onFocus={e => (e.target.style.borderColor = "rgba(255,255,255,.2)")}
                        onBlur={e => (e.target.style.borderColor = "#242424")}
                        onKeyDown={e => e.key === "Enter" && saveTriggerWord()}
                      />
                      <button onClick={saveTriggerWord} style={{ ...S.btnPrimary, marginTop: 6, fontSize: 11 }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.1)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,.06)")}
                      ><Key size={11} /> Salvar</button>
                    </>
                  )}
                </div>

                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={S.label}>Chave OpenAI</span>
                    {savedKey && (
                      <span style={{ fontSize: 9, color: "rgba(74,222,128,0.7)", display: "flex", alignItems: "center", gap: 3, fontWeight: 600 }}>
                        <CheckCircle2 size={9} /> Ativa
                      </span>
                    )}
                  </div>
                  <input style={{ ...S.input, fontFamily: "monospace" }} type="password"
                    placeholder={savedKey ? "Nova chave para substituir..." : "sk-..."}
                    value={openaiKey} onChange={e => setOpenaiKey(e.target.value)}
                    onFocus={e => (e.target.style.borderColor = "rgba(255,255,255,.2)")}
                    onBlur={e => (e.target.style.borderColor = "#242424")}
                  />
                  <button onClick={saveApiKey} style={{ ...S.btnPrimary, marginTop: 6, fontSize: 11 }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.1)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,.06)")}
                  ><Key size={11} /> {savedKey ? "Atualizar chave" : "Salvar chave"}</button>
                </div>

                {teams.length > 0 && (
                  <div>
                    <span style={S.label}>Time destino</span>
                    <select value={selectedTeamId ?? ""}
                      onChange={async e => { setSelectedTeamId(e.target.value); await window.electron.store.set("selectedTeamId", e.target.value) }}
                      style={{ ...S.input, cursor: "pointer" }}
                    >
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name}{t.isPersonal ? " (pessoal)" : ""}</option>)}
                    </select>
                  </div>
                )}

                {/* Account info + sign out */}
                <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: 10, marginTop: 4 }}>
                  <p style={{ fontSize: 10, color: "#444", marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {(session as Session).user.name} · <span style={{ color: "#333" }}>{(session as Session).user.email}</span>
                  </p>
                  <button onClick={async () => {
                    stopListening()
                    await Promise.all([window.electron.store.set("token", null), window.electron.store.set("userId", null)])
                    setSession(null)
                    setView("home")
                    setActiveStep(null)
                    messagesRef.current = []
                    setMessages([])
                    hasGreetedRef.current = false
                  }} style={{ ...S.btn, fontSize: 11 }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#1e1e1e"; e.currentTarget.style.color = "#d0d0ce" }}
                    onMouseLeave={e => { e.currentTarget.style.background = "#1a1a1a"; e.currentTarget.style.color = "#aaa" }}
                  ><LogOut size={12} /> Sair da conta</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Pill bar ── */}
      <button
        onClick={togglePanel}
        onContextMenu={(e) => { e.preventDefault(); electronAPI().window.contextMenu() }}
        style={{
          height: ORB_H, flexShrink: 0, width: "100%",
          display: "flex", alignItems: "center", gap: 10,
          paddingLeft: 14, paddingRight: 16,
          background: orbState === "active" ? "#141414" : "#0f0f0f",
          border: "none", cursor: "pointer",
          transition: "background .3s",
          // @ts-ignore
          WebkitAppRegion: "drag",
        }}
        className={isSpeaking ? "pill-speaking" : orbState === "active" ? "pill-active" : ""}
        onMouseEnter={e => (e.currentTarget.style.background = "#161616")}
        onMouseLeave={e => (e.currentTarget.style.background = orbState === "active" ? "#141414" : "#0f0f0f")}
      >
        <LogoIcon size={26} listenerState={orbState} isSpeaking={isSpeaking} />

        {/* @ts-ignore */}
        <div style={{ flex: 1, textAlign: "left", WebkitAppRegion: "no-drag" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.75)", letterSpacing: "-0.01em" }}>
            Memories
          </span>
          {isRecording && !isSpeaking && (
            <span style={{ fontSize: 10, color: "rgba(248,113,113,0.85)", marginLeft: 7, letterSpacing: "0.06em", fontWeight: 500 }}>
              ⏺ GRAVANDO{currentRecName ? ` "${currentRecName}"` : ""}
            </span>
          )}
          {isSpeaking && (
            <span style={{ fontSize: 10, color: "rgba(74,222,128,0.7)", marginLeft: 7, letterSpacing: "0.06em", fontWeight: 500 }}>
              FALANDO
            </span>
          )}
          {!isSpeaking && !isRecording && listenerState === "active" && (
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginLeft: 7, letterSpacing: "0.06em", fontWeight: 500 }}>
              OUVINDO
            </span>
          )}
          {!isSpeaking && !isRecording && listenerState === "passive" && inConversationWindow && (
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginLeft: 7, letterSpacing: "0.06em", fontWeight: 500 }}>
              PRONTA
            </span>
          )}
          {!isSpeaking && !isRecording && listenerState === "saving" && (
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginLeft: 7, letterSpacing: "0.06em", fontWeight: 500 }}>
              PENSANDO
            </span>
          )}
        </div>

        <div style={{
          width: 6, height: 6, borderRadius: "50%",
          background: isRecording
            ? "rgba(248,113,113,0.9)"
            : isSpeaking
              ? "rgba(74,222,128,0.9)"
              : orbState === "active"
                ? "rgba(255,255,255,0.85)"
                : orbState === "saving"
                  ? "rgba(255,255,255,0.4)"
                  : "rgba(255,255,255,0.12)",
          transition: "background .3s",
          flexShrink: 0,
        }} className={isRecording ? "dot-pulse" : orbState === "active" ? "dot-pulse" : ""} />
      </button>
    </div>
  )
}
