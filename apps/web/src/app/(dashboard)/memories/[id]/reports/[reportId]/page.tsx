import { notFound } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/firebase-admin"
import { requireSession } from "@/lib/session"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ReportActions } from "@/components/reports/report-actions"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { Report } from "@projectsreport/shared"
import { ArrowLeft, Mic, Pencil } from "lucide-react"

interface Props {
  params: Promise<{ id: string; reportId: string }>
}

export default async function ReportPage({ params }: Props) {
  const session = await requireSession()
  const { id, reportId } = await params

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

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link
          href={`/projects/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {project.data()?.name}
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {report.source === "voice" ? (
                <Badge variant="secondary" className="gap-1">
                  <Mic className="w-3 h-3" /> Por voz
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <Pencil className="w-3 h-3" /> Manual
                </Badge>
              )}
              <Badge variant={report.status === "published" ? "success" : "secondary"}>
                {report.status === "published" ? "Publicado" : "Rascunho"}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{report.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Criado em {format(report.createdAt, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
          <ReportActions report={report} projectId={id} />
        </div>

        {report.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {report.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Separator className="mb-6" />

      <div className="prose prose-slate max-w-none">
        <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">{report.content}</div>
      </div>

      {report.rawTranscript && (
        <div className="mt-8 p-4 bg-slate-50 rounded-lg border">
          <h3 className="text-sm font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
            <Mic className="w-4 h-4" /> Transcrição original
          </h3>
          <p className="text-sm text-muted-foreground italic">{report.rawTranscript}</p>
        </div>
      )}
    </div>
  )
}
