export type ProjectColor =
  | "slate"
  | "red"
  | "orange"
  | "amber"
  | "green"
  | "teal"
  | "blue"
  | "violet"
  | "pink"

export type ProjectIcon =
  | "folder"
  | "briefcase"
  | "code"
  | "database"
  | "globe"
  | "layers"
  | "rocket"
  | "star"
  | "zap"

export interface Project {
  id: string
  name: string
  description?: string
  color: ProjectColor
  icon: ProjectIcon
  ownerId: string
  teamId?: string
  reportCount: number
  createdAt: Date
  updatedAt: Date
}

export interface CreateProjectInput {
  name: string
  description?: string
  color: ProjectColor
  icon: ProjectIcon
}

export interface UpdateProjectInput {
  name?: string
  description?: string
  color?: ProjectColor
  icon?: ProjectIcon
}
