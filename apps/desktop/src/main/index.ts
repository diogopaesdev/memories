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
import { exec, spawn } from "child_process"
import fs from "fs"
import Store from "electron-store"
import WebSocket from "ws"

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) { app.quit(); process.exit(0) }

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
    token: null, userId: null,
    webAppUrl: process.env.VITE_WEB_APP_URL ?? "http://localhost:3000",
    defaultProjectId: null, openaiApiKey: null, triggerWord: null, selectedTeamId: null,
  },
})

let recorderWindow: BrowserWindow | null = null
let loginWindow: BrowserWindow | null = null
let realtimeWs: WebSocket | null = null

const RENDERER_URL = process.env.VITE_DEV_SERVER_URL
const ORB_W = 180
const ORB_H = 50
const PANEL_W = 300
const PANEL_H = 420

function createRecorderWindow() {
  recorderWindow = new BrowserWindow({
    width: ORB_W, height: ORB_H,
    title: "",
    resizable: false,
    alwaysOnTop: true, skipTaskbar: true,
    frame: false,
    transparent: false,
    backgroundColor: "#0f0f0f",
    hasShadow: true, roundedCorners: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
    },
  })

  if (RENDERER_URL) {
    recorderWindow.loadURL(RENDERER_URL)
  } else {
    recorderWindow.loadFile(path.join(__dirname, "../../dist/index.html"), { hash: "/recorder" })
  }

  recorderWindow.on("ready-to-show", () => {
    recorderWindow?.setSkipTaskbar(true)
    recorderWindow?.show()
  })
  recorderWindow.on("closed", () => { recorderWindow = null })
}

const MARGIN = 20

function positionBottomRight(w?: number, h?: number) {
  if (!recorderWindow) return
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize
  const bounds = recorderWindow.getBounds()
  const ww = w ?? bounds.width
  const wh = h ?? bounds.height
  recorderWindow.setBounds({ x: sw - ww - MARGIN, y: sh - wh - MARGIN, width: ww, height: wh }, false)
}

function openLogin() {
  shell.openExternal(`${store.get("webAppUrl")}/connect-desktop`)
}

function handleSignOut() {
  store.set("token", null)
  store.set("userId", null)
  store.set("defaultProjectId", null)
}

function showOrbContextMenu() {
  const isLoggedIn = Boolean(store.get("token"))
  const menu = Menu.buildFromTemplate([
    { label: isLoggedIn ? "Sair da conta" : "Entrar", click: isLoggedIn ? handleSignOut : openLogin },
    { label: "Abrir painel web", click: () => shell.openExternal(store.get("webAppUrl")) },
    { type: "separator" },
    { label: "Fechar app", click: () => app.quit() },
  ])
  menu.popup({ window: recorderWindow ?? undefined })
}

// ── IPC ──
ipcMain.handle("store:get", (_e, key: keyof StoreSchema) => store.get(key))
ipcMain.handle("store:set", (_e, key: keyof StoreSchema, value: string | null) => { store.set(key, value as never) })

ipcMain.handle("window:close-login", () => loginWindow?.close())
ipcMain.handle("window:set-size", (_e, w: number, h: number) => {
  if (!recorderWindow) return
  positionBottomRight(w, h)
  recorderWindow.setSkipTaskbar(true)
  recorderWindow.setAlwaysOnTop(true, "screen-saver")
  if (!recorderWindow.isVisible()) recorderWindow.show()
  recorderWindow.moveTop()
})
ipcMain.handle("window:open-login", () => openLogin())
ipcMain.handle("window:context-menu", () => showOrbContextMenu())

ipcMain.handle("ai:process-voice", async (_e, transcript: string, openaiApiKey: string | null) => {
  const token = store.get("token")
  const webAppUrl = store.get("webAppUrl")
  const selectedTeamId = store.get("selectedTeamId")
  const res = await fetch(`${webAppUrl}/api/ai/voice`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ transcript, openaiApiKey, teamId: selectedTeamId ?? undefined }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
  return data
})

ipcMain.handle("ai:chat", async (_e, transcript: string, history: unknown[], openaiApiKey: string | null) => {
  const token = store.get("token")
  const webAppUrl = store.get("webAppUrl")
  const selectedTeamId = store.get("selectedTeamId")
  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().size
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 25000)

  // Pass saved recording names so the AI can use exact names for replay
  const savedRecordings = Object.entries(loadRecordings()).map(([name, evs]) => ({
    name,
    eventCount: evs.length,
    durationMs: evs.length > 1 ? evs[evs.length - 1].t - evs[0].t : 0,
  }))

  try {
    const res = await fetch(`${webAppUrl}/api/ai/chat`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ transcript, history, openaiApiKey, teamId: selectedTeamId ?? undefined, screenW, screenH, savedRecordings }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
    return data
  } finally {
    clearTimeout(timeout)
  }
})

ipcMain.handle("audio:transcribe", async (_e, audioBuffer: ArrayBuffer, apiKey: string) => {
  const buffer = Buffer.from(audioBuffer)
  const file = new File([buffer], "recording.webm", { type: "audio/webm" })
  const form = new FormData()
  form.append("file", file); form.append("model", "whisper-1"); form.append("language", "pt")
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: form,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message ?? `HTTP ${res.status}`)
  return data.text as string
})

ipcMain.handle("auth:exchange-code", async (_e, code: string) => {
  const webAppUrl = store.get("webAppUrl")
  const res = await fetch(`${webAppUrl}/api/auth/exchange-code`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }),
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
    const res = await fetch(`${webAppUrl}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
})

ipcMain.handle("notify", (_e, title: string, body: string) => new Notification({ title, body }).show())

ipcMain.handle("teams:list", async () => {
  const token = store.get("token")
  if (!token) return []
  const webAppUrl = store.get("webAppUrl")
  try {
    const res = await fetch(`${webAppUrl}/api/teams`, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) return []
    return res.json()
  } catch { return [] }
})

ipcMain.handle("realtime:start", (event, apiKey: string) => {
  if (realtimeWs) { realtimeWs.close(); realtimeWs = null }
  return new Promise<{ ok: boolean }>((resolve, reject) => {
    const ws = new WebSocket("wss://api.openai.com/v1/realtime?model=gpt-4o-mini-realtime-preview", {
      headers: { Authorization: `Bearer ${apiKey}`, "OpenAI-Beta": "realtime=v1" },
    })
    realtimeWs = ws
    ws.on("open", () => {
      ws.send(JSON.stringify({
        type: "session.update",
        session: {
          modalities: ["text"], input_audio_format: "pcm16",
          input_audio_transcription: { model: "whisper-1", language: "pt" },
          turn_detection: { type: "server_vad", threshold: 0.3, silence_duration_ms: 800, prefix_padding_ms: 300, create_response: false },
        },
      }))
      resolve({ ok: true })
    })
    ws.on("message", (data) => {
      try { event.sender.send("realtime:event", JSON.parse(data.toString())) } catch { /* ignore */ }
    })
    ws.on("error", (err) => reject(new Error(err.message)))
    ws.on("close", (code, reason) => {
      realtimeWs = null
      event.sender.send("realtime:event", { type: "_closed", code, reason: reason.toString() })
    })
  })
})

ipcMain.on("realtime:audio", (_e, audio: string) => {
  if (realtimeWs?.readyState === WebSocket.OPEN) {
    realtimeWs.send(JSON.stringify({ type: "input_audio_buffer.append", audio }))
  }
})

ipcMain.handle("tts:speak", async (_e, text: string, apiKey: string) => {
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "tts-1", input: text, voice: "nova", response_format: "pcm" }),
    // pcm = raw 24kHz 16-bit mono — same sample rate as the recording AudioContext,
    // so both share the same WASAPI stream and don't conflict on Windows
  })
  if (!res.ok) throw new Error(`TTS ${res.status}`)
  // Return base64 string — safer than Buffer through contextBridge serialization
  return Buffer.from(await res.arrayBuffer()).toString("base64")
})

ipcMain.handle("realtime:stop", () => { realtimeWs?.close(1000); realtimeWs = null })
// Internal paths: prepend webAppUrl. Absolute URLs: open directly.
ipcMain.handle("open-web", (_e, p: string) => {
  const url = p.startsWith("http") ? p : store.get("webAppUrl") + p
  return shell.openExternal(url)
})

ipcMain.handle("system:open-app", (_e, appName: string) => {
  return new Promise<void>((resolve) => {
    // Windows: `start ""` hands off to shell — works for installed apps by name
    exec(`start "" "${appName}"`, (err) => {
      if (err) {
        // Fallback: try as a direct command (e.g. "code", "notepad")
        exec(appName, () => resolve())
      } else {
        resolve()
      }
    })
  })
})

// ── PowerShell helper ──
function runPS(script: string): Promise<void> {
  return new Promise((resolve) => {
    const child = exec("powershell -NoProfile -NonInteractive -", (err) => {
      if (err) console.warn("PS mouse error:", err.message)
      resolve()
    })
    child.stdin?.write(script)
    child.stdin?.end()
  })
}

const PS_MOUSE_TYPE = `
Add-Type -TypeDefinition @"
using System.Runtime.InteropServices;
public class WinMouse {
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint x, uint y, uint d, int e);
  public const uint LDOWN=2,LUP=4,RDOWN=8,RUP=16,WHEEL=2048;
}
"@ -ErrorAction SilentlyContinue
`

// ── Mouse recording & replay ──────────────────────────────────────────────

interface RecEvent { t: number; type: string; x: number; y: number }

let recordingChild: ReturnType<typeof spawn> | null = null
let recordingBuffer: RecEvent[] = []

const recordingsFile = () => path.join(app.getPath("userData"), "macro-recordings.json")

function loadRecordings(): Record<string, RecEvent[]> {
  try { return JSON.parse(fs.readFileSync(recordingsFile(), "utf-8")) } catch { return {} }
}
function saveRecordings(recs: Record<string, RecEvent[]>) {
  fs.writeFileSync(recordingsFile(), JSON.stringify(recs), "utf-8")
}

// PowerShell script that polls mouse position + button state at 20ms intervals
const PS_RECORD_SCRIPT = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition @"
using System.Runtime.InteropServices;
public class MH { [DllImport("user32.dll")] public static extern short GetAsyncKeyState(int v); }
"@ -ErrorAction SilentlyContinue
$sw=[System.Diagnostics.Stopwatch]::StartNew()
$lx=-1;$ly=-1;$ls=$false;$rs=$false
while($true){
  $p=[System.Windows.Forms.Cursor]::Position
  $ms=$sw.ElapsedMilliseconds
  $ln=([MH]::GetAsyncKeyState(0x01)-band 0x8000)-ne 0
  $rn=([MH]::GetAsyncKeyState(0x02)-band 0x8000)-ne 0
  if($p.X-ne $lx-or $p.Y-ne $ly){[Console]::WriteLine("$ms m $($p.X) $($p.Y)");$lx=$p.X;$ly=$p.Y}
  if($ln-and -not $ls){[Console]::WriteLine("$ms ld $($p.X) $($p.Y)")}
  if(-not $ln-and $ls){[Console]::WriteLine("$ms lu $($p.X) $($p.Y)")}
  if($rn-and -not $rs){[Console]::WriteLine("$ms rd $($p.X) $($p.Y)")}
  if(-not $rn-and $rs){[Console]::WriteLine("$ms ru $($p.X) $($p.Y)")}
  $ls=$ln;$rs=$rn
  Start-Sleep -Milliseconds 20
}`

ipcMain.handle("mouse:start-recording", () => {
  if (recordingChild) { recordingChild.kill(); recordingChild = null }
  recordingBuffer = []

  const scriptPath = path.join(app.getPath("temp"), "memories-recorder.ps1")
  fs.writeFileSync(scriptPath, PS_RECORD_SCRIPT, "utf-8")

  recordingChild = spawn("powershell", ["-NoProfile", "-File", scriptPath], { stdio: ["ignore", "pipe", "ignore"] })
  recordingChild.stdout?.on("data", (chunk: Buffer) => {
    for (const line of chunk.toString().split(/\r?\n/).filter(Boolean)) {
      const [t, type, x, y] = line.trim().split(" ")
      if (t && type && x && y) recordingBuffer.push({ t: +t, type, x: +x, y: +y })
    }
  })
  return { ok: true }
})

ipcMain.handle("mouse:stop-recording", (_e, name: string) => {
  recordingChild?.kill(); recordingChild = null
  const events = [...recordingBuffer]; recordingBuffer = []
  if (events.length > 0) {
    const recs = loadRecordings(); recs[name] = events; saveRecordings(recs)
  }
  const durationMs = events.length > 1 ? events[events.length - 1].t - events[0].t : 0
  return { eventCount: events.length, durationMs, name }
})

ipcMain.handle("mouse:replay", (_e, name: string) => {
  const recs = loadRecordings()
  // Try exact name first; fall back to most recently saved recording
  let events = recs[name]
  let resolvedName = name
  if (!events?.length) {
    const keys = Object.keys(recs)
    if (keys.length === 0) throw new Error(`Nenhuma gravação encontrada`)
    resolvedName = keys[keys.length - 1]
    events = recs[resolvedName]
    console.log(`Replay: nome "${name}" não encontrado, usando "${resolvedName}"`)
  }
  if (!events?.length) throw new Error(`Gravação "${resolvedName}" está vazia`)

  // Build a single PS script with all events + timing pre-computed
  const psLines = [
    `Add-Type -TypeDefinition @"`,
    `using System.Runtime.InteropServices;`,
    `public class WR {`,
    `  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);`,
    `  [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint x, uint y, uint d, int e);`,
    `  public const uint LD=2,LU=4,RD=8,RU=16;`,
    `}`,
    `"@ -ErrorAction SilentlyContinue`,
    `Start-Sleep -Milliseconds 1500`, // give user time to switch window
  ]

  let lastT = events[0].t
  for (const ev of events) {
    const delay = ev.t - lastT
    if (delay > 10) psLines.push(`Start-Sleep -Milliseconds ${delay}`)
    lastT = ev.t
    switch (ev.type) {
      case "m":  psLines.push(`[WR]::SetCursorPos(${ev.x},${ev.y})`); break
      case "ld": psLines.push(`[WR]::SetCursorPos(${ev.x},${ev.y})`); psLines.push(`[WR]::mouse_event([WR]::LD,0,0,0,0)`); break
      case "lu": psLines.push(`[WR]::mouse_event([WR]::LU,0,0,0,0)`); break
      case "rd": psLines.push(`[WR]::SetCursorPos(${ev.x},${ev.y})`); psLines.push(`[WR]::mouse_event([WR]::RD,0,0,0,0)`); break
      case "ru": psLines.push(`[WR]::mouse_event([WR]::RU,0,0,0,0)`); break
    }
  }

  const scriptPath = path.join(app.getPath("temp"), "memories-replay.ps1")
  fs.writeFileSync(scriptPath, psLines.join("\n"), "utf-8")
  exec(`powershell -NoProfile -File "${scriptPath}"`)
  return { ok: true }
})

ipcMain.handle("mouse:list-recordings", () => {
  const recs = loadRecordings()
  return Object.entries(recs).map(([name, evs]) => ({
    name, eventCount: evs.length,
    durationMs: evs.length > 1 ? evs[evs.length - 1].t - evs[0].t : 0,
  }))
})

// ─────────────────────────────────────────────────────────────────────────────

ipcMain.handle("mouse:action", async (_e, action: string, x: number, y: number, extra?: number) => {
  const move = `[WinMouse]::SetCursorPos(${Math.round(x)}, ${Math.round(y)})`
  const scripts: Record<string, string> = {
    move:        `${PS_MOUSE_TYPE}${move}`,
    click:       `${PS_MOUSE_TYPE}${move}; Start-Sleep -Milliseconds 50; [WinMouse]::mouse_event([WinMouse]::LDOWN,0,0,0,0); [WinMouse]::mouse_event([WinMouse]::LUP,0,0,0,0)`,
    doubleClick: `${PS_MOUSE_TYPE}${move}; Start-Sleep -Milliseconds 50; [WinMouse]::mouse_event([WinMouse]::LDOWN,0,0,0,0); [WinMouse]::mouse_event([WinMouse]::LUP,0,0,0,0); Start-Sleep -Milliseconds 80; [WinMouse]::mouse_event([WinMouse]::LDOWN,0,0,0,0); [WinMouse]::mouse_event([WinMouse]::LUP,0,0,0,0)`,
    rightClick:  `${PS_MOUSE_TYPE}${move}; Start-Sleep -Milliseconds 50; [WinMouse]::mouse_event([WinMouse]::RDOWN,0,0,0,0); [WinMouse]::mouse_event([WinMouse]::RUP,0,0,0,0)`,
    scroll:      `${PS_MOUSE_TYPE}${move}; [WinMouse]::mouse_event([WinMouse]::WHEEL,0,0,${Math.round((extra ?? 1) * 120)},0)`,
  }
  const script = scripts[action]
  if (script) await runPS(script)
})

app.whenReady().then(() => {
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => permission === "media" || permission === "microphone")
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => cb(permission === "media" || permission === "microphone"))
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

  globalShortcut.register("CommandOrControl+Shift+R", () => {
    if (recorderWindow?.isVisible()) recorderWindow.hide()
    else { positionBottomRight(); recorderWindow?.show() }
  })

  app.on("activate", () => { if (!recorderWindow) createRecorderWindow() })
})

app.on("window-all-closed", (e: Event) => e.preventDefault())
app.on("will-quit", () => globalShortcut.unregisterAll())
