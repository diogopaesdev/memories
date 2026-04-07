import { Download, Monitor, Apple, Terminal, Mic, FileText, Zap } from "lucide-react"

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
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      {
        headers: { Accept: "application/vnd.github+json" },
        next: { revalidate: 300 }, // revalidate every 5 minutes
      }
    )
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

function getAssetsByPlatform(assets: ReleaseAsset[]) {
  return {
    windows: assets.find((a) => a.name.endsWith(".exe") && !a.name.includes("portable")),
    windowsPortable: assets.find((a) => a.name.includes("portable") || a.name.endsWith("-portable.exe")),
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
    <main className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-white">
      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-sm text-blue-400">
          <Zap className="h-3.5 w-3.5" />
          App Desktop — Capture relatórios por voz
        </div>

        <h1 className="mb-4 text-5xl font-bold tracking-tight">
          ProjectsReport
          <span className="text-blue-400"> Desktop</span>
        </h1>

        <p className="mx-auto mb-8 max-w-xl text-lg text-slate-400">
          Grave relatórios de projeto direto pelo microfone. O app fica na bandeja do sistema e converte sua voz em relatórios estruturados automaticamente.
        </p>

        {release ? (
          <div className="mb-2 text-sm text-slate-500">
            Versão atual:{" "}
            <span className="font-mono text-slate-300">{release.tag_name}</span>
            {" · "}
            <span>{formatDate(release.published_at)}</span>
          </div>
        ) : (
          <div className="mb-2 text-sm text-slate-500">Nenhuma versão publicada ainda.</div>
        )}
      </section>

      {/* Download cards */}
      {assets && (
        <section className="mx-auto max-w-4xl px-6 pb-16">
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Windows */}
            <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                  <Monitor className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <div className="font-semibold">Windows</div>
                  <div className="text-xs text-slate-400">Windows 10 / 11</div>
                </div>
              </div>

              {assets.windows ? (
                <a
                  href={assets.windows.browser_download_url}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium transition hover:bg-blue-500"
                >
                  <Download className="h-4 w-4" />
                  Instalador ({formatBytes(assets.windows.size)})
                </a>
              ) : (
                <div className="rounded-xl border border-slate-700 px-4 py-2.5 text-center text-sm text-slate-500">
                  Em breve
                </div>
              )}

              {assets.windowsPortable && (
                <a
                  href={assets.windowsPortable.browser_download_url}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
                >
                  Versão portátil
                </a>
              )}
            </div>

            {/* macOS */}
            <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-500/10">
                  <Apple className="h-5 w-5 text-slate-400" />
                </div>
                <div>
                  <div className="font-semibold">macOS</div>
                  <div className="text-xs text-slate-400">macOS 12+</div>
                </div>
              </div>

              {assets.mac ? (
                <a
                  href={assets.mac.browser_download_url}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-600 px-4 py-2.5 text-sm font-medium transition hover:bg-slate-500"
                >
                  <Download className="h-4 w-4" />
                  .dmg ({formatBytes(assets.mac.size)})
                </a>
              ) : (
                <div className="rounded-xl border border-slate-700 px-4 py-2.5 text-center text-sm text-slate-500">
                  Em breve
                </div>
              )}
            </div>

            {/* Linux */}
            <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10">
                  <Terminal className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <div className="font-semibold">Linux</div>
                  <div className="text-xs text-slate-400">AppImage</div>
                </div>
              </div>

              {assets.linux ? (
                <a
                  href={assets.linux.browser_download_url}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-medium transition hover:bg-orange-500"
                >
                  <Download className="h-4 w-4" />
                  .AppImage ({formatBytes(assets.linux.size)})
                </a>
              ) : (
                <div className="rounded-xl border border-slate-700 px-4 py-2.5 text-center text-sm text-slate-500">
                  Em breve
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
              icon: <Mic className="h-5 w-5 text-blue-400" />,
              title: "Captura por voz",
              desc: "Grave o que você fez com atalho global Ctrl+Shift+R, sem abrir o app.",
            },
            {
              icon: <Zap className="h-5 w-5 text-yellow-400" />,
              title: "IA estrutura o texto",
              desc: "A transcrição é enviada para o servidor e formatada em relatório com título e tags.",
            },
            {
              icon: <FileText className="h-5 w-5 text-green-400" />,
              title: "Sincroniza com o painel",
              desc: "Os relatórios aparecem instantaneamente no painel web vinculados ao projeto.",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-6">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-700/50">
                {f.icon}
              </div>
              <div className="mb-1 font-semibold">{f.title}</div>
              <div className="text-sm text-slate-400">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-800 py-8 text-center text-sm text-slate-600">
        ProjectsReport · {new Date().getFullYear()}
        {GITHUB_REPO && (
          <>
            {" · "}
            <a
              href={`https://github.com/${GITHUB_REPO}`}
              className="hover:text-slate-400"
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
