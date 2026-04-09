import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key")
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 })

  try {
    const doc = await db.collection("desktopAuth").doc(key).get()
    if (!doc.exists) return NextResponse.json({ pending: true })

    const data = doc.data()!

    // Expirar após 10 minutos
    const age = Date.now() - data.createdAt.toDate().getTime()
    if (age > 10 * 60 * 1000) {
      await doc.ref.delete()
      return NextResponse.json({ error: "expired" }, { status: 410 })
    }

    // Token de uso único — deletar após entregar
    await doc.ref.delete()

    return NextResponse.json({ token: data.token, userId: data.userId })
  } catch {
    return NextResponse.json({ error: "internal" }, { status: 500 })
  }
}
