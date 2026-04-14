import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { requireSession } from "@/lib/session"
import { updateProjectSchema } from "@/lib/validations/project"

async function getProjectOrFail(id: string, userId: string) {
  const doc = await db.collection("projects").doc(id).get()
  if (!doc.exists) return null
  const data = doc.data()!
  if (data.ownerId !== userId) return null
  return { id: doc.id, ...data }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const project = await getProjectOrFail(id, session.user.id)
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(project)
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const project = await getProjectOrFail(id, session.user.id)
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const body = await req.json()
    const data = updateProjectSchema.parse(body)
    await db.collection("projects").doc(id).update({ ...data, updatedAt: new Date() })

    return NextResponse.json({ ...project, ...data })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Bad request" }, { status: 400 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const project = await getProjectOrFail(id, session.user.id)
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // Delete all reports in the project
    const reports = await db.collection("projects").doc(id).collection("reports").get()
    const batch = db.batch()
    reports.docs.forEach((doc) => batch.delete(doc.ref))
    batch.delete(db.collection("projects").doc(id))
    await batch.commit()

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
