import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  ipcMain,
  globalShortcut,
  shell,
  Notification,
  nativeTheme,
} from "electron"
import path from "path"
import Store from "electron-store"

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
}

const store = new Store<StoreSchema>({
  defaults: {
    token: null,
    userId: null,
    webAppUrl: process.env.VITE_WEB_APP_URL ?? "http://localhost:3000",
    defaultProjectId: null,
  },
})

let tray: Tray | null = null
let recorderWindow: BrowserWindow | null = null
let loginWindow: BrowserWindow | null = null
let isQuitting = false

const RENDERER_URL = process.env.VITE_DEV_SERVER_URL

function getIconPath() {
  if (process.platform === "darwin") return path.join(__dirname, "../../public/tray-icon-mac.png")
  if (process.platform === "win32") return path.join(__dirname, "../../public/tray-icon.ico")
  return path.join(__dirname, "../../public/tray-icon.png")
}

function createTray() {
  const icon = nativeImage.createFromPath(getIconPath()).resize({ width: 16, height: 16 })
  tray = new Tray(icon)
  tray.setToolTip("ProjectsReport")
  updateTrayMenu()

  tray.on("click", () => {
    if (store.get("token")) {
      toggleRecorder()
    } else {
      openLogin()
    }
  })
}

function updateTrayMenu() {
  const isLoggedIn = Boolean(store.get("token"))
  const menu = Menu.buildFromTemplate([
    {
      label: isLoggedIn ? "Gravar Report" : "Entrar",
      click: isLoggedIn ? toggleRecorder : openLogin,
    },
    { type: "separator" },
    {
      label: "Abrir Painel Web",
      click: () => shell.openExternal(store.get("webAppUrl")),
      enabled: isLoggedIn,
    },
    { type: "separator" },
    {
      label: "Sair da conta",
      click: handleSignOut,
      enabled: isLoggedIn,
    },
    {
      label: "Fechar app",
      click: () => {
        isQuitting = true
        app.quit()
      },
    },
  ])
  tray?.setContextMenu(menu)
}

function createRecorderWindow() {
  recorderWindow = new BrowserWindow({
    width: 420,
    height: 520,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    frame: false,
    transparent: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
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

  recorderWindow.on("blur", () => {
    recorderWindow?.hide()
  })

  recorderWindow.on("closed", () => {
    recorderWindow = null
  })
}

function toggleRecorder() {
  if (!recorderWindow || recorderWindow.isDestroyed()) {
    createRecorderWindow()
    positionNearTray()
    recorderWindow?.show()
  } else if (recorderWindow.isVisible()) {
    recorderWindow.hide()
  } else {
    positionNearTray()
    recorderWindow.show()
  }
}

function positionNearTray() {
  if (!tray || !recorderWindow) return
  const trayBounds = tray.getBounds()
  const windowBounds = recorderWindow.getBounds()

  const x = Math.round(trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2)
  const y = process.platform === "darwin"
    ? trayBounds.y + trayBounds.height + 4
    : trayBounds.y - windowBounds.height - 4

  recorderWindow.setPosition(x, Math.max(y, 0))
}

function openLogin() {
  if (loginWindow && !loginWindow.isDestroyed()) {
    loginWindow.focus()
    return
  }

  loginWindow = new BrowserWindow({
    width: 420,
    height: 600,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (RENDERER_URL) {
    loginWindow.loadURL(RENDERER_URL + "/login")
  } else {
    loginWindow.loadFile(path.join(__dirname, "../../dist/index.html"), { hash: "/login" })
  }

  loginWindow.on("closed", () => {
    loginWindow = null
  })
}

function handleSignOut() {
  store.set("token", null)
  store.set("userId", null)
  store.set("defaultProjectId", null)
  updateTrayMenu()
}

// IPC Handlers
ipcMain.handle("store:get", (_event, key: keyof StoreSchema) => store.get(key))
ipcMain.handle("store:set", (_event, key: keyof StoreSchema, value: string | null) => {
  store.set(key, value as never)
  if (key === "token") updateTrayMenu()
})

ipcMain.handle("window:hide-recorder", () => recorderWindow?.hide())
ipcMain.handle("window:close-login", () => loginWindow?.close())

ipcMain.handle("notify", (_event, title: string, body: string) => {
  new Notification({ title, body }).show()
})

ipcMain.handle("open-web", (_event, path: string) => {
  shell.openExternal(store.get("webAppUrl") + path)
})

app.whenReady().then(() => {
  createTray()

  globalShortcut.register("CommandOrControl+Shift+R", () => {
    if (store.get("token")) toggleRecorder()
  })

  app.on("activate", () => {
    if (!recorderWindow) createRecorderWindow()
  })
})

app.on("window-all-closed", (e: Event) => {
  e.preventDefault() // Keep app running in tray
})

app.on("before-quit", () => {
  isQuitting = true
})

app.on("will-quit", () => {
  globalShortcut.unregisterAll()
})
