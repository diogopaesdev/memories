import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json()
    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Código inválido" }, { status: 400 })
    }

    const normalized = code.trim().toUpperCase().replace(/\s/g, "")
    const doc = await db.collection("desktopCodes").doc(normalized).get()

    if (!doc.exists) {
      return NextResponse.json({ error: "Código não encontrado" }, { status: 404 })
    }

    const data = doc.data()!

    // Verificar expiração
    if (data.expiresAt.toDate() < new Date()) {
      await doc.ref.delete()
      return NextResponse.json({ error: "Código expirado. Gere um novo em /connect-desktop" }, { status: 410 })
    }

    // Uso único — deletar imediatamente
    await doc.ref.delete()

    return NextResponse.json({ token: data.token, userId: data.userId })
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
