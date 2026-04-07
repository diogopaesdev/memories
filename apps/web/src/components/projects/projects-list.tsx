import Link from "next/link"
import { db } from "@/lib/firebase-admin"
import { requireSession } from "@/lib/session"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ProjectIconDisplay } from "./project-icon"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { Project } from "@projectsreport/shared"
import { FileText, ArrowRight } from "lucide-react"

export async function ProjectsList() {
  const session = await requireSession()
  const snapshot = await db
    .collection("projects")
    .where("ownerId", "==", session.user.id)
    .orderBy("createdAt", "desc")
    .get()

  const projects: Project[] = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate(),
  })) as Project[]

  if (projects.length === 0) {
    return (
      <div className="text-center py-20">
        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-700">Nenhum projeto ainda</h3>
        <p className="text-sm text-muted-foreground mt-1">Crie seu primeiro projeto para começar</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project) => (
        <Link key={project.id} href={`/projects/${project.id}`}>
          <Card className="h-full hover:shadow-md transition-all group cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <ProjectIconDisplay icon={project.icon} color={project.color} />
                <ArrowRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="mt-3">
                <h3 className="font-semibold text-slate-900 group-hover:text-primary transition-colors">
                  {project.name}
                </h3>
                {project.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between text-sm">
                <Badge variant="secondary" className="gap-1">
                  <FileText className="w-3 h-3" />
                  {project.reportCount} {project.reportCount === 1 ? "report" : "reports"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {format(project.createdAt, "dd MMM yyyy", { locale: ptBR })}
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
