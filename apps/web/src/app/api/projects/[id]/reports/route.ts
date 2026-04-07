import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { requireSession } from "@/lib/session"
import { createReportSchema } from "@/lib/validations/report"
import type { Report } from "@projectsreport/shared"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params

    const project = await db.collection("projects").doc(id).get()
    if (!project.exists || project.data()?.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const snapshot = await db
      .collection("projects")
      .doc(id)
      .collection("reports")
      .orderBy("createdAt", "desc")
      .get()

    const reports: Report[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      projectId: id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Report[]

    return NextResponse.json(reports)
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params

    const project = await db.collection("projects").doc(id).get()
    if (!project.exists || project.data()?.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const body = await req.json()
    const data = createReportSchema.parse(body)
    const now = new Date()

    const reportRef = await db.collection("projects").doc(id).collection("reports").add({
      title: data.title,
      content: data.content,
      rawTranscript: data.rawTranscript ?? null,
      source: data.source,
      status: data.status ?? "draft",
      tags: data.tags ?? [],
      createdAt: now,
      updatedAt: now,
    })

    // Increment report count
    await db.collection("projects").doc(id).update({
      reportCount: (project.data()?.reportCount ?? 0) + 1,
      updatedAt: now,
    })

    const report: Report = {
      id: reportRef.id,
      projectId: id,
      title: data.title,
      content: data.content,
      rawTranscript: data.rawTranscript,
      source: data.source,
      status: data.status ?? "draft",
      tags: data.tags ?? [],
      createdAt: now,
      updatedAt: now,
    }

    return NextResponse.json(report, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Bad request" }, { status: 400 })
  }
}
