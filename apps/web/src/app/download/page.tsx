import type { Metadata } from "next"
import { Download, Monitor, Apple, Terminal, Mic, FileText, Zap } from "lucide-react"

export const metadata: Metadata = {
  title: "Download",
  description:
    "Download Memories Desktop for Windows, macOS and Linux. Capture project memories by voice with a global shortcut.",
}

const GITHUB_REPO = process.env.GITHUB_REPO ?? ""

interface ReleaseAsset {
  name: string
  browser_download_url: string
  size: number
}

interface GitHubRelease {
  tag_name: string
  name: string
  published_at: string
  body: string
  assets: ReleaseAsset[]
}

async function getLatestRelease(): Promise<GitHubRelease | null> {
  if (!GITHUB_REPO) return null
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=10`,
      {
        headers: { Accept: "application/vnd.github+json" },
        next: { revalidate: 300 },
      }
    )
    if (!res.ok) return null
    const releases: GitHubRelease[] = await res.json()
    // Return first release that has downloadable assets (ignores draft/empty releases)
    return releases.find((r) => r.assets.length > 0) ?? null
  } catch {
    return null
  }
}

function getAssetsByPlatform(assets: ReleaseAsset[]) {
  return {
    windows: assets.find((a) => a.name.endsWith(".exe") && !a.name.includes("portable")),
    windowsPortable: assets.find(
      (a) => a.name.includes("portable") || a.name.endsWith("-portable.exe")
    ),
    mac: assets.find((a) => a.name.endsWith(".dmg")),
    linux: assets.find((a) => a.name.endsWith(".AppImage")),
  }
}

function formatBytes(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export default async function DownloadPage() {
  const release = await getLatestRelease()
  const assets = release ? getAssetsByPlatform(release.assets) : null

  return (
    <main
      className="min-h-screen text-white"
      style={{ background: "linear-gradient(to bottom, #111110, #0d0d0c)" }}
    >
      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        {/* Logo mark */}
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: "#f5f4f0" }}>
            <svg width="44" height="44" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="3.5" fill="#1a1a1a" />
              <circle cx="20" cy="20" r="8.5" stroke="#1a1a1a" strokeWidth="1.5" opacity="0.55" />
              <circle cx="20" cy="20" r="14" stroke="#1a1a1a" strokeWidth="1" opacity="0.22" />
            </svg>
          </div>
        </div>

        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/60">
          <Zap className="h-3.5 w-3.5" />
          Desktop App — Capture memories by voice
        </div>

        <h1 className="mb-4 text-5xl font-bold tracking-tight">
          Memories{" "}
          <span style={{ color: "#9d8df8" }}>Desktop</span>
        </h1>

        <p className="mx-auto mb-8 max-w-xl text-lg" style={{ color: "#9a9590" }}>
          Record project memories through your microphone. Sits in your system tray and
          converts voice into structured records automatically.
        </p>

        {release ? (
          <div className="mb-2 text-sm" style={{ color: "#6b6960" }}>
            Current version:{" "}
            <span className="font-mono" style={{ color: "#f0ede8" }}>{release.tag_name}</span>
            {" · "}
            <span>{formatDate(release.published_at)}</span>
          </div>
        ) : (
          <div className="mb-2 text-sm" style={{ color: "#6b6960" }}>
            No version published yet.
          </div>
        )}
      </section>

      {/* Download cards */}
      {assets && (
        <section className="mx-auto max-w-4xl px-6 pb-16">
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Windows */}
            <div
              className="rounded-2xl p-6 border"
              style={{ background: "#1c1c1a", borderColor: "#2d2d2a" }}
            >
              <div className="mb-4 flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: "rgba(124,106,240,0.1)" }}
                >
                  <Monitor className="h-5 w-5" style={{ color: "#9d8df8" }} />
                </div>
                <div>
                  <div className="font-semibold" style={{ color: "#f0ede8" }}>Windows</div>
                  <div className="text-xs" style={{ color: "#6b6960" }}>Windows 10 / 11</div>
                </div>
              </div>
              {assets.windows ? (
                <a
                  href={assets.windows.browser_download_url}
                  className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-80"
                  style={{ background: "#7c6af0", color: "#fff" }}
                >
                  <Download className="h-4 w-4" />
                  Installer ({formatBytes(assets.windows.size)})
                </a>
              ) : (
                <div
                  className="rounded-xl px-4 py-2.5 text-center text-sm"
                  style={{ border: "1px solid #2d2d2a", color: "#6b6960" }}
                >
                  Coming soon
                </div>
              )}
              {assets.windowsPortable && (
                <a
                  href={assets.windowsPortable.browser_download_url}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm transition-colors hover:text-white"
                  style={{ border: "1px solid #2d2d2a", color: "#9a9590" }}
                >
                  Portable version
                </a>
              )}
            </div>

            {/* macOS */}
            <div
              className="rounded-2xl p-6 border"
              style={{ background: "#1c1c1a", borderColor: "#2d2d2a" }}
            >
              <div className="mb-4 flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <Apple className="h-5 w-5" style={{ color: "#9a9590" }} />
                </div>
                <div>
                  <div className="font-semibold" style={{ color: "#f0ede8" }}>macOS</div>
                  <div className="text-xs" style={{ color: "#6b6960" }}>macOS 12+</div>
                </div>
              </div>
              {assets.mac ? (
                <a
                  href={assets.mac.browser_download_url}
                  className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-80"
                  style={{ background: "#2d2d2a", color: "#f0ede8" }}
                >
                  <Download className="h-4 w-4" />
                  .dmg ({formatBytes(assets.mac.size)})
                </a>
              ) : (
                <div
                  className="rounded-xl px-4 py-2.5 text-center text-sm"
                  style={{ border: "1px solid #2d2d2a", color: "#6b6960" }}
                >
                  Coming soon
                </div>
              )}
            </div>

            {/* Linux */}
            <div
              className="rounded-2xl p-6 border"
              style={{ background: "#1c1c1a", borderColor: "#2d2d2a" }}
            >
              <div className="mb-4 flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: "rgba(251,191,36,0.08)" }}
                >
                  <Terminal className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <div className="font-semibold" style={{ color: "#f0ede8" }}>Linux</div>
                  <div className="text-xs" style={{ color: "#6b6960" }}>AppImage</div>
                </div>
              </div>
              {assets.linux ? (
                <a
                  href={assets.linux.browser_download_url}
                  className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-80 text-amber-900"
                  style={{ background: "rgb(251 191 36)", color: "#1a1a1a" }}
                >
                  <Download className="h-4 w-4" />
                  .AppImage ({formatBytes(assets.linux.size)})
                </a>
              ) : (
                <div
                  className="rounded-xl px-4 py-2.5 text-center text-sm"
                  style={{ border: "1px solid #2d2d2a", color: "#6b6960" }}
                >
                  Coming soon
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      <section className="mx-auto max-w-4xl px-6 pb-24">
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            {
              icon: <Mic className="h-5 w-5" style={{ color: "#9d8df8" }} />,
              title: "Voice capture",
              desc: "Record what you did with global shortcut Ctrl+Shift+R, without opening the app.",
            },
            {
              icon: <Zap className="h-5 w-5 text-amber-400" />,
              title: "AI structures the text",
              desc: "The transcription is processed and formatted into a memory with title and context.",
            },
            {
              icon: <FileText className="h-5 w-5 text-emerald-400" />,
              title: "Syncs with dashboard",
              desc: "Memories appear instantly in the web dashboard linked to the project.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl p-6 border"
              style={{ background: "rgba(255,255,255,0.02)", borderColor: "#2d2d2a" }}
            >
              <div
                className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ background: "rgba(255,255,255,0.04)" }}
              >
                {f.icon}
              </div>
              <div className="mb-1 font-semibold" style={{ color: "#f0ede8" }}>{f.title}</div>
              <div className="text-sm" style={{ color: "#6b6960" }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <footer
        className="border-t py-8 text-center text-sm"
        style={{ borderColor: "#1c1c1a", color: "#4a4a47" }}
      >
        Memories · {new Date().getFullYear()}
        {GITHUB_REPO && (
          <>
            {" · "}
            <a
              href={`https://github.com/${GITHUB_REPO}`}
              className="hover:text-white transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </>
        )}
      </footer>
    </main>
  )
}
