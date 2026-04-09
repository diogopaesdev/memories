export interface Session {
  user: { id: string; name: string; email: string; image?: string | null }
}

export interface VoiceResult {
  reportId: string
  projectId: string
  projectName: string
  title: string
  summary: string
  isNewProject: boolean
}

async function getWebAppUrl(): Promise<string> {
  const url = await window.electron.store.get("webAppUrl")
  return url ?? "http://localhost:3000"
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const [baseUrl, token] = await Promise.all([
    getWebAppUrl(),
    window.electron.store.get("token"),
  ])
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
    throw Object.assign(new Error(error.error ?? `HTTP ${res.status}`), error)
  }

  return res.json()
}

export async function checkSession(): Promise<Session | null> {
  try {
    const data = await apiRequest<{ user: Session["user"] }>("/api/auth/me")
    if (!data?.user?.email) return null
    return { user: data.user }
  } catch {
    return null
  }
}

export async function exchangeCode(code: string): Promise<{ token: string; userId: string }> {
  return apiRequest("/api/auth/exchange-code", {
    method: "POST",
    body: JSON.stringify({ code }),
  })
}

export async function processVoiceAndCreate(
  transcript: string,
  openaiApiKey?: string | null
): Promise<VoiceResult> {
  return apiRequest<VoiceResult>("/api/ai/voice", {
    method: "POST",
    body: JSON.stringify({ transcript, openaiApiKey }),
  })
}
