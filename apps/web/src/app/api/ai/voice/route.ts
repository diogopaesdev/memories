import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { requireSession } from "@/lib/session"
import type { Project } from "@projectsreport/shared"

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const { transcript, openaiApiKey, teamId: bodyTeamId } = await req.json()

    if (!transcript?.trim()) {
      return NextResponse.json({ error: "transcript is required" }, { status: 400 })
    }

    const apiKey = openaiApiKey || process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "openai_key_missing", needsApiKey: true }, { status: 422 })
    }

    const { ensurePersonalTeam } = await import("@/lib/teams")
    const teamId = bodyTeamId ?? await ensurePersonalTeam(session.user.id)

    // Buscar projetos do time
    const snapshot = await db
      .collection("projects")
      .where("teamId", "==", teamId)
      .orderBy("createdAt", "desc")
      .get()

    const projects: Project[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Project[]

    const projectsContext =
      projects.length > 0
        ? projects.map((p) => `- ID: ${p.id} | Nome: ${p.name}${p.description ? ` | Desc: ${p.description}` : ""}`).join("\n")
        : "Nenhum projeto ainda (pode criar um novo)"

    // GPT decide projeto + cria report
    const { default: OpenAI } = await import("openai")
    const openai = new OpenAI({ apiKey })

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Você é um assistente de relatórios de trabalho. O usuário vai narrar o que fez e você deve organizar automaticamente.

Projetos existentes do usuário:
${projectsContext}

Sua tarefa:
1. Identificar a qual projeto pertence o relato (pelo nome/contexto)
2. Se não houver projeto adequado, criar um novo com nome apropriado
3. Extrair título e conteúdo do relatório em markdown
4. Sugerir tags relevantes

Retorne APENAS JSON com este formato:
{
  "projectId": "id do projeto existente ou null se for criar novo",
  "newProjectName": "nome do novo projeto se projectId for null, senão null",
  "title": "título conciso do relatório (max 80 chars)",
  "content": "conteúdo em markdown, organizado",
  "tags": ["tag1", "tag2"],
  "summary": "uma frase resumindo o que foi registrado"
}`,
        },
        {
          role: "user",
          content: `Transcrição: "${transcript}"`,
        },
      ],
    })

    const ai = JSON.parse(completion.choices[0].message.content ?? "{}")
    const now = new Date()

    // Criar projeto novo se necessário
    let projectId = ai.projectId
    let projectName = ""

    if (!projectId && ai.newProjectName) {
      const ref = await db.collection("projects").add({
        name: ai.newProjectName,
        description: "",
        icon: "folder",
        color: "blue",
        ownerId: session.user.id,
        teamId,
        reportCount: 0,
        createdAt: now,
        updatedAt: now,
      })
      projectId = ref.id
      projectName = ai.newProjectName
    } else {
      projectName = projects.find((p) => p.id === projectId)?.name ?? "Projeto"
    }

    if (!projectId) {
      return NextResponse.json({ error: "Não foi possível identificar o projeto" }, { status: 500 })
    }

    // Criar o report
    const reportRef = await db.collection("projects").doc(projectId).collection("reports").add({
      title: ai.title ?? transcript.slice(0, 60),
      content: ai.content ?? transcript,
      rawTranscript: transcript,
      tags: ai.tags ?? [],
      source: "voice",
      status: "published",
      projectId,
      userId: session.user.id,
      createdAt: now,
      updatedAt: now,
    })

    // Atualizar contador do projeto
    await db.collection("projects").doc(projectId).update({
      reportCount: projects.find((p) => p.id === ai.projectId) ? (projects.find((p) => p.id === ai.projectId)!.reportCount ?? 0) + 1 : 1,
      updatedAt: now,
    })

    return NextResponse.json({
      reportId: reportRef.id,
      projectId,
      projectName,
      title: ai.title,
      summary: ai.summary ?? ai.title,
      isNewProject: !ai.projectId,
    })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("AI voice error:", error)
    return NextResponse.json({ error: "Erro ao processar" }, { status: 500 })
  }
}
