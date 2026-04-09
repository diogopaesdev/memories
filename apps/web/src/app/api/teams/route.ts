import { NextRequest, NextResponse } from "next/server"
import { requireSession } from "@/lib/session"
import { getUserTeams, createTeam } from "@/lib/teams"

export async function GET() {
  try {
    const session = await requireSession()
    const teams = await getUserTeams(session.user.id)
    return NextResponse.json(teams)
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const { name } = await req.json()
    if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 })
    const team = await createTeam(session.user.id, name.trim())
    return NextResponse.json(team, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
