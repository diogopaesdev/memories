import { contextBridge, ipcRenderer } from "electron"

contextBridge.exposeInMainWorld("electron", {
  store: {
    get: (key: string) => ipcRenderer.invoke("store:get", key),
    set: (key: string, value: string | null) => ipcRenderer.invoke("store:set", key, value),
  },
  window: {
    hideRecorder: () => ipcRenderer.invoke("window:hide-recorder"),
    closeLogin: () => ipcRenderer.invoke("window:close-login"),
  },
  notify: (title: string, body: string) => ipcRenderer.invoke("notify", title, body),
  openWeb: (path: string) => ipcRenderer.invoke("open-web", path),
})
