import { NextRequest, NextResponse } from "next/server"
import { requireSession } from "@/lib/session"

export async function POST(req: NextRequest) {
  try {
    await requireSession()
    const { transcript } = await req.json()

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json({ error: "transcript is required" }, { status: 400 })
    }

    // If no OpenAI key, return raw transcript as-is
    if (!process.env.OPENAI_API_KEY) {
      const title = transcript.slice(0, 60).trim() + (transcript.length > 60 ? "..." : "")
      return NextResponse.json({ title, content: transcript, tags: [] })
    }

    const { default: OpenAI } = await import("openai")
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Você é um assistente que formata transcrições de voz em relatórios estruturados.
Dado um texto transcrito, retorne um JSON com:
- title: string (título conciso, máximo 80 caracteres)
- content: string (conteúdo formatado em markdown, organizado e claro)
- tags: string[] (até 5 tags relevantes em português, sem #)

Responda APENAS com o JSON, sem texto adicional.`,
        },
        {
          role: "user",
          content: `Transcrição: "${transcript}"`,
        },
      ],
    })

    const result = JSON.parse(completion.choices[0].message.content ?? "{}")
    return NextResponse.json({
      title: result.title ?? transcript.slice(0, 60),
      content: result.content ?? transcript,
      tags: result.tags ?? [],
    })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
