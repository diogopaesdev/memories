import { useState, useEffect } from "react"
import { Mic, MicOff, Send, X, RefreshCw, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { useVoiceRecorder } from "@/hooks/use-voice-recorder"
import { getProjects, processVoiceTranscript, createReport } from "@/lib/api"
import { electronAPI } from "@/lib/electron"
import type { Project } from "@projectsreport/shared"

export function RecorderWindow() {
  const { state, transcript, error, startRecording, stopRecording, reset } = useVoiceRecorder()
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [processed, setProcessed] = useState<{ title: string; content: string; tags: string[] } | null>(null)
  const [saving, setSaving] = useState(false)
  const [showProjectSelect, setShowProjectSelect] = useState(false)
  const [loadingProjects, setLoadingProjects] = useState(true)

  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    try {
      const data = await getProjects()
      setProjects(data)
      const stored = await window.electron.store.get("defaultProjectId")
      if (stored && data.find((p) => p.id === stored)) {
        setSelectedProjectId(stored)
      } else if (data.length > 0) {
        setSelectedProjectId(data[0].id)
      }
    } catch {
      // Session might not be available
    } finally {
      setLoadingProjects(false)
    }
  }

  async function handleStopAndProcess() {
    stopRecording()
    if (!transcript.trim()) return

    try {
      const result = await processVoiceTranscript(transcript)
      setProcessed(result)
    } catch {
      setProcessed({ title: transcript.slice(0, 60), content: transcript, tags: [] })
    }
  }

  async function handleSave() {
    if (!processed || !selectedProjectId) return
    setSaving(true)
    try {
      await createReport({
        projectId: selectedProjectId,
        title: processed.title,
        content: processed.content,
        rawTranscript: transcript,
        source: "voice",
        status: "draft",
        tags: processed.tags,
      })

      const project = projects.find((p) => p.id === selectedProjectId)
      await electronAPI().notify(
        "Report salvo!",
        `"${processed.title}" salvo em ${project?.name ?? "projeto"}`
      )

      reset()
      setProcessed(null)
      await electronAPI().window.hideRecorder()
    } catch {
      // Show inline error
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    electronAPI().window.hideRecorder()
  }

  const selectedProject = projects.find((p) => p.id === selectedProjectId)

  return (
    <div className="h-screen bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50/80">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-sm font-semibold text-slate-700">ProjectsReport</span>
        </div>
        <button
          onClick={handleClose}
          className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Project selector */}
      <div className="px-4 py-2 border-b">
        <div className="relative">
          <button
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors text-sm"
            onClick={() => setShowProjectSelect(!showProjectSelect)}
            disabled={loadingProjects}
          >
            <span className={selectedProject ? "text-slate-700" : "text-slate-400"}>
              {loadingProjects ? "Carregando projetos..." : selectedProject?.name ?? "Selecione um projeto"}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showProjectSelect && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 overflow-hidden">
              {projects.map((project) => (
                <button
                  key={project.id}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors",
                    project.id === selectedProjectId && "bg-primary/5 text-primary font-medium"
                  )}
                  onClick={async () => {
                    setSelectedProjectId(project.id)
                    await window.electron.store.set("defaultProjectId", project.id)
                    setShowProjectSelect(false)
                  }}
                >
                  {project.name}
                </button>
              ))}
              {projects.length === 0 && (
                <div className="px-3 py-4 text-center text-sm text-slate-400">
                  Nenhum projeto encontrado
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
        {!processed ? (
          <>
            {/* Waveform / Status */}
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <button
                onClick={state === "idle" ? startRecording : handleStopAndProcess}
                disabled={state === "processing"}
                className={cn(
                  "w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg",
                  state === "recording"
                    ? "bg-red-500 hover:bg-red-600 animate-pulse"
                    : state === "processing"
                    ? "bg-slate-300 cursor-not-allowed"
                    : "bg-primary hover:bg-primary/90"
                )}
              >
                {state === "recording" ? (
                  <MicOff className="w-8 h-8 text-white" />
                ) : state === "processing" ? (
                  <RefreshCw className="w-8 h-8 text-slate-500 animate-spin" />
                ) : (
                  <Mic className="w-8 h-8 text-white" />
                )}
              </button>

              <p className="text-sm text-slate-500 text-center">
                {state === "idle" && "Clique para começar a gravar"}
                {state === "recording" && "Gravando... clique para parar"}
                {state === "processing" && "Processando com IA..."}
                {state === "error" && error}
              </p>
            </div>

            {/* Live transcript */}
            {(transcript || state === "recording") && (
              <div className="rounded-xl border bg-slate-50 p-3 min-h-[80px] max-h-[120px] overflow-y-auto">
                <p className="text-xs text-muted-foreground mb-1 font-medium">Transcrição:</p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {transcript || (
                    <span className="text-slate-400 italic">Fale agora...</span>
                  )}
                  {state === "recording" && (
                    <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-blink" />
                  )}
                </p>
              </div>
            )}
          </>
        ) : (
          /* Processed result preview */
          <div className="flex-1 flex flex-col gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Título</label>
              <input
                className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={processed.title}
                onChange={(e) => setProcessed({ ...processed, title: e.target.value })}
              />
            </div>

            <div className="flex-1">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Conteúdo</label>
              <textarea
                className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                value={processed.content}
                onChange={(e) => setProcessed({ ...processed, content: e.target.value })}
                rows={6}
              />
            </div>

            {processed.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {processed.tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="px-4 py-3 border-t bg-slate-50/80 flex gap-2">
        {processed ? (
          <>
            <button
              onClick={() => { setProcessed(null); reset() }}
              className="flex-1 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Regravar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !selectedProjectId}
              className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
            >
              {saving ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              {saving ? "Salvando..." : "Salvar Report"}
            </button>
          </>
        ) : (
          <button
            onClick={() => electronAPI().openWeb("/projects")}
            className="w-full py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Abrir painel web
          </button>
        )}
      </div>
    </div>
  )
}
