import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { requireSession } from "@/lib/session"
import { ensurePersonalTeam } from "@/lib/teams"
import { createProjectSchema } from "@/lib/validations/project"
import type { Project } from "@projectsreport/shared"

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession()
    const { searchParams } = new URL(req.url)
    const teamId = searchParams.get("teamId") ?? await ensurePersonalTeam(session.user.id)

    const snapshot = await db
      .collection("projects")
      .where("teamId", "==", teamId)
      .orderBy("createdAt", "desc")
      .get()

    // fallback: projetos legados sem teamId pertencentes ao usuário
    const legacySnap = await db
      .collection("projects")
      .where("ownerId", "==", session.user.id)
      .where("teamId", "==", null)
      .orderBy("createdAt", "desc")
      .get()
      .catch(() => null)

    const fromTeam: Project[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Project[]

    const legacy: Project[] = (legacySnap?.docs ?? []).map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Project[]

    // Merge sem duplicar
    const seen = new Set(fromTeam.map((p) => p.id))
    const all = [...fromTeam, ...legacy.filter((p) => !seen.has(p.id))]

    return NextResponse.json(all)
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = await req.json()
    const data = createProjectSchema.parse(body)
    const teamId = body.teamId ?? await ensurePersonalTeam(session.user.id)

    const now = new Date()
    const projectRef = await db.collection("projects").add({
      ...data,
      ownerId: session.user.id,
      teamId,
      reportCount: 0,
      createdAt: now,
      updatedAt: now,
    })

    const project: Project = {
      id: projectRef.id,
      ...data,
      ownerId: session.user.id,
      teamId,
      reportCount: 0,
      createdAt: now,
      updatedAt: now,
    }

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Bad request" }, { status: 400 })
  }
}
