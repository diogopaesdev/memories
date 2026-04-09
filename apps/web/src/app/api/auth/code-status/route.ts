import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")
  if (!code) return NextResponse.json({ error: "code required" }, { status: 400 })

  const doc = await db.collection("desktopCodes").doc(code).get()
  return NextResponse.json({ consumed: !doc.exists })
}
