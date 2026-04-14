import Link from "next/link"
import { redirect } from "next/navigation"
import { Download } from "lucide-react"
import { getServerSession } from "@/lib/session"
import { GoogleLoginButton } from "@/components/auth/google-login-button"

export default async function HomePage() {
  const session = await getServerSession()
  if (session) redirect("/memories")

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center text-white px-6"
      style={{ background: "linear-gradient(to bottom, #111110, #0d0d0c)" }}
    >
      {/* Logo */}
      <div className="mb-8 w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: "#f5f4f0" }}>
        <svg width="44" height="44" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="3.5" fill="#1a1a1a" />
          <circle cx="20" cy="20" r="8.5" stroke="#1a1a1a" strokeWidth="1.5" opacity="0.55" />
          <circle cx="20" cy="20" r="14" stroke="#1a1a1a" strokeWidth="1" opacity="0.22" />
        </svg>
      </div>

      <h1 className="text-5xl font-bold tracking-tight mb-3">Memories</h1>
      <p className="text-lg mb-10 max-w-sm text-center" style={{ color: "#9a9590" }}>
        Capture e recupere suas memórias de trabalho por voz.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/download"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-85"
          style={{ background: "#7c6af0", color: "#fff" }}
        >
          <Download className="w-4 h-4" />
          Baixar app
        </Link>

        <GoogleLoginButton />
      </div>

      <footer className="absolute bottom-8 text-xs" style={{ color: "#3a3a37" }}>
        Memories · {new Date().getFullYear()}
      </footer>
    </main>
  )
}
