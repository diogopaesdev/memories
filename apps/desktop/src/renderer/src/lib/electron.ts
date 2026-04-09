interface ElectronBridge {
  store: {
    get: (key: string) => Promise<string | null>
    set: (key: string, value: string | null) => Promise<void>
  }
  window: {
    closeLogin: () => Promise<void>
    setSize: (w: number, h: number) => Promise<void>
    contextMenu: () => Promise<void>
    openLogin: () => Promise<void>
  }
  notify: (title: string, body: string) => Promise<void>
  openWeb: (path: string) => Promise<void>
  onAuthChanged: (cb: () => void) => () => void
  exchangeCode: (code: string) => Promise<{ token: string; userId: string }>
  checkSession: () => Promise<{ user: { id: string; name: string; email: string; image?: string | null } } | null>
  listTeams: () => Promise<{ id: string; name: string; isPersonal: boolean }[]>
  transcribe: (audioBuffer: ArrayBuffer, apiKey: string) => Promise<string>
  processVoice: (transcript: string, openaiApiKey: string | null) => Promise<import("./api").VoiceResult>
  realtime: {
    start: (apiKey: string) => Promise<{ ok: boolean }>
    sendAudio: (audio: string) => void
    stop: () => Promise<void>
    onEvent: (cb: (msg: unknown) => void) => () => void
  }
}

declare global {
  interface Window {
    electron: ElectronBridge
  }
}

export const electronAPI = (): ElectronBridge => {
  if (!window.electron) throw new Error("Electron API not available")
  return window.electron
}
