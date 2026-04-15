import { requireSession } from "@/lib/session"
import { DownloadAppLink } from "@/components/memories/download-app-link"
import { ensurePersonalTeam } from "@/lib/teams"
import { db } from "@/lib/firebase-admin"
import { getServerLang, serverT } from "@/lib/lang"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ConstellationView, type ConstellationProject } from "@/components/memories/constellation-view"

interface Props {
  searchParams: Promise<{ team?: string }>
}

async function getProjectsWithStats(teamId: string, userId: string, lang: string) {
  type Raw = { id: string; name: string; description?: string; color?: string; reportCount?: number; createdAt?: { toDate?: () => Date }; teamId?: string }

  const [teamSnap, legacySnap] = await Promise.all([
    db.collection("projects").where("teamId", "==", teamId).orderBy("createdAt", "desc").get(),
    db.collection("projects").where("ownerId", "==", userId).orderBy("createdAt", "desc").get().catch(() => null),
  ])

  const fromTeam: Raw[] = teamSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Raw))
  const legacy: Raw[]   = (legacySnap?.docs ?? []).filter((d) => !d.data().teamId).map((d) => ({ id: d.id, ...d.data() } as Raw))

  const seen = new Set(fromTeam.map((p) => p.id))
  const all  = [...fromTeam, ...legacy.filter((p) => !seen.has(p.id))]

  const locale = lang === "en" ? undefined : ptBR
  let totalReports = 0
  let totalVoice   = 0

  const results = await Promise.all(
    all.slice(0, 20).map((p) =>
      db.collection("projects").doc(p.id).collection("reports")
        .orderBy("createdAt", "desc").limit(10).get()
        .then((s) => {
          totalReports += s.size
          totalVoice   += s.docs.filter((r) => r.data().source === "voice").length
          const memories = s.docs.map((r) => {
            const rData = r.data()
            const rDate = (rData.createdAt as { toDate?: () => Date } | undefined)?.toDate?.() ?? new Date()
            return {
              ts:    rDate.getTime(),
              title: (rData.title as string | undefined) ?? "Sem título",
              ago:   formatDistanceToNow(rDate, { locale, addSuffix: true }),
              href:  `/memories/${p.id}/reports/${r.id}`,
            }
          })
          return { count: s.size, memories }
        })
        .catch(() => ({ count: 0, memories: [] }))
    )
  )

  const projects: ConstellationProject[] = all.map((p, i) => {
    const date = p.createdAt?.toDate?.() ?? new Date()
    return {
      id:          p.id,
      name:        p.name,
      description: p.description ?? null,
      color:       p.color ?? null,
      reportCount: results[i]?.count ?? p.reportCount ?? 0,
      href:        `/memories/${p.id}`,
      ago:         formatDistanceToNow(date, { locale, addSuffix: true }),
      createdAt:   date.getTime(),
      memories:    results[i]?.memories ?? [],
    }
  })

  return { projects, projectCount: all.length, reportCount: totalReports, voiceCount: totalVoice }
}

export default async function MemoriesPage({ searchParams }: Props) {
  const { team: teamId } = await searchParams
  const session          = await requireSession()
  const resolvedTeamId   = teamId ?? await ensurePersonalTeam(session.user.id)
  const lang             = await getServerLang()
  const t                = serverT(lang)

  const [{ projects, projectCount, reportCount, voiceCount }, teamDoc] = await Promise.all([
    getProjectsWithStats(resolvedTeamId, session.user.id, lang)
      .catch(() => ({ projects: [] as ConstellationProject[], projectCount: 0, reportCount: 0, voiceCount: 0 })),
    db.collection("teams").doc(resolvedTeamId).get().catch(() => null),
  ])
  const teamName = (teamDoc?.data()?.name as string | undefined) ?? undefined

  const stats = [
    { label: t("stats.projects"), value: projectCount },
    { label: t("stats.memories"), value: reportCount },
    { label: t("stats.by-voice"), value: voiceCount },
  ]

  return (
    /*
     * Fixed full-viewport container — sits above the layout background but
     * below the floating AppHeader (z-50). Constellation covers 100vh.
     */
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 5,
        background: "#080807",
        overflow: "hidden",
      }}
    >
      {/* ── Stats chips — bottom center ── */}
      <div
        style={{
          position: "absolute", bottom: 36, left: "50%", transform: "translateX(-50%)",
          zIndex: 20, display: "flex", gap: 8, alignItems: "center",
        }}
      >
        {stats.map((s) => (
          <div
            key={s.label}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 12,
              padding: "10px 18px",
              textAlign: "center",
              backdropFilter: "blur(12px)",
            }}
          >
            <p style={{ fontSize: 22, fontWeight: 700, color: "#f0ede8", lineHeight: 1 }}>
              {s.value}
            </p>
            <p style={{
              fontSize: 9, color: "#2e2e2b",
              letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 4,
            }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* ── Download app hint — bottom right ── */}
      <div style={{ position: "absolute", bottom: 36, right: 48, zIndex: 20 }}>
        <DownloadAppLink />
      </div>

      {/* ── Constellation fills everything ── */}
      <div style={{ width: "100%", height: "100%" }}>
        <ConstellationView projects={projects} teamName={teamName} />
      </div>
    </div>
  )
}
