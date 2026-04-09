import { redirect } from "next/navigation"
import { getServerSession, signDesktopToken } from "@/lib/session"
import { db } from "@/lib/firebase-admin"
import { CopyCodeButton } from "./copy-code-button"
import { CodeConsumedWatcher } from "./code-consumed-watcher"

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // sem caracteres ambíguos
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
}

export default async function ConnectDesktopPage() {
  const session = await getServerSession()
  if (!session?.user) redirect("/login?callbackUrl=/connect-desktop")

  // Gerar código e JWT
  const code = generateCode()
  const token = await signDesktopToken(session.user)
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 min

  await db.collection("desktopCodes").doc(code).set({
    token,
    userId: session.user.id,
    expiresAt,
    createdAt: new Date(),
  })

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white p-8">
      <div className="w-full max-w-sm space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold mb-1">Conectar Desktop App</h1>
          <p className="text-sm text-gray-500">
            Olá, {session.user.name?.split(" ")[0]}. Cole este código no app para conectar.
          </p>
        </div>

        {/* Código */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center space-y-4">
          <p className="text-xs text-gray-600 uppercase tracking-widest">Seu código</p>
          <div className="font-mono text-4xl font-bold tracking-[0.3em] text-white">
            {code}
          </div>
          <p className="text-xs text-gray-600">Expira em 15 minutos</p>
          <CopyCodeButton code={code} />
        </div>

        <p className="text-center text-xs text-gray-700">
          Cole este código no app desktop e clique em "Conectar".
        </p>
      </div>
      <CodeConsumedWatcher code={code} />
    </div>
  )
}
