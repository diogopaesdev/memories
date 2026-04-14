import { contextBridge, ipcRenderer } from "electron"

contextBridge.exposeInMainWorld("electron", {
  store: {
    get: (key: string) => ipcRenderer.invoke("store:get", key),
    set: (key: string, value: string | null) => ipcRenderer.invoke("store:set", key, value),
  },
  window: {
    closeLogin: () => ipcRenderer.invoke("window:close-login"),
    setSize: (w: number, h: number) => ipcRenderer.invoke("window:set-size", w, h),
    contextMenu: () => ipcRenderer.invoke("window:context-menu"),
    openLogin: () => ipcRenderer.invoke("window:open-login"),
  },
  notify: (title: string, body: string) => ipcRenderer.invoke("notify", title, body),
  openWeb: (path: string) => ipcRenderer.invoke("open-web", path),
  onAuthChanged: (cb: () => void) => {
    ipcRenderer.on("auth:changed", cb)
    return () => ipcRenderer.removeListener("auth:changed", cb)
  },
  listTeams: () => ipcRenderer.invoke("teams:list"),
  exchangeCode: (code: string) => ipcRenderer.invoke("auth:exchange-code", code),
  checkSession: () => ipcRenderer.invoke("auth:check-session"),
  transcribe: (audioBuffer: ArrayBuffer, apiKey: string) => ipcRenderer.invoke("audio:transcribe", audioBuffer, apiKey),
  processVoice: (transcript: string, openaiApiKey: string | null) => ipcRenderer.invoke("ai:process-voice", transcript, openaiApiKey),
  processChat: (transcript: string, history: unknown[], openaiApiKey: string | null) => ipcRenderer.invoke("ai:chat", transcript, history, openaiApiKey),
  tts: (text: string, apiKey: string) => ipcRenderer.invoke("tts:speak", text, apiKey),
  openApp: (appName: string) => ipcRenderer.invoke("system:open-app", appName),
  mouseAction: (action: string, x: number, y: number, extra?: number) => ipcRenderer.invoke("mouse:action", action, x, y, extra),
  recording: {
    start:  (name: string) => ipcRenderer.invoke("mouse:start-recording", name),
    stop:   (name: string) => ipcRenderer.invoke("mouse:stop-recording", name),
    replay: (name: string) => ipcRenderer.invoke("mouse:replay", name),
    list:   ()             => ipcRenderer.invoke("mouse:list-recordings"),
  },
  realtime: {
    start: (apiKey: string) => ipcRenderer.invoke("realtime:start", apiKey),
    sendAudio: (audio: string) => ipcRenderer.send("realtime:audio", audio),
    stop: () => ipcRenderer.invoke("realtime:stop"),
    onEvent: (cb: (msg: unknown) => void) => {
      const handler = (_: Electron.IpcRendererEvent, msg: unknown) => cb(msg)
      ipcRenderer.on("realtime:event", handler)
      return () => ipcRenderer.removeListener("realtime:event", handler)
    },
  },
})
