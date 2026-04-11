import Link from "next/link"
import { db } from "@/lib/firebase-admin"
import { requireSession } from "@/lib/session"
import { ensurePersonalTeam } from "@/lib/teams"
import { ProjectIconDisplay } from "./project-icon"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { Project } from "@projectsreport/shared"
import { ArrowRight, Mic } from "lucide-react"
import { type Lang, serverT } from "@/lib/lang"

interface ProjectsListProps {
  baseHref?: string
  teamId?: string
  lang?: Lang
}

const COLOR_ACCENT: Record<string, string> = {
  blue: "#3b82f6",
  green: "#22c55e",
  violet: "#8b5cf6",
  red: "#ef4444",
  orange: "#f97316",
  amber: "#f59e0b",
  teal: "#14b8a6",
  pink: "#ec4899",
  slate: "#64748b",
}

export async function ProjectsList({ baseHref = "/memories", teamId, lang = "pt" }: ProjectsListProps = {}) {
  const t = serverT(lang)
  const session = await requireSession()
  const resolvedTeamId = teamId ?? await ensurePersonalTeam(session.user.id)

  const snapshot = await db
    .collection("projects")
    .where("teamId", "==", resolvedTeamId)
    .orderBy("createdAt", "desc")
    .get()

  const legacySnap = !teamId
    ? await db.collection("projects")
        .where("ownerId", "==", session.user.id)
        .orderBy("createdAt", "desc")
        .get()
        .catch(() => null)
    : null

  const fromTeam: Project[] = snapshot.docs.map((doc) => ({
    id: doc.id, ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate(),
  })) as Project[]

  const legacy: Project[] = (legacySnap?.docs ?? [])
    .filter((d) => !d.data().teamId)
    .map((doc) => ({
      id: doc.id, ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Project[]

  const seen = new Set(fromTeam.map((p) => p.id))
  const projects = [...fromTeam, ...legacy.filter((p) => !seen.has(p.id))]

  const locale = lang === "en" ? undefined : ptBR

  if (projects.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-28 text-center rounded-2xl border"
        style={{ background: "var(--mem-surface)", borderColor: "var(--mem-border)" }}
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: "var(--mem-surface-2)" }}
        >
          <Mic className="w-5 h-5" style={{ color: "var(--mem-ink-3)" }} />
        </div>
        <h3 className="text-base font-semibold mb-1" style={{ color: "var(--mem-ink)" }}>
          {t("memories.empty.title")}
        </h3>
        <p className="text-sm max-w-xs leading-relaxed" style={{ color: "var(--mem-ink-2)" }}>
          {t("memories.empty.desc")}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--mem-border)" }}>
      {projects.map((project, i) => {
        const accent = COLOR_ACCENT[project.color ?? "slate"] ?? "#64748b"
        const isLast = i === projects.length - 1
        const count = project.reportCount ?? 0
        const ago = formatDistanceToNow(project.createdAt, { locale, addSuffix: true })

        return (
          <Link key={project.id} href={`${baseHref}/${project.id}`} className="group block">
            <div
              className="relative flex items-center gap-4 px-5 py-4 transition-colors"
              style={{
                background: "var(--mem-surface)",
                borderBottom: isLast ? undefined : "1px solid var(--mem-border)",
              }}
            >
              {/* Hover overlay */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: "var(--mem-surface-2)" }} />

              {/* Color accent */}
              <div className="w-0.5 h-10 rounded-full shrink-0 relative z-10" style={{ background: accent }} />

              {/* Icon */}
              <div className="relative z-10">
                <ProjectIconDisplay icon={project.icon} color={project.color} size="sm" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 relative z-10">
                <p className="font-semibold text-[15px] leading-snug truncate" style={{ color: "var(--mem-ink)" }}>
                  {project.name}
                </p>
                {project.description && (
                  <p className="text-sm truncate mt-0.5" style={{ color: "var(--mem-ink-2)" }}>
                    {project.description}
                  </p>
                )}
              </div>

              {/* Meta */}
              <div className="text-right shrink-0 relative z-10">
                <p className="text-sm font-medium tabular-nums" style={{ color: "var(--mem-ink)" }}>
                  {count}{" "}
                  <span className="font-normal" style={{ color: "var(--mem-ink-3)" }}>
                    {count === 1 ? t("project.memory") : t("project.memories")}
                  </span>
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--mem-ink-3)" }}>{ago}</p>
              </div>

              <ArrowRight
                className="w-4 h-4 shrink-0 relative z-10 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200"
                style={{ color: "var(--mem-ink-3)" }}
              />
            </div>
          </Link>
        )
      })}
    </div>
  )
}
