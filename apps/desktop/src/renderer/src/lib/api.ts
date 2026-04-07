import type { Project, CreateReportInput } from "@projectsreport/shared"

async function getWebAppUrl(): Promise<string> {
  const url = await window.electron.store.get("webAppUrl")
  return url ?? "http://localhost:3000"
}

async function getToken(): Promise<string | null> {
  return window.electron.store.get("token")
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const [baseUrl, token] = await Promise.all([getWebAppUrl(), getToken()])

  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    credentials: "include",
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Unknown error" }))
    throw new Error(error.error ?? `HTTP ${res.status}`)
  }

  return res.json()
}

export async function getProjects(): Promise<Project[]> {
  return apiRequest<Project[]>("/api/projects")
}

export async function createReport(data: CreateReportInput) {
  return apiRequest(`/api/projects/${data.projectId}/reports`, {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function processVoiceTranscript(transcript: string) {
  return apiRequest<{ title: string; content: string; tags: string[] }>(
    "/api/voice/process",
    {
      method: "POST",
      body: JSON.stringify({ transcript }),
    }
  )
}

export async function checkSession() {
  try {
    const baseUrl = await getWebAppUrl()
    const res = await fetch(`${baseUrl}/api/auth/get-session`, {
      credentials: "include",
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}
