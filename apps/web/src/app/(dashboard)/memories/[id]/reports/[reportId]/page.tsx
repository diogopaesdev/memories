import { notFound } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/firebase-admin"
import { requireSession } from "@/lib/session"
import { ReportActions } from "@/components/reports/report-actions"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { Report } from "@projectsreport/shared"
import { ArrowLeft, Mic, Pencil } from "lucide-react"
import { getServerLang, serverT } from "@/lib/lang"

interface Props {
  params: Promise<{ id: string; reportId: string }>
}

export default async function ReportPage({ params }: Props) {
  const session = await requireSession()
  const { id, reportId } = await params
  const lang = await getServerLang()
  const t = serverT(lang)

  const project = await db.collection("projects").doc(id).get()
  if (!project.exists || project.data()?.ownerId !== session.user.id) notFound()

  const doc = await db.collection("projects").doc(id).collection("reports").doc(reportId).get()
  if (!doc.exists) notFound()

  const report: Report = {
    id: doc.id,
    projectId: id,
    ...doc.data(),
    createdAt: doc.data()?.createdAt?.toDate(),
    updatedAt: doc.data()?.updatedAt?.toDate(),
  } as Report

  const isVoice = report.source === "voice"
  const locale = lang === "en" ? undefined : ptBR

  return (
    <div className="max-w-2xl">
      {/* Back */}
      <Link
        href={`/memories/${id}`}
        className="inline-flex items-center gap-1.5 text-sm mb-8 transition-opacity hover:opacity-70"
        style={{ color: "var(--mem-ink-3)" }}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {project.data()?.name}
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
              style={{
                background: isVoice ? "var(--mem-accent-muted)" : "var(--mem-surface-2)",
                color: isVoice ? "var(--mem-accent)" : "var(--mem-ink-2)",
              }}
            >
              {isVoice ? <Mic className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
              {isVoice ? t("report.voice") : t("report.manual")}
            </span>
            <span
              className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full"
              style={{
                background: report.status === "published" ? "rgba(34,197,94,0.1)" : "var(--mem-surface-2)",
                color: report.status === "published" ? "#16a34a" : "var(--mem-ink-3)",
              }}
            >
              {report.status === "published" ? t("report.published") : t("report.draft")}
            </span>
          </div>
          <ReportActions report={report} projectId={id} />
        </div>

        <h1 className="text-3xl font-bold tracking-tight leading-tight mb-3" style={{ color: "var(--mem-ink)" }}>
          {report.title}
        </h1>

        <p className="text-sm" style={{ color: "var(--mem-ink-3)" }}>
          {format(report.createdAt, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale })}
        </p>

        {report.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {report.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ background: "var(--mem-surface-2)", color: "var(--mem-ink-2)" }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="h-px mb-8" style={{ background: "var(--mem-border)" }} />

      {/* Content */}
      <div
        className="text-base whitespace-pre-wrap"
        style={{ color: "var(--mem-ink)", lineHeight: "1.9" }}
      >
        {report.content}
      </div>

      {/* Transcript */}
      {report.rawTranscript && (
        <div
          className="mt-10 p-5 rounded-xl border"
          style={{ background: "var(--mem-surface)", borderColor: "var(--mem-border)" }}
        >
          <h3
            className="text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2"
            style={{ color: "var(--mem-ink-3)" }}
          >
            <Mic className="w-3.5 h-3.5" />
            {t("report.transcript")}
          </h3>
          <p className="text-sm italic leading-relaxed" style={{ color: "var(--mem-ink-2)" }}>
            {report.rawTranscript}
          </p>
        </div>
      )}
    </div>
  )
}
