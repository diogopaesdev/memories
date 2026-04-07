import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/session"
import { LoginForm } from "@/components/auth/login-form"

export default async function LoginPage() {
  const session = await getServerSession()
  if (session) redirect("/projects")

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">ProjectsReport</h1>
          <p className="mt-2 text-slate-500">Gestão de relatórios com captura por voz</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
