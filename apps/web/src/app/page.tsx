import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/session"

export default async function HomePage() {
  const session = await getServerSession()
  if (session) {
    redirect("/projects")
  }
  redirect("/login")
}
