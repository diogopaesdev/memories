import { NextResponse } from "next/server"
import { requireSession } from "@/lib/session"

export async function GET() {
  try {
    const session = await requireSession()
    return NextResponse.json({ user: session.user })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
