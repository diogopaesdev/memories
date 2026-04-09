import { redirect } from "next/navigation"
import { getServerSession, signDesktopToken } from "@/lib/session"
import { db } from "@/lib/firebase-admin"

export default async function DesktopSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>
}) {
  const { key } = await searchParams

  if (!key) redirect("/projects")

  const session = await getServerSession()
  if (!session?.user) redirect(`/login?callbackUrl=/auth/desktop-success?key=${key}`)

  // Gerar JWT para o desktop
  const token = await signDesktopToken(session.user)

  // Salvar no Firestore para o desktop fazer polling
  console.log("[desktop-success] saving token for key:", key)
  await db
    .collection("desktopAuth")
    .doc(key)
    .set({ token, userId: session.user.id, createdAt: new Date() })
  console.log("[desktop-success] token saved")

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white gap-6 p-8">
      <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/30 flex items-center justify-center">
        <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div className="text-center">
        <h1 className="text-xl font-bold mb-2">Login realizado!</h1>
        <p className="text-gray-400 text-sm">
          Bem-vindo, {session.user.name}.<br />
          Você já pode fechar esta aba e voltar ao app.
        </p>
      </div>
      <script
        dangerouslySetInnerHTML={{
          __html: `setTimeout(() => window.close(), 2000)`,
        }}
      />
    </div>
  )
}
