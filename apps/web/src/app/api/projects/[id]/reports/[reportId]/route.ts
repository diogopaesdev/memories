import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { requireSession } from "@/lib/session"
import { updateReportSchema } from "@/lib/validations/report"

type Params = { params: Promise<{ id: string; reportId: string }> }

async function authorize(projectId: string, userId: string) {
  const project = await db.collection("projects").doc(projectId).get()
  if (!project.exists || project.data()?.ownerId !== userId) return null
  return project
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession()
    const { id, reportId } = await params
    if (!(await authorize(id, session.user.id))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    const doc = await db.collection("projects").doc(id).collection("reports").doc(reportId).get()
    if (!doc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({
      id: doc.id,
      projectId: id,
      ...doc.data(),
      createdAt: doc.data()?.createdAt?.toDate(),
      updatedAt: doc.data()?.updatedAt?.toDate(),
    })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession()
    const { id, reportId } = await params
    if (!(await authorize(id, session.user.id))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    const body = await req.json()
    const data = updateReportSchema.parse(body)
    await db
      .collection("projects")
      .doc(id)
      .collection("reports")
      .doc(reportId)
      .update({ ...data, updatedAt: new Date() })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Bad request" }, { status: 400 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession()
    const { id, reportId } = await params
    const project = await authorize(id, session.user.id)
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await db.collection("projects").doc(id).collection("reports").doc(reportId).delete()
    await db.collection("projects").doc(id).update({
      reportCount: Math.max(0, (project.data()?.reportCount ?? 1) - 1),
      updatedAt: new Date(),
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
