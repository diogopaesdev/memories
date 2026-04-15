import { getServerSession, signDesktopToken } from "@/lib/session"
import { db } from "@/lib/firebase-admin"
import { CopyCodeButton } from "./copy-code-button"
import { CodeConsumedWatcher } from "./code-consumed-watcher"
import { GoogleLoginButton } from "@/components/auth/google-login-button"

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
}

export default async function ConnectDesktopPage() {
  const session = await getServerSession()

  // ── Não logado: mostrar step de login ──────────────────────────────────
  if (!session?.user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white p-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center mx-auto mb-5">
              <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="3.5" fill="#f5f4f0" />
                <circle cx="20" cy="20" r="8.5" stroke="#f5f4f0" strokeWidth="1.5" opacity="0.55" />
                <circle cx="20" cy="20" r="14" stroke="#f5f4f0" strokeWidth="1" opacity="0.22" />
              </svg>
            </div>
            <h1 className="text-xl font-bold mb-1">Conectar Desktop App</h1>
            <p className="text-sm text-gray-500">Faça login para gerar seu código de ativação.</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
            <p className="text-xs text-gray-600 uppercase tracking-widest text-center">Passo 1 de 2</p>
            <GoogleLoginButton callbackUrl="/connect-desktop" />
          </div>
        </div>
      </div>
    )
  }

  // ── Logado: gerar e exibir código ──────────────────────────────────────
  const code = generateCode()
  const token = await signDesktopToken(session.user)
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

  await db.collection("desktopCodes").doc(code).set({
    token,
    userId: session.user.id,
    expiresAt,
    createdAt: new Date(),
  })

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white p-8">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center mx-auto mb-5">
            <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="3.5" fill="#f5f4f0" />
              <circle cx="20" cy="20" r="8.5" stroke="#f5f4f0" strokeWidth="1.5" opacity="0.55" />
              <circle cx="20" cy="20" r="14" stroke="#f5f4f0" strokeWidth="1" opacity="0.22" />
            </svg>
          </div>
          <h1 className="text-xl font-bold mb-1">Conectar Desktop App</h1>
          <p className="text-sm text-gray-500">
            Olá, {session.user.name?.split(" ")[0]}. Cole este código no app para conectar.
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center space-y-4">
          <p className="text-xs text-gray-600 uppercase tracking-widest">Passo 2 de 2 · Seu código</p>
          <div className="font-mono text-4xl font-bold tracking-[0.3em] text-white">
            {code}
          </div>
          <p className="text-xs text-gray-600">Expira em 15 minutos</p>
          <CopyCodeButton code={code} />
        </div>

        <p className="text-center text-xs text-gray-700">
          Cole este código no app desktop e clique em &quot;Conectar&quot;.
        </p>
      </div>
      <CodeConsumedWatcher code={code} />
    </div>
  )
}
