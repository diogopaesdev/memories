// Type-safe wrapper around the electron bridge exposed via preload

interface ElectronBridge {
  store: {
    get: (key: string) => Promise<string | null>
    set: (key: string, value: string | null) => Promise<void>
  }
  window: {
    hideRecorder: () => Promise<void>
    closeLogin: () => Promise<void>
  }
  notify: (title: string, body: string) => Promise<void>
  openWeb: (path: string) => Promise<void>
}

declare global {
  interface Window {
    electron: ElectronBridge
  }
}

export const electronAPI = (): ElectronBridge => {
  if (!window.electron) {
    throw new Error("Electron API not available")
  }
  return window.electron
}
