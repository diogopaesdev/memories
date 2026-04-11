import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/session"
import { LoginForm } from "@/components/auth/login-form"

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Memories and start capturing project memories by voice.",
}

export default async function LoginPage() {
  const session = await getServerSession()
  if (session) redirect("/projects")

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--mem-bg)" }}
    >
      <div className="w-full max-w-md">
        {/* Logo mark */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-5">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "var(--mem-ink)" }}
            >
              <svg width="36" height="36" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="20" cy="20" r="3.5" fill="var(--mem-bg)" />
                <circle cx="20" cy="20" r="8.5" stroke="var(--mem-bg)" strokeWidth="1.5" opacity="0.55" />
                <circle cx="20" cy="20" r="14" stroke="var(--mem-bg)" strokeWidth="1" opacity="0.22" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--mem-ink)" }}>
            Memories
          </h1>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--mem-ink-2)" }}>
            Capture project memories by voice,<br />organized and shared with your team
          </p>
        </div>

        <LoginForm />
      </div>
    </div>
  )
}
