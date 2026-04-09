"use strict";
const electron = require("electron");
const path = require("path");
const Store = require("electron-store");
const gotLock = electron.app.requestSingleInstanceLock();
if (!gotLock) {
  electron.app.quit();
  process.exit(0);
}
const store = new Store({
  defaults: {
    token: null,
    userId: null,
    webAppUrl: process.env.VITE_WEB_APP_URL ?? "http://localhost:3000",
    defaultProjectId: null
  }
});
let tray = null;
let recorderWindow = null;
let loginWindow = null;
const RENDERER_URL = process.env.VITE_DEV_SERVER_URL;
function getIconPath() {
  if (process.platform === "darwin") return path.join(__dirname, "../../public/tray-icon-mac.png");
  if (process.platform === "win32") return path.join(__dirname, "../../public/tray-icon.ico");
  return path.join(__dirname, "../../public/tray-icon.png");
}
function createTray() {
  const icon = electron.nativeImage.createFromPath(getIconPath()).resize({ width: 16, height: 16 });
  tray = new electron.Tray(icon);
  tray.setToolTip("ProjectsReport");
  updateTrayMenu();
  tray.on("click", () => {
    if (store.get("token")) {
      toggleRecorder();
    } else {
      openLogin();
    }
  });
}
function updateTrayMenu() {
  const isLoggedIn = Boolean(store.get("token"));
  const menu = electron.Menu.buildFromTemplate([
    {
      label: isLoggedIn ? "Gravar Report" : "Entrar",
      click: isLoggedIn ? toggleRecorder : openLogin
    },
    { type: "separator" },
    {
      label: "Abrir Painel Web",
      click: () => electron.shell.openExternal(store.get("webAppUrl")),
      enabled: isLoggedIn
    },
    { type: "separator" },
    {
      label: "Sair da conta",
      click: handleSignOut,
      enabled: isLoggedIn
    },
    {
      label: "Fechar app",
      click: () => {
        electron.app.quit();
      }
    }
  ]);
  tray == null ? void 0 : tray.setContextMenu(menu);
}
function createRecorderWindow() {
  recorderWindow = new electron.BrowserWindow({
    width: 420,
    height: 520,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    frame: false,
    transparent: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  if (RENDERER_URL) {
    recorderWindow.loadURL(RENDERER_URL + "/recorder");
  } else {
    recorderWindow.loadFile(path.join(__dirname, "../../dist/index.html"), {
      hash: "/recorder"
    });
  }
  recorderWindow.on("blur", () => {
    recorderWindow == null ? void 0 : recorderWindow.hide();
  });
  recorderWindow.on("closed", () => {
    recorderWindow = null;
  });
}
function toggleRecorder() {
  if (!recorderWindow || recorderWindow.isDestroyed()) {
    createRecorderWindow();
    positionNearTray();
    recorderWindow == null ? void 0 : recorderWindow.show();
  } else if (recorderWindow.isVisible()) {
    recorderWindow.hide();
  } else {
    positionNearTray();
    recorderWindow.show();
  }
}
function positionNearTray() {
  if (!tray || !recorderWindow) return;
  const trayBounds = tray.getBounds();
  const windowBounds = recorderWindow.getBounds();
  const x = Math.round(trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2);
  const y = process.platform === "darwin" ? trayBounds.y + trayBounds.height + 4 : trayBounds.y - windowBounds.height - 4;
  recorderWindow.setPosition(x, Math.max(y, 0));
}
function openLogin() {
  if (loginWindow && !loginWindow.isDestroyed()) {
    loginWindow.focus();
    return;
  }
  loginWindow = new electron.BrowserWindow({
    width: 420,
    height: 600,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  if (RENDERER_URL) {
    loginWindow.loadURL(RENDERER_URL + "/login");
  } else {
    loginWindow.loadFile(path.join(__dirname, "../../dist/index.html"), { hash: "/login" });
  }
  loginWindow.on("closed", () => {
    loginWindow = null;
  });
}
function handleSignOut() {
  store.set("token", null);
  store.set("userId", null);
  store.set("defaultProjectId", null);
  updateTrayMenu();
}
electron.ipcMain.handle("store:get", (_event, key) => store.get(key));
electron.ipcMain.handle("store:set", (_event, key, value) => {
  store.set(key, value);
  if (key === "token") updateTrayMenu();
});
electron.ipcMain.handle("window:hide-recorder", () => recorderWindow == null ? void 0 : recorderWindow.hide());
electron.ipcMain.handle("window:close-login", () => loginWindow == null ? void 0 : loginWindow.close());
electron.ipcMain.handle("notify", (_event, title, body) => {
  new electron.Notification({ title, body }).show();
});
electron.ipcMain.handle("open-web", (_event, path2) => {
  electron.shell.openExternal(store.get("webAppUrl") + path2);
});
electron.app.whenReady().then(() => {
  createTray();
  electron.globalShortcut.register("CommandOrControl+Shift+R", () => {
    if (store.get("token")) toggleRecorder();
  });
  electron.app.on("activate", () => {
    if (!recorderWindow) createRecorderWindow();
  });
});
electron.app.on("window-all-closed", (e) => {
  e.preventDefault();
});
electron.app.on("before-quit", () => {
});
electron.app.on("will-quit", () => {
  electron.globalShortcut.unregisterAll();
});
