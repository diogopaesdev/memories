import {
  Folder,
  Briefcase,
  Code2,
  Database,
  Globe,
  Layers,
  Rocket,
  Star,
  Zap,
} from "lucide-react"
import type { ProjectIcon as ProjectIconType, ProjectColor } from "@projectsreport/shared"
import { cn } from "@/lib/utils"

const iconMap = {
  folder: Folder,
  briefcase: Briefcase,
  code: Code2,
  database: Database,
  globe: Globe,
  layers: Layers,
  rocket: Rocket,
  star: Star,
  zap: Zap,
}

const colorMap: Record<ProjectColor, string> = {
  slate: "bg-slate-100 text-slate-600",
  red: "bg-red-100 text-red-600",
  orange: "bg-orange-100 text-orange-600",
  amber: "bg-amber-100 text-amber-600",
  green: "bg-green-100 text-green-600",
  teal: "bg-teal-100 text-teal-600",
  blue: "bg-blue-100 text-blue-600",
  violet: "bg-violet-100 text-violet-600",
  pink: "bg-pink-100 text-pink-600",
}

interface ProjectIconProps {
  icon: ProjectIconType
  color: ProjectColor
  size?: "sm" | "md" | "lg"
}

export function ProjectIconDisplay({ icon, color, size = "md" }: ProjectIconProps) {
  const Icon = iconMap[icon] ?? Folder
  const sizeClasses = { sm: "w-8 h-8", md: "w-10 h-10", lg: "w-12 h-12" }
  const iconSizes = { sm: "w-4 h-4", md: "w-5 h-5", lg: "w-6 h-6" }

  return (
    <div className={cn("rounded-lg flex items-center justify-center", sizeClasses[size], colorMap[color] ?? colorMap.blue)}>
      <Icon className={iconSizes[size]} />
    </div>
  )
}
