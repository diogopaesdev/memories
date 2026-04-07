import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import electron from "vite-plugin-electron"
import renderer from "vite-plugin-electron-renderer"
import path from "path"

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: "src/main/index.ts",
        vite: {
          build: {
            outDir: "dist-electron/main",
            rollupOptions: {
              external: ["electron", "electron-store"],
            },
          },
        },
      },
      {
        entry: "src/main/preload.ts",
        onstart(options) {
          options.reload()
        },
        vite: {
          build: {
            outDir: "dist-electron/preload",
            rollupOptions: {
              external: ["electron"],
            },
          },
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src/renderer/src"),
      "@projectsreport/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
    },
  },
  root: "src/renderer",
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
})
