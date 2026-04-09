import { NextRequest, NextResponse } from "next/server"
import { requireSession } from "@/lib/session"
import { inviteToTeam } from "@/lib/teams"
import { db } from "@/lib/firebase-admin"

export async function POST(req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  try {
    const session = await requireSession()
    const { teamId } = await params
    const { email } = await req.json()

    if (!email?.trim()) return NextResponse.json({ error: "email required" }, { status: 400 })

    const teamDoc = await db.collection("teams").doc(teamId).get()
    if (!teamDoc.exists) return NextResponse.json({ error: "Team not found" }, { status: 404 })

    const team = teamDoc.data()!
    if (!team.memberIds?.includes(session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await inviteToTeam(teamId, email.trim())
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
