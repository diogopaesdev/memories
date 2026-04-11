import Link from "next/link"
import { db } from "@/lib/firebase-admin"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { Report } from "@projectsreport/shared"
import { ChevronRight, Mic, Pencil } from "lucide-react"
import { type Lang, serverT } from "@/lib/lang"

interface ReportsListProps {
  projectId: string
  baseHref?: string
  lang?: Lang
}

export async function ReportsList({ projectId, baseHref = `/projects/${projectId}`, lang = "pt" }: ReportsListProps) {
  const t = serverT(lang)
  const locale = lang === "en" ? undefined : ptBR

  const snapshot = await db
    .collection("projects")
    .doc(projectId)
    .collection("reports")
    .orderBy("createdAt", "desc")
    .get()

  const reports: Report[] = snapshot.docs.map((doc) => ({
    id: doc.id,
    projectId,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate(),
  })) as Report[]

  if (reports.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-24 text-center rounded-2xl border-2 border-dashed"
        style={{ borderColor: "var(--mem-border)" }}
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: "var(--mem-surface-2)" }}
        >
          <Mic className="w-5 h-5" style={{ color: "var(--mem-ink-3)" }} />
        </div>
        <h3 className="text-base font-semibold mb-1" style={{ color: "var(--mem-ink)" }}>
          {t("report.empty.title")}
        </h3>
        <p className="text-sm max-w-xs leading-relaxed" style={{ color: "var(--mem-ink-2)" }}>
          {t("report.empty.desc")}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {reports.map((report) => {
        const isVoice = report.source === "voice"
        const ago = formatDistanceToNow(report.createdAt, { locale, addSuffix: true })

        return (
          <Link key={report.id} href={`${baseHref}/reports/${report.id}`} className="group block">
            <div
              className="flex items-start gap-4 p-4 rounded-xl border transition-colors"
              style={{ background: "var(--mem-surface)", borderColor: "var(--mem-border)" }}
            >
              {/* Source icon */}
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: isVoice ? "var(--mem-accent-muted)" : "var(--mem-surface-2)" }}
              >
                {isVoice
                  ? <Mic className="w-4 h-4" style={{ color: "var(--mem-accent)" }} />
                  : <Pencil className="w-4 h-4" style={{ color: "var(--mem-ink-3)" }} />
                }
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <h3 className="font-semibold text-[15px] leading-snug" style={{ color: "var(--mem-ink)" }}>
                    {report.title}
                  </h3>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: report.status === "published" ? "rgba(34,197,94,0.1)" : "var(--mem-surface-2)",
                        color: report.status === "published" ? "#16a34a" : "var(--mem-ink-3)",
                      }}
                    >
                      {report.status === "published" ? t("report.published") : t("report.draft")}
                    </span>
                    <span className="text-xs" style={{ color: "var(--mem-ink-3)" }}>{ago}</span>
                  </div>
                </div>

                <p className="text-sm line-clamp-2 leading-relaxed" style={{ color: "var(--mem-ink-2)" }}>
                  {report.content}
                </p>

                {report.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {report.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: "var(--mem-surface-2)", color: "var(--mem-ink-2)" }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <ChevronRight
                className="w-4 h-4 shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: "var(--mem-ink-3)" }}
              />
            </div>
          </Link>
        )
      })}
    </div>
  )
}
