import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import electron from "vite-plugin-electron"
import renderer from "vite-plugin-electron-renderer"
import path from "path"
import fs from "fs"
import { spawn } from "child_process"

// vite-plugin-electron uses `await import("electron")` which fails on Node.js v24.
// We resolve the Electron binary directly from path.txt (what the electron npm package does
// internally) and spawn it ourselves, bypassing the ESM import() entirely.
const electronRoot = path.resolve(__dirname, "../../node_modules/electron")
const electronBin = path.join(
  electronRoot,
  "dist",
  fs.readFileSync(path.join(electronRoot, "path.txt"), "utf-8").trim()
)

let electronProcess: ReturnType<typeof spawn> | null = null
let spawnTimer: ReturnType<typeof setTimeout> | null = null

let devServerUrl = ""

function startElectron() {
  if (spawnTimer) { clearTimeout(spawnTimer); spawnTimer = null }
  if (electronProcess) { electronProcess.kill(); electronProcess = null }
  // Delay so the previous process releases the single-instance lock before we start a new one
  spawnTimer = setTimeout(() => {
    spawnTimer = null
    electronProcess = spawn(electronBin, ["."], {
      stdio: "inherit",
      env: {
        ...process.env,
        // vite-plugin-electron sets this on process.env but the build doesn't replace it;
        // pass it explicitly so Electron picks it up at runtime
        VITE_DEV_SERVER_URL: process.env.VITE_DEV_SERVER_URL ?? devServerUrl,
      },
    })
    electronProcess.on("exit", () => { electronProcess = null })
  }, 600)
}

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: path.resolve(__dirname, "src/main/index.ts"),
        onstart: startElectron,
        vite: {
          build: {
            outDir: path.resolve(__dirname, "dist-electron/main"),
            rollupOptions: {
              external: ["electron", "electron-store", "ws", "bufferutil", "utf-8-validate"],
            },
          },
        },
      },
      {
        entry: path.resolve(__dirname, "src/main/preload.ts"),
        onstart(options) {
          options.reload()
        },
        vite: {
          build: {
            outDir: path.resolve(__dirname, "dist-electron/preload"),
            rollupOptions: {
              external: ["electron"],
            },
          },
        },
      },
    ]),
    renderer(),
    {
      name: "capture-dev-server-url",
      configureServer(server) {
        server.httpServer?.once("listening", () => {
          const addr = server.httpServer!.address()
          if (addr && typeof addr === "object") {
            devServerUrl = `http://localhost:${addr.port}`
          }
        })
      },
    },
  ],
  root: path.resolve(__dirname, "src/renderer"),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src/renderer/src"),
      "@projectsreport/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
})
