import { Suspense } from "react"
import { ProjectsList } from "@/components/projects/projects-list"
import { CreateProjectButton } from "@/components/projects/create-project-button"
import { requireSession } from "@/lib/session"
import { ensurePersonalTeam } from "@/lib/teams"
import { db } from "@/lib/firebase-admin"
import { getServerLang, serverT } from "@/lib/lang"

interface Props {
  searchParams: Promise<{ team?: string }>
}

async function getStats(teamId: string) {
  const projectsSnap = await db.collection("projects").where("teamId", "==", teamId).get()
  const projects = projectsSnap.docs
  let reportCount = 0
  let voiceCount = 0

  await Promise.all(
    projects.slice(0, 20).map(async (p) => {
      const reports = await db.collection("projects").doc(p.id).collection("reports").get()
      reportCount += reports.size
      voiceCount += reports.docs.filter((r) => r.data().source === "voice").length
    })
  )
  return { projectCount: projects.length, reportCount, voiceCount }
}

export default async function MemoriesPage({ searchParams }: Props) {
  const { team: teamId } = await searchParams
  const session = await requireSession()
  const resolvedTeamId = teamId ?? await ensurePersonalTeam(session.user.id)
  const lang = await getServerLang()
  const t = serverT(lang)

  const stats = await getStats(resolvedTeamId).catch(() => ({
    projectCount: 0,
    reportCount: 0,
    voiceCount: 0,
  }))

  return (
    <div>
      {/* Page header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p
            className="text-xs font-medium uppercase tracking-widest mb-3"
            style={{ color: "var(--mem-ink-3)", letterSpacing: "0.1em" }}
          >
            {t("memories.workspace")}
          </p>
          <h1 className="text-4xl font-bold tracking-tight" style={{ color: "var(--mem-ink)" }}>
            {t("memories.title")}
          </h1>
          <p className="mt-1.5 text-sm" style={{ color: "var(--mem-ink-2)" }}>
            {t("memories.subtitle")}
          </p>
        </div>
        <CreateProjectButton teamId={teamId} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: t("stats.projects"), value: stats.projectCount },
          { label: t("stats.memories"), value: stats.reportCount },
          { label: t("stats.by-voice"), value: stats.voiceCount },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl px-5 py-4 border"
            style={{ background: "var(--mem-surface)", borderColor: "var(--mem-border)" }}
          >
            <p
              className="text-3xl font-bold tracking-tight tabular-nums"
              style={{ color: "var(--mem-ink)" }}
            >
              {s.value}
            </p>
            <p
              className="text-xs mt-1 font-medium uppercase tracking-wider"
              style={{ color: "var(--mem-ink-3)" }}
            >
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* List */}
      <Suspense fallback={<MemoriesListSkeleton />}>
        <ProjectsList baseHref="/memories" teamId={teamId} lang={lang} />
      </Suspense>
    </div>
  )
}

function MemoriesListSkeleton() {
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--mem-border)" }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-5 py-4 animate-pulse"
          style={{
            background: "var(--mem-surface)",
            borderBottom: i < 4 ? "1px solid var(--mem-border)" : undefined,
          }}
        >
          <div className="w-0.5 h-10 rounded-full" style={{ background: "var(--mem-surface-2)" }} />
          <div className="w-9 h-9 rounded-xl" style={{ background: "var(--mem-surface-2)" }} />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-48 rounded" style={{ background: "var(--mem-surface-2)" }} />
            <div className="h-3 w-72 rounded" style={{ background: "var(--mem-surface-2)" }} />
          </div>
          <div className="text-right space-y-2">
            <div className="h-4 w-16 rounded ml-auto" style={{ background: "var(--mem-surface-2)" }} />
            <div className="h-3 w-12 rounded ml-auto" style={{ background: "var(--mem-surface-2)" }} />
          </div>
        </div>
      ))}
    </div>
  )
}
