import { useState, useRef, useCallback, useEffect } from "react"

export type ListenerState = "passive" | "active" | "saving" | "error"

interface UseContinuousListenerReturn {
  listenerState: ListenerState
  interimText: string
  capturedText: string
  lastError: string | null
  debugLog: string[]
  inConversationWindow: boolean
  startListening: () => Promise<void>
  stopListening: () => void
}

// After the trigger word is detected, stay in "conversation window" for this
// long without requiring the trigger word again for follow-up messages.
const CONVERSATION_WINDOW_MS = 30_000

export function useContinuousListener(
  triggerWord: string | null,
  apiKey: string | null,
  onCommand: (command: string) => Promise<void>
): UseContinuousListenerReturn {
  const [listenerState, setListenerState] = useState<ListenerState>("passive")
  const [interimText, setInterimText] = useState("")
  const [capturedText, setCaptured] = useState("")
  const [lastError, setLastError] = useState<string | null>(null)
  const [debugLog, setDebugLog] = useState<string[]>([])
  const [inConversationWindow, setInConversationWindow] = useState(false)

  function dbg(msg: string) {
    const t = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    setDebugLog(prev => [`${t} ${msg}`, ...prev].slice(0, 8))
  }

  const triggerRef = useRef(triggerWord)
  const onCommandRef = useRef(onCommand)
  useEffect(() => { triggerRef.current = triggerWord }, [triggerWord])
  useEffect(() => { onCommandRef.current = onCommand }, [onCommand])

  const activeRef = useRef(false)
  const isModeActive = useRef(false)
  const capturedRef = useRef("")
  const interimRef = useRef("")
  const savingRef = useRef(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Conversation window ─────────────────────────────────────────────────
  // After trigger is detected, stay "open" for CONVERSATION_WINDOW_MS so the
  // user can ask follow-up questions without saying the trigger word again.
  const convWindowRef = useRef(false)
  const convTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function openConversationWindow() {
    convWindowRef.current = true
    setInConversationWindow(true)
    resetConversationTimer()
  }

  function resetConversationTimer() {
    if (convTimerRef.current) clearTimeout(convTimerRef.current)
    convTimerRef.current = setTimeout(() => {
      convWindowRef.current = false
      setInConversationWindow(false)
      convTimerRef.current = null
      dbg("Janela de conversa encerrada")
    }, CONVERSATION_WINDOW_MS)
  }

  function closeConversationWindow() {
    if (convTimerRef.current) { clearTimeout(convTimerRef.current); convTimerRef.current = null }
    convWindowRef.current = false
    setInConversationWindow(false)
  }
  // ────────────────────────────────────────────────────────────────────────

  function scheduleSave() {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    // Shorter delay when in conversation window or no trigger — feels more responsive
    const delay = (triggerRef.current && !convWindowRef.current) ? 4000 : 1200
    saveTimerRef.current = setTimeout(() => { doSave() }, delay)
  }
  function cancelSaveTimer() {
    if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null }
  }

  const audioCtxRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  /** Float32 → PCM16 base64 */
  function pcm16Base64(samples: Float32Array): string {
    const int16 = new Int16Array(samples.length)
    for (let i = 0; i < samples.length; i++) {
      int16[i] = Math.max(-32768, Math.min(32767, samples[i] * 32768))
    }
    const bytes = new Uint8Array(int16.buffer)
    let bin = ""
    for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i])
    return btoa(bin)
  }

  async function doSave() {
    cancelSaveTimer()
    if (savingRef.current) return
    const text = capturedRef.current.trim()
    isModeActive.current = false
    capturedRef.current = ""
    interimRef.current = ""
    setCaptured("")
    setInterimText("")
    if (!text) { setListenerState("passive"); return }
    savingRef.current = true
    setListenerState("saving")
    dbg(`Processando: "${text.slice(0, 40)}..."`)
    try {
      await onCommandRef.current(text)
      // After command completes, extend the conversation window
      if (convWindowRef.current) resetConversationTimer()
    } catch { /* handled in onCommand */ } finally {
      savingRef.current = false
      if (activeRef.current) setListenerState("passive")
    }
  }

  function handleRealtimeEvent(msg: unknown) {
    const m = msg as Record<string, unknown>
    dbg(String(m.type ?? "?"))

    switch (m.type) {
      case "session.updated":
        dbg("Sessão configurada, escutando...")
        break

      case "input_audio_buffer.speech_started":
        dbg("Fala detectada")
        if (isModeActive.current) cancelSaveTimer()
        break

      case "conversation.item.input_audio_transcription.delta":
        interimRef.current += String(m.delta ?? "")
        setInterimText(interimRef.current)
        break

      case "conversation.item.input_audio_transcription.completed": {
        const text = String(m.transcript ?? "").trim()
        interimRef.current = ""
        setInterimText("")
        if (!text) break
        dbg(`Texto: "${text}"`)

        const trigger = (triggerRef.current ?? "").toLowerCase().trim()

        // ── Noise filter ─────────────────────────────────────────
        // Ignore very short or common filler utterances to avoid responding to
        // background noise, ambient audio, or accidental sounds.
        const wordCount = text.split(/\s+/).filter(Boolean).length
        const NOISE_WORDS = new Set([
          "e aí", "eai", "eaí", "oi", "olá", "ola", "hey", "ah", "eh", "hm", "hmm",
          "tá", "ta", "né", "ne", "sim", "não", "nao", "ok", "okay", "certo",
          "tchau", "bye", "obrigado", "obrigada", "ok ok", "tudo bem",
        ])
        const lc = text.toLowerCase()
        const isFiller = NOISE_WORDS.has(lc) || (wordCount < 3 && lc.length < 18 && !trigger)
        if (isFiller) {
          dbg(`Ignorado (ruído/preenchimento): "${text}"`)
          break
        }
        // ─────────────────────────────────────────────────────────

        // ── Mode 1: no trigger word — always active ──────────────
        if (!trigger) {
          isModeActive.current = true
          setListenerState("active")
          capturedRef.current = text
          setCaptured(text)
          scheduleSave()
          break
        }

        // ── Mode 2: inside conversation window ───────────────────
        // Trigger was spoken recently; follow-up messages bypass the trigger check
        if (convWindowRef.current && !isModeActive.current) {
          isModeActive.current = true
          setListenerState("active")
          capturedRef.current = text
          setCaptured(text)
          resetConversationTimer() // keep window alive on each message
          scheduleSave()
          break
        }

        // ── Mode 3: already mid-capture — accumulate ─────────────
        if (isModeActive.current) {
          capturedRef.current = (capturedRef.current + " " + text).trim()
          setCaptured(capturedRef.current)
          scheduleSave()
          break
        }

        // ── Mode 4: waiting for trigger word ─────────────────────
        const idx = text.toLowerCase().indexOf(trigger)
        if (idx === -1) break

        // Trigger detected → open conversation window
        isModeActive.current = true
        setListenerState("active")
        openConversationWindow()
        const after = text.slice(idx + trigger.length).trim()
        capturedRef.current = after
        setCaptured(after)
        dbg(`Gatilho! Janela de conversa aberta (${CONVERSATION_WINDOW_MS / 1000}s)`)
        if (after) scheduleSave()
        break
      }

      case "error": {
        const errMsg = String((m.error as Record<string, unknown>)?.message ?? "Erro na API")
        dbg(`ERRO: ${errMsg}`)
        setLastError(errMsg)
        break
      }

      case "_closed":
        if (!activeRef.current) break
        dbg(`WS fechou: ${m.code} ${m.reason}`)
        if (m.code !== 1000) {
          setLastError(`Conexão encerrada (${m.code})`)
          setListenerState("error")
        }
        break
    }
  }

  const startListening = useCallback(async () => {
    if (activeRef.current) return
    const key = apiKey
    if (!key) { setLastError("Chave OpenAI não configurada."); setListenerState("error"); return }
    setLastError(null)
    dbg("Iniciando...")

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      dbg("Microfone OK")

      window.electron.realtime.onEvent(handleRealtimeEvent)

      dbg("Conectando ao OpenAI...")
      await window.electron.realtime.start(key)
      dbg("WS conectado!")

      activeRef.current = true
      isModeActive.current = false
      capturedRef.current = ""
      interimRef.current = ""
      setCaptured("")
      setInterimText("")
      setListenerState("passive")

      const ctx = new AudioContext({ sampleRate: 24000 })
      audioCtxRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      const processor = ctx.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor
      source.connect(processor)
      processor.connect(ctx.destination)

      let chunkCount = 0
      processor.onaudioprocess = (ev) => {
        chunkCount++
        if (chunkCount === 1) dbg("Áudio fluindo...")
        const audio = pcm16Base64(ev.inputBuffer.getChannelData(0))
        window.electron.realtime.sendAudio(audio)
      }
    } catch (err) {
      const e = err as Error
      dbg(`Erro: ${e.message}`)
      const msg =
        e.name === "NotAllowedError" ? "Permissão de microfone negada." :
        e.name === "NotFoundError"   ? "Nenhum microfone encontrado."   :
        (e.message ?? "Erro ao conectar")
      setLastError(msg)
      setListenerState("error")
    }
  }, [apiKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const stopListening = useCallback(() => {
    cancelSaveTimer()
    closeConversationWindow()
    activeRef.current = false
    savingRef.current = false
    processorRef.current?.disconnect()
    processorRef.current = null
    audioCtxRef.current?.close()
    audioCtxRef.current = null
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    window.electron.realtime.stop()
    isModeActive.current = false
    capturedRef.current = ""
    interimRef.current = ""
    setCaptured("")
    setInterimText("")
    setListenerState("passive")
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { stopListening() }, [stopListening])

  return { listenerState, interimText, capturedText, lastError, debugLog, inConversationWindow, startListening, stopListening }
}
