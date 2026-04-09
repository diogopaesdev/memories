import Link from "next/link"
import { db } from "@/lib/firebase-admin"
import { requireSession } from "@/lib/session"
import { ensurePersonalTeam } from "@/lib/teams"
import { ProjectIconDisplay } from "./project-icon"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { Project } from "@projectsreport/shared"
import { FileText, ArrowUpRight, Plus } from "lucide-react"

interface ProjectsListProps {
  baseHref?: string
  teamId?: string
}

export async function ProjectsList({ baseHref = "/memories", teamId }: ProjectsListProps = {}) {
  const session = await requireSession()
  const resolvedTeamId = teamId ?? await ensurePersonalTeam(session.user.id)

  const snapshot = await db
    .collection("projects")
    .where("teamId", "==", resolvedTeamId)
    .orderBy("createdAt", "desc")
    .get()

  // Projetos legados (sem teamId) do usuário, só para o time pessoal
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

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "#ece9e3" }}>
          <Plus className="w-6 h-6" style={{ color: "#aaa" }} />
        </div>
        <h3 className="text-base font-semibold" style={{ color: "#1a1a1a" }}>Nenhuma memória ainda</h3>
        <p className="text-sm mt-1 max-w-xs" style={{ color: "#888" }}>
          Use o app desktop para gravar o que fez e a IA organiza aqui automaticamente
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project) => (
        <Link key={project.id} href={`${baseHref}/${project.id}`} className="group block">
          <div
            className="rounded-2xl p-5 h-full transition-all duration-200 hover:shadow-md"
            style={{
              background: "#fff",
              border: "1px solid #e8e6e0",
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <ProjectIconDisplay icon={project.icon} color={project.color} />
              <ArrowUpRight className="w-4 h-4 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5" style={{ color: "#ccc" }} />
            </div>

            <h3 className="font-semibold leading-snug transition-colors" style={{ color: "#1a1a1a" }}>
              {project.name}
            </h3>

            {project.description && (
              <p className="text-sm mt-1 line-clamp-2 leading-relaxed" style={{ color: "#888" }}>
                {project.description}
              </p>
            )}

            <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: "1px solid #f0ede8" }}>
              <div className="flex items-center gap-1.5" style={{ color: "#aaa" }}>
                <FileText className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">
                  {project.reportCount} {project.reportCount === 1 ? "report" : "reports"}
                </span>
              </div>
              <span className="text-xs" style={{ color: "#ccc" }}>
                {format(project.createdAt, "dd MMM yy", { locale: ptBR })}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
