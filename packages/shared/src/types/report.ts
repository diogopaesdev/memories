export type ReportSource = "voice" | "manual"
export type ReportStatus = "draft" | "published"

export interface Report {
  id: string
  projectId: string
  title: string
  content: string
  rawTranscript?: string
  source: ReportSource
  status: ReportStatus
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

export interface CreateReportInput {
  projectId: string
  title: string
  content: string
  rawTranscript?: string
  source: ReportSource
  status?: ReportStatus
  tags?: string[]
}

export interface UpdateReportInput {
  title?: string
  content?: string
  status?: ReportStatus
  tags?: string[]
}
