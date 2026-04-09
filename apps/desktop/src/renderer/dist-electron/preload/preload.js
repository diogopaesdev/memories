"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electron", {
  store: {
    get: (key) => electron.ipcRenderer.invoke("store:get", key),
    set: (key, value) => electron.ipcRenderer.invoke("store:set", key, value)
  },
  window: {
    hideRecorder: () => electron.ipcRenderer.invoke("window:hide-recorder"),
    closeLogin: () => electron.ipcRenderer.invoke("window:close-login")
  },
  notify: (title, body) => electron.ipcRenderer.invoke("notify", title, body),
  openWeb: (path) => electron.ipcRenderer.invoke("open-web", path)
});
