import { notFound } from "next/navigation"
import { db } from "@/lib/firebase-admin"
import { requireSession } from "@/lib/session"
import { ProjectIconDisplay } from "@/components/projects/project-icon"
import { ReportsList } from "@/components/reports/reports-list"
import { CreateReportButton } from "@/components/reports/create-report-button"
import { ProjectActions } from "@/components/projects/project-actions"
import type { Project } from "@projectsreport/shared"

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProjectPage({ params }: Props) {
  const session = await requireSession()
  const { id } = await params

  const doc = await db.collection("projects").doc(id).get()
  if (!doc.exists || doc.data()?.ownerId !== session.user.id) notFound()

  const project: Project = {
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data()?.createdAt?.toDate(),
    updatedAt: doc.data()?.updatedAt?.toDate(),
  } as Project

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <ProjectIconDisplay icon={project.icon} color={project.color} size="lg" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
            {project.description && (
              <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CreateReportButton projectId={project.id} />
          <ProjectActions project={project} />
        </div>
      </div>

      <ReportsList projectId={project.id} />
    </div>
  )
}
