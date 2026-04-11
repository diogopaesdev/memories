import { notFound } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/firebase-admin"
import { requireSession } from "@/lib/session"
import { ProjectIconDisplay } from "@/components/projects/project-icon"
import { ReportsList } from "@/components/reports/reports-list"
import { CreateReportButton } from "@/components/reports/create-report-button"
import { ProjectActions } from "@/components/projects/project-actions"
import type { Project } from "@projectsreport/shared"
import { ArrowLeft, FileText, Mic } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { getServerLang, serverT } from "@/lib/lang"

const COLOR_BG: Record<string, string> = {
  blue: "rgba(59,130,246,0.08)",
  green: "rgba(34,197,94,0.08)",
  violet: "rgba(139,92,246,0.08)",
  red: "rgba(239,68,68,0.08)",
  orange: "rgba(249,115,22,0.08)",
  amber: "rgba(245,158,11,0.08)",
  teal: "rgba(20,184,166,0.08)",
  pink: "rgba(236,72,153,0.08)",
  slate: "rgba(100,116,139,0.08)",
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

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProjectPage({ params }: Props) {
  const session = await requireSession()
  const { id } = await params
  const lang = await getServerLang()
  const t = serverT(lang)

  const doc = await db.collection("projects").doc(id).get()
  if (!doc.exists || doc.data()?.ownerId !== session.user.id) notFound()

  const reportsSnap = await db.collection("projects").doc(id).collection("reports").get()
  const voiceCount = reportsSnap.docs.filter((r) => r.data().source === "voice").length

  const project: Project = {
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data()?.createdAt?.toDate(),
    updatedAt: doc.data()?.updatedAt?.toDate(),
  } as Project

  const accent = COLOR_ACCENT[project.color ?? "slate"] ?? "#64748b"
  const bg = COLOR_BG[project.color ?? "slate"] ?? "rgba(100,116,139,0.08)"
  const locale = lang === "en" ? undefined : ptBR

  return (
    <div>
      {/* Back */}
      <Link
        href="/memories"
        className="inline-flex items-center gap-1.5 text-sm mb-6 transition-opacity hover:opacity-70"
        style={{ color: "var(--mem-ink-3)" }}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {t("project.back")}
      </Link>

      {/* Project header */}
      <div
        className="rounded-2xl p-6 mb-6 border"
        style={{ background: bg, borderColor: `${accent}22` }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <ProjectIconDisplay icon={project.icon} color={project.color} size="lg" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--mem-ink)" }}>
                {project.name}
              </h1>
              {project.description && (
                <p className="text-sm mt-1 leading-relaxed" style={{ color: "var(--mem-ink-2)" }}>
                  {project.description}
                </p>
              )}
              <div className="flex items-center gap-4 mt-3">
                <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--mem-ink-3)" }}>
                  <FileText className="w-3.5 h-3.5" />
                  {reportsSnap.size} {reportsSnap.size === 1 ? t("project.memory") : t("project.memories")}
                </span>
                {voiceCount > 0 && (
                  <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--mem-ink-3)" }}>
                    <Mic className="w-3.5 h-3.5" />
                    {voiceCount} {t("project.by-voice")}
                  </span>
                )}
                <span className="text-xs" style={{ color: "var(--mem-ink-3)" }}>
                  {t("project.created")} {format(project.createdAt, "dd 'de' MMMM, yyyy", { locale })}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <CreateReportButton projectId={project.id} />
            <ProjectActions project={project} />
          </div>
        </div>
      </div>

      {/* Section divider */}
      <div className="flex items-center gap-3 mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--mem-ink-3)" }}>
          {t("project.records-section")}
        </p>
        <div className="flex-1 h-px" style={{ background: "var(--mem-border)" }} />
      </div>

      <ReportsList projectId={project.id} baseHref={`/memories/${id}`} lang={lang} />
    </div>
  )
}
