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
    <div className="min-h-screen" style={{ background: "#f5f4f0" }}>
      <Suspense fallback={<div className="h-14 border-b" style={{ background: "#f5f4f0", borderColor: "#e8e6e0" }} />}>
        <AppHeader user={session.user} teams={teams} />
      </Suspense>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
