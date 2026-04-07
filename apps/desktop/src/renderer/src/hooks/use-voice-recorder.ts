import { useState, useRef, useCallback } from "react"

export type RecorderState = "idle" | "recording" | "processing" | "done" | "error"

interface UseVoiceRecorderReturn {
  state: RecorderState
  transcript: string
  error: string | null
  startRecording: () => void
  stopRecording: () => void
  reset: () => void
}

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [state, setState] = useState<RecorderState>("idle")
  const [transcript, setTranscript] = useState("")
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const startRecording = useCallback(() => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition: typeof SpeechRecognition }).webkitSpeechRecognition

    if (!SpeechRecognitionAPI) {
      setError("Web Speech API não suportada neste ambiente.")
      setState("error")
      return
    }

    const recognition = new SpeechRecognitionAPI()
    recognition.lang = "pt-BR"
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onstart = () => setState("recording")

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let final = ""
      let interim = ""
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          final += result[0].transcript + " "
        } else {
          interim += result[0].transcript
        }
      }
      setTranscript((prev) => (prev + final + interim).trim())
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setError(`Erro no reconhecimento: ${event.error}`)
      setState("error")
    }

    recognition.onend = () => {
      if (state === "recording") {
        setState("processing")
      }
    }

    recognitionRef.current = recognition
    recognition.start()
    setTranscript("")
    setError(null)
  }, [state])

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop()
    setState("processing")
  }, [])

  const reset = useCallback(() => {
    recognitionRef.current?.abort()
    recognitionRef.current = null
    setState("idle")
    setTranscript("")
    setError(null)
  }, [])

  return { state, transcript, error, startRecording, stopRecording, reset }
}
