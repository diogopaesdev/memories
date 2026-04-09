"use client"
import { useEffect } from "react"

export function CodeConsumedWatcher({ code }: { code: string }) {
  useEffect(() => {
    let stopped = false

    const interval = setInterval(async () => {
      if (stopped) return
      try {
        const res = await fetch(`/api/auth/code-status?code=${code}`)
        const data = await res.json()
        if (data.consumed) {
          stopped = true
          clearInterval(interval)
          // Tenta fechar; se o browser bloquear, redireciona para tela de sucesso
          window.close()
          setTimeout(() => { window.location.href = "/connect-desktop/connected" }, 300)
        }
      } catch {
        // ignora erros de rede e continua polling
      }
    }, 2000)

    return () => {
      stopped = true
      clearInterval(interval)
    }
  }, [code])

  return null
}
