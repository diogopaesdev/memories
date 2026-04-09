import { Suspense } from "react"
import { ProjectsList } from "@/components/projects/projects-list"
import { CreateProjectButton } from "@/components/projects/create-project-button"

interface Props {
  searchParams: Promise<{ team?: string }>
}

export default async function MemoriesPage({ searchParams }: Props) {
  const { team: teamId } = await searchParams

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "#1a1a1a" }}>Memórias</h1>
          <p className="text-sm mt-0.5" style={{ color: "#888" }}>Tudo que você registrou por voz</p>
        </div>
        <CreateProjectButton teamId={teamId} />
      </div>

      <Suspense fallback={<MemoriesListSkeleton />}>
        <ProjectsList baseHref="/memories" teamId={teamId} />
      </Suspense>
    </div>
  )
}

function MemoriesListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-36 rounded-2xl animate-pulse" style={{ background: "#ece9e3" }} />
      ))}
    </div>
  )
}
