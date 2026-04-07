import Link from "next/link"
import { db } from "@/lib/firebase-admin"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { Report } from "@projectsreport/shared"
import { FileText, Mic, Pencil } from "lucide-react"

interface ReportsListProps {
  projectId: string
}

export async function ReportsList({ projectId }: ReportsListProps) {
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
      <div className="text-center py-20 border-2 border-dashed rounded-xl">
        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-700">Nenhum report ainda</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Crie um report manualmente ou use o app de voz
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {reports.map((report) => (
        <Link key={report.id} href={`/projects/${projectId}/reports/${report.id}`}>
          <Card className="hover:shadow-md transition-all group cursor-pointer">
            <CardHeader className="py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {report.source === "voice" ? (
                      <Mic className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                    ) : (
                      <Pencil className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                    <h3 className="font-semibold text-slate-900 truncate group-hover:text-primary transition-colors">
                      {report.title}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{report.content}</p>
                  {report.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {report.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs py-0">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <Badge variant={report.status === "published" ? "success" : "secondary"} className="mb-2">
                    {report.status === "published" ? "Publicado" : "Rascunho"}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    {format(report.createdAt, "dd MMM yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  )
}
