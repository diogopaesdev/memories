import { z } from "zod"

export const createProjectSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(50, "Máximo 50 caracteres"),
  description: z.string().max(200, "Máximo 200 caracteres").optional(),
  color: z.enum(["slate", "red", "orange", "amber", "green", "teal", "blue", "violet", "pink"]),
  icon: z.enum(["folder", "briefcase", "code", "database", "globe", "layers", "rocket", "star", "zap"]),
})

export const updateProjectSchema = createProjectSchema.partial()

export type CreateProjectSchema = z.infer<typeof createProjectSchema>
export type UpdateProjectSchema = z.infer<typeof updateProjectSchema>
