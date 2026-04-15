import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/session"
import { getUserTeams } from "@/lib/teams"
import { AppHeader } from "@/components/layout/app-header"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession()
  if (!session) redirect("/login")

  const teams = await getUserTeams(session.user.id)

  return (
    <div className="min-h-screen" style={{ background: "var(--mem-bg)" }}>
      <Suspense fallback={<div className="h-14" />}>
        <AppHeader user={session.user} teams={teams} />
      </Suspense>
      {/* pt-14 compensates for the fixed header (h-14 = 56px) */}
      <main className="max-w-6xl mx-auto px-6 pt-14 py-8">{children}</main>
    </div>
  )
}
