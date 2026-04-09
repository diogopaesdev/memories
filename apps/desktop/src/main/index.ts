import {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  globalShortcut,
  shell,
  Notification,
  screen,
  session,
} from "electron"
import path from "path"
import Store from "electron-store"
import WebSocket from "ws"

// Prevent multiple instances
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
  process.exit(0)
}

interface StoreSchema {
  token: string | null
  userId: string | null
  webAppUrl: string
  defaultProjectId: string | null
  openaiApiKey: string | null
  triggerWord: string | null
  selectedTeamId: string | null
}

const store = new Store<StoreSchema>({
  defaults: {
    token: null,
    userId: null,
    webAppUrl: process.env.VITE_WEB_APP_URL ?? "http://localhost:3000",
    defaultProjectId: null,
    openaiApiKey: null,
    triggerWord: null,
    selectedTeamId: null,
  },
})

let recorderWindow: BrowserWindow | null = null
let loginWindow: BrowserWindow | null = null
let realtimeWs: WebSocket | null = null

const RENDERER_URL = process.env.VITE_DEV_SERVER_URL

function createRecorderWindow() {
  recorderWindow = new BrowserWindow({
    width: 88,
    height: 88,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    frame: false,
    transparent: false,
    backgroundColor: "#020b14",
    hasShadow: true,
    roundedCorners: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (RENDERER_URL) {
    recorderWindow.loadURL(RENDERER_URL + "/recorder")
  } else {
    recorderWindow.loadFile(path.join(__dirname, "../../dist/index.html"), {
      hash: "/recorder",
    })
  }

  recorderWindow.on("ready-to-show", () => {
    recorderWindow?.setSkipTaskbar(true)
  })

  recorderWindow.on("closed", () => {
    recorderWindow = null
  })
}

function positionBottomRight(w?: number, h?: number) {
  if (!recorderWindow) return
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize
  const bounds = recorderWindow.getBounds()
  const ww = w ?? bounds.width
  const wh = h ?? bounds.height
  const margin = 20
  // setBounds é atômico — evita flash de posição errada entre setSize + setPosition
  recorderWindow.setBounds({ x: sw - ww - margin, y: sh - wh - margin, width: ww, height: wh }, false)
}

function openLogin() {
  const webAppUrl = store.get("webAppUrl")
  // Abre direto na página de código — sem polling, sem janela extra
  shell.openExternal(`${webAppUrl}/connect-desktop`)
}

function handleSignOut() {
  store.set("token", null)
  store.set("userId", null)
  store.set("defaultProjectId", null)
}

function showOrbContextMenu() {
  const isLoggedIn = Boolean(store.get("token"))
  const menu = Menu.buildFromTemplate([
    {
      label: isLoggedIn ? "Sair da conta" : "Entrar",
      click: isLoggedIn ? handleSignOut : openLogin,
    },
    {
      label: "Abrir painel web",
      click: () => shell.openExternal(store.get("webAppUrl")),
    },
    { type: "separator" },
    {
      label: "Fechar app",
      click: () => app.quit(),
    },
  ])
  menu.popup({ window: recorderWindow ?? undefined })
}

// IPC Handlers
ipcMain.handle("store:get", (_event, key: keyof StoreSchema) => store.get(key))
ipcMain.handle("store:set", (_event, key: keyof StoreSchema, value: string | null) => {
  store.set(key, value as never)
})

ipcMain.handle("window:close-login", () => loginWindow?.close())  // mantido para compatibilidade
ipcMain.handle("window:set-size", (_event, w: number, h: number) => {
  if (!recorderWindow) return
  positionBottomRight(w, h)          // setBounds já aplica size + position atomicamente
  recorderWindow.setSkipTaskbar(true)
  recorderWindow.setAlwaysOnTop(true, "screen-saver")
  if (!recorderWindow.isVisible()) recorderWindow.show()
  recorderWindow.moveTop()
})

ipcMain.handle("window:open-login", () => openLogin())
ipcMain.handle("window:context-menu", () => showOrbContextMenu())

ipcMain.handle("ai:process-voice", async (_event, transcript: string, openaiApiKey: string | null) => {
  const token = store.get("token")
  const webAppUrl = store.get("webAppUrl")
  const selectedTeamId = store.get("selectedTeamId")
  const res = await fetch(`${webAppUrl}/api/ai/voice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ transcript, openaiApiKey, teamId: selectedTeamId ?? undefined }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
  return data
})

ipcMain.handle("audio:transcribe", async (_event, audioBuffer: ArrayBuffer, apiKey: string) => {
  const buffer = Buffer.from(audioBuffer)
  const file = new File([buffer], "recording.webm", { type: "audio/webm" })
  const form = new FormData()
  form.append("file", file)
  form.append("model", "whisper-1")
  form.append("language", "pt")

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message ?? `HTTP ${res.status}`)
  return data.text as string
})

ipcMain.handle("auth:exchange-code", async (_event, code: string) => {
  const webAppUrl = store.get("webAppUrl")
  const res = await fetch(`${webAppUrl}/api/auth/exchange-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
  return data
})

ipcMain.handle("auth:check-session", async () => {
  const token = store.get("token")
  if (!token) return null
  const webAppUrl = store.get("webAppUrl")
  try {
    const res = await fetch(`${webAppUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
})

ipcMain.handle("notify", (_event, title: string, body: string) => {
  new Notification({ title, body }).show()
})

ipcMain.handle("teams:list", async () => {
  const token = store.get("token")
  if (!token) return []
  const webAppUrl = store.get("webAppUrl")
  try {
    const res = await fetch(`${webAppUrl}/api/teams`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
})

// ── Realtime API (WebSocket via main process para evitar restrições do renderer) ──

ipcMain.handle("realtime:start", (event, apiKey: string) => {
  if (realtimeWs) { realtimeWs.close(); realtimeWs = null }

  return new Promise<{ ok: boolean }>((resolve, reject) => {
    const ws = new WebSocket(
      "wss://api.openai.com/v1/realtime?model=gpt-4o-mini-realtime-preview",
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "OpenAI-Beta": "realtime=v1",
        },
      }
    )
    realtimeWs = ws

    ws.on("open", () => {
      ws.send(JSON.stringify({
        type: "session.update",
        session: {
          modalities: ["text"],
          input_audio_format: "pcm16",
          input_audio_transcription: { model: "whisper-1", language: "pt" },
          turn_detection: {
            type: "server_vad",
            threshold: 0.3,
            silence_duration_ms: 800,
            prefix_padding_ms: 300,
            create_response: false,
          },
        },
      }))
      resolve({ ok: true })
    })

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString())
        event.sender.send("realtime:event", msg)
      } catch { /* ignore */ }
    })

    ws.on("error", (err) => {
      reject(new Error(err.message))
    })

    ws.on("close", (code, reason) => {
      realtimeWs = null
      event.sender.send("realtime:event", {
        type: "_closed",
        code,
        reason: reason.toString(),
      })
    })
  })
})

ipcMain.on("realtime:audio", (_event, audio: string) => {
  if (realtimeWs?.readyState === WebSocket.OPEN) {
    realtimeWs.send(JSON.stringify({ type: "input_audio_buffer.append", audio }))
  }
})

ipcMain.handle("realtime:stop", () => {
  realtimeWs?.close(1000)
  realtimeWs = null
})

ipcMain.handle("open-web", (_event, path: string) => {
  shell.openExternal(store.get("webAppUrl") + path)
})


app.whenReady().then(() => {
  // Conceder permissão de microfone ao renderer
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    return permission === "media" || permission === "microphone"
  })
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === "media" || permission === "microphone")
  })

  // Injetar Authorization header nas requisições WebSocket para a OpenAI Realtime API
  // (browsers não permitem headers customizados em WebSocket — fazemos pelo processo main)
  // WebSocket SSL upgrades usam https:// internamente no Chromium, não wss://
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ["wss://api.openai.com/*", "https://api.openai.com/*"] },
    (details, callback) => {
      const apiKey = store.get("openaiApiKey")
      if (apiKey) {
        details.requestHeaders["Authorization"] = `Bearer ${apiKey}`
        details.requestHeaders["OpenAI-Beta"] = "realtime=v1"
      }
      callback({ requestHeaders: details.requestHeaders })
    }
  )

  Menu.setApplicationMenu(null)

  createRecorderWindow()
  positionBottomRight()
  recorderWindow?.show()

  globalShortcut.register("CommandOrControl+Shift+R", () => {
    if (recorderWindow?.isVisible()) {
      recorderWindow.hide()
    } else {
      positionBottomRight()
      recorderWindow?.show()
    }
  })

  app.on("activate", () => {
    if (!recorderWindow) createRecorderWindow()
  })
})

app.on("window-all-closed", (e: Event) => {
  e.preventDefault()
})

app.on("will-quit", () => {
  globalShortcut.unregisterAll()
})
