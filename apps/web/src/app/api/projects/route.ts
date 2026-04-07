import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { requireSession } from "@/lib/session"
import { createProjectSchema } from "@/lib/validations/project"
import type { Project } from "@projectsreport/shared"

export async function GET() {
  try {
    const session = await requireSession()
    const snapshot = await db
      .collection("projects")
      .where("ownerId", "==", session.user.id)
      .orderBy("createdAt", "desc")
      .get()

    const projects: Project[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Project[]

    return NextResponse.json(projects)
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

    const now = new Date()
    const projectRef = await db.collection("projects").add({
      ...data,
      ownerId: session.user.id,
      reportCount: 0,
      createdAt: now,
      updatedAt: now,
    })

    const project: Project = {
      id: projectRef.id,
      ...data,
      ownerId: session.user.id,
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
