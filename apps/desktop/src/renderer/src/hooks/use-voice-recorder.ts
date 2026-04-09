import { useState, useRef, useCallback, useEffect } from "react"

export type ListenerState = "passive" | "active" | "saving" | "error"

interface UseContinuousListenerReturn {
  listenerState: ListenerState
  interimText: string
  capturedText: string
  lastError: string | null
  debugLog: string[]
  startListening: () => Promise<void>
  stopListening: () => void
}

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

  // Agenda save após SAVE_DELAY_MS de silêncio.
  // Cada nova fala em modo ativo reseta o timer.
  const SAVE_DELAY_MS = 6000
  function scheduleSave() {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    dbg(`Timer: ${SAVE_DELAY_MS / 1000}s para salvar`)
    saveTimerRef.current = setTimeout(() => { doSave() }, SAVE_DELAY_MS)
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
    dbg(`Salvando: "${text.slice(0, 40)}..."`)
    try {
      await onCommandRef.current(text)
    } catch { /* tratado em onCommand */ } finally {
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

        if (isModeActive.current) {
          // Já está ativo: acumula e reseta o timer de silêncio
          capturedRef.current = (capturedRef.current + " " + text).trim()
          setCaptured(capturedRef.current)
          scheduleSave()
          break
        }

        if (!trigger) break
        const idx = text.toLowerCase().indexOf(trigger)
        if (idx === -1) break

        // Gatilho detectado → ativa modo (fica verde) e acumula o que vem depois
        isModeActive.current = true
        setListenerState("active")
        const after = text.slice(idx + trigger.length).trim()
        capturedRef.current = after
        setCaptured(after)
        dbg("Gatilho! Aguardando comando...")
        // Se já tem conteúdo após o gatilho, agenda save; senão espera próxima fala
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
      // Microfone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      dbg("Microfone OK")

      // Conectar WebSocket via main process (tem acesso à rede sem restrições)
      const cleanup = window.electron.realtime.onEvent(handleRealtimeEvent)

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

      // AudioContext 24kHz → PCM16 → main → OpenAI
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

      // Retornar cleanup do listener de eventos
      return cleanup
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
  }, [])

  useEffect(() => () => { stopListening() }, [stopListening])

  return { listenerState, interimText, capturedText, lastError, debugLog, startListening, stopListening }
}
