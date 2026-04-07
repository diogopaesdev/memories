import { z } from "zod"

export const createReportSchema = z.object({
  title: z.string().min(1, "Título é obrigatório").max(100, "Máximo 100 caracteres"),
  content: z.string().min(1, "Conteúdo é obrigatório"),
  rawTranscript: z.string().optional(),
  source: z.enum(["voice", "manual"]),
  status: z.enum(["draft", "published"]).default("draft"),
  tags: z.array(z.string()).default([]),
})

export const updateReportSchema = createReportSchema.partial().omit({ source: true })

export type CreateReportSchema = z.infer<typeof createReportSchema>
export type UpdateReportSchema = z.infer<typeof updateReportSchema>
