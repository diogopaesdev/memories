import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { requireSession } from "@/lib/session"

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export interface ChatResponse {
  action: "create" | "search" | "chat"
  reply: string
  openUrl?: string
  openAppName?: string
  mouseAction?: { type: string; x: number; y: number; scrollAmount?: number }
  data?: {
    reportId?: string
    projectId?: string
    projectName?: string
    title?: string
    isNewProject?: boolean
    memories?: { title: string; projectName: string; date: string; content: string }[]
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const { transcript, history = [], openaiApiKey, teamId: bodyTeamId, screenW = 1920, screenH = 1080, savedRecordings = [] } = await req.json()

    if (!transcript?.trim()) {
      return NextResponse.json({ error: "transcript is required" }, { status: 400 })
    }

    const apiKey = openaiApiKey
    if (!apiKey) {
      return NextResponse.json({ error: "openai_key_missing", needsApiKey: true }, { status: 422 })
    }

    const { ensurePersonalTeam } = await import("@/lib/teams")
    const teamId = bodyTeamId ?? (await ensurePersonalTeam(session.user.id))

    // Load projects
    const projectsSnap = await db
      .collection("projects")
      .where("teamId", "==", teamId)
      .orderBy("createdAt", "desc")
      .get()
    const projects = projectsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Record<string, unknown>[]

    const projectsContext =
      projects.length > 0
        ? projects
            .map(
              (p) =>
                `- ID: ${p.id} | Nome: ${p.name}${p.description ? ` | Desc: ${p.description}` : ""}`
            )
            .join("\n")
        : "Nenhum projeto ainda"

    // Load recent reports in parallel (not sequential) for search context
    const reportResults = await Promise.all(
      projects.slice(0, 8).map((project) =>
        db
          .collection("projects")
          .doc(project.id as string)
          .collection("reports")
          .orderBy("createdAt", "desc")
          .limit(6)
          .get()
          .then((snap) =>
            snap.docs.map((rDoc) => {
              const r = rDoc.data()
              const dateStr =
                (r.createdAt as { toDate?: () => Date })?.toDate?.()?.toLocaleDateString("pt-BR") ?? "?"
              const snippet = (r.content as string)?.slice(0, 180) ?? ""
              return `- ID:${rDoc.id} | Projeto: ${project.name} | Data: ${dateStr} | Título: ${r.title} | ${snippet}`
            })
          )
          .catch(() => [] as string[])
      )
    )
    const reportLines = reportResults.flat()

    const memoriesContext =
      reportLines.length > 0 ? reportLines.join("\n") : "Nenhuma memória registrada ainda"

    const { default: OpenAI } = await import("openai")
    const openai = new OpenAI({ apiKey })

    const recordingsContext = (savedRecordings as { name: string; eventCount: number; durationMs: number }[]).length > 0
      ? (savedRecordings as { name: string; eventCount: number; durationMs: number }[])
          .map((r) => `- "${r.name}" (${r.eventCount} eventos, ${Math.round(r.durationMs / 1000)}s)`)
          .join("\n")
      : "Nenhuma gravação salva"

    const systemPrompt = `Você é Memories, um assistente de voz pessoal que ajuda o usuário a capturar e recuperar memórias de trabalho.

ESTILO DE RESPOSTA — MUITO IMPORTANTE:
- Você está numa conversa por VOZ. Fale como uma pessoa falaria, não como se estivesse escrevendo.
- Respostas curtas e naturais. Sem listas com bullet points, sem markdown, sem títulos.
- IDIOMA: responda SEMPRE no mesmo idioma que o usuário usou na mensagem. Se falou inglês, responda em inglês. Se falou português, responda em português. Se misturou, use o predominante.
- Use linguagem coloquial e natural do idioma detectado.
- Evite frases formais como "Claro!", "Com prazer!", "Certamente!", "Of course!", "Certainly!".
- Quando listar memórias, fale como se estivesse contando: "Você tem três coisas aqui: primeiro... depois..." ou "You've got three things here: first..."
- Máximo de 2-3 frases por resposta. Se precisar de mais, divida em partes naturais.

Projetos do usuário:
${projectsContext}

Memórias registradas (use estas para responder perguntas):
${memoriesContext}

Gravações de automação disponíveis para replay (use o nome EXATO ao definir recordingName para replay):
${recordingsContext}

Interprete a mensagem do usuário e decida a ação:
- CREATE: usuário quer salvar/registrar/anotar algo que fez ou aconteceu
- SEARCH: usuário pergunta sobre memórias passadas, pede para listar ou buscar
- CHAT: conversa geral, incluindo quando o usuário quer abrir programas ou pesquisar na web

REGRAS para o campo "reply":
- Para CREATE: confirme de forma curta e natural. Ex: "Anotei! Salvei isso no projeto X."
- Para SEARCH: fale as informações encontradas como numa conversa. Se não encontrou: "Não achei nada sobre isso não."
- Para CHAT: responda direto, como numa conversa normal.

Tela do usuário: ${screenW}x${screenH}px. Centro: (${Math.round(screenW/2)}, ${Math.round(screenH/2)}). Use essas dimensões para calcular coordenadas de mouse.

Rotas do painel web (para abrir no navegador):
- Todas as memórias: /memories
- Projeto específico: /memories/{projectId}
- Memória específica: /memories/{projectId}/reports/{reportId}

Responda APENAS em JSON:
{
  "action": "create" | "search" | "chat",
  "reply": "resposta completa em português — para SEARCH inclua os dados encontrados, não apenas anuncie que vai listar",
  "openUrl": "url completa ou path" (use para: abrir memória/projeto do app → "/memories/{id}"; pesquisar na web → "https://www.google.com/search?q=..." ou YouTube/GitHub/etc.; abrir site → URL completa. Só inclua quando o usuário pedir explicitamente.),
  "openAppName": "nome do programa" (inclua quando o usuário pedir para abrir um programa instalado no computador, ex: "spotify", "chrome", "code", "notepad", "whatsapp", "discord". Use o nome do executável ou nome comercial.),
  "mouseAction": { "type": "move"|"click"|"doubleClick"|"rightClick"|"scroll", "x": number, "y": number, "scrollAmount": number } (inclua quando o usuário pedir para mover o mouse, clicar em coordenadas ou fazer scroll. Use as dimensões da tela para calcular posições nomeadas: "centro da tela"=(${Math.round(screenW/2)},${Math.round(screenH/2)}), "canto superior esquerdo"=(0,0), etc. Para scroll: scrollAmount positivo=baixo, negativo=cima.),
  "recordingAction": "start"|"stop"|"replay" (para automação por gravação de movimentos: se o usuário pede para automatizar/gravar uma tarefa → "start"; se diz "parar", "terminei", "pronto" após gravação → "stop"; se pede para repetir/executar/fazer uma gravação → "replay"),
  "recordingName": "nome da tarefa" (para "start": nome descritivo, ex: "enviar email". Para "replay": use o nome EXATO da lista de gravações disponíveis acima. Para "stop": não é necessário.),
  "create": {
    "projectId": "id do projeto existente ou null",
    "newProjectName": "nome do novo projeto se projectId for null, senão null",
    "title": "título da memória (max 80 chars)",
    "content": "conteúdo em markdown",
    "tags": ["tag1", "tag2"]
  },
  "foundMemories": [
    { "reportId": "id", "title": "titulo", "projectName": "nome", "date": "data", "snippet": "trecho" }
  ]
}`

    const aiMessages = [
      { role: "system" as const, content: systemPrompt },
      ...(history as ChatMessage[]).slice(-8).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: transcript },
    ]

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: aiMessages,
    })

    const ai = JSON.parse(completion.choices[0].message.content ?? "{}")
    const response: ChatResponse = {
      action: ai.action ?? "chat",
      reply: ai.reply ?? "Entendido.",
      ...(ai.openUrl      ? { openUrl:      ai.openUrl      as string } : {}),
      ...(ai.openAppName  ? { openAppName:  ai.openAppName  as string } : {}),
      ...(ai.mouseAction     ? { mouseAction:     ai.mouseAction                      } : {}),
      ...(ai.recordingAction ? { recordingAction: ai.recordingAction as string        } : {}),
      ...(ai.recordingName   ? { recordingName:   ai.recordingName   as string        } : {}),
    }

    // Handle create action
    if (ai.action === "create" && ai.create) {
      const now = new Date()
      let projectId: string | null = ai.create.projectId ?? null
      let projectName = ""

      if (!projectId && ai.create.newProjectName) {
        const ref = await db.collection("projects").add({
          name: ai.create.newProjectName,
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
        projectName = ai.create.newProjectName
      } else if (projectId) {
        projectName = (projects.find((p) => p.id === projectId)?.name as string) ?? "Projeto"
      }

      if (projectId) {
        const reportRef = await db
          .collection("projects")
          .doc(projectId)
          .collection("reports")
          .add({
            title: ai.create.title ?? transcript.slice(0, 60),
            content: ai.create.content ?? transcript,
            rawTranscript: transcript,
            tags: ai.create.tags ?? [],
            source: "voice",
            status: "published",
            projectId,
            userId: session.user.id,
            createdAt: now,
            updatedAt: now,
          })

        const existingProject = projects.find((p) => p.id === ai.create.projectId)
        await db
          .collection("projects")
          .doc(projectId)
          .update({
            reportCount: ((existingProject?.reportCount as number) ?? 0) + 1,
            updatedAt: now,
          })

        response.data = {
          reportId: reportRef.id,
          projectId,
          projectName,
          title: ai.create.title,
          isNewProject: !ai.create.projectId,
        }
      }
    }

    // Handle search results
    if (ai.action === "search" && ai.foundMemories) {
      response.data = { memories: ai.foundMemories }
    }

    return NextResponse.json(response)
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("AI chat error:", error)
    return NextResponse.json({ error: "Erro ao processar" }, { status: 500 })
  }
}
